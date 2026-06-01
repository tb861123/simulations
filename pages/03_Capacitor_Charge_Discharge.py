"""
Capacitor Charge & Discharge — WJEC Eduqas A Level Physics.

Simulates Q(t), V(t) and I(t) for an RC circuit in both charging and
discharging modes.  Advanced mode adds a ln(V) linearisation plot, a
series/parallel capacitor builder, an energy Q–V graph and a leaky
capacitor overlay.

Spec reference: Component 2, Topic 4 (Capacitance), sections (i) and (j).
"""

import numpy as np
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

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

    # ── Capacitance ───────────────────────────────────────────────────────
    C_uF: int = st.slider(
        "Capacitance C (μF)",
        min_value=1,
        max_value=10_000,
        value=100,
        step=1,
        help="Capacitance in microfarads. τ = RC increases linearly with C.",
    )
    C_F = C_uF * 1e-6

    # ── Resistance (select-slider for decade spacing) ─────────────────────
    R_label: str = st.select_slider(
        "Resistance R",
        options=R_LABELS,
        value="1 kΩ",
        help="Series resistance. Higher R → longer time constant τ = RC.",
    )
    R_ohm = R_OPTIONS_OHM[R_LABELS.index(R_label)]

    # ── Initial / supply voltage ──────────────────────────────────────────
    V0: float = st.slider(
        "Initial / supply voltage V₀ (V)",
        min_value=1.0,
        max_value=24.0,
        value=9.0,
        step=0.5,
        help="For discharge: initial voltage across C. For charging: supply EMF.",
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


# ── Run ───────────────────────────────────────────────────────────────────────

main()
