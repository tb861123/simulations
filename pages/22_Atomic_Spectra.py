"""
Atomic Spectra & Bohr Model — WJEC Eduqas A Level Physics.

Simulates hydrogen energy level transitions, spectral series, and the Bohr
model of the atom; illustrating quantisation of atomic energy levels and
the origin of emission/absorption spectra.

Spec reference: Component 3, Topic 4 (Quantum Physics)
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import h_planck, c_light, e_charge
from utils.style import COLOURS, plotly_layout
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
    page_title="Atomic Spectra — WJEC Physics",
    page_icon="🔬",
    layout="wide",
)

# ── Constants / catalogue ─────────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 4 (Quantum Physics)"

# Hydrogen energy levels: E_n = -13.6 / n² eV
def hydrogen_energy(n: int) -> float:
    """Return hydrogen energy level in eV for principal quantum number n."""
    return -13.6 / (n * n)


# Series lower-level lookup
SERIES_INFO = {
    1: {"name": "Lyman",   "region": "UV",       "colour": "#9b59b6"},
    2: {"name": "Balmer",  "region": "Visible",  "colour": "#1f77b4"},
    3: {"name": "Paschen", "region": "Infrared", "colour": "#e74c3c"},
}

# Named Balmer lines
BALMER_NAMED = {
    (3, 2): ("H-α", 656.3),
    (4, 2): ("H-β", 486.1),
    (5, 2): ("H-γ", 434.0),
    (6, 2): ("H-δ", 410.2),
}

# Preset spectral lines for non-hydrogen elements (wavelength nm, intensity 0-1)
OTHER_ELEMENTS = {
    "Helium": [
        (447.1, 0.6, "violet"),
        (471.3, 0.4, "blue"),
        (492.2, 0.5, "cyan"),
        (501.6, 0.8, "green"),
        (587.6, 1.0, "yellow"),
        (667.8, 0.7, "red"),
        (706.5, 0.5, "deep red"),
    ],
    "Sodium": [
        (589.0, 1.0, "D1 yellow"),
        (589.6, 0.9, "D2 yellow"),
        (568.8, 0.3, "green"),
        (615.4, 0.2, "orange"),
    ],
    "Neon": [
        (585.2, 0.5, "yellow"),
        (594.5, 0.6, "orange"),
        (614.3, 0.8, "orange-red"),
        (626.6, 0.7, "red"),
        (638.3, 0.9, "red"),
        (659.9, 0.6, "deep red"),
        (692.9, 0.5, "deep red"),
        (703.2, 0.7, "deep red"),
    ],
}


# ── Physics helpers ───────────────────────────────────────────────────────────


def wavelength_to_rgb(wl: float) -> str:
    """
    Convert a wavelength in nm to an rgb() colour string.

    UV (<380 nm) returns purple; IR (>780 nm) returns deep red.

    Parameters
    ----------
    wl : wavelength in nanometres

    Returns
    -------
    CSS rgb() string
    """
    if wl < 380:
        return "rgb(128,0,128)"    # UV: purple
    if wl > 780:
        return "rgb(140,0,0)"      # IR: deep red
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
def compute_hydrogen_transitions(n_max: int) -> list[dict]:
    """
    Precompute all hydrogen transitions for n_upper > n_lower, up to n_max.

    Parameters
    ----------
    n_max : maximum principal quantum number to include

    Returns
    -------
    List of dicts with keys: n_upper, n_lower, delta_E_eV, lambda_nm,
    series_name, series_lower, rgb_colour, region
    """
    transitions = []
    for n_lower in range(1, n_max):
        series = SERIES_INFO.get(n_lower, {"name": f"n={n_lower}", "region": "IR", "colour": "#888888"})
        for n_upper in range(n_lower + 1, n_max + 1):
            E_upper = hydrogen_energy(n_upper)
            E_lower = hydrogen_energy(n_lower)
            delta_E_eV = E_upper - E_lower   # positive, energy of emitted photon
            lam_nm = 1240.0 / delta_E_eV     # λ = hc/ΔE using hc ≈ 1240 eV·nm
            # Named line?
            named = BALMER_NAMED.get((n_upper, n_lower), None)
            label = named[0] if named else f"n={n_upper}→{n_lower}"
            transitions.append({
                "n_upper": n_upper,
                "n_lower": n_lower,
                "delta_E_eV": round(delta_E_eV, 4),
                "lambda_nm": round(lam_nm, 2),
                "series_name": series["name"],
                "series_lower": n_lower,
                "rgb_colour": wavelength_to_rgb(lam_nm),
                "region": series["region"],
                "label": label,
            })
    return transitions


def get_series_filter(series_choice: str) -> list[int]:
    """
    Return list of lower-level n values corresponding to the series choice.

    Parameters
    ----------
    series_choice : "All", "Lyman", "Balmer", or "Paschen"

    Returns
    -------
    list of n_lower values to include
    """
    if series_choice == "All":
        return [1, 2, 3]
    return {"Lyman": [1], "Balmer": [2], "Paschen": [3]}.get(series_choice, [1, 2, 3])


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_energy_level_diagram(
    transitions: list[dict],
    n_max: int,
    mode: str,
    series_filter: list[int],
) -> go.Figure:
    """
    Build a Plotly energy level diagram with transition arrows.

    Parameters
    ----------
    transitions   : list of transition dicts from compute_hydrogen_transitions
    n_max         : highest level to show
    mode          : 'Emission spectrum' or 'Absorption spectrum'
    series_filter : list of n_lower values to include

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    x_left  = 0.05
    x_right = 0.85

    level_colours = [
        COLOURS["highlight"],
        COLOURS["secondary"],
        COLOURS["tertiary"],
        COLOURS["primary"],
        COLOURS["advanced"],
        COLOURS["quaternary"],
        "#e67e22",
        "#1abc9c",
    ]

    # Draw energy levels
    for n in range(1, n_max + 1):
        E = hydrogen_energy(n)
        col = level_colours[(n - 1) % len(level_colours)]
        fig.add_shape(
            type="line",
            x0=x_left, x1=x_right,
            y0=E, y1=E,
            line=dict(color=col, width=2.5),
        )
        fig.add_annotation(
            x=x_right + 0.01,
            y=E,
            text=f"<b>n={n}</b>  {E:.2f} eV",
            showarrow=False,
            font=dict(color=col, size=11),
            xanchor="left",
            yanchor="middle",
        )

    # Ionisation limit
    fig.add_shape(
        type="line",
        x0=x_left, x1=x_right,
        y0=0, y1=0,
        line=dict(color=COLOURS["text"], width=1.5, dash="dash"),
    )
    fig.add_annotation(
        x=x_right + 0.01,
        y=0,
        text="<b>n=∞</b>  0.00 eV (ionisation)",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=10),
        xanchor="left",
        yanchor="middle",
    )

    # Arrow x positions per series (spread them out)
    series_x = {1: 0.25, 2: 0.45, 3: 0.65}
    is_emission = mode == "Emission spectrum"

    for t in transitions:
        if t["series_lower"] not in series_filter:
            continue
        if t["n_upper"] > n_max:
            continue

        E_upper = hydrogen_energy(t["n_upper"])
        E_lower = hydrogen_energy(t["n_lower"])
        ax = series_x.get(t["series_lower"], 0.5)
        col = t["rgb_colour"]

        # For emission: arrow goes downward (upper→lower)
        # For absorption: arrow goes upward (lower→upper)
        if is_emission:
            y_tail = E_upper
            y_head = E_lower
        else:
            y_tail = E_lower
            y_head = E_upper

        fig.add_annotation(
            x=ax,
            y=y_head,
            ax=ax,
            ay=y_tail,
            xref="x", yref="y",
            axref="x", ayref="y",
            arrowhead=3,
            arrowsize=1.2,
            arrowwidth=2,
            arrowcolor=col,
            showarrow=True,
            text="",
        )

    # Series legend annotations
    for n_lower, info in SERIES_INFO.items():
        if n_lower not in series_filter:
            continue
        ax = series_x.get(n_lower, 0.5)
        E_label = hydrogen_energy(n_max) - 0.3
        fig.add_annotation(
            x=ax,
            y=hydrogen_energy(1) - 0.8,
            text=f"<b>{info['name']}</b><br>({info['region']})",
            showarrow=False,
            font=dict(color=info["colour"], size=10),
            xanchor="center",
            bgcolor="rgba(0,0,0,0.5)",
            bordercolor=info["colour"],
            borderwidth=1,
        )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    title_mode = "Emission" if is_emission else "Absorption"
    fig.update_layout(
        **plotly_layout(
            height=520,
            title=dict(
                text=f"Hydrogen Energy Level Diagram — {title_mode}",
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
                range=[-14.5, 1.0],
                **grid_style,
            ),
            showlegend=False,
            margin=dict(l=60, r=220, t=60, b=80),
        )
    )
    return fig


def build_wavelength_spectrum(
    transitions: list[dict],
    element: str,
    mode: str,
    series_filter: list[int],
    n_max: int,
) -> go.Figure:
    """
    Build the wavelength spectrum plot with visible-spectrum background shading.

    Parameters
    ----------
    transitions   : hydrogen transition dicts (used when element is Hydrogen)
    element       : selected element name
    mode          : 'Emission spectrum' or 'Absorption spectrum'
    series_filter : n_lower values to include (Hydrogen only)
    n_max         : max level (Hydrogen only)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    is_emission = mode == "Emission spectrum"

    # Background spectrum gradient (visible range 380–780 nm)
    spectrum_colours = [
        (380, "rgb(128,0,128)"),
        (440, "rgb(80,0,200)"),
        (490, "rgb(0,100,255)"),
        (510, "rgb(0,200,100)"),
        (580, "rgb(255,255,0)"),
        (645, "rgb(255,100,0)"),
        (780, "rgb(180,0,0)"),
    ]

    # Shaded visible region
    fig.add_vrect(
        x0=380, x1=780,
        fillcolor="rgba(255,255,200,0.06)",
        line_width=0,
        annotation_text="Visible",
        annotation_position="top right",
        annotation_font=dict(color=COLOURS["text"], size=10),
    )
    # UV region
    fig.add_vrect(
        x0=100, x1=380,
        fillcolor="rgba(150,0,200,0.12)",
        line_width=0,
        annotation_text="UV",
        annotation_position="top right",
        annotation_font=dict(color="#9b59b6", size=10),
    )
    # IR region
    fig.add_vrect(
        x0=780, x1=2000,
        fillcolor="rgba(180,0,0,0.10)",
        line_width=0,
        annotation_text="IR",
        annotation_position="top right",
        annotation_font=dict(color="#e74c3c", size=10),
    )

    # Collect lines to plot
    lines = []
    if element == "Hydrogen":
        for t in transitions:
            if t["series_lower"] not in series_filter:
                continue
            if t["n_upper"] > n_max:
                continue
            lines.append({
                "lam": t["lambda_nm"],
                "colour": t["rgb_colour"],
                "label": t["label"],
                "series": t["series_name"],
                "delta_E": t["delta_E_eV"],
                "n_upper": t["n_upper"],
                "n_lower": t["n_lower"],
            })
    else:
        for lam, intensity, name in OTHER_ELEMENTS.get(element, []):
            lines.append({
                "lam": lam,
                "colour": wavelength_to_rgb(lam),
                "label": f"{lam:.1f} nm",
                "series": name,
                "delta_E": 1240.0 / lam,
                "n_upper": None,
                "n_lower": None,
            })

    # Draw spectral lines
    bg_line_y = [0, 1]
    for line in lines:
        lam = line["lam"]
        col = line["colour"]
        lbl = line["label"]
        de  = line["delta_E"]

        hover = f"{lbl}<br>λ = {lam:.1f} nm<br>ΔE = {de:.3f} eV"
        if line["n_upper"] is not None:
            hover += f"<br>n={line['n_upper']} → n={line['n_lower']}"

        if is_emission:
            line_colour = col
            line_width  = 2.5
        else:
            # Absorption: dark line — use near-black but with a slight tint
            line_colour = "rgba(20,20,20,0.95)"
            line_width  = 3.0

        fig.add_trace(
            go.Scatter(
                x=[lam, lam],
                y=[0, 1],
                mode="lines",
                name=lbl,
                line=dict(color=line_colour, width=line_width),
                hovertemplate=hover + "<extra></extra>",
                showlegend=False,
            )
        )

        # Label prominent Balmer lines
        if lbl.startswith("H-"):
            fig.add_annotation(
                x=lam,
                y=1.05,
                text=f"<b>{lbl}</b><br>{lam:.0f} nm",
                showarrow=True,
                arrowhead=2,
                arrowsize=0.8,
                arrowwidth=1,
                arrowcolor=col,
                font=dict(color=col, size=9),
                ax=0, ay=-25,
                xanchor="center",
            )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    title_mode = "Emission" if is_emission else "Absorption"
    fig.update_layout(
        **plotly_layout(
            height=280,
            title=dict(
                text=f"{element} — {title_mode} Spectrum",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Wavelength λ (nm)",
                range=[100, 800],
                **grid_style,
            ),
            yaxis=dict(
                showticklabels=False,
                showgrid=False,
                zeroline=False,
                range=[0, 1.3],
            ),
            showlegend=False,
            margin=dict(l=50, r=30, t=60, b=60),
        )
    )
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_atomic_animation(
    element: str,
    n_max: int,
    mode: str,
    show_series: str,
    transitions_json: str,
) -> str:
    """
    Build an interactive p5.js animation showing the Bohr atom and spectrum bar.

    Left half: Bohr atom with orbital shells and animated transitions.
    Right half: Horizontal spectrum bar with coloured spectral lines.

    Parameters
    ----------
    element          : selected element name
    n_max            : highest orbital shell to draw
    mode             : 'Emission spectrum' or 'Absorption spectrum'
    show_series      : 'All', 'Lyman', 'Balmer', or 'Paschen'
    transitions_json : JSON string of precomputed transition list

    Returns
    -------
    HTML string containing self-contained p5.js animation
    """
    is_emission = int(mode == "Emission spectrum")
    series_map = {"All": 0, "Lyman": 1, "Balmer": 2, "Paschen": 3}
    series_code = series_map.get(show_series, 0)

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{ margin:0; background:#0e1117; overflow:hidden; font-family:sans-serif; }}
  canvas {{ display:block; }}
  #controls {{
    position:absolute; bottom:6px; left:8px;
    display:flex; gap:8px; align-items:center;
  }}
  button {{
    background:#1e2130; color:#fafafa; border:1px solid #444;
    padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  }}
  button:hover {{ background:#2a2f4a; }}
  #speed-label {{ color:#aaa; font-size:12px; }}
</style>
</head>
<body>
<div id="controls">
  <button id="btn-play">⏸ Pause</button>
  <button id="btn-slower">🐢 Slower</button>
  <button id="btn-faster">🐇 Faster</button>
  <span id="speed-label">Speed: 1×</span>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const TRANSITIONS = {transitions_json};
const N_MAX = {n_max};
const IS_EMISSION = {is_emission};
const SERIES_CODE = {series_code};  // 0=all, 1=lyman, 2=balmer, 3=paschen
const ELEMENT = "{element}";

// Filter transitions by series
function filterTransitions(ts) {{
  if (SERIES_CODE === 0) return ts;
  return ts.filter(t => t.series_lower === SERIES_CODE);
}}

const ACTIVE_TRANS = filterTransitions(TRANSITIONS);

new p5(function(p) {{
  // ── Layout ─────────────────────────────────────────────────────────────────
  const W = 700, H = 440;
  const ATOM_CX = W * 0.30;   // Bohr diagram centre x
  const ATOM_CY = H * 0.50;
  const SPEC_X0 = W * 0.55;   // spectrum bar left edge
  const SPEC_X1 = W * 0.97;   // spectrum bar right edge
  const SPEC_Y0 = H * 0.20;   // spectrum bar top
  const SPEC_Y1 = H * 0.60;   // spectrum bar bottom
  const LAM_MIN = 100, LAM_MAX = 800;  // nm axis range

  // ── State ──────────────────────────────────────────────────────────────────
  let playing = true;
  let speed = 1.0;
  let electronShell = 3;       // which shell electron is on
  let electronAngle = 0;
  let transTimer = 0;
  let transInterval = 180;     // frames between transitions
  let currentTrans = null;     // currently animating transition
  let photonParticles = [];    // photon dots in flight
  let flashAlpha = 0;
  let flashText = "";

  // Orbital radii: r ∝ n²,  scale so n=1 fits nicely
  function orbRadius(n) {{
    const BASE = 28;
    return BASE * n * n / 1;
  }}

  // Max allowed radius before clipping
  const MAX_R = Math.min(ATOM_CX - 10, H / 2 - 30);

  // ── Colour helpers ─────────────────────────────────────────────────────────
  function hexToRgb(hex) {{
    // handles rgb(r,g,b) or #rrggbb
    if (hex.startsWith('rgb')) {{
      const m = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : [200, 200, 200];
    }}
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return [r, g, b];
  }}

  function lambdaToRgb(lam) {{
    if (lam < 380) return [180, 0, 220];
    if (lam > 780) return [140, 0, 0];
    let r, g, b;
    if (lam < 440)      {{ r=(440-lam)/60; g=0;           b=1; }}
    else if (lam < 490) {{ r=0;            g=(lam-440)/50; b=1; }}
    else if (lam < 510) {{ r=0;            g=1;           b=(510-lam)/20; }}
    else if (lam < 580) {{ r=(lam-510)/70; g=1;           b=0; }}
    else if (lam < 645) {{ r=1;            g=(645-lam)/65; b=0; }}
    else                {{ r=1;            g=0;           b=0; }}
    return [Math.round(Math.min(1,r)*255), Math.round(Math.min(1,g)*255), Math.round(Math.min(1,b)*255)];
  }}

  // Convert wavelength to x-pixel on spectrum bar
  function lamToX(lam) {{
    return SPEC_X0 + (lam - LAM_MIN) / (LAM_MAX - LAM_MIN) * (SPEC_X1 - SPEC_X0);
  }}

  // ── Setup ──────────────────────────────────────────────────────────────────
  p.setup = function() {{
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');

    // Choose random starting shell
    electronShell = p.floor(p.random(2, Math.min(N_MAX, 5) + 1));

    // Button wiring
    document.getElementById('btn-play').addEventListener('click', () => {{
      playing = !playing;
      document.getElementById('btn-play').textContent = playing ? '⏸ Pause' : '▶ Play';
    }});
    document.getElementById('btn-slower').addEventListener('click', () => {{
      speed = Math.max(0.25, speed / 2);
      document.getElementById('speed-label').textContent = 'Speed: ' + speed + '×';
    }});
    document.getElementById('btn-faster').addEventListener('click', () => {{
      speed = Math.min(4.0, speed * 2);
      document.getElementById('speed-label').textContent = 'Speed: ' + speed + '×';
    }});
  }};

  // ── Draw ───────────────────────────────────────────────────────────────────
  p.draw = function() {{
    p.background(14, 17, 23);

    drawAtomSection();
    drawSpectrumSection();
    drawDivider();
    drawPhotonParticles();
    drawFlash();

    if (!playing) {{
      p.fill(255, 255, 255, 80);
      p.textSize(28);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('PAUSED', ATOM_CX, H * 0.10);
      return;
    }}

    // Advance electron angle
    const omega = speed * 0.025 / Math.max(1, electronShell);
    electronAngle += omega;

    // Transition timer
    transTimer++;
    const interval = Math.round(transInterval / speed);
    if (transTimer >= interval && ACTIVE_TRANS.length > 0) {{
      triggerTransition();
      transTimer = 0;
    }}

    // Advance photon particles
    for (let i = photonParticles.length - 1; i >= 0; i--) {{
      const ph = photonParticles[i];
      ph.x += ph.vx * speed;
      ph.y += ph.vy * speed;
      ph.alpha -= 4 * speed;
      ph.r = Math.max(1, ph.r - 0.03 * speed);
      if (ph.alpha <= 0) photonParticles.splice(i, 1);
    }};

    if (flashAlpha > 0) flashAlpha -= 3 * speed;
  }};

  function triggerTransition() {{
    // Pick a random transition from current shell, or any
    let candidates = ACTIVE_TRANS;
    if (IS_EMISSION) {{
      candidates = ACTIVE_TRANS.filter(t => t.n_upper === electronShell);
      if (candidates.length === 0) candidates = ACTIVE_TRANS;
    }} else {{
      candidates = ACTIVE_TRANS.filter(t => t.n_lower === electronShell);
      if (candidates.length === 0) candidates = ACTIVE_TRANS;
    }}
    currentTrans = candidates[Math.floor(Math.random() * candidates.length)];

    // Move electron
    if (IS_EMISSION) {{
      electronShell = currentTrans.n_lower;
    }} else {{
      electronShell = currentTrans.n_upper;
    }}

    // Spawn photon particle
    const [cr, cg, cb] = lambdaToRgb(currentTrans.lambda_nm);
    const r_orbit = Math.min(orbRadius(electronShell), MAX_R);
    const ex = ATOM_CX + r_orbit * Math.cos(electronAngle);
    const ey = ATOM_CY + r_orbit * Math.sin(electronAngle);
    const angle = IS_EMISSION ? Math.random() * Math.PI * 2 : Math.atan2(ATOM_CY - ey, ATOM_CX - ex);
    const spd = IS_EMISSION ? 2.5 + Math.random() * 1.5 : 2.0;

    for (let k = 0; k < 4; k++) {{
      const spread = (Math.random() - 0.5) * 0.8;
      photonParticles.push({{
        x: ex, y: ey,
        vx: Math.cos(angle + spread) * spd,
        vy: Math.sin(angle + spread) * spd,
        r: 5, alpha: 255,
        cr, cg, cb,
      }});
    }}

    // Flash text
    flashText = IS_EMISSION
      ? `n=${{currentTrans.n_upper}}→${{currentTrans.n_lower}}  λ=${{currentTrans.lambda_nm.toFixed(0)}}nm`
      : `n=${{currentTrans.n_lower}}→${{currentTrans.n_upper}}  λ=${{currentTrans.lambda_nm.toFixed(0)}}nm`;
    flashAlpha = 255;
  }}

  function drawAtomSection() {{
    // Section label
    p.noStroke();
    p.fill(180, 180, 200);
    p.textSize(11);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Bohr Model', 8, 8);
    if (ELEMENT !== 'Hydrogen') {{
      p.fill(150, 150, 170);
      p.textSize(10);
      p.text('(H schematic)', 8, 22);
    }}

    // Orbital shells
    for (let n = 1; n <= N_MAX; n++) {{
      const r = Math.min(orbRadius(n), MAX_R);
      const En = -13.6 / (n * n);
      const t = (n - 1) / Math.max(1, N_MAX - 1);
      const lv = Math.round(p.lerp(80, 140, t));
      p.noFill();
      p.stroke(lv, lv + 10, lv + 30, 140);
      p.strokeWeight(1);
      p.ellipse(ATOM_CX, ATOM_CY, r * 2, r * 2);

      // n-label and energy
      p.noStroke();
      p.fill(lv, lv + 20, lv + 60);
      p.textSize(9);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`n=${{n}}: ${{En.toFixed(2)}}eV`, ATOM_CX + r + 4, ATOM_CY - r * 0.6 + (n - 1) * 2);
    }}

    // Nucleus
    p.noStroke();
    p.fill(220, 50, 50, 60);
    p.ellipse(ATOM_CX, ATOM_CY, 22, 22);
    p.fill(220, 80, 80);
    p.ellipse(ATOM_CX, ATOM_CY, 14, 14);
    p.fill(255, 200, 200, 200);
    p.ellipse(ATOM_CX - 2, ATOM_CY - 2, 5, 5);
    p.noStroke();
    p.fill(200, 200, 200);
    p.textSize(9);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('+', ATOM_CX, ATOM_CY);

    // Electron
    const r_el = Math.min(orbRadius(electronShell), MAX_R);
    const ex = ATOM_CX + r_el * Math.cos(electronAngle);
    const ey = ATOM_CY + r_el * Math.sin(electronAngle);

    // Electron glow
    p.noStroke();
    p.fill(80, 130, 255, 50);
    p.ellipse(ex, ey, 18, 18);
    p.fill(100, 160, 255);
    p.ellipse(ex, ey, 10, 10);
    p.fill(220, 240, 255, 200);
    p.ellipse(ex - 2, ey - 2, 4, 4);
  }}

  function drawSpectrumSection() {{
    // Title
    p.noStroke();
    p.fill(180, 180, 200);
    p.textSize(11);
    p.textAlign(p.LEFT, p.TOP);
    p.text(IS_EMISSION ? 'Emission Spectrum' : 'Absorption Spectrum', SPEC_X0, 8);

    const barH = SPEC_Y1 - SPEC_Y0;

    if (IS_EMISSION) {{
      // Dark background for emission
      p.fill(10, 10, 15);
      p.noStroke();
      p.rect(SPEC_X0, SPEC_Y0, SPEC_X1 - SPEC_X0, barH, 3);
    }} else {{
      // White background for absorption
      for (let px = SPEC_X0; px < SPEC_X1; px++) {{
        const lam = LAM_MIN + (px - SPEC_X0) / (SPEC_X1 - SPEC_X0) * (LAM_MAX - LAM_MIN);
        const [r, g, b] = lambdaToRgb(lam);
        if (lam >= 380 && lam <= 780) {{
          p.stroke(r, g, b, 200);
        }} else {{
          p.stroke(30, 30, 30);
        }}
        p.line(px, SPEC_Y0, px, SPEC_Y1);
      }}
    }}

    // Draw spectral lines
    for (const t of ACTIVE_TRANS) {{
      if (t.n_upper > N_MAX) continue;
      const x = lamToX(t.lambda_nm);
      if (x < SPEC_X0 || x > SPEC_X1) continue;
      const [r, g, b] = lambdaToRgb(t.lambda_nm);

      // Highlight if this is the current transition
      const isCurrent = currentTrans && currentTrans.n_upper === t.n_upper && currentTrans.n_lower === t.n_lower;
      const alpha = isCurrent ? 255 : 180;
      const w = isCurrent ? 3 : 1.5;

      if (IS_EMISSION) {{
        p.stroke(r, g, b, alpha);
        p.strokeWeight(w);
        p.line(x, SPEC_Y0 + 1, x, SPEC_Y1 - 1);
      }} else {{
        // Dark absorption line
        p.stroke(5, 5, 10, alpha);
        p.strokeWeight(isCurrent ? 4 : 2);
        p.line(x, SPEC_Y0 + 1, x, SPEC_Y1 - 1);
      }}

      // Label Balmer named lines
      if (t.label && t.label.startsWith('H-')) {{
        p.noStroke();
        p.fill(r, g, b, isCurrent ? 255 : 160);
        p.textSize(8);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text(t.label, x, SPEC_Y0 - 2);
      }}
    }}

    // Wavelength axis ticks
    p.noStroke();
    p.fill(160, 160, 180);
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);
    for (let lam = 200; lam <= 750; lam += 100) {{
      const x = lamToX(lam);
      p.stroke(80, 80, 100);
      p.strokeWeight(1);
      p.line(x, SPEC_Y1, x, SPEC_Y1 + 5);
      p.noStroke();
      p.text(lam + ' nm', x, SPEC_Y1 + 7);
    }}

    // Region labels
    p.textSize(9);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(160, 60, 200, 160);
    p.text('UV', lamToX(240), SPEC_Y0 + barH / 2);
    p.fill(200, 200, 120, 160);
    p.text('Visible', lamToX(580), SPEC_Y0 + barH / 2);
    p.fill(200, 60, 60, 160);
    p.text('IR', lamToX(730), SPEC_Y0 + barH / 2);

    // Current transition callout
    if (currentTrans) {{
      const cx = lamToX(currentTrans.lambda_nm);
      const [r, g, b] = lambdaToRgb(currentTrans.lambda_nm);
      p.noStroke();
      p.fill(r, g, b, Math.max(0, flashAlpha));
      p.textSize(10);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(
        `${{currentTrans.lambda_nm.toFixed(1)}} nm  (${{currentTrans.series_name}})`,
        Math.min(Math.max(cx, SPEC_X0 + 40), SPEC_X1 - 40),
        SPEC_Y1 + 38,
      );
    }}
  }}

  function drawDivider() {{
    p.stroke(50, 55, 80);
    p.strokeWeight(1);
    p.line(SPEC_X0 - 12, 0, SPEC_X0 - 12, H);
  }}

  function drawPhotonParticles() {{
    for (const ph of photonParticles) {{
      p.noStroke();
      p.fill(ph.cr, ph.cg, ph.cb, ph.alpha * 0.4);
      p.ellipse(ph.x, ph.y, ph.r * 3, ph.r * 3);
      p.fill(ph.cr, ph.cg, ph.cb, ph.alpha);
      p.ellipse(ph.x, ph.y, ph.r * 1.2, ph.r * 1.2);
    }}
  }}

  function drawFlash() {{
    if (flashAlpha <= 0) return;
    p.noStroke();
    p.fill(255, 255, 255, flashAlpha * 0.85);
    p.textSize(11);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(
      (IS_EMISSION ? '→ ' : '← ') + flashText,
      ATOM_CX - 80,
      H - 38,
    );
  }}

  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || W, H);
  }};
}});
</script>
</body>
</html>"""


# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    mode = mode_toggle()

    st.divider()

    element = st.selectbox(
        "Element",
        ["Hydrogen", "Helium", "Sodium", "Neon"],
        index=0,
        help="Hydrogen uses full Bohr model. Others show experimental line data only.",
    )

    spectrum_mode = st.radio(
        "Spectrum mode",
        ["Emission spectrum", "Absorption spectrum"],
        index=0,
    )

    if element == "Hydrogen":
        series_choice = st.selectbox(
            "Series",
            ["All", "Lyman", "Balmer", "Paschen"],
            index=0,
            help="Lyman (UV, to n=1), Balmer (visible, to n=2), Paschen (IR, to n=3)",
        )
    else:
        series_choice = "All"

    n_max = st.slider(
        "Max energy level n_max",
        min_value=2,
        max_value=8,
        value=5,
        step=1,
        help="Number of orbital shells displayed in the Bohr diagram.",
    )

    if mode == "Advanced":
        advanced_divider()
        show_balmer_table = st.checkbox("Show Balmer series table", value=True)
    else:
        show_balmer_table = False


# ── Pre-compute transitions ───────────────────────────────────────────────────

all_transitions = compute_hydrogen_transitions(n_max)
series_filter   = get_series_filter(series_choice)

# Filter for display
displayed_transitions = [
    t for t in all_transitions
    if t["series_lower"] in series_filter and t["n_upper"] <= n_max
]

