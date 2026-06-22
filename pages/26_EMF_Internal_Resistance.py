"""
EMF & Internal Resistance — WJEC Eduqas A Level Physics.

Models a single cell of EMF ε and internal resistance r driving a load
resistance R.  Shows the current, terminal p.d., lost volts and the
energy split between useful load power and power wasted inside the cell.
Advanced mode adds efficiency, the power-in-battery breakdown and the
maximum-power-transfer analysis.

Spec reference: Component 2, Topic 2 (DC Circuits).
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components
from plotly.subplots import make_subplots

from utils import physics  # noqa: F401 — constants available if needed
from utils.exam_ui import show_exam_panel
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
    page_title="EMF & Internal Resistance — WJEC Physics",
    page_icon="🔋",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 2 (DC Circuits)"
EPS = 1e-9  # guard against division by zero


# ── Physics computations ──────────────────────────────────────────────────────


@st.cache_data
def compute_circuit(emf: float, r: float, R: float) -> dict:
    """
    Compute the core circuit quantities for a cell driving a load.

    Parameters
    ----------
    emf : EMF of the cell (V)
    r   : internal resistance (Ω)
    R   : load resistance (Ω)

    Returns
    -------
    dict with current I, terminal p.d. V, lost volts Ir, load power P_R,
    battery power P_r, total power P_total and efficiency η (fraction).
    """
    denom = max(R + r, EPS)
    I = emf / denom
    V_term = emf - I * r
    lost_volts = I * r
    P_load = I ** 2 * R
    P_batt = I ** 2 * r
    P_total = emf * I
    eta = R / denom  # = V/ε
    return dict(
        I=I,
        V_term=V_term,
        lost_volts=lost_volts,
        P_load=P_load,
        P_batt=P_batt,
        P_total=P_total,
        eta=eta,
    )


@st.cache_data
def compute_v_i_sweep(emf: float, r: float) -> tuple[np.ndarray, np.ndarray]:
    """
    Sweep the load from open circuit (I→0) to short circuit (I→ε/r).

    Returns the current array and the terminal p.d. array V = ε − Ir.
    """
    I_max = emf / max(r, EPS)
    I = np.linspace(0.0, I_max, 200)
    V = emf - I * r
    return I, V


@st.cache_data
def compute_power_sweep(
    emf: float, r: float, R_max: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Sweep the load resistance R and return P_R(R) and efficiency η(R).

    Returns
    -------
    R_arr : load resistance array (Ω)
    P_R   : power delivered to the load (W)
    eta   : efficiency fraction R/(R+r)
    """
    R_arr = np.linspace(EPS, R_max, 400)
    denom = R_arr + r
    P_R = emf ** 2 * R_arr / denom ** 2
    eta = R_arr / denom
    return R_arr, P_R, eta


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_vi_figure(emf: float, r: float, op: dict) -> go.Figure:
    """Terminal p.d. V vs current I — the classic straight-line graph."""
    I, V = compute_v_i_sweep(emf, r)
    fig = make_fig(rows=1, cols=1)
    fig.add_trace(
        go.Scatter(
            x=I, y=V,
            mode="lines",
            line=dict(color=COLOURS["primary"], width=3),
            name="V = ε − Ir",
        )
    )
    # Operating point
    fig.add_trace(
        go.Scatter(
            x=[op["I"]], y=[op["V_term"]],
            mode="markers",
            marker=dict(color=COLOURS["highlight"], size=14,
                        line=dict(color="white", width=1)),
            name="Operating point",
        )
    )
    # y-intercept annotation (= EMF)
    fig.add_annotation(
        x=0.0, y=emf,
        text=f"ε = {emf:.1f} V",
        showarrow=True, arrowhead=2, ax=50, ay=-10,
        font=dict(size=12, color=COLOURS["secondary"]),
        bgcolor="rgba(0,0,0,0.5)",
    )
    # gradient annotation
    I_max = emf / max(r, EPS)
    fig.add_annotation(
        x=I_max * 0.55, y=emf * 0.55,
        text=f"gradient = −r = −{r:.2f} Ω",
        showarrow=False,
        font=dict(size=11, color=COLOURS["tertiary"]),
        bgcolor="rgba(0,0,0,0.5)",
    )
    fig.update_layout(
        **plotly_layout(
            height=340,
            xaxis=dict(title="Current I (A)", gridcolor=COLOURS["grid"]),
            yaxis=dict(title="Terminal p.d. V (V)", gridcolor=COLOURS["grid"],
                       rangemode="tozero"),
            showlegend=False,
            title="Terminal p.d. vs Current  (V = ε − Ir)",
        )
    )
    return fig


