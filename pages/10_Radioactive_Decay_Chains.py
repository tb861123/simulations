"""
Radioactive Decay Chains — WJEC Eduqas A Level Physics
Component 3, Topic 6 (Nuclear Decay) — extension; links to Topic 7

Solves coupled Bateman equations for linear decay chains.  Stiff chains (e.g.
Rn-222, which mixes half-lives from minutes to years) are integrated with
scipy's implicit Radau solver; non-stiff long-timescale chains fall back to the
shared RK4 helper.  Advanced mode covers secular/transient equilibrium,
a custom chain builder, and activity plots with the Tc-99m medical application.
"""

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy.integrate import solve_ivp
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import solve_decay_chain          # used for non-stiff chains
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Page configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Radioactive Decay Chains — WJEC Physics",
    page_icon="⚛️",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

_SEC_PER_MIN  = 60.0
_SEC_PER_HOUR = 3_600.0
_SEC_PER_DAY  = 86_400.0
_SEC_PER_YEAR = 365.25 * _SEC_PER_DAY
_SEC_PER_GY   = 1e9 * _SEC_PER_YEAR       # 1 gigayear in seconds

# Colour order: parent, daughter-1, daughter-2, stable end product
_CHAIN_COLOURS = [
    COLOURS["primary"],    # parent
    COLOURS["secondary"],  # first daughter
    COLOURS["tertiary"],   # second daughter
    COLOURS["highlight"],  # stable / final product
]

# ── Preset chain definitions ──────────────────────────────────────────────────

def _u238_lambdas() -> list[float]:
    lam_U238  = np.log(2) / (4.468e9 * _SEC_PER_YEAR)
    lam_Th234 = np.log(2) / (24.1   * _SEC_PER_DAY)
    lam_Pb206 = 0.0   # stable — handled by conservation
    return [lam_U238, lam_Th234, lam_Pb206]


def _th232_lambdas() -> list[float]:
    lam_Th232 = np.log(2) / (14.0e9 * _SEC_PER_YEAR)
    lam_Ra228 = np.log(2) / (5.75   * _SEC_PER_YEAR)
    lam_Pb208 = 0.0   # stable
    return [lam_Th232, lam_Ra228, lam_Pb208]


def _rn222_lambdas() -> list[float]:
    lam_Rn222  = np.log(2) / (3.82  * _SEC_PER_DAY)
    lam_Po218  = np.log(2) / (3.05  * _SEC_PER_MIN)
    lam_Pb214  = np.log(2) / (26.8  * _SEC_PER_MIN)
    lam_Bi214  = np.log(2) / (19.7  * _SEC_PER_MIN)
    lam_Pb210  = np.log(2) / (22.3  * _SEC_PER_YEAR)   # quasi-stable on short timescale
    return [lam_Rn222, lam_Po218, lam_Pb214, lam_Bi214, lam_Pb210]


# Chain metadata: nuclide names, half-life display strings, decay types, chain diagram
CHAIN_PRESETS = {
    "U-238 → Pb-206 (simplified)": {
        "lambdas_fn":    _u238_lambdas,
        "nuclides":      ["U-238", "Th-234", "Pb-206"],
        "halflife_disp": ["4.468×10⁹ yr", "24.1 d", "stable"],
        "decay_types":   ["α", "β⁻", "—"],
        "stable_idx":    2,   # index of the stable end product
        "chain_diagram": "²³⁸U →(α) ²³⁴Th →(β⁻) ²⁰⁶Pb (stable)",
        "has_timescale": True,
        "short_label":   "Short (days–months, showing Th-234 ingrowth)",
        "long_label":    "Long (billions of years, showing U-238 decay)",
        "short_t_max":   200.0,          # days
        "short_unit":    "days",
        "long_t_max":    10.0,           # Gy
        "long_unit":     "Gy",
    },
    "Th-232 → Pb-208 (simplified)": {
        "lambdas_fn":    _th232_lambdas,
        "nuclides":      ["Th-232", "Ra-228", "Pb-208"],
        "halflife_disp": ["14.0×10⁹ yr", "5.75 yr", "stable"],
        "decay_types":   ["α", "β⁻", "—"],
        "stable_idx":    2,
        "chain_diagram": "²³²Th →(α) ²²⁸Ra →(β⁻) ²⁰⁸Pb (stable)",
        "has_timescale": True,
        "short_label":   "Short (0–30 yr, Ra-228 builds up)",
        "long_label":    "Long (0–30 Gy, Th-232 decay)",
        "short_t_max":   30.0,           # years
        "short_unit":    "years",
        "long_t_max":    30.0,           # Gy
        "long_unit":     "Gy",
    },
    "Rn-222 chain": {
        "lambdas_fn":    _rn222_lambdas,
        "nuclides":      ["Rn-222", "Po-218", "Pb-214", "Bi-214", "Pb-210"],
        "halflife_disp": ["3.82 d", "3.05 min", "26.8 min", "19.7 min", "22.3 yr"],
        "decay_types":   ["α", "α", "β⁻", "β⁻/α", "β⁻"],
        "stable_idx":    None,   # no fully stable end product shown
        "chain_diagram": (
            "²²²Rn →(α) ²¹⁸Po →(α) ²¹⁴Pb →(β⁻) ²¹⁴Bi →(β⁻/α) ²¹⁰Pb"
        ),
        "has_timescale": False,
        "short_t_max":   25.0,           # days
        "short_unit":    "days",
    },
}

# ── Cached solver wrapper ─────────────────────────────────────────────────────

def _is_stiff(lambdas: tuple[float, ...]) -> bool:
    """
    Return True when the ratio of fastest to slowest non-zero decay constant
    exceeds 1000 — flagging a stiff system that requires an implicit integrator.
    """
    active = [l for l in lambdas if l > 0]
    if len(active) < 2:
        return False
    return max(active) / min(active) > 1_000.0


@st.cache_data(show_spinner="Solving decay equations…")
def cached_solve(
    lambdas: tuple[float, ...],
    N0: float,
    t_arr_key: tuple,
) -> np.ndarray:
    """
    Solve the Bateman equations and return N of shape (len(t_arr), len(lambdas)).

    Stiff systems (stiffness ratio > 1000) use scipy Radau; others use the
    shared RK4 helper from utils.physics.
    """
    t_arr = np.array(t_arr_key)
    lam   = np.array(lambdas, dtype=float)
    n     = len(lam)

    if _is_stiff(lambdas):
        def deriv(t, y):
            dy = np.zeros(n)
            dy[0] = -lam[0] * y[0]
            for i in range(1, n):
                dy[i] = lam[i - 1] * y[i - 1] - lam[i] * y[i]
            return dy

        y0 = np.zeros(n)
        y0[0] = float(N0)
        sol = solve_ivp(
            deriv,
            t_span=(t_arr[0], t_arr[-1]),
            y0=y0,
            method="Radau",         # implicit — handles stiff ODEs robustly
            t_eval=t_arr,
            rtol=1e-8,
            atol=1e-3,
            dense_output=False,
        )
        return sol.y.T             # shape (len(t_arr), n)
    else:
        return solve_decay_chain(list(lambdas), float(N0), t_arr)


def _compute_chain(
    lambdas: list[float],
    N0: float,
    t_arr: np.ndarray,
    stable_idx: int | None,
) -> np.ndarray:
    """
    Solve decay chain and replace the stable end product column with conservation.
    For λ=0 the ODE gives dN_stable/dt = λ_prev * N_prev which is correct, but
    numerical drift can accumulate. Replace with: N_stable = N0 − Σ(radioactive).
    """
    lam_list = list(lambdas)
    N = cached_solve(tuple(lam_list), float(N0), tuple(t_arr.tolist()))
    if stable_idx is not None:
        radio_sum = N[:, :stable_idx].sum(axis=1)
        N[:, stable_idx] = np.maximum(0.0, N0 - radio_sum)
    return N


# ── Helper: build time array from UI selections ───────────────────────────────

def _make_t_arr(meta: dict, timescale_label: str, n_pts: int = 500) -> tuple[np.ndarray, str]:
    """
    Build a time array in SECONDS from the preset metadata and timescale choice.

    Returns
    -------
    t_arr_s  : time array in seconds
    x_label  : x-axis label string for plots
    """
    if not meta["has_timescale"]:
        # Rn-222 always uses the short scale
        t_max_s = meta["short_t_max"] * _SEC_PER_DAY
        x_label = f"Time ({meta['short_unit']})"
        return np.linspace(0, t_max_s, n_pts), x_label

    if "Short" in timescale_label:
        unit = meta["short_unit"]
        t_max = meta["short_t_max"]
    else:
        unit = meta["long_unit"]
        t_max = meta["long_t_max"]

    unit_map = {
        "days":  _SEC_PER_DAY,
        "years": _SEC_PER_YEAR,
        "Gy":    _SEC_PER_GY,
    }
    t_max_s = t_max * unit_map[unit]
    x_label = f"Time ({unit})"
    return np.linspace(0, t_max_s, n_pts), x_label


def _t_display(t_arr_s: np.ndarray, unit: str) -> np.ndarray:
    """Convert seconds array to display unit."""
    unit_map = {
        "days":  _SEC_PER_DAY,
        "years": _SEC_PER_YEAR,
        "Gy":    _SEC_PER_GY,
    }
    denom = 1.0
    for key, val in unit_map.items():
        if key in unit:
            denom = val
            break
    return t_arr_s / denom


# ── Stacked area chart builder ────────────────────────────────────────────────

