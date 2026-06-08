"""
Capacitor Charge & Discharge — WJEC Eduqas A Level Physics.

Simulates Q(t), V(t) and I(t) for an RC circuit in both charging and
discharging modes.  Advanced mode adds a ln(V) linearisation plot, a
series/parallel capacitor builder, an energy Q–V graph and a leaky
capacitor overlay.

Spec reference: Component 2, Topic 4 (Capacitance), sections (i) and (j).
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components
from plotly.subplots import make_subplots

from utils import physics  # noqa: F401 — constants available if needed
from utils.exam_ui import show_exam_panel
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
    page_title="Capacitor Charge & Discharge — WJEC Physics",
    page_icon="⚡",
    layout="wide",
)

# ── Constants / catalogue ─────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 4 (Capacitance), sections (i) and (j)"
N_TIME_POINTS = 500          # number of time samples across 0 → 6τ
TAU_MULTIPLES = 6            # simulate up to 6τ
DASHED_TAU_MARKERS = [1, 2, 5]  # vertical dashed lines at τ, 2τ, 5τ

# Resistance select-slider options (Ω) and their display labels
R_OPTIONS_OHM: list[int] = [
    100, 200, 500, 1_000, 2_000, 5_000,
    10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000,
]


def _format_resistance(r_ohm: int) -> str:
    """Return a human-readable resistance string (e.g. '1 kΩ', '1 MΩ')."""
    if r_ohm >= 1_000_000:
        val = r_ohm / 1_000_000
        label = f"{val:g} MΩ"
    elif r_ohm >= 1_000:
        val = r_ohm / 1_000
        label = f"{val:g} kΩ"
    else:
        label = f"{r_ohm} Ω"
    return label


R_LABELS: list[str] = [_format_resistance(r) for r in R_OPTIONS_OHM]

# ── Physics computations ──────────────────────────────────────────────────────


@st.cache_data
def compute_rc_curves(
    C_F: float,
    R_ohm: float,
    V0: float,
    mode: str,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float]:
    """
    Compute Q(t), V(t) and I(t) for an RC circuit.

    Parameters
    ----------
    C_F   : capacitance in Farads
    R_ohm : series resistance in Ohms
    V0    : initial / supply voltage in Volts
    mode  : 'Charging' or 'Discharging'

    Returns
    -------
    t     : time array (s), shape (N_TIME_POINTS,)
    Q_uC  : charge array (μC)
    V_V   : voltage array (V)
    I_mA  : current array (mA)
    tau   : time constant RC (s)
    """
    tau = R_ohm * C_F
    t = np.linspace(0.0, TAU_MULTIPLES * tau, N_TIME_POINTS)
    exp_decay = np.exp(-t / tau)

    if mode == "Discharging":
        V_V = V0 * exp_decay
        I_mA = (V0 / R_ohm) * exp_decay * 1e3          # A → mA
    else:  # Charging
        V_V = V0 * (1.0 - exp_decay)
        I_mA = (V0 / R_ohm) * exp_decay * 1e3

    Q_uC = C_F * V_V * 1e6                              # C → μC
    return t, Q_uC, V_V, I_mA, tau


@st.cache_data
def compute_leaky_discharge(
    C_F: float,
    R_ohm: float,
    R_leak_ohm: float,
    V0: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute V(t) for discharge with a leakage resistance R_leak in parallel with C.

    With R_series in series and R_leak in parallel with C the KCL at the
    capacitor node gives:

        C dV/dt = -V/R_leak - V/R_series   →   dV/dt = -V/τ_eff

    where τ_eff = R_series · R_leak · C / (R_series + R_leak).

    Parameters
    ----------
    C_F        : capacitance (F)
    R_ohm      : series resistance (Ω)
    R_leak_ohm : leakage resistance (Ω), in parallel with C
    V0         : initial voltage (V)

    Returns
    -------
    t         : time array (s) spanning 6 × the *ideal* tau
    V_leaky   : voltage array (V) for leaky capacitor
    """
    tau_ideal = R_ohm * C_F
    tau_eff = R_ohm * R_leak_ohm * C_F / (R_ohm + R_leak_ohm)
    t = np.linspace(0.0, TAU_MULTIPLES * tau_ideal, N_TIME_POINTS)
    V_leaky = V0 * np.exp(-t / tau_eff)
    return t, V_leaky


@st.cache_data
def polyfit_ln_v(
    t: np.ndarray,
    V_V: np.ndarray,
) -> tuple[np.ndarray, float, float]:
    """
    Compute ln(V(t)) and fit a straight line via np.polyfit.

    Parameters
    ----------
    t   : time array (s)
    V_V : voltage array (V) — must be strictly positive

    Returns
    -------
    ln_V   : natural log of voltage array
    grad   : slope of best-fit line (s⁻¹), should equal -1/τ
    intercept : y-intercept of best-fit line
    """
    # Guard against V ≤ 0 (e.g. at t=0 for charging from 0)
    valid = V_V > 0.0
    ln_V = np.where(valid, np.log(np.where(valid, V_V, 1.0)), np.nan)
    if np.sum(valid) > 1:
        grad, intercept = np.polyfit(t[valid], ln_V[valid], 1)
    else:
        grad, intercept = 0.0, 0.0
    return ln_V, grad, intercept


# ── Plot builders ─────────────────────────────────────────────────────────────


def _add_tau_vlines(
    fig: go.Figure,
    tau: float,
    t_max: float,
    row: int,
    mode: str,
) -> None:
    """
    Add vertical dashed lines at τ, 2τ and 5τ to a subplot row.

    Parameters
    ----------
    fig   : Plotly figure
    tau   : time constant (s)
    t_max : maximum time on x-axis (s)
    row   : subplot row index (1-based)
    mode  : 'Charging' or 'Discharging' (controls τ annotation text)
    """
    tau_label_text = "V = 63.2% V₀" if mode == "Charging" else "V = 36.8% V₀"
    markers = [
        (1, f"τ = RC\n{tau_label_text}", "top right"),
        (2, "2τ", "top right"),
        (5, "5τ ≈ fully\ncharged" if mode == "Charging" else "5τ ≈ fully\ndischarged", "top right"),
    ]
    for mult, label, _ in markers:
        t_vline = mult * tau
        if t_vline > t_max:
            continue
        fig.add_vline(
            x=t_vline,
            line_dash="dash",
            line_color=COLOURS["highlight"],
            line_width=1,
            opacity=0.6,
            row=row,
            col=1,
        )
        # Annotation on row 1 only to avoid clutter
        if row == 1:
            fig.add_annotation(
                x=t_vline,
                y=1.0,
                yref="paper",
                text=label,
                showarrow=False,
                xanchor="left",
                font=dict(size=9, color=COLOURS["highlight"]),
                bgcolor="rgba(0,0,0,0.4)",
            )


def build_main_figure(
    t: np.ndarray,
    Q_uC: np.ndarray,
    V_V: np.ndarray,
    I_mA: np.ndarray,
    tau: float,
    mode: str,
    show_ln: bool,
    ln_V: np.ndarray | None,
    grad: float,
    intercept: float,
    V_leaky: np.ndarray | None,
) -> go.Figure:
    """
    Build the main Q/V/I (and optional ln V) subplot figure.

    Parameters
    ----------
    t          : time array (s)
    Q_uC       : charge (μC)
    V_V        : voltage (V)
    I_mA       : current (mA)
    tau        : time constant (s)
    mode       : 'Charging' or 'Discharging'
    show_ln    : whether to add a 4th ln(V) subplot
    ln_V       : ln(V) array — required if show_ln is True
    grad       : polyfit gradient (s⁻¹)
    intercept  : polyfit intercept
    V_leaky    : leaky-capacitor voltage array, or None

    Returns
    -------
    Plotly Figure with 3 or 4 rows.
    """
    n_rows = 4 if show_ln else 3
    subplot_titles = ["Charge Q (μC)", "Voltage V (V)", "Current I (mA)"]
    if show_ln:
        subplot_titles.append("ln(V) vs t — linearity check")

    fig = make_subplots(
        rows=n_rows,
        cols=1,
        shared_xaxes=True,
        subplot_titles=subplot_titles,
        vertical_spacing=0.07,
    )
    fig.update_layout(**plotly_layout(
        height=150 + n_rows * 180,
        showlegend=True,
        xaxis=dict(title="Time (s)", gridcolor=COLOURS["grid"]),
        margin=dict(l=70, r=30, t=60, b=60),
    ))

    t_max = t[-1]

    # ── Row 1 : Q(t) ──────────────────────────────────────────────────────────
    fig.add_trace(
        go.Scatter(
            x=t, y=Q_uC,
            mode="lines",
            line=dict(color=COLOURS["primary"], width=2),
            name="Q(t)",
        ),
        row=1, col=1,
    )

    # ── Row 2 : V(t) ──────────────────────────────────────────────────────────
    fig.add_trace(
        go.Scatter(
            x=t, y=V_V,
            mode="lines",
            line=dict(color=COLOURS["secondary"], width=2),
            name="V(t)",
        ),
        row=2, col=1,
    )
    if V_leaky is not None:
        fig.add_trace(
            go.Scatter(
                x=t, y=V_leaky,
                mode="lines",
                line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
                name="V(t) leaky",
            ),
            row=2, col=1,
        )

    # ── Row 3 : I(t) ──────────────────────────────────────────────────────────
    fig.add_trace(
        go.Scatter(
            x=t, y=I_mA,
            mode="lines",
            line=dict(color=COLOURS["tertiary"], width=2),
            name="I(t)",
        ),
        row=3, col=1,
    )

    # ── Tau vertical lines (on each row) ─────────────────────────────────────
    for row in range(1, n_rows + 1):
        _add_tau_vlines(fig, tau, t_max, row, mode)

    # ── Row 4 : ln(V) (optional) ─────────────────────────────────────────────
    if show_ln and ln_V is not None:
        fit_line = grad * t + intercept
        fig.add_trace(
            go.Scatter(
                x=t, y=ln_V,
                mode="lines",
                line=dict(color=COLOURS["secondary"], width=2),
                name="ln V (data)",
            ),
            row=4, col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=t, y=fit_line,
                mode="lines",
                line=dict(color=COLOURS["highlight"], width=1, dash="dash"),
                name="Best-fit line",
            ),
            row=4, col=1,
        )
        # Annotation showing gradient
        fig.add_annotation(
            x=t_max * 0.55,
            y=float(np.nanmin(ln_V) + 0.15 * (np.nanmax(ln_V) - np.nanmin(ln_V))),
            xref=f"x{n_rows}", yref=f"y{n_rows}",
            text=(
                f"Gradient = {grad:.4f} s⁻¹<br>"
                f"(= −1/RC = {-1 / (tau):.4f})"
            ),
            showarrow=False,
            font=dict(size=10, color=COLOURS["highlight"]),
            bgcolor="rgba(0,0,0,0.5)",
            bordercolor=COLOURS["highlight"],
            borderwidth=1,
        )

    # ── Axis labels (each row gets its own y-title) ────────────────────────────
    axis_labels = {
        "yaxis":  "Q (μC)",
        "yaxis2": "V (V)",
        "yaxis3": "I (mA)",
    }
    if show_ln:
        axis_labels["yaxis4"] = "ln(V / V)"
    for axis, label in axis_labels.items():
        fig.update_layout(**{axis: dict(title=label, gridcolor=COLOURS["grid"])})

    # shared x label on the bottom axis
    bottom_x = f"xaxis{n_rows}" if n_rows > 1 else "xaxis"
    fig.update_layout(**{bottom_x: dict(title="Time (s)", gridcolor=COLOURS["grid"])})

    return fig


def build_energy_qv_figure(
    C_F: float,
    V0: float,
) -> go.Figure:
    """
    Build a Q–V plot shading the triangle to show U = ½QV = ½CV².

    Parameters
    ----------
    C_F : capacitance (F)
    V0  : voltage (V)

    Returns
    -------
    Plotly Figure
    """
    Q0_uC = C_F * V0 * 1e6       # μC
    U_J = 0.5 * C_F * V0 ** 2   # J

    Q_arr = np.array([0.0, Q0_uC])
    V_arr = np.array([0.0, V0])

    fig = make_fig(rows=1, cols=1)
    # Shaded triangle (fill to zero — y=0 axis)
    fig.add_trace(
        go.Scatter(
            x=Q_arr,
            y=V_arr,
            fill="tozeroy",
            fillcolor=f"rgba({int(COLOURS['primary'][1:3], 16)},"
                      f"{int(COLOURS['primary'][3:5], 16)},"
                      f"{int(COLOURS['primary'][5:7], 16)},0.25)",
            mode="lines",
            line=dict(color=COLOURS["primary"], width=2),
            name="Q–V line",
        )
    )
    fig.add_annotation(
        x=Q0_uC * 0.45,
        y=V0 * 0.55,
        text=f"U = ½CV² = {U_J * 1e6:.2f} μJ",
        showarrow=False,
        font=dict(size=12, color=COLOURS["text"]),
        bgcolor="rgba(0,0,0,0.5)",
        bordercolor=COLOURS["primary"],
        borderwidth=1,
    )
    fig.update_layout(
        **plotly_layout(
            height=340,
            xaxis=dict(title="Charge Q (μC)", gridcolor=COLOURS["grid"]),
            yaxis=dict(title="Voltage V (V)", gridcolor=COLOURS["grid"]),
            showlegend=False,
            title="Energy stored: area of Q–V triangle = U = ½QV",
        )
    )
    return fig


# ── Sidebar controls ──────────────────────────────────────────────────────────


