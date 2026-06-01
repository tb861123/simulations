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

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

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

        d_um = st.select_slider(
            "Grating spacing d (μm)",
            options=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0],
            value=2.0,
            help="Larger spacing → smaller diffraction angles.",
        )
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

    else:  # Stationary Waves

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

# ── Right column: plots & metrics ─────────────────────────────────────────────

with right_col:

    if sim_type == "Young's Double Slit":

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
        st.plotly_chart(fig_ys, use_container_width=True)

        metric_row(
            {
                "Fringe spacing Δy": f"{fringe_spacing * 1e3:.3f} mm",
                "Wavelength": f"{lam_nm:.0f} nm",
                "Order n=1 position": f"{lam_D_a * 1e3:.3f} mm",
            }
        )

    elif sim_type == "Diffraction Grating":

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

    else:  # Stationary Waves

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

    # ── Physics notes (all modes) ─────────────────────────────────────────────
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )
