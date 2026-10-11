"""
GPU-Accelerated CFD Kernels
============================
Three-tier acceleration hierarchy:

  Tier 1 — CuPy CUDA       (NVIDIA GPUs)
  Tier 2 — PyOpenCL         (Intel Iris Xe, AMD, any OpenCL 1.2+ device)
  Tier 3 — Numba CPU        (fallback, already parallel via prange)

Kernel summary:
  velocity_grid        -- O(N_grid × N_panels)
  velocity_grid_wake   -- O(N_grid × (N_panels + N_wake))
  advect_wake          -- O(N_wake × (N_panels + N_wake))  [shared/local-mem tiling]

Public flags:
  HAS_CUPY    -- Tier 1 available
  HAS_OPENCL  -- Tier 2 available
  GPU_TIER    -- "cuda" | "opencl" | "cpu"
"""

import math
import numpy as np

# ---------------------------------------------------------------------------
# Tier 1 — CuPy / CUDA
# ---------------------------------------------------------------------------
try:
    import cupy as cp
    _device = cp.cuda.Device()
    _device.use()
    HAS_CUPY = True
except Exception:
    HAS_CUPY = False
    cp = None  # type: ignore

# ---------------------------------------------------------------------------
# Tier 2 — PyOpenCL  (Intel Iris Xe, AMD, CPU fallback)
# ---------------------------------------------------------------------------
try:
    import pyopencl as cl
    import pyopencl.array as cl_array

    _cl_platforms = cl.get_platforms()
    # Prefer GPU; accept CPU OpenCL as last resort
    _cl_device = None
    for _pf in _cl_platforms:
        for _dev in _pf.get_devices(cl.device_type.GPU):
            _cl_device = _dev
            break
        if _cl_device:
            break
    if _cl_device is None:
        for _pf in _cl_platforms:
            for _dev in _pf.get_devices(cl.device_type.CPU):
                _cl_device = _dev
                break
            if _cl_device:
                break

    if _cl_device is not None:
        _cl_ctx = cl.Context([_cl_device])
        _cl_queue = cl.CommandQueue(_cl_ctx)
        HAS_OPENCL = True
    else:
        HAS_OPENCL = False
except Exception:
    HAS_OPENCL = False
    cl = None  # type: ignore

# Public tier label
if HAS_CUPY:
    GPU_TIER = "cuda"
elif HAS_OPENCL:
    GPU_TIER = "opencl"
else:
    GPU_TIER = "cpu"


# ===========================================================================
# CUDA C source (Tier 1)
# ===========================================================================
_PANEL_VEL_DEVICE = r"""
__device__ void panel_velocity(
        double x, double y,
        const double* __restrict__ xa,
        const double* __restrict__ ya,
        const double* __restrict__ cos_t,
        const double* __restrict__ sin_t,
        const double* __restrict__ length,
        const double* __restrict__ sigma,
        const double* __restrict__ gamma,
        int n_panels,
        double& u_out, double& v_out)
{
    const double TWO_PI = 6.283185307179586;
    double u = 0.0, v = 0.0;
    for (int j = 0; j < n_panels; j++) {
        double dxj = x - xa[j];
        double dyj = y - ya[j];
        double ct  = cos_t[j], st = sin_t[j];
        double xi  =  dxj * ct + dyj * st;
        double eta = -dxj * st + dyj * ct;
        double L   = length[j];
        if (fabs(eta) < 1e-10) eta = 1e-10;
        double r1sq = xi * xi + eta * eta;
        if (r1sq < 1e-20) r1sq = 1e-20;
        double xiL  = xi - L;
        double r2sq = xiL * xiL + eta * eta;
        if (r2sq < 1e-20) r2sq = 1e-20;
        double lnr = 0.5 * log(r2sq / r1sq);
        double dth = atan2(eta, xiL) - atan2(eta, xi);
        double ul = sigma[j] * (-lnr / TWO_PI) + gamma[j] * (dth / TWO_PI);
        double vl = sigma[j] * (dth  / TWO_PI) + gamma[j] * (lnr / TWO_PI);
        u += ul * ct - vl * st;
        v += ul * st + vl * ct;
    }
    u_out = u; v_out = v;
}
"""

_VELOCITY_GRID_SRC = _PANEL_VEL_DEVICE + r"""
extern "C" __global__ void velocity_grid_kernel(
        double* __restrict__ U, double* __restrict__ V,
        int gn_x, int gn_y,
        double xmin, double dx, double ymin, double dy,
        double Vinf, double alpha,
        const double* __restrict__ xa, const double* __restrict__ ya,
        const double* __restrict__ cos_t, const double* __restrict__ sin_t,
        const double* __restrict__ length, const double* __restrict__ sigma,
        const double* __restrict__ gamma, int n_panels)
{
    int ix = (int)(blockIdx.x * blockDim.x + threadIdx.x);
    int iy = (int)(blockIdx.y * blockDim.y + threadIdx.y);
    if (ix >= gn_x || iy >= gn_y) return;
    double xx = xmin + ix * dx, yy = ymin + iy * dy;
    double u = Vinf * cos(alpha), v = Vinf * sin(alpha);
    double pu = 0.0, pv = 0.0;
    panel_velocity(xx, yy, xa, ya, cos_t, sin_t, length, sigma, gamma, n_panels, pu, pv);
    U[iy * gn_x + ix] = u + pu;
    V[iy * gn_x + ix] = v + pv;
}
"""

_VELOCITY_GRID_WAKE_SRC = _PANEL_VEL_DEVICE + r"""
extern "C" __global__ void velocity_grid_wake_kernel(
        double* __restrict__ U, double* __restrict__ V,
        int gn_x, int gn_y,
        double xmin, double dx, double ymin, double dy,
        double Vinf, double alpha,
        const double* __restrict__ xa, const double* __restrict__ ya,
        const double* __restrict__ cos_t, const double* __restrict__ sin_t,
        const double* __restrict__ length, const double* __restrict__ sigma,
        const double* __restrict__ gamma, int n_panels,
        const double* __restrict__ wx, const double* __restrict__ wy,
        const double* __restrict__ wg, int n_wake, double core_r2)
{
    int ix = (int)(blockIdx.x * blockDim.x + threadIdx.x);
    int iy = (int)(blockIdx.y * blockDim.y + threadIdx.y);
    if (ix >= gn_x || iy >= gn_y) return;
    double xx = xmin + ix * dx, yy = ymin + iy * dy;
    double u = Vinf * cos(alpha), v = Vinf * sin(alpha);
    double pu = 0.0, pv = 0.0;
    panel_velocity(xx, yy, xa, ya, cos_t, sin_t, length, sigma, gamma, n_panels, pu, pv);
    u += pu; v += pv;
    const double TWO_PI = 6.283185307179586;
    for (int k = 0; k < n_wake; k++) {
        double ddx = xx - wx[k], ddy = yy - wy[k];
        double fac = wg[k] / (TWO_PI * (ddx*ddx + ddy*ddy + core_r2));
        u -= ddy * fac; v += ddx * fac;
    }
    U[iy * gn_x + ix] = u;
    V[iy * gn_x + ix] = v;
}
"""

_TILE = 256

