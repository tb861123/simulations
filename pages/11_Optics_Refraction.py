"""
Optics: Refraction, Dispersion & Lenses — WJEC Eduqas A Level Physics.

Component 3, Topic 9 (Wave Properties of Light), sections (a)–(k).

Covers:
  Sub-sim 1: Snell's Law & Total Internal Reflection
  Sub-sim 2: Prism Dispersion (Cauchy's equation)
  Sub-sim 3: Converging Lens — principal ray diagram
"""

from __future__ import annotations

import numpy as np
import plotly.graph_objects as go
import streamlit as st

from utils.style import COLOURS, make_fig, plotly_layout
from utils.ui_components import (
    advanced_divider,
    metric_row,
    mode_toggle,
    physics_notes,
    sim_header,
    two_column_layout,
)

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Optics: Refraction — WJEC A Level Physics",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 9 (Wave Properties of Light)"

EQUATIONS = [
    r"n_1 \sin\theta_1 = n_2 \sin\theta_2 \quad \text{(Snell's Law)}",
    r"\sin\theta_c = \frac{n_2}{n_1} \quad (n_1 > n_2)",
    r"n(\lambda) = A + \frac{B}{\lambda^2} \quad \text{(Cauchy's equation)}",
    r"\frac{1}{f} = \frac{1}{v} - \frac{1}{u} \quad \text{(lens equation, real-is-positive)}",
    r"m = -\frac{v}{u} \quad \text{(linear magnification, real-is-positive)}",
]

EXPLANATION = (
    "**Refraction** occurs when light crosses a boundary between two media with "
    "different refractive indices. The speed of light changes, causing the ray to bend. "
    "Snell's law $n_1\\sin\\theta_1 = n_2\\sin\\theta_2$ quantifies this bending. "
    "When light travels from a denser into a less dense medium ($n_1 > n_2$), "
    "**Total Internal Reflection (TIR)** occurs for angles at or beyond the critical "
    "angle $\\theta_c = \\arcsin(n_2/n_1)$. TIR is exploited in optical fibres and "
    "diamond cutting. **Dispersion** arises because the refractive index depends on "
    "wavelength — shorter wavelengths refract more, so a prism splits white light into "
    "a spectrum. **Converging lenses** obey the lens equation $1/f = 1/v - 1/u$ "
    "(real-is-positive convention). A real, inverted image forms when $u > f$; a "
    "virtual upright image forms when $u < f$ (magnifying glass effect). Magnification "
    "$m = -v/u$ (real-is-positive) gives image size relative to object size; "
    "negative m means an inverted image."
)

ADVANCED_TEXT = (
    "**Fermat's Principle** states that light travels along the path that takes the "
    "least time (or, more precisely, a stationary — often minimum — time). Snell's law "
    "is a direct consequence: at the interface, the variation of travel time with ray "
    "position is zero only when $n_1\\sin\\theta_1 = n_2\\sin\\theta_2$.\n\n"
    "**Chromatic aberration** in lenses occurs because the focal length depends on $n$, "
    "which varies with wavelength. A single lens brings blue and red light to different "
    "focal points. Achromatic doublets (two lenses of different glass types cemented "
    "together) are designed so the dispersions cancel while retaining net refraction.\n\n"
    "**Fibre optic bandwidth** is limited by *modal dispersion* (different ray paths "
    "arrive at different times) and *chromatic dispersion* (different wavelengths travel "
    "at different speeds). Single-mode fibres eliminate modal dispersion by restricting "
    "the core diameter to ~8 μm so only one propagation mode exists. Modern fibres "
    "achieve bandwidths exceeding 100 Tbit/s over thousands of kilometres."
)

# Cauchy coefficients: (A, B_nm2) — B is in nm² to match wavelength in nm
CAUCHY_MATERIALS: dict[str, tuple[float, float]] = {
    "Crown glass": (1.507, 4200.0),
    "Flint glass":  (1.590, 8400.0),
    "Diamond":      (2.390, 22000.0),
}

# Material preset data: (n1, n2, context_text)
MATERIAL_PRESETS: dict[str, tuple[float, float, str]] = {
    "Custom": (1.0, 1.5, ""),
    "Air → Water": (
        1.0, 1.33,
        "Swimming pools appear shallower than they are because refraction bends "
        "light upward at the water surface, making objects appear closer to the "
        "surface. The refractive index of water is ~1.33.",
    ),
    "Air → Glass": (
        1.0, 1.50,
        "Standard borosilicate glass has n ≈ 1.50. Camera lenses use multiple "
        "glass elements to correct aberrations while keeping the overall image sharp.",
    ),
    "Water → Glass": (
        1.33, 1.50,
        "Light moving from water into glass bends toward the normal, but less "
        "dramatically than air-to-glass since the index difference is smaller.",
    ),
    "Air → Diamond": (
        1.0, 2.42,
        "Diamond's very high refractive index (n = 2.42) means most light "
        "entering the gem undergoes TIR multiple times inside — this is why "
        "diamonds sparkle so brilliantly.",
    ),
    "Glass → Air": (
        1.50, 1.0,
        "Optical fibres exploit TIR at the glass–air interface. Light entering "
        "at a shallow angle is totally internally reflected and travels along "
        "the fibre with minimal loss. Critical angle ≈ 41.8°.",
    ),
    "Diamond → Air": (
        2.42, 1.0,
        "Diamond has a critical angle of only ~24.4°! The gem is cut so that "
        "most light rays inside strike faces beyond the critical angle, "
        "bouncing around inside before exiting dramatically through the top.",
    ),
}

# Lens real-world presets: (label, f_cm, u_cm, context)
LENS_PRESETS: dict[str, tuple[float, float, str]] = {
    "Custom": (15.0, 30.0, ""),
    "Magnifying glass (f = 10 cm)": (
        10.0, 8.0,
        "A magnifying glass is a converging lens used with the object inside "
        "the focal length. The virtual, upright, magnified image appears on "
        "the same side as the object. Typical magnification: ×2 to ×4.",
    ),
    "Camera lens (f = 35 mm)": (
        3.5, 50.0,
        "A 35 mm prime lens is a classic 'normal' lens for film photography — "
        "its angle of view matches human vision closely. At 50 cm object "
        "distance the image distance is just over 3.5 cm behind the lens.",
    ),
    "Human eye (f ≈ 17 mm)": (
        1.7, 25.0,
        "The eye's lens has a focal length of ~17 mm when relaxed (focusing "
        "at infinity). The retina sits ~17 mm behind the lens — a real, "
        "inverted image forms on it. The brain flips it back upright!",
    ),
    "Projector lens (f = 20 cm)": (
        20.0, 22.0,
        "A projector places the film/slide just outside the focal length. "
        "The screen is far away, producing a greatly magnified real image. "
        "Note the image is inverted — slides must be loaded upside-down!",
    ),
}


# ── Physics helpers ───────────────────────────────────────────────────────────


