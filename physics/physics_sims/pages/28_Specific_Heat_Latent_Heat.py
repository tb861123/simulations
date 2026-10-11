"""
Specific Heat Capacity & Latent Heat — WJEC Eduqas A Level Physics
Component 2, Topic 3 — Thermal Physics (and Component 1 thermal concepts)

Covers:
  - Sensible heat:  Q = mcΔT  (temperature change, specific heat capacity c)
  - Latent heat:    Q = mL    (phase change at constant T; L_f fusion, L_v vaporisation)
  - Power heating:  Q = Pt    (time per stage t = Q/P)
  - The heating curve with two flat plateaus at melting and boiling points
  - Method of mixtures (Advanced): Q_lost = Q_gained energy conservation
"""

from __future__ import annotations

import json
import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
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
    page_title="Specific Heat & Latent Heat — WJEC A Level Physics",
    page_icon="🔥",
    layout="wide",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 3 — Thermal Physics (Specific Heat Capacity & Latent Heat)"

EQUATIONS = [
    r"Q = mc\,\Delta T \quad \text{(sensible heat — temperature change)}",
    r"Q = mL \quad \text{(latent heat — phase change at constant } T\text{)}",
    r"Q = Pt \quad \Rightarrow \quad t = \frac{Q}{P} \quad \text{(heating at power } P\text{)}",
    r"Q_{\text{lost}} = Q_{\text{gained}} \quad \text{(method of mixtures)}",
]

EXPLANATION = (
    "**Specific heat capacity** $c$ is the energy needed to raise the temperature of "
    "1 kg of a substance by 1 K: $Q = mc\\Delta T$. Different states of matter have "
    "different values of $c$ (e.g. ice, liquid water and steam all differ).\n\n"
    "**Specific latent heat** $L$ is the energy needed to change the state of 1 kg of a "
    "substance **without any change in temperature**: $Q = mL$. The latent heat of "
    "**fusion** $L_f$ applies to melting/freezing; the latent heat of **vaporisation** "
    "$L_v$ applies to boiling/condensing.\n\n"
    "**The heating curve** plots temperature against energy supplied. It has sloped "
    "sections (where $Q = mc\\Delta T$ raises the temperature) separated by **flat "
    "plateaus** at the melting and boiling points. During a plateau the temperature "
    "stays constant even though energy is still being supplied — the energy goes into "
    "breaking bonds (increasing potential energy), not into kinetic energy.\n\n"
    "With a heater of power $P$, the time for any stage is $t = Q/P$ since $Q = Pt$."
)

ADVANCED_TEXT = (
    "**Why the temperature plateaus.** Temperature is a measure of the mean kinetic "
    "energy of the particles. During a phase change the supplied energy does work "
    "against the intermolecular forces — separating particles and increasing their "
    "**potential** energy — so the mean kinetic energy (and hence temperature) is "
    "unchanged until the change of state is complete.\n\n"
    "**Latent heat of vaporisation > fusion.** For most substances $L_v \\gg L_f$ "
    "because boiling must completely separate the particles against the full "
    "intermolecular attraction, whereas melting only loosens the rigid lattice. For "
    "water $L_v \\approx 2.26$ MJ/kg vs $L_f \\approx 0.334$ MJ/kg.\n\n"
    "**Method of mixtures.** When a hot body is placed in contact with a cold body in "
    "an insulated system, energy is conserved: the heat lost by the hot body equals the "
    "heat gained by the cold body, $Q_{\\text{lost}} = Q_{\\text{gained}}$. Solving "
    "$m_1 c_1 (T_1 - T_f) = m_2 c_2 (T_f - T_2)$ gives the final equilibrium temperature "
    "$T_f$. This is the basis of the **electrical method** and **method of mixtures** "
    "experiments used to measure specific heat capacities."
)

# ── Substance data ────────────────────────────────────────────────────────────
# c values in J/kg/K, latent heats in J/kg, temperatures in °C.
# bp = None means no boiling point within a sensible heating range (only melts).

SUBSTANCES: dict[str, dict] = {
    "Water": {
        "c_solid": 2100.0, "c_liquid": 4200.0, "c_gas": 2000.0,
        "Lf": 334000.0, "Lv": 2260000.0,
        "mp": 0.0, "bp": 100.0,
        "T_start_range": (-20.0, 20.0), "T_start_default": -10.0,
        "solid_name": "ice", "liquid_name": "water", "gas_name": "steam",
    },
    "Ethanol": {
        "c_solid": 1200.0, "c_liquid": 2440.0, "c_gas": 1430.0,
        "Lf": 108000.0, "Lv": 855000.0,
        "mp": -114.0, "bp": 78.0,
        "T_start_range": (-160.0, -90.0), "T_start_default": -140.0,
        "solid_name": "solid ethanol", "liquid_name": "liquid ethanol", "gas_name": "ethanol vapour",
    },
    "Lead": {
        "c_solid": 130.0, "c_liquid": 140.0, "c_gas": 100.0,
        "Lf": 23000.0, "Lv": 859000.0,
        "mp": 327.0, "bp": 1749.0,
        "T_start_range": (20.0, 300.0), "T_start_default": 25.0,
        "solid_name": "solid lead", "liquid_name": "molten lead", "gas_name": "lead vapour",
    },
    "Aluminium": {
        "c_solid": 900.0, "c_liquid": 1180.0, "c_gas": 900.0,
        "Lf": 397000.0, "Lv": None,          # no boiling point in our range
        "mp": 660.0, "bp": None,
        "T_start_range": (20.0, 600.0), "T_start_default": 25.0,
        "solid_name": "solid aluminium", "liquid_name": "molten aluminium", "gas_name": "aluminium vapour",
    },
}

