"""
Kinetic Theory of Gases simulation for WJEC Eduqas A Level Physics.

Component 1, Topic 7 (Kinetic Theory), sections (a)–(f).

Covers:
  - 2D particle-in-box simulation with Maxwell-Boltzmann speed distribution (Basic)
  - Elastic wall reflections and particle-particle collisions
  - Real-time speed histogram vs theoretical Maxwell-Boltzmann curve
  - Pressure from wall impulse; comparison with ideal gas law
  - Temperature thermostat (heat/cool) (Advanced)
  - Boyle's Law P vs 1/L² verification (Advanced)
  - Two-species mixture demonstrating equipartition theorem (Advanced)
"""

import json
import math
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components
from scipy import stats as scipy_stats

from utils.exam_ui import show_exam_panel
from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import k_B, R_gas, N_A, maxwell_boltzmann_pdf, rms_speed, mean_speed
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 7 (Kinetic Theory), sections (a)–(f)"

EQUATIONS = [
    r"pV = NkT",
    r"\bar{E_k} = \frac{3}{2}kT \text{ (3D)}",
    r"p = \frac{1}{3}\rho \langle c^2 \rangle",
    r"c_{rms} = \sqrt{\frac{3kT}{m}}",
]

EXPLANATION = (
    "Gas pressure arises from the collective impulse of particles bouncing off walls. "
    "Higher temperature → higher mean speed → greater impulse per collision → higher pressure. "
    "The Maxwell-Boltzmann distribution shows the spread of particle speeds at a given temperature. "
    "In this 2D simulation, each particle has two translational degrees of freedom, so the mean "
    "kinetic energy per particle is $k_BT$ (not $\\frac{3}{2}k_BT$ as in 3D). "
    "The simulation demonstrates: elastic wall reflections, particle-particle elastic collisions, "
    "and how the speed distribution evolves toward thermodynamic equilibrium."
)

ADVANCED_TEXT = (
    "**Derivation of p = ⅓ρ⟨c²⟩:** Consider N particles in a box of side L. "
    "Each particle bouncing off a wall transfers momentum 2mv_x, at frequency v_x/L, "
    "giving pressure contribution mv_x²/L³. Averaging over all particles and all directions: "
    "p = Nm⟨v_x²⟩/V = ⅓Nm⟨c²⟩/V = ⅓ρ⟨c²⟩. Since ⟨c²⟩ = 3k_BT/m, this gives p = Nk_BT/V.\n\n"
    "**Equipartition theorem:** Each quadratic degree of freedom contributes ½k_BT of average energy. "
    "In 2D, two translational DOF → mean KE = k_BT per particle. "
    "For a mixture of heavy (mass m) and light (mass m/4) particles at thermal equilibrium, "
    "both species share the same mean KE — a direct consequence of equipartition. "
    "The light particles therefore move faster on average (½m_light⟨v_light²⟩ = ½m_heavy⟨v_heavy²⟩).\n\n"
    "**Boyle's Law (P∝1/V at constant T):** For an ideal gas, pV = NkT. "
    "At fixed N and T, p ∝ 1/V = 1/L² (in 2D). Plotting P vs 1/L² gives a straight line "
    "through the origin with gradient Nk_BT."
)

# Particle mass presets (kg)
MASS_OPTIONS = {
    "Nitrogen (N₂, 4.65e-26 kg)": 4.65e-26,
    "Helium (6.64e-27 kg)": 6.64e-27,
    "Argon (6.63e-26 kg)": 6.63e-26,
}

DT = 0.005  # simulation time step (arbitrary units)

# ── Session state helpers ─────────────────────────────────────────────────────


def _ss_key(key: str) -> str:
    """Return a namespaced session-state key to avoid collisions."""
    return f"kt_{key}"


def _needs_reinit(N: int, T: float, L: float, m: float, two_species: bool) -> bool:
    """Return True if any parameter changed that requires re-initialisation."""
    params = (N, T, L, m, two_species)
    if st.session_state.get(_ss_key("params")) != params:
        return True
    if _ss_key("pos") not in st.session_state:
        return True
    return False


def _save_params(N: int, T: float, L: float, m: float, two_species: bool) -> None:
    st.session_state[_ss_key("params")] = (N, T, L, m, two_species)


# ── Physics / simulation helpers ──────────────────────────────────────────────


def _sample_velocities(N: int, m: float, T: float, rng: np.random.Generator) -> np.ndarray:
    """
    Sample 2D velocity components from the Maxwell-Boltzmann distribution.

    Each component v_x, v_y ~ N(0, sqrt(k_B T / m)).

    Parameters
    ----------
    N   : number of particles
    m   : particle mass (kg)
    T   : temperature (K)
    rng : numpy random generator

    Returns
    -------
    vel : (N, 2) array of [vx, vy] in m/s
    """
    sigma = np.sqrt(k_B * T / m)
    return rng.normal(0.0, sigma, size=(N, 2))


def _initialise_particles(
    N: int,
    m: float,
    T: float,
    L: float,
    two_species: bool,
) -> None:
    """
    Populate session state with fresh particle positions and velocities.

    For two-species mode the first N//2 particles are heavy (mass m) and
    the remaining N//2 are light (mass m/4).  Masses are stored per-particle
    in st.session_state[_ss_key("masses")].

    Parameters
    ----------
    N           : total particle count
    m           : heavy particle mass (kg)
    T           : initial temperature (K)
    L           : box side length (arbitrary units)
    two_species : whether to enable the two-species mixture
    """
    rng = np.random.default_rng()
    r = 0.03 * L  # particle radius

    # Grid-initialise positions to avoid immediate overlaps
    n_side = int(np.ceil(np.sqrt(N)))
    grid_x = np.linspace(2 * r, L - 2 * r, n_side)
    grid_y = np.linspace(2 * r, L - 2 * r, n_side)
    gx, gy = np.meshgrid(grid_x, grid_y)
    grid_pts = np.column_stack([gx.ravel(), gy.ravel()])
    # Shuffle and take first N points; add small jitter
    idx = rng.permutation(len(grid_pts))[:N]
    pos = grid_pts[idx] + rng.uniform(-0.5 * r, 0.5 * r, size=(N, 2))
    pos = np.clip(pos, 2 * r, L - 2 * r)

    # Masses and velocities
    if two_species:
        masses = np.where(np.arange(N) < N // 2, m, m / 4.0)
        vel = np.zeros((N, 2))
        for i, mi in enumerate(masses):
            vel[i] = _sample_velocities(1, mi, T, rng)[0]
    else:
        masses = np.full(N, m)
        vel = _sample_velocities(N, m, T, rng)

    st.session_state[_ss_key("pos")] = pos.astype(np.float64)
    st.session_state[_ss_key("vel")] = vel.astype(np.float64)
    st.session_state[_ss_key("masses")] = masses.astype(np.float64)
    st.session_state[_ss_key("step")] = 0
    st.session_state[_ss_key("pressure_acc")] = 0.0
    st.session_state[_ss_key("pressure_steps")] = 0


def _step_simulation(L: float, n_steps: int) -> float:
    """
    Advance the particle simulation by n_steps steps of size DT.

    Applies:
      1. Position update
      2. Elastic wall reflections (tracking impulse for pressure)
      3. Pairwise elastic particle-particle collisions

    Parameters
    ----------
    L       : box side length (arbitrary units)
    n_steps : number of DT steps to advance

    Returns
    -------
    pressure : mean pressure (force per unit length, i.e. 2D pressure) over
               this batch of steps, averaged across all four walls.
    """
    pos = st.session_state[_ss_key("pos")]  # (N, 2)
    vel = st.session_state[_ss_key("vel")]  # (N, 2)
    masses = st.session_state[_ss_key("masses")]  # (N,)
    N = len(pos)
    r = 0.03 * L
    diameter = 2.0 * r

    total_impulse = 0.0  # sum of momentum transferred to all walls (all steps)

    for _ in range(n_steps):
        # 1. Update positions
        pos += vel * DT

        # 2. Wall reflections — accumulate impulse for pressure measurement
        for dim in range(2):
            # Low wall (x=r or y=r)
            mask_lo = pos[:, dim] < r
            if np.any(mask_lo):
                total_impulse += np.sum(2.0 * masses[mask_lo] * np.abs(vel[mask_lo, dim]))
                pos[mask_lo, dim] = r
                vel[mask_lo, dim] = np.abs(vel[mask_lo, dim])

            # High wall (x=L-r or y=L-r)
            mask_hi = pos[:, dim] > L - r
            if np.any(mask_hi):
                total_impulse += np.sum(2.0 * masses[mask_hi] * np.abs(vel[mask_hi, dim]))
                pos[mask_hi, dim] = L - r
                vel[mask_hi, dim] = -np.abs(vel[mask_hi, dim])

        # 3. Pairwise particle-particle elastic collisions (O(N²))
        for i in range(N - 1):
            for j in range(i + 1, N):
                dx = pos[j, 0] - pos[i, 0]
                dy = pos[j, 1] - pos[i, 1]
                dist2 = dx * dx + dy * dy
                if dist2 < diameter * diameter and dist2 > 1e-18:
                    dist = np.sqrt(dist2)
                    nx = dx / dist
                    ny = dy / dist

                    mi = masses[i]
                    mj = masses[j]

                    # Relative velocity along collision normal
                    dv_n = ((vel[i, 0] - vel[j, 0]) * nx
                            + (vel[i, 1] - vel[j, 1]) * ny)

                    # Only resolve if particles are approaching
                    if dv_n > 0:
                        # Elastic collision impulse
                        impulse = 2.0 * mi * mj * dv_n / (mi + mj)
                        vel[i, 0] -= impulse * nx / mi
                        vel[i, 1] -= impulse * ny / mi
                        vel[j, 0] += impulse * nx / mj
                        vel[j, 1] += impulse * ny / mj

                        # Push particles apart to avoid overlap
                        overlap = diameter - dist
                        push = 0.5 * overlap + 1e-6
                        pos[i, 0] -= push * nx
                        pos[i, 1] -= push * ny
                        pos[j, 0] += push * nx
                        pos[j, 1] += push * ny

    st.session_state[_ss_key("pos")] = pos
    st.session_state[_ss_key("vel")] = vel
    st.session_state[_ss_key("step")] += n_steps

    # Pressure = total impulse / (time elapsed * perimeter length)
    # 2D box: perimeter = 4*L; time = n_steps * DT
    time_elapsed = n_steps * DT
    if time_elapsed > 0:
        pressure = total_impulse / (time_elapsed * 4.0 * L)
    else:
        pressure = 0.0
    return pressure


def _compute_thermodynamics(masses: np.ndarray, vel: np.ndarray) -> dict:
    """
    Compute thermodynamic quantities from current particle state.

    Parameters
    ----------
    masses : (N,) per-particle masses (kg)
    vel    : (N, 2) velocity array (m/s)

    Returns
    -------
    dict with keys: speeds, mean_KE, T_measured, speeds_heavy, speeds_light,
                    mean_KE_heavy, mean_KE_light
    """
    speeds = np.linalg.norm(vel, axis=1)  # (N,)
    ke_per_particle = 0.5 * masses * speeds**2  # (N,)
    mean_KE = float(np.mean(ke_per_particle))
    # 2D equipartition: <KE> = k_B * T  (2 DOF × ½k_BT each)
    T_measured = mean_KE / k_B

    N = len(masses)
    n_heavy = N // 2
    result = {
        "speeds": speeds,
        "mean_KE": mean_KE,
        "T_measured": T_measured,
        "speeds_heavy": speeds[:n_heavy],
        "speeds_light": speeds[n_heavy:],
        "mean_KE_heavy": float(np.mean(ke_per_particle[:n_heavy])) if n_heavy > 0 else 0.0,
        "mean_KE_light": float(np.mean(ke_per_particle[n_heavy:])) if n_heavy < N else 0.0,
    }
    return result


# ── Plot builders ─────────────────────────────────────────────────────────────


def _build_particle_plot(
    pos: np.ndarray,
    vel: np.ndarray,
    masses: np.ndarray,
    L: float,
    m: float,
    T: float,
    two_species: bool,
) -> go.Figure:
    """
    Build the particle scatter plot with box outline and speed-coded colours.

    Parameters
    ----------
    pos         : (N, 2) positions
    vel         : (N, 2) velocities
    masses      : (N,) per-particle masses (kg)
    L           : box side length
    m           : reference (heavy) mass for colour normalisation
    T           : set temperature (for colour scale normalisation)
    two_species : whether two-species mode is active

    Returns
    -------
    fig : Plotly Figure
    """
    speeds = np.linalg.norm(vel, axis=1)
    r = 0.03 * L
    marker_px = max(8, int(r * 200))  # approximate pixels — minimum 8 for colour visibility

    v_ref = rms_speed(m, T)
    v_cmax = 2.5 * max(v_ref, 1e-30)  # colour scale: slow=blue, average=white/yellow, fast=red

    if two_species:
        N = len(pos)
        n_heavy = N // 2
        # Heavy particles
        trace_heavy = go.Scatter(
            x=pos[:n_heavy, 0],
            y=pos[:n_heavy, 1],
            mode="markers",
            name="Heavy",
            marker=dict(
                size=marker_px,
                color=speeds[:n_heavy],
                colorscale="RdYlBu_r",
                cmin=0,
                cmax=v_cmax,
                showscale=False,
                line=dict(width=1, color=COLOURS["secondary"]),
                symbol="circle",
            ),
        )
        # Light particles (smaller marker)
        trace_light = go.Scatter(
            x=pos[n_heavy:, 0],
            y=pos[n_heavy:, 1],
            mode="markers",
            name="Light",
            marker=dict(
                size=max(6, marker_px - 2),
                color=speeds[n_heavy:],
                colorscale="RdYlBu_r",
                cmin=0,
                cmax=v_cmax,
                showscale=False,
                line=dict(width=1, color=COLOURS["tertiary"]),
                symbol="diamond",
            ),
        )
        traces = [trace_heavy, trace_light]
    else:
        traces = [
            go.Scatter(
                x=pos[:, 0],
                y=pos[:, 1],
                mode="markers",
                name="Particles",
                marker=dict(
                    size=marker_px,
                    color=speeds,
                    colorscale="RdYlBu_r",
                    cmin=0,
                    cmax=v_cmax,
                    showscale=True,
                    colorbar=dict(
                        title="Speed (m/s)",
                        thickness=12,
                        len=0.7,
                        titlefont=dict(color=COLOURS["text"], size=11),
                        tickfont=dict(color=COLOURS["text"], size=10),
                    ),
                    line=dict(width=0.5, color="rgba(255,255,255,0.3)"),
                ),
                text=[f"v = {s:.1f} m/s" for s in speeds],
                hovertemplate="x=%{x:.3f}<br>y=%{y:.3f}<br>%{text}<extra></extra>",
            )
        ]

    fig = go.Figure(data=traces)

    # Box outline
    fig.add_shape(
        type="rect",
        x0=0, y0=0, x1=L, y1=L,
        line=dict(color=COLOURS["text"], width=2),
        fillcolor="rgba(0,0,0,0)",
    )

    pad = L * 0.05
    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="Particle Simulation", font=dict(size=14)),
            xaxis=dict(
                title="x (a.u.)",
                range=[-pad, L + pad],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                scaleanchor="y",
                scaleratio=1,
            ),
            yaxis=dict(
                title="y (a.u.)",
                range=[-pad, L + pad],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=two_species,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                bgcolor="rgba(0,0,0,0.4)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
            ),
        )
    )
    return fig


