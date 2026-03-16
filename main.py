#!/usr/bin/env python3
"""
CFD Panel Method — High-Resolution Numba-Accelerated Simulation
================================================================
Features:
  - Hess-Smith panel method with Kutta condition
  - 50,000 particles via velocity grid interpolation (O(1) per particle)
  - 400×400 pressure field, 40 JIT streamlines, anti-aliased rendering
  - Interactive tooltips on all controls and readouts (ⓘ hover/click)
"""

import subprocess, sys, math, time, threading
from pathlib import Path

def _ensure(pkg, imp=None):
    imp = imp or pkg
    try: __import__(imp); return True
    except ImportError:
        print(f"  {pkg} not found — installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            __import__(imp); print(f"  ✓ {pkg}"); return True
        except Exception as e: print(f"  ✗ {pkg}: {e}"); return False

import numpy as np
sys.path.insert(0, str(Path(__file__).parent / "src"))
from simulation.panel_method import HessSmithSolver
from simulation.geometry import (make_naca_panels, make_cylinder_panels,
                                  make_square_panels, make_panels_from_coords)
from simulation.vortex_wake import VortexWake
from simulation.numba_kernels import (
    HAS_NUMBA, extract_panel_arrays, warmup_jit,
    _velocity_at_jit, _velocity_batch_jit,
    _build_velocity_grid_jit, _advect_particles_grid_jit,
    _compute_streamlines_jit, _render_particles_jit, _batch_spawn_jit,
    _advect_particles_jit,
)
try:
    from simulation.numba_kernels import _compute_streamlines_grid_jit  # P2
except ImportError:
    _compute_streamlines_grid_jit = None
from simulation.barnes_hut import (                                      # P8
    barnes_hut_mutual_velocity, BARNES_HUT_THRESHOLD)
from simulation.boundary_layer import compute_boundary_layer             # P9
try:
    from simulation.numba_kernels import (
        _vortex_velocity_at_jit, _advect_wake_jit,
        _build_velocity_grid_with_wake_jit,
    )
except ImportError:
    _vortex_velocity_at_jit = None
    _advect_wake_jit = None
    _build_velocity_grid_with_wake_jit = None

# GPU backend (CuPy + CUDA) — preferred when available
try:
    from simulation.gpu_kernels import (
        HAS_CUPY, HAS_OPENCL, GPU_TIER,
        build_velocity_grid_gpu,
        build_velocity_grid_wake_gpu,
        advect_wake_gpu,
    )
except Exception:
    HAS_CUPY = False
    HAS_OPENCL = False
    GPU_TIER = "cpu"
    build_velocity_grid_gpu = None
    build_velocity_grid_wake_gpu = None
    advect_wake_gpu = None

print("Checking dependencies...")
HAS_PYGAME = _ensure("pygame")
HAS_PILLOW = _ensure("Pillow", "PIL")
if HAS_PYGAME:
    import pygame
    import pygame.surfarray
    import pygame.gfxdraw
    from ui.widgets import TooltipManager, Slider, Toggle, ButtonGroup, Dropdown, Button, TIPS
HAS_MPL = _ensure("matplotlib")
if HAS_MPL:
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
if not HAS_NUMBA: _ensure("numba")
print(f"  Numba JIT:  {'✓ enabled (parallel)' if HAS_NUMBA else '✗ disabled (pip install numba for 50-100x speedup)'}")
try:
    from simulation.gpu_kernels import _cl_device as _ocl_dev
    _cl_device_name = _ocl_dev.name.strip() if HAS_OPENCL else ""
except Exception:
    _cl_device_name = ""
_gpu_status = (f"✓ CUDA (cupy)" if HAS_CUPY
               else f"✓ OpenCL — {_cl_device_name}" if HAS_OPENCL
               else "✗ not available  →  install Intel OpenCL (intel-opencl-icd) + pip install pyopencl")
print(f"  GPU:        {_gpu_status}")
print()


# ============================================================
# COLOUR HELPERS
# ============================================================

def pressure_color_array(cp_arr):
    t = np.clip(cp_arr, -3.0, 1.5)
    r = np.empty_like(t); g = np.empty_like(t); b = np.empty_like(t)
    neg = t < 0; sn = np.clip(-t / 2.5, 0, 1)
    r[neg]=30+(1-sn[neg])*180; g[neg]=60+(1-sn[neg])*150; b[neg]=180+(1-sn[neg])*75
    pos = ~neg; sp = np.clip(t / 1.2, 0, 1)
    r[pos]=210+sp[pos]*45; g[pos]=210-sp[pos]*160; b[pos]=255-sp[pos]*220
    return np.stack([r, g, b], axis=-1).astype(np.uint8)

def pressure_color(cp):
    t = max(-3.0, min(1.5, cp))
    if t < 0: s=min(1,-t/2.5); return (int(30+(1-s)*180),int(60+(1-s)*150),int(180+(1-s)*75))
    s=min(1,t/1.2); return (int(210+s*45),int(210-s*160),int(255-s*220))


# ============================================================
# GEOMETRY HELPERS
# ============================================================

def _segments_intersect(x1, y1, x2, y2, x3, y3, x4, y4):
    """Return True if open line segments (p1→p2) and (p3→p4) properly intersect."""
    d1x = x2 - x1; d1y = y2 - y1
    d2x = x4 - x3; d2y = y4 - y3
    cross = d1x * d2y - d1y * d2x
    if abs(cross) < 1e-12:
        return False  # parallel / collinear
    t = ((x3 - x1) * d2y - (y3 - y1) * d2x) / cross
    u = ((x3 - x1) * d1y - (y3 - y1) * d1x) / cross
    return 0.0 < t < 1.0 and 0.0 < u < 1.0


def polygon_self_intersects(x, y):
    """Return True if the polygon defined by arrays x, y has any self-intersecting edges."""
    n = len(x)
    for i in range(n):
        x1, y1 = x[i], y[i]
        x2, y2 = x[(i + 1) % n], y[(i + 1) % n]
        # Only need to check non-adjacent edges
        limit = n - 1 if i == 0 else n
        for j in range(i + 2, limit):
            x3, y3 = x[j], y[j]
            x4, y4 = x[(j + 1) % n], y[(j + 1) % n]
            if _segments_intersect(x1, y1, x2, y2, x3, y3, x4, y4):
                return True
    return False


# ============================================================
# INTERACTIVE SIMULATION
# ============================================================

def run_interactive():
    if not HAS_PYGAME: print("Pygame not available"); run_static(); return

    pygame.init()
    W, H = 1400, 800; SBW = 280; CW = W - SBW; CP_H = 180
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("CFD Panel Method — Hess-Smith Solver")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 18); lfont = pygame.font.Font(None, 16)
    tfont = pygame.font.Font(None, 22); mfont = pygame.font.Font(None, 20)
    tip_font = pygame.font.Font(None, 17)

    solver = HessSmithSolver()
    SB = (-1.5, 2.5, -1.5, 1.5)
    panels = []; panel_arrays = None
    body_vx = np.array([], np.float64); body_vy = np.array([], np.float64)
    # Velocity grid resolution.
    # Intel Iris Xe (integrated, shared LPDDR5): 300×180 is a good balance.
    # Bump to 400×240 if running with a discrete GPU (OpenCL or CUDA tier).
    VGRID_NX, VGRID_NY = (400, 240) if (HAS_CUPY or HAS_OPENCL) else (300, 180)
    U_grid = None; V_grid = None

    NACA_OPTS = ["0012","2412","4412","0006","6412","2424"]
    BTYPES = ["NACA","Cylinder","Square","Image","Draw"]

    sx = CW+12; sw = SBW-24
    bg_ = ButtonGroup(sx,50,BTYPES,0)
    bg_.bw = 50; bg_.gap = 3
    ndd = Dropdown(sx+80,86,sw-80,NACA_OPTS,1)
    sl_v=Slider(sx,130,sw,"V∞",1.0,0.2,3.0,0.05,"{:.2f}")
    sl_a=Slider(sx,164,sw,"α (deg)",5.0,-15.0,15.0,0.5,"{:.1f}°")
    sl_p=Slider(sx,198,sw,"Panels",120,20,500,4,"{:.0f}")  # P4: raised max 200→500
    sl_c=Slider(sx,232,sw,"Chord (m)",1.0,0.3,2.0,0.05,"{:.2f}")
    sls=[sl_v,sl_a,sl_p,sl_c]
    ty=284; tg_=22
    t_str=Toggle(sx,ty,"Streamlines",True);   t_pre=Toggle(sx,ty+tg_,"Pressure field",True)
    t_vec=Toggle(sx,ty+tg_*2,"Velocity vectors",False); t_par=Toggle(sx,ty+tg_*3,"Particles",True)
    t_nor=Toggle(sx,ty+tg_*4,"Panel normals",True);     t_cp=Toggle(sx,ty+tg_*5,"Cp plot",True)
    t_wake=Toggle(sx,ty+tg_*6,"Vortex shedding",False)
    t_osc=Toggle(sx,ty+tg_*7,"Pitch oscillation",False)
    t_visc=Toggle(sx,ty+tg_*8,"Viscous BL coupling",False)
    t_flap=Toggle(sx,ty+tg_*9,"Multi-element (flap)",False)
    tgs=[t_str,t_pre,t_vec,t_par,t_nor,t_cp,t_wake,t_osc,t_visc,t_flap]
    _BN_Y = ty + tg_*10 + 14          # button row y
    btn_s=Button(sx,_BN_Y,70,28,"Solve")
    btn_c=Button(sx+78,_BN_Y,70,28,"Clear",(180,50,70))
    btn_ss=Button(sx+156,_BN_Y,sw-158,28,"Screenshot",(40,110,75))
    sl_osc_f=Slider(sx,_BN_Y+36,sw,"Osc f(Hz)",0.5,0.05,3.0,0.05,"{:.2f}")
    sl_osc_a=Slider(sx,_BN_Y+70,sw,"Osc A(°)", 5.0, 0.5,15.0, 0.5,"{:.1f}")

    # --- Vortex wake state ---
    wake = VortexWake(max_vortices=2000, core_radius=0.025)
    wake_sim_time = 0.0
    wake_grid_timer = 0
    # Track previous wake-toggle state to detect transitions
    wake_was_on = False

    # --- Viscous BL coupling state ---
    visc_was_on = False            # edge-detect toggle for viscous mode
    # --- Multi-element flap state ---
    flap_was_on = False            # edge-detect toggle for flap mode

    # --- Pitch oscillation state ---
    osc_t       = 0.0              # oscillation time counter (s)
    osc_was_on  = False            # edge-detect toggle
    cl_hist     = np.full((300, 2), np.nan, dtype=np.float64)  # (alpha_deg, CL)
    cl_hist_idx = 0                # circular buffer write pointer
    cl_hist_len = 0                # number of valid entries (≤ 300)
    c_osc       = None             # cached oscillation surface

    # --- Drawing tool state ---
    draw_points = []        # list of [x_sim, y_sim] control points
    draw_undo_stack = []    # stack of draw_points snapshots for Ctrl+Z
    draw_dragging = -1      # index of point being dragged, -1 = none
    draw_closed = False     # True once shape is closed and ready to solve
    draw_warn_msg = ""      # transient warning shown on canvas
    draw_warn_timer = 0
    DRAW_CLOSE_DIST = 15
    DRAW_GRAB_DIST = 10

    # --- Image import state ---
    custom_coords = None
    import_msg = ""
    import_msg_timer = 0

    # --- Solver error / status notification ---
    solve_err_msg = ""
    solve_err_timer = 0
    status_msg = ""
    status_msg_timer = 0

    # Physics constants
    NU_AIR  = 1.5e-5   # kinematic viscosity of air at 20°C, m²/s
    RHO_AIR = 1.225    # air density, kg/m³ (ISA sea-level)

    # Background grid computation state
    _bg_state = {'computing': False, 'result': None}

    # Polar overlay state  (accumulates one point per solve)
    polar_data    = []          # list of [alpha_deg, CL, CD_tot]
    polar_visible = False
    polar_pos     = [20, 20]    # top-left corner on the canvas
    _polar_drag   = False
    _polar_drag_origin = (0, 0)

    # Help overlay
    help_visible = False

    def do_image_import():
        nonlocal custom_coords, import_msg, import_msg_timer
        # Auto-install Pillow if missing
        if not HAS_PILLOW:
            if not _ensure("Pillow", "PIL"):
                import_msg = "Pillow install failed: pip install Pillow"; import_msg_timer = 300
                return False
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk(); root.withdraw()
            filepath = filedialog.askopenfilename(
                title="Select shape image",
                filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp"), ("All files", "*.*")])
            root.destroy()
            if not filepath:
                import_msg = "No file selected"; import_msg_timer = 180; return False
        except Exception as ex:
            import_msg = f"File dialog error: {ex}"; import_msg_timer = 300; return False

        try:
            from simulation.geometry import contour_from_image
            n_pan = int(sl_p.val); ch = sl_c.val
            cx, cy = contour_from_image(filepath, n_pan, ch, 0.0, 0.0)
            custom_coords = (cx, cy)
            import_msg = f"✓ Imported {len(cx)-1} panels from image"; import_msg_timer = 240
            return True
        except Exception as ex:
            import_msg = f"Import failed: {ex}"; import_msg_timer = 300; return False

    def build_draw_shape():
        """Convert draw_points to panels via spline interpolation.
        Returns False (and sets draw_warn_msg) if the shape self-intersects."""
        nonlocal custom_coords, draw_warn_msg, draw_warn_timer
        if len(draw_points) < 3:
            return False
        try:
            from simulation.geometry import spline_from_control_points
            cx = np.array([p[0] for p in draw_points], np.float64)
            cy = np.array([p[1] for p in draw_points], np.float64)
            n_pan = int(sl_p.val)
            x, y = spline_from_control_points(cx, cy, n_pan)
            # Self-intersection check on the resulting spline
            if polygon_self_intersects(x[:-1], y[:-1]):
                draw_warn_msg = "⚠ Shape self-intersects — rearrange points"
                draw_warn_timer = 180
                return False
            custom_coords = (x, y)
            draw_warn_msg = ""
            return True
        except Exception as ex:
            draw_warn_msg = f"Spline error: {ex}"
            draw_warn_timer = 180
            print(f"  Spline error: {ex}")
            return False

    # --- Tooltip manager ---
    tm = TooltipManager(font, tip_font, canvas_width=CW)
    tm.register_at(sx + sw - 14, 52, *TIPS['body_type'])
    tm.register_at(sx + sw - 14, 88, *TIPS['naca'])
    tm.register_at(sx + sw - 14, sl_v.rect.y + 4, *TIPS['vinf'])
    tm.register_at(sx + sw - 14, sl_a.rect.y + 4, *TIPS['alpha'])
    tm.register_at(sx + sw - 14, sl_p.rect.y + 4, *TIPS['panels'])
    tm.register_at(sx + sw - 14, sl_c.rect.y + 4, *TIPS['size'])
    toggle_tips = ['streamlines','pressure','vectors','particles','normals','cpplot','wake','osc','viscous','flap']
    for tg_w, tip_key in zip(tgs, toggle_tips):
        tm.register_at(sx + sw - 14, tg_w.y + 1, *TIPS[tip_key])
    tm.register_at(sx + sw - 14, sl_osc_f.rect.y + 4, *TIPS['osc_freq'])
    tm.register_at(sx + sw - 14, sl_osc_a.rect.y + 4, *TIPS['osc_amp'])
    _RD_BASE = _BN_Y + 108                 # readout box y origin  (474+108=582 → +18=600)
    for i, tip_key in enumerate(['cl', 'gamma', 'cl_theory', 'panel_count',
                                  'cd_friction', 'cd_pressure', 're']):
        row, ci = i // 2, i % 2
        bx = sx + ci * (sw // 2 + 4)
        by = _RD_BASE + 18 + row * 40      # row spacing 40 px (was 52)
        tm.register_at(bx + sw // 2 - 18, by + 2, *TIPS[tip_key])
    tm.register_at(btn_ss.rect.right - 14, btn_ss.rect.y + 4, *TIPS['screenshot'])

    # --- Particles ---
    MAX_P = 50000
    p_x=np.zeros(MAX_P,np.float64); p_y=np.zeros(MAX_P,np.float64)
    p_vx=np.zeros(MAX_P,np.float64); p_vy=np.zeros(MAX_P,np.float64)
    p_age=np.zeros(MAX_P,np.int32); p_count=0; SPAWN=60

    def s2s(svx, svy, ch=None):
        ch = ch or (H-(CP_H if t_cp.state else 0))
        return (int((svx-SB[0])/(SB[1]-SB[0])*CW),
                int((1-(svy-SB[2])/(SB[3]-SB[2]))*ch))

    def scr2sim(px, py):
        ch = H-(CP_H if t_cp.state else 0)
        sx_v = SB[0] + px / CW * (SB[1] - SB[0])
        sy_v = SB[3] - py / ch * (SB[3] - SB[2])
        return sx_v, sy_v

    c_press=c_stream=c_vec=c_body=c_cp=None
    part_buf = np.zeros((H, CW, 3), dtype=np.uint8)
    # P9: boundary layer results (updated whenever geometry changes)
    bl_result = {}
    RE_DEFAULT = 5e5   # Reynolds number used for BL calculations

    def _build_cp_surf():
        """(Re)draw the Cp distribution plot surface from current panel.cp values.
        Called on every solve and, when wake is active, every 3 frames so the plot
        reflects the time-varying unsteady pressure distribution."""
        surf = pygame.Surface((CW, CP_H)); surf.fill((15, 21, 32))
        ml, mr, mt, mb = 50, 20, 28, 24
        pw = CW - ml - mr; ph = CP_H - mt - mb
        xm  = np.array([p.xm for p in panels])
        cpv = np.array([p.cp for p in panels])
        xnc, xxc = xm.min(), xm.max()
        clo = min(cpv.min(), -2.5); chi = max(cpv.max(), 1.2)
        def _c2s(xv, cv):
            return (int(ml + (xv - xnc) / (xxc - xnc + 1e-30) * pw),
                    int(mt + (chi - cv) / (chi - clo + 1e-30) * ph))
        for cv in np.arange(np.floor(clo), np.ceil(chi) + 0.5, 0.5):
            _, gy = _c2s(0, cv)
            pygame.draw.line(surf, (30, 42, 63), (ml, gy), (CW - mr, gy), 1)
            if abs(cv - round(cv)) < 0.01:
                surf.blit(lfont.render(f"{cv:.0f}", True, (107, 125, 153)), (ml - 24, gy - 5))
        _, y0 = _c2s(0, 0)
        for _dx in range(ml, CW - mr, 8):
            pygame.draw.line(surf, (60, 75, 100), (_dx, y0), (min(_dx + 4, CW - mr), y0), 1)
        le = np.argmin(xm)
        up = [_c2s(xm[i], cpv[i]) for i in range(le + 1)]
        lo = [_c2s(xm[i], cpv[i]) for i in range(le, len(xm))]
        if len(up) > 1: pygame.draw.aalines(surf, (59, 158, 255), False, up)
        if len(lo) > 1: pygame.draw.aalines(surf, (255, 119, 68), False, lo)
        # Thin-airfoil theory reference lines (flat-plate prediction)
        alpha_rad = math.radians(sl_a.val)
        if abs(alpha_rad) > 1e-4:
            xi_th = np.linspace(0.01, 0.99, 120)
            x_th  = xnc + xi_th * (xxc - xnc)
            cp_mag = 2.0 * abs(alpha_rad) * np.sqrt((1.0 - xi_th) / xi_th)
            cp_th_up = -np.sign(alpha_rad) * cp_mag
            cp_th_lo =  np.sign(alpha_rad) * cp_mag
            def _dd(pts, col):
                for _j in range(0, len(pts) - 1, 2):
                    pygame.draw.line(surf, col, pts[_j], pts[_j + 1], 1)
            th_up = [_c2s(x_th[k], cp_th_up[k])
                     for k in range(len(xi_th)) if clo <= cp_th_up[k] <= chi]
            th_lo = [_c2s(x_th[k], cp_th_lo[k])
                     for k in range(len(xi_th)) if clo <= cp_th_lo[k] <= chi]
            if len(th_up) > 4: _dd(th_up, (100, 160, 230))
            if len(th_lo) > 4: _dd(th_lo, (230, 160, 90))
            surf.blit(lfont.render("-- TAT", True, (120, 140, 170)), (CW - mr - 46, CP_H - 18))
        surf.blit(lfont.render("Cp Distribution", True, (107, 125, 153)), (ml + 4, 6))
        surf.blit(lfont.render("● Upper", True, (59, 158, 255)), (CW - mr - 130, 6))
        surf.blit(lfont.render("● Lower", True, (255, 119, 68)), (CW - mr - 62, 6))
        return surf

    # ------------------------------------------------------------------
    def _build_osc_surf():
        """CL-α hysteresis loop with Theodorsen C(k) theory overlay."""
        nonlocal cl_hist, cl_hist_idx, cl_hist_len
        surf = pygame.Surface((CW, CP_H)); surf.fill((15, 21, 32))
        ml, mr, mt, mb = 50, 20, 28, 24
        pw = CW - ml - mr; ph = CP_H - mt - mb

        if cl_hist_len < 10:
            msg = "Pitch oscillation — enable Vortex Shedding and wait..." if not t_wake.state else \
                  "Pitch oscillation — collecting history..."
            surf.blit(lfont.render(msg, True, (107, 125, 153)), (ml, CP_H // 2 - 6))
            return surf

        # Ordered data from circular buffer
        if cl_hist_len < 300:
            data = cl_hist[:cl_hist_len].copy()
        else:
            data = np.concatenate([cl_hist[cl_hist_idx:], cl_hist[:cl_hist_idx]])

        a_c   = sl_a.val
        a_r   = max(sl_osc_a.val * 1.4, 1.5)
        cl_c  = float(solver.get_lift_coefficient(0, sl_c.val)) if solver.solved else 0.0
        cl_r  = max(2 * math.pi * math.radians(sl_osc_a.val) * 1.4, 0.4)
        a_lo  = a_c - a_r;  a_hi  = a_c + a_r
        cl_lo = cl_c - cl_r; cl_hi = cl_c + cl_r

        def _ax(a): return int(ml + (a  - a_lo)  / (a_hi  - a_lo  + 1e-10) * pw)
        def _cy(c): return int(mt + (cl_hi - c)   / (cl_hi  - cl_lo + 1e-10) * ph)

        # Grid lines
        for av in np.arange(math.ceil(a_lo - 1), a_hi + 1, 2.0):
            gx = _ax(av)
            if ml <= gx <= ml + pw:
                pygame.draw.line(surf, (30, 42, 63), (gx, mt), (gx, mt + ph), 1)
                surf.blit(lfont.render(f"{av:.0f}°", True, (70, 85, 105)), (gx - 8, mt + ph + 2))
        for cv in np.arange(math.floor((cl_lo) * 2) / 2, cl_hi + 0.25, 0.5):
            gy = _cy(cv)
            if mt <= gy <= mt + ph:
                pygame.draw.line(surf, (30, 42, 63), (ml, gy), (ml + pw, gy), 1)
                surf.blit(lfont.render(f"{cv:.1f}", True, (70, 85, 105)), (2, gy - 5))
        pygame.draw.line(surf, (50, 65, 90), (ml, _cy(0)), (ml + pw, _cy(0)), 1)
        pygame.draw.line(surf, (50, 65, 90), (_ax(a_c), mt), (_ax(a_c), mt + ph), 1)

        # Theodorsen ellipse
        k_val = math.pi * sl_osc_f.val * sl_c.val / max(sl_v.val, 0.01)
        try:
            from scipy.special import j0 as _j0, j1 as _j1, y0 as _y0, y1 as _y1
            _k = float(k_val)
            H0 = complex(_j0(_k), -_y0(_k))
            H1 = complex(_j1(_k), -_y1(_k))
            Ck   = H1 / (H1 + 1j * H0)
            F    = Ck.real
            G    = -Ck.imag
            A_r  = math.radians(sl_osc_a.val)
            th_pts = []
            for ti in np.linspace(0, 2 * math.pi, 200):
                a_th  = a_c  + sl_osc_a.val * math.sin(ti)
                cl_th = cl_c + 2 * math.pi * A_r * (
                    F * math.sin(ti) + (G + k_val / 2) * math.cos(ti))
                gx, gy = _ax(a_th), _cy(cl_th)
                if ml - 2 <= gx <= ml + pw + 2 and mt - 2 <= gy <= mt + ph + 2:
                    th_pts.append((max(ml, min(ml + pw, gx)),
                                   max(mt, min(mt + ph, gy))))
            if len(th_pts) > 4:
                pygame.draw.aalines(surf, (255, 185, 55), True, th_pts)
        except Exception:
            pass

        # Simulation data (draw last so it's on top)
        sim_pts = [(_ax(float(data[i, 0])), _cy(float(data[i, 1])))
                   for i in range(len(data))]
        valid_sim = [(gx, gy) for gx, gy in sim_pts
                     if ml - 5 <= gx <= ml + pw + 5 and mt - 5 <= gy <= mt + ph + 5]
        if len(valid_sim) > 2:
            pygame.draw.aalines(surf, (59, 158, 255), False, valid_sim)

        # Arrow showing traversal direction (last two points)
        if len(valid_sim) >= 2:
            gx, gy = valid_sim[-1]
            if ml <= gx <= ml + pw and mt <= gy <= mt + ph:
                pygame.gfxdraw.aacircle(surf, gx, gy, 4, (46, 232, 154, 255))
                pygame.gfxdraw.filled_circle(surf, gx, gy, 4, (46, 232, 154, 255))

        # Labels
        surf.blit(lfont.render(f"CL vs α  (k={k_val:.3f})", True, (107, 125, 153)), (ml + 4, 4))
        surf.blit(lfont.render("— Sim", True, (59, 158, 255)), (CW - mr - 140, 4))
        surf.blit(lfont.render("— Theodorsen", True, (255, 185, 55)), (CW - mr - 210, 4))
        surf.blit(lfont.render("α", True, (80, 100, 130)), (ml + pw - 6, mt + ph + 2))
        surf.blit(lfont.render("CL", True, (80, 100, 130)), (0, mt - 2))
        return surf
    # ------------------------------------------------------------------

    def _apply_bg_grid_result(res, ch):
        """Convert raw numpy data from bg thread into pygame surfaces (main-thread only)."""
        nonlocal c_press, c_stream, c_vec, U_grid, V_grid
        U_grid, V_grid = res['U'], res['V']
        # Pressure field surface
        cols = pressure_color_array(res['Cp_field'])
        PRES = res['Cp_field'].shape[0]
        small = pygame.Surface((PRES, PRES))
        pygame.surfarray.blit_array(small, cols.transpose(1, 0, 2))
        c_press = pygame.transform.smoothscale(small, (CW, ch))
        c_press.set_alpha(100)
        # Streamlines
        all_pts, starts, n_lines = res['streamlines']
        c_stream = pygame.Surface((CW, ch), pygame.SRCALPHA)
        if all_pts is not None:
            for k in range(n_lines):
                i0 = starts[k]; i1 = starts[k + 1]
                if i1 - i0 < 6: continue
                pts = [s2s(all_pts[i, 0], all_pts[i, 1], ch) for i in range(i0, i1)]
                pygame.draw.aalines(c_stream, (100, 200, 255, 120), False, pts)
                for j in range(0, len(pts) - 1, 7):
                    pd_x, pd_y = pts[j]
                    if 0 <= pd_x < CW and 0 <= pd_y < ch:
                        pygame.gfxdraw.aacircle(c_stream, pd_x, pd_y, 1, (120, 210, 255, 190))
                        pygame.gfxdraw.filled_circle(c_stream, pd_x, pd_y, 1, (120, 210, 255, 190))
        # Velocity vectors
        snap_pa = res['panel_arrays']
        c_vec = pygame.Surface((CW, ch), pygame.SRCALPHA)
        step = 20
        for px in range(step // 2, CW, step):
            for py in range(step // 2, ch, step):
                sim_x = SB[0] + px / CW * (SB[1] - SB[0])
                sim_y = SB[3] - py / ch * (SB[3] - SB[2])
                u, v = _velocity_at_jit(sim_x, sim_y, res['v_inf'], 0.0, *snap_pa)
                mag = math.sqrt(u * u + v * v)
                if mag < 0.02: continue
                sc = 7 / max(res['v_inf'], 0.1)
                br = min(255, int(80 + mag / max(res['v_inf'], 0.01) * 120))
                pygame.draw.aaline(c_vec, (br, br, br, 55), (px, py), (int(px + u * sc), int(py - v * sc)))

    def rebuild_caches(ch):
        nonlocal c_body, c_cp, panel_arrays
        if not solver.solved or not panels: return
        xn, xx, yn, yx = SB; t0 = time.time()

        # ── Fast surfaces (main thread) ──────────────────────────────────────
        c_body = pygame.Surface((CW,ch),pygame.SRCALPHA)
        bpts=[s2s(p.xa,p.ya,ch) for p in panels]
        if len(bpts)>2:
            pygame.draw.polygon(c_body,(20,28,46,255),bpts)
            for p in panels:
                x1,y1=s2s(p.xa,p.ya,ch); x2,y2=s2s(p.xb,p.yb,ch)
                pygame.draw.line(c_body,(*pressure_color(p.cp),255),(x1,y1),(x2,y2),3)
            pygame.draw.aalines(c_body,(74,106,159,255),True,bpts)
            skip=max(1,len(panels)//32)
            for i in range(0,len(panels),skip):
                p=panels[i]; sx_p,sy_p=s2s(p.xm,p.ym,ch)
                pygame.draw.aaline(c_body,(255,170,50,200),(sx_p,sy_p),(sx_p+int(p.nx*18),sy_p-int(p.ny*18)))

        c_cp = _build_cp_surf()

        # P9: Boundary layer solve — runs after every geometry change.
        # When Viscous BL coupling is on, iterate panel→BL→transpiration 5×.
        nonlocal bl_result
        try:
            bl_result = compute_boundary_layer(
                panels, (0, len(panels)),
                V_inf=sl_v.val, Re=RE_DEFAULT, chord=sl_c.val)
            if t_visc.state and solver.solved and bl_result:
                # Viscous-inviscid iteration with under-relaxation.
                # Relaxation factor 0.15 keeps the Ue change per step small
                # enough to prevent BL overflow, while 5 × 0.15 = 75% of
                # the total correction is applied after convergence.
                # Early-exit when CL changes by less than 1e-5 between
                # iterations — in practice this converges in 2-3 steps,
                # halving the cost vs. always running all 5.
                VISC_RELAX = 0.15
                _cl_prev = solver.get_lift_coefficient(0, sl_c.val)
                for _vi in range(5):
                    q_visc = bl_result.get('transpiration')
                    if q_visc is not None and len(q_visc) >= len(panels):
                        solver.solve_viscous(sl_v.val, 0.0,
                                             np.asarray(q_visc) * VISC_RELAX)
                        bl_result = compute_boundary_layer(
                            panels, (0, len(panels)),
                            V_inf=sl_v.val, Re=RE_DEFAULT, chord=sl_c.val)
                        _cl_now = solver.get_lift_coefficient(0, sl_c.val)
                        if abs(_cl_now - _cl_prev) < 1e-5:
                            break
                        _cl_prev = _cl_now
                # Refresh panel_arrays after viscous solve
                panel_arrays = extract_panel_arrays(panels)
        except Exception:
            bl_result = {}

        # Draw BL markers on the body surface
        def _draw_bl_marker(x_coord, color, label, offset_side=1):
            """Draw a vertical tick + label at a given x body coordinate."""
            if x_coord is None: return
            # Find the panel closest to this x on the relevant side
            best = min(panels, key=lambda p: abs(p.xm - x_coord))
            px_s, py_s = s2s(best.xm, best.ym, ch)
            # Tick
            pygame.draw.line(c_body, color,
                             (px_s, py_s - 8 * offset_side),
                             (px_s, py_s + 8 * offset_side), 2)
            # Label
            c_body.blit(lfont.render(label, True, color),
                        (px_s + 3, py_s - 8))

        _draw_bl_marker(bl_result.get('x_tr_upper'),  (255, 230,  60), "T", -1)
        _draw_bl_marker(bl_result.get('x_tr_lower'),  (255, 230,  60), "T",  1)
        _draw_bl_marker(bl_result.get('x_sep_upper'), (255,  80,  80), "S", -1)
        _draw_bl_marker(bl_result.get('x_sep_lower'), (255,  80,  80), "S",  1)

        # Displacement body outline — offset each panel midpoint outward by δ*
        # (scaled ×5 for visual clarity) when Viscous BL coupling is active.
        if t_visc.state and bl_result.get('delta_star') is not None:
            dstar = bl_result['delta_star']
            DISP_SCALE = 5.0   # visual exaggeration factor (shown in UI label)
            disp_pts = []
            for i, p in enumerate(panels):
                if i < len(dstar) and dstar[i] > 1e-8:
                    dx = p.xm + p.nx * dstar[i] * DISP_SCALE
                    dy = p.ym + p.ny * dstar[i] * DISP_SCALE
                    disp_pts.append(s2s(dx, dy, ch))
            if len(disp_pts) > 2:
                pygame.draw.aalines(c_body, (0, 210, 180, 200), True, disp_pts)
            c_body.blit(lfont.render("δ* ×5", True, (0, 180, 155)),
                        (4, ch - 18))

        print(f"  Caches rebuilt in {time.time()-t0:.2f}s")

        # ── Slow surfaces: velocity grid, pressure field, streamlines ─────────
        # Launch on a background thread so the main loop stays responsive.
        # Pygame surface creation is deferred to the main thread (_apply_bg_grid_result).
        snap_pa = panel_arrays
        snap_v  = sl_v.val
        def _bg_work():
            try:
                xn_, xx_, yn_, yx_ = SB
                if HAS_CUPY or HAS_OPENCL:
                    U_, V_ = build_velocity_grid_gpu(
                        VGRID_NX, VGRID_NY, xn_, xx_, yn_, yx_, snap_v, 0.0, *snap_pa)
                else:
                    U_, V_ = _build_velocity_grid_jit(
                        VGRID_NX, VGRID_NY, xn_, xx_, yn_, yx_, snap_v, 0.0, *snap_pa)
                PRES_ = 400
                pg_x_ = np.linspace(xn_, xx_, PRES_, dtype=np.float64)
                pg_y_ = np.linspace(yx_, yn_, PRES_, dtype=np.float64)
                PX_, PY_ = np.meshgrid(pg_x_, pg_y_)
                PU_, PV_ = _velocity_batch_jit(
                    PX_.ravel(), PY_.ravel(), PRES_*PRES_, snap_v, 0.0, *snap_pa)
                spd_ = np.sqrt(PU_**2 + PV_**2).reshape(PRES_, PRES_)
                Cp_  = 1 - (spd_ / max(snap_v, 0.01))**2
                if HAS_NUMBA and _compute_streamlines_jit is not None:
                    ap_, st_, nl_ = _compute_streamlines_jit(
                        40, 800, 0.012, snap_v, 0.0, *snap_pa, xn_, xx_, yn_, yx_)
                else:
                    ap_, st_, nl_ = None, None, 0
                _bg_state['result'] = {
                    'U': U_, 'V': V_, 'Cp_field': Cp_,
                    'streamlines': (ap_, st_, nl_),
                    'ch': ch, 'v_inf': snap_v, 'panel_arrays': snap_pa,
                }
            except Exception as _e:
                print(f"  BG grid error: {_e}")
            finally:
                _bg_state['computing'] = False
        _bg_state['computing'] = True
        _bg_state['result'] = None
        t_ = threading.Thread(target=_bg_work, daemon=True)
        t_.start()

    def build_and_solve():
        nonlocal panels, panel_arrays, body_vx, body_vy, p_count
        nonlocal wake_sim_time, wake_grid_timer
        nonlocal solve_err_msg, solve_err_timer
        np_=int(sl_p.val); ch=sl_c.val; alpha=sl_a.val; bt=BTYPES[bg_.sel]
        if bt=="NACA":     panels=make_naca_panels(NACA_OPTS[ndd.sel],np_,ch,angle_deg=-alpha)
        elif bt=="Cylinder": panels=make_cylinder_panels(0,0,ch*0.3,np_)
        elif bt=="Square":   panels=make_square_panels(0,0,ch*0.25,angle_deg=-alpha,n_per_side=np_//4)
        elif bt in ("Image","Draw"):
            if custom_coords is not None:
                panels=make_panels_from_coords(custom_coords[0], custom_coords[1])
            else:
                return
        else:
            return
        if len(panels) < 3: return

        # Multi-element flap (Feature 3): add a 30%-chord NACA 2412 flap
        # at 25° deflection behind the main TE.  Only for NACA bodies.
        body_ranges = [(0, len(panels))]
        if t_flap.state and bt == "NACA":
            te_x = 0.5 * (panels[0].xa + panels[-1].xb)
            te_y = 0.5 * (panels[0].ya + panels[-1].yb)
            n_fl  = max(20, int(np_ * 0.35))
            ch_fl = ch * 0.3
            panels_fl = make_naca_panels(
                '2412', n_fl, ch_fl,
                x_center=te_x + 0.02 * ch,
                y_center=te_y - 0.03 * ch,
                angle_deg=-alpha - 25.0,
                body_id=1)
            body_ranges = [(0, len(panels)),
                           (len(panels), len(panels) + len(panels_fl))]
            panels = panels + panels_fl

        try:
            solver.set_panels(panels, body_ranges); solver.solve(sl_v.val, alpha=0.0)
        except Exception as ex:
            solve_err_msg = f"Solver failed: {ex}"
            solve_err_timer = 400
            print(f"  Solver error: {ex}")
            return
        solve_err_msg = ""
        panel_arrays=extract_panel_arrays(panels)
        body_vx=np.array([p.xa for p in panels],np.float64)
        body_vy=np.array([p.ya for p in panels],np.float64)
        p_count=0; wake.reset(); wake_sim_time=0.0; wake_grid_timer=0
        # Initialise prev_bound_gamma to the steady-state value so the first
        # shed vortex reflects only actual circulation *changes*, not the full
        # Γ_steady jump that would occur from a cold start.  This prevents the
        # large spurious starting vortex that otherwise causes numerical
        # instability in the free-wake panel solve.
        wake.prev_bound_gamma = solver.get_circulation(0)
        rebuild_caches(H-(CP_H if t_cp.state else 0))
        # Append one point to the drag polar (CL vs total CD)
        _cl_p = solver.get_lift_coefficient(0, sl_c.val)
        _cd_f = bl_result.get('Cd_friction') or 0.0
        _cd_p = (solver.get_pressure_drag(0, sl_c.val)
                 if hasattr(solver, 'get_pressure_drag') else 0.0) or 0.0
        polar_data.append([sl_a.val, _cl_p, _cd_f + _cd_p])

    print("Warming up JIT..." if HAS_NUMBA else "Running in pure Python mode...")
    warmup_jit(); build_and_solve(); print("Ready.\n")

    running=True; paused=False; fps_t=0; fps_c=0; fps_d=0
    # canvas_h is needed inside the event loop for the draw tool; initialise here
    canvas_h = H - (CP_H if t_cp.state else 0)

    while running:
        dt=clock.tick(60)/1000.0; fps_t+=dt; fps_c+=1
        if fps_t>0.5: fps_d=int(fps_c/fps_t); fps_c=0; fps_t=0

        # Swap in background grid result when ready
        if _bg_state['result'] is not None:
            _res = _bg_state['result']
            _bg_state['result'] = None
            _apply_bg_grid_result(_res, _res['ch'])
            if t_cp.state and panels:
                c_cp = _build_cp_surf()

        needs_solve=False
        for e in pygame.event.get():
            if e.type==pygame.QUIT: running=False
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_ESCAPE: running=False
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_SPACE:
                paused = not paused
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_s and not (e.mod & pygame.KMOD_CTRL):
                ts = time.strftime("%Y%m%d_%H%M%S")
                fname = f"cfd_screenshot_{ts}.png"
                pygame.image.save(screen, fname)
                status_msg = f"Saved: {fname}"; status_msg_timer = 300
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_r and not (e.mod & pygame.KMOD_CTRL):
                needs_solve = True
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_h:
                help_visible = not help_visible
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_p:
                polar_visible = not polar_visible
            # Arrow keys: ↑/↓ sweep α by 0.5°, ←/→ sweep V∞ by 0.05
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_UP and not (e.mod & pygame.KMOD_CTRL):
                sl_a.val = max(sl_a.vmin, min(sl_a.vmax, sl_a.val + 0.5)); needs_solve = True
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_DOWN and not (e.mod & pygame.KMOD_CTRL):
                sl_a.val = max(sl_a.vmin, min(sl_a.vmax, sl_a.val - 0.5)); needs_solve = True
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_RIGHT and not (e.mod & pygame.KMOD_CTRL):
                sl_v.val = max(sl_v.vmin, min(sl_v.vmax, sl_v.val + 0.05)); needs_solve = True
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_LEFT and not (e.mod & pygame.KMOD_CTRL):
                sl_v.val = max(sl_v.vmin, min(sl_v.vmax, sl_v.val - 0.05)); needs_solve = True

            # Ctrl+Z undo in drawing mode
            elif (e.type==pygame.KEYDOWN and e.key==pygame.K_z
                  and (e.mod & pygame.KMOD_CTRL)):
                if BTYPES[bg_.sel]=="Draw" and draw_undo_stack:
                    draw_points.clear()
                    draw_points.extend(draw_undo_stack.pop())
                    if len(draw_points) < 3:
                        draw_closed = False  # reopen if undo leaves fewer than 3 points
                    elif draw_closed and build_draw_shape():
                        needs_solve = True

            tm.handle_event(e)

            old_sel = bg_.sel
            if bg_.handle_event(e):
                needs_solve=True
                if BTYPES[bg_.sel]=="Image" and bg_.sel != old_sel:
                    if do_image_import(): needs_solve = True
                    else:               needs_solve = False
                if BTYPES[bg_.sel]=="Draw" and bg_.sel != old_sel:
                    draw_points.clear(); draw_undo_stack.clear()
                    draw_closed = False; custom_coords = None
                    needs_solve = False
                if BTYPES[old_sel]=="Draw" and bg_.sel != old_sel and draw_closed:
                    if build_draw_shape(): needs_solve = True

            if ndd.handle_event(e): needs_solve=True
            for sl in sls:
                sl.handle_event(e)
                if sl.changed: needs_solve=True
            for t in tgs: t.handle_event(e)
            sl_osc_f.handle_event(e); sl_osc_a.handle_event(e)
            # Reset oscillation history when toggled on or params change
            if (t_osc.state and not osc_was_on) or sl_osc_f.changed or sl_osc_a.changed:
                osc_t = 0.0; cl_hist_len = 0; cl_hist_idx = 0; c_osc = None
            osc_was_on = t_osc.state
            # Viscous toggle: rebuild caches to run/stop the iteration loop
            if t_visc.state != visc_was_on and solver.solved and panels:
                rebuild_caches(H - (CP_H if t_cp.state else 0))
            visc_was_on = t_visc.state
            # Flap toggle: full re-solve to add/remove second body
            if t_flap.state != flap_was_on:
                needs_solve = True
            flap_was_on = t_flap.state
            if btn_s.handle_event(e):
                if BTYPES[bg_.sel]=="Draw" and draw_closed:
                    if build_draw_shape(): needs_solve = True
                elif BTYPES[bg_.sel]=="Image" and custom_coords is None:
                    if do_image_import(): needs_solve = True
                else:
                    needs_solve=True
            if btn_c.handle_event(e):
                panels=[]
                solver.set_panels([],[]); solver.solved=False; p_count=0; panel_arrays=None
                c_press=c_stream=c_vec=c_body=c_cp=None
                draw_points.clear(); draw_undo_stack.clear()
                draw_closed=False; custom_coords=None
                wake.reset(); wake_sim_time=0.0; wake_grid_timer=0
                polar_data.clear()
            if btn_ss.handle_event(e):
                ts = time.strftime("%Y%m%d_%H%M%S")
                fname = f"cfd_screenshot_{ts}.png"
                pygame.image.save(screen, fname)
                status_msg = f"Saved: {fname}"; status_msg_timer = 300

            # --- Polar overlay drag ---
            if polar_visible and e.type in (pygame.MOUSEBUTTONDOWN,
                                            pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                mx, my = e.pos if hasattr(e, 'pos') else pygame.mouse.get_pos()
                POW, POH = 240, 200   # polar overlay width/height
                px0, py0 = polar_pos[0], polar_pos[1]
                title_rect = pygame.Rect(px0, py0, POW, 18)
                if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
                    if title_rect.collidepoint(mx, my):
                        _polar_drag = True
                        _polar_drag_origin = (mx - px0, my - py0)
                elif e.type == pygame.MOUSEBUTTONUP and e.button == 1:
                    _polar_drag = False
                elif e.type == pygame.MOUSEMOTION and _polar_drag:
                    polar_pos[0] = max(0, min(CW - POW, mx - _polar_drag_origin[0]))
                    polar_pos[1] = max(0, min(canvas_h - POH, my - _polar_drag_origin[1]))

            # --- Drawing tool canvas events ---
            if BTYPES[bg_.sel]=="Draw" and e.type in (
                    pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                mx, my = e.pos if hasattr(e, 'pos') else pygame.mouse.get_pos()
                if mx < CW:
                    sim_x, sim_y = scr2sim(mx, my)

                    if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
                        # Closure check FIRST — takes priority over grab so clicking
                        # point 0 closes the shape rather than starting a drag.
                        if not draw_closed and len(draw_points) >= 3:
                            fp = draw_points[0]
                            fpx, fpy = s2s(fp[0], fp[1], canvas_h)
                            if (mx-fpx)**2 + (my-fpy)**2 < DRAW_CLOSE_DIST**2:
                                draw_closed = True
                                if build_draw_shape():
                                    needs_solve = True
                                continue  # don't also grab or add a point

                        # Grab existing point for dragging
                        grabbed = -1
                        for i, pt in enumerate(draw_points):
                            ptx, pty = s2s(pt[0], pt[1], canvas_h)
                            if (mx-ptx)**2 + (my-pty)**2 < DRAW_GRAB_DIST**2:
                                grabbed = i; break

                        if grabbed >= 0:
                            draw_dragging = grabbed
                        elif not draw_closed:
                            # Save undo snapshot before adding point
                            draw_undo_stack.append([list(p) for p in draw_points])
                            if len(draw_undo_stack) > 50:
                                draw_undo_stack.pop(0)
                            draw_points.append([sim_x, sim_y])

                    elif e.type == pygame.MOUSEBUTTONUP and e.button == 1:
                        if draw_dragging >= 0:
                            draw_dragging = -1
                            if draw_closed and build_draw_shape():
                                needs_solve = True

                    elif e.type == pygame.MOUSEMOTION and draw_dragging >= 0:
                        draw_points[draw_dragging] = [sim_x, sim_y]

                    # Right-click: delete nearest point
                    if e.type == pygame.MOUSEBUTTONDOWN and e.button == 3:
                        if draw_points:
                            dists = [
                                (mx - s2s(p[0],p[1],canvas_h)[0])**2 +
                                (my - s2s(p[0],p[1],canvas_h)[1])**2
                                for p in draw_points]
                            nearest = int(np.argmin(dists))
                            if dists[nearest] < DRAW_GRAB_DIST**2 * 4:
                                draw_undo_stack.append([list(p) for p in draw_points])
                                draw_points.pop(nearest)
                                if len(draw_points) < 3:
                                    draw_closed = False  # reopen if too few points
                                elif draw_closed and build_draw_shape():
                                    needs_solve = True

        if needs_solve: build_and_solve()

        canvas_h = H - (CP_H if t_cp.state else 0)
        xn,xx,yn,yx = SB

        # ── Vortex wake update ──────────────────────────────────
        if not paused and t_wake.state and solver.solved and panel_arrays and panels:
            wake_dt = dt * 0.4

            # Per-body-type core radius: bluff bodies need larger cores for stability
            bt_now = BTYPES[bg_.sel]
            wake.core_radius = (0.05 if bt_now == "Cylinder" else
                                0.04 if bt_now == "Square"   else 0.025)

            # ── Step 1: Advect existing vortices (move before shed) ──────────
            n_w = wake.count
            if n_w > 0:
                core_r2     = wake.core_radius ** 2
                core_r2_arr = wake.effective_core_r2(wake_dt)  # P3: growing cores

                # GPU (CUDA/OpenCL) > Numba+BH > Python
                if HAS_CUPY or HAS_OPENCL:
                    advect_wake_gpu(
                        wake.x, wake.y, wake.gamma, n_w,
                        wake_dt, sl_v.val, 0.0, *panel_arrays, core_r2)
                    wake.age[:n_w] += 1
                elif HAS_NUMBA and _advect_wake_jit is not None:
                    if n_w > BARNES_HUT_THRESHOLD:
                        # P8: Barnes-Hut O(N log N) mutual induction
                        u_mut, v_mut = barnes_hut_mutual_velocity(
                            wake.x, wake.y, wake.gamma, n_w,
                            float(core_r2_arr.mean()))
                        u_pan, v_pan = _velocity_batch_jit(
                            wake.x[:n_w], wake.y[:n_w], n_w,
                            sl_v.val, 0.0, *panel_arrays)
                        wake.x[:n_w] += (u_pan + u_mut) * wake_dt
                        wake.y[:n_w] += (v_pan + v_mut) * wake_dt
                    else:
                        _advect_wake_jit(wake.x[:n_w], wake.y[:n_w],
                                         wake.gamma[:n_w], core_r2_arr,
                                         n_w, wake_dt, sl_v.val, 0.0,
                                         *panel_arrays)
                    wake.age[:n_w] += 1
                else:
                    def _panel_vel(x, y):
                        return _velocity_at_jit(x, y, sl_v.val, 0.0, *panel_arrays)
                    wake.advect(wake_dt, _panel_vel, sl_v.val, 0.0)

                wake._cull()

            # ── Step 2: Unsteady free-wake re-solve ─────────────────────────
            # Re-solve the panel system with the advected wake in the RHS.
            # This updates bound circulation Γ(t) each frame (Wagner function),
            # which drives Kelvin shedding below.  Uses cached LU → O(N²).
            # If pitch oscillation is active, alpha varies sinusoidally.
            if t_osc.state:
                osc_t += wake_dt
                _osc_alpha = (math.radians(sl_osc_a.val)
                              * math.sin(2 * math.pi * sl_osc_f.val * osc_t))
            else:
                _osc_alpha = 0.0

            if t_osc.state:
                # Pitch oscillation: quasi-steady re-solve at current alpha.
                # Uses the cached LU → O(N²), same speed as solve_with_wake.
                # Wake coupling is bypassed here because the free-wake feedback
                # loop is numerically unstable at the small timesteps used
                # interactively.  The Theodorsen overlay in the Cp panel shows
                # the correct unsteady (coupled) prediction for comparison.
                solver.solve(sl_v.val, _osc_alpha)
                panel_arrays = extract_panel_arrays(panels)
            elif wake.count > 0:
                # Per-vortex core radii — young vortices near the TE get
                # a large initial core for numerical stability (see vortex_wake.py)
                wake_core_r2 = wake.effective_core_r2(wake_dt)
                solver.solve_with_wake(
                    sl_v.val, _osc_alpha,
                    wake.x, wake.y, wake.gamma, wake.count,
                    core_r2=wake_core_r2)
                panel_arrays = extract_panel_arrays(panels)

            # Record CL history for hysteresis display
            if t_osc.state and solver.solved:
                _cl_now    = solver.get_lift_coefficient(0, sl_c.val)
                _alpha_eff = sl_a.val + math.degrees(_osc_alpha)
                cl_hist[cl_hist_idx] = [_alpha_eff, _cl_now]
                cl_hist_idx = (cl_hist_idx + 1) % 300
                cl_hist_len = min(cl_hist_len + 1, 300)
                if t_cp.state:
                    c_osc = _build_osc_surf()

            # ── Step 3: TE geometry ──────────────────────────────────────────
            body_range = solver.body_panel_ranges[0]
            te_panel_first = panels[body_range[0]]
            te_panel_last  = panels[body_range[1] - 1]
            te_x = 0.5 * (te_panel_first.xa + te_panel_last.xb)
            te_y = 0.5 * (te_panel_first.ya + te_panel_last.yb)
            te_tx = 0.5 * (te_panel_last.tx - te_panel_first.tx)
            te_ty = 0.5 * (te_panel_last.ty - te_panel_first.ty)
            te_mag = max(np.sqrt(te_tx**2 + te_ty**2), 1e-10)
            te_tx /= te_mag; te_ty /= te_mag

            # ── Step 4: Kelvin shedding — now with time-varying Γ ───────────
            # With free-wake coupling, bound_gamma changes every frame, so
            # shed_from_te produces a non-trivial vortex each step (Wagner effect).
            bound_gamma = solver.get_circulation(0)
            wake.shed_from_te(te_x, te_y, bound_gamma, wake_dt, te_tx, te_ty,
                              V_inf=sl_v.val)

            # ── Step 5: Kármán street for bluff bodies ───────────────────────
            # P7: Physics-based separation points from adverse Cp gradient.
            if bt_now in ("Cylinder", "Square"):
                sep_upper, sep_lower = solver.find_separation_points(0)

                # Fallback to geometric estimates if Cp data not usable
                if sep_upper is None or sep_lower is None:
                    if bt_now == "Cylinder":
                        radius = sl_c.val * 0.3
                        fx = radius * math.cos(math.radians(80))
                        fy = radius * math.sin(math.radians(80))
                    else:
                        half = sl_c.val * 0.25
                        fx, fy = half + 0.03, half
                    sep_upper = (fx,  fy)
                    sep_lower = (fx, -fy)

                length_scale = abs(sep_upper[1] - sep_lower[1])
                st_frames = max(6, int(
                    length_scale / (0.2 * max(sl_v.val, 0.05) * wake_dt)))
                if wake_grid_timer % st_frames == 0:
                    k_str = max(abs(bound_gamma) * 0.4,
                                sl_v.val * length_scale * 0.12)
                    off = max(0.03, length_scale * 0.08)
                    def _shed_offset(xy):
                        best = min(panels,
                                   key=lambda p: (p.xm-xy[0])**2+(p.ym-xy[1])**2)
                        return (xy[0] + best.nx * off + sl_v.val * wake_dt,
                                xy[1] + best.ny * off)
                    su = _shed_offset(sep_upper)
                    sl_ = _shed_offset(sep_lower)
                    wake.shed_karman_pair(su[0], su[1], sl_[0], sl_[1], k_str)

            wake_grid_timer += 1

            if wake.count > 0:
                if wake_grid_timer % 30 == 0:
                    wake.merge_close_pairs()

                if wake_grid_timer % 3 == 0:
                    wx, wy, wg = wake.get_arrays()
                    # ── Wake velocity grid: GPU > Numba > fallback ───────────
                    core_r2     = wake.core_radius ** 2
                    core_r2_arr = wake.effective_core_r2(wake_dt)
                    if HAS_CUPY or HAS_OPENCL:
                        U_grid, V_grid = build_velocity_grid_wake_gpu(
                            VGRID_NX, VGRID_NY, xn, xx, yn, yx,
                            sl_v.val, 0.0, *panel_arrays,
                            wx, wy, wg, len(wx), core_r2)
                    elif HAS_NUMBA and _build_velocity_grid_with_wake_jit is not None:
                        U_grid, V_grid = _build_velocity_grid_with_wake_jit(
                            VGRID_NX, VGRID_NY, xn, xx, yn, yx,
                            sl_v.val, 0.0, *panel_arrays,
                            wx, wy, wg, core_r2_arr, len(wx))
                    else:
                        U_grid, V_grid = _build_velocity_grid_jit(
                            VGRID_NX, VGRID_NY, xn, xx, yn, yx,
                            sl_v.val, 0.0, *panel_arrays)

                    # Live Cp plot — reflects unsteady pressure each grid update
                    if t_cp.state and panels:
                        c_cp = _build_cp_surf()

                    # P2: refresh wake-aware streamlines from updated grid
                    if t_str.state and _compute_streamlines_grid_jit is not None:
                        xn, xx, yn, yx = SB
                        ch_now = H - (CP_H if t_cp.state else 0)
                        all_pts_w, starts_w, n_out_w = _compute_streamlines_grid_jit(
                            40, 800, 0.012, U_grid, V_grid, xn, xx, yn, yx)
                        c_stream = pygame.Surface((CW, ch_now), pygame.SRCALPHA)
                        for k in range(n_out_w):
                            i0 = starts_w[k]; i1 = starts_w[k + 1]
                            if i1 - i0 < 6: continue
                            pts = [s2s(all_pts_w[i, 0], all_pts_w[i, 1], ch_now)
                                   for i in range(i0, i1)]
                            pygame.draw.aalines(c_stream, (100, 200, 255, 120), False, pts)
                            for j in range(0, len(pts) - 1, 7):
                                pd_x, pd_y = pts[j]
                                if 0 <= pd_x < CW and 0 <= pd_y < ch_now:
                                    pygame.gfxdraw.aacircle(c_stream, pd_x, pd_y, 1, (120, 210, 255, 190))
                                    pygame.gfxdraw.filled_circle(c_stream, pd_x, pd_y, 1, (120, 210, 255, 190))

        # Particle update
        if not paused and t_par.state and solver.solved and panel_arrays and U_grid is not None:
            n_spawn=min(SPAWN,MAX_P-p_count)
            if n_spawn>0:
                if HAS_NUMBA and _batch_spawn_jit is not None:
                    _batch_spawn_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,n_spawn,xn,yn,yx,sl_v.val)
                else:
                    for i in range(n_spawn):
                        idx=p_count+i
                        p_x[idx]=xn-0.05; p_y[idx]=np.random.uniform(yn,yx)
                        p_vx[idx]=sl_v.val; p_vy[idx]=0; p_age[idx]=0
                p_count+=n_spawn
            if p_count>0:
                if HAS_NUMBA and _advect_particles_grid_jit is not None:
                    _advect_particles_grid_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,dt*0.5,
                        U_grid,V_grid,body_vx,body_vy,len(body_vx),xn,xx,yn,yx,sl_v.val,0.75,900)
                else:
                    for i in range(p_count):
                        u,v=_velocity_at_jit(p_x[i],p_y[i],sl_v.val,0.0,*panel_arrays)
                        p_vx[i]=p_vx[i]*0.75+u*0.25; p_vy[i]=p_vy[i]*0.75+v*0.25
                        p_x[i]+=p_vx[i]*dt*0.5; p_y[i]+=p_vy[i]*dt*0.5; p_age[i]+=1
                        if (p_x[i]>xx+0.3 or p_x[i]<xn-0.3 or
                                p_y[i]>yx+0.5 or p_y[i]<yn-0.5 or p_age[i]>900):
                            p_x[i]=xn-0.05; p_y[i]=np.random.uniform(yn,yx)
                            p_vx[i]=sl_v.val; p_vy[i]=0; p_age[i]=0

        # ── RENDER ──────────────────────────────────────────────
        screen.fill((10,14,23))
        if t_pre.state and c_press: screen.blit(c_press,(0,0))
        if t_str.state and c_stream: screen.blit(c_stream,(0,0))
        if t_vec.state and c_vec: screen.blit(c_vec,(0,0))

        if panels:
            bpts=[s2s(p.xa,p.ya,canvas_h) for p in panels]
            if len(bpts)>2:
                pygame.draw.polygon(screen,(20,28,46),bpts)
                if solver.solved:
                    for p in panels:
                        x1,y1=s2s(p.xa,p.ya,canvas_h); x2,y2=s2s(p.xb,p.yb,canvas_h)
                        pygame.draw.line(screen,pressure_color(p.cp),(x1,y1),(x2,y2),3)
                pygame.draw.aalines(screen,(74,106,159),True,bpts)
            if t_nor.state:
                skip=max(1,len(panels)//32)
                for i in range(0,len(panels),skip):
                    p=panels[i]; sx_p,sy_p=s2s(p.xm,p.ym,canvas_h)
                    pygame.draw.aaline(screen,(255,170,50),(sx_p,sy_p),
                                       (sx_p+int(p.nx*18),sy_p-int(p.ny*18)))

        # Stagnation point marker (panel with Cp closest to +1)
        if solver.solved and panels:
            _stag = min(panels, key=lambda _p: abs(_p.cp - 1.0))
            _sx, _sy = s2s(_stag.xm, _stag.ym, canvas_h)
            _ds = 6
            pygame.draw.polygon(screen, (255, 240, 100),
                [(_sx, _sy - _ds), (_sx + _ds, _sy),
                 (_sx, _sy + _ds), (_sx - _ds, _sy)])
            pygame.draw.polygon(screen, (20, 28, 46),
                [(_sx, _sy - _ds + 2), (_sx + _ds - 2, _sy),
                 (_sx, _sy + _ds - 2), (_sx - _ds + 2, _sy)])
            screen.blit(lfont.render("S₀", True, (255, 240, 100)), (_sx + 8, _sy - 8))

        # Kármán / Strouhal HUD for bluff bodies with wake active
        if t_wake.state and BTYPES[bg_.sel] in ("Cylinder", "Square") and solver.solved:
            _D = (sl_c.val * 0.6 if BTYPES[bg_.sel] == "Cylinder" else sl_c.val * 0.5)
            _St = 0.2 if BTYPES[bg_.sel] == "Cylinder" else 0.15
            _f_shed = _St * sl_v.val / max(_D, 1e-6)
            _hud = f"Kármán  St ≈ {_St:.2f}  |  f ≈ {_f_shed:.2f} Hz"
            _hw = lfont.size(_hud)[0]
            screen.blit(lfont.render(_hud, True, (160, 185, 240)), (CW - _hw - 8, 8))

        # Wake vortex legend (bottom-left corner of canvas)
        if wake.count > 0:
            _leg_x, _leg_y = 8, canvas_h - 56
            pygame.draw.rect(screen, (10, 14, 23, 0), (_leg_x - 4, _leg_y - 4, 148, 50))
            pygame.draw.rect(screen, (30, 42, 63), (_leg_x - 4, _leg_y - 4, 148, 50), 1, border_radius=4)
            pygame.draw.circle(screen, (200, 55, 55), (_leg_x + 5, _leg_y + 10), 5)
            pygame.draw.circle(screen, (255, 135, 135), (_leg_x + 5, _leg_y + 10), 3)
            screen.blit(lfont.render("+ circulation (CCW)", True, (180, 190, 210)), (_leg_x + 14, _leg_y + 3))
            pygame.draw.circle(screen, (55, 70, 200), (_leg_x + 5, _leg_y + 30), 5)
            pygame.draw.circle(screen, (135, 145, 255), (_leg_x + 5, _leg_y + 30), 3)
            screen.blit(lfont.render("− circulation (CW)", True, (180, 190, 210)), (_leg_x + 14, _leg_y + 23))

        # Wake vortex rendering — draw even when shedding is toggled off,
        # so existing vortices remain visible (toggle only pauses advection).
        if wake.count > 0:
            for i in range(wake.count):
                vsx, vsy = s2s(wake.x[i], wake.y[i], canvas_h)
                if 0 <= vsx < CW and 0 <= vsy < canvas_h:
                    g = wake.gamma[i]
                    sz = max(2, min(6, int(abs(g) * 15)))
                    age_fade = max(0.3, 1.0 - wake.age[i] / 1200.0)
                    if g > 0:
                        col = (int(220*age_fade), int(60*age_fade), int(60*age_fade))
                    else:
                        col = (int(60*age_fade), int(80*age_fade), int(220*age_fade))
                    pygame.draw.circle(screen, col, (vsx, vsy), sz)
                    if sz >= 3:
                        inner = (min(255,col[0]+80), min(255,col[1]+80), min(255,col[2]+80))
                        pygame.draw.circle(screen, inner, (vsx, vsy), max(1, sz-2))

        # Drawing tool overlay
        if BTYPES[bg_.sel]=="Draw":
            if len(draw_points) >= 3 and not draw_closed:
                try:
                    from simulation.geometry import spline_from_control_points
                    cx_d = np.array([p[0] for p in draw_points], np.float64)
                    cy_d = np.array([p[1] for p in draw_points], np.float64)
                    sx_d, sy_d = spline_from_control_points(cx_d, cy_d, 60, closed=True)
                    preview_pts = [s2s(sx_d[i], sy_d[i], canvas_h) for i in range(len(sx_d))]
                    if len(preview_pts) > 1:
                        pygame.draw.aalines(screen, (100,180,255), True, preview_pts)
                except Exception:
                    pass
            elif len(draw_points) >= 2:
                pts_scr = [s2s(p[0], p[1], canvas_h) for p in draw_points]
                pygame.draw.aalines(screen, (80,140,220), False, pts_scr)

            for i, pt in enumerate(draw_points):
                ptx, pty = s2s(pt[0], pt[1], canvas_h)
                is_first = (i == 0 and len(draw_points) >= 3 and not draw_closed)
                col = (255,220,80) if is_first else (59,158,255)
                r_sz = 7 if is_first else 5
                pygame.draw.circle(screen, col, (ptx, pty), r_sz)
                pygame.draw.circle(screen, (15,21,32), (ptx, pty), r_sz - 2)
                screen.blit(lfont.render(str(i+1), True, (200,212,230)), (ptx+8, pty-6))

            if not draw_closed:
                inst_lines = [
                    "DRAW MODE: Click to place points",
                    f"Points: {len(draw_points)} (min 3 needed)",
                    "Click the yellow first point to close the shape" if len(draw_points) >= 3 else "",
                    "Right-click a point to delete it  |  Ctrl+Z to undo",
                ]
                iy = 10
                for line in inst_lines:
                    if line:
                        screen.blit(lfont.render(line, True, (150,180,220)), (10, iy))
                        iy += 16
            else:
                screen.blit(lfont.render(
                    "Shape closed — drag points to edit, then Solve",
                    True, (46,232,154)), (10, 10))

            # Self-intersection warning
            if draw_warn_msg and draw_warn_timer > 0:
                draw_warn_timer -= 1
                screen.blit(lfont.render(draw_warn_msg, True, (255,180,60)), (10, 70))

        if t_par.state and p_count>0:
            part_buf[:canvas_h,:,:]=0
            if HAS_NUMBA and _render_particles_jit is not None:
                _render_particles_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,CW,canvas_h,
                                      xn,xx,yn,yx,sl_v.val,part_buf,4)
            else:
                scr_x=((p_x[:p_count]-xn)/(xx-xn)*CW).astype(np.int32)
                scr_y=((1-(p_y[:p_count]-yn)/(yx-yn))*canvas_h).astype(np.int32)
                v_=np.sqrt(p_vx[:p_count]**2+p_vy[:p_count]**2)
                r_=np.clip(60+v_/max(sl_v.val,0.01)*110,0,255).astype(np.uint8)
                g_=np.clip(140+v_/max(sl_v.val,0.01)*50,0,255).astype(np.uint8)
                b_=np.clip(200-v_/max(sl_v.val,0.01)*60,0,255).astype(np.uint8)
                ok=(scr_x>=1)&(scr_x<CW-1)&(scr_y>=1)&(scr_y<canvas_h-1)
                for i in np.where(ok)[0]:
                    part_buf[scr_y[i],scr_x[i]]=(r_[i],g_[i],b_[i])
            p_surf=pygame.Surface((CW,canvas_h))
            pygame.surfarray.blit_array(p_surf,part_buf[:canvas_h].transpose(1,0,2))
            p_surf.set_colorkey((0,0,0)); screen.blit(p_surf,(0,0))

        # Cp colorbar strip (right edge of canvas, when pressure field visible)
        if t_pre.state and solver.solved:
            _cb_w, _cb_h = 14, min(200, canvas_h - 40)
            _cb_x = CW - _cb_w - 6
            _cb_y = (canvas_h - _cb_h) // 2
            _cb_surf = pygame.Surface((_cb_w, _cb_h))
            for _row in range(_cb_h):
                _t = _row / (_cb_h - 1)  # 0=top(most negative Cp), 1=bottom(most positive)
                _cp_val = -3.0 + _t * 4.5   # range [-3, +1.5]
                _cb_surf.set_at((0, _row), pressure_color(_cp_val))
                for _col in range(1, _cb_w):
                    _cb_surf.set_at((_col, _row), pressure_color(_cp_val))
            screen.blit(_cb_surf, (_cb_x, _cb_y))
            pygame.draw.rect(screen, (50, 65, 90), (_cb_x, _cb_y, _cb_w, _cb_h), 1)
            for _cp_tick, _label in [(-3.0, "-3"), (-2.0, "-2"), (-1.0, "-1"),
                                      (0.0, "0"), (1.0, "+1"), (1.5, "+1.5")]:
                _ty = _cb_y + int((_cp_tick - (-3.0)) / 4.5 * (_cb_h - 1))
                pygame.draw.line(screen, (107, 125, 153), (_cb_x - 3, _ty), (_cb_x, _ty), 1)
                screen.blit(lfont.render(_label, True, (107, 125, 153)), (_cb_x - 24, _ty - 5))
            screen.blit(lfont.render("Cp", True, (107, 125, 153)), (_cb_x, _cb_y - 14))

        # PAUSED overlay
        if paused:
            _pau_surf = pygame.Surface((CW, canvas_h), pygame.SRCALPHA)
            _pau_surf.fill((0, 0, 0, 90))
            screen.blit(_pau_surf, (0, 0))
            _pau_txt = tfont.render("⏸  PAUSED  —  Space to resume", True, (234,240,249))
            _pw, _ph = _pau_txt.get_size()
            _px, _py = (CW - _pw) // 2, canvas_h // 2 - _ph // 2
            pygame.draw.rect(screen, (20, 30, 50), (_px - 14, _py - 10, _pw + 28, _ph + 20), border_radius=8)
            pygame.draw.rect(screen, (59, 158, 255), (_px - 14, _py - 10, _pw + 28, _ph + 20), 1, border_radius=8)
            screen.blit(_pau_txt, (_px, _py))

        if t_cp.state:
            if t_osc.state and c_osc is not None:
                screen.blit(c_osc, (0, canvas_h))
            elif t_osc.state:
                screen.blit(_build_osc_surf(), (0, canvas_h))
            elif c_cp:
                screen.blit(c_cp, (0, canvas_h))

        # ── Polar drag overlay ──────────────────────────────────
        if polar_visible:
            POW, POH = 240, 200
            px0, py0 = int(polar_pos[0]), int(polar_pos[1])
            _pol = pygame.Surface((POW, POH), pygame.SRCALPHA)
            _pol.fill((12, 18, 32, 230))
            pygame.draw.rect(_pol, (40, 60, 90), (0, 0, POW, POH), 1, border_radius=5)
            # Title bar (drag handle)
            pygame.draw.rect(_pol, (25, 38, 60), (0, 0, POW, 18), border_radius=5)
            _pol.blit(lfont.render("Drag Polar  [P] close", True, (107, 125, 153)), (6, 2))
            if len(polar_data) >= 2:
                _pda = np.array(polar_data)
                _a_arr  = _pda[:, 0]
                _cl_arr = _pda[:, 1]
                _cd_arr = np.abs(_pda[:, 2])
                _ml, _mr, _mt, _mb = 36, 12, 22, 28
                _pw_ = POW - _ml - _mr; _ph_ = POH - _mt - _mb
                _cd_lo, _cd_hi = 0.0, max(_cd_arr.max() * 1.2, 1e-5)
                _cl_lo, _cl_hi = _cl_arr.min() - 0.2, _cl_arr.max() + 0.2
                def _p2s(cd, cl):
                    px_ = int(_ml + (cd - _cd_lo) / (_cd_hi - _cd_lo + 1e-30) * _pw_)
                    py_ = int(_mt + (_cl_hi - cl)  / (_cl_hi - _cl_lo + 1e-30) * _ph_)
                    return (max(0, min(POW-1, px_)), max(0, min(POH-1, py_)))
                # Grid lines
                for _cv in np.linspace(_cd_lo, _cd_hi, 4):
                    _gx = int(_ml + (_cv - _cd_lo) / (_cd_hi - _cd_lo + 1e-30) * _pw_)
                    pygame.draw.line(_pol, (30, 46, 68), (_gx, _mt), (_gx, _mt + _ph_), 1)
                    _pol.blit(lfont.render(f"{_cv:.3f}", True, (70, 88, 114)), (_gx - 10, _mt + _ph_ + 4))
                for _cv in np.linspace(_cl_lo, _cl_hi, 5):
                    _, _gy = _p2s(_cd_lo, _cv)
                    pygame.draw.line(_pol, (30, 46, 68), (_ml, _gy), (_ml + _pw_, _gy), 1)
                    _pol.blit(lfont.render(f"{_cv:.1f}", True, (70, 88, 114)), (2, _gy - 5))
                # Axes labels
                _pol.blit(lfont.render("CD", True, (107, 125, 153)), (POW // 2 - 8, POH - 14))
                _pol.blit(lfont.render("CL", True, (107, 125, 153)), (2, _mt + _ph_ // 2 - 5))
                # Data curve
                _pts = [_p2s(_cd_arr[i], _cl_arr[i]) for i in range(len(_pda))]
                if len(_pts) > 1:
                    pygame.draw.aalines(_pol, (46, 232, 154), False, _pts)
                for _pt in _pts:
                    pygame.gfxdraw.filled_circle(_pol, _pt[0], _pt[1], 2, (46, 232, 154, 200))
                # Current point highlight
                _cur = _p2s(_cd_arr[-1], _cl_arr[-1])
                pygame.gfxdraw.filled_circle(_pol, _cur[0], _cur[1], 4, (255, 200, 60, 255))
            else:
                _pol.blit(lfont.render("Sweep α (↑/↓) to build polar", True,
                                       (107, 125, 153)), (16, POH // 2 - 6))
            screen.blit(_pol, (px0, py0))

        # ── Help overlay ────────────────────────────────────────
        if help_visible:
            _hov = pygame.Surface((CW, canvas_h), pygame.SRCALPHA)
            _hov.fill((8, 12, 24, 210))
            _lines = [
                ("CFD PANEL METHOD — HELP",            (234, 240, 249), tfont),
                ("",                                    None, None),
                ("PHYSICS MODEL",                       (59, 158, 255),  tfont),
                ("Hess-Smith potential-flow panel method (inviscid, incompressible,",
                 (180, 195, 220), lfont),
                ("irrotational). Cp from Bernoulli. BL coupling = XFOIL-style",
                 (180, 195, 220), lfont),
                ("transpiration. Vortex wake = free discrete vortex method.",
                 (180, 195, 220), lfont),
                ("Unsteady forces use quasi-steady approximation (no added mass).",
                 (180, 195, 220), lfont),
                ("",                                    None, None),
                ("KEYBOARD SHORTCUTS",                  (59, 158, 255),  tfont),
                ("Space        Pause / resume physics", (200, 215, 235), lfont),
                ("↑ / ↓        Angle of attack ±0.5°", (200, 215, 235), lfont),
                ("← / →        Free-stream speed ±0.05", (200, 215, 235), lfont),
                ("R            Re-solve current geometry", (200, 215, 235), lfont),
                ("S            Save screenshot",         (200, 215, 235), lfont),
                ("P            Show / hide drag polar",  (200, 215, 235), lfont),
                ("H            Toggle this help screen", (200, 215, 235), lfont),
                ("Ctrl+Z       Undo last draw point",    (200, 215, 235), lfont),
                ("Escape       Quit",                    (200, 215, 235), lfont),
                ("",                                     None, None),
                ("CANVAS SYMBOLS",                      (59, 158, 255),  tfont),
                ("◇ yellow     Stagnation point (Cp = +1)", (200, 215, 235), lfont),
                ("T marker     BL transition location",  (200, 215, 235), lfont),
                ("S marker     BL separation location",  (200, 215, 235), lfont),
                ("δ* ×5        Displacement thickness (5× exaggerated)", (200, 215, 235), lfont),
                ("",                                     None, None),
                ("Press H to close",                     (107, 125, 153), lfont),
            ]
            _iy = 30
            for _txt, _col, _fnt in _lines:
                if _col is None:
                    _iy += 8
                    continue
                _hov.blit(_fnt.render(_txt, True, _col), (40, _iy))
                _iy += _fnt.size(_txt)[1] + 4
            screen.blit(_hov, (0, 0))

        # SIDEBAR
        pygame.draw.rect(screen,(15,21,32),(CW,0,SBW,H))
        pygame.draw.line(screen,(30,42,63),(CW,0),(CW,H),1)
        screen.blit(tfont.render("CFD Panel Method",True,(234,240,249)),(sx,10))
        screen.blit(lfont.render("Hess-Smith Solver",True,(59,158,255)),(sx,30))
        screen.blit(lfont.render("BODY",True,(107,125,153)),(sx,40)); bg_.draw(screen,font)
        bt_sel = BTYPES[bg_.sel]
        if bt_sel=="NACA":
            screen.blit(lfont.render("NACA",True,(107,125,153)),(sx,90)); ndd.draw(screen,font)
        elif bt_sel=="Image":
            img_help = [
                "IMAGE IMPORT REQUIREMENTS:",
                "",
                "• Single dark shape on white/light",
                "  background (PNG, JPG, or BMP)",
                "• Shape must be one closed region",
                "  (no gaps, holes, or separate parts)",
                "• At least 200px on longest side",
                "• Best: black marker on white paper,",
                "  photographed with good contrast",
                "",
                "Click Solve to open file picker",
            ]
            iy = 82
            for line in img_help:
                col = (200,160,80) if "REQUIREMENTS" in line else (140,155,180) if line else (107,125,153)
                if line: screen.blit(lfont.render(line, True, col), (sx, iy))
                iy += 14
            if import_msg:
                mc = (46,232,154) if "✓" in import_msg else (255,119,68)
                screen.blit(lfont.render(import_msg, True, mc), (sx, iy + 4))
                if import_msg_timer > 0: import_msg_timer -= 1
                if import_msg_timer <= 0: import_msg = ""
        elif bt_sel=="Draw":
            draw_help = [
                "DRAWING TOOL:",
                "",
                "• Click canvas to place points",
                "• Minimum 3 points for a shape",
                "• Click yellow dot (point 1) to close",
                "• Drag any point to reshape",
                "• Right-click a point to delete it",
                "• Ctrl+Z to undo last point",
                "• Click Solve after closing shape",
                "",
                f"Points: {len(draw_points)}",
                "Status: Closed ✓" if draw_closed else "Status: Open",
            ]
            iy = 82
            for line in draw_help:
                col = ((200,160,80) if "TOOL" in line else
                       (46,232,154) if "Closed ✓" in line else
                       (140,155,180) if line else (107,125,153))
                if line: screen.blit(lfont.render(line, True, col), (sx, iy))
                iy += 14

        screen.blit(lfont.render("FLOW",True,(107,125,153)),(sx,118))
        for sl in sls: sl.draw(screen,font)
        screen.blit(lfont.render("VISUALISATION",True,(107,125,153)),(sx,270))
        for t in tgs: t.draw(screen,font)
        btn_s.draw(screen,font); btn_c.draw(screen,font); btn_ss.draw(screen,font)
        # Oscillation sliders — dim when inactive
        _osc_accent = (59,158,255) if t_osc.state else (50,65,90)
        sl_osc_f.draw(screen,font,accent=_osc_accent)
        sl_osc_a.draw(screen,font,accent=_osc_accent)
        if t_osc.state:
            _k_disp = math.pi * sl_osc_f.val * sl_c.val / max(sl_v.val, 0.01)
            screen.blit(lfont.render(f"Reduced freq  k = {_k_disp:.3f}", True, (180,200,240)),
                        (sx, _BN_Y + 98))

        ry = _BN_Y + 108
        screen.blit(lfont.render("AERODYNAMICS",True,(107,125,153)),(sx,ry)); ry+=18
        Re_val = sl_v.val * sl_c.val / NU_AIR
        # Re regime colour and label
        if Re_val < 5e5:
            _re_col = (80, 200, 120);  _re_regime = "Laminar"
        elif Re_val < 1e6:
            _re_col = (240, 185, 60);  _re_regime = "Trans."
        else:
            _re_col = (255, 100, 80);  _re_regime = "Turbulent"
        _re_str = f"{Re_val:.2e} ({_re_regime})"
        if solver.solved and panels:
            CL=solver.get_lift_coefficient(0,sl_c.val)
            G=solver.get_circulation(0)
            CLt=2*np.pi*np.radians(sl_a.val)
            Cd_f=bl_result.get('Cd_friction')
            Cd_p=solver.get_pressure_drag(0,sl_c.val) if hasattr(solver,'get_pressure_drag') else None
            L_per_span = 0.5 * RHO_AIR * sl_v.val**2 * CL * sl_c.val
            if t_flap.state and solver.n_bodies >= 2:
                CL_fl = solver.get_lift_coefficient(1, sl_c.val * 0.3)
                rd=[("CL main", f"{CL:.4f}",   (46,232,154) if CL>=0 else (255,85,119)),
                    ("CL flap", f"{CL_fl:.4f}", (255,185,55) if CL_fl>=0 else (255,85,119)),
                    ("CL total",f"{CL+CL_fl:.4f}",(200,212,230)),
                    ("L (N/m)", f"{L_per_span:.2f}", (200,212,230)),
                    ("Cd fric", f"{Cd_f:.5f}" if Cd_f is not None else "—",
                     (255,190,60) if Cd_f else (107,125,153)),
                    ("Cd pres", f"{Cd_p:.5f}" if Cd_p is not None else "—",
                     (255,150,80) if Cd_p else (107,125,153)),
                    ("Re", _re_str, _re_col)]
            else:
                rd=[("CL",f"{CL:.4f}",(46,232,154) if CL>=0 else (255,85,119)),
                    ("Γ", f"{G:.4f}", (46,232,154) if G>=0 else (255,85,119)),
                    ("CL (theory)",f"{CLt:.4f}",(200,212,230)),
                    ("L (N/m)",f"{L_per_span:.2f}",(200,212,230)),
                    ("Cd friction",f"{Cd_f:.5f}" if Cd_f is not None else "—",(255,190,60) if Cd_f else (107,125,153)),
                    ("Cd pressure",f"{Cd_p:.5f}" if Cd_p is not None else "—",(255,150,80) if Cd_p else (107,125,153)),
                    ("Re", _re_str, _re_col)]
        else:
            rd=[("CL","—",(107,125,153)),("Γ","—",(107,125,153)),
                ("CL (theory)","—",(107,125,153)),("L (N/m)","—",(107,125,153)),
                ("Cd friction","—",(107,125,153)),("Cd pressure","—",(107,125,153)),
                ("Re", _re_str, _re_col)]
        for i,(l,v,c) in enumerate(rd):
            row,ci=i//2,i%2; bx=sx+ci*(sw//2+4); by=ry+row*40
            box=pygame.Rect(bx,by,sw//2-2,34)
            pygame.draw.rect(screen,(10,14,23),box,border_radius=4)
            pygame.draw.rect(screen,(30,42,63),box,1,border_radius=4)
            screen.blit(lfont.render(l,True,(107,125,153)),(bx+8,by+4))
            # Re box: add regime background tint
            if l == "Re" and solver.solved:
                pygame.draw.rect(screen, (*_re_col[:3], 18),
                                 (bx+2, by+2, sw//2-6, 30), border_radius=3)
            screen.blit(mfont.render(v,True,c),(bx+8,by+18))

        # Solver error / screenshot status notification (below readouts)
        notify_y = ry + math.ceil(len(rd)/2) * 40 + 4
        if solve_err_msg and solve_err_timer > 0:
            solve_err_timer -= 1
            screen.blit(lfont.render(solve_err_msg, True, (255,90,90)), (sx, notify_y))
        elif status_msg and status_msg_timer > 0:
            status_msg_timer -= 1
            screen.blit(lfont.render(status_msg, True, (46,232,154)), (sx, notify_y))

        jt = ("CUDA+Numba" if HAS_CUPY
              else "OpenCL+Numba" if HAS_OPENCL
              else "Numba JIT" if HAS_NUMBA else "Python")
        wake_info = f" | {wake.count} vortices" if wake.count > 0 else ""
        _bg_ind = " ⟳" if _bg_state['computing'] else ""
        _pause_hint = "Space: resume" if paused else "Space: pause"
        screen.blit(lfont.render(f"{_pause_hint}  |  ↑↓ α  |  ←→ V∞  |  H help  |  P polar",
                                 True,(60,78,108)),(sx,H-34))
        screen.blit(lfont.render(f"{fps_d} fps | {p_count} particles{wake_info}{_bg_ind} | {jt}",
                                 True,(107,125,153)),(sx,H-20))
        screen.blit(lfont.render("Hess-Smith · RK4 · Bernoulli Cp",True,(50,65,90)),
                    (8, canvas_h-18 if t_cp.state else H-18))

        tm.draw(screen)
        pygame.display.flip()

    pygame.quit()


# ============================================================
# STATIC OUTPUT
# ============================================================

def run_static():
    if not HAS_MPL: print("pip install matplotlib"); return
    panels=make_naca_panels("2412",120,1.0,angle_deg=-5.0)
    solver=HessSmithSolver(); solver.set_panels(panels,[(0,len(panels))]); solver.solve(1.0,0.0)
    CL=solver.get_lift_coefficient(0,1.0); G=solver.get_circulation(0)
    print(f"NACA 2412, α=5°: CL={CL:.4f}, Γ={G:.4f}")
    xg=np.linspace(-1.5,2.5,300); yg=np.linspace(-1.2,1.2,180); X,Y=np.meshgrid(xg,yg)
    U,V=solver.velocity_field(X,Y)
    for p in panels: mask=(X-p.xm)**2+(Y-p.ym)**2<0.001; U[mask]=np.nan; V[mask]=np.nan
    Cp=1-(np.sqrt(U**2+V**2)/1.0)**2
    fig,axes=plt.subplots(2,1,figsize=(14,9),gridspec_kw={'height_ratios':[3,1]})
    ax=axes[0]
    cf=ax.contourf(X,Y,Cp,levels=np.linspace(-3,1.5,50),cmap='RdBu',extend='both')
    plt.colorbar(cf,ax=ax,label='$C_p$',shrink=0.8)
    ax.streamplot(X,Y,U,V,color='k',linewidth=0.4,density=2.5,arrowsize=0.7)
    bx=[p.xa for p in panels]+[panels[-1].xb]; by=[p.ya for p in panels]+[panels[-1].yb]
    ax.fill(bx,by,color='#1a2236',edgecolor='#4a6a9f',linewidth=1.5)
    ax.set_xlim(-1.5,2.5); ax.set_ylim(-1.2,1.2); ax.set_aspect('equal')
    ax.set_xlabel('x/c'); ax.set_ylabel('y/c')
    ax.set_title(f'NACA 2412 · α=5° · $C_L$={CL:.4f} · Γ={G:.4f}')
    ax2=axes[1]
    xm=np.array([p.xm for p in panels]); cp=np.array([p.cp for p in panels])
    le=np.argmin(xm)
    ax2.plot(xm[:le+1],-cp[:le+1],'b-',label='Upper',lw=1.5)
    ax2.plot(xm[le:],-cp[le:],'r-',label='Lower',lw=1.5)
    ax2.axhline(0,color='gray',lw=0.5,ls='--')
    ax2.set_xlabel('x/c'); ax2.set_ylabel('$-C_p$')
    ax2.legend(fontsize=9); ax2.set_title('Pressure Coefficient Distribution')
    ax2.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig('cfd_output.png',dpi=200,bbox_inches='tight')
    print("Saved: cfd_output.png")
    plt.show()


if __name__ == "__main__":
    if '--static' in sys.argv: run_static()
    else: run_interactive()