# Heater power can never be zero — used as a guard floor everywhere.
P_MIN = 100.0


# ── Heating-curve computation ─────────────────────────────────────────────────


def compute_heating_curve(
    mass: float,
    c_solid: float,
    c_liquid: float,
    c_gas: float,
    Lf: float,
    Lv: float | None,
    mp: float,
    bp: float | None,
    T_start: float,
    T_end_extra: float = 60.0,
) -> dict:
    """
    Build the full heating curve (temperature vs cumulative energy) in stages.

    Stages, each appended only if it physically applies:
      1. heat solid from T_start up to mp  (slope, c_solid)        — if T_start < mp
      2. melt at mp                        (flat plateau, m*Lf)    — if T_start < mp
      3. heat liquid from mp up to bp      (slope, c_liquid)       — if bp is not None
      4. boil at bp                        (flat plateau, m*Lv)    — if bp/Lv not None
      5. heat gas above bp                 (slope, c_gas)          — if bp/Lv not None

    Returns a dict with numpy arrays E (J) and T (°C), plus per-stage energies and a
    list of segment descriptors used for plotting/annotation.
    """
    mass = float(max(mass, 1e-6))

    E_list: list[float] = []
    T_list: list[float] = []
    segments: list[dict] = []          # each: type, label, E0, E1, T0, T1, colour
    stage_energy: dict[str, float] = {
        "heat_solid": 0.0, "melt": 0.0, "heat_liquid": 0.0,
        "boil": 0.0, "heat_gas": 0.0,
    }

    E = 0.0

    def add_point(e, t):
        E_list.append(e)
        T_list.append(t)

    # The state we begin in depends on T_start relative to mp / bp.
    add_point(0.0, T_start)
    cur_T = T_start

    # ── Stage 1: heat solid up to melting point ───────────────────────────────
    if T_start < mp:
        Q = mass * c_solid * (mp - T_start)
        stage_energy["heat_solid"] = Q
        segments.append(dict(type="slope", label=f"heat solid (c={c_solid:.0f})",
                             E0=E, E1=E + Q, T0=T_start, T1=mp,
                             colour=COLOURS["quaternary"]))
        E += Q
        add_point(E, mp)
        cur_T = mp

        # ── Stage 2: melting plateau ──────────────────────────────────────────
        Qm = mass * Lf
        stage_energy["melt"] = Qm
        segments.append(dict(type="plateau", label="melting (Q=mL_f)",
                             E0=E, E1=E + Qm, T0=mp, T1=mp,
                             colour=COLOURS["secondary"]))
        E += Qm
        add_point(E, mp)
        cur_T = mp

    # ── Stage 3: heat liquid up to boiling point ──────────────────────────────
    if bp is not None and Lv is not None:
        liquid_start = max(cur_T, mp) if T_start >= mp else mp
        # If we started already as a liquid above mp, begin from T_start.
        if T_start >= mp and T_start < bp:
            liquid_start = T_start
        if liquid_start < bp:
            Q = mass * c_liquid * (bp - liquid_start)
            stage_energy["heat_liquid"] = Q
            segments.append(dict(type="slope", label=f"heat liquid (c={c_liquid:.0f})",
                                 E0=E, E1=E + Q, T0=liquid_start, T1=bp,
                                 colour=COLOURS["primary"]))
            E += Q
            add_point(E, bp)
            cur_T = bp

            # ── Stage 4: boiling plateau ──────────────────────────────────────
            Qb = mass * Lv
            stage_energy["boil"] = Qb
            segments.append(dict(type="plateau", label="boiling (Q=mL_v)",
                                 E0=E, E1=E + Qb, T0=bp, T1=bp,
                                 colour=COLOURS["highlight"]))
            E += Qb
            add_point(E, bp)
            cur_T = bp

            # ── Stage 5: heat gas above boiling point ─────────────────────────
            T_gas_end = bp + T_end_extra
            Q = mass * c_gas * (T_gas_end - bp)
            stage_energy["heat_gas"] = Q
            segments.append(dict(type="slope", label=f"heat gas (c={c_gas:.0f})",
                                 E0=E, E1=E + Q, T0=bp, T1=T_gas_end,
                                 colour=COLOURS["tertiary"]))
            E += Q
            add_point(E, T_gas_end)
            cur_T = T_gas_end
    else:
        # No boiling stage (e.g. Aluminium): just heat the liquid a bit past mp so
        # the curve has a final sloped section showing the liquid warming up.
        liquid_start = max(cur_T, mp) if T_start < mp else max(T_start, mp)
        T_liq_end = liquid_start + T_end_extra
        Q = mass * c_liquid * (T_liq_end - liquid_start)
        stage_energy["heat_liquid"] = Q
        segments.append(dict(type="slope", label=f"heat liquid (c={c_liquid:.0f})",
                             E0=E, E1=E + Q, T0=liquid_start, T1=T_liq_end,
                             colour=COLOURS["primary"]))
        E += Q
        add_point(E, T_liq_end)
        cur_T = T_liq_end

    return dict(
        E=np.array(E_list, dtype=float),
        T=np.array(T_list, dtype=float),
        segments=segments,
        stage_energy=stage_energy,
        total_energy=E,
    )


