"""
Numba-Accelerated CFD Kernels
==============================
All hot paths compiled to machine code via @njit(cache=True).

Architecture:
  1. _velocity_at_jit / _velocity_batch_jit: direct panel-sum velocity
  2. _build_velocity_grid_jit: precompute U,V on a dense grid
  3. _interp_velocity_jit: bilinear interpolation from cached grid (O(1) per particle)
  4. _advect_particles_grid_jit: particle advection using grid interp (decouples particles from panels)
  5. _compute_streamlines_jit: full RK4 streamline integrator in JIT
  6. _render_particles_jit: write particle pixels into a flat buffer
  7. _batch_spawn_jit: initialise N particles in one call
"""

import numpy as np

try:
    from numba import njit, prange
    HAS_NUMBA = True
except ImportError:
    HAS_NUMBA = False


def extract_panel_arrays(panels):
    """Extract panel objects into SoA flat arrays for Numba."""
    n = len(panels)
    xa = np.empty(n, np.float64); ya = np.empty(n, np.float64)
    cos_t = np.empty(n, np.float64); sin_t = np.empty(n, np.float64)
    length = np.empty(n, np.float64)
    sigma = np.empty(n, np.float64); gamma = np.empty(n, np.float64)
    for i in range(n):
        p = panels[i]
        xa[i] = p.xa; ya[i] = p.ya
        cos_t[i] = p.cos_t; sin_t[i] = p.sin_t
        length[i] = p.length; sigma[i] = p.sigma; gamma[i] = p.gamma
    return xa, ya, cos_t, sin_t, length, sigma, gamma


if HAS_NUMBA:

    # ================================================================
    # Core velocity computation
    # ================================================================

    @njit(cache=True)
    def _velocity_at_jit(x, y, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma):
        u = Vinf * np.cos(alpha)
        v = Vinf * np.sin(alpha)
        two_pi = 2.0 * np.pi
        for j in range(xa.shape[0]):
            dxj = x - xa[j]; dyj = y - ya[j]
            xi = dxj * cos_t[j] + dyj * sin_t[j]
            eta = -dxj * sin_t[j] + dyj * cos_t[j]
            L = length[j]
            if abs(eta) < 1e-10: eta = 1e-10
            r1sq = xi * xi + eta * eta
            if r1sq < 1e-20: r1sq = 1e-20
            xiL = xi - L
            r2sq = xiL * xiL + eta * eta
            if r2sq < 1e-20: r2sq = 1e-20
            lnr = 0.5 * np.log(r2sq / r1sq)
            dth = np.arctan2(eta, xiL) - np.arctan2(eta, xi)
            ul = sigma[j] * (-lnr / two_pi) + gamma[j] * (dth / two_pi)
            vl = sigma[j] * (dth / two_pi) + gamma[j] * (lnr / two_pi)
            u += ul * cos_t[j] - vl * sin_t[j]
            v += ul * sin_t[j] + vl * cos_t[j]
        return u, v

    @njit(parallel=True, cache=True)
    def _velocity_batch_jit(px, py, n_pts, Vinf, alpha,
                            xa, ya, cos_t, sin_t, length, sigma, gamma):
        u_out = np.empty(n_pts, np.float64); v_out = np.empty(n_pts, np.float64)
        for i in prange(n_pts):
            u_out[i], v_out[i] = _velocity_at_jit(
                px[i], py[i], Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
        return u_out, v_out

    # ================================================================
    # Velocity grid + bilinear interpolation (O(1) per particle)
    # ================================================================

    @njit(parallel=True, cache=True)
    def _build_velocity_grid_jit(gn_x, gn_y, xmin, xmax, ymin, ymax,
                                  Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma):
        """Compute U, V on a regular grid. Returns (U, V) shape (gn_y, gn_x)."""
        U = np.empty((gn_y, gn_x), np.float64)
        V = np.empty((gn_y, gn_x), np.float64)
        dx = (xmax - xmin) / (gn_x - 1)
        dy = (ymax - ymin) / (gn_y - 1)
        for iy in prange(gn_y):  # parallel: no row-to-row dependency
            yy = ymin + iy * dy
            for ix in range(gn_x):
                xx = xmin + ix * dx
                u, v = _velocity_at_jit(xx, yy, Vinf, alpha,
                                        xa, ya, cos_t, sin_t, length, sigma, gamma)
                U[iy, ix] = u
                V[iy, ix] = v
        return U, V

    @njit(cache=True)
    def _interp_velocity(x, y, U_grid, V_grid, xmin, xmax, ymin, ymax):
        """Bilinear interpolation of velocity from cached grid."""
        gn_y = U_grid.shape[0]; gn_x = U_grid.shape[1]
        # Normalised coords
        fx = (x - xmin) / (xmax - xmin) * (gn_x - 1)
        fy = (y - ymin) / (ymax - ymin) * (gn_y - 1)
        ix = int(fx); iy = int(fy)
        if ix < 0: ix = 0
        if iy < 0: iy = 0
        if ix >= gn_x - 1: ix = gn_x - 2
        if iy >= gn_y - 1: iy = gn_y - 2
        tx = fx - ix; ty = fy - iy
        u = (U_grid[iy, ix] * (1 - tx) * (1 - ty) +
             U_grid[iy, ix + 1] * tx * (1 - ty) +
             U_grid[iy + 1, ix] * (1 - tx) * ty +
             U_grid[iy + 1, ix + 1] * tx * ty)
        v = (V_grid[iy, ix] * (1 - tx) * (1 - ty) +
             V_grid[iy, ix + 1] * tx * (1 - ty) +
             V_grid[iy + 1, ix] * (1 - tx) * ty +
             V_grid[iy + 1, ix + 1] * tx * ty)
        return u, v

    # ================================================================
    # Particle advection using grid interpolation
    # ================================================================

    @njit(cache=True)
    def _advect_particles_grid_jit(px, py, pvx, pvy, p_age, p_count, dt,
                                    U_grid, V_grid,
                                    body_vx, body_vy, n_body_verts,
                                    xmin, xmax, ymin, ymax,
                                    Vinf, smooth, max_age):
        """Advect particles using bilinear-interpolated velocity grid."""
        for i in range(p_count):
            u, v = _interp_velocity(px[i], py[i], U_grid, V_grid,
                                    xmin, xmax, ymin, ymax)
            pvx[i] = pvx[i] * smooth + u * (1.0 - smooth)
            pvy[i] = pvy[i] * smooth + v * (1.0 - smooth)
            px[i] += pvx[i] * dt
            py[i] += pvy[i] * dt
            p_age[i] += 1

            oob = (px[i] > xmax + 0.3 or px[i] < xmin - 0.3 or
                   py[i] > ymax + 0.5 or py[i] < ymin - 0.5 or
                   p_age[i] > max_age)

            inside = False
            if not oob and n_body_verts > 0:
                pxi = px[i]; pyi = py[i]
                j = n_body_verts - 1
                for k in range(n_body_verts):
                    if ((body_vy[k] > pyi) != (body_vy[j] > pyi)):
                        cx = (body_vx[j] - body_vx[k]) * (pyi - body_vy[k]) / (body_vy[j] - body_vy[k] + 1e-30) + body_vx[k]
                        if pxi < cx:
                            inside = not inside
                    j = k

            if oob or inside:
                px[i] = xmin - 0.05
                py[i] = ymin + np.random.random() * (ymax - ymin)
                pvx[i] = Vinf
                pvy[i] = 0.0
                p_age[i] = 0

    # Keep the old direct-panel version too
    @njit(cache=True)
    def _advect_particles_jit(px, py, pvx, pvy, p_age, p_count, dt,
                              Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma,
                              body_vx, body_vy, n_body_verts,
                              xmin, xmax, ymin, ymax, smooth, max_age):
        for i in range(p_count):
            u, v = _velocity_at_jit(px[i], py[i], Vinf, alpha,
                                    xa, ya, cos_t, sin_t, length, sigma, gamma)
            pvx[i] = pvx[i] * smooth + u * (1.0 - smooth)
            pvy[i] = pvy[i] * smooth + v * (1.0 - smooth)
            px[i] += pvx[i] * dt; py[i] += pvy[i] * dt; p_age[i] += 1
            oob = (px[i] > xmax + 0.3 or px[i] < xmin - 0.3 or
                   py[i] > ymax + 0.5 or py[i] < ymin - 0.5 or p_age[i] > max_age)
            inside = False
            if not oob and n_body_verts > 0:
                j = n_body_verts - 1
                for k in range(n_body_verts):
                    if ((body_vy[k] > py[i]) != (body_vy[j] > py[i])):
                        cx = (body_vx[j]-body_vx[k])*(py[i]-body_vy[k])/(body_vy[j]-body_vy[k]+1e-30)+body_vx[k]
                        if px[i] < cx: inside = not inside
                    j = k
            if oob or inside:
                px[i] = xmin-0.05; py[i] = ymin+np.random.random()*(ymax-ymin)
                pvx[i] = Vinf * np.cos(alpha); pvy[i] = 0.0; p_age[i] = 0

    # ================================================================
    # JIT streamline integrator
    # ================================================================

    @njit(cache=True)
    def _compute_streamlines_jit(n_lines, max_steps, dt_s,
                                  Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma,
                                  xmin, xmax, ymin, ymax):
        """
        Returns (all_pts, line_starts, n_lines_out).
        all_pts: (max_total, 2) flat array of all streamline points.
        line_starts: (n_lines,) start index of each line in all_pts.
        """
        max_total = n_lines * max_steps
        all_pts = np.empty((max_total, 2), np.float64)
        line_starts = np.empty(n_lines + 1, np.int64)
        idx = 0
        n_out = 0

        for k in range(n_lines):
            y0 = ymin + (ymax - ymin) * (k + 0.5) / n_lines
            x = xmin - 0.2; y = y0
            line_starts[n_out] = idx
            line_len = 0

            for step in range(max_steps):
                if x < xmin - 0.3 or x > xmax + 0.3 or y < ymin - 0.5 or y > ymax + 0.5:
                    break
                if idx >= max_total:
                    break
                all_pts[idx, 0] = x; all_pts[idx, 1] = y
                idx += 1; line_len += 1

                u1, v1 = _velocity_at_jit(x, y, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
                if u1 * u1 + v1 * v1 < 1e-6: break
                u2, v2 = _velocity_at_jit(x + u1*dt_s/2, y + v1*dt_s/2, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
                u3, v3 = _velocity_at_jit(x + u2*dt_s/2, y + v2*dt_s/2, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
                u4, v4 = _velocity_at_jit(x + u3*dt_s, y + v3*dt_s, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
                vx = (u1 + 2*u2 + 2*u3 + u4) / 6
                vy = (v1 + 2*v2 + 2*v3 + v4) / 6
                x += vx * dt_s; y += vy * dt_s

            if line_len > 5:
                n_out += 1
            else:
                idx -= line_len  # discard short lines

        line_starts[n_out] = idx
        return all_pts[:idx], line_starts[:n_out + 1], n_out

    # ================================================================
    # JIT particle pixel renderer
    # ================================================================

    @njit(cache=True)
    def _render_particles_jit(px, py, pvx, pvy, p_age, p_count,
                               canvas_w, canvas_h,
                               xmin, xmax, ymin, ymax, Vinf,
                               pixel_buf, streak_len):
        """
        Write particle pixels into pixel_buf (H, W, 3) uint8 array.
        Draws velocity-aligned streaks for better flow visualisation.
        """
        for i in range(p_count):
            # Screen coords
            fx = (px[i] - xmin) / (xmax - xmin)
            fy = 1.0 - (py[i] - ymin) / (ymax - ymin)
            scr_x = int(fx * canvas_w)
            scr_y = int(fy * canvas_h)

            if scr_x < 1 or scr_x >= canvas_w - 2 or scr_y < 1 or scr_y >= canvas_h - 2:
                continue

            spd = np.sqrt(pvx[i] * pvx[i] + pvy[i] * pvy[i])
            ratio = spd / max(Vinf, 0.01)
            age_fade = max(0.15, 1.0 - p_age[i] / 900.0)

            r = min(255, int((60 + ratio * 120) * age_fade))
            g = min(255, int((150 + ratio * 50) * age_fade))
            b = min(255, int((210 - ratio * 70) * age_fade))

            # Draw velocity-aligned streak
            if spd > 0.01 and streak_len > 0:
                # Normalised velocity direction in screen space
                dx_s = pvx[i] / spd * streak_len
                dy_s = -pvy[i] / spd * streak_len  # flip y for screen
                # Scale by speed ratio for variable-length streaks
                slen = min(streak_len, max(1, int(ratio * streak_len)))
                dx_s = pvx[i] / spd * slen
                dy_s = -pvy[i] / spd * slen

                # Bresenham-lite: step along streak
                steps = max(abs(int(dx_s)), abs(int(dy_s)), 1)
                for s in range(steps + 1):
                    t = s / max(steps, 1)
                    sx = scr_x + int(dx_s * t)
                    sy = scr_y + int(dy_s * t)
                    if 0 <= sx < canvas_w and 0 <= sy < canvas_h:
                        # Fade along streak
                        sf = 1.0 - t * 0.6
                        pixel_buf[sy, sx, 0] = min(255, max(pixel_buf[sy, sx, 0], int(r * sf)))
                        pixel_buf[sy, sx, 1] = min(255, max(pixel_buf[sy, sx, 1], int(g * sf)))
                        pixel_buf[sy, sx, 2] = min(255, max(pixel_buf[sy, sx, 2], int(b * sf)))
            else:
                # Fallback: 2x2 dot
                pixel_buf[scr_y, scr_x, 0] = r; pixel_buf[scr_y, scr_x, 1] = g; pixel_buf[scr_y, scr_x, 2] = b
                pixel_buf[scr_y+1, scr_x, 0] = r; pixel_buf[scr_y+1, scr_x, 1] = g; pixel_buf[scr_y+1, scr_x, 2] = b

    # ================================================================
    # Batch spawn
    # ================================================================

    @njit(cache=True)
    def _batch_spawn_jit(px, py, pvx, pvy, p_age, start, count,
                          xmin, ymin, ymax, Vinf):
        for i in range(count):
            idx = start + i
            px[idx] = xmin - 0.05
            py[idx] = ymin + np.random.random() * (ymax - ymin)
            pvx[idx] = Vinf
            pvy[idx] = 0.0
            p_age[idx] = 0

    # ================================================================
    # Vortex wake JIT kernels
    # ================================================================

    @njit(cache=True)
    def _vortex_velocity_at_jit(x, y, vx_arr, vy_arr, vg_arr, n_vort, core_r2):
        """Velocity induced by all free vortices at a point (Lamb-Oseen)."""
        u = 0.0; v = 0.0
        two_pi = 2.0 * np.pi
        for i in range(n_vort):
            dx = x - vx_arr[i]; dy = y - vy_arr[i]
            r_sq = dx * dx + dy * dy + core_r2
            factor = vg_arr[i] / (two_pi * r_sq)
            u += -dy * factor; v += dx * factor
        return u, v

    @njit(cache=True)
    def _advect_wake_jit(wx, wy, wg, n_wake, dt,
                          Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma,
                          core_r2):
        """Advect free vortices by panel + freestream + mutual vortex velocity."""
        for i in range(n_wake):
            # Panel + freestream
            u, v = _velocity_at_jit(wx[i], wy[i], Vinf, alpha,
                                    xa, ya, cos_t, sin_t, length, sigma, gamma)
            # Other free vortices
            for j in range(n_wake):
                if i == j: continue
                dx = wx[i] - wx[j]; dy = wy[i] - wy[j]
                r_sq = dx * dx + dy * dy + core_r2
                factor = wg[j] / (2.0 * np.pi * r_sq)
                u += -dy * factor; v += dx * factor
            wx[i] += u * dt; wy[i] += v * dt

    @njit(parallel=True, cache=True)
    def _build_velocity_grid_with_wake_jit(gn_x, gn_y, xmin, xmax, ymin, ymax,
                                            Vinf, alpha,
                                            xa, ya, cos_t, sin_t, length, sigma, gamma,
                                            wx, wy, wg, n_wake, core_r2):
        """Build velocity grid including both panel and free vortex contributions."""
        U = np.empty((gn_y, gn_x), np.float64)
        V = np.empty((gn_y, gn_x), np.float64)
        dx_g = (xmax - xmin) / (gn_x - 1)
        dy_g = (ymax - ymin) / (gn_y - 1)
        two_pi = 2.0 * np.pi
        for iy in prange(gn_y):  # parallel: no row-to-row dependency
            yy = ymin + iy * dy_g
            for ix in range(gn_x):
                xx = xmin + ix * dx_g
                u, v = _velocity_at_jit(xx, yy, Vinf, alpha,
                                        xa, ya, cos_t, sin_t, length, sigma, gamma)
                # Add free vortex contributions
                for k in range(n_wake):
                    ddx = xx - wx[k]; ddy = yy - wy[k]
                    r_sq = ddx * ddx + ddy * ddy + core_r2
                    factor = wg[k] / (two_pi * r_sq)
                    u += -ddy * factor; v += ddx * factor
                U[iy, ix] = u; V[iy, ix] = v
        return U, V

    # ================================================================
    # Warmup
    # ================================================================

    def warmup_jit():
        n = 4
        xa = np.zeros(n); ya = np.zeros(n); ct = np.ones(n); st = np.zeros(n)
        le = np.ones(n); si = np.zeros(n); ga = np.zeros(n)
        _velocity_at_jit(0.0, 0.0, 1.0, 0.0, xa, ya, ct, st, le, si, ga)
        px = np.zeros(4, np.float64); py = np.zeros(4, np.float64)
        _velocity_batch_jit(px, py, 4, 1.0, 0.0, xa, ya, ct, st, le, si, ga)
        _build_velocity_grid_jit(4, 4, -1.0, 1.0, -1.0, 1.0, 1.0, 0.0, xa, ya, ct, st, le, si, ga)
        U = np.ones((4, 4), np.float64); V = np.zeros((4, 4), np.float64)
        _interp_velocity(0.0, 0.0, U, V, -1.0, 1.0, -1.0, 1.0)
        pvx = np.zeros(4, np.float64); pvy = np.zeros(4, np.float64); page = np.zeros(4, np.int32)
        bvx = np.array([0., 1., 1., 0.]); bvy = np.array([0., 0., 1., 1.])
        _advect_particles_grid_jit(px, py, pvx, pvy, page, 4, 0.01,
                                    U, V, bvx, bvy, 4, -1., 1., -1., 1., 1.0, 0.75, 600)
        _compute_streamlines_jit(2, 10, 0.02, 1.0, 0.0, xa, ya, ct, st, le, si, ga, -1., 1., -1., 1.)
        buf = np.zeros((4, 4, 3), np.uint8)
        _render_particles_jit(px, py, pvx, pvy, page, 4, 4, 4, -1., 1., -1., 1., 1.0, buf, 3)
        _batch_spawn_jit(px, py, pvx, pvy, page, 0, 4, -1.0, -1.0, 1.0, 1.0)
        # Warmup vortex kernels
        wvx = np.zeros(2, np.float64); wvy = np.zeros(2, np.float64); wvg = np.zeros(2, np.float64)
        _vortex_velocity_at_jit(0.0, 0.0, wvx, wvy, wvg, 2, 0.01)
        _advect_wake_jit(wvx, wvy, wvg, 2, 0.01, 1.0, 0.0, xa, ya, ct, st, le, si, ga, 0.01)
        _build_velocity_grid_with_wake_jit(4, 4, -1., 1., -1., 1., 1.0, 0.0,
                                            xa, ya, ct, st, le, si, ga, wvx, wvy, wvg, 2, 0.01)

else:
    # ================================================================
    # Pure Python fallbacks
    # ================================================================

    def _velocity_at_jit(x, y, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma):
        u = Vinf * np.cos(alpha); v = Vinf * np.sin(alpha); tp = 2.0 * np.pi
        for j in range(xa.shape[0]):
            dxj = x-xa[j]; dyj = y-ya[j]
            xi = dxj*cos_t[j]+dyj*sin_t[j]; eta = -dxj*sin_t[j]+dyj*cos_t[j]; L = length[j]
            if abs(eta)<1e-10: eta=1e-10
            r1=max(xi**2+eta**2,1e-20); r2=max((xi-L)**2+eta**2,1e-20)
            lr=0.5*np.log(r2/r1); dt=np.arctan2(eta,xi-L)-np.arctan2(eta,xi)
            ul=sigma[j]*(-lr/tp)+gamma[j]*(dt/tp); vl=sigma[j]*(dt/tp)+gamma[j]*(lr/tp)
            u+=ul*cos_t[j]-vl*sin_t[j]; v+=ul*sin_t[j]+vl*cos_t[j]
        return u, v

    def _velocity_batch_jit(px, py, n_pts, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma):
        u = np.empty(n_pts); v = np.empty(n_pts)
        for i in range(n_pts):
            u[i], v[i] = _velocity_at_jit(px[i], py[i], Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
        return u, v

    def _build_velocity_grid_jit(gn_x, gn_y, xmin, xmax, ymin, ymax, Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma):
        xg = np.linspace(xmin, xmax, gn_x); yg = np.linspace(ymin, ymax, gn_y)
        X, Y = np.meshgrid(xg, yg)
        U = np.empty_like(X); V = np.empty_like(X)
        for iy in range(gn_y):
            for ix in range(gn_x):
                U[iy,ix], V[iy,ix] = _velocity_at_jit(X[iy,ix], Y[iy,ix], Vinf, alpha, xa, ya, cos_t, sin_t, length, sigma, gamma)
        return U, V

    _advect_particles_grid_jit = None
    _advect_particles_jit = None
    _compute_streamlines_jit = None
    _render_particles_jit = None
    _batch_spawn_jit = None
    _interp_velocity = None
    _vortex_velocity_at_jit = None
    _advect_wake_jit = None
    _build_velocity_grid_with_wake_jit = None

    def warmup_jit(): pass