_ADVECT_WAKE_SRC = _PANEL_VEL_DEVICE + rf"""
#define TILE_SIZE {_TILE}
extern "C" __global__ void advect_wake_kernel(
        double* __restrict__ wx_new, double* __restrict__ wy_new,
        const double* __restrict__ wx, const double* __restrict__ wy,
        const double* __restrict__ wg, int n_wake,
        double dt, double Vinf, double alpha,
        const double* __restrict__ xa, const double* __restrict__ ya,
        const double* __restrict__ cos_t, const double* __restrict__ sin_t,
        const double* __restrict__ length, const double* __restrict__ sigma,
        const double* __restrict__ gamma, int n_panels, double core_r2)
{{
    __shared__ double sh_wx[TILE_SIZE], sh_wy[TILE_SIZE], sh_wg[TILE_SIZE];
    int i = (int)(blockIdx.x * blockDim.x + threadIdx.x);
    double xi = (i < n_wake) ? wx[i] : 0.0;
    double yi = (i < n_wake) ? wy[i] : 0.0;
    double u = Vinf * cos(alpha), v = Vinf * sin(alpha);
    if (i < n_wake) {{
        double pu = 0.0, pv = 0.0;
        panel_velocity(xi, yi, xa, ya, cos_t, sin_t, length, sigma, gamma, n_panels, pu, pv);
        u += pu; v += pv;
    }}
    const double TWO_PI = 6.283185307179586;
    int n_tiles = (n_wake + TILE_SIZE - 1) / TILE_SIZE;
    for (int t = 0; t < n_tiles; t++) {{
        int j_global = t * TILE_SIZE + (int)threadIdx.x;
        sh_wx[threadIdx.x] = (j_global < n_wake) ? wx[j_global] : 0.0;
        sh_wy[threadIdx.x] = (j_global < n_wake) ? wy[j_global] : 0.0;
        sh_wg[threadIdx.x] = (j_global < n_wake) ? wg[j_global] : 0.0;
        __syncthreads();
        if (i < n_wake) {{
            for (int s = 0; s < TILE_SIZE; s++) {{
                int j = t * TILE_SIZE + s;
                if (j >= n_wake || j == i) continue;
                double ddx = xi - sh_wx[s], ddy = yi - sh_wy[s];
                double fac = sh_wg[s] / (TWO_PI * (ddx*ddx + ddy*ddy + core_r2));
                u -= ddy * fac; v += ddx * fac;
            }}
        }}
        __syncthreads();
    }}
    if (i < n_wake) {{ wx_new[i] = xi + u * dt; wy_new[i] = yi + v * dt; }}
}}
"""

if HAS_CUPY:
    _k_vel_grid      = cp.RawKernel(_VELOCITY_GRID_SRC,      'velocity_grid_kernel')
    _k_vel_grid_wake = cp.RawKernel(_VELOCITY_GRID_WAKE_SRC,  'velocity_grid_wake_kernel')
    _k_advect_wake   = cp.RawKernel(_ADVECT_WAKE_SRC,         'advect_wake_kernel')


# ===========================================================================
# OpenCL C source (Tier 2 — Intel Iris Xe / any OpenCL device)
# ===========================================================================
# Uses double precision (requires cl_khr_fp64 — present on all Intel Xe).
# Local-memory tiling mirrors the CUDA shared-memory approach.
# ---------------------------------------------------------------------------

_OCL_PANEL_VEL = r"""
#pragma OPENCL EXTENSION cl_khr_fp64 : enable

static double2 panel_velocity_ocl(
        double x, double y,
        __global const double* xa,  __global const double* ya,
        __global const double* cos_t, __global const double* sin_t,
        __global const double* length,
        __global const double* sigma, __global const double* gamma_arr,
        int n_panels)
{
    const double TWO_PI = 6.283185307179586;
    double u = 0.0, v = 0.0;
    for (int j = 0; j < n_panels; j++) {
        double dxj = x - xa[j], dyj = y - ya[j];
        double ct = cos_t[j], st = sin_t[j];
        double xi  =  dxj * ct + dyj * st;
        double eta = -dxj * st + dyj * ct;
        double L   = length[j];
        if (fabs(eta) < 1e-10) eta = 1e-10;
        double r1sq = xi * xi + eta * eta;
        if (r1sq < 1e-20) r1sq = 1e-20;
        double xiL = xi - L;
        double r2sq = xiL * xiL + eta * eta;
        if (r2sq < 1e-20) r2sq = 1e-20;
        double lnr = 0.5 * log(r2sq / r1sq);
        double dth = atan2(eta, xiL) - atan2(eta, xi);
        double ul = sigma[j] * (-lnr / TWO_PI) + gamma_arr[j] * (dth / TWO_PI);
        double vl = sigma[j] * (dth  / TWO_PI) + gamma_arr[j] * (lnr / TWO_PI);
        u += ul * ct - vl * st;
        v += ul * st + vl * ct;
    }
    return (double2)(u, v);
}
"""