def wavelength_to_rgb(wl: float) -> str:
    """
    Convert a wavelength in nm to an rgb() CSS colour string.

    Parameters
    ----------
    wl : wavelength in nanometres (380–700)

    Returns
    -------
    CSS colour string, e.g. 'rgb(255,128,0)'
    """
    if wl < 440:
        r, g, b = (440 - wl) / 60, 0.0, 1.0
    elif wl < 490:
        r, g, b = 0.0, (wl - 440) / 50, 1.0
    elif wl < 510:
        r, g, b = 0.0, 1.0, (510 - wl) / 20
    elif wl < 580:
        r, g, b = (wl - 510) / 70, 1.0, 0.0
    elif wl < 645:
        r, g, b = 1.0, (645 - wl) / 65, 0.0
    else:
        r, g, b = 1.0, 0.0, 0.0
    r = min(1.0, max(0.0, r))
    g = min(1.0, max(0.0, g))
    b = min(1.0, max(0.0, b))
    return f"rgb({int(r * 255)},{int(g * 255)},{int(b * 255)})"


@st.cache_data
def cauchy_n(material: str, wl_nm: float) -> float:
    """
    Compute refractive index via Cauchy's equation n = A + B/λ².

    Parameters
    ----------
    material : one of the keys in CAUCHY_MATERIALS
    wl_nm    : wavelength in nanometres

    Returns
    -------
    refractive index (dimensionless)
    """
    A, B = CAUCHY_MATERIALS[material]
    return A + B / (wl_nm ** 2)


@st.cache_data
def snells_law(theta1_deg: float, n1: float, n2: float) -> tuple[float | None, bool, float | None]:
    """
    Apply Snell's law.

    Parameters
    ----------
    theta1_deg : angle of incidence (degrees, measured from normal)
    n1         : refractive index of incident medium
    n2         : refractive index of refracted medium

    Returns
    -------
    theta2_deg    : refracted angle in degrees, or None if TIR
    tir           : True if total internal reflection occurs
    critical_deg  : critical angle in degrees (only if n1 > n2, else None)
    """
    theta1 = np.radians(theta1_deg)
    sin_theta2 = n1 * np.sin(theta1) / n2
    critical_deg: float | None = None
    if n1 > n2:
        critical_deg = float(np.degrees(np.arcsin(n2 / n1)))
    if abs(sin_theta2) > 1.0:
        return None, True, critical_deg
    theta2_deg = float(np.degrees(np.arcsin(sin_theta2)))
    return theta2_deg, False, critical_deg


@st.cache_data
def prism_exit_angle(
    theta_inc_deg: float,
    apex_deg: float,
    n: float,
) -> float | None:
    """
    Compute the exit angle from the second face of a symmetric prism.

    Parameters
    ----------
    theta_inc_deg : angle of incidence on first prism face (degrees)
    apex_deg      : prism apex angle A (degrees)
    n             : refractive index of prism material

    Returns
    -------
    exit angle (degrees from second face normal), or None if TIR at second face
    """
    theta1 = np.radians(theta_inc_deg)
    sin_r1 = np.sin(theta1) / n
    if abs(sin_r1) > 1.0:
        return None
    r1 = np.arcsin(sin_r1)
    r2 = np.radians(apex_deg) - r1
    sin_exit = n * np.sin(r2)
    if abs(sin_exit) > 1.0:
        return None
    return float(np.degrees(np.arcsin(sin_exit)))


@st.cache_data
def lens_image(f_cm: float, u_cm: float) -> tuple[float, float, str, str]:
    """
    Compute image properties using the lens equation (real-is-positive convention).

    Object is placed at positive distance u_cm to the left of the lens.
    The lens equation used: 1/v = 1/f - 1/(-u) = 1/f + 1/u ...
    Actually uses the standard form 1/f = 1/v + 1/u where u is negative
    for an object on the left, but we receive u_cm as the *magnitude* of
    the object distance and then u_signed = -u_cm.

    With real-is-positive convention for a converging lens:
      1/v = 1/f - 1/|u| where |u| = u_cm.
    This matches: v = f*u / (u - f) for u = u_cm (both positive magnitudes).

    Parameters
    ----------
    f_cm : focal length (cm, positive for converging lens)
    u_cm : object distance (cm, positive value; object is to the left of lens)

    Returns
    -------
    v_cm        : image distance (cm; positive = real image on right, negative = virtual)
    mag         : linear magnification (positive = upright, negative = inverted)
    image_type  : 'Real' or 'Virtual'
    orientation : 'Inverted' or 'Upright'
    """
    if abs(u_cm - f_cm) < 0.01:
        # Object at focal point — image at infinity
        return float("inf"), float("inf"), "At infinity", "N/A"
    v_cm = (f_cm * u_cm) / (u_cm - f_cm)
    # Real-is-positive convention: m = -v/u (negative = inverted for real images)
    mag = -v_cm / u_cm
    image_type = "Real" if v_cm > 0 else "Virtual"
    orientation = "Inverted" if mag < 0 else "Upright"
    return float(v_cm), float(mag), image_type, orientation


# ── Plot builders — Snell's Law ray diagram ───────────────────────────────────