# Select a representative transition for metrics (lowest Balmer or first available)
def pick_representative(trans_list: list[dict]) -> dict | None:
    """Pick the most pedagogically relevant transition for the metric row."""
    # Prefer H-alpha (3→2)
    for t in trans_list:
        if t["n_upper"] == 3 and t["n_lower"] == 2:
            return t
    return trans_list[0] if trans_list else None

rep = pick_representative(displayed_transitions)


# ── Page header ───────────────────────────────────────────────────────────────

sim_header("Atomic Spectra & Bohr Model", SPEC_REF)

# ── Main layout ───────────────────────────────────────────────────────────────

left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

# ── LEFT COLUMN ───────────────────────────────────────────────────────────────

with left_col:
    physics_notes(
        spec_ref=SPEC_REF,
        equations=[
            r"E_n = \frac{-13.6}{n^2} \text{ eV}",
            r"\Delta E = E_{\text{upper}} - E_{\text{lower}} = hf = \frac{hc}{\lambda}",
            r"\lambda = \frac{hc}{\Delta E} \approx \frac{1240 \text{ eV·nm}}{\Delta E_{\text{eV}}}",
            r"r_n = n^2 a_0, \quad a_0 = 0.529 \text{ Å}",
        ],
        explanation=(
            "Electrons in a hydrogen atom can only occupy discrete energy levels. "
            "When an electron drops from a higher level (n_upper) to a lower level "
            "(n_lower) it emits a photon whose energy equals the difference ΔE. "
            "This produces the characteristic line spectrum of hydrogen. "
            "The Lyman series (to n=1) falls in UV, the Balmer series (to n=2) is "
            "partly visible, and the Paschen series (to n=3) is infrared."
        ),
        advanced_text=(
            "The Bohr model correctly predicts hydrogen energy levels but fails for "
            "multi-electron atoms. The full quantum-mechanical treatment uses "
            "wavefunctions ψ_nlm with principal (n), orbital (l) and magnetic (m) "
            "quantum numbers. The ionisation energy of hydrogen (13.6 eV) is the "
            "energy required to remove an electron from the ground state to n=∞."
        ),
        mode=mode,
    )

    if rep is not None:
        st.divider()
        st.markdown("**Selected transition**")
        metric_row({
            "Transition": f"n={rep['n_upper']} → n={rep['n_lower']}",
            "ΔE": f"{rep['delta_E_eV']:.3f} eV",
            "λ": f"{rep['lambda_nm']:.1f} nm",
        })
        freq_hz = rep["delta_E_eV"] * e_charge / h_planck
        metric_row({
            "Frequency": f"{freq_hz:.3e} Hz",
            "Series": rep["series_name"],
            "Region": rep["region"],
        })

    st.divider()
    st.markdown("**Ionisation energy**")
    st.markdown(
        "From the ground state (n = 1), the energy required to completely "
        "remove the electron is **13.6 eV** (the ionisation energy of hydrogen)."
    )

    if show_balmer_table and element == "Hydrogen":
        st.divider()
        st.markdown("**Balmer series lines**")
        balmer_rows = []
        for t in all_transitions:
            if t["series_lower"] != 2:
                continue
            name_entry = BALMER_NAMED.get((t["n_upper"], t["n_lower"]), ("", None))
            named_lam  = name_entry[1]
            balmer_rows.append({
                "Line":       name_entry[0] if name_entry[0] else f"n={t['n_upper']}→2",
                "λ (nm)":     f"{t['lambda_nm']:.1f}",
                "ΔE (eV)":    f"{t['delta_E_eV']:.3f}",
                "Colour":     t["region"],
            })
        if balmer_rows:
            st.dataframe(balmer_rows, use_container_width=True, hide_index=True)


