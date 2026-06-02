"""
Magnetic Fields & Electromagnetic Induction — WJEC Eduqas A Level Physics.

Four sub-simulations:
  1. Magnetic Force on a current-carrying wire / charged particle in a B field.
  2. Electromagnetic Induction (Faraday's law) — magnet moving through a coil.
  3. Transformer — turns ratio, voltages, currents and power.
  4. DC Motor — torque on a current-carrying coil, commutator effect.

Spec reference: Component 2, Topic 7 (Magnetic Fields), sections (a)–(n).
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

from utils.physics import mu0, e_charge, m_e, m_p  # noqa: F401
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
    page_title="Magnetic Fields & Induction — WJEC Physics",
    page_icon="🧲",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 7 (Magnetic Fields), sections (a)–(n)"

N_TIME = 400   # time-series samples for induction sim
N_ORBIT = 500  # points around one circular orbit


# ── Physics helpers ───────────────────────────────────────────────────────────

def force_on_wire(B: float, I: float, L: float, theta_deg: float) -> float:
    """F = BIL sin θ — force on current-carrying conductor in a magnetic field."""
    return B * I * L * np.sin(np.radians(theta_deg))


def circular_orbit(
    particle: str, speed: float, B: float
) -> tuple[float, float, float, np.ndarray, np.ndarray]:
    """
    Circular motion of a charged particle in a uniform magnetic field.

    Parameters
    ----------
    particle : 'Electron' or 'Proton'
    speed    : particle speed (m/s)
    B        : magnetic flux density (T)

    Returns
    -------
    r    : orbital radius (m)
    T    : orbital period (s)
    f    : cyclotron frequency (Hz)
    x, y : trajectory arrays (m)
    """
    mass = m_e if particle == "Electron" else m_p
    charge = e_charge  # magnitude only (same for e and p)

    r = mass * speed / (charge * B)
    T = 2 * np.pi * mass / (charge * B)
    f = charge * B / (2 * np.pi * mass)

    theta = np.linspace(0, 2 * np.pi, N_ORBIT)
    x = r * np.cos(theta)
    y = r * np.sin(theta)

    return r, T, f, x, y


@st.cache_data
def compute_induction(
    N: int, A: float, v_mag: float, B_max: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """
    Model flux and induced EMF as a magnet passes through a coil.

    B_coil(t) = B_max * exp(-((t - t_peak)/sigma)²)
    EMF = -N * dΦ/dt  (numerical derivative)

    Parameters
    ----------
    N     : number of turns
    A     : coil area (m²)
    v_mag : magnet speed (m/s)
    B_max : peak field strength (T)

    Returns
    -------
    t_arr   : time array (s)
    flux    : magnetic flux array (Wb)
    emf     : induced EMF array (V)
    peak_emf: peak absolute EMF (V)
    """
    t_arr = np.linspace(0, 4, N_TIME)
    t_peak = 2.0
    sigma = 1.0 / v_mag  # wider Gaussian for slower magnet

    B_coil = B_max * np.exp(-((t_arr - t_peak) / sigma) ** 2)
    flux = B_coil * A  # Φ = B·A (uniform field through area)

    # Numerical derivative for EMF = -N dΦ/dt
    dflux_dt = np.gradient(flux, t_arr)
    emf = -N * dflux_dt

    peak_emf = float(np.max(np.abs(emf)))
    return t_arr, flux, emf, peak_emf


@st.cache_data
def compute_transformer(
    N_p: int, N_s: int, V_p: float, R_L: float
) -> tuple[float, float, float, float, np.ndarray, np.ndarray, np.ndarray]:
    """
    Ideal transformer calculations plus sinusoidal voltage traces.

    Parameters
    ----------
    N_p : primary turns
    N_s : secondary turns
    V_p : primary (peak) voltage (V)
    R_L : load resistance (Ω)

    Returns
    -------
    V_s   : secondary peak voltage (V)
    I_s   : secondary current (A)
    I_p   : primary current (A)
    P     : power delivered to load (W)
    t     : time array (s) — two full cycles of a 50 Hz signal
    v_pri : primary voltage trace (V)
    v_sec : secondary voltage trace (V)
    """
    k = N_s / N_p
    V_s = k * V_p
    I_s = V_s / R_L
    I_p = I_s * N_s / N_p
    P = (V_s / np.sqrt(2)) ** 2 / R_L  # rms power

    t = np.linspace(0, 2 / 50, 400)  # 2 cycles at 50 Hz
    omega = 2 * np.pi * 50
    v_pri = V_p * np.sin(omega * t)
    v_sec = V_s * np.sin(omega * t)

    return V_s, I_s, I_p, P, t, v_pri, v_sec


# ── Plot builders ─────────────────────────────────────────────────────────────

def build_force_diagram(
    B: float, I: float, L: float, theta_deg: float, F: float
) -> go.Figure:
    """
    Schematic force diagram: wire in a magnetic field.

    Draws the wire (along y-axis), B-field arrows (into/out of page
    represented as crosses/dots on a grid), and annotates the force.
    """
    fig = go.Figure()

    # Grid of B-field symbols (into page = cross, out of page = dot)
    xs = np.linspace(-1.5, 1.5, 7)
    ys = np.linspace(-1.5, 1.5, 7)
    Xg, Yg = np.meshgrid(xs, ys)
    symbol = "x" if theta_deg < 90 else "circle"

    fig.add_trace(go.Scatter(
        x=Xg.ravel(), y=Yg.ravel(),
        mode="markers",
        marker=dict(symbol=symbol, size=10, color=COLOURS["quaternary"],
                    opacity=0.5),
        name="B field (into page)" if theta_deg < 90 else "B field (out of page)",
        showlegend=True,
    ))

    # Wire — drawn as a bold vertical line at x=0
    fig.add_trace(go.Scatter(
        x=[0, 0], y=[-L / 2, L / 2],
        mode="lines+markers",
        line=dict(color=COLOURS["primary"], width=8),
        marker=dict(size=10, color=COLOURS["primary"]),
        name=f"Wire (I = {I} A, L = {L} m)",
    ))

    # Force arrow (horizontal, direction indicates sign)
    arrow_x = min(F / (max(abs(F), 1e-9)) * 0.8, 0.8)
    fig.add_annotation(
        x=arrow_x, y=0,
        ax=0, ay=0,
        xref="x", yref="y", axref="x", ayref="y",
        arrowhead=3, arrowsize=2, arrowwidth=3,
        arrowcolor=COLOURS["highlight"],
        text=f"<b>F = {F:.4f} N</b>",
        font=dict(color=COLOURS["highlight"], size=13),
        showarrow=True,
        bgcolor="rgba(0,0,0,0.5)",
        bordercolor=COLOURS["highlight"],
        borderwidth=1,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=380,
        title=dict(text="Force on Wire in Magnetic Field (F = BIL sinθ)",
                   font=dict(size=14)),
        xaxis=dict(range=[-2, 2], title="x (relative)", **grid_style),
        yaxis=dict(range=[-2, 2], title="y (relative)", scaleanchor="x",
                   scaleratio=1, **grid_style),
        showlegend=True,
    ))
    return fig


def build_orbit_plot(
    x: np.ndarray,
    y: np.ndarray,
    r: float,
    particle: str,
    speed: float,
) -> go.Figure:
    """
    Circular orbit trajectory of a charged particle in a uniform B field.
    """
    fig = go.Figure()

    colour = COLOURS["advanced"] if particle == "Electron" else COLOURS["secondary"]

    fig.add_trace(go.Scatter(
        x=x * 100, y=y * 100,   # convert to cm for readability
        mode="lines",
        line=dict(color=colour, width=2.5),
        name=f"{particle} orbit",
    ))

    # Mark starting position
    fig.add_trace(go.Scatter(
        x=[x[0] * 100], y=[y[0] * 100],
        mode="markers",
        marker=dict(symbol="arrow-right", size=14, color=COLOURS["highlight"],
                    angleref="previous"),
        name="Start / velocity direction",
        showlegend=True,
    ))

    # Centre marker
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode="markers",
        marker=dict(symbol="cross", size=10, color=COLOURS["text"]),
        name="Centre",
        showlegend=False,
    ))

    # Radius annotation
    fig.add_annotation(
        x=r * 100 / 2, y=r * 100 / 2,
        text=f"r = {r * 100:.2f} cm",
        showarrow=False,
        font=dict(color=colour, size=11),
        bgcolor="rgba(0,0,0,0.5)",
    )

    pad = r * 100 * 1.3
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=400,
        title=dict(
            text=f"Circular Orbit of {particle} in Magnetic Field  (v = {speed:.2e} m/s)",
            font=dict(size=13),
        ),
        xaxis=dict(range=[-pad, pad], title="x (cm)", scaleanchor="y",
                   scaleratio=1, **grid_style),
        yaxis=dict(range=[-pad, pad], title="y (cm)", **grid_style),
        showlegend=True,
    ))
    return fig


def build_induction_plot(
    t_arr: np.ndarray,
    flux: np.ndarray,
    emf: np.ndarray,
    N: int,
    show_current: bool = False,
    R_coil: float = 10.0,
) -> go.Figure:
    """
    Dual subplot: flux vs time (top) and induced EMF vs time (bottom).
    In Advanced mode a third panel shows induced current.
    """
    rows = 3 if show_current else 2
    subplot_titles = ["Magnetic Flux Φ vs Time", "Induced EMF vs Time"]
    if show_current:
        subplot_titles.append("Induced Current vs Time")

    fig = make_subplots(
        rows=rows, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.10,
        subplot_titles=subplot_titles,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])

    # Row 1: Flux
    fig.add_trace(go.Scatter(
        x=t_arr, y=flux * 1000,  # mWb
        mode="lines",
        name="Φ (mWb)",
        line=dict(color=COLOURS["primary"], width=2.5),
    ), row=1, col=1)

    # Row 2: EMF
    fig.add_trace(go.Scatter(
        x=t_arr, y=emf,
        mode="lines",
        name="EMF (V)",
        line=dict(color=COLOURS["secondary"], width=2.5),
    ), row=2, col=1)

    # Zero-line reference for EMF
    fig.add_hline(y=0, line_dash="dot",
                  line_color=COLOURS["grid"], opacity=0.6, row=2, col=1)

    if show_current:
        current = emf / R_coil
        fig.add_trace(go.Scatter(
            x=t_arr, y=current,
            mode="lines",
            name=f"I = EMF/R (R={R_coil:.0f}Ω)",
            line=dict(color=COLOURS["tertiary"], width=2.5),
        ), row=3, col=1)
        fig.add_hline(y=0, line_dash="dot",
                      line_color=COLOURS["grid"], opacity=0.6, row=3, col=1)
        fig.update_yaxes(title_text="Current (A)", row=3, col=1, **grid_style)
        fig.update_xaxes(title_text="Time (s)", row=3, col=1, **grid_style)
    else:
        fig.update_xaxes(title_text="Time (s)", row=2, col=1, **grid_style)

    fig.update_yaxes(title_text="Flux (mWb)", row=1, col=1, **grid_style)
    fig.update_yaxes(title_text="EMF (V)", row=2, col=1, **grid_style)

    height = 560 if not show_current else 720
    fig.update_layout(**plotly_layout(
        height=height,
        title=dict(
            text=f"Electromagnetic Induction  (N = {N} turns)",
            font=dict(size=14),
        ),
        showlegend=True,
    ))
    return fig


def build_transformer_plot(
    t: np.ndarray,
    v_pri: np.ndarray,
    v_sec: np.ndarray,
    V_p: float,
    V_s: float,
) -> go.Figure:
    """
    Primary and secondary voltage sinusoids on the same axes.
    """
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t * 1000, y=v_pri,
        mode="lines",
        name=f"Primary V_p (peak {V_p:.1f} V)",
        line=dict(color=COLOURS["primary"], width=2.5),
    ))

    fig.add_trace(go.Scatter(
        x=t * 1000, y=v_sec,
        mode="lines",
        name=f"Secondary V_s (peak {V_s:.1f} V)",
        line=dict(color=COLOURS["secondary"], width=2.5, dash="dash"),
    ))

    # Zero reference
    fig.add_hline(y=0, line_dash="dot",
                  line_color=COLOURS["grid"], opacity=0.6)

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=400,
        title=dict(text="Transformer Voltages (50 Hz, 2 cycles)", font=dict(size=14)),
        xaxis=dict(title="Time (ms)", **grid_style),
        yaxis=dict(title="Voltage (V)", **grid_style),
        showlegend=True,
    ))
    return fig


# ── Sub-sim renderers ─────────────────────────────────────────────────────────

def render_magnetic_force(mode: str) -> None:
    """Sub-sim 1: Magnetic Force on a current-carrying wire / charged particle."""

    # ── Presets ────────────────────────────────────────────────────────────────
    PRESETS_FORCE = {
        "Custom": None,
        "MRI scanner (B = 1.5 T)": dict(B=1.5, I=5.0, L=0.5, theta=90.0,
            context="MRI scanners use superconducting coils to maintain fields "
                    "of 1.5–3 T. The strong field is essential for aligning "
                    "hydrogen nuclei in the body."),
        "Cyclotron (B = 1.2 T)": dict(B=1.2, I=10.0, L=1.0, theta=90.0,
            context="Cyclotrons use a uniform magnetic field to bend protons "
                    "into a spiral path, accelerating them each half-revolution. "
                    "Used in hospitals to produce radioisotopes for PET scans."),
        "Earth's field (B ≈ 50 μT)": dict(B=5e-5, I=1.0, L=1.0, theta=90.0,
            context="Earth's magnetic field is ~50 μT — extremely weak compared "
                    "to laboratory magnets. A compass needle experiences only a "
                    "tiny torque from it."),
    }

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        preset_name = st.selectbox(
            "Real-world preset",
            list(PRESETS_FORCE.keys()),
            key="force_preset",
        )
        preset = PRESETS_FORCE[preset_name]

        def _pv(key, default):
            return preset[key] if preset and key in preset else default

        st.markdown("#### Wire parameters")
        B = st.slider("Magnetic flux density B (T)",
                      0.01, 2.0, float(_pv("B", 0.5)),
                      step=0.01, key="force_B",
                      disabled=(preset is not None),
                      help="Strength of the applied magnetic field.")
        I = st.slider("Current I (A)",
                      1.0, 20.0, float(_pv("I", 5.0)),
                      step=0.5, key="force_I",
                      disabled=(preset is not None))
        L = st.slider("Wire length L (m)",
                      0.1, 2.0, float(_pv("L", 1.0)),
                      step=0.05, key="force_L",
                      disabled=(preset is not None))
        theta = st.slider("Angle θ between I and B (°)",
                          0, 90, int(_pv("theta", 90)),
                          key="force_theta",
                          disabled=(preset is not None))

        F = force_on_wire(B, I, L, theta)
        torque_est = F * 0.05  # rough torque for a 10 cm coil radius

        st.markdown("---")
        metric_row({
            "Force F": f"{F:.4f} N",
            "Torque τ": f"{torque_est:.5f} N·m",
        })

        if preset:
            st.info(f"**{preset_name}**\n\n{preset['context']}")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Charged particle in B field")

            particle = st.selectbox(
                "Particle type",
                ["Electron", "Proton"],
                key="orbit_particle",
            )
            speed = st.select_slider(
                "Particle speed v (m/s)",
                options=[1e5, 5e5, 1e6, 5e6, 1e7, 2e7, 3e7],
                value=1e6,
                format_func=lambda v: f"{v:.1e}",
                key="orbit_speed",
            )
            B_orb = st.select_slider(
                "Field strength B (T)",
                options=[0.001, 0.005, 0.01, 0.02, 0.05, 0.1],
                value=0.01,
                format_func=lambda v: f"{v:.3f}",
                key="orbit_B",
            )

    with right_col:
        # Preset context card (always shown if a preset is active)
        st.info(
            "**F = BIL sinθ** — The force on a wire is maximised when the "
            "current is perpendicular to the field (θ = 90°) and zero when "
            "parallel (θ = 0°). This is the principle behind electric motors."
        )

        fig_wire = build_force_diagram(B, I, L, theta, F)
        st.plotly_chart(fig_wire, use_container_width=True)

        st.markdown("**Key result:**")
        metric_row({
            "F = BIL sinθ": f"{F:.4f} N",
            "θ": f"{theta}°",
            "B": f"{B} T",
            "I": f"{I} A",
            "L": f"{L} m",
        })

        if theta == 0:
            st.warning(
                "θ = 0°: the current is parallel to the field — **no force** "
                "acts on the wire (sinθ = 0)."
            )
        elif theta == 90:
            st.success(
                "θ = 90°: maximum force — current is perpendicular to the field."
            )

        if mode == "Advanced":
            st.markdown("---")
            st.markdown("#### Circular orbit of charged particle")

            st.info(
                "This is how particle accelerators work — magnetic fields steer "
                "charged particles into circular paths. The Lorentz force "
                "F = qvB provides the centripetal force mv²/r, so r = mv/(qB)."
            )

            r, T_orb, f_cyc, xp, yp = circular_orbit(particle, speed, B_orb)

            metric_row({
                "Radius r": f"{r * 100:.3f} cm",
                "Period T": f"{T_orb:.3e} s",
                "Cyclotron freq": f"{f_cyc:.3e} Hz",
            })

            fig_orbit = build_orbit_plot(xp, yp, r, particle, speed)
            st.plotly_chart(fig_orbit, use_container_width=True)

            mass_label = "m_e" if particle == "Electron" else "m_p"
            st.caption(
                f"r = mv/(qB) = {mass_label}×{speed:.1e}/({e_charge:.3e}×{B_orb}) "
                f"= {r * 100:.3f} cm.  "
                f"Period T = 2πm/(qB) = {T_orb:.3e} s (independent of speed!)."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"F = BIL\sin\theta",
                r"F = Bqv",
                r"r = \frac{mv}{qB}",
                r"T = \frac{2\pi m}{qB}",
                r"f_c = \frac{qB}{2\pi m}",
            ],
            explanation=(
                "A current-carrying wire in a magnetic field experiences a force "
                "given by F = BIL sinθ. The direction is given by Fleming's left-hand "
                "rule. When θ = 90° the force is maximum; when θ = 0° there is no "
                "force.\n\n"
                "A single moving charge experiences F = qvB (when v ⊥ B). This "
                "provides the centripetal force for circular motion. The radius of "
                "the orbit r = mv/(qB) depends on the momentum of the particle. "
                "Crucially, the period T = 2πm/(qB) is **independent of speed** — "
                "this is why cyclotrons work."
            ),
            advanced_text=(
                "The cyclotron frequency f_c = qB/(2πm) is also called the Larmor "
                "frequency. Cyclotrons exploit the constant period to continuously "
                "accelerate particles. At relativistic speeds (v → c) the mass "
                "increases, so the period is no longer constant — synchrotrons "
                "compensate by varying the field or frequency. The Hall effect "
                "arises when a current-carrying conductor is placed in a B field: "
                "the deflected carriers build up a transverse voltage V_H = IB/(nqt)."
            ),
            mode=mode,
        )


def render_induction(mode: str) -> None:
    """Sub-sim 2: Electromagnetic Induction — Faraday's Law."""

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        st.markdown("#### Coil parameters")
        N = st.slider("Number of turns N",
                      1, 500, 100, step=1, key="ind_N")
        A = st.select_slider(
            "Coil area A (m²)",
            options=[0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1],
            value=0.01,
            format_func=lambda v: f"{v:.3f}",
            key="ind_A",
        )
        v_mag = st.slider("Magnet speed v (m/s)",
                          0.1, 5.0, 1.0, step=0.1, key="ind_v",
                          help="Faster magnet → narrower flux pulse → larger EMF.")
        B_max = st.slider("Peak field B_max (T)",
                          0.01, 2.0, 0.5, step=0.01, key="ind_B")

        t_arr, flux, emf, peak_emf = compute_induction(N, A, v_mag, B_max)

        st.markdown("---")
        metric_row({
            "Peak EMF": f"{peak_emf:.4f} V",
            "Peak Flux Φ": f"{float(np.max(flux)) * 1000:.3f} mWb",
        })

        show_current = False
        R_coil = 10.0

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Induced current")
            R_coil = st.slider("Coil resistance R (Ω)",
                               1, 100, 10, key="ind_R")
            show_current = st.checkbox("Show induced current panel",
                                       value=True, key="ind_show_I")

            I_peak_ind = peak_emf / R_coil
            energy = float(np.trapz((emf / R_coil) ** 2 * R_coil, t_arr))

            metric_row({
                "Peak current": f"{I_peak_ind:.4f} A",
                "Energy dissipated": f"{energy:.4f} J",
            })

    with right_col:
        st.info(
            "**Lenz's Law:** The induced EMF always opposes the change that "
            "caused it — this is why it takes effort to push a magnet into a "
            "coil. The induced current creates its own field that repels the "
            "approaching magnet."
        )

        fig_ind = build_induction_plot(
            t_arr, flux, emf, N,
            show_current=show_current,
            R_coil=R_coil,
        )
        st.plotly_chart(fig_ind, use_container_width=True)

        # Insight callouts
        sigma_val = 1.0 / v_mag
        st.caption(
            f"Gaussian half-width σ = 1/v = {sigma_val:.2f} s  |  "
            f"Peak EMF = −N × dΦ/dt ≈ {peak_emf:.4f} V  |  "
            f"N = {N}, A = {A} m², B_max = {B_max} T"
        )

        if v_mag >= 3.0:
            st.warning(
                f"Fast magnet (v = {v_mag} m/s): narrow flux pulse → steep "
                "dΦ/dt → large induced EMF. Regenerative braking uses this "
                "principle to harvest energy from deceleration."
            )
        elif v_mag <= 0.5:
            st.info(
                f"Slow magnet (v = {v_mag} m/s): broad flux pulse → gentle "
                "dΦ/dt → small induced EMF. More turns (N) or larger area (A) "
                "can compensate."
            )

        if mode == "Advanced" and show_current:
            energy_val = float(np.trapz((emf / R_coil) ** 2 * R_coil, t_arr))
            st.success(
                f"Energy dissipated in coil resistance R = {R_coil} Ω: "
                f"E = ∫I²R dt ≈ {energy_val:.5f} J. This energy comes from the "
                "kinetic energy of the moving magnet."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\Phi = BA\cos\theta",
                r"\mathcal{E} = -N\frac{d\Phi}{dt}",
                r"\mathcal{E} = -N\frac{\Delta\Phi}{\Delta t}",
                r"I = \frac{\mathcal{E}}{R}",
            ],
            explanation=(
                "Faraday's law states that the induced EMF is proportional to the "
                "rate of change of magnetic flux linkage. The negative sign "
                "(Lenz's law) means the induced current always opposes the change "
                "causing it, consistent with conservation of energy.\n\n"
                "Here the magnetic flux through the coil rises as the magnet "
                "approaches, peaks at t = 2 s, then falls as the magnet moves "
                "away. The EMF is the negative gradient of the flux curve — it "
                "is positive while flux is increasing and negative while flux is "
                "decreasing."
            ),
            advanced_text=(
                "Self-inductance L is the tendency of a coil to oppose changes "
                "in its own current: EMF = −L dI/dt. Energy stored in the "
                "magnetic field of an inductor: E = ½LI². Mutual inductance M "
                "describes how one coil induces EMF in another — the principle "
                "behind transformers. Eddy currents are induced in solid "
                "conductors by changing flux; laminating a core reduces them."
            ),
            mode=mode,
        )