def build_snells_fig(
    theta1_deg: float,
    n1: float,
    n2: float,
    theta2_deg: float | None,
    tir: bool,
) -> go.Figure:
    """
    Build a Plotly ray diagram for Snell's law / TIR.

    Parameters
    ----------
    theta1_deg : angle of incidence (degrees from normal)
    n1         : refractive index of medium 1 (above interface)
    n2         : refractive index of medium 2 (below interface)
    theta2_deg : refracted angle in degrees, or None if TIR
    tir        : True if total internal reflection

    Returns
    -------
    Plotly Figure
    """
    fig = make_fig()

    # Interface at y = 0
    fig.add_shape(
        type="line",
        x0=-2.0, y0=0, x1=2.0, y1=0,
        line=dict(color=COLOURS["text"], width=2),
    )

    # Normal (dashed vertical line)
    fig.add_shape(
        type="line",
        x0=0, y0=-1.8, x1=0, y1=1.8,
        line=dict(color=COLOURS["grid"], width=1.5, dash="dash"),
    )

    # Medium labels
    fig.add_annotation(
        x=-1.7, y=1.5,
        text=f"<b>Medium 1</b><br>n₁ = {n1:.3f}",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=11),
        bgcolor="rgba(0,0,0,0.5)",
    )
    fig.add_annotation(
        x=-1.7, y=-1.5,
        text=f"<b>Medium 2</b><br>n₂ = {n2:.3f}",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=11),
        bgcolor="rgba(0,0,0,0.5)",
    )

    # Incident ray: from top-left to origin
    t1 = np.radians(theta1_deg)
    inc_x = -np.sin(t1)
    inc_y = np.cos(t1)
    # Ray goes from (inc_x, inc_y) * 1.6 to origin with arrowhead
    fig.add_annotation(
        x=0.0, y=0.0,
        ax=inc_x * 1.6, ay=inc_y * 1.6,
        xref="x", yref="y", axref="x", ayref="y",
        text="",
        arrowhead=2,
        arrowsize=1.2,
        arrowwidth=2.5,
        arrowcolor=COLOURS["primary"],
    )
    fig.add_trace(
        go.Scatter(
            x=[inc_x * 1.6, 0.0],
            y=[inc_y * 1.6, 0.0],
            mode="lines",
            name=f"Incident ray (θ₁ = {theta1_deg:.1f}°)",
            line=dict(color=COLOURS["primary"], width=2.5),
            showlegend=True,
        )
    )

    if tir:
        # Reflected ray (angle of incidence = angle of reflection)
        ref_x = np.sin(t1)
        ref_y = np.cos(t1)
        fig.add_annotation(
            x=ref_x * 1.6, y=ref_y * 1.6,
            ax=0.0, ay=0.0,
            xref="x", yref="y", axref="x", ayref="y",
            text="",
            arrowhead=2,
            arrowsize=1.2,
            arrowwidth=2.5,
            arrowcolor=COLOURS["highlight"],
        )
        fig.add_trace(
            go.Scatter(
                x=[0.0, ref_x * 1.6],
                y=[0.0, ref_y * 1.6],
                mode="lines",
                name="Reflected ray (TIR)",
                line=dict(color=COLOURS["highlight"], width=2.5),
                showlegend=True,
            )
        )
        # Evanescent wave hint — faint dashed line along interface
        fig.add_trace(
            go.Scatter(
                x=[0.0, 1.8],
                y=[0.0, 0.0],
                mode="lines",
                name="Evanescent wave direction",
                line=dict(color=COLOURS["secondary"], width=1.5, dash="dot"),
                showlegend=True,
            )
        )
    else:
        # Refracted ray: below interface
        if theta2_deg is not None:
            t2 = np.radians(theta2_deg)
            ref_x2 = np.sin(t2)
            ref_y2 = -np.cos(t2)
            fig.add_annotation(
                x=ref_x2 * 1.6, y=ref_y2 * 1.6,
                ax=0.0, ay=0.0,
                xref="x", yref="y", axref="x", ayref="y",
                text="",
                arrowhead=2,
                arrowsize=1.2,
                arrowwidth=2.5,
                arrowcolor=COLOURS["secondary"],
            )
            fig.add_trace(
                go.Scatter(
                    x=[0.0, ref_x2 * 1.6],
                    y=[0.0, ref_y2 * 1.6],
                    mode="lines",
                    name=f"Refracted ray (θ₂ = {theta2_deg:.1f}°)",
                    line=dict(color=COLOURS["secondary"], width=2.5),
                    showlegend=True,
                )
            )

    # Angle arc annotations (theta1)
    if theta1_deg > 2:
        arc_t = np.linspace(np.pi / 2, np.pi / 2 + t1, 30)
        arc_r = 0.55
        fig.add_trace(
            go.Scatter(
                x=arc_r * np.cos(arc_t),
                y=arc_r * np.sin(arc_t),
                mode="lines",
                line=dict(color=COLOURS["primary"], width=1, dash="dot"),
                showlegend=False,
                hoverinfo="skip",
            )
        )
        mid_arc = np.pi / 2 + t1 / 2
        fig.add_annotation(
            x=0.72 * np.cos(mid_arc),
            y=0.72 * np.sin(mid_arc),
            text=f"θ₁={theta1_deg:.0f}°",
            showarrow=False,
            font=dict(color=COLOURS["primary"], size=10),
        )

    # Angle arc (theta2) if not TIR
    if not tir and theta2_deg is not None and theta2_deg > 2:
        t2 = np.radians(theta2_deg)
        arc_t2 = np.linspace(3 * np.pi / 2, 3 * np.pi / 2 + t2, 30)
        arc_r2 = 0.55
        fig.add_trace(
            go.Scatter(
                x=arc_r2 * np.cos(arc_t2),
                y=arc_r2 * np.sin(arc_t2),
                mode="lines",
                line=dict(color=COLOURS["secondary"], width=1, dash="dot"),
                showlegend=False,
                hoverinfo="skip",
            )
        )
        mid_arc2 = 3 * np.pi / 2 + t2 / 2
        fig.add_annotation(
            x=0.72 * np.cos(mid_arc2),
            y=0.72 * np.sin(mid_arc2),
            text=f"θ₂={theta2_deg:.0f}°",
            showarrow=False,
            font=dict(color=COLOURS["secondary"], size=10),
        )

    title_str = "Total Internal Reflection" if tir else "Refraction at a Boundary"
    fig.update_layout(
        **plotly_layout(
            height=480,
            title=dict(text=title_str, font=dict(size=14)),
            xaxis=dict(
                range=[-2.1, 2.1],
                title="",
                showgrid=False,
                zeroline=False,
                showticklabels=False,
            ),
            yaxis=dict(
                range=[-2.0, 2.0],
                title="",
                showgrid=False,
                zeroline=False,
                showticklabels=False,
                scaleanchor="x",
                scaleratio=1,
            ),
            showlegend=True,
        )
    )
    return fig


# ── Plot builders — Prism dispersion ─────────────────────────────────────────


