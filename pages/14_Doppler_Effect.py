"""
Doppler Effect simulation for WJEC Eduqas A Level Physics.

Component 2, Topic 8 (Waves) and Component 3, Topic 11 (Astrophysics).

Covers:
  Basic   : Sound Doppler formula, wavefront diagram, wavefront circles,
            frequency-vs-time as vehicle passes, Mach cone, redshift.
  Advanced: Relativistic Doppler (light), Hubble's Law plot, galaxy
            recession data, Hubble constant estimation.
"""

from __future__ import annotations

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import c_light
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
    page_title="Doppler Effect — WJEC A Level Physics",
    page_icon="🔊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Module-level constants ────────────────────────────────────────────────────

V_SOUND: float = 343.0          # m/s at 20 °C

SPEC_REF = (
    "Component 2, Topic 8 (Waves) and Component 3, Topic 11 (Astrophysics)"
)

EQUATIONS = [
    r"f_{\text{obs}} = f_s \frac{v \pm v_o}{v \mp v_s}",
    r"z = \frac{\Delta\lambda}{\lambda} = \frac{\lambda_{\text{obs}} - \lambda_s}{\lambda_s}",
    r"\lambda_{\text{obs}} = \lambda_s \sqrt{\frac{1+\beta}{1-\beta}}, \quad \beta = \frac{v}{c}",
    r"v = H_0 \, d \quad (H_0 \approx 70 \text{ km s}^{-1}\text{Mpc}^{-1})",
]

EXPLANATION = (
    "The **Doppler effect** is the change in observed frequency when a source "
    "or observer moves relative to the medium. For sound, "
    "$f_{\\text{obs}} = f_s(v \\pm v_o)/(v \\mp v_s)$ where the upper signs apply "
    "when source and observer approach each other (higher pitch) and the lower "
    "signs when they recede (lower pitch). The **wavefront diagram** shows how "
    "wavefronts bunch ahead of a moving source and stretch behind it. At Mach 1 "
    "all wavefronts pile up at the source; above Mach 1 a **Mach cone** forms "
    "(half-angle $\\alpha$ where $\\sin\\alpha = v_{\\text{sound}}/v_s$). "
    "For light, the **relativistic Doppler formula** must be used: recession "
    "stretches wavelengths (redshift, $z > 0$); approach compresses them "
    "(blueshift, $z < 0$). **Hubble's Law** $v = H_0 d$ states that galaxies "
    "recede at speeds proportional to their distance — evidence for an expanding "
    "universe."
)

ADVANCED_TEXT = (
    "**Hubble's Law derivation from expansion:** If the universe expands uniformly, "
    "every pair of points moves apart at a rate proportional to their separation: "
    "$\\dot{d} = H_0 d$. There is no special centre — every galaxy sees every "
    "other receding at $v = H_0 d$.\n\n"
    "**The cosmic microwave background (CMB):** Light from the surface of last "
    "scattering (380,000 yr after the Big Bang) has been redshifted by a factor "
    "$z \\approx 1100$ from visible to microwave wavelengths. The CMB temperature "
    "today is 2.725 K — a perfect blackbody. This is the strongest evidence for "
    "the Hot Big Bang model.\n\n"
    "**Olbers' Paradox:** If the universe were infinite, static, and eternal, "
    "every line of sight would end on a star and the night sky would be as bright "
    "as the Sun. The fact that the sky is dark tells us the universe has finite "
    "age and the light from very distant galaxies is redshifted out of the visible "
    "band. The Doppler effect is therefore central to explaining why the night "
    "sky is dark.\n\n"
    "**Lookback time:** A galaxy with redshift $z$ emitted its light when the "
    "universe had scale factor $a = 1/(1+z)$. A galaxy at $z=1$ is seen as it "
    "was when the universe was about half its present size."
)

# ── Real-world sound presets ──────────────────────────────────────────────────

PRESETS: dict[str, dict | None] = {
    "Custom": None,
    "Ambulance siren (approaching)": {
        "f_s": 700,
        "v_s": 30,
        "v_o": 0,
        "approaching": True,
        "note": (
            "UK ambulance sirens produce ~700 Hz. At 30 m/s (108 km/h), the pitch "
            "drops noticeably as it passes."
        ),
    },
    "Formula 1 car passing": {
        "f_s": 8000,
        "v_s": 80,
        "v_o": 0,
        "approaching": True,
        "note": (
            "F1 engines rev to ~15,000 RPM producing very high frequencies. "
            "The distinctive pitch change is Doppler shift."
        ),
    },
    "Supersonic aircraft (Mach 1.5)": {
        "f_s": 500,
        "v_s": 515,
        "v_o": 0,
        "approaching": True,
        "note": (
            "The sonic boom is caused by overlapping wavefronts — a Mach cone. "
            "Normal Doppler formula breaks down above Mach 1."
        ),
    },
    "Train whistle (160 km/h)": {
        "f_s": 500,
        "v_s": 44,
        "v_o": 0,
        "approaching": True,
        "note": (
            "High-speed trains produce a very noticeable Doppler shift — used in "
            "early experimental confirmations of the Doppler effect."
        ),
    },
    "Bat echolocation": {
        "f_s": 40000,
        "v_s": 8,
        "v_o": 0,
        "approaching": True,
        "note": (
            "Bats emit ultrasonic pulses (~40 kHz). They can detect Doppler shifts "
            "from moving insects — effectively biological radar."
        ),
    },
}

# ── Galaxy redshift presets ────────────────────────────────────────────────────

GALAXIES: dict[str, dict | None] = {
    "Custom": None,
    "Andromeda (approaching!)": {
        "beta": -0.001,
        "note": (
            "M31 is approaching at ~110 km/s — one of the few galaxies blueshifted. "
            "Will collide with the Milky Way in ~4.5 billion years."
        ),
    },
    "Virgo Cluster": {
        "beta": 0.004,
        "note": (
            "About 54 Mly away, receding at ~1,200 km/s. Contains over 1,300 galaxies "
            "including M87 (the first black hole imaged)."
        ),
    },
    "Coma Cluster": {
        "beta": 0.023,
        "note": (
            "About 321 Mly away. Fritz Zwicky studied this cluster in 1933 and first "
            "proposed the existence of dark matter."
        ),
    },
    "Quasar 3C 273": {
        "beta": 0.158,
        "note": (
            "The brightest quasar visible from Earth, 2.4 billion light-years away. "
            "Its high redshift was shocking when first measured in 1963."
        ),
    },
    "Distant galaxy z=1": {
        "beta": 0.6,
        "note": (
            "A galaxy at redshift z=1 is receding at ~0.6c. The universe was about "
            "6 billion years old when this light left."
        ),
    },
}