def build_power_figure(
    emf: float, r: float, R: float, op: dict, show_eta: bool
) -> go.Figure:
    """Power to load P_R vs load resistance R, with the maximum at R = r."""
    R_max = max(10.0 * r, 4.0 * R, 20.0)
    R_arr, P_R, eta = compute_power_sweep(emf, r, R_max)
    P_max = emf ** 2 / (4.0 * max(r, EPS))

    fig = make_fig(rows=1, cols=1)
    fig.add_trace(
        go.Scatter(
            x=R_arr, y=P_R,
            mode="lines",
            line=dict(color=COLOURS["primary"], width=3),
            name="P_R",
        )
    )
    # Maximum power point (R = r)
    fig.add_vline(
        x=r, line_dash="dash", line_color=COLOURS["highlight"],
        line_width=1.5, opacity=0.7,
    )
    fig.add_trace(
        go.Scatter(
            x=[r], y=[P_max],
            mode="markers",
            marker=dict(color=COLOURS["highlight"], size=13, symbol="diamond"),
            name=f"P_max @ R=r",
        )
    )
    fig.add_annotation(
        x=r, y=P_max,
        text=f"R = r → P_max = {P_max:.3f} W",
        showarrow=True, arrowhead=2, ax=60, ay=-25,
        font=dict(size=11, color=COLOURS["highlight"]),
        bgcolor="rgba(0,0,0,0.5)",
    )
    # Current operating point
    fig.add_trace(
        go.Scatter(
            x=[R], y=[op["P_load"]],
            mode="markers",
            marker=dict(color=COLOURS["secondary"], size=13,
                        line=dict(color="white", width=1)),
            name="Operating point",
        )
    )

    layout_kwargs = dict(
        height=360,
        xaxis=dict(title="Load resistance R (Ω)", gridcolor=COLOURS["grid"]),
        yaxis=dict(title="Power to load P_R (W)", gridcolor=COLOURS["grid"],
                   rangemode="tozero"),
        showlegend=True,
        title="Power transfer to the load  (peaks at R = r)",
    )

    if show_eta:
        # Secondary axis: efficiency η vs R (rises monotonically toward 100%)
        fig.add_trace(
            go.Scatter(
                x=R_arr, y=eta * 100.0,
                mode="lines",
                line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
                name="Efficiency η (%)",
                yaxis="y2",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=[R], y=[op["eta"] * 100.0],
                mode="markers",
                marker=dict(color=COLOURS["advanced"], size=11, symbol="circle"),
                name="η operating point",
                yaxis="y2",
            )
        )
        layout_kwargs["yaxis2"] = dict(
            title="Efficiency η (%)",
            overlaying="y",
            side="right",
            range=[0, 105],
            gridcolor="rgba(0,0,0,0)",
            color=COLOURS["advanced"],
        )

    fig.update_layout(**plotly_layout(**layout_kwargs))
    return fig


# ── Sidebar controls ──────────────────────────────────────────────────────────