def build_prism_fig(
    theta_inc_deg: float,
    apex_deg: float,
    material: str,
) -> go.Figure:
    """
    Build a Plotly figure showing a prism dispersing white light into a spectrum.

    Parameters
    ----------
    theta_inc_deg : angle of incidence on first prism face (degrees)
    apex_deg      : prism apex angle A (degrees)
    material      : one of the CAUCHY_MATERIALS keys

    Returns
    -------
    Plotly Figure
    """
    wavelengths = np.linspace(380, 700, 7)

    fig = make_fig()

    # Prism geometry — equilateral-style pointing right, apex at right
    # We draw a simplified schematic: prism as filled triangle, rays as lines
    half_base = 1.2
    prism_x = [0.0, 0.0, 2.0, 0.0]
    prism_y = [-half_base, half_base, 0.0, -half_base]

    fig.add_trace(
        go.Scatter(
            x=prism_x, y=prism_y,
            mode="lines",
            fill="toself",
            fillcolor="rgba(100,160,220,0.18)",
            line=dict(color=COLOURS["quaternary"], width=2),
            name="Prism",
            showlegend=True,
            hoverinfo="skip",
        )
    )

    # Entry face is the left vertical side (x=0, y from -half_base to +half_base)
    # Incident ray hits entry face near centre
    entry_y = 0.0
    entry_x = 0.0

    # Normal to left face points in -x direction; incidence is from left
    t_inc = np.radians(theta_inc_deg)

    # White ray incoming (before prism entry) — draw once in white/grey
    incoming_length = 1.2
    inc_start_x = entry_x - incoming_length * np.cos(t_inc)
    inc_start_y = entry_y + incoming_length * np.sin(t_inc)

    fig.add_trace(
        go.Scatter(
            x=[inc_start_x, entry_x],
            y=[inc_start_y, entry_y],
            mode="lines",
            name="Incident white light",
            line=dict(color=COLOURS["text"], width=3),
            showlegend=True,
        )
    )

    exit_angles_list = []
    valid_wls = []

    for wl in wavelengths:
        n_wl = cauchy_n(material, wl)
        exit_ang = prism_exit_angle(theta_inc_deg, apex_deg, n_wl)
        if exit_ang is None:
            continue
        exit_angles_list.append(exit_ang)
        valid_wls.append(wl)

    if not exit_angles_list:
        fig.add_annotation(
            x=1.0, y=0.0,
            text="TIR — no exit rays for these parameters",
            showarrow=False,
            font=dict(color=COLOURS["highlight"], size=13),
        )
        fig.update_layout(**plotly_layout(height=500, title=dict(text="Prism Dispersion", font=dict(size=14))))
        return fig

    # Compute refracted ray inside prism to find exit point on right face
    # Right face goes from (0, half_base) to (2, 0) and (0, -half_base) to (2, 0)
    # We approximate exit from the right inclined face
    # Internal ray direction after refraction at entry face:
    for wl, exit_ang in zip(valid_wls, exit_angles_list):
        n_wl = cauchy_n(material, wl)
        colour = wavelength_to_rgb(wl)

        # Refracted angle inside prism at entry face
        sin_r1 = np.sin(t_inc) / n_wl
        if abs(sin_r1) > 1.0:
            continue
        r1 = np.arcsin(sin_r1)

        # Ray inside prism travels at angle r1 from normal to entry face (+x direction)
        # Direction vector inside: (cos(r1), -sin(r1)) — going right and slightly down
        # Find intersection with right inclined face
        # Right face: line from (0, half_base) to (2, 0): param eqn
        #   P = (0, half_base) + s * (2, -half_base)   for s in [0,1]
        # Internal ray: P = (0, 0) + t * (cos(r1), -sin(r1))
        # Solve: t*cos(r1) = 2s, t*(-sin(r1)) = half_base - half_base*s
        # From first: s = t*cos(r1)/2
        # Substitute: t*(-sin(r1)) = half_base - half_base * t*cos(r1)/2
        # t * (-sin(r1) + half_base*cos(r1)/2) = half_base
        denom_t = -np.sin(r1) + half_base * np.cos(r1) / 2.0
        if abs(denom_t) < 1e-9:
            continue
        t_param = half_base / denom_t
        if t_param < 0:
            # Try lower face: from (0, -half_base) to (2, 0)
            # P = (0, -half_base) + s*(2, half_base) for s in [0,1]
            # t*(-sin(r1)) = -half_base + half_base*s
            # s = t*cos(r1)/2 again
            # t*(-sin(r1)) = -half_base + half_base*t*cos(r1)/2
            denom_t2 = -np.sin(r1) - half_base * np.cos(r1) / 2.0
            if abs(denom_t2) < 1e-9:
                continue
            t_param = -half_base / denom_t2
            if t_param < 0:
                continue

        exit_point_x = t_param * np.cos(r1)
        exit_point_y = t_param * (-np.sin(r1))

        # Keep exit point inside prism bounds
        if exit_point_x < 0 or exit_point_x > 2.2:
            continue

        # Exit ray direction: exit_ang is angle from second face normal
        # Second face normal points outward (upper-right or lower-right)
        # Outward normal for upper right face: perpendicular to (2, -half_base) = (half_base, 2) normalised
        norm_len = np.sqrt(half_base**2 + 4.0)
        nx_out = half_base / norm_len
        ny_out = 2.0 / norm_len

        # If exit point is below centre, use lower face normal
        if exit_point_y < 0:
            nx_out = half_base / norm_len
            ny_out = -2.0 / norm_len

        exit_ang_rad = np.radians(exit_ang)
        # Exit ray perpendicular component along normal, and tangential component
        # Rotate normal by exit angle
        cos_e = np.cos(exit_ang_rad)
        sin_e = np.sin(exit_ang_rad)
        # Tangential direction (rotate normal 90° clockwise for upper face, CCW for lower)
        if exit_point_y >= 0:
            tx, ty = ny_out, -nx_out
        else:
            tx, ty = -ny_out, nx_out

        exit_dir_x = cos_e * nx_out + sin_e * tx
        exit_dir_y = cos_e * ny_out + sin_e * ty

        ray_len = 1.8
        ray_end_x = exit_point_x + ray_len * exit_dir_x
        ray_end_y = exit_point_y + ray_len * exit_dir_y

        # Internal ray segment (inside prism — show as dashed)
        fig.add_trace(
            go.Scatter(
                x=[entry_x, exit_point_x],
                y=[entry_y, exit_point_y],
                mode="lines",
                line=dict(color=colour, width=1.5, dash="dot"),
                showlegend=False,
                hoverinfo="skip",
            )
        )
        # Exit ray
        fig.add_trace(
            go.Scatter(
                x=[exit_point_x, ray_end_x],
                y=[exit_point_y, ray_end_y],
                mode="lines",
                name=f"{wl:.0f} nm",
                line=dict(color=colour, width=2.5),
                showlegend=True,
            )
        )

    # Apex angle annotation
    fig.add_annotation(
        x=2.1, y=0.0,
        text=f"A = {apex_deg:.0f}°",
        showarrow=False,
        font=dict(color=COLOURS["quaternary"], size=11),
        bgcolor="rgba(0,0,0,0.5)",
    )

    if valid_wls and exit_angles_list:
        disp = abs(exit_angles_list[-1] - exit_angles_list[0])
        n_ref = cauchy_n(material, 589)
        fig.add_annotation(
            x=0.5, y=1.35,
            text=(
                f"<b>{material}</b>  n(589 nm) = {n_ref:.3f}<br>"
                f"Angular dispersion: {disp:.2f}°"
            ),
            showarrow=False,
            font=dict(color=COLOURS["text"], size=11),
            bgcolor="rgba(0,0,0,0.55)",
            align="left",
        )

    fig.update_layout(
        **plotly_layout(
            height=500,
            title=dict(
                text=f"Prism Dispersion — {material}, apex {apex_deg:.0f}°, θᵢ = {theta_inc_deg:.0f}°",
                font=dict(size=14),
            ),
            xaxis=dict(
                range=[-1.5, 4.2],
                showgrid=False,
                zeroline=False,
                showticklabels=False,
            ),
            yaxis=dict(
                range=[-2.2, 2.2],
                showgrid=False,
                zeroline=False,
                showticklabels=False,
                scaleanchor="x",
                scaleratio=1,
            ),
        )
    )
    return fig


def build_dispersion_curve_fig(material: str) -> go.Figure:
    """
    Build a Plotly figure showing n vs wavelength (dispersion curve).

    Parameters
    ----------
    material : one of the CAUCHY_MATERIALS keys

    Returns
    -------
    Plotly Figure
    """
    wls = np.linspace(380, 700, 200)
    A, B = CAUCHY_MATERIALS[material]
    ns = A + B / wls**2

    fig = make_fig()

    # Colour the line by wavelength
    for i in range(len(wls) - 1):
        mid_wl = (wls[i] + wls[i + 1]) / 2.0
        col = wavelength_to_rgb(mid_wl)
        fig.add_trace(
            go.Scatter(
                x=[wls[i], wls[i + 1]],
                y=[ns[i], ns[i + 1]],
                mode="lines",
                line=dict(color=col, width=3),
                showlegend=False,
                hoverinfo="skip",
            )
        )

    # Overlay the Cauchy fit as a dashed white line for clarity
    fig.add_trace(
        go.Scatter(
            x=wls.tolist(),
            y=ns.tolist(),
            mode="lines",
            name=f"n(λ) — {material}",
            line=dict(color=COLOURS["text"], width=1.5, dash="dash"),
            showlegend=True,
        )
    )

    # Mark sodium D line at 589 nm
    n_d = A + B / 589.0**2
    fig.add_vline(
        x=589,
        line=dict(color=COLOURS["secondary"], dash="dash", width=1),
    )
    fig.add_annotation(
        x=589, y=n_d,
        text=f" n(589 nm) = {n_d:.4f}",
        showarrow=True,
        arrowhead=2,
        arrowcolor=COLOURS["secondary"],
        font=dict(color=COLOURS["secondary"], size=10),
        ax=40, ay=-20,
    )

    fig.update_layout(
        **plotly_layout(
            height=280,
            title=dict(
                text=f"Dispersion Curve — {material}  [Cauchy: n = A + B/λ²]",
                font=dict(size=13),
            ),
            xaxis=dict(title="Wavelength λ (nm)"),
            yaxis=dict(title="Refractive index n"),
            margin=dict(l=60, r=20, t=45, b=50),
        )
    )
    return fig


