"""
Simple Harmonic Motion simulation for WJEC Eduqas A Level Physics.

Component 1, Topic 6 (Vibrations), sections (a)–(q).

Covers:
  - Pendulum and spring-mass SHM (Basic)
  - Displacement, velocity, and acceleration time-series
  - Phase portrait and energy bar chart
  - Damping regimes: underdamped, critically damped, overdamped (Advanced)
  - Forced oscillation and amplitude–frequency response (Advanced)
  - Large-angle pendulum via RK4 numerical integration (Advanced)
"""

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import g, rk4_integrate
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 6 (Vibrations), sections (a)–(q)"

EQUATIONS = [
    r"x(t) = x_0 \cos(\omega_0 t)",
    r"\omega_0 = \sqrt{\frac{k}{m}} \text{ (spring)}",
    r"\omega_0 = \sqrt{\frac{g}{L}} \text{ (pendulum)}",
    r"T = \frac{2\pi}{\omega_0}",
    r"v = -x_0\omega_0\sin(\omega_0 t)",
    r"a = -\omega_0^2 x",
]

EXPLANATION = (
    "**Simple harmonic motion** occurs when the restoring force is proportional "
    "to — and directed opposite to — the displacement from equilibrium: "
    r"$F = -kx$. "
    "The displacement, velocity, and acceleration are all sinusoidal and 90° "
    "(or 180°) out of phase with each other. Energy is continuously exchanged "
    "between kinetic energy ($\\frac{1}{2}mv^2$) and potential energy "
    "($\\frac{1}{2}kx^2$ for a spring), with total mechanical energy conserved "
    "in the ideal (undamped) case. The phase portrait (v vs x) forms a perfect "
    "ellipse for ideal SHM."
)

ADVANCED_TEXT = (
    "**Damping ratio ζ** controls the energy loss per cycle. "
    "Three regimes exist:\n\n"
    "- **Underdamped (ζ < 1):** oscillation decays exponentially — "
    "amplitude envelope $\\pm x_0 e^{-\\zeta\\omega_0 t}$.\n"
    "- **Critically damped (ζ = 1):** fastest return to equilibrium without "
    "oscillation — ideal for instrument pointers and car shock absorbers.\n"
    "- **Overdamped (ζ > 1):** slow exponential return, no oscillation.\n\n"
    "**Resonance** occurs when the driving frequency equals the natural frequency "
    "($\\omega = \\omega_0$). The steady-state amplitude is "
    "$A = \\frac{x_0}{\\sqrt{(1-(\\omega/\\omega_0)^2)^2 + (2\\zeta\\omega/\\omega_0)^2}}$. "
    "Quality factor $Q = 1/(2\\zeta)$ measures sharpness of resonance.\n\n"
    "**Real examples:** Tacoma Narrows Bridge (1940) — resonance disaster from "
    "wind-induced forced oscillation at the bridge's natural frequency. MRI "
    "scanners — tuned resonance of hydrogen nuclei in a magnetic field. "
    "Car suspension — target near critical damping for comfort and handling.\n\n"
    "**Musical instruments:** A guitar string is a forced oscillating system. "
    "Fret position changes L → changes f. Tighter string increases tension → "
    "increases k → higher f. Heavier string increases m → lower f. The Q factor "
    "of a guitar string determines sustain — classical guitar strings have Q~1000, "
    "giving long sustain."
)

N_POINTS = 1000          # time-series sample count
N_PERIODS = 5            # default periods to display
RK4_DT_FACTOR = 0.002   # dt = RK4_DT_FACTOR * T  (≈ 500 steps/period)
ZETA_CRIT_TOL = 0.02     # |ζ − 1| < this → treat as critically damped
FREQ_RATIO_POINTS = 500  # points for amplitude–frequency response curve

# ── Physics helpers ───────────────────────────────────────────────────────────


def pendulum_params(L: float) -> tuple[float, float, float]:
    """
    Compute natural angular frequency, period, and frequency for a pendulum.

    Parameters
    ----------
    L : pendulum length (m)

    Returns
    -------
    omega0 : natural angular frequency (rad/s)
    T      : period (s)
    f      : frequency (Hz)
    """
    omega0 = np.sqrt(g / L)
    T = 2 * np.pi / omega0
    f = 1.0 / T
    return omega0, T, f


def spring_params(m: float, k: float) -> tuple[float, float, float]:
    """
    Compute natural angular frequency, period, and frequency for a spring-mass.

    Parameters
    ----------
    m : mass (kg)
    k : spring constant (N/m)

    Returns
    -------
    omega0 : natural angular frequency (rad/s)
    T      : period (s)
    f      : frequency (Hz)
    """
    omega0 = np.sqrt(k / m)
    T = 2 * np.pi / omega0
    f = 1.0 / T
    return omega0, T, f


def shm_kinematics(
    t: np.ndarray,
    x0: float,
    omega0: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Analytical SHM displacement, velocity, and acceleration arrays.

    Assumes initial conditions x(0) = x0, v(0) = 0.

    Parameters
    ----------
    t      : time array (s)
    x0     : initial displacement amplitude (m)
    omega0 : natural angular frequency (rad/s)

    Returns
    -------
    x : displacement (m)
    v : velocity (m/s)
    a : acceleration (m/s²)
    """
    x = x0 * np.cos(omega0 * t)
    v = -x0 * omega0 * np.sin(omega0 * t)
    a = -x0 * omega0**2 * np.cos(omega0 * t)
    return x, v, a


def damped_displacement(
    t: np.ndarray,
    x0: float,
    omega0: float,
    zeta: float,
) -> np.ndarray:
    """
    Analytical damped displacement for three regimes.

    Parameters
    ----------
    t      : time array (s)
    x0     : initial displacement (m)
    omega0 : natural angular frequency (rad/s)
    zeta   : damping ratio (dimensionless)

    Returns
    -------
    x_damped : displacement array (m)
    """
    if abs(zeta - 1.0) < ZETA_CRIT_TOL:
        # Critically damped: x = x0 * exp(-omega0 * t) * (1 + omega0 * t)
        return x0 * np.exp(-omega0 * t) * (1.0 + omega0 * t)
    elif zeta < 1.0:
        # Underdamped
        omega_d = omega0 * np.sqrt(1.0 - zeta**2)
        return x0 * np.exp(-zeta * omega0 * t) * np.cos(omega_d * t)
    else:
        # Overdamped
        sqrt_term = np.sqrt(zeta**2 - 1.0)
        r1 = omega0 * (-zeta + sqrt_term)
        r2 = omega0 * (-zeta - sqrt_term)
        # Initial conditions x(0)=x0, v(0)=0  →  A + B = x0,  A*r1 + B*r2 = 0
        A = x0 * r2 / (r2 - r1)
        B = x0 - A
        return A * np.exp(r1 * t) + B * np.exp(r2 * t)


def amplitude_response(
    freq_ratios: np.ndarray,
    zeta: float,
) -> np.ndarray:
    """
    Normalised steady-state amplitude response for a driven damped oscillator.

    A(r) = 1 / sqrt((1 - r²)² + (2ζr)²)  where r = ω/ω₀.

    Parameters
    ----------
    freq_ratios : array of ω/ω₀ values
    zeta        : damping ratio

    Returns
    -------
    A : normalised amplitude (dimensionless)
    """
    r = freq_ratios
    denom = np.sqrt((1.0 - r**2) ** 2 + (2.0 * zeta * r) ** 2)
    # Guard against zero denominator at ζ=0, r=1
    denom = np.where(denom < 1e-12, 1e-12, denom)
    return 1.0 / denom


def pendulum_ode(L: float):
    """
    Return the ODE function for the nonlinear pendulum.

    State vector y = [θ, dθ/dt].

    Parameters
    ----------
    L : pendulum length (m)

    Returns
    -------
    f : callable f(t, y) → dy/dt
    """

    def f(t: float, y: np.ndarray) -> np.ndarray:
        """Nonlinear pendulum ODE: dθ/dt = ω, dω/dt = -(g/L) sin(θ)."""
        theta, omega = y
        return np.array([omega, -(g / L) * np.sin(theta)])

    return f


def energy_at_time(
    t_val: float,
    x0: float,
    omega0: float,
    m: float,
    system: str,
    L: float = 1.0,
) -> tuple[float, float]:
    """
    Compute kinetic and potential energy at a specific time for ideal SHM.

    Parameters
    ----------
    t_val  : time instant (s)
    x0     : initial displacement amplitude (m)
    omega0 : natural angular frequency (rad/s)
    m      : mass (kg)
    system : 'Spring-Mass' or 'Simple Pendulum'
    L      : pendulum length (m), used only for Pendulum

    Returns
    -------
    KE : kinetic energy (J)
    PE : potential energy (J)
    """
    x, v, _ = shm_kinematics(np.array([t_val]), x0, omega0)
    x_val = float(x[0])
    v_val = float(v[0])

    KE = 0.5 * m * v_val**2
    if system == "Spring-Mass":
        k_spring = m * omega0**2
        PE = 0.5 * k_spring * x_val**2
    else:
        # Pendulum: approximate PE = ½ m ω₀² x² (small angle, x = Lθ)
        PE = 0.5 * m * omega0**2 * x_val**2

    return max(KE, 0.0), max(PE, 0.0)


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_time_series_fig(
    t: np.ndarray,
    x: np.ndarray,
    v: np.ndarray,
    a: np.ndarray,
    x_damped: np.ndarray | None = None,
    envelope: np.ndarray | None = None,
    x_rk4: np.ndarray | None = None,
    t_rk4: np.ndarray | None = None,
    system: str = "Spring-Mass",
) -> go.Figure:
    """
    Build the three-row synchronised time-series subplot figure.

    Row 1: displacement x(t)
    Row 2: velocity v(t)
    Row 3: acceleration a(t)

    Optional overlays on Row 1:
      - Damped analytical solution (COLOURS["advanced"])
      - Damping envelope ±x0·exp(-ζω₀t) (COLOURS["highlight"], dashed)
      - RK4 large-angle numerical solution (COLOURS["advanced"])

    Parameters
    ----------
    t        : uniform time array (s)
    x, v, a  : kinematic arrays from shm_kinematics
    x_damped : optional damped displacement array
    envelope : optional envelope array (positive half; negative plotted too)
    x_rk4    : optional RK4 theta*L displacement array
    t_rk4    : optional time array matching x_rk4
    system   : 'Simple Pendulum' or 'Spring-Mass'

    Returns
    -------
    fig : Plotly Figure with 3 rows, shared x-axis
    """
    x_label = "Angular displacement θ (rad)" if system == "Simple Pendulum" else "Displacement x (m)"
    v_label = "Angular velocity (rad/s)" if system == "Simple Pendulum" else "Velocity v (m/s)"
    a_label = "Angular accel (rad/s²)" if system == "Simple Pendulum" else "Acceleration a (m/s²)"

    fig = make_subplots(
        rows=3,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.06,
        subplot_titles=[x_label, v_label, a_label],
    )

    # Row 1 — displacement
    fig.add_trace(
        go.Scatter(
            x=t,
            y=x,
            mode="lines",
            name="x(t) — small angle",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        row=1, col=1,
    )
    if x_rk4 is not None and t_rk4 is not None:
        fig.add_trace(
            go.Scatter(
                x=t_rk4,
                y=x_rk4,
                mode="lines",
                name="x(t) — large angle (RK4)",
                line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
            ),
            row=1, col=1,
        )
    if x_damped is not None:
        fig.add_trace(
            go.Scatter(
                x=t,
                y=x_damped,
                mode="lines",
                name="x(t) — damped",
                line=dict(color=COLOURS["advanced"], width=2),
            ),
            row=1, col=1,
        )
    if envelope is not None:
        fig.add_trace(
            go.Scatter(
                x=t,
                y=envelope,
                mode="lines",
                name="Envelope +",
                line=dict(color=COLOURS["highlight"], width=1, dash="dash"),
                showlegend=True,
            ),
            row=1, col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=t,
                y=-envelope,
                mode="lines",
                name="Envelope −",
                line=dict(color=COLOURS["highlight"], width=1, dash="dash"),
                showlegend=True,
            ),
            row=1, col=1,
        )

    # Row 2 — velocity
    fig.add_trace(
        go.Scatter(
            x=t,
            y=v,
            mode="lines",
            name="v(t)",
            line=dict(color=COLOURS["secondary"], width=2),
        ),
        row=2, col=1,
    )

    # Row 3 — acceleration
    fig.add_trace(
        go.Scatter(
            x=t,
            y=a,
            mode="lines",
            name="a(t)",
            line=dict(color=COLOURS["tertiary"], width=2),
        ),
        row=3, col=1,
    )

    layout = plotly_layout(
        height=600,
        title=dict(text="Kinematics vs Time", font=dict(size=14)),
        showlegend=True,
    )
    # Propagate grid styling to all axes
    axis_style = dict(
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
    )
    layout.update(
        xaxis=axis_style,
        xaxis2=axis_style,
        xaxis3=dict(**axis_style, title="Time t (s)"),
        yaxis=axis_style,
        yaxis2=axis_style,
        yaxis3=axis_style,
    )
    fig.update_layout(**layout)
    return fig


def build_phase_portrait(
    x: np.ndarray,
    v: np.ndarray,
    x_damped: np.ndarray | None = None,
    v_damped: np.ndarray | None = None,
) -> go.Figure:
    """
    Build a phase portrait (v vs x) Plotly figure.

    For ideal SHM this is an ellipse. Damped trajectories spiral inward.

    Parameters
    ----------
    x, v          : ideal SHM arrays
    x_damped      : optional damped displacement array
    v_damped      : optional damped velocity array

    Returns
    -------
    fig : Plotly Figure
    """
    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=x,
            y=v,
            mode="lines",
            name="Ideal SHM",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )
    if x_damped is not None and v_damped is not None:
        fig.add_trace(
            go.Scatter(
                x=x_damped,
                y=v_damped,
                mode="lines",
                name="Damped",
                line=dict(color=COLOURS["advanced"], width=2),
            )
        )

    # Mark start point
    fig.add_trace(
        go.Scatter(
            x=[x[0]],
            y=[v[0]],
            mode="markers",
            name="t = 0",
            marker=dict(color=COLOURS["highlight"], size=10, symbol="circle"),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Phase Portrait (v vs x)", font=dict(size=14)),
            xaxis=dict(
                title="Displacement x (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Velocity v (m/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_energy_bar(
    KE: float,
    PE: float,
    t_val: float,
) -> go.Figure:
    """
    Build a Plotly bar chart showing KE and PE at a selected time instant.

    Parameters
    ----------
    KE    : kinetic energy (J)
    PE    : potential energy (J)
    t_val : time instant for chart title (s)

    Returns
    -------
    fig : Plotly Figure
    """
    total = KE + PE
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=["KE", "PE", "Total"],
            y=[KE, PE, total],
            marker_color=[COLOURS["secondary"], COLOURS["tertiary"], COLOURS["primary"]],
            name="Energy",
            text=[f"{KE:.4f} J", f"{PE:.4f} J", f"{total:.4f} J"],
            textposition="outside",
        )
    )
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(
                text=f"Energy at t = {t_val:.3f} s",
                font=dict(size=14),
            ),
            xaxis=dict(
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Energy (J)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=False,
        )
    )
    return fig


def build_amplitude_response(
    zeta: float,
    omega_drive_ratio: float,
) -> go.Figure:
    """
    Build the amplitude–frequency response (Bode amplitude) figure.

    Shows the normalised steady-state amplitude A(ω/ω₀) with the current
    driving frequency marked and the resonance peak annotated.

    Parameters
    ----------
    zeta             : damping ratio
    omega_drive_ratio: current driving frequency ratio ω/ω₀

    Returns
    -------
    fig : Plotly Figure
    """
    r = np.linspace(0.05, 3.0, FREQ_RATIO_POINTS)
    A = amplitude_response(r, zeta)

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=r,
            y=A,
            mode="lines",
            name="A(ω/ω₀)",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )

    # Current driving frequency marker
    A_drive = float(amplitude_response(np.array([omega_drive_ratio]), zeta)[0])
    fig.add_vline(
        x=omega_drive_ratio,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
    )
    fig.add_trace(
        go.Scatter(
            x=[omega_drive_ratio],
            y=[A_drive],
            mode="markers+text",
            text=[f"  A = {A_drive:.2f}"],
            textposition="middle right",
            textfont=dict(color=COLOURS["highlight"]),
            marker=dict(color=COLOURS["highlight"], size=10),
            name=f"ω/ω₀ = {omega_drive_ratio:.2f}",
        )
    )

    # Resonance peak annotation (near ω/ω₀ = sqrt(1 - 2ζ²) for underdamped)
    if zeta < 1.0 / np.sqrt(2):
        r_peak = np.sqrt(1.0 - 2.0 * zeta**2)
        A_peak = float(amplitude_response(np.array([r_peak]), zeta)[0])
        fig.add_annotation(
            x=r_peak,
            y=A_peak,
            text=f"Peak A = {A_peak:.2f}<br>Q = {1/(2*zeta):.2f}",
            showarrow=True,
            arrowhead=2,
            arrowcolor=COLOURS["advanced"],
            font=dict(color=COLOURS["advanced"], size=11),
            bgcolor="rgba(0,0,0,0.6)",
        )

    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Amplitude–Frequency Response", font=dict(size=14)),
            xaxis=dict(
                title="ω / ω₀",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Normalised amplitude A",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── Animation builder ─────────────────────────────────────────────────────────


def build_shm_animation(t_arr, x_arr, v_arr, sim_type, params):
    """
    Build p5.js animated SHM HTML with enhanced interactive features.

    sim_type: 'spring' or 'pendulum'
    params: dict with keys like 'omega0', 'amplitude', 'L' (pendulum length),
            and optionally 'zeta' (damping ratio).

    Enhanced features:
    - Drag to displace and release: click/drag mass or pendulum bob to set a
      new initial displacement; rubber-band stretch indicator shown while dragging.
    - Phase space portrait (mini panel): bottom-right corner shows live x-vs-v
      ellipse with colour-coded dot (red at max displacement, blue at max velocity).
    - Energy display bar: full-width KE (orange) + PE (blue) bars with numeric
      values and constant total-E dotted line.
    - Multi-pendulum mode: up to 3 pendulums (pendulum only), Add/Clear buttons,
      colour-coded (white, orange, cyan), beat frequency visible when lengths differ.
    - Damping visual: if zeta > 0, draws fading dashed amplitude-envelope curves.
    """
    step = max(1, len(t_arr) // 300)
    ts = t_arr[::step].tolist()
    xs = x_arr[::step].tolist()
    vs = v_arr[::step].tolist()

    x_max = float(np.max(np.abs(x_arr))) or 1.0
    v_max = float(np.max(np.abs(v_arr))) or 1.0
    omega0 = float(params.get("omega0", 1.0))
    amplitude = float(params.get("amplitude", x_max))
    zeta = float(params.get("zeta", 0.0))
    L_param = float(params.get("L", 1.0))

    data = json.dumps({
        "t": ts, "x": xs, "v": vs,
        "xMax": x_max, "vMax": v_max,
        "simType": sim_type,
        "n": len(ts),
        "omega0": omega0,
        "amplitude": amplitude,
        "zeta": zeta,
        "L": L_param,
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>
body{{margin:0;overflow:hidden;background:#0e1117;}}
</style>
</head><body>
<script>
const D = {data};

// ── Playback state ────────────────────────────────────────────────────────────
let frame = 0, playing = true, speed = 1;

// ── Drag-to-displace state ────────────────────────────────────────────────────
let dragging = false;
let dragStartX = 0, dragStartY = 0;
let dragCurrentX = 0, dragCurrentY = 0;
let customAmplitude = D.amplitude;   // currently active amplitude (may be overridden by drag)
let customFrame = -1;                // if >= 0: replay from custom amplitude

// ── Phase-space trail ─────────────────────────────────────────────────────────
let phaseTrail = [];

// ── Multi-pendulum state (pendulum mode only) ─────────────────────────────────
// pendulums[0] is always the primary (from data), extras are computed live
let extraPendulums = [];   // each: {{lengthFactor, color, frame, trail}}
const PEND_COLORS = ['#ffffff', '#ff7f0e', '#17becf'];

// ── Canvas geometry helpers (set in draw) ─────────────────────────────────────
let pivX, pivY, pendLpx;   // pendulum pivot and pixel-length
let wallX, ceilY, restLen; // spring wall, ceiling, rest length
let massW = 40, massH = 40;

// ── Utility ───────────────────────────────────────────────────────────────────
function sign(v){{ return v > 0 ? 1 : v < 0 ? -1 : 0; }}
function setLineDash(list){{ drawingContext.setLineDash(list); }}

// Compute (x, v) for a SHM oscillator at a given frame index, given an amplitude.
// Uses the same cosine formula as the Python shm_kinematics().
function shmXV(frameIdx, amp, omega){{
  let t = frameIdx / D.n * (D.t[D.n - 1] || 1.0);
  let x = amp * Math.cos(omega * t);
  let v = -amp * omega * Math.sin(omega * t);
  return [x, v];
}}

// ── Setup / resize ────────────────────────────────────────────────────────────
function setup(){{
  createCanvas(windowWidth || 700, 520);
  textFont('monospace');
}}
function windowResized(){{ resizeCanvas(windowWidth, 520); }}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function updateSpringGeometry(){{
  wallX   = 50;
  ceilY   = height / 2 - 20;
  restLen = 150;
}}
function updatePendulumGeometry(){{
  pivX    = width / 2;
  pivY    = 85;
  pendLpx = min(width, height - 160) * 0.38;
}}

// ── Hit-testing for drag ──────────────────────────────────────────────────────
function getMassCenter(){{
  if (D.simType === 'spring') {{
    let idx = customFrame >= 0 ? min(customFrame, D.n - 1) : min(frame, D.n - 1);
    let x   = customFrame >= 0 ? shmXV(customFrame, customAmplitude, D.omega0)[0] : D.x[idx];
    let dispPx = x / D.xMax * 120;
    return [wallX + restLen + dispPx, ceilY];
  }} else {{
    let idx = customFrame >= 0 ? min(customFrame, D.n - 1) : min(frame, D.n - 1);
    let theta = customFrame >= 0 ? shmXV(customFrame, customAmplitude, D.omega0)[0] : D.x[idx];
    return [pivX + pendLpx * sin(theta), pivY + 8 + pendLpx * cos(theta)];
  }}
}}

// ── Mouse interaction ─────────────────────────────────────────────────────────
function mousePressed(){{
  // Control panel (top-right)
  let ctrlX = width - 118, ctrlW = 110;
  if (mouseX > ctrlX && mouseX < ctrlX + ctrlW) {{
    if (mouseY > 8  && mouseY < 40)  {{ playing = !playing; return; }}
    if (mouseY > 48 && mouseY < 80)  {{ resetSim(); return; }}
    if (mouseY > 88 && mouseY < 120) {{ speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; return; }}
  }}

  // Multi-pendulum buttons (top-left, pendulum only)
  if (D.simType === 'pendulum') {{
    if (mouseX > 10 && mouseX < 110 && mouseY > 8 && mouseY < 36) {{
      addExtraPendulum(); return;
    }}
    if (mouseX > 118 && mouseX < 180 && mouseY > 8 && mouseY < 36) {{
      extraPendulums = []; return;
    }}
  }}

  // Drag hit-test: within 30 px of mass/bob centre
  let [cx, cy] = getMassCenter();
  if (dist(mouseX, mouseY, cx, cy) < 35) {{
    dragging  = true;
    playing   = false;
    dragStartX = cx; dragStartY = cy;
    dragCurrentX = mouseX; dragCurrentY = mouseY;
  }}
}}

function mouseDragged(){{
  if (dragging) {{
    dragCurrentX = mouseX;
    dragCurrentY = mouseY;
  }}
}}

function mouseReleased(){{
  if (!dragging) return;
  dragging = false;

  // Compute new amplitude from drag
  if (D.simType === 'spring') {{
    let dx = (dragCurrentX - (wallX + restLen)) / 120 * D.xMax;
    customAmplitude = constrain(abs(dx), 0.001, D.xMax * 1.5);
  }} else {{
    // Angle from pivot
    let dx = dragCurrentX - pivX;
    let dy = dragCurrentY - (pivY + 8);
    let theta = atan2(dx, dy);   // angle from downward vertical
    customAmplitude = constrain(abs(theta), 0.001, PI * 0.45);
  }}

  // Restart oscillation
  customFrame = 0;
  phaseTrail  = [];
  extraPendulums.forEach(p => {{ p.frame = 0; p.trail = []; }});
  playing = true;
}}

function addExtraPendulum(){{
  if (extraPendulums.length >= 2) return;   // max 3 total (1 primary + 2 extra)
  let factor = extraPendulums.length === 0 ? 1.10 : 0.92;
  extraPendulums.push({{
    lengthFactor: factor,
    color: PEND_COLORS[extraPendulums.length + 1],
    frame: customFrame >= 0 ? customFrame : frame,
    trail: [],
  }});
}}

function resetSim(){{
  frame          = 0;
  customFrame    = -1;
  customAmplitude = D.amplitude;
  playing        = true;
  phaseTrail     = [];
  extraPendulums = [];
}}

// ── Spring coil drawing ───────────────────────────────────────────────────────
function drawSpring(x1, y1, x2, y2, coils, w){{
  let dx = x2 - x1, dy = y2 - y1;
  let len = sqrt(dx * dx + dy * dy) || 1;
  let nx = -dy / len, ny = dx / len;
  let segs = coils * 2 + 2;
  beginShape();
  vertex(x1, y1);
  for (let i = 1; i < segs; i++) {{
    let tt = i / segs;
    let mx = x1 + dx * tt, my = y1 + dy * tt;
    let sg = (i % 2 === 0) ? 1 : -1;
    vertex(mx + nx * sg * w, my + ny * sg * w);
  }}
  vertex(x2, y2);
  endShape();
}}

// ── Phase-space mini panel ────────────────────────────────────────────────────
function drawPhasePanel(x, v){{
  let phX = width - 90, phY = height - 150, phR = 68;

  // Background circle
  noStroke(); fill(11, 11, 20, 220);
  circle(phX, phY, phR * 2 + 16);
  stroke('#2a2a2a'); strokeWeight(1); noFill();
  circle(phX, phY, phR * 2);

  // Axis labels
  noStroke(); fill('#555'); textSize(8);
  textAlign(CENTER);
  text('x', phX, phY + phR + 12);
  textAlign(LEFT);
  text('v', phX - phR - 10, phY + 4);

  // Axis ticks
  stroke('#2a2a2a'); strokeWeight(1);
  line(phX - phR, phY, phX + phR, phY);
  line(phX, phY - phR, phX, phY + phR);

  // Update trail
  phaseTrail.push([x, v]);
  if (phaseTrail.length > 120) phaseTrail.shift();

  // Draw trail with colour-coded gradient: red at extremes, blue at centre
  for (let i = 1; i < phaseTrail.length; i++) {{
    let alpha  = map(i, 0, phaseTrail.length, 30, 220);
    let xFrac  = abs(phaseTrail[i][0]) / D.xMax;      // 1 at max displacement
    let r = lerp(50,  220, xFrac);
    let b = lerp(220, 50,  xFrac);
    let g = 50;
    let px1 = phX + phaseTrail[i-1][0] / D.xMax * phR;
    let py1 = phY - phaseTrail[i-1][1] / D.vMax * phR;
    let px2 = phX + phaseTrail[i  ][0] / D.xMax * phR;
    let py2 = phY - phaseTrail[i  ][1] / D.vMax * phR;
    stroke(r, g, b, alpha); strokeWeight(1.5);
    line(px1, py1, px2, py2);
  }}

  // Live dot
  let dotX = phX + x / D.xMax * phR;
  let dotY = phY - v / D.vMax * phR;
  let xF   = abs(x) / D.xMax;
  let dr = lerp(50, 220, xF), db = lerp(220, 50, xF);
  noStroke(); fill(dr, 50, db);
  circle(dotX, dotY, 7);

  // Label
  fill('#777'); noStroke(); textSize(8); textAlign(CENTER);
  text('phase space', phX, phY + phR + 22);
  textAlign(LEFT);
}}

// ── Full-width energy bar ─────────────────────────────────────────────────────
function drawEnergyBar(ke, pe, xVal, vVal){{
  let bx = 10, bw = width - 200, barH = 14, barY = height - 14;
  let totalE = D.xMax * D.xMax;   // proportional reference (normalised)
  let keNorm = constrain(ke * ke / (D.vMax * D.vMax), 0, 1);   // v²/vMax²
  let peNorm = constrain(xVal * xVal / (D.xMax * D.xMax), 0, 1); // x²/xMax²

  // Background
  noStroke(); fill(20, 20, 30);
  rect(bx, barY - barH * 2 - 8, bw, barH * 2 + 8, 4);

  // KE bar (orange)
  fill('#ff7f0e');
  rect(bx + 2, barY - barH * 2 - 5, (bw - 4) * keNorm, barH - 2, 3);

  // PE bar (blue)
  fill('#1f77b4');
  rect(bx + 2, barY - barH - 3, (bw - 4) * peNorm, barH - 2, 3);

  // Total-E dotted line
  stroke('#2ca02c'); strokeWeight(1.5); setLineDash([4, 3]);
  line(bx + bw - 2, barY - barH * 2 - 8, bx + bw - 2, barY);
  setLineDash([]);

  // Labels inside
  noStroke(); fill('#fafafa'); textSize(9);
  let keJ  = 0.5 * vVal * vVal;    // proportional (m=1)
  let peJ  = 0.5 * xVal * xVal;
  let totJ = keJ + peJ;
  // clamp display to 3 sig figs
  text('KE', bx + 4, barY - barH - 8);
  text('PE', bx + 4, barY - 3);
  fill('#aaa'); textSize(8);
  text('KE: ' + keJ.toFixed(3) + '  PE: ' + peJ.toFixed(3) + '  E: ' + totJ.toFixed(3),
       bx + 25, barY - barH - 4);

  // Total E label
  fill('#2ca02c'); textSize(8);
  text('E', bx + bw + 2, barY - 5);
}}

// ── Damping envelope ──────────────────────────────────────────────────────────
function drawDampingEnvelope(originX, originY, isSpring){{
  if (D.zeta <= 0) return;
  // Draw amplitude-decay envelope as dashed curves sampling t values
  let nEnv  = 60;
  let tFull = D.t[D.n - 1] || 1;
  stroke(180, 180, 60, 120); strokeWeight(1); setLineDash([5, 4]);
  noFill();

  if (isSpring) {{
    // Horizontal spring: envelope appears as vertical band around ceilY
    // Draw top and bottom envelope as curves in the time domain isn't applicable
    // here — instead shade ±envelope width at the current mass position
    let envAmp = D.amplitude * exp(-D.zeta * D.omega0 * (frame / D.n * tFull));
    let envPx  = envAmp / D.xMax * 120;
    setLineDash([6, 4]);
    stroke(180, 180, 60, 150); strokeWeight(1.5);
    // Draw dashed lines at ±envelope displacement from rest
    line(wallX + restLen + envPx,  ceilY - 45, wallX + restLen + envPx,  ceilY + 45);
    line(wallX + restLen - envPx,  ceilY - 45, wallX + restLen - envPx,  ceilY + 45);
    setLineDash([]);
    // Label
    noStroke(); fill(180, 180, 60); textSize(9);
    text('Damping: β=' + D.zeta.toFixed(2), wallX + restLen + envPx + 6, ceilY - 30);
  }} else {{
    // Pendulum: draw arc showing current envelope angle
    let envAmp  = D.amplitude * exp(-D.zeta * D.omega0 * (frame / D.n * tFull));
    let envLpx  = pendLpx;
    // Draw ± envelope arcs
    stroke(180, 180, 60, 180); strokeWeight(1.5); setLineDash([5, 4]); noFill();
    arc(pivX, pivY + 8, envLpx * 2, envLpx * 2,
        HALF_PI - envAmp, HALF_PI);          // right half
    arc(pivX, pivY + 8, envLpx * 2, envLpx * 2,
        HALF_PI, HALF_PI + envAmp);          // left half
    setLineDash([]);
    noStroke(); fill(180, 180, 60); textSize(9);
    text('β=' + D.zeta.toFixed(2), pivX + envLpx * sin(envAmp) + 5, pivY + 8 + envLpx * cos(envAmp));
  }}
}}

// ── Draw one pendulum (given theta, color) ────────────────────────────────────
function drawOnePendulum(theta, col, showArrow, v){{
  let bobX = pivX + pendLpx * sin(theta);
  let bobY = pivY + 8 + pendLpx * cos(theta);

  // Rod
  stroke(col); strokeWeight(2);
  line(pivX, pivY + 8, bobX, bobY);

  // Bob glow
  let cr = red(color(col)), cg = green(color(col)), cb = blue(color(col));
  noStroke();
  for (let r = 22; r > 0; r -= 5) fill(cr, cg, cb, map(r, 0, 22, 0, 25));
  for (let r = 22; r > 0; r -= 5) circle(bobX, bobY, r * 2);

  stroke(col); strokeWeight(1.5); fill(col);
  circle(bobX, bobY, 22);

  // Velocity arrow
  if (showArrow && abs(v) > 0.01) {{
    let tx = -cos(theta) * sign(v), ty = sin(theta) * sign(v);
    let spd = map(abs(v), 0, D.vMax, 0, 50);
    stroke('#ff7f0e'); fill('#ff7f0e'); strokeWeight(2);
    let ax = bobX + tx * spd, ay = bobY + ty * spd;
    line(bobX, bobY, ax, ay);
    let ang = atan2(ty, tx);
    push(); translate(ax, ay); rotate(ang);
    triangle(0, 0, -10, -5, -10, 5); pop();
  }}
}}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw(){{
  background('#0e1117');
  updateSpringGeometry();
  updatePendulumGeometry();

  // Resolve current (x, v) — either from data or from custom-drag replay
  let idx = min(frame, D.n - 1);
  let x, v;
  if (customFrame >= 0) {{
    [x, v] = shmXV(customFrame, customAmplitude, D.omega0);
  }} else {{
    x = D.x[idx]; v = D.v[idx];
  }}

  // ── SPRING-MASS ───────────────────────────────────────────────────────────
  if (D.simType === 'spring') {{
    let dispPx = x / D.xMax * 120;
    let massX  = wallX + restLen + dispPx;
    let massY  = ceilY - massH / 2;

    // Wall
    stroke('#555'); strokeWeight(3);
    line(wallX, ceilY - 70, wallX, ceilY + 70);
    stroke('#555'); strokeWeight(1);
    for (let i = -4; i <= 4; i++) line(wallX - 12, ceilY + i * 17, wallX, ceilY + i * 17 - 12);

    // Damping envelope (before spring so it's behind)
    drawDampingEnvelope(0, 0, true);

    // Spring
    stroke('#17becf'); strokeWeight(2); noFill();
    drawSpring(wallX, ceilY, massX, ceilY, 8, 14);

    // Drag rubber-band
    if (dragging) {{
      stroke(255, 220, 80, 180); strokeWeight(2); setLineDash([5, 3]);
      line(wallX + restLen, ceilY, dragCurrentX, ceilY);
      setLineDash([]);
      let dxM = (dragCurrentX - (wallX + restLen)) / 120 * D.xMax;
      noStroke(); fill(255, 220, 80); textSize(10);
      text('x = ' + abs(dxM).toFixed(3) + ' m', dragCurrentX + 8, ceilY - 12);
    }}

    // Equilibrium dashed line
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6, 4]);
    line(wallX + restLen, 55, wallX + restLen, height - 90);
    setLineDash([]);

    // Mass glow
    noStroke();
    for (let r = 32; r > 0; r -= 6) fill(31, 119, 180, map(r, 0, 32, 0, 22));
    for (let r = 32; r > 0; r -= 6) rect(massX - massW/2 - r/4, massY - r/4, massW + r/2, massH + r/2, 4);

    // Mass block
    fill('#1f77b4'); stroke('#ffffff'); strokeWeight(1.5);
    rect(massX - massW/2, massY, massW, massH, 4);
    noStroke(); fill('#ffffff'); textSize(10); textAlign(CENTER);
    text('m', massX, massY + massH/2 + 4);
    textAlign(LEFT);

    // Velocity arrow
    if (!dragging && abs(v) > 0.01) {{
      stroke('#ff7f0e'); fill('#ff7f0e'); strokeWeight(2);
      let arrowLen = map(abs(v), 0, D.vMax, 0, 60) * sign(v);
      let ax = massX + massW/2, ay = ceilY;
      line(ax, ay, ax + arrowLen, ay);
      let dir = v > 0 ? 1 : -1;
      triangle(ax + arrowLen, ay, ax + arrowLen - dir*10, ay-5, ax + arrowLen - dir*10, ay+5);
    }}

  // ── PENDULUM ──────────────────────────────────────────────────────────────
  }} else {{
    // Support
    stroke('#555'); strokeWeight(3); fill('#555');
    rect(pivX - 30, 62, 60, 20, 3);
    stroke('#555'); strokeWeight(1);
    for (let i = -3; i <= 3; i++) line(pivX - 30 + i*10, 62, pivX - 20 + i*10, 44);

    // Pivot
    fill('#888'); noStroke(); circle(pivX, pivY + 8, 10);

    // Equilibrium dashed line
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6, 4]);
    line(pivX, pivY + 8, pivX, pivY + 8 + pendLpx + 20);
    setLineDash([]);

    // Damping envelope
    drawDampingEnvelope(pivX, pivY, false);

    // Multi-pendulum buttons (top-left)
    noStroke(); fill(15, 15, 25, 220); rect(8, 6, 170, 32, 5);
    fill(extraPendulums.length < 2 ? '#2ca02c' : '#555'); noStroke();
    rect(10, 8, 98, 28, 4);
    fill('#fff'); textSize(10);
    text('+ Add Pendulum', 14, 26);
    fill('#c0392b'); noStroke(); rect(116, 8, 58, 28, 4);
    fill('#fff'); text('Clear', 125, 26);

    // Draw extra pendulums first (behind primary)
    for (let ep of extraPendulums) {{
      let epOmega = D.omega0 / sqrt(ep.lengthFactor);  // ω ∝ 1/√L
      let epAmp   = customAmplitude;
      let [ex, ev] = shmXV(ep.frame, epAmp, epOmega);
      let epLpx   = pendLpx * sqrt(ep.lengthFactor);
      // Temporarily override pendLpx for drawing
      let savedLpx = pendLpx;
      pendLpx = epLpx;
      drawOnePendulum(ex, ep.color, false, ev);
      pendLpx = savedLpx;
      ep.trail.push([ex, ev]);
      if (ep.trail.length > 80) ep.trail.shift();
      if (playing) ep.frame += speed;
      if (ep.frame >= D.n) ep.frame = 0;
    }}

    // Primary pendulum
    drawOnePendulum(x, PEND_COLORS[0], true, v);

    // Drag rubber-band (pendulum)
    if (dragging) {{
      stroke(255, 220, 80, 180); strokeWeight(2); setLineDash([5, 3]);
      line(pivX, pivY + 8, dragCurrentX, dragCurrentY);
      setLineDash([]);
      let dx2 = dragCurrentX - pivX, dy2 = dragCurrentY - (pivY + 8);
      let dragTheta = atan2(dx2, dy2);
      noStroke(); fill(255, 220, 80); textSize(10);
      text('θ = ' + degrees(abs(dragTheta)).toFixed(1) + '°', dragCurrentX + 8, dragCurrentY - 8);
    }}

    // Angle arc (primary pendulum)
    let theta = x;
    if (abs(theta) > 0.02) {{
      noFill(); stroke('#9b59b6'); strokeWeight(1.5);
      arc(pivX, pivY + 8, 70, 70, HALF_PI - abs(theta), HALF_PI);
      arc(pivX, pivY + 8, 70, 70, HALF_PI, HALF_PI + abs(theta));
      noStroke(); fill('#9b59b6'); textSize(9);
      text('θ=' + degrees(abs(theta)).toFixed(1) + '°', pivX + 8, pivY + 46);
    }}

    // Gravity arrow on primary bob
    let bobX = pivX + pendLpx * sin(theta);
    let bobY = pivY + 8 + pendLpx * cos(theta);
    stroke('#e74c3c'); fill('#e74c3c'); strokeWeight(2);
    line(bobX, bobY, bobX, bobY + 38);
    triangle(bobX, bobY + 38, bobX - 4, bobY + 28, bobX + 4, bobY + 28);
  }}

  // ── ENERGY BAR (bottom) ───────────────────────────────────────────────────
  drawEnergyBar(v, x, x, v);

  // ── PHASE SPACE PANEL ─────────────────────────────────────────────────────
  drawPhasePanel(x, v);

  // ── CONTROLS PANEL (top-right) ────────────────────────────────────────────
  noStroke(); fill(15, 15, 25, 220); rect(width - 118, 8, 110, 130, 6);
  fill('#fafafa'); textSize(11);
  text(playing ? '⏸ Pause' : '▶ Play',  width - 112, 28);
  text('↺ Replay',                        width - 112, 68);
  text('⚡ ' + speed + 'x',               width - 112, 108);

  // Drag hint
  fill('#777'); textSize(8);
  text('drag mass to displace', width - 112, 128);

  // ── ADVANCE FRAME ─────────────────────────────────────────────────────────
  if (playing && !dragging) {{
    if (customFrame >= 0) {{
      customFrame += speed;
      if (customFrame >= D.n) {{ customFrame = 0; phaseTrail = []; }}
    }} else {{
      frame += speed;
      if (frame >= D.n) {{ frame = 0; phaseTrail = []; }}
    }}
  }}
}}
</script></body></html>"""


# ── Streamlit page ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="SHM — WJEC A Level Physics",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded",
)

sim_header("Simple Harmonic Motion", SPEC_REF)

mode = mode_toggle()

left_col, right_col = two_column_layout(3, 7)

# ── Left column: controls ─────────────────────────────────────────────────────
with left_col:
    st.subheader("System")
    system = st.selectbox("System", ["Simple Pendulum", "Spring-Mass"])

    st.divider()

    # System-specific controls
    if system == "Simple Pendulum":
        L = st.slider(
            "Length L (m)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.05,
            help="Effective length from pivot to centre of mass.",
        )
        theta0_deg = st.slider(
            "Initial amplitude θ₀ (°)",
            min_value=1,
            max_value=30,
            value=10,
            step=1,
            help="Initial angular displacement (small-angle approximation valid ≲ 15°).",
        )
        theta0_rad = np.radians(theta0_deg)
        # Convert to linear displacement for plotting
        x0 = L * theta0_rad          # linear amplitude ≈ L·θ₀ (small angle)
        m_eff = 1.0                   # normalise: 1 kg bob assumed for energy
        omega0, T_period, freq = pendulum_params(L)

    else:  # Spring-Mass
        m_eff = st.slider(
            "Mass m (kg)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.1,
        )
        k_spring = st.slider(
            "Spring constant k (N/m)",
            min_value=1,
            max_value=200,
            value=20,
            step=1,
        )
        x0 = st.slider(
            "Initial displacement x₀ (m)",
            min_value=0.01,
            max_value=0.50,
            value=0.10,
            step=0.01,
        )
        omega0, T_period, freq = spring_params(m_eff, k_spring)
        L = 1.0  # unused for spring; set for function signatures

    # ── Basic: period verification checkbox ──────────────────────────────────
    show_period_verification = False
    if mode == "Basic":
        st.divider()
        show_period_verification = st.checkbox(
            "Show period verification",
            value=False,
            help="Show graphs illustrating how period depends on system parameters.",
        )

    # ── Advanced controls (inside left column) ────────────────────────────────
    # Defaults needed before Advanced block
    zeta = 0.0
    enable_forced = False
    omega_drive_ratio = 1.0
    show_large_angle = False

    if mode == "Advanced":
        advanced_divider()

        zeta = st.slider(
            "Damping ratio ζ",
            min_value=0.0,
            max_value=2.0,
            value=0.1,
            step=0.05,
            help="ζ < 1: underdamped  |  ζ = 1: critically damped  |  ζ > 1: overdamped",
        )

        # Regime label
        if abs(zeta - 1.0) < ZETA_CRIT_TOL:
            st.info("Regime: **Critically damped** — fastest return without oscillation.")
        elif zeta < 1.0:
            st.info(f"Regime: **Underdamped** (ζ = {zeta:.2f} < 1) — decaying oscillation.")
        else:
            st.info(f"Regime: **Overdamped** (ζ = {zeta:.2f} > 1) — slow exponential return.")

        # ── Real-world damping presets ────────────────────────────────────────
        _DAMPING_PRESETS = {
            "Custom": None,
            "Car suspension (comfort)": (
                0.25,
                "Slightly underdamped: the body bounces gently once after a bump, "
                "giving a plush ride feel.",
            ),
            "Car suspension (sport)": (
                0.7,
                "Well-damped: the suspension rebounds quickly and controlled — "
                "minimal body roll, responsive handling.",
            ),
            "Building with TMD (tuned mass damper)": (
                0.05,
                "Very lightly damped: the tuned mass damper inside the building "
                "absorbs sway energy during earthquakes or wind loading.",
            ),
            "Door damper (soft close)": (
                1.0,
                "Critically damped: the door closes smoothly to the frame without "
                "bouncing or slamming — exactly critical damping.",
            ),
            "Old clock pendulum (air)": (
                0.002,
                "Extremely lightly damped: air resistance is tiny, so the pendulum "
                "swings for hours before losing appreciable amplitude.",
            ),
            "Seismograph": (
                0.6,
                "Moderately damped: the needle responds clearly to ground motion "
                "then settles quickly, ready to record the next wave.",
            ),
        }

        preset_choice = st.selectbox(
            "Real-world example",
            options=list(_DAMPING_PRESETS.keys()),
            index=0,
            help="Select a preset to update ζ and see a real-world context card.",
        )

        if preset_choice != "Custom" and _DAMPING_PRESETS[preset_choice] is not None:
            _preset_zeta, _preset_info = _DAMPING_PRESETS[preset_choice]
            zeta = _preset_zeta
            st.info(_preset_info)

        if zeta > 0.0:
            enable_forced = st.checkbox(
                "Enable forced oscillation",
                value=False,
                help="Drive the oscillator sinusoidally and explore resonance.",
            )
            if enable_forced:
                omega_drive_ratio = st.slider(
                    "Driving frequency ratio ω/ω₀",
                    min_value=0.1,
                    max_value=3.0,
                    value=1.0,
                    step=0.05,
                    help="Ratio of driving frequency to natural frequency. At 1.0: resonance.",
                )

        if system == "Simple Pendulum":
            show_large_angle = st.checkbox(
                "Show large-angle comparison",
                value=False,
                help=(
                    "Uses RK4 to integrate the exact pendulum ODE "
                    "d²θ/dt² = -(g/L) sin(θ). "
                    "Deviations grow with amplitude."
                ),
            )

# ── Derived time array ────────────────────────────────────────────────────────

t_end = N_PERIODS * T_period
t = np.linspace(0.0, t_end, N_POINTS)

# ── Analytical SHM kinematics ─────────────────────────────────────────────────

x_ideal, v_ideal, a_ideal = shm_kinematics(t, x0, omega0)

# ── Advanced: damped solution and numerical pendulum ─────────────────────────

x_damped_arr = None
v_damped_arr = None
envelope_arr = None
x_rk4_arr = None
t_rk4_arr = None

if mode == "Advanced":
    if zeta > 0.0:
        x_damped_arr = damped_displacement(t, x0, omega0, zeta)
        # Numerical velocity for damped phase portrait (finite difference)
        v_damped_arr = np.gradient(x_damped_arr, t)
        if zeta < 1.0 and not (abs(zeta - 1.0) < ZETA_CRIT_TOL):
            envelope_arr = x0 * np.exp(-zeta * omega0 * t)

    if show_large_angle and system == "Simple Pendulum":
        dt_rk4 = RK4_DT_FACTOR * T_period
        ode_func = pendulum_ode(L)
        y0_rk4 = np.array([theta0_rad, 0.0])
        t_rk4_arr, y_rk4 = rk4_integrate(ode_func, y0_rk4, (0.0, t_end), dt_rk4)
        # Convert angular displacement to linear displacement for comparison
        x_rk4_arr = L * y_rk4[:, 0]

# ── Right column: plots ───────────────────────────────────────────────────────

with right_col:

    # Metric row
    metric_row(
        {
            "Period T": f"{T_period:.3f} s",
            "Frequency f": f"{freq:.3f} Hz",
            "Angular freq ω₀": f"{omega0:.3f} rad/s",
        }
    )

    st.markdown("")  # spacing

    # ── Live animation panel ──────────────────────────────────────────────────
    shm_type = "pendulum" if system == "Simple Pendulum" else "spring"
    if system == "Simple Pendulum":
        # Pass angle in radians and angular velocity for the pendulum animation
        anim_x = x_ideal / L   # convert linear displacement back to radians
        anim_v = v_ideal / L   # angular velocity (rad/s)
        anim_params = {"omega0": float(omega0), "amplitude": float(theta0_rad), "L": float(L)}
    else:
        anim_x = x_ideal
        anim_v = v_ideal
        anim_params = {"omega0": float(omega0), "amplitude": float(x0)}
    anim_html = build_shm_animation(t, anim_x, anim_v, shm_type, anim_params)
    components.html(anim_html, height=430)
    st.caption("▶ Click Play/Pause · ↺ Replay · ⚡ Speed toggle")
    st.divider()

    # ── Time-series subplots ──────────────────────────────────────────────────
    fig_ts = build_time_series_fig(
        t=t,
        x=x_ideal,
        v=v_ideal,
        a=a_ideal,
        x_damped=x_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
        envelope=envelope_arr,
        x_rk4=x_rk4_arr,
        t_rk4=t_rk4_arr,
        system=system,
    )
    st.plotly_chart(fig_ts, use_container_width=True)

    # ── Phase portrait + Energy bar ───────────────────────────────────────────
    col_phase, col_energy = st.columns(2)

    with col_phase:
        fig_phase = build_phase_portrait(
            x=x_ideal,
            v=v_ideal,
            x_damped=x_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
            v_damped=v_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
        )
        st.plotly_chart(fig_phase, use_container_width=True)

    with col_energy:
        t_slider_max = float(t_end)
        t_selected = st.slider(
            "Time point for energy (s)",
            min_value=0.0,
            max_value=t_slider_max,
            value=0.0,
            step=t_slider_max / 200.0,
            format="%.3f",
            key="energy_time_slider",
        )
        KE_val, PE_val = energy_at_time(
            t_val=t_selected,
            x0=x0,
            omega0=omega0,
            m=m_eff,
            system=system,
            L=L,
        )
        fig_energy = build_energy_bar(KE_val, PE_val, t_selected)
        st.plotly_chart(fig_energy, use_container_width=True)

    # ── Basic: period verification graphs ────────────────────────────────────
    if mode == "Basic" and show_period_verification:
        st.markdown("#### Period Verification")
        pv_col_left, pv_col_right = st.columns(2)

        if system == "Simple Pendulum":
            # Left: T vs L
            L_arr = np.linspace(0.1, 5.0, 300)
            T_vs_L = 2 * np.pi * np.sqrt(L_arr / g)

            fig_TL = go.Figure()
            fig_TL.add_trace(
                go.Scatter(
                    x=L_arr,
                    y=T_vs_L,
                    mode="lines",
                    name="T vs L",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_TL.add_vline(
                x=L,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"L={L:.2f} m",
                annotation_position="top right",
            )
            # Log-log slope annotation
            fig_TL.add_annotation(
                x=0.5,
                y=max(T_vs_L) * 0.85,
                text="log-log slope = 0.5",
                showarrow=False,
                font=dict(color=COLOURS["advanced"], size=11),
                xref="paper",
                yref="y",
            )
            fig_TL.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ √L (Pendulum)", font=dict(size=13)),
                    xaxis=dict(
                        title="Length L (m)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_left:
                st.plotly_chart(fig_TL, use_container_width=True)

            # Right: T on different planets
            _PLANETS = {
                "Moon": 1.62,
                "Mars": 3.72,
                "Earth": 9.81,
                "Jupiter": 24.8,
            }
            _planet_names = list(_PLANETS.keys())
            _planet_g = list(_PLANETS.values())
            _planet_T = [2 * np.pi * np.sqrt(L / _gp) for _gp in _planet_g]

            fig_Tg = go.Figure()
            fig_Tg.add_trace(
                go.Scatter(
                    x=_planet_g,
                    y=_planet_T,
                    mode="markers+text",
                    text=_planet_names,
                    textposition="top center",
                    marker=dict(color=COLOURS["secondary"], size=12),
                    name="Planets",
                )
            )
            fig_Tg.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T on different planets", font=dict(size=13)),
                    xaxis=dict(
                        title="g (m/s²)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_right:
                st.plotly_chart(fig_Tg, use_container_width=True)

        else:  # Spring-Mass
            # Left: T vs m (k fixed)
            m_arr = np.linspace(0.1, 5.0, 300)
            T_vs_m = 2 * np.pi * np.sqrt(m_arr / k_spring)

            fig_Tm = go.Figure()
            fig_Tm.add_trace(
                go.Scatter(
                    x=m_arr,
                    y=T_vs_m,
                    mode="lines",
                    name="T vs m",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_Tm.add_vline(
                x=m_eff,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"m={m_eff:.1f} kg",
                annotation_position="top right",
            )
            fig_Tm.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ √m (Spring-Mass)", font=dict(size=13)),
                    xaxis=dict(
                        title="Mass m (kg)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_left:
                st.plotly_chart(fig_Tm, use_container_width=True)

            # Right: T vs k (m fixed)
            k_arr = np.linspace(1.0, 200.0, 300)
            T_vs_k = 2 * np.pi * np.sqrt(m_eff / k_arr)

            fig_Tk = go.Figure()
            fig_Tk.add_trace(
                go.Scatter(
                    x=k_arr,
                    y=T_vs_k,
                    mode="lines",
                    name="T vs k",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_Tk.add_vline(
                x=k_spring,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"k={k_spring} N/m",
                annotation_position="top right",
            )
            fig_Tk.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ 1/√k (Spring-Mass)", font=dict(size=13)),
                    xaxis=dict(
                        title="Spring constant k (N/m)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_right:
                st.plotly_chart(fig_Tk, use_container_width=True)

    # ── Advanced: amplitude–frequency response ────────────────────────────────
    if mode == "Advanced" and enable_forced:
        st.markdown("")
        fig_ampl = build_amplitude_response(zeta, omega_drive_ratio)
        st.plotly_chart(fig_ampl, use_container_width=True)

        # Steady-state amplitude note
        A_ss = float(amplitude_response(np.array([omega_drive_ratio]), zeta)[0])
        Q_factor = 1.0 / (2.0 * zeta)
        st.info(
            f"At ω/ω₀ = {omega_drive_ratio:.2f}: "
            f"steady-state amplitude = **{A_ss:.3f}×** natural amplitude.  "
            f"Quality factor Q = 1/(2ζ) = **{Q_factor:.2f}**"
        )

    # ── Key insight cards ─────────────────────────────────────────────────────
    if mode == "Basic":
        st.info(
            "⚡ At equilibrium position (x=0): ALL energy is kinetic "
            "(KE = ½mω²A²). At maximum displacement: ALL energy is potential "
            "(PE = ½kA²)."
        )
        st.info(
            f"🔄 The period T = {T_period:.3f} s is independent of amplitude — "
            "this is what makes SHM special. A 10° swing takes the same time "
            "as a 1° swing."
        )
    else:  # Advanced
        if zeta < 1.0 and not (abs(zeta - 1.0) < ZETA_CRIT_TOL):
            st.info(
                f"⚠️ Damping ratio ζ = {zeta:.2f}: oscillations decay with envelope "
                f"A·e^(−ζω₀t). The system still oscillates but amplitude shrinks "
                "each cycle."
            )
        if enable_forced and abs(omega_drive_ratio - 1.0) < 0.15:
            st.info(
                "🔊 Near resonance! Maximum energy transfer from driver to system. "
                "Real-world: Tacoma Narrows Bridge (1940) collapsed due to "
                "wind-driven resonance."
            )

    # ── Physics notes ─────────────────────────────────────────────────────────
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )

    # ── Exam practice questions ───────────────────────────────────────────────

    _omega = float(omega0)
    _A = float(x0)
    _m = float(m_eff)
    _T = 2 * np.pi / _omega
    _v_max = _omega * _A
    _a_max = _omega ** 2 * _A

    _exam_questions = [
        {
            "q": (
                f"An oscillating system has angular frequency ω = {_omega:.2f} rad/s "
                f"and amplitude A = {_A:.3f} m. Calculate the period."
            ),
            "marks": 2,
            "answer": f"{_T:.3f} s",
            "working": [
                f"T = 2π/ω = 2π/{_omega:.2f} = {_T:.3f} s",
            ],
        },
        {
            "q": "Calculate the maximum speed of the oscillating mass.",
            "marks": 2,
            "answer": f"{_v_max:.3f} m/s",
            "working": [
                f"v_max = Aω = {_A:.3f}×{_omega:.2f} = {_v_max:.3f} m/s",
            ],
        },
        {
            "q": "Calculate the maximum acceleration of the mass.",
            "marks": 3,
            "answer": f"{_a_max:.3f} m/s²",
            "working": [
                f"a_max = Aω² = {_A:.3f}×{_omega:.2f}² = {_a_max:.3f} m/s²",
            ],
            "hint": "a_max occurs at maximum displacement",
        },
    ]

    show_exam_panel(_exam_questions)