_OCL_VEL_GRID_SRC = _OCL_PANEL_VEL + r"""
__kernel void velocity_grid_kernel(
        __global double* U, __global double* V,
        int gn_x, int gn_y,
        double xmin, double dx, double ymin, double dy,
        double Vinf, double alpha,
        __global const double* xa,  __global const double* ya,
        __global const double* cos_t, __global const double* sin_t,
        __global const double* length,
        __global const double* sigma, __global const double* gamma_arr,
        int n_panels)
{
    int ix = get_global_id(0);
    int iy = get_global_id(1);
    if (ix >= gn_x || iy >= gn_y) return;
    double xx = xmin + ix * dx, yy = ymin + iy * dy;
    double2 pv = panel_velocity_ocl(xx, yy, xa, ya, cos_t, sin_t, length, sigma, gamma_arr, n_panels);
    U[iy * gn_x + ix] = Vinf * cos(alpha) + pv.x;
    V[iy * gn_x + ix] = Vinf * sin(alpha) + pv.y;
}
"""

_OCL_VEL_GRID_WAKE_SRC = _OCL_PANEL_VEL + r"""
__kernel void velocity_grid_wake_kernel(
        __global double* U, __global double* V,
        int gn_x, int gn_y,
        double xmin, double dx, double ymin, double dy,
        double Vinf, double alpha,
        __global const double* xa,  __global const double* ya,
        __global const double* cos_t, __global const double* sin_t,
        __global const double* length,
        __global const double* sigma, __global const double* gamma_arr,
        int n_panels,
        __global const double* wx, __global const double* wy,
        __global const double* wg, int n_wake, double core_r2)
{
    int ix = get_global_id(0);
    int iy = get_global_id(1);
    if (ix >= gn_x || iy >= gn_y) return;
    double xx = xmin + ix * dx, yy = ymin + iy * dy;
    double2 pv = panel_velocity_ocl(xx, yy, xa, ya, cos_t, sin_t, length, sigma, gamma_arr, n_panels);
    double u = Vinf * cos(alpha) + pv.x;
    double v = Vinf * sin(alpha) + pv.y;
    const double TWO_PI = 6.283185307179586;
    for (int k = 0; k < n_wake; k++) {
        double ddx = xx - wx[k], ddy = yy - wy[k];
        double fac = wg[k] / (TWO_PI * (ddx*ddx + ddy*ddy + core_r2));
        u -= ddy * fac; v += ddx * fac;
    }
    U[iy * gn_x + ix] = u;
    V[iy * gn_x + ix] = v;
}
"""

_OCL_TILE = 256

_OCL_ADVECT_WAKE_SRC = _OCL_PANEL_VEL + rf"""
#define TILE_SIZE {_OCL_TILE}
__kernel __attribute__((reqd_work_group_size(TILE_SIZE, 1, 1)))
void advect_wake_kernel(
        __global double* wx_new, __global double* wy_new,
        __global const double* wx, __global const double* wy,
        __global const double* wg, int n_wake,
        double dt, double Vinf, double alpha,
        __global const double* xa,  __global const double* ya,
        __global const double* cos_t, __global const double* sin_t,
        __global const double* length,
        __global const double* sigma, __global const double* gamma_arr,
        int n_panels, double core_r2)
{{
    __local double sh_wx[TILE_SIZE], sh_wy[TILE_SIZE], sh_wg[TILE_SIZE];
    int i       = get_global_id(0);
    int lid     = get_local_id(0);
    double xi = (i < n_wake) ? wx[i] : 0.0;
    double yi = (i < n_wake) ? wy[i] : 0.0;
    double u = Vinf * cos(alpha), v = Vinf * sin(alpha);
    if (i < n_wake) {{
        double2 pv = panel_velocity_ocl(xi, yi, xa, ya, cos_t, sin_t, length, sigma, gamma_arr, n_panels);
        u += pv.x; v += pv.y;
    }}
    const double TWO_PI = 6.283185307179586;
    int n_tiles = (n_wake + TILE_SIZE - 1) / TILE_SIZE;
    for (int t = 0; t < n_tiles; t++) {{
        int j_global = t * TILE_SIZE + lid;
        sh_wx[lid] = (j_global < n_wake) ? wx[j_global] : 0.0;
        sh_wy[lid] = (j_global < n_wake) ? wy[j_global] : 0.0;
        sh_wg[lid] = (j_global < n_wake) ? wg[j_global] : 0.0;
        barrier(CLK_LOCAL_MEM_FENCE);
        if (i < n_wake) {{
            for (int s = 0; s < TILE_SIZE; s++) {{
                int j = t * TILE_SIZE + s;
                if (j >= n_wake || j == i) continue;
                double ddx = xi - sh_wx[s], ddy = yi - sh_wy[s];
                double fac = sh_wg[s] / (TWO_PI * (ddx*ddx + ddy*ddy + core_r2));
                u -= ddy * fac; v += ddx * fac;
            }}
        }}
        barrier(CLK_LOCAL_MEM_FENCE);
    }}
    if (i < n_wake) {{ wx_new[i] = xi + u * dt; wy_new[i] = yi + v * dt; }}
}}
"""