# ── Plot builders — Converging lens ray diagram ───────────────────────────────


def build_lens_fig(
    f_cm: float,
    u_cm: float,
    v_cm: float,
    mag: float,
    image_type: str,
) -> go.Figure:
    """
    Build a Plotly ray diagram for a converging lens.

    Parameters
    ----------
    f_cm       : focal length (cm)
    u_cm       : object distance (cm, positive)
    v_cm       : image distance (cm; positive = real, negative = virtual)
    mag        : linear magnification
    image_type : 'Real', 'Virtual', or 'At infinity'

    Returns
    -------
    Plotly Figure
    """
    fig = make_fig()

    obj_h = 1.0                       # object height (arbitrary units)
    img_h = mag * obj_h if image_type not in ("At infinity",) else 0.0

    # Axes extent
    x_min = -min(u_cm + 5, 70)
    x_max = max(abs(v_cm) + 10, 40) if image_type not in ("At infinity",) else 60
    y_lim = max(3.0, abs(img_h) + 1.0, 2.0)

    # Principal axis
    fig.add_shape(
        type="line",
        x0=x_min, y0=0, x1=x_max, y1=0,
        line=dict(color=COLOURS["grid"], width=1.5),
    )

    # Lens as vertical double-headed arrow at x = 0
    lens_h = y_lim * 0.9
    fig.add_shape(
        type="line",
        x0=0, y0=-lens_h, x1=0, y1=lens_h,
        line=dict(color=COLOURS["quaternary"], width=3),
    )
    # Lens arrowheads (simulate biconvex symbol)
    fig.add_annotation(
        x=0, y=lens_h,
        ax=0, ay=lens_h - 0.01,
        xref="x", yref="y", axref="x", ayref="y",
        text="", arrowhead=2, arrowsize=1.5, arrowwidth=3, arrowcolor=COLOURS["quaternary"],
    )
    fig.add_annotation(
        x=0, y=-lens_h,
        ax=0, ay=-lens_h + 0.01,
        xref="x", yref="y", axref="x", ayref="y",
        text="", arrowhead=2, arrowsize=1.5, arrowwidth=3, arrowcolor=COLOURS["quaternary"],
    )

    # Focal points F and F'
    for fx, label in [(-f_cm, "F"), (f_cm, "F'")]:
        fig.add_trace(
            go.Scatter(
                x=[fx], y=[0],
                mode="markers+text",
                marker=dict(color=COLOURS["tertiary"], size=8),
                text=[label],
                textposition="bottom center",
                textfont=dict(color=COLOURS["tertiary"], size=11),
                showlegend=False,
                hoverinfo="skip",
            )
        )

    # Object arrow at x = -u_cm
    fig.add_annotation(
        x=-u_cm, y=obj_h,
        ax=-u_cm, ay=0,
        xref="x", yref="y", axref="x", ayref="y",
        text="", arrowhead=2, arrowsize=1.2, arrowwidth=3, arrowcolor=COLOURS["primary"],
    )
    fig.add_trace(
        go.Scatter(
            x=[-u_cm, -u_cm], y=[0, obj_h],
            mode="lines",
            name="Object",
            line=dict(color=COLOURS["primary"], width=3),
            showlegend=True,
        )
    )
    fig.add_annotation(
        x=-u_cm, y=obj_h + 0.15,
        text="Object",
        showarrow=False,
        font=dict(color=COLOURS["primary"], size=10),
    )

    # Draw image arrow if not at infinity
    if image_type not in ("At infinity",) and abs(img_h) > 0.01:
        img_col = COLOURS["secondary"] if image_type == "Real" else COLOURS["advanced"]
        # Arrow from axis to image top
        fig.add_annotation(
            x=v_cm, y=img_h,
            ax=v_cm, ay=0,
            xref="x", yref="y", axref="x", ayref="y",
            text="", arrowhead=2, arrowsize=1.2, arrowwidth=3, arrowcolor=img_col,
        )
        fig.add_trace(
            go.Scatter(
                x=[v_cm, v_cm], y=[0, img_h],
                mode="lines",
                name=f"Image ({image_type})",
                line=dict(color=img_col, width=3),
                showlegend=True,
            )
        )
        img_label_y = img_h + 0.15 if img_h > 0 else img_h - 0.25
        fig.add_annotation(
            x=v_cm, y=img_label_y,
            text=f"Image ({image_type})",
            showarrow=False,
            font=dict(color=img_col, size=10),
        )

    # ── Three principal rays ───────────────────────────────────────────────────
    # Ray 1: parallel to axis → through F' (or away from F' if virtual)
    # Travels from object tip at (-u, obj_h) horizontally to lens at (0, obj_h)
    # then bends through (f, 0)
    ray_colours = [COLOURS["highlight"], COLOURS["tertiary"], COLOURS["advanced"]]

    # Ray 1: parallel ray
    fig.add_trace(
        go.Scatter(
            x=[-u_cm, 0], y=[obj_h, obj_h],
            mode="lines", name="Ray 1 (parallel → F')",
            line=dict(color=ray_colours[0], width=1.8, dash="dot"),
            showlegend=True,
        )
    )
    if image_type == "At infinity":
        # Ray exits parallel to axis (object at F)
        fig.add_trace(
            go.Scatter(
                x=[0, x_max], y=[obj_h, obj_h],
                mode="lines", showlegend=False,
                line=dict(color=ray_colours[0], width=1.8, dash="dot"),
            )
        )
    elif image_type == "Real":
        # Ray passes through F' on the right → continues to image
        fig.add_trace(
            go.Scatter(
                x=[0, v_cm], y=[obj_h, img_h],
                mode="lines", showlegend=False,
                line=dict(color=ray_colours[0], width=1.8, dash="dot"),
            )
        )
    else:
        # Virtual: ray appears to come from F' on right side but diverges
        # Apparent direction: from (0, obj_h) passing through (f, 0)
        # Extend backward to image
        if abs(v_cm) > 0.1:
            # The ray diverges; trace the actual forward direction
            dx = f_cm - 0
            dy = 0 - obj_h
            scale = (x_max - 0) / max(abs(dx), 0.001)
            fig.add_trace(
                go.Scatter(
                    x=[0, 0 + dx * scale], y=[obj_h, obj_h + dy * scale],
                    mode="lines", showlegend=False,
                    line=dict(color=ray_colours[0], width=1.8, dash="dot"),
                )
            )
            # Dashed backward extension to image
            scale_back = (v_cm - 0) / max(abs(dx), 0.001)
            fig.add_trace(
                go.Scatter(
                    x=[0, v_cm], y=[obj_h, obj_h + dy * scale_back],
                    mode="lines", showlegend=False,
                    line=dict(color=ray_colours[0], width=1.2, dash="dash"),
                )
            )

    # Ray 2: through optical centre — undeviated
    fig.add_trace(
        go.Scatter(
            x=[-u_cm, 0], y=[obj_h, 0],
            mode="lines", name="Ray 2 (through centre)",
            line=dict(color=ray_colours[1], width=1.8, dash="dot"),
            showlegend=True,
        )
    )
    if image_type not in ("At infinity",):
        fig.add_trace(
            go.Scatter(
                x=[0, v_cm], y=[0, img_h],
                mode="lines", showlegend=False,
                line=dict(color=ray_colours[1], width=1.8, dash="dot"),
            )
        )
    else:
        # Object at F, ray through centre continues
        slope = obj_h / u_cm
        fig.add_trace(
            go.Scatter(
                x=[0, x_max], y=[0, -slope * x_max],
                mode="lines", showlegend=False,
                line=dict(color=ray_colours[1], width=1.8, dash="dot"),
            )
        )

    # Ray 3: through F on object side → exits parallel to axis
    if image_type not in ("At infinity",):
        # Ray from (-u, obj_h) toward (-f, 0), then exits parallel
        fig.add_trace(
            go.Scatter(
                x=[-u_cm, 0], y=[obj_h, (obj_h * f_cm) / (f_cm - u_cm) if abs(f_cm - u_cm) > 0.01 else 0],
                mode="lines", name="Ray 3 (through F → parallel)",
                line=dict(color=ray_colours[2], width=1.8, dash="dot"),
                showlegend=True,
            )
        )
        # Exits parallel to axis at the height it hits the lens
        exit_y_r3 = (obj_h * f_cm) / (f_cm - u_cm) if abs(f_cm - u_cm) > 0.01 else 0
        if image_type == "Real":
            fig.add_trace(
                go.Scatter(
                    x=[0, v_cm], y=[exit_y_r3, img_h],
                    mode="lines", showlegend=False,
                    line=dict(color=ray_colours[2], width=1.8, dash="dot"),
                )
            )
        else:
            # Diverges after lens — extend to right edge
            fig.add_trace(
                go.Scatter(
                    x=[0, x_max], y=[exit_y_r3, exit_y_r3],
                    mode="lines", showlegend=False,
                    line=dict(color=ray_colours[2], width=1.8, dash="dot"),
                )
            )
            # Dashed extension back to virtual image
            fig.add_trace(
                go.Scatter(
                    x=[0, v_cm], y=[exit_y_r3, img_h],
                    mode="lines", showlegend=False,
                    line=dict(color=ray_colours[2], width=1.2, dash="dash"),
                )
            )

    fig.update_layout(
        **plotly_layout(
            height=500,
            title=dict(
                text=f"Converging Lens — f = {f_cm} cm, u = {u_cm} cm",
                font=dict(size=14),
            ),
            xaxis=dict(title="Distance from lens (cm)", range=[x_min, x_max]),
            yaxis=dict(
                title="Height (cm)",
                range=[-y_lim - 0.5, y_lim + 0.5],
                scaleanchor="x",
                scaleratio=1,
            ),
        )
    )
    return fig


