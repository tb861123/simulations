"""
Hess-Smith Panel Method solver for 2D potential flow.

Implements constant-strength source + vortex panels with the Kutta condition
for lifting bodies. Analytical velocity integrals (not point-source approx).

Sign conventions:
- Panels ordered CCW; outward normal = (sin θ, -cos θ)
- Vortex self-influence tangential: -0.5 (outside limit, CCW panels)
- α rotates geometry, solver always sees horizontal freestream
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PanelSolution:
    """Result of a Hess-Smith solve."""
    panels_x: np.ndarray          # panel midpoint x
    panels_y: np.ndarray          # panel midpoint y
    panel_nx: np.ndarray          # outward normal x
    panel_ny: np.ndarray          # outward normal y
    panel_len: np.ndarray         # panel lengths
    panel_angle: np.ndarray       # panel angles (radians)
    sigma: np.ndarray             # source strengths
    gamma: float                  # vortex sheet strength
    cp: np.ndarray                # pressure coefficient
    cl: float                     # lift coefficient
    circulation: float            # total circulation Γ
    cl_theory: float              # thin-airfoil theory CL (2π sin α)
    alpha_deg: float              # angle of attack used
    nodes_x: np.ndarray           # panel endpoint x (N+1)
    nodes_y: np.ndarray           # panel endpoint y (N+1)


def _panel_integrals(xi: float, yi: float, xj1: float, yj1: float,
                     xj2: float, yj2: float) -> tuple:
    """
    Analytical influence coefficients for constant-strength source/vortex panel j
    at control point i.

    Returns (A_src, A_vort) — normal velocity contributions per unit source/vortex strength.
    Also returns (B_src, B_vort) — tangential velocity contributions.
    """
    # Transform to panel j local frame
    dx = xj2 - xj1
    dy = yj2 - yj1
    lj = np.hypot(dx, dy)
    cos_j = dx / lj
    sin_j = dy / lj

    # Control point in panel j local coordinates
    xp = (xi - xj1) * cos_j + (yi - yj1) * sin_j
    yp = -(xi - xj1) * sin_j + (yi - yj1) * cos_j

    r1_sq = xp**2 + yp**2
    r2_sq = (xp - lj)**2 + yp**2

    r1_sq = max(r1_sq, 1e-20)
    r2_sq = max(r2_sq, 1e-20)

    log_r = 0.5 * np.log(r2_sq / r1_sq)
    theta1 = np.arctan2(yp, xp)
    theta2 = np.arctan2(yp, xp - lj)
    d_theta = theta1 - theta2

    # Local frame velocities
    u_src = (d_theta) / (2 * np.pi)
    v_src = -log_r / (2 * np.pi)
    u_vort = log_r / (2 * np.pi)
    v_vort = (d_theta) / (2 * np.pi)

    # Rotate back to global frame
    u_src_g = u_src * cos_j - v_src * sin_j
    v_src_g = u_src * sin_j + v_src * cos_j
    u_vort_g = u_vort * cos_j - v_vort * sin_j
    v_vort_g = u_vort * sin_j + v_vort * cos_j

    return u_src_g, v_src_g, u_vort_g, v_vort_g


def solve(nodes_x: np.ndarray, nodes_y: np.ndarray,
          v_inf: float = 1.0, alpha_deg: float = 0.0) -> Optional[PanelSolution]:
    """
    Solve Hess-Smith system for given panel nodes.

    Parameters
    ----------
    nodes_x, nodes_y : panel corner coordinates (N+1 points for N panels), CCW order
    v_inf            : freestream speed
    alpha_deg        : angle of attack in degrees (geometry already rotated by caller)

    Returns PanelSolution or None if matrix is singular.
    """
    N = len(nodes_x) - 1
    if N < 3:
        return None

    alpha = np.deg2rad(alpha_deg)
    u_inf = v_inf * np.cos(alpha)
    w_inf = v_inf * np.sin(alpha)

    # Panel geometry
    mx = 0.5 * (nodes_x[:-1] + nodes_x[1:])
    my = 0.5 * (nodes_y[:-1] + nodes_y[1:])
    dx = nodes_x[1:] - nodes_x[:-1]
    dy = nodes_y[1:] - nodes_y[:-1]
    lengths = np.hypot(dx, dy)
    angles = np.arctan2(dy, dx)
    sin_a = np.sin(angles)
    cos_a = np.cos(angles)
    nx = sin_a          # outward normal for CCW panels
    ny = -cos_a
    tx = cos_a          # tangent
    ty = sin_a

    # Build influence matrix [N+1 x N+1]
    # First N rows: no-penetration at each panel midpoint
    # Last row: Kutta condition (zero tangential velocity at TE)
    A = np.zeros((N + 1, N + 1))
    RHS = np.zeros(N + 1)

    for i in range(N):
        for j in range(N):
            x1, y1 = nodes_x[j], nodes_y[j]
            x2, y2 = nodes_x[j + 1], nodes_y[j + 1]
            us, vs, uv, vv = _panel_integrals(mx[i], my[i], x1, y1, x2, y2)

            # Normal component for source j
            A[i, j] += us * nx[i] + vs * ny[i]
            # Normal component for vortex (column N)
            A[i, N] += uv * nx[i] + vv * ny[i]

        # Freestream normal component
        RHS[i] = -(u_inf * nx[i] + w_inf * ny[i])

    # Kutta condition: tangential velocity at panel 0 and panel N-1 sum to zero
    # (trailing edge panels — first and last for airfoils)
    te1 = 0
    te2 = N - 1
    for j in range(N):
        x1, y1 = nodes_x[j], nodes_y[j]
        x2, y2 = nodes_x[j + 1], nodes_y[j + 1]

        us1, vs1, uv1, vv1 = _panel_integrals(mx[te1], my[te1], x1, y1, x2, y2)
        us2, vs2, uv2, vv2 = _panel_integrals(mx[te2], my[te2], x1, y1, x2, y2)

        A[N, j] = (us1 * tx[te1] + vs1 * ty[te1]) + (us2 * tx[te2] + vs2 * ty[te2])
        A[N, N] += ((uv1 * tx[te1] + vv1 * ty[te1]) +
                    (uv2 * tx[te2] + vv2 * ty[te2]))

    # Vortex self-influence: -0.5 for CCW panels (outside limit)
    A[N, N] += -0.5 + (-0.5)  # contribution at both TE panels

    RHS[N] = -((u_inf * tx[te1] + w_inf * ty[te1]) +
               (u_inf * tx[te2] + w_inf * ty[te2]))

    # Solve
    try:
        sol = np.linalg.solve(A, RHS)
    except np.linalg.LinAlgError:
        return None

    sigma = sol[:N]
    gamma = sol[N]

    # Surface tangential velocity and Cp
    vt = np.zeros(N)
    for i in range(N):
        vt_i = u_inf * tx[i] + w_inf * ty[i]
        for j in range(N):
            x1, y1 = nodes_x[j], nodes_y[j]
            x2, y2 = nodes_x[j + 1], nodes_y[j + 1]
            us, vs, uv, vv = _panel_integrals(mx[i], my[i], x1, y1, x2, y2)
            if i == j:
                # Self-influence: source tangential = 0, vortex tangential = -0.5
                vt_i += 0.0 * sigma[j] + (-0.5) * gamma
            else:
                vt_i += (us * tx[i] + vs * ty[i]) * sigma[j]
                vt_i += (uv * tx[i] + vv * ty[i]) * gamma
        vt[i] = vt_i

    cp = 1.0 - (vt / v_inf) ** 2

    # Lift from Kutta-Joukowski: L = ρ V Γ, CL = 2Γ/(V c)
    # Chord estimate: bounding box x-extent
    chord = np.max(nodes_x) - np.min(nodes_x)
    if chord < 1e-10:
        chord = 1.0
    circulation = -gamma * np.sum(lengths)  # Γ = γ * perimeter (constant γ)
    # More accurately: Γ = ∮ v·ds = sum of tangential velocity * ds
    # Use Kutta-Joukowski: CL = 2Γ/(V_inf * c)
    cl = 2.0 * abs(circulation) / (v_inf * chord) * np.sign(circulation) * (-1)
    # Sign: positive lift for positive α, CCW circulation is negative gamma
    cl = 2.0 * (-circulation) / (v_inf * chord)

    cl_theory = 2.0 * np.pi * np.sin(alpha)

    return PanelSolution(
        panels_x=mx, panels_y=my,
        panel_nx=nx, panel_ny=ny,
        panel_len=lengths, panel_angle=angles,
        sigma=sigma, gamma=gamma,
        cp=cp, cl=cl,
        circulation=circulation,
        cl_theory=cl_theory,
        alpha_deg=alpha_deg,
        nodes_x=nodes_x, nodes_y=nodes_y,
    )


def velocity_field(sol: PanelSolution, x: np.ndarray, y: np.ndarray,
                   v_inf: float = 1.0, alpha_deg: float = 0.0,
                   wake_vortices: Optional[list] = None) -> tuple:
    """
    Compute velocity field at arbitrary points using panel influence + freestream.

    Parameters
    ----------
    sol          : PanelSolution from solve()
    x, y         : query point arrays (any shape; flattened internally)
    v_inf        : freestream speed
    alpha_deg    : freestream angle (degrees)
    wake_vortices: list of (xv, yv, gamma_v) free vortices

    Returns (u, w) arrays matching shape of x/y.
    """
    alpha = np.deg2rad(alpha_deg)
    u_inf = v_inf * np.cos(alpha)
    w_inf = v_inf * np.sin(alpha)

    shape = x.shape
    xf = x.ravel()
    yf = y.ravel()
    n_pts = len(xf)

    u = np.full(n_pts, u_inf)
    w = np.full(n_pts, w_inf)

    nodes_x = sol.nodes_x
    nodes_y = sol.nodes_y
    N = len(nodes_x) - 1

    for j in range(N):
        x1, y1 = nodes_x[j], nodes_y[j]
        x2, y2 = nodes_x[j + 1], nodes_y[j + 1]
        sigma_j = sol.sigma[j]
        gamma_j = sol.gamma

        for k in range(n_pts):
            us, vs, uv, vv = _panel_integrals(xf[k], yf[k], x1, y1, x2, y2)
            u[k] += us * sigma_j + uv * gamma_j
            w[k] += vs * sigma_j + vv * gamma_j

    # Add wake vortices (Lamb-Oseen regularised)
    if wake_vortices:
        rc = 0.025  # core radius
        for (xv, yv, gv) in wake_vortices:
            dxw = xf - xv
            dyw = yf - yv
            r2 = dxw**2 + dyw**2 + rc**2
            factor = gv / (2.0 * np.pi * r2)
            u -= dyw * factor
            w += dxw * factor

    return u.reshape(shape), w.reshape(shape)
