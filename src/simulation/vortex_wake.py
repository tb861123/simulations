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
                     te_tangent_x: float, te_tangent_y: float):
        """
        Shed a new vortex from the trailing edge to satisfy Kelvin's theorem.

        Kelvin: d(Γ_bound)/dt + d(Γ_wake)/dt = 0
        So the new vortex strength = -(Γ_bound - Γ_prev)
        """
        d_gamma = bound_gamma - self.prev_bound_gamma
        shed_gamma = -d_gamma  # opposite sign to conserve total circulation

        if abs(shed_gamma) < 1e-10:
            self.prev_bound_gamma = bound_gamma
            return

        if self.count >= self.max:
            self._merge_oldest()

        # Place new vortex slightly downstream of TE
        offset = 0.02  # small offset along TE tangent direction
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
        """
        n = self.count
        base = self.core_radius ** 2
        return base + 4.0 * self.nu * dt * self.age[:n].astype(np.float64)

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
        """Return (x, y, gamma) sliced to active count."""
        n = self.count
        return self.x[:n].copy(), self.y[:n].copy(), self.gamma[:n].copy()

    def _cull(self):
        """Remove vortices that are too old or too far from origin."""
        alive = 0
        for i in range(self.count):
            if self.age[i] > self.max_age:
                continue
            if abs(self.x[i]) > 8.0 or abs(self.y[i]) > 5.0:
                continue
            if alive != i:
                self.x[alive] = self.x[i]
                self.y[alive] = self.y[i]
                self.gamma[alive] = self.gamma[i]
                self.age[alive] = self.age[i]
            alive += 1
        self.count = alive

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
        """Merge any pair of vortices closer than merge_dist."""
        if self.count < 2:
            return
        md2 = self.merge_dist ** 2
        i = 0
        while i < self.count:
            j = i + 1
            merged = False
            while j < self.count:
                dx = self.x[i] - self.x[j]
                dy = self.y[i] - self.y[j]
                if dx * dx + dy * dy < md2:
                    gi = self.gamma[i]; gj = self.gamma[j]
                    gt = gi + gj
                    if abs(gt) > 1e-15:
                        w = gi / gt
                        self.x[i] = self.x[i] * w + self.x[j] * (1 - w)
                        self.y[i] = self.y[i] * w + self.y[j] * (1 - w)
                    self.gamma[i] = gt
                    # Remove j
                    last = self.count - 1
                    if j != last:
                        self.x[j] = self.x[last]
                        self.y[j] = self.y[last]
                        self.gamma[j] = self.gamma[last]
                        self.age[j] = self.age[last]
                    self.count -= 1
                    merged = True
                    # Don't increment j — check the swapped-in element
                else:
                    j += 1
            i += 1