def _build_speed_histogram(
    speeds: np.ndarray,
    m: float,
    T: float,
    T_measured: float,
    two_species: bool = False,
    speeds_heavy: np.ndarray | None = None,
    speeds_light: np.ndarray | None = None,
    m_light: float | None = None,
) -> go.Figure:
    """
    Build the speed distribution histogram with a Maxwell-Boltzmann overlay.

    Uses 3D Maxwell-Boltzmann PDF from utils.physics for the theoretical curve.
    The histogram is normalised to probability density to allow direct comparison.

    Parameters
    ----------
    speeds      : all particle speeds (m/s)
    m           : heavy particle mass (kg)
    T           : set temperature (K)
    T_measured  : temperature inferred from mean KE
    two_species : whether to show two separate histograms
    speeds_heavy, speeds_light : per-species speed arrays (two_species mode)
    m_light     : light particle mass (kg)

    Returns
    -------
    fig : Plotly Figure
    """
    v_max = max(float(np.percentile(speeds, 99)) * 1.3, rms_speed(m, T) * 3.0) if len(speeds) else rms_speed(m, T) * 3.0
    v_range = np.linspace(0, v_max, 400)

    fig = go.Figure()

    if two_species and speeds_heavy is not None and speeds_light is not None and m_light is not None:
        # Heavy species histogram
        if len(speeds_heavy) > 1:
            fig.add_trace(
                go.Histogram(
                    x=speeds_heavy,
                    nbinsx=20,
                    name="Heavy species",
                    histnorm="probability density",
                    marker_color=COLOURS["secondary"],
                    opacity=0.6,
                )
            )
        # Light species histogram
        if len(speeds_light) > 1:
            fig.add_trace(
                go.Histogram(
                    x=speeds_light,
                    nbinsx=20,
                    name="Light species",
                    histnorm="probability density",
                    marker_color=COLOURS["tertiary"],
                    opacity=0.6,
                )
            )

        # Theoretical MB curves for each species (using T_measured)
        T_eff = max(T_measured, 10.0)
        pdf_heavy = maxwell_boltzmann_pdf(v_range, m, T_eff)
        pdf_light = maxwell_boltzmann_pdf(v_range, m_light, T_eff)

        fig.add_trace(
            go.Scatter(
                x=v_range, y=pdf_heavy,
                mode="lines",
                name="MB (heavy, T_meas)",
                line=dict(color=COLOURS["secondary"], width=2, dash="dash"),
            )
        )
        fig.add_trace(
            go.Scatter(
                x=v_range, y=pdf_light,
                mode="lines",
                name="MB (light, T_meas)",
                line=dict(color=COLOURS["tertiary"], width=2, dash="dash"),
            )
        )

    else:
        # Single-species histogram
        if len(speeds) > 1:
            fig.add_trace(
                go.Histogram(
                    x=speeds,
                    nbinsx=25,
                    name="Simulation",
                    histnorm="probability density",
                    marker_color=COLOURS["primary"],
                    opacity=0.7,
                )
            )

        # Theoretical MB at set temperature
        pdf_set = maxwell_boltzmann_pdf(v_range, m, max(T, 10.0))
        fig.add_trace(
            go.Scatter(
                x=v_range, y=pdf_set,
                mode="lines",
                name=f"MB theory (T_set={T:.0f} K)",
                line=dict(color=COLOURS["secondary"], width=2),
            )
        )

        # Theoretical MB at measured temperature
        T_eff = max(T_measured, 10.0)
        if abs(T_eff - T) / max(T, 1.0) > 0.05:
            pdf_meas = maxwell_boltzmann_pdf(v_range, m, T_eff)
            fig.add_trace(
                go.Scatter(
                    x=v_range, y=pdf_meas,
                    mode="lines",
                    name=f"MB theory (T_meas={T_eff:.0f} K)",
                    line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
                )
            )

        # Three characteristic speeds: v_mp, v_mean, v_rms
        v_mp_val   = np.sqrt(2 * k_B * T / m)          # most probable speed
        v_mean_val = mean_speed(m, T)                   # mean speed
        v_rms_val  = rms_speed(m, T)                    # root mean square speed

        fig.add_vline(
            x=v_mp_val,
            line=dict(color=COLOURS["primary"], dash="dash", width=1.5),
            annotation_text=f"v_mp = {v_mp_val:.0f} m/s",
            annotation_font=dict(color=COLOURS["primary"], size=10),
            annotation_position="top left",
        )
        fig.add_vline(
            x=v_mean_val,
            line=dict(color=COLOURS["secondary"], dash="dash", width=1.5),
            annotation_text=f"v_mean = {v_mean_val:.0f} m/s",
            annotation_font=dict(color=COLOURS["secondary"], size=10),
            annotation_position="top right",
        )
        fig.add_vline(
            x=v_rms_val,
            line=dict(color=COLOURS["tertiary"], dash="dash", width=1.5),
            annotation_text=f"v_rms = {v_rms_val:.0f} m/s",
            annotation_font=dict(color=COLOURS["tertiary"], size=10),
            annotation_position="top right",
        )

    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="Speed Distribution", font=dict(size=14)),
            barmode="overlay",
            xaxis=dict(
                title="Speed (m/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Probability density (s/m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                bgcolor="rgba(0,0,0,0.4)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
                font=dict(size=10),
            ),
        )
    )
    return fig


def _build_boyle_plot(N: int, m: float, T: float) -> go.Figure:
    """
    Build the Boyle's Law P vs 1/L² theoretical plot.

    At constant N and T, the ideal-gas law gives p = NkT/L².
    Plotting p vs 1/L² gives a straight line of gradient NkT.

    Parameters
    ----------
    N : number of particles
    m : particle mass (kg, unused but kept for signature consistency)
    T : temperature (K)

    Returns
    -------
    fig : Plotly Figure
    """
    L_values = np.linspace(0.5, 5.0, 200)
    inv_L2 = 1.0 / L_values**2
    P_values = N * k_B * T * inv_L2

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=inv_L2,
            y=P_values,
            mode="lines",
            name="P = NkT / L²",
            line=dict(color=COLOURS["tertiary"], width=2),
        )
    )
    # Mark gradient annotation
    grad = N * k_B * T
    fig.add_annotation(
        x=float(np.median(inv_L2)),
        y=float(np.median(P_values)),
        text=f"Gradient = NkT = {grad:.3e} J",
        showarrow=True,
        arrowhead=2,
        arrowcolor=COLOURS["advanced"],
        font=dict(color=COLOURS["advanced"], size=11),
        bgcolor="rgba(0,0,0,0.6)",
        bordercolor=COLOURS["advanced"],
    )
    fig.update_layout(
        **plotly_layout(
            height=360,
            title=dict(text="Boyle's Law: P vs 1/L² (ideal gas, constant T)", font=dict(size=14)),
            xaxis=dict(
                title="1/L² (a.u.⁻²)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Pressure P (2D, Pa equivalent)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=True,
        )
    )
    return fig


# ── Gas species options for the PV tab ───────────────────────────────────────

PV_GAS_OPTIONS = {
    "N₂ (Nitrogen, 4.65e-26 kg)": 4.65e-26,
    "He (Helium, 6.64e-27 kg)":   6.64e-27,
    "CO₂ (Carbon dioxide, 7.30e-26 kg)": 7.30e-26,
    "O₂ (Oxygen, 5.32e-26 kg)":   5.32e-26,
}

_D_MOLECULE = 3.7e-10  # m — effective diameter for mean free path (N₂ reference)

# ── Ideal Gas Law plot builders ───────────────────────────────────────────────


def _build_pv_diagram(n_mol: float, T: float, V_current: float) -> go.Figure:
    """
    Build PV diagram showing three isotherms at T/2, T, and 2T.

    Parameters
    ----------
    n_mol     : amount of gas (mol)
    T         : current temperature (K) — the primary isotherm
    V_current : current volume (m³) — marks the state point

    Returns
    -------
    fig : Plotly Figure
    """
    V_range = np.linspace(0.001, 0.1, 100)

    T_vals = [T / 2.0, T, 2.0 * T]
    colours = [
        "rgba(31,119,180,0.35)",   # T/2 — faded primary
        COLOURS["primary"],        # T — bright
        COLOURS["secondary"],      # 2T — medium
    ]
    widths = [1.5, 2.5, 2.0]

    fig = go.Figure()

    for T_iso, col, lw in zip(T_vals, colours, widths):
        P_iso = n_mol * R_gas * T_iso / V_range
        fig.add_trace(
            go.Scatter(
                x=V_range,
                y=P_iso,
                mode="lines",
                name=f"T = {T_iso:.0f} K",
                line=dict(color=col, width=lw),
            )
        )

    # Mark current state point
    P_current = n_mol * R_gas * T / V_current
    fig.add_trace(
        go.Scatter(
            x=[V_current],
            y=[P_current],
            mode="markers",
            name="Current state",
            marker=dict(
                color=COLOURS["highlight"],
                size=12,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1.5),
            ),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="PV Diagram — Isotherms (Boyle's Law)", font=dict(size=14)),
            xaxis=dict(
                title="Volume V (m³)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Pressure P (Pa)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                bgcolor="rgba(0,0,0,0.4)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
                font=dict(size=10),
            ),
        )
    )
    return fig


