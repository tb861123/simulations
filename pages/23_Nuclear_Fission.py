"""
Nuclear Fission — Chain Reactions & Binding Energy
WJEC Eduqas A Level Physics, Component 3, Topic 6 — Nuclear Physics

Simulates nuclear fission chain reactions, mass defect, energy release,
the binding energy per nucleon curve, and neutron multiplication factor.
"""

import math

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.style import COLOURS, plotly_layout
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
    page_title="Nuclear Fission — WJEC Physics",
    page_icon="⚛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Constants & nuclear data ──────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 6 (Nuclear Physics)"

# Atomic masses (u)
M_U235  = 235.043930
M_N     = 1.008665
M_BA141 = 140.914411
M_KR92  = 91.926156

# U-235 fission: U-235 + n → Ba-141 + Kr-92 + 3n
DELTA_M_U235 = (M_U235 + M_N) - (M_BA141 + M_KR92 + 3 * M_N)   # = 0.186043 u
E_MEV_U235   = DELTA_M_U235 * 931.5                               # ≈ 173.3 MeV

# Pu-239 fission: approximate, ~200 MeV per fission
E_MEV_PU239  = 200.0

# J per MeV
MEV_TO_J = 1.602e-13

# ── Semi-empirical mass formula (SEMF) ────────────────────────────────────────


def binding_energy_per_nucleon(A: int) -> float:
    """
    Return binding energy per nucleon B/A in MeV using the Bethe-Weizsäcker SEMF.

    Parameters
    ----------
    A : mass number

    Returns
    -------
    B/A in MeV, or 0.0 if the result is non-physical.
    """
    if A < 2:
        return 0.0
    # Estimate Z for most stable isobar: Z ≈ A / (2 + 0.0155 * A^(2/3))
    Z = A / (2.0 + 0.0155 * A ** (2.0 / 3.0))
    a_v  = 15.75   # volume
    a_s  = 17.8    # surface
    a_c  = 0.711   # Coulomb
    a_a  = 23.7    # asymmetry
    B = (
        a_v * A
        - a_s * A ** (2.0 / 3.0)
        - a_c * Z ** 2 / A ** (1.0 / 3.0)
        - a_a * (A - 2 * Z) ** 2 / A
    )
    return max(0.0, B / A)


