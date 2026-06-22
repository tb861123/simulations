"""
I-V Characteristics & Resistivity — WJEC Eduqas A Level Physics.

Explores the current-voltage characteristics of common circuit components
(ohmic resistor, filament lamp, semiconductor diode, NTC thermistor) and a
resistivity calculator using R = ρL/A.

Spec reference: Component 2, Topic 1 (Conduction and Resistance)
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

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
    page_title="I-V Characteristics — WJEC Physics",
    page_icon="⚡",
    layout="wide",
)

SPEC_REF = "Component 2, Topic 1 (Conduction and Resistance)"

# ── Component catalogue ───────────────────────────────────────────────────────

COMPONENTS = ["Ohmic resistor", "Filament lamp", "Diode", "Thermistor (NTC)"]

COMPONENT_COLOUR = {
    "Ohmic resistor": COLOURS["primary"],
    "Filament lamp": COLOURS["secondary"],
    "Diode": COLOURS["tertiary"],
    "Thermistor (NTC)": COLOURS["quaternary"],
}

COMPONENT_NOTES = {
    "Ohmic resistor": (
        "An **ohmic conductor** (e.g. a metal at constant temperature) obeys Ohm's "
        "law: current is directly proportional to voltage, so the I-V graph is a "
        "**straight line through the origin**. Its resistance R = V/I is constant — "
        "the gradient of the line is 1/R."
    ),
    "Filament lamp": (
        "A **filament lamp** has an **S-shaped** characteristic. As the voltage rises "
        "the filament heats up; the increased lattice vibrations scatter electrons "
        "more, so the **resistance increases**. The current therefore rises less "
        "steeply at higher voltages — the gradient decreases away from the origin."
    ),
    "Diode": (
        "A **semiconductor diode** conducts in only one direction. In **forward bias** "
        "almost no current flows until ~0.6 V, after which the current rises sharply "
        "(exponentially). In **reverse bias** the diode blocks current — only a tiny "
        "leakage current flows. Resistance is very high below 0.6 V and very low above."
    ),
    "Thermistor (NTC)": (
        "An **NTC thermistor** has a **negative temperature coefficient**: as current "
        "heats it, more charge carriers are released and its **resistance falls**. The "
        "I-V curve therefore bends **upwards** — current rises faster than voltage, "
        "the opposite trend to a filament lamp."
    ),
}

# Resistivity materials (Ω·m at ~20 °C)
MATERIALS = {
    "Copper": 1.68e-8,
    "Aluminium": 2.65e-8,
    "Iron": 9.71e-8,
    "Nichrome": 1.10e-6,
    "Carbon": 3.5e-5,
    "Silicon": 6.4e2,
}

# ── Physics models ────────────────────────────────────────────────────────────

# Diode model parameters
V_T = 0.025          # thermal voltage (V)
DIODE_N = 1.8        # ideality factor
I_MAX_DIODE = 0.1    # current clip (A)
EXP_CLIP = 700.0     # clip exponent argument to avoid overflow


def diode_current(V, I_s=1e-9):
    """Shockley diode current with overflow guards and clipping."""
    V = np.asarray(V, dtype=float)
    arg = np.clip(V / (DIODE_N * V_T), -EXP_CLIP, EXP_CLIP)
    with np.errstate(over="ignore", invalid="ignore"):
        I = I_s * (np.exp(arg) - 1.0)
    I = np.nan_to_num(I, nan=0.0, posinf=I_MAX_DIODE, neginf=-I_s)
    I = np.clip(I, -1.5 * I_s, I_MAX_DIODE)
    return I


def filament_current(V, R0=2.0, n=1.8):
    """
    Filament lamp: resistance rises with |V| so the curve is S-shaped.

    Model: I = sign(V) * (|V| / R0) ** (1/n), with n > 1 flattening the curve
    at higher voltage (rising effective resistance).
    """
    V = np.asarray(V, dtype=float)
    mag = np.abs(V) / max(R0, 1e-6)
    I = np.sign(V) * np.power(mag, 1.0 / n)
    return I


def thermistor_current(V, R0=50.0, alpha=0.6):
    """
    NTC thermistor: resistance falls as |V| (power) rises, so the curve bends
    upwards. Model: I = sign(V) * |V| * (1 + alpha*|V|) / R0.
    """
    V = np.asarray(V, dtype=float)
    I = np.sign(V) * np.abs(V) * (1.0 + alpha * np.abs(V)) / max(R0, 1e-6)
    return I


def ohmic_current(V, R=1000.0):
    """Ohmic resistor: I = V/R."""
    V = np.asarray(V, dtype=float)
    return V / max(R, 1e-6)


def component_current(component, V, params):
    """Dispatch to the right model. Returns current in amps."""
    if component == "Ohmic resistor":
        return ohmic_current(V, R=params.get("R", 1000.0))
    if component == "Filament lamp":
        return filament_current(V, R0=params.get("R0", 2.0), n=params.get("n", 1.8))
    if component == "Diode":
        return diode_current(V, I_s=params.get("I_s", 1e-9))
    if component == "Thermistor (NTC)":
        return thermistor_current(V, R0=params.get("R0", 50.0))
    return ohmic_current(V)


def voltage_range(component):
    """Symmetric voltage range used for the full characteristic curve."""
    if component == "Diode":
        return (-2.0, 2.0)
    return (-5.0, 5.0)


def fmt_resistance(V, I):
    """Format instantaneous resistance R = V/I, guarding division."""
    if abs(I) < 1e-12:
        if abs(V) < 1e-9:
            return "—"          # 0/0 undefined
        return "∞"              # open circuit / blocked
    R = V / I
    if abs(R) >= 1e6:
        return f"{R / 1e6:.2f} MΩ"
    if abs(R) >= 1e3:
        return f"{R / 1e3:.2f} kΩ"
    return f"{R:.2f} Ω"


def fmt_current(I):
    """Human-friendly current formatting."""
    a = abs(I)
    if a < 1e-9:
        return f"{I * 1e9:.2f} nA" if a > 0 else "0 A"
    if a < 1e-6:
        return f"{I * 1e9:.1f} nA"
    if a < 1e-3:
        return f"{I * 1e6:.1f} µA"
    if a < 1.0:
        return f"{I * 1e3:.2f} mA"
    return f"{I:.3f} A"


# ── Plotly figures ────────────────────────────────────────────────────────────


def build_characteristic_fig(component, V_now, params):
    """Full I-V characteristic with the live operating point marked."""
    vmin, vmax = voltage_range(component)
    V = np.linspace(vmin, vmax, 401)
    I = component_current(component, V, params)
    I_now = float(component_current(component, np.array([V_now]), params)[0])

    colour = COMPONENT_COLOUR[component]
    fig = make_fig()
    fig.add_trace(go.Scatter(
        x=V, y=I, mode="lines",
        line=dict(color=colour, width=3),
        name=component,
    ))
    fig.add_trace(go.Scatter(
        x=[V_now], y=[I_now], mode="markers",
        marker=dict(color=COLOURS["highlight"], size=16, line=dict(color="white", width=1.5)),
        name="Operating point",
    ))
    fig.update_layout(**plotly_layout(
        title=f"I-V characteristic — {component}",
        xaxis_title="Voltage V (V)",
        yaxis_title="Current I (A)",
        height=420,
    ))
    fig.add_hline(y=0, line=dict(color=COLOURS["grid"], width=1))
    fig.add_vline(x=0, line=dict(color=COLOURS["grid"], width=1))
    return fig


def build_overlay_fig(params_by_component):
    """Overlay all four characteristics (normalised) for comparison."""
    fig = make_fig()
    V = np.linspace(-5.0, 5.0, 401)
    for comp in COMPONENTS:
        p = params_by_component.get(comp, {})
        I = component_current(comp, V, p)
        # Normalise each curve to its peak magnitude so shapes are comparable
        peak = np.max(np.abs(I))
        if peak < 1e-15:
            peak = 1.0
        fig.add_trace(go.Scatter(
            x=V, y=I / peak, mode="lines",
            line=dict(color=COMPONENT_COLOUR[comp], width=2.5),
            name=comp,
        ))
    fig.update_layout(**plotly_layout(
        title="All characteristics compared (each normalised to its peak current)",
        xaxis_title="Voltage V (V)",
        yaxis_title="Current I (normalised)",
        height=420,
    ))
    fig.add_hline(y=0, line=dict(color=COLOURS["grid"], width=1))
    fig.add_vline(x=0, line=dict(color=COLOURS["grid"], width=1))
    return fig


def build_resistivity_figs(rho, L_max, A_m2, L_val):
    """R vs L (linear) and R vs 1/A proportionality plots."""
    # R vs L at fixed A
    L = np.linspace(0.1, L_max, 200)
    R_of_L = rho * L / max(A_m2, 1e-15)

    fig_L = make_fig()
    fig_L.add_trace(go.Scatter(
        x=L, y=R_of_L, mode="lines",
        line=dict(color=COLOURS["primary"], width=3), name="R = ρL/A",
    ))
    R_now = rho * L_val / max(A_m2, 1e-15)
    fig_L.add_trace(go.Scatter(
        x=[L_val], y=[R_now], mode="markers",
        marker=dict(color=COLOURS["highlight"], size=14), name="Current point",
    ))
    fig_L.update_layout(**plotly_layout(
        title="R ∝ L  (area fixed)",
        xaxis_title="Length L (m)", yaxis_title="Resistance R (Ω)", height=360,
    ))

    # R vs 1/A at fixed L
    A_arr = np.linspace(0.1e-6, 5.0e-6, 200)   # 0.1–5 mm² in m²
    inv_A = 1.0 / A_arr
    R_of_invA = rho * L_val * inv_A
    fig_A = make_fig()
    fig_A.add_trace(go.Scatter(
        x=inv_A, y=R_of_invA, mode="lines",
        line=dict(color=COLOURS["secondary"], width=3), name="R = ρL·(1/A)",
    ))
    fig_A.update_layout(**plotly_layout(
        title="R ∝ 1/A  (length fixed)",
        xaxis_title="1/A (m⁻²)", yaxis_title="Resistance R (Ω)", height=360,
    ))
    return fig_L, fig_A


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_iv_animation(component, voltage, params):
    """
    Self-contained p5.js circuit + electron-flow animation with a live mini
    I-V curve tracing the operating point.
    """
    I_now = float(component_current(component, np.array([voltage]), params)[0])
    power = float(voltage * I_now)

    # Pre-compute the full characteristic for the mini live curve (light payload)
    vmin, vmax = voltage_range(component)
    Vc = np.linspace(vmin, vmax, 121)
    Ic = component_current(component, Vc, params)
    peak = float(np.max(np.abs(Ic))) or 1.0

    data = json.dumps({
        "component": component,
        "voltage": float(voltage),
        "current": I_now,
        "power": power,
        "vmin": float(vmin),
        "vmax": float(vmax),
        "curveV": [float(v) for v in Vc],
        "curveI": [float(i) for i in Ic],
        "peak": peak,
        "colour": COMPONENT_COLOUR[component],
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const SIM = {data};

new p5(function(p) {{
  let W = 700, H = 420;
  let playing = true;
  let speed = 1.0;
  let electrons = [];
  let glow = 0;            // filament glow accumulator
  let btnPlay, btnSlow, btnFast;

  // ── circuit geometry (loop on the left ~60% of canvas) ───────────────────
  function circuitRect() {{
    const x0 = 60, y0 = 70;
    const w = Math.max(220, W * 0.52 - 80);
    const h = H - 150;
    return {{ x0, y0, w, h }};
  }}

  // Parametric position along the rectangular wire loop, t in [0,1) clockwise.
  function loopPos(t) {{
    const r = circuitRect();
    const x0 = r.x0, y0 = r.y0, x1 = r.x0 + r.w, y1 = r.y0 + r.h;
    const top = r.w, right = r.h, bot = r.w, left = r.h;
    const per = top + right + bot + left;
    let d = (t % 1.0) * per;
    if (d < top)             return {{ x: x0 + d, y: y0 }};
    d -= top;
    if (d < right)           return {{ x: x1, y: y0 + d }};
    d -= right;
    if (d < bot)             return {{ x: x1 - d, y: y1 }};
    d -= bot;
    return {{ x: x0, y: y1 - d }};
  }}

  function curMag() {{ return Math.abs(SIM.current); }}

  // electron speed (loop fraction per frame) scaled by current magnitude
  function flowRate() {{
    const norm = Math.min(1.0, curMag() / (SIM.peak + 1e-12));
    return 0.0016 + 0.010 * norm;
  }}

  p.setup = function() {{
    W = (p.windowWidth || 700);
    H = 420;
    const cnv = p.createCanvas(W, H);
    cnv.parent(document.body);
    p.textFont('monospace');
    for (let i = 0; i < 40; i++) electrons.push(Math.random());

    btnPlay = p.createButton('⏸');
    styleBtn(btnPlay, W - 120);
    btnPlay.mousePressed(function() {{ playing = !playing; btnPlay.html(playing ? '⏸' : '▶'); }});
    btnSlow = p.createButton('–'); styleBtn(btnSlow, W - 80);
    btnSlow.mousePressed(function() {{ speed = Math.max(0.25, speed - 0.25); }});
    btnFast = p.createButton('+'); styleBtn(btnFast, W - 50);
    btnFast.mousePressed(function() {{ speed = Math.min(3.0, speed + 0.25); }});
  }};

  function styleBtn(b, x) {{
    b.position(x, 8);
    b.style('background', '#262730'); b.style('color', '#fafafa');
    b.style('border', '1px solid #555'); b.style('border-radius', '4px');
    b.style('width', '30px'); b.style('cursor', 'pointer');
  }}

  p.windowResized = function() {{
    W = (p.windowWidth || 700);
    p.resizeCanvas(W, H);
    btnPlay.position(W - 120, 8);
    btnSlow.position(W - 80, 8);
    btnFast.position(W - 50, 8);
  }};

  // ── component drawing at the bottom-middle of the loop ───────────────────
  function drawComponent() {{
    const r = circuitRect();
    const cx = r.x0 + r.w / 2;
    const cy = r.y0 + r.h;     // bottom wire
    const comp = SIM.component;
    p.push();
    p.translate(cx, cy);
    p.stroke(200); p.strokeWeight(2); p.noFill();

    if (comp === 'Ohmic resistor') {{
      p.fill(40); p.rect(-35, -12, 70, 24, 3);
      p.noFill(); p.stroke(160);
      p.beginShape();
      for (let i = -30; i <= 30; i += 6) {{
        p.vertex(i, (Math.floor((i + 30) / 6) % 2 === 0) ? -7 : 7);
      }}
      p.endShape();
    }} else if (comp === 'Filament lamp') {{
      // bulb circle with glowing filament
      const gl = Math.min(255, glow);
      p.noStroke();
      p.fill(255, 200 - gl * 0.4, 50, 60 + gl * 0.7);
      p.ellipse(0, 0, 56 + gl * 0.15, 56 + gl * 0.15);   // halo
      p.stroke(200); p.noFill(); p.strokeWeight(2);
      p.ellipse(0, 0, 40, 40);
      // filament: colour orange→white with glow
      const fr = 255, fg = 120 + gl * 0.5, fb = 30 + gl * 0.85;
      p.stroke(fr, Math.min(255, fg), Math.min(255, fb)); p.strokeWeight(2.5);
      p.line(-18, 0, -9, 0);
      p.beginShape();
      for (let i = -9; i <= 9; i += 1) p.vertex(i, 7 * Math.sin(i * 1.6));
      p.endShape();
      p.line(9, 0, 18, 0);
      p.line(-9, 0, -9, 6); p.line(9, 0, 9, 6);
    }} else if (comp === 'Diode') {{
      const fwd = SIM.voltage > 0;
      const blocked = SIM.voltage <= 0.6;
      // triangle pointing right (anode→cathode) + bar
      p.stroke(160); p.fill(blocked ? 60 : 90);
      p.triangle(-16, -11, -16, 11, 6, 0);
      p.stroke(blocked ? 120 : 230); p.strokeWeight(3);
      p.line(6, -11, 6, 11);              // cathode bar
      p.stroke(160); p.strokeWeight(2);
      p.line(-30, 0, -16, 0); p.line(6, 0, 30, 0);
    }} else {{
      // Thermistor: rectangle with diagonal arrow (variable)
      p.fill(40); p.rect(-32, -12, 64, 24, 3);
      p.stroke(180); p.strokeWeight(2);
      p.line(-38, 14, 30, -16);
      p.line(30, -16, 22, -14); p.line(30, -16, 28, -8);
    }}
    p.pop();
  }}

  function drawBattery() {{
    const r = circuitRect();
    const cx = r.x0 + r.w / 2;
    const cy = r.y0;            // top wire
    const v = SIM.voltage;
    p.push(); p.translate(cx, cy);
    p.stroke(160); p.strokeWeight(2);
    p.line(-30, 0, -6, 0); p.line(6, 0, 30, 0);
    // long terminal = + (sign flips with voltage)
    const longLeft = v >= 0;
    p.strokeWeight(3); p.stroke(230, 80, 80);
    if (longLeft) {{ p.line(-6, -12, -6, 12); }} else {{ p.line(6, -12, 6, 12); }}
    p.strokeWeight(2); p.stroke(120, 160, 230);
    if (longLeft) {{ p.line(6, -7, 6, 7); }} else {{ p.line(-6, -7, -6, 7); }}
    p.noStroke(); p.fill(180); p.textSize(11); p.textAlign(p.CENTER);
    p.text('variable supply', 0, -20);
    p.pop();
  }}

  // Ammeter & voltmeter symbols on the loop
  function drawMeters() {{
    const r = circuitRect();
    // Ammeter on right wire
    p.push(); p.translate(r.x0 + r.w, r.y0 + r.h * 0.5);
    p.stroke(160); p.fill(20); p.ellipse(0, 0, 34, 34);
    p.noStroke(); p.fill(120, 200, 255); p.textAlign(p.CENTER, p.CENTER); p.textSize(15);
    p.text('A', 0, 0); p.pop();
    // Voltmeter across the component (bottom)
    p.push(); p.translate(r.x0 + r.w * 0.5, r.y0 + r.h + 42);
    p.stroke(160); p.fill(20); p.ellipse(0, 0, 34, 34);
    p.noStroke(); p.fill(255, 180, 120); p.textAlign(p.CENTER, p.CENTER); p.textSize(15);
    p.text('V', 0, 0); p.pop();
    // dashed leads to voltmeter
    p.stroke(90); p.strokeWeight(1);
    p.line(r.x0 + r.w * 0.5 - 35, r.y0 + r.h, r.x0 + r.w * 0.5 - 35, r.y0 + r.h + 42);
    p.line(r.x0 + r.w * 0.5 + 35, r.y0 + r.h, r.x0 + r.w * 0.5 + 35, r.y0 + r.h + 42);
  }}

  function drawReadouts() {{
    p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(13);
    let cur = SIM.current;
    let curStr;
    const a = Math.abs(cur);
    if (a < 1e-6) curStr = (cur * 1e9).toFixed(1) + ' nA';
    else if (a < 1e-3) curStr = (cur * 1e6).toFixed(1) + ' µA';
    else if (a < 1.0) curStr = (cur * 1e3).toFixed(2) + ' mA';
    else curStr = cur.toFixed(3) + ' A';
    p.fill(120, 200, 255); p.text('Ammeter:  ' + curStr, 16, H - 56);
    p.fill(255, 180, 120); p.text('Voltmeter: ' + SIM.voltage.toFixed(2) + ' V', 16, H - 38);
    p.fill(180); p.text('speed ×' + speed.toFixed(2), 16, H - 20);
  }}

  // ── mini live I-V curve on the right ──────────────────────────────────────
  function drawMiniCurve() {{
    const gx = Math.max(W * 0.58, W - 250);
    const gw = W - gx - 30, gh = H - 130;
    const gy = 60;
    if (gw < 80) return;
    const cx = gx + gw / 2, cy = gy + gh / 2;
    // axes
    p.stroke(90); p.strokeWeight(1);
    p.line(gx, cy, gx + gw, cy);
    p.line(cx, gy, cx, gy + gh);
    p.noStroke(); p.fill(150); p.textSize(10); p.textAlign(p.LEFT);
    p.text('I', cx + 4, gy + 8); p.text('V', gx + gw - 10, cy - 6);
    p.text('live I-V', gx, gy - 6);
    // curve
    const vspan = SIM.vmax - SIM.vmin;
    p.noFill(); p.stroke(SIM.colour); p.strokeWeight(2);
    p.beginShape();
    for (let i = 0; i < SIM.curveV.length; i++) {{
      const px = gx + ((SIM.curveV[i] - SIM.vmin) / vspan) * gw;
      const py = cy - (SIM.curveI[i] / (SIM.peak + 1e-12)) * (gh / 2) * 0.9;
      p.vertex(px, py);
    }}
    p.endShape();
    // operating point
    const opx = gx + ((SIM.voltage - SIM.vmin) / vspan) * gw;
    const opy = cy - (SIM.current / (SIM.peak + 1e-12)) * (gh / 2) * 0.9;
    p.fill(231, 76, 60); p.noStroke(); p.ellipse(opx, opy, 11, 11);
  }}

  p.draw = function() {{
    p.background(14, 17, 23);

    // glow tracking for the lamp (∝ power)
    const targetGlow = SIM.component === 'Filament lamp'
      ? Math.min(255, Math.abs(SIM.power) * 380) : 0;
    glow += (targetGlow - glow) * 0.08;

    // wire loop
    p.stroke(110); p.strokeWeight(2); p.noFill();
    const r = circuitRect();
    p.rect(r.x0, r.y0, r.w, r.h);

    drawBattery();
    drawComponent();
    drawMeters();

    // electrons (conventional current is opposite; we animate carriers along loop)
    const dir = SIM.voltage >= 0 ? 1 : -1;
    const blocked = SIM.component === 'Diode' && SIM.voltage <= 0.6;
    const rate = flowRate() * speed;
    p.noStroke();
    for (let i = 0; i < electrons.length; i++) {{
      if (playing && !blocked) electrons[i] = (electrons[i] + dir * rate + 1) % 1;
      const pos = loopPos(electrons[i]);
      p.fill(90, 170, 255, blocked ? 60 : 230);
      p.ellipse(pos.x, pos.y, 6, 6);
    }}

    if (blocked) {{
      p.fill(231, 76, 60); p.textSize(13); p.textAlign(p.CENTER, p.CENTER);
      p.text('reverse biased — blocked', r.x0 + r.w / 2, r.y0 + r.h * 0.5);
    }}

    drawReadouts();
    drawMiniCurve();

    if (!playing) {{
      p.fill(255); p.textAlign(p.RIGHT, p.TOP); p.textSize(12);
      p.text('paused', W - 130, 40);
    }}
  }};
}});
</script>
</body>
</html>"""


# ── Page header ───────────────────────────────────────────────────────────────

sim_header("I-V Characteristics & Resistivity", SPEC_REF)

mode = mode_toggle()

tab_iv, tab_res = st.tabs(["I-V Characteristics", "Resistivity Calculator"])

# ══ TAB 1 — I-V CHARACTERISTICS ════════════════════════════════════════════════

# Defaults so the exam panel (rendered later) always has values
L_val = 2.0
A_val = 1.0
R_resistivity = 0.0

with tab_iv:
    left, right = two_column_layout()

    with left:
        component = st.radio(
            "Component",
            COMPONENTS,
            key="iv_component",
            help="Select the circuit component to investigate.",
        )

        # Component-specific parameter + voltage slider
        params = {}
        if component == "Diode":
            voltage = st.slider(
                "Applied voltage V (V)", -2.0, 2.0, 0.7, 0.05, key="iv_volt_diode",
            )
            I_s_nA = st.slider(
                "Saturation current I_s (nA)", 0.1, 10.0, 1.0, 0.1, key="iv_is",
                help="Reverse saturation current of the diode.",
            )
            params["I_s"] = I_s_nA * 1e-9
        elif component == "Ohmic resistor":
            voltage = st.slider(
                "Applied voltage V (V)", -5.0, 5.0, 2.0, 0.1, key="iv_volt_ohm",
            )
            R_ohm = st.slider(
                "Resistance R (Ω)", 100.0, 5000.0, 1000.0, 50.0, key="iv_R",
            )
            params["R"] = R_ohm
        elif component == "Filament lamp":
            voltage = st.slider(
                "Applied voltage V (V)", -5.0, 5.0, 2.0, 0.1, key="iv_volt_lamp",
            )
            R0 = st.slider(
                "Cold-resistance scale R₀ (Ω)", 1.0, 6.0, 2.0, 0.2, key="iv_R0",
                help="Lower R₀ → brighter lamp at a given voltage.",
            )
            params["R0"] = R0
            params["n"] = 1.8
        else:  # Thermistor
            voltage = st.slider(
                "Applied voltage V (V)", -5.0, 5.0, 2.0, 0.1, key="iv_volt_therm",
            )
            R0 = st.slider(
                "Resistance scale R₀ (Ω)", 20.0, 120.0, 50.0, 5.0, key="iv_Rt",
            )
            params["R0"] = R0

        I_now = float(component_current(component, np.array([voltage]), params)[0])
        P_now = voltage * I_now

        st.markdown("")
        metric_row({
            "Applied V": f"{voltage:.2f} V",
            "Current I": fmt_current(I_now),
            "Resistance R": fmt_resistance(voltage, I_now),
            "Power P": f"{P_now * 1e3:.2f} mW" if abs(P_now) < 1 else f"{P_now:.3f} W",
        })

        st.info(COMPONENT_NOTES[component])

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"V = IR",
                r"R = \frac{V}{I}",
                r"\rho = \frac{RA}{L} \;\Rightarrow\; R = \frac{\rho L}{A}",
                r"P = IV",
            ],
            explanation=(
                "The **I-V characteristic** is a graph of current against voltage for a "
                "component. Its shape reveals how the component's resistance changes:\n\n"
                "- A **straight line through the origin** means constant resistance "
                "(ohmic).\n"
                "- A **curve** means the resistance depends on voltage, current or "
                "temperature.\n\n"
                "The instantaneous resistance at any point is R = V/I (the reciprocal of "
                "the chord gradient from the origin)."
            ),
            advanced_text=(
                "For a **filament lamp** the metal's resistance rises with temperature: "
                "R = R₀(1 + αΔT), and the power dissipated P = I²R heats the filament, so "
                "the system is self-consistent — higher V → higher T → higher R.\n\n"
                "For a **diode** the Shockley equation I = I_s(e^{V/nV_T} − 1) describes the "
                "exponential forward characteristic, where V_T ≈ 25 mV is the thermal "
                "voltage and n the ideality factor."
            ),
            mode=mode,
        )

    with right:
        components.html(
            build_iv_animation(component, voltage, params),
            height=440,
        )
        st.caption(
            "▶ Play/pause and speed top-right · electron flow speed ∝ current · "
            "direction reverses with voltage sign · the red dot traces the operating point."
        )
        st.divider()

        fig_char = build_characteristic_fig(component, voltage, params)
        st.plotly_chart(fig_char, use_container_width=True)

        if mode == "Advanced":
            advanced_divider()
            st.markdown("**All four components compared**")
            params_by_component = {
                "Ohmic resistor": {"R": params.get("R", 1000.0)},
                "Filament lamp": {"R0": params.get("R0", 2.0) if component == "Filament lamp" else 2.0, "n": 1.8},
                "Diode": {"I_s": params.get("I_s", 1e-9) if component == "Diode" else 1e-9},
                "Thermistor (NTC)": {"R0": params.get("R0", 50.0) if component == "Thermistor (NTC)" else 50.0},
            }
            fig_overlay = build_overlay_fig(params_by_component)
            st.plotly_chart(fig_overlay, use_container_width=True)
            st.caption(
                "Each curve is normalised to its own peak current so the *shapes* can be "
                "compared on one axis (the actual currents differ by orders of magnitude)."
            )

# ══ TAB 2 — RESISTIVITY CALCULATOR ═════════════════════════════════════════════

with tab_res:
    left2, right2 = two_column_layout()

    with left2:
        material = st.selectbox(
            "Material", list(MATERIALS.keys()), key="res_material",
        )
        rho = MATERIALS[material]

        L_val = st.slider(
            "Wire length L (m)", 0.1, 10.0, 2.0, 0.1, key="res_L",
        )

        area_mode = st.radio(
            "Specify cross-section by",
            ["Area", "Diameter"],
            horizontal=True,
            key="res_area_mode",
        )
        if area_mode == "Diameter":
            d_mm = st.slider(
                "Diameter d (mm)", 0.1, 2.5, 1.128, 0.01, key="res_d",
                help="Area A = πd²/4.",
            )
            A_mm2 = np.pi * d_mm ** 2 / 4.0
            st.caption(f"→ Cross-sectional area A = πd²/4 = **{A_mm2:.3f} mm²**")
        else:
            A_mm2 = st.slider(
                "Cross-sectional area A (mm²)", 0.1, 5.0, 1.0, 0.05, key="res_A",
            )

        A_val = A_mm2
        A_m2 = A_mm2 * 1e-6
        R_resistivity = rho * L_val / max(A_m2, 1e-15)

        st.markdown("")
        metric_row({
            "Resistivity ρ": f"{rho:.2e} Ω·m",
            "Length L": f"{L_val:.1f} m",
            "Area A": f"{A_val:.2f} mm²",
            "Resistance R": (
                f"{R_resistivity:.4f} Ω" if R_resistivity < 1e3
                else f"{R_resistivity:.3e} Ω"
            ),
        })

        st.success(
            f"**R = ρL/A** = {rho:.2e} × {L_val:.1f} / ({A_val:.2f}×10⁻⁶) "
            f"= **{R_resistivity:.4g} Ω**"
        )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\rho = \frac{RA}{L}",
                r"R = \frac{\rho L}{A}",
                r"A = \frac{\pi d^2}{4}",
            ],
            explanation=(
                "**Resistivity ρ** is a property of the *material* (units Ω·m), unlike "
                "resistance which also depends on the dimensions of the sample. "
                "Resistance is **directly proportional to length** and **inversely "
                "proportional to cross-sectional area**: R = ρL/A.\n\n"
                "Doubling the length doubles the resistance; doubling the area halves it. "
                "Insulators have huge resistivity, conductors very small resistivity, and "
                "semiconductors lie in between."
            ),
            advanced_text=(
                "Resistivity itself depends on temperature. For metals it rises roughly "
                "linearly with temperature (more lattice vibrations → more scattering), "
                "whereas for semiconductors it *falls* with temperature as more charge "
                "carriers are thermally released."
            ),
            mode=mode,
        )

    with right2:
        fig_L, fig_A = build_resistivity_figs(rho, 10.0, A_m2, L_val)
        st.plotly_chart(fig_L, use_container_width=True)
        st.plotly_chart(fig_A, use_container_width=True)
        st.caption(
            "Left: resistance is proportional to length (straight line through the "
            "origin). Right: resistance is proportional to 1/A — halving the area "
            "doubles the resistance."
        )

# ══ EXAM PANEL ═════════════════════════════════════════════════════════════════

questions = [
    {"q": "Sketch and describe the I-V characteristic of a filament lamp. Explain its shape.",
     "marks": 3,
     "answer": "S-shaped curve through the origin, gradient decreasing as |V| rises. As current increases the filament heats up, increasing the metal's resistance (more lattice vibrations → more electron scattering), so I rises less steeply.",
     "working": []},
    {"q": f"A copper wire of length {L_val:.1f} m and cross-sectional area {A_val:.2f} mm² has resistivity 1.68×10⁻⁸ Ω m. Calculate its resistance.",
     "marks": 3,
     "answer": f"R = {(1.68e-8 * L_val / max(A_val * 1e-6, 1e-15)):.4f} Ω",
     "working": [
         f"A = {A_val:.2f}×10⁻⁶ m²",
         f"R = ρL/A = 1.68×10⁻⁸×{L_val:.1f}/({A_val:.2f}×10⁻⁶) = {(1.68e-8 * L_val / max(A_val * 1e-6, 1e-15)):.4f} Ω",
     ]},
    {"q": "Explain why a semiconductor diode only conducts significantly in one direction.",
     "marks": 2,
     "answer": "Forward bias lowers the depletion-layer barrier so charge carriers cross easily (current rises sharply above ~0.6 V). Reverse bias widens the depletion layer, blocking almost all current.",
     "working": []},
]
show_exam_panel(questions)