def _build_pt_ke_plot(
    n_mol: float,
    V: float,
    T_current: float,
    mode: str,
    m_molecule: float,
) -> go.Figure:
    """
    Dual y-axis plot: pressure P and mean KE per molecule vs temperature T.

    Left axis  (blue) : P = nRT/V
    Right axis (orange): mean KE = (3/2)k_B T
    Optional third trace (Advanced): mean free path λ = kT/(√2 π d² P)

    Parameters
    ----------
    n_mol       : moles of gas
    V           : fixed volume (m³)
    T_current   : current temperature for the vertical marker
    mode        : "Basic" or "Advanced"
    m_molecule  : molecular mass (kg) — used for mean free path

    Returns
    -------
    fig : Plotly Figure
    """
    T_range = np.linspace(100, 2000, 200)
    P_range = n_mol * R_gas * T_range / V
    KE_range = 1.5 * k_B * T_range

    show_mfp = mode == "Advanced"

    if show_mfp:
        fig = make_subplots(specs=[[{"secondary_y": True}]])
    else:
        fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Left axis: pressure
    fig.add_trace(
        go.Scatter(
            x=T_range,
            y=P_range,
            mode="lines",
            name="Pressure P (Pa)",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        secondary_y=False,
    )

    # Right axis: mean KE
    fig.add_trace(
        go.Scatter(
            x=T_range,
            y=KE_range,
            mode="lines",
            name="Mean KE per molecule (J)",
            line=dict(color=COLOURS["secondary"], width=2),
        ),
        secondary_y=True,
    )

    # Advanced: mean free path (third trace on right axis, separate scale not practical
    # in Plotly dual-axis — plot normalised or as annotation)
    if show_mfp:
        mfp_range = k_B * T_range / (np.sqrt(2) * np.pi * _D_MOLECULE**2 * P_range)
        fig.add_trace(
            go.Scatter(
                x=T_range,
                y=mfp_range * 1e9,  # convert to nm
                mode="lines",
                name="Mean free path λ (nm)",
                line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
            ),
            secondary_y=True,
        )

    # Vertical line at current T
    fig.add_vline(
        x=T_current,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
        annotation_text=f"T = {T_current:.0f} K",
        annotation_font=dict(color=COLOURS["highlight"], size=10),
        annotation_position="top right",
    )

    base_layout = plotly_layout(
        height=400,
        title=dict(text="P and Mean KE vs Temperature", font=dict(size=14)),
        xaxis=dict(
            title="Temperature T (K)",
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            bgcolor="rgba(0,0,0,0.4)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
            font=dict(size=10),
        ),
    )
    fig.update_layout(**base_layout)
    fig.update_yaxes(
        title_text="Pressure P (Pa)",
        title_font=dict(color=COLOURS["primary"]),
        tickfont=dict(color=COLOURS["primary"]),
        gridcolor=COLOURS["grid"],
        secondary_y=False,
    )
    fig.update_yaxes(
        title_text="Mean KE per molecule (J)" + (" / Mean free path λ (nm)" if show_mfp else ""),
        title_font=dict(color=COLOURS["secondary"]),
        tickfont=dict(color=COLOURS["secondary"]),
        gridcolor=COLOURS["grid"],
        secondary_y=True,
    )
    return fig


# ── p5.js kinetic animation ───────────────────────────────────────────────────


def build_kinetic_animation(T, N, mass_amu):
    """
    Return an HTML string containing a self-contained p5.js particle simulation.

    Parameters
    ----------
    T        : temperature (K)
    N        : number of particles (capped at 150)
    mass_amu : molecular mass in atomic mass units
    """
    k_B = 1.380649e-23
    m = float(mass_amu) * 1.66054e-27
    v_rms = float((3 * k_B * float(T) / m) ** 0.5)
    data = json.dumps({"T": float(T), "N": min(int(N), 150), "vRms": v_rms, "mass": float(m)})
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{ margin: 0; background: #0e1117; overflow: hidden; }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const INIT = {data};

new p5(function(p) {{
  // ── Config ──────────────────────────────────────────────────────────────────
  const BG       = '#0e1117';
  const BOX_FRAC = 0.68;   // fraction of canvas width for particle box
  const HIST_FRAC = 0.30;  // fraction for histogram panel
  const MARGIN   = 6;

  // ── State ───────────────────────────────────────────────────────────────────
  let W, H, boxX, boxW, boxH, boxY;
  let histX, histW;
  let particles = [];
  let pistonX;          // current right-wall x of box (pixels)
  let pistonDrag = false;
  let dragOffsetX = 0;
  let running = true;
  let simSpeed = 1;     // steps per frame
  let frameCount2 = 0;
  let histBins = [];
  let histMax  = 1;
  let T_display = INIT.T;
  let compressText = 0; // countdown frames for "Adiabatic compression!" label
  let prevPistonX;

  // ── Setup ───────────────────────────────────────────────────────────────────
  p.setup = function() {{
    let cnv = p.createCanvas(p.windowWidth || 700, 420);
    cnv.style('display', 'block');
    p.textFont('monospace');
    layout();
    spawnParticles(INIT.N);
    computeHist();
  }};

  function layout() {{
    W = p.width;
    H = p.height;
    boxY  = 50;
    boxH  = H - boxY - 30;
    boxX  = MARGIN;
    boxW  = Math.floor(W * BOX_FRAC);
    pistonX  = boxX + boxW;
    prevPistonX = pistonX;
    histX = boxX + boxW + Math.floor(W * 0.02);
    histW = Math.floor(W * HIST_FRAC) - MARGIN;
  }}

  // ── Particle factory ─────────────────────────────────────────────────────────
  function makeParticle(px, py) {{
    let angle  = p.random(p.TWO_PI);
    let speed  = INIT.vRms * p.sqrt(-2.0 * p.log(p.max(p.random(), 1e-10)));
    let vx = speed * p.cos(angle);
    let vy = speed * p.sin(angle);
    // Scale to pixel space: use 1 unit = 80 pixels notionally
    let scale = 80;
    return {{ x: px, y: py, vx: vx / scale, vy: vy / scale, r: 5 }};
  }}

  function spawnParticles(n) {{
    particles = [];
    for (let i = 0; i < n; i++) {{
      let px = p.random(boxX + 8, pistonX - 8);
      let py = p.random(boxY + 8, boxY + boxH - 8);
      particles.push(makeParticle(px, py));
    }}
  }}

  // ── Speed → colour ───────────────────────────────────────────────────────────
  function speedColour(speed) {{
    // Reference scale: 1 pixel-unit/frame ≈ 80 m/s (our scaling factor)
    let scale = 80;
    let vRef = INIT.vRms / scale;
    let t = p.constrain(speed / (2.5 * vRef), 0, 1);
    let slow = p.color(50, 100, 255);
    let mid  = p.color(50, 220, 80);
    let fast = p.color(255, 60, 40);
    if (t < 0.5) return p.lerpColor(slow, mid, t * 2);
    return p.lerpColor(mid, fast, (t - 0.5) * 2);
  }}

  // ── Simulation step ──────────────────────────────────────────────────────────
  function stepSim() {{
    // Piston velocity (pixels per frame) for energy exchange
    let pistonVel = pistonX - prevPistonX;
    prevPistonX = pistonX;

    for (let pt of particles) {{
      pt.x += pt.vx;
      pt.y += pt.vy;

      // Left wall
      if (pt.x - pt.r < boxX) {{
        pt.x = boxX + pt.r;
        pt.vx = p.abs(pt.vx);
      }}
      // Right wall (piston)
      if (pt.x + pt.r > pistonX) {{
        pt.x = pistonX - pt.r;
        // Energy exchange with moving piston
        pt.vx = -(pt.vx - pistonVel * 0.015) - pistonVel * 0.015;
        pt.vx = -p.abs(pt.vx);  // ensure heading left
      }}
      // Top wall
      if (pt.y - pt.r < boxY) {{
        pt.y = boxY + pt.r;
        pt.vy = p.abs(pt.vy);
      }}
      // Bottom wall
      if (pt.y + pt.r > boxY + boxH) {{
        pt.y = boxY + boxH - pt.r;
        pt.vy = -p.abs(pt.vy);
      }}
    }}
  }}

  // ── Histogram computation (every 30 frames) ───────────────────────────────────
  function computeHist() {{
    let speeds = particles.map(pt => p.sqrt(pt.vx * pt.vx + pt.vy * pt.vy));
    let maxV = p.max(speeds) * 1.05 + 1e-9;
    let nBins = 20;
    histBins = new Array(nBins).fill(0);
    for (let s of speeds) {{
      let b = p.floor((s / maxV) * nBins);
      if (b >= nBins) b = nBins - 1;
      histBins[b]++;
    }}
    histMax = p.max(histBins) || 1;

    // Compute display temperature from mean KE
    let meanV2 = speeds.reduce((a, v) => a + v * v, 0) / (speeds.length || 1);
    let scale = 80;
    let v_ms2 = meanV2 * scale * scale;
    T_display = (INIT.mass * v_ms2) / (2 * 1.380649e-23);
  }}

  // ── Draw ─────────────────────────────────────────────────────────────────────
  p.draw = function() {{
    p.background(BG);

    if (running) {{
      for (let s = 0; s < simSpeed; s++) stepSim();
      frameCount2++;
      if (frameCount2 % 30 === 0) computeHist();
    }}

    // ── Box outline ───────────────────────────────────────────────────────────
    p.noFill();
    p.stroke(180, 180, 200);
    p.strokeWeight(2);
    p.rect(boxX, boxY, pistonX - boxX, boxH);

    // ── Piston handle ─────────────────────────────────────────────────────────
    p.fill(255, 140, 0);
    p.noStroke();
    p.rect(pistonX, boxY + boxH * 0.3, 14, boxH * 0.4, 4);
    p.stroke(255, 200, 0);
    p.strokeWeight(2);
    p.line(pistonX, boxY, pistonX, boxY + boxH);

    // Compression label
    if (compressText > 0) {{
      compressText--;
      p.noStroke();
      p.fill(255, 180, 0);
      p.textSize(12);
      p.textAlign(p.CENTER);
      p.text('Adiabatic compression!', boxX + (pistonX - boxX) / 2, boxY + 22);
    }}

    // ── Particles ─────────────────────────────────────────────────────────────
    p.noStroke();
    for (let pt of particles) {{
      let spd = p.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);
      p.fill(speedColour(spd));
      p.ellipse(pt.x, pt.y, pt.r * 2, pt.r * 2);
    }}

    // ── Temperature readout ───────────────────────────────────────────────────
    p.noStroke();
    p.fill(220, 220, 240);
    p.textSize(12);
    p.textAlign(p.LEFT);
    p.text('T ≈ ' + p.nf(T_display, 1, 0) + ' K', boxX + 8, boxY + 18);
    p.text('N = ' + particles.length, boxX + 8, boxY + 34);

    // ── Histogram panel ───────────────────────────────────────────────────────
    p.noStroke();
    p.fill(100, 110, 140);
    p.rect(histX - 2, boxY, histW + 4, boxH, 4);

    p.fill(220, 220, 240);
    p.textSize(11);
    p.textAlign(p.CENTER);
    p.text('Speed distribution', histX + histW / 2, boxY + 14);

    let barW = histW / histBins.length;
    for (let i = 0; i < histBins.length; i++) {{
      let barH = (histBins[i] / histMax) * (boxH - 30);
      let t = i / histBins.length;
      let slow = p.color(50, 100, 255);
      let mid  = p.color(50, 220, 80);
      let fast = p.color(255, 60, 40);
      let col;
      if (t < 0.5) col = p.lerpColor(slow, mid, t * 2);
      else col = p.lerpColor(mid, fast, (t - 0.5) * 2);
      p.fill(col);
      p.noStroke();
      p.rect(histX + i * barW, boxY + boxH - barH, barW - 1, barH);
    }}

    // Axis labels
    p.fill(180, 180, 200);
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('slow', histX + 2, boxY + boxH + 12);
    p.textAlign(p.RIGHT);
    p.text('fast', histX + histW - 2, boxY + boxH + 12);

    // ── Controls UI ───────────────────────────────────────────────────────────
    drawControls();
  }};

  function drawControls() {{
    // Play/pause button
    let bx = W - 120, by = 8, bw = 52, bh = 22;
    p.fill(running ? '#2a7a4b' : '#7a2a2a');
    p.noStroke();
    p.rect(bx, by, bw, bh, 4);
    p.fill(240);
    p.textSize(11);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(running ? '⏸ Pause' : '▶ Play', bx + bw / 2, by + bh / 2);

    // Speed buttons
    let sx = W - 62, sy = 8;
    p.fill(60, 60, 90);
    p.rect(sx, sy, 26, 22, 4);
    p.fill(240);
    p.text('×' + simSpeed, sx + 13, sy + 11);

    p.fill(50, 50, 80);
    p.rect(sx + 28, sy, 22, 10, 3);
    p.fill(200);
    p.textSize(9);
    p.text('+', sx + 39, sy + 5);
    p.rect(sx + 28, sy + 12, 22, 10, 3);
    p.text('−', sx + 39, sy + 17);
  }}

  // ── Mouse interaction ─────────────────────────────────────────────────────────
  p.mousePressed = function() {{
    let mx = p.mouseX, my = p.mouseY;

    // Play/pause
    let bx = W - 120, by = 8, bw = 52, bh = 22;
    if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {{
      running = !running;
      return;
    }}

    // Speed + / −
    let sx = W - 62, sy = 8;
    if (mx >= sx + 28 && mx <= sx + 50) {{
      if (my >= sy && my <= sy + 10) {{ simSpeed = p.min(simSpeed + 1, 5); return; }}
      if (my >= sy + 12 && my <= sy + 22) {{ simSpeed = p.max(simSpeed - 1, 1); return; }}
    }}

    // Piston drag — hit zone: piston line ±10 px + handle rectangle
    if (mx >= pistonX - 4 && mx <= pistonX + 18 &&
        my >= boxY && my <= boxY + boxH) {{
      pistonDrag = true;
      dragOffsetX = mx - pistonX;
      return;
    }}

    // Click inside box → add particle
    if (mx > boxX + 8 && mx < pistonX - 8 &&
        my > boxY + 8 && my < boxY + boxH - 8) {{
      particles.push(makeParticle(mx, my));
    }}
  }};

  p.mouseDragged = function() {{
    if (!pistonDrag) return;
    let newPiston = p.constrain(
      p.mouseX - dragOffsetX,
      boxX + 40,          // minimum compression
      boxX + boxW         // maximum (original) position
    );
    if (newPiston < pistonX - 0.5) {{
      compressText = 60;
    }}
    // Clamp particles inside new piston boundary
    for (let pt of particles) {{
      if (pt.x + pt.r > newPiston) {{
        pt.x = newPiston - pt.r;
        pt.vx = -p.abs(pt.vx) * 1.04; // slight speed boost on compression
      }}
    }}
    pistonX = newPiston;
  }};

  p.mouseReleased = function() {{
    pistonDrag = false;
  }};

  // ── Window resize ─────────────────────────────────────────────────────────────
  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || 700, 420);
    layout();
    // Rescale particle positions proportionally
    for (let pt of particles) {{
      pt.x = p.constrain(pt.x, boxX + pt.r, pistonX - pt.r);
      pt.y = p.constrain(pt.y, boxY + pt.r, boxY + boxH - pt.r);
    }}
  }};
}});
</script>
</body>
</html>"""


# ── Tab renderers ─────────────────────────────────────────────────────────────


def render_particle_sim(mode: str) -> None:
    """Render the existing 2D particle simulation sub-tab."""

    left_col, right_col = two_column_layout(3, 7)

    # ── Left column: controls ─────────────────────────────────────────────────
    with left_col:
        st.subheader("Simulation Controls")

        N = st.slider(
            "N particles",
            min_value=20,
            max_value=200,
            value=50,
            step=5,
            help="Total number of gas particles.",
        )

        T = st.slider(
            "Temperature T (K)",
            min_value=100,
            max_value=2000,
            value=300,
            step=10,
            help="Sets the mean kinetic energy via Maxwell-Boltzmann distribution.",
        )

        L = st.slider(
            "Box size L (a.u.)",
            min_value=1.0,
            max_value=5.0,
            value=2.0,
            step=0.1,
            help="Side length of the square simulation box.",
        )

        mass_label = st.selectbox(
            "Particle mass (species)",
            list(MASS_OPTIONS.keys()),
            index=0,
            help="Mass of gas molecules determines speed at a given temperature.",
        )
        m = MASS_OPTIONS[mass_label]

        # ── Real-world gas context card ───────────────────────────────────────
        _GAS_CONTEXT = {
            "Nitrogen": (
                "Makes up **78%** of Earth's atmosphere. The triple bond in N₂ makes it very "
                "unreactive — hence its use in food packaging and tyre inflation. "
                "v_rms at 25°C ≈ **515 m/s**."
            ),
            "Helium": (
                "The lightest noble gas. Used in balloons, MRI coolant, and as a breathing mix "
                "for deep-sea divers. So light it gradually escapes from Earth's upper atmosphere "
                "— helium is **not renewed**."
            ),
            "Argon": (
                "Third most abundant gas in Earth's atmosphere (**0.93%**). Used in welding "
                "(inert shield), double glazing insulation, and as a fire suppressant. "
                "v_rms at 25°C ≈ **431 m/s**."
            ),
        }
        for _gas_key, _gas_info in _GAS_CONTEXT.items():
            if _gas_key.lower() in mass_label.lower():
                st.info(f"**{_gas_key}:** {_gas_info}")
                break

        st.divider()

        # Advanced options needed early so we can pass two_species to reinit check
        two_species = False
        enable_boyle = False
        T_target = T

        if mode == "Advanced":
            advanced_divider()

            T_target = st.slider(
                "Target temperature T_target (K)",
                min_value=100,
                max_value=2000,
                value=int(T),
                step=10,
                key="T_target_slider",
                help="Rescale all velocities to reach this temperature (thermostat).",
            )

            heat_cool_btn = st.button(
                "🌡️ Heat / Cool",
                help="Multiply all velocities by √(T_target / T_current) to thermostat.",
            )

            st.divider()

            enable_boyle = st.checkbox(
                "Boyle's Law explorer",
                value=False,
                help="Plot P vs 1/L² at constant N and T (theoretical ideal gas).",
            )

            two_species = st.checkbox(
                "Enable two-species gas",
                value=False,
                help=(
                    "First N/2 particles: heavy (mass m). "
                    "Second N/2: light (mass m/4). "
                    "Demonstrates equipartition of energy."
                ),
            )
        else:
            heat_cool_btn = False

        st.divider()

        init_btn = st.button(
            "🔄 Initialise",
            type="primary",
            help="Reset all particles to random positions with Maxwell-Boltzmann speeds.",
        )

        col_step_btn, col_step_n = st.columns([1, 1])
        with col_step_n:
            n_steps_per_click = st.slider(
                "Frames per step",
                min_value=1,
                max_value=50,
                value=5,
                step=1,
                key="n_steps_slider",
                help="Number of DT steps advanced per button click.",
            )
        with col_step_btn:
            st.markdown("<div style='margin-top:1.6rem'></div>", unsafe_allow_html=True)
            step_btn = st.button(
                f"▶ Step {n_steps_per_click}",
                help=f"Advance simulation by {n_steps_per_click} frames.",
            )

        auto_run = st.checkbox(
            "Auto-run",
            value=False,
            key="auto_run",
            help="Continuously step the simulation. Uncheck to pause.",
        )

        # Show step counter
        current_step = st.session_state.get(_ss_key("step"), 0)
        st.caption(f"Step: {current_step}  |  Time: {current_step * DT:.3f} a.u.")

        if mode == "Basic":
            # Simulation key stats for quick reference
            v_rms_theory = rms_speed(m, T)
            v_mean_theory = mean_speed(m, T)
            st.info(
                f"**Theory (set T={T} K)**\n\n"
                f"v_rms = {v_rms_theory:.1f} m/s\n\n"
                f"v̄ = {v_mean_theory:.1f} m/s"
            )

    # ── Session state management ──────────────────────────────────────────────

    # Auto-reinit when parameters change
    if _needs_reinit(N, T, L, m, two_species) or init_btn:
        _initialise_particles(N, m, T, L, two_species)
        _save_params(N, T, L, m, two_species)
        # Clear accumulated pressure history on reinit
        st.session_state[_ss_key("pressure_history")] = []

    # Apply thermostat (Heat/Cool button)
    if heat_cool_btn and _ss_key("vel") in st.session_state:
        vel_curr = st.session_state[_ss_key("vel")]
        masses_curr = st.session_state[_ss_key("masses")]
        speeds_curr = np.linalg.norm(vel_curr, axis=1)
        ke_curr = np.mean(0.5 * masses_curr * speeds_curr**2)
        T_current = ke_curr / k_B
        if T_current > 0:
            scale = np.sqrt(T_target / T_current)
            st.session_state[_ss_key("vel")] = vel_curr * scale

    # Step the simulation
    pressure_this_step = 0.0
    if step_btn or auto_run:
        if _ss_key("pos") in st.session_state:
            pressure_this_step = _step_simulation(L, n_steps_per_click)
            # Maintain a rolling pressure history (last 50 measurements)
            hist = st.session_state.get(_ss_key("pressure_history"), [])
            hist.append(pressure_this_step)
            if len(hist) > 50:
                hist = hist[-50:]
            st.session_state[_ss_key("pressure_history")] = hist

    # ── Retrieve state for rendering ──────────────────────────────────────────

    pos = st.session_state.get(_ss_key("pos"))
    vel = st.session_state.get(_ss_key("vel"))
    masses_arr = st.session_state.get(_ss_key("masses"))
    pressure_history = st.session_state.get(_ss_key("pressure_history"), [])

    m_light_val = m / 4.0 if two_species else None

    # ── Right column: plots ───────────────────────────────────────────────────
    with right_col:

        # ── p5.js interactive animation ───────────────────────────────────────
        mass_amu_val = m / 1.66054e-27
        components.html(
            build_kinetic_animation(T, N, mass_amu_val),
            height=440,
        )
        st.caption(
            "▶ Play/pause · Drag piston to compress · Click container to add particle"
        )
        st.divider()

        if pos is None or vel is None or masses_arr is None:
            st.info("Press **Initialise** to start the simulation.")
        else:
            # ── Thermodynamics ────────────────────────────────────────────────
            thermo = _compute_thermodynamics(masses_arr, vel)
            speeds_all = thermo["speeds"]
            mean_KE = thermo["mean_KE"]
            T_measured = thermo["T_measured"]

            # Pressure: use rolling average for stability
            P_measured = float(np.mean(pressure_history)) if pressure_history else 0.0
            P_ideal = N * k_B * T / L**2  # ideal gas law in 2D: P = NkT/A = NkT/L²

            # ── Metric row ────────────────────────────────────────────────────
            metric_row(
                {
                    "Mean KE": f"{mean_KE:.3e} J",
                    "T (measured)": f"{T_measured:.0f} K",
                    "P (measured)": f"{P_measured:.4f} Pa·a.u.",
                }
            )

            # ── Main plots: particles | speed histogram ───────────────────────
            plot_left, plot_right = st.columns(2)

            with plot_left:
                fig_particles = _build_particle_plot(
                    pos=pos,
                    vel=vel,
                    masses=masses_arr,
                    L=L,
                    m=m,
                    T=T,
                    two_species=two_species,
                )
                st.plotly_chart(fig_particles, use_container_width=True)

            with plot_right:
                fig_hist = _build_speed_histogram(
                    speeds=speeds_all,
                    m=m,
                    T=T,
                    T_measured=T_measured,
                    two_species=two_species,
                    speeds_heavy=thermo["speeds_heavy"] if two_species else None,
                    speeds_light=thermo["speeds_light"] if two_species else None,
                    m_light=m_light_val,
                )
                st.plotly_chart(fig_hist, use_container_width=True)
                if not two_species:
                    st.caption(
                        "Speed ratios at any temperature: "
                        "v_mp : v_mean : v_rms = 1 : 1.128 : 1.225  "
                        "(ratio √2 : √(8/π) : √3)"
                    )

            # ── Ideal gas law info ────────────────────────────────────────────
            st.info(
                f"**Ideal gas law predicts:** P·A = N·k_B·T  "
                f"→  P = N·k_B·T / L² = **{P_ideal:.4f} Pa·a.u.**  "
                f"(measured: {P_measured:.4f} Pa·a.u.)"
            )

            # ── Atmosphere escape velocity context (Basic mode) ───────────────
            if mode == "Basic":
                V_ESCAPE = 11_200.0  # m/s — Earth escape velocity
                st.info(
                    "🌍 **Atmospheric escape:** For a molecule to escape Earth's gravity, it needs "
                    "speed > v_escape = 11,200 m/s. The Maxwell-Boltzmann distribution has a "
                    "high-speed tail — even at 300K, a tiny fraction of H₂ molecules "
                    "(m=3.34×10⁻²⁷ kg) have speeds near escape velocity. Over billions of years, "
                    "Earth has lost most of its primordial hydrogen this way. Heavier molecules "
                    "(N₂, O₂) have lower mean speeds and are retained. Mars, with lower gravity "
                    "(escape velocity 5,027 m/s), has lost much more atmosphere."
                )
                # Fraction of current species with speed above Earth escape velocity
                # MB CDF via numerical integration of the PDF
                _v_esc_arr = np.linspace(V_ESCAPE, V_ESCAPE * 5, 2000)
                _pdf_arr   = maxwell_boltzmann_pdf(_v_esc_arr, m, max(T, 10.0))
                # np.trapezoid (NumPy 2.0+) with fallback to np.trapz (NumPy 1.x)
                _trap = getattr(np, "trapezoid", getattr(np, "trapz", None))
                _frac_escape = float(_trap(_pdf_arr, _v_esc_arr))
                # Extract clean species name for display
                _species_name = mass_label.split("(")[0].strip()
                st.caption(
                    f"Fraction of {_species_name} molecules above escape velocity "
                    f"({V_ESCAPE:.0f} m/s) at {T} K: **{_frac_escape:.2e}**"
                )

            # ── Two-species equipartition metrics ─────────────────────────────
            if two_species and len(thermo["speeds_heavy"]) > 0 and len(thermo["speeds_light"]) > 0:
                st.divider()
                _adv_colour = COLOURS["advanced"]
                st.markdown(
                    f"<p style='color:{_adv_colour};font-weight:600'>"
                    "⚗️ Equipartition check (two-species)</p>",
                    unsafe_allow_html=True,
                )
                metric_row(
                    {
                        "⟨KE⟩ heavy": f"{thermo['mean_KE_heavy']:.3e} J",
                        "⟨KE⟩ light": f"{thermo['mean_KE_light']:.3e} J",
                        "Ratio KE_light/KE_heavy": (
                            f"{thermo['mean_KE_light']/thermo['mean_KE_heavy']:.3f}"
                            if thermo["mean_KE_heavy"] > 0 else "N/A"
                        ),
                        "k_B·T (ref)": f"{k_B * T:.3e} J",
                    }
                )
                st.caption(
                    "Equipartition theorem predicts ⟨KE⟩_heavy = ⟨KE⟩_light = k_B·T "
                    "(2 DOF, 2D gas). Ratio → 1 at equilibrium."
                )

            # ── Advanced: Boyle's Law plot ────────────────────────────────────
            if mode == "Advanced" and enable_boyle:
                st.divider()
                _adv_colour2 = COLOURS["advanced"]
                st.markdown(
                    f"<p style='color:{_adv_colour2};font-weight:600'>"
                    "⚗️ Boyle's Law Explorer</p>",
                    unsafe_allow_html=True,
                )
                fig_boyle = _build_boyle_plot(N, m, T)
                st.plotly_chart(fig_boyle, use_container_width=True)
                st.caption(
                    "Theoretical ideal gas: P = NkT / L². At constant N and T, "
                    "P is proportional to 1/L² — a linear relationship with zero intercept."
                )

            # ── Physics notes ─────────────────────────────────────────────────
            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

    # ── Auto-run: trigger rerun after a short render delay ───────────────────
    # We use a step counter in session_state so the rerun only fires when auto_run
    # is active and the simulation has been displayed at least once.
    if auto_run and pos is not None:
        import time as _time
        _time.sleep(0.05)   # small yield to allow Streamlit to render the frame
        st.rerun()


def render_ideal_gas_law(mode: str) -> None:
    """
    Render the Ideal Gas Law & PV sub-tab.

    Connects the macroscopic ideal gas law (PV = nRT) to the microscopic
    kinetic theory derivation (P = (1/3) * N/V * m * <v²>).
    """

    _PV_SPEC_REF = "Component 1, Topic 4 (Thermal Physics), sections on ideal gas"
    _PV_EQUATIONS = [
        r"PV = nRT = Nk_BT",
        r"P = \frac{1}{3}\frac{N}{V}m\langle v^2 \rangle",
        r"\frac{1}{2}m\langle v^2 \rangle = \frac{3}{2}k_BT",
    ]

    left_col, right_col = two_column_layout(3, 7)

    # ── Left column: controls ─────────────────────────────────────────────────
    with left_col:
        st.subheader("Gas Law Controls")

        T_pv = st.slider(
            "Temperature T (K)",
            min_value=100,
            max_value=2000,
            value=300,
            step=10,
            key="pv_T",
            help="Gas temperature in kelvin.",
        )

        n_pv = st.slider(
            "Amount n (mol)",
            min_value=0.01,
            max_value=2.0,
            value=0.1,
            step=0.01,
            key="pv_n",
            help="Number of moles of gas.",
        )

        V_pv = st.slider(
            "Volume V (m³)",
            min_value=0.001,
            max_value=0.1,
            value=0.01,
            step=0.001,
            key="pv_V",
            format="%.3f",
            help="Container volume in cubic metres.",
        )

        gas_label_pv = st.selectbox(
            "Gas species",
            list(PV_GAS_OPTIONS.keys()),
            index=0,
            key="pv_species",
            help="Molecular mass determines v_rms and mean free path.",
        )
        m_pv = PV_GAS_OPTIONS[gas_label_pv]

        st.divider()

        # ── Derived quantities ────────────────────────────────────────────────
        P_from_law    = n_pv * R_gas * T_pv / V_pv           # Pa
        N_molecules   = n_pv * N_A                             # dimensionless
        v_rms_pv      = rms_speed(m_pv, T_pv)                 # m/s
        mean_KE_pv    = 1.5 * k_B * T_pv                      # J per molecule
        P_from_kinetic = (1.0 / 3.0) * (N_molecules / V_pv) * m_pv * v_rms_pv**2  # Pa

        st.metric("P (gas law, Pa)", f"{P_from_law:.3e}")
        st.metric("P (kinetic theory, Pa)", f"{P_from_kinetic:.3e}")
        st.metric("T (K)", f"{T_pv:.0f}")
        st.metric("V (m³)", f"{V_pv:.4f}")
        st.metric("n (mol)", f"{n_pv:.3f}")
        st.metric("N (molecules)", f"{N_molecules:.3e}")
        st.metric("Mean KE per molecule (J)", f"{mean_KE_pv:.3e}")
        st.metric("v_rms (m/s)", f"{v_rms_pv:.1f}")

        if mode == "Advanced":
            advanced_divider()
            P_for_mfp = max(P_from_law, 1e-30)
            mfp_m = k_B * T_pv / (np.sqrt(2) * np.pi * _D_MOLECULE**2 * P_for_mfp)
            if mfp_m >= 1e-6:
                mfp_display = f"{mfp_m * 1e6:.3f} μm"
            else:
                mfp_display = f"{mfp_m * 1e9:.3f} nm"
            st.metric("Mean free path λ", mfp_display)

    # ── Right column: plots ───────────────────────────────────────────────────
    with right_col:

        # ── Figure 1: PV diagram ──────────────────────────────────────────────
        fig_pv = _build_pv_diagram(n_pv, T_pv, V_pv)
        st.plotly_chart(fig_pv, use_container_width=True)
        st.caption(
            "Each curve is a Boyle's Law hyperbola: PV = nRT = constant at fixed T. "
            "Moving along a curve keeps T constant (isothermal). The red dot marks your "
            "current state (V, P). Changing T moves you between isotherms."
        )

        st.divider()

        # ── Figure 2: P and mean KE vs T (dual axis) ─────────────────────────
        fig_pt = _build_pt_ke_plot(n_pv, V_pv, T_pv, mode, m_pv)
        st.plotly_chart(fig_pt, use_container_width=True)
        st.caption(
            "Both P and mean KE are proportional to T — the connection between "
            "temperature and molecular motion. "
            + (
                "The dotted purple curve (Advanced) shows mean free path λ: "
                "how far a molecule travels between collisions. λ increases with T "
                "because higher pressure at fixed V means more collisions."
                if mode == "Advanced" else ""
            )
        )

        # ── Info banner ───────────────────────────────────────────────────────
        st.info(
            "Kinetic theory bridges the microscopic (individual molecules moving at v_rms) "
            "and macroscopic (pressure P on the container walls). The pressure you measure "
            "with a gauge is the average force from ~10²³ molecular collisions per second."
        )

        # ── Physics notes ─────────────────────────────────────────────────────
        _PV_EXPLANATION = (
            "The ideal gas law PV = nRT connects measurable macroscopic quantities "
            "(pressure, volume, temperature) to the amount of gas (moles). "
            "Kinetic theory derives the same result from first principles: "
            "P = (1/3)(N/V)m⟨v²⟩. Since ⟨v²⟩ = 3k_BT/m, this gives P = Nk_BT/V = nRT/V. "
            "The mean kinetic energy per molecule ½m⟨v²⟩ = (3/2)k_BT shows that "
            "temperature is a direct measure of the average translational kinetic energy."
        )
        _PV_ADVANCED = (
            "**Mean free path λ = k_BT / (√2 π d² P):** The average distance a molecule "
            "travels between collisions. At STP, λ ≈ 68 nm for N₂ — roughly 200 molecular "
            "diameters. λ grows with T (faster molecules) and shrinks with P "
            "(more molecules per unit volume).\n\n"
            "**Microscopic validation:** P from the ideal gas law and P = (1/3)(N/V)m v_rms² "
            "give identical results — confirming that temperature is *defined* by the "
            "equipartition relation ½m⟨v²⟩ = (3/2)k_BT."
        )
        physics_notes(
            spec_ref=_PV_SPEC_REF,
            equations=_PV_EQUATIONS,
            explanation=_PV_EXPLANATION,
            advanced_text=_PV_ADVANCED,
            mode=mode,
        )

        # ── WJEC exam practice questions ──────────────────────────────────────
        _gas_name_q  = gas_label_pv.split("(")[0].strip()
        _M_gmol_q    = m_pv * N_A * 1e3            # g/mol
        _m_mol_q     = m_pv                        # kg per molecule
        _v_rms_q     = rms_speed(m_pv, T_pv)       # m/s
        _mean_KE_q   = 1.5 * k_B * T_pv            # J
        _exam_questions = [
            {
                "q": (
                    f"Calculate the root-mean-square speed of {_gas_name_q} molecules "
                    f"at T = {T_pv:.0f} K. (Molar mass = {_M_gmol_q:.1f} g/mol)"
                ),
                "marks": 3,
                "answer": f"v_rms = {_v_rms_q:.0f} m/s",
                "working": [
                    f"m = {_M_gmol_q:.1f}×10⁻³ / {N_A:.2e} = {_m_mol_q:.3e} kg",
                    f"v_rms = √(3kT/m) = √(3 × 1.381×10⁻²³ × {T_pv:.0f} / "
                    f"{_m_mol_q:.3e}) = {_v_rms_q:.0f} m/s",
                ],
                "hint": "Use v_rms = √(3k_B T / m) where m is mass per molecule.",
            },
            {
                "q": (
                    f"Calculate the mean kinetic energy of one molecule at "
                    f"T = {T_pv:.0f} K."
                ),
                "marks": 2,
                "answer": f"KE = {_mean_KE_q:.3e} J",
                "working": [
                    f"KE = (3/2) k_B T = 1.5 × 1.381×10⁻²³ × {T_pv:.0f} "
                    f"= {_mean_KE_q:.3e} J",
                ],
            },
            {
                "q": (
                    "How does the rms speed change if the temperature is doubled? "
                    "Justify your answer."
                ),
                "marks": 2,
                "answer": "v_rms increases by a factor of √2 ≈ 1.41",
                "working": [
                    "v_rms ∝ √T",
                    "v_new / v_old = √(2T / T) = √2 ≈ 1.41",
                ],
            },
        ]
        show_exam_panel(_exam_questions)


# ── Streamlit page ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Kinetic Theory — WJEC A Level Physics",
    page_icon="⚗️",
    layout="wide",
    initial_sidebar_state="expanded",
)

sim_header("Kinetic Theory of Gases", SPEC_REF)

mode = mode_toggle()

tab_particle, tab_pv = st.tabs(["⚛️ Particle Simulation", "📊 Ideal Gas Law & PV"])

with tab_particle:
    render_particle_sim(mode)

with tab_pv:
    render_ideal_gas_law(mode)