def render_transformer(mode: str) -> None:
    """Sub-sim 3: Ideal Transformer."""

    PRESETS_XFMR = {
        "Custom": None,
        "Step-up (×5)": dict(N_p=100, N_s=500, V_p=230, R_L=1000,
            context="A step-up transformer increases voltage. Used at power "
                    "stations to raise generation voltage (~25 kV) to "
                    "transmission voltage (~400 kV), reducing I²R losses."),
        "Step-down (÷5)": dict(N_p=500, N_s=100, V_p=1150, R_L=500,
            context="Step-down transformers reduce voltage for safe domestic "
                    "or industrial use. The UK national grid uses many stages "
                    "of step-down before reaching homes at 230 V."),
        "Isolation (1:1)": dict(N_p=100, N_s=100, V_p=230, R_L=1000,
            context="An isolation transformer has equal turns. No voltage "
                    "transformation — but it breaks the direct electrical "
                    "connection for safety (e.g., bathroom shaver sockets)."),
        "Phone charger (÷20)": dict(N_p=200, N_s=10, V_p=230, R_L=20,
            context="A phone charger typically steps 230 V AC down to ~12 V "
                    "before rectification and regulation to 5 V DC. Modern "
                    "switched-mode supplies operate at high frequency (~100 kHz) "
                    "so tiny transformers suffice."),
    }

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        preset_name = st.selectbox(
            "Real-world preset",
            list(PRESETS_XFMR.keys()),
            key="xfmr_preset",
        )
        preset = PRESETS_XFMR[preset_name]

        def _pv(key, default):
            return preset[key] if preset and key in preset else default

        st.markdown("#### Transformer parameters")

        N_p = st.slider("Primary turns N_p",
                        10, 1000, int(_pv("N_p", 100)), step=10,
                        key="xfmr_Np", disabled=(preset is not None))
        N_s = st.slider("Secondary turns N_s",
                        10, 1000, int(_pv("N_s", 200)), step=10,
                        key="xfmr_Ns", disabled=(preset is not None))
        V_p = st.slider("Primary peak voltage V_p (V)",
                        10, 2000, int(_pv("V_p", 230)), step=10,
                        key="xfmr_Vp", disabled=(preset is not None))
        R_L = st.select_slider(
            "Load resistance R_L (Ω)",
            options=[10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
            value=int(_pv("R_L", 1000)),
            key="xfmr_RL",
            disabled=(preset is not None),
        )

        V_s, I_s, I_p, P, t_xfmr, v_pri, v_sec = compute_transformer(
            N_p, N_s, V_p, R_L
        )
        k = N_s / N_p

        st.markdown("---")
        metric_row({
            "Turns ratio k": f"{k:.3f}",
            "V_s (peak)": f"{V_s:.2f} V",
        })
        metric_row({
            "I_p (rms)": f"{I_p / np.sqrt(2):.4f} A",
            "I_s (rms)": f"{I_s / np.sqrt(2):.4f} A",
        })
        st.metric("Power P (rms)", f"{P:.4f} W")

        if preset:
            st.info(f"**{preset_name}**\n\n{preset['context']}")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Efficiency")
            eta = st.slider("Transformer efficiency η (%)",
                            80, 100, 98, key="xfmr_eta",
                            help="Real transformers are 95–99% efficient. "
                                 "Losses come from eddy currents (reduced by "
                                 "laminated core), hysteresis, and copper resistance.")
            P_input = P / (eta / 100)
            P_loss = P_input - P
            st.metric("Input power P_in", f"{P_input:.4f} W")
            st.metric("Power loss P_loss", f"{P_loss:.4f} W")
            st.caption(
                f"At η = {eta}%, {P_loss:.4f} W is wasted as heat in the core "
                "and windings."
            )

    with right_col:
        st.info(
            "The National Grid uses step-up transformers to increase voltage to "
            "400 kV for long-distance transmission — higher voltage means lower "
            "current, reducing I²R heating losses in cables. At the other end, "
            "step-down transformers bring it back to the safe 230 V used in homes."
        )

        if k > 1.05:
            st.success(
                f"**Step-up transformer** (k = {k:.2f}): V_s = {V_s:.1f} V > "
                f"V_p = {V_p} V. Voltage increases, current decreases."
            )
        elif k < 0.95:
            st.warning(
                f"**Step-down transformer** (k = {k:.2f}): V_s = {V_s:.1f} V < "
                f"V_p = {V_p} V. Voltage decreases, current increases."
            )
        else:
            st.info(
                f"**Isolation transformer** (k ≈ 1): V_s ≈ V_p = {V_p} V. "
                "No voltage transformation — used for electrical isolation."
            )

        fig_xfmr = build_transformer_plot(t_xfmr, v_pri, v_sec, V_p, V_s)
        st.plotly_chart(fig_xfmr, use_container_width=True)

        metric_row({
            "N_p": str(N_p),
            "N_s": str(N_s),
            "V_s/V_p": f"{k:.3f}",
            "V_s (peak)": f"{V_s:.2f} V",
            "V_s (rms)": f"{V_s / np.sqrt(2):.2f} V",
            "Power P": f"{P:.3f} W",
        })

        if mode == "Advanced":
            eta_val = st.session_state.get("xfmr_eta", 98)
            P_in_adv = P / (eta_val / 100)
            P_loss_adv = P_in_adv - P
            st.markdown("---")
            st.markdown(
                f"**Efficiency η = {eta_val}%** → input = {P_in_adv:.4f} W, "
                f"losses = {P_loss_adv:.4f} W  \n"
                "Losses arise from:  \n"
                "- **Eddy currents** in the iron core (reduced by lamination)  \n"
                "- **Hysteresis** — energy to repeatedly reverse core magnetisation  \n"
                "- **Copper losses** — I²R heating in primary and secondary windings"
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\frac{V_s}{V_p} = \frac{N_s}{N_p}",
                r"\frac{I_p}{I_s} = \frac{N_s}{N_p}",
                r"P_{in} = V_p I_p = V_s I_s = P_{out} \quad \text{(ideal)}",
                r"\eta = \frac{P_{out}}{P_{in}} \times 100\%",
            ],
            explanation=(
                "An ideal transformer obeys the turns-ratio equation: V_s/V_p = "
                "N_s/N_p. Because energy is conserved in an ideal transformer, "
                "V_p I_p = V_s I_s — so if voltage is stepped up by a factor k, "
                "current is stepped down by the same factor k.\n\n"
                "Real transformers achieve 95–99% efficiency. The UK National Grid "
                "transmits power at 400 kV; at lower voltage the same power would "
                "require enormous currents, causing excessive I²R heating in cables."
            ),
            advanced_text=(
                "Transformer operation depends on mutual inductance M = k√(L₁L₂), "
                "where k (coupling coefficient) is close to 1 for a well-designed "
                "core. Self-inductance of primary: L₁ = μ₀N₁²A/l. Leakage "
                "inductance (flux that doesn't link both coils) causes voltage "
                "regulation problems under load. Switched-mode power supplies use "
                "transformers at 50–500 kHz — much higher than mains — allowing "
                "tiny, lightweight transformers (power ∝ frequency × volume)."
            ),
            mode=mode,
        )


# ── Main layout ───────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point — render the full simulation page."""

    sim_header(
        "🧲 Magnetic Fields & Electromagnetic Induction",
        SPEC_REF,
    )

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        mode = mode_toggle()

    # Tabs span both columns — we use st.tabs at top level
    tab1, tab2, tab3 = st.tabs(
        ["⚡ Magnetic Force", "🔄 Electromagnetic Induction", "🔌 Transformer"]
    )

    with tab1:
        render_magnetic_force(mode)

    with tab2:
        render_induction(mode)

    with tab3:
        render_transformer(mode)


# ── Run ───────────────────────────────────────────────────────────────────────

main()
