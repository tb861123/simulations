"""
Standing Waves simulation for WJEC Eduqas A Level Physics.

Component 1, Topic 5 (Waves), standing waves, resonance, harmonics.

Covers:
  - Vibrating string (fixed–fixed): f_n = n·v/(2L), v = sqrt(T/μ)
  - Open pipe (open–open): f_n = n·v_sound/(2L)
  - Closed pipe (closed–open): f_n = n·v_sound/(4L), odd n only
  - Component travelling waves superposing to form standing wave (Basic)
  - Node/antinode positions and labelling
  - Frequency spectrum and resonance response (Advanced)
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
from utils.style import COLOURS, plotly_layout
from utils.ui_components import (
    advanced_divider,
    mode_toggle,
    physics_notes,
    metric_row,
    sim_header,
    two_column_layout,
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 5 (Waves) — standing waves, resonance, harmonics"

EQUATIONS = [
    r"f_n = \frac{n v}{2L} \quad \text{(string or open pipe)}",
    r"f_n = \frac{n v}{4L} \quad \text{(closed pipe, odd } n \text{ only)}",
    r"v = \sqrt{\frac{T}{\mu}} \quad \text{(transverse wave on string)}",
    r"v_\text{sound} = 331 + 0.6\,T_C \text{ m/s}",
    r"\lambda_n = \frac{2L}{n} \quad \text{(string/open pipe)}",
    r"\lambda_n = \frac{4L}{n} \quad \text{(closed pipe, odd } n \text{ only)}",
]

EXPLANATION = (
    "**Standing waves** arise when two identical waves travel in opposite directions "
    "along the same medium and superpose. At **nodes** the amplitude is always zero; "
    "at **antinodes** the amplitude is maximum. For a string or open pipe the "
    "boundary conditions require nodes (or antinodes) at both ends, giving harmonics "
    r"$f_n = nf_1$. "
    "A closed pipe has a node at the closed end and an antinode at the open end, "
    "so only **odd harmonics** are present: n = 1, 3, 5, …  "
    "The fundamental frequency sets the musical pitch; higher harmonics add timbre."
)

ADVANCED_TEXT = (
    "**Wave speed on a string**: $v = \\sqrt{T/\\mu}$. Increasing tension $T$ "
    "raises the wave speed and therefore every harmonic frequency. Increasing the "
    "linear density $\\mu$ (heavier string) lowers the speed and frequencies.  \n\n"
    "**Speed of sound in air** depends on temperature: $v = 331 + 0.6T_C$ m/s. "
    "A warmer concert hall therefore sharpens every organ pipe simultaneously.  \n\n"
    "**Resonance** occurs when the driving frequency matches a natural harmonic. "
    "The amplitude peaks sharply; energy is absorbed efficiently from the driver. "
    "Narrow resonance peaks (high Q) mean the instrument is more selective.  \n\n"
    "**Musical applications**: Guitar frets change $L$ → change $f_1$. Thicker "
    "wound bass strings increase $\\mu$ → lower $f_1$. Tightening a peg increases "
    "$T$ → higher $f_1$. Organ pipes: open pipes have a full harmonic series; "
    "stopped (closed) pipes suppress even harmonics, producing a hollow tone. "
    "Clarinet bore is approximately cylindrical and closed at the reed → "
    "odd harmonics dominate.  \n\n"
    "**Chladni patterns**: Sand on a vibrating plate migrates to nodes, revealing "
    "the two-dimensional nodal geometry. These patterns inspired early acoustics "
    "research and are visible on violin-plate tuning today."
)

N_POINTS = 600   # spatial points for static Plotly chart
AMPLITUDE = 1.0  # normalised displacement amplitude


# ── Physics helpers ───────────────────────────────────────────────────────────


def sound_speed(temp_c: float) -> float:
    """Return speed of sound in air at temperature temp_c (°C)."""
    return 331.0 + 0.6 * temp_c


def string_wave_speed(tension: float, linear_density: float) -> float:
    """Return transverse wave speed on a string: v = sqrt(T/μ)."""
    return np.sqrt(tension / linear_density)


def harmonic_frequency(mode: str, n: int, L: float, v: float) -> float:
    """
    Return the n-th harmonic frequency for the given mode.

    Parameters
    ----------
    mode : 'String', 'Open Pipe', or 'Closed Pipe'
    n    : harmonic number (positive integer; odd only for Closed Pipe)
    L    : length (m)
    v    : wave speed (m/s)

    Returns
    -------
    f_n : frequency (Hz)
    """
    if mode in ("String", "Open Pipe"):
        return n * v / (2.0 * L)
    else:  # Closed Pipe — odd harmonics only; n already enforced to be odd
        return n * v / (4.0 * L)


def harmonic_wavelength(mode: str, n: int, L: float) -> float:
    """Return wavelength λ_n for the n-th harmonic."""
    if mode in ("String", "Open Pipe"):
        return 2.0 * L / n
    else:
        return 4.0 * L / n


def node_positions(mode: str, n: int, L: float) -> list[float]:
    """
    Return sorted x-positions of displacement nodes for the n-th harmonic.

    For a string (fixed–fixed): nodes at x = m·L/n, m = 0,1,...,n
    For an open pipe (open–open): same displacement nodes at x = m·L/n
    For a closed pipe (closed–open, odd n):
        displacement nodes at x = m·2L/n, m = 0,1,...,n (only even multiples
        of L/n land within [0,L] that satisfy sin condition).
    """
    if mode in ("String", "Open Pipe"):
        return [m * L / n for m in range(n + 1)]
    else:
        # y(x) = A·sin(nπx/(2L)); nodes where sin = 0 → nπx/(2L) = kπ → x = 2kL/n
        nodes = []
        for k in range(n + 1):
            x_node = 2.0 * k * L / n
            if 0.0 <= x_node <= L + 1e-9:
                nodes.append(min(x_node, L))
        return nodes


def antinode_positions(mode: str, n: int, L: float) -> list[float]:
    """Return sorted x-positions of displacement antinodes for the n-th harmonic."""
    if mode in ("String", "Open Pipe"):
        # antinodes midway between nodes: x = (2m+1)·L/(2n), m = 0,...,n-1
        return [(2 * m + 1) * L / (2 * n) for m in range(n)]
    else:
        # antinodes at x = (2m+1)·L/n, m = 0,1,...  within [0,L]
        antinodes = []
        for m in range(n + 1):
            x_an = (2 * m + 1) * L / n
            if x_an <= L + 1e-9:
                antinodes.append(min(x_an, L))
        return antinodes


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_displacement_fig(
    mode: str,
    n: int,
    L: float,
    show_harmonics: bool = True,
) -> go.Figure:
    """
    Build a Plotly figure showing displacement y(x) at t=0 plus the ±envelope.

    Optionally overlays n=1 through current n as faint traces.

    Parameters
    ----------
    mode           : 'String', 'Open Pipe', or 'Closed Pipe'
    n              : selected harmonic number
    L              : length (m)
    show_harmonics : if True also plot n=1 … n-1 as faint traces

    Returns
    -------
    fig : Plotly Figure
    """
    x = np.linspace(0.0, L, N_POINTS)
    fig = go.Figure()

    # Faint lower harmonics
    if show_harmonics and n > 1:
        harmonics_to_show = range(1, n)
        if mode == "Closed Pipe":
            harmonics_to_show = range(1, n, 2)  # odd only, up to n-1
        for ni in harmonics_to_show:
            if mode in ("String", "Open Pipe"):
                y_lower = AMPLITUDE * np.sin(ni * np.pi * x / L)
            else:
                y_lower = AMPLITUDE * np.sin(ni * np.pi * x / (2.0 * L))
            fig.add_trace(
                go.Scatter(
                    x=x,
                    y=y_lower,
                    mode="lines",
                    name=f"n = {ni}",
                    line=dict(width=1, dash="dot"),
                    opacity=0.35,
                )
            )

    # Envelope ±A·sin(nπx/L) [or /2L for closed pipe]
    if mode in ("String", "Open Pipe"):
        envelope = AMPLITUDE * np.sin(n * np.pi * x / L)
    else:
        envelope = AMPLITUDE * np.sin(n * np.pi * x / (2.0 * L))

    fig.add_trace(
        go.Scatter(
            x=x,
            y=envelope,
            mode="lines",
            name="Envelope +",
            line=dict(color=COLOURS["secondary"], width=1, dash="dash"),
            opacity=0.6,
        )
    )
    fig.add_trace(
        go.Scatter(
            x=x,
            y=-envelope,
            mode="lines",
            name="Envelope −",
            line=dict(color=COLOURS["secondary"], width=1, dash="dash"),
            opacity=0.6,
            showlegend=False,
        )
    )

    # Main standing wave at t = 0 (cos(0) = 1)
    fig.add_trace(
        go.Scatter(
            x=x,
            y=envelope,
            mode="lines",
            name=f"n = {n} (t = 0)",
            line=dict(color=COLOURS["primary"], width=2.5),
        )
    )

    # Node markers
    nodes = node_positions(mode, n, L)
    fig.add_trace(
        go.Scatter(
            x=nodes,
            y=[0.0] * len(nodes),
            mode="markers",
            name="Nodes",
            marker=dict(color="#f1c40f", size=10, symbol="circle"),
        )
    )

    # Antinode markers
    antinodes = antinode_positions(mode, n, L)
    fig.add_trace(
        go.Scatter(
            x=antinodes,
            y=[AMPLITUDE if i % 2 == 0 else -AMPLITUDE for i, _ in enumerate(antinodes)],
            mode="markers",
            name="Antinodes",
            marker=dict(color=COLOURS["tertiary"], size=8, symbol="diamond"),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=320,
            title=dict(
                text=f"Displacement Profile — {mode}, n = {n}",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Position x (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-0.02 * L, 1.02 * L],
            ),
            yaxis=dict(
                title="Displacement (normalised)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[-1.3, 1.3],
            ),
        )
    )
    return fig


def build_spectrum_fig(
    mode: str,
    n_max: int,
    L: float,
    v: float,
    f_selected: float,
) -> go.Figure:
    """
    Build a frequency spectrum showing vertical lines at each harmonic f_n.

    Parameters
    ----------
    mode       : 'String', 'Open Pipe', or 'Closed Pipe'
    n_max      : highest harmonic to include
    L          : length (m)
    v          : wave speed (m/s)
    f_selected : currently selected harmonic frequency (highlighted)

    Returns
    -------
    fig : Plotly Figure
    """
    fig = go.Figure()

    if mode == "Closed Pipe":
        harmonics = list(range(1, n_max * 2, 2))  # odd only up to ~2*n_max-1
    else:
        harmonics = list(range(1, n_max + 1))

    freqs = [harmonic_frequency(mode, ni, L, v) for ni in harmonics]
    colours_list = [
        COLOURS["highlight"] if abs(f - f_selected) < 0.01 else COLOURS["primary"]
        for f in freqs
    ]

    for ni, fi, ci in zip(harmonics, freqs, colours_list):
        fig.add_trace(
            go.Scatter(
                x=[fi, fi],
                y=[0.0, 1.0],
                mode="lines",
                name=f"n={ni}  f={fi:.1f} Hz",
                line=dict(color=ci, width=3 if ci == COLOURS["highlight"] else 1.5),
                showlegend=True,
            )
        )

    fig.update_layout(
        **plotly_layout(
            height=300,
            title=dict(text="Frequency Spectrum (harmonics)", font=dict(size=14)),
            xaxis=dict(
                title="Frequency f (Hz)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Relative amplitude",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                range=[0, 1.2],
                showticklabels=False,
            ),
        )
    )
    return fig


def build_resonance_fig(
    mode: str,
    n_max: int,
    L: float,
    v: float,
    f_drive: float,
) -> go.Figure:
    """
    Build an amplitude-response curve swept over a range of driving frequencies,
    with sharp resonance peaks at each harmonic and a marker at f_drive.

    Parameters
    ----------
    mode    : 'String', 'Open Pipe', or 'Closed Pipe'
    n_max   : number of harmonics to include (determines sweep range)
    L       : length (m)
    v       : wave speed (m/s)
    f_drive : current driving frequency (Hz)

    Returns
    -------
    fig : Plotly Figure
    """
    if mode == "Closed Pipe":
        harm_ns = list(range(1, n_max * 2, 2))
    else:
        harm_ns = list(range(1, n_max + 1))

    f_harmonics = [harmonic_frequency(mode, ni, L, v) for ni in harm_ns]
    f_max = max(f_harmonics) * 1.3
    f_min = 0.1
    f_sweep = np.linspace(f_min, f_max, 4000)

    # Amplitude response: sum of Lorentzian peaks at each harmonic
    # A(f) = sum_n 1 / sqrt((f - f_n)^2 + (Q_factor * f_n * 0.005)^2)
    # Use a fixed Q = 50 for visual clarity
    Q = 50.0
    A_response = np.zeros_like(f_sweep)
    for fn in f_harmonics:
        gamma = fn / Q
        A_response += 1.0 / np.sqrt((f_sweep - fn) ** 2 + gamma ** 2)

    # Normalise
    A_response = A_response / np.max(A_response)

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=f_sweep,
            y=A_response,
            mode="lines",
            name="Amplitude response",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )

    # Mark driving frequency
    A_drive = float(np.interp(f_drive, f_sweep, A_response))
    fig.add_vline(
        x=f_drive,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
    )
    fig.add_trace(
        go.Scatter(
            x=[f_drive],
            y=[A_drive],
            mode="markers+text",
            text=[f"  f = {f_drive:.1f} Hz"],
            textposition="middle right",
            textfont=dict(color=COLOURS["highlight"]),
            marker=dict(color=COLOURS["highlight"], size=10),
            name=f"Drive {f_drive:.1f} Hz",
        )
    )

    # Mark harmonic peaks
    for ni, fn in zip(harm_ns, f_harmonics):
        fig.add_annotation(
            x=fn,
            y=1.05,
            text=f"n={ni}",
            showarrow=False,
            font=dict(color=COLOURS["secondary"], size=10),
            yref="paper",
        )

    fig.update_layout(
        **plotly_layout(
            height=320,
            title=dict(text="Resonance Response", font=dict(size=14)),
            xaxis=dict(
                title="Driving frequency f (Hz)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Normalised amplitude",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── p5.js animation builder ───────────────────────────────────────────────────


def build_standing_wave_animation(
    mode: str,
    n: int,
    L: float,
    freq: float,
    show_components: bool,
) -> str:
    """
    Build a p5.js animated standing wave HTML page.

    The animation renders:
      - Standing wave y(x,t) = A·sin(k_n·x)·cos(ω_n·t) in the wave colours
      - Nodes (yellow dots) and antinode (faint grey vertical markers)
      - String/pipe boundary indicators (wall anchors / open/closed pipe ends)
      - Optional travelling-wave components in blue and orange
      - Play/Pause, speed (0.5×, 1×, 2×) controls top-right
      - Harmonic label "n = X" top-left
      - Node/antinode count labels at bottom

    Parameters
    ----------
    mode           : 'String', 'Open Pipe', or 'Closed Pipe'
    n              : harmonic number
    L              : length of string/pipe (m)
    freq           : resonant frequency f_n (Hz)
    show_components: if True, also render the two travelling waves

    Returns
    -------
    HTML string
    """
    data = json.dumps({
        "mode": mode,
        "n": int(n),
        "L": float(L),
        "freq": float(freq),
        "showComp": show_components,
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
const D = {data};

// ── Playback state ────────────────────────────────────────────────────────────
let t = 0;
let playing = true;
let speed = 1.0;
let speedIdx = 1;
const speedOptions = [0.5, 1.0, 2.0];

// ── Canvas geometry (set in draw) ─────────────────────────────────────────────
let waveLeft, waveRight, waveMidY, waveHalfH;

// ── Utility ───────────────────────────────────────────────────────────────────
function setLineDash(arr){{ drawingContext.setLineDash(arr); }}

// Compute y(x,t) = sin(kx) * cos(wt) for standing wave
// kString/kClosed determined by mode
function standingY(xNorm, tVal){{
  // xNorm in [0,1]
  let phase;
  if (D.mode === 'Closed Pipe') {{
    phase = D.n * Math.PI * xNorm / 2.0;
  }} else {{
    phase = D.n * Math.PI * xNorm;
  }}
  return Math.sin(phase) * Math.cos(2 * Math.PI * D.freq * tVal);
}}

// Component wave 1: A/2 * sin(kx - wt)
function travelY1(xNorm, tVal){{
  let k;
  if (D.mode === 'Closed Pipe') {{
    k = D.n * Math.PI / 2.0;
  }} else {{
    k = D.n * Math.PI;
  }}
  return 0.5 * Math.sin(k * xNorm - 2 * Math.PI * D.freq * tVal);
}}

// Component wave 2: A/2 * sin(kx + wt)
function travelY2(xNorm, tVal){{
  let k;
  if (D.mode === 'Closed Pipe') {{
    k = D.n * Math.PI / 2.0;
  }} else {{
    k = Math.PI * D.n;
  }}
  return 0.5 * Math.sin(k * xNorm + 2 * Math.PI * D.freq * tVal);
}}

// ── Node positions (normalised 0..1) ─────────────────────────────────────────
function getNodes(){{
  let nodes = [];
  if (D.mode === 'String' || D.mode === 'Open Pipe') {{
    for (let m = 0; m <= D.n; m++) {{
      nodes.push(m / D.n);
    }}
  }} else {{
    // Closed pipe: node every 2/n
    for (let k = 0; k <= D.n; k++) {{
      let xn = 2.0 * k / D.n;
      if (xn <= 1.0 + 1e-9) nodes.push(Math.min(xn, 1.0));
    }}
  }}
  return nodes;
}}

function getAntinodes(){{
  let anti = [];
  if (D.mode === 'String' || D.mode === 'Open Pipe') {{
    for (let m = 0; m < D.n; m++) {{
      anti.push((2 * m + 1) / (2.0 * D.n));
    }}
  }} else {{
    for (let m = 0; m <= D.n; m++) {{
      let xa = (2 * m + 1) / D.n;
      if (xa <= 1.0 + 1e-9) anti.push(Math.min(xa, 1.0));
    }}
  }}
  return anti;
}}

// ── Setup / resize ────────────────────────────────────────────────────────────
function setup(){{
  createCanvas(windowWidth || 700, 400);
  textFont('monospace');
  frameRate(60);
}}

function windowResized(){{
  resizeCanvas(windowWidth, 400);
}}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function updateGeometry(){{
  waveLeft   = 80;
  waveRight  = width - 80;
  waveMidY   = height / 2;
  waveHalfH  = Math.min(height * 0.28, 90);
}}

// Map normalised x [0,1] to canvas pixel x
function xPx(xNorm){{
  return waveLeft + xNorm * (waveRight - waveLeft);
}}

// Map displacement [-1,1] to canvas pixel y
function yPx(disp){{
  return waveMidY - disp * waveHalfH;
}}

// ── Draw boundaries (string/pipe) ─────────────────────────────────────────────
function drawBoundaries(){{
  if (D.mode === 'String') {{
    // Fixed ends: wall hatch at left and right
    stroke('#888'); strokeWeight(2);
    line(waveLeft, waveMidY - waveHalfH - 10, waveLeft, waveMidY + waveHalfH + 10);
    line(waveRight, waveMidY - waveHalfH - 10, waveRight, waveMidY + waveHalfH + 10);
    stroke('#555'); strokeWeight(1);
    for (let i = -3; i <= 3; i++) {{
      line(waveLeft - 14, waveMidY + i * 14, waveLeft, waveMidY + i * 14 - 10);
      line(waveRight,     waveMidY + i * 14, waveRight + 14, waveMidY + i * 14 - 10);
    }}
    // Axis line (equilibrium)
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6, 4]);
    line(waveLeft, waveMidY, waveRight, waveMidY);
    setLineDash([]);
    // Labels
    noStroke(); fill('#888'); textSize(10); textAlign(CENTER);
    text('fixed', waveLeft, waveMidY + waveHalfH + 22);
    text('fixed', waveRight, waveMidY + waveHalfH + 22);

  }} else if (D.mode === 'Open Pipe') {{
    // Open at both ends: no walls, just a tube outline
    stroke('#6699cc'); strokeWeight(2); noFill();
    rect(waveLeft, waveMidY - waveHalfH - 8, waveRight - waveLeft, (waveHalfH + 8) * 2, 3);
    // Open end markers (dashed)
    stroke('#6699cc'); strokeWeight(1.5); setLineDash([5, 4]);
    line(waveLeft, waveMidY - waveHalfH - 16, waveLeft, waveMidY + waveHalfH + 16);
    line(waveRight, waveMidY - waveHalfH - 16, waveRight, waveMidY + waveHalfH + 16);
    setLineDash([]);
    // Equilibrium
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6, 4]);
    line(waveLeft, waveMidY, waveRight, waveMidY);
    setLineDash([]);
    noStroke(); fill('#6699cc'); textSize(10); textAlign(CENTER);
    text('open', waveLeft, waveMidY + waveHalfH + 22);
    text('open', waveRight, waveMidY + waveHalfH + 22);

  }} else {{
    // Closed Pipe: closed (solid wall) at left, open (dashed) at right
    stroke('#888'); strokeWeight(3);
    line(waveLeft, waveMidY - waveHalfH - 8, waveLeft, waveMidY + waveHalfH + 8);
    stroke('#555'); strokeWeight(1);
    for (let i = -3; i <= 3; i++) {{
      line(waveLeft - 14, waveMidY + i * 14, waveLeft, waveMidY + i * 14 - 10);
    }}
    // Pipe top/bottom walls
    stroke('#6699cc'); strokeWeight(2); noFill();
    line(waveLeft, waveMidY - waveHalfH - 8, waveRight, waveMidY - waveHalfH - 8);
    line(waveLeft, waveMidY + waveHalfH + 8, waveRight, waveMidY + waveHalfH + 8);
    // Open right end
    stroke('#6699cc'); strokeWeight(1.5); setLineDash([5, 4]);
    line(waveRight, waveMidY - waveHalfH - 16, waveRight, waveMidY + waveHalfH + 16);
    setLineDash([]);
    // Equilibrium
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6, 4]);
    line(waveLeft, waveMidY, waveRight, waveMidY);
    setLineDash([]);
    noStroke(); fill('#888'); textSize(10); textAlign(CENTER);
    text('closed', waveLeft, waveMidY + waveHalfH + 22);
    fill('#6699cc');
    text('open', waveRight, waveMidY + waveHalfH + 22);
  }}
  textAlign(LEFT);
}}

// ── Draw a wave curve from array of (xNorm, disp) pairs ──────────────────────
function drawCurve(waveColor, wt, computeY){{
  stroke(waveColor); strokeWeight(wt); noFill();
  let steps = 300;
  beginShape();
  for (let i = 0; i <= steps; i++) {{
    let xn = i / steps;
    let y  = computeY(xn, t);
    vertex(xPx(xn), yPx(y));
  }}
  endShape();
}}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw(){{
  background('#0e1117');
  updateGeometry();
  drawBoundaries();

  // ── Travelling component waves ────────────────────────────────────────────
  if (D.showComp) {{
    // Wave 1: rightward (blue)
    drawingContext.globalAlpha = 0.45;
    drawCurve('#1f77b4', 1.5, travelY1);
    // Wave 2: leftward (orange)
    drawCurve('#ff7f0e', 1.5, travelY2);
    drawingContext.globalAlpha = 1.0;
  }}

  // ── Standing wave ─────────────────────────────────────────────────────────
  drawCurve('#17becf', 2.5, standingY);

  // ── Antinode grey vertical markers ───────────────────────────────────────
  let antis = getAntinodes();
  for (let xa of antis) {{
    stroke(80, 80, 80, 100); strokeWeight(1); setLineDash([3, 4]);
    line(xPx(xa), waveMidY - waveHalfH - 4, xPx(xa), waveMidY + waveHalfH + 4);
    setLineDash([]);
  }}

  // ── Node yellow dots ──────────────────────────────────────────────────────
  let nodes = getNodes();
  for (let xn of nodes) {{
    noStroke(); fill('#f1c40f');
    circle(xPx(xn), waveMidY, 11);
    stroke('#0e1117'); strokeWeight(1); noFill();
    circle(xPx(xn), waveMidY, 11);
  }}

  // ── Labels: node/antinode counts ─────────────────────────────────────────
  noStroke(); fill('#aaaaaa'); textSize(10); textAlign(LEFT);
  text('Nodes: ' + nodes.length + '  Antinodes: ' + antis.length,
       waveLeft, height - 28);

  // ── Travelling wave legend ────────────────────────────────────────────────
  if (D.showComp) {{
    textSize(9);
    fill('#1f77b4'); text('→ y₁ = ½A sin(kx − ωt)', waveLeft, height - 14);
    fill('#ff7f0e'); text('← y₂ = ½A sin(kx + ωt)', waveLeft + 190, height - 14);
    fill('#17becf'); text('y = y₁ + y₂ (standing)', waveLeft + 390, height - 14);
    textAlign(LEFT);
  }}

  // ── Harmonic label top-left ───────────────────────────────────────────────
  noStroke(); fill('#fafafa'); textSize(13); textAlign(LEFT);
  text('n = ' + D.n + '   ' + D.mode, waveLeft, 26);
  fill('#aaa'); textSize(10);
  text('f = ' + D.freq.toFixed(2) + ' Hz', waveLeft, 42);

  // ── Control panel top-right ───────────────────────────────────────────────
  noStroke(); fill(15, 15, 25, 220); rect(width - 124, 8, 116, 100, 6);
  fill('#fafafa'); textSize(11); textAlign(LEFT);
  text(playing ? '⏸ Pause' : '▶ Play',   width - 118, 30);
  text('⚡ Speed: ' + speedOptions[speedIdx] + 'x', width - 118, 56);
  fill('#777'); textSize(8);
  text('click to toggle', width - 118, 70);
  text('(speed cycles)', width - 118, 82);
  text('▶/⏸ or ⚡', width - 118, 96);
  textAlign(LEFT);

  // ── Advance time ─────────────────────────────────────────────────────────
  if (playing) {{
    t += (1.0 / 60.0) * speedOptions[speedIdx];
  }}
}}

// ── Mouse controls ────────────────────────────────────────────────────────────
function mousePressed(){{
  // Play/Pause
  if (mouseX > width - 124 && mouseX < width - 8 && mouseY > 8 && mouseY < 44) {{
    playing = !playing;
    return;
  }}
  // Speed toggle
  if (mouseX > width - 124 && mouseX < width - 8 && mouseY > 46 && mouseY < 80) {{
    speedIdx = (speedIdx + 1) % speedOptions.length;
    return;
  }}
}}
</script></body></html>"""


# ── Streamlit page ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Standing Waves — WJEC A Level Physics",
    page_icon="〰",
    layout="wide",
    initial_sidebar_state="expanded",
)

sim_header("Standing Waves", SPEC_REF)

# ── Sidebar controls ──────────────────────────────────────────────────────────

with st.sidebar:
    st.subheader("Mode")
    wave_mode = st.radio(
        "System",
        ["String", "Open Pipe", "Closed Pipe"],
        index=0,
        help=(
            "String: fixed at both ends. "
            "Open Pipe: open at both ends. "
            "Closed Pipe: closed at one end, open at the other."
        ),
    )

    st.divider()

    if wave_mode == "String":
        st.subheader("String parameters")
        L_str = st.slider(
            "Length L (m)",
            min_value=0.2,
            max_value=2.0,
            value=1.0,
            step=0.05,
            key="str_L",
        )
        n_str = st.slider(
            "Harmonic n",
            min_value=1,
            max_value=6,
            value=1,
            step=1,
            key="str_n",
        )
        T_tension = st.slider(
            "Tension T (N)",
            min_value=1.0,
            max_value=100.0,
            value=40.0,
            step=1.0,
            key="str_T",
        )
        mu = st.slider(
            "Linear density μ (kg/m)",
            min_value=0.001,
            max_value=0.010,
            value=0.004,
            step=0.001,
            format="%.3f",
            key="str_mu",
        )
        L_val = L_str
        n_val = n_str
        v_wave = string_wave_speed(T_tension, mu)

    elif wave_mode == "Open Pipe":
        st.subheader("Open pipe parameters")
        L_op = st.slider(
            "Length L (m)",
            min_value=0.1,
            max_value=2.0,
            value=0.5,
            step=0.05,
            key="op_L",
        )
        n_op = st.slider(
            "Harmonic n",
            min_value=1,
            max_value=6,
            value=1,
            step=1,
            key="op_n",
        )
        temp_op = st.slider(
            "Temperature (°C)",
            min_value=0,
            max_value=100,
            value=20,
            step=1,
            key="op_temp",
        )
        L_val = L_op
        n_val = n_op
        v_wave = sound_speed(temp_op)

    else:  # Closed Pipe
        st.subheader("Closed pipe parameters")
        L_cp = st.slider(
            "Length L (m)",
            min_value=0.1,
            max_value=2.0,
            value=0.5,
            step=0.05,
            key="cp_L",
        )
        n_cp_idx = st.slider(
            "Harmonic index (1=1st, 2=3rd, 3=5th…)",
            min_value=1,
            max_value=6,
            value=1,
            step=1,
            key="cp_n",
        )
        # Map index to odd harmonic
        n_val = 2 * n_cp_idx - 1
        temp_cp = st.slider(
            "Temperature (°C)",
            min_value=0,
            max_value=100,
            value=20,
            step=1,
            key="cp_temp",
        )
        L_val = L_cp
        v_wave = sound_speed(temp_cp)

    st.divider()
    show_components = st.toggle(
        "Show travelling waves",
        value=False,
        help=(
            "Show the two component travelling waves (y₁ and y₂) that superpose "
            "to produce the standing wave."
        ),
    )

# ── Derived quantities ────────────────────────────────────────────────────────

f_n = harmonic_frequency(wave_mode, n_val, L_val, v_wave)
lambda_n = harmonic_wavelength(wave_mode, n_val, L_val)
T_period = 1.0 / f_n if f_n > 0 else float("inf")

nodes_list = node_positions(wave_mode, n_val, L_val)
antinodes_list = antinode_positions(wave_mode, n_val, L_val)

# ── Mode toggle (Basic / Advanced) ───────────────────────────────────────────

mode = mode_toggle()

# ── Layout ────────────────────────────────────────────────────────────────────

left_col, right_col = two_column_layout(3, 7)

# ── Left column: physics notes and metrics ────────────────────────────────────
with left_col:
    metric_row(
        {
            "Frequency fₙ": f"{f_n:.2f} Hz",
            "Wavelength λₙ": f"{lambda_n:.3f} m",
        }
    )
    st.markdown("")
    metric_row(
        {
            "Wave speed v": f"{v_wave:.1f} m/s",
            "Period T": f"{T_period:.4f} s",
        }
    )

    if mode == "Advanced":
        advanced_divider()
        st.markdown("**Node positions (m):**")
        node_str = ",  ".join(f"{x:.3f}" for x in nodes_list)
        st.markdown(f"`{node_str}`")
        st.markdown(f"Node count: **{len(nodes_list)}**  |  Antinode count: **{len(antinodes_list)}**")

        if wave_mode == "String":
            st.markdown("---")
            st.markdown(
                f"**Wave speed:** $v = \\sqrt{{T/\\mu}}$ = "
                f"$\\sqrt{{{T_tension:.0f}/{mu:.3f}}}$ = **{v_wave:.2f} m/s**"
            )
        elif wave_mode in ("Open Pipe", "Closed Pipe"):
            _temp = temp_op if wave_mode == "Open Pipe" else temp_cp
            st.markdown("---")
            st.markdown(
                f"**Sound speed:** $v = 331 + 0.6 \\times {_temp}$ = **{v_wave:.1f} m/s**"
            )

    st.divider()
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )

# ── Right column: animation and plots ────────────────────────────────────────
with right_col:

    # ── p5.js animation ───────────────────────────────────────────────────────
    anim_html = build_standing_wave_animation(
        mode=wave_mode,
        n=n_val,
        L=L_val,
        freq=f_n,
        show_components=show_components,
    )
    components.html(anim_html, height=440)
    st.caption(
        "Click **⏸ Pause** / **▶ Play** to freeze the wave  ·  "
        "Click **⚡ Speed** to change animation rate  ·  "
        "Yellow dots = nodes  ·  Grey markers = antinodes"
    )

    st.divider()

    # ── Static displacement profile (Plotly) ──────────────────────────────────
    fig_disp = build_displacement_fig(
        mode=wave_mode,
        n=n_val,
        L=L_val,
        show_harmonics=(n_val > 1),
    )
    st.plotly_chart(fig_disp, use_container_width=True)

    # ── Advanced: frequency spectrum and resonance ────────────────────────────
    if mode == "Advanced":
        advanced_divider()
        st.markdown("")

        n_spectrum = min(n_val + 4, 8)
        fig_spec = build_spectrum_fig(
            mode=wave_mode,
            n_max=n_spectrum,
            L=L_val,
            v=v_wave,
            f_selected=f_n,
        )
        st.plotly_chart(fig_spec, use_container_width=True)

        # Resonance sweep
        f_drive_max = harmonic_frequency(wave_mode, n_val + 2 if wave_mode != "Closed Pipe" else n_val + 4, L_val, v_wave)
        f_drive = st.slider(
            "Driving frequency (Hz)",
            min_value=1.0,
            max_value=max(float(f_drive_max * 1.2), 10.0),
            value=float(f_n),
            step=float(max(f_n / 200.0, 0.1)),
            format="%.1f",
            key="f_drive_slider",
        )

        fig_res = build_resonance_fig(
            mode=wave_mode,
            n_max=n_spectrum,
            L=L_val,
            v=v_wave,
            f_drive=f_drive,
        )
        st.plotly_chart(fig_res, use_container_width=True)

        # Closest harmonic
        if wave_mode == "Closed Pipe":
            harm_ns_adv = list(range(1, n_spectrum * 2, 2))
        else:
            harm_ns_adv = list(range(1, n_spectrum + 1))
        f_harmonics_adv = [harmonic_frequency(wave_mode, ni, L_val, v_wave) for ni in harm_ns_adv]
        closest_idx = int(np.argmin(np.abs(np.array(f_harmonics_adv) - f_drive)))
        closest_f = f_harmonics_adv[closest_idx]
        closest_n = harm_ns_adv[closest_idx]
        delta_f = abs(f_drive - closest_f)

        if delta_f < closest_f * 0.03:
            st.success(
                f"Near resonance at n = {closest_n}  (f = {closest_f:.2f} Hz)! "
                "Maximum energy transfer from driver to standing wave."
            )
        else:
            st.info(
                f"Closest harmonic: n = {closest_n}  (f = {closest_f:.2f} Hz)  "
                f"— Δf = {delta_f:.2f} Hz from resonance."
            )

        st.info(
            "**Chladni patterns**: In 2D, vibrating plates form nodal lines visible "
            "when sand migrates to zero-displacement regions. Violins are tuned by "
            "observing Chladni patterns on the top plate."
        )

    # ── Basic insight cards ───────────────────────────────────────────────────
    if mode == "Basic":
        n_nodes = len(nodes_list)
        n_antis = len(antinodes_list)
        if wave_mode == "Closed Pipe":
            st.info(
                f"Closed pipes only support **odd harmonics** (n = 1, 3, 5, …). "
                f"At n = {n_val}: {n_nodes} node(s), {n_antis} antinode(s). "
                "This gives a hollow, woody tone (e.g. clarinet)."
            )
        else:
            st.info(
                f"Harmonic n = {n_val}: "
                f"**{n_nodes} node(s)** (zero displacement) and "
                f"**{n_antis} antinode(s)** (maximum displacement). "
                f"Wavelength λ = 2L/n = **{lambda_n:.3f} m**."
            )
        st.info(
            "Standing waves are formed by the superposition of two identical waves "
            "travelling in opposite directions. Toggle **Show travelling waves** "
            "to see the component waves."
        )

# ── Exam practice questions ───────────────────────────────────────────────────

_wavelength_n = lambda_n
# Mode-dependent formulas: string / open pipe use 2L; closed pipe uses 4L.
if wave_mode == "Closed Pipe":
    _system_desc = "a closed (stopped) pipe of length"
    _lambda_formula = f"λₙ = 4L/n = 4×{L_val:.2f}/{n_val} = {_wavelength_n:.3f} m"
    _freq_formula = (
        f"f = v/λ = {v_wave:.1f}/{_wavelength_n:.3f} = {f_n:.2f} Hz  "
        f"OR  f = nv/(4L) = {n_val}×{v_wave:.1f}/(4×{L_val:.2f}) = {f_n:.2f} Hz"
    )
    _count_q = (
        f"How many nodes and antinodes are present in the harmonic n = {n_val} "
        f"of a pipe closed at one end and open at the other?"
    )
elif wave_mode == "Open Pipe":
    _system_desc = "an open pipe of length"
    _lambda_formula = f"λₙ = 2L/n = 2×{L_val:.2f}/{n_val} = {_wavelength_n:.3f} m"
    _freq_formula = (
        f"f = v/λ = {v_wave:.1f}/{_wavelength_n:.3f} = {f_n:.2f} Hz  "
        f"OR  f = nv/(2L) = {n_val}×{v_wave:.1f}/(2×{L_val:.2f}) = {f_n:.2f} Hz"
    )
    _count_q = (
        f"How many nodes and antinodes are present in the {n_val}th harmonic "
        f"of an open pipe (open at both ends)?"
    )
