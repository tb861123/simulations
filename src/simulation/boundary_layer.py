"""
Integral Boundary-Layer Solver (Thwaites + Michel + Head)
==========================================================
Computes the 2-D viscous boundary layer over a body using integral methods.

Pipeline
--------
1. Extract surface-velocity distribution Ue(s) from panel tangential velocities.
2. Locate the stagnation point (min |Vt|), split surface into upper and lower BL.
3. Integrate Thwaites' method for the laminar momentum thickness θ(s).
4. Evaluate Michel's transition criterion at each station.
5. After transition, switch to Head's turbulent BL equations.
6. Detect separation:  H > 3.5 (laminar) or Cf ≤ 0 (turbulent).

Outputs
-------
- Cd_friction: 2·∫(Cf/2) ds/chord  (friction drag coefficient)
- x_sep_upper, x_sep_lower: x-coordinates of upper/lower separation (or None)
- x_tr_upper,  x_tr_lower:  x-coordinates of upper/lower transition  (or None)

References
----------
- Thwaites (1949), Aeronautical Quarterly
- Michel (1951), ONERA Report 1/1578A
- Head (1958), ARC R&M 3152
- Drela, "XFOIL: An analysis and design system for low Reynolds number airfoils" (1989)
"""

import numpy as np
from typing import Optional, Tuple, List


# ---------------------------------------------------------------------------
# Thwaites tabulated functions  (White, Fluid Mechanics, Table 7-2)
# ---------------------------------------------------------------------------

def _thwaites_H(lam: float) -> float:
    """Shape factor H(λ) from Thwaites' correlation."""
    if lam >= 0.1:
        return 2.0
    if lam <= -0.1:
        return 3.5 + 15.0 * (-lam - 0.1)   # extrapolate toward separation
    # Polynomial fit valid for -0.1 ≤ λ ≤ 0.1
    z = 0.25 - lam
    return 2.0 + 4.14 * z - 83.5 * z**2 + 854.0 * z**3 - 3337.0 * z**4 + 4576.0 * z**5


def _thwaites_l(lam: float) -> float:
    """Skin-friction function l(λ) from Thwaites' correlation."""
    return max(0.0, (0.22 + 1.57 * lam - 1.8 * lam**2))


# ---------------------------------------------------------------------------
# Core BL integrator
# ---------------------------------------------------------------------------