def _build_stacked_area(
    t_display: np.ndarray,
    N: np.ndarray,
    nuclides: list[str],
    halflife_disp: list[str],
    x_label: str,
    title: str,
    colours: list[str] | None = None,
    height: int = 500,
) -> go.Figure:
    """
    Build a Plotly stacked area chart for a decay chain.

    Each nuclide gets its own filled trace, stacked bottom-to-top so the total
    always equals N₀.
    """
    n_nuclides = len(nuclides)
    cols = colours if colours else _CHAIN_COLOURS[:n_nuclides]

    fig = make_fig()
    # Build cumulative sums for stacking
    cumsum = np.zeros_like(t_display)

    for i in range(n_nuclides):
        col = cols[i % len(cols)]
        col_r = int(col[1:3], 16)
        col_g = int(col[3:5], 16)
        col_b = int(col[5:7], 16)
        fill_col = f"rgba({col_r},{col_g},{col_b},0.45)"

        name = f"{nuclides[i]}  (T½ = {halflife_disp[i]})"
        y_top = cumsum + N[:, i]

        if i == 0:
            fig.add_trace(go.Scatter(
                x=t_display,
                y=y_top,
                mode="lines",
                name=name,
                line=dict(color=col, width=1.5),
                fill="tozeroy",
                fillcolor=fill_col,
                stackgroup="chain",
            ))
        else:
            fig.add_trace(go.Scatter(
                x=t_display,
                y=y_top,
                mode="lines",
                name=name,
                line=dict(color=col, width=1.5),
                fill="tonexty",
                fillcolor=fill_col,
                stackgroup="chain",
            ))
        cumsum = y_top

    fig.update_layout(**plotly_layout(
        title=dict(text=title, font_size=15),
        xaxis_title=x_label,
        yaxis_title="Number of atoms  N",
        yaxis=dict(
            exponentformat="e",
            showexponent="all",
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        height=height,
        legend=dict(
            orientation="v",
            yanchor="top",
            y=1.0,
            xanchor="left",
            x=1.02,
            bgcolor="rgba(0,0,0,0.4)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
        ),
        margin=dict(l=70, r=220, t=60, b=60),
    ))
    return fig


# ── Chain schematic renderer ──────────────────────────────────────────────────

def _decay_badge(decay_type: str) -> str:
    """Return an HTML badge coloured by decay type."""
    if decay_type.startswith("α"):
        bg = COLOURS["highlight"]   # red
    elif decay_type.startswith("β"):
        bg = COLOURS["primary"]     # blue
    elif decay_type == "—":
        bg = COLOURS["tertiary"]    # green (stable)
    else:
        bg = COLOURS["secondary"]
    return (
        f"<span style='background-color:{bg};padding:2px 6px;"
        f"border-radius:3px;color:white;font-weight:bold;font-size:0.85em'>"
        f"{decay_type}</span>"
    )


def _nuclide_box(name: str, stable: bool = False) -> str:
    bg = COLOURS["tertiary"] if stable else "#2d3748"
    border = COLOURS["tertiary"] if stable else COLOURS["grid"]
    return (
        f"<span style='background-color:{bg};border:1px solid {border};"
        f"padding:3px 8px;border-radius:4px;color:white;font-weight:600'>"
        f"{name}</span>"
    )


_CHAIN_SCHEMATICS: dict[str, list[tuple]] = {
    # Each tuple: (nuclide_name, is_stable, arrow_label)
    # arrow_label = None means no arrow after (last element)
    "U-238 → Pb-206 (simplified)": [
        ("U-238",  False, "α, 4.47 Gy"),
        ("Th-234", False, "β⁻, 24.1 d"),
        ("Pb-206", True,  None),
    ],
    "Th-232 → Pb-208 (simplified)": [
        ("Th-232", False, "α, 14.0 Gy"),
        ("Ra-228", False, "β⁻, 5.75 y"),
        ("Pb-208", True,  None),
    ],
    "Rn-222 chain": [
        ("Rn-222", False, "α, 3.82 d"),
        ("Po-218", False, "α, 3.05 min"),
        ("Pb-214", False, "β⁻, 26.8 min"),
        ("Bi-214", False, "β⁻, 19.7 min"),
        ("Pb-210", False, None),
    ],
}


def _render_chain_schematic(chain_name: str, meta: dict) -> None:
    """Render a visual HTML decay chain schematic with coloured badges."""
    steps = _CHAIN_SCHEMATICS.get(chain_name)
    if steps is None:
        # Fallback to plain text
        st.markdown("**Decay chain:**")
        st.markdown(f"`{meta['chain_diagram']}`")
        return

    parts: list[str] = []
    for nuclide, is_stable, arrow_label in steps:
        parts.append(_nuclide_box(nuclide, stable=is_stable))
        if arrow_label is not None:
            # Determine decay type from the arrow label
            if arrow_label.startswith("α"):
                badge_type = "α"
            elif arrow_label.startswith("β"):
                badge_type = "β⁻"
            else:
                badge_type = arrow_label
            badge = _decay_badge(badge_type)
            # half-life part (everything after the comma)
            if "," in arrow_label:
                hl_part = arrow_label.split(",", 1)[1].strip()
                hl_html = (
                    f"<span style='color:#aaa;font-size:0.8em'>({hl_part})</span>"
                )
            else:
                hl_html = ""
            parts.append(
                f"&nbsp;→&nbsp;{badge}&nbsp;{hl_html}&nbsp;→&nbsp;"
            )

    schematic_html = (
        "<div style='background-color:#1a202c;padding:10px 14px;"
        "border-radius:6px;border:1px solid #444;overflow-x:auto;"
        "white-space:nowrap;margin:8px 0'>"
        + "".join(parts)
        + "</div>"
    )
    st.markdown("**Decay chain:**")
    st.markdown(schematic_html, unsafe_allow_html=True)
    st.markdown(
        "**α decay** (loses 2p+2n, mass decreases by 4) &nbsp;|&nbsp; "
        "**β⁻ decay** (neutron→proton, atomic number increases by 1) &nbsp;|&nbsp; "
        + _decay_badge("α") + "&nbsp;= alpha &nbsp;"
        + _decay_badge("β⁻") + "&nbsp;= beta-minus &nbsp;"
        + _decay_badge("—") + "&nbsp;= stable",
        unsafe_allow_html=True,
    )


# ── Tc-99m generator visualisation ───────────────────────────────────────────

def _render_tc99m_generator() -> None:
    """Render the Mo-99/Tc-99m generator expander with milking simulation."""
    with st.expander("🏥 Tc-99m Medical Generator (Mo-99/Tc-99m)", expanded=False):
        st.markdown(
            "A **Mo-99/Tc-99m generator** ('technetium cow') is 'milked' daily in "
            "hospitals. Mo-99 (T½ = 65.94 h) decays to Tc-99m (T½ = 6.01 h). "
            "The short T½ of Tc-99m means it decays to safe levels within 24 h "
            "after the scan, minimising patient radiation dose. Over **40 million** "
            "Tc-99m procedures are performed annually worldwide."
        )

        # Chain: Mo-99 → Tc-99m → Tc-99 (stable approximation)
        lam_Mo  = np.log(2) / (65.94 * _SEC_PER_HOUR)
        lam_Tc  = np.log(2) / (6.01  * _SEC_PER_HOUR)

        N0_Mo   = 1e12   # arbitrary initial Mo-99 atoms
        t_days_total = 10.0
        t_max_s = t_days_total * _SEC_PER_DAY
        n_pts   = 2000
        t_s     = np.linspace(0, t_max_s, n_pts)
        dt      = t_s[1] - t_s[0]

        # --- Simulate with daily milking (set N_Tc99m → 0 every 24 h) ---
        N_Mo   = np.zeros(n_pts)
        N_Tc_milk = np.zeros(n_pts)   # with milking
        N_Mo[0]      = N0_Mo
        N_Tc_milk[0] = 0.0

        for k in range(1, n_pts):
            # Simple Euler integration (fine resolution makes it accurate)
            dNMo = -lam_Mo * N_Mo[k - 1]
            dNTc = lam_Mo  * N_Mo[k - 1] - lam_Tc * N_Tc_milk[k - 1]
            N_Mo[k]      = N_Mo[k - 1]      + dNMo * dt
            N_Tc_milk[k] = N_Tc_milk[k - 1] + dNTc * dt
            # Daily milking: reset Tc-99m to 0 at each 24-h boundary
            day_k  = t_s[k]  / _SEC_PER_DAY
            day_k1 = t_s[k - 1] / _SEC_PER_DAY
            if int(day_k) > int(day_k1) and k > 1:
                N_Tc_milk[k] = 0.0

        # --- No-milking reference ---
        N_Tc_free = np.zeros(n_pts)
        N_Tc_free[0] = 0.0
        for k in range(1, n_pts):
            dNMo = -lam_Mo * N_Mo[k - 1]  # Mo-99 already computed
            dNTc = lam_Mo  * N_Mo[k - 1] - lam_Tc * N_Tc_free[k - 1]
            N_Tc_free[k] = N_Tc_free[k - 1] + dNTc * dt

        t_days_arr = t_s / _SEC_PER_DAY

        fig_tc = make_fig()
        fig_tc.add_trace(go.Scatter(
            x=t_days_arr,
            y=N_Mo,
            mode="lines",
            name="Mo-99 (T½ = 65.94 h)",
            line=dict(color=COLOURS["primary"], width=2, dash="dash"),
        ))
        fig_tc.add_trace(go.Scatter(
            x=t_days_arr,
            y=N_Tc_milk,
            mode="lines",
            name="Tc-99m with daily milking",
            line=dict(color=COLOURS["highlight"], width=2),
            fill="tozeroy",
            fillcolor=f"rgba(231,76,60,0.15)",
        ))
        fig_tc.add_trace(go.Scatter(
            x=t_days_arr,
            y=N_Tc_free,
            mode="lines",
            name="Tc-99m (no milking — reference)",
            line=dict(color=COLOURS["tertiary"], width=1.5, dash="dot"),
        ))

        # Mark daily milking events
        for day in range(1, int(t_days_total)):
            fig_tc.add_vline(
                x=float(day),
                line_dash="dot",
                line_color=COLOURS["secondary"],
                line_width=1,
                annotation_text="milk" if day == 1 else "",
                annotation_font_color=COLOURS["secondary"],
                annotation_position="top right",
            )

        fig_tc.update_layout(**plotly_layout(
            title="Mo-99/Tc-99m Generator — daily milking simulation",
            xaxis_title="Time (days)",
            yaxis_title="N (atoms)",
            yaxis=dict(exponentformat="e", showexponent="all",
                       gridcolor=COLOURS["grid"],
                       linecolor=COLOURS["grid"],
                       zerolinecolor=COLOURS["grid"]),
            height=420,
            legend=dict(
                orientation="v",
                yanchor="top",
                y=1.0,
                xanchor="left",
                x=1.02,
                bgcolor="rgba(0,0,0,0.4)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
            ),
            margin=dict(l=70, r=220, t=60, b=60),
        ))
        st.plotly_chart(fig_tc, use_container_width=True)

        col_tc1, col_tc2, col_tc3 = st.columns(3)
        col_tc1.metric("Mo-99 T½", "65.94 h")
        col_tc2.metric("Tc-99m T½", "6.01 h")
        col_tc3.metric("Milking interval", "24 h")

        st.caption(
            "The **saw-tooth pattern** shows Tc-99m building up after each 'milking' "
            "(elution). The dashed Mo-99 curve decays with its own half-life. "
            "The dotted green line shows the free (un-milked) equilibrium for comparison. "
            "Key insight: within ~4 Tc-99m half-lives (~24 h) after elution, "
            "the generator is ready for the next milking."
        )


# ── Time to safe level calculator ────────────────────────────────────────────

_SAFE_LEVEL_ISOTOPES = {
    "C-14":   {"T_half_s": 5730.0  * 365.25 * _SEC_PER_DAY,  "label": "C-14  (T½ = 5730 yr)"},
    "I-131":  {"T_half_s": 8.02    * _SEC_PER_DAY,            "label": "I-131 (T½ = 8.02 d)"},
    "Ra-226": {"T_half_s": 1600.0  * 365.25 * _SEC_PER_DAY,  "label": "Ra-226 (T½ = 1600 yr)"},
    "Sr-90":  {"T_half_s": 28.8    * 365.25 * _SEC_PER_DAY,  "label": "Sr-90 (T½ = 28.8 yr)"},
    "Tc-99m": {"T_half_s": 6.01    * _SEC_PER_HOUR,           "label": "Tc-99m (T½ = 6.01 h)"},
    "U-238":  {"T_half_s": 4.468e9 * 365.25 * _SEC_PER_DAY,  "label": "U-238 (T½ = 4.47×10⁹ yr)"},
    "Rn-222": {"T_half_s": 3.82    * _SEC_PER_DAY,            "label": "Rn-222 (T½ = 3.82 d)"},
}


def _format_duration(seconds: float) -> tuple[str, str]:
    """Return (value_str, unit_str) for a duration in seconds, auto-scaled."""
    if seconds < _SEC_PER_HOUR:
        return f"{seconds / 60:.2f}", "minutes"
    elif seconds < _SEC_PER_DAY:
        return f"{seconds / _SEC_PER_HOUR:.2f}", "hours"
    elif seconds < _SEC_PER_YEAR:
        return f"{seconds / _SEC_PER_DAY:.2f}", "days"
    elif seconds < 1e3 * _SEC_PER_YEAR:
        return f"{seconds / _SEC_PER_YEAR:.2f}", "years"
    elif seconds < 1e6 * _SEC_PER_YEAR:
        return f"{seconds / _SEC_PER_YEAR / 1e3:.3f}", "millennia"
    elif seconds < 1e9 * _SEC_PER_YEAR:
        return f"{seconds / _SEC_PER_YEAR / 1e6:.3f}", "million years"
    else:
        return f"{seconds / _SEC_PER_YEAR / 1e9:.4g}", "billion years"


def _render_safe_level_calculator() -> None:
    """Render the 'Time to safe level' expander."""
    with st.expander("⏱️ Time to safe level", expanded=False):
        st.markdown(
            "Calculate how long until a radioactive source falls to a safe "
            "activity level.  Uses: $t_{safe} = T_{½} \\times \\log_2(A_0 / A_{safe})$"
        )

        iso_label = st.selectbox(
            "Isotope of interest",
            list(_SAFE_LEVEL_ISOTOPES.keys()),
            format_func=lambda k: _SAFE_LEVEL_ISOTOPES[k]["label"],
            key="safe_iso",
        )
        col_a1, col_a2 = st.columns(2)
        A0     = col_a1.number_input(
            "Initial activity (Bq)",
            min_value=1.0,
            max_value=1e15,
            value=1000.0,
            format="%.2e",
            step=100.0,
            key="safe_A0",
        )
        A_safe = col_a2.number_input(
            "Safe level (Bq)",
            min_value=1e-6,
            max_value=1e12,
            value=1.0,
            format="%.2e",
            step=1.0,
            key="safe_Asafe",
        )

        if A0 <= A_safe:
            st.info(
                "Initial activity is already at or below the safe level.", icon="✅"
            )
            return

        T_half_s = _SAFE_LEVEL_ISOTOPES[iso_label]["T_half_s"]
        t_safe_s = T_half_s * np.log2(A0 / A_safe)

        val_str, unit_str = _format_duration(t_safe_s)
        st.markdown(
            f"**Time for activity to fall from {A0:.0f} Bq to {A_safe:.0f} Bq:**"
        )
        st.metric(f"Time ({unit_str})", val_str)

        # Small decay curve plot
        # Use 300 points across 1.5× t_safe
        t_plot_s  = np.linspace(0, t_safe_s * 1.5, 300)
        lam_iso   = np.log(2) / T_half_s
        A_plot    = A0 * np.exp(-lam_iso * t_plot_s)

        # Convert to display units (same as the auto-unit)
        unit_to_s_map = {
            "minutes":       60.0,
            "hours":         _SEC_PER_HOUR,
            "days":          _SEC_PER_DAY,
            "years":         _SEC_PER_YEAR,
            "millennia":     1e3 * _SEC_PER_YEAR,
            "million years": 1e6 * _SEC_PER_YEAR,
            "billion years": 1e9 * _SEC_PER_YEAR,
        }
        denom = unit_to_s_map.get(unit_str, 1.0)
        t_plot_disp = t_plot_s / denom
        t_safe_disp = t_safe_s / denom

        fig_sl = make_fig()
        fig_sl.add_trace(go.Scatter(
            x=t_plot_disp,
            y=A_plot,
            mode="lines",
            name=f"A(t) — {iso_label}",
            line=dict(color=COLOURS["primary"], width=2),
        ))
        # Safe level dashed horizontal line
        fig_sl.add_hline(
            y=A_safe,
            line_dash="dash",
            line_color=COLOURS["tertiary"],
            annotation_text=f"Safe level: {A_safe:.2g} Bq",
            annotation_font_color=COLOURS["tertiary"],
            annotation_position="bottom right",
        )
        # Vertical marker at t_safe
        fig_sl.add_vline(
            x=t_safe_disp,
            line_dash="dot",
            line_color=COLOURS["highlight"],
            annotation_text=f"t = {val_str} {unit_str}",
            annotation_font_color=COLOURS["highlight"],
            annotation_position="top right",
        )
        fig_sl.update_layout(**plotly_layout(
            title=f"Activity decay — {iso_label}",
            xaxis_title=f"Time ({unit_str})",
            yaxis_title="Activity (Bq)",
            yaxis=dict(
                exponentformat="e",
                showexponent="all",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                rangemode="tozero",
            ),
            height=320,
            margin=dict(l=70, r=160, t=50, b=50),
        ))
        st.plotly_chart(fig_sl, use_container_width=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────

def render_sidebar() -> dict:
    """Render controls in the left column, return a parameter dict."""
    sim_header("⚛️ Radioactive Decay Chains",
               "Component 3, Topic 6 / 7")
    mode = mode_toggle()
    st.divider()

    st.markdown("### Chain selector")
    chain_name = st.selectbox(
        "Preset chain",
        list(CHAIN_PRESETS.keys()),
        help="Choose a preset decay chain. The simplified chains collapse "
             "very short-lived intermediates for tractability.",
    )
    meta = CHAIN_PRESETS[chain_name]

    # Time scale — only for chains with two timescales
    timescale_label = meta["short_label"] if meta["has_timescale"] else ""
    if meta["has_timescale"]:
        timescale_label = st.radio(
            "Time scale",
            [meta["short_label"], meta["long_label"]],
            index=0,
            help="Short scale shows daughter ingrowth; long scale shows parent depletion.",
        )

    st.divider()
    N0 = st.number_input(
        "N₀ — initial parent atoms",
        min_value=1e6,
        max_value=1e12,
        value=1e9,
        format="%.2e",
        step=1e8,
        help="Number of parent nuclei at t = 0.  All daughters start at zero.",
    )

    compute_btn = st.button("▶ Compute", type="primary", use_container_width=True)

    adv_params: dict = {}

    if mode == "Advanced":
        advanced_divider()

        st.markdown("**Secular equilibrium analysis**")
        adv_params["secular"] = st.checkbox(
            "Show secular equilibrium",
            value=False,
            help="Requires U-238 chain on Short time scale.",
        )

        st.divider()
        st.markdown("**Transient equilibrium demo**")
        adv_params["transient"] = st.checkbox(
            "Show transient equilibrium",
            value=False,
        )

        st.divider()
        st.markdown("**Custom chain builder**")
        adv_params["custom"] = st.checkbox(
            "Enable custom chain",
            value=False,
        )
        if adv_params["custom"]:
            n_custom = st.slider(
                "Number of nuclides",
                min_value=2,
                max_value=4,
                value=3,
                key="n_custom",
            )
            adv_params["n_custom"] = n_custom

            custom_nuclides: list[str] = []
            custom_lambdas:  list[float] = []
            unit_options = ["seconds", "minutes", "hours", "days", "years"]
            unit_to_s = {
                "seconds": 1.0,
                "minutes": _SEC_PER_MIN,
                "hours":   _SEC_PER_HOUR,
                "days":    _SEC_PER_DAY,
                "years":   _SEC_PER_YEAR,
            }
            default_names = ["A", "B", "C", "D"]
            default_hl    = [10.0, 3.0, 1.0, 0.5]
            default_units = ["days", "days", "days", "days"]

            for k in range(n_custom):
                st.markdown(f"*Nuclide {k + 1}*")
                is_last = (k == n_custom - 1)
                if is_last:
                    stable_end = st.checkbox(
                        "Stable end product",
                        value=True,
                        key=f"stable_end_{k}",
                    )
                else:
                    stable_end = False

                name_k = st.text_input(
                    f"Name {k + 1}",
                    value=default_names[k],
                    key=f"cust_name_{k}",
                )
                custom_nuclides.append(name_k or default_names[k])

                if stable_end:
                    custom_lambdas.append(0.0)
                else:
                    hl_val = st.number_input(
                        f"Half-life value {k + 1}",
                        min_value=1e-6,
                        value=default_hl[k],
                        format="%.4g",
                        key=f"cust_hl_{k}",
                    )
                    hl_unit = st.selectbox(
                        f"Unit {k + 1}",
                        unit_options,
                        index=unit_options.index(default_units[k]),
                        key=f"cust_unit_{k}",
                    )
                    hl_s = hl_val * unit_to_s[hl_unit]
                    custom_lambdas.append(np.log(2) / hl_s)

            adv_params["custom_nuclides"] = custom_nuclides
            adv_params["custom_lambdas"]  = custom_lambdas
            adv_params["custom_stable"]   = (
                stable_end if n_custom > 0 else False  # noqa: F821
            )

            adv_params["custom_N0"] = st.number_input(
                "Custom N₀",
                min_value=1e3,
                max_value=1e12,
                value=1e6,
                format="%.2e",
                key="cust_N0",
            )
            adv_params["custom_t_max"] = st.number_input(
                "Time range (max)",
                min_value=0.001,
                value=50.0,
                format="%.3g",
                key="cust_t_max",
            )
            adv_params["custom_t_unit"] = st.selectbox(
                "Time unit",
                unit_options,
                index=3,   # days
                key="cust_t_unit",
            )
            adv_params["custom_solve"] = st.button(
                "▶ Solve Custom Chain",
                key="cust_solve_btn",
            )

        st.divider()
        st.markdown("**Activity plot**")
        adv_params["show_activity"] = st.checkbox(
            "Show activity (decays per second)",
            value=False,
        )

    return dict(
        mode=mode,
        chain_name=chain_name,
        meta=meta,
        timescale_label=timescale_label,
        N0=float(N0),
        compute_btn=compute_btn,
        adv=adv_params,
    )


# ── Session state management ──────────────────────────────────────────────────

def _init_state() -> None:
    if "chain_N" not in st.session_state:
        st.session_state.chain_N        = None
        st.session_state.chain_t_s      = None
        st.session_state.chain_t_disp   = None
        st.session_state.chain_params   = {}
        st.session_state.custom_N       = None
        st.session_state.custom_t_disp  = None
        st.session_state.custom_params  = {}


# ── p5.js nucleus transformation animation ────────────────────────────────────

def build_chain_animation(chain_data: list[dict]) -> str:
    """
    Return an HTML string containing a p5.js nucleus transformation animation.

    Parameters
    ----------
    chain_data : list of dicts, each with keys:
        name          – element symbol + mass number (str)
        Z             – atomic number (int)
        A             – mass number (int)
        decay_type    – 'alpha', 'beta-', 'beta+', or 'stable' (str)
        half_life_str – human-readable half-life (str)
        color         – hex colour for this nuclide (str)
    """
    data_json = json.dumps({"chain": chain_data})
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:#0d1117; font-family:'Segoe UI',sans-serif; overflow:hidden; }}
  #controls {{
    position:absolute; top:8px; right:10px; display:flex; gap:6px;
    align-items:center; z-index:10;
  }}
  #controls button {{
    background:#2d3748; color:#e2e8f0; border:1px solid #4a5568;
    border-radius:4px; padding:3px 10px; cursor:pointer; font-size:12px;
  }}
  #controls button:hover {{ background:#4a5568; }}
  #controls select {{
    background:#2d3748; color:#e2e8f0; border:1px solid #4a5568;
    border-radius:4px; padding:3px 6px; font-size:12px;
  }}
  #timeline {{
    position:absolute; bottom:0; left:0; right:0; height:82px;
    display:flex; align-items:center; justify-content:center;
    gap:4px; padding:6px 10px; background:rgba(0,0,0,0.55);
    overflow-x:auto; flex-wrap:nowrap;
  }}
  .tbox {{
    display:flex; flex-direction:column; align-items:center;
    min-width:52px; padding:4px 6px; border-radius:5px;
    border:1.5px solid #4a5568; background:#1a202c;
    cursor:pointer; transition:background 0.15s,border-color 0.15s;
    font-size:10px; color:#e2e8f0; user-select:none;
  }}
  .tbox:hover {{ background:#2d3748; border-color:#63b3ed; }}
  .tbox.active {{ border-color:#f6e05e; background:#2d3748; }}
  .tbox .tsym {{ font-weight:700; font-size:12px; }}
  .tbox .tnum {{ color:#a0aec0; font-size:9px; }}
  .tarrow {{ color:#4a5568; font-size:18px; align-self:center; flex-shrink:0; }}
  canvas {{ display:block; }}
</style>
</head>
<body>
<div id="controls">
  <button id="playpause">⏸ Pause</button>
  <select id="speedsel">
    <option value="0.5">0.5x</option>
    <option value="1" selected>1x</option>
    <option value="2">2x</option>
    <option value="5">5x</option>
  </select>
</div>
<div id="timeline"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const RAW = {data_json};
const CHAIN = RAW.chain;

// ── Geiger click sound ────────────────────────────────────────────────────────
function playGeigerClick() {{
  try {{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 3000 + Math.random()*2000;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  }} catch(e) {{}}
}}

// ── State ─────────────────────────────────────────────────────────────────────
let currentIdx  = 0;
let isPlaying   = true;
let speed       = 1.0;

// Animation phases:
//   'idle'   – just showing current nucleus
//   'eject'  – particle flying out
//   'morph'  – nucleus label morphing to next
let phase       = 'idle';
let phaseTimer  = 0;          // frames elapsed in this phase
const IDLE_DUR   = 90;        // frames to show nucleus before decaying
const EJECT_DUR  = 50;        // frames for particle ejection
const MORPH_DUR  = 30;        // frames for morph fade

// Particle state
let particleX = 0, particleY = 0;
let particleVX = 0, particleVY = 0;
let particleAlpha = 255;

// Morph alpha (fade old label out)
let morphAlpha = 255;

// Nucleus jitter (shake on decay)
let jitterX = 0, jitterY = 0;

// ── Build timeline DOM ────────────────────────────────────────────────────────
function buildTimeline() {{
  const tl = document.getElementById('timeline');
  tl.innerHTML = '';
  CHAIN.forEach((n, i) => {{
    if (i > 0) {{
      const arr = document.createElement('span');
      arr.className = 'tarrow';
      arr.textContent = '→';
      tl.appendChild(arr);
    }}
    const box = document.createElement('div');
    box.className = 'tbox' + (i === currentIdx ? ' active' : '');
    box.id = 'tbox-' + i;
    box.title = 'T½: ' + n.half_life_str;
    box.innerHTML = `<span class="tsym">${{n.name}}</span><span class="tnum">Z=${{n.Z}} A=${{n.A}}</span>`;
    box.addEventListener('click', () => jumpTo(i));
    tl.appendChild(box);
  }});
}}

function updateTimeline() {{
  CHAIN.forEach((_, i) => {{
    const box = document.getElementById('tbox-' + i);
    if (box) box.className = 'tbox' + (i === currentIdx ? ' active' : '');
  }});
}}

function jumpTo(idx) {{
  currentIdx = Math.max(0, Math.min(idx, CHAIN.length - 1));
  phase = 'idle';
  phaseTimer = 0;
  morphAlpha = 255;
  updateTimeline();
}}

buildTimeline();

// ── Controls ──────────────────────────────────────────────────────────────────
document.getElementById('playpause').addEventListener('click', () => {{
  isPlaying = !isPlaying;
  document.getElementById('playpause').textContent = isPlaying ? '⏸ Pause' : '▶ Play';
}});
document.getElementById('speedsel').addEventListener('change', (e) => {{
  speed = parseFloat(e.target.value);
}});

// ── p5.js sketch ──────────────────────────────────────────────────────────────
new p5(function(p) {{
  const W = 640, H = 360;
  const CX = W/2, CY = H/2 - 30;   // nucleus centre (leave space for timeline)
  const BASE_R = 70;                 // nucleus circle radius

  p.setup = function() {{
    const cnv = p.createCanvas(W, H);
    cnv.parent(document.body);
    p.frameRate(60);
    p.textFont('monospace');
  }};

  // Fixed-size canvas; re-assert dimensions on resize so the sketch
  // stays consistent if the host container reflows.
  p.windowResized = function() {{
    p.resizeCanvas(W, H);
  }};

  // ── Draw packed nucleus (Fermi-style protons + neutrons) ───────────────────
  function drawNucleusParticles(cx, cy, Z, A, r, alphaVal) {{
    const totalN = Math.min(A, 80);   // cap for performance
    const dotR   = Math.max(3, Math.min(7, r * 0.18));
    const layoutR = r * 0.72;
    p.push();
    p.noStroke();
    for (let i = 0; i < totalN; i++) {{
      const angle = i * 2.399963;  // golden angle spiral
      const radius = layoutR * Math.sqrt(i / totalN);
      const nx = cx + radius * Math.cos(angle);
      const ny = cy + radius * Math.sin(angle);
      const isProton = (i < Z);
      if (isProton) {{
        p.fill(220, 60, 60, alphaVal);   // red = proton
      }} else {{
        p.fill(80, 130, 220, alphaVal);  // blue = neutron
      }}
      p.circle(nx, ny, dotR * 2);
    }}
    p.pop();
  }}

  // ── Draw the nucleus shell ─────────────────────────────────────────────────
  function drawNucleus(nuclide, r, alphaVal) {{
    const hexColor = nuclide.color || '#4299e1';
    const cr = parseInt(hexColor.slice(1,3),16);
    const cg = parseInt(hexColor.slice(3,5),16);
    const cb = parseInt(hexColor.slice(5,7),16);

    p.push();
    // Outer glow
    p.noFill();
    for (let g = 18; g >= 2; g -= 2) {{
      p.stroke(cr, cg, cb, alphaVal * 0.06);
      p.strokeWeight(g);
      p.circle(CX + jitterX, CY + jitterY, r*2);
    }}
    // Main circle
    p.strokeWeight(2.5);
    p.stroke(cr, cg, cb, alphaVal);
    p.fill(10, 15, 25, alphaVal * 0.85);
    p.circle(CX + jitterX, CY + jitterY, r*2);
    p.pop();

    // Packed nucleons
    drawNucleusParticles(CX + jitterX, CY + jitterY, nuclide.Z, nuclide.A, r, alphaVal);
  }}

  // ── Draw element label ─────────────────────────────────────────────────────
  function drawLabel(nuclide, alphaVal) {{
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();

    // Semi-transparent label background
    p.fill(0, 0, 0, alphaVal * 0.5);
    p.rect(CX + jitterX - 48, CY + jitterY - 22, 96, 44, 6);

    // Element symbol
    p.textSize(26);
    p.fill(240, 240, 240, alphaVal);
    p.text(nuclide.name, CX + jitterX, CY + jitterY - 4);

    // Z and A numbers
    p.textSize(11);
    p.fill(180, 200, 220, alphaVal);
    p.text('Z=' + nuclide.Z + '  A=' + nuclide.A, CX + jitterX, CY + jitterY + 16);
    p.pop();
  }}

  // ── Draw decay type badge ──────────────────────────────────────────────────
  function drawDecayBadge(decayType, alphaVal) {{
    let label, r, g, b;
    if (decayType === 'alpha')  {{ label = 'α decay'; r=230; g=200; b=40;  }}
    else if (decayType === 'beta-') {{ label = 'β⁻ decay'; r=80;  g=160; b=230; }}
    else if (decayType === 'beta+') {{ label = 'β⁺ decay'; r=230; g=140; b=50;  }}
    else {{ return; }}
    p.push();
    p.noStroke();
    p.fill(r, g, b, alphaVal * 0.2);
    p.rect(CX - 45, CY + BASE_R + 10, 90, 22, 4);
    p.fill(r, g, b, alphaVal);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text(label, CX, CY + BASE_R + 21);
    p.pop();
  }}

  // ── Draw ejected particle ──────────────────────────────────────────────────
  function drawParticle(decayType, alpha) {{
    if (decayType === 'alpha') {{
      // He-4: large yellow-green circle
      p.push();
      p.noStroke();
      p.fill(180, 230, 50, alpha);
      p.circle(particleX, particleY, 22);
      p.fill(240, 255, 100, alpha);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(9);
      p.text('He-4', particleX, particleY);
      p.pop();
    }} else if (decayType === 'beta-') {{
      // electron: small blue dot
      p.push();
      p.noStroke();
      p.fill(80, 160, 255, alpha);
      p.circle(particleX, particleY, 10);
      // antineutrino: tiny dotted particle trailing behind
      p.fill(180, 180, 180, alpha * 0.6);
      p.circle(particleX - particleVX * 8, particleY - particleVY * 8, 5);
      p.pop();
    }} else if (decayType === 'beta+') {{
      // positron: small orange dot
      p.push();
      p.noStroke();
      p.fill(255, 140, 40, alpha);
      p.circle(particleX, particleY, 10);
      p.pop();
    }}
  }}

  // ── Advance animation phase ────────────────────────────────────────────────
  function advancePhase() {{
    const nuclide = CHAIN[currentIdx];
    const isStable = (nuclide.decay_type === 'stable' || currentIdx >= CHAIN.length - 1);
    const framesPerStep = Math.max(1, Math.round(1 / speed));

    if (!isPlaying) return;

    for (let s = 0; s < Math.max(1, speed); s++) {{
      phaseTimer++;
    }}

    if (phase === 'idle') {{
      jitterX = 0; jitterY = 0;
      if (isStable) return;   // stable: stay forever
      if (phaseTimer >= IDLE_DUR) {{
        // Start ejection
        phase = 'eject';
        phaseTimer = 0;
        playGeigerClick();

        // Random direction, biased away from canvas edges
        const angle = p.random(-p.HALF_PI * 0.8, p.HALF_PI * 0.8) + (p.random() > 0.5 ? 0 : p.PI);
        const spd   = nuclide.decay_type === 'alpha' ? 4 : 6;
        particleX   = CX;
        particleY   = CY;
        particleVX  = Math.cos(angle) * spd;
        particleVY  = Math.sin(angle) * spd;
        particleAlpha = 255;
      }}
    }} else if (phase === 'eject') {{
      particleX += particleVX * speed;
      particleY += particleVY * speed;
      particleAlpha = p.map(phaseTimer, 0, EJECT_DUR, 255, 0);

      // Jitter nucleus
      jitterX = p.random(-3, 3) * (1 - phaseTimer/EJECT_DUR);
      jitterY = p.random(-3, 3) * (1 - phaseTimer/EJECT_DUR);

      if (phaseTimer >= EJECT_DUR) {{
        phase = 'morph';
        phaseTimer = 0;
        morphAlpha = 255;
        jitterX = 0; jitterY = 0;
      }}
    }} else if (phase === 'morph') {{
      morphAlpha = p.map(phaseTimer, 0, MORPH_DUR, 255, 0);
      if (phaseTimer >= MORPH_DUR) {{
        // Advance to next nuclide
        currentIdx = Math.min(currentIdx + 1, CHAIN.length - 1);
        updateTimeline();
        phase = 'idle';
        phaseTimer = 0;
        morphAlpha = 255;
      }}
    }}
  }}

  p.draw = function() {{
    p.background(13, 17, 23);
    advancePhase();

    const nuclide = CHAIN[currentIdx];
    const nextNuclide = (currentIdx + 1 < CHAIN.length) ? CHAIN[currentIdx + 1] : null;
    const isStable = (nuclide.decay_type === 'stable' || currentIdx >= CHAIN.length - 1);

    // Half-life text top-left
    p.push();
    p.noStroke();
    p.fill(160, 180, 200, 200);
    p.textSize(11);
    p.textAlign(p.LEFT, p.TOP);
    p.text('T½ = ' + nuclide.half_life_str, 10, 10);
    if (isStable) {{
      p.fill(100, 220, 130, 200);
      p.text('STABLE — end of chain', 10, 26);
    }}
    p.pop();

    if (phase === 'morph' && nextNuclide) {{
      // Fade old nucleus out, fade new in
      const oldAlpha = morphAlpha;
      const newAlpha = 255 - morphAlpha;
      drawNucleus(nuclide, BASE_R, oldAlpha);
      drawLabel(nuclide, oldAlpha);
      drawNucleus(nextNuclide, BASE_R, newAlpha);
      drawLabel(nextNuclide, newAlpha);
    }} else {{
      drawNucleus(nuclide, BASE_R, 255);
      drawLabel(nuclide, 255);
    }}

    // Decay badge (show during idle and eject phases)
    if ((phase === 'idle' || phase === 'eject') && !isStable) {{
      const badgeAlpha = phase === 'eject' ? p.map(phaseTimer, 0, EJECT_DUR, 255, 80) : 200;
      drawDecayBadge(nuclide.decay_type, badgeAlpha);
    }}

    // Particle
    if (phase === 'eject' && !isStable) {{
      drawParticle(nuclide.decay_type, particleAlpha);
    }}

    // Legend: proton/neutron key
    p.push();
    p.noStroke();
    p.fill(220, 60, 60, 180);
    p.circle(10, H - 102, 8);
    p.fill(200, 210, 220, 180);
    p.textSize(10);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('proton', 18, H - 102);
    p.fill(80, 130, 220, 180);
    p.circle(10, H - 90, 8);
    p.fill(200, 210, 220, 180);
    p.text('neutron', 18, H - 90);
    p.pop();
  }};
}});
</script>
</body>
</html>"""


# ── Helper: build chain_data list for animation ───────────────────────────────

# Colour palette for animation timeline boxes — one per nuclide slot
_ANIM_COLOURS = ["#4299e1", "#ed8936", "#48bb78", "#f56565", "#9f7aea", "#38b2ac"]

# Map CHAIN_PRESETS decay_type strings to canonical animation keys
_DECAY_TYPE_MAP = {
    "α":     "alpha",
    "β⁻":    "beta-",
    "β⁻/α":  "beta-",   # simplified — Bi-214 primary mode
    "β⁺":    "beta+",
    "—":     "stable",
    "":      "stable",
}

# Approximate Z (atomic number) for nuclides that appear in the presets
_NUCLIDE_Z = {
    "U-238":  92, "Th-234": 90, "Pb-206":  82,
    "Th-232": 90, "Ra-228":  88, "Pb-208": 82,
    "Rn-222": 86, "Po-218":  84, "Pb-214": 82,
    "Bi-214": 83, "Pb-210":  82,
}


def _build_chain_data(meta: dict) -> list[dict]:
    """
    Convert a CHAIN_PRESETS entry into the chain_data list expected by
    build_chain_animation().
    """
    nuclides     = meta["nuclides"]
    hl_disp      = meta["halflife_disp"]
    decay_types  = meta["decay_types"]
    chain_data   = []

    for i, name in enumerate(nuclides):
        # Parse A from the nuclide name, e.g. "U-238" → A=238, "Rn-222" → A=222
        try:
            A = int(name.split("-")[1])
        except (IndexError, ValueError):
            A = 0

        Z = _NUCLIDE_Z.get(name, 0)
        raw_decay = decay_types[i] if i < len(decay_types) else "—"
        decay_type = _DECAY_TYPE_MAP.get(raw_decay, "stable")
        hl_str = hl_disp[i] if i < len(hl_disp) else "—"
        colour = _ANIM_COLOURS[i % len(_ANIM_COLOURS)]

        chain_data.append({
            "name":          name,
            "Z":             Z,
            "A":             A,
            "decay_type":    decay_type,
            "half_life_str": hl_str,
            "color":         colour,
        })

    return chain_data


# ── Main page ─────────────────────────────────────────────────────────────────

def main() -> None:
    _init_state()
    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        p = render_sidebar()

    mode        = p["mode"]
    meta        = p["meta"]
    chain_name  = p["chain_name"]
    N0          = p["N0"]
    adv         = p["adv"]

    # ── Compute on button press ───────────────────────────────────────────────
    if p["compute_btn"]:
        t_arr_s, x_label = _make_t_arr(meta, p["timescale_label"])
        lambdas = meta["lambdas_fn"]()
        stable_idx = meta.get("stable_idx")
        N = _compute_chain(lambdas, N0, t_arr_s, stable_idx)
        unit_str = x_label.replace("Time (", "").replace(")", "")
        t_disp = _t_display(t_arr_s, unit_str)

        st.session_state.chain_N       = N
        st.session_state.chain_t_s     = t_arr_s
        st.session_state.chain_t_disp  = t_disp
        st.session_state.chain_params  = {
            "chain_name":  chain_name,
            "meta":        meta,
            "N0":          N0,
            "x_label":     x_label,
            "unit_str":    unit_str,
            "lambdas":     lambdas,
            "stable_idx":  stable_idx,
            "timescale":   p["timescale_label"],
        }

    with left_col:
        st.markdown("### How to use")
        st.info(
            "1. Select a preset decay chain.\n"
            "2. Choose the time scale (where applicable).\n"
            "3. Set N₀ (initial parent atoms).\n"
            "4. Click **▶ Compute** to solve the Bateman equations.\n\n"
            "The stacked area chart shows each nuclide's population. "
            "The total height always equals N₀ (conservation of nucleons).",
            icon="ℹ️",
        )

        if st.session_state.chain_N is not None:
            cp = st.session_state.chain_params
            N_final = st.session_state.chain_N[-1]
            nuclides = cp["meta"]["nuclides"]
            n_radio = len([l for l in cp["lambdas"] if l > 0])
            parent_frac = N_final[0] / cp["N0"] if cp["N0"] > 0 else 0.0
            daughter_frac = (
                N_final[1] / cp["N0"] if len(nuclides) > 1 and cp["N0"] > 0 else 0.0
            )
            metric_row({
                f"{nuclides[0]} remaining": f"{parent_frac:.4f}",
                f"{nuclides[1]} fraction": f"{daughter_frac:.4f}",
            })
            if cp["stable_idx"] is not None:
                stable_frac = N_final[cp["stable_idx"]] / cp["N0"]
                st.metric(
                    f"{nuclides[cp['stable_idx']]} accumulated",
                    f"{stable_frac:.4f}",
                )

    with right_col:
        st.title("⚛️ Radioactive Decay Chains")
        st.caption("WJEC Eduqas A Level Physics — Component 3, Topic 6 / 7")

        # ── Nucleus transformation animation ──────────────────────────────────
        chain_data_list = _build_chain_data(meta)
        components.html(build_chain_animation(chain_data_list), height=440)
        st.caption("▶ Play/pause · ⚡ speed · Click timeline boxes · 🔊 Geiger sounds on decay")
        st.divider()

        # ── Main basic plot ───────────────────────────────────────────────────
        if st.session_state.chain_N is not None:
            cp  = st.session_state.chain_params
            N   = st.session_state.chain_N
            t_d = st.session_state.chain_t_disp
            meta_cp  = cp["meta"]
            nuclides = meta_cp["nuclides"]
            hl_disp  = meta_cp["halflife_disp"]

            fig = _build_stacked_area(
                t_display=t_d,
                N=N,
                nuclides=nuclides,
                halflife_disp=hl_disp,
                x_label=cp["x_label"],
                title=f"Decay chain: {cp['chain_name']}",
                colours=_CHAIN_COLOURS[:len(nuclides)],
                height=500,
            )
            st.plotly_chart(fig, use_container_width=True)

            # ── Chain schematic (visual HTML) ─────────────────────────────
            _render_chain_schematic(cp["chain_name"], meta_cp)

            # Radon home contamination context
            if "Rn-222" in cp["chain_name"]:
                st.warning(
                    "☢️ **Radon in homes:** Rn-222 is produced by Ra-226 decay in soil "
                    "and rock. It seeps into poorly ventilated buildings and is the second "
                    "leading cause of lung cancer in the UK (after smoking), responsible for "
                    "~1,100 deaths/year. Average UK indoor level: ~20 Bq/m³. UK action "
                    "level: 200 Bq/m³. Simple fix: improved ventilation or sump pump. "
                    "Check your home at radon.co.uk",
                )

            # Metric row at final time
            N_final = N[-1]
            N0_cp   = cp["N0"]
            parent_frac = N_final[0] / N0_cp if N0_cp > 0 else 0.0
            d1_frac     = N_final[1] / N0_cp if len(nuclides) > 1 and N0_cp > 0 else 0.0
            metric_dict = {
                f"{nuclides[0]} fraction remaining": f"{parent_frac:.5g}",
                f"{nuclides[1]} fraction of N₀":    f"{d1_frac:.5g}",
            }
            if cp["stable_idx"] is not None:
                s_idx = cp["stable_idx"]
                stable_frac = N_final[s_idx] / N0_cp if N0_cp > 0 else 0.0
                metric_dict[f"{nuclides[s_idx]} (stable) fraction"] = f"{stable_frac:.5g}"
            metric_row(metric_dict)

        else:
            # Placeholder
            st.markdown(
                "<div style='height:500px;display:flex;align-items:center;"
                "justify-content:center;color:#888;border:1px dashed #444;"
                "border-radius:8px;font-size:1.1rem;'>"
                "Press <b>▶ Compute</b> to solve the decay equations."
                "</div>",
                unsafe_allow_html=True,
            )

        # ── Time to safe level calculator ────────────────────────────────────
        _render_safe_level_calculator()

        # ── Advanced section ──────────────────────────────────────────────────
        if mode == "Advanced":
            advanced_divider()

            # ── 1. Secular equilibrium ────────────────────────────────────────
            _ADV = COLOURS["advanced"]
            st.markdown(
                f"<p style='color:{_ADV};font-weight:600;font-size:1rem'>"
                "1 — Secular equilibrium analysis</p>",
                unsafe_allow_html=True,
            )

            if adv.get("secular", False):
                # Always use U-238 chain on short timescale for this demo
                lam_U  = np.log(2) / (4.468e9 * _SEC_PER_YEAR)
                lam_Th = np.log(2) / (24.1    * _SEC_PER_DAY)
                t_200d_s = np.linspace(0, 200 * _SEC_PER_DAY, 500)
                N_sec = _compute_chain([lam_U, lam_Th, 0.0], N0, t_200d_s, stable_idx=2)
                t_days = t_200d_s / _SEC_PER_DAY

                # Theoretical secular equilibrium daughter count
                N_U_at_200 = N_sec[-1, 0]
                N_Th_eq    = N_U_at_200 * lam_U / lam_Th
                N_Th_actual = N_sec[-1, 1]
                ratio_theor = lam_U / lam_Th
                ratio_actual = N_Th_actual / N_U_at_200 if N_U_at_200 > 0 else 0.0

                st.info(
                    "**Secular equilibrium condition:** λ_parent ≪ λ_daughter\n\n"
                    "When satisfied, the daughter builds up until its decay rate "
                    "equals the parent's production rate. Thereafter "
                    "N_daughter / N_parent = λ_parent / λ_daughter.",
                    icon="📐",
                )

                col_s1, col_s2, col_s3 = st.columns(3)
                col_s1.metric("λ_U238 / λ_Th234", f"{ratio_theor:.4e}")
                col_s2.metric("N_Th / N_U at 200 d (actual)", f"{ratio_actual:.4e}")
                col_s3.metric(
                    "Agreement",
                    f"{abs(ratio_actual - ratio_theor) / ratio_theor * 100:.2f}%",
                )

                fig_sec = make_fig()
                fig_sec.add_trace(go.Scatter(
                    x=t_days,
                    y=N_sec[:, 0],
                    mode="lines",
                    name="N(U-238)",
                    line=dict(color=COLOURS["primary"], width=2),
                ))
                fig_sec.add_trace(go.Scatter(
                    x=t_days,
                    y=N_sec[:, 1],
                    mode="lines",
                    name="N(Th-234) — actual",
                    line=dict(color=COLOURS["secondary"], width=2),
                ))
                # Horizontal dashed line at secular equilibrium
                N_eq_arr = np.full_like(t_days, N_sec[:, 0].mean() * lam_U / lam_Th)
                fig_sec.add_trace(go.Scatter(
                    x=t_days,
                    y=N_eq_arr,
                    mode="lines",
                    name="Secular equilibrium N_Th (theoretical)",
                    line=dict(color=COLOURS["tertiary"], width=2, dash="dash"),
                ))
                fig_sec.add_annotation(
                    x=100,
                    y=float(N_eq_arr[0]) * 1.6,
                    text=(
                        "Secular equilibrium:<br>"
                        "N_Th / N_U = λ_U / λ_Th"
                    ),
                    showarrow=True,
                    arrowhead=2,
                    ax=0,
                    ay=-40,
                    font=dict(size=11, color=COLOURS["tertiary"]),
                    bgcolor="rgba(0,0,0,0.5)",
                    bordercolor=COLOURS["tertiary"],
                )
                fig_sec.update_layout(**plotly_layout(
                    title="Secular equilibrium — U-238 / Th-234 (0–200 days)",
                    xaxis_title="Time (days)",
                    yaxis_title="N (atoms)",
                    yaxis=dict(exponentformat="e", showexponent="all",
                               gridcolor=COLOURS["grid"],
                               linecolor=COLOURS["grid"],
                               zerolinecolor=COLOURS["grid"]),
                    height=400,
                ))
                st.plotly_chart(fig_sec, use_container_width=True)
                st.caption(
                    "The Th-234 population rises rapidly (T½ = 24.1 d) and plateaus "
                    "within ~4 half-lives. At equilibrium its decay rate λ_Th·N_Th "
                    "equals the production rate λ_U·N_U."
                )

            else:
                st.markdown(
                    "_Enable 'Show secular equilibrium' in the sidebar to see the analysis._"
                )

            st.divider()

            # ── 2. Transient equilibrium ──────────────────────────────────────
            st.markdown(
                f"<p style='color:{_ADV};font-weight:600;font-size:1rem'>"
                "2 — Transient equilibrium demo</p>",
                unsafe_allow_html=True,
            )

            if adv.get("transient", False):
                lam_P = np.log(2) / (10 * _SEC_PER_DAY)   # parent T½ = 10 days
                lam_D = np.log(2) / (1  * _SEC_PER_DAY)   # daughter T½ = 1 day
                N0_tr = 1e6
                t_tr_s = np.linspace(0, 50 * _SEC_PER_DAY, 1000)
                N_tr = _compute_chain([lam_P, lam_D], N0_tr, t_tr_s, stable_idx=None)
                t_tr_d = t_tr_s / _SEC_PER_DAY

                # Activity of each
                A_P = lam_P * N_tr[:, 0]
                A_D = lam_D * N_tr[:, 1]

                # Find where daughter activity peaks: dA_D/dt ~ 0
                # Analytically occurs when λ_P·N_P = λ_D·N_D
                peak_idx = int(np.argmax(A_D))

                st.info(
                    "**Transient equilibrium:** parent T½ ≈ 10 × daughter T½.\n\n"
                    "The daughter activity rises, overshoots the parent activity, "
                    "then both activities decrease together (daughter tracks parent). "
                    "The daughter activity peak occurs when dN_D/dt = 0, i.e. "
                    "when λ_P·N_P = λ_D·N_D.",
                    icon="📐",
                )

                fig_tr = make_fig()
                fig_tr.add_trace(go.Scatter(
                    x=t_tr_d,
                    y=N_tr[:, 0],
                    mode="lines",
                    name="Parent (T½ = 10 d)",
                    line=dict(color=COLOURS["primary"], width=2),
                ))
                fig_tr.add_trace(go.Scatter(
                    x=t_tr_d,
                    y=N_tr[:, 1],
                    mode="lines",
                    name="Daughter (T½ = 1 d)",
                    line=dict(color=COLOURS["secondary"], width=2),
                ))
                # Mark peak
                fig_tr.add_vline(
                    x=float(t_tr_d[peak_idx]),
                    line_dash="dot",
                    line_color=COLOURS["highlight"],
                    annotation_text="Daughter N peaks",
                    annotation_font_color=COLOURS["highlight"],
                    annotation_position="top right",
                )
                fig_tr.update_layout(**plotly_layout(
                    title="Transient equilibrium — 2-nuclide chain (T½_P = 10d, T½_D = 1d)",
                    xaxis_title="Time (days)",
                    yaxis_title="N (atoms)",
                    yaxis=dict(exponentformat="e", showexponent="all",
                               gridcolor=COLOURS["grid"],
                               linecolor=COLOURS["grid"],
                               zerolinecolor=COLOURS["grid"]),
                    height=380,
                ))
                st.plotly_chart(fig_tr, use_container_width=True)

                # Activity subplot
                fig_act_tr = make_fig()
                fig_act_tr.add_trace(go.Scatter(
                    x=t_tr_d,
                    y=A_P,
                    mode="lines",
                    name="Activity A_parent",
                    line=dict(color=COLOURS["primary"], width=2),
                ))
                fig_act_tr.add_trace(go.Scatter(
                    x=t_tr_d,
                    y=A_D,
                    mode="lines",
                    name="Activity A_daughter",
                    line=dict(color=COLOURS["secondary"], width=2),
                ))
                fig_act_tr.add_vline(
                    x=float(t_tr_d[peak_idx]),
                    line_dash="dot",
                    line_color=COLOURS["highlight"],
                    annotation_text="Daughter activity peak",
                    annotation_font_color=COLOURS["highlight"],
                    annotation_position="top right",
                )
                fig_act_tr.update_layout(**plotly_layout(
                    title="Activities during transient equilibrium",
                    xaxis_title="Time (days)",
                    yaxis_title="Activity A (decays s⁻¹)",
                    yaxis=dict(exponentformat="e", showexponent="all",
                               gridcolor=COLOURS["grid"],
                               linecolor=COLOURS["grid"],
                               zerolinecolor=COLOURS["grid"]),
                    height=340,
                ))
                st.plotly_chart(fig_act_tr, use_container_width=True)
                st.caption(
                    f"Daughter activity peak at t = {t_tr_d[peak_idx]:.2f} days. "
                    "After this point both activities decrease with the parent's half-life — "
                    "the hallmark of transient equilibrium."
                )

            else:
                st.markdown(
                    "_Enable 'Show transient equilibrium' in the sidebar._"
                )

            st.divider()

            # ── 3. Custom chain builder ───────────────────────────────────────
            st.markdown(
                f"<p style='color:{_ADV};font-weight:600;font-size:1rem'>"
                "3 — Custom decay chain builder</p>",
                unsafe_allow_html=True,
            )

            if adv.get("custom", False):
                custom_nuclides = adv.get("custom_nuclides", ["A", "B", "C"])
                custom_lambdas  = adv.get("custom_lambdas",  [1.0, 0.5, 0.0])
                custom_N0       = adv.get("custom_N0",       1e6)
                custom_t_max    = adv.get("custom_t_max",    50.0)
                custom_t_unit   = adv.get("custom_t_unit",   "days")
                unit_to_s = {
                    "seconds": 1.0,
                    "minutes": _SEC_PER_MIN,
                    "hours":   _SEC_PER_HOUR,
                    "days":    _SEC_PER_DAY,
                    "years":   _SEC_PER_YEAR,
                }
                t_max_s_cust = custom_t_max * unit_to_s.get(custom_t_unit, _SEC_PER_DAY)
                stable_end   = adv.get("custom_stable", False)
                stable_idx_c = len(custom_lambdas) - 1 if stable_end else None

                if adv.get("custom_solve", False):
                    t_c_s = np.linspace(0, t_max_s_cust, 500)
                    N_c   = _compute_chain(custom_lambdas, custom_N0, t_c_s, stable_idx_c)
                    t_c_d = t_c_s / unit_to_s.get(custom_t_unit, _SEC_PER_DAY)
                    st.session_state.custom_N      = N_c
                    st.session_state.custom_t_disp = t_c_d
                    st.session_state.custom_params = {
                        "nuclides":  custom_nuclides,
                        "lambdas":   custom_lambdas,
                        "N0":        custom_N0,
                        "t_unit":    custom_t_unit,
                        "stable_idx": stable_idx_c,
                    }

                if st.session_state.custom_N is not None:
                    cp_c = st.session_state.custom_params
                    # Generate half-life display strings
                    hl_disp_c = []
                    for lam_c in cp_c["lambdas"]:
                        if lam_c == 0:
                            hl_disp_c.append("stable")
                        else:
                            hl_s_c = np.log(2) / lam_c
                            if hl_s_c < _SEC_PER_MIN:
                                hl_disp_c.append(f"{hl_s_c:.2f} s")
                            elif hl_s_c < _SEC_PER_HOUR:
                                hl_disp_c.append(f"{hl_s_c / _SEC_PER_MIN:.2f} min")
                            elif hl_s_c < _SEC_PER_DAY:
                                hl_disp_c.append(f"{hl_s_c / _SEC_PER_HOUR:.2f} hr")
                            elif hl_s_c < _SEC_PER_YEAR:
                                hl_disp_c.append(f"{hl_s_c / _SEC_PER_DAY:.2f} d")
                            else:
                                hl_disp_c.append(f"{hl_s_c / _SEC_PER_YEAR:.2f} yr")

                    fig_cust = _build_stacked_area(
                        t_display=st.session_state.custom_t_disp,
                        N=st.session_state.custom_N,
                        nuclides=cp_c["nuclides"],
                        halflife_disp=hl_disp_c,
                        x_label=f"Time ({cp_c['t_unit']})",
                        title="Custom decay chain",
                        colours=_CHAIN_COLOURS[:len(cp_c["nuclides"])],
                        height=420,
                    )
                    st.plotly_chart(fig_cust, use_container_width=True)
                else:
                    st.markdown(
                        "_Configure the chain in the sidebar and press "
                        "**▶ Solve Custom Chain** to see the result._"
                    )
            else:
                st.markdown(
                    "_Enable 'Enable custom chain' in the sidebar to build your own chain._"
                )

            st.divider()

            # ── 4. Activity plot ──────────────────────────────────────────────
            st.markdown(
                f"<p style='color:{_ADV};font-weight:600;font-size:1rem'>"
                "4 — Activity plot  A(t) = λN(t)</p>",
                unsafe_allow_html=True,
            )

            if adv.get("show_activity", False):
                if st.session_state.chain_N is not None:
                    cp_a   = st.session_state.chain_params
                    N_a    = st.session_state.chain_N
                    t_d_a  = st.session_state.chain_t_disp
                    lams_a = cp_a["lambdas"]
                    nucs_a = cp_a["meta"]["nuclides"]
                    hl_a   = cp_a["meta"]["halflife_disp"]

                    fig_2 = make_subplots(
                        rows=2,
                        cols=1,
                        shared_xaxes=True,
                        subplot_titles=["Population N(t)", "Activity A(t) = λ·N(t)"],
                        vertical_spacing=0.12,
                    )
                    fig_2.update_layout(**plotly_layout(
                        height=700,
                        margin=dict(l=70, r=200, t=60, b=60),
                    ))

                    for i, (nuc, hl, lam_i) in enumerate(zip(nucs_a, hl_a, lams_a)):
                        col_i = _CHAIN_COLOURS[i % len(_CHAIN_COLOURS)]
                        label = f"{nuc} (T½={hl})"

                        fig_2.add_trace(go.Scatter(
                            x=t_d_a,
                            y=N_a[:, i],
                            mode="lines",
                            name=label,
                            line=dict(color=col_i, width=1.8),
                            legendgroup=nuc,
                        ), row=1, col=1)

                        # Activity: skip stable nuclides
                        if lam_i > 0:
                            A_i = lam_i * N_a[:, i]
                            fig_2.add_trace(go.Scatter(
                                x=t_d_a,
                                y=A_i,
                                mode="lines",
                                name=f"A({nuc})",
                                line=dict(color=col_i, width=1.8, dash="dot"),
                                legendgroup=nuc,
                                showlegend=True,
                            ), row=2, col=1)

                    fig_2.update_yaxes(
                        title_text="N (atoms)",
                        exponentformat="e",
                        showexponent="all",
                        gridcolor=COLOURS["grid"],
                        row=1, col=1,
                    )
                    fig_2.update_yaxes(
                        title_text="A (Bq)",
                        exponentformat="e",
                        showexponent="all",
                        gridcolor=COLOURS["grid"],
                        row=2, col=1,
                    )
                    fig_2.update_xaxes(
                        title_text=cp_a["x_label"],
                        gridcolor=COLOURS["grid"],
                        row=2, col=1,
                    )
                    st.plotly_chart(fig_2, use_container_width=True)

                    # Tc-99m generator visualisation — only for U-238 chain
                    if "U-238" in chain_name:
                        _render_tc99m_generator()

                    st.info(
                        "**Tc-99m generator (medical physics application):**  \n"
                        "Mo-99 (T½ = 66 h) decays to Tc-99m (T½ = 6 h) — a perfect "
                        "transient-equilibrium pair. The generator column is 'milked' "
                        "daily: Tc-99m is eluted while Mo-99 remains on the column and "
                        "regenerates fresh Tc-99m. Tc-99m is a pure gamma emitter "
                        "(140 keV) used in >80% of all nuclear medicine imaging procedures "
                        "(bone scans, cardiac perfusion, sentinel node detection).",
                        icon="🏥",
                    )
                else:
                    st.warning(
                        "Solve the main chain first (press **▶ Compute** in the sidebar).",
                        icon="⚠️",
                    )
            else:
                st.markdown(
                    "_Enable 'Show activity' in the sidebar to see A(t) = λN(t) plots._"
                )

        # ── WJEC exam practice questions ──────────────────────────────────────
        _decay_questions = [
            {
                "q": (
                    "Complete the nuclear equation for alpha decay of U-238: "
                    "²³⁸₉₂U → ? + ⁴₂He"
                ),
                "marks": 2,
                "answer": "²³⁴₉₀Th  (Thorium-234)",
                "working": [
                    "Alpha decay: A decreases by 4, Z decreases by 2.",
                    "238 − 4 = 234,  92 − 2 = 90  →  Thorium-234  (²³⁴₉₀Th)",
                ],
                "hint": "An alpha particle is ⁴₂He; conserve both mass number A and atomic number Z.",
            },
            {
                "q": (
                    "In beta-minus decay, a neutron transforms into a proton. "
                    "Write the particle equation for this change at the quark level."
                ),
                "marks": 2,
                "answer": "d → u + e⁻ + ν̄ₑ  (a down quark becomes an up quark)",
                "working": [
                    "β⁻ decay is mediated by the W⁻ boson.",
                    "d quark → u quark + W⁻  →  u quark + e⁻ + ν̄ₑ",
                ],
            },
            {
                "q": (
                    "Th-234 undergoes beta-minus decay. Write the full nuclear equation "
                    "and identify the daughter nucleus."
                ),
                "marks": 3,
                "answer": "²³⁴₉₀Th → ²³⁴₉₁Pa + ⁰₋₁e + ν̄ₑ",
                "working": [
                    "β⁻ decay: Z increases by 1, A is unchanged.",
                    "90 + 1 = 91  →  Protactinium (Pa)",
                    "Full equation: ²³⁴₉₀Th → ²³⁴₉₁Pa + ⁰₋₁e + ν̄ₑ",
                ],
                "hint": "In β⁻ decay a neutron becomes a proton, so Z goes up by 1 and A stays the same.",
            },
        ]
        show_exam_panel(_decay_questions)

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=(
                "Component 3, Topic 6 (Nuclear Decay) — extension; links to Topic 7"
            ),
            equations=[
                r"\frac{dN_A}{dt} = -\lambda_A N_A",
                r"\frac{dN_B}{dt} = \lambda_A N_A - \lambda_B N_B",
                (
                    r"\text{Secular equilibrium: } "
                    r"\frac{N_B}{N_A} = \frac{\lambda_A}{\lambda_B}"
                    r" \text{ when } \lambda_A \ll \lambda_B"
                ),
            ],
            explanation=(
                "In a decay chain, each daughter nuclide is itself radioactive. "
                "Its population grows due to parent decay and decreases due to its "
                "own decay. The Bateman equations describe this coupled system. "
                "The stacked area chart shows each nuclide's contribution; the total "
                "height always equals N₀, reflecting conservation of nucleon number."
            ),
            advanced_text=(
                "**Secular equilibrium:** when parent half-life >> daughter half-life, "
                "the daughter reaches a steady state where its production rate "
                "(λ_A·N_A) equals its decay rate (λ_B·N_B). "
                "This is exploited in Tc-99m generators: Mo-99 (T½=66h) decays to "
                "Tc-99m (T½=6h) — the generator is 'milked' daily. Tc-99m is used "
                "in medical imaging (99% of nuclear medicine procedures).\n\n"
                "**Transient equilibrium** occurs when the parent is longer-lived than "
                "the daughter but only by a modest factor (typically ~10×). After "
                "several daughter half-lives the activities become equal, then decline "
                "together with the parent's half-life.\n\n"
                "**No equilibrium** arises when the daughter is longer-lived than the "
                "parent; the parent decays away and daughter activity simply grows then "
                "decays independently."
            ),
            mode=mode,
        )


# ── Entry point ───────────────────────────────────────────────────────────────

main()
