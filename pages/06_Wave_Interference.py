"""
Wave Interference simulation for WJEC Eduqas A Level Physics.

Component 3, Topic 2 (Wave Properties), sections (a)–(o).

Covers:
  - Young's Double Slit interference pattern (Basic)
  - Diffraction Grating order positions (Basic)
  - Single Slit Diffraction pattern (Basic)
  - Stationary Waves — two travelling waves superposed (Basic)
  - Single-slit envelope on double-slit pattern (Advanced)
  - N-slit transition from 2-slit to grating (Advanced)
  - Two-wavelength resolution and Rayleigh criterion (Advanced)
"""

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

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
    page_title="Wave Interference — WJEC A Level Physics",
    page_icon="〰️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 2 (Wave Properties), sections (a)–(o)"

EQUATIONS = [
    r"\Delta y = \frac{\lambda D}{a}",
    r"d \sin\theta = n\lambda",
    r"I = I_0 \left(\frac{\sin\beta}{\beta}\right)^2 \text{ where } "
    r"\beta = \frac{\pi b \sin\theta}{\lambda}",
]

EXPLANATION = (
    "In **Young's experiment**, path difference between the two slits determines "
    "whether constructive ($n\\lambda$) or destructive ($(n+\\tfrac{1}{2})\\lambda$) "
    "interference occurs. The fringe pattern is the interference pattern of two "
    "coherent sources. Fringe spacing $\\Delta y = \\lambda D/a$ shows that closer "
    "slits or shorter screen distances produce wider fringes, and shorter wavelengths "
    "produce narrower ones. A **diffraction grating** has many closely-spaced slits; "
    "the condition $d\\sin\\theta = n\\lambda$ gives sharp principal maxima at discrete "
    "angles. **Single-slit diffraction** produces a central maximum of double width with "
    "weaker subsidiary maxima. **Stationary (standing) waves** arise when two identical "
    "waves travel in opposite directions; superposition gives fixed nodes and antinodes "
    "with $\\lambda = v/f$."
)

ADVANCED_TEXT = (
    "**Derivation of $d\\sin\\theta = n\\lambda$:** for constructive interference, "
    "the path difference from adjacent slits must be an integer multiple of $\\lambda$. "
    "Geometry gives path difference $= d\\sin\\theta$, hence $d\\sin\\theta = n\\lambda$.\n\n"
    "**More slits → sharper principal maxima:** N-slit intensity "
    "$I(\\theta) = I_0\\left(\\dfrac{\\sin(N\\delta/2)}{\\sin(\\delta/2)}\\right)^2$ "
    "where $\\delta = 2\\pi d\\sin\\theta/\\lambda$. As N increases the principal maxima "
    "narrow proportionally to 1/N, while N−2 secondary maxima appear between them. "
    "A diffraction grating is the limiting case with very large N.\n\n"
    "**Resolving power** of a grating: $R = \\lambda/\\Delta\\lambda = mN$ "
    "(order $m$ × number of illuminated slits N). The **Rayleigh criterion** requires "
    "the principal maximum of one wavelength to fall on the first minimum of the other."
)

SIM_TYPES = [
    "Young's Double Slit",
    "Diffraction Grating",
    "Single Slit Diffraction",
    "Stationary Waves",
    "Stationary Waves (Harmonics)",
]

# ── Physics / colour helpers ──────────────────────────────────────────────────


def wavelength_to_rgb(lam_nm: float) -> str:
    """
    Convert a wavelength in nm to a representative HTML hex colour string.

    Parameters
    ----------
    lam_nm : wavelength in nanometres

    Returns
    -------
    hex colour string, e.g. '#FF0000'
    """
    if lam_nm < 380:
        return "#8B00FF"
    elif lam_nm < 450:
        return "#9400D3"
    elif lam_nm < 495:
        return "#0000FF"
    elif lam_nm < 570:
        return "#00FF00"
    elif lam_nm < 590:
        return "#FFFF00"
    elif lam_nm < 620:
        return "#FF7F00"
    else:
        return "#FF0000"


def safe_sinc(beta: np.ndarray) -> np.ndarray:
    """
    Evaluate (sin β / β)² safely, returning 1.0 where β ≈ 0.

    Parameters
    ----------
    beta : array of phase values (radians)

    Returns
    -------
    array of (sinβ/β)² values
    """
    with np.errstate(invalid="ignore", divide="ignore"):
        result = np.where(
            np.abs(beta) < 1e-12,
            1.0,
            (np.sin(beta) / beta) ** 2,
        )
    return result


# ── Plot builders — Young's Double Slit ──────────────────────────────────────


def build_youngs_fig(
    lam_nm: float,
    a_mm: float,
    D_m: float,
    wave_colour: str,
    show_envelope: bool = False,
    b_envelope_mm: float | None = None,
    show_n_slit: bool = False,
    N_slits: int = 2,
) -> go.Figure:
    """
    Build the Young's double-slit intensity pattern figure.

    Parameters
    ----------
    lam_nm        : wavelength (nm)
    a_mm          : slit separation (mm)
    D_m           : screen distance (m)
    wave_colour   : hex colour matching the wavelength
    show_envelope : overlay the single-slit sinc² envelope
    b_envelope_mm : slit width for envelope (mm); used if show_envelope
    show_n_slit   : overlay N-slit pattern
    N_slits       : number of slits for N-slit pattern

    Returns
    -------
    Plotly Figure
    """
    lam = lam_nm * 1e-9          # m
    a = a_mm * 1e-3              # m

    y = np.linspace(-0.1, 0.1, 1000)   # screen position (m)

    # Two-slit intensity: I = I₀ cos²(π a y / λ D)
    phase = np.pi * a * y / (lam * D_m)
    I_double = 4.0 * np.cos(phase) ** 2   # I₀ = 4 (two coherent slits)

    fringe_spacing = lam * D_m / a        # Δy (m)
    lam_D_a = lam * D_m / a              # = Δy = n=1 position

    fig = go.Figure()

    # Main double-slit trace
    fig.add_trace(
        go.Scatter(
            x=y * 1e3,   # mm
            y=I_double,
            mode="lines",
            name="Double slit I(y)",
            line=dict(color=wave_colour, width=2),
        )
    )

    # N-slit overlay
    if show_n_slit and N_slits > 2:
        delta = 2 * np.pi * a * y / (lam * D_m)
        sin_half = np.sin(delta / 2)
        sin_half_safe = np.where(np.abs(sin_half) < 1e-14, 1e-14, sin_half)
        I_n = (np.sin(N_slits * delta / 2) / sin_half_safe) ** 2
        I_n_norm = I_n / np.max(I_n) * 4.0   # normalise to same peak as double-slit
        fig.add_trace(
            go.Scatter(
                x=y * 1e3,
                y=I_n_norm,
                mode="lines",
                name=f"N={N_slits} slits (normalised)",
                line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
            )
        )

    # Single-slit sinc² envelope overlay
    if show_envelope and b_envelope_mm is not None:
        b = b_envelope_mm * 1e-3
        beta_env = np.pi * b * y / (lam * D_m)
        I_env = 4.0 * safe_sinc(beta_env)   # scale to match double-slit amplitude
        fig.add_trace(
            go.Scatter(
                x=y * 1e3,
                y=I_env,
                mode="lines",
                name=f"Sinc² envelope (b = {b_envelope_mm:.3f} mm)",
                line=dict(color=COLOURS["tertiary"], width=1.5, dash="dash"),
            )
        )

    # Fringe maximum vertical dashed lines + Δy annotation
    for n in range(-3, 4):
        yn_mm = n * lam_D_a * 1e3
        if -100 < yn_mm < 100:
            fig.add_vline(
                x=yn_mm,
                line=dict(color=wave_colour, dash="dash", width=0.8),
                opacity=0.45,
                annotation_text=f"n={n}" if n != 0 else "n=0",
                annotation_position="top",
                annotation_font=dict(size=9, color=wave_colour),
            )

    # Annotate Δy on the plot
    fig.add_annotation(
        x=lam_D_a * 1e3,
        y=2.0,
        text=f"Δy = {fringe_spacing * 1e3:.3f} mm",
        showarrow=True,
        arrowhead=2,
        arrowcolor=COLOURS["text"],
        font=dict(color=COLOURS["text"], size=11),
        bgcolor="rgba(0,0,0,0.55)",
        ax=40,
        ay=-30,
    )

    fig.update_layout(
        **plotly_layout(
            height=480,
            title=dict(
                text=(
                    f"Young's Double Slit — λ = {lam_nm:.0f} nm, "
                    f"a = {a_mm:.2f} mm, D = {D_m:.1f} m"
                ),
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Screen position y (mm)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Relative intensity I",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-0.2, 4.4],
            ),
        )
    )
    return fig, fringe_spacing, lam_D_a