# Compile OpenCL programs once at import time
if HAS_OPENCL:
    try:
        _ocl_prog_vel_grid      = cl.Program(_cl_ctx, _OCL_VEL_GRID_SRC).build()
        _ocl_prog_vel_grid_wake = cl.Program(_cl_ctx, _OCL_VEL_GRID_WAKE_SRC).build()
        _ocl_prog_advect        = cl.Program(_cl_ctx, _OCL_ADVECT_WAKE_SRC).build()
        _ocl_compiled = True
    except Exception as _e:
        import warnings
        warnings.warn(f"PyOpenCL kernel compilation failed: {_e}. Falling back to Numba.")
        HAS_OPENCL = False
        _ocl_compiled = False
        GPU_TIER = "cpu"


# ===========================================================================
# CUDA (Tier 1) helper: upload panel arrays
# ===========================================================================
def _upload_panels_cuda(xa, ya, cos_t, sin_t, length, sigma, gamma):
    return (cp.asarray(xa, dtype=np.float64), cp.asarray(ya, dtype=np.float64),
            cp.asarray(cos_t, dtype=np.float64), cp.asarray(sin_t, dtype=np.float64),
            cp.asarray(length, dtype=np.float64), cp.asarray(sigma, dtype=np.float64),
            cp.asarray(gamma, dtype=np.float64))


# ===========================================================================
# OpenCL (Tier 2) helper: send numpy arrays to device
# ===========================================================================
def _to_cl(arr):
    """Upload a contiguous float64 numpy array to the OpenCL device."""
    a = np.ascontiguousarray(arr, dtype=np.float64)
    return cl.Buffer(_cl_ctx, cl.mem_flags.READ_ONLY | cl.mem_flags.COPY_HOST_PTR, hostbuf=a)


def _cl_empty(n):
    return cl.Buffer(_cl_ctx, cl.mem_flags.READ_WRITE, size=n * 8)


def _cl_read(buf, n):
    out = np.empty(n, dtype=np.float64)
    cl.enqueue_copy(_cl_queue, out, buf)
    return out


# ===========================================================================
# Public API — automatically routes to best available tier
# ===========================================================================

