"""
Photoelectric Effect — WJEC Eduqas A Level Physics.

Simulates the photoelectric effect, stopping voltage I-V characteristics,
and hydrogen energy level transitions, illustrating Einstein's photon
hypothesis and wave-particle duality.

Spec reference: Component 2, Topic 6 (Photons and Wave-Particle Duality)
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import h_planck, c_light, e_charge
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
    page_title="Photoelectric Effect — WJEC Physics",
    page_icon="⚡",
    layout="wide",
)

# ── Constants / catalogue ─────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 6 (Photons and Wave-Particle Duality)"

METALS = {
    "Caesium (Cs)": {
        "phi_eV": 2.1,
        "colour": "#d4af37",
        "note": "Most sensitive — used in photomultiplier tubes and night-vision cameras",
    },
    "Sodium (Na)": {
        "phi_eV": 2.36,
        "colour": "#ffa500",
        "note": "Reacts violently with water — photoelectric threshold in visible light",
    },
    "Potassium (K)": {
        "phi_eV": 2.30,
        "colour": "#cc8800",
        "note": "Used in early photoelectric experiments by Hertz and Lenard",
    },
    "Zinc (Zn)": {
        "phi_eV": 4.3,
        "colour": "#aaaaaa",
        "note": "Threshold in UV — demonstrates why visible light cannot eject electrons from zinc",
    },
    "Copper (Cu)": {
        "phi_eV": 4.7,
        "colour": "#b87333",
        "note": "Threshold deep in UV — used in photodiodes",
    },
    "Platinum (Pt)": {
        "phi_eV": 5.65,
        "colour": "#e5e4e2",
        "note": "Highest work function of common metals — only very energetic UV photons work",
    },
}

# Hydrogen energy levels (eV), n=1..6
HYDROGEN_LEVELS = {n: -13.6 / n**2 for n in range(1, 7)}

# Series names for hydrogen transitions
SERIES = {
    1: "Lyman (UV)",
    2: "Balmer (visible/UV)",
    3: "Paschen (IR)",
}


# ── Physics helpers ───────────────────────────────────────────────────────────


def wavelength_to_rgb(wl: float) -> str:
    """
    Convert a wavelength in nm to an rgb() colour string.

    UV (<380 nm) and IR (>700 nm) are shown as purple.

    Parameters
    ----------
    wl : wavelength in nanometres

    Returns
    -------
    CSS rgb() string
    """
    if wl < 380 or wl > 700:
        return "rgb(128,0,128)"   # UV/IR: purple
    if wl < 440:
        r, g, b = (440 - wl) / 60, 0, 1
    elif wl < 490:
        r, g, b = 0, (wl - 440) / 50, 1
    elif wl < 510:
        r, g, b = 0, 1, (510 - wl) / 20
    elif wl < 580:
        r, g, b = (wl - 510) / 70, 1, 0
    elif wl < 645:
        r, g, b = 1, (645 - wl) / 65, 0
    else:
        r, g, b = 1, 0, 0
    r = min(1, max(0, r))
    g = min(1, max(0, g))
    b = min(1, max(0, b))
    return f"rgb({int(r*255)},{int(g*255)},{int(b*255)})"


@st.cache_data
def compute_photon_energy(wavelength_nm: float) -> tuple[float, float]:
    """
    Compute photon energy from wavelength.

    Parameters
    ----------
    wavelength_nm : wavelength in nm

    Returns
    -------
    (E_joules, E_eV) : photon energy in Joules and electron-volts
    """
    lam = wavelength_nm * 1e-9
    E_J = h_planck * c_light / lam
    E_eV = E_J / e_charge
    return E_J, E_eV


@st.cache_data
def compute_threshold_wavelength(phi_eV: float) -> float:
    """
    Compute threshold wavelength λ₀ = hc / φ.

    Parameters
    ----------
    phi_eV : work function in eV

    Returns
    -------
    threshold wavelength in nm
    """
    phi_J = phi_eV * e_charge
    lam0_m = h_planck * c_light / phi_J
    return lam0_m * 1e9


@st.cache_data
def compute_iv_curve(
    freq_Hz: float,
    phi_eV: float,
    intensity_scale: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float, float]:
    """
    Compute I-V characteristic curves for the stopping voltage simulation.

    Three curves are returned: 0.5×, 1×, and 2× the base intensity scale.

    Parameters
    ----------
    freq_Hz       : photon frequency (Hz)
    phi_eV        : work function (eV)
    intensity_scale: base intensity multiplier

    Returns
    -------
    V_arr        : voltage array (V)
    I_half       : current at 0.5× intensity (A, arbitrary units)
    I_base       : current at 1× intensity (A, arbitrary units)
    I_double     : current at 2× intensity (A, arbitrary units)
    V_stop       : stopping voltage (V)
    f0           : threshold frequency (Hz)
    """
    phi_J = phi_eV * e_charge
    f0 = phi_J / h_planck
    ke_max_J = h_planck * (freq_Hz - f0)

    if ke_max_J <= 0:
        V_stop = 0.0
    else:
        V_stop = ke_max_J / e_charge   # eV_s = hf - phi → V_s = (hf - phi)/e

    # Voltage array from -V_stop-0.5 to +2 V
    v_min = -(V_stop + 0.5)
    v_max = 2.0
    V_arr = np.linspace(v_min, v_max, 400)

    def _sigmoid_current(V: np.ndarray, I_sat: float, vs: float) -> np.ndarray:
        """Logistic-like photoelectric I-V curve."""
        I = np.zeros_like(V)
        if vs <= 0:
            return I
        # Smooth sigmoid around -V_stop
        transition = 1.0 / (1.0 + np.exp(-(V + vs) / 0.08))
        I = I_sat * transition
        # Zero for V below -V_stop (cutoff)
        I = np.where(V < -(vs + 0.5), 0.0, I)
        return I

    I_sat_base = 1.0 * intensity_scale
    I_half   = _sigmoid_current(V_arr, 0.5 * I_sat_base, V_stop)
    I_base   = _sigmoid_current(V_arr, 1.0 * I_sat_base, V_stop)
    I_double = _sigmoid_current(V_arr, 2.0 * I_sat_base, V_stop)

    return V_arr, I_half, I_base, I_double, V_stop, f0


@st.cache_data
def compute_hydrogen_transition(n_i: int, n_f: int) -> tuple[float, float, float]:
    """
    Compute photon wavelength and energy for a hydrogen transition.

    Parameters
    ----------
    n_i : initial principal quantum number
    n_f : final principal quantum number

    Returns
    -------
    (delta_E_eV, lambda_nm, lambda_nm_exact)
        delta_E_eV  : |ΔE| in eV
        lambda_nm   : wavelength in nm
    """
    E_i = HYDROGEN_LEVELS[n_i]
    E_f = HYDROGEN_LEVELS[n_f]
    delta_E_eV = abs(E_i - E_f)
    delta_E_J = delta_E_eV * e_charge
    lam_m = h_planck * c_light / delta_E_J
    lam_nm = lam_m * 1e9
    return delta_E_eV, lam_nm


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_photoelectric_diagram(
    wavelength_nm: float,
    intensity: float,
    phi_eV: float,
    metal_colour: str,
    emitting: bool,
    ke_eV: float,
) -> go.Figure:
    """
    Build a static dot diagram of the photoelectric effect.

    Photons arrive from the left as blue dots; emitted electrons fly right-upward
    as orange dots (only if emitting). The metal surface is drawn as a coloured
    rectangle.

    Parameters
    ----------
    wavelength_nm : photon wavelength (nm) — used for colour
    intensity     : relative intensity (controls number of photons and electrons)
    phi_eV        : work function (eV)
    metal_colour  : hex colour of the metal rectangle
    emitting      : True if electrons are being emitted
    ke_eV         : kinetic energy of emitted electrons (eV)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    # ── Metal surface rectangle ───────────────────────────────────────────────
    fig.add_shape(
        type="rect",
        x0=0.45, x1=0.65,
        y0=0.1, y1=0.9,
        fillcolor=metal_colour,
        opacity=0.85,
        line=dict(color=COLOURS["text"], width=1.5),
        layer="below",
    )
    fig.add_annotation(
        x=0.55, y=0.5,
        text="<b>Metal<br>surface</b>",
        showarrow=False,
        font=dict(color=COLOURS["background"], size=11),
        bgcolor="rgba(0,0,0,0.0)",
    )

    # ── Photon dots (incoming from left) ─────────────────────────────────────
    n_photons = max(3, int(intensity * 4))
    light_colour = wavelength_to_rgb(wavelength_nm)

    np.random.seed(42)   # deterministic scatter
    photon_y = np.linspace(0.15, 0.85, n_photons)
    photon_x = np.random.uniform(0.05, 0.40, n_photons)

    fig.add_trace(
        go.Scatter(
            x=photon_x,
            y=photon_y,
            mode="markers",
            name=f"Photon ({wavelength_nm:.0f} nm)",
            marker=dict(
                color=light_colour,
                size=12,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
            hovertemplate="Photon<extra></extra>",
        )
    )

    # Arrow annotations representing photon direction
    for px, py in zip(photon_x, photon_y):
        fig.add_annotation(
            x=0.43, y=py,
            ax=px + 0.05, ay=py,
            xref="x", yref="y",
            axref="x", ayref="y",
            arrowhead=2,
            arrowsize=1.0,
            arrowwidth=1.5,
            arrowcolor=light_colour,
            showarrow=True,
            text="",
        )

    # ── Electron dots (emitted) or blocked (not emitted) ──────────────────────
    n_electrons = max(3, int(intensity * 4))

    if emitting:
        electron_x_start = np.random.uniform(0.66, 0.70, n_electrons)
        electron_y_start = np.linspace(0.15, 0.85, n_electrons)
        # Electrons fan out to the right and slightly upward
        spread_x = np.linspace(0.75, 0.95, n_electrons)
        spread_y = np.linspace(0.25, 0.95, n_electrons)

        fig.add_trace(
            go.Scatter(
                x=spread_x,
                y=spread_y,
                mode="markers",
                name=f"Electron (KE = {ke_eV:.2f} eV)",
                marker=dict(
                    color=COLOURS["secondary"],
                    size=10,
                    symbol="circle",
                    line=dict(color=COLOURS["text"], width=1),
                ),
                hovertemplate="Emitted electron<extra></extra>",
            )
        )
        # Emission arrows
        for ex0, ey0, ex1, ey1 in zip(
            electron_x_start, electron_y_start, spread_x, spread_y
        ):
            fig.add_annotation(
                x=ex1, y=ey1,
                ax=ex0, ay=ey0,
                xref="x", yref="y",
                axref="x", ayref="y",
                arrowhead=2,
                arrowsize=0.9,
                arrowwidth=1.5,
                arrowcolor=COLOURS["secondary"],
                showarrow=True,
                text="",
            )
        status_text = f"✓ Electrons emitted  KE = {ke_eV:.3f} eV"
        status_colour = COLOURS["tertiary"]
    else:
        # Show blocked electrons (staying in metal)
        blocked_x = np.random.uniform(0.47, 0.63, n_electrons)
        blocked_y = np.linspace(0.15, 0.85, n_electrons)

        fig.add_trace(
            go.Scatter(
                x=blocked_x,
                y=blocked_y,
                mode="markers",
                name="Electron (bound — no emission)",
                marker=dict(
                    color=COLOURS["highlight"],
                    size=10,
                    symbol="x",
                    line=dict(color=COLOURS["highlight"], width=2),
                ),
                hovertemplate="Bound electron<extra></extra>",
            )
        )
        status_text = "✗ No emission — photon energy < work function"
        status_colour = COLOURS["highlight"]

    # ── Labels ────────────────────────────────────────────────────────────────
    fig.add_annotation(
        x=0.22, y=0.97,
        text=f"<b>Photons (λ = {wavelength_nm:.0f} nm)</b>",
        showarrow=False,
        font=dict(color=light_colour, size=12),
        xanchor="center",
    )
    if emitting:
        fig.add_annotation(
            x=0.83, y=0.97,
            text="<b>Emitted electrons</b>",
            showarrow=False,
            font=dict(color=COLOURS["secondary"], size=12),
            xanchor="center",
        )

    fig.add_annotation(
        x=0.55, y=0.02,
        text=f"<b>{status_text}</b>",
        showarrow=False,
        font=dict(color=status_colour, size=11),
        xanchor="center",
    )

    grid_style = dict(
        gridcolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        showgrid=False,
        zeroline=False,
        showticklabels=False,
    )
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Photoelectric Effect — Particle Diagram", font=dict(size=14)),
            xaxis=dict(range=[0, 1], **grid_style),
            yaxis=dict(range=[0, 1], **grid_style),
            showlegend=True,
            margin=dict(l=20, r=20, t=50, b=30),
        )
    )
    return fig