def build_heating_curve_figure(curve: dict, mass: float, substance: str, power: float):
    """Build the Plotly heating curve: temperature (°C) vs energy supplied (J)."""
    fig = make_fig()

    # Plot each segment in its own colour so plateaus stand out.
    for seg in curve["segments"]:
        fig.add_trace(go.Scatter(
            x=[seg["E0"], seg["E1"]],
            y=[seg["T0"], seg["T1"]],
            mode="lines",
            line=dict(color=seg["colour"], width=4),
            name=seg["label"],
            hovertemplate=(
                f"{seg['label']}<br>Energy: %{{x:.3s}} J<br>"
                "Temp: %{y:.1f} °C<extra></extra>"
            ),
        ))

        # Annotate plateaus with their energy (mL).
        if seg["type"] == "plateau":
            dE = seg["E1"] - seg["E0"]
            fig.add_annotation(
                x=0.5 * (seg["E0"] + seg["E1"]),
                y=seg["T0"],
                text=f"{seg['label']}<br>ΔQ = {dE:.3g} J",
                showarrow=True, arrowhead=2, ax=0, ay=-40,
                font=dict(color=seg["colour"], size=11),
                bordercolor=seg["colour"], borderwidth=1,
                bgcolor="rgba(0,0,0,0.55)",
            )

    fig.update_layout(**plotly_layout(
        title=f"Heating curve — {mass:.2f} kg of {substance} at {power:.0f} W",
        xaxis_title="Energy supplied  Q (J)",
        yaxis_title="Temperature  (°C)",
        height=430,
        showlegend=True,
        legend=dict(orientation="h", y=-0.25, x=0,
                    bgcolor="rgba(0,0,0,0.4)",
                    bordercolor=COLOURS["grid"], borderwidth=1),
    ))
    return fig


# ── p5.js heating animation ───────────────────────────────────────────────────


def build_heating_animation(
    substance: str,
    mass: float,
    power: float,
    c_solid: float,
    c_liquid: float,
    c_gas: float,
    Lf: float,
    Lv: float | None,
    mp: float,
    bp: float | None,
    T_start: float,
) -> str:
    """
    Self-contained p5.js animation of a substance being heated through its phase
    changes, with a live thermometer, particle-state visualisation and a mini
    heating curve that traces out the two flat plateaus at mp and bp.
    """
    data = json.dumps({
        "substance": substance,
        "mass": float(mass),
        "power": float(max(power, P_MIN)),
        "cSolid": float(c_solid),
        "cLiquid": float(c_liquid),
        "cGas": float(c_gas),
        "Lf": float(Lf),
        "Lv": (float(Lv) if Lv is not None else -1.0),
        "mp": float(mp),
        "bp": (float(bp) if bp is not None else 1e9),
        "hasBoil": bool(bp is not None and Lv is not None),
        "Tstart": float(T_start),
    })

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 0; background: #0e1117; overflow: hidden; font-family: sans-serif; }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
const D = {data};

