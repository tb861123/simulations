"""
Radioactive Decay Chains — WJEC Eduqas A Level Physics
Component 3, Topic 6 (Nuclear Decay) — extension; links to Topic 7

Solves coupled Bateman equations for linear decay chains.  Stiff chains (e.g.
Rn-222, which mixes half-lives from minutes to years) are integrated with
scipy's implicit Radau solver; non-stiff long-timescale chains fall back to the
shared RK4 helper.  Advanced mode covers secular/transient equilibrium,
a custom chain builder, and activity plots with the Tc-99m medical application.
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy.integrate import solve_ivp
import streamlit as st

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

            # Chain diagram
            st.markdown("**Decay chain:**")
            st.markdown(
                f"`{meta_cp['chain_diagram']}`",
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