def build_iv_curve(
    V_arr: np.ndarray,
    I_half: np.ndarray,
    I_base: np.ndarray,
    I_double: np.ndarray,
    V_stop: float,
    freq_Hz: float,
    intensity_scale: float,
) -> go.Figure:
    """
    Build the photoelectric I-V characteristic plot.

    Shows three curves at 0.5×, 1×, and 2× intensity with the same stopping
    voltage — demonstrating that V_s is intensity-independent.

    Parameters
    ----------
    V_arr          : voltage array (V)
    I_half, I_base, I_double : current arrays at three intensities
    V_stop         : stopping voltage (V)
    freq_Hz        : photon frequency (Hz)
    intensity_scale: base intensity multiplier

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    intensity_labels = [
        ("0.5× intensity", I_half,   COLOURS["quaternary"]),
        ("1× intensity",   I_base,   COLOURS["primary"]),
        ("2× intensity",   I_double, COLOURS["secondary"]),
    ]

    for label, I_arr, colour in intensity_labels:
        fig.add_trace(
            go.Scatter(
                x=V_arr,
                y=I_arr,
                mode="lines",
                name=label,
                line=dict(color=colour, width=2.5),
            )
        )

    # Stopping voltage vertical line
    if V_stop > 0:
        fig.add_vline(
            x=-V_stop,
            line_dash="dash",
            line_color=COLOURS["highlight"],
            line_width=2,
        )
        fig.add_annotation(
            x=-V_stop,
            y=max(I_double) * 0.7 if max(I_double) > 0 else 0.5,
            text=f"<b>–V_s = −{V_stop:.3f} V</b>",
            showarrow=True,
            arrowhead=2,
            arrowcolor=COLOURS["highlight"],
            font=dict(color=COLOURS["highlight"], size=11),
            bgcolor="rgba(0,0,0,0.6)",
            bordercolor=COLOURS["highlight"],
            borderwidth=1,
            ax=40, ay=-30,
        )

    # Zero voltage marker
    fig.add_vline(
        x=0,
        line_dash="dot",
        line_color=COLOURS["grid"],
        line_width=1,
        opacity=0.6,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(text="Photoelectric I–V Characteristic", font=dict(size=14)),
            xaxis=dict(title="Voltage V (V)", **grid_style),
            yaxis=dict(title="Photocurrent I (arb. units)", **grid_style),
            showlegend=True,
        )
    )
    return fig


def build_energy_level_diagram(
    n_i: int,
    n_f: int,
    delta_E_eV: float,
    lam_nm: float,
    photon_colour: str,
) -> go.Figure:
    """
    Build a hydrogen energy level diagram with a transition arrow.

    Parameters
    ----------
    n_i          : initial quantum number
    n_f          : final quantum number
    delta_E_eV   : transition energy (eV)
    lam_nm       : photon wavelength (nm)
    photon_colour: rgb() colour string for the transition arrow

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    is_emission = n_f < n_i

    # ── Energy levels ─────────────────────────────────────────────────────────
    x_line_start = 0.1
    x_line_end   = 0.9
    level_colours = {
        1: COLOURS["highlight"],
        2: COLOURS["secondary"],
        3: COLOURS["tertiary"],
        4: COLOURS["primary"],
        5: COLOURS["advanced"],
        6: COLOURS["quaternary"],
    }

    for n, E in HYDROGEN_LEVELS.items():
        colour = level_colours[n]
        # Level line
        fig.add_shape(
            type="line",
            x0=x_line_start, x1=x_line_end,
            y0=E, y1=E,
            line=dict(color=colour, width=2),
        )
        # Label
        fig.add_annotation(
            x=x_line_end + 0.02,
            y=E,
            text=f"<b>n={n}</b>  {E:.2f} eV",
            showarrow=False,
            font=dict(color=colour, size=11),
            xanchor="left",
            yanchor="middle",
        )

    # ── Transition arrow ──────────────────────────────────────────────────────
    E_start = HYDROGEN_LEVELS[n_i]
    E_end   = HYDROGEN_LEVELS[n_f]

    arrow_x = 0.5
    fig.add_annotation(
        x=arrow_x,
        y=E_end,
        ax=arrow_x,
        ay=E_start,
        xref="x", yref="y",
        axref="x", ayref="y",
        arrowhead=3,
        arrowsize=1.4,
        arrowwidth=3,
        arrowcolor=photon_colour,
        showarrow=True,
        text="",
    )

    # Label the transition with energy and wavelength
    mid_E = (E_start + E_end) / 2.0
    transition_type = "Emission" if is_emission else "Absorption"
    fig.add_annotation(
        x=arrow_x + 0.08,
        y=mid_E,
        text=(
            f"<b>{transition_type}</b><br>"
            f"ΔE = {delta_E_eV:.3f} eV<br>"
            f"λ = {lam_nm:.1f} nm"
        ),
        showarrow=False,
        font=dict(color=photon_colour, size=12),
        bgcolor="rgba(0,0,0,0.6)",
        bordercolor=photon_colour,
        borderwidth=1,
        xanchor="left",
        yanchor="middle",
    )

    # Highlight the initial and final levels
    for n_label, xpos in [(n_i, 0.3), (n_f, 0.7)]:
        E_lv = HYDROGEN_LEVELS[n_label]
        fig.add_trace(
            go.Scatter(
                x=[xpos],
                y=[E_lv],
                mode="markers",
                marker=dict(
                    color=photon_colour,
                    size=10,
                    symbol="diamond",
                ),
                showlegend=False,
                hovertemplate=f"n={n_label}: {E_lv:.3f} eV<extra></extra>",
            )
        )

    # ── Ionisation level ─────────────────────────────────────────────────────
    fig.add_shape(
        type="line",
        x0=x_line_start, x1=x_line_end,
        y0=0, y1=0,
        line=dict(color=COLOURS["text"], width=1, dash="dash"),
    )
    fig.add_annotation(
        x=x_line_end + 0.02,
        y=0,
        text="<b>n=∞  0.00 eV</b> (ionisation)",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=10),
        xanchor="left",
        yanchor="middle",
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=500,
            title=dict(
                text=f"Hydrogen Energy Levels — n={n_i} → n={n_f} ({transition_type})",
                font=dict(size=14),
            ),
            xaxis=dict(
                range=[0, 1.55],
                showgrid=False,
                zeroline=False,
                showticklabels=False,
                **grid_style,
            ),
            yaxis=dict(
                title="Energy (eV)",
                range=[-14.5, 0.8],
                **grid_style,
            ),
            showlegend=False,
            margin=dict(l=60, r=200, t=60, b=60),
        )
    )
    return fig