new p5(function(p) {{
  let W = 700, H = 440;

  // ── Layout ────────────────────────────────────────────────────
  const BEAKER_X = 120, BEAKER_W = 220;
  const BEAKER_TOP = 60, BEAKER_BOT = 330;
  const BEAKER_H = BEAKER_BOT - BEAKER_TOP;
  const THERMO_X = 70;
  const GRAPH_X = 400, GRAPH_Y = 70, GRAPH_W = 270, GRAPH_H = 200;

  // ── Physics setup ─────────────────────────────────────────────
  const mass = D.mass;
  const power = D.power;
  const hasBoil = D.hasBoil;
  const mp = D.mp, bp = D.bp;
  const Lf = D.Lf, Lv = D.Lv;

  // Energy thresholds along the heating curve (J), built like the Python version.
  // Stage boundaries: E0 (start) .. solid .. melt .. liquid .. boil .. gas
  const TstartC = D.Tstart;
  const startSolid = TstartC < mp;
  const Eb = [];   // cumulative energy boundaries
  const Tb = [];   // temperature at each boundary
  const segType = []; // 'slope-solid','plateau-melt','slope-liquid','plateau-boil','slope-gas'
  let E = 0;
  Eb.push(0); Tb.push(TstartC);

  if (startSolid) {{
    E += mass * D.cSolid * (mp - TstartC);
    Eb.push(E); Tb.push(mp); segType.push('slope-solid');
    E += mass * Lf;
    Eb.push(E); Tb.push(mp); segType.push('plateau-melt');
  }}
  let liqStart = startSolid ? mp : Math.max(TstartC, mp);
  if (hasBoil) {{
    if (!startSolid && TstartC < bp) liqStart = TstartC;
    E += mass * D.cLiquid * (bp - liqStart);
    Eb.push(E); Tb.push(bp); segType.push('slope-liquid');
    E += mass * Lv;
    Eb.push(E); Tb.push(bp); segType.push('plateau-boil');
    E += mass * D.cGas * 60;
    Eb.push(E); Tb.push(bp + 60); segType.push('slope-gas');
  }} else {{
    E += mass * D.cLiquid * 60;
    Eb.push(E); Tb.push(liqStart + 60); segType.push('slope-liquid');
  }}
  const E_TOTAL = Math.max(E, 1);

  // Temperature range for thermometer / graph axes.
  let T_MIN = Math.min.apply(null, Tb);
  let T_MAX = Math.max.apply(null, Tb);
  if (T_MAX - T_MIN < 1) T_MAX = T_MIN + 1;

  // ── State ─────────────────────────────────────────────────────
  let energy = 0;        // J supplied so far
  let playing = true;
  let speedMul = 1.0;
  let curve = [];        // {{e, t}} traced points for mini graph

  // Particles
  const N = Math.min(80, Math.max(24, Math.round(40 * mass / Math.max(mass, 1))));
  const NP = 54;
  let parts = [];

  // Buttons
  const PLAY = {{x: 400, y: 300, w: 70, h: 28}};
  const SLOW = {{x: 480, y: 300, w: 55, h: 28}};
  const FAST = {{x: 545, y: 300, w: 55, h: 28}};

  p.setup = function() {{
    let cnv = p.createCanvas(W, H);
    p.frameRate(40);
    initParticles();
  }};

  p.windowResized = function() {{
    p.resizeCanvas(W, H);
  }};

  function initParticles() {{
    parts = [];
    for (let i = 0; i < NP; i++) {{
      parts.push({{
        x: p.random(BEAKER_X + 12, BEAKER_X + BEAKER_W - 12),
        y: p.random(BEAKER_BOT - 90, BEAKER_BOT - 12),
        gx: i % 9, gy: Math.floor(i / 9),
        vx: p.random(-1, 1), vy: p.random(-1, 1),
        ph: p.random(p.TWO_PI)
      }});
    }}
  }}

  // Current temperature for a given supplied energy (piecewise from boundaries).
  function tempAt(e) {{
    if (e <= 0) return Tb[0];
    for (let i = 1; i < Eb.length; i++) {{
      if (e <= Eb[i]) {{
        let frac = (e - Eb[i-1]) / Math.max(Eb[i] - Eb[i-1], 1e-9);
        return Tb[i-1] + frac * (Tb[i] - Tb[i-1]);
      }}
    }}
    return Tb[Tb.length - 1];
  }}

  // Which stage are we in? returns the segType string.
  function stageAt(e) {{
    for (let i = 1; i < Eb.length; i++) {{
      if (e <= Eb[i]) return segType[i-1];
    }}
    return segType[segType.length - 1];
  }}

  // Fraction through the current plateau (for the melting/boiling % bar).
  function plateauFrac(e) {{
    for (let i = 1; i < Eb.length; i++) {{
      if (e <= Eb[i]) {{
        return (e - Eb[i-1]) / Math.max(Eb[i] - Eb[i-1], 1e-9);
      }}
    }}
    return 1;
  }}

  p.draw = function() {{
    p.background(14, 17, 23);

    if (playing) {{
      // Advance energy; one full loop takes ~14 s at speed 1.
      energy += (E_TOTAL / (14 * 40)) * speedMul;
      if (energy >= E_TOTAL) {{ energy = 0; curve = []; }}
      let t = tempAt(energy);
      curve.push({{e: energy, t: t}});
      if (curve.length > 400) curve.shift();
    }}

    let T = tempAt(energy);
    let stage = stageAt(energy);

    drawHeater();
    drawBeaker(T, stage);
    drawParticles(T, stage);
    drawThermometer(T);
    drawGraph();
    drawStageLabel(T, stage);
    drawButtons();
  }};

  function drawHeater() {{
    // Glowing coil under the beaker; intensity ∝ power.
    let inten = p.constrain(power / 5000, 0.1, 1);
    p.noStroke();
    for (let g = 0; g < 4; g++) {{
      p.fill(255, 120, 30, 40 * inten);
      p.rect(BEAKER_X - 6, BEAKER_BOT + 6 + g*4, BEAKER_W + 12, 6, 3);
    }}
    p.stroke(255, 80 + 150*inten, 20);
    p.strokeWeight(4);
    let coilY = BEAKER_BOT + 14;
    for (let x = BEAKER_X; x < BEAKER_X + BEAKER_W; x += 16) {{
      let yo = 4 * Math.sin((p.frameCount*0.2) + x*0.3);
      p.line(x, coilY + yo, x + 8, coilY - yo);
    }}
    p.noStroke();
    p.fill(255, 200, 120);
    p.textSize(11); p.textAlign(p.CENTER);
    p.text("Heater: " + power.toFixed(0) + " W", BEAKER_X + BEAKER_W/2, BEAKER_BOT + 36);
  }}

  function drawBeaker(T, stage) {{
    // Container outline.
    p.noFill();
    p.stroke(180, 200, 230);
    p.strokeWeight(3);
    p.line(BEAKER_X, BEAKER_TOP, BEAKER_X, BEAKER_BOT);
    p.line(BEAKER_X + BEAKER_W, BEAKER_TOP, BEAKER_X + BEAKER_W, BEAKER_BOT);
    p.line(BEAKER_X, BEAKER_BOT, BEAKER_X + BEAKER_W, BEAKER_BOT);
    p.noStroke();
  }}

  function drawParticles(T, stage) {{
    // Speed ∝ temperature (mapped 0..1 over the curve range).
    let tnorm = p.constrain((T - T_MIN) / (T_MAX - T_MIN), 0, 1);
    let spd = 0.3 + 3.5 * tnorm;

    let isSolid = (stage === 'slope-solid');
    let isMelt = (stage === 'plateau-melt');
    let isGas = (stage === 'slope-gas');
    let isBoil = (stage === 'plateau-boil');

    // Liquid surface level rises a touch as we heat; gas fills the beaker.
    let latticeX0 = BEAKER_X + BEAKER_W/2 - 4*22;
    let latticeY0 = BEAKER_BOT - 100;

    for (let i = 0; i < parts.length; i++) {{
      let pt = parts[i];
      let col;
      if (isSolid) {{
        // Ordered lattice, vibrating slightly.
        let tx = latticeX0 + pt.gx * 24;
        let ty = latticeY0 + pt.gy * 22;
        let vib = 1.5 + 2.0 * tnorm;
        pt.x += ((tx + vib*Math.sin(p.frameCount*0.3 + pt.ph)) - pt.x) * 0.2;
        pt.y += ((ty + vib*Math.cos(p.frameCount*0.3 + pt.ph)) - pt.y) * 0.2;
        col = [120, 180, 255];
      }} else {{
        // Free movement; gas fills whole beaker, liquid stays in bottom.
        pt.x += pt.vx * spd;
        pt.y += pt.vy * spd;
        let topLimit = isGas ? (BEAKER_TOP + 8) : (isBoil ? BEAKER_TOP + 40 : BEAKER_BOT - 130);
        if (isMelt) topLimit = BEAKER_BOT - 110;
        if (pt.x < BEAKER_X + 8) {{ pt.x = BEAKER_X + 8; pt.vx *= -1; }}
        if (pt.x > BEAKER_X + BEAKER_W - 8) {{ pt.x = BEAKER_X + BEAKER_W - 8; pt.vx *= -1; }}
        if (pt.y < topLimit) {{ pt.y = topLimit; pt.vy *= -1; }}
        if (pt.y > BEAKER_BOT - 8) {{ pt.y = BEAKER_BOT - 8; pt.vy *= -1; }}
        // Re-randomise direction occasionally so motion looks thermal.
        if (p.random() < 0.02) {{
          let a = p.random(p.TWO_PI);
          pt.vx = Math.cos(a); pt.vy = Math.sin(a);
        }}
        col = isGas ? [255, 160, 120] : [120, 200, 255];
      }}
      p.fill(col[0], col[1], col[2]);
      p.noStroke();
      p.circle(pt.x, pt.y, 9);
    }}

    // Rising bubbles during boiling.
    if (isBoil) {{
      p.fill(220, 240, 255, 150);
      for (let b = 0; b < 8; b++) {{
        let bx = BEAKER_X + 20 + ((b * 53 + p.frameCount*2) % (BEAKER_W - 40));
        let by = BEAKER_BOT - 20 - ((p.frameCount*3 + b*40) % 120);
        p.circle(bx, by, 6 + (b % 3) * 3);
      }}
    }}
  }}

  function drawThermometer(T) {{
    let bx = THERMO_X, bTop = BEAKER_TOP + 10, bBot = BEAKER_BOT - 10;
    let bulbR = 14;
    // Tube
    p.stroke(200); p.strokeWeight(2);
    p.fill(20, 24, 30);
    p.rect(bx - 7, bTop, 14, bBot - bTop, 7);
    p.circle(bx, bBot + bulbR - 2, bulbR * 2);
    // Mercury fill ∝ temperature
    let tnorm = p.constrain((T - T_MIN) / (T_MAX - T_MIN), 0, 1);
    let fillTop = bBot - tnorm * (bBot - bTop - 6);
    p.noStroke();
    p.fill(231, 76, 60);
    p.rect(bx - 4, fillTop, 8, bBot - fillTop);
    p.circle(bx, bBot + bulbR - 2, bulbR * 2 - 6);
    // Reading
    p.fill(250); p.textAlign(p.CENTER); p.textSize(13);
    p.text(T.toFixed(0) + "\\u00B0C", bx, bTop - 8);
  }}

  function drawGraph() {{
    // Axes
    p.stroke(90); p.strokeWeight(1);
    p.line(GRAPH_X, GRAPH_Y, GRAPH_X, GRAPH_Y + GRAPH_H);
    p.line(GRAPH_X, GRAPH_Y + GRAPH_H, GRAPH_X + GRAPH_W, GRAPH_Y + GRAPH_H);
    p.noStroke();
    p.fill(180); p.textSize(10); p.textAlign(p.LEFT);
    p.text("T (\\u00B0C)", GRAPH_X + 2, GRAPH_Y - 4);
    p.textAlign(p.RIGHT);
    p.text("energy \\u2192", GRAPH_X + GRAPH_W, GRAPH_Y + GRAPH_H + 14);

    function gx(e) {{ return GRAPH_X + (e / E_TOTAL) * GRAPH_W; }}
    function gy(t) {{ return GRAPH_Y + GRAPH_H - ((t - T_MIN) / (T_MAX - T_MIN)) * GRAPH_H; }}

    // Faint full reference curve (shows the two plateaus).
    p.stroke(120, 130, 150, 120); p.strokeWeight(1.5); p.noFill();
    p.beginShape();
    for (let i = 0; i < Eb.length; i++) p.vertex(gx(Eb[i]), gy(Tb[i]));
    p.endShape();

    // Traced curve so far.
    p.stroke(255, 200, 80); p.strokeWeight(2.5); p.noFill();
    p.beginShape();
    for (let i = 0; i < curve.length; i++) p.vertex(gx(curve[i].e), gy(curve[i].t));
    p.endShape();

    // Moving dot.
    if (curve.length) {{
      let c = curve[curve.length - 1];
      p.noStroke(); p.fill(231, 76, 60);
      p.circle(gx(c.e), gy(c.t), 7);
    }}
  }}

  function drawStageLabel(T, stage) {{
    p.textAlign(p.LEFT); p.textSize(13);
    let label = "", col = [200, 220, 255], frac = -1;
    if (stage === 'slope-solid') {{ label = "Heating solid"; col = [120, 180, 255]; }}
    else if (stage === 'plateau-melt') {{ label = "MELTING \\u2014 latent heat of fusion"; col = [255, 165, 60]; frac = plateauFrac(energy); }}
    else if (stage === 'slope-liquid') {{ label = "Heating liquid"; col = [120, 200, 255]; }}
    else if (stage === 'plateau-boil') {{ label = "BOILING \\u2014 latent heat of vaporisation"; col = [231, 76, 60]; frac = plateauFrac(energy); }}
    else if (stage === 'slope-gas') {{ label = "Heating gas"; col = [120, 220, 140]; }}

    p.fill(col[0], col[1], col[2]);
    p.text(label, 30, 28);

    if (frac >= 0) {{
      // Progress bar + percentage while temperature HOLDS.
      let bx = 30, by = 36, bw = 300, bh = 12;
      p.noFill(); p.stroke(col[0], col[1], col[2]); p.strokeWeight(1);
      p.rect(bx, by, bw, bh, 4);
      p.noStroke(); p.fill(col[0], col[1], col[2]);
      p.rect(bx, by, bw * p.constrain(frac, 0, 1), bh, 4);
      p.fill(250); p.textSize(11);
      p.text((frac * 100).toFixed(0) + "%  \\u2014 temperature holding at " + T.toFixed(0) + "\\u00B0C", bx + bw + 10, by + 10);
    }}
  }}

  function drawButtons() {{
    drawBtn(PLAY, playing ? "\\u275A\\u275A Pause" : "\\u25B6 Play");
    drawBtn(SLOW, "0.5x");
    drawBtn(FAST, "2x");
    p.fill(160); p.textSize(10); p.textAlign(p.LEFT);
    p.text("speed: " + speedMul.toFixed(1) + "x", FAST.x + FAST.w + 8, FAST.y + 18);
  }}

  function drawBtn(b, label) {{
    p.fill(40, 46, 58); p.stroke(90); p.strokeWeight(1);
    p.rect(b.x, b.y, b.w, b.h, 6);
    p.noStroke(); p.fill(230); p.textAlign(p.CENTER, p.CENTER); p.textSize(12);
    p.text(label, b.x + b.w/2, b.y + b.h/2);
  }}

  function hit(b) {{
    return p.mouseX >= b.x && p.mouseX <= b.x + b.w &&
           p.mouseY >= b.y && p.mouseY <= b.y + b.h;
  }}

  p.mousePressed = function() {{
    if (hit(PLAY)) playing = !playing;
    else if (hit(SLOW)) speedMul = Math.max(0.5, speedMul - 0.5);
    else if (hit(FAST)) speedMul = Math.min(4.0, speedMul + 0.5);
  }};
}});
</script>
</body>
</html>"""


# ── Helper: human-readable energy / time ──────────────────────────────────────


def fmt_energy(j: float) -> str:
    """Format an energy in J / kJ / MJ."""
    j = float(j)
    if abs(j) >= 1e6:
        return f"{j/1e6:.3g} MJ"
    if abs(j) >= 1e3:
        return f"{j/1e3:.3g} kJ"
    return f"{j:.3g} J"


def fmt_time(s: float) -> str:
    """Format a time in s and min."""
    s = float(s)
    if s >= 120:
        return f"{s:.0f} s ({s/60:.1f} min)"
    return f"{s:.1f} s"


# ── Main page ─────────────────────────────────────────────────────────────────


def main() -> None:
    """Render the Specific Heat & Latent Heat simulation page."""

    sim_header("Specific Heat Capacity & Latent Heat", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ─── Left column: controls + metrics ──────────────────────────────────────
    with left_col:
        mode = mode_toggle()

        st.subheader("Controls")

        substance = st.selectbox(
            "Substance",
            list(SUBSTANCES.keys()),
            index=0,
            help="Choose the substance to heat.",
        )
        sub = SUBSTANCES[substance]

        mass = st.slider(
            "Mass  m (kg)",
            min_value=0.1, max_value=5.0, value=1.0, step=0.1,
            help="Mass of substance being heated.",
        )

        power = st.slider(
            "Heater power  P (W)",
            min_value=int(P_MIN), max_value=5000, value=1000, step=50,
            help="Electrical heater power. Time per stage = energy / power.",
        )
        power = float(max(power, P_MIN))   # guard: never zero

        t_lo, t_hi = sub["T_start_range"]
        T_start = st.slider(
            "Starting temperature  (°C)",
            min_value=float(t_lo), max_value=float(t_hi),
            value=float(sub["T_start_default"]), step=1.0,
            help="Initial temperature of the substance before heating.",
        )

        if mode == "Advanced":
            advanced_divider()
            show_mix = st.toggle(
                "Method of mixtures",
                value=False,
                help="Reveal a mini calculator for mixing two bodies to equilibrium.",
            )
        else:
            show_mix = False

        # ── Compute the heating curve ─────────────────────────────────────────
        curve = compute_heating_curve(
            mass=mass,
            c_solid=sub["c_solid"], c_liquid=sub["c_liquid"], c_gas=sub["c_gas"],
            Lf=sub["Lf"], Lv=sub["Lv"],
            mp=sub["mp"], bp=sub["bp"],
            T_start=T_start,
        )
        se = curve["stage_energy"]
        total_E = curve["total_energy"]
        total_t = total_E / power

        st.divider()
        st.markdown("**Stage energies** (J)")

        # metric_row 1 — energies of the relevant stages.
        row1: dict[str, str] = {}
        if se["heat_solid"] > 0:
            row1["Heat to melting pt"] = fmt_energy(se["heat_solid"])
        if se["melt"] > 0:
            row1["Melt  (mL_f)"] = fmt_energy(se["melt"])
        if se["heat_liquid"] > 0:
            row1["Heat liquid"] = fmt_energy(se["heat_liquid"])
        if se["boil"] > 0:
            row1["Boil  (mL_v)"] = fmt_energy(se["boil"])
        if row1:
            metric_row(row1)

        # metric_row 2 — totals.
        if sub["bp"] is not None and sub["Lv"] is not None:
            total_label = "Total to vaporise"
        else:
            total_label = "Total energy"
        metric_row({
            total_label: fmt_energy(total_E),
            "Total time @ P": fmt_time(total_t),
        })

        if mode == "Advanced":
            st.divider()
            st.markdown("**Time per stage** at "
                        f"{power:.0f} W  (t = Q/P)")
            stage_labels = [
                ("heat_solid", "Heat solid"),
                ("melt", "Melt (fusion)"),
                ("heat_liquid", "Heat liquid"),
                ("boil", "Boil (vaporise)"),
                ("heat_gas", "Heat gas"),
            ]
            for key, label in stage_labels:
                q = se.get(key, 0.0)
                if q > 0:
                    st.markdown(f"- **{label}:** {fmt_energy(q)} → "
                                f"{fmt_time(q / power)}")

        physics_notes(
            spec_ref=SPEC_REF,
            equations=EQUATIONS,
            explanation=EXPLANATION,
            advanced_text=ADVANCED_TEXT,
            mode=mode,
        )

    # ─── Right column: animation, then chart, then advanced calculator ────────
    with right_col:
        st.markdown("#### Heating animation")
        st.caption(
            "Watch the thermometer **stop rising** during melting and boiling — the "
            "supplied energy breaks bonds (latent heat) instead of warming the substance. "
            "▶ Play/Pause · adjust speed."
        )
        components.html(
            build_heating_animation(
                substance=substance, mass=mass, power=power,
                c_solid=sub["c_solid"], c_liquid=sub["c_liquid"], c_gas=sub["c_gas"],
                Lf=sub["Lf"], Lv=sub["Lv"], mp=sub["mp"], bp=sub["bp"],
                T_start=T_start,
            ),
            height=460,
        )

        st.divider()
        st.markdown("#### Heating curve")
        fig = build_heating_curve_figure(curve, mass, substance, power)
        st.plotly_chart(fig, use_container_width=True)

        if sub["bp"] is None or sub["Lv"] is None:
            st.info(
                f"{substance} does not reach its boiling point in the range shown, so "
                "the curve ends after the liquid has begun to warm — only the melting "
                "plateau appears."
            )

        # ── Advanced: method of mixtures mini-calculator ──────────────────────
        if show_mix:
            st.divider()
            st.markdown("#### Method of mixtures calculator")
            st.caption(
                "Two bodies (no phase change) reach a common final temperature. "
                "Energy is conserved: **Q_lost = Q_gained**."
            )
            mc1, mc2 = st.columns(2)
            with mc1:
                st.markdown("**Hot body**")
                m1 = st.number_input("Mass m₁ (kg)", min_value=0.01, max_value=50.0,
                                     value=0.5, step=0.05, key="mix_m1")
                c1 = st.number_input("c₁ (J/kg/K)", min_value=1.0, max_value=10000.0,
                                     value=float(sub["c_liquid"]), step=10.0, key="mix_c1")
                T1 = st.number_input("T₁ (°C)", min_value=-200.0, max_value=2000.0,
                                     value=80.0, step=1.0, key="mix_T1")
            with mc2:
                st.markdown("**Cold body**")
                m2 = st.number_input("Mass m₂ (kg)", min_value=0.01, max_value=50.0,
                                     value=1.0, step=0.05, key="mix_m2")
                c2 = st.number_input("c₂ (J/kg/K)", min_value=1.0, max_value=10000.0,
                                     value=4200.0, step=10.0, key="mix_c2")
                T2 = st.number_input("T₂ (°C)", min_value=-200.0, max_value=2000.0,
                                     value=20.0, step=1.0, key="mix_T2")

            denom = m1 * c1 + m2 * c2
            if denom <= 0:
                st.warning("Total heat capacity must be positive.")
            else:
                Tf = (m1 * c1 * T1 + m2 * c2 * T2) / denom   # weighted mean = equilibrium
                Q1 = m1 * c1 * (T1 - Tf)   # heat lost by hot body
                Q2 = m2 * c2 * (Tf - T2)   # heat gained by cold body
                metric_row({
                    "Final temp  T_f": f"{Tf:.2f} °C",
                    "Q lost (hot)": fmt_energy(Q1),
                    "Q gained (cold)": fmt_energy(Q2),
                })
                with st.container(border=True):
                    st.markdown("**Working — Q_lost = Q_gained:**")
                    st.latex(r"m_1 c_1 (T_1 - T_f) = m_2 c_2 (T_f - T_2)")
                    st.markdown(
                        f"&nbsp;&nbsp;→ {m1:.2f}×{c1:.0f}×({T1:.1f} − T_f) = "
                        f"{m2:.2f}×{c2:.0f}×(T_f − {T2:.1f})"
                    )
                    st.latex(
                        r"T_f = \frac{m_1 c_1 T_1 + m_2 c_2 T_2}{m_1 c_1 + m_2 c_2}"
                    )
                    st.success(f"**T_f = {Tf:.2f} °C** "
                               f"(Q ≈ {fmt_energy(0.5*(Q1+Q2))} transferred)")

        # ── Exam practice questions ───────────────────────────────────────────
        c_solid = sub["c_solid"]
        c_liquid = sub["c_liquid"]
        Lf = sub["Lf"]
        Lv = sub["Lv"]

        Q_melt = mass * Lf
        questions = [
            {
                "q": (
                    f"Calculate the energy needed to completely melt {mass:.1f} kg of "
                    f"{substance} at its melting point (specific latent heat of fusion "
                    f"= {Lf:.0f} J/kg)."
                ),
                "marks": 2,
                "answer": f"Q = {Q_melt:.0f} J",
                "working": [
                    f"Q = mL_f = {mass:.1f}×{Lf:.0f} = {Q_melt:.0f} J",
                ],
            },
            {
                "q": (
                    f"A {power:.0f} W heater warms {mass:.1f} kg of liquid {substance}. "
                    f"Calculate the time to raise its temperature by 50 K "
                    f"(c = {c_liquid:.0f} J/kg/K)."
                ),
                "marks": 3,
                "answer": f"t = {mass*c_liquid*50/power:.1f} s",
                "working": [
                    f"Q = mcΔT = {mass:.1f}×{c_liquid:.0f}×50 = {mass*c_liquid*50:.0f} J",
                    f"t = Q/P = {mass*c_liquid*50:.0f}/{power:.0f} = "
                    f"{mass*c_liquid*50/power:.1f} s",
                ],
            },
            {
                "q": (
                    "Explain why the temperature stays constant while a substance melts, "
                    "even though energy is still supplied."
                ),
                "marks": 2,
                "answer": (
                    "The supplied energy goes into breaking the bonds between particles "
                    "(increasing potential energy), not into increasing their kinetic "
                    "energy, so the temperature does not change until all the solid has "
                    "melted."
                ),
                "working": [],
            },
        ]

        # Add a vaporisation question only when the substance actually boils.
        if Lv is not None:
            Q_boil = mass * Lv
            questions.insert(2, {
                "q": (
                    f"Calculate the energy needed to completely boil away {mass:.1f} kg "
                    f"of {substance} at its boiling point (specific latent heat of "
                    f"vaporisation = {Lv:.0f} J/kg)."
                ),
                "marks": 2,
                "answer": f"Q = {Q_boil:.0f} J",
                "working": [
                    f"Q = mL_v = {mass:.1f}×{Lv:.0f} = {Q_boil:.0f} J",
                ],
            })

        show_exam_panel(questions)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