# ── Plot builders — Diffraction Grating ──────────────────────────────────────


def build_grating_fig(
    lam_nm: float,
    d_um: float,
    n_max: int,
    wave_colour: str,
    show_n_slit: bool = False,
    N_slits: int = 2,
    show_two_lambda: bool = False,
    lam2_nm: float = 555.0,
    n_lines: int = 1000,
) -> go.Figure:
    """
    Build the diffraction grating order-position figure.

    Parameters
    ----------
    lam_nm       : primary wavelength (nm)
    d_um         : grating spacing (μm)
    n_max        : maximum order to display
    wave_colour  : hex colour for primary wavelength
    show_n_slit  : overlay N-slit angular intensity
    N_slits      : number of slits for N-slit overlay
    show_two_lambda : overlay a second wavelength
    lam2_nm      : second wavelength (nm)
    n_lines      : number of illuminated grating lines (for resolving power)

    Returns
    -------
    Plotly Figure
    """
    lam = lam_nm * 1e-9
    d = d_um * 1e-6

    fig = go.Figure()

    # ── N-slit continuous pattern ─────────────────────────────────────────────
    theta_arr = np.linspace(-90, 90, 5000)
    sin_th = np.sin(np.radians(theta_arr))

    def n_slit_intensity(lam_m: float, col: str, label: str, N: int = N_slits) -> None:
        delta = 2 * np.pi * d * sin_th / lam_m
        denom = np.sin(delta / 2)
        denom_safe = np.where(np.abs(denom) < 1e-14, 1e-14, denom)
        I = (np.sin(N * delta / 2) / denom_safe) ** 2
        I_norm = I / (N ** 2)   # normalise to 1 at principal maxima
        fig.add_trace(
            go.Scatter(
                x=theta_arr,
                y=I_norm,
                mode="lines",
                name=label,
                line=dict(color=col, width=1.5),
            )
        )

    if show_n_slit:
        n_slit_intensity(lam, wave_colour, f"λ={lam_nm:.0f} nm, N={N_slits}")
        if show_two_lambda:
            col2 = wavelength_to_rgb(lam2_nm)
            n_slit_intensity(lam2_nm * 1e-9, col2, f"λ={lam2_nm:.0f} nm, N={N_slits}")
    else:
        # Simple schematic: vertical lines at order positions
        _grating_order_lines(fig, lam, d, n_max, wave_colour, lam_nm)
        if show_two_lambda:
            col2 = wavelength_to_rgb(lam2_nm)
            _grating_order_lines(fig, lam2_nm * 1e-9, d, n_max, col2, lam2_nm)

    # ── Rayleigh criterion check ───────────────────────────────────────────────
    resolved_text = ""
    if show_two_lambda:
        delta_lam = abs(lam_nm - lam2_nm)
        lam_avg = (lam_nm + lam2_nm) / 2
        # Resolving power needed: R_needed = λ/Δλ
        # Resolving power provided: R = m * N_lines (use n=1 order)
        if delta_lam > 0:
            R_needed = lam_avg / delta_lam
            R_provided = 1 * n_lines   # order 1
            resolved_text = (
                "✓ Resolved" if R_provided >= R_needed else "✗ Not resolved"
            )

    fig.update_layout(
        **plotly_layout(
            height=420,
            title=dict(
                text=(
                    f"Diffraction Grating — d = {d_um} μm "
                    f"({1/d/1000:.0f} lines/mm)"
                    + (f"  |  {resolved_text}" if resolved_text else "")
                ),
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Diffraction angle θ (°)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-90, 90],
            ),
            yaxis=dict(
                title="Normalised intensity",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig, resolved_text


def _grating_order_lines(
    fig: go.Figure,
    lam: float,
    d: float,
    n_max: int,
    colour: str,
    lam_nm: float,
) -> None:
    """
    Add vertical bar markers for each visible diffraction order to fig (in-place).

    Parameters
    ----------
    fig    : Plotly Figure to mutate
    lam    : wavelength (m)
    d      : grating spacing (m)
    n_max  : maximum order to attempt
    colour : bar colour
    lam_nm : wavelength in nm (for annotation text)
    """
    first = True
    for n in range(-n_max, n_max + 1):
        sin_th = n * lam / d
        if abs(sin_th) > 1.0:
            continue
        theta_deg = np.degrees(np.arcsin(sin_th))
        fig.add_trace(
            go.Scatter(
                x=[theta_deg, theta_deg],
                y=[0, 1],
                mode="lines",
                name=f"λ={lam_nm:.0f} nm" if first else None,
                showlegend=first,
                line=dict(color=colour, width=3),
            )
        )
        # Annotate with order label and d sinθ = nλ
        fig.add_annotation(
            x=theta_deg,
            y=1.05,
            text=f"n={n}",
            showarrow=False,
            font=dict(color=colour, size=9),
            textangle=0,
        )
        first = False


# ── Plot builders — Single Slit ───────────────────────────────────────────────


def build_single_slit_fig(
    lam_nm: float,
    b_mm: float,
    D_m: float,
    wave_colour: str,
) -> go.Figure:
    """
    Build the single-slit diffraction intensity figure.

    Parameters
    ----------
    lam_nm      : wavelength (nm)
    b_mm        : slit width (mm)
    D_m         : screen distance (m)
    wave_colour : hex colour matching the wavelength

    Returns
    -------
    Plotly Figure
    """
    lam = lam_nm * 1e-9
    b = b_mm * 1e-3

    y = np.linspace(-0.05, 0.05, 1000)   # m
    beta = np.pi * b * y / (lam * D_m)
    I = safe_sinc(beta)

    first_min_y = lam * D_m / b   # m

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=y * 1e3,   # mm
            y=I,
            mode="lines",
            name="Single slit I(y)",
            line=dict(color=wave_colour, width=2),
        )
    )

    # Mark first minima
    for sign, label in [(1, "+1st min"), (-1, "−1st min")]:
        y_min_mm = sign * first_min_y * 1e3
        if -50 < y_min_mm < 50:
            fig.add_vline(
                x=y_min_mm,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=label,
                annotation_position="top",
                annotation_font=dict(size=9, color=COLOURS["highlight"]),
            )

    fig.add_annotation(
        x=first_min_y * 1e3 / 2,
        y=0.5,
        text=f"First min: ±{first_min_y * 1e3:.2f} mm",
        showarrow=False,
        font=dict(color=COLOURS["highlight"], size=11),
        bgcolor="rgba(0,0,0,0.55)",
    )

    fig.update_layout(
        **plotly_layout(
            height=420,
            title=dict(
                text=(
                    f"Single Slit — λ = {lam_nm:.0f} nm, "
                    f"b = {b_mm:.3f} mm, D = {D_m:.1f} m"
                ),
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Screen position y (mm)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Relative intensity I / I₀",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-0.05, 1.15],
            ),
        )
    )
    return fig, first_min_y


