"""
Diffraction Grating simulation for WJEC Eduqas A Level Physics.

Component 1, Topic 5 — Waves (diffraction and interference).

Covers:
  - Grating equation d·sinθ = nλ (Basic)
  - Intensity vs angle for monochromatic and white light (Basic)
  - Huygens wavefront animation with screen pattern (Basic)
  - Single-slit vs double-slit vs N-slit intensity comparison (Advanced)
  - Order overlap — where n=2 red meets n=3 violet (Advanced)
"""

import json
import math

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
from utils.style import COLOURS, plotly_layout
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Page config ────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Diffraction Grating — WJEC A Level Physics",
    page_icon="🌈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Module-level constants ─────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 5 (Waves) — diffraction and interference"

EQUATIONS = [
    r"d \sin\theta_n = n\lambda",
    r"d = \frac{1}{N} \quad (N = \text{lines per metre})",
    r"n_{\max} = \left\lfloor \frac{d}{\lambda} \right\rfloor",
]

EXPLANATION = (
    "A **diffraction grating** is a surface with many parallel, equally-spaced slits "
    "(or lines). When monochromatic light of wavelength $\\lambda$ falls on a grating "
    "with spacing $d$ (metres), constructive interference between Huygens wavelets "
    "from adjacent slits occurs only where the path difference equals an integer "
    "multiple of $\\lambda$. The geometry gives the **grating equation**: "
    "$d\\sin\\theta_n = n\\lambda$, where $n = 0, \\pm1, \\pm2, \\ldots$ is the "
    "**order** and $\\theta_n$ is the diffraction angle. The grating spacing is "
    "$d = 1/N$ where $N$ is the number of lines per metre. The maximum visible "
    "order satisfies $n_{\\max} = \\lfloor d/\\lambda \\rfloor$ (since "
    "$\\sin\\theta \\leq 1$). For **white light**, each wavelength diffracts at a "
    "different angle, producing a **spectrum** at each order position — violet "
    "(short $\\lambda$) closest to centre, red furthest out."
)

ADVANCED_TEXT = (
    "**N-slit intensity pattern:** The full expression for N coherent slits is "
    "$I(\\theta) = I_0\\left(\\dfrac{\\sin(N\\psi/2)}{\\sin(\\psi/2)}\\right)^2$ "
    "where $\\psi = 2\\pi d\\sin\\theta/\\lambda$. "
    "As $N$ increases, principal maxima sharpen (width $\\propto 1/N$) and "
    "$N-2$ secondary maxima appear between them. A real grating has $N \\sim 10^4$ "
    "lines, making the principal maxima extremely sharp — hence their use in "
    "precision spectroscopy.\n\n"
    "**Resolving power:** $R = \\lambda/\\Delta\\lambda_{\\min} = nN$ "
    "(order $n$ × number of illuminated lines $N$). A grating with 1000 lines "
    "in first order can resolve $\\Delta\\lambda \\approx 0.5$ nm at 500 nm.\n\n"
    "**Order overlap:** The second order of wavelength $\\lambda_1$ appears at the "
    "same angle as the third order of $\\lambda_2$ when $2\\lambda_1 = 3\\lambda_2$, "
    "i.e.~$\\lambda_2 = (2/3)\\lambda_1$. This means the red end of the second-order "
    "spectrum overlaps the violet end of the third order. Blocking filters are used "
    "in spectrometers to avoid this ambiguity."
)

# Visible wavelengths used for white-light mode (7 evenly spaced across 400–700 nm)
WHITE_LIGHT_LAMBDAS = [400, 450, 500, 550, 600, 650, 700]


# ── Helper: wavelength → hex colour ──────────────────────────────────────────


