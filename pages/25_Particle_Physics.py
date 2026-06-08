"""
Particle Physics — WJEC Eduqas A Level Physics.

Interactive simulations covering the Standard Model particles, quark
composition of hadrons, conservation laws in particle interactions, and
Feynman diagram visualisations for fundamental decays.

Spec reference: Component 3, Topic 7 (Particles and Nuclear Structure)
"""

import json

import streamlit as st
import streamlit.components.v1 as components

from utils.ui_components import (
    advanced_divider,
    mode_toggle,
    physics_notes,
    sim_header,
)
from utils.exam_ui import show_exam_panel

# ── Page configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Particle Physics — WJEC Physics",
    page_icon="⚛️",
    layout="wide",
)

# ── Constants / catalogue ─────────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 7 (Particles and Nuclear Structure)"

# ── Quark data ────────────────────────────────────────────────────────────────

QUARKS = {
    "up":      {"symbol": "u",  "charge": "+2/3", "charge_val":  2/3,  "mass": "2.2 MeV/c²",  "spin": "1/2", "colour": "#1f77b4"},
    "down":    {"symbol": "d",  "charge": "−1/3", "charge_val": -1/3,  "mass": "4.7 MeV/c²",  "spin": "1/2", "colour": "#ff7f0e"},
    "strange": {"symbol": "s",  "charge": "−1/3", "charge_val": -1/3,  "mass": "96 MeV/c²",   "spin": "1/2", "colour": "#2ca02c"},
    "charm":   {"symbol": "c",  "charge": "+2/3", "charge_val":  2/3,  "mass": "1.27 GeV/c²", "spin": "1/2", "colour": "#9467bd"},
    "bottom":  {"symbol": "b",  "charge": "−1/3", "charge_val": -1/3,  "mass": "4.18 GeV/c²", "spin": "1/2", "colour": "#8c564b"},
    "top":     {"symbol": "t",  "charge": "+2/3", "charge_val":  2/3,  "mass": "173 GeV/c²",  "spin": "1/2", "colour": "#e377c2"},
}

# ── Lepton data ───────────────────────────────────────────────────────────────

LEPTONS = {
    "electron":     {"symbol": "e⁻",  "charge": "−1", "charge_val": -1, "mass": "0.511 MeV/c²", "spin": "1/2", "L": 1},
    "muon":         {"symbol": "μ⁻",  "charge": "−1", "charge_val": -1, "mass": "105.7 MeV/c²", "spin": "1/2", "L": 1},
    "tau":          {"symbol": "τ⁻",  "charge": "−1", "charge_val": -1, "mass": "1776.9 MeV/c²","spin": "1/2", "L": 1},
    "e-neutrino":   {"symbol": "νₑ",  "charge": "0",  "charge_val":  0, "mass": "< 2 eV/c²",    "spin": "1/2", "L": 1},
    "μ-neutrino":   {"symbol": "νμ",  "charge": "0",  "charge_val":  0, "mass": "< 0.19 MeV/c²","spin": "1/2", "L": 1},
    "τ-neutrino":   {"symbol": "ντ",  "charge": "0",  "charge_val":  0, "mass": "< 18.2 MeV/c²","spin": "1/2", "L": 1},
}

# ── Gauge boson data ──────────────────────────────────────────────────────────

GAUGE_BOSONS = {
    "photon":   {"symbol": "γ",  "charge": "0",  "mass": "0",          "spin": "1",  "force": "Electromagnetic"},
    "W boson":  {"symbol": "W±", "charge": "±1", "mass": "80.4 GeV/c²","spin": "1",  "force": "Weak"},
    "Z boson":  {"symbol": "Z⁰", "charge": "0",  "mass": "91.2 GeV/c²","spin": "1",  "force": "Weak"},
    "gluon":    {"symbol": "g",  "charge": "0",  "mass": "0",          "spin": "1",  "force": "Strong"},
}

# ── Particle data for conservation law checker ────────────────────────────────

PARTICLES = {
    "proton":           {"symbol": "p",    "Q": 1,  "B": 1,  "L": 0,  "S": 0,  "quarks": "uud"},
    "neutron":          {"symbol": "n",    "Q": 0,  "B": 1,  "L": 0,  "S": 0,  "quarks": "udd"},
    "electron":         {"symbol": "e⁻",  "Q": -1, "B": 0,  "L": 1,  "S": 0},
    "positron":         {"symbol": "e⁺",  "Q": 1,  "B": 0,  "L": -1, "S": 0},
    "neutrino_e":       {"symbol": "νₑ",  "Q": 0,  "B": 0,  "L": 1,  "S": 0},
    "antineutrino_e":   {"symbol": "ν̄ₑ", "Q": 0,  "B": 0,  "L": -1, "S": 0},
    "pi_plus":          {"symbol": "π⁺",  "Q": 1,  "B": 0,  "L": 0,  "S": 0,  "quarks": "ud̄"},
    "pi_minus":         {"symbol": "π⁻",  "Q": -1, "B": 0,  "L": 0,  "S": 0,  "quarks": "ūd"},
    "pi_zero":          {"symbol": "π⁰",  "Q": 0,  "B": 0,  "L": 0,  "S": 0},
    "kaon_plus":        {"symbol": "K⁺",  "Q": 1,  "B": 0,  "L": 0,  "S": 1,  "quarks": "us̄"},
    "kaon_minus":       {"symbol": "K⁻",  "Q": -1, "B": 0,  "L": 0,  "S": -1, "quarks": "ūs"},
    "photon":           {"symbol": "γ",   "Q": 0,  "B": 0,  "L": 0,  "S": 0},
    "muon":             {"symbol": "μ⁻",  "Q": -1, "B": 0,  "L": 1,  "S": 0},
    "antimuon":         {"symbol": "μ⁺",  "Q": 1,  "B": 0,  "L": -1, "S": 0},
    "neutrino_mu":      {"symbol": "νμ",  "Q": 0,  "B": 0,  "L": 1,  "S": 0},
    "antineutrino_mu":  {"symbol": "ν̄μ", "Q": 0,  "B": 0,  "L": -1, "S": 0},
    "lambda":           {"symbol": "Λ⁰",  "Q": 0,  "B": 1,  "L": 0,  "S": -1, "quarks": "uds"},
    "sigma_plus":       {"symbol": "Σ⁺",  "Q": 1,  "B": 1,  "L": 0,  "S": -1, "quarks": "uus"},
    "antiproton":       {"symbol": "p̄",  "Q": -1, "B": -1, "L": 0,  "S": 0,  "quarks": "ūūd̄"},
    "antineutron":      {"symbol": "n̄",  "Q": 0,  "B": -1, "L": 0,  "S": 0,  "quarks": "ūd̄d̄"},
}

# Friendly display names for the dropdown
PARTICLE_DISPLAY = {k: f"{v['symbol']}  ({k.replace('_', ' ')})" for k, v in PARTICLES.items()}

# ── Example reactions ─────────────────────────────────────────────────────────