# ── Plot builders — Stationary Waves ─────────────────────────────────────────


def build_stationary_fig(
    v: float,
    f: float,
    t_val: float,
    A: float,
) -> go.Figure:
    """
    Build the stationary wave figure showing two travelling waves and their sum.

    Parameters
    ----------
    v     : wave speed (m/s)
    f     : frequency (Hz)
    t_val : time instant (s)
    A     : amplitude

    Returns
    -------
    Plotly Figure
    """
    lam = v / f
    k = 2 * np.pi / lam
    omega = 2 * np.pi * f

    x = np.linspace(0, 2 * lam, 500)

    y1 = A * np.sin(k * x - omega * t_val)          # right-travelling
    y2 = A * np.sin(k * x + omega * t_val)          # left-travelling (reflected)
    y_stat = y1 + y2                                  # = 2A sin(kx) cos(ωt)

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=x,
            y=y1,
            mode="lines",
            name="→ Right-travelling wave",
            line=dict(color=COLOURS["primary"], width=1.5, dash="dash"),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=x,
            y=y2,
            mode="lines",
            name="← Left-travelling wave",
            line=dict(color=COLOURS["secondary"], width=1.5, dash="dash"),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=x,
            y=y_stat,
            mode="lines",
            name="Stationary wave",
            line=dict(color=COLOURS["highlight"], width=3),
        )
    )

    # Mark nodes at x = n λ/2
    n_nodes = int(2 * lam / (lam / 2)) + 1
    node_xs = [n * lam / 2 for n in range(n_nodes) if 0 <= n * lam / 2 <= 2 * lam]
    if node_xs:
        fig.add_trace(
            go.Scatter(
                x=node_xs,
                y=[0.0] * len(node_xs),
                mode="markers",
                name="Nodes",
                marker=dict(
                    color=COLOURS["tertiary"],
                    size=10,
                    symbol="circle",
                    line=dict(color=COLOURS["text"], width=1),
                ),
            )
        )
        for nx in node_xs:
            fig.add_vline(
                x=nx,
                line=dict(color=COLOURS["tertiary"], dash="dot", width=0.8),
                opacity=0.4,
            )

    # Mark antinodes at x = (2n+1) λ/4
    antinode_xs = [
        (2 * n + 1) * lam / 4
        for n in range(20)
        if 0 <= (2 * n + 1) * lam / 4 <= 2 * lam
    ]
    if antinode_xs:
        antinode_ys = [float(2 * A * np.sin(k * xa)) for xa in antinode_xs]
        fig.add_trace(
            go.Scatter(
                x=antinode_xs,
                y=antinode_ys,
                mode="markers",
                name="Antinodes",
                marker=dict(
                    color=COLOURS["advanced"],
                    size=10,
                    symbol="diamond",
                    line=dict(color=COLOURS["text"], width=1),
                ),
            )
        )

    fig.update_layout(
        **plotly_layout(
            height=440,
            title=dict(
                text=(
                    f"Stationary Wave — v = {v:.0f} m/s, "
                    f"f = {f:.0f} Hz, λ = {lam:.3f} m, "
                    f"t = {t_val*1000:.2f} ms"
                ),
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Position x (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Displacement",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-2.2 * A, 2.2 * A],
            ),
        )
    )
    return fig, lam


# ── Plot builders — Stationary Waves (Harmonics) ─────────────────────────────


@st.cache_data
def compute_stationary_harmonic(
    wave_type: str,
    n: int,
    f1: float,
    v: float,
    phase_deg: float,
    num_points: int = 600,
) -> dict:
    """
    Compute arrays for a standing-wave harmonic pattern.

    Parameters
    ----------
    wave_type  : "Vibrating String", "Open Pipe", or "Closed Pipe (one end)"
    n          : harmonic number
    f1         : fundamental frequency (Hz)
    v          : wave speed (m/s)
    phase_deg  : snapshot phase angle (degrees)
    num_points : x-axis resolution

    Returns
    -------
    dict with keys: x, y_standing, y_nodes, x_nodes, y_antinodes, x_antinodes,
                    fn, lam_n, L, n_nodes, n_antinodes, k, omega
    """
    # Closed pipe: only odd harmonics
    if wave_type == "Closed Pipe (one end)" and n % 2 == 0:
        n = max(1, n - 1)

    fn = n * f1

    # Effective length from fundamental: L = v/(2f1) for string/open, v/(4f1) for closed
    if wave_type == "Closed Pipe (one end)":
        L = v / (4.0 * f1)
        lam_n = 4.0 * L / n
    else:
        L = v / (2.0 * f1)
        lam_n = 2.0 * L / n

    k = 2.0 * np.pi / lam_n
    omega = 2.0 * np.pi * fn
    phase_rad = np.radians(phase_deg)

    x = np.linspace(0.0, L, num_points)

    # Standing wave: y(x) = A sin(kx) cos(phase)
    # Closed pipe: displacement node at x=0 (closed end), sin(kx) gives that naturally
    y_standing = np.sin(k * x) * np.cos(phase_rad)

    # Node positions (displacement nodes): sin(kx)=0 → kx = mπ → x = mπ/k = m*lam_n/2
    if wave_type == "Closed Pipe (one end)":
        # nodes where sin(kx)=0: x = m * lam_n/2, m=0,1,2,...
        node_xs = [m * lam_n / 2.0 for m in range(0, n + 2) if 0.0 <= m * lam_n / 2.0 <= L + 1e-9]
    else:
        node_xs = [m * lam_n / 2.0 for m in range(0, n + 2) if 0.0 <= m * lam_n / 2.0 <= L + 1e-9]

    node_xs = [x_n for x_n in node_xs if x_n <= L + 1e-9]

    # Antinode positions: sin(kx)=±1 → kx = π/2 + mπ → x = (2m+1)*lam_n/4
    antinode_xs = [
        (2 * m + 1) * lam_n / 4.0
        for m in range(0, 2 * n + 2)
        if 0.0 <= (2 * m + 1) * lam_n / 4.0 <= L + 1e-9
    ]
    antinode_xs = [x_a for x_a in antinode_xs if x_a <= L + 1e-9]

    # y values at antinodes from standing pattern
    antinode_ys = [float(np.sin(k * x_a) * np.cos(phase_rad)) for x_a in antinode_xs]

    return {
        "x": x,
        "y_standing": y_standing,
        "x_nodes": node_xs,
        "x_antinodes": antinode_xs,
        "y_antinodes": antinode_ys,
        "fn": fn,
        "lam_n": lam_n,
        "L": L,
        "n_nodes": len(node_xs),
        "n_antinodes": len(antinode_xs),
        "k": k,
        "omega": omega,
        "n_eff": n,
    }


@st.cache_data
def compute_travelling_waves(
    k: float,
    omega: float,
    L: float,
    phase_deg: float,
    num_points: int = 600,
) -> tuple:
    """
    Compute the two travelling waves that superpose to form the standing wave.

    Parameters
    ----------
    k         : wavenumber (rad/m)
    omega     : angular frequency (rad/s)
    L         : string/pipe length (m)
    phase_deg : current phase / time offset (degrees; 0°→t=0)
    num_points: resolution

    Returns
    -------
    (x, y1, y2) arrays — right- and left-travelling half-amplitude waves
    """
    phase_rad = np.radians(phase_deg)
    t_eff = phase_rad / omega if omega > 0 else 0.0
    x = np.linspace(0.0, L, num_points)
    y1 = 0.5 * np.sin(k * x - omega * t_eff)
    y2 = 0.5 * np.sin(k * x + omega * t_eff)
    return x, y1, y2


def build_harmonic_fig(
    wave_type: str,
    n: int,
    f1: float,
    v: float,
    phase_deg: float,
    show_travelling: bool = False,
) -> tuple:
    """
    Build the standing-wave displacement figure for a given harmonic.

    Parameters
    ----------
    wave_type        : "Vibrating String", "Open Pipe", or "Closed Pipe (one end)"
    n                : harmonic number (odd only for closed pipe)
    f1               : fundamental frequency (Hz)
    v                : wave speed (m/s)
    phase_deg        : snapshot phase (degrees)
    show_travelling  : overlay the two component travelling waves (Advanced)

    Returns
    -------
    (fig, data_dict)
    """
    data = compute_stationary_harmonic(wave_type, n, f1, v, phase_deg)

    x = data["x"]
    y = data["y_standing"]
    L = data["L"]
    fn = data["fn"]
    lam_n = data["lam_n"]
    n_eff = data["n_eff"]

    fig = go.Figure()

    # Overlay travelling waves first (so standing wave is on top)
    if show_travelling:
        x_tw, y1_tw, y2_tw = compute_travelling_waves(
            data["k"], data["omega"], L, phase_deg
        )
        fig.add_trace(
            go.Scatter(
                x=x_tw,
                y=y1_tw,
                mode="lines",
                name="→ Right-travelling (y₁)",
                line=dict(color=COLOURS["secondary"], width=1.5, dash="dash"),
                opacity=0.65,
            )
        )
        fig.add_trace(
            go.Scatter(
                x=x_tw,
                y=y2_tw,
                mode="lines",
                name="← Left-travelling (y₂)",
                line=dict(color=COLOURS["tertiary"], width=1.5, dash="dash"),
                opacity=0.65,
            )
        )

    # Standing wave — main trace
    fig.add_trace(
        go.Scatter(
            x=x,
            y=y,
            mode="lines",
            name=f"Standing wave (n={n_eff})",
            line=dict(color=COLOURS["primary"], width=3),
        )
    )

    # Nodes: grey vertical dashed lines + "N" label
    for i, xn in enumerate(data["x_nodes"]):
        fig.add_vline(
            x=xn,
            line=dict(color="grey", dash="dash", width=1.2),
            opacity=0.6,
            annotation_text="N" if i == 0 else "N",
            annotation_position="bottom",
            annotation_font=dict(size=9, color="grey"),
        )

    # Antinodes: orange dots labelled "A"
    if data["x_antinodes"]:
        fig.add_trace(
            go.Scatter(
                x=data["x_antinodes"],
                y=data["y_antinodes"],
                mode="markers+text",
                name="Antinodes",
                text=["A"] * len(data["x_antinodes"]),
                textposition="top center",
                textfont=dict(color=COLOURS["secondary"], size=10),
                marker=dict(
                    color=COLOURS["secondary"],
                    size=10,
                    symbol="circle",
                    line=dict(color=COLOURS["text"], width=1),
                ),
            )
        )

    # Endpoint markers for context
    if wave_type == "Vibrating String":
        # Fixed nodes at both ends (already covered by node vlines, but add endpoint dots)
        fig.add_trace(
            go.Scatter(
                x=[0.0, L],
                y=[0.0, 0.0],
                mode="markers",
                name="Fixed ends",
                marker=dict(color=COLOURS["highlight"], size=12, symbol="square"),
                showlegend=True,
            )
        )
    elif wave_type == "Open Pipe":
        # Pressure nodes at both open ends (displacement antinodes there)
        fig.add_annotation(
            x=0.0, y=1.1, text="Open end", showarrow=False,
            font=dict(color=COLOURS["quaternary"], size=9),
        )
        fig.add_annotation(
            x=L, y=1.1, text="Open end", showarrow=False,
            font=dict(color=COLOURS["quaternary"], size=9),
        )
    else:  # Closed Pipe
        fig.add_annotation(
            x=0.0, y=1.1, text="Closed end\n(disp. node)", showarrow=False,
            font=dict(color=COLOURS["highlight"], size=9),
        )
        fig.add_annotation(
            x=L, y=1.1, text="Open end\n(disp. antinode)", showarrow=False,
            font=dict(color=COLOURS["quaternary"], size=9),
        )

    type_label = wave_type.replace(" (one end)", "")
    fig.update_layout(
        **plotly_layout(
            height=420,
            title=dict(
                text=(
                    f"{type_label} — n = {n_eff}, "
                    f"f₁ = {f1:.0f} Hz → fₙ = {fn:.0f} Hz, "
                    f"λₙ = {lam_n:.3f} m, L = {L:.3f} m"
                ),
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Position x (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-0.02 * L, 1.05 * L],
            ),
            yaxis=dict(
                title="Normalised displacement",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-1.35, 1.35],
            ),
        )
    )
    return fig, data


