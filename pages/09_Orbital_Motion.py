"""
Orbital Motion — WJEC Eduqas A Level Physics
Component 2, Topic 8 (Orbits and the Wider Universe), sections (a)–(g)
Component 3, Topic 11 (Astrophysics) — binary star systems

Covers:
  Basic  : single planet orbiting a central star — trajectory, energy
           conservation, Kepler's 3rd law verification.
  Advanced: orbit classification (elliptical / parabolic / hyperbolic),
            two-body problem (mutual gravity), galaxy rotation curve and
            dark matter.
  Binary Stars: two stars orbiting their common barycentre — orbital diagram,
                radial velocity curves, real-world presets.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import G, rk4_integrate
from utils.style import COLOURS, make_fig, plotly_layout
from utils.ui_components import (
    advanced_divider,
    metric_row,
    mode_toggle,
    physics_notes,
    sim_header,
    two_column_layout,
)

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Orbital Motion — WJEC Physics",
    page_icon="🪐",
    layout="wide",
)

# ── Module-level constants ────────────────────────────────────────────────────

SOLAR_MASS: float = 1.989e30      # kg
AU: float = 1.496e11              # m  (1 Astronomical Unit)
YEAR_S: float = 3.156e7           # s
KPC: float = 3.086e19             # m  (1 kiloparsec)

MASS_OPTIONS: list[float] = [1e28, 1e29, 5e29, 1e30, 2e30, 5e30, 1e31]
MASS_LABELS: list[str] = [f"{m / SOLAR_MASS:.2f} M☉" for m in MASS_OPTIONS]

EARTH_MASS: float = 5.972e24   # kg

# Real-world orbit presets: (label, M_kg, r0_m, v_ratio, context_text)
ORBIT_PRESETS: list[tuple[str, float, float, float, str]] = [
    (
        "ISS (Low Earth Orbit)",
        EARTH_MASS,
        6.778e6,
        1.0,
        "The ISS orbits at 408 km altitude, completing one orbit every 92 minutes "
        "at 7.66 km/s. Astronauts experience ~0.89g (not weightlessness — they're "
        "in free fall!)",
    ),
    (
        "GPS Satellite",
        EARTH_MASS,
        2.656e7,
        1.0,
        "GPS satellites orbit at ~20,200 km altitude with a 12-hour period. "
        "You need 4 satellites in view for 3D positioning.",
    ),
    (
        "Moon",
        EARTH_MASS,
        3.844e8,
        1.0,
        "The Moon's orbital speed is 1.02 km/s — much slower than ISS because "
        "gravitational force decreases with distance².",
    ),
    (
        "Geostationary",
        EARTH_MASS,
        4.216e7,
        1.0,
        "A geostationary satellite appears fixed in the sky. Period = 24h exactly. "
        "Used for TV broadcasting and weather.",
    ),
    (
        "Earth around Sun",
        1.989e30,
        1.496e11,
        1.0,
        "Earth orbits the Sun at 29.8 km/s. The gravitational force provides "
        "~0.006 m/s² centripetal acceleration.",
    ),
    (
        "Halley's Comet (approx)",
        1.989e30,
        8.77e10,
        1.5,
        "Halley's Comet has an orbital period of ~75 years and an eccentricity of "
        "0.967 — nearly parabolic! It swings from inside Venus to beyond Neptune.",
    ),
]

# ── Binary star constants ─────────────────────────────────────────────────────

BINARY_PRESETS: dict = {
    "Custom": None,
    "Alpha Centauri A & B": {
        "M1_sol": 1.1,
        "M2_sol": 0.907,
        "d_AU": 23.4,
        "note": (
            "The nearest star system to Earth (4.37 ly). A and B orbit each other "
            "every 79.9 years. Alpha Centauri C (Proxima) is a third, distant "
            "companion orbiting both."
        ),
    },
    "Sirius A & B": {
        "M1_sol": 2.02,
        "M2_sol": 0.978,
        "d_AU": 8.2,
        "note": (
            "Sirius B is a white dwarf — the end state of a sun-like star. It has "
            "the mass of the Sun compressed into the size of Earth. The pair orbit "
            "every 50 years."
        ),
    },
    "Cygnus X-1": {
        "M1_sol": 21.0,
        "M2_sol": 14.8,
        "d_AU": 0.2,
        "note": (
            "Cygnus X-1 contains a stellar black hole of ~15 solar masses orbiting "
            "a blue supergiant every 5.6 days. It was the first strong candidate for "
            "a black hole (1964)."
        ),
    },
    "TRAPPIST-1 b (star+planet)": {
        "M1_sol": 0.089,
        "M2_sol": 0.000267,
        "d_AU": 0.0115,
        "note": (
            "TRAPPIST-1 is an ultra-cool red dwarf with 7 Earth-sized planets. "
            "Planet b orbits in just 1.51 days. The host star has only 8% of the "
            "Sun's mass."
        ),
    },
    "Equal mass (theoretical)": {
        "M1_sol": 1.0,
        "M2_sol": 1.0,
        "d_AU": 1.0,
        "note": (
            "With equal masses, both stars orbit the exact midpoint. The barycentre "
            "is equidistant from both stars. This symmetric case is the simplest to "
            "visualise."
        ),
    },
}

# Solar system planets for Kepler's 3rd law table
KEPLER_PLANETS: list[tuple[str, float, float]] = [
    ("Mercury", 0.387, 0.241),
    ("Venus",   0.723, 0.615),
    ("Earth",   1.000, 1.000),
    ("Mars",    1.524, 1.881),
    ("Jupiter", 5.203, 11.862),
    ("Saturn",  9.537, 29.458),
]

SPEC_REF = "Component 2, Topic 8 (Orbits and the Wider Universe), sections (a)–(g)"

EQUATIONS = [
    r"F = \frac{GMm}{r^2}",
    r"v_{\text{circular}} = \sqrt{\frac{GM}{r}}",
    r"T^2 = \frac{4\pi^2}{GM} r^3 \text{ (Kepler's 3rd law)}",
    r"v_{\text{escape}} = \sqrt{\frac{2GM}{r}}",
]

EXPLANATION = (
    "A **circular orbit** occurs when gravitational force provides exactly the "
    "centripetal force needed: $F_{\\text{grav}} = F_{\\text{centripetal}}$ gives "
    "$\\frac{GMm}{r^2} = \\frac{mv^2}{r}$, so $v_{\\text{circ}} = \\sqrt{GM/r}$. "
    "**Kepler's Third Law** ($T^2 \\propto r^3$) follows directly from this "
    "substitution into $T = 2\\pi r / v$. For bound orbits (ellipses) the total "
    "mechanical energy is negative; for unbound trajectories (hyperbola) it is "
    "positive. The energy plot below should show a nearly constant total energy — "
    "deviations indicate numerical error in the RK4 integrator."
)

ADVANCED_TEXT = (
    "**Kepler's 3rd law derivation:** Setting $F_{\\text{grav}} = F_{\\text{cent}}$: "
    "$\\frac{GMm}{r^2} = \\frac{mv^2}{r}$ → $v^2 = GM/r$ → "
    "$T = \\frac{2\\pi r}{v} = \\frac{2\\pi r^{3/2}}{\\sqrt{GM}}$ → "
    "$T^2 = \\frac{4\\pi^2}{GM} r^3$.\n\n"
    "**Escape velocity:** Set total energy to zero: $\\frac{1}{2}mv^2 - \\frac{GMm}{r} = 0$ "
    "→ $v_{\\text{esc}} = \\sqrt{2GM/r} = \\sqrt{2}\\, v_{\\text{circ}}$.\n\n"
    "**Orbit classification by energy:** Circular ($E < 0$, $e=0$), Elliptical "
    "($E < 0$, $0 < e < 1$), Parabolic ($E = 0$, $e=1$, escape trajectory), "
    "Hyperbolic ($E > 0$, $e > 1$, unbound).\n\n"
    "**Galaxy rotation curves:** If all mass were at the galactic centre, "
    "$v \\propto r^{-1/2}$ (Keplerian decline). Observations show $v \\approx$ "
    "constant far from the centre — a *flat* rotation curve. This requires "
    "$M(r) \\propto r$ even where there are no visible stars, implying a "
    "diffuse dark-matter halo extending far beyond the visible disc. "
    "This is one of the strongest lines of evidence for dark matter (spec 8(e))."
)

# ── Physics helpers ───────────────────────────────────────────────────────────


def v_circular(M: float, r: float) -> float:
    """Circular orbital speed at radius r around mass M."""
    return float(np.sqrt(G * M / r))


def orbital_period(a: float, M: float) -> float:
    """Kepler's 3rd law: T = 2π sqrt(a³ / GM)."""
    return 2.0 * np.pi * np.sqrt(a**3 / (G * M))


def classify_orbit(ratio: float) -> str:
    """Return a human-readable orbit type from v₀/v_circular ratio."""
    v_esc_ratio = np.sqrt(2.0)  # v_escape / v_circular
    if ratio < 0.05:
        return "Radial infall (sub-orbital)"
    elif abs(ratio - 1.0) < 0.03:
        return "Circular orbit"
    elif ratio < 1.0:
        return "Elliptical (sub-circular)"
    elif ratio < v_esc_ratio - 0.03:
        return "Elliptical (super-circular)"
    elif abs(ratio - v_esc_ratio) < 0.05:
        return "Parabolic (escape trajectory)"
    else:
        return "Hyperbolic (unbound orbit)"


def format_period(T_s: float) -> str:
    """Return a human-readable period string in appropriate units."""
    if T_s < 3600.0:
        return f"{T_s:.1f} s"
    elif T_s < 86400.0:
        return f"{T_s / 60.0:.1f} min"
    elif T_s < 7 * 86400.0:
        return f"{T_s / 3600.0:.2f} h"
    else:
        return f"{T_s / 86400.0:.2f} days"


def hohmann_transfer(M: float, r_a: float, r_b: float) -> dict:
    """
    Compute Hohmann transfer orbit parameters between two circular orbits.

    Parameters
    ----------
    M   : central mass (kg)
    r_a : radius of initial circular orbit (m)
    r_b : radius of target circular orbit (m)

    Returns
    -------
    dict with keys: a_transfer, v1, v2, dv1, dv2, dv_total, T_transfer
    """
    a_transfer = (r_a + r_b) / 2.0
    v1 = float(np.sqrt(G * M * (2.0 / r_a - 1.0 / a_transfer)))
    v2 = float(np.sqrt(G * M * (2.0 / r_b - 1.0 / a_transfer)))
    vc_a = v_circular(M, r_a)
    vc_b = v_circular(M, r_b)
    dv1 = v1 - vc_a
    dv2 = vc_b - v2
    T_transfer = np.pi * np.sqrt(a_transfer ** 3 / (G * M))
    return {
        "a_transfer": a_transfer,
        "v1": v1,
        "v2": v2,
        "dv1": dv1,
        "dv2": dv2,
        "dv_total": abs(dv1) + abs(dv2),
        "T_transfer": T_transfer,
    }


def make_single_body_ode(M: float):
    """
    Return the ODE for a massless test particle orbiting central mass M.

    State vector y = [x, y, vx, vy].
    """

    def deriv(t: float, y: np.ndarray) -> np.ndarray:
        x, yy, vx, vy = y
        r = np.sqrt(x * x + yy * yy)
        r = max(r, 1e3)   # avoid singularity
        r3 = r ** 3
        ax = -G * M * x / r3
        ay = -G * M * yy / r3
        return np.array([vx, vy, ax, ay])

    return deriv


def make_two_body_ode(M: float, m: float):
    """
    Return the ODE for two mutually gravitating point masses.

    State vector y = [x1, y1, vx1, vy1, x2, y2, vx2, vy2].
    """

    def deriv(t: float, y: np.ndarray) -> np.ndarray:
        x1, y1, vx1, vy1, x2, y2, vx2, vy2 = y
        dx = x2 - x1
        dy_ = y2 - y1
        r = np.sqrt(dx * dx + dy_ * dy_)
        r = max(r, 1e3)
        r3 = r ** 3
        # Force on body 1 from body 2 (attractive)
        ax1 = G * m * dx / r3
        ay1 = G * m * dy_ / r3
        # Force on body 2 from body 1 (attractive)
        ax2 = -G * M * dx / r3
        ay2 = -G * M * dy_ / r3
        return np.array([vx1, vy1, ax1, ay1, vx2, vy2, ax2, ay2])

    return deriv


# ── Cached integrators ────────────────────────────────────────────────────────