@st.cache_data
def compute_binding_curve() -> tuple[np.ndarray, np.ndarray]:
    """
    Compute the B/A curve for A = 2 … 240 using SEMF.

    Returns
    -------
    A_vals : array of mass numbers
    BA_vals : array of B/A values (MeV/nucleon)
    """
    A_vals  = np.arange(2, 241)
    BA_vals = np.array([binding_energy_per_nucleon(int(a)) for a in A_vals])
    return A_vals, BA_vals


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_binding_energy_plot(fuel: str) -> go.Figure:
    """
    Plot B/A vs mass number with SEMF curve, labelled nuclides, and energy arrow.

    Parameters
    ----------
    fuel : 'U-235' or 'Pu-239'

    Returns
    -------
    Plotly Figure
    """
    A_vals, BA_vals = compute_binding_curve()

    fig = go.Figure()

    # ── Main SEMF curve ──────────────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=A_vals,
        y=BA_vals,
        mode="lines",
        name="B/A (SEMF)",
        line=dict(color=COLOURS["primary"], width=2.5),
        hovertemplate="A=%{x}<br>B/A=%{y:.3f} MeV/nucleon<extra></extra>",
    ))

    # ── Fe-56 peak ───────────────────────────────────────────────────────────
    fe56_ba = binding_energy_per_nucleon(56)
    fig.add_trace(go.Scatter(
        x=[56],
        y=[fe56_ba],
        mode="markers+text",
        name="Fe-56 (peak)",
        marker=dict(color=COLOURS["secondary"], size=12, symbol="star"),
        text=["Fe-56"],
        textposition="top right",
        textfont=dict(color=COLOURS["secondary"], size=11),
        hovertemplate=f"Fe-56<br>B/A = {fe56_ba:.2f} MeV/nucleon<extra></extra>",
    ))

    # ── Fission products ─────────────────────────────────────────────────────
    ba141_ba = binding_energy_per_nucleon(141)
    kr92_ba  = binding_energy_per_nucleon(92)

    if fuel == "U-235":
        parent_A   = 235
        parent_BA  = binding_energy_per_nucleon(235)
        parent_lbl = "U-235"
        parent_col = COLOURS["advanced"]
    else:
        parent_A   = 239
        parent_BA  = binding_energy_per_nucleon(239)
        parent_lbl = "Pu-239"
        parent_col = COLOURS["highlight"]

    # Parent nucleus
    fig.add_trace(go.Scatter(
        x=[parent_A],
        y=[parent_BA],
        mode="markers+text",
        name=parent_lbl,
        marker=dict(color=parent_col, size=14, symbol="diamond"),
        text=[parent_lbl],
        textposition="top left",
        textfont=dict(color=parent_col, size=11),
        hovertemplate=f"{parent_lbl}<br>B/A = {parent_BA:.3f} MeV/nucleon<extra></extra>",
    ))

    # Ba-141
    fig.add_trace(go.Scatter(
        x=[141],
        y=[ba141_ba],
        mode="markers+text",
        name="Ba-141",
        marker=dict(color=COLOURS["secondary"], size=12, symbol="circle"),
        text=["Ba-141"],
        textposition="top right",
        textfont=dict(color=COLOURS["secondary"], size=11),
        hovertemplate=f"Ba-141<br>B/A = {ba141_ba:.3f} MeV/nucleon<extra></extra>",
    ))

    # Kr-92
    fig.add_trace(go.Scatter(
        x=[92],
        y=[kr92_ba],
        mode="markers+text",
        name="Kr-92",
        marker=dict(color=COLOURS["tertiary"], size=12, symbol="circle"),
        text=["Kr-92"],
        textposition="top right",
        textfont=dict(color=COLOURS["tertiary"], size=11),
        hovertemplate=f"Kr-92<br>B/A = {kr92_ba:.3f} MeV/nucleon<extra></extra>",
    ))

    # ── Arrow: energy released per fission ───────────────────────────────────
    avg_product_ba = (ba141_ba * 141 + kr92_ba * 92) / (141 + 92)
    fig.add_annotation(
        x=parent_A,
        y=parent_BA,
        ax=int((141 + 92) / 2),
        ay=avg_product_ba,
        xref="x", yref="y",
        axref="x", ayref="y",
        text="",
        arrowhead=2,
        arrowsize=1.2,
        arrowwidth=2,
        arrowcolor=COLOURS["highlight"],
        showarrow=True,
    )
    fig.add_annotation(
        x=150,
        y=(parent_BA + avg_product_ba) / 2 + 0.12,
        text="<b>Energy released</b>",
        showarrow=False,
        font=dict(color=COLOURS["highlight"], size=10),
        xanchor="center",
    )

    # ── Layout ────────────────────────────────────────────────────────────────
    fig.update_layout(**plotly_layout(
        height=340,
        title=dict(
            text="Binding Energy per Nucleon vs Mass Number",
            font=dict(size=13),
        ),
        xaxis=dict(
            title="Mass number A",
            range=[0, 245],
            gridcolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            title="B/A (MeV/nucleon)",
            range=[0, 9.2],
            gridcolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        legend=dict(
            x=0.02, y=0.35,
            bgcolor="rgba(0,0,0,0.5)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
            font=dict(size=10),
        ),
        margin=dict(l=60, r=30, t=50, b=60),
    ))
    return fig


def build_neutron_population_plot(k: float) -> go.Figure:
    """
    Plot neutron population N(gen) = N0 × k^gen for several k values.

    Parameters
    ----------
    k : current slider value (highlighted trace)

    Returns
    -------
    Plotly Figure (log-y scale)
    """
    gens    = np.arange(0, 21)
    k_vals  = [0.8, 1.0, 1.2, 1.5]
    colours = [
        COLOURS["tertiary"],
        COLOURS["secondary"],
        COLOURS["advanced"],
        COLOURS["highlight"],
    ]
    labels  = ["k = 0.8 (subcritical)", "k = 1.0 (critical)", "k = 1.2 (supercritical)", "k = 1.5 (bomb-like)"]

    fig = go.Figure()

    for kv, col, lbl in zip(k_vals, colours, labels):
        N = np.array([kv ** g for g in gens], dtype=float)
        width  = 3.0 if abs(kv - k) < 0.05 else 1.5
        dash   = "solid" if abs(kv - k) < 0.05 else "dot"
        fig.add_trace(go.Scatter(
            x=gens,
            y=N,
            mode="lines",
            name=lbl,
            line=dict(color=col, width=width, dash=dash),
            hovertemplate=f"{lbl}<br>Gen=%{{x}}<br>N=%{{y:.2f}}<extra></extra>",
        ))

    # Current k trace if not already in k_vals
    if not any(abs(kv - k) < 0.05 for kv in k_vals):
        N_cur = np.array([k ** g for g in gens], dtype=float)
        fig.add_trace(go.Scatter(
            x=gens,
            y=N_cur,
            mode="lines",
            name=f"k = {k:.1f} (current)",
            line=dict(color="#ffffff", width=2.5, dash="solid"),
            hovertemplate=f"k={k:.1f}<br>Gen=%{{x}}<br>N=%{{y:.2f}}<extra></extra>",
        ))

    fig.update_layout(**plotly_layout(
        height=300,
        title=dict(
            text="Neutron Population vs Generation  N(gen) = k^gen",
            font=dict(size=13),
        ),
        xaxis=dict(
            title="Generation number",
            gridcolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            title="Neutron population (log scale)",
            type="log",
            gridcolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        legend=dict(
            x=0.01, y=0.99,
            bgcolor="rgba(0,0,0,0.5)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
            font=dict(size=10),
        ),
        margin=dict(l=60, r=30, t=50, b=60),
    ))
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_fission_animation(k: float, initial_n: int, fuel: str, control_rods: bool) -> str:
    """
    Build the self-contained p5.js nuclear fission chain-reaction animation.

    Parameters
    ----------
    k            : multiplication factor (0.5 – 2.0)
    initial_n    : number of neutrons in the first generation
    fuel         : 'U-235' or 'Pu-239'
    control_rods : whether to display absorbing control rods

    Returns
    -------
    HTML string containing the p5.js animation
    """
    control_rods_js = "true" if control_rods else "false"
    fuel_label      = fuel.replace("-", "&#8209;")   # non-breaking hyphen for display

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{ margin:0; background:#0e1117; overflow:hidden; font-family:monospace; }}
  canvas {{ display:block; }}
  #controls {{
    position:absolute; top:6px; right:8px;
    display:flex; gap:6px; align-items:center;
  }}
  button {{
    background:#1e2130; color:#fafafa; border:1px solid #444;
    padding:3px 9px; border-radius:4px; cursor:pointer; font-size:11px;
  }}
  button:hover {{ background:#2a2f4a; }}
  #speed-label {{ color:#aaa; font-size:11px; }}
</style>
</head>
<body>
<div id="controls">
  <button id="btn-reset">↺ Reset</button>
  <button id="btn-play">⏸ Pause</button>
  <button id="btn-slower">0.5×</button>
  <button id="btn-faster">2×</button>
  <span id="speed-label">1×</span>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
// ── Simulation parameters passed from Python ──────────────────────────────
const K_FACTOR      = {k:.2f};
const INITIAL_N     = {initial_n};
const FUEL_LABEL    = "{fuel}";
const CONTROL_RODS  = {control_rods_js};
const MAX_NUCLEI    = 48;       // cap to keep canvas uncluttered
const MAX_NEUTRONS  = 200;      // performance cap

new p5(function(p) {{
  const W = 700, H = 420;

  // ── State ──────────────────────────────────────────────────────────────────
  let nuclei    = [];   // {{ x, y, r, alive, flashTimer, label }}
  let neutrons  = [];   // {{ x, y, vx, vy, active, absorbed }}
  let generation   = 0;
  let activeFissions = 0;
  let totalFissions  = 0;
  let playing = true;
  let speed   = 1.0;
  let shakeX  = 0, shakeY = 0;
  let bgAlpha = 0;    // red glow alpha for supercritical

  // ── Control rod bars (3 vertical bars) ───────────────────────────────────
  const ROD_X  = [W * 0.30, W * 0.52, W * 0.74];
  const ROD_W  = 10;
  const ROD_H  = H * 0.70;
  const ROD_Y0 = H * 0.15;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function randRange(a, b) {{ return a + Math.random() * (b - a); }}

  function placeNuclei() {{
    nuclei = [];
    // Grid-like placement avoiding rods
    let cols = 7, rows = 6;
    let cw = (W - 60) / cols, rh = (H - 80) / rows;
    for (let r = 0; r < rows; r++) {{
      for (let c = 0; c < cols; c++) {{
        if (nuclei.length >= MAX_NUCLEI) break;
        let nx = 30 + cw * c + randRange(8, cw - 8);
        let ny = 60 + rh * r + randRange(8, rh - 8);
        nuclei.push({{ x: nx, y: ny, r: 14, alive: true, flashTimer: 0, label: FUEL_LABEL }});
      }}
    }}
  }}

  function launchNeutron(x, y, angle) {{
    if (neutrons.length >= MAX_NEUTRONS) return;
    const spd = randRange(1.8, 2.8);
    neutrons.push({{
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      active: true,
      absorbed: false,
      gen: generation,
    }});
  }}

  function initSim() {{
    placeNuclei();
    neutrons = [];
    generation   = 0;
    activeFissions = 0;
    totalFissions  = 0;
    shakeX = 0; shakeY = 0;
    bgAlpha = 0;

    // Launch initial neutrons aimed at centre nucleus
    const target = nuclei[Math.floor(nuclei.length / 2)];
    for (let i = 0; i < INITIAL_N; i++) {{
      const angle = Math.atan2(target.y - H / 2, target.x - W / 2)
                    + randRange(-0.3, 0.3);
      launchNeutron(W / 2 + randRange(-20, 20), H / 2 + randRange(-20, 20), angle);
    }}
  }}

  function fissionEvent(nucleus) {{
    if (!nucleus.alive) return;
    nucleus.alive = false;
    nucleus.flashTimer = 30;
    totalFissions++;
    generation++;

    // Number of new neutrons produced: Poisson-like around K_FACTOR
    const nNew = Math.round(K_FACTOR * 3 * (0.7 + Math.random() * 0.6));
    const effectiveN = CONTROL_RODS ? Math.max(0, nNew - 1) : nNew;

    for (let i = 0; i < effectiveN; i++) {{
      const angle = (Math.PI * 2 * i / Math.max(1, effectiveN)) + randRange(-0.4, 0.4);
      launchNeutron(nucleus.x, nucleus.y, angle);
    }}

    // Supercritical shake
    if (K_FACTOR > 1.0) {{
      shakeX = randRange(-4, 4) * (K_FACTOR - 1.0);
      shakeY = randRange(-4, 4) * (K_FACTOR - 1.0);
      bgAlpha = Math.min(255, bgAlpha + 30 * (K_FACTOR - 1.0));
    }}
  }}

  function isNearRod(nx, ny) {{
    if (!CONTROL_RODS) return false;
    for (const rx of ROD_X) {{
      if (Math.abs(nx - rx) < ROD_W / 2 + 4 && ny > ROD_Y0 && ny < ROD_Y0 + ROD_H) {{
        return true;
      }}
    }}
    return false;
  }}

  // ── p5 lifecycle ─────────────────────────────────────────────────────────
  p.setup = function() {{
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');
    initSim();

    document.getElementById('btn-play').addEventListener('click', () => {{
      playing = !playing;
      document.getElementById('btn-play').textContent = playing ? '⏸ Pause' : '▶ Play';
    }});
    document.getElementById('btn-slower').addEventListener('click', () => {{
      speed = Math.max(0.25, speed / 2);
      document.getElementById('speed-label').textContent = speed + '×';
    }});
    document.getElementById('btn-faster').addEventListener('click', () => {{
      speed = Math.min(4.0, speed * 2);
      document.getElementById('speed-label').textContent = speed + '×';
    }});
    document.getElementById('btn-reset').addEventListener('click', () => {{
      initSim();
    }});
  }};

  p.draw = function() {{
    // Supercritical red background glow
    if (K_FACTOR > 1.0 && bgAlpha > 0) {{
      p.background(40, 10, 10);
      bgAlpha = Math.max(0, bgAlpha - 1.5 * speed);
    }} else {{
      p.background(14, 17, 23);
    }}

    // Canvas shake for supercritical
    if (shakeX !== 0 || shakeY !== 0) {{
      p.translate(shakeX, shakeY);
      shakeX *= 0.7; shakeY *= 0.7;
      if (Math.abs(shakeX) < 0.3) shakeX = 0;
      if (Math.abs(shakeY) < 0.3) shakeY = 0;
    }}

    drawControlRods();
    drawNuclei();
    drawNeutrons();
    drawHUD();

    if (!playing) {{
      p.noStroke();
      p.fill(255, 255, 255, 80);
      p.textSize(26);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('PAUSED', W / 2, H / 2);
      return;
    }}

    // ── Physics update ─────────────────────────────────────────────────────
    const steps = speed >= 2 ? 2 : 1;
    for (let s = 0; s < steps; s++) {{
      updateNeutrons();
    }}
  }};

  function updateNeutrons() {{
    let activeCount = 0;
    for (let i = neutrons.length - 1; i >= 0; i--) {{
      const n = neutrons[i];
      if (!n.active) continue;
      activeCount++;

      n.x += n.vx * speed;
      n.y += n.vy * speed;

      // Wall bounce
      if (n.x < 0 || n.x > p.width)  {{ n.vx *= -1; n.x = p.constrain(n.x, 0, p.width); }}
      if (n.y < 0 || n.y > H)         {{ n.vy *= -1; n.y = p.constrain(n.y, 0, H); }}

      // Control rod absorption
      if (isNearRod(n.x, n.y)) {{
        n.active = false;
        n.absorbed = true;
        continue;
      }}

      // Check collision with alive nuclei
      for (const nuc of nuclei) {{
        if (!nuc.alive) continue;
        const dx = n.x - nuc.x, dy = n.y - nuc.y;
        if (dx * dx + dy * dy < (nuc.r + 5) * (nuc.r + 5)) {{
          n.active = false;
          fissionEvent(nuc);
          break;
        }}
      }}
    }}
    // Remove long-dead neutrons to save memory
    if (neutrons.length > MAX_NEUTRONS) neutrons.splice(0, neutrons.length - MAX_NEUTRONS);
  }}

  function drawControlRods() {{
    if (!CONTROL_RODS) return;
    for (const rx of ROD_X) {{
      // Glow
      p.noStroke();
      p.fill(80, 80, 100, 40);
      p.rect(rx - ROD_W / 2 - 4, ROD_Y0 - 2, ROD_W + 8, ROD_H + 4, 3);
      // Rod body
      p.fill(130, 140, 160);
      p.rect(rx - ROD_W / 2, ROD_Y0, ROD_W, ROD_H, 3);
      // Label
      p.noStroke();
      p.fill(200, 210, 230, 180);
      p.textSize(8);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text('Rod', rx, ROD_Y0 - 3);
    }}
  }}

  function drawNuclei() {{
    for (const nuc of nuclei) {{
      if (!nuc.alive) {{
        if (nuc.flashTimer > 0) {{
          nuc.flashTimer -= speed;
          // Draw fission flash: two daughter products
          const a = nuc.flashTimer / 30;
          p.noStroke();
          // Ba-141 (orange)
          p.fill(255, 140, 0, 200 * a);
          p.ellipse(nuc.x - 10 * (1 - a) * 3, nuc.y, nuc.r * 0.9, nuc.r * 0.9);
          // Kr-92 (green)
          p.fill(60, 200, 80, 200 * a);
          p.ellipse(nuc.x + 12 * (1 - a) * 3, nuc.y, nuc.r * 0.75, nuc.r * 0.75);
          // Labels fade in
          if (a < 0.6) {{
            p.noStroke();
            p.fill(255, 160, 50, (0.6 - a) / 0.6 * 200);
            p.textSize(7);
            p.textAlign(p.CENTER, p.CENTER);
            p.text('Ba', nuc.x - 10 * (1 - a) * 3, nuc.y);
            p.fill(80, 220, 100, (0.6 - a) / 0.6 * 200);
            p.text('Kr', nuc.x + 12 * (1 - a) * 3, nuc.y);
          }}
        }}
        continue;
      }}

      // Nucleus glow
      p.noStroke();
      p.fill(120, 50, 220, 35);
      p.ellipse(nuc.x, nuc.y, nuc.r * 2.6, nuc.r * 2.6);
      // Nucleus body (purple)
      p.fill(150, 80, 240);
      p.ellipse(nuc.x, nuc.y, nuc.r * 2, nuc.r * 2);
      // Highlight
      p.fill(220, 200, 255, 180);
      p.ellipse(nuc.x - nuc.r * 0.3, nuc.y - nuc.r * 0.3, nuc.r * 0.55, nuc.r * 0.55);
      // Label
      p.noStroke();
      p.fill(255, 255, 255, 220);
      p.textSize(7);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(FUEL_LABEL === 'U-235' ? 'U' : 'Pu', nuc.x, nuc.y);
    }}
  }}

  function drawNeutrons() {{
    for (const n of neutrons) {{
      if (!n.active) continue;
      p.noStroke();
      // Glow
      p.fill(255, 255, 220, 50);
      p.ellipse(n.x, n.y, 14, 14);
      // Core
      p.fill(255, 255, 200);
      p.ellipse(n.x, n.y, 6, 6);
    }}
  }}

  function drawHUD() {{
    // Semi-transparent HUD background
    p.noStroke();
    p.fill(0, 0, 0, 140);
    p.rect(4, 4, 230, 50, 4);

    const activeN = neutrons.filter(n => n.active).length;
    p.noStroke();
    p.fill(200, 220, 255);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`Generation: ${{generation}}`, 10, 9);
    p.text(`Active neutrons: ${{activeN}}`, 10, 23);
    p.text(`Fissions: ${{totalFissions}}`, 10, 37);

    // k-status badge
    let statusCol, statusTxt;
    if (K_FACTOR < 0.999) {{
      statusCol = p.color(60, 180, 100);
      statusTxt = 'SUBCRITICAL';
    }} else if (K_FACTOR < 1.001) {{
      statusCol = p.color(255, 210, 50);
      statusTxt = 'CRITICAL';
    }} else {{
      statusCol = p.color(220, 60, 50);
      statusTxt = 'SUPERCRITICAL';
    }}
    p.fill(0, 0, 0, 160);
    p.rect(p.width - 120, 4, 114, 22, 4);
    p.fill(statusCol);
    p.textSize(10);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(statusTxt, p.width - 63, 15);
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

    fuel = st.radio(
        "Fuel type",
        ["U-235", "Pu-239"],
        index=0,
        help="U-235: standard reactor/bomb fuel.  Pu-239: produced in fast-breeder reactors.",
    )

    k = st.slider(
        "Multiplication factor k",
        min_value=0.5,
        max_value=2.0,
        value=1.0,
        step=0.1,
        help=(
            "Average number of neutrons from each fission that trigger another fission.  "
            "k < 1 → subcritical  |  k = 1 → critical (reactor)  |  k > 1 → supercritical"
        ),
    )

    initial_n = st.slider(
        "Initial neutrons",
        min_value=1,
        max_value=5,
        value=1,
        step=1,
        help="Number of neutrons in the first generation.",
    )

    control_rods = st.toggle(
        "Show control rods",
        value=False,
        help="Control rods absorb neutrons to reduce effective k and maintain criticality.",
    )

    if mode == "Advanced":
        advanced_divider()
        n_gens_table = st.slider(
            "Generations in table",
            min_value=3,
            max_value=10,
            value=6,
            step=1,
        )
    else:
        n_gens_table = 6

# ── Derived quantities ────────────────────────────────────────────────────────

E_MeV = E_MEV_U235 if fuel == "U-235" else E_MEV_PU239
E_J   = E_MeV * MEV_TO_J

# Mass defect for display (U-235 only; Pu-239 shown as approximate)
delta_m_display = DELTA_M_U235 if fuel == "U-235" else (E_MEV_PU239 / 931.5)

# Status
if k < 1.0:
    status_text  = "SUBCRITICAL — reaction will die out"
    status_color = "#2ecc71"
elif k == 1.0:
    status_text  = "CRITICAL — sustained chain reaction"
    status_color = "#f1c40f"
else:
    status_text  = "SUPERCRITICAL — exponential growth"
    status_color = "#e74c3c"

# ── Page header ───────────────────────────────────────────────────────────────

sim_header("Nuclear Fission", SPEC_REF)

# ── Main layout ───────────────────────────────────────────────────────────────

left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

# ── LEFT COLUMN ───────────────────────────────────────────────────────────────

with left_col:
    physics_notes(
        spec_ref=SPEC_REF,
        equations=[
            r"^{235}_{92}\text{U} + n \rightarrow ^{141}_{56}\text{Ba} + ^{92}_{36}\text{Kr} + 3n",
            r"\Delta m = m_{\text{reactants}} - m_{\text{products}}",
            r"E = \Delta m \cdot c^2 = \Delta m \,(\text{u}) \times 931.5 \text{ MeV}",
            r"\frac{B}{A} = \frac{a_v A - a_s A^{2/3} - a_c \frac{Z^2}{A^{1/3}} - a_a \frac{(A-2Z)^2}{A}}{A}",
        ],
        explanation=(
            "When a heavy nucleus such as U-235 absorbs a slow (thermal) neutron it "
            "becomes unstable and splits into two lighter daughter nuclei plus typically "
            "2–3 neutrons and ~200 MeV of energy.  The energy arises because the binding "
            "energy per nucleon B/A is larger for medium-mass nuclei than for heavy ones: "
            "the products are more tightly bound, so mass is converted to energy via E = Δmc².  "
            "The released neutrons can trigger further fissions — a chain reaction. "
            "The multiplication factor k determines whether the chain reaction dies out "
            "(k < 1), is sustained at a constant rate (k = 1, reactor), or grows explosively "
            "(k > 1, bomb)."
        ),
        advanced_text=(
            "The binding energy per nucleon peaks at Fe-56 (~8.8 MeV/nucleon) — both fission "
            "of heavy nuclei and fusion of light nuclei release energy by moving toward this peak.  "
            "The Semi-Empirical Mass Formula (Bethe-Weizsäcker) decomposes B into volume, surface, "
            "Coulomb, and asymmetry terms.  Reactor control requires maintaining k exactly at 1.0 "
            "using control rods (cadmium or boron) that absorb excess neutrons.  Delayed neutrons "
            "(from fission product decay, ~0.65% of total) allow sufficient response time for "
            "mechanical control rod adjustment."
        ),
        mode=mode,
    )

    st.divider()

    if fuel == "U-235":
        metric_row({
            "Δm": f"{DELTA_M_U235:.6f} u",
            "E / fission": f"{E_MEV_U235:.1f} MeV",
        })
        metric_row({
            "E (joules)": f"{E_J:.3e} J",
            "k factor": f"{k:.1f}",
        })
    else:
        metric_row({
            "Δm (approx)": f"{delta_m_display:.6f} u",
            "E / fission": f"{E_MeV:.0f} MeV",
        })
        metric_row({
            "E (joules)": f"{E_J:.3e} J",
            "k factor": f"{k:.1f}",
        })

    st.markdown(
        f"<div style='background:rgba(0,0,0,0.35);border-left:4px solid {status_color};"
        f"padding:6px 10px;border-radius:4px;margin-top:6px;font-size:0.88rem;"
        f"color:{status_color};font-weight:600'>{status_text}</div>",
        unsafe_allow_html=True,
    )

    if mode == "Advanced":
        st.divider()
        st.markdown("**Neutron generations table**")
        gen_rows = []
        N = float(initial_n)
        for g in range(n_gens_table + 1):
            gen_rows.append({
                "Generation": g,
                "Neutrons (exact)": f"{N:.2f}",
                "Neutrons (rounded)": max(0, round(N)),
            })
            N *= k
        st.dataframe(gen_rows, use_container_width=True, hide_index=True)


# ── RIGHT COLUMN ──────────────────────────────────────────────────────────────

with right_col:
    # ── 1. p5.js fission chain-reaction animation ─────────────────────────────
    anim_html = build_fission_animation(k, initial_n, fuel, control_rods)
    components.html(anim_html, height=440, scrolling=False)

    # ── 2. Binding energy per nucleon curve ───────────────────────────────────
    st.markdown("##### Binding energy per nucleon")
    be_fig = build_binding_energy_plot(fuel)
    st.plotly_chart(be_fig, use_container_width=True)

    # ── 3. Advanced: neutron population vs generation ─────────────────────────
    if mode == "Advanced":
        st.markdown("##### Neutron population vs generation")
        pop_fig = build_neutron_population_plot(k)
        st.plotly_chart(pop_fig, use_container_width=True)


# ── Exam practice questions ───────────────────────────────────────────────────

from utils.exam_ui import show_exam_panel  # noqa: E402  (import after layout for clarity)

questions = [
    {
        "q": (
            f"The fission of one {fuel} nucleus releases approximately {E_MeV:.0f} MeV "
            "of energy. Convert this to joules."
        ),
        "marks": 2,
        "answer": f"{E_J:.3e} J",
        "working": [
            f"1 MeV = 1.60 × 10⁻¹³ J",
            f"E = {E_MeV:.0f} MeV × 1.60 × 10⁻¹³ J/MeV = {E_J:.3e} J",
        ],
        "hint": "1 MeV = 1.60 × 10⁻¹³ J",
    },
    {
        "q": (
            f"With a multiplication factor k = {k:.1f}, starting with {initial_n} "
            f"neutron(s), how many neutrons are there after 4 generations?"
        ),
        "marks": 2,
        "answer": (
            f"{initial_n * k**4:.1f} neutrons "
            f"(≈ {round(initial_n * k**4)})"
        ),
        "working": [
            f"N(gen) = N₀ × k^gen",
            f"N(4) = {initial_n} × {k:.1f}⁴ = {initial_n} × {k**4:.3f} = {initial_n * k**4:.1f}",
        ],
        "hint": "Use the neutron multiplication formula N = N₀ × kⁿ",
    },
    {
        "q": (
            "Explain why a larger mass of fissile material is required for a nuclear "
            "weapon than for a reactor."
        ),
        "marks": 3,
        "answer": (
            "3 marks: (1) A weapon needs k > 1 (supercritical), a reactor needs k = 1 "
            "(critical). (2) In a larger mass fewer neutrons escape from the surface "
            "(surface area ∝ r², volume ∝ r³), so more neutrons cause fission. "
            "(3) A reactor uses control rods to absorb excess neutrons and maintain k = 1."
        ),
        "working": [],
        "hint": "Think about the fate of neutrons: absorbed, escape, or cause fission.",
    },
]

show_exam_panel(questions)