def _integrate_bl(s: np.ndarray, Ue: np.ndarray, nu: float,
                  Re: float, chord: float):
    """
    Integrate the boundary layer from the leading edge along one surface.

    Parameters
    ----------
    s   : arc-length from stagnation, shape (N,)
    Ue  : surface velocity,           shape (N,)
    nu  : kinematic viscosity  = V_inf * chord / Re
    Re  : Reynolds number (for Michel's criterion)
    chord: reference length

    Returns
    -------
    dict with arrays indexed by station:
        theta, H, Cf, Cf_2, reTheta, laminar (bool array)
    x_tr, x_sep: x-coordinates (s values) of transition and separation, or None
    cd_fric: integrated friction drag contribution (one side)
    """
    N = len(s)
    theta   = np.zeros(N)
    H_arr   = np.zeros(N)
    Cf_arr  = np.zeros(N)
    lam_arr = np.ones(N, bool)   # True = laminar

    x_tr  = None
    x_sep = None
    cd_fric = 0.0
    H1_turb = 3.3   # Head's entrainment shape factor

    # --- Stagnation correction (Hiemenz): θ²(0) ≈ 0.075ν/dUe/ds --------
    if N > 1 and abs(Ue[0]) < 1e-6:
        dU_ds = (Ue[1] - Ue[0]) / max(s[1] - s[0], 1e-12)
        theta2_0 = 0.075 * nu / max(abs(dU_ds), 1e-12)
        theta[0] = max(np.sqrt(theta2_0), 1e-6)
    else:
        theta[0] = max(1e-5 * chord, 1e-8)

    lam = True   # start laminar

    for k in range(1, N):
        ds  = s[k] - s[k - 1]
        Ue_k   = max(abs(Ue[k]),   1e-8)
        Ue_km1 = max(abs(Ue[k-1]), 1e-8)

        if lam:
            # ── Thwaites' laminar integration ──────────────────────────
            # d(θ²·Ue⁶)/ds = 0.45·ν·Ue⁵  →  trapezoidal update
            I_new = 0.45 * nu * Ue_k   ** 5 * ds
            I_old = 0.45 * nu * Ue_km1 ** 5 * ds
            th2_new = (theta[k-1]**2 * Ue_km1**6 + 0.5*(I_new + I_old)) / Ue_k**6
            theta[k] = max(np.sqrt(max(th2_new, 1e-30)), 1e-8)

            # Thwaites parameter λ = (θ²/ν)·dUe/ds
            dUe = (Ue_k - Ue_km1) / max(ds, 1e-12)
            lam_param = theta[k]**2 / nu * dUe
            H_arr[k]  = _thwaites_H(lam_param)

            # Skin-friction: Cf/2 = l(λ)·ν / (Ue·θ)
            l = _thwaites_l(lam_param)
            Cf_arr[k] = 2.0 * l * nu / max(Ue_k * theta[k], 1e-30)

            reTheta = Ue_k * theta[k] / nu

            # ── Michel's transition criterion ───────────────────────────
            # Reθ ≥ 1.174·(1 + 22400/Rex)·Rex^0.46
            Rex = Ue_k * s[k] / nu if s[k] > 0 else 1.0
            Re_tr_michel = 1.174 * (1.0 + 22400.0 / max(Rex, 1.0)) * Rex**0.46
            if reTheta >= Re_tr_michel and x_tr is None:
                x_tr = s[k]
                lam = False
                lam_arr[k:] = False
                # Initialise Head turbulent state at transition
                H1_turb = 3.3 + 0.8234 / max(H_arr[k] - 1.1, 0.01)**1.287

            # Laminar separation: H > 3.5
            if H_arr[k] > 3.5 and x_sep is None:
                x_sep = s[k]
                break

        else:
            # ── Head's turbulent BL (simplified Euler integration) ────
            # H1 = 3.3 + 0.8234/(H-1.1)^1.287  (inverse relation)
            # dθ/ds = Cf/2 - (H+2)·θ/Ue·dUe/ds
            dUe = (Ue_k - Ue_km1) / max(ds, 1e-12)
            reTheta = Ue_k * theta[k-1] / nu

            # Ludwieg-Tillmann Cf
            H_prev = H_arr[k-1] if H_arr[k-1] > 1.05 else 1.05
            Cf_half = 0.123 * 10**(-0.678 * H_prev) * reTheta**(-0.268)
            Cf_arr[k] = 2.0 * Cf_half

            dth = Cf_half - (H_prev + 2.0) * theta[k-1] / Ue_km1 * dUe
            theta[k] = max(theta[k-1] + dth * ds, 1e-8)

            # Head's entrainment: dH1/ds = (0.0306/(H1-3.0)^0.6539 - H1·dθ/ds)/θ
            dH1 = (0.0306 / max(H1_turb - 3.0, 0.01)**0.6539
                   - H1_turb * dth) / max(theta[k], 1e-8)
            H1_turb = max(H1_turb + dH1 * ds, 3.01)

            # H from H1 (inverse Head relation)
            H_arr[k] = 1.1 + (0.8234 / max(H1_turb - 3.3, 0.001))**(1/1.287)
            H_arr[k] = min(H_arr[k], 4.0)

            # Turbulent separation: Cf ≤ 0
            if Cf_arr[k] <= 0.0 and x_sep is None:
                x_sep = s[k]
                break

        # Accumulate friction drag on this side
        cd_fric += Cf_arr[k] * ds / max(chord, 1e-10)

    return theta, H_arr, Cf_arr, lam_arr, x_tr, x_sep, cd_fric


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_boundary_layer(panels, body_range, V_inf: float = 1.0,
                            Re: float = 5e5, chord: float = 1.0):
    """
    Run the integral BL solver over both sides of a body.

    Parameters
    ----------
    panels     : list of Panel objects with .xm, .ym, .vt, .length attributes
    body_range : (i_start, i_end) panel index range for this body
    V_inf      : freestream speed (used to compute ν from Re)
    Re         : chord Reynolds number  ν = V_inf · chord / Re
    chord      : reference chord length

    Returns
    -------
    dict with keys:
        'Cd_friction'  : float  — friction drag coefficient (both sides)
        'x_sep_upper'  : float or None — upper separation x-coordinate
        'x_sep_lower'  : float or None — lower separation x-coordinate
        'x_tr_upper'   : float or None — upper transition x-coordinate
        'x_tr_lower'   : float or None — lower transition x-coordinate
        's_upper','Ue_upper','theta_upper','H_upper','Cf_upper' : arrays
        's_lower','Ue_lower','theta_lower','H_lower','Cf_lower' : arrays
    """
    nu = V_inf * chord / max(Re, 1.0)
    i_start, i_end = body_range
    bp = panels[i_start:i_end]
    n  = len(bp)

    if n < 4:
        return {'Cd_friction': 0.0,
                'x_sep_upper': None, 'x_sep_lower': None,
                'x_tr_upper': None,  'x_tr_lower': None}

    # Arc-length and surface velocity
    s_all  = np.zeros(n)
    Ue_all = np.array([abs(p.vt) for p in bp], dtype=np.float64)
    for k in range(1, n):
        s_all[k] = s_all[k-1] + bp[k].length

    # Body centroid to identify upper/lower surfaces
    cy = sum(p.ym for p in bp) / n

    # Find stagnation (minimum surface speed) on each half
    def _run_side(mask_fn):
        idx = [k for k in range(n) if mask_fn(bp[k])]
        if len(idx) < 3:
            return ({}, None, None, 0.0)
        # Sort by arc-length from stagnation (closest to min-Ue first)
        stag = min(idx, key=lambda k: Ue_all[k])
        # Take the side from stagnation to the trailing edge
        side = sorted(idx, key=lambda k: abs(s_all[k] - s_all[stag]))
        # Build monotone arc-length
        s_side  = np.array([s_all[k] for k in side])
        Ue_side = np.array([Ue_all[k] for k in side])
        x_side  = np.array([bp[k].xm for k in side])
        # Re-parameterise s from 0
        s_side = s_side - s_side[0]
        theta_s, H_s, Cf_s, lam_s, x_tr, x_sep, cd_f = _integrate_bl(
            s_side, Ue_side, nu, Re, chord)
        # Map x_sep/x_tr back to body x-coordinate
        if x_sep is not None:
            ki = np.searchsorted(s_side, x_sep)
            x_sep = x_side[min(ki, len(x_side)-1)]
        if x_tr is not None:
            ki = np.searchsorted(s_side, x_tr)
            x_tr = x_side[min(ki, len(x_side)-1)]
        arrays = {'s': s_side, 'x': x_side, 'Ue': Ue_side,
                  'theta': theta_s, 'H': H_s, 'Cf': Cf_s, 'laminar': lam_s}
        return arrays, x_tr, x_sep, cd_f

    upper, x_tr_u, x_sep_u, cd_u = _run_side(lambda p: p.ym >= cy)
    lower, x_tr_l, x_sep_l, cd_l = _run_side(lambda p: p.ym <  cy)

    return {
        'Cd_friction':  cd_u + cd_l,
        'x_sep_upper':  x_sep_u,
        'x_sep_lower':  x_sep_l,
        'x_tr_upper':   x_tr_u,
        'x_tr_lower':   x_tr_l,
        'upper':        upper,
        'lower':        lower,
    }