else:  # String (fixed–fixed)
    _system_desc = "a string of length"
    _lambda_formula = f"λₙ = 2L/n = 2×{L_val:.2f}/{n_val} = {_wavelength_n:.3f} m"
    _freq_formula = (
        f"f = v/λ = {v_wave:.1f}/{_wavelength_n:.3f} = {f_n:.2f} Hz  "
        f"OR  f = nv/(2L) = {n_val}×{v_wave:.1f}/(2×{L_val:.2f}) = {f_n:.2f} Hz"
    )
    _count_q = (
        f"How many nodes and antinodes are present in the {n_val}th harmonic "
        f"of a string fixed at both ends?"
    )

_exam_questions_18 = [
    {
        "q": (
            f"{_system_desc.capitalize()} L = {L_val:.2f} m vibrates in the harmonic "
            f"n = {n_val}. Calculate the wavelength."
        ),
        "marks": 2,
        "answer": f"λ = {_wavelength_n:.3f} m",
        "working": [_lambda_formula],
    },
    {
        "q": (
            f"The wave speed is v = {v_wave:.1f} m/s. "
            f"Calculate the frequency of the harmonic n = {n_val}."
        ),
        "marks": 3,
        "answer": f"f = {f_n:.2f} Hz",
        "working": [_freq_formula],
    },
    {
        "q": _count_q,
        "marks": 2,
        "answer": f"{len(nodes_list)} nodes, {len(antinodes_list)} antinodes",
        "working": [
            f"Counted from the standing-wave pattern: "
            f"{len(nodes_list)} node(s), {len(antinodes_list)} antinode(s).",
        ],
    },
]
show_exam_panel(_exam_questions_18)