def render_sidebar() -> dict:
    """Render all sidebar controls and return a dict of resolved parameters."""
    sim_header("🔋 EMF & Internal Resistance", SPEC_REF)

    mode = mode_toggle()

    st.divider()
    st.markdown("### Circuit parameters")

    emf = st.slider(
        "EMF ε (V)",
        min_value=1.0, max_value=12.0, value=6.0, step=0.1,
        help="The electromotive force of the cell — energy per unit charge "
             "supplied by the cell.",
    )
    r = st.slider(
        "Internal resistance r (Ω)",
        min_value=0.1, max_value=10.0, value=1.0, step=0.1,
        help="Resistance inside the cell. Causes 'lost volts' Ir.",
    )
    R = st.slider(
        "Load resistance R (Ω)",
        min_value=0.1, max_value=50.0, value=5.0, step=0.1,
        help="External load. Drag low (toward short circuit) to see the "
             "current rise and the battery heat up.",
    )

    show_max_power = False
    if mode == "Advanced":
        advanced_divider()
        show_max_power = st.checkbox(
            "Show max power point",
            value=True,
            help="Overlay the maximum-power-transfer point (R = r) and the "
                 "efficiency curve on the power graph.",
        )

    return dict(
        mode=mode,
        emf=float(emf),
        r=float(r),
        R=float(R),
        show_max_power=show_max_power,
    )


# ── p5.js Animation ───────────────────────────────────────────────────────────


def build_circuit_animation(emf, r, R):
    """
    Build a complete p5.js EMF / internal-resistance circuit animation.

    Parameters
    ----------
    emf : EMF of the cell (V)
    r   : internal resistance (Ω)
    R   : load resistance (Ω)

    Returns
    -------
    str : full HTML document embedding the p5.js sketch
    """
    denom = max(R + r, EPS)
    I = emf / denom
    V_term = emf - I * r
    lost = I * r
    P_load = I ** 2 * R
    P_batt = I ** 2 * r
    I_short = emf / max(r, EPS)  # short-circuit current reference

    data = json.dumps({
        "emf": float(emf),
        "r": float(r),
        "R": float(R),
        "I": float(I),
        "Vterm": float(V_term),
        "lost": float(lost),
        "Pload": float(P_load),
        "Pbatt": float(P_batt),
        "Ishort": float(I_short),
    })

    return f"""<!DOCTYPE html>
<html>
<head>
<style>
body{{margin:0;background:#0e1117;overflow:hidden;font-family:monospace}}
canvas{{display:block}}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const D = {data};

new p5(function(p) {{
  const W = 700, H = 420;

  // Circuit loop bounding box
  const CX = 70, CY = 70, CW = 330, CH = 230;
  const TL = {{x: CX,      y: CY}};
  const TR = {{x: CX+CW,   y: CY}};
  const BL = {{x: CX,      y: CY+CH}};
  const BR = {{x: CX+CW,   y: CY+CH}};

  const BAT_X = CX,        BAT_Y = CY + CH/2;   // battery (left)
  const RES_X = CX + CW/2, RES_Y = CY;           // load resistor (top)
  // Meter panel (right)
  const MX = 440, MY = 40, MW = 240, MH = 350;

  // physics
  const I      = D.I;
  const Imax   = Math.max(D.Ishort, 1e-9);
  const strength = Math.min(I / Imax, 1.0);   // 0..1 current fraction
  const SPEED_OPTIONS = [1, 2, 4];

  let paused   = false;
  let speedIdx = 0;
  let phase    = 0;        // packet animation phase

  const N_PACKETS = 14;
  let packets = [];

  let btnPlay, btnSpeed;

  function perimeterPos(frac) {{
    // Path: BL -> TL (up left) -> TR (top) -> BR (down right) -> BL (bottom)
    const perim = 2 * (CW + CH);
    let d = ((frac % 1) + 1) % 1 * perim;
    if (d < CH) return {{x: BL.x, y: BL.y - d}};
    d -= CH;
    if (d < CW) return {{x: TL.x + d, y: TL.y}};
    d -= CW;
    if (d < CH) return {{x: TR.x, y: TR.y + d}};
    d -= CH;
    return {{x: BR.x - d, y: BR.y}};
  }}

  function initPackets() {{
    packets = [];
    for (let i = 0; i < N_PACKETS; i++) {{
      packets.push({{frac: i / N_PACKETS}});
    }}
  }}

  p.setup = function() {{
    let cnv = p.createCanvas(p.windowWidth || W, 420);
    cnv.parent(document.body);
    p.textFont('monospace');
    initPackets();

    btnPlay = p.createButton('⏸ Pause');
    btnPlay.position(W - 170, 8);
    styleBtn(btnPlay, '#1f77b4');
    btnPlay.mousePressed(function() {{
      paused = !paused;
      btnPlay.html(paused ? '▶ Play' : '⏸ Pause');
    }});

    btnSpeed = p.createButton('1x');
    btnSpeed.position(W - 65, 8);
    styleBtn(btnSpeed, '#ff7f0e');
    btnSpeed.mousePressed(function() {{
      speedIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
      btnSpeed.html(SPEED_OPTIONS[speedIdx] + 'x');
    }});
  }};

  function styleBtn(b, col) {{
    b.style('background', col);
    b.style('color', '#fff');
    b.style('border', 'none');
    b.style('border-radius', '4px');
    b.style('padding', '4px 10px');
    b.style('cursor', 'pointer');
    b.style('font-size', '12px');
  }}

  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || W, 420);
  }};

  p.draw = function() {{
    p.background('#0e1117');
    let speed = SPEED_OPTIONS[speedIdx];

    // packet speed proportional to current fraction
    if (!paused) {{
      let pSpeed = (0.0008 + 0.012 * strength) * speed;
      phase += pSpeed;
      for (let pk of packets) {{
        pk.frac = ((pk.frac + pSpeed) % 1 + 1) % 1;
      }}
    }}

    let nearShort = strength > 0.7;  // near short circuit

    drawWires();
    drawBattery(BAT_X, BAT_Y, nearShort);
    drawLoadResistor(RES_X, RES_Y);
    drawTerminals();
    drawPackets();
    drawVoltmeter();
    drawMeter(MX, MY, MW, MH);
    drawLabels();
    if (nearShort) drawShortWarning();
  }};

  function drawWires() {{
    p.stroke(80, 80, 100);
    p.strokeWeight(2);
    p.noFill();
    // left wire from battery terminals to corners
    p.line(BL.x, BL.y, BL.x, BAT_Y + 45);
    p.line(BL.x, BAT_Y - 45, TL.x, TL.y);
    // top: TL -> resistor -> TR
    p.line(TL.x, TL.y, RES_X - 35, RES_Y);
    p.line(RES_X + 35, RES_Y, TR.x, TR.y);
    // right wire
    p.line(TR.x, TR.y, BR.x, BR.y);
    // bottom wire
    p.line(BR.x, BR.y, BL.x, BL.y);
  }}

  function drawBattery(x, y, hot) {{
    // Dashed box around the internal battery model (cell + internal resistor r)
    p.push();
    p.drawingContext.setLineDash([5, 4]);
    p.stroke(hot ? p.color(231, 76, 60) : p.color(120, 120, 150));
    p.strokeWeight(hot ? 2.5 : 1.5);
    p.noFill();
    if (hot) {{
      let glow = 60 + 60 * Math.sin(p.frameCount * 0.25);
      p.fill(231, 76, 60, glow * 0.4);
    }}
    p.rect(x - 34, y - 60, 68, 120, 6);
    p.drawingContext.setLineDash([]);
    p.pop();

    // Ideal cell (top portion): EMF source ε
    p.stroke(200, 200, 220);
    p.strokeWeight(3);
    p.line(x - 14, y - 40, x + 14, y - 40);   // long plate (+)
    p.strokeWeight(3);
    p.line(x - 7,  y - 30, x + 7,  y - 30);    // short plate (−)
    p.noStroke();
    p.fill(100, 200, 120);
    p.textSize(11);
    p.textAlign(p.CENTER);
    p.text('+', x + 24, y - 38);
    p.fill(220, 100, 100);
    p.text('−', x + 24, y - 26);
    p.fill(160, 220, 170);
    p.textSize(10);
    p.textAlign(p.LEFT);
    p.text('ε = ' + D.emf.toFixed(1) + ' V', x - 30, y - 48);

    // Internal resistor r (bottom portion of box) — small zigzag
    let ry = y + 25;
    p.stroke(hot ? p.color(255, 120, 90) : p.color(255, 165, 50));
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    let sx = x - 22, segs = 6, segW = 44 / segs;
    p.vertex(sx, ry);
    for (let i = 0; i < segs; i++) {{
      let nx = sx + (i + 0.5) * segW;
      let ny = (i % 2 === 0) ? ry - 7 : ry + 7;
      p.vertex(nx, ny);
    }}
    p.vertex(x + 22, ry);
    p.endShape();
    // connect cell to internal resistor and to terminals
    p.stroke(80, 80, 100);
    p.strokeWeight(2);
    p.line(x, y - 30, x, ry - 7);             // short plate down to resistor
    p.line(x, y - 40, x, y - 45);             // top plate up to terminal wire
    p.line(x, ry + 7, x, y + 45);             // resistor down to terminal wire

    // lost volts label on internal resistance
    p.noStroke();
    p.fill(255, 165, 50);
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('r = ' + D.r.toFixed(2) + ' Ω', x + 26, ry - 2);
    p.fill(231, 150, 90);
    p.text('Ir = ' + D.lost.toFixed(2) + ' V', x + 26, ry + 12);
  }}

  function drawLoadResistor(x, y) {{
    p.stroke(46, 204, 113);
    p.strokeWeight(2.5);
    p.noFill();
    p.beginShape();
    let sx = x - 35, segs = 7, segW = 70 / segs;
    p.vertex(sx, y);
    for (let i = 0; i < segs; i++) {{
      let nx = sx + (i + 0.5) * segW;
      let ny = (i % 2 === 0) ? y - 11 : y + 11;
      p.vertex(nx, ny);
    }}
    p.vertex(x + 35, y);
    p.endShape();
    p.noStroke();
    p.fill(46, 204, 113);
    p.textSize(11);
    p.textAlign(p.CENTER);
    p.text('Load R = ' + D.R.toFixed(1) + ' Ω', x, y - 22);
  }}

  function drawTerminals() {{
    // Terminal nodes near the battery box top-left and bottom-left
    p.noStroke();
    p.fill(180, 200, 230);
    p.ellipse(BAT_X, BAT_Y - 45, 7, 7);
    p.ellipse(BAT_X, BAT_Y + 45, 7, 7);
    p.fill(120, 160, 220);
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('terminal p.d. V = ' + D.Vterm.toFixed(2) + ' V',
           BAT_X + 44, BAT_Y - 2);
  }}

  function drawPackets() {{
    if (strength < 0.005) {{
      // essentially no current (open circuit-ish)
      return;
    }}
    let a = 120 + 135 * strength;
    let sz = 6 + 4 * strength;
    for (let pk of packets) {{
      let pos = perimeterPos(pk.frac);
      // skip inside battery box
      if (Math.abs(pos.x - BAT_X) < 38 && Math.abs(pos.y - BAT_Y) < 64) continue;
      p.noStroke();
      p.fill(255, 200, 60, a);
      p.ellipse(pos.x, pos.y, sz, sz);
      p.fill(255, 200, 60, a * 0.3);
      p.ellipse(pos.x, pos.y, sz * 2, sz * 2);
    }}
  }}

  function drawVoltmeter() {{
    // Analogue voltmeter across the terminals (dial + needle)
    let vx = BAT_X + 150, vy = BAT_Y + 70, rad = 34;
    p.stroke(60, 80, 120);
    p.strokeWeight(2);
    p.fill(18, 22, 35);
    p.ellipse(vx, vy, rad * 2, rad * 2);
    // scale arc
    p.noFill();
    p.stroke(70, 90, 130);
    p.strokeWeight(1);
    p.arc(vx, vy, rad * 1.6, rad * 1.6, p.PI + 0.4, p.TWO_PI - 0.4);
    // needle: 0 -> ε maps to angle
    let frac = Math.min(D.Vterm / Math.max(D.emf, 1e-9), 1.0);
    let a0 = p.PI + 0.4, a1 = p.TWO_PI - 0.4;
    let ang = a0 + frac * (a1 - a0);
    p.stroke(231, 76, 60);
    p.strokeWeight(2);
    p.line(vx, vy, vx + Math.cos(ang) * (rad - 8), vy + Math.sin(ang) * (rad - 8));
    p.noStroke();
    p.fill(231, 76, 60);
    p.ellipse(vx, vy, 5, 5);
    // V symbol + readout
    p.fill(180, 200, 230);
    p.textSize(11);
    p.textAlign(p.CENTER);
    p.text('V', vx, vy - 10);
    p.fill(100, 200, 255);
    p.textSize(11);
    p.text(D.Vterm.toFixed(2) + ' V', vx, vy + rad + 14);
    // connecting leads to terminals
    p.stroke(90, 90, 120);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([3, 3]);
    p.line(BAT_X, BAT_Y - 45, vx - rad, vy - 10);
    p.line(BAT_X, BAT_Y + 45, vx - rad, vy + 10);
    p.drawingContext.setLineDash([]);
  }}

  function drawMeter(mx, my, mw, mh) {{
    p.noStroke();
    p.fill(20, 25, 40);
    p.rect(mx, my, mw, mh, 8);
    p.stroke(50, 70, 110);
    p.strokeWeight(1);
    p.noFill();
    p.rect(mx, my, mw, mh, 8);

    p.noStroke();
    p.fill(180, 200, 230);
    p.textSize(11);
    p.textAlign(p.LEFT);
    p.text('CIRCUIT READOUT', mx + 12, my + 20);

    // Current (big)
    p.fill(255, 200, 60);
    p.textSize(22);
    p.textAlign(p.CENTER);
    p.text('I = ' + D.I.toFixed(3) + ' A', mx + mw / 2, my + 48);

    // values
    p.textAlign(p.LEFT);
    p.textSize(11);
    let ty = my + 78;
    p.fill(100, 200, 255);
    p.text('Terminal p.d.  V = ' + D.Vterm.toFixed(2) + ' V', mx + 12, ty);
    p.fill(231, 150, 90);
    p.text('Lost volts  Ir = ' + D.lost.toFixed(2) + ' V', mx + 12, ty + 18);
    p.fill(180, 190, 210);
    p.text('ε = V + Ir = ' + D.emf.toFixed(2) + ' V', mx + 12, ty + 36);

    // Energy split bars
    let pTot = Math.max(D.Pload + D.Pbatt, 1e-9);
    let barX = mx + 12, barW = mw - 24;
    let by = ty + 64;
    p.fill(170, 190, 210);
    p.textSize(10);
    p.text('Energy split (power):', barX, by);

    // Load (useful)
    let loadFrac = D.Pload / pTot;
    by += 14;
    p.fill(30, 40, 60);
    p.rect(barX, by, barW, 16, 3);
    p.fill(46, 204, 113);
    p.rect(barX, by, barW * loadFrac, 16, 3);
    p.fill(220, 240, 225);
    p.textSize(9);
    p.text('Load (useful)  ' + D.Pload.toFixed(2) + ' W',
           barX + 4, by + 12);

    // Battery (wasted)
    let battFrac = D.Pbatt / pTot;
    by += 24;
    p.fill(30, 40, 60);
    p.rect(barX, by, barW, 16, 3);
    p.fill(231, 76, 60);
    p.rect(barX, by, barW * battFrac, 16, 3);
    p.fill(245, 220, 220);
    p.textSize(9);
    p.text('Battery (wasted)  ' + D.Pbatt.toFixed(2) + ' W',
           barX + 4, by + 12);

    // efficiency
    by += 30;
    let eta = (D.Pload / pTot) * 100;
    p.fill(155, 89, 182);
    p.textSize(11);
    p.text('Efficiency η = ' + eta.toFixed(1) + ' %', barX, by);

    // power formulae
    by += 22;
    p.fill(130, 150, 180);
    p.textSize(9);
    p.text('P_R = I²R   P_r = I²r', barX, by);
    p.text('P_total = εI = ' + (D.emf * D.I).toFixed(2) + ' W', barX, by + 13);
  }}

  function drawShortWarning() {{
    let pulse = 150 + 80 * Math.sin(p.frameCount * 0.3);
    p.noStroke();
    p.fill(231, 76, 60, pulse);
    p.textSize(13);
    p.textAlign(p.CENTER);
    p.text('⚠ high current — battery heating!', (CX + CW / 2), CY + CH + 30);
  }}

  function drawLabels() {{
    p.noStroke();
    p.textAlign(p.CENTER);
    p.fill(160, 200, 170);
    p.textSize(10);
    p.text('cell + internal r', BAT_X, BAT_Y + 78);
    p.fill(200, 210, 230);
    p.textSize(13);
    p.text('EMF & Internal Resistance', CX + CW / 2, H - 10);
  }}

}});
</script>
</body>
</html>"""


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full simulation page."""
    left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

    with left_col:
        params = render_sidebar()

    mode = params["mode"]
    emf = params["emf"]
    r = params["r"]
    R = params["R"]
    show_max_power = params["show_max_power"]

    op = compute_circuit(emf, r, R)

    with left_col:
        st.divider()

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\varepsilon = I(R + r)",
                r"V = \varepsilon - Ir",
                r"P_R = I^2 R",
                r"\eta = \frac{R}{R + r} = \frac{V}{\varepsilon}",
            ],
            explanation=(
                "A real cell has an internal resistance r. As current flows, "
                "some EMF is 'lost' inside the cell as the p.d. Ir, so the "
                "terminal p.d. delivered to the load is V = ε − Ir. The lower "
                "the load R, the larger the current and the larger the lost volts."
            ),
            advanced_text=(
                "**Maximum power transfer:** differentiating "
                "P_R = ε²R/(R+r)² and setting dP_R/dR = 0 gives R = r, the "
                "load that extracts the most power: P_max = ε²/(4r). At this "
                "point efficiency is only 50% — half the power is wasted "
                "inside the cell. High efficiency (η → 100%) requires R ≫ r, "
                "but then the absolute power delivered is small. This is the "
                "fundamental power-vs-efficiency trade-off.\n\n"
                "**Measuring ε and r:** plotting terminal p.d. V against "
                "current I gives a straight line V = ε − Ir: the y-intercept "
                "is the EMF ε and the gradient is −r."
            ),
            mode=mode,
        )

        # ── Key metrics ───────────────────────────────────────────────────────
        metric_row({
            "Current I": f"{op['I']:.3f} A",
            "Terminal p.d. V": f"{op['V_term']:.3f} V",
            "Lost volts Ir": f"{op['lost_volts']:.3f} V",
            "Power to load P_R": f"{op['P_load']:.3f} W",
        })

        if mode == "Advanced":
            metric_row({
                "Efficiency η": f"{op['eta'] * 100:.1f} %",
                "Power in battery P_r": f"{op['P_batt']:.3f} W",
                "Total power εI": f"{op['P_total']:.3f} W",
            })

        # ── Status note: maximum power transfer ───────────────────────────────
        if abs(R - r) <= 0.15:
            st.success(
                f"⚡ **Maximum power transfer!** R ≈ r = {r:.2f} Ω — the load "
                f"draws the most power possible, P_max = ε²/(4r) = "
                f"{emf ** 2 / (4 * max(r, EPS)):.3f} W. Efficiency here is only 50%.",
                icon="⚡",
            )
        elif R < r:
            st.warning(
                f"Load R = {R:.1f} Ω is below the internal resistance "
                f"r = {r:.2f} Ω — large current, lots of power wasted in the cell "
                f"(efficiency η = {op['eta'] * 100:.0f}%).",
                icon="⚠️",
            )
        else:
            st.info(
                f"Load R = {R:.1f} Ω > r = {r:.2f} Ω — efficient delivery "
                f"(η = {op['eta'] * 100:.0f}%), but below the maximum possible power.",
                icon="ℹ️",
            )

    with right_col:
        # ── p5.js circuit animation ───────────────────────────────────────────
        components.html(
            build_circuit_animation(emf, r, R),
            height=440,
        )
        st.caption(
            "▶ Play/pause · ⚡ speed (top-right). Charge dots flow faster when "
            "the current is larger. Drag R low to short the cell."
        )
        st.divider()

        # ── Terminal p.d. vs current graph ────────────────────────────────────
        fig_vi = build_vi_figure(emf, r, op)
        st.plotly_chart(fig_vi, use_container_width=True)

        # ── Power vs load resistance graph ────────────────────────────────────
        fig_power = build_power_figure(
            emf, r, R, op, show_eta=(mode == "Advanced" and show_max_power)
        )
        st.plotly_chart(fig_power, use_container_width=True)

        if mode == "Advanced" and show_max_power:
            st.info(
                "The dotted purple curve (right axis) is efficiency η = R/(R+r). "
                "Notice it keeps rising toward 100% as R increases, while the "
                "power to the load (blue) peaks at R = r and then falls — "
                "you cannot have maximum power and maximum efficiency at once.",
                icon="⚖️",
            )

        # ── Exam practice questions ───────────────────────────────────────────
        I = emf / (R + r)
        V_term = emf - I * r
        P_load = I ** 2 * R
        questions = [
            {
                "q": (
                    f"A cell of EMF {emf:.1f} V has internal resistance "
                    f"r = {r:.2f} Ω connected to a load R = {R:.1f} Ω. "
                    "Calculate the current in the circuit."
                ),
                "marks": 2,
                "answer": f"I = {I:.3f} A",
                "working": [
                    f"I = ε/(R+r) = {emf:.1f}/({R:.1f}+{r:.2f}) = {I:.3f} A"
                ],
            },
            {
                "q": "Calculate the terminal potential difference across the cell.",
                "marks": 2,
                "answer": f"V = {V_term:.3f} V",
                "working": [
                    f"V = ε − Ir = {emf:.1f} − {I:.3f}×{r:.2f} = {V_term:.3f} V"
                ],
            },
            {
                "q": "Calculate the power dissipated in the load resistor.",
                "marks": 2,
                "answer": f"P = {P_load:.3f} W",
                "working": [
                    f"P = I²R = {I:.3f}²×{R:.1f} = {P_load:.3f} W"
                ],
            },
            {
                "q": (
                    "State the condition on R for maximum power transfer to the "
                    "load, and calculate that maximum power."
                ),
                "marks": 3,
                "answer": (
                    f"R = r = {r:.2f} Ω gives "
                    f"P_max = ε²/(4r) = {emf ** 2 / (4 * r):.3f} W"
                ),
                "working": [
                    "Max power when R = r",
                    f"P_max = ε²/(4r) = {emf:.1f}²/(4×{r:.2f}) = "
                    f"{emf ** 2 / (4 * r):.3f} W",
                ],
                "hint": "Differentiate P_R = ε²R/(R+r)² with respect to R",
            },
        ]
        show_exam_panel(questions)


# ── Run ───────────────────────────────────────────────────────────────────────

main()