# ── Hubble law data (real galaxies / clusters for Advanced plot) ───────────────

HUBBLE_DATA = [
    # (name, distance_Mpc, velocity_kms)
    ("Virgo",          16.5,    1136),
    ("Ursa Major I",   22.0,    960),
    ("Corona Borealis",299.0,  21600),
    ("Bootes",         246.0,  39300),
    ("Hydra",          594.0,  60600),
    ("Leo",            171.0,  19600),
    ("Perseus",        102.0,   5400),
    ("Coma",            99.0,   6925),
    ("Hercules",       153.0,  10800),
    ("Ursa Major II",  305.0,  15000),
]

# ── Colour-wavelength helper ──────────────────────────────────────────────────


def wavelength_to_rgb(lam_nm: float) -> str:
    """
    Convert a visible wavelength in nm to an HTML hex colour.

    Parameters
    ----------
    lam_nm : wavelength in nanometres (380–700 nm)

    Returns
    -------
    Hex colour string suitable for Plotly/CSS.
    """
    if lam_nm < 380:
        return "#8B00FF"
    elif lam_nm < 450:
        r, g, b = 148, 0, 211
    elif lam_nm < 495:
        # violet → blue
        t = (lam_nm - 450) / 45.0
        r = int(148 * (1 - t))
        g = 0
        b = int(211 + (255 - 211) * t)
    elif lam_nm < 570:
        # blue → green
        t = (lam_nm - 495) / 75.0
        r = 0
        g = int(255 * t)
        b = int(255 * (1 - t))
    elif lam_nm < 590:
        # green → yellow
        t = (lam_nm - 570) / 20.0
        r = int(255 * t)
        g = 255
        b = 0
    elif lam_nm < 620:
        # yellow → orange
        t = (lam_nm - 590) / 30.0
        r = 255
        g = int(255 * (1 - t * 0.5))
        b = 0
    elif lam_nm <= 700:
        # orange → red
        t = (lam_nm - 620) / 80.0
        r = 255
        g = int(127 * (1 - t))
        b = 0
    else:
        return "#FF0000"
    return f"#{r:02X}{g:02X}{b:02X}"


def colour_swatch_html(colour_hex: str, label: str) -> str:
    """Return HTML for a small colour swatch with a text label."""
    return (
        f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:4px'>"
        f"<div style='width:36px;height:22px;background:{colour_hex};"
        f"border-radius:3px;border:1px solid #555'></div>"
        f"<span style='font-size:0.82rem;color:{COLOURS['text']}'>{label}</span>"
        f"</div>"
    )


# ── Cached physics computations ───────────────────────────────────────────────


@st.cache_data(show_spinner=False)
def compute_doppler_sound(
    f_s: float,
    v_s: float,
    v_o: float,
    source_approaching: bool,
    observer_approaching: bool,
) -> dict:
    """
    Compute all Doppler quantities for a moving sound source and/or observer.

    Parameters
    ----------
    f_s                 : source frequency (Hz)
    v_s                 : source speed (m/s)
    v_o                 : observer speed (m/s)
    source_approaching  : True if source moves toward observer
    observer_approaching: True if observer moves toward source

    Returns
    -------
    dict with keys: f_obs, delta_f, lambda_ahead, lambda_behind, mach
    """
    v_s_signed = v_s if source_approaching else -v_s
    v_o_signed = v_o if observer_approaching else -v_o

    mach = v_s / V_SOUND

    # Guard against division by zero (exactly Mach 1)
    denom = V_SOUND - v_s_signed
    if abs(denom) < 0.01:
        f_obs = np.inf
    else:
        f_obs = f_s * (V_SOUND + v_o_signed) / denom

    delta_f = f_obs - f_s if np.isfinite(f_obs) else np.inf

    # Wavelengths emitted by source in air (independent of observer)
    T_s = 1.0 / f_s            # source period
    # Ahead of source: wavefronts compressed
    if source_approaching:
        lambda_ahead = (V_SOUND - v_s) * T_s
        lambda_behind = (V_SOUND + v_s) * T_s
    else:
        lambda_ahead = (V_SOUND + v_s) * T_s
        lambda_behind = (V_SOUND - v_s) * T_s

    return {
        "f_obs": float(f_obs),
        "delta_f": float(delta_f),
        "lambda_ahead": float(lambda_ahead),
        "lambda_behind": float(lambda_behind),
        "mach": float(mach),
    }