# ── Streamlit page layout ─────────────────────────────────────────────────────

sim_header("Optics: Refraction, Dispersion & Lenses", SPEC_REF)

left_col, right_col = two_column_layout(3, 7)

# ── Left column: mode toggle + controls ──────────────────────────────────────

with left_col:
    mode = mode_toggle()
    st.divider()
    st.subheader("Controls")

# ── Tabs in the right column area (rendered outside columns so tabs span full width) ──
# We use st.tabs after the column split so that the tab bar appears inside right_col

with right_col:
    tab1, tab2, tab3, tab4, tab5 = st.tabs(
        ["Snell's Law & TIR", "Prism & Dispersion", "Converging Lens", "Diverging Lens", "Fibre Optics"]
    )

# ════════════════════════════════════════════════════════════════════════════════
# SUB-SIM 1 — Snell's Law & TIR
# ════════════════════════════════════════════════════════════════════════════════

with left_col:
    # We track which tab is displayed by building all controls; Streamlit
    # renders them all but only the active tab's right-col content is visible.
    # Controls are labelled with headers per sub-sim.
    st.markdown(
        f"<p style='color:{COLOURS['advanced']};font-weight:700;"
        "font-size:0.9rem;margin-bottom:2px'>Tab 1 — Snell's Law & TIR</p>",
        unsafe_allow_html=True,
    )

    # Material preset
    preset_label = st.selectbox(
        "Material preset",
        list(MATERIAL_PRESETS.keys()),
        index=0,
        key="snells_preset",
        help="Choose a real-world interface pair or set n₁, n₂ manually.",
    )
    preset_n1, preset_n2, _ = MATERIAL_PRESETS[preset_label]

    # n1, n2 sliders — populate from preset or allow custom
    n1_val = st.slider(
        "n₁ (incident medium)",
        min_value=1.0, max_value=2.5, step=0.05,
        value=float(preset_n1),
        key="n1_slider",
        help="Refractive index of the medium the ray travels in.",
    )
    n2_val = st.slider(
        "n₂ (refracted medium)",
        min_value=1.0, max_value=2.5, step=0.05,
        value=float(preset_n2),
        key="n2_slider",
        help="Refractive index of the medium the ray enters.",
    )
    theta1_val = st.slider(
        "Angle of incidence θ₁ (°)",
        min_value=0, max_value=89, value=40,
        key="theta1_slider",
        help="Angle between the incident ray and the normal to the surface.",
    )

    if mode == "Advanced":
        advanced_divider()
        show_snells_table = st.checkbox(
            "Show n(θ₁) → θ₂ table",
            value=False,
            key="snells_table",
            help="Display a table of θ₂ for all incidence angles 0°–89°.",
        )
    else:
        show_snells_table = False