def build_velocity_grid_gpu(gn_x: int, gn_y: int,
                             xmin: float, xmax: float,
                             ymin: float, ymax: float,
                             Vinf: float, alpha: float,
                             xa, ya, cos_t, sin_t, length, sigma, gamma):
    """Return (U, V) numpy arrays shape (gn_y, gn_x). Uses best available GPU."""
    dx = (xmax - xmin) / max(gn_x - 1, 1)
    dy = (ymax - ymin) / max(gn_y - 1, 1)
    n_panels = len(xa)

    # -- Tier 1: CUDA --
    if HAS_CUPY:
        d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm = _upload_panels_cuda(xa, ya, cos_t, sin_t, length, sigma, gamma)
        d_U = cp.empty((gn_y, gn_x), dtype=np.float64)
        d_V = cp.empty((gn_y, gn_x), dtype=np.float64)
        bx, by = 16, 16
        _k_vel_grid((math.ceil(gn_x/bx), math.ceil(gn_y/by)), (bx, by), (
            d_U, d_V, np.int32(gn_x), np.int32(gn_y),
            np.float64(xmin), np.float64(dx), np.float64(ymin), np.float64(dy),
            np.float64(Vinf), np.float64(alpha),
            d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm, np.int32(n_panels)))
        return cp.asnumpy(d_U), cp.asnumpy(d_V)

    # -- Tier 2: OpenCL --
    if HAS_OPENCL:
        d_xa  = _to_cl(xa);     d_ya  = _to_cl(ya)
        d_ct  = _to_cl(cos_t);  d_st  = _to_cl(sin_t)
        d_l   = _to_cl(length); d_sg  = _to_cl(sigma); d_gm = _to_cl(gamma)
        d_U   = _cl_empty(gn_x * gn_y)
        d_V   = _cl_empty(gn_x * gn_y)
        kern = _ocl_prog_vel_grid.velocity_grid_kernel
        kern.set_args(d_U, d_V,
                      np.int32(gn_x), np.int32(gn_y),
                      np.float64(xmin), np.float64(dx),
                      np.float64(ymin), np.float64(dy),
                      np.float64(Vinf), np.float64(alpha),
                      d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm,
                      np.int32(n_panels))
        cl.enqueue_nd_range_kernel(_cl_queue, kern, (gn_x, gn_y), None)
        _cl_queue.finish()
        U = _cl_read(d_U, gn_x * gn_y).reshape(gn_y, gn_x)
        V = _cl_read(d_V, gn_x * gn_y).reshape(gn_y, gn_x)
        return U, V

    raise RuntimeError("No GPU available — caller should use Numba path")


def build_velocity_grid_wake_gpu(gn_x: int, gn_y: int,
                                  xmin: float, xmax: float,
                                  ymin: float, ymax: float,
                                  Vinf: float, alpha: float,
                                  xa, ya, cos_t, sin_t, length, sigma, gamma,
                                  wx, wy, wg, n_wake: int,
                                  core_r2: float):
    """Return (U, V) numpy arrays including free-vortex contributions."""
    dx = (xmax - xmin) / max(gn_x - 1, 1)
    dy = (ymax - ymin) / max(gn_y - 1, 1)
    n_panels = len(xa)

    if HAS_CUPY:
        d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm = _upload_panels_cuda(xa, ya, cos_t, sin_t, length, sigma, gamma)
        d_wx = cp.asarray(wx[:n_wake], dtype=np.float64)
        d_wy = cp.asarray(wy[:n_wake], dtype=np.float64)
        d_wg = cp.asarray(wg[:n_wake], dtype=np.float64)
        d_U  = cp.empty((gn_y, gn_x), dtype=np.float64)
        d_V  = cp.empty((gn_y, gn_x), dtype=np.float64)
        bx, by = 16, 16
        _k_vel_grid_wake((math.ceil(gn_x/bx), math.ceil(gn_y/by)), (bx, by), (
            d_U, d_V, np.int32(gn_x), np.int32(gn_y),
            np.float64(xmin), np.float64(dx), np.float64(ymin), np.float64(dy),
            np.float64(Vinf), np.float64(alpha),
            d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm, np.int32(n_panels),
            d_wx, d_wy, d_wg, np.int32(n_wake), np.float64(core_r2)))
        return cp.asnumpy(d_U), cp.asnumpy(d_V)

    if HAS_OPENCL:
        d_xa  = _to_cl(xa);      d_ya  = _to_cl(ya)
        d_ct  = _to_cl(cos_t);   d_st  = _to_cl(sin_t)
        d_l   = _to_cl(length);  d_sg  = _to_cl(sigma); d_gm = _to_cl(gamma)
        d_wx  = _to_cl(wx[:n_wake])
        d_wy  = _to_cl(wy[:n_wake])
        d_wg  = _to_cl(wg[:n_wake])
        d_U   = _cl_empty(gn_x * gn_y)
        d_V   = _cl_empty(gn_x * gn_y)
        kern = _ocl_prog_vel_grid_wake.velocity_grid_wake_kernel
        kern.set_args(d_U, d_V,
                      np.int32(gn_x), np.int32(gn_y),
                      np.float64(xmin), np.float64(dx),
                      np.float64(ymin), np.float64(dy),
                      np.float64(Vinf), np.float64(alpha),
                      d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm,
                      np.int32(n_panels),
                      d_wx, d_wy, d_wg, np.int32(n_wake), np.float64(core_r2))
        cl.enqueue_nd_range_kernel(_cl_queue, kern, (gn_x, gn_y), None)
        _cl_queue.finish()
        U = _cl_read(d_U, gn_x * gn_y).reshape(gn_y, gn_x)
        V = _cl_read(d_V, gn_x * gn_y).reshape(gn_y, gn_x)
        return U, V

    raise RuntimeError("No GPU available — caller should use Numba path")