EXAMPLE_REACTIONS = {
    "β⁻ decay: n → p + e⁻ + ν̄ₑ": {
        "reactants": ["neutron"],
        "products":  ["proton", "electron", "antineutrino_e"],
        "description": "Weak interaction — d quark changes to u quark via W⁻ boson.",
    },
    "β⁺ decay: p → n + e⁺ + νₑ": {
        "reactants": ["proton"],
        "products":  ["neutron", "positron", "neutrino_e"],
        "description": "Weak interaction — u quark changes to d quark via W⁺ boson.",
    },
    "Electron capture: p + e⁻ → n + νₑ": {
        "reactants": ["proton", "electron"],
        "products":  ["neutron", "neutrino_e"],
        "description": "Weak interaction — proton absorbs an inner-shell electron.",
    },
    "Forbidden: p → e⁺ + γ  (B violated)": {
        "reactants": ["proton"],
        "products":  ["positron", "photon"],
        "description": "B before = 1, B after = 0. Baryon number not conserved — forbidden.",
    },
    "Pion decay: π⁺ → μ⁺ + νμ": {
        "reactants": ["pi_plus"],
        "products":  ["antimuon", "neutrino_mu"],
        "description": "Weak interaction — charged pion decays to antimuon and muon neutrino.",
    },
    "Kaon production (strong): p + p → p + Λ⁰ + K⁺ + p": {
        "reactants": ["proton", "proton"],
        "products":  ["proton", "lambda", "kaon_plus", "proton"],
        "description": "Strong interaction — strangeness conserved (S: 0 → −1 + 1 = 0).",
    },
}

# ── Feynman diagram definitions ───────────────────────────────────────────────

FEYNMAN_DIAGRAMS = {
    "β⁻ decay (n → p + e⁻ + ν̄ₑ)": "beta_minus",
    "β⁺ decay (p → n + e⁺ + νₑ)": "beta_plus",
    "Electron capture (p + e⁻ → n + νₑ)": "electron_capture",
    "e⁺e⁻ annihilation (→ 2γ)": "annihilation",
    "Muon decay (μ⁻ → e⁻ + ν̄ₑ + νμ)": "muon_decay",
    "Compton scattering (e⁻ + γ → e⁻ + γ)": "compton",
}


# ── Helper: sum quantum numbers over a list of particle keys ─────────────────

def sum_qn(particle_keys: list[str]) -> dict:
    """Return total Q, B, L, S for a list of particle keys."""
    totals = {"Q": 0, "B": 0, "L": 0, "S": 0}
    for key in particle_keys:
        p = PARTICLES.get(key, {})
        for qn in totals:
            totals[qn] += p.get(qn, 0)
    return totals


# ── p5.js: particle table animation (Tab 1) ───────────────────────────────────

def build_particle_table_animation() -> str:
    """
    Build a p5.js animation showing coloured quarks bouncing and forming
    hadrons (proton uud, neutron udd) when they cluster together.

    Returns
    -------
    HTML string containing self-contained p5.js sketch
    """
    return """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { margin:0; background:#0e1117; overflow:hidden; font-family:sans-serif; }
  canvas { display:block; }
  #controls {
    position:absolute; bottom:6px; left:8px;
    display:flex; gap:8px; align-items:center;
  }
  button {
    background:#1e2130; color:#fafafa; border:1px solid #444;
    padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  }
  button:hover { background:#2a2f4a; }
</style>
</head>
<body>
<div id="controls">
  <button id="btn-play">⏸ Pause</button>
  <button id="btn-reset">↺ Reset</button>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
new p5(function(p) {
  const W = 700, H = 420;
  let playing = true;

  // Quark colour palette
  const QCOLS = {
    u: [31, 119, 180],
    d: [255, 127, 14],
    s: [44, 160, 44],
    c: [148, 103, 189],
    b: [140, 86, 75],
    t: [227, 119, 194],
  };

  // Hadron definitions: [label, quarks array, description]
  const HADRONS = [
    { name: "Proton",  quarks: ["u","u","d"], charge: "+1", baryon: 1, desc: "uud" },
    { name: "Neutron", quarks: ["u","d","d"], charge: "0",  baryon: 1, desc: "udd" },
    { name: "π⁺",     quarks: ["u","d"],     charge: "+1", baryon: 0, desc: "ud̄",  meson: true },
    { name: "π⁻",     quarks: ["u","d"],     charge: "−1", baryon: 0, desc: "ūd",  meson: true },
    { name: "K⁺",     quarks: ["u","s"],     charge: "+1", baryon: 0, desc: "us̄",  meson: true },
  ];

  let hadronIdx = 0;
  let quarks = [];
  let phase = "scatter"; // scatter | collide | formed | wait
  let phaseTimer = 0;
  let formTimer = 0;
  const FORM_HOLD = 140;

  function makeQuarks(hadron) {
    quarks = [];
    const cx = W * 0.62, cy = H * 0.50;
    const n = hadron.quarks.length;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * p.TWO_PI + p.random(0.2);
      const dist = p.random(120, 200);
      quarks.push({
        q:   hadron.quarks[i],
        x:   cx + p.cos(angle) * dist,
        y:   cy + p.sin(angle) * dist,
        vx:  p.random(-1.2, 1.2),
        vy:  p.random(-1.2, 1.2),
        tx:  cx + p.cos((i / n) * p.TWO_PI) * 38,
        ty:  cy + p.sin((i / n) * p.TWO_PI) * 38,
        r:   18,
        alpha: 255,
      });
    }
  }

  p.setup = function() {
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');
    makeQuarks(HADRONS[hadronIdx]);
    phase = "scatter";
    phaseTimer = 0;

    document.getElementById('btn-play').addEventListener('click', () => {
      playing = !playing;
      document.getElementById('btn-play').textContent = playing ? '⏸ Pause' : '▶ Play';
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      hadronIdx = 0;
      makeQuarks(HADRONS[hadronIdx]);
      phase = "scatter";
      phaseTimer = 0;
    });
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth || W, H);
  };

  function drawBackground() {
    p.background(14, 17, 23);
    // subtle grid
    p.stroke(35, 38, 50);
    p.strokeWeight(1);
    for (let x = 0; x < p.width; x += 40) p.line(x, 0, x, H);
    for (let y = 0; y < H; y += 40) p.line(0, y, p.width, y);
  }

  function drawInfoPanel(hadron) {
    const px = 16, py = 16, pw = 220, ph = 170;
    p.noStroke();
    p.fill(20, 24, 36, 220);
    p.rect(px, py, pw, ph, 8);

    p.fill(250, 250, 250);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text("Standard Model — Quarks", px + 10, py + 10);

    const rows = [
      ["u (up)",     "+2/3", "#1f77b4"],
      ["d (down)",   "−1/3", "#ff7f0e"],
      ["s (strange)","−1/3", "#2ca02c"],
      ["c (charm)",  "+2/3", "#9467bd"],
      ["b (bottom)", "−1/3", "#8c564b"],
      ["t (top)",    "+2/3", "#e377c2"],
    ];
    rows.forEach(([name, charge, col], i) => {
      const ry = py + 36 + i * 22;
      // colour swatch
      const rgb = hexToRgb(col);
      p.fill(rgb[0], rgb[1], rgb[2]);
      p.rect(px + 8, ry, 10, 14, 2);
      p.fill(200, 200, 200);
      p.textSize(11);
      p.text(name, px + 24, ry);
      p.fill(150, 220, 150);
      p.text(charge, px + 140, ry);
    });

    // Current hadron box
    const hx = px, hy = py + ph + 10, hw = pw, hh = 80;
    p.noStroke();
    p.fill(20, 30, 45, 230);
    p.rect(hx, hy, hw, hh, 8);
    p.fill(250, 250, 250);
    p.textSize(14);
    p.text("Current: " + hadron.name, hx + 10, hy + 10);
    p.fill(180, 210, 250);
    p.textSize(12);
    p.text("Quarks: " + hadron.desc, hx + 10, hy + 30);
    p.text("Charge: " + hadron.charge + "  |  Baryon#: " + hadron.baryon, hx + 10, hy + 48);
    p.fill(130, 200, 130);
    p.text(hadron.meson ? "Meson (B = 0)" : "Baryon (B = 1)", hx + 10, hy + 64);
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r, g, b];
  }

  function drawQuark(q, alpha) {
    const col = QCOLS[q.q] || [200,200,200];
    // glow
    for (let r = q.r + 12; r > q.r; r -= 2) {
      p.noStroke();
      p.fill(col[0], col[1], col[2], (alpha / 255) * 18);
      p.ellipse(q.x, q.y, r * 2, r * 2);
    }
    p.noStroke();
    p.fill(col[0], col[1], col[2], alpha);
    p.ellipse(q.x, q.y, q.r * 2, q.r * 2);
    // label
    p.fill(255, 255, 255, alpha);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(13);
    p.text(q.q, q.x, q.y);
  }

  function drawGluonSprings() {
    // draw connecting springs between quarks in formed state
    p.stroke(255, 200, 50, 160);
    p.strokeWeight(1.5);
    for (let i = 0; i < quarks.length; i++) {
      for (let j = i + 1; j < quarks.length; j++) {
        const ax = quarks[i].x, ay = quarks[i].y;
        const bx = quarks[j].x, by = quarks[j].y;
        // wavy line
        const steps = 20;
        const amp = 5;
        p.noFill();
        p.beginShape();
        for (let t = 0; t <= steps; t++) {
          const frac = t / steps;
          const wx = p.lerp(ax, bx, frac);
          const wy = p.lerp(ay, by, frac);
          const nx = -(by - ay); const ny = (bx - ax);
          const len = p.sqrt(nx*nx + ny*ny) || 1;
          const wave = amp * p.sin(frac * p.PI * 6 + p.frameCount * 0.08);
          p.curveVertex(wx + (nx/len)*wave, wy + (ny/len)*wave);
        }
        p.endShape();
      }
    }
  }

  p.draw = function() {
    if (!playing) return;
    drawBackground();

    const hadron = HADRONS[hadronIdx];
    const cx = p.width * 0.62, cy = H * 0.50;

    if (phase === "scatter") {
      phaseTimer++;
      // bounce quarks around
      quarks.forEach(q => {
        q.x += q.vx;
        q.y += q.vy;
        if (q.x < 20 || q.x > p.width - 20) { q.vx *= -1; }
        if (q.y < 20 || q.y > H - 40)       { q.vy *= -1; }
        // keep roughly on right side
        if (q.x < p.width * 0.38) q.vx = p.abs(q.vx);
        drawQuark(q, 200);
      });
      if (phaseTimer > 90) { phase = "collide"; phaseTimer = 0; }
    }

    else if (phase === "collide") {
      phaseTimer++;
      const t = p.constrain(phaseTimer / 60, 0, 1);
      quarks.forEach(q => {
        q.x = p.lerp(q.x, q.tx + cx - p.width * 0.62 + cx, t * 0.08);
        q.y = p.lerp(q.y, q.ty + cy, t * 0.08);
        q.x += (q.tx + (cx - p.width * 0.62 + cx) - q.x) * 0.04;
        q.y += (q.ty + cy - q.y) * 0.04;
      });
      // draw gluon springs while approaching
      if (phaseTimer > 20) drawGluonSprings();
      quarks.forEach(q => drawQuark(q, 230));
      if (phaseTimer > 70) { phase = "formed"; formTimer = 0; }
    }

    else if (phase === "formed") {
      formTimer++;
      // orbiting in bound state
      const n = quarks.length;
      quarks.forEach((q, i) => {
        const baseAngle = (i / n) * p.TWO_PI;
        const angle = baseAngle + formTimer * 0.018;
        q.x = cx + p.cos(angle) * 38;
        q.y = cy + p.sin(angle) * 38;
      });
      drawGluonSprings();
      quarks.forEach(q => drawQuark(q, 255));

      // label the formed hadron
      p.noStroke();
      p.fill(250, 250, 250, 230);
      p.textSize(20);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(hadron.name, cx, cy + 72);
      p.textSize(13);
      p.fill(180, 220, 180);
      p.text(hadron.desc + "  Q = " + hadron.charge, cx, cy + 94);

      if (formTimer > FORM_HOLD) { phase = "wait"; phaseTimer = 0; }
    }

    else if (phase === "wait") {
      phaseTimer++;
      // fade out
      const alpha = p.map(phaseTimer, 0, 30, 255, 0, true);
      drawGluonSprings();
      quarks.forEach(q => drawQuark(q, alpha));
      if (phaseTimer > 35) {
        hadronIdx = (hadronIdx + 1) % HADRONS.length;
        makeQuarks(HADRONS[hadronIdx]);
        phase = "scatter";
        phaseTimer = 0;
      }
    }

    drawInfoPanel(hadron);

    // Title
    p.fill(200, 200, 200, 160);
    p.textSize(10);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text("Quark confinement — quarks bound by gluon exchange", p.width - 10, H - 8);
  };
});
</script>
</body>
</html>"""


# ── p5.js: Feynman diagram animation (Tab 3) ──────────────────────────────────

def build_feynman_animation(diagram_key: str) -> str:
    """
    Build a p5.js Feynman diagram for the selected interaction.

    Fermions drawn as straight arrows; photons as wavy lines; W/Z as
    thick curly/dashed lines. Time runs left to right.

    Parameters
    ----------
    diagram_key : one of the FEYNMAN_DIAGRAMS values

    Returns
    -------
    HTML string containing self-contained p5.js sketch
    """
    diagram_json = json.dumps(diagram_key)
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
const DIAGRAM = {diagram_json};

new p5(function(p) {{
  const W = 700, H = 420;
  let animT = 0;   // 0..1 animation progress
  let done = false;

  p.setup = function() {{
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');
  }};

  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || W, H);
  }};

  // ── Drawing primitives ───────────────────────────────────────────────────

  function arrow(x1, y1, x2, y2, col, alpha, t) {{
    // draw fraction t of the line
    const ex = p.lerp(x1, x2, t);
    const ey = p.lerp(y1, y2, t);
    p.stroke(col[0], col[1], col[2], alpha);
    p.strokeWeight(2.5);
    p.line(x1, y1, ex, ey);
    if (t >= 0.95) {{
      // arrowhead
      const angle = p.atan2(y2 - y1, x2 - x1);
      p.fill(col[0], col[1], col[2], alpha);
      p.noStroke();
      p.push();
      p.translate(x2, y2);
      p.rotate(angle);
      p.triangle(0, 0, -12, -5, -12, 5);
      p.pop();
    }}
  }}

  function wavyLine(x1, y1, x2, y2, col, alpha, t, freq) {{
    // boson wavy line
    const steps = 80;
    const drawSteps = Math.floor(steps * t);
    p.stroke(col[0], col[1], col[2], alpha);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= drawSteps; i++) {{
      const frac = i / steps;
      const wx = p.lerp(x1, x2, frac);
      const wy = p.lerp(y1, y2, frac);
      const dx = x2 - x1, dy = y2 - y1;
      const len = p.sqrt(dx*dx + dy*dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const wave = 7 * p.sin(frac * p.PI * freq);
      p.curveVertex(wx + nx * wave, wy + ny * wave);
    }}
    p.endShape();
  }}

  function curlyLine(x1, y1, x2, y2, col, alpha, t) {{
    // W/Z boson: thick dashed-curly
    const steps = 80;
    const drawSteps = Math.floor(steps * t);
    p.stroke(col[0], col[1], col[2], alpha);
    p.strokeWeight(3);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= drawSteps; i++) {{
      const frac = i / steps;
      const wx = p.lerp(x1, x2, frac);
      const wy = p.lerp(y1, y2, frac);
      const dx = x2 - x1, dy = y2 - y1;
      const len = p.sqrt(dx*dx + dy*dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const wave = 8 * p.sin(frac * p.PI * 10);
      p.curveVertex(wx + nx * wave, wy + ny * wave);
    }}
    p.endShape();
  }}

  function label(x, y, txt, col, size) {{
    p.noStroke();
    p.fill(col[0], col[1], col[2]);
    p.textSize(size || 14);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(txt, x, y);
  }}

  function vertex(x, y) {{
    p.noStroke();
    p.fill(255, 220, 80, 200);
    p.ellipse(x, y, 10, 10);
  }}

  // ── Diagram renderers ────────────────────────────────────────────────────

  function drawBetaMinus(t) {{
    // n → p + e⁻ + ν̄ₑ via W⁻
    const cx = p.width / 2;
    // incoming neutron
    arrow(cx - 240, H/2 - 60, cx - 60, H/2 - 60, [100,180,255], 255, p.min(t*3,1));
    // neutron label
    if (t > 0.1) label(cx - 240, H/2 - 80, "n", [150,210,255], 15);
    // W⁻ boson (vertical-ish)
    if (t > 0.33) curlyLine(cx - 60, H/2 - 60, cx + 40, H/2 + 60, [255,140,60], 240, p.min((t-0.33)*3,1));
    if (t > 0.4) label(cx - 20, H/2 + 10, "W⁻", [255,160,80], 14);
    // outgoing proton
    if (t > 0.33) arrow(cx - 60, H/2 - 60, cx + 140, H/2 - 130, [100,255,120], 255, p.min((t-0.33)*3,1));
    if (t > 0.5) label(cx + 150, H/2 - 148, "p", [130,255,140], 15);
    // outgoing electron
    if (t > 0.66) arrow(cx + 40, H/2 + 60, cx + 180, H/2 + 20, [255,80,80], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 195, H/2 + 20, "e⁻", [255,100,100], 15);
    // outgoing antineutrino
    if (t > 0.66) arrow(cx + 40, H/2 + 60, cx + 180, H/2 + 110, [200,200,80], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 196, H/2 + 110, "ν̄ₑ", [220,220,80], 15);
    // vertices
    if (t > 0.35) vertex(cx - 60, H/2 - 60);
    if (t > 0.68) vertex(cx + 40, H/2 + 60);
    // quark level inset
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 90, 220, 72, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Quark level:", 24, H - 86);
      p.text("d  →  u  +  W⁻", 24, H - 70);
      p.text("W⁻ →  e⁻ + ν̄ₑ", 24, H - 54);
      p.text("Weak interaction (violates strangeness ok)", 24, H - 38);
    }}
  }}

  function drawBetaPlus(t) {{
    // p → n + e⁺ + νₑ via W⁺
    const cx = p.width / 2;
    arrow(cx - 240, H/2 - 60, cx - 60, H/2 - 60, [130,255,140], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 240, H/2 - 80, "p", [150,255,160], 15);
    if (t > 0.33) curlyLine(cx - 60, H/2 - 60, cx + 40, H/2 + 60, [255,140,60], 240, p.min((t-0.33)*3,1));
    if (t > 0.4) label(cx - 20, H/2 + 10, "W⁺", [255,160,80], 14);
    if (t > 0.33) arrow(cx - 60, H/2 - 60, cx + 140, H/2 - 130, [100,180,255], 255, p.min((t-0.33)*3,1));
    if (t > 0.5) label(cx + 150, H/2 - 148, "n", [130,200,255], 15);
    if (t > 0.66) arrow(cx + 40, H/2 + 60, cx + 180, H/2 + 20, [255,120,120], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 195, H/2 + 20, "e⁺", [255,140,140], 15);
    if (t > 0.66) arrow(cx + 40, H/2 + 60, cx + 180, H/2 + 110, [200,200,80], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 196, H/2 + 110, "νₑ", [220,220,80], 15);
    if (t > 0.35) vertex(cx - 60, H/2 - 60);
    if (t > 0.68) vertex(cx + 40, H/2 + 60);
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 90, 220, 72, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Quark level:", 24, H - 86);
      p.text("u  →  d  +  W⁺", 24, H - 70);
      p.text("W⁺ →  e⁺ + νₑ", 24, H - 54);
      p.text("Weak interaction", 24, H - 38);
    }}
  }}

  function drawElectronCapture(t) {{
    // p + e⁻ → n + νₑ via W⁺
    const cx = p.width / 2;
    // incoming proton
    arrow(cx - 240, H/2 - 50, cx, H/2, [130,255,140], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 250, H/2 - 64, "p", [150,255,160], 15);
    // incoming electron (from above)
    arrow(cx - 240, H/2 + 50, cx, H/2, [255,80,80], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 250, H/2 + 64, "e⁻", [255,100,100], 15);
    // W⁺ (virtual, short)
    if (t > 0.4) curlyLine(cx, H/2, cx + 30, H/2 - 40, [255,140,60], 200, p.min((t-0.4)*3,1));
    if (t > 0.55) label(cx + 50, H/2 - 50, "W⁺", [255,160,80], 12);
    // outgoing neutron
    if (t > 0.5) arrow(cx, H/2, cx + 200, H/2 - 40, [100,180,255], 255, p.min((t-0.5)*3,1));
    if (t > 0.7) label(cx + 210, H/2 - 54, "n", [130,200,255], 15);
    // outgoing neutrino
    if (t > 0.5) arrow(cx, H/2, cx + 200, H/2 + 40, [200,200,80], 255, p.min((t-0.5)*3,1));
    if (t > 0.7) label(cx + 210, H/2 + 54, "νₑ", [220,220,80], 15);
    if (t > 0.45) vertex(cx, H/2);
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 76, 230, 58, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Electron capture: p + e⁻ → n + νₑ", 24, H - 72);
      p.text("Inner-shell electron absorbed by proton", 24, H - 56);
      p.text("Weak interaction via W⁺ boson", 24, H - 40);
    }}
  }}

  function drawAnnihilation(t) {{
    // e⁺ + e⁻ → 2γ
    const cx = p.width / 2;
    arrow(cx - 220, H/2 - 60, cx, H/2, [255,80,80], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 230, H/2 - 76, "e⁻", [255,100,100], 15);
    arrow(cx - 220, H/2 + 60, cx, H/2, [255,120,120], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 230, H/2 + 76, "e⁺", [255,140,140], 15);
    // virtual photon
    if (t > 0.4) wavyLine(cx, H/2, cx + 40, H/2, [255,220,50], 200, p.min((t-0.4)*5,1), 8);
    if (t > 0.5) label(cx + 22, H/2 - 22, "γ*", [255,230,80], 12);
    // two outgoing photons
    if (t > 0.55) wavyLine(cx + 40, H/2, cx + 220, H/2 - 70, [255,220,50], 240, p.min((t-0.55)*3,1), 10);
    if (t > 0.55) wavyLine(cx + 40, H/2, cx + 220, H/2 + 70, [255,220,50], 240, p.min((t-0.55)*3,1), 10);
    if (t > 0.8) label(cx + 230, H/2 - 84, "γ", [255,230,80], 15);
    if (t > 0.8) label(cx + 230, H/2 + 84, "γ", [255,230,80], 15);
    if (t > 0.45) vertex(cx, H/2);
    if (t > 0.58) vertex(cx + 40, H/2);
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 76, 270, 58, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("e⁺ + e⁻ → 2γ  (electromagnetic)", 24, H - 72);
      p.text("Total energy = 2 × 0.511 MeV = 1.022 MeV", 24, H - 56);
      p.text("Two photons required to conserve momentum", 24, H - 40);
    }}
  }}

  function drawMuonDecay(t) {{
    // μ⁻ → e⁻ + ν̄ₑ + νμ via W⁻
    const cx = p.width / 2;
    arrow(cx - 240, H/2, cx - 40, H/2, [180,100,255], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 250, H/2 - 18, "μ⁻", [190,120,255], 15);
    if (t > 0.33) curlyLine(cx - 40, H/2, cx + 60, H/2 + 70, [255,140,60], 240, p.min((t-0.33)*3,1));
    if (t > 0.4) label(cx + 18, H/2 + 44, "W⁻", [255,160,80], 13);
    if (t > 0.33) arrow(cx - 40, H/2, cx + 160, H/2 - 80, [200,200,80], 255, p.min((t-0.33)*3,1));
    if (t > 0.5) label(cx + 172, H/2 - 96, "νμ", [220,220,80], 15);
    if (t > 0.66) arrow(cx + 60, H/2 + 70, cx + 200, H/2 + 10, [255,80,80], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 212, H/2 + 10, "e⁻", [255,100,100], 15);
    if (t > 0.66) arrow(cx + 60, H/2 + 70, cx + 200, H/2 + 130, [200,200,80], 255, p.min((t-0.66)*3,1));
    if (t > 0.8) label(cx + 212, H/2 + 130, "ν̄ₑ", [220,220,80], 15);
    if (t > 0.35) vertex(cx - 40, H/2);
    if (t > 0.68) vertex(cx + 60, H/2 + 70);
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 76, 280, 58, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("μ⁻ → e⁻ + ν̄ₑ + νμ  (weak)", 24, H - 72);
      p.text("Lepton number conserved per family", 24, H - 56);
      p.text("L_μ: 1 → 0 + 0 + 1 = 1 ✓   L_e: 0 → 1 + (−1) + 0 = 0 ✓", 24, H - 40);
    }}
  }}

  function drawCompton(t) {{
    // e⁻ + γ → e⁻ + γ (Compton scattering)
    const cx = p.width / 2;
    // incoming electron (from left, moving right)
    arrow(cx - 230, H/2 + 60, cx - 20, H/2, [255,80,80], 255, p.min(t*3,1));
    if (t > 0.1) label(cx - 238, H/2 + 78, "e⁻", [255,100,100], 15);
    // incoming photon (from upper left)
    if (t > 0.1) wavyLine(cx - 230, H/2 - 60, cx - 20, H/2, [255,220,50], 240, p.min((t-0.1)*3,1), 10);
    if (t > 0.15) label(cx - 238, H/2 - 78, "γ", [255,230,80], 15);
    // vertex
    if (t > 0.4) vertex(cx - 20, H/2);
    // virtual electron propagator
    if (t > 0.45) arrow(cx - 20, H/2, cx + 20, H/2, [255,80,80], 180, p.min((t-0.45)*5,1));
    if (t > 0.55) vertex(cx + 20, H/2);
    // outgoing electron (lower right)
    if (t > 0.55) arrow(cx + 20, H/2, cx + 220, H/2 + 70, [255,80,80], 255, p.min((t-0.55)*3,1));
    if (t > 0.72) label(cx + 228, H/2 + 86, "e⁻", [255,100,100], 15);
    // outgoing photon (upper right)
    if (t > 0.55) wavyLine(cx + 20, H/2, cx + 220, H/2 - 70, [255,220,50], 240, p.min((t-0.55)*3,1), 10);
    if (t > 0.72) label(cx + 228, H/2 - 86, "γ'", [255,230,80], 15);
    if (t > 0.9) {{
      p.fill(20, 30, 50, 200);
      p.noStroke();
      p.rect(16, H - 76, 290, 58, 6);
      p.fill(180, 200, 255);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Compton scattering: e⁻ + γ → e⁻ + γ'", 24, H - 72);
      p.text("Outgoing photon has longer wavelength (lower energy)", 24, H - 56);
      p.text("Δλ = (h/m_e c)(1 − cosθ)  electromagnetic interaction", 24, H - 40);
    }}
  }}

  p.draw = function() {{
    p.background(14, 17, 23);

    // subtle grid
    p.stroke(35, 38, 50);
    p.strokeWeight(1);
    for (let x = 0; x < p.width; x += 40) p.line(x, 0, x, H);
    for (let y = 0; y < H; y += 40) p.line(0, y, p.width, y);

    // Time axis
    p.stroke(80, 90, 110);
    p.strokeWeight(1);
    p.line(40, H - 28, p.width - 40, H - 28);
    p.noStroke();
    p.fill(120, 130, 150);
    p.textSize(11);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text("earlier", 44, H - 30);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text("later →", p.width - 44, H - 30);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text("time →", p.width / 2, H - 30);

    // advance animation
    if (!done) {{
      animT = p.min(animT + 0.004, 1.0);
      if (animT >= 1.0) done = true;
    }}

    // dispatch to diagram renderer
    if (DIAGRAM === "beta_minus")       drawBetaMinus(animT);
    else if (DIAGRAM === "beta_plus")   drawBetaPlus(animT);
    else if (DIAGRAM === "electron_capture") drawElectronCapture(animT);
    else if (DIAGRAM === "annihilation")    drawAnnihilation(animT);
    else if (DIAGRAM === "muon_decay")      drawMuonDecay(animT);
    else if (DIAGRAM === "compton")         drawCompton(animT);

    // Title
    p.fill(200, 200, 200, 150);
    p.textSize(10);
    p.textAlign(p.RIGHT, p.TOP);
    p.noStroke();
    p.text("Feynman diagram — time flows left to right", p.width - 10, 8);
  }};
}});
</script>
</body>
</html>"""


# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    mode = mode_toggle()
    st.divider()
    st.markdown("**About this simulation**")
    st.caption(
        "Explore the Standard Model particles, build and test particle "
        "reactions using conservation laws, and visualise interactions as "
        "Feynman diagrams."
    )
    if mode == "Advanced":
        advanced_divider()
        st.caption(
            "Advanced mode shows quark-level details, strangeness, and "
            "additional decay channels."
        )

# ── Page header ───────────────────────────────────────────────────────────────

sim_header("Particle Physics", SPEC_REF)

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab_table, tab_checker, tab_feynman = st.tabs([
    "🔵 Particle Table & Quarks",
    "⚖️ Conservation Law Checker",
    "〰️ Feynman Diagrams",
])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — PARTICLE TABLE & QUARKS
# ══════════════════════════════════════════════════════════════════════════════

with tab_table:
    st.markdown("### Standard Model Particles")
    st.caption(
        "The Standard Model organises all fundamental particles into quarks, "
        "leptons, and force-carrying gauge bosons."
    )

    # ── Quark cards ──────────────────────────────────────────────────────────

    st.markdown("#### Quarks  *(spin 1/2, fractional charge)*")
    quark_cols = st.columns(6)
    for col, (name, data) in zip(quark_cols, QUARKS.items()):
        with col:
            st.markdown(
                f"<div style='"
                f"background:{data['colour']}22;"
                f"border:2px solid {data['colour']};"
                f"border-radius:8px;padding:8px 4px;text-align:center;"
                f"min-height:110px'>"
                f"<div style='font-size:2em;font-weight:bold;color:{data['colour']}'>"
                f"{data['symbol']}</div>"
                f"<div style='font-size:0.85em;color:#ccc'>{name}</div>"
                f"<div style='font-size:0.8em;color:#aaa'>Q = {data['charge']}</div>"
                f"<div style='font-size:0.75em;color:#888'>{data['mass']}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )

    # ── Lepton cards ─────────────────────────────────────────────────────────

    st.markdown("#### Leptons  *(spin 1/2, integer charge)*")
    lepton_colours = ["#e74c3c", "#e74c3c", "#e74c3c", "#9b59b6", "#9b59b6", "#9b59b6"]
    lepton_cols = st.columns(6)
    for col, (name, data), lc in zip(lepton_cols, LEPTONS.items(), lepton_colours):
        with col:
            st.markdown(
                f"<div style='"
                f"background:{lc}22;"
                f"border:2px solid {lc};"
                f"border-radius:8px;padding:8px 4px;text-align:center;"
                f"min-height:110px'>"
                f"<div style='font-size:1.8em;font-weight:bold;color:{lc}'>"
                f"{data['symbol']}</div>"
                f"<div style='font-size:0.85em;color:#ccc'>{name}</div>"
                f"<div style='font-size:0.8em;color:#aaa'>Q = {data['charge']}</div>"
                f"<div style='font-size:0.75em;color:#888'>{data['mass']}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )

    # ── Gauge boson cards ─────────────────────────────────────────────────────

    st.markdown("#### Gauge Bosons  *(spin 1, force carriers)*")
    boson_colours = {"photon": "#f1c40f", "W boson": "#e67e22", "Z boson": "#e67e22", "gluon": "#2ecc71"}
    boson_cols = st.columns(4)
    for col, (name, data) in zip(boson_cols, GAUGE_BOSONS.items()):
        bc = boson_colours.get(name, "#ffffff")
        with col:
            st.markdown(
                f"<div style='"
                f"background:{bc}22;"
                f"border:2px solid {bc};"
                f"border-radius:8px;padding:8px 4px;text-align:center;"
                f"min-height:120px'>"
                f"<div style='font-size:2em;font-weight:bold;color:{bc}'>"
                f"{data['symbol']}</div>"
                f"<div style='font-size:0.85em;color:#ccc'>{name}</div>"
                f"<div style='font-size:0.8em;color:#aaa'>Q = {data['charge']}</div>"
                f"<div style='font-size:0.75em;color:#888'>{data['mass']}</div>"
                f"<div style='font-size:0.75em;color:#777'>{data['force']}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )

    st.divider()

    # ── Hadron composition table ──────────────────────────────────────────────

    st.markdown("#### Hadron Quark Compositions")
    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**Baryons** *(3 quarks, B = 1)*")
        baryon_data = [
            {"Hadron": "Proton (p)",    "Symbol": "p",   "Quarks": "uud", "Charge": "+1", "B": 1, "S": 0},
            {"Hadron": "Neutron (n)",   "Symbol": "n",   "Quarks": "udd", "Charge": "0",  "B": 1, "S": 0},
            {"Hadron": "Lambda (Λ⁰)",  "Symbol": "Λ⁰",  "Quarks": "uds", "Charge": "0",  "B": 1, "S": -1},
            {"Hadron": "Sigma (Σ⁺)",   "Symbol": "Σ⁺",  "Quarks": "uus", "Charge": "+1", "B": 1, "S": -1},
            {"Hadron": "Antiproton",    "Symbol": "p̄",  "Quarks": "ūūd̄","Charge": "−1", "B": -1,"S": 0},
        ]
        st.dataframe(baryon_data, use_container_width=True, hide_index=True)

    with col_b:
        st.markdown("**Mesons** *(quark + antiquark, B = 0)*")
        meson_data = [
            {"Hadron": "Pion (π⁺)",   "Symbol": "π⁺",  "Quarks": "ud̄",  "Charge": "+1", "B": 0, "S": 0},
            {"Hadron": "Pion (π⁻)",   "Symbol": "π⁻",  "Quarks": "ūd",  "Charge": "−1", "B": 0, "S": 0},
            {"Hadron": "Pion (π⁰)",   "Symbol": "π⁰",  "Quarks": "uū/dd̄","Charge": "0",  "B": 0, "S": 0},
            {"Hadron": "Kaon (K⁺)",   "Symbol": "K⁺",  "Quarks": "us̄",  "Charge": "+1", "B": 0, "S": +1},
            {"Hadron": "Kaon (K⁻)",   "Symbol": "K⁻",  "Quarks": "ūs",  "Charge": "−1", "B": 0, "S": -1},
        ]
        st.dataframe(meson_data, use_container_width=True, hide_index=True)

    # ── p5.js quark animation ─────────────────────────────────────────────────

    st.divider()
    st.markdown("#### Quark Confinement Animation")
    st.caption(
        "Quarks (coloured circles) bounce freely then bind together via gluon "
        "exchange (wavy spring lines) to form hadrons. "
        "The animation cycles through proton, neutron, and mesons."
    )
    components.html(build_particle_table_animation(), height=440, scrolling=False)

    # Physics notes
    physics_notes(
        spec_ref=SPEC_REF,
        equations=[
            r"Q_{\text{proton}} = \tfrac{2}{3} + \tfrac{2}{3} - \tfrac{1}{3} = +1",
            r"Q_{\text{neutron}} = \tfrac{2}{3} - \tfrac{1}{3} - \tfrac{1}{3} = 0",
            r"B = +\tfrac{1}{3} \text{ per quark}, \quad B = -\tfrac{1}{3} \text{ per antiquark}",
        ],
        explanation=(
            "Quarks come in six flavours and always appear in bound states (hadrons) "
            "due to quark confinement — isolated quarks are never observed. Baryons "
            "contain three quarks (B = 1); mesons contain one quark and one antiquark "
            "(B = 0). The strong nuclear force between quarks is mediated by gluons."
        ),
        advanced_text=(
            "The residual strong force between hadrons (nuclear force) is a leak of "
            "the colour force — analogous to van der Waals forces being a residual "
            "electromagnetic interaction. Pions act as the exchange particle for the "
            "residual strong force at low energies (Yukawa theory)."
        ),
        mode=mode,
    )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — CONSERVATION LAW CHECKER
# ══════════════════════════════════════════════════════════════════════════════

with tab_checker:
    st.markdown("### Conservation Law Checker")
    st.caption(
        "Build a particle reaction using the dropdowns below, then check "
        "whether each conservation law is satisfied."
    )

    # ── Load example reaction ─────────────────────────────────────────────────

    example_choice = st.selectbox(
        "Load example reaction",
        ["(custom)"] + list(EXAMPLE_REACTIONS.keys()),
        key="example_select",
    )

    if example_choice != "(custom)":
        ex = EXAMPLE_REACTIONS[example_choice]
        st.info(ex["description"])
        preset_reactants = ex["reactants"]
        preset_products  = ex["products"]
    else:
        preset_reactants = ["neutron"]
        preset_products  = ["proton", "electron", "antineutrino_e"]

    st.divider()

    # ── Reactant / product builders ───────────────────────────────────────────

    left_col, arrow_col, right_col = st.columns([5, 1, 5])

    with left_col:
        st.markdown("**Reactants (left side)**")
        n_reactants = st.number_input(
            "Number of reactants", min_value=1, max_value=4, value=len(preset_reactants),
            key="n_react",
        )
        reactant_keys = []
        for i in range(int(n_reactants)):
            default_idx = list(PARTICLES.keys()).index(preset_reactants[i]) \
                if i < len(preset_reactants) and preset_reactants[i] in PARTICLES else 0
            choice = st.selectbox(
                f"Reactant {i + 1}",
                options=list(PARTICLES.keys()),
                format_func=lambda k: PARTICLE_DISPLAY[k],
                index=default_idx,
                key=f"react_{i}",
            )
            reactant_keys.append(choice)

    with arrow_col:
        st.markdown("<div style='padding-top:3em;text-align:center;font-size:2em'>→</div>",
                    unsafe_allow_html=True)

    with right_col:
        st.markdown("**Products (right side)**")
        n_products = st.number_input(
            "Number of products", min_value=1, max_value=5, value=len(preset_products),
            key="n_prod",
        )
        product_keys = []
        for i in range(int(n_products)):
            default_idx = list(PARTICLES.keys()).index(preset_products[i]) \
                if i < len(preset_products) and preset_products[i] in PARTICLES else 0
            choice = st.selectbox(
                f"Product {i + 1}",
                options=list(PARTICLES.keys()),
                format_func=lambda k: PARTICLE_DISPLAY[k],
                index=default_idx,
                key=f"prod_{i}",
            )
            product_keys.append(choice)

    # ── Compute totals ────────────────────────────────────────────────────────

    react_totals = sum_qn(reactant_keys)
    prod_totals  = sum_qn(product_keys)

    # ── Display reaction ──────────────────────────────────────────────────────

    st.divider()
    react_str = " + ".join(PARTICLES[k]["symbol"] for k in reactant_keys)
    prod_str  = " + ".join(PARTICLES[k]["symbol"] for k in product_keys)
    st.markdown(
        f"<div style='font-size:1.5em;text-align:center;padding:0.5em 0'>"
        f"<b>{react_str}</b>  →  <b>{prod_str}</b>"
        f"</div>",
        unsafe_allow_html=True,
    )

    # ── Conservation law results ──────────────────────────────────────────────

    st.markdown("#### Conservation Law Check")

    laws = [
        ("Charge  Q",          "Q", "Always conserved",                    True),
        ("Baryon number  B",   "B", "Always conserved",                    True),
        ("Lepton number  L",   "L", "Always conserved",                    True),
        ("Strangeness  S",     "S", "Conserved in strong; NOT in weak",    None),
    ]

    all_pass = True
    check_cols = st.columns(4)
    for col, (name, qn, rule, _) in zip(check_cols, laws):
        before = react_totals[qn]
        after  = prod_totals[qn]
        conserved = (before == after)
        if qn == "S" and not conserved:
            icon  = "⚠️"
            color = "#f39c12"
            msg   = f"{before} → {after} (weak OK)"
        elif conserved:
            icon  = "✅"
            color = "#2ecc71"
            msg   = f"{before} = {after}"
        else:
            icon  = "❌"
            color = "#e74c3c"
            msg   = f"{before} ≠ {after}  FORBIDDEN"
            all_pass = False
        with col:
            st.markdown(
                f"<div style='border:2px solid {color};border-radius:8px;"
                f"padding:12px;text-align:center;background:{color}22'>"
                f"<div style='font-size:1.8em'>{icon}</div>"
                f"<div style='font-weight:bold;color:#fff'>{name}</div>"
                f"<div style='color:{color};font-size:0.9em'>{msg}</div>"
                f"<div style='color:#888;font-size:0.75em;margin-top:4px'>{rule}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )

    # ── Overall verdict ───────────────────────────────────────────────────────

    st.divider()
    react_S = react_totals["S"]
    prod_S  = prod_totals["S"]
    s_changed = (react_S != prod_S)

    if (react_totals["Q"] == prod_totals["Q"] and
            react_totals["B"] == prod_totals["B"] and
            react_totals["L"] == prod_totals["L"]):
        if not s_changed:
            st.success("**Reaction ALLOWED** — all conservation laws satisfied. "
                       "Possible via strong, weak, or electromagnetic interaction.")
        else:
            st.warning(
                "**Reaction ALLOWED only via weak interaction** — Q, B, L conserved "
                f"but strangeness changes (ΔS = {prod_S - react_S}). "
                "Strangeness is NOT conserved in weak interactions."
            )
    else:
        st.error("**Reaction FORBIDDEN** — one or more conservation laws violated.")

    # ── Quantum number table ──────────────────────────────────────────────────

    if mode == "Advanced":
        advanced_divider()
        st.markdown("**Quantum number breakdown**")
        qn_rows = []
        for k in reactant_keys:
            p_data = PARTICLES[k]
            row = {
                "Particle": p_data["symbol"],
                "Role": "Reactant",
                "Q": p_data["Q"],
                "B": p_data["B"],
                "L": p_data["L"],
                "S": p_data["S"],
            }
            if "quarks" in p_data:
                row["Quarks"] = p_data["quarks"]
            qn_rows.append(row)
        for k in product_keys:
            p_data = PARTICLES[k]
            row = {
                "Particle": p_data["symbol"],
                "Role": "Product",
                "Q": p_data["Q"],
                "B": p_data["B"],
                "L": p_data["L"],
                "S": p_data["S"],
            }
            if "quarks" in p_data:
                row["Quarks"] = p_data["quarks"]
            qn_rows.append(row)

        # Totals row
        qn_rows.append({
            "Particle": "TOTAL →",
            "Role": "Before",
            "Q": react_totals["Q"],
            "B": react_totals["B"],
            "L": react_totals["L"],
            "S": react_totals["S"],
        })
        qn_rows.append({
            "Particle": "TOTAL →",
            "Role": "After",
            "Q": prod_totals["Q"],
            "B": prod_totals["B"],
            "L": prod_totals["L"],
            "S": prod_totals["S"],
        })
        st.dataframe(qn_rows, use_container_width=True, hide_index=True)

    physics_notes(
        spec_ref=SPEC_REF,
        equations=[
            r"\sum Q_{\text{before}} = \sum Q_{\text{after}}",
            r"\sum B_{\text{before}} = \sum B_{\text{after}}",
            r"\sum L_{\text{before}} = \sum L_{\text{after}}",
            r"\Delta S = 0 \text{ (strong)}, \quad \Delta S = \pm 1 \text{ (weak allowed)}",
        ],
        explanation=(
            "In every particle interaction, charge (Q), baryon number (B), and "
            "lepton number (L) are always conserved. Strangeness (S) is conserved "
            "in strong interactions but may change by ±1 in weak interactions. "
            "A reaction that violates Q, B, or L is absolutely forbidden."
        ),
        advanced_text=(
            "Lepton number is separately conserved for each lepton family (electron, "
            "muon, tau). This means μ⁻ → e⁻ + γ is forbidden even though overall "
            "lepton number and charge are conserved, because L_μ would change. "
            "CPT symmetry requires that for every allowed process, the charge- and "
            "parity-conjugate process is also allowed."
        ),
        mode=mode,
    )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — FEYNMAN DIAGRAMS
# ══════════════════════════════════════════════════════════════════════════════

with tab_feynman:
    st.markdown("### Feynman Diagrams")
    st.caption(
        "Feynman diagrams are pictorial representations of particle interactions. "
        "Time runs left to right. Fermions are straight arrows; photons are wavy "
        "lines; W and Z bosons are curly lines."
    )

    diagram_name = st.selectbox(
        "Select interaction",
        list(FEYNMAN_DIAGRAMS.keys()),
        key="feynman_select",
    )
    diagram_key = FEYNMAN_DIAGRAMS[diagram_name]

    # Legend row
    leg_col1, leg_col2, leg_col3 = st.columns(3)
    with leg_col1:
        st.markdown(
            "<span style='color:#64a0e0'>&#9472;&#9658;</span> "
            "**Fermion** (straight arrow)",
            unsafe_allow_html=True,
        )
    with leg_col2:
        st.markdown(
            "<span style='color:#f5d020'>〰</span> "
            "**Photon γ** (wavy line)",
            unsafe_allow_html=True,
        )
    with leg_col3:
        st.markdown(
            "<span style='color:#ff8c00'>≋</span> "
            "**W / Z boson** (curly line)",
            unsafe_allow_html=True,
        )

    st.markdown(
        "<span style='color:#ffd040'>●</span> "
        " Filled dot = interaction **vertex**",
        unsafe_allow_html=True,
    )

    # Diagram description
    descriptions = {
        "beta_minus": (
            "**β⁻ decay** — a down quark in the neutron converts to an up quark, "
            "emitting a virtual W⁻ boson. The W⁻ decays to an electron and an "
            "electron antineutrino."
        ),
        "beta_plus": (
            "**β⁺ decay** — an up quark in the proton converts to a down quark, "
            "emitting a virtual W⁺ boson. The W⁺ decays to a positron and an "
            "electron neutrino."
        ),
        "electron_capture": (
            "**Electron capture** — a proton captures an inner-shell electron. "
            "A virtual W⁺ is exchanged; the products are a neutron and an electron "
            "neutrino."
        ),
        "annihilation": (
            "**Electron–positron annihilation** — the particle and antiparticle "
            "annihilate via a virtual photon, producing two real photons. "
            "Two photons are needed to conserve momentum."
        ),
        "muon_decay": (
            "**Muon decay** — the muon decays via a W⁻ boson to an electron, "
            "an electron antineutrino, and a muon neutrino. Both muon lepton "
            "number and electron lepton number are separately conserved."
        ),
        "compton": (
            "**Compton scattering** — an electron absorbs a photon and emits "
            "a lower-energy photon, gaining kinetic energy. The wavelength shift "
            "Δλ = (h/mₑc)(1 − cosθ) demonstrates the particle nature of light."
        ),
    }
    st.info(descriptions.get(diagram_key, ""))

    components.html(build_feynman_animation(diagram_key), height=440, scrolling=False)

    # Conservation summary for selected diagram
    if mode == "Advanced":
        advanced_divider()
        conservation_notes = {
            "beta_minus": {
                "Q": "0 → 1 + (−1) + 0 = 0 ✓",
                "B": "1 → 1 + 0 + 0 = 1 ✓",
                "L": "0 → 0 + 1 + (−1) = 0 ✓",
                "S": "0 → 0 (unchanged) ✓",
            },
            "beta_plus": {
                "Q": "1 → 0 + 1 + 0 = 1 ✓",
                "B": "1 → 1 + 0 + 0 = 1 ✓",
                "L": "0 → 0 + (−1) + 1 = 0 ✓",
                "S": "0 → 0 ✓",
            },
            "electron_capture": {
                "Q": "1 + (−1) = 0 → 0 + 0 = 0 ✓",
                "B": "1 + 0 = 1 → 1 + 0 = 1 ✓",
                "L": "0 + 1 = 1 → 0 + 1 = 1 ✓",
                "S": "0 → 0 ✓",
            },
            "annihilation": {
                "Q": "(−1) + 1 = 0 → 0 + 0 = 0 ✓",
                "B": "0 + 0 = 0 → 0 + 0 = 0 ✓",
                "L": "1 + (−1) = 0 → 0 + 0 = 0 ✓",
                "S": "0 → 0 ✓",
            },
            "muon_decay": {
                "Q": "−1 → −1 + 0 + 0 = −1 ✓",
                "B": "0 → 0 ✓",
                "L_e": "0 → 1 + (−1) + 0 = 0 ✓",
                "L_μ": "1 → 0 + 0 + 1 = 1 ✓",
            },
            "compton": {
                "Q": "−1 + 0 → −1 + 0 ✓",
                "B": "0 → 0 ✓",
                "L": "1 → 1 ✓",
                "Note": "Energy–momentum conserved; outgoing γ has lower energy",
            },
        }
        cn = conservation_notes.get(diagram_key, {})
        if cn:
            st.markdown("**Conservation checks for this diagram:**")
            for law, check in cn.items():
                st.markdown(f"- **{law}:** {check}")

    physics_notes(
        spec_ref=SPEC_REF,
        equations=[
            r"n \rightarrow p + e^{-} + \bar{\nu}_e \quad (\beta^{-})",
            r"p \rightarrow n + e^{+} + \nu_e \quad (\beta^{+})",
            r"p + e^{-} \rightarrow n + \nu_e \quad \text{(electron capture)}",
            r"e^{+} + e^{-} \rightarrow 2\gamma \quad \text{(annihilation)}",
        ],
        explanation=(
            "Feynman diagrams provide an intuitive way to visualise particle "
            "interactions. Each diagram represents a sum of quantum amplitudes. "
            "Vertices represent interaction points where the coupling constant "
            "determines the probability. Virtual particles (internal lines) do "
            "not need to satisfy E² = (pc)² + (mc²)² — they are off shell."
        ),
        advanced_text=(
            "The amplitude for each Feynman diagram is proportional to the "
            "coupling constant at each vertex (e for electromagnetic, g_W for "
            "weak). Higher-order diagrams (loops) contribute smaller corrections. "
            "QED (quantum electrodynamics) predictions agree with experiment to "
            "one part in 10¹² — the most precisely tested theory in physics."
        ),
        mode=mode,
    )


# ── Exam questions ────────────────────────────────────────────────────────────

questions = [
    {
        "q": "State the quark composition of (a) a proton and (b) a neutron. Give the charge of each quark.",
        "marks": 4,
        "answer": "(a) Proton: uud. (b) Neutron: udd. u quark: +2/3 e, d quark: −1/3 e.",
        "working": [
            "Proton charge = 2/3 + 2/3 − 1/3 = +1 ✓",
            "Neutron charge = 2/3 − 1/3 − 1/3 = 0 ✓",
        ],
    },
    {
        "q": "Show that the following β⁻ decay conserves charge, baryon number and lepton number: n → p + e⁻ + ν̄ₑ",
        "marks": 3,
        "answer": "All three conservation laws hold.",
        "working": [
            "Charge: 0 → 1 + (−1) + 0 = 0 ✓",
            "Baryon number: 1 → 1 + 0 + 0 = 1 ✓",
            "Lepton number: 0 → 0 + 1 + (−1) = 0 ✓",
        ],
    },
    {
        "q": "A particle interaction produces a K⁺ meson (strangeness S = +1). State which fundamental force is responsible and explain why.",
        "marks": 2,
        "answer": "Strong nuclear force. The strong force conserves strangeness, so a strange quark must be produced (K⁺ = us̄, S = +1 from the s̄).",
        "working": [],
        "hint": "Strangeness is conserved in strong interactions but not in weak.",
    },
    {
        "q": "Determine whether the reaction p → e⁺ + γ is possible. Justify your answer.",
        "marks": 2,
        "answer": "Not possible. Baryon number is not conserved: left side B=1, right side B=0.",
        "working": [
            "B before: proton B=1",
            "B after: positron B=0, photon B=0, total B=0",
            "B not conserved → forbidden",
        ],
    },
]

show_exam_panel(questions)
