"""
Hess-Smith Panel Method Solver
==============================
Correct implementation of the source-vortex panel method for 2D potential flow.

Each body is discretised into N panels. The unknowns are:
  - sigma_j (j=1..N): source strength per unit length on each panel
  - gamma_k (k=1..Nb): single vortex strength per body (constant on all its panels)

Equations:
  - N no-penetration conditions (V . n = 0 at each control point)
  - Nb Kutta conditions (equal pressure at upper/lower trailing edge)

Key implementation detail: influence integrals are computed in panel J's local frame,
then transformed to global coordinates and projected onto panel I's normal/tangent.

Reference: Katz & Plotkin, "Low-Speed Aerodynamics" (2001), Ch. 11
"""

import numpy as np
from typing import List, Tuple, Optional
from scipy.linalg import lu_factor, lu_solve


class Panel:
    """Single panel element on a body boundary."""
    __slots__ = [
        'xa', 'ya', 'xb', 'yb', 'xm', 'ym', 'length',
        'theta', 'cos_t', 'sin_t', 'nx', 'ny', 'tx', 'ty',
        'sigma', 'gamma', 'body_id', 'cp', 'vt'
    ]

    def __init__(self, xa: float, ya: float, xb: float, yb: float, body_id: int = 0):
        self.xa = xa
        self.ya = ya
        self.xb = xb
        self.yb = yb
        self.body_id = body_id

        dx = xb - xa
        dy = yb - ya
        self.length = np.sqrt(dx * dx + dy * dy)
        self.xm = 0.5 * (xa + xb)
        self.ym = 0.5 * (ya + yb)

        self.theta = np.arctan2(dy, dx)
        self.cos_t = np.cos(self.theta)
        self.sin_t = np.sin(self.theta)

        # Tangent (along panel direction)
        self.tx = self.cos_t
        self.ty = self.sin_t

        # Outward normal for CCW-ordered panels: right-hand perpendicular
        self.nx = self.sin_t
        self.ny = -self.cos_t

        self.sigma = 0.0
        self.gamma = 0.0
        self.cp = 0.0
        self.vt = 0.0


def _influence_coefficients(pi: Panel, pj: Panel) -> Tuple[float, float, float, float]:
    """
    Compute the four influence coefficients of panel J on control point of panel I.

    Returns:
        An: source J -> normal velocity at I
        At: source J -> tangential velocity at I
        Bn: vortex J -> normal velocity at I
        Bt: vortex J -> tangential velocity at I
    """
    # Transform control point I to panel J's local frame
    dxij = pi.xm - pj.xa
    dyij = pi.ym - pj.ya
    xi = dxij * pj.cos_t + dyij * pj.sin_t
    eta = -dxij * pj.sin_t + dyij * pj.cos_t
    L = pj.length

    # Panel integrals in J's local frame
    eta_safe = eta if abs(eta) > 1e-10 else 1e-10 * (1.0 if eta >= 0 else -1.0)
    r1_sq = max(xi * xi + eta_safe * eta_safe, 1e-20)
    r2_sq = max((xi - L) * (xi - L) + eta_safe * eta_safe, 1e-20)

    ln_ratio = 0.5 * np.log(r2_sq / r1_sq)
    d_theta = np.arctan2(eta_safe, xi - L) - np.arctan2(eta_safe, xi)

    two_pi = 2.0 * np.pi

    # Velocity in panel J's local frame (per unit strength)
    # Source: (u_s, v_s) = (-ln_ratio, d_theta) / (2pi)
    # Vortex: (u_v, v_v) = (d_theta, ln_ratio) / (2pi)
    u_s = -ln_ratio / two_pi
    v_s = d_theta / two_pi
    u_v = d_theta / two_pi
    v_v = ln_ratio / two_pi

    # Transform to global coordinates
    cj, sj = pj.cos_t, pj.sin_t
    u_s_g = u_s * cj - v_s * sj
    v_s_g = u_s * sj + v_s * cj
    u_v_g = u_v * cj - v_v * sj
    v_v_g = u_v * sj + v_v * cj

    # Project onto panel I's normal and tangent
    An = u_s_g * pi.nx + v_s_g * pi.ny
    At = u_s_g * pi.tx + v_s_g * pi.ty
    Bn = u_v_g * pi.nx + v_v_g * pi.ny
    Bt = u_v_g * pi.tx + v_v_g * pi.ty

    return An, At, Bn, Bt


class HessSmithSolver:
    """
    Hess-Smith panel method solver for 2D potential flow.
    """

    def __init__(self):
        self.panels: List[Panel] = []
        self.n_panels: int = 0
        self.n_bodies: int = 0
        self.body_panel_ranges: List[Tuple[int, int]] = []
        self.V_inf: float = 1.0
        self.alpha: float = 0.0
        self.solved: bool = False
        self._A_lu = None   # cached LU factorisation of the geometry matrix A

    def set_panels(self, panels: List[Panel], body_ranges: List[Tuple[int, int]]):
        """Set panel geometry. body_ranges[k] = (i_start, i_end) for body k."""
        self.panels = panels
        self.n_panels = len(panels)
        self.n_bodies = len(body_ranges)
        self.body_panel_ranges = body_ranges
        self.solved = False
        self._A_lu = None   # geometry changed — invalidate LU cache

    def solve(self, V_inf: float = 1.0, alpha: float = 0.0):
        """
        Solve the Hess-Smith panel method.

        The influence matrix A depends only on geometry, so it is LU-factorised
        once and cached.  V_inf / alpha only affect the RHS vector b, so
        re-solves for different freestream conditions cost O(N²) (back-sub)
        instead of O(N³) (full solve).

        Args:
            V_inf: freestream speed
            alpha: freestream angle of attack (radians)
        """
        self.V_inf = V_inf
        self.alpha = alpha
        N = self.n_panels
        Nb = self.n_bodies

        if N == 0:
            self.solved = False
            return

        size = N + Nb
        U_inf   = V_inf * np.cos(alpha)
        V_inf_y = V_inf * np.sin(alpha)

        # ── Build and LU-factorise A (geometry-only, cached) ──────────────────
        if self._A_lu is None:
            A = np.zeros((size, size))

            for i in range(N):
                pi = self.panels[i]
                A[i, i] = 0.5  # source self-influence on normal
                for j in range(N):
                    if i == j:
                        continue
                    pj = self.panels[j]
                    An, At, Bn, Bt = _influence_coefficients(pi, pj)
                    A[i, j] = An
                    A[i, N + pj.body_id] += Bn

            for k in range(Nb):
                row = N + k
                i_start, i_end = self.body_panel_ranges[k]
                for pidx in [i_start, i_end - 1]:
                    pi = self.panels[pidx]
                    for j in range(N):
                        pj = self.panels[j]
                        if pidx == j:
                            A[row, N + pj.body_id] += -0.5
                        else:
                            An, At, Bn, Bt = _influence_coefficients(pi, pj)
                            A[row, j]            += At
                            A[row, N + pj.body_id] += Bt

            try:
                self._A_lu = lu_factor(A)
            except Exception:
                self.solved = False
                return

        # ── Build RHS b (depends on V_inf, alpha — always recomputed) ─────────
        b = np.zeros(size)
        for i in range(N):
            pi = self.panels[i]
            b[i] = -(U_inf * pi.nx + V_inf_y * pi.ny)
        for k in range(Nb):
            row = N + k
            i_start, i_end = self.body_panel_ranges[k]
            for pidx in [i_start, i_end - 1]:
                pi = self.panels[pidx]
                b[row] -= (U_inf * pi.tx + V_inf_y * pi.ty)

        # ── Back-substitution via cached LU — O(N²) ───────────────────────────
        try:
            x = lu_solve(self._A_lu, b)
        except Exception:
            self.solved = False
            return

        for i in range(N):
            self.panels[i].sigma = x[i]
        for k in range(Nb):
            gamma_k = x[N + k]
            i_start, i_end = self.body_panel_ranges[k]
            for i in range(i_start, i_end):
                self.panels[i].gamma = gamma_k

        self._compute_surface_quantities(U_inf, V_inf_y)
        self.solved = True

    def _compute_surface_quantities(self, U_inf: float, V_inf_y: float):
        """Compute tangential velocity and Cp at each panel."""
        N = self.n_panels
        V_inf_mag = np.sqrt(U_inf ** 2 + V_inf_y ** 2)

        for i in range(N):
            pi = self.panels[i]
            Vt = U_inf * pi.tx + V_inf_y * pi.ty

            for j in range(N):
                pj = self.panels[j]
                if i == j:
                    Vt += pj.gamma * (-0.5)  # vortex self tangential (outside limit)
                else:
                    _, At, _, Bt = _influence_coefficients(pi, pj)
                    Vt += pj.sigma * At + pj.gamma * Bt

            pi.vt = Vt
            if V_inf_mag > 1e-12:
                pi.cp = 1.0 - (Vt / V_inf_mag) ** 2
            else:
                pi.cp = 0.0

    def velocity_at(self, x: float, y: float) -> Tuple[float, float]:
        """Compute velocity at an arbitrary field point."""
        if not self.solved:
            return self.V_inf * np.cos(self.alpha), self.V_inf * np.sin(self.alpha)

        u = self.V_inf * np.cos(self.alpha)
        v = self.V_inf * np.sin(self.alpha)

        two_pi = 2.0 * np.pi
        for pj in self.panels:
            dxj = x - pj.xa
            dyj = y - pj.ya
            xi = dxj * pj.cos_t + dyj * pj.sin_t
            eta = -dxj * pj.sin_t + dyj * pj.cos_t
            L = pj.length

            eta_safe = eta if abs(eta) > 1e-10 else 1e-10
            r1_sq = max(xi ** 2 + eta_safe ** 2, 1e-20)
            r2_sq = max((xi - L) ** 2 + eta_safe ** 2, 1e-20)

            ln_r = 0.5 * np.log(r2_sq / r1_sq)
            dth = np.arctan2(eta_safe, xi - L) - np.arctan2(eta_safe, xi)

            u_local = pj.sigma * (-ln_r / two_pi) + pj.gamma * (dth / two_pi)
            v_local = pj.sigma * (dth / two_pi) + pj.gamma * (ln_r / two_pi)

            u += u_local * pj.cos_t - v_local * pj.sin_t
            v += u_local * pj.sin_t + v_local * pj.cos_t

        return u, v

    def velocity_field(self, X: np.ndarray, Y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Vectorised velocity field on a meshgrid."""
        if not self.solved:
            return (
                np.full_like(X, self.V_inf * np.cos(self.alpha), dtype=float),
                np.full_like(X, self.V_inf * np.sin(self.alpha), dtype=float),
            )

        U = np.full_like(X, self.V_inf * np.cos(self.alpha), dtype=float)
        V = np.full_like(X, self.V_inf * np.sin(self.alpha), dtype=float)

        two_pi = 2.0 * np.pi
        for pj in self.panels:
            dx = X - pj.xa
            dy = Y - pj.ya
            xi = dx * pj.cos_t + dy * pj.sin_t
            eta = -dx * pj.sin_t + dy * pj.cos_t
            L = pj.length

            eta_safe = np.where(np.abs(eta) > 1e-10, eta, 1e-10)
            r1_sq = np.maximum(xi ** 2 + eta_safe ** 2, 1e-20)
            r2_sq = np.maximum((xi - L) ** 2 + eta_safe ** 2, 1e-20)

            ln_r = 0.5 * np.log(r2_sq / r1_sq)
            dth = np.arctan2(eta_safe, xi - L) - np.arctan2(eta_safe, xi)

            u_loc = pj.sigma * (-ln_r / two_pi) + pj.gamma * (dth / two_pi)
            v_loc = pj.sigma * (dth / two_pi) + pj.gamma * (ln_r / two_pi)

            U += u_loc * pj.cos_t - v_loc * pj.sin_t
            V += u_loc * pj.sin_t + v_loc * pj.cos_t

        return U, V

    def get_circulation(self, body_id: int = 0) -> float:
        """Total circulation Gamma = gamma x sum(panel lengths) for body k."""
        if not self.solved or body_id >= self.n_bodies:
            return 0.0
        i_start, i_end = self.body_panel_ranges[body_id]
        gamma = self.panels[i_start].gamma
        perimeter = sum(self.panels[i].length for i in range(i_start, i_end))
        return gamma * perimeter

    def get_lift_coefficient(self, body_id: int = 0, chord: float = 1.0) -> float:
        """CL from Kutta-Joukowski: CL = 2*Gamma / (V_inf * c)."""
        Gamma = self.get_circulation(body_id)
        if self.V_inf > 1e-12 and chord > 1e-12:
            return 2.0 * Gamma / (self.V_inf * chord)
        return 0.0

    def get_cp_distribution(self, body_id: int = 0) -> Tuple[np.ndarray, np.ndarray]:
        """Return (x_midpoints, Cp) arrays for a body."""
        if not self.solved:
            return np.array([]), np.array([])
        i_start, i_end = self.body_panel_ranges[body_id]
        x = np.array([self.panels[i].xm for i in range(i_start, i_end)])
        cp = np.array([self.panels[i].cp for i in range(i_start, i_end)])
        return x, cp

    # ─────────────────────────────────────────────────────────────────────────
    # P7: Adverse pressure-gradient separation points
    # ─────────────────────────────────────────────────────────────────────────

    def find_separation_points(self, body_id: int = 0):
        """
        Estimate upper and lower separation points from the panel Cp distribution.

        Separation is approximated as the panel with the steepest adverse
        pressure gradient (dCp/ds > 0, i.e. rising pressure along the surface).
        Works for cylinders, squares, and bluff-body shapes; for attached
        airfoil flow the gradient point will be near the trailing edge.

        Returns:
            (upper, lower) where each is (x, y) or None if not found.
        """
        if not self.solved or body_id >= self.n_bodies:
            return None, None
        i_start, i_end = self.body_panel_ranges[body_id]
        bp = self.panels[i_start:i_end]
        n = len(bp)
        if n < 3:
            return None, None

        # Body centroid separates "upper" (y >= cy) from "lower"
        cy = sum(p.ym for p in bp) / n

        best_upper = None;  max_g_upper = -1e30
        best_lower = None;  max_g_lower = -1e30

        for k in range(1, n - 1):
            dcp = bp[k].cp - bp[k - 1].cp
            ds  = 0.5 * (bp[k].length + bp[k - 1].length)
            grad = dcp / max(ds, 1e-10)
            if bp[k].ym >= cy:
                if grad > max_g_upper:
                    max_g_upper = grad
                    best_upper  = (bp[k].xm, bp[k].ym)
            else:
                if grad > max_g_lower:
                    max_g_lower = grad
                    best_lower  = (bp[k].xm, bp[k].ym)

        return best_upper, best_lower

    # ─────────────────────────────────────────────────────────────────────────
    # P9: Pressure drag coefficient (from panel Cp integration)
    # ─────────────────────────────────────────────────────────────────────────

    def get_pressure_drag(self, body_id: int = 0, chord: float = 1.0) -> float:
        """
        Cd_pressure = (1/c) ∫ Cp * (panel normal · x̂) * ds
        Integrated around the body.  Non-zero only for unsteady / bluff bodies;
        zero by d'Alembert for steady attached flow.
        """
        if not self.solved or body_id >= self.n_bodies:
            return 0.0
        i_start, i_end = self.body_panel_ranges[body_id]
        cd = 0.0
        for i in range(i_start, i_end):
            p = self.panels[i]
            cd += p.cp * p.nx * p.length   # nx = outward normal x-component
        return cd / max(chord, 1e-10)      # normalise by chord