@st.cache_data(show_spinner=False)
def compute_redshift(lam_source_nm: float, beta: float) -> dict:
    """
    Compute relativistic Doppler redshift quantities.

    Parameters
    ----------
    lam_source_nm : rest-frame wavelength (nm)
    beta          : v/c (positive = recession/redshift, negative = approach/blueshift)

    Returns
    -------
    dict with keys: lam_obs_nm, z, colour_source, colour_obs
    """
    beta_clamped = float(np.clip(beta, -0.9999, 0.9999))
    lam_obs_nm = lam_source_nm * np.sqrt((1.0 + beta_clamped) / (1.0 - beta_clamped))
    z = (lam_obs_nm - lam_source_nm) / lam_source_nm
    return {
        "lam_obs_nm": float(lam_obs_nm),
        "z": float(z),
        "colour_source": wavelength_to_rgb(lam_source_nm),
        "colour_obs": wavelength_to_rgb(float(np.clip(lam_obs_nm, 380, 900))),
    }


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_wavefront_circles_fig(
    f_s: float,
    v_s: float,
    n_circles: int = 5,
) -> go.Figure:
    """
    Build the 2-D wavefront diagram showing circles emitted at past positions.

    The source is at x=0 at t=0 and moves in the +x direction.
    Circles represent wavefronts emitted at t = -T, -2T, -3T, ... ago.

    Parameters
    ----------
    f_s      : source frequency (Hz)
    v_s      : source speed (m/s)
    n_circles: number of past wavefronts to draw

    Returns
    -------
    Plotly Figure
    """
    T = 1.0 / f_s
    mach = v_s / V_SOUND

    fig = go.Figure()
    theta = np.linspace(0, 2 * np.pi, 300)

    colours_circles = [
        COLOURS["primary"],
        COLOURS["secondary"],
        COLOURS["tertiary"],
        COLOURS["quaternary"],
        COLOURS["advanced"],
        COLOURS["highlight"],
    ]

    for i in range(1, n_circles + 1):
        # Wavefront emitted i periods ago
        t_since = i * T                         # time since emission (s)
        x_emit = -v_s * i * T                   # source x when it emitted
        radius = V_SOUND * t_since              # radius of wavefront now

        cx = x_emit + radius * np.cos(theta)
        cy = radius * np.sin(theta)

        col = colours_circles[(i - 1) % len(colours_circles)]
        opacity = max(0.25, 1.0 - 0.12 * i)

        fig.add_trace(
            go.Scatter(
                x=cx,
                y=cy,
                mode="lines",
                name=f"t = -{i}T",
                line=dict(color=col, width=1.5),
                opacity=opacity,
            )
        )

    # Source marker at x=0
    fig.add_trace(
        go.Scatter(
            x=[0.0],
            y=[0.0],
            mode="markers",
            name="Source (now)",
            marker=dict(
                color=COLOURS["highlight"],
                size=16,
                symbol="star",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # Velocity arrow annotation
    arrow_len = V_SOUND * n_circles * T * 0.25
    if v_s > 0:
        fig.add_annotation(
            x=arrow_len,
            y=0,
            ax=0,
            ay=0,
            xref="x",
            yref="y",
            axref="x",
            ayref="y",
            showarrow=True,
            arrowhead=2,
            arrowsize=1.5,
            arrowwidth=2,
            arrowcolor=COLOURS["highlight"],
            text="",
        )

    # Determine axis range
    max_radius = V_SOUND * n_circles * T
    x_range_lo = min(-v_s * n_circles * T - max_radius, -max_radius) * 1.1
    x_range_hi = max_radius * 1.2
    axis_limit = max(abs(x_range_lo), x_range_hi, max_radius) * 1.05

    # Mach cone lines for supersonic
    if mach > 1.0:
        half_angle = np.degrees(np.arcsin(1.0 / mach))
        cone_length = abs(x_range_lo) * 0.9
        # Apex at x=0, opening to the left (source has moved right from past positions)
        x_apex = 0.0
        for sign in [1, -1]:
            x_cone = [x_apex, x_apex - cone_length]
            y_cone = [0.0, sign * cone_length * np.tan(np.radians(half_angle))]
            fig.add_trace(
                go.Scatter(
                    x=x_cone,
                    y=y_cone,
                    mode="lines",
                    name="Mach cone" if sign == 1 else None,
                    showlegend=(sign == 1),
                    line=dict(color=COLOURS["highlight"], width=2, dash="dash"),
                )
            )

    layout_title = (
        f"Wavefront Diagram — f_s = {f_s:.0f} Hz, "
        f"v_s = {v_s:.0f} m/s (Mach {mach:.2f})"
    )

    fig.update_layout(
        **plotly_layout(
            height=480,
            title=dict(text=layout_title, font=dict(size=13)),
            xaxis=dict(
                title="x (m)",
                range=[x_range_lo * 1.05, x_range_hi],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_frequency_time_fig(
    f_s: float,
    v_s: float,
    v_o: float,
    observer_approaching: bool,
) -> go.Figure:
    """
    Build frequency-vs-time plot as a moving source passes a stationary observer.

    The source starts far away (approaching), passes the observer at t=0,
    then recedes. Observer speed is folded in.

    Parameters
    ----------
    f_s                 : source frequency (Hz)
    v_s                 : source speed (m/s)
    v_o                 : observer speed (m/s) — kept constant throughout
    observer_approaching: whether observer moves toward the source's side

    Returns
    -------
    Plotly Figure
    """
    # Time axis: -5 s to +5 s around passing moment
    t_arr = np.linspace(-5.0, 5.0, 1000)

    v_o_signed = v_o if observer_approaching else -v_o

    mach = v_s / V_SOUND

    f_vals = np.zeros_like(t_arr)
    for idx, _t in enumerate(t_arr):
        if _t < 0:
            # Approaching: source moves toward observer
            denom = V_SOUND - v_s
            if abs(denom) < 0.01:
                f_vals[idx] = f_s * 50
            else:
                f_vals[idx] = f_s * (V_SOUND + v_o_signed) / denom
        else:
            # Receding: source moves away from observer
            denom = V_SOUND + v_s
            f_vals[idx] = f_s * (V_SOUND + v_o_signed) / denom

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=t_arr,
            y=f_vals,
            mode="lines",
            name="Observed frequency",
            line=dict(color=COLOURS["primary"], width=2.5),
        )
    )

    # Source (emitted) frequency line
    fig.add_hline(
        y=f_s,
        line=dict(color=COLOURS["secondary"], width=1.5, dash="dash"),
        annotation_text=f"f_s = {f_s:.0f} Hz",
        annotation_position="right",
        annotation_font=dict(color=COLOURS["secondary"], size=11),
    )

    # Mark the passing moment
    fig.add_vline(
        x=0.0,
        line=dict(color=COLOURS["highlight"], width=1.5, dash="dot"),
        annotation_text="Passing moment",
        annotation_position="top right",
        annotation_font=dict(color=COLOURS["highlight"], size=10),
    )

    # Compute f_approaching and f_receding for annotation
    denom_app = V_SOUND - v_s
    denom_rec = V_SOUND + v_s
    if abs(denom_app) > 0.01:
        f_app = f_s * (V_SOUND + v_o_signed) / denom_app
        fig.add_annotation(
            x=-4.0,
            y=float(f_app),
            text=f"f_app ≈ {f_app:.1f} Hz",
            showarrow=False,
            font=dict(color=COLOURS["tertiary"], size=10),
            bgcolor="rgba(0,0,0,0.5)",
        )
    f_rec = f_s * (V_SOUND + v_o_signed) / denom_rec
    fig.add_annotation(
        x=4.0,
        y=float(f_rec),
        text=f"f_rec ≈ {f_rec:.1f} Hz",
        showarrow=False,
        font=dict(color=COLOURS["quaternary"], size=10),
        bgcolor="rgba(0,0,0,0.5)",
    )

    fig.update_layout(
        **plotly_layout(
            height=300,
            title=dict(
                text="Observed Frequency as Source Passes Observer",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Time relative to passing moment (s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Observed frequency (Hz)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                rangemode="tozero",
            ),
        )
    )
    return fig


def build_mach_diagram_fig(mach_number: float, n_circles: int = 6) -> go.Figure:
    """
    Build the Mach wavefront / cone diagram for Sub-sim 2.

    Shows concentric circles for subsonic, converging circles for Mach=1,
    and a Mach cone with wavefronts for supersonic.

    Parameters
    ----------
    mach_number : M = v_s / v_sound (0 to 2)
    n_circles   : number of past wavefronts to draw

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()
    theta = np.linspace(0, 2 * np.pi, 300)

    v_s = mach_number * V_SOUND
    T_ref = 1.0 / 100.0   # arbitrary reference period for display scale

    colours_c = [
        COLOURS["primary"],
        COLOURS["secondary"],
        COLOURS["tertiary"],
        COLOURS["quaternary"],
        COLOURS["advanced"],
        COLOURS["highlight"],
    ]

    for i in range(1, n_circles + 1):
        t_since = i * T_ref
        x_emit = -v_s * i * T_ref
        radius = V_SOUND * t_since

        cx = x_emit + radius * np.cos(theta)
        cy = radius * np.sin(theta)

        col = colours_c[(i - 1) % len(colours_c)]
        opacity = max(0.2, 1.0 - 0.12 * i)

        fig.add_trace(
            go.Scatter(
                x=cx,
                y=cy,
                mode="lines",
                name=f"Wavefront {i}",
                line=dict(color=col, width=1.5),
                opacity=opacity,
            )
        )

    # Source marker
    fig.add_trace(
        go.Scatter(
            x=[0.0],
            y=[0.0],
            mode="markers",
            name="Source",
            marker=dict(
                color=COLOURS["highlight"],
                size=16,
                symbol="star",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # Mach cone for supersonic
    if mach_number > 1.0:
        half_angle = np.arcsin(1.0 / mach_number)
        cone_length = V_SOUND * n_circles * T_ref * 1.2
        for sign in [1, -1]:
            x_cone = [0.0, -cone_length]
            y_cone = [0.0, sign * cone_length * np.tan(half_angle)]
            fig.add_trace(
                go.Scatter(
                    x=x_cone,
                    y=y_cone,
                    mode="lines",
                    name="Mach cone" if sign == 1 else None,
                    showlegend=(sign == 1),
                    line=dict(color=COLOURS["highlight"], width=2.5, dash="dash"),
                )
            )

    max_r = V_SOUND * n_circles * T_ref
    x_lo = (-v_s * n_circles * T_ref - max_r) * 1.15
    x_hi = max_r * 1.2
    y_lim = max_r * 1.15

    # Classify
    if mach_number < 0.99:
        regime_text = "Subsonic — wavefronts pile up ahead of source"
    elif mach_number < 1.01:
        regime_text = "Mach 1 — wavefronts converge at source position"
    else:
        half_deg = np.degrees(np.arcsin(1.0 / mach_number))
        regime_text = f"Supersonic — Mach cone half-angle = {half_deg:.1f}°"

    fig.update_layout(
        **plotly_layout(
            height=480,
            title=dict(
                text=f"Mach Diagram — M = {mach_number:.2f}  |  {regime_text}",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="x (relative)",
                range=[x_lo, x_hi],
                scaleanchor="y",
                scaleratio=1,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="y (relative)",
                range=[-y_lim, y_lim],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_spectrum_fig(
    lam_source_nm: float,
    lam_obs_nm: float,
    colour_source: str,
    colour_obs: str,
) -> go.Figure:
    """
    Build the spectrum comparison plot for the redshift sub-sim.

    Draws Gaussian spectral lines at rest and observed wavelengths.

    Parameters
    ----------
    lam_source_nm : rest wavelength (nm)
    lam_obs_nm    : observed wavelength (nm)
    colour_source : CSS hex colour for rest line
    colour_obs    : CSS hex colour for observed line

    Returns
    -------
    Plotly Figure
    """
    sigma = 8.0   # nm — line width
    lam_lo = max(300.0, min(lam_source_nm, lam_obs_nm) - 80.0)
    lam_hi = min(1200.0, max(lam_source_nm, lam_obs_nm) + 80.0)
    lam_arr = np.linspace(lam_lo, lam_hi, 1000)

    I_source = np.exp(-0.5 * ((lam_arr - lam_source_nm) / sigma) ** 2)
    I_obs = np.exp(-0.5 * ((lam_arr - lam_obs_nm) / sigma) ** 2)

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=lam_arr,
            y=I_source,
            mode="lines",
            name=f"Rest λ = {lam_source_nm:.1f} nm",
            line=dict(color=colour_source, width=2.5),
            fill="tozeroy",
            fillcolor=_hex_to_rgba(colour_source, 0.15),
        )
    )

    fig.add_trace(
        go.Scatter(
            x=lam_arr,
            y=I_obs,
            mode="lines",
            name=f"Observed λ = {lam_obs_nm:.1f} nm",
            line=dict(color=colour_obs, width=2.5),
            fill="tozeroy",
            fillcolor=_hex_to_rgba(colour_obs, 0.15),
        )
    )

    # Vertical dashed markers at line centres
    fig.add_vline(
        x=lam_source_nm,
        line=dict(color=colour_source, width=1.5, dash="dot"),
        annotation_text=f"λ_rest = {lam_source_nm:.1f} nm",
        annotation_position="top left",
        annotation_font=dict(color=colour_source, size=10),
    )
    fig.add_vline(
        x=lam_obs_nm,
        line=dict(color=colour_obs, width=1.5, dash="dot"),
        annotation_text=f"λ_obs = {lam_obs_nm:.1f} nm",
        annotation_position="top right",
        annotation_font=dict(color=colour_obs, size=10),
    )

    # Shade the visible spectrum region
    fig.add_vrect(
        x0=380,
        x1=700,
        fillcolor="rgba(255,255,255,0.04)",
        line_width=0,
        annotation_text="Visible",
        annotation_position="top left",
        annotation_font=dict(size=9, color=COLOURS["text"]),
    )

    fig.update_layout(
        **plotly_layout(
            height=340,
            title=dict(
                text="Spectral Line Comparison",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Wavelength (nm)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Relative intensity",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-0.05, 1.2],
            ),
        )
    )
    return fig


def build_hubble_fig() -> go.Figure:
    """
    Build Hubble's Law plot: recession velocity vs distance for real galaxy clusters.

    Fits a best-fit line to estimate H₀.

    Returns
    -------
    Plotly Figure
    """
    names = [d[0] for d in HUBBLE_DATA]
    distances = np.array([d[1] for d in HUBBLE_DATA])   # Mpc
    velocities = np.array([d[2] for d in HUBBLE_DATA])  # km/s

    # Least-squares fit for H0
    H0_fit = float(np.sum(distances * velocities) / np.sum(distances ** 2))

    d_fit = np.linspace(0, max(distances) * 1.1, 200)
    v_fit = H0_fit * d_fit

    fig = go.Figure()

    # Data points
    fig.add_trace(
        go.Scatter(
            x=distances,
            y=velocities,
            mode="markers+text",
            name="Galaxy clusters",
            text=names,
            textposition="top right",
            textfont=dict(size=9, color=COLOURS["text"]),
            marker=dict(
                color=COLOURS["primary"],
                size=10,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=1),
            ),
        )
    )

    # Best-fit Hubble line
    fig.add_trace(
        go.Scatter(
            x=d_fit,
            y=v_fit,
            mode="lines",
            name=f"Best fit: H₀ = {H0_fit:.1f} km/s/Mpc",
            line=dict(color=COLOURS["secondary"], width=2, dash="dash"),
        )
    )

    # H0 = 70 reference line
    v_70 = 70.0 * d_fit
    fig.add_trace(
        go.Scatter(
            x=d_fit,
            y=v_70,
            mode="lines",
            name="H₀ = 70 km/s/Mpc (Planck)",
            line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=440,
            title=dict(
                text=f"Hubble's Law: v = H₀ d  (fitted H₀ = {H0_fit:.1f} km/s/Mpc)",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Distance (Mpc)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                rangemode="tozero",
            ),
            yaxis=dict(
                title="Recession velocity (km/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                rangemode="tozero",
            ),
        )
    )
    return fig, H0_fit


# ── Helper: fill-colour from hex (for spectrum traces) ────────────────────────


def _hex_to_rgba(hex_colour: str, alpha: float = 0.15) -> str:
    """Convert #RRGGBB → rgba(r,g,b,alpha) string."""
    h = hex_colour.lstrip("#")
    if len(h) == 6:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return f"rgba({r},{g},{b},{alpha})"
    return f"rgba(128,128,128,{alpha})"


# ── p5.js animation builder ───────────────────────────────────────────────────


def build_doppler_animation(f_s, v_s, v_sound, source_approaching):
    """Build p5.js Doppler wavefront animation."""
    data = json.dumps({
        "fSource": float(f_s),
        "vSource": float(v_s),
        "vSound": float(v_sound),
        "approaching": bool(source_approaching),
        "mach": float(v_s / v_sound)
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>body{{margin:0;overflow:hidden;background:#0e1117;}}</style>
</head><body>
<script>
const D = {data};
let t=0, playing=true, speed=1;
// Each wavefront: {{x: source_x_at_emission, t_emitted: time}}
let wavefronts=[];
let sourceX=0;
let emitInterval=1.0/D.fSource;  // seconds between emissions
let lastEmit=-emitInterval;
const DT=0.016;  // time step per frame (seconds)
const SCALE=40;  // pixels per metre

function setup(){{
  createCanvas(windowWidth||700,420);
  textFont('monospace');
  // Start source from left or right depending on direction
  sourceX = D.approaching ? -width/(2*SCALE) : width/(2*SCALE);
  wavefronts=[];
}}
function windowResized(){{ resizeCanvas(windowWidth,420); }}

function mousePressed(){{
  if(mouseX>width-120&&mouseX<width-10){{
    if(mouseY>10&&mouseY<40) playing=!playing;
    else if(mouseY>50&&mouseY<80){{ resetSim(); }}
    else if(mouseY>90&&mouseY<120) speed=speed===1?2:speed===2?4:1;
  }}
}}

function resetSim(){{
  t=0; wavefronts=[];
  sourceX=D.approaching ? -width/(2*SCALE) : width/(2*SCALE);
  lastEmit=-emitInterval;
  playing=true;
}}

function draw(){{
  background(14,17,23,240);

  let cx=width/2, cy=height/2;

  // Observer (ear icon) at centre
  fill('#fafafa'); noStroke(); textSize(20); textAlign(CENTER);
  text('👂', cx, cy+8);
  textAlign(LEFT);
  noStroke(); fill('#777'); textSize(9);
  text('observer', cx-22, cy+26);

  // Ground line
  stroke('#2a2a2a'); strokeWeight(1);
  line(0, cy+30, width, cy+30);

  // Update simulation
  if(playing){{
    for(let s=0;s<speed;s++){{
      let dt=DT;
      t+=dt;

      // Move source
      let dir=D.approaching ? 1 : -1;
      sourceX+=dir*D.vSource*dt;

      // Emit wavefront
      if(t-lastEmit>=emitInterval){{
        wavefronts.push({{x: sourceX, tEmit: t}});
        lastEmit=t;
      }}

      // Remove old wavefronts (off screen)
      wavefronts=wavefronts.filter(w=>{{
        let r=(t-w.tEmit)*D.vSound*SCALE;
        let sx=cx+w.x*SCALE;
        return r<max(width,height) && sx+r>0 && sx-r<width;
      }});
    }}
  }}

  // Draw wavefronts
  for(let i=0;i<wavefronts.length;i++){{
    let w=wavefronts[i];
    let r=(t-w.tEmit)*D.vSound*SCALE;
    let sx=cx+w.x*SCALE;
    let age=t-w.tEmit;
    let alpha=map(age,0,3,200,20);

    // Colour: ahead (toward observer) blue, behind red
    let toObs=D.approaching; // approaching = wavefronts compressed toward right=observer
    noFill();
    // Use a gradient-like effect: compressed side = blue, stretched = red
    stroke(31,119,180,alpha);
    strokeWeight(1.5);
    circle(sx,cy,r*2);
  }}

  // Source (vehicle/speaker)
  let sxPx=cx+sourceX*SCALE;
  if(sxPx>-30 && sxPx<width+30){{
    noStroke();
    for(let rr=18;rr>0;rr-=4) fill(255,127,14,map(rr,0,18,0,25));
    for(let rr=18;rr>0;rr-=4) circle(sxPx,cy,rr*2);
    fill('#ff7f0e'); stroke('#ffffff'); strokeWeight(1.5);
    circle(sxPx,cy,18);
    // Direction arrow
    fill('#ff7f0e'); noStroke(); textSize(14); textAlign(CENTER);
    text(D.approaching?'→':'←', sxPx, cy-22);
    textAlign(LEFT);
  }}

  // Mach cone (if supersonic)
  if(D.mach>=1.0 && D.mach<10){{
    let halfAngle=asin(1.0/D.mach);
    let coneLen=180;
    stroke(231,76,60,160); strokeWeight(2); setLineDash([8,5]);
    let dir=D.approaching?-1:1;
    line(sxPx,cy, sxPx+dir*coneLen*cos(halfAngle), cy-coneLen*sin(halfAngle));
    line(sxPx,cy, sxPx+dir*coneLen*cos(halfAngle), cy+coneLen*sin(halfAngle));
    setLineDash([]);
    noStroke(); fill('#e74c3c'); textSize(9);
    text('Mach cone α='+degrees(halfAngle).toFixed(1)+'°', sxPx+8, cy-coneLen*sin(halfAngle)-8);
  }}

  // Info panel
  let f_obs=D.vSound/(D.vSound - (D.approaching?D.vSource:-D.vSource))*D.fSource;
  if(D.mach>=1 && D.approaching) f_obs=NaN;
  noStroke(); fill(15,15,25,200); rect(8,8,210,70,6);
  fill('#fafafa'); textSize(10);
  text('f_source = '+D.fSource.toFixed(0)+' Hz', 14, 26);
  text('f_obs = '+(isNaN(f_obs)||!isFinite(f_obs)?'N/A (Mach>1)':f_obs.toFixed(0)+' Hz'), 14, 44);
  text('Mach = '+D.mach.toFixed(2), 14, 62);

  // Controls
  noStroke(); fill(15,15,25,220); rect(width-118,8,110,120,6);
  fill('#fafafa'); textSize(11);
  text(playing?'⏸ Pause':'▶ Play',width-112,28);
  text('↺ Reset',width-112,68);
  text('⚡ '+speed+'x',width-112,108);

  // Reset when source goes off screen
  if(sxPx < -50 || sxPx > width+50) resetSim();
}}

function setLineDash(list){{ drawingContext.setLineDash(list); }}
</script></body></html>"""


# ── Main page ─────────────────────────────────────────────────────────────────


def main() -> None:
    """Render the Doppler Effect simulation page."""

    sim_header("Doppler Effect", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ─────────────────────────────────────────────────────────────────────────
    # LEFT COLUMN — all controls
    # ─────────────────────────────────────────────────────────────────────────

    with left_col:
        mode = mode_toggle()

        st.divider()

        # Tab selector is in right_col — controls are common to selected tab.
        # We use a selectbox in left_col to mirror which tab is active.
        active_tab = st.selectbox(
            "Active simulation",
            ["Sound Doppler", "Wavefront Diagram", "Redshift & Recession"],
            help="Select the sub-simulation to control.",
        )

        st.divider()

        # ── Sound Doppler controls ────────────────────────────────────────────
        if active_tab == "Sound Doppler":
            st.subheader("Source & Observer")

            # Real-world preset
            preset_name = st.selectbox(
                "Real-world preset",
                options=list(PRESETS.keys()),
                index=0,
                help="Load a real-world example, or choose Custom.",
            )
            preset_data = PRESETS[preset_name]
            if preset_data is not None:
                st.info(preset_data["note"])

            st.divider()

            # Determine default values from preset (if any)
            _def_fs = int(preset_data["f_s"]) if preset_data else 700
            _def_vs = int(preset_data["v_s"]) if preset_data else 30
            _def_vo = int(preset_data.get("v_o", 0)) if preset_data else 0
            _def_app = bool(preset_data.get("approaching", True)) if preset_data else True

            f_s = st.slider(
                "Source frequency f_s (Hz)",
                min_value=100,
                max_value=40000,
                value=_def_fs,
                step=50,
                help="Frequency emitted by the source at rest.",
                disabled=(preset_data is not None),
            )

            v_s = st.slider(
                "Source speed v_s (m/s)",
                min_value=0,
                max_value=600,
                value=_def_vs,
                step=1,
                help="Speed of the sound source.",
                disabled=(preset_data is not None),
            )

            v_o = st.slider(
                "Observer speed v_o (m/s)",
                min_value=0,
                max_value=100,
                value=_def_vo,
                step=1,
                help="Speed of the observer.",
                disabled=(preset_data is not None),
            )

            st.markdown("**Directions**")
            source_approaching = st.checkbox(
                "Source approaching observer",
                value=_def_app,
                help=(
                    "Checked: source moves toward observer (higher pitch). "
                    "Unchecked: source moves away (lower pitch)."
                ),
                disabled=(preset_data is not None),
            )
            observer_approaching = st.checkbox(
                "Observer approaching source",
                value=False,
                help=(
                    "Checked: observer moves toward source. "
                    "Unchecked: observer moves away."
                ),
                disabled=(preset_data is not None),
            )

            if preset_data is not None:
                source_approaching = _def_app

        # ── Wavefront Diagram controls ────────────────────────────────────────
        elif active_tab == "Wavefront Diagram":
            st.subheader("Wavefront Parameters")

            mach_slider = st.slider(
                "Mach number M = v_s / v_sound",
                min_value=0.0,
                max_value=2.0,
                value=0.5,
                step=0.05,
                help=(
                    "0 = stationary source. "
                    "1 = Mach 1 (sound barrier). "
                    ">1 = supersonic."
                ),
            )

            n_circles_wd = st.slider(
                "Number of wavefronts to show",
                min_value=3,
                max_value=8,
                value=5,
                step=1,
            )

        # ── Redshift controls ─────────────────────────────────────────────────
        else:
            st.subheader("Spectral Line & Recession")

            galaxy_name = st.selectbox(
                "Galaxy preset",
                options=list(GALAXIES.keys()),
                index=0,
                help="Choose a galaxy/cluster or set custom values.",
            )
            galaxy_data = GALAXIES[galaxy_name]
            if galaxy_data is not None:
                st.info(galaxy_data["note"])

            st.divider()

            _def_lam = 656
            _def_beta = float(galaxy_data["beta"]) if galaxy_data else 0.01

            lam_source_nm = st.slider(
                "Rest wavelength λ_source (nm)",
                min_value=400,
                max_value=700,
                value=_def_lam,
                step=1,
                help=(
                    "Wavelength of the spectral line in the galaxy's rest frame. "
                    "656 nm = Hα (hydrogen, most common)."
                ),
                disabled=(galaxy_data is not None),
            )

            beta_raw = st.slider(
                "Recession speed β = v/c",
                min_value=-0.10,
                max_value=0.95,
                value=float(np.clip(_def_beta, -0.10, 0.95)),
                step=0.001,
                format="%.3f",
                help=(
                    "Fraction of speed of light. Positive = recession (redshift). "
                    "Negative = approach (blueshift). Use ±0.001 increments for fine control."
                ),
                disabled=(galaxy_data is not None),
            )

            if galaxy_data is not None:
                beta = float(galaxy_data["beta"])
            else:
                beta = beta_raw

        # ── Advanced controls ─────────────────────────────────────────────────
        if mode == "Advanced":
            advanced_divider()

            if active_tab == "Sound Doppler":
                st.markdown("**Advanced Sound Options**")
                show_mach_warning_adv = st.checkbox(
                    "Annotate Mach zones on wavefront",
                    value=True,
                    help="Show subsonic / transonic / supersonic annotations.",
                )
                n_circles_adv = st.slider(
                    "Wavefronts to draw (wavefront panel)",
                    min_value=3,
                    max_value=8,
                    value=5,
                    key="n_circles_sound_adv",
                )
            elif active_tab == "Wavefront Diagram":
                st.markdown("**Advanced Wavefront Options**")
                show_cone_angle_adv = st.checkbox(
                    "Show half-angle annotation",
                    value=True,
                )
            else:
                st.markdown("**Advanced Redshift Options**")
                show_hubble_plot = st.checkbox(
                    "Show Hubble's Law plot",
                    value=False,
                    help="Display recession velocity vs distance for real galaxy clusters.",
                )

    # ─────────────────────────────────────────────────────────────────────────
    # RIGHT COLUMN — plots and metrics
    # ─────────────────────────────────────────────────────────────────────────

    with right_col:

        tab1, tab2, tab3 = st.tabs(
            ["Sound Doppler", "Wavefront Diagram", "Redshift & Recession"]
        )

        # ── TAB 1: Sound Doppler ──────────────────────────────────────────────
        with tab1:

            if active_tab == "Sound Doppler":
                # Compute Doppler quantities
                doppler = compute_doppler_sound(
                    f_s=f_s,
                    v_s=v_s,
                    v_o=v_o,
                    source_approaching=source_approaching,
                    observer_approaching=observer_approaching,
                )

                f_obs = doppler["f_obs"]
                delta_f = doppler["delta_f"]
                lambda_ahead = doppler["lambda_ahead"]
                lambda_behind = doppler["lambda_behind"]
                mach = doppler["mach"]

                # Mach warning
                if mach >= 1.0:
                    st.warning(
                        f"Source at/beyond Mach 1 — shock wave formed! "
                        f"Mach number = {mach:.2f}. "
                        f"Normal Doppler formula breaks down; f_obs → ∞ at Mach 1."
                    )
                elif mach > 0.9:
                    st.warning(
                        f"Source approaching Mach 1 — transonic regime. "
                        f"Mach = {mach:.2f}."
                    )

                # Metrics row
                if np.isfinite(f_obs) and f_obs > 0:
                    metric_row({
                        "f_obs (Hz)": f"{f_obs:.1f}",
                        "Δf (Hz)": f"{delta_f:+.1f}",
                        "λ_ahead (m)": f"{lambda_ahead:.4f}",
                        "λ_behind (m)": f"{lambda_behind:.4f}",
                    })
                elif not np.isfinite(f_obs):
                    st.error(
                        "f_obs is infinite — source exactly at Mach 1. "
                        "Reduce v_s slightly."
                    )
                else:
                    # Supersonic approaching: formula returns negative — physically invalid
                    st.error(
                        "Formula invalid for supersonic source (Mach > 1) approaching observer. "
                        "The observer is inside the Mach cone and has not yet heard the source."
                    )

                st.divider()

                # Animated p5.js wavefront simulation
                anim_html = build_doppler_animation(f_s, v_s, V_SOUND, source_approaching)
                components.html(anim_html, height=430)
                st.caption("Real-time wavefront simulation · ▶ Play/Pause · ↺ Reset · ⚡ Speed")
                st.divider()

                # Determine n_circles for wavefront figure
                _n_c = n_circles_adv if mode == "Advanced" else 5

                # Wavefront circles figure
                st.markdown("#### Wavefront Diagram")
                fig_wf = build_wavefront_circles_fig(f_s=f_s, v_s=v_s, n_circles=_n_c)
                st.plotly_chart(fig_wf, use_container_width=True)

                # Frequency-vs-time figure
                st.markdown("#### Frequency vs Time (Source Passing Observer)")
                fig_ft = build_frequency_time_fig(
                    f_s=f_s,
                    v_s=v_s,
                    v_o=v_o,
                    observer_approaching=observer_approaching,
                )
                st.plotly_chart(fig_ft, use_container_width=True)

                # Formula breakdown
                v_s_signed_disp = v_s if source_approaching else -v_s
                v_o_signed_disp = v_o if observer_approaching else -v_o
                st.caption(
                    f"Formula: f_obs = {f_s} × (343 + {v_o_signed_disp}) "
                    f"/ (343 − {v_s_signed_disp}) = "
                    + (f"{f_obs:.2f} Hz" if np.isfinite(f_obs) else "∞ Hz")
                )

            else:
                st.info(
                    "Select **Sound Doppler** in the left panel to activate this tab."
                )

        # ── TAB 2: Wavefront Diagram ──────────────────────────────────────────
        with tab2:

            if active_tab == "Wavefront Diagram":
                v_s_wd = mach_slider * V_SOUND

                # Classification
                if mach_slider < 0.99:
                    classification = "Subsonic"
                    cone_angle_str = "N/A (subsonic)"
                elif mach_slider < 1.01:
                    classification = "Transonic (Mach 1)"
                    cone_angle_str = "90° (wavefronts stack at source)"
                else:
                    half_alpha_deg = np.degrees(np.arcsin(1.0 / mach_slider))
                    classification = "Supersonic"
                    cone_angle_str = f"{half_alpha_deg:.1f}°"

                # Metrics
                metric_row({
                    "Mach number": f"{mach_slider:.2f}",
                    "Cone half-angle α": cone_angle_str,
                    "Regime": classification,
                })

                # Info about sound barrier
                if mach_slider < 0.8:
                    st.info(
                        "In subsonic flight, wavefronts spread out ahead of the source. "
                        "The source frequency is higher ahead (compressed waves) and "
                        "lower behind (stretched waves)."
                    )
                elif mach_slider < 1.05:
                    st.warning(
                        "Near Mach 1, wavefronts pile up in front of the source creating "
                        "a region of very high pressure — the **sound barrier**. "
                        "Early jet aircraft experienced severe control problems here. "
                        "Chuck Yeager broke the sound barrier on 14 October 1947 in the "
                        "Bell X-1."
                    )
                else:
                    st.error(
                        "Supersonic flight. The aircraft has outrun its own sound. "
                        "A **Mach cone** forms with half-angle "
                        r"sin α = v_sound / v_source = 1/M. "
                        "Observers on the ground hear a **sonic boom** as the cone "
                        "sweeps past them — not just at the moment of breaking the barrier."
                    )

                fig_mach = build_mach_diagram_fig(
                    mach_number=mach_slider,
                    n_circles=n_circles_wd,
                )
                st.plotly_chart(fig_mach, use_container_width=True)

                if mode == "Advanced" and mach_slider > 1.0:
                    half_alpha_rad = np.arcsin(1.0 / mach_slider)
                    half_alpha_deg = np.degrees(half_alpha_rad)
                    st.markdown(
                        f"**Mach cone geometry:**  \n"
                        f"sin α = v_sound / v_source = {V_SOUND:.0f} / "
                        f"{v_s_wd:.1f} = {1.0/mach_slider:.4f}  \n"
                        f"Half-angle α = {half_alpha_deg:.2f}°  \n"
                        f"Full cone angle = {2*half_alpha_deg:.2f}°"
                    )

            else:
                st.info(
                    "Select **Wavefront Diagram** in the left panel to activate this tab."
                )

        # ── TAB 3: Redshift & Recession ───────────────────────────────────────
        with tab3:

            if active_tab == "Redshift & Recession":
                red = compute_redshift(lam_source_nm, beta)

                lam_obs_nm = red["lam_obs_nm"]
                z = red["z"]
                col_src = red["colour_source"]
                col_obs = red["colour_obs"]

                # Metrics
                recession_v_kms = abs(beta) * c_light / 1e3
                metric_row({
                    "λ_obs (nm)": f"{lam_obs_nm:.1f}",
                    "Redshift z": f"{z:.4f}",
                    "Recession v": f"{recession_v_kms:.0f} km/s",
                })

                # Colour swatches
                col_a, col_b = st.columns(2)
                with col_a:
                    st.markdown(
                        colour_swatch_html(col_src, f"Rest λ = {lam_source_nm} nm"),
                        unsafe_allow_html=True,
                    )
                with col_b:
                    obs_label = f"Obs λ = {lam_obs_nm:.1f} nm"
                    if lam_obs_nm > 700:
                        obs_label += " (infrared)"
                    elif lam_obs_nm < 380:
                        obs_label += " (ultraviolet)"
                    st.markdown(
                        colour_swatch_html(col_obs, obs_label),
                        unsafe_allow_html=True,
                    )

                # Blueshift / Redshift label
                if beta < -0.0005:
                    st.success(
                        f"Blueshift — galaxy approaching at {recession_v_kms:.0f} km/s "
                        f"(z = {z:.4f})"
                    )
                elif beta > 0.0005:
                    st.warning(
                        f"Redshift — galaxy receding at {recession_v_kms:.0f} km/s "
                        f"(z = {z:.4f})"
                    )
                else:
                    st.info("No Doppler shift — source stationary relative to observer.")

                # Spectrum figure
                fig_spec = build_spectrum_fig(
                    lam_source_nm=lam_source_nm,
                    lam_obs_nm=lam_obs_nm,
                    colour_source=col_src,
                    colour_obs=col_obs,
                )
                st.plotly_chart(fig_spec, use_container_width=True)

                # Fix fill colour using proper rgba (rebuild trace fill)
                # (The figure is already built — no need to patch, the fill is set correctly above)

                st.info(
                    "The redshift of distant galaxies is evidence for the Big Bang — "
                    "all galaxies are moving away from us, faster the further they are. "
                    "This is **Hubble's Law**: v = H₀ d. "
                    "The current best estimate is H₀ ≈ 70 km/s/Mpc "
                    "(Planck satellite, 2018)."
                )

                # Hubble distance estimate
                if beta > 0.0005:
                    hubble_H0 = 70.0   # km/s/Mpc
                    dist_Mpc = recession_v_kms / hubble_H0
                    dist_Mly = dist_Mpc * 3.26   # Mly per Mpc
                    st.caption(
                        f"Using Hubble's Law with H₀ = 70 km/s/Mpc: "
                        f"estimated distance ≈ {dist_Mpc:.1f} Mpc "
                        f"≈ {dist_Mly:.0f} million light-years."
                    )

                # Advanced: Hubble's law plot
                if mode == "Advanced" and show_hubble_plot:
                    st.markdown("---")
                    st.markdown("#### Hubble's Law — Real Galaxy Data")
                    fig_hub, H0_fit = build_hubble_fig()
                    st.plotly_chart(fig_hub, use_container_width=True)

                    metric_row({
                        "Fitted H₀": f"{H0_fit:.1f} km/s/Mpc",
                        "Planck H₀": "67.4 km/s/Mpc",
                        "SH0ES H₀": "73.0 km/s/Mpc",
                    })

                    st.markdown(
                        "The tension between the CMB-based (Planck) and local-distance "
                        "ladder (SH0ES) values of H₀ is one of the key unsolved problems "
                        "in modern cosmology — the **Hubble tension**."
                    )

            else:
                st.info(
                    "Select **Redshift & Recession** in the left panel to activate this tab."
                )

        # ── Physics notes (shown for all tabs) ───────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=EQUATIONS,
            explanation=EXPLANATION,
            advanced_text=ADVANCED_TEXT,
            mode=mode,
        )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