def advect_wake_gpu(wx, wy, wg, n_wake: int,
                    dt: float, Vinf: float, alpha: float,
                    xa, ya, cos_t, sin_t, length, sigma, gamma,
                    core_r2: float):
    """
    Advect free vortices in-place using the best available GPU tier.
    Modifies wx[:n_wake] and wy[:n_wake].
    """
    n_panels = len(xa)

    if HAS_CUPY:
        d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm = _upload_panels_cuda(xa, ya, cos_t, sin_t, length, sigma, gamma)
        d_wx = cp.asarray(wx[:n_wake], dtype=np.float64)
        d_wy = cp.asarray(wy[:n_wake], dtype=np.float64)
        d_wg = cp.asarray(wg[:n_wake], dtype=np.float64)
        d_wx_out = cp.empty(n_wake, dtype=np.float64)
        d_wy_out = cp.empty(n_wake, dtype=np.float64)
        threads = _TILE
        _k_advect_wake((math.ceil(n_wake / threads),), (threads,), (
            d_wx_out, d_wy_out, d_wx, d_wy, d_wg, np.int32(n_wake),
            np.float64(dt), np.float64(Vinf), np.float64(alpha),
            d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm,
            np.int32(n_panels), np.float64(core_r2)))
        wx[:n_wake] = cp.asnumpy(d_wx_out)
        wy[:n_wake] = cp.asnumpy(d_wy_out)
        return

    if HAS_OPENCL:
        d_xa  = _to_cl(xa);      d_ya  = _to_cl(ya)
        d_ct  = _to_cl(cos_t);   d_st  = _to_cl(sin_t)
        d_l   = _to_cl(length);  d_sg  = _to_cl(sigma); d_gm = _to_cl(gamma)
        d_wx_in  = _to_cl(wx[:n_wake])
        d_wy_in  = _to_cl(wy[:n_wake])
        d_wg_in  = _to_cl(wg[:n_wake])
        d_wx_out = _cl_empty(n_wake)
        d_wy_out = _cl_empty(n_wake)
        # Round up to TILE multiple for workgroup alignment
        gsize = math.ceil(n_wake / _OCL_TILE) * _OCL_TILE
        kern = _ocl_prog_advect.advect_wake_kernel
        kern.set_args(d_wx_out, d_wy_out,
                      d_wx_in, d_wy_in, d_wg_in, np.int32(n_wake),
                      np.float64(dt), np.float64(Vinf), np.float64(alpha),
                      d_xa, d_ya, d_ct, d_st, d_l, d_sg, d_gm,
                      np.int32(n_panels), np.float64(core_r2))
        cl.enqueue_nd_range_kernel(_cl_queue, kern, (gsize,), (_OCL_TILE,))
        _cl_queue.finish()
        wx[:n_wake] = _cl_read(d_wx_out, n_wake)
        wy[:n_wake] = _cl_read(d_wy_out, n_wake)
        return

    raise RuntimeError("No GPU available — caller should use Numba path")
