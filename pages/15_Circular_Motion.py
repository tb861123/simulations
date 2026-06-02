"""
Circular Motion — WJEC Eduqas A Level Physics
Component 1, Topic 3 (Circular Motion), sections (a)–(k)

Covers:
  Basic  : centripetal acceleration / force, period, frequency, speed;
           banked tracks (ideal banking angle, friction limits);
           vertical circles (loop-the-loop, tension, slack condition).
  Advanced: non-inertial reference frames, pseudo-forces, Coriolis effect,
            geosynchronous orbit derivation.
"""

from __future__ import annotations

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

from utils.physics import g, G
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
    page_title="Circular Motion — WJEC Physics",
    page_icon="⭕",
    layout="wide",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 3 (Circular Motion), sections (a)–(k)"

MU_FRICTION: float = 0.7   # typical tyre-road friction coefficient

PRESETS: dict[str, dict | None] = {
    "Custom": None,
    "Washing machine spin (1400 rpm)": {
        "r": 0.25,
        "omega": 146.6,
        "m": 5.0,
        "note": (
            "A washing machine drum at 1400 rpm creates ~580g centripetal "
            "acceleration on wet clothes, squeezing water out through pores."
        ),
    },
    "Fairground roundabout": {
        "r": 5.0,
        "omega": 1.0,
        "m": 70.0,
        "note": (
            "A typical roundabout creates ~0.5g — comfortable for most people. "
            "Above ~1g, riders feel pressed outward strongly."
        ),
    },
    "Car on roundabout (30 mph)": {
        "r": 30.0,
        "omega": 0.447,
        "m": 1500.0,
        "note": (
            "At 30 mph on a 30 m radius roundabout, the required centripetal "
            "force is ~10 kN — provided by tyre friction. This is why cars "
            "skid on sharp bends."
        ),
    },
    "Electron in magnetic field (B=0.01T)": {
        "r": 0.057,
        "omega": 1.76e9,
        "m": 9.109e-31,
        "note": (
            "Electrons spiral in magnetic fields — used in cathode ray tubes, "
            "mass spectrometers, and particle detectors."
        ),
    },
    "Conical pendulum (L=1m, θ=30°)": {
        "r": 0.5,
        "omega": 4.43,
        "m": 0.5,
        "note": (
            "A conical pendulum rotates in a horizontal circle. The tension "
            "provides both support and centripetal force."
        ),
    },
}

# ── Physics helpers ───────────────────────────────────────────────────────────


@st.cache_data(show_spinner=False)
def compute_circular_basics(
    r: float, omega: float, m: float
) -> dict[str, float]:
    """
    Compute fundamental circular-motion quantities.

    Parameters
    ----------
    r     : radius (m)
    omega : angular velocity (rad/s)
    m     : mass (kg)

    Returns
    -------
    dict with keys: v, a_cent, F_cent, T_period, freq
    """
    v = omega * r
    a_cent = omega ** 2 * r
    F_cent = m * omega ** 2 * r
    T_period = 2.0 * np.pi / omega
    freq = 1.0 / T_period
    return {
        "v": v,
        "a_cent": a_cent,
        "F_cent": F_cent,
        "T_period": T_period,
        "freq": freq,
    }


@st.cache_data(show_spinner=False)
def compute_banking(
    r: float, v: float, theta_deg: float, m: float, mu: float = MU_FRICTION
) -> dict[str, float]:
    """
    Compute banked-track quantities.

    Parameters
    ----------
    r         : turn radius (m)
    v         : car speed (m/s)
    theta_deg : actual bank angle (degrees)
    m         : vehicle mass (kg)
    mu        : tyre friction coefficient

    Returns
    -------
    dict with keys: theta_ideal_deg, v_max, v_min, N
    """
    theta_rad = np.radians(theta_deg)
    theta_ideal_rad = np.arctan(v ** 2 / (r * g))
    theta_ideal_deg = float(np.degrees(theta_ideal_rad))

    # Normal force at speed v on bank angle theta
    # Resolve: N cos(theta) = mg  → N = mg / cos(theta)
    cos_t = np.cos(theta_rad)
    cos_t = max(cos_t, 1e-6)
    N = m * g / cos_t

    # Max speed (no outward slide): v_max² = rg(tan θ + μ)/(1 − μ tan θ)
    tan_t = np.tan(theta_rad)
    denom_max = 1.0 - mu * tan_t
    if denom_max <= 0:
        v_max = float("inf")
    else:
        v_max = float(np.sqrt(r * g * (tan_t + mu) / denom_max))

    # Min speed (no inward slide): v_min² = rg(tan θ − μ)/(1 + μ tan θ)
    denom_min = 1.0 + mu * tan_t
    inner = r * g * (tan_t - mu) / denom_min
    v_min = float(np.sqrt(max(0.0, inner)))

    return {
        "theta_ideal_deg": theta_ideal_deg,
        "v_max": v_max,
        "v_min": v_min,
        "N": N,
    }


@st.cache_data(show_spinner=False)
def compute_vertical_circle(
    r: float, v_bottom: float, m: float
) -> dict[str, float]:
    """
    Compute vertical-circle (loop-the-loop) quantities.

    Parameters
    ----------
    r        : loop radius (m)
    v_bottom : speed at bottom of loop (m/s)
    m        : mass (kg)

    Returns
    -------
    dict with keys: v_top, T_top, T_bottom, v_bottom_min, theta_leave_deg,
                    completes_loop
    """
    # Minimum speed at top for T = 0: v_top_min = sqrt(g*r)
    v_top_min = float(np.sqrt(g * r))
    # Minimum speed at bottom (energy conservation from top with v_top = v_top_min)
    # v_bottom_min² = v_top_min² + 2g(2r) = 5gr
    v_bottom_min = float(np.sqrt(5.0 * g * r))

    # Speed at top via energy conservation: h = 2r
    v_top_sq = v_bottom ** 2 - 2.0 * g * 2.0 * r
    v_top = float(np.sqrt(max(0.0, v_top_sq)))

    # Tension at top: T = mv_top²/r - mg  (centripetal toward centre = down)
    T_top = m * v_top ** 2 / r - m * g if v_top_sq > 0 else -m * g

    # Tension at bottom: T = mv_bottom²/r + mg
    T_bottom = m * v_bottom ** 2 / r + m * g

    # Angle at which string goes slack (T = 0):
    # Energy: v(θ)² = v_bottom² - 2g*r*(1 - cos θ)  [θ from bottom]
    # T = mv²/r + mg*cos(θ - π) = mv²/r - mg*cos(φ) where φ = π - θ from top
    # At slack: 0 = mv²/r - mg*cos(φ) → v² = gr*cos(φ)
    # Combined with energy: gr*cos(φ) = v_bottom² - 2g*r*(1 - cos(θ))
    # Using θ_from_bottom and cos(angle from top) = -cos(θ_from_bottom):
    # For angle φ measured from the vertical (top = 0):
    #   v(φ)² = v_bottom² - 2gr(1 + cos φ)   [h = r + r*cos φ above bottom]
    #   T = mv²/r - mg cos φ = 0  → v² = gr cos φ
    #   gr cos φ = v_bottom² - 2gr(1 + cos φ)
    #   gr cos φ + 2gr cos φ = v_bottom² - 2gr
    #   3gr cos φ = v_bottom² - 2gr
    #   cos φ = (v_bottom² - 2gr) / (3gr)
    cos_phi_slack = (v_bottom ** 2 - 2.0 * g * r) / (3.0 * g * r)
    completes_loop = v_bottom >= v_bottom_min

    if not completes_loop and -1.0 <= cos_phi_slack <= 1.0:
        phi_slack = float(np.degrees(np.arccos(np.clip(cos_phi_slack, -1.0, 1.0))))
        # phi measured from top; convert to angle from bottom for display
        theta_leave_deg = 180.0 - phi_slack
    else:
        theta_leave_deg = float("nan")

    return {
        "v_top": v_top,
        "T_top": T_top,
        "T_bottom": T_bottom,
        "v_bottom_min": v_bottom_min,
        "v_top_min": v_top_min,
        "theta_leave_deg": theta_leave_deg,
        "completes_loop": completes_loop,
    }


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_circular_motion_fig(
    r: float,
    omega: float,
    m: float,
    theta_deg: float,
) -> go.Figure:
    """
    Build the overhead circular-motion diagram.

    Shows circle outline, particle position, velocity vector,
    centripetal acceleration vector, and stroboscope trail.

    Parameters
    ----------
    r         : orbit radius (m)
    omega     : angular velocity (rad/s)
    m         : mass (kg)
    theta_deg : current angular position (degrees)

    Returns
    -------
    Plotly Figure
    """
    theta = np.radians(theta_deg)
    v = omega * r
    a_cent = omega ** 2 * r

    # Circle outline
    phi_arr = np.linspace(0, 2 * np.pi, 360)
    cx = r * np.cos(phi_arr)
    cy = r * np.sin(phi_arr)

    fig = go.Figure()

    # Circle outline (dashed grey)
    fig.add_trace(
        go.Scatter(
            x=cx,
            y=cy,
            mode="lines",
            name="Orbit",
            line=dict(color=COLOURS["grid"], width=1.5, dash="dash"),
            showlegend=True,
        )
    )

    # Stroboscope trail: 8 ghost positions equally spaced
    n_strobe = 8
    for k in range(n_strobe):
        strobe_angle = theta - k * (2 * np.pi / n_strobe)
        sx = r * np.cos(strobe_angle)
        sy = r * np.sin(strobe_angle)
        alpha = 0.15 + 0.65 * (1.0 - k / n_strobe)
        fig.add_trace(
            go.Scatter(
                x=[sx],
                y=[sy],
                mode="markers",
                marker=dict(
                    color=COLOURS["primary"],
                    size=max(4, int(14 * (1.0 - k / n_strobe))),
                    opacity=alpha,
                ),
                showlegend=(k == 0),
                name="Particle trail" if k == 0 else None,
                hoverinfo="skip",
            )
        )

    # Particle position
    px = r * np.cos(theta)
    py = r * np.sin(theta)

    fig.add_trace(
        go.Scatter(
            x=[px],
            y=[py],
            mode="markers",
            name="Particle",
            marker=dict(
                color=COLOURS["primary"],
                size=16,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # Centre
    fig.add_trace(
        go.Scatter(
            x=[0.0],
            y=[0.0],
            mode="markers",
            name="Centre",
            marker=dict(
                color=COLOURS["highlight"],
                size=10,
                symbol="x",
                line=dict(color=COLOURS["highlight"], width=2),
            ),
        )
    )

    # Radius line
    fig.add_trace(
        go.Scatter(
            x=[0.0, px],
            y=[0.0, py],
            mode="lines",
            name="Radius r",
            line=dict(color=COLOURS["text"], width=1, dash="dot"),
        )
    )

    # Velocity vector (tangent: perpendicular to radius, in direction of motion)
    # tangent direction: (-sin θ, cos θ)  for anticlockwise
    v_scale = r * 0.5  # display scale
    vx_dir = -np.sin(theta)
    vy_dir = np.cos(theta)
    v_norm = float(np.sqrt(vx_dir ** 2 + vy_dir ** 2))
    if v_norm > 0:
        vx_dir /= v_norm
        vy_dir /= v_norm
    vx_end = px + vx_dir * v_scale
    vy_end = py + vy_dir * v_scale

    fig.add_annotation(
        x=vx_end, y=vy_end,
        ax=px, ay=py,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True,
        arrowhead=3, arrowsize=1.5, arrowwidth=2,
        arrowcolor=COLOURS["secondary"],
        text="",
    )
    fig.add_trace(
        go.Scatter(
            x=[px, vx_end],
            y=[py, vy_end],
            mode="lines",
            name=f"Velocity v = {v:.2f} m/s",
            line=dict(color=COLOURS["secondary"], width=2),
        )
    )

    # Centripetal acceleration vector (toward centre)
    a_scale = r * 0.45
    ax_dir = -np.cos(theta)   # points inward
    ay_dir = -np.sin(theta)
    ax_end = px + ax_dir * a_scale
    ay_end = py + ay_dir * a_scale

    fig.add_annotation(
        x=ax_end, y=ay_end,
        ax=px, ay=py,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True,
        arrowhead=3, arrowsize=1.5, arrowwidth=2,
        arrowcolor=COLOURS["highlight"],
        text="",
    )
    fig.add_trace(
        go.Scatter(
            x=[px, ax_end],
            y=[py, ay_end],
            mode="lines",
            name=f"Acceleration a = {a_cent:.2f} m/s²",
            line=dict(color=COLOURS["highlight"], width=2),
        )
    )

    # Add vector labels
    fig.add_annotation(
        x=vx_end + vx_dir * r * 0.08,
        y=vy_end + vy_dir * r * 0.08,
        text="<b>v</b>",
        showarrow=False,
        font=dict(color=COLOURS["secondary"], size=14),
        xref="x", yref="y",
    )
    fig.add_annotation(
        x=ax_end + ax_dir * r * 0.08,
        y=ay_end + ay_dir * r * 0.08,
        text="<b>a</b>",
        showarrow=False,
        font=dict(color=COLOURS["highlight"], size=14),
        xref="x", yref="y",
    )

    pad = r * 1.45
    fig.update_layout(
        **plotly_layout(
            height=500,
            title=dict(text="Circular Motion — Overhead View", font=dict(size=14)),
            xaxis=dict(
                title="x (m)",
                range=[-pad, pad],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (m)",
                range=[-pad, pad],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_banking_fig(
    r: float,
    v: float,
    theta_deg: float,
    m: float,
    mu: float = MU_FRICTION,
) -> go.Figure:
    """
    Build the two-panel banked track figure.

    Left: cross-section force diagram.
    Right: v_max and v_min vs bank angle θ with current speed marked.

    Parameters
    ----------
    r         : turn radius (m)
    v         : current speed (m/s)
    theta_deg : actual bank angle (degrees)
    m         : vehicle mass (kg)
    mu        : friction coefficient

    Returns
    -------
    Plotly Figure
    """
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=("Cross-Section: Forces on Banked Road", "Speed Limits vs Bank Angle"),
        column_widths=[0.4, 0.6],
    )
    fig.update_layout(**plotly_layout(height=460))

    # ── Left panel: cross-section force diagram ───────────────────────────────
    theta_rad = np.radians(theta_deg)
    cos_t = np.cos(theta_rad)
    sin_t = np.sin(theta_rad)

    # Road surface: tilted rectangle
    road_w = 2.0
    road_h = 0.15
    # Centre of road at origin, tilted by theta
    road_corners_x = np.array([-road_w, road_w, road_w, -road_w, -road_w])
    road_corners_y = np.array([0.0, 0.0, road_h, road_h, 0.0])
    # Rotate by -theta (road tilted to the right)
    rot_x = road_corners_x * cos_t + road_corners_y * (-sin_t)
    rot_y = road_corners_x * sin_t + road_corners_y * cos_t

    fig.add_trace(
        go.Scatter(
            x=rot_x, y=rot_y,
            mode="lines",
            fill="toself",
            fillcolor=f"rgba(47,79,79,0.6)",
            line=dict(color=COLOURS["grid"], width=1),
            name="Road surface",
            showlegend=False,
        ),
        row=1, col=1,
    )

    # Car body (circle on road surface, left side)
    car_x_road = -road_w * 0.45
    car_y_road = road_h
    # Rotate to road frame
    car_cx = car_x_road * cos_t - car_y_road * sin_t
    car_cy = car_x_road * sin_t + car_y_road * cos_t
    # Draw car as small filled circle
    phi_c = np.linspace(0, 2 * np.pi, 60)
    car_r = 0.22
    car_bx = car_cx + car_r * np.cos(phi_c)
    car_by = car_cy + car_r * np.sin(phi_c)
    fig.add_trace(
        go.Scatter(
            x=car_bx, y=car_by,
            mode="lines",
            fill="toself",
            fillcolor=COLOURS["primary"],
            line=dict(color=COLOURS["primary"], width=1),
            name="Car",
            showlegend=False,
        ),
        row=1, col=1,
    )

    # Forces: scale by road width so arrows are visible
    force_scale = 1.2

    # Weight (mg) — straight down from car centre
    mg_val = m * g
    mg_disp = force_scale
    fig.add_annotation(
        x=car_cx, y=car_cy - mg_disp,
        ax=car_cx, ay=car_cy,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
        arrowcolor=COLOURS["tertiary"],
        text="mg", font=dict(color=COLOURS["tertiary"], size=12),
        row=1, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=[car_cx, car_cx],
            y=[car_cy, car_cy - mg_disp],
            mode="lines",
            line=dict(color=COLOURS["tertiary"], width=2),
            name="Weight mg",
            showlegend=True,
        ),
        row=1, col=1,
    )

    # Normal force (N) — perpendicular to road surface: direction (sin θ, cos θ)
    N_disp = force_scale * 1.1
    N_dx = sin_t * N_disp
    N_dy = cos_t * N_disp
    fig.add_annotation(
        x=car_cx + N_dx, y=car_cy + N_dy,
        ax=car_cx, ay=car_cy,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
        arrowcolor=COLOURS["secondary"],
        text="N", font=dict(color=COLOURS["secondary"], size=12),
        row=1, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=[car_cx, car_cx + N_dx],
            y=[car_cy, car_cy + N_dy],
            mode="lines",
            line=dict(color=COLOURS["secondary"], width=2),
            name="Normal force N",
            showlegend=True,
        ),
        row=1, col=1,
    )

    # Resultant horizontal component of N (centripetal) — dashed
    N_horiz_x = sin_t * N_disp  # horizontal component
    fig.add_trace(
        go.Scatter(
            x=[car_cx, car_cx + N_horiz_x],
            y=[car_cy + N_dy, car_cy + N_dy],
            mode="lines",
            line=dict(color=COLOURS["highlight"], width=1.5, dash="dot"),
            name="N sin θ (centripetal)",
            showlegend=True,
        ),
        row=1, col=1,
    )

    # Angle arc annotation
    arc_r = 0.5
    arc_theta = np.linspace(np.pi / 2, np.pi / 2 + theta_rad, 40)
    fig.add_trace(
        go.Scatter(
            x=arc_r * np.cos(arc_theta),
            y=arc_r * np.sin(arc_theta),
            mode="lines",
            line=dict(color=COLOURS["advanced"], width=1.5),
            name=f"θ = {theta_deg:.1f}°",
            showlegend=True,
        ),
        row=1, col=1,
    )

    fig.update_xaxes(
        title_text="← inner  outer →",
        range=[-3.0, 3.0],
        scaleanchor="y",
        scaleratio=1,
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )
    fig.update_yaxes(
        title_text="Height",
        range=[-2.0, 3.0],
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )

    # ── Right panel: v_max and v_min vs bank angle ────────────────────────────
    theta_arr_deg = np.linspace(0.0, 45.0, 200)
    theta_arr_rad = np.radians(theta_arr_deg)
    tan_arr = np.tan(theta_arr_rad)

    denom_max = 1.0 - mu * tan_arr
    with np.errstate(invalid="ignore", divide="ignore"):
        v_max_arr = np.where(
            denom_max > 0,
            np.sqrt(np.maximum(0, r * g * (tan_arr + mu) / denom_max)),
            np.nan,
        )
        denom_min = 1.0 + mu * tan_arr
        v_min_arr = np.sqrt(np.maximum(0, r * g * (tan_arr - mu) / denom_min))

    fig.add_trace(
        go.Scatter(
            x=theta_arr_deg,
            y=v_max_arr,
            mode="lines",
            name="v_max (friction limit)",
            line=dict(color=COLOURS["secondary"], width=2.5),
        ),
        row=1, col=2,
    )
    fig.add_trace(
        go.Scatter(
            x=theta_arr_deg,
            y=v_min_arr,
            mode="lines",
            name="v_min (friction limit)",
            line=dict(color=COLOURS["tertiary"], width=2.5),
        ),
        row=1, col=2,
    )

    # Ideal banking curve: v_ideal at current speed as vertical line
    theta_ideal_deg = float(np.degrees(np.arctan(v ** 2 / (r * g))))
    fig.add_vline(
        x=theta_ideal_deg,
        line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
        row=1, col=2,
    )
    fig.add_annotation(
        x=theta_ideal_deg,
        y=1.05,
        xref="x2",
        yref="paper",
        text=f"θ_ideal={theta_ideal_deg:.1f}°",
        showarrow=False,
        font=dict(color=COLOURS["advanced"], size=10),
    )

    # Current speed as horizontal dashed line
    fig.add_hline(
        y=v,
        line=dict(color=COLOURS["highlight"], width=1.5, dash="dash"),
        row=1, col=2,
    )
    fig.add_annotation(
        x=42.0,
        y=v,
        xref="x2",
        yref="y2",
        text=f"v={v:.1f} m/s",
        showarrow=False,
        font=dict(color=COLOURS["highlight"], size=10),
        yshift=8,
    )

    # Current bank angle as vertical line
    fig.add_vline(
        x=theta_deg,
        line=dict(color=COLOURS["primary"], width=2, dash="dot"),
        row=1, col=2,
    )
    fig.add_annotation(
        x=theta_deg,
        y=0.95,
        xref="x2",
        yref="paper",
        text=f"θ={theta_deg:.1f}°",
        showarrow=False,
        font=dict(color=COLOURS["primary"], size=10),
    )

    # Safe zone fill between v_min and v_max
    fig.add_traces(
        [
            go.Scatter(
                x=theta_arr_deg,
                y=v_max_arr,
                mode="lines",
                line=dict(color="rgba(0,0,0,0)"),
                showlegend=False,
                hoverinfo="skip",
            ),
            go.Scatter(
                x=theta_arr_deg,
                y=v_min_arr,
                mode="lines",
                fill="tonexty",
                fillcolor="rgba(44,160,44,0.15)",
                line=dict(color="rgba(0,0,0,0)"),
                name="Safe speed range",
                hoverinfo="skip",
            ),
        ]
    )

    fig.update_xaxes(
        title_text="Bank angle θ (°)",
        range=[0, 45],
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=2,
    )
    fig.update_yaxes(
        title_text="Speed (m/s)",
        range=[0, min(120, max(float(np.nanmax(v_max_arr[np.isfinite(v_max_arr)])) * 1.1, v * 1.3, 20))],
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=2,
    )

    return fig


def build_vertical_circle_fig(
    r: float,
    v_bottom: float,
    m: float,
    theta_slider_deg: float,
) -> go.Figure:
    """
    Build the vertical-circle (loop-the-loop) figure.

    Shows the loop coloured green (safe) or red (slack), particle position,
    tension vector, and velocity vector at the slider angle.

    Parameters
    ----------
    r                : loop radius (m)
    v_bottom         : speed at bottom (m/s)
    m                : mass (kg)
    theta_slider_deg : current angle from bottom (degrees)

    Returns
    -------
    Plotly Figure
    """
    res = compute_vertical_circle(r, v_bottom, m)
    v_bottom_min = res["v_bottom_min"]
    completes = res["completes_loop"]

    fig = go.Figure()

    # Centre at (0, r) so bottom is at (0, 0)
    cx, cy = 0.0, r

    # Colour the circle: green where T > 0, red where T < 0
    # T > 0 condition at angle φ from top:
    #   v²(φ) = v_bottom² - 2g(r + r*cos φ) = v_bottom² - 2gr(1 + cos φ)
    #   T = mv²/r - mg cos φ > 0
    #   → v_bottom² - 2gr(1+cos φ) > gr cos φ
    #   → v_bottom² > 2gr + 3gr cos φ
    n_pts = 360
    phi_full = np.linspace(0, 2 * np.pi, n_pts + 1)  # phi from top
    # Position: x = r sin φ, y = r + r cos φ  (centre at r)
    loop_x = r * np.sin(phi_full)
    loop_y = r + r * np.cos(phi_full)

    # Determine T sign at each point
    v_sq = v_bottom ** 2 - 2.0 * g * r * (1 + np.cos(phi_full))
    v_sq_safe = np.maximum(v_sq, 0.0)
    T_sign = v_sq_safe / r - g * np.cos(phi_full)   # proportional to T/m

    # Split into green (T >= 0) and red (T < 0) segments
    green_mask = T_sign >= 0
    red_mask = ~green_mask

    # Draw green segments
    gx = np.where(green_mask, loop_x, np.nan)
    gy = np.where(green_mask, loop_y, np.nan)
    fig.add_trace(
        go.Scatter(
            x=gx, y=gy,
            mode="lines",
            name="Taut (T > 0)",
            line=dict(color=COLOURS["tertiary"], width=3),
        )
    )

    # Draw red segments
    rx_seg = np.where(red_mask, loop_x, np.nan)
    ry_seg = np.where(red_mask, loop_y, np.nan)
    fig.add_trace(
        go.Scatter(
            x=rx_seg, y=ry_seg,
            mode="lines",
            name="Slack (T < 0)",
            line=dict(color=COLOURS["highlight"], width=3),
        )
    )

    # Particle position: theta_slider_deg is from bottom
    # Convert to phi (from top): phi = pi - theta_rad  (theta=0 at bottom → phi=pi)
    theta_rad = np.radians(theta_slider_deg)
    phi_particle = np.pi - theta_rad
    # But we need to handle 0–360 properly:
    # theta: 0 = bottom, 90 = right, 180 = top, 270 = left, 360 = bottom
    # In our convention: x = r sin(phi), y = r + r cos(phi)
    # theta from bottom going counterclockwise:
    #   phi = pi - theta_rad if going counterclockwise from bottom through right to top
    #   Actually: theta_from_bottom, going CCW: phi from top = pi - theta_rad
    #   for theta in [0,360] → phi in [pi, -pi] which wraps
    # Simpler: particle at angle theta (CCW from bottom):
    #   x_p = r * sin(theta)  [right side positive]
    #   y_p = r - r*cos(theta) [= r*(1 - cos theta)]
    x_p = r * np.sin(theta_rad)
    y_p = r * (1.0 - np.cos(theta_rad))

    # Speed at this angle: h = r*(1-cos(theta)) above bottom
    h_p = r * (1.0 - np.cos(theta_rad))
    v_sq_p = v_bottom ** 2 - 2.0 * g * h_p
    v_p = float(np.sqrt(max(0.0, v_sq_p)))

    # Tension: phi from top = pi - theta
    # T = mv²/r + mg*cos(pi - theta) = mv²/r - mg*cos(theta)
    # Wait — need to be careful about sign convention for tension:
    # At bottom (theta=0): centripetal toward centre (upward) = T - mg → T = mv²/r + mg
    # At top (theta=pi): centripetal toward centre (downward) = T + mg → T = mv²/r - mg
    # At arbitrary angle theta from bottom:
    #   component of gravity toward centre = -g*cos(theta)  [negative at bottom: away from centre]
    #   Actually: at theta, the inward radial direction is (-sin theta, cos theta - 1 + 1)...
    #   Let's use: gravity component toward centre = g*cos(theta - pi) = -g*cos(theta) for theta∈[0,2pi]
    #   No, more carefully: at angle θ from bottom (CCW), the position vector from centre is
    #   (sin θ, -cos θ) [pointing from centre to particle].
    #   Inward = -(sin θ, -cos θ) = (-sin θ, cos θ).
    #   Gravity = (0, -g). Component in inward direction = -g*cos θ.
    #   Centripetal equation: T/m + (-g cos θ) = v²/r  [positive T = tension pulling inward]
    #   But for top of loop (θ=π): T/m + g = v²/r → T = m(v²/r - g) ✓
    #   For bottom (θ=0): T/m - g = v²/r → T = m(v²/r + g) ✓
    T_p = m * v_p ** 2 / r + m * (-g * np.cos(theta_rad))

    # Draw particle
    fig.add_trace(
        go.Scatter(
            x=[x_p], y=[y_p],
            mode="markers",
            name="Particle",
            marker=dict(
                color=COLOURS["primary"],
                size=16,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1.5),
            ),
        )
    )

    # Velocity vector (tangential: CCW → direction (cos θ, sin θ))
    v_scale = r * 0.45
    vx_dir = np.cos(theta_rad)
    vy_dir = np.sin(theta_rad)
    if v_p > 0:
        vx_end = x_p + vx_dir * v_scale * min(1.0, v_p / max(v_bottom, 1e-6))
        vy_end = y_p + vy_dir * v_scale * min(1.0, v_p / max(v_bottom, 1e-6))
        fig.add_annotation(
            x=vx_end, y=vy_end,
            ax=x_p, ay=y_p,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=3, arrowsize=1.5, arrowwidth=2,
            arrowcolor=COLOURS["secondary"],
            text="",
        )
        fig.add_trace(
            go.Scatter(
                x=[x_p, vx_end], y=[y_p, vy_end],
                mode="lines",
                name=f"v = {v_p:.2f} m/s",
                line=dict(color=COLOURS["secondary"], width=2),
            )
        )

    # Tension vector (toward centre if T > 0)
    if T_p > 0:
        # Inward direction from particle: (-sin θ, cos θ) ... but wait:
        # Centre is at (0, r). Particle at (r sin θ, r(1-cos θ)).
        # Vector from particle to centre = (0 - r sin θ, r - r(1-cos θ)) = (-r sin θ, r cos θ)
        # Normalised: (-sin θ, cos θ)
        T_dir_x = -np.sin(theta_rad)
        T_dir_y = np.cos(theta_rad)
        T_scale = r * 0.4 * min(1.5, T_p / max(m * g, 1e-10))
        Tx_end = x_p + T_dir_x * T_scale
        Ty_end = y_p + T_dir_y * T_scale
        fig.add_annotation(
            x=Tx_end, y=Ty_end,
            ax=x_p, ay=y_p,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=3, arrowsize=1.5, arrowwidth=2,
            arrowcolor=COLOURS["quaternary"],
            text="",
        )
        fig.add_trace(
            go.Scatter(
                x=[x_p, Tx_end], y=[y_p, Ty_end],
                mode="lines",
                name=f"Tension T = {T_p:.1f} N",
                line=dict(color=COLOURS["quaternary"], width=2),
            )
        )

    # Weight vector (downward)
    mg_scale = r * 0.35
    fig.add_annotation(
        x=x_p, y=y_p - mg_scale,
        ax=x_p, ay=y_p,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
        arrowcolor=COLOURS["tertiary"],
        text="",
    )
    fig.add_trace(
        go.Scatter(
            x=[x_p, x_p], y=[y_p, y_p - mg_scale],
            mode="lines",
            name="Weight mg",
            line=dict(color=COLOURS["tertiary"], width=2),
        )
    )

    # Centre of loop marker
    fig.add_trace(
        go.Scatter(
            x=[cx], y=[cy],
            mode="markers",
            name="Loop centre",
            marker=dict(color=COLOURS["text"], size=6, symbol="cross"),
            showlegend=False,
        )
    )

    # Ground line
    pad = r * 1.6
    fig.add_hline(y=0, line=dict(color=COLOURS["grid"], width=1.5, dash="dot"))

    fig.update_layout(
        **plotly_layout(
            height=520,
            title=dict(text="Vertical Circle (Loop the Loop)", font=dict(size=14)),
            xaxis=dict(
                title="x (m)",
                range=[-pad, pad],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (m)",
                range=[-r * 0.4, r * 2.6],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_vert_tension_fig(
    r: float,
    v_bottom: float,
    m: float,
) -> go.Figure:
    """
    Build tension-vs-angle and speed-vs-angle figure for vertical circles.

    Parameters
    ----------
    r        : loop radius (m)
    v_bottom : speed at bottom (m/s)
    m        : mass (kg)

    Returns
    -------
    Plotly Figure
    """
    theta_arr = np.linspace(0, 2 * np.pi, 360)
    h_arr = r * (1.0 - np.cos(theta_arr))
    v_sq_arr = v_bottom ** 2 - 2.0 * g * h_arr
    v_arr = np.sqrt(np.maximum(0.0, v_sq_arr))
    # T = mv²/r - mg cos θ
    T_arr = m * v_arr ** 2 / r - m * g * np.cos(theta_arr)

    theta_deg_arr = np.degrees(theta_arr)

    fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=("Tension T vs angle θ from bottom", "Speed v vs angle θ from bottom"),
        vertical_spacing=0.14,
    )
    fig.update_layout(**plotly_layout(height=420))

    # Tension
    # Colour coding: positive green, negative red
    T_pos = np.where(T_arr >= 0, T_arr, np.nan)
    T_neg = np.where(T_arr < 0, T_arr, np.nan)

    fig.add_trace(
        go.Scatter(
            x=theta_deg_arr, y=T_pos,
            mode="lines",
            name="T > 0 (taut)",
            line=dict(color=COLOURS["tertiary"], width=2),
        ),
        row=1, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=theta_deg_arr, y=T_neg,
            mode="lines",
            name="T < 0 (slack)",
            line=dict(color=COLOURS["highlight"], width=2),
        ),
        row=1, col=1,
    )
    fig.add_hline(y=0, line=dict(color=COLOURS["text"], width=1, dash="dot"), row=1, col=1)

    # Annotations at key points
    T_bottom = m * v_bottom ** 2 / r + m * g
    v_top_sq = max(0.0, v_bottom ** 2 - 4.0 * g * r)
    T_top = m * v_top_sq / r - m * g
    fig.add_annotation(
        x=0, y=T_bottom,
        text=f"T_bottom={T_bottom:.0f} N",
        showarrow=True, arrowhead=2,
        font=dict(color=COLOURS["secondary"], size=10),
        row=1, col=1,
        xref="x", yref="y",
        ax=40, ay=-20,
    )
    fig.add_annotation(
        x=180, y=T_top,
        text=f"T_top={T_top:.0f} N",
        showarrow=True, arrowhead=2,
        font=dict(color=COLOURS["secondary"], size=10),
        row=1, col=1,
        xref="x", yref="y",
        ax=40, ay=20,
    )

    fig.update_xaxes(
        title_text="θ from bottom (°)",
        tickvals=[0, 90, 180, 270, 360],
        ticktext=["0° (bottom)", "90°", "180° (top)", "270°", "360°"],
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )
    fig.update_yaxes(
        title_text="Tension T (N)",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )

    # Speed
    fig.add_trace(
        go.Scatter(
            x=theta_deg_arr, y=v_arr,
            mode="lines",
            name="Speed v",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        row=2, col=1,
    )
    fig.add_hline(
        y=float(np.sqrt(g * r)),
        line=dict(color=COLOURS["highlight"], width=1.5, dash="dash"),
        row=2, col=1,
    )
    fig.add_annotation(
        x=190, y=float(np.sqrt(g * r)),
        text=f"v_min_top={np.sqrt(g*r):.2f} m/s",
        showarrow=False,
        font=dict(color=COLOURS["highlight"], size=9),
        xref="x2", yref="y2",
        yshift=8,
    )

    fig.update_xaxes(
        title_text="θ from bottom (°)",
        tickvals=[0, 90, 180, 270, 360],
        ticktext=["0° (bottom)", "90°", "180° (top)", "270°", "360°"],
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=2, col=1,
    )
    fig.update_yaxes(
        title_text="Speed (m/s)",
        rangemode="tozero",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=2, col=1,
    )

    return fig


# ── Physics notes content ─────────────────────────────────────────────────────

EQUATIONS = [
    r"v = \omega r",
    r"a = \frac{v^2}{r} = \omega^2 r",
    r"F = \frac{mv^2}{r} = m\omega^2 r",
    r"T = \frac{2\pi}{\omega},\quad f = \frac{1}{T}",
    r"\tan\theta = \frac{v^2}{rg} \quad \text{(ideal banking)}",
    r"v_{\min,\text{top}} = \sqrt{gR} \quad \text{(loop-the-loop)}",
    r"v_{\min,\text{bottom}} = \sqrt{5gR} \quad \text{(loop-the-loop)}",
]

EXPLANATION = (
    "**Circular motion** requires a constant **centripetal force** directed "
    "toward the centre of the circle. This is not a new type of force — it is "
    "the *resultant* of existing forces (tension, normal force, gravity, friction) "
    "that happens to point inward.\n\n"
    "**Centripetal acceleration** $a = v^2/r = \\omega^2 r$ always points toward "
    "the centre. By Newton's Second Law, the net inward force must equal $ma$.\n\n"
    "**Banked tracks:** When a road is banked at angle $\\theta$, the horizontal "
    "component of the normal force ($N\\sin\\theta$) provides centripetal force "
    "without needing friction. The ideal angle satisfies $\\tan\\theta = v^2/(rg)$. "
    "With friction $\\mu$, there is a range of safe speeds between $v_{\\min}$ and "
    "$v_{\\max}$.\n\n"
    "**Vertical circles:** As a ball moves through a vertical loop, its speed "
    "decreases going up (KE → PE) and increases coming down (PE → KE). At the top, "
    "both gravity and tension point toward the centre. The string goes slack "
    "($T = 0$) when $v^2 = gr$ at the top, giving the minimum safe speed "
    "$v_{\\min,\\text{bottom}} = \\sqrt{5gR}$ from energy conservation."
)

ADVANCED_TEXT = (
    "**Non-inertial reference frames and pseudo-forces:**\n\n"
    "In a rotating reference frame (e.g. sitting in a spinning car), Newton's "
    "laws appear to be violated — objects seem to be pushed outward by a "
    "'centrifugal force'. This is a *pseudo-force* (fictitious force) that arises "
    "because the frame is accelerating. It has magnitude $m\\omega^2 r$ outward, "
    "equal and opposite to the centripetal force in the inertial frame.\n\n"
    "**Coriolis effect:** A second pseudo-force in rotating frames. Any object "
    "moving within a rotating frame experiences a sideways deflection "
    "$\\mathbf{F}_{\\text{Cor}} = -2m\\boldsymbol{\\omega} \\times \\mathbf{v}$. "
    "On Earth this deflects winds and ocean currents — clockwise in the Northern "
    "Hemisphere, anticlockwise in the Southern. The Coriolis acceleration at the "
    "equator is $\\approx 1.5 \\times 10^{-4}\\, v$ m/s² — negligible for everyday "
    "motion but important at planetary scales.\n\n"
    "**Geosynchronous orbit derivation:**\n"
    "Set gravitational force equal to centripetal force with $T = 24\\text{ hr}$:\n"
    "$\\frac{GMm}{r^2} = m\\omega^2 r$ and $\\omega = 2\\pi/T$\n"
    "$\\Rightarrow r^3 = \\frac{GMT^2}{4\\pi^2}$\n"
    "$\\Rightarrow r = \\left(\\frac{GMT^2}{4\\pi^2}\\right)^{1/3} \\approx 42{,}164\\text{ km}$\n"
    "(altitude $\\approx 35{,}786$ km above Earth's surface).\n\n"
    "This is exactly the same derivation as Kepler's Third Law applied to Earth."
)

# ── Main page ─────────────────────────────────────────────────────────────────


def main() -> None:
    """Render the full Circular Motion simulation page."""

    sim_header("Circular Motion", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ── Left column: controls ─────────────────────────────────────────────────

    with left_col:
        mode = mode_toggle()

        tab_names = ["Circular Motion", "Banked Tracks", "Vertical Circles"]
        ctrl_tab1, ctrl_tab2, ctrl_tab3 = st.tabs(tab_names)

        # ── Tab 1 controls: Circular Motion Fundamentals ──────────────────────
        with ctrl_tab1:
            st.subheader("Parameters")

            preset_choice = st.selectbox(
                "Real-world preset",
                options=list(PRESETS.keys()),
                index=0,
                key="cm_preset",
                help="Select a real-world example or choose Custom.",
            )
            preset_data = PRESETS[preset_choice]

            _r_default = float(preset_data["r"]) if preset_data else 5.0
            _omega_default = float(preset_data["omega"]) if preset_data else 2.0
            _m_default = float(preset_data["m"]) if preset_data else 1.0

            # Clamp preset values to slider ranges for display
            _r_disp = float(np.clip(_r_default, 0.1, 20.0))
            _omega_disp = float(np.clip(_omega_default, 0.1, 10.0))
            _m_disp = float(np.clip(_m_default, 0.1, 10.0))

            r_cm = st.slider(
                "Radius r (m)",
                min_value=0.1,
                max_value=20.0,
                value=_r_disp,
                step=0.1,
                key="cm_r",
                disabled=(preset_data is not None),
                help="Radius of the circular orbit.",
            )
            r_cm = _r_default if preset_data else r_cm

            omega_cm = st.slider(
                "Angular velocity ω (rad/s)",
                min_value=0.1,
                max_value=10.0,
                value=_omega_disp,
                step=0.1,
                key="cm_omega",
                disabled=(preset_data is not None),
                help="Angular velocity in radians per second.",
            )
            omega_cm = _omega_default if preset_data else omega_cm

            m_cm = st.slider(
                "Mass m (kg)",
                min_value=0.1,
                max_value=10.0,
                value=_m_disp,
                step=0.1,
                key="cm_m",
                disabled=(preset_data is not None),
                help="Mass of the rotating object.",
            )
            m_cm = _m_default if preset_data else m_cm

            st.divider()
            theta_cm_deg = st.slider(
                "Position angle θ (°)",
                min_value=0,
                max_value=360,
                value=45,
                step=5,
                key="cm_theta",
                help="Angular position of the particle on the circle.",
            )

            if mode == "Advanced":
                advanced_divider()
                st.caption(
                    "In the rotating frame, you would experience an apparent "
                    "'centrifugal acceleration' of "
                    f"{omega_cm**2 * r_cm:.2f} m/s² outward."
                )
                st.caption(
                    "This is a pseudo-force: real only in the rotating frame. "
                    "The inertial frame has only centripetal (inward) force."
                )

        # ── Tab 2 controls: Banked Tracks ─────────────────────────────────────
        with ctrl_tab2:
            st.subheader("Track Parameters")

            r_bank = float(
                st.slider(
                    "Turn radius r (m)",
                    min_value=50,
                    max_value=1000,
                    value=200,
                    step=10,
                    key="bank_r",
                    help="Radius of curvature of the banked turn.",
                )
            )
            v_bank = float(
                st.slider(
                    "Speed v (m/s)",
                    min_value=5,
                    max_value=100,
                    value=30,
                    step=1,
                    key="bank_v",
                    help="Speed of the vehicle.",
                )
            )
            theta_bank = float(
                st.slider(
                    "Bank angle θ (°)",
                    min_value=0.0,
                    max_value=45.0,
                    value=12.0,
                    step=0.5,
                    key="bank_theta",
                    help="Angle of road banking from horizontal.",
                )
            )
            m_bank = float(
                st.slider(
                    "Vehicle mass m (kg)",
                    min_value=500,
                    max_value=5000,
                    value=1500,
                    step=100,
                    key="bank_m",
                    help="Mass of the vehicle.",
                )
            )

            st.divider()
            st.caption("**Real-world examples:**")
            st.caption("- Nürburgring banking: ~12°")
            st.caption("- F1 Monaco: 0° (flat)")
            st.caption("- NASCAR Talladega Superspeedway: 33°")
            st.caption("- M25 motorway slip roads: ~3–5°")

            if mode == "Advanced":
                advanced_divider()
                mu_adv = float(
                    st.slider(
                        "Friction coefficient μ",
                        min_value=0.1,
                        max_value=1.2,
                        value=0.7,
                        step=0.05,
                        key="bank_mu",
                        help="Tyre-road friction coefficient. Dry tarmac ≈ 0.7–0.9.",
                    )
                )
            else:
                mu_adv = MU_FRICTION

        # ── Tab 3 controls: Vertical Circles ──────────────────────────────────
        with ctrl_tab3:
            st.subheader("Loop Parameters")

            r_vc = float(
                st.slider(
                    "Loop radius r (m)",
                    min_value=0.5,
                    max_value=10.0,
                    value=2.0,
                    step=0.1,
                    key="vc_r",
                    help="Radius of the vertical circular loop.",
                )
            )
            v_bot = float(
                st.slider(
                    "Speed at bottom v_bottom (m/s)",
                    min_value=0.0,
                    max_value=30.0,
                    value=10.0,
                    step=0.5,
                    key="vc_vbot",
                    help="Speed of the ball/car at the bottom of the loop.",
                )
            )
            m_vc = float(
                st.slider(
                    "Mass m (kg)",
                    min_value=0.01,
                    max_value=100.0,
                    value=1.0,
                    step=0.1,
                    key="vc_m",
                    help="Mass of the object going around the loop.",
                )
            )

            st.divider()
            theta_vc_deg = float(
                st.slider(
                    "Particle position θ (° from bottom)",
                    min_value=0,
                    max_value=360,
                    value=90,
                    step=5,
                    key="vc_theta",
                    help="Angular position: 0° = bottom, 180° = top.",
                )
            )

            if mode == "Advanced":
                advanced_divider()
                v_min_bottom = float(np.sqrt(5.0 * g * r_vc))
                v_min_top = float(np.sqrt(g * r_vc))
                st.caption(
                    f"**Derivation:** At the top, for T = 0:\n\n"
                    f"$v_{{top,min}} = \\sqrt{{gR}} = {v_min_top:.2f}$ m/s\n\n"
                    f"Energy conservation bottom→top:\n\n"
                    f"$\\frac{{1}}{{2}}mv_b^2 = \\frac{{1}}{{2}}mv_{{top}}^2 + mg(2R)$\n\n"
                    f"$v_{{b,min}} = \\sqrt{{5gR}} = {v_min_bottom:.2f}$ m/s"
                )

    # ── Right column: plots ───────────────────────────────────────────────────

    with right_col:
        plot_tab1, plot_tab2, plot_tab3 = st.tabs(tab_names)

        # ── Tab 1: Circular Motion Fundamentals ───────────────────────────────
        with plot_tab1:
            vals = compute_circular_basics(r_cm, omega_cm, m_cm)
            v_val = vals["v"]
            a_val = vals["a_cent"]
            F_val = vals["F_cent"]
            T_val = vals["T_period"]
            f_val = vals["freq"]

            # Metrics
            metric_row(
                {
                    "Speed v": f"{v_val:.3g} m/s",
                    "Acceleration a": f"{a_val:.3g} m/s²",
                    "Force F": f"{F_val:.3g} N",
                    "Period T": f"{T_val:.3g} s",
                    "Frequency f": f"{f_val:.3g} Hz",
                }
            )

            # Preset info card
            if preset_data is not None:
                st.info(f"**{preset_choice}:** {preset_data['note']}")

            # Warnings
            if a_val > 50.0:
                st.warning(
                    f"Centripetal acceleration exceeds 5g! "
                    f"(a = {a_val:.1f} m/s² = {a_val/g:.1f}g)"
                )

            # Key insight
            st.info(
                "The 'centrifugal force' you feel is NOT a real force — it's your "
                "inertia. Newton's 1st law says you'd travel in a straight line "
                "without the centripetal force pulling you inward."
            )

            # Main plot
            fig_cm = build_circular_motion_fig(r_cm, omega_cm, m_cm, theta_cm_deg)
            st.plotly_chart(fig_cm, use_container_width=True)

            # Additional derived quantities in Advanced mode
            if mode == "Advanced":
                a_in_g = a_val / g
                st.caption(
                    f"Centripetal acceleration: {a_val:.3f} m/s² = **{a_in_g:.3f} g**\n\n"
                    f"Angular momentum: L = mvr = {m_cm * v_val * r_cm:.3g} kg·m²/s\n\n"
                    f"Kinetic energy: KE = ½mv² = {0.5 * m_cm * v_val**2:.3g} J"
                )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 2: Banked Tracks ──────────────────────────────────────────────
        with plot_tab2:
            bank_vals = compute_banking(r_bank, v_bank, theta_bank, m_bank, mu_adv)
            theta_ideal = bank_vals["theta_ideal_deg"]
            v_max_bank = bank_vals["v_max"]
            v_min_bank = bank_vals["v_min"]
            N_bank = bank_vals["N"]

            # Metrics
            v_max_disp = f"{v_max_bank:.1f} m/s" if np.isfinite(v_max_bank) else "No limit"
            metric_row(
                {
                    "Ideal angle θ_ideal": f"{theta_ideal:.1f}°",
                    "v_max (μ=0.7)": v_max_disp,
                    "v_min (μ=0.7)": f"{v_min_bank:.1f} m/s",
                    "Normal force N": f"{N_bank:.0f} N",
                }
            )

            # Status messages
            v_bank_mph = v_bank * 2.237
            if v_bank > v_max_bank:
                st.warning(
                    f"Speed ({v_bank:.1f} m/s = {v_bank_mph:.0f} mph) exceeds "
                    f"maximum safe speed ({v_max_bank:.1f} m/s) — "
                    "vehicle would slide OUTWARD."
                )
            elif v_bank < v_min_bank:
                st.warning(
                    f"Speed ({v_bank:.1f} m/s) is below minimum safe speed "
                    f"({v_min_bank:.1f} m/s) — vehicle would slide INWARD."
                )
            else:
                st.success(
                    f"Speed {v_bank:.1f} m/s is within the safe range "
                    f"[{v_min_bank:.1f}, {v_max_bank:.1f}] m/s for this bank angle."
                )

            if abs(theta_bank - theta_ideal) < 1.0:
                st.info(
                    f"Bank angle {theta_bank:.1f}° is close to the ideal angle "
                    f"{theta_ideal:.1f}° — friction is barely needed at this speed."
                )

            # Main plot
            fig_bank = build_banking_fig(r_bank, v_bank, theta_bank, m_bank, mu_adv)
            st.plotly_chart(fig_bank, use_container_width=True)

            if mode == "Advanced":
                st.caption(
                    f"**N cos θ = mg:** {N_bank * np.cos(np.radians(theta_bank)):.0f} N "
                    f"(should equal mg = {m_bank * g:.0f} N)\n\n"
                    f"**N sin θ = mv²/r:** "
                    f"{N_bank * np.sin(np.radians(theta_bank)):.0f} N "
                    f"(centripetal = {m_bank * v_bank**2 / r_bank:.0f} N)"
                )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 3: Vertical Circles ───────────────────────────────────────────
        with plot_tab3:
            vc_vals = compute_vertical_circle(r_vc, v_bot, m_vc)
            v_top_val = vc_vals["v_top"]
            T_top_val = vc_vals["T_top"]
            T_bottom_val = vc_vals["T_bottom"]
            v_bot_min = vc_vals["v_bottom_min"]
            completes = vc_vals["completes_loop"]
            theta_leave = vc_vals["theta_leave_deg"]

            # Metrics
            metric_row(
                {
                    "v at top": f"{v_top_val:.2f} m/s",
                    "T at top": f"{T_top_val:.1f} N",
                    "T at bottom": f"{T_bottom_val:.1f} N",
                    "Min v_bottom": f"{v_bot_min:.2f} m/s",
                }
            )

            # Status messages
            if completes:
                st.success(
                    f"Loop completed safely! v_bottom = {v_bot:.1f} m/s > "
                    f"v_min = {v_bot_min:.2f} m/s. "
                    f"Tension at top = {T_top_val:.1f} N."
                )
            else:
                if not np.isnan(theta_leave):
                    st.warning(
                        f"Ball will NOT complete the loop — it leaves the track at "
                        f"θ = {theta_leave:.1f}° from the bottom. "
                        f"Need v_bottom ≥ {v_bot_min:.2f} m/s."
                    )
                else:
                    st.warning(
                        f"Ball does not have enough speed to reach the top. "
                        f"Need v_bottom ≥ {v_bot_min:.2f} m/s."
                    )

            # Rollercoaster info
            st.info(
                "Rollercoasters use loops — but modern ones are NOT circular. "
                "They're clothoid (Euler spiral) loops, which are taller-than-wide. "
                "This reduces the extreme G-forces at the bottom while still "
                "maintaining contact at the top."
            )

            # Main loop figure
            fig_vc = build_vertical_circle_fig(r_vc, v_bot, m_vc, theta_vc_deg)
            st.plotly_chart(fig_vc, use_container_width=True)

            # Tension and speed profiles
            fig_vc_profiles = build_vert_tension_fig(r_vc, v_bot, m_vc)
            st.plotly_chart(fig_vc_profiles, use_container_width=True)

            if mode == "Advanced":
                # G-forces at key positions
                g_bottom = T_bottom_val / (m_vc * g)
                g_top = (T_top_val + m_vc * g) / (m_vc * g) if T_top_val > 0 else 0.0
                st.caption(
                    f"**G-force at bottom:** {g_bottom:.2f} g "
                    f"(rider feels {g_bottom:.1f}× their body weight)\n\n"
                    f"**G-force at top:** {g_top:.2f} g\n\n"
                    f"Human blackout threshold ≈ 5–9 g (varies with training). "
                    f"Rollercoaster safety limit ≈ 6 g at bottom."
                )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