def wavelength_to_rgb(lam_nm: float) -> str:
    """
    Convert a visible wavelength in nm to a representative HTML hex colour.

    Parameters
    ----------
    lam_nm : wavelength in nanometres (380–780)

    Returns
    -------
    Hex colour string, e.g. '#FF0000'
    """
    if lam_nm < 380:
        return "#8B00FF"
    elif lam_nm < 420:
        return "#9400D3"
    elif lam_nm < 450:
        return "#6600CC"
    elif lam_nm < 495:
        return "#0000FF"
    elif lam_nm < 520:
        return "#00AAFF"
    elif lam_nm < 565:
        return "#00FF00"
    elif lam_nm < 590:
        return "#FFFF00"
    elif lam_nm < 625:
        return "#FF7F00"
    else:
        return "#FF2200"


# ── Physics helpers ────────────────────────────────────────────────────────────


def grating_orders(lam_nm: float, d_m: float, n_max_user: int) -> list[dict]:
    """
    Compute diffraction order angles for a grating.

    Parameters
    ----------
    lam_nm     : wavelength (nm)
    d_m        : grating spacing (m)
    n_max_user : maximum order requested by user

    Returns
    -------
    List of dicts with keys: n, theta_deg, sin_theta, path_diff_nm
    """
    lam_m = lam_nm * 1e-9
    orders = []
    for n in range(-n_max_user, n_max_user + 1):
        sin_th = n * lam_m / d_m
        if abs(sin_th) > 1.0:
            continue
        theta_deg = math.degrees(math.asin(sin_th))
        orders.append(
            {
                "n": n,
                "theta_deg": theta_deg,
                "sin_theta": sin_th,
                "path_diff_nm": abs(n) * lam_nm,
            }
        )
    return orders


def n_slit_intensity(
    theta_arr: np.ndarray,
    lam_m: float,
    d_m: float,
    N: int,
) -> np.ndarray:
    """
    Compute normalised N-slit intensity pattern as a function of angle.

    Parameters
    ----------
    theta_arr : angles in degrees
    lam_m     : wavelength (m)
    d_m       : grating spacing (m)
    N         : number of slits

    Returns
    -------
    Normalised intensity array (peak = 1)
    """
    psi = np.pi * d_m * np.sin(np.radians(theta_arr)) / lam_m  # half-phase per slit
    denom = np.sin(psi)
    denom_safe = np.where(np.abs(denom) < 1e-14, 1e-14, denom)
    I = (np.sin(N * psi) / denom_safe) ** 2
    return I / (N ** 2)


def sinc_sq(beta: np.ndarray) -> np.ndarray:
    """Return (sinβ/β)² with safe handling at β=0."""
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(np.abs(beta) < 1e-12, 1.0, (np.sin(beta) / beta) ** 2)


# ── Plot: Intensity vs angle ───────────────────────────────────────────────────


def build_intensity_fig(
    lam_nm: float,
    d_mm: float,
    n_max_user: int,
    source_type: str,
) -> go.Figure:
    """
    Build the Intensity vs diffraction angle Plotly figure.

    Parameters
    ----------
    lam_nm      : wavelength (nm) — used for monochromatic mode
    d_mm        : grating spacing (mm)
    n_max_user  : maximum order to show
    source_type : 'Monochromatic' or 'White light (400–700 nm, 7 wavelengths)'

    Returns
    -------
    Plotly Figure
    """
    d_m = d_mm * 1e-3
    theta = np.linspace(-89.9, 89.9, 8000)
    fig = go.Figure()

    lambdas = (
        WHITE_LIGHT_LAMBDAS if source_type.startswith("White") else [lam_nm]
    )

    for wl in lambdas:
        lam_m = wl * 1e-9
        col = wavelength_to_rgb(wl)
        lam_display = f"{wl:.0f} nm"

        # Find principal-maximum positions (delta functions → narrow bars)
        n_max_phys = int(d_m / lam_m)
        n_show = min(n_max_user, n_max_phys)

        for n in range(-n_show, n_show + 1):
            sin_th = n * lam_m / d_m
            if abs(sin_th) > 1.0:
                continue
            theta_n = math.degrees(math.asin(sin_th))
            height = 1.0 / (abs(n) + 1) ** 0.5 if n != 0 else 1.0
            fig.add_trace(
                go.Scatter(
                    x=[theta_n, theta_n],
                    y=[0, height],
                    mode="lines",
                    name=lam_display if n == 0 else None,
                    showlegend=(n == 0),
                    line=dict(color=col, width=3 if n == 0 else 2),
                    hovertemplate=(
                        f"λ={wl} nm | n={n}<br>"
                        f"θ={theta_n:.2f}°<br>"
                        f"sinθ={sin_th:.4f}<br>"
                        f"path diff={abs(n)*wl:.0f} nm"
                        "<extra></extra>"
                    ),
                )
            )
            # Order label
            if abs(theta_n) < 88:
                fig.add_annotation(
                    x=theta_n,
                    y=height + 0.06,
                    text=f"n={n}",
                    showarrow=False,
                    font=dict(color=col, size=8),
                )

    # Critical angle marker (sinθ=1 → θ=90°)
    fig.add_vline(
        x=90,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1),
        opacity=0.6,
        annotation_text="sinθ=1",
        annotation_position="top left",
        annotation_font=dict(size=9, color=COLOURS["highlight"]),
    )
    fig.add_vline(
        x=-90,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1),
        opacity=0.6,
    )

    title_lam = f"λ={lam_nm:.0f} nm" if not source_type.startswith("White") else "White light"
    fig.update_layout(
        **plotly_layout(
            height=420,
            title=dict(
                text=(
                    f"Diffraction Grating — {title_lam}, "
                    f"d = {d_mm*1e6:.0f} nm "
                    f"({1/d_m/1000:.0f} lines/mm)"
                ),
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Diffraction angle θ (°)",
                range=[-92, 92],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Relative intensity",
                range=[-0.05, 1.25],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── Plot: Advanced N-slit comparison ──────────────────────────────────────────


def build_nslit_comparison_fig(
    lam_nm: float,
    d_mm: float,
    n_max_user: int,
) -> go.Figure:
    """
    Build a Plotly figure comparing single-slit, double-slit and N-slit patterns.

    Parameters
    ----------
    lam_nm     : wavelength (nm)
    d_mm       : grating spacing (mm)
    n_max_user : maximum order to highlight

    Returns
    -------
    Plotly Figure
    """
    lam_m = lam_nm * 1e-9
    d_m = d_mm * 1e-3
    col = wavelength_to_rgb(lam_nm)

    theta = np.linspace(-89.9, 89.9, 6000)

    fig = go.Figure()

    n_values = [1, 2, 5, 20, 100]
    palette = [COLOURS["primary"], COLOURS["secondary"], COLOURS["tertiary"],
               COLOURS["quaternary"], COLOURS["advanced"]]

    for N, c in zip(n_values, palette):
        I = n_slit_intensity(theta, lam_m, d_m, N)
        label = (
            "Single slit (N=1)"
            if N == 1
            else f"N = {N} slits"
        )
        fig.add_trace(
            go.Scatter(
                x=theta,
                y=I,
                mode="lines",
                name=label,
                line=dict(color=c, width=1.8 if N < 20 else 1.2),
                opacity=0.9,
            )
        )

    fig.update_layout(
        **plotly_layout(
            height=400,
            title=dict(
                text=(
                    f"Single → N-slit transition — λ={lam_nm:.0f} nm, "
                    f"d={d_mm*1e6:.0f} nm"
                ),
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Diffraction angle θ (°)",
                range=[-70, 70],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Normalised intensity I / N²",
                range=[-0.02, 1.1],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── Plot: Order overlap chart ──────────────────────────────────────────────────


def build_order_overlap_fig(d_mm: float, n_max_user: int) -> go.Figure:
    """
    Build a chart showing angular positions for all wavelengths and orders,
    highlighting where different orders overlap.

    Parameters
    ----------
    d_mm       : grating spacing (mm)
    n_max_user : maximum order to show

    Returns
    -------
    Plotly Figure
    """
    d_m = d_mm * 1e-3
    lambdas_full = np.linspace(400, 700, 31)  # 31 wavelengths across visible

    fig = go.Figure()

    for n in range(1, n_max_user + 1):
        thetas = []
        colours_rgb = []
        lam_labels = []
        for wl in lambdas_full:
            lam_m = wl * 1e-9
            sin_th = n * lam_m / d_m
            if abs(sin_th) > 1.0:
                break
            theta_n = math.degrees(math.asin(sin_th))
            thetas.append(theta_n)
            colours_rgb.append(wavelength_to_rgb(wl))
            lam_labels.append(wl)

        if not thetas:
            continue

        # Draw as a scatter with per-point colour using a workaround
        # (each point separately for colour gradient)
        for i in range(len(thetas) - 1):
            fig.add_trace(
                go.Scatter(
                    x=[thetas[i], thetas[i + 1]],
                    y=[n, n],
                    mode="lines",
                    line=dict(color=colours_rgb[i], width=8),
                    showlegend=False,
                    hovertemplate=(
                        f"Order n={n}<br>"
                        f"λ={lam_labels[i]:.0f} nm<br>"
                        f"θ={thetas[i]:.1f}°"
                        "<extra></extra>"
                    ),
                )
            )

    # Mark overlap regions: n=2 red (700 nm) vs n=3 violet (467 nm ≈ 700*2/3)
    for n_a, n_b in [(2, 3), (3, 4)]:
        for wl_a in [680, 700]:
            lam_a = wl_a * 1e-9
            sin_a = n_a * lam_a / d_m
            if abs(sin_a) > 1.0:
                continue
            theta_overlap = math.degrees(math.asin(sin_a))
            fig.add_vline(
                x=theta_overlap,
                line=dict(color=COLOURS["highlight"], dash="dot", width=1),
                opacity=0.5,
            )

    fig.update_layout(
        **plotly_layout(
            height=300,
            title=dict(
                text="Order Overlap — angle vs order for full visible spectrum",
                font=dict(size=13),
            ),
            xaxis=dict(
                title="Diffraction angle θ (°)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Diffraction order n",
                tickvals=list(range(1, n_max_user + 1)),
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── p5.js Huygens wavefront animation ─────────────────────────────────────────


def build_grating_animation(
    lam_nm: float,
    d_mm: float,
    source_type: str,
) -> str:
    """
    Build the p5.js grating/Huygens animation HTML string.

    Features
    --------
    - Grating drawn as vertical lines on the left (first 10 slits shown)
    - Animated Huygens wavefront circles radiating from each slit
    - Screen on the right showing intensity pattern (bright spots at maxima)
    - For white light: rainbow spectrum of spots spreads outward
    - Lines from grating to each order spot with path-difference label 'nλ'
    - Play / pause + speed controls

    Parameters
    ----------
    lam_nm      : wavelength (nm) for monochromatic mode
    d_mm        : grating spacing (mm)
    source_type : 'Monochromatic' or starts with 'White'

    Returns
    -------
    HTML string
    """
    d_m = d_mm * 1e-3
    is_white = source_type.startswith("White")

    # Pre-compute order angles for Python to pass to JS
    if is_white:
        orders_data = []
        for wl in WHITE_LIGHT_LAMBDAS:
            lam_m = wl * 1e-9
            for n in range(-3, 4):
                sin_th = n * lam_m / d_m
                if abs(sin_th) > 1.0:
                    continue
                theta = math.asin(sin_th)
                col = wavelength_to_rgb(wl)
                orders_data.append(
                    {"n": n, "theta": theta, "col": col, "lam": wl}
                )
    else:
        orders_data = []
        lam_m = lam_nm * 1e-9
        for n in range(-3, 4):
            sin_th = n * lam_m / d_m
            if abs(sin_th) > 1.0:
                continue
            theta = math.asin(sin_th)
            col = wavelength_to_rgb(lam_nm)
            orders_data.append(
                {"n": n, "theta": theta, "col": col, "lam": lam_nm}
            )

    data = json.dumps({
        "lamNm": float(lam_nm),
        "dMm": float(d_mm),
        "isWhite": is_white,
        "orders": orders_data,
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>
  body{{margin:0;overflow:hidden;background:#0e1117;}}
  canvas{{display:block;}}
</style>
</head><body>
<script>
const CFG = {data};

// ── Layout ──────────────────────────────────────────────────────────────────
const GRATING_X_FRAC = 0.22;   // grating at 22% of canvas width
const SCREEN_X_FRAC  = 0.92;   // screen at 92% of canvas width
const N_SLITS_DRAW   = 10;     // number of slit lines to draw
const SLIT_SPACING_PX = 28;    // vertical spacing between slit dots (px)

// ── State ───────────────────────────────────────────────────────────────────
let t = 0, playing = true, speed = 1;

// Wavefront rings — each: {{slitY, r, alpha, col}}
let rings = [];
let ringTimer = 0;
const RING_INTERVAL = 8;   // frames between new rings per slit

function setup() {{
  createCanvas(windowWidth || 700, 400);
  textFont('monospace');
  frameRate(30);
}}

function windowResized() {{
  resizeCanvas(windowWidth, 400);
}}

function _inPlayBtn()  {{ return mouseX > width-128 && mouseX < width-8  && mouseY > 8  && mouseY < 36; }}
function _inSpeedBtn() {{ return mouseX > width-128 && mouseX < width-8  && mouseY > 42 && mouseY < 70; }}

function mousePressed() {{
  if (_inPlayBtn())  {{ playing = !playing; }}
  if (_inSpeedBtn()) {{ speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; }}
}}

function draw() {{
  background('#0e1117');

  let gx = width * GRATING_X_FRAC;
  let sx = width * SCREEN_X_FRAC;
  let cy = height / 2;

  // ── Slit y-positions ──────────────────────────────────────────────────────
  let slitYs = [];
  for (let i = 0; i < N_SLITS_DRAW; i++) {{
    slitYs.push(cy + (i - (N_SLITS_DRAW - 1) / 2) * SLIT_SPACING_PX);
  }}

  // ── Spawn new wavefront rings every RING_INTERVAL frames ─────────────────
  if (playing) {{
    ringTimer += speed;
    if (ringTimer >= RING_INTERVAL) {{
      ringTimer = 0;
      let ringCol = CFG.isWhite ? null : _orderColour(CFG.lamNm);
      for (let sy of slitYs) {{
        rings.push({{ slitY: sy, r: 0, alpha: 180,
                      col: ringCol || _rainbowRingCol() }});
      }}
    }}
  }}

  // ── Update & draw rings ───────────────────────────────────────────────────
  let newRings = [];
  for (let rg of rings) {{
    if (playing) {{
      rg.r     += 1.8 * speed;
      rg.alpha -= 2.5 * speed;
    }}
    if (rg.alpha > 0 && rg.r < width) {{
      let c = color(rg.col || '#88aaff');
      c.setAlpha(rg.alpha);
      noFill(); stroke(c); strokeWeight(1);
      circle(gx, rg.slitY, rg.r * 2);
      newRings.push(rg);
    }}
  }}
  rings = newRings;

  // ── Draw grating lines ────────────────────────────────────────────────────
  stroke('#888888'); strokeWeight(3);
  // Top and bottom solid sections
  let topSlit = slitYs[0];
  let botSlit  = slitYs[N_SLITS_DRAW - 1];
  line(gx, 0,           gx, topSlit - SLIT_SPACING_PX / 2);
  line(gx, botSlit + SLIT_SPACING_PX / 2, gx, height);
  // Segments between slits
  for (let i = 0; i < N_SLITS_DRAW - 1; i++) {{
    line(gx, slitYs[i] + SLIT_SPACING_PX / 2,
         gx, slitYs[i + 1] - SLIT_SPACING_PX / 2);
  }}

  // Slit gap indicators (small white ticks)
  stroke('#ffffff'); strokeWeight(1);
  for (let sy of slitYs) {{
    line(gx - 6, sy, gx + 6, sy);
  }}

  // Grating label
  noStroke(); fill('#aaaaaa'); textSize(9);
  text('Grating', gx - 24, height - 12);
  text('d = ' + (CFG.dMm * 1e6).toFixed(0) + ' nm', gx - 24, height - 2);

  // ── Draw screen ───────────────────────────────────────────────────────────
  stroke('#fafafa'); strokeWeight(3);
  line(sx, 0, sx, height);
  noStroke(); fill('#fafafa'); textSize(9);
  text('screen', sx + 3, cy - 5);

  // ── Draw order spots on screen + lines from grating ───────────────────────
  let midSlitY = cy;  // approximate grating centre
  for (let od of CFG.orders) {{
    let screenY = cy + (sx - gx) * Math.tan(od.theta);
    if (screenY < 4 || screenY > height - 4) continue;

    let n = od.n;
    // Spot brightness decreases with order
    let spotSize = n === 0 ? 14 : max(6, 14 - abs(n) * 2);
    let alpha = n === 0 ? 230 : max(60, 220 - abs(n) * 40);

    // Faint line from grating centre to spot
    let lc = color(od.col);
    lc.setAlpha(50);
    stroke(lc); strokeWeight(1); noFill();
    line(gx, midSlitY, sx - 3, screenY);

    // Spot glow
    for (let gr = spotSize + 6; gr > 0; gr -= 3) {{
      let gc = color(od.col);
      gc.setAlpha(map(gr, 0, spotSize + 6, 0, 30));
      noStroke(); fill(gc);
      circle(sx + 2, screenY, gr * 2);
    }}

    // Spot core
    noStroke(); let sc = color(od.col); sc.setAlpha(alpha);
    fill(sc);
    circle(sx + 2, screenY, spotSize);

    // Order label + path-diff label
    fill('#fafafa'); textSize(8); noStroke();
    text('n=' + n, sx + 10, screenY - 3);
    if (n !== 0) {{
      fill(od.col); textSize(7);
      text(abs(n) + 'λ', sx + 10, screenY + 8);
    }}
  }}

  // ── Incoming beam arrow ───────────────────────────────────────────────────
  let beamCol = CFG.isWhite ? '#ffffff' : _orderColour(CFG.lamNm);
  stroke(beamCol); strokeWeight(2);
  line(8, cy, gx - 8, cy);
  // Arrowhead
  fill(beamCol); noStroke();
  triangle(gx - 6, cy - 5, gx - 6, cy + 5, gx + 2, cy);

  noStroke(); fill(beamCol); textSize(9);
  text(CFG.isWhite ? 'White light' : 'λ = ' + CFG.lamNm.toFixed(0) + ' nm',
       12, cy - 7);

  // ── Play / speed controls ─────────────────────────────────────────────────
  noStroke(); fill(15, 15, 25, 220); rect(width - 130, 6, 122, 72, 6);
  fill('#fafafa'); textSize(11); noStroke();
  text(playing ? '⏸ Pause' : '▶ Play', width - 122, 26);
  text('⚡ ' + speed + 'x',              width - 122, 58);

  // ── Advance time ──────────────────────────────────────────────────────────
  if (playing) t += 0.05 * speed;
}}

function _orderColour(lamNm) {{
  if (lamNm < 420)  return '#9400D3';
  if (lamNm < 450)  return '#6600CC';
  if (lamNm < 495)  return '#0000FF';
  if (lamNm < 520)  return '#00AAFF';
  if (lamNm < 565)  return '#00FF00';
  if (lamNm < 590)  return '#FFFF00';
  if (lamNm < 625)  return '#FF7F00';
  return '#FF2200';
}}

function _rainbowRingCol() {{
  // Cycle through rainbow for white-light rings
  let idx = floor(random(0, 7));
  let cols = ['#9400D3','#0000FF','#00AAFF','#00FF00',
               '#FFFF00','#FF7F00','#FF2200'];
  return cols[idx];
}}
</script></body></html>"""


# ── Streamlit page ─────────────────────────────────────────────────────────────

sim_header("Diffraction Grating", SPEC_REF)
mode = mode_toggle()

# ── Sidebar controls ───────────────────────────────────────────────────────────

with st.sidebar:
    st.header("Controls")

    lam_nm = st.slider(
        "Wavelength λ (nm)",
        min_value=380,
        max_value=780,
        value=550,
        step=1,
        help="Visible spectrum: 380 nm (violet) → 780 nm (red).",
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

    lines_per_mm = st.slider(
        "Lines per mm (N)",
        min_value=100,
        max_value=1000,
        value=300,
        step=50,
        help="Number of grating lines per millimetre. d = 1/N mm.",
    )
    d_m = 1.0 / (lines_per_mm * 1000.0)   # spacing in metres
    d_mm = d_m * 1e3                        # spacing in mm
    d_nm = d_m * 1e9                        # spacing in nm
    st.caption(f"d = 1/{lines_per_mm} mm = {d_nm:.0f} nm = {d_mm*1e6:.0f} nm")

    n_max_phys = int(d_m / (lam_nm * 1e-9))
    n_max_user = st.slider(
        "Max order shown",
        min_value=1,
        max_value=4,
        value=min(3, max(1, n_max_phys)),
        step=1,
        help="Auto-limited to n_max = floor(d/λ) = physical maximum.",
    )
    # Clamp to physical maximum
    n_max_user = min(n_max_user, n_max_phys) if n_max_phys >= 1 else 1

    source_type = st.radio(
        "Light source",
        ["Monochromatic", "White light (400–700 nm, 7 wavelengths)"],
        help=(
            "Monochromatic: single wavelength. "
            "White light: 7 wavelengths across visible spectrum — "
            "produces rainbow spectra at each order."
        ),
    )

left_col, right_col = two_column_layout(3, 7)

# ── Left column: physics notes and metrics ─────────────────────────────────────

with left_col:

    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )

    st.divider()

    lam_m_val = lam_nm * 1e-9
    n_max_actual = int(d_m / lam_m_val)

    # Angle for n=1
    if n_max_actual >= 1:
        theta_1 = math.degrees(math.asin(1 * lam_m_val / d_m))
        theta_1_str = f"{theta_1:.2f}°"
    else:
        theta_1_str = "n/a"

    metric_row(
        {
            "d (nm)": f"{d_nm:.0f}",
            "θ (n=1)": theta_1_str,
            "n_max": str(n_max_actual),
        }
    )

    st.divider()

    # Per-order table (monochromatic only)
    if not source_type.startswith("White") and n_max_actual >= 1:
        st.markdown("**Order table**")
        orders_list = grating_orders(lam_nm, d_m, min(n_max_user, n_max_actual))

        header_cols = st.columns(4)
        for hc, lbl in zip(header_cols, ["n", "θ (°)", "sinθ", "nλ (nm)"]):
            hc.markdown(f"**{lbl}**")

        for od in orders_list:
            if od["n"] < 0:
                continue   # show positive orders only for brevity (symmetrical)
            row_cols = st.columns(4)
            row_cols[0].write(str(od["n"]))
            row_cols[1].write(f"{od['theta_deg']:.2f}")
            row_cols[2].write(f"{od['sin_theta']:.4f}")
            row_cols[3].write(f"{od['path_diff_nm']:.0f}")

    elif source_type.startswith("White"):
        st.info(
            "White light produces a spectrum at each order. "
            "Violet (400 nm) diffracts less than red (700 nm) so the "
            "spectrum fans outward from each order."
        )

# ── Right column: animation + plots ───────────────────────────────────────────

with right_col:

    st.info(
        "Diffraction gratings are used in spectroscopes to identify elements: "
        "each element emits a unique set of wavelengths, and the grating spreads "
        "them into sharply separated lines. The resolving power R = nN (order × "
        "number of illuminated lines) determines which wavelengths can be separated."
    )

    # ── 1. p5.js Huygens animation ────────────────────────────────────────────

    anim_html = build_grating_animation(lam_nm, d_mm, source_type)
    components.html(anim_html, height=440)
    st.caption(
        "Huygens wavefronts radiate from each slit — constructive interference "
        "where path difference = nλ creates bright spots on the screen. "
        "Click play/pause · ⚡ to change speed."
    )

    st.divider()

    # ── 2. Intensity vs angle ─────────────────────────────────────────────────

    fig_intensity = build_intensity_fig(lam_nm, d_mm, n_max_user, source_type)
    st.plotly_chart(fig_intensity, use_container_width=True)

    # Visible spectrum colour bar (white light mode)
    if source_type.startswith("White"):
        # Draw a CSS gradient bar representing the visible spectrum
        st.markdown(
            "<div style='"
            "height:18px;width:100%;border-radius:4px;"
            "background:linear-gradient(to right,"
            " #8B00FF 0%,#4400FF 10%,#0000FF 18%,#0066FF 25%,"
            " #00AAFF 32%,#00FFAA 40%,#00FF00 48%,"
            " #AAFF00 55%,#FFFF00 62%,#FFB300 70%,"
            " #FF7700 78%,#FF3300 86%,#FF0000 100%"
            ");margin-bottom:4px'>"
            "</div>"
            "<div style='font-size:0.75rem;color:#aaa;display:flex;"
            "justify-content:space-between'>"
            "<span>400 nm (violet)</span><span>700 nm (red)</span>"
            "</div>",
            unsafe_allow_html=True,
        )
        st.caption(
            "White light spectrum: each order fans into a rainbow — "
            "violet (shortest λ, smallest θ) to red (longest λ, largest θ)."
        )

    st.divider()

    # ── 3. Advanced: N-slit comparison and order overlap ─────────────────────

    if mode == "Advanced":
        advanced_divider()

        st.subheader("Single-slit → N-slit → Grating transition")
        fig_nslit = build_nslit_comparison_fig(lam_nm, d_mm, n_max_user)
        st.plotly_chart(fig_nslit, use_container_width=True)
        st.caption(
            "As N increases, principal maxima sharpen (width ∝ 1/N) and N−2 "
            "secondary maxima appear between them. A real grating (N ≫ 1000) "
            "produces extremely narrow, bright lines — ideal for spectroscopy."
        )

        st.divider()

        st.subheader("Order overlap — visible spectrum")
        fig_overlap = build_order_overlap_fig(d_mm, min(n_max_user, 4))
        st.plotly_chart(fig_overlap, use_container_width=True)
        st.caption(
            "Dashed vertical lines mark where orders overlap "
            "(e.g. n=2 red at same angle as n=3 violet). "
            "Spectrometers use order-sorting filters to avoid ambiguity."
        )

# ── Exam practice questions ───────────────────────────────────────────────────

_lam_m_exam = lam_nm * 1e-9
_n_max_exam = int(d_m / _lam_m_exam)
if _n_max_exam >= 1:
    _theta1_exam = math.degrees(math.asin(_lam_m_exam / d_m))
else:
    _theta1_exam = 0.0
_exam_questions_19 = [
    {
        "q": (
            f"A diffraction grating has {lines_per_mm:.0f} lines per mm. "
            f"Light of wavelength {lam_nm:.0f} nm is incident normally. "
            f"Calculate the angle of the first-order maximum."
        ),
        "marks": 3,
        "answer": f"θ₁ = {_theta1_exam:.2f}°",
        "working": [
            f"d = 1/{lines_per_mm:.0f}×10³ = {d_m:.3e} m",
            (
                f"d sinθ = nλ → sinθ = λ/d = {lam_nm:.0f}×10⁻⁹/{d_m:.3e} "
                f"= {math.sin(math.radians(_theta1_exam)):.4f}"
            ),
            f"θ₁ = {_theta1_exam:.2f}°",
        ],
    },
    {
        "q": (
            f"Calculate the maximum order of diffraction visible with this grating "
            f"and wavelength."
        ),
        "marks": 2,
        "answer": f"n_max = {_n_max_exam}",
        "working": [
            f"n_max = floor(d/λ) = floor({d_m:.3e}/{lam_nm:.0f}×10⁻⁹) = {_n_max_exam}",
        ],
    },
    {
        "q": (
            "State one advantage of using a diffraction grating over a double slit "
            "to measure wavelength."
        ),
        "marks": 2,
        "answer": (
            "Grating produces much sharper, brighter maxima (intensity ∝ N²), "
            "allowing more precise angle measurement."
        ),
        "working": [],
    },
]
show_exam_panel(_exam_questions_19)