def render_sidebar() -> dict:
    """
    Render all sidebar controls and return a dict of resolved parameters.

    Returns
    -------
    dict with keys:
        mode, circuit_mode, C_F, R_ohm, V0,
        show_ln, use_c_total, c_total_F,
        cap_combo, c1_uF, c2_uF, c3_uF,
        add_leakage, R_leak_ohm
    """
    sim_header(
        "⚡ Capacitor Charge & Discharge",
        SPEC_REF,
    )

    mode = mode_toggle()

    st.divider()
    st.markdown("### Circuit parameters")

    # ── Real-world application presets (Basic mode) ───────────────────────
    PRESETS: dict = {
        "Custom": None,
        "Camera flash": {
            "C_uF": 4700, "R_ohm": 100, "V0": 330.0,
            "info": lambda C_F, R, V0, tau: (
                f"Stores {0.5 * C_F * V0**2:.1f} J, discharges in "
                f"{5 * tau * 1000:.0f} ms. Most of that energy becomes the flash of light!"
            ),
        },
        "Defibrillator": {
            "C_uF": 150, "R_ohm": 50, "V0": 2000.0,
            "info": lambda C_F, R, V0, tau: (
                f"Stores {0.5 * C_F * V0**2:.1f} J "
                f"≈ a {0.5 * C_F * V0**2 / 4.184:.2f} calorie. "
                "Delivers a controlled shock to reset the heart rhythm."
            ),
        },
        "Power supply smoother": {
            "C_uF": 1000, "R_ohm": 10, "V0": 12.0,
            "info": lambda C_F, R, V0, tau: (
                "Smoothing capacitor: charges during each AC half-cycle, "
                f"discharges between peaks. τ = {tau * 1000:.1f} ms must be >> "
                "1/f_mains = 20 ms."
            ),
        },
        "Audio crossover (tweeter)": {
            "C_uF": 10, "R_ohm": 8, "V0": 5.0,
            "info": lambda C_F, R, V0, tau: (
                "High-pass filter for tweeters. Frequencies above "
                f"f_c = 1/(2πRC) = {1 / (2 * np.pi * R * C_F):.0f} Hz are passed; "
                "lower frequencies are blocked."
            ),
        },
    }

    selected_preset: str = st.selectbox(
        "Real-world application",
        options=list(PRESETS.keys()),
        index=0,
        help="Choose a preset to see typical component values and context.",
    )

    preset_data = PRESETS[selected_preset]

    # ── Capacitance ───────────────────────────────────────────────────────
    _default_C = preset_data["C_uF"] if preset_data else 100
    C_uF: int = st.slider(
        "Capacitance C (μF)",
        min_value=1,
        max_value=10_000,
        value=_default_C,
        step=1,
        help="Capacitance in microfarads. τ = RC increases linearly with C.",
    )
    C_F = C_uF * 1e-6

    # ── Resistance (select-slider for decade spacing) ─────────────────────
    _default_R_label = (
        _format_resistance(preset_data["R_ohm"]) if preset_data else "1 kΩ"
    )
    # Clamp to nearest available label if preset R not in list
    if preset_data and preset_data["R_ohm"] not in R_OPTIONS_OHM:
        _default_R_label = "1 kΩ"
    R_label: str = st.select_slider(
        "Resistance R",
        options=R_LABELS,
        value=_default_R_label,
        help="Series resistance. Higher R → longer time constant τ = RC.",
    )
    R_ohm = R_OPTIONS_OHM[R_LABELS.index(R_label)]

    # ── Initial / supply voltage ──────────────────────────────────────────
    _default_V0 = preset_data["V0"] if preset_data else 9.0
    # Clamp preset voltage to slider range
    _default_V0 = max(1.0, min(24.0, _default_V0))
    V0: float = st.slider(
        "Initial / supply voltage V₀ (V)",
        min_value=1.0,
        max_value=24.0,
        value=_default_V0,
        step=0.5,
        help="For discharge: initial voltage across C. For charging: supply EMF.",
    )

    # When preset is active override C_F, R_ohm, V0 with preset values
    if preset_data:
        C_uF = preset_data["C_uF"]
        C_F = C_uF * 1e-6
        R_ohm = float(preset_data["R_ohm"])
        V0 = preset_data["V0"]
        # Show context info card
        _tau_preset = R_ohm * C_F
        _U_preset = 0.5 * C_F * V0 ** 2
        st.info(
            preset_data["info"](C_F, R_ohm, V0, _tau_preset),
            icon="💡",
        )

    # ── Circuit mode ──────────────────────────────────────────────────────
    circuit_mode: str = st.radio(
        "Circuit mode",
        ["Discharging", "Charging"],
        index=0,
        help="Discharging: V = V₀·exp(−t/RC). Charging: V = V₀·(1 − exp(−t/RC)).",
    )

    # ── Advanced controls ─────────────────────────────────────────────────
    show_ln = False
    use_c_total = False
    c_total_F = C_F
    cap_combo = "Parallel"
    c1_uF = c2_uF = c3_uF = 100
    add_leakage = False
    R_leak_ohm = 1e6

    if mode == "Advanced":
        advanced_divider()

        st.markdown("**Log-linear plot**")
        show_ln = st.checkbox(
            "Show ln(V) vs t",
            value=False,
            help=(
                "A semi-log plot linearises exponential decay. "
                "The gradient equals −1/RC."
            ),
        )

        st.markdown("**Series / Parallel capacitor builder**")
        c1_uF = st.number_input("C₁ (μF)", min_value=1, max_value=10_000, value=100, step=1)
        c2_uF = st.number_input("C₂ (μF)", min_value=1, max_value=10_000, value=220, step=1)
        c3_uF = st.number_input("C₃ (μF)", min_value=1, max_value=10_000, value=470, step=1)
        cap_combo = st.radio(
            "Combination",
            ["Series", "Parallel"],
            index=1,
            horizontal=True,
        )
        if cap_combo == "Series":
            c_total_uF = 1.0 / (1.0 / c1_uF + 1.0 / c2_uF + 1.0 / c3_uF)
        else:
            c_total_uF = float(c1_uF + c2_uF + c3_uF)
        c_total_F = c_total_uF * 1e-6

        use_c_total = st.checkbox(
            "Use C_total in simulation",
            value=False,
            help="Overrides the C slider with the combination result.",
        )

        st.markdown("**Leaky capacitor**")
        add_leakage = st.checkbox(
            "Add leakage resistance",
            value=False,
            help=(
                "Models a real capacitor with finite insulation resistance "
                "R_leak in parallel with C, accelerating discharge."
            ),
        )
        if add_leakage:
            R_leak_MOhm: float = st.slider(
                "Leakage resistance R_leak (MΩ)",
                min_value=0.1,
                max_value=10.0,
                value=1.0,
                step=0.1,
                help="Leakage resistance in parallel with the capacitor (MΩ).",
            )
            R_leak_ohm = R_leak_MOhm * 1e6

        # ── RC Target Calculator ──────────────────────────────────────────
        with st.expander("🔧 RC Target Calculator"):
            target_tau_ms: float = st.number_input(
                "Target τ (ms)",
                min_value=0.1,
                max_value=100_000.0,
                value=100.0,
                step=1.0,
                help="Enter the time constant you want to achieve.",
            )
            target_tau_s = target_tau_ms * 1e-3
            fix_which: str = st.selectbox(
                "Fix which?",
                ["Fix R, choose C", "Fix C, choose R"],
                key="rc_calc_fix",
            )
            if fix_which == "Fix R, choose C":
                R_fixed: float = st.slider(
                    "Fixed R (Ω)",
                    min_value=100,
                    max_value=100_000,
                    value=1_000,
                    step=100,
                    key="rc_calc_r",
                )
                C_needed_F = target_tau_s / R_fixed
                C_needed_uF = C_needed_F * 1e6
                st.success(
                    f"To achieve τ = {target_tau_ms:.1f} ms:  \n"
                    f"use **R = {R_fixed:.0f} Ω**, **C = {C_needed_uF:.1f} μF**"
                )
            else:
                C_fixed_uF: float = st.slider(
                    "Fixed C (μF)",
                    min_value=1,
                    max_value=10_000,
                    value=100,
                    step=1,
                    key="rc_calc_c",
                )
                C_fixed_F = C_fixed_uF * 1e-6
                R_needed = target_tau_s / C_fixed_F
                st.success(
                    f"To achieve τ = {target_tau_ms:.1f} ms:  \n"
                    f"use **R = {R_needed:.0f} Ω**, **C = {C_fixed_uF:.1f} μF**"
                )

    # Override C if requested
    if use_c_total:
        C_F = c_total_F

    return dict(
            mode=mode,
            circuit_mode=circuit_mode,
            C_F=C_F,
            R_ohm=float(R_ohm),
            V0=V0,
            show_ln=show_ln,
            use_c_total=use_c_total,
            c_total_F=c_total_F,
            cap_combo=cap_combo,
            c1_uF=int(c1_uF),
            c2_uF=int(c2_uF),
            c3_uF=int(c3_uF),
            add_leakage=add_leakage,
            R_leak_ohm=R_leak_ohm,
        )