def build_photon_energy_bar(
    e_photon_eV: float,
    phi_eV: float,
    ke_eV: float,
    emitting: bool,
) -> go.Figure:
    """
    Build a stacked bar chart showing photon energy budget.

    Splits the photon energy into work function (φ) and kinetic energy (KE).

    Parameters
    ----------
    e_photon_eV : photon energy (eV)
    phi_eV      : work function (eV)
    ke_eV       : maximum kinetic energy (eV), may be 0 or negative
    emitting    : whether emission occurs

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    # Work function portion (always present)
    work_portion = min(phi_eV, e_photon_eV)
    fig.add_trace(
        go.Bar(
            x=["Photon energy"],
            y=[work_portion],
            name=f"Work function φ = {phi_eV:.2f} eV",
            marker_color=COLOURS["highlight"],
            text=[f"φ = {phi_eV:.2f} eV"],
            textposition="inside",
        )
    )

    # KE portion (only if emitting)
    if emitting and ke_eV > 0:
        fig.add_trace(
            go.Bar(
                x=["Photon energy"],
                y=[ke_eV],
                name=f"KE_max = {ke_eV:.3f} eV",
                marker_color=COLOURS["tertiary"],
                text=[f"KE = {ke_eV:.3f} eV"],
                textposition="inside",
            )
        )
    else:
        # Deficit — photon energy not enough
        deficit = phi_eV - e_photon_eV
        if deficit > 0:
            fig.add_trace(
                go.Bar(
                    x=["Photon energy"],
                    y=[-deficit],
                    name=f"Deficit = {deficit:.3f} eV (not enough energy)",
                    marker_color=COLOURS["advanced"],
                    base=e_photon_eV,
                    text=[f"Need {deficit:.3f} eV more"],
                    textposition="inside",
                )
            )

    # Reference line at photon energy
    fig.add_hline(
        y=e_photon_eV,
        line_dash="dash",
        line_color=COLOURS["primary"],
        line_width=2,
        annotation_text=f"E_photon = {e_photon_eV:.3f} eV",
        annotation_position="right",
        annotation_font=dict(color=COLOURS["primary"], size=11),
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=340,
            title=dict(text="Photon Energy Budget: E = φ + KE_max", font=dict(size=14)),
            barmode="stack",
            xaxis=dict(title="", **grid_style),
            yaxis=dict(title="Energy (eV)", **grid_style),
            showlegend=True,
        )
    )
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_photoelectric_animation(
    freq_hz: float,
    work_function_ev: float,
    intensity: float,
) -> str:
    """
    Build an interactive p5.js photon-metal animation for the photoelectric effect.

    Parameters
    ----------
    freq_hz         : photon frequency in Hz
    work_function_ev: metal work function in eV
    intensity       : relative light intensity (controls photon rate)

    Returns
    -------
    HTML string containing the self-contained p5.js animation
    """
    h = 6.626e-34
    e = 1.602e-19
    hf_ev = float(freq_hz) * h / e
    threshold_hz = float(work_function_ev) * e / h
    above_threshold = hf_ev > float(work_function_ev)
    ke_ev = max(0.0, hf_ev - float(work_function_ev))
    data = json.dumps({
        "freq": float(freq_hz),
        "phi": float(work_function_ev),
        "hf_ev": hf_ev,
        "threshold_hz": threshold_hz,
        "above": above_threshold,
        "ke_ev": ke_ev,
        "intensity": float(intensity),
    })

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{ margin:0; background:#0e1117; overflow:hidden; font-family:sans-serif; }}
  canvas {{ display:block; }}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<script>
const SIM = {data};

new p5(function(p) {{
  // ── constants ──────────────────────────────────────────────────────────────
  const W = 680, H = 430;
  const METAL_Y = H * 0.62;   // top of metal band
  const METAL_H = 60;         // metal band thickness
  const LAMP_X = 60, LAMP_Y = 40;

  // ── state ──────────────────────────────────────────────────────────────────
  let photons = [];
  let electrons = [];
  let flashMessages = [];
  let playing = true;
  let speed = 1.0;
  let thresholdGlow = 0;      // 0-255 alpha for golden glow
  let frameCount = 0;
  let spawnTimer = 0;

  // Determine photon colour from frequency
  function photonColour() {{
    const f = SIM.freq;
    if (f < 4e14)       return p.color(255, 60,  60);   // red
    if (f < 5e14)       return p.color(255, 165,  0);   // orange
    if (f < 6e14)       return p.color(255, 230,  0);   // yellow
    if (f < 7e14)       return p.color(60,  210, 60);   // green
    if (f < 7.5e14)     return p.color(60,  120, 255);  // blue
    return               p.color(180,  60, 255);         // violet
  }}

  // Spawn interval in frames (lower intensity → slower spawn)
  function spawnInterval() {{
    return Math.max(4, Math.round(30 / (SIM.intensity * speed)));
  }}

  function spawnPhoton() {{
    // Random x near lamp
    const x = LAMP_X + p.random(-15, 15);
    photons.push({{
      x: x,
      y: LAMP_Y + 20,
      vx: p.random(-0.4, 0.4),
      vy: 2.5 * speed,
      r: 6,
      col: photonColour(),
      bouncing: false,
      bounceVy: 0,
      alpha: 255,
      id: Math.random(),
      clicked: false,
      clickTimer: 0,
    }});
  }}

  function spawnElectron(x, y) {{
    // velocity proportional to sqrt(KE)
    const ke = Math.max(0.05, SIM.ke_ev);
    const speed_e = Math.sqrt(ke) * 80;
    photons.push({{
      x: x,
      y: y,
      vx: p.random(-1.5, 1.5) * speed,
      vy: -(speed_e * 0.04 + p.random(1, 3)) * speed,
      r: 5,
      col: p.color(255, 230, 50),
      isElectron: true,
      alpha: 255,
      trail: [],
    }});
  }}

  function addFlash(msg, x, y, col) {{
    flashMessages.push({{ msg, x, y, col, alpha: 255, life: 90 }});
  }}

  // ── p5 setup ───────────────────────────────────────────────────────────────
  p.setup = function() {{
    const cnv = p.createCanvas(W, H);
    cnv.parent(document.body);
    p.textFont('monospace');

    // Check threshold proximity (within 2%)
    const ratio = SIM.freq / SIM.threshold_hz;
    if (ratio > 0.96 && ratio < 1.04) {{
      thresholdGlow = 200;
    }}
  }};

  // ── p5 draw ────────────────────────────────────────────────────────────────
  p.draw = function() {{
    if (!playing) return;
    frameCount++;

    // Background
    p.background(14, 17, 23);

    // ── Metal surface (gradient band) ─────────────────────────────────────
    const glowAlpha = thresholdGlow;
    if (glowAlpha > 0) {{
      // Golden glow behind metal
      p.noStroke();
      p.fill(255, 200, 0, glowAlpha * 0.4);
      p.rect(0, METAL_Y - 10, W, METAL_H + 20, 4);
      thresholdGlow = Math.max(0, thresholdGlow - 1);
    }}

    for (let row = 0; row < METAL_H; row++) {{
      const t = row / METAL_H;
      const brightness = p.lerp(160, 90, t);
      p.stroke(brightness, brightness + 5, brightness + 10);
      p.line(0, METAL_Y + row, W, METAL_Y + row);
    }}
    p.noStroke();
    p.fill(200, 200, 210, 40);
    p.rect(0, METAL_Y, W, METAL_H);

    // Metal label
    p.noStroke();
    p.fill(180, 180, 200);
    p.textSize(11);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('METAL SURFACE  φ = ' + SIM.phi.toFixed(2) + ' eV', W / 2, METAL_Y + METAL_H / 2);

    // ── Threshold glow text ───────────────────────────────────────────────
    if (glowAlpha > 50) {{
      p.fill(255, 220, 0, glowAlpha);
      p.textSize(18);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('⚡ THRESHOLD! ⚡', W / 2, METAL_Y - 30);
    }}

    // ── Lamp / light source ───────────────────────────────────────────────
    const lcol = photonColour();
    p.fill(lcol);
    p.noStroke();
    // Glow halo
    p.fill(p.red(lcol), p.green(lcol), p.blue(lcol), 40);
    p.ellipse(LAMP_X, LAMP_Y, 50, 50);
    p.fill(lcol);
    p.ellipse(LAMP_X, LAMP_Y, 22, 22);
    p.fill(255, 255, 255, 180);
    p.ellipse(LAMP_X - 4, LAMP_Y - 4, 7, 7);

    // Lamp label
    p.fill(200, 200, 200);
    p.textSize(10);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('Light source', LAMP_X + 16, LAMP_Y);
    p.text('f = ' + (SIM.freq / 1e14).toFixed(2) + ' ×10¹⁴ Hz', LAMP_X + 16, LAMP_Y + 13);

    // ── Info panel (top-right) ─────────────────────────────────────────────
    p.fill(20, 24, 35, 200);
    p.stroke(80, 90, 120);
    p.strokeWeight(1);
    p.rect(W - 200, 8, 190, 100, 6);
    p.noStroke();
    p.fill(180, 210, 255);
    p.textSize(11);
    p.textAlign(p.LEFT, p.TOP);
    p.text('hf  = ' + SIM.hf_ev.toFixed(3) + ' eV', W - 192, 16);
    p.text('φ   = ' + SIM.phi.toFixed(3) + ' eV', W - 192, 32);
    p.text('f₀  = ' + (SIM.threshold_hz / 1e14).toFixed(2) + ' ×10¹⁴ Hz', W - 192, 48);
    if (SIM.above) {{
      p.fill(80, 255, 120);
      p.text('KE  = ' + SIM.ke_ev.toFixed(3) + ' eV  ✓ Emission', W - 192, 64);
    }} else {{
      p.fill(255, 100, 100);
      p.text('hf < φ — No emission ✗', W - 192, 64);
    }}
    p.fill(160, 180, 200);
    p.text('Intensity: ' + SIM.intensity.toFixed(1) + '×', W - 192, 82);

    // ── Mini I-V curve (bottom-right) ─────────────────────────────────────
    drawMiniIVCurve();

    // ── Spawn photons ─────────────────────────────────────────────────────
    spawnTimer++;
    if (spawnTimer >= spawnInterval()) {{
      spawnPhoton();
      spawnTimer = 0;
    }}

    // ── Update & draw photons / electrons ─────────────────────────────────
    for (let i = photons.length - 1; i >= 0; i--) {{
      const ph = photons[i];

      if (ph.isElectron) {{
        // Curved trajectory (gravity-like drift)
        ph.vy += 0.05 * speed;
        ph.vx *= 0.995;
        if (ph.trail) {{
          ph.trail.push({{ x: ph.x, y: ph.y }});
          if (ph.trail.length > 20) ph.trail.shift();
        }}
        ph.x += ph.vx;
        ph.y += ph.vy;
        ph.alpha -= 2.5;
        if (ph.alpha <= 0 || ph.y > H + 20 || ph.y < -30) {{
          photons.splice(i, 1);
          continue;
        }}
        // Draw trail
        if (ph.trail && ph.trail.length > 1) {{
          for (let t = 1; t < ph.trail.length; t++) {{
            const ta = (t / ph.trail.length) * ph.alpha * 0.5;
            p.stroke(255, 230, 50, ta);
            p.strokeWeight(1.5);
            p.line(ph.trail[t-1].x, ph.trail[t-1].y, ph.trail[t].x, ph.trail[t].y);
          }}
        }}
        p.noStroke();
        p.fill(p.red(ph.col), p.green(ph.col), p.blue(ph.col), ph.alpha);
        p.ellipse(ph.x, ph.y, ph.r * 2, ph.r * 2);
        // Label
        p.fill(255, 230, 50, ph.alpha);
        p.textSize(9);
        p.textAlign(p.LEFT);
        p.text('e⁻', ph.x + 7, ph.y);

      }} else if (ph.bouncing) {{
        // Bouncing back photon (reflected)
        ph.x += ph.vx;
        ph.y += ph.bounceVy;
        ph.alpha -= 5;
        if (ph.alpha <= 0 || ph.y < -10) {{
          photons.splice(i, 1);
          continue;
        }}
        p.noStroke();
        p.fill(p.red(ph.col), p.green(ph.col), p.blue(ph.col), ph.alpha * 0.6);
        p.ellipse(ph.x, ph.y, ph.r * 1.4, ph.r * 1.4);

      }} else {{
        // Normal downward photon
        ph.x += ph.vx;
        ph.y += ph.vy;

        // Check metal hit
        if (ph.y + ph.r >= METAL_Y) {{
          if (SIM.above) {{
            // Eject electron
            spawnElectron(ph.x, METAL_Y - 5);
            addFlash(
              'hf > φ  KE=' + SIM.ke_ev.toFixed(2) + ' eV',
              ph.x, METAL_Y - 25,
              p.color(80, 255, 120)
            );
          }} else {{
            // Bounce back
            ph.bouncing = true;
            ph.bounceVy = -Math.abs(ph.vy) * 0.7;
            addFlash('hf < φ — no emission', ph.x, METAL_Y - 20, p.color(255, 100, 100));
          }}
          // Remove non-bouncing photon
          if (!SIM.above) {{
            // keep as bouncing (already set)
          }} else {{
            photons.splice(i, 1);
            continue;
          }}
        }}

        // Out of bounds
        if (ph.y > H + 10 || ph.x < -20 || ph.x > W + 20) {{
          photons.splice(i, 1);
          continue;
        }}

        // Glow
        p.noStroke();
        p.fill(p.red(ph.col), p.green(ph.col), p.blue(ph.col), 40);
        p.ellipse(ph.x, ph.y, ph.r * 3.5, ph.r * 3.5);
        // Core
        p.fill(p.red(ph.col), p.green(ph.col), p.blue(ph.col), 220);
        p.ellipse(ph.x, ph.y, ph.r * 2, ph.r * 2);
        // Highlight
        p.fill(255, 255, 255, 160);
        p.ellipse(ph.x - 2, ph.y - 2, ph.r * 0.7, ph.r * 0.7);

        // Click label
        if (ph.clicked && ph.clickTimer > 0) {{
          ph.clickTimer--;
          p.fill(255, 255, 200, Math.min(255, ph.clickTimer * 5));
          p.textSize(10);
          p.textAlign(p.LEFT);
          p.text('E = hf = ' + SIM.hf_ev.toFixed(2) + ' eV', ph.x + 9, ph.y - 5);
        }}
      }}
    }}

    // ── Flash messages ────────────────────────────────────────────────────
    for (let i = flashMessages.length - 1; i >= 0; i--) {{
      const fm = flashMessages[i];
      fm.life--;
      fm.alpha = Math.min(255, fm.life * 4);
      if (fm.life <= 0) {{ flashMessages.splice(i, 1); continue; }}
      p.fill(p.red(fm.col), p.green(fm.col), p.blue(fm.col), fm.alpha);
      p.textSize(11);
      p.textAlign(p.CENTER);
      p.text(fm.msg, fm.x, fm.y - (90 - fm.life) * 0.3);
    }}

    // ── Controls bar ──────────────────────────────────────────────────────
    drawControls();
  }};

  // ── Mini I-V curve ─────────────────────────────────────────────────────────
  function drawMiniIVCurve() {{
    const cx = W - 195, cy = H - 10, cw = 185, ch = 90;
    p.fill(18, 22, 32, 210);
    p.stroke(70, 80, 110);
    p.strokeWeight(1);
    p.rect(cx, cy - ch, cw, ch, 4);

    p.noStroke();
    p.fill(150, 160, 180);
    p.textSize(9);
    p.textAlign(p.LEFT, p.TOP);
    p.text('I-V Curve (V_s vs f)', cx + 4, cy - ch + 4);

    // Axes
    const axL = cx + 10, axR = cx + cw - 8;
    const axB = cy - 10, axT = cy - ch + 18;
    p.stroke(80, 90, 120);
    p.strokeWeight(1);
    p.line(axL, axB, axR, axB);
    p.line(axL, axB, axL, axT);

    // Plot V_s vs f line
    const fMin = SIM.threshold_hz;
    const fMax = fMin * 2.5;
    const vMax = (fMax - fMin) * 6.626e-34 / 1.602e-19;

    p.stroke(80, 160, 255);
    p.strokeWeight(1.5);
    p.noFill();
    p.beginShape();
    for (let fi = fMin; fi <= fMax; fi += (fMax - fMin) / 40) {{
      const vs = (fi - fMin) * 6.626e-34 / 1.602e-19;
      const px2 = p.map(fi, fMin, fMax, axL, axR);
      const py2 = p.map(vs, 0, vMax, axB, axT);
      p.vertex(px2, py2);
    }}
    p.endShape();

    // Current frequency marker
    if (SIM.freq >= fMin) {{
      const vs_cur = Math.max(0, (SIM.freq - fMin) * 6.626e-34 / 1.602e-19);
      const mx = p.map(SIM.freq, fMin, fMax, axL, axR);
      const my = p.map(vs_cur, 0, vMax, axB, axT);
      p.stroke(255, 200, 0);
      p.strokeWeight(1);
      p.line(mx, axB, mx, my);
      p.fill(255, 200, 0);
      p.noStroke();
      p.ellipse(mx, my, 5, 5);
    }}

    // Axis labels
    p.noStroke();
    p.fill(120, 130, 150);
    p.textSize(8);
    p.textAlign(p.CENTER);
    p.text('f →', (axL + axR) / 2, axB + 8);
    p.textAlign(p.RIGHT);
    p.text('V_s', axL - 1, (axT + axB) / 2);
  }}

  // ── Controls bar ───────────────────────────────────────────────────────────
  function drawControls() {{
    const barY = H - 36;
    p.fill(20, 24, 35, 200);
    p.noStroke();
    p.rect(0, barY, W, 36);

    // Play/Pause button
    const btnX = 10, btnY = barY + 4, btnW = 70, btnH = 26;
    p.fill(playing ? 60 : 40, playing ? 120 : 60, playing ? 200 : 80);
    p.rect(btnX, btnY, btnW, btnH, 4);
    p.fill(220, 230, 255);
    p.textSize(11);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(playing ? '⏸ Pause' : '▶ Play', btnX + btnW / 2, btnY + btnH / 2);

    // Speed label
    p.fill(160, 170, 190);
    p.textSize(10);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('Speed: ' + speed.toFixed(1) + '×', 90, barY + 18);

    // Speed – button
    const s1x = 160, sY = barY + 4;
    p.fill(50, 60, 90);
    p.rect(s1x, sY, 28, 26, 4);
    p.fill(200, 210, 240);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('−', s1x + 14, sY + 13);

    // Speed + button
    const s2x = 194;
    p.fill(50, 60, 90);
    p.rect(s2x, sY, 28, 26, 4);
    p.fill(200, 210, 240);
    p.text('+', s2x + 14, sY + 13);

    // Hint
    p.fill(100, 110, 130);
    p.textSize(9);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('Click a photon to see its energy', W - 10, barY + 18);
  }}

  // ── Mouse interaction ──────────────────────────────────────────────────────
  p.mousePressed = function() {{
    const barY = H - 36;

    // Play/pause button
    if (p.mouseX >= 10 && p.mouseX <= 80 && p.mouseY >= barY + 4 && p.mouseY <= barY + 30) {{
      playing = !playing;
      return;
    }}
    // Speed – button
    if (p.mouseX >= 160 && p.mouseX <= 188 && p.mouseY >= barY + 4 && p.mouseY <= barY + 30) {{
      speed = Math.max(0.25, speed - 0.25);
      return;
    }}
    // Speed + button
    if (p.mouseX >= 194 && p.mouseX <= 222 && p.mouseY >= barY + 4 && p.mouseY <= barY + 30) {{
      speed = Math.min(3.0, speed + 0.25);
      return;
    }}

    // Click on photon to show energy
    for (const ph of photons) {{
      if (!ph.isElectron && !ph.bouncing) {{
        const d = p.dist(p.mouseX, p.mouseY, ph.x, ph.y);
        if (d < ph.r + 6) {{
          ph.clicked = true;
          ph.clickTimer = 80;
          break;
        }}
      }}
    }}
  }};
}});
</script>
</body>
</html>"""


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full simulation page."""
    sim_header("⚡ Photoelectric Effect", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        mode = mode_toggle()

    # Create tabs in the right column (outside with left_col so they appear correctly)
    with right_col:
        tab_photon, tab_stopping, tab_hydrogen = st.tabs(
            ["Photon Simulation", "Stopping Voltage", "Energy Level Transitions"]
        )

    # ── Tab 1: Photoelectric Effect Simulation ────────────────────────────────
    with left_col:
        st.markdown("### Tab 1 — Photon Simulation")
        st.divider()

        metal_name_1 = st.selectbox(
            "Metal",
            list(METALS.keys()),
            index=0,
            key="metal_tab1",
            help="Choose a metal to investigate its photoelectric threshold.",
        )
        metal_1 = METALS[metal_name_1]
        phi_eV_1 = metal_1["phi_eV"]

        wavelength_nm = st.slider(
            "Wavelength λ (nm)",
            min_value=200,
            max_value=800,
            value=400,
            step=5,
            key="wavelength",
            help="Wavelength of incident light. Shorter = higher energy photons.",
        )

        intensity_1 = st.slider(
            "Intensity (relative)",
            min_value=0.1,
            max_value=5.0,
            value=1.5,
            step=0.1,
            key="intensity_tab1",
            help="Relative intensity of incident light. Does NOT affect electron KE.",
        )

        # Derived quantities
        E_J_1, E_eV_1 = compute_photon_energy(float(wavelength_nm))
        lam0_nm_1 = compute_threshold_wavelength(phi_eV_1)
        emitting_1 = E_eV_1 >= phi_eV_1
        ke_eV_1 = max(0.0, E_eV_1 - phi_eV_1)

        # Light colour indicator
        light_rgb = wavelength_to_rgb(wavelength_nm)
        if wavelength_nm < 380:
            region_label = "UV"
        elif wavelength_nm <= 700:
            region_label = "Visible"
        else:
            region_label = "IR"

        st.markdown(
            f"<div style='background:{light_rgb}; border-radius:6px; "
            f"padding:8px 12px; margin:8px 0; text-align:center; "
            f"color:#111; font-weight:600; font-size:0.9rem;'>"
            f"{region_label} light — {wavelength_nm} nm</div>",
            unsafe_allow_html=True,
        )

        # Metal note
        st.info(f"**{metal_name_1}:** {metal_1['note']}")

        if emitting_1:
            st.success(
                f"Emission occurs! KE_max = **{ke_eV_1:.3f} eV**"
            )
        else:
            deficit = phi_eV_1 - E_eV_1
            st.error(
                f"No emission. Photon energy is **{deficit:.3f} eV** below the work function."
            )

        if mode == "Advanced":
            advanced_divider()
            st.markdown("**Advanced controls**")
            show_energy_bar_1 = st.checkbox(
                "Show energy budget bar chart",
                value=True,
                key="show_energy_bar",
                help="Visualises E = φ + KE_max decomposition.",
            )
        else:
            show_energy_bar_1 = False

    with tab_photon:
        # Metrics row
        ke_display = f"{ke_eV_1:.3f} eV" if emitting_1 else "No emission"
        metric_row({
            "E_photon":    f"{E_eV_1:.3f} eV",
            "Work fn φ":   f"{phi_eV_1:.2f} eV",
            "KE_max":      ke_display,
            "λ_threshold": f"{lam0_nm_1:.0f} nm",
        })

        st.markdown("")

        # Key insight
        st.info(
            "**Einstein's explanation:** each photon interacts with ONE electron. "
            "Increasing intensity sends MORE photons — more electrons emitted — "
            "but doesn't increase their energy. Only shorter wavelength (higher "
            "frequency) increases KE."
        )

        # p5.js animation — photon-metal interaction
        freq_val_1 = c_light / (float(wavelength_nm) * 1e-9)
        components.html(
            build_photoelectric_animation(freq_val_1, phi_eV_1, intensity_1),
            height=440,
        )
        st.caption("▶ Play/pause · Click photon to see energy · Watch threshold glow")
        st.divider()

        # Main particle diagram
        fig_pe = build_photoelectric_diagram(
            wavelength_nm=float(wavelength_nm),
            intensity=intensity_1,
            phi_eV=phi_eV_1,
            metal_colour=metal_1["colour"],
            emitting=emitting_1,
            ke_eV=ke_eV_1,
        )
        st.plotly_chart(fig_pe, use_container_width=True)

        if mode == "Advanced" and show_energy_bar_1:
            fig_bar = build_photon_energy_bar(E_eV_1, phi_eV_1, ke_eV_1, emitting_1)
            st.plotly_chart(fig_bar, use_container_width=True)

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"E = hf = \frac{hc}{\lambda}",
                r"KE_{\max} = hf - \phi",
                r"\lambda_0 = \frac{hc}{\phi} \quad \text{(threshold wavelength)}",
            ],
            explanation=(
                "The photoelectric effect cannot be explained by classical wave theory. "
                "Einstein proposed that light comes in discrete packets (photons) each with "
                "energy E = hf. A single photon gives ALL its energy to a single electron. "
                "If E > φ (work function), the electron is emitted with kinetic energy "
                "KE = hf − φ. Increasing intensity increases the NUMBER of photons and "
                "hence the NUMBER of emitted electrons, but does NOT change KE. "
                "This is strong evidence for the particle nature of light.\n\n"
                "The threshold wavelength λ₀ is the maximum wavelength (minimum frequency) "
                "at which emission can occur. For longer wavelengths, no emission takes place "
                "regardless of intensity."
            ),
            advanced_text=(
                "**de Broglie wavelength:** Electrons also show wave behaviour. λ = h/p = h/(mv). "
                "The Davisson-Germer experiment (1927) confirmed electron diffraction, demonstrating "
                "wave-particle duality for matter as well as light.\n\n"
                "**Quantum efficiency:** Not every photon that hits a photosensitive surface ejects "
                "an electron — quantum efficiency η = (electrons emitted) / (photons incident) × 100%, "
                "typically 1–30% for real photocathodes.\n\n"
                "**Photomultiplier tubes (PMT):** Use the photoelectric effect at a photocathode, "
                "then cascade dynode secondary emission to amplify the signal by factors of 10⁶–10⁷. "
                "Used in particle physics detectors and medical PET scanners."
            ),
            mode=mode,
        )

    # ── Tab 2: Stopping Voltage ───────────────────────────────────────────────
    with left_col:
        st.markdown("### Tab 2 — Stopping Voltage")
        st.divider()

        metal_name_2 = st.selectbox(
            "Metal",
            list(METALS.keys()),
            index=0,
            key="metal_tab2",
            help="Choose a metal — sets the threshold frequency f₀.",
        )
        metal_2 = METALS[metal_name_2]
        phi_eV_2 = metal_2["phi_eV"]

        # Frequency slider (in units of 10¹⁴ Hz for readability)
        freq_1e14 = st.slider(
            "Frequency f (× 10¹⁴ Hz)",
            min_value=4.0,
            max_value=20.0,
            value=8.0,
            step=0.1,
            key="freq_tab2",
            help="Frequency of incident photons. Must exceed threshold f₀ for emission.",
        )
        freq_Hz_2 = freq_1e14 * 1e14

        intensity_scale_2 = st.slider(
            "Intensity scale",
            min_value=0.5,
            max_value=3.0,
            value=1.0,
            step=0.1,
            key="intensity_tab2",
            help="Scales saturation current — does NOT affect stopping voltage.",
        )

        # Compute derived quantities
        phi_J_2 = phi_eV_2 * e_charge
        f0_2 = phi_J_2 / h_planck
        ke_max_J_2 = h_planck * (freq_Hz_2 - f0_2)
        emitting_2 = ke_max_J_2 > 0
        V_stop_2 = ke_max_J_2 / e_charge if emitting_2 else 0.0
        lam_2 = (c_light / freq_Hz_2) * 1e9  # nm

        if emitting_2:
            st.success(
                f"Emission occurs. V_s = **{V_stop_2:.3f} V**"
            )
        else:
            st.error(
                f"No emission — f < f₀ = {f0_2/1e14:.2f} × 10¹⁴ Hz"
            )

        if mode == "Advanced":
            advanced_divider()
            st.markdown("**Advanced: Millikan's determination of h**")
            st.markdown(
                "Plotting V_s vs f gives a straight line with slope h/e. "
                "Millikan used this to measure h independently of Planck's "
                "blackbody derivation."
            )
            show_vs_sweep = st.checkbox(
                "Show V_s vs frequency sweep",
                value=False,
                key="show_vs_sweep",
                help="Plot stopping voltage against frequency to determine h/e.",
            )
        else:
            show_vs_sweep = False

    with tab_stopping:
        # Metrics
        metric_row({
            "Frequency f":  f"{freq_Hz_2/1e14:.2f} × 10¹⁴ Hz",
            "Threshold f₀": f"{f0_2/1e14:.2f} × 10¹⁴ Hz",
            "Stop. voltage": f"{V_stop_2:.3f} V" if emitting_2 else "N/A",
            "Wavelength λ":  f"{lam_2:.0f} nm",
        })

        st.markdown("")

        st.info(
            "The stopping voltage is **INDEPENDENT of intensity** — doubling the "
            "intensity doubles the current but doesn't change V_s. "
            "This proved that energy comes in quanta (photons)."
        )

        # I-V characteristic
        V_arr, I_half, I_base, I_double, V_stop_calc, f0_calc = compute_iv_curve(
            float(freq_Hz_2),
            float(phi_eV_2),
            float(intensity_scale_2),
        )
        fig_iv = build_iv_curve(
            V_arr, I_half, I_base, I_double,
            V_stop_calc, freq_Hz_2, intensity_scale_2,
        )
        st.plotly_chart(fig_iv, use_container_width=True)
        st.caption(
            "All three intensity curves reach zero current at the SAME stopping voltage "
            f"(−V_s = −{V_stop_2:.3f} V). Only the saturation current changes with intensity."
        )

        if mode == "Advanced" and show_vs_sweep:
            st.markdown("#### V_s vs Frequency")
            f_sweep = np.linspace(f0_2 * 1.01, 20e14, 200)
            vs_sweep = h_planck * (f_sweep - f0_2) / e_charge

            fig_vs = go.Figure()
            fig_vs.add_trace(
                go.Scatter(
                    x=f_sweep / 1e14,
                    y=vs_sweep,
                    mode="lines",
                    name="V_s = (h/e)(f − f₀)",
                    line=dict(color=COLOURS["primary"], width=2.5),
                )
            )
            fig_vs.add_trace(
                go.Scatter(
                    x=[freq_Hz_2 / 1e14],
                    y=[V_stop_2],
                    mode="markers",
                    name=f"Current setting: {V_stop_2:.3f} V",
                    marker=dict(
                        color=COLOURS["highlight"],
                        size=12,
                        symbol="diamond",
                    ),
                )
            )
            # Mark threshold frequency
            fig_vs.add_vline(
                x=f0_2 / 1e14,
                line_dash="dash",
                line_color=COLOURS["tertiary"],
                line_width=1.5,
            )
            fig_vs.add_annotation(
                x=f0_2 / 1e14,
                y=max(vs_sweep) * 0.5,
                text=f"f₀ = {f0_2/1e14:.2f} × 10¹⁴ Hz",
                showarrow=True,
                arrowhead=2,
                arrowcolor=COLOURS["tertiary"],
                font=dict(color=COLOURS["tertiary"], size=11),
                bgcolor="rgba(0,0,0,0.6)",
                bordercolor=COLOURS["tertiary"],
                borderwidth=1,
                ax=40, ay=-30,
            )
            grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
            fig_vs.update_layout(
                **plotly_layout(
                    height=350,
                    title=dict(
                        text=f"Stopping Voltage vs Frequency (slope = h/e = {h_planck/e_charge:.3e} V s)",
                        font=dict(size=13),
                    ),
                    xaxis=dict(title="Frequency (× 10¹⁴ Hz)", **grid_style),
                    yaxis=dict(title="Stopping voltage V_s (V)", **grid_style),
                    showlegend=True,
                )
            )
            st.plotly_chart(fig_vs, use_container_width=True)
            st.caption(
                f"Gradient = h/e = {h_planck/e_charge:.4e} V s. "
                "Millikan measured this slope experimentally to determine Planck's constant h."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"eV_s = hf - \phi",
                r"V_s = \frac{h}{e}(f - f_0)",
                r"f_0 = \frac{\phi}{h} \quad \text{(threshold frequency)}",
            ],
            explanation=(
                "When a retarding (opposing) voltage V is applied to the collector, "
                "electrons must do work eV to reach it. At the stopping voltage V_s, "
                "even the most energetic electrons (with KE_max = hf − φ) are just "
                "stopped: eV_s = hf − φ.\n\n"
                "**Key observation:** three curves for different intensities cross zero "
                "at the SAME voltage V_s. Classical wave theory predicted that higher "
                "intensity (more energy per second) should increase V_s — which is "
                "WRONG. The quantum explanation (V_s depends only on frequency/photon "
                "energy) matches experiment perfectly."
            ),
            advanced_text=(
                "**Millikan's experiment (1916):** Plotted V_s vs f for several "
                "metals and different light sources. The straight-line graph of V_s vs f "
                "has slope h/e, allowing an independent measurement of Planck's constant: "
                "h = e × (gradient) ≈ 6.626 × 10⁻³⁴ J s. This confirmed Einstein's photon "
                "hypothesis and earned Einstein the 1921 Nobel Prize.\n\n"
                "**Saturation current** is proportional to photon flux (photons/s) = "
                "intensity/E_photon. For a fixed frequency, doubling intensity doubles "
                "the number of photons and hence doubles the current."
            ),
            mode=mode,
        )

    # ── Tab 3: Energy Level Transitions ──────────────────────────────────────
    with left_col:
        st.markdown("### Tab 3 — Energy Levels")
        st.divider()

        n_i_3 = st.slider(
            "Initial level n_i",
            min_value=1,
            max_value=6,
            value=3,
            step=1,
            key="n_i",
            help="Initial electron energy level. Must differ from n_f.",
        )

        n_f_3 = st.slider(
            "Final level n_f",
            min_value=1,
            max_value=6,
            value=2,
            step=1,
            key="n_f",
            help="Final electron energy level. Must differ from n_i.",
        )

        # Guard against n_i == n_f
        if n_i_3 == n_f_3:
            st.warning("Initial and final levels must differ. Adjusting n_f.")
            n_f_3 = (n_i_3 % 6) + 1

        delta_E_3, lam_3 = compute_hydrogen_transition(n_i_3, n_f_3)
        is_emission_3 = n_f_3 < n_i_3
        transition_type_3 = "Emission" if is_emission_3 else "Absorption"
        photon_colour_3 = wavelength_to_rgb(lam_3)

        # Determine series name
        if is_emission_3:
            series_key = n_f_3
            series_name = SERIES.get(series_key, f"n_f={n_f_3} series")
        else:
            series_key = n_i_3
            series_name = SERIES.get(n_i_3, f"Absorption from n={n_i_3}")

        # Classify region
        if lam_3 < 380:
            region_3 = "UV"
            region_colour_3 = COLOURS["advanced"]
        elif lam_3 <= 700:
            region_3 = "Visible"
            region_colour_3 = photon_colour_3
        else:
            region_3 = "Infrared (IR)"
            region_colour_3 = COLOURS["secondary"]

        st.markdown(
            f"<div style='background:{region_colour_3}; border-radius:6px; "
            f"padding:8px 12px; margin:8px 0; text-align:center; "
            f"color:#111; font-weight:600; font-size:0.9rem;'>"
            f"{transition_type_3} — {lam_3:.1f} nm ({region_3})</div>",
            unsafe_allow_html=True,
        )

        if is_emission_3:
            st.success(
                f"Photon **emitted** — n={n_i_3} → n={n_f_3} ({series_name})"
            )
        else:
            st.info(
                f"Photon **absorbed** — n={n_i_3} → n={n_f_3}"
            )

        if mode == "Advanced":
            advanced_divider()
            st.markdown("**Advanced: Spectral series overview**")
            show_all_balmer = st.checkbox(
                "Show all Balmer series lines",
                value=False,
                key="show_all_balmer",
                help="Plot wavelengths for n=3,4,5,6 → n=2 transitions.",
            )
        else:
            show_all_balmer = False

    with tab_hydrogen:
        # Metrics
        E_i_3 = HYDROGEN_LEVELS[n_i_3]
        E_f_3 = HYDROGEN_LEVELS[n_f_3]

        metric_row({
            "E_initial":  f"{E_i_3:.3f} eV",
            "E_final":    f"{E_f_3:.3f} eV",
            "ΔE":         f"{delta_E_3:.3f} eV",
            "λ":          f"{lam_3:.1f} nm",
            "Region":     region_3,
        })

        st.markdown("")

        st.info(
            "The discrete spectral lines of hydrogen are fingerprints — astronomers "
            "use them to determine the composition, temperature, and recession speed "
            "of distant stars."
        )

        # Energy level diagram
        fig_el = build_energy_level_diagram(
            n_i=n_i_3,
            n_f=n_f_3,
            delta_E_eV=delta_E_3,
            lam_nm=lam_3,
            photon_colour=photon_colour_3,
        )
        st.plotly_chart(fig_el, use_container_width=True)

        if mode == "Advanced" and show_all_balmer:
            st.markdown("#### Balmer Series (n_f = 2)")
            balmer_data = []
            for ni in range(3, 7):
                de, lam = compute_hydrogen_transition(ni, 2)
                rgb = wavelength_to_rgb(lam)
                balmer_data.append((ni, de, lam, rgb))

            fig_balmer = go.Figure()
            for ni, de, lam, rgb in balmer_data:
                fig_balmer.add_trace(
                    go.Scatter(
                        x=[lam, lam],
                        y=[0, 1],
                        mode="lines",
                        name=f"n={ni}→2  λ={lam:.0f} nm",
                        line=dict(color=rgb, width=6),
                        hovertemplate=f"n={ni}→2: λ={lam:.1f} nm, ΔE={de:.3f} eV<extra></extra>",
                    )
                )

            grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
            fig_balmer.update_layout(
                **plotly_layout(
                    height=250,
                    title=dict(
                        text="Balmer Series — Visible Hydrogen Spectrum",
                        font=dict(size=13),
                    ),
                    xaxis=dict(
                        title="Wavelength (nm)",
                        range=[380, 700],
                        **grid_style,
                    ),
                    yaxis=dict(
                        showticklabels=False,
                        showgrid=False,
                        zeroline=False,
                    ),
                    showlegend=True,
                )
            )
            st.plotly_chart(fig_balmer, use_container_width=True)

            # Table of Balmer series
            st.markdown("**Balmer series wavelengths:**")
            cols_b = st.columns(len(balmer_data))
            for col, (ni, de, lam, rgb) in zip(cols_b, balmer_data):
                col.markdown(
                    f"<div style='background:{rgb}; border-radius:4px; "
                    f"padding:6px; text-align:center; color:#111; "
                    f"font-weight:600; font-size:0.85rem;'>"
                    f"n={ni}→2<br>{lam:.0f} nm</div>",
                    unsafe_allow_html=True,
                )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"E_n = -\frac{13.6}{n^2} \text{ eV}",
                r"\Delta E = E_{n_i} - E_{n_f} = hf = \frac{hc}{\lambda}",
                r"\frac{1}{\lambda} = R_H \left(\frac{1}{n_f^2} - \frac{1}{n_i^2}\right)",
            ],
            explanation=(
                "Hydrogen has discrete energy levels E_n = −13.6/n² eV. When an "
                "electron drops from a higher level n_i to a lower level n_f, a photon "
                "is emitted with energy equal to the gap ΔE = E_ni − E_nf.\n\n"
                "**Series:**\n"
                "- **Lyman series** (n_f = 1): UV photons — transitions to ground state\n"
                "- **Balmer series** (n_f = 2): visible + UV — the four visible lines "
                "(Hα 656 nm red, Hβ 486 nm blue-green, Hγ 434 nm violet, Hδ 410 nm violet)\n"
                "- **Paschen series** (n_f = 3): IR photons\n\n"
                "The negative energies reflect that electrons are bound; zero energy = "
                "ionisation (electron free from nucleus)."
            ),
            advanced_text=(
                "**Rydberg formula:** 1/λ = R_H (1/n_f² − 1/n_i²) where "
                "R_H = 1.097 × 10⁷ m⁻¹ (Rydberg constant for hydrogen). "
                "This empirical formula was known before quantum mechanics but had "
                "no physical explanation until Bohr (1913) derived it from quantised "
                "angular momentum L = nℏ.\n\n"
                "**Astronomical applications:** Redshift (z = Δλ/λ₀) of hydrogen "
                "lines in galaxy spectra allows measurement of recession speed via "
                "Hubble's law: v = H₀d. The Lyman-α line (121.6 nm) is the most "
                "commonly observed line in quasar spectra.\n\n"
                "**de Broglie / wave-particle duality:** The quantised orbits in "
                "Bohr's model correspond to standing de Broglie waves: nλ = 2πr, "
                "i.e., an integer number of electron wavelengths fit around the orbit."
            ),
            mode=mode,
        )


# ── Run ───────────────────────────────────────────────────────────────────────

main()