with tab1:
    # Compute Snell's law
    theta2_result, tir_result, critical_result = snells_law(theta1_val, n1_val, n2_val)

    # Context card for preset
    _, _, context_str = MATERIAL_PRESETS[preset_label]
    if context_str:
        st.info(context_str)

    # TIR warning
    if tir_result:
        st.warning(
            "Total Internal Reflection! No light passes into medium 2. "
            "The ray is completely reflected back into medium 1."
        )
    elif n1_val > n2_val and critical_result is not None:
        frac = theta1_val / critical_result
        if frac > 0.85:
            st.warning(
                f"Approaching critical angle! θ₁ = {theta1_val}°, "
                f"θ_c = {critical_result:.1f}°. "
                "Increase θ₁ to trigger Total Internal Reflection."
            )

    # Ray diagram
    snells_fig = build_snells_fig(
        theta1_deg=theta1_val,
        n1=n1_val,
        n2=n2_val,
        theta2_deg=theta2_result,
        tir=tir_result,
    )
    st.plotly_chart(snells_fig, use_container_width=True)

    # Metric tiles
    theta2_display = f"{theta2_result:.1f}°" if not tir_result and theta2_result is not None else "TIR"
    crit_display = f"{critical_result:.1f}°" if critical_result is not None else "N/A (n₁ ≤ n₂)"
    ratio_display = f"{n2_val / n1_val:.3f}"
    metric_row(
        {
            "θ₁ (incidence)": f"{theta1_val}°",
            "θ₂ (refraction)": theta2_display,
            "Critical angle θ_c": crit_display,
            "n₂ / n₁": ratio_display,
        }
    )

    # Success callout when TIR is nicely demonstrated
    if tir_result and n1_val > n2_val:
        st.success(
            f"TIR is occurring! With n₁ = {n1_val:.2f} and n₂ = {n2_val:.2f}, "
            f"the critical angle is {critical_result:.1f}°. "
            "This is the principle behind optical fibres: light bounces along the "
            "fibre without ever escaping."
        )

    # Optional table
    if mode == "Advanced" and show_snells_table:
        import pandas as pd
        angles = list(range(0, 90, 5))
        rows = []
        for a in angles:
            t2, tir_t, _ = snells_law(a, n1_val, n2_val)
            rows.append({
                "θ₁ (°)": a,
                "θ₂ (°)": f"{t2:.2f}" if t2 is not None else "TIR",
                "TIR?": "Yes" if tir_t else "No",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # Physics notes
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )


# ════════════════════════════════════════════════════════════════════════════════
# SUB-SIM 2 — Prism & Dispersion
# ════════════════════════════════════════════════════════════════════════════════

with left_col:
    st.divider()
    st.markdown(
        f"<p style='color:{COLOURS['advanced']};font-weight:700;"
        "font-size:0.9rem;margin-bottom:2px'>Tab 2 — Prism & Dispersion</p>",
        unsafe_allow_html=True,
    )

    prism_material = st.selectbox(
        "Prism material",
        list(CAUCHY_MATERIALS.keys()),
        index=0,
        key="prism_material",
        help="Cauchy coefficients A, B determine the dispersion of each material.",
    )
    theta_prism = st.slider(
        "Angle of incidence on prism (°)",
        min_value=20, max_value=70, value=40,
        key="theta_prism",
        help="Angle of the incoming ray with respect to the first prism face normal.",
    )
    apex_angle = st.slider(
        "Prism apex angle A (°)",
        min_value=30, max_value=80, value=60,
        key="apex_angle",
        help="The apex angle determines how much the prism splits white light.",
    )

    if mode == "Advanced":
        advanced_divider()
        show_dispersion_curve = st.checkbox(
            "Show dispersion curve n(λ)",
            value=True,
            key="show_disp_curve",
            help="Plot refractive index vs wavelength from Cauchy's equation.",
        )
        show_all_materials = st.checkbox(
            "Compare all materials",
            value=False,
            key="compare_materials",
            help="Overlay dispersion curves for Crown glass, Flint glass, and Diamond.",
        )
    else:
        show_dispersion_curve = False
        show_all_materials = False

with tab2:
    st.info(
        "In 1666, Isaac Newton used a glass prism to split sunlight into a rainbow "
        "spectrum — proving that white light is a mixture of all colours. Rainbows "
        "form by the same process inside water droplets: refraction + TIR + refraction. "
        "Red light refracts least (smaller n), violet refracts most (larger n)."
    )

    prism_fig = build_prism_fig(
        theta_inc_deg=theta_prism,
        apex_deg=apex_angle,
        material=prism_material,
    )
    st.plotly_chart(prism_fig, use_container_width=True)

    # Dispersion metrics
    wls_metric = [400, 500, 589, 700]
    n_vals = {f"n({wl} nm)": f"{cauchy_n(prism_material, wl):.4f}" for wl in wls_metric}
    metric_row(n_vals)

    # Angular dispersion
    n_violet = cauchy_n(prism_material, 400)
    n_red = cauchy_n(prism_material, 700)
    exit_violet = prism_exit_angle(theta_prism, apex_angle, n_violet)
    exit_red = prism_exit_angle(theta_prism, apex_angle, n_red)

    if exit_violet is not None and exit_red is not None:
        disp_angle = abs(exit_violet - exit_red)
        st.success(
            f"Angular dispersion (400–700 nm): **{disp_angle:.2f}°**  |  "
            f"n(400) = {n_violet:.4f}, n(700) = {n_red:.4f}  |  "
            f"Δn = {abs(n_violet - n_red):.4f}"
        )
    else:
        st.warning(
            "Some wavelengths undergo TIR at the second face for these parameters. "
            "Try reducing the apex angle or angle of incidence."
        )

    # Dispersion curve
    if mode == "Advanced" and show_dispersion_curve:
        st.markdown("**Dispersion curve — n vs wavelength**")
        if show_all_materials:
            fig_disp_all = make_fig()
            for mat_name in CAUCHY_MATERIALS:
                wls_c = np.linspace(380, 700, 200)
                A_c, B_c = CAUCHY_MATERIALS[mat_name]
                ns_c = A_c + B_c / wls_c**2
                fig_disp_all.add_trace(
                    go.Scatter(
                        x=wls_c.tolist(), y=ns_c.tolist(),
                        mode="lines", name=mat_name,
                        line=dict(width=2.5),
                    )
                )
            fig_disp_all.update_layout(
                **plotly_layout(
                    height=280,
                    title=dict(text="Dispersion Curves — All Materials", font=dict(size=13)),
                    xaxis=dict(title="Wavelength λ (nm)"),
                    yaxis=dict(title="Refractive index n"),
                    margin=dict(l=60, r=20, t=45, b=50),
                )
            )
            st.plotly_chart(fig_disp_all, use_container_width=True)
        else:
            disp_fig = build_dispersion_curve_fig(prism_material)
            st.plotly_chart(disp_fig, use_container_width=True)

        A_show, B_show = CAUCHY_MATERIALS[prism_material]
        st.caption(
            f"Cauchy coefficients for {prism_material}: "
            f"A = {A_show:.3f}, B = {B_show:.0f} nm²  |  "
            "Shorter wavelengths have higher n → more refraction (normal dispersion)"
        )

    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )


# ════════════════════════════════════════════════════════════════════════════════
# SUB-SIM 3 — Converging Lens
# ════════════════════════════════════════════════════════════════════════════════

