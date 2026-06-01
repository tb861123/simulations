"""
AC Circuits — WJEC Eduqas A Level Physics.

Simulates voltage and current in pure-R, RC, RL and RLC series circuits driven
by a sinusoidal source.  Covers phasors, impedance, phase angle, resonance and
power.

Spec reference: Component 3, Option A (Alternating Currents), sections (a)–(p).
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

from utils import physics  # noqa: F401 — constants available if needed
from utils.style import COLOURS, make_fig, plotly_layout
from utils.ui_components import (
    advanced_divider,
    metric_row,
    mode_toggle,
    physics_notes,
    sim_header,
    two_column_layout,
)

# ── Page configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="AC Circuits — WJEC Physics",
    page_icon="〜",
    layout="wide",
)

# ── Constants / catalogue ─────────────────────────────────────────────────────

SPEC_REF = "Component 3, Option A (Alternating Currents), sections (a)–(p)"

FREQ_OPTIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000,
                2_000, 5_000, 10_000, 20_000, 50_000, 100_000]

C_OPTIONS_UF = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000]  # μF

L_OPTIONS_MH = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000]  # mH

N_SWEEP = 100        # points in Bode/resonance sweeps
N_TIME  = 1_000     # time-series samples


# ── Physics helpers ───────────────────────────────────────────────────────────

def _safe_omega(f: float) -> float:
    """Return ω = 2πf, guarding against f = 0."""
    return 2.0 * np.pi * max(f, 1e-9)


def compute_impedance(
    circuit: str,
    R: float,
    C_F: float,
    L_H: float,
    f: float,
) -> tuple[float, float, float, float, float]:
    """
    Compute reactances, impedance and phase angle for the selected circuit.

    Parameters
    ----------
    circuit : one of 'Pure R', 'RC Series', 'RL Series', 'RLC Series'
    R       : resistance (Ω)
    C_F     : capacitance (F)  — ignored for Pure R / RL
    L_H     : inductance (H)   — ignored for Pure R / RC
    f       : frequency (Hz)

    Returns
    -------
    X_L, X_C, X_net, Z, phi
        X_L  : inductive reactance (Ω)
        X_C  : capacitive reactance (Ω)
        X_net: net reactance X_L − X_C (Ω)
        Z    : total impedance (Ω)
        phi  : phase angle (rad), positive → current lags voltage
    """
    omega = _safe_omega(f)

    if circuit == "Pure R":
        X_L  = 0.0
        X_C  = 0.0
        X_net = 0.0
        Z    = float(R)
        phi  = 0.0

    elif circuit == "RC Series":
        X_L  = 0.0
        X_C  = 1.0 / (omega * C_F) if C_F > 0 else 1e12
        X_net = -X_C
        Z    = np.sqrt(R**2 + X_C**2)
        phi  = -np.arctan2(X_C, R)          # negative → current leads

    elif circuit == "RL Series":
        X_L  = omega * L_H
        X_C  = 0.0
        X_net = X_L
        Z    = np.sqrt(R**2 + X_L**2)
        phi  = np.arctan2(X_L, R)           # positive → current lags

    else:  # RLC Series
        X_L  = omega * L_H
        X_C  = 1.0 / (omega * C_F) if C_F > 0 else 1e12
        X_net = X_L - X_C
        Z    = np.sqrt(R**2 + X_net**2)
        phi  = np.arctan2(X_net, R)

    return X_L, X_C, X_net, Z, phi


@st.cache_data
def compute_sweep(
    circuit: str,
    R: float,
    C_F: float,
    L_H: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Frequency sweep from 1 Hz to 100 kHz (log-spaced).

    Returns
    -------
    f_arr  : frequency array (Hz)
    Z_arr  : impedance array (Ω)
    phi_arr: phase array (rad)
    """
    f_arr = np.logspace(0, 5, N_SWEEP)
    Z_arr   = np.zeros(N_SWEEP)
    phi_arr = np.zeros(N_SWEEP)
    for i, fi in enumerate(f_arr):
        _, _, _, Z_arr[i], phi_arr[i] = compute_impedance(circuit, R, C_F, L_H, fi)
    return f_arr, Z_arr, phi_arr


@st.cache_data
def compute_resonance_curve(
    R: float,
    C_F: float,
    L_H: float,
    V0: float,
) -> tuple[np.ndarray, np.ndarray, float, float, float]:
    """
    I_rms vs frequency for the RLC series circuit.

    Returns
    -------
    f_arr   : frequency array (Hz)
    I_rms_arr: RMS current (A)
    f0      : resonant frequency (Hz)
    Q_factor: quality factor
    bw      : bandwidth Δf = f₀/Q (Hz)
    """
    f_arr = np.logspace(0, 5, N_SWEEP)
    I_rms_arr = np.zeros(N_SWEEP)
    for i, fi in enumerate(f_arr):
        _, _, _, Z, _ = compute_impedance("RLC Series", R, C_F, L_H, fi)
        I_rms_arr[i] = (V0 / np.sqrt(2)) / Z

    # Resonant frequency
    omega0 = 1.0 / np.sqrt(L_H * C_F) if (L_H > 0 and C_F > 0) else 0.0
    f0 = omega0 / (2.0 * np.pi)
    Q_factor = (1.0 / R) * np.sqrt(L_H / C_F) if (L_H > 0 and C_F > 0) else 0.0
    bw = f0 / Q_factor if Q_factor > 0 else 0.0
    return f_arr, I_rms_arr, f0, Q_factor, bw


# ── Plot builders ─────────────────────────────────────────────────────────────

def build_time_series(
    t: np.ndarray,
    v: np.ndarray,
    i_trace: np.ndarray,
    phi: float,
    f: float,
) -> go.Figure:
    """
    Dual y-axis V(t) / I(t) figure with phase-difference shading.

    Parameters
    ----------
    t       : time array (s)
    v       : voltage array (V)
    i_trace : current array (A)
    phi     : phase angle (rad)
    f       : frequency (Hz)

    Returns
    -------
    Plotly Figure
    """
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Voltage trace
    fig.add_trace(
        go.Scatter(
            x=t * 1e3,            # ms for readability
            y=v,
            mode="lines",
            name="V(t)",
            line=dict(color=COLOURS["primary"], width=2.5),
        ),
        secondary_y=False,
    )

    # Current trace
    fig.add_trace(
        go.Scatter(
            x=t * 1e3,
            y=i_trace,
            mode="lines",
            name="I(t)",
            line=dict(color=COLOURS["secondary"], width=2.5),
        ),
        secondary_y=True,
    )

    # Phase-difference shading: shade first half-cycle region where the two
    # signals diverge.  We shade a rectangle from t=0 to t=|φ|/ω.
    T = 1.0 / f
    omega = _safe_omega(f)
    phase_t_ms = abs(phi) / omega * 1e3   # width of shaded stripe in ms

    if abs(phi) > 1e-4:
        fig.add_vrect(
            x0=0.0,
            x1=phase_t_ms,
            fillcolor=COLOURS["highlight"],
            opacity=0.12,
            layer="below",
            line_width=0,
            annotation_text=f"Δt = {phase_t_ms:.3f} ms",
            annotation_position="top right",
            annotation=dict(
                font=dict(color=COLOURS["highlight"], size=10),
            ),
        )

    # Layout
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Voltage & Current vs Time", font=dict(size=14)),
            legend=dict(
                bgcolor="rgba(0,0,0,0.4)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
                x=0.01, y=0.99,
            ),
        )
    )
    fig.update_xaxes(title_text="Time (ms)", **grid_style)
    fig.update_yaxes(
        title_text="Voltage (V)",
        title_font=dict(color=COLOURS["primary"]),
        tickfont=dict(color=COLOURS["primary"]),
        secondary_y=False,
        **grid_style,
    )
    fig.update_yaxes(
        title_text="Current (A)",
        title_font=dict(color=COLOURS["secondary"]),
        tickfont=dict(color=COLOURS["secondary"]),
        secondary_y=True,
        **grid_style,
    )
    return fig


def build_phasor_diagram(
    V0: float,
    I0: float,
    X_L: float,
    X_C: float,
    phi: float,
) -> go.Figure:
    """
    Static phasor diagram at t = 0.

    Voltage reference phasor V_total is drawn horizontally.  All component
    phasors are rotated by −φ relative to that reference so the current phasor
    lies at angle −φ from horizontal.

    Phasors drawn:
      V_R   : I₀·R        at angle −φ  (in phase with current)
      V_L   : I₀·X_L      at angle −φ + 90°
      V_C   : I₀·X_C      at angle −φ − 90°
      V_total: V₀          at angle 0  (reference, horizontal)
      I     : I₀           at angle −φ

    Parameters
    ----------
    V0  : peak voltage (V)
    I0  : peak current (A)
    X_L : inductive reactance (Ω)
    X_C : capacitive reactance (Ω)
    phi : phase angle (rad)

    Returns
    -------
    Plotly Figure with equal-aspect axes
    """
    V_R_mag = I0 * abs(V0 / (V0 / np.sqrt(2) * np.sqrt(2)) * np.sqrt(V0**2 - (I0 * (X_L - X_C))**2))  # noqa
    # Recompute component phasor magnitudes cleanly from circuit quantities
    VR  = I0 * (V0 / np.sqrt((V0)**2) * np.sqrt((V0 / I0)**2 - (X_L - X_C)**2))  # noqa

    # Simpler direct approach: component voltage amplitudes
    mag_VR = I0 * (V0 / (V0 / I0 * I0)) * (V0 / I0 * I0 - 0)   # avoid confusion
    # Cleanest: just use I0 * component
    from_zero = True
    mag_VR    = I0 * np.sqrt(max((V0 / I0)**2 - (X_L - X_C)**2, 0.0))
    # Actually: R = (Z² - X_net²)^0.5 → mag_VR = I0*R; but R may not be available
    # Use: mag_VR = V0 * cos(phi), because V_R = Z*I0*cos(phi) = V0*cos(phi)
    mag_VR = V0 * np.cos(phi)
    mag_VL = I0 * X_L
    mag_VC = I0 * X_C

    # Angles (measured from positive x-axis, counter-clockwise = positive)
    ang_vtot = 0.0                     # V_total is the reference
    ang_i    = -phi                    # current lags V_total by phi
    ang_VR   = -phi                    # V_R in phase with current
    ang_VL   = -phi + np.pi / 2.0     # V_L leads current by 90°
    ang_VC   = -phi - np.pi / 2.0     # V_C lags current by 90°

    def tip(magnitude, angle):
        return magnitude * np.cos(angle), magnitude * np.sin(angle)

    # Scale current phasor to a comparable length: use V0 as reference scale
    # Display I as if its length in V units = I0 * Z = V0
    i_display_mag = V0   # same length as V_total so it's comparable

    phasors = [
        # (label, magnitude_for_display, angle, colour, tip_x, tip_y)
        ("V_total", V0,           ang_vtot, COLOURS["highlight"]),
        ("V_R",     mag_VR,       ang_VR,   COLOURS["primary"]),
        ("V_L",     mag_VL,       ang_VL,   COLOURS["tertiary"]),
        ("V_C",     mag_VC,       ang_VC,   COLOURS["advanced"]),
        ("I (scaled)", i_display_mag, ang_i, COLOURS["secondary"]),
    ]

    fig = go.Figure()

    # Draw each phasor as a line from origin to tip, then a filled arrowhead
    annotations = []
    max_mag = max(V0, mag_VL, mag_VC, 1e-9)

    for label, mag, angle, colour in phasors:
        if mag < 1e-9:
            continue
        tx, ty = tip(mag, angle)
        # Phasor shaft
        fig.add_trace(
            go.Scatter(
                x=[0, tx],
                y=[0, ty],
                mode="lines",
                name=label,
                line=dict(color=colour, width=3),
                showlegend=True,
            )
        )
        # Arrowhead annotation at tip
        annotations.append(dict(
            x=tx,
            y=ty,
            ax=tx * 0.6,
            ay=ty * 0.6,
            xref="x",
            yref="y",
            axref="x",
            ayref="y",
            arrowhead=3,
            arrowsize=1.4,
            arrowwidth=2,
            arrowcolor=colour,
            text=f"<b>{label}</b>",
            font=dict(color=colour, size=10),
            showarrow=True,
            bgcolor="rgba(0,0,0,0.45)",
            bordercolor=colour,
            borderwidth=1,
            xanchor="left",
            yanchor="middle",
        ))

    # Origin marker
    fig.add_trace(
        go.Scatter(
            x=[0], y=[0],
            mode="markers",
            marker=dict(color=COLOURS["text"], size=6),
            showlegend=False,
        )
    )

    # Axis range: symmetric about origin
    r = max_mag * 1.35
    grid_style = dict(
        gridcolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        zeroline=True,
        zerolinewidth=1,
    )
    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="Phasor Diagram (t = 0 reference)", font=dict(size=14)),
            xaxis=dict(
                range=[-r, r],
                title="Re (V)",
                scaleanchor="y",
                scaleratio=1,
                **grid_style,
            ),
            yaxis=dict(
                range=[-r, r],
                title="Im (V)",
                **grid_style,
            ),
            annotations=annotations,
            showlegend=True,
        )
    )
    return fig


def build_bode(
    f_arr: np.ndarray,
    Z_arr: np.ndarray,
    phi_arr: np.ndarray,
    f_current: float,
    Z_current: float,
    phi_current: float,
) -> go.Figure:
    """
    Two-row Bode plot: |Z| vs f (log-log) and φ vs f (log-linear).

    Parameters
    ----------
    f_arr     : sweep frequency array (Hz)
    Z_arr     : sweep impedance array (Ω)
    phi_arr   : sweep phase array (rad)
    f_current : current operating frequency (Hz)
    Z_current : impedance at current frequency (Ω)
    phi_current: phase at current frequency (rad)

    Returns
    -------
    Plotly Figure with 2 rows
    """
    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.10,
        subplot_titles=["|Z| vs Frequency", "Phase φ vs Frequency"],
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])

    # Row 1: |Z|
    fig.add_trace(
        go.Scatter(
            x=f_arr, y=Z_arr,
            mode="lines",
            name="|Z| (Ω)",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        row=1, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=[f_current], y=[Z_current],
            mode="markers",
            name=f"f = {f_current} Hz",
            marker=dict(color=COLOURS["highlight"], size=10, symbol="diamond"),
        ),
        row=1, col=1,
    )

    # Row 2: φ in degrees
    fig.add_trace(
        go.Scatter(
            x=f_arr, y=np.degrees(phi_arr),
            mode="lines",
            name="φ (°)",
            line=dict(color=COLOURS["secondary"], width=2),
        ),
        row=2, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=[f_current], y=[np.degrees(phi_current)],
            mode="markers",
            name=f"φ = {np.degrees(phi_current):.1f}°",
            marker=dict(color=COLOURS["highlight"], size=10, symbol="diamond"),
            showlegend=True,
        ),
        row=2, col=1,
    )

    # Vertical dashed lines at current frequency
    fig.add_vline(
        x=f_current, line_dash="dash",
        line_color=COLOURS["highlight"], line_width=1.2,
        opacity=0.75,
    )

    fig.update_layout(
        **plotly_layout(
            height=500,
            showlegend=True,
        )
    )
    # Log-log for |Z|
    fig.update_xaxes(type="log", **grid_style)
    fig.update_yaxes(
        type="log", title="Impedance |Z| (Ω)", **grid_style,
        row=1, col=1,
    )
    fig.update_yaxes(
        title="Phase φ (°)", **grid_style,
        row=2, col=1,
    )
    fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
    return fig


def build_resonance_curve(
    f_arr: np.ndarray,
    I_rms_arr: np.ndarray,
    f0: float,
    Q_factor: float,
    bw: float,
    f_current: float,
    R: float,
    C_F: float,
    L_H: float,
    V0: float,
) -> go.Figure:
    """
    I_rms vs frequency resonance curve with peak annotation and ±3 dB bandwidth.

    Parameters
    ----------
    f_arr    : sweep frequency array (Hz)
    I_rms_arr: RMS current at each sweep frequency (A)
    f0       : resonant frequency (Hz)
    Q_factor : quality factor
    bw       : −3 dB bandwidth Δf (Hz)
    f_current: current operating frequency marker
    R, C_F, L_H, V0: circuit parameters for display

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()
    I_peak = float(np.max(I_rms_arr))

    fig.add_trace(
        go.Scatter(
            x=f_arr, y=I_rms_arr,
            mode="lines",
            name="I_rms",
            line=dict(color=COLOURS["primary"], width=2.5),
        )
    )

    # −3 dB level
    I_3dB = I_peak / np.sqrt(2)
    fig.add_hline(
        y=I_3dB,
        line_dash="dot",
        line_color=COLOURS["advanced"],
        opacity=0.8,
        annotation_text="−3 dB",
        annotation_position="right",
        annotation_font=dict(color=COLOURS["advanced"], size=10),
    )

    # Mark −3 dB bandwidth frequencies
    if bw > 0 and f0 > 0:
        f_lo = f0 - bw / 2.0
        f_hi = f0 + bw / 2.0
        for f_bw, label in [(f_lo, "f₋"), (f_hi, "f₊")]:
            if f_bw > 0:
                fig.add_vline(
                    x=f_bw,
                    line_dash="dot",
                    line_color=COLOURS["advanced"],
                    opacity=0.6,
                )

    # Resonance peak marker
    if f0 > 0:
        fig.add_vline(
            x=f0,
            line_dash="dash",
            line_color=COLOURS["tertiary"],
            line_width=1.5,
        )
        fig.add_annotation(
            x=np.log10(f0),
            y=I_peak,
            xref="x",
            yref="y",
            text=(
                f"<b>f₀ = {f0:.1f} Hz</b><br>"
                f"I_peak = {I_peak:.4f} A<br>"
                f"Q = {Q_factor:.2f}<br>"
                f"Δf = {bw:.1f} Hz"
            ),
            showarrow=True,
            arrowhead=2,
            arrowcolor=COLOURS["tertiary"],
            font=dict(color=COLOURS["tertiary"], size=11),
            bgcolor="rgba(0,0,0,0.6)",
            bordercolor=COLOURS["tertiary"],
            borderwidth=1,
            ax=40, ay=-60,
        )

    # Current frequency marker
    fig.add_vline(
        x=f_current,
        line_dash="dash",
        line_color=COLOURS["highlight"],
        line_width=1.5,
        opacity=0.8,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="RLC Resonance Curve", font=dict(size=14)),
            xaxis=dict(type="log", title="Frequency (Hz)", **grid_style),
            yaxis=dict(title="I_rms (A)", **grid_style),
            showlegend=False,
        )
    )
    return fig


def build_power_plot(
    t: np.ndarray,
    v: np.ndarray,
    i_trace: np.ndarray,
    P_mean: float,
) -> go.Figure:
    """
    Instantaneous power p(t) = v(t)·i(t) with mean-power reference line.

    Parameters
    ----------
    t       : time array (s)
    v       : voltage array (V)
    i_trace : current array (A)
    P_mean  : mean (real) power (W)

    Returns
    -------
    Plotly Figure
    """
    p = v * i_trace

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=t * 1e3,
            y=p,
            mode="lines",
            name="p(t) = v·i",
            line=dict(color=COLOURS["tertiary"], width=2),
        )
    )
    fig.add_hline(
        y=P_mean,
        line_dash="dash",
        line_color=COLOURS["highlight"],
        line_width=2,
        annotation_text=f"<P> = {P_mean:.4f} W",
        annotation_position="right",
        annotation_font=dict(color=COLOURS["highlight"], size=11),
    )
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=340,
            title=dict(text="Instantaneous Power p(t)", font=dict(size=14)),
            xaxis=dict(title="Time (ms)", **grid_style),
            yaxis=dict(title="Power (W)", **grid_style),
            showlegend=True,
        )
    )
    return fig


def build_lissajous(
    v: np.ndarray,
    i_trace: np.ndarray,
    phi: float,
) -> go.Figure:
    """
    Lissajous figure: I vs V parametric curve (ellipse).

    For in-phase signals: straight line (pure R).
    For 90° phase: circle (pure reactance).
    General: tilted ellipse.
    Area enclosed ∝ reactive power.

    Parameters
    ----------
    v       : voltage array (V)
    i_trace : current array (A)
    phi     : phase angle (rad)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=v,
            y=i_trace,
            mode="lines",
            name="I vs V",
            line=dict(color=COLOURS["primary"], width=2, dash="solid"),
        )
    )
    # Mark the start point
    fig.add_trace(
        go.Scatter(
            x=[v[0]], y=[i_trace[0]],
            mode="markers",
            name="t = 0",
            marker=dict(color=COLOURS["highlight"], size=10, symbol="circle"),
        )
    )
    grid_style = dict(
        gridcolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        zeroline=True,
    )
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(
                text=f"Lissajous Figure  (φ = {np.degrees(phi):.1f}°)",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Voltage V (V)",
                scaleanchor="y",
                scaleratio=1,
                **grid_style,
            ),
            yaxis=dict(title="Current I (A)", **grid_style),
            showlegend=True,
        )
    )
    return fig


# ── Sidebar controls ──────────────────────────────────────────────────────────


def render_sidebar() -> dict:
    """
    Render all sidebar controls.

    Returns
    -------
    dict containing all user-selected parameter values.
    """
    with st.sidebar:
        sim_header("〜 AC Circuits", SPEC_REF)

        mode = mode_toggle()

        st.divider()
        st.markdown("### Circuit")
        circuit = st.selectbox(
            "Circuit type",
            ["Pure R", "RC Series", "RL Series", "RLC Series"],
            index=0,
            help="Select which series circuit to simulate.",
        )

        st.divider()
        st.markdown("### Source")

        V0 = st.slider(
            "Peak voltage V₀ (V)",
            min_value=1,
            max_value=100,
            value=10,
            step=1,
            help="Peak (amplitude) of the sinusoidal supply voltage.",
        )

        f = st.select_slider(
            "Frequency f (Hz)",
            options=FREQ_OPTIONS,
            value=50,
            help="Supply frequency. Covers mains (50 Hz) to RF range.",
        )

        st.divider()
        st.markdown("### Components")

        R = st.slider(
            "Resistance R (Ω)",
            min_value=1,
            max_value=10_000,
            value=1_000,
            step=1,
            help="Series resistance.",
        )

        C_uF = None
        L_mH = None

        if circuit in ("RC Series", "RLC Series"):
            C_uF = st.select_slider(
                "Capacitance C (μF)",
                options=C_OPTIONS_UF,
                value=10,
                help="Series capacitance. X_C = 1/(ωC).",
            )

        if circuit in ("RL Series", "RLC Series"):
            L_mH = st.select_slider(
                "Inductance L (mH)",
                options=L_OPTIONS_MH,
                value=100,
                help="Series inductance. X_L = ωL.",
            )

        # Advanced controls live in sidebar (after advanced_divider) so they
        # are accessible even if the mode toggle is in the sidebar header area.
        show_bode       = False
        show_resonance  = False
        show_power      = False
        show_lissajous  = False

        if mode == "Advanced":
            advanced_divider()

            st.markdown("**Frequency sweep**")
            show_bode = st.checkbox(
                "Show impedance vs frequency (Bode)",
                value=False,
                help="Sweep 1 Hz – 100 kHz and plot |Z| and φ.",
            )

            if circuit == "RLC Series":
                st.markdown("**Resonance**")
                show_resonance = st.checkbox(
                    "Show RLC resonance curve",
                    value=False,
                    help="Plot I_rms vs f, mark f₀ and ±3 dB bandwidth.",
                )

            st.markdown("**Power analysis**")
            show_power = st.checkbox(
                "Show power analysis",
                value=False,
                help="Plot p(t) and show power triangle.",
            )

            st.markdown("**Oscilloscope**")
            show_lissajous = st.checkbox(
                "Show Lissajous figure",
                value=False,
                help=(
                    "Plot I vs V parametrically — an ellipse whose tilt and "
                    "shape encode the phase angle."
                ),
            )

        return dict(
            mode=mode,
            circuit=circuit,
            V0=float(V0),
            f=float(f),
            R=float(R),
            C_uF=float(C_uF) if C_uF is not None else 10.0,
            L_mH=float(L_mH) if L_mH is not None else 100.0,
            show_bode=show_bode,
            show_resonance=show_resonance,
            show_power=show_power,
            show_lissajous=show_lissajous,
        )


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full simulation page."""
    params = render_sidebar()

    mode    = params["mode"]
    circuit = params["circuit"]
    V0      = params["V0"]
    f       = params["f"]
    R       = params["R"]
    C_F     = params["C_uF"] * 1e-6
    L_H     = params["L_mH"] * 1e-3

    # ── Core circuit computation ───────────────────────────────────────────────
    X_L, X_C, X_net, Z, phi = compute_impedance(circuit, R, C_F, L_H, f)

    I0      = V0 / Z
    I_rms   = I0 / np.sqrt(2)
    V_rms   = V0 / np.sqrt(2)
    P_mean  = V_rms * I_rms * np.cos(phi)

    # ── Time arrays (3 periods) ────────────────────────────────────────────────
    T = 1.0 / f
    omega = _safe_omega(f)
    t = np.linspace(0.0, 3.0 * T, N_TIME)
    v        = V0 * np.sin(omega * t)
    i_trace  = I0 * np.sin(omega * t - phi)

    # ── Main columns ──────────────────────────────────────────────────────────
    left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

    # The left column is empty here because all controls are in the sidebar.
    # We use it for the circuit-info summary card instead.
    with left_col:
        st.markdown("#### Circuit summary")

        # Impedance triangle info box
        circuit_info = (
            f"**Circuit:** {circuit}  \n"
            f"**f** = {f} Hz  \n"
            f"**ω** = {omega:.2f} rad/s  \n"
        )
        if circuit != "Pure R":
            circuit_info += f"**T** = {T * 1e3:.3f} ms  \n"
        st.info(circuit_info)

        # Show dominant behaviour note
        if circuit == "RC Series":
            f_char = 1.0 / (2 * np.pi * R * C_F)
            if f < f_char:
                st.caption(f"f ≪ f_c = {f_char:.1f} Hz → capacitive (high X_C)")
            elif f > f_char:
                st.caption(f"f ≫ f_c = {f_char:.1f} Hz → resistive (low X_C)")
            else:
                st.caption(f"f ≈ f_c = {f_char:.1f} Hz → X_C = R")

        elif circuit == "RL Series":
            f_char = R / (2 * np.pi * L_H)
            if f < f_char:
                st.caption(f"f ≪ f_c = {f_char:.1f} Hz → resistive (low X_L)")
            elif f > f_char:
                st.caption(f"f ≫ f_c = {f_char:.1f} Hz → inductive (high X_L)")
            else:
                st.caption(f"f ≈ f_c = {f_char:.1f} Hz → X_L = R")

        elif circuit == "RLC Series":
            omega0 = 1.0 / np.sqrt(L_H * C_F) if L_H * C_F > 0 else 0.0
            f0 = omega0 / (2 * np.pi)
            if f0 > 0:
                if abs(f - f0) / f0 < 0.05:
                    st.success(f"Near resonance! f₀ = {f0:.1f} Hz")
                elif f < f0:
                    st.caption(f"f < f₀ = {f0:.1f} Hz → capacitive regime")
                else:
                    st.caption(f"f > f₀ = {f0:.1f} Hz → inductive regime")

        st.markdown("---")
        st.markdown("**Phase:**")
        phi_deg = np.degrees(phi)
        if abs(phi_deg) < 1.0:
            st.caption("Current & voltage **in phase** (purely resistive).")
        elif phi_deg > 0:
            st.caption(f"Current **lags** voltage by **{phi_deg:.1f}°** (inductive).")
        else:
            st.caption(f"Current **leads** voltage by **{abs(phi_deg):.1f}°** (capacitive).")

        if mode == "Advanced":
            advanced_divider()
            S  = V_rms * I_rms               # apparent power
            Q_react = V_rms * I_rms * abs(np.sin(phi))  # reactive power
            pf = np.cos(phi)

            st.markdown("**Power triangle**")
            st.metric("Apparent power S", f"{S:.4f} VA")
            st.metric("Real power P", f"{P_mean:.4f} W")
            st.metric("Reactive power Q", f"{Q_react:.4f} VAR")
            st.metric("Power factor cos φ", f"{pf:.4f}")

            if circuit == "RLC Series" and L_H > 0 and C_F > 0:
                Q_factor = (1.0 / R) * np.sqrt(L_H / C_F)
                st.markdown("**Quality factor**")
                st.metric("Q factor", f"{Q_factor:.3f}")

    with right_col:
        # Page title
        st.title("〜 AC Circuits")
        st.caption(f"WJEC Eduqas A Level Physics — {SPEC_REF}")

        # ── Metrics row ────────────────────────────────────────────────────────
        metric_row({
            "X_L":    f"{X_L:.2f} Ω",
            "X_C":    f"{X_C:.2f} Ω",
            "Z":      f"{Z:.2f} Ω",
            "Phase φ": f"{phi_deg:.1f}°",
            "I_rms":  f"{I_rms:.4f} A",
            "P_mean": f"{P_mean:.4f} W",
        })

        st.markdown("")

        # ── Plot 1: V(t) and I(t) ─────────────────────────────────────────────
        fig_time = build_time_series(t, v, i_trace, phi, f)
        st.plotly_chart(fig_time, use_container_width=True)

        # ── Plot 2: Phasor diagram ─────────────────────────────────────────────
        fig_phasor = build_phasor_diagram(V0, I0, X_L, X_C, phi)
        st.plotly_chart(fig_phasor, use_container_width=True)

        # ── Advanced plots ─────────────────────────────────────────────────────
        if mode == "Advanced":

            # ── Bode plot ─────────────────────────────────────────────────────
            if params["show_bode"]:
                with st.expander("⚗️ Impedance vs Frequency (Bode)", expanded=True):
                    f_arr, Z_arr, phi_arr = compute_sweep(circuit, R, C_F, L_H)
                    fig_bode = build_bode(f_arr, Z_arr, phi_arr, f, Z, phi)
                    st.plotly_chart(fig_bode, use_container_width=True)

            # ── RLC Resonance curve ───────────────────────────────────────────
            if params["show_resonance"] and circuit == "RLC Series":
                with st.expander("⚗️ RLC Resonance Curve", expanded=True):
                    f_arr_r, I_rms_arr, f0, Q_factor, bw = compute_resonance_curve(
                        R, C_F, L_H, V0
                    )

                    # Allow varying R to show Q sharpening
                    R_res = st.slider(
                        "Resistance R for resonance curve (Ω)",
                        min_value=1,
                        max_value=10_000,
                        value=int(R),
                        step=1,
                        key="R_resonance",
                        help=(
                            "Change R to see how it broadens or sharpens the "
                            "resonance peak. Lower R → higher Q → sharper peak."
                        ),
                    )
                    if R_res != R:
                        # Recompute with different R
                        f_arr_r, I_rms_arr, f0, Q_factor, bw = compute_resonance_curve(
                            float(R_res), C_F, L_H, V0
                        )

                    fig_res = build_resonance_curve(
                        f_arr_r, I_rms_arr, f0, Q_factor, bw,
                        f, float(R_res), C_F, L_H, V0,
                    )
                    st.plotly_chart(fig_res, use_container_width=True)

                    col_r1, col_r2 = st.columns(2)
                    col_r1.metric("Resonant frequency f₀", f"{f0:.2f} Hz")
                    col_r2.metric("Q factor", f"{Q_factor:.3f}")
                    col_r1.metric("Bandwidth Δf", f"{bw:.2f} Hz")
                    col_r2.metric("Min impedance (=R)", f"{float(R_res):.0f} Ω")

            # ── Power analysis ─────────────────────────────────────────────────
            if params["show_power"]:
                with st.expander("⚗️ Power Analysis", expanded=True):
                    fig_pow = build_power_plot(t, v, i_trace, P_mean)
                    st.plotly_chart(fig_pow, use_container_width=True)

                    S_app   = V_rms * I_rms
                    Q_react = V_rms * I_rms * abs(np.sin(phi))
                    pf      = np.cos(phi)

                    st.markdown("**Power triangle:**")
                    metric_row({
                        "S (apparent)": f"{S_app:.4f} VA",
                        "P (real)":     f"{P_mean:.4f} W",
                        "Q (reactive)": f"{Q_react:.4f} VAR",
                        "cos φ":        f"{pf:.4f}",
                    })
                    st.latex(
                        r"S^2 = P^2 + Q^2 \qquad "
                        r"\cos\phi = \frac{P}{S}"
                    )
                    st.info(
                        f"Power factor = {pf:.4f}.  "
                        "A power factor of 1 means all supplied energy is "
                        "dissipated as heat. A power factor of 0 means all "
                        "energy is stored and returned (no dissipation).",
                        icon="ℹ️",
                    )

            # ── Lissajous / oscilloscope ───────────────────────────────────────
            if params["show_lissajous"]:
                with st.expander("⚗️ Lissajous Figure (Oscilloscope)", expanded=True):
                    fig_liss = build_lissajous(v, i_trace, phi)
                    st.plotly_chart(fig_liss, use_container_width=True)
                    st.caption(
                        "The Lissajous ellipse tilt encodes the phase angle φ. "
                        "Pure R → straight diagonal line (φ = 0). "
                        "Pure L or C → vertical/horizontal ellipse (φ = ±90°). "
                        "The area enclosed by the ellipse is proportional to "
                        "the reactive (stored) power."
                    )

        # ── Physics notes ──────────────────────────────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"V = V_0 \sin(\omega t)",
                r"I = I_0 \sin(\omega t - \phi)",
                r"Z = \sqrt{R^2 + (X_L - X_C)^2}",
                r"X_L = \omega L",
                r"X_C = \frac{1}{\omega C}",
                r"f_0 = \frac{1}{2\pi\sqrt{LC}}",
            ],
            explanation=(
                "In a pure resistor, voltage and current are in phase. "
                "An inductor causes current to lag voltage by 90° (it resists "
                "changes in current). A capacitor causes current to lead voltage "
                "by 90° (it stores charge). In RLC circuits, X_L and X_C "
                "partially cancel, and resonance occurs when X_L = X_C."
            ),
            advanced_text=(
                "At resonance f₀, impedance is minimum (=R) and current is "
                "maximum. Q = (1/R)√(L/C) determines sharpness: high Q → "
                "narrow bandwidth, sensitive to frequency. Power factor "
                "cos(φ) = P/S: resistors have power factor 1, pure reactors "
                "have power factor 0. Transformers exploit inductance at AC "
                "frequency."
            ),
            mode=mode,
        )


# ── Run ───────────────────────────────────────────────────────────────────────

main()