# ── RIGHT COLUMN ──────────────────────────────────────────────────────────────

with right_col:
    # ── 1. p5.js Bohr atom + spectrum bar ─────────────────────────────────────
    transitions_for_js = []
    if element == "Hydrogen":
        for t in displayed_transitions:
            transitions_for_js.append({
                "n_upper":      t["n_upper"],
                "n_lower":      t["n_lower"],
                "delta_E_eV":   t["delta_E_eV"],
                "lambda_nm":    t["lambda_nm"],
                "series_name":  t["series_name"],
                "series_lower": t["series_lower"],
                "label":        t["label"],
            })
    else:
        # Non-hydrogen: convert preset lines to a transition-like structure
        for lam, intensity, name in OTHER_ELEMENTS.get(element, []):
            transitions_for_js.append({
                "n_upper":      0,
                "n_lower":      0,
                "delta_E_eV":   round(1240.0 / lam, 4),
                "lambda_nm":    lam,
                "series_name":  name,
                "series_lower": 2,   # treat as Balmer for JS filter
                "label":        f"{lam:.1f} nm",
            })

    anim_html = build_atomic_animation(
        element=element,
        n_max=n_max,
        mode=spectrum_mode,
        show_series=series_choice,
        transitions_json=json.dumps(transitions_for_js),
    )
    components.html(anim_html, height=440, scrolling=False)

    # ── 2. Plotly energy level diagram (Hydrogen only) ─────────────────────────
    if element == "Hydrogen":
        st.markdown("##### Energy level diagram")
        energy_fig = build_energy_level_diagram(
            transitions=displayed_transitions,
            n_max=n_max,
            mode=spectrum_mode,
            series_filter=series_filter,
        )
        st.plotly_chart(energy_fig, use_container_width=True)

    # ── 3. Plotly wavelength spectrum ──────────────────────────────────────────
    if mode == "Advanced" or element != "Hydrogen":
        st.markdown("##### Wavelength spectrum")
        spec_fig = build_wavelength_spectrum(
            transitions=displayed_transitions,
            element=element,
            mode=spectrum_mode,
            series_filter=series_filter,
            n_max=n_max,
        )
        st.plotly_chart(spec_fig, use_container_width=True)
    else:
        # Always show the spectrum in Basic mode too, just smaller / no label
        st.markdown("##### Wavelength spectrum")
        spec_fig = build_wavelength_spectrum(
            transitions=displayed_transitions,
            element=element,
            mode=spectrum_mode,
            series_filter=series_filter,
            n_max=n_max,
        )
        st.plotly_chart(spec_fig, use_container_width=True)