with left_col:
    st.divider()
    st.markdown(
        f"<p style='color:{COLOURS['advanced']};font-weight:700;"
        "font-size:0.9rem;margin-bottom:2px'>Tab 3 — Converging Lens</p>",
        unsafe_allow_html=True,
    )

    lens_preset_label = st.selectbox(
        "Real-world lens preset",
        list(LENS_PRESETS.keys()),
        index=0,
        key="lens_preset",
        help="Select a real-world lens to pre-populate f and u.",
    )
    preset_f, preset_u, _ = LENS_PRESETS[lens_preset_label]

    f_val = st.slider(
        "Focal length f (cm)",
        min_value=5.0, max_value=30.0, step=0.5,
        value=float(preset_f),
        key="f_slider",
        help="Positive for a converging (convex) lens.",
    )
    u_val = st.slider(
        "Object distance u (cm)",
        min_value=5.0, max_value=60.0, step=0.5,
        value=float(min(preset_u, 60.0)),
        key="u_slider",
        help="Distance of the object from the lens (positive, object on left).",
    )

    if mode == "Advanced":
        advanced_divider()
        show_lens_table = st.checkbox(
            "Show image position vs u table",
            value=False,
            key="lens_table",
            help="Table of v, m, and image type for a range of object distances.",
        )
        show_1_over_v_plot = st.checkbox(
            "Show 1/v vs 1/u graph",
            value=False,
            key="show_inv_plot",
            help="Linear plot to verify the lens equation experimentally.",
        )
    else:
        show_lens_table = False
        show_1_over_v_plot = False

with tab3:
    # Compute image properties
    v_val, mag_val, img_type, orientation = lens_image(f_val, u_val)

    # Context card for preset
    _, _, lens_context = LENS_PRESETS[lens_preset_label]
    if lens_context:
        st.info(lens_context)

    # Callouts for special cases
    if abs(u_val - f_val) < 1.0:
        st.warning(
            f"Object is very close to the focal point (u ≈ f = {f_val} cm). "
            "The image forms at, or close to, infinity — used in torches and "
            "spotlights to produce a parallel beam."
        )
    elif img_type == "Virtual":
        st.info(
            f"Virtual image formed at v = {v_val:.1f} cm (on the same side as the object). "
            "The image is upright and magnified — this is the magnifying glass configuration. "
            "A virtual image cannot be projected onto a screen."
        )
    elif img_type == "Real" and abs(mag_val) > 1:
        st.success(
            f"Real, inverted, magnified image (m = {mag_val:.2f}). "
            "This is the projector configuration — used in projectors, telescopes (eyepiece), "
            "and microscopes (objective lens)."
        )
    elif img_type == "Real" and abs(mag_val) < 1:
        st.success(
            f"Real, inverted, diminished image (m = {mag_val:.2f}). "
            "This is the camera configuration. The image is smaller than the object "
            "and falls on a sensor or film."
        )

    # Ray diagram
    if img_type not in ("At infinity",):
        lens_fig = build_lens_fig(
            f_cm=f_val,
            u_cm=u_val,
            v_cm=v_val,
            mag=mag_val,
            image_type=img_type,
        )
        st.plotly_chart(lens_fig, use_container_width=True)
    else:
        st.info("Object is at the focal point — image is at infinity (parallel beam output).")
        lens_fig = build_lens_fig(
            f_cm=f_val,
            u_cm=u_val,
            v_cm=1000.0,
            mag=0.0,
            image_type="At infinity",
        )
        st.plotly_chart(lens_fig, use_container_width=True)

    # Metric tiles
    v_display = f"{v_val:.1f} cm" if img_type not in ("At infinity",) else "∞"
    mag_display = f"{mag_val:.2f}×" if img_type not in ("At infinity",) else "∞"
    metric_row(
        {
            "Image distance v": v_display,
            "Magnification m": mag_display,
            "Image type": img_type,
            "Orientation": orientation,
        }
    )

    # Lens equation verification display
    if img_type not in ("At infinity",):
        lhs = 1.0 / f_val
        one_over_v = 1.0 / v_val if abs(v_val) > 0.001 else 0.0
        one_over_u = 1.0 / u_val
        # Lens equation: 1/f = 1/v + 1/u (using u_signed = -u, v_signed = v)
        # Equivalently: 1/v_signed - 1/u_signed = 1/f → 1/v + 1/u = 1/f  (real-is-positive magnitudes)
        # v = fu/(u-f) → 1/v = (u-f)/(fu) = 1/f - 1/u  ✓
        st.caption(
            f"Lens equation check: 1/f = {lhs:.4f} cm⁻¹  |  "
            f"1/v + 1/(-u) = {one_over_v:.4f} − {one_over_u:.4f} = "
            f"{one_over_v - one_over_u:.4f} cm⁻¹  (should equal 1/f = {lhs:.4f} cm⁻¹)  ✓"
        )

    # Advanced: table
    if mode == "Advanced" and show_lens_table:
        import pandas as pd
        u_range = np.arange(5, 65, 5)
        rows = []
        for u_r in u_range:
            v_r, m_r, it, ori = lens_image(f_val, float(u_r))
            rows.append({
                "u (cm)": f"{u_r:.0f}",
                "v (cm)": f"{v_r:.1f}" if it not in ("At infinity",) else "∞",
                "m": f"{m_r:.2f}" if it not in ("At infinity",) else "∞",
                "Type": it,
                "Orientation": ori,
            })
        import pandas as pd
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # Advanced: 1/v vs 1/u graph
    if mode == "Advanced" and show_1_over_v_plot:
        u_arr = np.linspace(f_val + 0.5, 60, 300)
        v_arr = (f_val * u_arr) / (u_arr - f_val)
        inv_u = 1.0 / u_arr
        inv_v = 1.0 / v_arr

        fig_inv = make_fig()
        fig_inv.add_trace(
            go.Scatter(
                x=inv_u.tolist(), y=inv_v.tolist(),
                mode="lines",
                name="1/v vs 1/u (real images)",
                line=dict(color=COLOURS["secondary"], width=2),
            )
        )
        # Reference line: 1/v = 1/f - 1/u → intercept at 1/f on both axes
        intercept = 1.0 / f_val
        fig_inv.add_trace(
            go.Scatter(
                x=[0, intercept], y=[intercept, 0],
                mode="lines",
                name=f"Expected intercepts at 1/f = {intercept:.3f} cm⁻¹",
                line=dict(color=COLOURS["tertiary"], width=1.5, dash="dash"),
            )
        )
        # Mark current point
        if img_type not in ("At infinity",) and img_type == "Real":
            fig_inv.add_trace(
                go.Scatter(
                    x=[1.0 / u_val], y=[1.0 / v_val],
                    mode="markers",
                    name="Current setting",
                    marker=dict(color=COLOURS["highlight"], size=12, symbol="star"),
                )
            )
        fig_inv.update_layout(
            **plotly_layout(
                height=320,
                title=dict(
                    text=f"1/v vs 1/u — f = {f_val} cm  (intercepts at 1/f = {intercept:.3f} cm⁻¹)",
                    font=dict(size=13),
                ),
                xaxis=dict(title="1/u (cm⁻¹)"),
                yaxis=dict(title="1/v (cm⁻¹)"),
                margin=dict(l=60, r=20, t=45, b=50),
            )
        )
        st.plotly_chart(fig_inv, use_container_width=True)
        st.caption(
            "The 1/v vs 1/u graph is a straight line with gradient −1 and intercepts "
            "at 1/f on both axes. This is the standard A Level practical method for "
            "determining focal length."
        )

    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )
