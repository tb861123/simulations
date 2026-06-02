"""
Nuclear Decay — Dice Analogy Simulation
WJEC Eduqas A Level Physics, Component 3, Topic 6 (a)–(h)

Simulates radioactive decay as a stochastic binomial process (the dice analogy),
comparing results against the analytical N = N₀ exp(−λt) curve.
Advanced mode adds multi-run averaging, log-linear regression, background
radiation correction, activity traces, and real-world isotope data.
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
from scipy import stats

from utils.style import COLOURS, plotly_layout, make_fig
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Nuclear Decay — WJEC Physics",
    page_icon="☢️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Convenience colour aliases (avoids backslash in f-string expressions) ────
_ADV_COLOUR = COLOURS["advanced"]
_HIGHLIGHT   = COLOURS["highlight"]

# ── Isotope data ──────────────────────────────────────────────────────────────

ISOTOPES = {
    "Carbon-14": {
        "T_half_s": 5730 * 365.25 * 24 * 3600,
        "T_half_display": "5 730 years",
        "context": (
            "Used in **archaeology and geology**. Living organisms continuously replenish "
            "their C-14 from atmospheric CO₂; at death the ratio C-14/C-12 begins to fall. "
            "Calibrated using tree rings (dendrochronology) and coral records to correct for "
            "historical variations in atmospheric ¹⁴C. Limit: ~50,000 years."
        ),
    },
    "Iodine-131": {
        "T_half_s": 8.02 * 24 * 3600,
        "T_half_display": "8.02 days",
        "context": (
            "Used in **thyroid cancer treatment** (targeted radiotherapy) and thyroid function "
            "imaging. The thyroid gland preferentially absorbs iodine; I-131 delivers a "
            "localised beta/gamma dose. Produced in nuclear reactors. The Chernobyl and "
            "Fukushima accidents released significant I-131 into the environment."
        ),
    },
    "Radium-226": {
        "T_half_s": 1600 * 365.25 * 24 * 3600,
        "T_half_display": "1 600 years",
        "context": (
            "Used in early cancer treatment ('radium needles'). Now superseded by safer "
            "isotopes. T½ = 1600 years means old medical equipment remains radioactive for "
            "millennia. Historically used in luminous paint (causing radiation sickness in "
            "the 'Radium Girls'); now a source of radon gas in homes."
        ),
    },
    "Strontium-90": {
        "T_half_s": 28.8 * 365.25 * 24 * 3600,
        "T_half_display": "28.8 years",
        "context": (
            "A major concern in **nuclear fallout**. Chemically similar to calcium — the body "
            "incorporates it into bone, where it irradiates bone marrow. T½ = 28.8 years means "
            "it persists in the environment for decades. A significant fallout isotope from "
            "nuclear weapons tests and accidents."
        ),
    },
    "Technetium-99m": {
        "T_half_s": 6.01 * 3600,
        "T_half_display": "6.01 hours",
        "context": (
            "The workhorse of **nuclear medicine**: used in ~85% of diagnostic nuclear medicine "
            "procedures (bone scans, heart imaging, kidney function). A gamma emitter at 140 keV. "
            "Produced from Mo-99 decay in hospital generators, meaning hospitals need a constant "
            "supply of fresh Mo-99."
        ),
    },
}

# ── Helper functions ──────────────────────────────────────────────────────────


def run_single_simulation(N0: int, p: float, n_steps: int, seed: int):
    """
    Run one stochastic decay simulation using the binomial dice model.

    Returns
    -------
    N_arr : array of length (n_steps + 1) — nuclei remaining after each step
            (index 0 = initial N0, index k = nuclei after step k)
    n_decay_arr : array of length n_steps — number decaying at each step
    """
    rng = np.random.default_rng(seed)
    N_arr = np.empty(n_steps + 1, dtype=int)
    n_decay_arr = np.empty(n_steps, dtype=int)
    N_arr[0] = N0
    N_remaining = N0
    for k in range(n_steps):
        if N_remaining == 0:
            n_decay_arr[k] = 0
            N_arr[k + 1] = 0
        else:
            n_decay = rng.binomial(N_remaining, p)
            n_decay_arr[k] = n_decay
            N_remaining -= n_decay
            N_arr[k + 1] = N_remaining
    return N_arr, n_decay_arr


def run_multi_simulation(N0: int, p: float, n_steps: int, n_runs: int = 50):
    """
    Run n_runs simulations with different seeds and return averaged N array.
    Seeds are fixed as 0..n_runs-1 for full reproducibility.

    Returns
    -------
    N_mean : array of length (n_steps + 1) — mean nuclei remaining
    N_all  : array of shape (n_runs, n_steps + 1)
    """
    N_all = np.empty((n_runs, n_steps + 1), dtype=float)
    for i in range(n_runs):
        N_all[i], _ = run_single_simulation(N0, p, n_steps, seed=i)
    return N_all.mean(axis=0), N_all


def compute_t_half_simulation(N_arr: np.ndarray, N0: int):
    """
    Find the half-life from the simulation array by linear interpolation.
    Returns the fractional step at which N first crosses N0/2.
    Returns np.nan if N never drops below N0/2.
    """
    target = N0 / 2.0
    for k in range(1, len(N_arr)):
        if N_arr[k] <= target:
            if N_arr[k] == N_arr[k - 1]:
                return float(k)
            # Linear interpolation between step k-1 and k
            frac = (target - N_arr[k - 1]) / (N_arr[k] - N_arr[k - 1])
            return (k - 1) + frac
    return np.nan


# ── Main layout ───────────────────────────────────────────────────────────────

left_col, right_col = two_column_layout(3, 7)

with left_col:
    sim_header("☢️ Nuclear Decay", "Component 3, Topic 6")
    mode = mode_toggle()
    st.divider()

    st.markdown("**Simulation Parameters**")

    N0 = st.slider(
        "N₀ — initial number of nuclei",
        min_value=100,
        max_value=10_000,
        value=1_000,
        step=100,
        help="Number of radioactive nuclei at t = 0.",
    )

    p = st.slider(
        "p — decay probability per timestep",
        min_value=0.05,
        max_value=0.50,
        value=0.10,
        step=0.01,
        format="%.2f",
        help="Probability that any one nucleus decays in a single timestep (analogous to λΔt).",
    )

    n_steps = st.slider(
        "Number of timesteps",
        min_value=10,
        max_value=200,
        value=50,
        step=1,
        help="Total number of timesteps to simulate.",
    )

    seed = st.number_input(
        "Random seed (reproducibility)",
        min_value=0,
        max_value=9999,
        value=42,
        step=1,
        help="Fix the random seed so you get the same simulation every time.",
    )

    run_btn = st.button("▶ Run Simulation", type="primary", use_container_width=True)

    # ── Derived constants ─────────────────────────────────────────────────────

    lam = -np.log(1.0 - p)          # decay constant (step⁻¹)
    t_half_theory = np.log(2) / lam  # theoretical half-life (steps)

    # ── Session-state management ──────────────────────────────────────────────

    if "sim_N_arr" not in st.session_state:
        st.session_state.sim_N_arr = None
        st.session_state.sim_n_decay = None
        st.session_state.sim_params = {}

    if run_btn:
        N_arr, n_decay_arr = run_single_simulation(N0, p, n_steps, int(seed))
        st.session_state.sim_N_arr = N_arr
        st.session_state.sim_n_decay = n_decay_arr
        st.session_state.sim_params = {
            "N0": N0, "p": p, "n_steps": n_steps, "seed": int(seed),
            "lam": lam, "t_half_theory": t_half_theory,
        }

    st.info(
        "**Dice analogy:** Each nucleus independently has probability *p* of decaying "
        "each timestep — like rolling a die and removing it if it shows a 1. "
        "This produces the same exponential law as classical theory, but with "
        "random fluctuations that vanish as N → ∞.",
        icon="🎲",
    )

    st.info(
        "🎲 **The memoryless property:** A nucleus that has survived for 1000 years "
        "is no more likely to decay NOW than it was when it was formed. The past does "
        "not matter. This is unique to quantum decay — unlike radioactive humans, who age!"
    )

    # ── Individual nucleus lifetime chart ─────────────────────────────────────
    _rng_mem = np.random.default_rng(int(seed) + 1000)
    _lifetimes = _rng_mem.exponential(scale=1.0 / lam, size=20)
    _fig_mem = go.Figure()
    for _i, _lt in enumerate(_lifetimes):
        _fig_mem.add_trace(go.Scatter(
            x=[0, _lt],
            y=[_i, _i],
            mode="lines",
            line=dict(color=COLOURS["primary"], width=4),
            showlegend=False,
        ))
        _fig_mem.add_trace(go.Scatter(
            x=[_lt],
            y=[_i],
            mode="markers",
            marker=dict(color=COLOURS["highlight"], size=7, symbol="x"),
            showlegend=False,
        ))
    _fig_mem.update_layout(**plotly_layout(
        title=dict(text="20 individual nuclei — each decays at a random time", font_size=12),
        xaxis_title="Lifetime (timesteps)",
        yaxis_title="Nucleus #",
        height=200,
    ))
    _fig_mem.update_yaxes(showticklabels=False)
    st.plotly_chart(_fig_mem, use_container_width=True)

    if st.session_state.sim_N_arr is None:
        st.markdown(
            "*Press **▶ Run Simulation** to generate results.*"
        )
    else:
        params = st.session_state.sim_params
        N_arr = st.session_state.sim_N_arr
        t_half_sim = compute_t_half_simulation(N_arr, params["N0"])
        t_half_sim_str = f"{t_half_sim:.1f} steps" if not np.isnan(t_half_sim) else "N/2 not reached"
        metric_row({
            "T½ (simulation)": t_half_sim_str,
            "T½ (theoretical)": f"{params['t_half_theory']:.1f} steps",
            "λ": f"{params['lam']:.4f} step⁻¹",
        })

with right_col:

    # ── Basic plot ────────────────────────────────────────────────────────────

    if st.session_state.sim_N_arr is not None:
        params = st.session_state.sim_params
        N_arr = st.session_state.sim_N_arr
        n_decay_arr = st.session_state.sim_n_decay
        steps = np.arange(params["n_steps"] + 1)
        t_analytical = np.linspace(0, params["n_steps"], 400)
        N_analytical = params["N0"] * np.exp(-params["lam"] * t_analytical)

        fig_main = make_fig()
        fig_main.add_trace(go.Bar(
            x=steps,
            y=N_arr,
            name="Simulation (stochastic)",
            marker_color=COLOURS["primary"],
            opacity=0.75,
        ))
        fig_main.add_trace(go.Scatter(
            x=t_analytical,
            y=N_analytical,
            mode="lines",
            name="Analytical N₀ e<sup>−λt</sup>",
            line=dict(color=COLOURS["secondary"], width=2.5),
        ))
        # Mark theoretical half-life
        fig_main.add_vline(
            x=params["t_half_theory"],
            line_dash="dot",
            line_color=COLOURS["highlight"],
            annotation_text=f"T½ = {params['t_half_theory']:.1f}",
            annotation_font_color=COLOURS["highlight"],
        )
        fig_main.update_layout(**plotly_layout(
            title=dict(text="Nuclei Remaining vs Timestep", font_size=15),
            xaxis_title="Timestep",
            yaxis_title="Number of nuclei N",
            height=420,
        ))
        st.plotly_chart(fig_main, use_container_width=True)

    else:
        st.markdown(
            "<div style='height:420px;display:flex;align-items:center;"
            "justify-content:center;color:#888;border:1px dashed #444;"
            "border-radius:8px;'>"
            "Run the simulation to see the plot."
            "</div>",
            unsafe_allow_html=True,
        )

    # ── Advanced section ──────────────────────────────────────────────────────

    if mode == "Advanced" and st.session_state.sim_N_arr is not None:
        params = st.session_state.sim_params
        N_arr = st.session_state.sim_N_arr
        n_decay_arr = st.session_state.sim_n_decay
        steps = np.arange(params["n_steps"] + 1)
        t_steps_decay = np.arange(1, params["n_steps"] + 1)  # decay steps 1..n

        advanced_divider()

        # ── 1. Multiple runs comparison ───────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "1 — Multiple runs: statistical vs mean behaviour</p>",
            unsafe_allow_html=True,
        )
        show_avg = st.checkbox(
            "Show average of 50 runs vs single run",
            value=False,
            key="show_avg",
        )
        if show_avg:
            N_mean, N_all = run_multi_simulation(
                params["N0"], params["p"], params["n_steps"], n_runs=50
            )
            t_analytical = np.linspace(0, params["n_steps"], 400)
            N_analytical = params["N0"] * np.exp(-params["lam"] * t_analytical)

            fig_compare = make_fig(
                rows=1, cols=2,
                subplot_titles=["Single run (noisy)", "Average of 50 runs (smooth)"],
                horizontal_spacing=0.10,
            )

            # Left: single run
            fig_compare.add_trace(
                go.Bar(
                    x=steps, y=N_arr,
                    name="Single run",
                    marker_color=COLOURS["primary"],
                    opacity=0.75,
                    showlegend=True,
                ),
                row=1, col=1,
            )
            fig_compare.add_trace(
                go.Scatter(
                    x=t_analytical, y=N_analytical,
                    mode="lines",
                    name="Analytical",
                    line=dict(color=COLOURS["secondary"], width=2),
                    showlegend=True,
                ),
                row=1, col=1,
            )

            # Right: mean of 50 runs + shaded band (±1σ)
            N_std = N_all.std(axis=0)
            fig_compare.add_trace(
                go.Scatter(
                    x=np.concatenate([steps, steps[::-1]]),
                    y=np.concatenate([N_mean + N_std, (N_mean - N_std)[::-1]]),
                    fill="toself",
                    fillcolor=f"rgba(31,119,180,0.18)",
                    line=dict(color="rgba(0,0,0,0)"),
                    name="±1σ band",
                    showlegend=True,
                ),
                row=1, col=2,
            )
            fig_compare.add_trace(
                go.Scatter(
                    x=steps, y=N_mean,
                    mode="lines",
                    name="Mean (50 runs)",
                    line=dict(color=COLOURS["tertiary"], width=2.5),
                    showlegend=True,
                ),
                row=1, col=2,
            )
            fig_compare.add_trace(
                go.Scatter(
                    x=t_analytical, y=N_analytical,
                    mode="lines",
                    name="Analytical",
                    line=dict(color=COLOURS["secondary"], width=2, dash="dash"),
                    showlegend=False,
                ),
                row=1, col=2,
            )
            fig_compare.update_xaxes(title_text="Timestep")
            fig_compare.update_yaxes(title_text="Number of nuclei N", col=1)
            fig_compare.update_layout(**plotly_layout(height=380))
            st.plotly_chart(fig_compare, use_container_width=True)
            st.caption(
                "The single run shows random fluctuations (binomial noise). "
                "Averaging over 50 independent runs converges to the smooth "
                "analytical curve — illustrating the law of large numbers."
            )

        st.divider()

        # ── 2. Log plot ───────────────────────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "2 — Logarithmic plot: verify the exponential law</p>",
            unsafe_allow_html=True,
        )
        show_log = st.checkbox(
            "Show ln(N) vs timestep with linear regression",
            value=False,
            key="show_log",
        )
        if show_log:
            # Exclude zeros (log undefined)
            valid = N_arr > 0
            steps_valid = steps[valid].astype(float)
            ln_N_valid = np.log(N_arr[valid].astype(float))

            if len(steps_valid) >= 2:
                result = stats.linregress(steps_valid, ln_N_valid)
                grad = result.slope
                intercept = result.intercept
                r2 = result.rvalue ** 2

                fig_log = make_fig()
                fig_log.add_trace(go.Scatter(
                    x=steps_valid,
                    y=ln_N_valid,
                    mode="markers",
                    name="ln(N) simulation",
                    marker=dict(color=COLOURS["primary"], size=6),
                ))
                x_fit = np.array([steps_valid[0], steps_valid[-1]])
                fig_log.add_trace(go.Scatter(
                    x=x_fit,
                    y=grad * x_fit + intercept,
                    mode="lines",
                    name=f"Linear fit (R² = {r2:.4f})",
                    line=dict(color=COLOURS["secondary"], width=2.5, dash="dash"),
                ))
                # Analytical ln(N) line
                t_cont = np.linspace(0, params["n_steps"], 300)
                fig_log.add_trace(go.Scatter(
                    x=t_cont,
                    y=np.log(params["N0"]) - params["lam"] * t_cont,
                    mode="lines",
                    name="Analytical ln(N₀) − λt",
                    line=dict(color=COLOURS["tertiary"], width=2),
                ))
                fig_log.update_layout(**plotly_layout(
                    title=dict(text="ln(N) vs Timestep", font_size=15),
                    xaxis_title="Timestep",
                    yaxis_title="ln(N)",
                    height=380,
                ))
                st.plotly_chart(fig_log, use_container_width=True)
                st.markdown(
                    f"**Gradient = {grad:.4f}** (= −λ = {-params['lam']:.4f})   |   "
                    f"R² = {r2:.4f}"
                )
                if abs(grad + params["lam"]) / params["lam"] < 0.05:
                    st.success(
                        "The regression gradient agrees with −λ to within 5% — "
                        "confirming the exponential law.",
                        icon="✅",
                    )
            else:
                st.warning(
                    "Not enough non-zero data points for regression. "
                    "Try more timesteps or a smaller decay probability.",
                    icon="⚠️",
                )

        st.divider()

        # ── 3. Background radiation ───────────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "3 — Background radiation: effect on activity measurement</p>",
            unsafe_allow_html=True,
        )
        show_bg = st.checkbox(
            "Add background radiation",
            value=False,
            key="show_bg",
        )
        if show_bg:
            B = st.slider(
                "Background count rate B (counts per timestep)",
                min_value=1,
                max_value=50,
                value=5,
                step=1,
                key="bg_rate",
                help="Counts per timestep measured even with no radioactive source (cosmic rays, natural background).",
            )

            A_true = n_decay_arr.astype(float)           # actual decays per step
            A_measured = A_true + B                       # what Geiger counter reads
            # Guard against log(0)
            A_true_safe = np.where(A_true > 0, A_true, np.nan)
            A_meas_safe = np.where(A_measured > 0, A_measured, np.nan)

            fig_bg = make_fig(
                rows=1, cols=2,
                subplot_titles=[
                    "Activity A(t): true vs measured",
                    "ln(A) vs timestep: background flattens slope",
                ],
                horizontal_spacing=0.10,
            )

            # Left: activity traces
            fig_bg.add_trace(
                go.Scatter(
                    x=t_steps_decay, y=A_true,
                    mode="markers+lines",
                    name="A_true (actual decays)",
                    line=dict(color=COLOURS["primary"], width=1.5),
                    marker=dict(size=4),
                ),
                row=1, col=1,
            )
            fig_bg.add_trace(
                go.Scatter(
                    x=t_steps_decay, y=A_measured,
                    mode="markers+lines",
                    name=f"A_measured (+B = {B})",
                    line=dict(color=COLOURS["highlight"], width=1.5),
                    marker=dict(size=4),
                ),
                row=1, col=1,
            )
            # Analytical activity
            t_cont = np.linspace(1, params["n_steps"], 300)
            A_analytical = params["lam"] * params["N0"] * np.exp(-params["lam"] * t_cont)
            fig_bg.add_trace(
                go.Scatter(
                    x=t_cont, y=A_analytical,
                    mode="lines",
                    name="A₀ e^{-λt} analytical",
                    line=dict(color=COLOURS["secondary"], width=2, dash="dot"),
                ),
                row=1, col=1,
            )

            # Right: ln(A) comparison
            fig_bg.add_trace(
                go.Scatter(
                    x=t_steps_decay, y=np.log(A_true_safe),
                    mode="markers",
                    name="ln(A_true)",
                    marker=dict(color=COLOURS["primary"], size=5),
                ),
                row=1, col=2,
            )
            fig_bg.add_trace(
                go.Scatter(
                    x=t_steps_decay, y=np.log(A_meas_safe),
                    mode="markers",
                    name="ln(A_measured)",
                    marker=dict(color=COLOURS["highlight"], size=5),
                ),
                row=1, col=2,
            )
            # Analytical ln(A)
            ln_A_cont = (
                np.log(params["lam"] * params["N0"]) - params["lam"] * t_cont
            )
            fig_bg.add_trace(
                go.Scatter(
                    x=t_cont, y=ln_A_cont,
                    mode="lines",
                    name="ln(A) analytical",
                    line=dict(color=COLOURS["secondary"], width=2, dash="dot"),
                ),
                row=1, col=2,
            )

            fig_bg.update_xaxes(title_text="Timestep")
            fig_bg.update_yaxes(title_text="Activity (decays / timestep)", col=1)
            fig_bg.update_yaxes(title_text="ln(Activity)", col=2)
            fig_bg.update_layout(**plotly_layout(height=400))
            st.plotly_chart(fig_bg, use_container_width=True)
            st.markdown(
                f"**Background = {B} counts/timestep.** "
                "The measured activity curve (red) lies above the true curve and "
                "does not fall as steeply. On the ln plot the measured line curves "
                "upward at late times — the background becomes dominant as the source "
                "weakens, causing overestimation of N and an apparent flattening of "
                "the decay. Always subtract a separate background measurement."
            )

        st.divider()

        # ── 4. Activity trace ─────────────────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "4 — Activity trace: A(t) = λN(t)</p>",
            unsafe_allow_html=True,
        )
        show_activity = st.checkbox(
            "Show simulated activity vs analytical A(t)",
            value=False,
            key="show_activity",
        )
        if show_activity:
            A_sim = n_decay_arr.astype(float)
            t_cont = np.linspace(0, params["n_steps"], 400)
            A_analytical = params["lam"] * params["N0"] * np.exp(-params["lam"] * t_cont)

            fig_act = make_fig()
            fig_act.add_trace(go.Scatter(
                x=t_steps_decay,
                y=A_sim,
                mode="markers",
                name="Simulated decays per step",
                marker=dict(color=COLOURS["primary"], size=6, symbol="circle-open"),
            ))
            fig_act.add_trace(go.Scatter(
                x=t_cont,
                y=A_analytical,
                mode="lines",
                name="A(t) = λN₀ e<sup>−λt</sup>",
                line=dict(color=COLOURS["secondary"], width=2.5),
            ))
            fig_act.update_layout(**plotly_layout(
                title=dict(text="Activity A(t) vs Timestep", font_size=15),
                xaxis_title="Timestep",
                yaxis_title="Activity (decays per timestep)",
                height=380,
            ))
            st.plotly_chart(fig_act, use_container_width=True)
            st.caption(
                "Activity = number of decays per unit time. "
                "Analytically A = λN = λN₀ e^{−λt} = A₀ e^{−λt}. "
                "The simulated points scatter around the analytical curve; "
                "scatter is greatest early on when A is large (Poisson noise ∝ √A)."
            )

        st.divider()

        # ── 5. Isotope selector ───────────────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "5 — Real-world isotopes</p>",
            unsafe_allow_html=True,
        )
        selected_isotope = st.selectbox(
            "Select isotope",
            list(ISOTOPES.keys()),
            key="isotope_selector",
        )
        iso = ISOTOPES[selected_isotope]
        T_half_s = iso["T_half_s"]
        lam_si = np.log(2) / T_half_s

        col_a, col_b, col_c = st.columns(3)
        col_a.metric("Half-life", iso["T_half_display"])
        col_b.metric("λ (s⁻¹)", f"{lam_si:.4e}")
        col_c.metric("λ (yr⁻¹)", f"{lam_si * 365.25 * 24 * 3600:.4e}")

        st.info(iso["context"], icon="🔬")

        # Show a decay curve for this isotope over 5 half-lives
        t_span = np.linspace(0, 5 * T_half_s, 500)
        N_iso = np.exp(-lam_si * t_span)   # normalised to N₀ = 1

        # Choose a sensible time axis unit
        if T_half_s < 3600:
            t_axis = t_span / 3600
            t_unit = "hours"
        elif T_half_s < 30 * 24 * 3600:
            t_axis = t_span / (24 * 3600)
            t_unit = "days"
        elif T_half_s < 500 * 365.25 * 24 * 3600:
            t_axis = t_span / (365.25 * 24 * 3600)
            t_unit = "years"
        else:
            t_axis = t_span / (1000 * 365.25 * 24 * 3600)
            t_unit = "kiloyears"

        fig_iso = make_fig()
        fig_iso.add_trace(go.Scatter(
            x=t_axis,
            y=N_iso,
            mode="lines",
            name=f"{selected_isotope} decay",
            line=dict(color=COLOURS["advanced"], width=2.5),
        ))
        # Mark each half-life
        for n_half in range(1, 6):
            t_mark = n_half * T_half_s
            t_mark_axis = t_mark / {"hours": 3600, "days": 24 * 3600,
                                     "years": 365.25 * 24 * 3600,
                                     "kiloyears": 1000 * 365.25 * 24 * 3600}[t_unit]
            fig_iso.add_vline(
                x=t_mark_axis,
                line_dash="dot",
                line_color=COLOURS["grid"],
                annotation_text=f"n={n_half}",
                annotation_font_color=COLOURS["text"],
                annotation_font_size=10,
            )
        fig_iso.update_layout(**plotly_layout(
            title=dict(
                text=f"{selected_isotope} decay (T½ = {iso['T_half_display']})",
                font_size=15,
            ),
            xaxis_title=f"Time ({t_unit})",
            yaxis_title="N / N₀",
            height=340,
        ))
        st.plotly_chart(fig_iso, use_container_width=True)

        st.divider()

        # ── 6. Carbon Dating Calculator ───────────────────────────────────────

        st.markdown(
            f"<p style='color:{_ADV_COLOUR};font-weight:600'>"
            "6 — Carbon Dating Calculator</p>",
            unsafe_allow_html=True,
        )
        with st.expander("🗿 Carbon Dating Calculator", expanded=True):
            _fraction_pct = st.slider(
                "Fraction of C-14 remaining (%)",
                min_value=0.1,
                max_value=100.0,
                value=50.0,
                step=0.1,
                help="100% = fresh sample (just died); 0.1% = very old sample.",
                key="c14_fraction",
            )
            _sample_type = st.selectbox(
                "Sample type",
                ["Wood/charcoal", "Bone (collagen)", "Shell (requires correction)",
                 "Peat/organic sediment"],
                key="c14_sample_type",
            )

            # Computation
            _T_half_C14 = 5730.0          # Cambridge half-life (years)
            _lam_C14 = np.log(2) / _T_half_C14
            _epsilon = 1e-10              # guard against log(0)
            _fraction = max(_fraction_pct / 100.0, _epsilon)
            _age_years = -np.log(_fraction) / _lam_C14

            # Display metric
            if _age_years > 10_000:
                _age_str = f"{_age_years / 1000:.2f} ka"
            else:
                _age_str = f"{_age_years:.0f} years"
            st.metric("Estimated age", _age_str)

            # Historical context
            if _age_years < 100:
                st.warning(
                    "⚠️ Too recent for carbon dating (atmospheric C-14 levels "
                    "fluctuate and must be calibrated)."
                )
            elif _age_years < 3_000:
                st.info(
                    "⚔️ Ancient history era. Romans, Greeks, early medieval settlements."
                )
            elif _age_years < 10_000:
                st.info(
                    "🏺 Neolithic/Bronze Age. Agricultural revolution began ~10,000 years ago."
                )
            elif _age_years < 30_000:
                st.info(
                    "🦣 Last Ice Age. Woolly mammoths, cave paintings, earliest modern humans "
                    "in Europe."
                )
            elif _age_years < 50_000:
                st.info(
                    "🗿 Upper limit of reliable carbon dating. Beyond this, contamination "
                    "errors dominate."
                )
            else:
                st.warning(
                    "⚠️ Beyond the reliable range of carbon dating (too little C-14 remains). "
                    "Use K-Ar, U-Pb, or other methods."
                )

            # C-14 decay curve: ln(N/N₀) vs age
            _t_c14 = np.linspace(0, 60_000, 500)
            _ln_frac_curve = -_lam_C14 * _t_c14   # ln(N/N₀) = -λt
            _ln_frac_point = np.log(_fraction)

            _fig_c14 = make_fig()
            _fig_c14.add_trace(go.Scatter(
                x=_t_c14,
                y=_ln_frac_curve,
                mode="lines",
                name="C-14 decay: ln(N/N₀)",
                line=dict(color=COLOURS["advanced"], width=2.5),
            ))
            _fig_c14.add_trace(go.Scatter(
                x=[_age_years],
                y=[_ln_frac_point],
                mode="markers",
                name=f"Your sample ({_age_str})",
                marker=dict(color=COLOURS["highlight"], size=10, symbol="star"),
            ))
            # Mark upper reliability limit
            _fig_c14.add_vline(
                x=50_000,
                line_dash="dot",
                line_color=COLOURS["grid"],
                annotation_text="~50 ka limit",
                annotation_font_color=COLOURS["text"],
                annotation_font_size=10,
            )
            _fig_c14.update_layout(**plotly_layout(
                title=dict(text="C-14 decay curve: ln(N/N₀) vs age", font_size=14),
                xaxis_title="Age (years)",
                yaxis_title="ln(N / N₀)",
                height=320,
            ))
            st.plotly_chart(_fig_c14, use_container_width=True)
            st.caption(
                f"T½(C-14) = {_T_half_C14:,.0f} yr (Cambridge half-life) · "
                f"λ = {_lam_C14:.5f} yr⁻¹ · "
                f"Sample type: {_sample_type}"
            )

    elif mode == "Advanced" and st.session_state.sim_N_arr is None:
        advanced_divider()
        st.info(
            "Run the simulation first (press **▶ Run Simulation**) to unlock "
            "the advanced analysis tools.",
            icon="ℹ️",
        )

# ── Physics notes ─────────────────────────────────────────────────────────────

physics_notes(
    spec_ref="Component 3, Topic 6 (Nuclear Decay), sections (a)–(h)",
    equations=[
        r"N = N_0 \, e^{-\lambda t}",
        r"T_{\frac{1}{2}} = \frac{\ln 2}{\lambda}",
        r"A = \lambda N",
        r"A = A_0 \, e^{-\lambda t}",
    ],
    explanation=(
        "Radioactive decay is a **random process** — each nucleus independently "
        "has the same probability of decaying in a given time, regardless of its "
        "history. As N increases the average behaviour becomes smoother, approaching "
        "the analytical exponential. The dice analogy illustrates the statistical "
        "nature: like rolling many dice and removing those showing a 1, the fraction "
        "removed each round stays constant, giving exponential decline."
    ),
    advanced_text=(
        r"$T_{1/2} = \ln2 / \lambda$ is derived from $N_0/2 = N_0 \exp(-\lambda T_{1/2})$. "
        "\n\n"
        "Decay is **memoryless** (a Markov/Poisson process): a nucleus has no "
        "'memory' of how long it has existed. The probability of decaying in the "
        "next interval Δt is always λΔt, independent of past history."
        "\n\n"
        "**Carbon dating** uses the known atmospheric ¹⁴C/¹²C ratio as a starting "
        "point. At death the organism stops replenishing ¹⁴C; measuring the remaining "
        "ratio gives $t = -\\ln(N/N_0)/\\lambda$. Calibration curves (e.g. IntCal) "
        "correct for historical variations in atmospheric ¹⁴C."
    ),
    mode=mode,
)