@st.cache_data(show_spinner=False)
def integrate_single_body(
    M: float,
    r0: float,
    v0_ratio: float,
    n_periods: float = 2.0,
    dt_steps_per_period: int = 500,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate the single-body orbit and return (t_arr, y_arr).

    For hyperbolic / parabolic orbits the integration is stopped early when
    r > 5 * r₀ to avoid unbounded run-time.

    Parameters
    ----------
    M                    : central mass (kg)
    r0                   : initial orbital radius (m)
    v0_ratio             : v₀ / v_circular  (dimensionless)
    n_periods            : number of orbital periods to integrate (bound orbits)
    dt_steps_per_period  : RK4 steps per orbital period

    Returns
    -------
    t_arr : 1-D time array (s)
    y_arr : 2-D state array shape (n, 4) — [x, y, vx, vy]
    """
    vc = v_circular(M, r0)
    v0 = v0_ratio * vc
    v_esc_ratio = np.sqrt(2.0)

    # Initial conditions: start on x-axis, velocity tangential (+y direction)
    y0 = np.array([r0, 0.0, 0.0, v0])

    T_period = orbital_period(r0, M)
    dt = T_period / dt_steps_per_period

    is_unbound = v0_ratio >= v_esc_ratio - 0.03
    if is_unbound:
        # For hyperbolic/parabolic: integrate for 2 "periods" worth of time
        # but we will stop early when r exceeds 5*r0
        t_end = T_period * 3.0
    else:
        t_end = T_period * n_periods

    ode = make_single_body_ode(M)

    # Manual RK4 with early-exit for unbound orbits
    from utils.physics import rk4_step  # type: ignore[attr-defined]

    n_steps = max(1, int((t_end) / dt))
    t_vals = [0.0]
    y_vals = [y0.copy()]
    t = 0.0
    y = y0.copy()
    r_limit = 5.0 * r0

    for _ in range(n_steps):
        y = rk4_step(ode, t, y, dt)
        t += dt
        t_vals.append(t)
        y_vals.append(y.copy())
        r_now = np.sqrt(y[0] ** 2 + y[1] ** 2)
        if is_unbound and r_now > r_limit:
            break

    t_arr = np.array(t_vals)
    y_arr = np.array(y_vals)
    return t_arr, y_arr


@st.cache_data(show_spinner=False)
def integrate_two_body(
    M: float,
    m: float,
    r0: float,
    v0_ratio: float,
    n_periods: float = 2.0,
    dt_steps_per_period: int = 500,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate the two-body problem and return (t_arr, y_arr).

    Both bodies start on the x-axis, separated by r0, orbiting the
    centre of mass with velocities consistent with the total v0_ratio.

    State y = [x1, y1, vx1, vy1, x2, y2, vx2, vy2].
    """
    M_total = M + m
    # Reduced mass positions relative to CoM
    r1_0 = m * r0 / M_total   # star distance from CoM
    r2_0 = M * r0 / M_total   # planet distance from CoM

    vc = v_circular(M_total, r0)
    v0 = v0_ratio * vc

    # Velocities: star moves opposite direction, scaled by mass ratio
    v1_0 = -v0 * m / M_total   # star tangential velocity (opposite to planet)
    v2_0 = v0 * M / M_total    # planet tangential velocity

    # Place star at -r1_0 on x-axis, planet at +r2_0 on x-axis
    y0 = np.array([-r1_0, 0.0, 0.0, v1_0,
                    r2_0, 0.0, 0.0, v2_0])

    T_period = orbital_period(r0, M_total)
    dt = T_period / dt_steps_per_period
    t_end = T_period * n_periods

    ode = make_two_body_ode(M, m)
    t_arr, y_arr = rk4_integrate(ode, y0, (0.0, t_end), dt)
    return t_arr, y_arr


@st.cache_data(show_spinner=False)
def integrate_hohmann_transfer(
    M: float,
    r0: float,
    r_target: float,
    dt_steps: int = 800,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate the Hohmann transfer ellipse from r0 to r_target.

    The transfer starts at periapsis (r0) with v1 tangential and ends when
    r > r_target - tolerance or half the transfer period has elapsed.

    Returns (t_arr, y_arr) with y columns [x, y, vx, vy].
    """
    from utils.physics import rk4_step  # type: ignore[attr-defined]

    ht = hohmann_transfer(M, r0, r_target)
    v1 = ht["v1"]
    T_half = ht["T_transfer"]   # already π * sqrt(a³/GM) = half-period

    y0 = np.array([r0, 0.0, 0.0, v1])
    dt = T_half / dt_steps
    ode = make_single_body_ode(M)

    t_vals = [0.0]
    y_vals = [y0.copy()]
    t = 0.0
    y = y0.copy()

    r_limit_hi = max(r0, r_target) * 1.05

    for _ in range(dt_steps):
        y = rk4_step(ode, t, y, dt)
        t += dt
        t_vals.append(t)
        y_vals.append(y.copy())
        r_now = float(np.sqrt(y[0] ** 2 + y[1] ** 2))
        if r_now > r_limit_hi:
            break

    return np.array(t_vals), np.array(y_vals)


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_trajectory_fig(
    y_arr: np.ndarray,
    r0: float,
    is_unbound: bool = False,
) -> go.Figure:
    """
    Build the orbital trajectory figure (x vs y).

    Parameters
    ----------
    y_arr    : state array from single-body integration, shape (n, 4)
    r0       : initial orbital radius (m) — used to scale the axis
    is_unbound: if True, suppress the starting-position ring annotation

    Returns
    -------
    fig : Plotly Figure with equal-aspect trajectory
    """
    x = y_arr[:, 0]
    y = y_arr[:, 1]

    # Scale to AU for display
    x_au = x / AU
    y_au = y / AU
    r0_au = r0 / AU

    fig = go.Figure()

    # Orbit trace
    fig.add_trace(
        go.Scatter(
            x=x_au,
            y=y_au,
            mode="lines",
            name="Orbit",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )

    # Starting position
    fig.add_trace(
        go.Scatter(
            x=[r0_au],
            y=[0.0],
            mode="markers",
            name="Start",
            marker=dict(
                color=COLOURS["advanced"],
                size=10,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # Central star at origin
    fig.add_trace(
        go.Scatter(
            x=[0.0],
            y=[0.0],
            mode="markers",
            name="Central star",
            marker=dict(
                color=COLOURS["highlight"],
                size=20,
                symbol="star",
                line=dict(color=COLOURS["secondary"], width=1),
            ),
        )
    )

    # Equal aspect ratio + auto-range
    coord_range = max(np.max(np.abs(x_au)), np.max(np.abs(y_au))) * 1.15
    coord_range = max(coord_range, r0_au * 1.2)

    fig.update_layout(
        **plotly_layout(
            height=520,
            title=dict(text="Orbital Trajectory", font=dict(size=14)),
            xaxis=dict(
                title="x (AU)",
                range=[-coord_range, coord_range],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (AU)",
                range=[-coord_range, coord_range],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_energy_fig(
    t_arr: np.ndarray,
    y_arr: np.ndarray,
    M: float,
) -> go.Figure:
    """
    Build the specific energy vs time figure.

    Specific energies (per unit planet mass) are plotted so the result is
    mass-independent and shows integrator conservation directly.

    Parameters
    ----------
    t_arr : time array (s)
    y_arr : state array shape (n, 4)
    M     : central mass (kg)

    Returns
    -------
    fig : Plotly Figure
    """
    x = y_arr[:, 0]
    yy = y_arr[:, 1]
    vx = y_arr[:, 2]
    vy = y_arr[:, 3]

    r = np.sqrt(x * x + yy * yy)
    r = np.where(r < 1e3, 1e3, r)

    KE = 0.5 * (vx ** 2 + vy ** 2)          # J/kg
    PE = -G * M / r                           # J/kg
    E_total = KE + PE                         # J/kg

    t_yr = t_arr / YEAR_S

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=t_yr,
            y=KE,
            mode="lines",
            name="KE (specific)",
            line=dict(color=COLOURS["secondary"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=t_yr,
            y=PE,
            mode="lines",
            name="PE (specific)",
            line=dict(color=COLOURS["tertiary"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=t_yr,
            y=E_total,
            mode="lines",
            name="E_total (should be constant)",
            line=dict(color=COLOURS["highlight"], width=2, dash="dash"),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=320,
            title=dict(text="Specific Energy vs Time", font=dict(size=14)),
            xaxis=dict(
                title="Time (years)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Specific energy (J kg⁻¹)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_two_body_fig(
    t_arr: np.ndarray,
    y_arr: np.ndarray,
    M: float,
    m: float,
) -> go.Figure:
    """
    Build the two-body trajectory figure showing both bodies and their CoM.

    Parameters
    ----------
    t_arr : time array (s)
    y_arr : state array shape (n, 8) — [x1, y1, vx1, vy1, x2, y2, vx2, vy2]
    M     : star mass (kg)
    m     : planet mass (kg)

    Returns
    -------
    fig : Plotly Figure
    """
    x1 = y_arr[:, 0] / AU
    y1 = y_arr[:, 1] / AU
    x2 = y_arr[:, 4] / AU
    y2 = y_arr[:, 5] / AU

    M_total = M + m
    xcm = (M * x1 + m * x2) / M_total
    ycm = (M * y1 + m * y2) / M_total

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=x1, y=y1,
            mode="lines",
            name="Star trajectory",
            line=dict(color=COLOURS["highlight"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=x2, y=y2,
            mode="lines",
            name="Planet trajectory",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=xcm, y=ycm,
            mode="lines",
            name="Centre of mass (fixed)",
            line=dict(color=COLOURS["advanced"], width=1, dash="dot"),
        )
    )

    # Mark starting positions
    fig.add_trace(
        go.Scatter(
            x=[x1[0]], y=[y1[0]],
            mode="markers",
            name="Star t=0",
            marker=dict(color=COLOURS["highlight"], size=12, symbol="star"),
            showlegend=False,
        )
    )
    fig.add_trace(
        go.Scatter(
            x=[x2[0]], y=[y2[0]],
            mode="markers",
            name="Planet t=0",
            marker=dict(color=COLOURS["primary"], size=10, symbol="circle"),
            showlegend=False,
        )
    )

    coord_range = max(
        np.max(np.abs(x1)), np.max(np.abs(y1)),
        np.max(np.abs(x2)), np.max(np.abs(y2)),
    ) * 1.15

    fig.update_layout(
        **plotly_layout(
            height=480,
            title=dict(text="Two-Body Orbital Trajectories", font=dict(size=14)),
            xaxis=dict(
                title="x (AU)",
                range=[-coord_range, coord_range],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (AU)",
                range=[-coord_range, coord_range],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_rotation_curve_fig(
    M: float,
    v_dm_kms: float,
) -> go.Figure:
    """
    Build the galaxy rotation curve figure.

    Shows the Keplerian (point-mass) decline and a flat dark-matter curve,
    plus their combined quadrature sum.

    Parameters
    ----------
    M        : visible central mass (kg) — sets Keplerian curve normalisation
    v_dm_kms : flat dark-matter circular velocity (km/s)

    Returns
    -------
    fig : Plotly Figure
    """
    r_kpc = np.linspace(0.5, 30.0, 500)       # kpc
    r_m = r_kpc * KPC                         # metres

    v_point_ms = np.sqrt(G * M / r_m)         # m/s — Keplerian
    v_dm_ms = v_dm_kms * 1e3                  # convert to m/s
    v_total_ms = np.sqrt(v_point_ms ** 2 + v_dm_ms ** 2)

    # Convert to km/s for display
    v_point = v_point_ms / 1e3
    v_dm_arr = np.full_like(r_kpc, v_dm_kms)
    v_total = v_total_ms / 1e3

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=r_kpc, y=v_point,
            mode="lines",
            name="Visible matter (Keplerian, v ∝ r⁻¹ᐟ²)",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=r_kpc, y=v_dm_arr,
            mode="lines",
            name="Dark matter halo (flat, simplified)",
            line=dict(color=COLOURS["advanced"], width=2, dash="dash"),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=r_kpc, y=v_total,
            mode="lines",
            name="Combined (visible + dark matter)",
            line=dict(color=COLOURS["highlight"], width=3),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Galaxy Rotation Curve", font=dict(size=14)),
            xaxis=dict(
                title="Radius (kpc)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Orbital speed (km/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                rangemode="tozero",
            ),
        )
    )
    return fig


# ── Binary star helpers ───────────────────────────────────────────────────────


def binary_star_params(M1: float, M2: float, d: float) -> dict:
    """
    Compute binary star system parameters.

    Parameters
    ----------
    M1, M2 : stellar masses (kg)
    d      : orbital separation (m)

    Returns
    -------
    dict with keys: r1, r2, omega, T, v1, v2, x_cm
    """
    M_total = M1 + M2
    x_cm = M2 * d / M_total          # CoM distance from star 1
    r1 = x_cm                         # star 1 orbital radius around CoM
    r2 = M1 * d / M_total             # star 2 orbital radius around CoM
    omega = float(np.sqrt(G * M_total / d ** 3))
    T = 2.0 * np.pi / omega
    v1 = omega * r1
    v2 = omega * r2
    return {
        "r1": r1,
        "r2": r2,
        "omega": omega,
        "T": T,
        "v1": v1,
        "v2": v2,
        "x_cm": x_cm,
    }


def format_period_bs(T_s: float) -> str:
    """Return a human-readable period (days or years)."""
    if T_s < 86400.0:
        return f"{T_s / 3600.0:.2f} h"
    elif T_s < 365.25 * 86400.0:
        return f"{T_s / 86400.0:.2f} days"
    else:
        return f"{T_s / (365.25 * 86400.0):.2f} years"


def build_binary_orbit_fig(
    M1: float,
    M2: float,
    d: float,
    phi_deg: float,
    show_trail: bool,
) -> go.Figure:
    """
    Build the binary star orbital diagram.

    Parameters
    ----------
    M1, M2    : stellar masses (kg)
    d         : separation (m)
    phi_deg   : phase angle (degrees)
    show_trail: whether to draw the last 180° trail arc

    Returns
    -------
    go.Figure
    """
    params = binary_star_params(M1, M2, d)
    r1 = params["r1"]
    r2 = params["r2"]
    v1 = params["v1"]
    v2 = params["v2"]

    phi = np.radians(phi_deg)

    # Current positions (relative to barycentre, in AU)
    x1 = r1 * np.cos(phi) / AU
    y1 = r1 * np.sin(phi) / AU
    x2 = -r2 * np.cos(phi) / AU
    y2 = -r2 * np.sin(phi) / AU

    # Velocity directions (tangent to orbit, perpendicular to radius)
    vx1_hat = -np.sin(phi)
    vy1_hat = np.cos(phi)
    vx2_hat = np.sin(phi)
    vy2_hat = -np.cos(phi)

    # Marker sizes: proportional to M^(1/3), scaled for visibility
    _base_size = 18.0
    _scale = max(M1, M2) ** (1.0 / 3.0)
    s1 = max(8.0, _base_size * (M1 ** (1.0 / 3.0)) / _scale)
    s2 = max(8.0, _base_size * (M2 ** (1.0 / 3.0)) / _scale)

    fig = go.Figure()

    # ── Orbital path circles ───────────────────────────────────────────────────
    _theta = np.linspace(0, 2 * np.pi, 300)
    r1_au = r1 / AU
    r2_au = r2 / AU

    fig.add_trace(
        go.Scatter(
            x=r1_au * np.cos(_theta),
            y=r1_au * np.sin(_theta),
            mode="lines",
            name="M₁ orbit",
            line=dict(color=COLOURS["primary"], width=1, dash="dash"),
            hoverinfo="skip",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=r2_au * np.cos(_theta),
            y=r2_au * np.sin(_theta),
            mode="lines",
            name="M₂ orbit",
            line=dict(color=COLOURS["secondary"], width=1, dash="dash"),
            hoverinfo="skip",
        )
    )

    # ── Trail arcs (last 180°) ─────────────────────────────────────────────────
    if show_trail:
        _trail_angles = np.linspace(phi - np.pi, phi, 120)
        fig.add_trace(
            go.Scatter(
                x=r1_au * np.cos(_trail_angles),
                y=r1_au * np.sin(_trail_angles),
                mode="lines",
                name="M₁ trail",
                line=dict(color=COLOURS["primary"], width=3),
                opacity=0.35,
                hoverinfo="skip",
                showlegend=False,
            )
        )
        fig.add_trace(
            go.Scatter(
                x=r2_au * np.cos(_trail_angles + np.pi),
                y=r2_au * np.sin(_trail_angles + np.pi),
                mode="lines",
                name="M₂ trail",
                line=dict(color=COLOURS["secondary"], width=3),
                opacity=0.35,
                hoverinfo="skip",
                showlegend=False,
            )
        )

    # ── Velocity arrows ────────────────────────────────────────────────────────
    _arrow_scale = max(r1_au, r2_au) * 0.35
    _v_max = max(v1, v2)
    _arr1 = _arrow_scale * (v1 / _v_max)
    _arr2 = _arrow_scale * (v2 / _v_max)

    fig.add_annotation(
        ax=x1, ay=y1,
        x=x1 + _arr1 * vx1_hat,
        y=y1 + _arr1 * vy1_hat,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True,
        arrowhead=3,
        arrowsize=1.2,
        arrowwidth=2,
        arrowcolor=COLOURS["primary"],
    )
    fig.add_annotation(
        ax=x2, ay=y2,
        x=x2 + _arr2 * vx2_hat,
        y=y2 + _arr2 * vy2_hat,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True,
        arrowhead=3,
        arrowsize=1.2,
        arrowwidth=2,
        arrowcolor=COLOURS["secondary"],
    )

    # ── Stars ──────────────────────────────────────────────────────────────────
    fig.add_trace(
        go.Scatter(
            x=[x1], y=[y1],
            mode="markers+text",
            name="M₁",
            text=["M₁"],
            textposition="top center",
            textfont=dict(color=COLOURS["primary"], size=13),
            marker=dict(
                color=COLOURS["primary"],
                size=s1,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=[x2], y=[y2],
            mode="markers+text",
            name="M₂",
            text=["M₂"],
            textposition="top center",
            textfont=dict(color=COLOURS["secondary"], size=13),
            marker=dict(
                color=COLOURS["secondary"],
                size=s2,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # ── Barycentre ─────────────────────────────────────────────────────────────
    fig.add_trace(
        go.Scatter(
            x=[0.0], y=[0.0],
            mode="markers+text",
            name="CoM",
            text=["CoM"],
            textposition="bottom center",
            textfont=dict(color=COLOURS["text"], size=11),
            marker=dict(
                color=COLOURS["text"],
                size=8,
                symbol="x",
            ),
        )
    )

    # ── Layout ─────────────────────────────────────────────────────────────────
    _coord_range = (max(r1_au, r2_au) + 0.5 * max(r1_au, r2_au)) * 1.3
    _coord_range = max(_coord_range, 0.01)

    fig.update_layout(
        **plotly_layout(
            height=500,
            title=dict(text="Binary Star Orbital Diagram", font=dict(size=14)),
            xaxis=dict(
                title="x (AU)",
                range=[-_coord_range, _coord_range],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (AU)",
                range=[-_coord_range, _coord_range],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_radial_velocity_fig(
    v1: float,
    v2: float,
    incl_deg: float,
) -> go.Figure:
    """
    Build the radial velocity curve figure.

    v_radial = v * sin(i) * cos(phi)  for each star.

    Parameters
    ----------
    v1, v2   : orbital speeds (m/s)
    incl_deg : orbital inclination (degrees)

    Returns
    -------
    go.Figure
    """
    phi_arr = np.linspace(0.0, 1.0, 500)        # phase 0→1
    incl = np.radians(incl_deg)
    phi_rad = 2.0 * np.pi * phi_arr

    # Star 1 moves away when star 2 approaches (anti-correlated)
    vr1 = v1 * np.sin(incl) * np.cos(phi_rad) / 1000.0    # km/s
    vr2 = -v2 * np.sin(incl) * np.cos(phi_rad) / 1000.0   # km/s

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=phi_arr, y=vr1,
            mode="lines",
            name="Star 1 (M₁)",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=phi_arr, y=vr2,
            mode="lines",
            name="Star 2 (M₂)",
            line=dict(color=COLOURS["secondary"], width=2),
        )
    )
    fig.add_hline(y=0, line_dash="dot", line_color=COLOURS["grid"])

    fig.update_layout(
        **plotly_layout(
            height=320,
            title=dict(text="Radial Velocity Curves (spectroscopic binary)", font=dict(size=14)),
            xaxis=dict(
                title="Orbital phase",
                range=[0.0, 1.0],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Radial velocity (km/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── p5.js animation builder ───────────────────────────────────────────────────


def build_orbital_animation(x_arr, y_arr, vx_arr, vy_arr, central_mass_name="☉", body_name="Planet"):
    """Build p5.js animated orbit HTML."""
    import json, numpy as np
    step = max(1, len(x_arr) // 400)
    xs = x_arr[::step].tolist()
    ys = y_arr[::step].tolist()
    vxs = vx_arr[::step].tolist()
    vys = vy_arr[::step].tolist()

    r_max = float(np.max(np.sqrt(np.array(xs)**2 + np.array(ys)**2))) * 1.15

    data = json.dumps({
        "x": xs, "y": ys, "vx": vxs, "vy": vys,
        "rMax": r_max, "n": len(xs),
        "centralName": central_mass_name,
        "bodyName": body_name
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>body{{margin:0;overflow:hidden;background:#0e1117;}}</style>
</head><body>
<script>
const D = {data};
let frame=0, playing=true, speed=2;
let trail=[];

function setup(){{
  createCanvas(windowWidth||700,460);
  textFont('monospace');
}}
function windowResized(){{ resizeCanvas(windowWidth,460); }}

function toScreen(wx,wy){{
  let cx=width/2, cy=height/2;
  let scale=min(width,height)*0.43/D.rMax;
  return [cx+wx*scale, cy-wy*scale];
}}

function mousePressed(){{
  if(mouseX>width-120&&mouseX<width-10){{
    if(mouseY>10&&mouseY<40) playing=!playing;
    else if(mouseY>50&&mouseY<80){{frame=0;trail=[];playing=true;}}
    else if(mouseY>90&&mouseY<120) speed=speed===1?2:speed===2?4:1;
  }}
}}

function drawArrow(x1,y1,x2,y2,col){{
  stroke(col); fill(col); strokeWeight(2);
  line(x1,y1,x2,y2);
  let a=atan2(y2-y1,x2-x1);
  push(); translate(x2,y2); rotate(a);
  triangle(0,0,-10,-4,-10,4); pop();
}}

function draw(){{
  background(14,17,23);

  // Starfield (static)
  randomSeed(42);
  noStroke(); fill(255,255,255,120);
  for(let i=0;i<80;i++) circle(random(width),random(height),random(1,2.5));

  // Grid (faint circles)
  let [cx,cy]=toScreen(0,0);
  for(let r=1;r<=4;r++){{
    let rr=r*D.rMax/4;
    let [ex,ey]=toScreen(rr,0);
    noFill(); stroke(42,42,60,120); strokeWeight(0.5);
    circle(cx,cy,dist(cx,cy,ex,ey)*2);
  }}

  // Orbit path (full)
  noFill(); stroke(31,119,180,40); strokeWeight(1);
  beginShape();
  for(let i=0;i<D.n;i++){{
    let [sx,sy]=toScreen(D.x[i],D.y[i]);
    vertex(sx,sy);
  }}
  endShape(CLOSE);

  // Trail
  let idx=min(frame,D.n-1);
  trail.push([D.x[idx],D.y[idx]]);
  let maxTrail=120;
  if(trail.length>maxTrail) trail.shift();

  for(let i=1;i<trail.length;i++){{
    let a=map(i,0,trail.length,0,180);
    let [tx1,ty1]=toScreen(trail[i-1][0],trail[i-1][1]);
    let [tx2,ty2]=toScreen(trail[i][0],trail[i][1]);
    stroke(31,119,180,a); strokeWeight(map(i,0,trail.length,0.5,2.5));
    line(tx1,ty1,tx2,ty2);
  }}

  // Central body (star/planet) glow
  noStroke();
  for(let r=40;r>0;r-=6){{ fill(255,200,50,map(r,0,40,0,20)); circle(cx,cy,r*2); }}
  fill('#ffc832'); stroke('#ffffff'); strokeWeight(1);
  circle(cx,cy,22);
  noStroke(); fill('#fafafa'); textSize(10); textAlign(CENTER);
  text(D.centralName,cx,cy+28);
  textAlign(LEFT);

  // Orbital body
  let [bx,by]=toScreen(D.x[idx],D.y[idx]);
  noStroke();
  for(let r=18;r>0;r-=4){{ fill(31,119,180,map(r,0,18,0,30)); circle(bx,by,r*2); }}
  fill('#1f77b4'); stroke('#aaddff'); strokeWeight(1.5); circle(bx,by,14);

  // Velocity vector
  let vx=D.vx[idx], vy=D.vy[idx];
  let vmag=sqrt(vx*vx+vy*vy);
  let vscale=min(width,height)*0.001/(D.rMax*0.001+0.001);
  if(vmag>0){{
    let [tx,ty]=toScreen(D.x[idx]+vx*vscale*0.25, D.y[idx]+vy*vscale*0.25);
    drawArrow(bx,by,tx,ty,color(255,127,14));
  }}

  // Radius line
  stroke(155,89,182,100); strokeWeight(1); setLineDash([5,4]);
  line(cx,cy,bx,by);
  setLineDash([]);

  // Speed readout
  noStroke(); fill('#aaa'); textSize(10);
  let vkm=(vmag/1000).toFixed(2);
  // compute distance in AU-equivalent
  let r_cur=sqrt(D.x[idx]*D.x[idx]+D.y[idx]*D.y[idx]);
  text('v = '+vkm+' km/s', 10, height-30);
  text('r = '+(r_cur/D.rMax).toFixed(3)+' r_max', 10, height-16);

  // Controls
  noStroke(); fill(15,15,25,220); rect(width-118,8,110,120,6);
  fill('#fafafa'); textSize(11);
  text(playing?'⏸ Pause':'▶ Play',width-112,28);
  text('↺ Replay',width-112,68);
  text('⚡ '+speed+'x',width-112,108);

  if(playing) frame+=speed;
  if(frame>=D.n){{ frame=0; trail=[]; }}
}}

function setLineDash(list){{ drawingContext.setLineDash(list); }}
</script></body></html>"""


# ── Main page ─────────────────────────────────────────────────────────────────


def render_orbital_mechanics_tab(mode: str) -> None:
    """Render the Orbital Mechanics tab content."""

    left_col, right_col = two_column_layout(3, 7)

    # ── Left column: controls ─────────────────────────────────────────────────

    with left_col:
        # ── Real-world preset selector (Basic mode) ───────────────────────────

        preset_labels = ["Custom"] + [p[0] for p in ORBIT_PRESETS]
        preset_choice = st.selectbox(
            "Real-world orbit preset",
            options=preset_labels,
            index=0,
            help="Select a real satellite or planetary orbit, or choose Custom to set parameters manually.",
        )

        # Resolve preset values
        _preset_M: float | None = None
        _preset_r0: float | None = None
        _preset_vr: float | None = None
        _preset_ctx: str | None = None

        if preset_choice != "Custom":
            for _label, _pm, _pr, _pv, _pc in ORBIT_PRESETS:
                if _label == preset_choice:
                    _preset_M = _pm
                    _preset_r0 = _pr
                    _preset_vr = _pv
                    _preset_ctx = _pc
                    break

        st.subheader("Central Star")

        # Central mass — select slider with solar-mass display labels
        _default_M_index: int = 4
        if _preset_M is not None:
            # Find closest match in MASS_OPTIONS (or leave at default)
            _diffs = [abs(m - _preset_M) for m in MASS_OPTIONS]
            _default_M_index = int(np.argmin(_diffs))

        M_index = st.select_slider(
            "Central mass M",
            options=list(range(len(MASS_OPTIONS))),
            value=_default_M_index,
            format_func=lambda i: MASS_LABELS[i],
            help="Mass of the central body. Default ≈ 1 solar mass.",
            disabled=(preset_choice != "Custom"),
        )
        M = MASS_OPTIONS[M_index] if preset_choice == "Custom" else _preset_M
        st.caption(f"M = {M:.3e} kg = {M / SOLAR_MASS:.2f} M☉")

        st.divider()
        st.subheader("Planet Orbit")

        _default_r0: float = _preset_r0 if _preset_r0 is not None else 1.5e11
        # Clamp to slider range for display purposes; use raw value directly when preset
        _r0_slider_val = float(np.clip(_default_r0, 1e10, 1e12))

        r0_raw = st.slider(
            "Initial orbital radius r₀ (m)",
            min_value=1e10,
            max_value=1e12,
            value=_r0_slider_val,
            step=1e10,
            format="%.2e",
            help="Distance from central star at t = 0. Default ≈ 1 AU.",
            disabled=(preset_choice != "Custom"),
        )
        # For presets that exceed slider range (e.g. Moon, Earth-Sun), use exact value
        r0: float = _preset_r0 if _preset_r0 is not None else float(r0_raw)
        st.caption(f"r₀ = {r0 / AU:.4f} AU  ({r0:.3e} m)")

        vc = v_circular(M, r0)
        _default_vr: float = _preset_vr if _preset_vr is not None else 1.00
        v_ratio = st.slider(
            "v₀ / v_circular",
            min_value=0.10,
            max_value=2.00,
            value=float(np.clip(_default_vr, 0.10, 2.00)),
            step=0.05,
            help=(
                "Fraction of circular orbital speed. "
                "1.0 → circular orbit. "
                "√2 ≈ 1.41 → escape velocity."
            ),
            disabled=(preset_choice != "Custom"),
        )
        # Use exact preset v_ratio (may be 1.5 etc.)
        v_ratio = _preset_vr if _preset_vr is not None else v_ratio
        v0 = v_ratio * vc
        st.caption(
            f"v_circular = {vc:.2e} m/s\n\n"
            f"v₀ = {v0:.2e} m/s\n\n"
            f"v_escape = {vc * np.sqrt(2):.2e} m/s"
        )

        if _preset_ctx is not None:
            st.info(_preset_ctx)

        # ── Advanced controls ─────────────────────────────────────────────────

        enable_two_body = False
        m_planet: float = 6e24
        enable_rotation_curve = False
        v_dm_kms: float = 150.0
        enable_hohmann = False
        r_target: float = 2.0 * r0

        if mode == "Advanced":
            advanced_divider()

            # Two-body toggle
            enable_two_body = st.checkbox(
                "Enable two-body (planet has mass)",
                value=False,
                help=(
                    "Both bodies orbit their common centre of mass. "
                    "The centre of mass remains fixed."
                ),
            )
            if enable_two_body:
                m_planet_raw = st.slider(
                    "Planet mass m_planet (kg)",
                    min_value=1e20,
                    max_value=1e30,
                    value=6e24,
                    step=1e23,
                    format="%.2e",
                    help="Planet mass. Default ≈ Earth mass (6e24 kg).",
                )
                m_planet = float(m_planet_raw)
                st.caption(
                    f"m/M = {m_planet / M:.3e}  "
                    f"({'significant' if m_planet / M > 0.01 else 'negligible'})"
                )

            st.divider()

            # Hohmann transfer toggle
            enable_hohmann = st.checkbox(
                "Show Hohmann transfer orbit",
                value=False,
                help=(
                    "Overlay the most fuel-efficient elliptical transfer path "
                    "from the current circular orbit to a target orbit."
                ),
            )
            if enable_hohmann:
                r_target_raw = st.slider(
                    "Target orbit radius r_target (m)",
                    min_value=1e10,
                    max_value=1e12,
                    value=float(np.clip(2.0 * r0, 1e10, 1e12)),
                    step=1e10,
                    format="%.2e",
                    help="Radius of the destination circular orbit.",
                )
                r_target = float(r_target_raw)
                st.caption(f"r_target = {r_target / AU:.4f} AU  ({r_target:.3e} m)")

            st.divider()

            # Galaxy rotation curve toggle
            enable_rotation_curve = st.checkbox(
                "Show galaxy rotation curve",
                value=False,
                help=(
                    "Compares Keplerian (visible matter) orbital speeds "
                    "with a flat dark-matter halo contribution. "
                    "Spec ref: 8(e)."
                ),
            )
            if enable_rotation_curve:
                v_dm_kms = float(
                    st.slider(
                        "Dark matter halo speed v_DM (km/s)",
                        min_value=50,
                        max_value=250,
                        value=150,
                        step=10,
                        help=(
                            "Asymptotic flat rotation speed contributed "
                            "by the dark matter halo (simplified NFW model)."
                        ),
                    )
                )

    # ── Derived orbital quantities ─────────────────────────────────────────────

    T_period = orbital_period(r0, M)           # Keplerian period for r0
    is_unbound = v_ratio >= np.sqrt(2.0) - 0.03

    # For elliptical orbits: semi-major axis from vis-viva energy
    # E_spec = -GM/(2a)  →  a = -GM/(2*E_spec)
    E_spec = 0.5 * v0 ** 2 - G * M / r0
    if E_spec < 0:
        a_semi = -G * M / (2.0 * E_spec)
        T_true = orbital_period(a_semi, M)
    else:
        a_semi = r0           # use r0 as proxy for display
        T_true = T_period     # not a bound period; shown as N/A below

    # ── Right column: plots ───────────────────────────────────────────────────

    with right_col:

        # ── Metric row ────────────────────────────────────────────────────────

        # Kepler's 3rd law: T² = (4π²/GM) r³  →  r³/T² = GM/(4π²)
        kepler_ratio = r0 ** 3 / T_period ** 2        # m³ s⁻²  (= GM/4π²)
        kepler_theory = G * M / (4.0 * np.pi ** 2)   # m³ s⁻²  theoretical value

        metric_row(
            {
                "Orbital period T": (
                    f"{T_period / YEAR_S:.3f} years"
                    if not is_unbound
                    else "Unbound (open orbit)"
                ),
                "r³/T² (measured)": f"{kepler_ratio:.4e} m³/s²",
                "GM/4π² (theory)": f"{kepler_theory:.4e} m³/s²",
            }
        )

        # ── Orbit type info ───────────────────────────────────────────────────

        orbit_label = classify_orbit(v_ratio)
        if is_unbound:
            st.warning(f"Orbit type: **{orbit_label}** — trajectory is open (r → ∞)")
        elif abs(v_ratio - 1.0) < 0.03:
            st.success(f"Orbit type: **{orbit_label}**")
        else:
            st.info(f"Orbit type: **{orbit_label}**")

        # ── Integrate single-body orbit ───────────────────────────────────────

        with st.spinner("Computing orbit…"):
            t_arr, y_arr = integrate_single_body(
                M=M,
                r0=r0,
                v0_ratio=v_ratio,
            )

        # Optionally integrate Hohmann transfer and overlay on trajectory plot
        fig_traj = build_trajectory_fig(y_arr, r0, is_unbound=is_unbound)

        if mode == "Advanced" and enable_hohmann and not is_unbound:
            with st.spinner("Computing Hohmann transfer…"):
                _, y_ht = integrate_hohmann_transfer(M, r0, r_target)
            x_ht = y_ht[:, 0] / AU
            y_ht_au = y_ht[:, 1] / AU
            fig_traj.add_trace(
                go.Scatter(
                    x=x_ht,
                    y=y_ht_au,
                    mode="lines",
                    name="Hohmann transfer",
                    line=dict(color=COLOURS["advanced"], width=2, dash="dash"),
                )
            )
            # Mark target orbit circle (dashed)
            _theta = np.linspace(0, 2 * np.pi, 200)
            _r_tgt_au = r_target / AU
            fig_traj.add_trace(
                go.Scatter(
                    x=_r_tgt_au * np.cos(_theta),
                    y=_r_tgt_au * np.sin(_theta),
                    mode="lines",
                    name="Target circular orbit",
                    line=dict(color=COLOURS["advanced"], width=1, dash="dot"),
                )
            )

        # Animated p5.js canvas — live orbit with glowing trail and velocity vector
        x_arr = y_arr[:, 0]
        y_arr_pos = y_arr[:, 1]
        vx_arr = y_arr[:, 2]
        vy_arr = y_arr[:, 3]
        anim_html = build_orbital_animation(x_arr, y_arr_pos, vx_arr, vy_arr)
        components.html(anim_html, height=470)
        st.caption("▶ Play/Pause · ↺ Replay · ⚡ Speed — Central body at origin")
        st.divider()

        # Plot trajectory
        st.plotly_chart(fig_traj, use_container_width=True)

        # ── Speed and altitude insights (Basic mode) ──────────────────────────

        if mode == "Basic":
            g_orbit = G * M / r0 ** 2
            _vc_kms = v_circular(M, r0) / 1000.0
            _T_fmt = format_period(orbital_period(r0, M))
            metric_row(
                {
                    "Orbital speed": f"{_vc_kms:.2f} km/s",
                    "Orbital period": _T_fmt,
                    "g at orbit": f"{g_orbit:.3f} m/s²",
                }
            )
            st.caption(
                f"At this altitude, g = {g_orbit:.3f} m/s². "
                "Astronauts appear weightless not because gravity is zero, "
                "but because they are in FREE FALL — the spacecraft and "
                "everything in it fall together."
            )

        # ── Hohmann transfer results (Advanced mode) ──────────────────────────

        if mode == "Advanced" and enable_hohmann and not is_unbound:
            st.markdown("---")
            st.markdown("#### Hohmann Transfer Results")
            ht = hohmann_transfer(M, r0, r_target)
            metric_row(
                {
                    "Δv₁ (departure burn)": f"{ht['dv1'] / 1000.0:.3f} km/s",
                    "Δv₂ (arrival burn)": f"{ht['dv2'] / 1000.0:.3f} km/s",
                    "Total Δv": f"{ht['dv_total'] / 1000.0:.3f} km/s",
                    "Transfer time": format_period(ht["T_transfer"]),
                }
            )
            st.info(
                "A Hohmann transfer is the most fuel-efficient path between two "
                "circular orbits. The Mars mission (Earth→Mars) requires Δv ≈ 3.6 km/s "
                "and takes ~259 days."
            )

        # Plot energy
        fig_energy = build_energy_fig(t_arr, y_arr, M)
        st.plotly_chart(fig_energy, use_container_width=True)

        # ── Energy conservation diagnostic ────────────────────────────────────

        x = y_arr[:, 0]
        yy_pos = y_arr[:, 1]
        vx = y_arr[:, 2]
        vy = y_arr[:, 3]
        r_arr = np.sqrt(x ** 2 + yy_pos ** 2)
        r_arr = np.where(r_arr < 1e3, 1e3, r_arr)
        KE_arr = 0.5 * (vx ** 2 + vy ** 2)
        PE_arr = -G * M / r_arr
        E_arr = KE_arr + PE_arr
        E_drift_pct = (
            abs((E_arr[-1] - E_arr[0]) / E_arr[0]) * 100.0
            if abs(E_arr[0]) > 1e-30
            else 0.0
        )
        st.caption(
            f"Energy conservation: drift = {E_drift_pct:.4f} % "
            f"(RK4 integrator — should be < 0.5 % for 2 orbital periods)"
        )

        # ── Kepler's 3rd law note ─────────────────────────────────────────────

        kepler_match_pct = abs(kepler_ratio - kepler_theory) / kepler_theory * 100.0
        st.caption(
            f"Kepler's 3rd law check: r³/T² = {kepler_ratio:.4e} m³/s²,  "
            f"GM/(4π²) = {kepler_theory:.4e} m³/s²  "
            f"(agreement: {100.0 - kepler_match_pct:.2f} %)"
        )

        # ── Kepler's 3rd Law verification table ──────────────────────────────

        with st.expander("Kepler's 3rd Law Check", expanded=False):
            _rows = []
            for _planet, _r_au, _T_meas in KEPLER_PLANETS:
                _T_pred = _r_au ** 1.5
                _err_pct = abs(_T_pred - _T_meas) / _T_meas * 100.0
                _rows.append(
                    {
                        "Planet": _planet,
                        "r (AU)": round(_r_au, 3),
                        "T measured (years)": round(_T_meas, 3),
                        "T predicted = r^1.5 (years)": round(_T_pred, 3),
                        "Error": f"{_err_pct:.2f}%",
                    }
                )
            st.dataframe(pd.DataFrame(_rows), use_container_width=True, hide_index=True)
            st.caption(
                "Kepler's 3rd Law: T² = r³ (when T in years, r in AU). "
                "This follows from F_grav = F_centripetal."
            )

        # ── Advanced: two-body plot ───────────────────────────────────────────

        if mode == "Advanced" and enable_two_body:
            st.markdown("---")
            st.markdown("#### Two-Body System")

            xcm_offset_au = abs(m_planet * r0 / (M + m_planet)) / AU
            st.caption(
                f"Centre of mass is {xcm_offset_au:.4f} AU from the star. "
                f"(Both bodies orbit this fixed point.)"
            )

            with st.spinner("Computing two-body orbit…"):
                t2_arr, y2_arr = integrate_two_body(
                    M=M,
                    m=m_planet,
                    r0=r0,
                    v0_ratio=v_ratio,
                )

            fig_two = build_two_body_fig(t2_arr, y2_arr, M, m_planet)
            st.plotly_chart(fig_two, use_container_width=True)

            # Centre-of-mass verification
            x1 = y2_arr[:, 0]
            ypos1 = y2_arr[:, 1]
            x2 = y2_arr[:, 4]
            ypos2 = y2_arr[:, 5]
            M_tot = M + m_planet
            xcm_t = (M * x1 + m_planet * x2) / M_tot
            ycm_t = (M * ypos1 + m_planet * ypos2) / M_tot
            cm_drift_au = np.max(np.sqrt(
                (xcm_t - xcm_t[0]) ** 2 + (ycm_t - ycm_t[0]) ** 2
            )) / AU
            st.caption(
                f"Centre-of-mass drift: {cm_drift_au:.2e} AU "
                f"(should be ≈ 0 — conservation of momentum check)"
            )

        # ── Advanced: galaxy rotation curve ──────────────────────────────────

        if mode == "Advanced" and enable_rotation_curve:
            st.markdown("---")
            st.markdown("#### Galaxy Rotation Curve")

            fig_rot = build_rotation_curve_fig(M, v_dm_kms)
            st.plotly_chart(fig_rot, use_container_width=True)

            st.info(
                "The flat rotation curve cannot be explained by visible matter alone — "
                "evidence for **dark matter** (spec ref: Component 2, Topic 8(e)). "
                "Keplerian motion predicts $v \\propto r^{-1/2}$ (falling curve), but "
                "observations show $v \\approx$ const out to very large radii, implying "
                "a diffuse dark-matter halo with $M(r) \\propto r$."
            )

        # ── Physics notes ─────────────────────────────────────────────────────

        physics_notes(
            spec_ref=SPEC_REF,
            equations=EQUATIONS,
            explanation=EXPLANATION,
            advanced_text=ADVANCED_TEXT,
            mode=mode,
        )


def render_binary_stars_tab(mode: str) -> None:
    """Render the Binary Stars tab content."""

    _BS_SPEC_REF = "Component 3, Topic 11 (Astrophysics) — binary star systems"
    _BS_EQUATIONS = [
        r"T^2 = \frac{4\pi^2 d^3}{G(M_1+M_2)}",
        r"r_1 = \frac{M_2 d}{M_1 + M_2},\quad r_2 = \frac{M_1 d}{M_1 + M_2}",
        r"v_1 = \omega r_1,\quad v_2 = \omega r_2",
    ]

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        # ── Preset selector ───────────────────────────────────────────────────
        bs_preset_choice = st.selectbox(
            "Real-world preset",
            options=list(BINARY_PRESETS.keys()),
            index=0,
            key="bs_preset",
            help="Select a real binary system or choose Custom.",
        )

        bs_preset = BINARY_PRESETS[bs_preset_choice]

        # Resolve defaults from preset
        _def_M1 = bs_preset["M1_sol"] if bs_preset else 2.0
        _def_M2 = bs_preset["M2_sol"] if bs_preset else 1.0
        _def_d  = bs_preset["d_AU"]   if bs_preset else 1.0

        # ── Sliders ───────────────────────────────────────────────────────────
        M1_sol = st.slider(
            "M₁ (solar masses)",
            min_value=0.1,
            max_value=30.0,
            value=float(np.clip(_def_M1, 0.1, 30.0)),
            step=0.1,
            key="bs_M1",
            help="Mass of star 1 in solar masses.",
            disabled=(bs_preset_choice != "Custom"),
        )
        M2_sol = st.slider(
            "M₂ (solar masses)",
            min_value=0.1,
            max_value=30.0,
            value=float(np.clip(_def_M2, 0.1, 30.0)),
            step=0.1,
            key="bs_M2",
            help="Mass of star 2 in solar masses.",
            disabled=(bs_preset_choice != "Custom"),
        )
        d_AU = st.slider(
            "Separation d (AU)",
            min_value=0.01,
            max_value=10.0,
            value=float(np.clip(_def_d, 0.01, 10.0)),
            step=0.01,
            key="bs_d",
            help="Orbital separation between the two stars.",
            disabled=(bs_preset_choice != "Custom"),
        )
        phi_deg = st.slider(
            "Phase angle φ (°)",
            min_value=0,
            max_value=360,
            value=0,
            step=1,
            key="bs_phi",
            help="Current orbital phase angle.",
        )
        show_trail = st.checkbox(
            "Show trail (last 180°)",
            value=False,
            key="bs_trail",
            help="Draw a faded arc showing the recent orbital path.",
        )

        # Show preset note
        if bs_preset and bs_preset.get("note"):
            st.info(bs_preset["note"])

        # ── Advanced: inclination slider ──────────────────────────────────────
        incl_deg: float = 60.0
        if mode == "Advanced":
            advanced_divider()
            incl_deg = float(
                st.slider(
                    "Inclination i (°)",
                    min_value=0,
                    max_value=90,
                    value=60,
                    step=1,
                    key="bs_incl",
                    help=(
                        "Angle between the orbital plane and the line of sight. "
                        "i=90° is edge-on (maximum Doppler signal); i=0° is face-on "
                        "(zero radial velocity)."
                    ),
                )
            )

    # ── Compute physics ────────────────────────────────────────────────────────
    M1 = M1_sol * SOLAR_MASS
    M2 = M2_sol * SOLAR_MASS
    d  = d_AU * AU

    params = binary_star_params(M1, M2, d)
    T_s  = params["T"]
    r1_m = params["r1"]
    r2_m = params["r2"]
    v1   = params["v1"]
    v2   = params["v2"]

    with right_col:
        # ── Metrics ───────────────────────────────────────────────────────────
        metric_row(
            {
                "Period T":         format_period_bs(T_s),
                "r₁ (AU)":          f"{r1_m / AU:.4f}",
                "r₂ (AU)":          f"{r2_m / AU:.4f}",
                "v₁ (km/s)":        f"{v1 / 1000.0:.3f}",
                "v₂ (km/s)":        f"{v2 / 1000.0:.3f}",
                "CoM from M₁ (AU)": f"{params['x_cm'] / AU:.4f}",
            }
        )

        # ── Orbital diagram ───────────────────────────────────────────────────
        fig_orbit = build_binary_orbit_fig(M1, M2, d, phi_deg, show_trail)
        st.plotly_chart(fig_orbit, use_container_width=True)

        # ── Radial velocity curves (Advanced) ─────────────────────────────────
        if mode == "Advanced":
            fig_rv = build_radial_velocity_fig(v1, v2, incl_deg)
            st.plotly_chart(fig_rv, use_container_width=True)
            st.caption(
                "Astronomers detect binary stars from this anti-correlated Doppler "
                "wobble — even when the stars can't be resolved visually."
            )

        # ── Context info ──────────────────────────────────────────────────────
        st.info(
            "Most stars in the Milky Way are in binary or multiple systems — our Sun "
            "is unusual in being solitary. Binary stars are crucial for measuring "
            "stellar masses: Newton's form of Kepler's 3rd Law gives M₁+M₂ from "
            "d and T."
        )

        if mode == "Advanced":
            st.info(
                "Close binary stars emit gravitational waves, slowly losing energy. "
                "The first indirect evidence for gravitational waves came from the "
                "Hulse-Taylor binary pulsar (1974), which earned the 1993 Nobel Prize "
                "— the orbital period shortens at exactly the rate predicted by GR."
            )

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=_BS_SPEC_REF,
            equations=_BS_EQUATIONS,
            explanation=(
                "Two stars of masses M₁ and M₂ orbit their common centre of mass "
                "(barycentre). The barycentre divides the separation d in the "
                "inverse ratio of the masses. Both stars share the same angular "
                "velocity ω and period T, but their orbital radii and speeds differ. "
                "Spectroscopic binaries are identified by the periodic Doppler shift "
                "of their spectral lines — the radial velocity curves are exactly "
                "anti-correlated, providing M₁+M₂ via Kepler's Third Law."
            ),
            advanced_text=(
                "**Radial velocity method:** Observers measure the line-of-sight "
                "component of each star's velocity, $v_r = v\\sin i\\cos\\phi$. "
                "The semi-amplitudes K₁ and K₂ give the mass ratio: "
                "$M_1/M_2 = K_2/K_1$. Combined with Kepler's Third Law this yields "
                "individual masses (if i is known from eclipses or astrometry).\n\n"
                "**Gravitational waves:** Inspiralling binaries lose orbital energy "
                "to gravitational radiation at a rate predicted by GR. The "
                "Hulse-Taylor pulsar (PSR B1913+16) loses energy at exactly the "
                "predicted rate, providing indirect proof of gravitational waves "
                "16 years before LIGO's direct detection in 2015."
            ),
            mode=mode,
        )


def main() -> None:
    """Render the full Orbital Motion simulation page."""

    sim_header("Orbital Motion", SPEC_REF)

    mode = mode_toggle()

    tab_orbital, tab_binary = st.tabs(["Orbital Mechanics", "Binary Stars"])

    with tab_orbital:
        render_orbital_mechanics_tab(mode)

    with tab_binary:
        render_binary_stars_tab(mode)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