# ── p5.js Animation ───────────────────────────────────────────────────────────


def build_capacitor_animation(R, C, V0, mode):
    """
    Build a complete p5.js RC circuit animation as an HTML string.

    Parameters
    ----------
    R    : resistance in Ohms
    C    : capacitance in Farads
    V0   : supply / initial voltage in Volts
    mode : 'charge' or 'discharge' (sets the initial animation state)

    Returns
    -------
    str  : full HTML document embedding the p5.js sketch
    """
    tau = float(R * C)
    data = json.dumps({
        "R": float(R),
        "C": float(C),
        "V0": float(V0),
        "tau": tau,
        "mode": mode,
    })
    return f"""<!DOCTYPE html>
<html>
<head>
<style>
body{{margin:0;background:#0e1117;overflow:hidden;font-family:monospace}}
canvas{{display:block}}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const D = {data};

new p5(function(p) {{
  // ── layout constants ────────────────────────────────────────────────────────
  const W = 700, H = 420;
  // Circuit bounding box
  const CX = 80,  CY = 60,  CW = 340, CH = 220;
  // Nodes: TL=top-left, TR=top-right, BL=bottom-left, BR=bottom-right
  const TL = {{x: CX,      y: CY}};
  const TR = {{x: CX+CW,   y: CY}};
  const BL = {{x: CX,      y: CY+CH}};
  const BR = {{x: CX+CW,   y: CY+CH}};
  // Component centres
  const BAT_X = CX,        BAT_Y = CY + CH/2;   // battery mid-left
  const RES_X = CX + CW/2, RES_Y = CY;           // resistor mid-top
  const CAP_X = CX + CW,   CAP_Y = CY + CH/2;   // capacitor mid-right
  // Meter panel
  const MX = 460, MY = 40, MW = 220, MH = 340;

  // ── physics constants ───────────────────────────────────────────────────────
  const tau   = D.tau;   // RC (s)
  const V0    = D.V0;
  const SPEED_OPTIONS = [1, 2, 4];

  // ── state ───────────────────────────────────────────────────────────────────
  let tSim      = 0;           // simulated time (s)
  let charging  = (D.mode === 'charge');
  let paused    = false;
  let speedIdx  = 0;
  let sparkTimer = 0;          // frames left for spark flash
  let fullyCharged = false;
  let fullyDischarged = false;

  // Charge packets
  const N_PACKETS = 8;
  let packets = [];

  // Buttons (populated in setup)
  let btnPlay, btnSpeed;

  // ── helpers ─────────────────────────────────────────────────────────────────
  function vC(t) {{
    if (charging) return V0 * (1 - Math.exp(-t / tau));
    else          return V0 * Math.exp(-t / tau);
  }}

  function iC(t) {{
    // Always positive magnitude; direction handled by packet flow
    return (V0 / D.R) * Math.exp(-t / tau);
  }}

  function chargeRatio() {{
    return Math.min(vC(tSim) / V0, 1.0);
  }}

  // Perimeter path: BL → TL (battery left) → TR (top, resistor) → BR → BL
  // Returns position along perimeter [0,1].
  function perimeterPos(frac) {{
    // Total perimeter = 2*(CW + CH)
    const perim = 2 * (CW + CH);
    let d = ((frac % 1) + 1) % 1 * perim;

    // Segment 1: BL → TL (left side, going up), length=CH
    if (d < CH) {{
      return {{x: BL.x, y: BL.y - d}};
    }}
    d -= CH;
    // Segment 2: TL → TR (top, going right), length=CW
    if (d < CW) {{
      return {{x: TL.x + d, y: TL.y}};
    }}
    d -= CW;
    // Segment 3: TR → BR (right side, going down), length=CH
    if (d < CH) {{
      return {{x: TR.x, y: TR.y + d}};
    }}
    d -= CH;
    // Segment 4: BR → BL (bottom, going left), length=CW
    return {{x: BR.x - d, y: BR.y}};
  }}

  function initPackets() {{
    packets = [];
    for (let i = 0; i < N_PACKETS; i++) {{
      packets.push({{
        frac: i / N_PACKETS,
        alpha: p.random(180, 255),
      }});
    }}
  }}

  // ── p5 lifecycle ─────────────────────────────────────────────────────────────
  p.setup = function() {{
    let cnv = p.createCanvas(W, H);
    cnv.parent(document.body);
    p.textFont('monospace');
    initPackets();

    // Play/pause button
    btnPlay = p.createButton('⏸ Pause');
    btnPlay.position(W - 170, 8);
    btnPlay.style('background', '#1f77b4');
    btnPlay.style('color', '#fff');
    btnPlay.style('border', 'none');
    btnPlay.style('border-radius', '4px');
    btnPlay.style('padding', '4px 10px');
    btnPlay.style('cursor', 'pointer');
    btnPlay.style('font-size', '12px');
    btnPlay.mousePressed(function() {{
      paused = !paused;
      btnPlay.html(paused ? '▶ Play' : '⏸ Pause');
    }});

    // Speed button
    btnSpeed = p.createButton('1x');
    btnSpeed.position(W - 65, 8);
    btnSpeed.style('background', '#ff7f0e');
    btnSpeed.style('color', '#fff');
    btnSpeed.style('border', 'none');
    btnSpeed.style('border-radius', '4px');
    btnSpeed.style('padding', '4px 10px');
    btnSpeed.style('cursor', 'pointer');
    btnSpeed.style('font-size', '12px');
    btnSpeed.mousePressed(function() {{
      speedIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
      btnSpeed.html(SPEED_OPTIONS[speedIdx] + 'x');
    }});
  }};

  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || W, H);
  }};

  p.mousePressed = function() {{
    // Click on capacitor region to trigger discharge
    let capLeft  = CAP_X - 25;
    let capRight = CAP_X + 25;
    let capTop   = CAP_Y - 55;
    let capBot   = CAP_Y + 55;
    if (p.mouseX > capLeft && p.mouseX < capRight &&
        p.mouseY > capTop  && p.mouseY < capBot) {{
      if (charging && chargeRatio() > 0.05) {{
        // Trigger discharge
        let currentV = vC(tSim);
        charging = false;
        tSim = -tau * Math.log(currentV / V0);  // reset tSim so vC(tSim)=currentV
        sparkTimer = 30;
        fullyCharged = false;
      }}
    }}
  }};

  p.draw = function() {{
    p.background('#0e1117');
    let speed = SPEED_OPTIONS[speedIdx];

    // ── Advance simulation time ──────────────────────────────────────────────
    if (!paused) {{
      // dt in simulated seconds: 60fps assumed, each frame = (1/60)*speed * timeScale
      // timeScale makes tau feel ~3 seconds at 1x for good visual pacing
      let timeScale = 3.0 / tau;
      tSim += (1 / 60) * speed * timeScale * tau / 3.0;  // simplifies to speed/60

      // Actually: advance tSim so that one full charge takes ~3 real seconds at 1x
      // => need to traverse from 0 to ~5*tau in 3s => dt per frame = 5*tau / (3*60)
      tSim += (5 * tau) / (3 * 60) * speed;

      // Move packets
      let packetSpeed = speed * 0.004;
      for (let pk of packets) {{
        if (charging) pk.frac += packetSpeed;
        else          pk.frac -= packetSpeed;
        pk.frac = ((pk.frac % 1) + 1) % 1;
      }}

      // Check fully charged / discharged
      let ratio = chargeRatio();
      if (charging && ratio >= 0.993) {{
        fullyCharged = true;
        // Auto-restart discharge after 2s pause equivalent (~120 frames)
        if (!fullyDischarged) {{
          tSim = 5.1 * tau;  // clamp
        }}
      }} else {{
        fullyCharged = false;
      }}
      if (!charging && ratio <= 0.007) {{
        fullyDischarged = true;
        // Auto-restart charging
        charging = true;
        tSim = 0;
        initPackets();
        fullyDischarged = false;
      }} else {{
        fullyDischarged = false;
      }}
    }}

    if (sparkTimer > 0) sparkTimer--;

    // ── Draw circuit wires ─────────────────────────────────────────────────
    p.stroke(80, 80, 100);
    p.strokeWeight(2);
    p.noFill();
    // Left wire: BL → TL (skipping battery body)
    p.line(BL.x, BL.y, BL.x, BAT_Y + 30);
    p.line(BL.x, BAT_Y - 30, TL.x, TL.y);
    // Top wire: TL → resistor left gap, then resistor right gap → TR
    p.line(TL.x, TL.y, RES_X - 30, RES_Y);
    p.line(RES_X + 30, RES_Y, TR.x, TR.y);
    // Right wire: TR → capacitor top gap, then capacitor bottom gap → BR
    p.line(TR.x, TR.y, CAP_X, CAP_Y - 55);
    p.line(CAP_X, CAP_Y + 55, BR.x, BR.y);
    // Bottom wire: BR → BL
    p.line(BR.x, BR.y, BL.x, BL.y);

    // ── Draw battery ────────────────────────────────────────────────────────
    drawBattery(BAT_X, BAT_Y);

    // ── Draw resistor ──────────────────────────────────────────────────────
    drawResistor(RES_X, RES_Y);

    // ── Draw capacitor ────────────────────────────────────────────────────
    drawCapacitor(CAP_X, CAP_Y, chargeRatio());

    // ── Draw charge packets ───────────────────────────────────────────────
    if (!paused) {{
      drawPackets();
    }}

    // ── Spark flash ───────────────────────────────────────────────────────
    if (sparkTimer > 0) {{
      drawSpark(CAP_X, CAP_Y, sparkTimer);
    }}

    // ── Fully charged banner ──────────────────────────────────────────────
    if (fullyCharged) {{
      p.noStroke();
      p.fill(255, 215, 0, 180 + 40 * Math.sin(p.frameCount * 0.2));
      p.textSize(13);
      p.textAlign(p.CENTER);
      p.text('FULLY CHARGED', CAP_X, CAP_Y - 75);
    }}

    // ── Voltage meter panel ───────────────────────────────────────────────
    drawMeter(MX, MY, MW, MH);

    // ── Component labels ──────────────────────────────────────────────────
    drawLabels();
  }};

  // ── Drawing sub-routines ────────────────────────────────────────────────────

  function drawBattery(x, y) {{
    // Long line = +ve terminal (top), short line = -ve terminal (bottom)
    p.stroke(200, 200, 220);
    p.strokeWeight(3);
    // +ve terminal (top)
    p.line(x - 14, y - 20, x + 14, y - 20);
    // -ve terminal (bottom)
    p.line(x - 8,  y - 10, x + 8,  y - 10);
    p.line(x - 14, y + 10, x + 14, y + 10);
    p.line(x - 8,  y + 20, x + 8,  y + 20);
    // Vertical connectors
    p.stroke(80, 80, 100);
    p.strokeWeight(2);
    p.line(x, y - 30, x, y - 20);
    p.line(x, y + 20, x, y + 30);
    // + / - symbols
    p.noStroke();
    p.fill(100, 200, 120);
    p.textSize(11);
    p.textAlign(p.CENTER);
    p.text('+', x + 22, y - 16);
    p.fill(220, 100, 100);
    p.text('−', x + 22, y + 24);
    // Label
    p.fill(180, 180, 200);
    p.textSize(10);
    p.text('EMF', x - 28, y - 4);
    p.text(V0.toFixed(1) + ' V', x - 28, y + 10);
  }}

  function drawResistor(x, y) {{
    // Zigzag resistor symbol
    p.stroke(255, 165, 50);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    let sx = x - 30, sy = y;
    p.vertex(sx, sy);
    let segs = 6;
    let segW = 60 / segs;
    for (let i = 0; i < segs; i++) {{
      let nx = sx + (i + 0.5) * segW;
      let ny = (i % 2 === 0) ? sy - 10 : sy + 10;
      p.vertex(nx, ny);
    }}
    p.vertex(x + 30, sy);
    p.endShape();
    // Label
    p.noStroke();
    p.fill(255, 165, 50);
    p.textSize(10);
    p.textAlign(p.CENTER);
    p.text('R = ' + formatSI(D.R, 'Ω'), x, y - 20);
  }}

  function drawCapacitor(x, y, ratio) {{
    let plateH = 50;
    let gap = 10;
    // Glow fill between plates (charge level)
    let fillAlpha = ratio * 200;
    p.noStroke();
    // Blue fill growing with charge
    p.fill(31, 119, 180, fillAlpha);
    p.rect(x - gap, y - plateH / 2, gap * 2, plateH);
    // Plates
    let plateColor = p.lerpColor(
      p.color(140, 160, 200),
      p.color(100, 180, 255),
      ratio
    );
    p.stroke(plateColor);
    p.strokeWeight(4);
    p.line(x - gap, y - plateH / 2, x - gap, y + plateH / 2);
    p.line(x + gap, y - plateH / 2, x + gap, y + plateH / 2);
    // Outer glow when charged
    if (ratio > 0.8) {{
      let glowA = p.map(ratio, 0.8, 1.0, 0, 80);
      p.noFill();
      p.stroke(100, 180, 255, glowA);
      p.strokeWeight(8);
      p.line(x - gap, y - plateH / 2, x - gap, y + plateH / 2);
      p.line(x + gap, y - plateH / 2, x + gap, y + plateH / 2);
    }}
    // Clickable hint ring
    p.noFill();
    p.stroke(255, 127, 14, 60);
    p.strokeWeight(1);
    p.ellipse(x, y, 54, 120);
    // Label
    p.noStroke();
    p.fill(100, 180, 255);
    p.textSize(10);
    p.textAlign(p.CENTER);
    p.text('C = ' + formatSI(D.C, 'F'), x, y + plateH / 2 + 18);
    p.fill(150, 150, 180);
    p.textSize(9);
    p.text('(click)', x, y + plateH / 2 + 30);
  }}

  function drawPackets() {{
    let ratio = chargeRatio();
    // Current magnitude governs opacity/size
    let i_now = (V0 / D.R) * Math.exp(-tSim / tau);
    let i_max = V0 / D.R;
    let strength = Math.min(i_now / i_max, 1.0);
    if (strength < 0.01) return;

    for (let pk of packets) {{
      // Don't draw packet inside battery or capacitor bodies
      let pos = perimeterPos(pk.frac);
      // Skip if inside component housings
      let inBat = (Math.abs(pos.x - BAT_X) < 20 && Math.abs(pos.y - BAT_Y) < 35);
      let inCap = (Math.abs(pos.x - CAP_X) < 20 && Math.abs(pos.y - CAP_Y) < 60);
      if (inBat || inCap) continue;

      let a = strength * pk.alpha;
      // Core dot
      p.noStroke();
      p.fill(255, 127, 14, a);
      p.ellipse(pos.x, pos.y, 8, 8);
      // Glow halo
      p.fill(255, 127, 14, a * 0.3);
      p.ellipse(pos.x, pos.y, 16, 16);
    }}
  }}

  function drawSpark(x, y, timer) {{
    let t = timer / 30;  // 1→0
    p.push();
    p.translate(x, y);
    // Flash
    p.noStroke();
    p.fill(231, 76, 60, t * 200);
    p.ellipse(0, 0, 80 * t, 80 * t);
    // Rays
    p.stroke(255, 200, 100, t * 255);
    p.strokeWeight(2);
    for (let i = 0; i < 8; i++) {{
      let ang = (i / 8) * p.TWO_PI;
      let len = p.random(20, 50) * t;
      p.line(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
    }}
    // SPARK text
    p.noStroke();
    p.fill(255, 200, 100, t * 255);
    p.textSize(16);
    p.textAlign(p.CENTER);
    p.text('⚡ DISCHARGE!', 0, -70);
    p.pop();
  }}

  function drawMeter(mx, my, mw, mh) {{
    // Panel background
    p.noStroke();
    p.fill(20, 25, 40);
    p.rect(mx, my, mw, mh, 8);
    p.stroke(50, 70, 110);
    p.strokeWeight(1);
    p.noFill();
    p.rect(mx, my, mw, mh, 8);

    // Title
    p.noStroke();
    p.fill(180, 200, 230);
    p.textSize(11);
    p.textAlign(p.LEFT);
    p.text('VOLTAGE METER', mx + 10, my + 18);

    // Current Vc
    let vc = vC(tSim);
    let ratio = chargeRatio();
    p.fill(100, 180, 255);
    p.textSize(22);
    p.textAlign(p.CENTER);
    p.text(vc.toFixed(2) + ' V', mx + mw / 2, my + 48);

    // Mode
    p.textSize(10);
    p.fill(charging ? '#2ecc71' : '#e74c3c');
    p.text(charging ? '▲ CHARGING' : '▼ DISCHARGING', mx + mw / 2, my + 63);

    // Mini graph area
    let gx = mx + 14, gy = my + 75, gw = mw - 28, gh = 140;
    p.noFill();
    p.stroke(40, 55, 80);
    p.strokeWeight(1);
    p.rect(gx, gy, gw, gh);

    // Draw V(t) curve
    p.stroke(31, 119, 180);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    let nPts = 80;
    for (let i = 0; i <= nPts; i++) {{
      let tFrac = i / nPts;
      let tVal  = tFrac * 5 * tau;
      let vVal  = charging
        ? V0 * (1 - Math.exp(-tVal / tau))
        : V0 * Math.exp(-tVal / tau);
      let px2 = gx + tFrac * gw;
      let py2 = gy + gh - (vVal / V0) * gh;
      p.vertex(px2, py2);
    }}
    p.endShape();

    // τ dotted line
    let tauX = gx + (tau / (5 * tau)) * gw;
    let tauV  = charging ? V0 * (1 - Math.exp(-1)) : V0 * Math.exp(-1);
    let tauY  = gy + gh - (tauV / V0) * gh;
    p.stroke(231, 76, 60, 180);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([4, 4]);
    p.line(tauX, gy, tauX, gy + gh);
    p.line(gx, tauY, gx + gw, tauY);
    p.drawingContext.setLineDash([]);

    // τ label
    p.noStroke();
    p.fill(231, 76, 60);
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('τ', tauX + 2, gy + 10);

    // Current time marker (vertical line)
    let curTClamped = Math.min(tSim, 5 * tau);
    let curX = gx + (curTClamped / (5 * tau)) * gw;
    p.stroke(255, 200, 80, 200);
    p.strokeWeight(2);
    p.line(curX, gy, curX, gy + gh);

    // Current V dot
    let curVY = gy + gh - ratio * gh;
    p.noStroke();
    p.fill(255, 200, 80);
    p.ellipse(curX, curVY, 7, 7);

    // Axis labels
    p.noStroke();
    p.fill(120, 140, 170);
    p.textSize(8);
    p.textAlign(p.LEFT);
    p.text('0', gx - 10, gy + gh + 2);
    p.text('5τ', gx + gw - 10, gy + gh + 2);
    p.text('V₀', gx - 20, gy + 4);
    p.text('0', gx - 12, gy + gh);
    p.textAlign(p.CENTER);
    p.text('t →', gx + gw / 2, gy + gh + 10);

    // Stats below graph
    let sy = gy + gh + 18;
    p.fill(160, 180, 210);
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('τ = RC = ' + tau.toFixed(4) + ' s', mx + 10, sy);
    p.text('V₀ = ' + V0.toFixed(1) + ' V', mx + 10, sy + 13);
    p.text('t = ' + tSim.toFixed(3) + ' s', mx + 10, sy + 26);
    p.text('Vᴄ = ' + vc.toFixed(3) + ' V', mx + 10, sy + 39);

    // Charge bar
    let barY = sy + 56;
    p.fill(30, 40, 60);
    p.rect(mx + 10, barY, mw - 20, 14, 3);
    let barColor = p.lerpColor(p.color('#1f77b4'), p.color('#2ecc71'), ratio);
    p.fill(barColor);
    p.rect(mx + 10, barY, (mw - 20) * ratio, 14, 3);
    p.noStroke();
    p.fill(200, 220, 240);
    p.textSize(9);
    p.textAlign(p.CENTER);
    p.text((ratio * 100).toFixed(1) + '% charged', mx + mw / 2, barY + 10);

    // Formula
    p.fill(120, 140, 180);
    p.textSize(9);
    p.textAlign(p.CENTER);
    let formulaY = barY + 28;
    if (charging) {{
      p.text('V = V₀(1 − e^(−t/RC))', mx + mw / 2, formulaY);
    }} else {{
      p.text('V = V₀·e^(−t/RC)', mx + mw / 2, formulaY);
    }}
  }}

  function drawLabels() {{
    p.noStroke();
    p.textAlign(p.CENTER);
    // Battery label
    p.fill(160, 200, 160);
    p.textSize(10);
    p.text('Battery', BAT_X - 38, BAT_Y + 50);
    // Resistor label
    p.fill(255, 165, 50);
    p.textSize(10);
    p.text('Resistor', RES_X, RES_Y + 28);
    // Capacitor label
    p.fill(100, 180, 255);
    p.textSize(10);
    p.text('Capacitor', CAP_X + 38, CAP_Y - 10);
    // Title
    p.fill(200, 210, 230);
    p.textSize(13);
    p.text('RC Circuit — Capacitor Charge/Discharge', W / 2 - 60, H - 14);
  }}

  function formatSI(val, unit) {{
    if (val >= 1e6)  return (val / 1e6).toPrecision(3)  + ' M' + unit;
    if (val >= 1e3)  return (val / 1e3).toPrecision(3)  + ' k' + unit;
    if (val >= 1)    return val.toPrecision(3)           + ' '  + unit;
    if (val >= 1e-3) return (val * 1e3).toPrecision(3)  + ' m' + unit;
    if (val >= 1e-6) return (val * 1e6).toPrecision(3)  + ' μ' + unit;
    if (val >= 1e-9) return (val * 1e9).toPrecision(3)  + ' n' + unit;
    return val.toExponential(2) + ' ' + unit;
  }}

}});
</script>
</body>
</html>"""


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full simulation page."""
    left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

    with left_col:
        params = render_sidebar()

    mode = params["mode"]
    circuit_mode = params["circuit_mode"]
    C_F = params["C_F"]
    R_ohm = params["R_ohm"]
    V0 = params["V0"]

    # ── Compute core RC curves ─────────────────────────────────────────────────
    t, Q_uC, V_V, I_mA, tau = compute_rc_curves(C_F, R_ohm, V0, circuit_mode)

    # ── Advanced computations ──────────────────────────────────────────────────
    ln_V: np.ndarray | None = None
    grad = intercept = 0.0
    V_leaky: np.ndarray | None = None

    if mode == "Advanced":
        if params["show_ln"] and circuit_mode == "Discharging":
            ln_V, grad, intercept = polyfit_ln_v(t, V_V)
        elif params["show_ln"] and circuit_mode == "Charging":
            # For charging, ln(V₀ − V) is linear; show it instead
            residual = V0 - V_V
            ln_V, grad, intercept = polyfit_ln_v(t, residual)

        if params["add_leakage"] and circuit_mode == "Discharging":
            _, V_leaky = compute_leaky_discharge(
                C_F, R_ohm, params["R_leak_ohm"], V0
            )

    with right_col:

        # ── Key metrics ───────────────────────────────────────────────────────
        Q0_uC_val = C_F * V0 * 1e6
        metric_row({
            "τ = RC": f"{tau:.4f} s",
            "Time to 99% (5τ)": f"{5 * tau:.4f} s",
            "Max charge Q₀": f"{Q0_uC_val:.2f} μC",
        })

        # ── Enhancement 3: Time constant insight ──────────────────────────────
        _tau_pct = "63.2% of maximum" if circuit_mode == "Charging" else "36.8% of initial"
        _tau_end = "effectively fully charged" if circuit_mode == "Charging" else "effectively fully discharged"
        st.info(
            f"**τ = RC = {tau:.4f} s** — After one time constant, charge reaches "
            f"{_tau_pct}. After 5τ = {5 * tau:.4f} s, the capacitor is {_tau_end} (99.3%).",
            icon="ℹ️",
        )

        # ── p5.js circuit animation ───────────────────────────────────────────
        _anim_mode = 'charge' if circuit_mode == 'Charging' else 'discharge'
        components.html(
            build_capacitor_animation(R_ohm, C_F, V0, _anim_mode),
            height=440,
        )
        st.caption("▶ Play/pause · ⚡ speed · Click capacitor to discharge")
        st.divider()

        # ── Main Q / V / I figure ─────────────────────────────────────────────
        fig_main = build_main_figure(
            t=t,
            Q_uC=Q_uC,
            V_V=V_V,
            I_mA=I_mA,
            tau=tau,
            mode=circuit_mode,
            show_ln=params["show_ln"] and mode == "Advanced",
            ln_V=ln_V,
            grad=grad,
            intercept=intercept,
            V_leaky=V_leaky,
        )
        st.plotly_chart(fig_main, use_container_width=True)

        # ── Enhancement 2: Energy efficiency callout (Charging mode only) ─────
        if circuit_mode == "Charging":
            _E_supply = C_F * V0 ** 2
            _E_stored = 0.5 * C_F * V0 ** 2
            st.info(
                "⚡ **Energy efficiency:** The supply provides energy Q·V₀ = C·V₀². "
                "The capacitor stores only ½CV₀². The other 50% is dissipated as heat "
                "in the resistor — regardless of R. This is why charging a battery is "
                "always less than 100% efficient.",
            )
            _ecol1, _ecol2, _ecol3 = st.columns(3)
            _ecol1.metric("Energy from supply", f"{_E_supply:.4f} J")
            _ecol2.metric("Energy stored in C", f"{_E_stored:.4f} J")
            _ecol3.metric("Heat dissipated in R", f"{_E_stored:.4f} J")

        # ── Advanced: capacitor builder info box ──────────────────────────────
        if mode == "Advanced":
            c1 = params["c1_uF"]
            c2 = params["c2_uF"]
            c3 = params["c3_uF"]
            combo = params["cap_combo"]
            c_total_uF = params["c_total_F"] * 1e6

            with st.expander("⚗️ Series / Parallel Capacitor Builder", expanded=True):
                if combo == "Series":
                    formula = (
                        r"\frac{1}{C_{\text{total}}} = "
                        r"\frac{1}{C_1} + \frac{1}{C_2} + \frac{1}{C_3}"
                    )
                    st.latex(formula)
                    st.latex(
                        rf"\frac{{1}}{{C_\text{{total}}}} = "
                        rf"\frac{{1}}{{{c1}}} + \frac{{1}}{{{c2}}} + \frac{{1}}{{{c3}}}"
                        rf"\;\mu\text{{F}}^{{-1}}"
                    )
                else:
                    formula = (
                        r"C_{\text{total}} = C_1 + C_2 + C_3"
                    )
                    st.latex(formula)
                    st.latex(
                        rf"C_\text{{total}} = {c1} + {c2} + {c3}"
                        rf"\;\mu\text{{F}}"
                    )
                st.info(
                    f"**C_total = {c_total_uF:.2f} μF**"
                    + (" ← overriding C slider" if params["use_c_total"] else ""),
                    icon="ℹ️",
                )

            # ── Energy stored: Q–V graph ──────────────────────────────────────
            U_J = 0.5 * C_F * V0 ** 2
            with st.expander("⚗️ Energy stored in capacitor", expanded=True):
                col_e1, col_e2 = st.columns([1, 2])
                with col_e1:
                    st.markdown("**Energy formulae:**")
                    st.latex(r"U = \frac{1}{2}CV^2 = \frac{Q^2}{2C} = \frac{1}{2}QV")
                    st.metric("Energy stored U", f"{U_J * 1e6:.2f} μJ")
                    if U_J >= 1e-3:
                        st.metric("", f"{U_J * 1e3:.3f} mJ")
                    st.markdown(
                        "The shaded triangle on the Q–V graph represents "
                        "the energy stored. Its area = ½ × base × height = ½QV."
                    )
                with col_e2:
                    fig_energy = build_energy_qv_figure(C_F, V0)
                    st.plotly_chart(fig_energy, use_container_width=True)

            # ── Leaky capacitor info ──────────────────────────────────────────
            if params["add_leakage"] and circuit_mode == "Discharging":
                R_leak = params["R_leak_ohm"]
                tau_eff = R_ohm * R_leak * C_F / (R_ohm + R_leak)
                st.info(
                    f"**Leaky capacitor** R_leak = {R_leak / 1e6:.1f} MΩ  \n"
                    f"Effective τ_eff = R·R_L·C / (R + R_L) = {tau_eff:.4f} s  \n"
                    f"Ideal τ = {tau:.4f} s — leakage shortens discharge by "
                    f"{(1 - tau_eff / tau) * 100:.1f}%.",
                    icon="⚠️",
                )
            elif params["add_leakage"] and circuit_mode == "Charging":
                st.warning(
                    "Leaky capacitor overlay applies to Discharging mode only. "
                    "Switch to Discharging to see the effect.",
                    icon="⚠️",
                )

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"Q = Q_0 \, e^{-t/RC}",
                r"V = V_0 \, e^{-t/RC}",
                r"I = I_0 \, e^{-t/RC}",
                r"\tau = RC",
                r"U = \frac{1}{2}CV^2 = \frac{Q^2}{2C}",
            ],
            explanation=(
                "The exponential decay arises because the rate of discharge "
                "is proportional to the remaining charge: dQ/dt = −Q/(RC). "
                "After one time constant τ = RC the charge (and voltage) has "
                "fallen to e⁻¹ ≈ 36.8% of its initial value — equivalently "
                "63.2% has been lost. After 5τ the capacitor is effectively "
                "fully discharged (to within 0.7%)."
            ),
            advanced_text=(
                "**Derivation:** C·dV/dt = −V/R → dV/V = −dt/(RC) → "
                "integrating: ln V = −t/RC + const → V = V₀ exp(−t/RC). "
                "The ln(V) vs t graph is therefore a straight line with "
                "gradient −1/RC, confirming the exponential relationship.\n\n"
                "**Dielectrics:** inserting a dielectric of relative permittivity εᵣ "
                "increases C by the factor εᵣ, lengthening τ proportionally.\n\n"
                "**Real capacitors** have finite leakage resistance (typically MΩ–GΩ) "
                "in parallel, giving an effective τ_eff = R·R_L·C/(R + R_L) < RC.\n\n"
                "**Applications:** camera flash (large C, rapid discharge through "
                "flash tube); defibrillator (controlled discharge timing critical "
                "to deliver correct energy); smoothing capacitors in rectifiers "
                "(large C ≫ 1/fR to maintain steady DC)."
            ),
            mode=mode,
        )

        # ── Exam practice questions ───────────────────────────────────────────

        _C_val = float(C_F)
        _R_val = float(R_ohm)
        _V0_val = float(V0)
        _tau_val = float(tau)
        _Q_max = _C_val * _V0_val
        _E_stored = 0.5 * _C_val * _V0_val ** 2

        # Format R and C for display
        if _R_val >= 1e6:
            _R_display = f"{_R_val/1e6:g} MΩ"
        elif _R_val >= 1e3:
            _R_display = f"{_R_val/1e3:g} kΩ"
        else:
            _R_display = f"{_R_val:.0f} Ω"

        if _C_val >= 1e-3:
            _C_display = f"{_C_val*1e3:g} mF"
        elif _C_val >= 1e-6:
            _C_display = f"{_C_val*1e6:g} μF"
        elif _C_val >= 1e-9:
            _C_display = f"{_C_val*1e9:g} nF"
        else:
            _C_display = f"{_C_val:.2e} F"

        _rc_questions = [
            {
                "q": (
                    f"A capacitor of capacitance {_C_display} is connected in series "
                    f"with a {_R_display} resistor and a {_V0_val:.1f} V supply. "
                    "Calculate the time constant."
                ),
                "marks": 2,
                "answer": f"τ = {_tau_val:.4f} s",
                "working": [
                    f"τ = RC = {_R_val:.0f}×{_C_val:.2e} = {_tau_val:.4f} s",
                ],
            },
            {
                "q": "Calculate the maximum charge stored on the capacitor.",
                "marks": 2,
                "answer": f"Q = {_Q_max:.4f} C",
                "working": [
                    f"Q = CV₀ = {_C_val:.2e}×{_V0_val:.1f} = {_Q_max:.4f} C",
                ],
            },
            {
                "q": "Calculate the energy stored in the capacitor when fully charged.",
                "marks": 3,
                "answer": f"E = {_E_stored:.4f} J",
                "working": [
                    f"E = ½CV₀² = ½×{_C_val:.2e}×{_V0_val:.1f}² = {_E_stored:.4f} J",
                ],
            },
        ]

        show_exam_panel(_rc_questions)


# ── Run ───────────────────────────────────────────────────────────────────────

main()