def build_harmonic_spectrum_fig(
    wave_type: str,
    f1: float,
    n_selected: int,
    n_harmonics: int = 8,
) -> go.Figure:
    """
    Build a bar-chart showing the first n_harmonics harmonic frequencies.

    Parameters
    ----------
    wave_type   : "Vibrating String", "Open Pipe", or "Closed Pipe (one end)"
    f1          : fundamental frequency (Hz)
    n_selected  : currently selected harmonic (highlighted in red)
    n_harmonics : how many harmonics to show

    Returns
    -------
    Plotly Figure
    """
    ns = list(range(1, n_harmonics + 1))
    freqs = []
    colours = []

    for nn in ns:
        if wave_type == "Closed Pipe (one end)" and nn % 2 == 0:
            # Even harmonics absent in closed pipe
            freqs.append(0.0)
            colours.append("rgba(100,100,100,0.4)")
        else:
            freqs.append(nn * f1)
            if nn == n_selected:
                colours.append(COLOURS["highlight"])
            else:
                colours.append(COLOURS["primary"])

    fig = go.Figure(
        go.Bar(
            x=ns,
            y=freqs,
            marker_color=colours,
            text=[f"{f:.0f} Hz" if f > 0 else "—" for f in freqs],
            textposition="outside",
            textfont=dict(size=9, color=COLOURS["text"]),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=300,
            title=dict(
                text="Harmonic Frequency Spectrum",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Harmonic number n",
                tickvals=ns,
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Frequency (Hz)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=False,
        )
    )
    return fig


# ── p5.js animation builder ───────────────────────────────────────────────────


def build_interference_animation(wavelength_nm, slit_sep_mm, num_sources=2):
    """Build p5.js animated wave interference HTML."""
    data = json.dumps({
        "lambda": float(wavelength_nm),
        "slitSep": float(slit_sep_mm),
        "numSources": int(num_sources)
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>body{{margin:0;overflow:hidden;background:#0e1117;}}</style>
</head><body>
<script>
const D = {data};
let t=0, playing=true, speed=1;
let waveBuffer;

function setup(){{
  createCanvas(windowWidth||700, 420);
  waveBuffer=createGraphics(200,200);
  textFont('monospace');
  frameRate(30);
}}
function windowResized(){{ resizeCanvas(windowWidth,420); }}

function mousePressed(){{
  if(mouseX>width-120&&mouseX<width-10){{
    if(mouseY>10&&mouseY<40) playing=!playing;
    else if(mouseY>50&&mouseY<80) speed=speed===1?2:speed===2?4:1;
  }}
}}

function draw(){{
  background('#0e1117');

  // Draw interference pattern into buffer
  let bw=waveBuffer.width, bh=waveBuffer.height;
  waveBuffer.loadPixels();

  // Scale: canvas represents a physical area
  // Source separation in normalised units: 0.15 of canvas half-height
  let sep=0.3;  // fraction of buffer height between sources
  let s1y=bh/2 - bh*sep/2;
  let s2y=bh/2 + bh*sep/2;
  let s1x=bw*0.15;  // sources on left
  let s2x=bw*0.15;

  // Wave number: scale so ~5 wavelengths fit across buffer
  let k=TWO_PI*5/bw;
  let omega=TWO_PI*0.3;

  for(let py=0;py<bh;py++){{
    for(let px=0;px<bw;px++){{
      let r1=dist(px,py,s1x,s1y);
      let r2=dist(px,py,s2x,s2y);
      let w1=sin(k*r1-omega*t);
      let w2=sin(k*r2-omega*t);
      let amp=(w1+w2)*0.5;  // -1 to +1

      // Map to colour: dark blue (trough) → black → bright white/yellow (crest)
      let intensity=amp;  // -1 to 1
      let r,g,b;
      if(intensity>0){{
        // crest: white-yellow glow
        r=int(map(intensity,0,1,14,255));
        g=int(map(intensity,0,1,17,220));
        b=int(map(intensity,0,1,23,80));
      }} else {{
        // trough: dark blue
        r=int(map(intensity,-1,0,10,14));
        g=int(map(intensity,-1,0,10,17));
        b=int(map(intensity,-1,0,80,23));
      }}
      let idx=(py*bw+px)*4;
      waveBuffer.pixels[idx]=r;
      waveBuffer.pixels[idx+1]=g;
      waveBuffer.pixels[idx+2]=b;
      waveBuffer.pixels[idx+3]=255;
    }}
  }}
  waveBuffer.updatePixels();

  // Draw buffer scaled to fill canvas area (leaving margins)
  let margin=60;
  let drawW=width-margin*2;
  let drawH=height-margin*1.5;
  image(waveBuffer, margin, 20, drawW, drawH);

  // Source dots
  let s1px=margin+s1x*(drawW/bw);
  let s2px=margin+s2x*(drawW/bw);
  let s1py=20+s1y*(drawH/bh);
  let s2py=20+s2y*(drawH/bh);

  // Draw screen on right
  stroke('#fafafa'); strokeWeight(3);
  line(margin+drawW-2, 20, margin+drawW-2, 20+drawH);
  noStroke(); fill('#fafafa'); textSize(9);
  text('screen', margin+drawW+2, 20+drawH/2);

  // Source markers
  for(let [sx,sy,lbl] of [[s1px,s1py,'S₁'],[s2px,s2py,'S₂']]){{
    noStroke();
    for(let rr=14;rr>0;rr-=3) fill(44,160,44,map(rr,0,14,0,40));
    for(let rr=14;rr>0;rr-=3) circle(sx,sy,rr*2);
    fill('#2ca02c'); stroke('#ffffff'); strokeWeight(1); circle(sx,sy,10);
    noStroke(); fill('#fafafa'); textSize(10); text(lbl,sx+8,sy-4);
  }}

  // Barrier with slits
  let barX=margin+s1x*(drawW/bw)+10;
  stroke('#888'); strokeWeight(4);
  line(barX, 20, barX, s1py-8);
  line(barX, s1py+8, barX, s2py-8);
  line(barX, s2py+8, barX, 20+drawH);

  // Labels: constructive/destructive lines
  noStroke(); fill(255,255,255,100); textSize(9);
  text('Constructive →', margin+drawW*0.55, 20+drawH*0.25);
  text('Destructive', margin+drawW*0.55, 20+drawH*0.38);

  // λ, d labels
  fill('#fafafa'); textSize(9);
  text('λ = '+D.lambda.toFixed(0)+' nm', 8, height-40);
  text('d = '+D.slitSep.toFixed(2)+' mm', 8, height-26);
  text('Δx = λD/d', 8, height-12);

  // Controls
  noStroke(); fill(15,15,25,220); rect(width-118,8,110,90,6);
  fill('#fafafa'); textSize(11);
  text(playing?'⏸ Pause':'▶ Play',width-112,28);
  text('⚡ '+speed+'x',width-112,65);

  if(playing) t+=0.1*speed;
}}
</script></body></html>"""


# ── Streamlit page ────────────────────────────────────────────────────────────

sim_header("Wave Interference", SPEC_REF)
mode = mode_toggle()

left_col, right_col = two_column_layout(3, 7)

# ── Left column: controls ─────────────────────────────────────────────────────

with left_col:
    st.subheader("Simulation")
    sim_type = st.selectbox(
        "Simulation type",
        SIM_TYPES,
        help="Select the wave phenomenon to simulate.",
    )

    st.divider()

    # ── Controls per simulation type ──────────────────────────────────────────

    if sim_type == "Young's Double Slit":

        lam_nm = st.slider(
            "Wavelength λ (nm)",
            min_value=380,
            max_value=750,
            value=550,
            step=1,
            help="Visible light: 380 nm (violet) → 750 nm (red).",
        )
        wave_colour = wavelength_to_rgb(lam_nm)

        # Colour swatch
        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'>"
            f"<div style='width:32px;height:20px;background:{wave_colour};"
            f"border-radius:3px;border:1px solid #555'></div>"
            f"<span style='font-size:0.85rem;color:{COLOURS['text']}'>"
            f"{wave_colour}</span></div>",
            unsafe_allow_html=True,
        )

        show_spectrum = st.checkbox(
            "Show full visible spectrum",
            value=False,
            help=(
                "Overlay intensity patterns for multiple wavelengths across the "
                "visible spectrum to create a rainbow fringe pattern."
            ),
        )

        a_mm = st.slider(
            "Slit separation a (mm)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.05,
            help="Centre-to-centre distance between the two slits.",
        )
        D_m = st.slider(
            "Screen distance D (m)",
            min_value=0.5,
            max_value=5.0,
            value=2.0,
            step=0.1,
        )

        # ── Advanced controls ─────────────────────────────────────────────────
        show_envelope = False
        b_envelope_mm = None
        show_n_slit_ys = False
        N_slits_ys = 2

        if mode == "Advanced":
            advanced_divider()

            show_envelope = st.checkbox(
                "Show single-slit sinc² envelope",
                value=False,
                help=(
                    "Overlays the single-slit diffraction envelope that modulates "
                    "the double-slit pattern. Missing orders occur when slit width "
                    "equals slit separation."
                ),
            )
            if show_envelope:
                b_default = round(a_mm / 4, 4)
                b_envelope_mm = st.slider(
                    "Slit width b (mm) for envelope",
                    min_value=0.01,
                    max_value=a_mm,
                    value=min(b_default, a_mm),
                    step=0.01,
                    help=(
                        "When b = a all even orders vanish "
                        "(first envelope minimum coincides with n=1 maximum)."
                    ),
                )
                if abs(b_envelope_mm - a_mm) < 0.02:
                    st.info(
                        "b ≈ a: first minimum of envelope at n=1 fringe — "
                        "**missing orders** visible."
                    )

            show_n_slit_ys = st.checkbox(
                "Show N-slit pattern",
                value=False,
                help="Increase N to see the transition from fringes to sharp grating orders.",
            )
            if show_n_slit_ys:
                N_slits_ys = st.select_slider(
                    "Number of slits N",
                    options=[2, 3, 5, 10, 20, 50, 100, 200, 500],
                    value=2,
                )

    elif sim_type == "Diffraction Grating":

        lam_nm = st.slider(
            "Wavelength λ (nm)",
            min_value=380,
            max_value=750,
            value=550,
            step=1,
        )
        wave_colour = wavelength_to_rgb(lam_nm)
        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'>"
            f"<div style='width:32px;height:20px;background:{wave_colour};"
            f"border-radius:3px;border:1px solid #555'></div>"
            f"<span style='font-size:0.85rem;color:{COLOURS['text']}'>"
            f"{wave_colour}</span></div>",
            unsafe_allow_html=True,
        )

        # ── Real-world grating presets ────────────────────────────────────────
        _GRATING_PRESETS = {
            "Custom": None,
            "CD (1600 lines/mm)": (
                625.0,
                "A CD's rainbow shimmer is diffraction from its 1600 lines/mm pit "
                "tracks. Each colour diffracts at a different angle.",
            ),
            "DVD (2400 lines/mm)": (
                417.0,
                "DVDs store more data on tighter tracks (2400 lines/mm). The colours "
                "you see are the n=1 diffraction orders.",
            ),
            "Blu-ray (3200 lines/mm)": (
                313.0,
                "Blu-ray uses a 405 nm blue-violet laser — chosen because shorter λ "
                "allows smaller pit sizes and higher data density.",
            ),
            "Spectrometer grating (600 lines/mm)": (
                1667.0,
                "Laboratory spectrometers use 600–1800 lines/mm. The resolving power "
                "R = mN determines which wavelengths can be separated.",
            ),
            "Spectrometer (1200 lines/mm)": (
                833.0,
                None,
            ),
            "Human hair (≈70 μm)": (
                70000.0,
                "Human hair diffracts light! The fringe spacing Δy is large, so you'd "
                "need a huge screen distance to see it clearly.",
            ),
        }

        grating_preset = st.selectbox(
            "Real grating preset",
            options=list(_GRATING_PRESETS.keys()),
            index=0,
            help="Select a real-world grating to set d automatically.",
        )

        _preset_val = _GRATING_PRESETS[grating_preset]
        _preset_d_nm = _preset_val[0] if _preset_val is not None else None
        _preset_context = _preset_val[1] if _preset_val is not None else None

        if _preset_d_nm is not None and _preset_context:
            st.info(_preset_context)

        if _preset_d_nm is None:
            d_um = st.select_slider(
                "Grating spacing d (μm)",
                options=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0],
                value=2.0,
                help="Larger spacing → smaller diffraction angles.",
            )
        else:
            d_um = _preset_d_nm / 1000.0   # nm → μm
            st.caption(f"d = {_preset_d_nm:.0f} nm (set by preset)")

        d_m_val = d_um * 1e-6
        lines_per_mm = 1.0 / d_m_val / 1000.0
        st.caption(f"≈ {lines_per_mm:.0f} lines/mm")

        n_max_ctrl = st.slider(
            "Show orders up to n_max",
            min_value=1,
            max_value=5,
            value=3,
        )

        # ── Advanced controls ─────────────────────────────────────────────────
        show_n_slit_gr = False
        N_slits_gr = 2
        show_two_lam = False
        lam2_nm = 555.0
        n_lines_illum = 1000

        if mode == "Advanced":
            advanced_divider()

            show_n_slit_gr = st.checkbox(
                "Show N-slit pattern",
                value=False,
                help="Shows the full N-slit angular intensity pattern.",
            )
            if show_n_slit_gr:
                N_slits_gr = st.select_slider(
                    "Number of slits N",
                    options=[2, 3, 5, 10, 20, 50, 100, 200, 500],
                    value=2,
                    key="n_slits_grating",
                )

            show_two_lam = st.checkbox(
                "Show two wavelengths",
                value=False,
                help="Overlay a second wavelength to explore resolving power.",
            )
            if show_two_lam:
                lam2_nm = st.slider(
                    "Second wavelength λ₂ (nm)",
                    min_value=380,
                    max_value=750,
                    value=555,
                    step=1,
                    key="lam2_slider",
                )
                n_lines_illum = st.slider(
                    "Illuminated grating lines N",
                    min_value=100,
                    max_value=10000,
                    value=1000,
                    step=100,
                    help="Resolving power R = mN (order 1 assumed). Δλ_min = λ/R.",
                )

    elif sim_type == "Single Slit Diffraction":

        lam_nm = st.slider(
            "Wavelength λ (nm)",
            min_value=380,
            max_value=750,
            value=550,
            step=1,
        )
        wave_colour = wavelength_to_rgb(lam_nm)
        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'>"
            f"<div style='width:32px;height:20px;background:{wave_colour};"
            f"border-radius:3px;border:1px solid #555'></div>"
            f"<span style='font-size:0.85rem;color:{COLOURS['text']}'>"
            f"{wave_colour}</span></div>",
            unsafe_allow_html=True,
        )

        b_mm = st.slider(
            "Slit width b (mm)",
            min_value=0.01,
            max_value=1.0,
            value=0.1,
            step=0.01,
            help="Narrower slit → wider central maximum.",
        )
        D_m_ss = st.slider(
            "Screen distance D (m)",
            min_value=0.5,
            max_value=5.0,
            value=2.0,
            step=0.1,
            key="D_single_slit",
        )

    elif sim_type == "Stationary Waves":

        v_sw = st.slider(
            "Wave speed v (m/s)",
            min_value=100,
            max_value=500,
            value=340,
            step=5,
            help="Speed of sound in air ≈ 340 m/s.",
        )
        f_sw = st.slider(
            "Frequency f (Hz)",
            min_value=50,
            max_value=2000,
            value=440,
            step=10,
        )
        A_sw = st.slider(
            "Amplitude",
            min_value=0.1,
            max_value=1.0,
            value=1.0,
            step=0.05,
        )

        # Time slider — range 0 to one full period
        period_sw = 1.0 / f_sw
        t_step = period_sw / 50.0
        t_sw = st.slider(
            "Time t (ms)",
            min_value=0.0,
            max_value=float(period_sw * 1e3),
            value=0.0,
            step=float(t_step * 1e3),
            format="%.2f",
            help="Advance through one full period to animate the wave.",
        )
        t_sw_s = t_sw * 1e-3   # convert ms → s

    else:  # Stationary Waves (Harmonics)

        sw_wave_type = st.selectbox(
            "Stationary Wave type",
            ["Vibrating String", "Open Pipe", "Closed Pipe (one end)"],
            key="sw_wave_type",
            help=(
                "String and open pipe support all harmonics. "
                "Closed pipe (one end closed) supports only odd harmonics."
            ),
        )

        # For closed pipe, only odd n values are physical
        if sw_wave_type == "Closed Pipe (one end)":
            _sw_n_options = list(range(1, 9))
            sw_n_raw = st.slider(
                "Harmonic number n",
                min_value=1,
                max_value=8,
                value=1,
                step=1,
                key="sw_n",
                help="Only odd harmonics (1, 3, 5, 7) are present in a closed pipe.",
            )
            # Snap to nearest odd number
            sw_n = sw_n_raw if sw_n_raw % 2 == 1 else max(1, sw_n_raw - 1)
            if sw_n != sw_n_raw:
                st.caption(f"Closed pipe: snapped to nearest odd harmonic n = {sw_n}")
        else:
            sw_n = st.slider(
                "Harmonic number n",
                min_value=1,
                max_value=8,
                value=1,
                step=1,
                key="sw_n",
                help="n=1 is the fundamental; n=2,3,... are overtones.",
            )

        sw_f1 = st.slider(
            "f₁ (Hz)",
            min_value=50,
            max_value=2000,
            value=220,
            step=10,
            key="sw_f1",
            help="Fundamental frequency f₁. fₙ = n × f₁.",
        )

        sw_v = st.slider(
            "Wave speed v (m/s)",
            min_value=10,
            max_value=1000,
            value=340,
            step=5,
            key="sw_v",
            help=(
                "Speed of the wave. For a string: v = √(T/μ). "
                "For sound in air ≈ 340 m/s."
            ),
        )

        # Advanced: separate T and μ for string
        sw_show_travelling = False
        if mode == "Advanced":
            advanced_divider()

            if sw_wave_type == "Vibrating String":
                st.markdown(
                    "<span style='font-size:0.85rem;color:#fafafa'>"
                    "String tension & linear density (v = √(T/μ))</span>",
                    unsafe_allow_html=True,
                )
                sw_T = st.slider(
                    "Tension T (N)",
                    min_value=1,
                    max_value=500,
                    value=64,
                    step=1,
                    key="sw_T",
                    help="String tension in Newtons.",
                )
                sw_mu = st.slider(
                    "Linear density μ (g/m)",
                    min_value=1,
                    max_value=100,
                    value=55,
                    step=1,
                    key="sw_mu",
                    help="Mass per unit length (grams per metre).",
                )
                sw_v_derived = float(np.sqrt(sw_T / (sw_mu * 1e-3)))
                st.caption(
                    f"v = √(T/μ) = √({sw_T}/{sw_mu * 1e-3:.3f}) "
                    f"= {sw_v_derived:.1f} m/s (overrides v slider)"
                )
                sw_v = sw_v_derived

            sw_show_travelling = st.checkbox(
                "Show component travelling waves",
                value=False,
                key="sw_show_travelling",
                help=(
                    "Overlay the two counter-propagating waves "
                    "y₁ = ½A sin(kx − ωt) and y₂ = ½A sin(kx + ωt) "
                    "that add to form the standing wave."
                ),
            )

        sw_animate = st.checkbox(
            "Show animation (phase sweep)",
            value=False,
            key="sw_animate",
            help="Tick to animate; untick to use the phase slider for a frozen snapshot.",
        )

        if sw_animate:
            sw_phase_deg = st.slider(
                "Phase (°) — drag to animate",
                min_value=0,
                max_value=360,
                value=0,
                step=5,
                key="sw_phase",
                help="Equivalent to advancing time through one full period.",
            )
        else:
            sw_phase_deg = st.slider(
                "Snapshot phase (°)",
                min_value=0,
                max_value=360,
                value=0,
                step=5,
                key="sw_phase",
                help="Show the wave at a fixed phase angle (0° = maximum displacement).",
            )

# ── Right column: plots & metrics ─────────────────────────────────────────────

with right_col:

    if sim_type == "Young's Double Slit":

        st.info(
            "🔬 **Young's 1801 experiment** proved light is a wave (Newton's corpuscle "
            "theory predicted NO fringes). The fringe spacing Δy = λD/a. At λ=550 nm, "
            "a=1 mm, D=2 m: Δy = 1.1 mm — visible to the naked eye!"
        )

        fig_ys, fringe_spacing, lam_D_a = build_youngs_fig(
            lam_nm=lam_nm,
            a_mm=a_mm,
            D_m=D_m,
            wave_colour=wave_colour,
            show_envelope=show_envelope,
            b_envelope_mm=b_envelope_mm if show_envelope else None,
            show_n_slit=show_n_slit_ys,
            N_slits=N_slits_ys,
        )

        # ── Live p5.js wave animation ─────────────────────────────────────────
        anim_html = build_interference_animation(lam_nm, a_mm)
        components.html(anim_html, height=430)
        st.caption("Live wave superposition · Bright = constructive · Dark = destructive")
        st.divider()

        # ── Spectrum overlay ──────────────────────────────────────────────────
        if show_spectrum:
            _spectrum_lambdas = [380, 430, 480, 530, 580, 630, 680, 730]
            _a = a_mm * 1e-3
            _y = np.linspace(-0.1, 0.1, 1000)
            for _sl in _spectrum_lambdas:
                _lam_m = _sl * 1e-9
                _phase = np.pi * _a * _y / (_lam_m * D_m)
                _I = 4.0 * np.cos(_phase) ** 2
                _col = wavelength_to_rgb(_sl)
                fig_ys.add_trace(
                    go.Scatter(
                        x=_y * 1e3,
                        y=_I,
                        mode="lines",
                        name=f"λ={_sl} nm",
                        line=dict(color=_col, width=1.5),
                        opacity=0.5,
                    )
                )
            st.plotly_chart(fig_ys, use_container_width=True)
            st.caption(
                "White light produces overlapping rainbow fringes — only the central "
                "fringe (path difference = 0) is white. This is what Newton observed."
            )
        else:
            st.plotly_chart(fig_ys, use_container_width=True)

        metric_row(
            {
                "Fringe spacing Δy": f"{fringe_spacing * 1e3:.3f} mm",
                "Wavelength": f"{lam_nm:.0f} nm",
                "Order n=1 position": f"{lam_D_a * 1e3:.3f} mm",
            }
        )

        # ── Interactive fringe counter ────────────────────────────────────────
        _lam_m = lam_nm * 1e-9
        _a_m = a_mm * 1e-3
        _screen_half = 0.05   # ±50 mm
        _n_max_screen = int(_screen_half * _a_m / (_lam_m * D_m))
        _n_bright_visible = 2 * _n_max_screen + 1   # both sides + central
        _dark_spacing_mm = _lam_m * D_m / (2 * _a_m) * 1e3

        col_fc1, col_fc2 = st.columns(2)
        with col_fc1:
            st.metric(
                "Bright fringes visible on screen (±50 mm)",
                _n_bright_visible,
            )
        with col_fc2:
            st.metric(
                "Dark fringe spacing from bright",
                f"{_dark_spacing_mm:.3f} mm",
            )

    elif sim_type == "Diffraction Grating":

        st.info(
            "🌈 **Why are gratings used in spectroscopy?** Each element/molecule has a "
            "unique emission spectrum (fingerprint). By measuring the angles of "
            "diffraction orders, we can identify chemical composition — from stars to "
            "crime scenes."
        )

        lam = lam_nm * 1e-9
        d_m_val = d_um * 1e-6

        # Compute max visible order
        n_max_visible = int(d_m_val / lam)   # sinθ ≤ 1 → n ≤ d/λ

        fig_gr, resolved_text = build_grating_fig(
            lam_nm=lam_nm,
            d_um=d_um,
            n_max=n_max_ctrl,
            wave_colour=wave_colour,
            show_n_slit=show_n_slit_gr if mode == "Advanced" else False,
            N_slits=N_slits_gr if mode == "Advanced" else 2,
            show_two_lambda=show_two_lam if mode == "Advanced" else False,
            lam2_nm=lam2_nm if mode == "Advanced" else 555.0,
            n_lines=n_lines_illum if mode == "Advanced" else 1000,
        )
        st.plotly_chart(fig_gr, use_container_width=True)

        # Rayleigh resolution info box
        if mode == "Advanced" and show_two_lam:
            if resolved_text.startswith("✓"):
                st.success(f"**{resolved_text}** — peaks are separated beyond the Rayleigh criterion.")
            else:
                st.warning(f"**{resolved_text}** — peaks overlap; increase N or Δλ.")

        metric_row(
            {
                "Max order visible": str(n_max_visible),
                "d sinθ (n=1)": f"{d_m_val * 1e9:.0f} nm (= λ ✓)" if n_max_visible >= 1 else "No n=1 order",
            }
        )

        # Annotate d sinθ = nλ for visible orders
        if n_max_visible > 0:
            st.caption(
                " | ".join(
                    f"n={n}: θ = {np.degrees(np.arcsin(n * lam / d_m_val)):.1f}°"
                    for n in range(1, min(n_max_visible + 1, 6))
                    if abs(n * lam / d_m_val) <= 1.0
                )
            )

    elif sim_type == "Single Slit Diffraction":

        st.info(
            "📡 **Single-slit diffraction limits telescope resolution** (Rayleigh "
            "criterion). The Hubble Space Telescope's 2.4 m mirror gives angular "
            "resolution of ~0.05 arcseconds. A human eye (~3 mm pupil) gives "
            "~1 arcminute."
        )

        fig_ss, first_min_y = build_single_slit_fig(
            lam_nm=lam_nm,
            b_mm=b_mm,
            D_m=D_m_ss,
            wave_colour=wave_colour,
        )
        st.plotly_chart(fig_ss, use_container_width=True)

        central_max_width = 2 * first_min_y
        metric_row(
            {
                "First minimum ±y": f"±{first_min_y * 1e3:.2f} mm",
                "Central max width": f"{central_max_width * 1e3:.2f} mm",
                "Wavelength": f"{lam_nm:.0f} nm",
            }
        )

    elif sim_type == "Stationary Waves":

        st.info(
            "🎸 **Musical instruments as stationary waves:** A guitar string fixed at "
            "both ends can only support wavelengths where L = nλ/2. The fundamental "
            "and harmonics give each instrument its characteristic timbre (tone "
            "quality). A string of length 0.65 m (guitar A string) has fundamental "
            "f = v/(2L) ≈ 110 Hz."
        )

        fig_sw, lam_sw = build_stationary_fig(
            v=v_sw,
            f=f_sw,
            t_val=t_sw_s,
            A=A_sw,
        )
        st.plotly_chart(fig_sw, use_container_width=True)

        metric_row(
            {
                "Wavelength λ": f"{lam_sw:.3f} m",
                "Frequency": f"{f_sw:.0f} Hz",
                "Wave speed": f"{v_sw:.0f} m/s",
            }
        )

    else:  # Stationary Waves (Harmonics)

        # ── Context info cards ────────────────────────────────────────────────
        if sw_wave_type == "Vibrating String":
            st.info(
                "🎸 **Guitar string:** A guitar string vibrating at its 1st harmonic "
                "(fundamental) produces a pure tone. The frets shorten the string to "
                "raise pitch. Harmonics (overtones) give each instrument its "
                "characteristic timbre."
            )
        elif sw_wave_type == "Open Pipe":
            st.info(
                "🎵 **Flute (open pipe):** A flute is approximately an open pipe. "
                "All harmonics are present, giving a bright, rich sound."
            )
        else:
            st.info(
                "🎷 **Clarinet (closed pipe):** A clarinet is approximately a closed "
                "pipe (closed at the reed end). Only odd harmonics sound — giving a "
                "hollow, woody timbre. The octave key activates the 3rd harmonic "
                "(n=3) rather than n=2."
            )

        # ── Build and display main standing-wave figure ───────────────────────
        _sw_show_tw = sw_show_travelling if mode == "Advanced" else False
        fig_harm, sw_data = build_harmonic_fig(
            wave_type=sw_wave_type,
            n=sw_n,
            f1=sw_f1,
            v=sw_v,
            phase_deg=sw_phase_deg,
            show_travelling=_sw_show_tw,
        )
        st.plotly_chart(fig_harm, use_container_width=True)

        # ── Metrics row ───────────────────────────────────────────────────────
        _sw_n_eff = sw_data["n_eff"]
        _sw_fn = sw_data["fn"]
        _sw_lam_n = sw_data["lam_n"]
        _sw_L = sw_data["L"]
        _sw_n_nodes = sw_data["n_nodes"]
        _sw_n_antinodes = sw_data["n_antinodes"]
        _sw_L_over_lam = _sw_L / _sw_lam_n if _sw_lam_n > 0 else 0.0

        metric_row(
            {
                "fₙ (Hz)": f"{_sw_fn:.1f}",
                "λₙ (m)": f"{_sw_lam_n:.3f}",
                "Nodes": str(_sw_n_nodes),
                "Antinodes": str(_sw_n_antinodes),
                "L / λₙ": f"{_sw_L_over_lam:.2f}",
            }
        )

        # ── Harmonic frequency spectrum ───────────────────────────────────────
        fig_spec = build_harmonic_spectrum_fig(
            wave_type=sw_wave_type,
            f1=sw_f1,
            n_selected=_sw_n_eff,
        )
        st.plotly_chart(fig_spec, use_container_width=True)

        if sw_wave_type == "Closed Pipe (one end)":
            st.caption(
                "Closed pipe: only **odd** harmonics present (hollow timbre — like a "
                "clarinet). Even harmonics shown in grey at zero amplitude."
            )
        else:
            st.caption(
                "String / open pipe: **all** harmonics present (rich timbre). "
                "The selected harmonic is highlighted in red."
            )

        # ── Physics notes for this tab ────────────────────────────────────────
        _sw_spec_ref = "Component 3, Topic 8 (Waves and the Electromagnetic Spectrum)"
        _sw_equations = [
            r"f_n = \frac{nv}{2L} \text{ (string / open pipe)}",
            r"f_n = \frac{nv}{4L},\ n = 1,3,5,\ldots \text{ (closed pipe)}",
            r"y(x,t) = 2A\sin(kx)\cos(\omega t)",
        ]
        _sw_explanation = (
            "A **stationary (standing) wave** is formed when two identical waves "
            "travel in opposite directions. Superposition gives **nodes** (zero "
            "displacement at all times) and **antinodes** (maximum displacement). "
            "For a **vibrating string** or **open pipe** of length L, only "
            "wavelengths satisfying $L = n\\lambda/2$ are supported, giving "
            "harmonics $f_n = nv/(2L)$. A **closed pipe** (one end closed) must "
            "have a displacement node at the closed end and antinode at the open "
            "end, so only $L = n\\lambda/4$ with odd n is allowed: "
            "$f_n = nv/(4L)$, $n = 1,3,5,\\ldots$"
        )
        _sw_advanced = (
            "**Travelling-wave decomposition:** The standing wave "
            "$y = 2A\\sin(kx)\\cos(\\omega t)$ is the sum of "
            "$y_1 = A\\sin(kx - \\omega t)$ and $y_2 = A\\sin(kx + \\omega t)$. "
            "Enable 'Show component travelling waves' above to visualise this.\n\n"
            "**String physics:** Wave speed $v = \\sqrt{T/\\mu}$ where $T$ is "
            "tension (N) and $\\mu$ is linear density (kg/m). Tightening a string "
            "increases $v$ → higher $f_n$. Fretting shortens L → higher $f_n$.\n\n"
            "**Timbre:** Real instruments produce many harmonics simultaneously. "
            "The relative amplitudes of the harmonics determine the tone colour "
            "(timbre). A clarinet's odd-only spectrum gives it a distinctly hollow "
            "sound compared with a flute or guitar."
        )
        physics_notes(
            spec_ref=_sw_spec_ref,
            equations=_sw_equations,
            explanation=_sw_explanation,
            advanced_text=_sw_advanced,
            mode=mode,
        )

    # ── Physics notes (all modes) ─────────────────────────────────────────────
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )
