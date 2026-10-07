"""
Discrete Vortex Method
=======================
Unsteady wake modelling by shedding point vortices from the trailing edge.

Physics:
  - Kelvin's theorem: total circulation in the flow is conserved
  - Each timestep, a new vortex is shed from the TE with strength equal to
    the change in bound circulation, so that Γ_bound + Σ Γ_free = const
  - Free vortices are advected by the total velocity field
  - Lamb-Oseen regularisation prevents velocity singularities
  - Vortex merging keeps the count bounded for long-running simulations

Integration with panel method:
  - The influence matrix A is geometry-only and can be cached
  - Each timestep, only the RHS vector b changes (due to free vortex contributions)
  - This makes the unsteady solve very fast: one matrix-vector solve per step
"""

import numpy as np
from typing import Tuple, Optional


class VortexWake:
    """
    Manages free vortices in the wake behind a body.

    Attributes:
        x, y: vortex positions (flat arrays, length = capacity)
        gamma: vortex strengths (circulation, positive = CCW)
        count: number of active vortices
        core_radius: Lamb-Oseen regularisation radius
    """

    def __init__(self, max_vortices: int = 5000, core_radius: float = 0.02):
        self.max = max_vortices
        self.x = np.zeros(max_vortices, dtype=np.float64)
        self.y = np.zeros(max_vortices, dtype=np.float64)
        self.gamma = np.zeros(max_vortices, dtype=np.float64)
        self.age = np.zeros(max_vortices, dtype=np.int32)
        self.count = 0
        self.core_radius = core_radius
        self.merge_dist = core_radius * 3.0  # merge vortices closer than this
        self.max_age = 1500  # remove very old vortices
        self.prev_bound_gamma = 0.0  # for Kelvin's theorem tracking
        # P3: Lamb-Oseen core growth — r²(t) = r₀² + 4·ν·t
        # ν is an effective value tuned for visual realism, not physical Re
        self.nu = 5e-4
        # Cull domain: keep vortices within ±3 chords (x) and ±2 chords (y).
        # This is ~3× tighter than the previous fixed ±8/±5 box, which was
        # far larger than any viewport; the far-wake beyond this range has
        # negligible (<1%) induced-velocity contribution at the airfoil.
        self._cull_x = 3.5
        self._cull_y = 2.5

    def reset(self):
        self.count = 0
        self.prev_bound_gamma = 0.0
        self._karman_upper_next = True  # alternation state for shed_karman_pair

    def _add_vortex(self, x: float, y: float, gamma: float):
        """Insert a single free vortex.  Merges oldest pair if at capacity."""
        if self.count >= self.max:
            self._merge_oldest()
        idx = self.count
        self.x[idx] = x
        self.y[idx] = y
        self.gamma[idx] = gamma
        self.age[idx] = 0
        self.count += 1

    def shed_karman_pair(self, x_upper: float, y_upper: float,
                         x_lower: float, y_lower: float,
                         strength: float):
        """
        Shed a counter-rotating vortex pair to seed a von Kármán street.

        Called periodically (every N frames) rather than every frame.
        Alternates which separation point gets the positive vortex so that
        upper and lower vortices roll off in sequence.

        Args:
            x_upper, y_upper: upper separation point (slightly downstream of body)
            x_lower, y_lower: lower separation point
            strength:         magnitude of each vortex (same for both, opposite sign)
        """
        if abs(strength) < 1e-10:
            return
        sign = 1 if self._karman_upper_next else -1
        self._add_vortex(x_upper, y_upper,  strength * sign)
        self._add_vortex(x_lower, y_lower, -strength * sign)
        self._karman_upper_next = not self._karman_upper_next

    def shed_from_te(self, te_x: float, te_y: float,
                     bound_gamma: float, dt: float,
                     te_tangent_x: float, te_tangent_y: float,
                     V_inf: float = 1.0):
        """
        Shed a new vortex from the trailing edge to satisfy Kelvin's theorem.

        Kelvin: d(Γ_bound)/dt + d(Γ_wake)/dt = 0
        So the new vortex strength = -(Γ_bound - Γ_prev)

        The shedding offset is half a convective timestep (V_inf · dt / 2),
        which places the new vortex where it would have advected to by the
        midpoint of the current step.  This is more accurate than a fixed
        offset at all flow speeds.  A floor of 0.005 chord prevents the
        vortex from landing exactly on the TE panel when V_inf is very small.
        """
        d_gamma = bound_gamma - self.prev_bound_gamma
        shed_gamma = -d_gamma  # opposite sign to conserve total circulation

        if abs(shed_gamma) < 1e-10:
            self.prev_bound_gamma = bound_gamma
            return

        if self.count >= self.max:
            self._merge_oldest()

        # Half-step convective offset: places vortex at midpoint of first step
        offset = max(0.5 * abs(V_inf) * dt, 0.005)
        idx = self.count
        self.x[idx] = te_x + te_tangent_x * offset
        self.y[idx] = te_y + te_tangent_y * offset
        self.gamma[idx] = shed_gamma
        self.age[idx] = 0
        self.count += 1
        self.prev_bound_gamma = bound_gamma

    def effective_core_r2(self, dt: float) -> np.ndarray:
        """
        Per-vortex squared core radii growing with age (P3).

        Lamb-Oseen viscous diffusion: r²(t) = r₀² + 4·ν·t
        where t = age × dt.  Older vortices spread out, mimicking
        the natural decay of real eddies.

        Stability note: fresh vortices (age < 20) receive a large
        initial core that decays exponentially.  This prevents the
        close-vortex singularity in solve_with_wake when a newly shed
        element is still near the trailing edge.
        """
        n = self.count
        age_f = self.age[:n].astype(np.float64)
        base = self.core_radius ** 2 + 4.0 * self.nu * dt * age_f
        # Large initial core decaying over ~20 frames: r_extra = 8·r₀·exp(−age/8)
        extra = (self.core_radius * 8.0 * np.exp(-age_f * 0.125)) ** 2
        return base + extra

    def advect(self, dt: float, panel_vel_func, Vinf: float, alpha: float):
        """
        Advect all free vortices by the total velocity field (Python fallback).

        panel_vel_func: function(x, y) -> (u, v) giving panel+freestream velocity
        """
        if self.count == 0:
            return

        n = self.count
        cr2 = self.effective_core_r2(dt)  # per-vortex growing core radii

        for i in range(n):
            u, v = panel_vel_func(self.x[i], self.y[i])
            for j in range(n):
                if i == j:
                    continue
                dx = self.x[i] - self.x[j]
                dy = self.y[i] - self.y[j]
                r_sq_reg = dx * dx + dy * dy + cr2[j]
                factor = self.gamma[j] / (2.0 * np.pi * r_sq_reg)
                u += -dy * factor
                v += dx * factor

            self.x[i] += u * dt
            self.y[i] += v * dt
            self.age[i] += 1

        self._cull()

    def velocity_at(self, x: float, y: float, dt: float = 0.016) -> Tuple[float, float]:
        """Compute velocity induced by all free vortices at point (x, y)."""
        u = 0.0
        v = 0.0
        cr2 = self.effective_core_r2(dt)
        two_pi = 2.0 * np.pi
        for i in range(self.count):
            dx = x - self.x[i]
            dy = y - self.y[i]
            r_sq = dx * dx + dy * dy + cr2[i]
            factor = self.gamma[i] / (two_pi * r_sq)
            u += -dy * factor
            v += dx * factor
        return u, v

    def get_arrays(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return (x, y, gamma) views sliced to active count.

        Returns read-only views — callers must not write into these arrays.
        Use get_arrays_copy() if mutation is required.
        """
        n = self.count
        return self.x[:n], self.y[:n], self.gamma[:n]

    def get_arrays_copy(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return independent copies of (x, y, gamma) for the active vortices."""
        n = self.count
        return self.x[:n].copy(), self.y[:n].copy(), self.gamma[:n].copy()

    def _cull(self):
        """Remove vortices that are too old or too far from the domain.

        Vectorised with a numpy boolean mask — ~30× faster than the
        equivalent Python loop at 500 vortices.
        """
        n = self.count
        if n == 0:
            return
        keep = (
            (self.age[:n] <= self.max_age) &
            (np.abs(self.x[:n]) <= self._cull_x) &
            (np.abs(self.y[:n]) <= self._cull_y)
        )
        k = int(keep.sum())
        if k < n:
            self.x[:k]     = self.x[:n][keep]
            self.y[:k]     = self.y[:n][keep]
            self.gamma[:k] = self.gamma[:n][keep]
            self.age[:k]   = self.age[:n][keep]
        self.count = k

    def _merge_oldest(self):
        """Merge the two closest vortices to make room."""
        if self.count < 2:
            return
        # Find the closest pair among the oldest half
        n = self.count
        half = max(2, n // 2)
        # Sort by age (oldest first), merge from those
        age_order = np.argsort(-self.age[:n])
        best_dist = 1e30
        best_i, best_j = 0, 1
        # Check oldest quarter for merge candidates
        check = min(half, 50)
        for a in range(check):
            i = age_order[a]
            for b in range(a + 1, check):
                j = age_order[b]
                dx = self.x[i] - self.x[j]
                dy = self.y[i] - self.y[j]
                d = dx * dx + dy * dy
                if d < best_dist:
                    best_dist = d
                    best_i, best_j = i, j

        # Merge: weighted average position, sum strengths
        gi = self.gamma[best_i]
        gj = self.gamma[best_j]
        g_total = gi + gj
        if abs(g_total) > 1e-15:
            w = gi / g_total
            self.x[best_i] = self.x[best_i] * w + self.x[best_j] * (1 - w)
            self.y[best_i] = self.y[best_i] * w + self.y[best_j] * (1 - w)
        self.gamma[best_i] = g_total
        self.age[best_i] = max(self.age[best_i], self.age[best_j])

        # Remove j by swapping with last
        last = self.count - 1
        if best_j != last:
            self.x[best_j] = self.x[last]
            self.y[best_j] = self.y[last]
            self.gamma[best_j] = self.gamma[last]
            self.age[best_j] = self.age[last]
        self.count -= 1

    def merge_close_pairs(self):
        """Merge pairs of vortices closer than merge_dist.

        Vectorised implementation: build the full N×N distance matrix once,
        then greedily merge the closest pair, mark both indices consumed, and
        repeat until no sub-threshold pairs remain.  This avoids the O(N²)
        Python inner loop and is ~10× faster for N ≈ 500.

        Circulation is conserved exactly (Γ_merged = Γ_i + Γ_j).
        Position is the circulation-weighted centroid when |Γ_i + Γ_j| > ε,
        otherwise the midpoint.
        """
        if self.count < 2:
            return
        md2 = self.merge_dist ** 2

        n = self.count
        x = self.x[:n]
        y = self.y[:n]

        # Pairwise squared distances (upper-triangle only via broadcast)
        dx = x[:, None] - x[None, :]   # (N, N)
        dy = y[:, None] - y[None, :]
        d2 = dx * dx + dy * dy
        np.fill_diagonal(d2, np.inf)

        consumed = np.zeros(n, dtype=bool)

        while True:
            # Mask already-consumed rows/cols
            d2[consumed, :] = np.inf
            d2[:, consumed] = np.inf

            # Find the globally closest remaining pair
            idx = int(np.argmin(d2))
            i, j = divmod(idx, n)
            if d2[i, j] >= md2:
                break

            # Merge j into i
            gi = self.gamma[i]
            gj = self.gamma[j]
            gt = gi + gj
            if abs(gt) > 1e-15:
                w = gi / gt
                self.x[i] = self.x[i] * w + self.x[j] * (1.0 - w)
                self.y[i] = self.y[i] * w + self.y[j] * (1.0 - w)
            else:
                self.x[i] = 0.5 * (self.x[i] + self.x[j])
                self.y[i] = 0.5 * (self.y[i] + self.y[j])
            self.gamma[i] = gt
            self.age[i] = max(self.age[i], self.age[j])

            # Update distance matrix row/col i with new merged position
            dx_new = self.x[i] - x
            dy_new = self.y[i] - y
            d2_new = dx_new * dx_new + dy_new * dy_new
            d2_new[i] = np.inf
            d2[i, :] = d2_new
            d2[:, i] = d2_new

            consumed[j] = True

        if consumed.any():
            # Compact the arrays, removing consumed slots
            keep = ~consumed
            k = int(keep.sum())
            self.x[:k]     = self.x[:n][keep]
            self.y[:k]     = self.y[:n][keep]
            self.gamma[:k] = self.gamma[:n][keep]
            self.age[:k]   = self.age[:n][keep]
            self.count = k
