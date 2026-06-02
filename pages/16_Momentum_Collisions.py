"""
Momentum & Collisions — WJEC Eduqas A Level Physics
Component 1, Topic 2 (Kinematics and Dynamics), sections on momentum and Newton's laws

Covers:
  Basic  : conservation of momentum, impulse-momentum theorem, elastic /
            perfectly inelastic / general collisions (coefficient of restitution).
  Advanced: reduced mass, centre-of-mass frame, derivation of e, proof that
            perfectly inelastic collision maximises energy loss.
"""

from __future__ import annotations

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import g  # noqa: F401  (imported as per project convention)
from utils.style import COLOURS, make_fig, plotly_layout
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
    page_title="Momentum & Collisions — WJEC Physics",
    page_icon="💥",
    layout="wide",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 2 (Kinematics and Dynamics), sections on momentum and Newton's laws"

PRESETS_1D: dict[str, dict | None] = {
    "Custom": None,
    "Equal mass elastic (snooker ball)": {
        "m1": 1.0, "m2": 1.0, "u1": 5.0, "u2": 0.0, "e": 1.0,
        "note": (
            "In a head-on elastic collision between equal masses, the first ball "
            "stops and the second moves off at the original speed. This is why "
            "snooker balls behave as they do."
        ),
    },
    "Newton's cradle (5 balls)": {
        "m1": 1.0, "m2": 1.0, "u1": 3.0, "u2": 0.0, "e": 1.0,
        "note": (
            "Newton's cradle demonstrates conservation of momentum AND energy. "
            "With 5 equal balls, 1 in = 1 out, 2 in = 2 out — not 5 slow balls!"
        ),
    },
    "Car crash (perfectly inelastic)": {
        "m1": 1200.0, "m2": 800.0, "u1": 15.0, "u2": 0.0, "e": 0.0,
        "note": (
            "A perfectly inelastic collision maximises energy loss. In car crashes, "
            "crumple zones deliberately increase collision time to reduce force "
            "(impulse-momentum theorem)."
        ),
    },
    "Bouncy ball on floor": {
        "m1": 0.05, "m2": 1e6, "u1": -5.0, "u2": 0.0, "e": 0.85,
        "note": (
            "A superball has e ≈ 0.85–0.90. The floor has effectively infinite mass, "
            "so v_floor ≈ 0 after collision. Coefficient of restitution = "
            "speed after / speed before."
        ),
    },
    "Explosion (cannon)": {
        "m1": 5.0, "m2": 0.01, "u1": 0.0, "u2": 0.0, "e": -1.0,
        "note": (
            "An explosion is a reverse collision — momentum is conserved, KE increases "
            "(from chemical energy). v_cannon = -m_ball * v_ball / m_cannon."
        ),
    },
}

# ── Physics helpers ───────────────────────────────────────────────────────────


@st.cache_data(show_spinner=False)
def compute_1d_collision(
    m1: float, m2: float, u1: float, u2: float, e: float
) -> dict[str, float]:
    """
    Compute post-collision velocities for a 1D collision using Newton's Law of
    Restitution and conservation of momentum.

    The general formula handles all cases:
      v1 = (m1*u1 + m2*u2 + m2*e*(u2 - u1)) / (m1 + m2)
      v2 = (m1*u1 + m2*u2 + m1*e*(u1 - u2)) / (m1 + m2)

    For e = 1  : elastic collision.
    For e = 0  : perfectly inelastic (v1 = v2 = v_f).
    For 0<e<1  : partial energy loss.
    For e < 0  : explosion (objects start together or from rest, fly apart).

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1, u2 : initial velocities (m/s)
    e      : coefficient of restitution (0–1; negative for explosion preset)

    Returns
    -------
    dict with keys: v1, v2, p_before, p_after, ke_before, ke_after,
                    delta_ke, e_computed, impulse_J
    """
    total_m = m1 + m2
    p_before = m1 * u1 + m2 * u2
    ke_before = 0.5 * m1 * u1 ** 2 + 0.5 * m2 * u2 ** 2

    v1 = (m1 * u1 + m2 * u2 + m2 * e * (u2 - u1)) / total_m
    v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / total_m

    p_after = m1 * v1 + m2 * v2
    ke_after = 0.5 * m1 * v1 ** 2 + 0.5 * m2 * v2 ** 2
    delta_ke = ke_after - ke_before

    # Computed coefficient of restitution from results
    rel_approach = u1 - u2
    rel_separation = v2 - v1
    if abs(rel_approach) > 1e-12:
        e_computed = rel_separation / rel_approach
    else:
        e_computed = float("nan")

    impulse_J = m1 * (v1 - u1)   # impulse on object 1

    return {
        "v1": float(v1),
        "v2": float(v2),
        "p_before": float(p_before),
        "p_after": float(p_after),
        "ke_before": float(ke_before),
        "ke_after": float(ke_after),
        "delta_ke": float(delta_ke),
        "e_computed": float(e_computed),
        "impulse_J": float(impulse_J),
    }


@st.cache_data(show_spinner=False)
def compute_2d_collision(
    m1: float, m2: float, u1: float, b: float, e: float = 1.0
) -> dict[str, float]:
    """
    Compute post-collision velocities for a 2D collision.

    Ball 1 approaches along x-axis with speed u1; ball 2 is at rest.
    Impact parameter b determines the off-axis geometry.
    Unit ball radius r = 0.5 (display units).

    Approach: decompose into normal (along line of centres) and tangential
    directions, apply 1D restitution in the normal direction, leave tangential
    components unchanged.

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1     : initial speed of ball 1 (m/s, approaching along +x)
    b      : impact parameter (m); 0 = head-on, max = r1+r2
    e      : coefficient of restitution

    Returns
    -------
    dict with keys: v1x, v1y, v2x, v2y, v1_speed, v2_speed,
                    phi1_deg, phi2_deg, theta_deg (collision angle),
                    p_before, p_after, ke_before, ke_after, delta_ke
    """
    r_sum = 1.0  # r1 + r2 in display units (each r = 0.5)
    b_clamped = float(np.clip(b, 0.0, r_sum * 0.9999))

    # Angle of line of centres with x-axis at contact
    sin_th = b_clamped / r_sum
    cos_th = float(np.sqrt(max(0.0, 1.0 - sin_th ** 2)))
    theta_deg = float(np.degrees(np.arcsin(sin_th)))

    # Ball 1 initial velocity in normal/tangential frame
    # normal direction: (cos_th, sin_th)
    # tangential direction: (-sin_th, cos_th)
    u1n = u1 * cos_th    # component along line of centres
    u1t = -u1 * sin_th   # tangential component
    u2n = 0.0            # ball 2 at rest
    u2t = 0.0

    # 1D elastic/inelastic collision in normal direction
    total_m = m1 + m2
    v1n = (m1 * u1n + m2 * u2n + m2 * e * (u2n - u1n)) / total_m
    v2n = (m1 * u1n + m2 * u2n + m1 * e * (u1n - u2n)) / total_m
    v1t = u1t   # tangential unchanged
    v2t = u2t

    # Convert back to lab (x, y) frame
    # normal: (cos_th, sin_th), tangential: (-sin_th, cos_th)
    v1x = v1n * cos_th - v1t * sin_th
    v1y = v1n * sin_th + v1t * cos_th
    v2x = v2n * cos_th - v2t * sin_th
    v2y = v2n * sin_th + v2t * cos_th

    v1_speed = float(np.sqrt(v1x ** 2 + v1y ** 2))
    v2_speed = float(np.sqrt(v2x ** 2 + v2y ** 2))

    # Angles from +x axis
    phi1_deg = float(np.degrees(np.arctan2(v1y, v1x))) if v1_speed > 1e-9 else 0.0
    phi2_deg = float(np.degrees(np.arctan2(v2y, v2x))) if v2_speed > 1e-9 else 0.0

    p_before = m1 * u1
    p_after_x = m1 * v1x + m2 * v2x
    p_after_y = m1 * v1y + m2 * v2y
    p_after = float(np.sqrt(p_after_x ** 2 + p_after_y ** 2))
    ke_before = 0.5 * m1 * u1 ** 2
    ke_after = 0.5 * m1 * v1_speed ** 2 + 0.5 * m2 * v2_speed ** 2

    return {
        "v1x": float(v1x), "v1y": float(v1y),
        "v2x": float(v2x), "v2y": float(v2y),
        "v1_speed": v1_speed, "v2_speed": v2_speed,
        "phi1_deg": phi1_deg, "phi2_deg": phi2_deg,
        "theta_deg": theta_deg,
        "p_before": float(p_before),
        "p_after": float(p_after),
        "ke_before": float(ke_before),
        "ke_after": float(ke_after),
        "delta_ke": float(ke_after - ke_before),
    }


# ── Animation builder ─────────────────────────────────────────────────────────


def build_collision_animation(m1, m2, u1, u2, v1, v2):
    """
    Build an enhanced p5.js 1D collision animation.

    Features
    --------
    - 3-phase animation (before / collision / after) with auto-reset.
    - Ball radii proportional to cube-root of mass.
    - Velocity arrows on each ball.
    - Momentum conservation bar at the bottom.
    - Play/Pause, Replay, and speed (1x / 2x / 4x) controls.

    Enhanced features
    -----------------
    1. Drag velocity arrows (setup phase): drag the tip of each arrow to set
       u1/u2 before launch.  "Launch" button starts the collision.
       Labels update live: "u₁ = X.X m/s".
    2. Slow-motion replay button: after the collision, replay at 0.1x speed
       with a deformation visual and a running timestamp "t = X.XXX s".
    3. Newton's Cradle mode: 5-ball cradle with clickable leftmost ball.
       Click ball 1 to pull back; release to run.  Each ball is numbered.
    4. Coefficient of Restitution indicator: shows
       e = v_rel_after / v_rel_before = X.XX with an elastic (flash) or
       inelastic (stick + combined-mass label) visual.
    """

    # Normalise for display: map velocities to pixel speeds
    max_speed = max(abs(u1), abs(u2), abs(v1), abs(v2), 0.1)

    # Compute e for display (may be NaN if relative approach speed is zero)
    rel_approach = u1 - u2
    rel_separation = v2 - v1
    if abs(rel_approach) > 1e-12:
        e_display = rel_separation / rel_approach
    else:
        e_display = float("nan")

    data = json.dumps({
        "m1": float(m1), "m2": float(m2),
        "u1": float(u1), "u2": float(u2),
        "v1": float(v1), "v2": float(v2),
        "maxSpeed": float(max_speed),
        "eVal": float(e_display) if not (e_display != e_display) else -999,
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
// ── Simulation data from Python ──────────────────────────────────────────────
const D = {data};
const SCALE = 80;
const TRACK_Y_FRAC = 0.48;

// ── Modes ────────────────────────────────────────────────────────────────────
// appMode: 'collision' | 'cradle'
let appMode = 'collision';

// ── Collision-mode state ─────────────────────────────────────────────────────
// simPhase: 'setup' | 'before' | 'collision' | 'after' | 'slowmo'
let simPhase = 'before';
let b1x, b2x, b1vx, b2vx;
let playing = true, simSpeed = 1;
let t = 0, collisionT = null, flashAlpha = 0;

// Drag state for velocity arrows (setup phase)
let draggingArrow = 0;   // 0=none, 1=ball1, 2=ball2
let dragU1, dragU2;      // dragged velocities (m/s)
let setupMode = false;   // show drag arrows?

// Slow-mo state
let slowmoActive = false;
let slowmoT = 0;
let slowmoB1x, slowmoB2x, slowmoB1vx, slowmoB2vx;
let deformAlpha = 0, deformR = 0;

// CoR display
let eDisplay = D.eVal === -999 ? NaN : D.eVal;
let stickTogether = (Math.abs(D.v1 - D.v2) < 0.001);
let elasticFlash = 0;

// ── Cradle-mode state ────────────────────────────────────────────────────────
const N_CRADLE = 5;
const CRADLE_L = 110;        // string length px
const CRADLE_R = 16;         // ball radius px
const CRADLE_SPACING = 34;   // centre-to-centre px
const CRADLE_MAX_ANGLE = 0.75; // radians (~43°)
let cradleAngle = 0;         // current angle of leftmost ball (rad)
let cradleVel = 0;           // angular velocity of leftmost ball
let cradlePulling = false;   // user dragging ball 1
let cradleRunning = false;
let cradlePhaseL = 0, cradlePhaseR = 0;  // left/right group angles
let cradleVelL = 0, cradleVelR = 0;
let cradleState = 'idle';    // 'idle' | 'swingLeft' | 'impact' | 'swingRight' | 'returnRight' | 'returnImpact' | 'returnLeft'
let cradleTimer = 0;
let cradlePullX, cradlePullY;  // mouse position during pull

// ── Utility ──────────────────────────────────────────────────────────────────
function ballR(m) {{ return max(15, min(45, pow(m, 1/3) * 20)); }}
function sgn(x)   {{ return x > 0 ? 1 : x < 0 ? -1 : 0; }}
function setLineDash(list) {{ drawingContext.setLineDash(list); }}

// ── p5 lifecycle ─────────────────────────────────────────────────────────────
function setup() {{
  createCanvas(windowWidth || 700, 420);
  textFont('monospace');
  resetCollision();
}}

function windowResized() {{
  resizeCanvas(windowWidth, 420);
}}

// ── Reset helpers ─────────────────────────────────────────────────────────────
function resetCollision() {{
  let r1 = ballR(D.m1), r2 = ballR(D.m2);
  b1x = width * 0.25;
  b2x = width * 0.75;
  b1vx = D.u1 / (Math.abs(D.maxSpeed) + 0.001) * (SCALE * 0.8);
  b2vx = D.u2 / (Math.abs(D.maxSpeed) + 0.001) * (SCALE * 0.8);
  simPhase = 'before';
  t = 0; collisionT = null; flashAlpha = 0;
  playing = true; slowmoActive = false;
  deformAlpha = 0; deformR = 0; elasticFlash = 0;
  if (setupMode) {{
    simPhase = 'setup';
    dragU1 = D.u1; dragU2 = D.u2;
    // Recompute pixel velocities from dragged values
    b1vx = dragU1 / (Math.abs(D.maxSpeed) + 0.001) * (SCALE * 0.8);
    b2vx = dragU2 / (Math.abs(D.maxSpeed) + 0.001) * (SCALE * 0.8);
  }}
}}

function resetCradle() {{
  cradlePhaseL = CRADLE_MAX_ANGLE;
  cradlePhaseR = 0;
  cradleVelL = 0; cradleVelR = 0;
  cradleState = 'idle';
  cradleRunning = false;
  cradleTimer = 0;
  cradlePulling = false;
}}

// ── Input ─────────────────────────────────────────────────────────────────────
function mousePressed() {{
  // ── Top-left mode buttons ──
  // [Cradle] button: x=10..80, y=10..35
  if (mouseX >= 10 && mouseX <= 85 && mouseY >= 10 && mouseY <= 35) {{
    appMode = (appMode === 'collision') ? 'cradle' : 'collision';
    if (appMode === 'cradle') resetCradle();
    else resetCollision();
    return;
  }}
  // [Slow-mo] button: x=90..175, y=10..35  (only in collision mode, post-collision)
  if (appMode === 'collision' && mouseX >= 90 && mouseX <= 175 && mouseY >= 10 && mouseY <= 35) {{
    if (simPhase === 'after') startSlowmo();
    return;
  }}
  // [Setup] toggle: x=180..255, y=10..35
  if (appMode === 'collision' && mouseX >= 180 && mouseX <= 260 && mouseY >= 10 && mouseY <= 35) {{
    setupMode = !setupMode;
    resetCollision();
    return;
  }}

  // ── Right-side controls ──
  if (mouseX > width - 120 && mouseX < width - 10) {{
    if (mouseY > 50 && mouseY < 80)  {{ playing = !playing; return; }}
    if (mouseY > 88 && mouseY < 118) {{ resetCollision(); return; }}
    if (mouseY > 126 && mouseY < 156) {{
      simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1;
      return;
    }}
  }}

  // ── Setup mode: drag-arrow hit test ──
  if (appMode === 'collision' && simPhase === 'setup') {{
    let cy = height * TRACK_Y_FRAC;
    let r1 = ballR(D.m1), r2 = ballR(D.m2);
    // Arrow tip positions
    let tip1x = arrowTipX(b1x, r1, dragU1);
    let tip2x = arrowTipX(b2x, r2, dragU2);
    if (dist(mouseX, mouseY, tip1x, cy) < 14) {{ draggingArrow = 1; return; }}
    if (dist(mouseX, mouseY, tip2x, cy) < 14) {{ draggingArrow = 2; return; }}

    // Launch button
    let lbx = width / 2, lby = cy + max(r1, r2) + 45;
    if (mouseX >= lbx - 40 && mouseX <= lbx + 40 && mouseY >= lby - 14 && mouseY <= lby + 14) {{
      launchFromSetup();
      return;
    }}
  }}

  // ── Cradle mode: click ball 1 to pull ──
  if (appMode === 'cradle' && !cradleRunning) {{
    let cx0 = cradleCentreX(0);
    let cy0 = cradleBallY(0, cradlePhaseL);
    let pivY = height * 0.22;
    if (dist(mouseX, mouseY, cx0, cy0) < CRADLE_R + 8) {{
      cradlePulling = true;
      return;
    }}
    // [Release] button area
    if (mouseX >= 10 && mouseX <= 95 && mouseY >= height - 45 && mouseY <= height - 18) {{
      if (!cradleRunning) launchCradle();
      return;
    }}
  }}
}}

function mouseDragged() {{
  if (appMode === 'collision' && simPhase === 'setup') {{
    let cy = height * TRACK_Y_FRAC;
    if (draggingArrow === 1) {{
      let dx = mouseX - b1x;
      dragU1 = dx / (SCALE * 0.8) * (Math.abs(D.maxSpeed) + 0.001);
      dragU1 = constrain(dragU1, -15, 15);
    }}
    if (draggingArrow === 2) {{
      let dx = mouseX - b2x;
      dragU2 = dx / (SCALE * 0.8) * (Math.abs(D.maxSpeed) + 0.001);
      dragU2 = constrain(dragU2, -15, 15);
    }}
  }}
  if (appMode === 'cradle' && cradlePulling) {{
    cradlePullX = mouseX;
    cradlePullY = mouseY;
    // Compute angle from pivot
    let pivX = cradleCentreX(0);
    let pivY = height * 0.22 - CRADLE_L;
    let dx = mouseX - pivX;
    let dy = mouseY - (pivY + CRADLE_L);
    cradlePhaseL = constrain(atan2(-dx, CRADLE_L), -CRADLE_MAX_ANGLE, 0.0);
  }}
}}

function mouseReleased() {{
  draggingArrow = 0;
  if (cradlePulling) {{
    cradlePulling = false;
    // auto-launch on release if pulled back
    if (cradlePhaseL < -0.05) launchCradle();
  }}
}}

// ── Setup-phase helpers ───────────────────────────────────────────────────────
function arrowTipX(bx, r, u) {{
  let len = map(abs(u), 0, 15, 0, 90) * sgn(u);
  return bx + sgn(u) * (r + 5) + len;
}}

function launchFromSetup() {{
  let ms = max(abs(dragU1), abs(dragU2), 0.1);
  b1vx = dragU1 / ms * (SCALE * 0.8);
  b2vx = dragU2 / ms * (SCALE * 0.8);
  simPhase = 'before';
  playing = true;
}}

// ── Slow-mo helpers ───────────────────────────────────────────────────────────
function startSlowmo() {{
  let r1 = ballR(D.m1), r2 = ballR(D.m2);
  // Rewind to just before collision
  slowmoB1x = width / 2 - r1 - 8;
  slowmoB2x = width / 2 + r2 + 8;
  let ms = Math.abs(D.maxSpeed) + 0.001;
  slowmoB1vx = D.u1 / ms * (SCALE * 0.8);
  slowmoB2vx = D.u2 / ms * (SCALE * 0.8);
  slowmoT = 0;
  slowmoActive = true;
  simPhase = 'slowmo';
  playing = true;
  deformAlpha = 0; deformR = 0;
}}

// ── Cradle helpers ────────────────────────────────────────────────────────────
function cradleCentreX(i) {{
  let totalW = N_CRADLE * CRADLE_SPACING;
  return width / 2 - totalW / 2 + (i + 0.5) * CRADLE_SPACING;
}}

function cradleBallY(i, angle) {{
  let pivY = height * 0.22 - CRADLE_L + CRADLE_L; // pivot is at height*0.22
  return height * 0.22 + CRADLE_L * cos(angle);
}}

function launchCradle() {{
  cradleRunning = true;
  cradleVelL = 0;
  cradleState = 'swingLeft';
  cradleTimer = 0;
}}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw() {{
  background('#0e1117');

  // ── Top bar ──────────────────────────────────────────────────────────────
  drawTopButtons();

  if (appMode === 'cradle') {{
    drawCradle();
  }} else {{
    drawCollisionSim();
  }}

  // ── Right controls ────────────────────────────────────────────────────────
  drawRightControls();
}}

// ── Top buttons ───────────────────────────────────────────────────────────────
function drawTopButtons() {{
  noStroke();
  // Cradle toggle
  fill(appMode === 'cradle' ? color(44,160,44) : color(40,40,60));
  rect(10, 10, 75, 25, 5);
  fill('#fff'); textSize(10); textAlign(LEFT);
  text(appMode === 'cradle' ? '● Cradle' : '○ Cradle', 15, 27);

  // Slow-mo (collision mode only)
  if (appMode === 'collision') {{
    let smActive = simPhase === 'slowmo';
    fill(smActive ? color(148,103,189) : color(40,40,60));
    rect(90, 10, 85, 25, 5);
    fill('#fff'); textSize(10);
    text(smActive ? '⏪ Slow-mo' : '⏪ Slow-mo', 95, 27);

    // Setup toggle
    fill(setupMode ? color(214,39,40) : color(40,40,60));
    rect(180, 10, 80, 25, 5);
    fill('#fff'); textSize(10);
    text(setupMode ? '✎ Setup ON' : '✎ Setup', 185, 27);
  }}
  textAlign(LEFT);
}}

// ── Right-side controls ───────────────────────────────────────────────────────
function drawRightControls() {{
  noStroke(); fill(15, 15, 25, 220); rect(width - 118, 45, 110, 120, 6);
  fill('#fafafa'); textSize(11); textAlign(LEFT);
  text(playing ? '⏸ Pause' : '▶ Play',   width - 112, 65);
  text('↺ Replay',                         width - 112, 105);
  text('⚡ ' + simSpeed + 'x',             width - 112, 143);
  textAlign(LEFT);
}}

// ── Collision simulation ──────────────────────────────────────────────────────
function drawCollisionSim() {{
  let cy = height * TRACK_Y_FRAC;
  let r1 = ballR(D.m1), r2 = ballR(D.m2);

  // Track
  stroke('#2a2a2a'); strokeWeight(2);
  line(20, cy + max(r1, r2) + 18, width - 20, cy + max(r1, r2) + 18);

  // Phase label
  noStroke(); fill('#777'); textSize(11); textAlign(LEFT);
  let phaseLabels = {{
    'setup':     'Setup — drag arrow tips to set velocities',
    'before':    'Before collision',
    'collision': 'COLLISION!',
    'after':     'After collision',
    'slowmo':    'Slow-motion replay (0.1x)'
  }};
  text(phaseLabels[simPhase] || '', width/2 - 120, cy - max(r1, r2) - 25);

  // Collision / slowmo flash & deform
  if (flashAlpha > 0) {{
    noStroke();
    let isElastic = (Math.abs(eDisplay - 1.0) < 0.05);
    fill(isElastic ? color(255, 230, 80, flashAlpha) : color(255, 80, 80, flashAlpha));
    circle(width / 2, cy, 120);
    flashAlpha -= 6;
  }}
  if (deformAlpha > 0 && simPhase === 'slowmo') {{
    noStroke(); fill(255, 160, 60, deformAlpha);
    ellipse(width / 2, cy, deformR * 2, deformR * 1.3);
    deformAlpha -= 3;
  }}

  // ── Draw balls ────────────────────────────────────────────────────────────
  let col1 = color(31, 119, 180);
  let col2 = color(255, 127, 14);

  if (simPhase === 'slowmo') {{
    drawBall(slowmoB1x, cy, r1, col1, 'm₁', slowmoB1vx);
    drawBall(slowmoB2x, cy, r2, col2, 'm₂', slowmoB2vx);
    // Timestamp
    noStroke(); fill('#aef'); textSize(10); textAlign(LEFT);
    text('t = ' + nf(slowmoT, 1, 3) + ' s', 20, height - 20);
    textAlign(LEFT);
  }} else {{
    drawBall(b1x, cy, r1, col1, 'm₁', simPhase === 'setup' ? dragU1 / (Math.abs(D.maxSpeed)+0.001) * (SCALE*0.8) : b1vx);
    drawBall(b2x, cy, r2, col2, 'm₂', simPhase === 'setup' ? dragU2 / (Math.abs(D.maxSpeed)+0.001) * (SCALE*0.8) : b2vx);
  }}

  // ── Setup UI ──────────────────────────────────────────────────────────────
  if (simPhase === 'setup') {{
    drawSetupArrows(cy, r1, r2);
  }}

  // ── Stuck-together label ──────────────────────────────────────────────────
  if (simPhase === 'after' && stickTogether) {{
    let mx = (b1x + b2x) / 2;
    noStroke(); fill(255, 80, 80, 200);
    rect(mx - 38, cy - max(r1,r2) - 42, 76, 18, 4);
    fill('#fff'); textSize(9); textAlign(CENTER);
    text('Combined mass: ' + nf(D.m1 + D.m2, 1, 2) + ' kg', mx, cy - max(r1,r2) - 29);
    textAlign(LEFT);
  }}

  // ── Elastic flash overlay ─────────────────────────────────────────────────
  if (elasticFlash > 0) {{
    noStroke(); fill(255, 255, 100, elasticFlash);
    circle(width / 2, cy, 60);
    elasticFlash -= 5;
  }}

  // ── CoR indicator ─────────────────────────────────────────────────────────
  drawCoR(cy, r1, r2);

  // ── Momentum bar ─────────────────────────────────────────────────────────
  drawMomentumBar(cy, r1, r2);

  // ── Update physics ────────────────────────────────────────────────────────
  if (playing) updateCollisionPhysics(r1, r2);
}}

function drawSetupArrows(cy, r1, r2) {{
  // Draw draggable arrows for u1 and u2
  drawDragArrow(b1x, cy, r1, dragU1, color(31,119,180), 'u₁ = ' + nf(dragU1, 1, 1) + ' m/s', 1);
  drawDragArrow(b2x, cy, r2, dragU2, color(255,127,14), 'u₂ = ' + nf(dragU2, 1, 1) + ' m/s', 2);

  // Launch button
  let lbx = width / 2, lby = cy + max(r1, r2) + 45;
  fill(44, 160, 44); noStroke(); rect(lbx - 40, lby - 14, 80, 28, 6);
  fill('#fff'); textSize(12); textAlign(CENTER);
  text('Launch ►', lbx, lby + 4);
  textAlign(LEFT);
}}

function drawDragArrow(bx, cy, r, u, col, label, idx) {{
  let len = map(abs(u), 0, 15, 0, 90) * sgn(u);
  let ax = bx + sgn(u) * (r + 5);
  let ex = ax + len;
  // Shaft
  stroke(col); strokeWeight(2.5); fill(col);
  line(ax, cy, ex, cy);
  // Arrowhead
  let s = sgn(u); if (s === 0) s = 1;
  triangle(ex, cy, ex - s*12, cy - 6, ex - s*12, cy + 6);
  // Draggable tip circle (highlighted)
  noStroke();
  fill(draggingArrow === idx ? color(255,255,100,200) : color(255,255,255,160));
  circle(ex, cy, 14);
  // Label
  noStroke(); fill(col); textSize(10); textAlign(CENTER);
  text(label, bx, cy - r - 14);
  textAlign(LEFT);
}}

function drawBall(x, y, r, col, label, vx) {{
  // Glow
  noStroke();
  for (let rr = r + 12; rr > r; rr -= 4)
    fill(red(col), green(col), blue(col), map(rr, r, r + 12, 25, 0));
  for (let rr = r + 12; rr > r; rr -= 4) circle(x, y, rr * 2);
  // Ball body
  fill(col); stroke('#ffffff'); strokeWeight(1.5); circle(x, y, r * 2);
  // Mass label
  noStroke(); fill('#ffffff'); textSize(max(9, r * 0.55)); textAlign(CENTER);
  text(label, x, y + 4);
  textAlign(LEFT);
  // Velocity arrow
  if (abs(vx) > 0.5) {{
    let len = map(abs(vx), 0, SCALE * 1.2, 0, 70);
    let ax = x + sgn(vx) * (r + 5), ay = y;
    let ex = ax + sgn(vx) * len;
    stroke('#ff7f0e'); fill('#ff7f0e'); strokeWeight(2);
    line(ax, ay, ex, ay);
    triangle(ex, ay, ex - sgn(vx)*10, ay - 5, ex - sgn(vx)*10, ay + 5);
    noStroke(); fill('#ff7f0e'); textSize(9); textAlign(CENTER);
    let spd = abs(vx) / (SCALE * 0.8) * (Math.abs(D.maxSpeed) + 0.001);
    text(nf(spd, 1, 1) + ' m/s', ex + sgn(vx) * 22, ay - 9);
    textAlign(LEFT);
  }}
}}

function drawCoR(cy, r1, r2) {{
  let corY = cy - max(r1, r2) - 52;
  noStroke(); fill('#555'); textSize(9); textAlign(LEFT);
  if (isNaN(eDisplay)) {{
    text('e = —  (u₁ = u₂, no approach)', 20, corY);
  }} else {{
    let eLabel = isFinite(eDisplay) ? nf(constrain(eDisplay, 0, 2), 1, 2) : '?';
    let desc = (eDisplay >= 0.97) ? 'elastic' : (eDisplay < 0.03) ? 'perfectly inelastic' : 'partial';
    fill(eDisplay >= 0.97 ? color(255,220,60) : eDisplay < 0.03 ? color(255,80,80) : color(180,180,255));
    text('e = v₂−v₁ / u₁−u₂ = ' + eLabel + '  [' + desc + ']', 20, corY);
  }}
  textAlign(LEFT);
}}

function drawMomentumBar(cy, r1, r2) {{
  let barY = height - 38, barH = 14, barW = (width - 80) / 2;
  let isAfter = (simPhase === 'after' || simPhase === 'slowmo');
  let p1 = D.m1 * (isAfter ? D.v1 : (simPhase === 'setup' ? dragU1 : D.u1));
  let p2 = D.m2 * (isAfter ? D.v2 : (simPhase === 'setup' ? dragU2 : D.u2));
  let pTotal = p1 + p2;
  let pMax = max(abs(p1) + abs(p2), 0.01) * 1.2;
  noStroke(); fill('#1a1a2a'); rect(40, barY - barH, width - 80, barH, 3);
  fill(31, 119, 180, 180); rect(40 + barW, barY - barH, p1 / pMax * barW, barH);
  fill(255, 127, 14, 180); rect(40 + barW + p1 / pMax * barW, barY - barH, p2 / pMax * barW, barH);
  fill('#fafafa'); textSize(9); textAlign(LEFT);
  text('p = ' + nf(pTotal, 1, 2) + ' kg·m/s (conserved)', 40, barY + 9);
  stroke('#2ca02c'); strokeWeight(1); setLineDash([4, 3]);
  line(40 + barW, barY - barH - 2, 40 + barW, barY + 2); setLineDash([]);
  noStroke(); fill('#2ca02c'); textSize(8);
  text('p=0', 42 + barW, barY - barH - 4);
  textAlign(LEFT);
}}

function updateCollisionPhysics(r1, r2) {{
  let iters = simPhase === 'slowmo' ? 1 : simSpeed;
  let dt = simPhase === 'slowmo' ? 0.016 * 0.1 : 0.016;

  for (let s = 0; s < iters; s++) {{
    if (simPhase === 'slowmo') {{
      slowmoT += dt;
      slowmoB1x += slowmoB1vx * dt * 60;
      slowmoB2x += slowmoB2vx * dt * 60;
      // Detect collision in slow-mo
      if (slowmoB2x - slowmoB1x <= r1 + r2 && slowmoT < 0.3) {{
        deformAlpha = 180; deformR = (r1 + r2) * 0.6;
        // Switch to after velocities
        let ms = Math.abs(D.maxSpeed) + 0.001;
        slowmoB1vx = D.v1 / ms * (SCALE * 0.8);
        slowmoB2vx = D.v2 / ms * (SCALE * 0.8);
      }}
      // End slow-mo
      if (slowmoT > 2.0) {{
        simPhase = 'after';
        b1x = slowmoB1x; b2x = slowmoB2x;
        let ms = Math.abs(D.maxSpeed) + 0.001;
        b1vx = D.v1 / ms * (SCALE * 0.8);
        b2vx = D.v2 / ms * (SCALE * 0.8);
        slowmoActive = false;
      }}
    }} else if (simPhase === 'before') {{
      t += dt;
      b1x += b1vx * dt * 60;
      b2x += b2vx * dt * 60;
      if (b2x - b1x <= r1 + r2) {{
        simPhase = 'collision'; collisionT = t; flashAlpha = 220;
        let isElastic = (Math.abs(eDisplay - 1.0) < 0.05 && !isNaN(eDisplay));
        if (isElastic) elasticFlash = 180;
        let mid = (b1x + b2x) / 2;
        b1x = mid - r1; b2x = mid + r2;
      }}
    }} else if (simPhase === 'collision') {{
      t += dt;
      if (t - collisionT > 0.15) {{
        simPhase = 'after';
        let ms = Math.abs(D.maxSpeed) + 0.001;
        b1vx = D.v1 / ms * (SCALE * 0.8);
        b2vx = D.v2 / ms * (SCALE * 0.8);
        // If inelastic, keep together
        if (stickTogether) b2x = b1x + r1 + r2;
      }}
    }} else if (simPhase === 'after') {{
      t += dt;
      if (stickTogether) {{
        // Move combined mass
        let vCombined = (D.m1 * b1vx + D.m2 * b2vx) / (D.m1 + D.m2);
        b1vx = vCombined; b2vx = vCombined;
        b1x += b1vx * dt * 60;
        b2x = b1x + r1 + r2;
      }} else {{
        b1x += b1vx * dt * 60;
        b2x += b2vx * dt * 60;
      }}
      // Auto-reset
      let offLeft  = b1x < -120 && b2x < -120;
      let offRight = b1x > width + 120 && b2x > width + 120;
      let offBoth  = b1x < -120 && b2x > width + 120;
      if (offLeft || offRight || offBoth) {{
        setTimeout(() => {{ resetCollision(); }}, 800);
        playing = false;
      }}
    }}
    // setup phase: no auto-physics, waiting for Launch
  }}
}}

// ── Newton's Cradle ───────────────────────────────────────────────────────────
function drawCradle() {{
  let pivY = height * 0.22;   // pivot bar y
  let barX0 = cradleCentreX(0) - CRADLE_R - 10;
  let barX1 = cradleCentreX(N_CRADLE - 1) + CRADLE_R + 10;

  // Draw top bar
  stroke('#888'); strokeWeight(5);
  line(barX0, pivY - CRADLE_L, barX1, pivY - CRADLE_L);
  // Support struts
  strokeWeight(2); stroke('#555');
  line(barX0, pivY - CRADLE_L - 18, barX0, pivY - CRADLE_L);
  line(barX1, pivY - CRADLE_L - 18, barX1, pivY - CRADLE_L);

  // Update cradle physics
  if (playing) updateCradlePhysics();

  // Draw each ball
  for (let i = 0; i < N_CRADLE; i++) {{
    let angle = cradleBallAngle(i);
    let px = cradleCentreX(i);
    let py = pivY - CRADLE_L;
    let bx = px + CRADLE_L * sin(angle);
    let by = py + CRADLE_L * cos(angle);

    // String
    stroke('#666'); strokeWeight(1.5);
    line(px, py, bx, by);

    // Ball colour
    let bc;
    if (i === 0 && cradlePhaseL < -0.02) bc = color(31, 119, 180);
    else if (i === N_CRADLE - 1 && cradlePhaseR > 0.02) bc = color(214, 39, 40);
    else bc = color(150, 150, 160);

    // Glow
    noStroke();
    for (let rr = CRADLE_R + 8; rr > CRADLE_R; rr -= 3)
      fill(red(bc), green(bc), blue(bc), map(rr, CRADLE_R, CRADLE_R+8, 20, 0));
    for (let rr = CRADLE_R + 8; rr > CRADLE_R; rr -= 3) circle(bx, by, rr * 2);
    fill(bc); stroke('#fff'); strokeWeight(1.5); circle(bx, by, CRADLE_R * 2);

    // Number label
    noStroke(); fill('#fff'); textSize(10); textAlign(CENTER);
    text(str(i + 1), bx, by + 4);
    textAlign(LEFT);
  }}

  // Instruction / release button
  noStroke();
  if (!cradleRunning) {{
    fill(color(44,160,44)); rect(10, height - 45, 90, 27, 5);
    fill('#fff'); textSize(10); textAlign(LEFT);
    text(cradlePhaseL < -0.05 ? 'Release ►' : 'Pull ball 1', 16, height - 27);

    fill('#888'); textSize(9);
    text('Drag ball 1 to pull back, or click Release', 110, height - 28);
    textAlign(LEFT);
  }} else {{
    // Replay cradle button
    fill(color(40,40,80)); rect(10, height - 45, 90, 27, 5);
    fill('#fff'); textSize(10); textAlign(LEFT);
    text('↺ Reset', 16, height - 27);
    textAlign(LEFT);

    // Momentum annotation
    fill('#aaa'); textSize(9);
    let pCradle = D.m1 * 2.0; // placeholder speed
    text('p and KE both conserved — 1 ball in, 1 ball out', 110, height - 28);
    textAlign(LEFT);
  }}

  // Cradle reset (click Reset button)
  // Handled in mousePressed via appMode check already, but also support
  // clicking the new Reset button during running state
}}

function mousePressed_extra() {{
  // Extension for cradle reset during running
  if (appMode === 'cradle' && cradleRunning) {{
    if (mouseX >= 10 && mouseX <= 100 && mouseY >= height - 45 && mouseY <= height - 18) {{
      resetCradle();
    }}
  }}
}}

function cradleBallAngle(i) {{
  if (i === 0) return cradlePhaseL;
  if (i === N_CRADLE - 1) return cradlePhaseR;
  return 0.0;
}}

function updateCradlePhysics() {{
  let g_eff = 0.0025;  // effective gravity in canvas units per frame^2
  let dt = 1.0;

  if (!cradleRunning) return;

  if (cradleState === 'swingLeft') {{
    // Ball 0 swings from angle cradlePhaseL toward 0
    cradleVelL += -g_eff * sin(cradlePhaseL);
    cradleVelL *= 0.999;
    cradlePhaseL += cradleVelL;
    if (cradlePhaseL >= 0) {{
      cradlePhaseL = 0; cradleVelL = 0;
      cradleState = 'impact';
      cradleTimer = 0;
    }}
  }} else if (cradleState === 'impact') {{
    cradleTimer++;
    if (cradleTimer > 3) {{
      // Transfer: ball N-1 swings out
      cradlePhaseR = 0;
      cradleVelR = 0.025;  // kick rightmost ball out
      cradleState = 'swingRight';
    }}
  }} else if (cradleState === 'swingRight') {{
    cradleVelR += -g_eff * sin(cradlePhaseR);
    cradleVelR *= 0.999;
    cradlePhaseR += cradleVelR;
    if (cradlePhaseR <= 0 && cradleVelR < 0) {{
      // Right ball returns
      cradleVelR *= -0.98;  // slight damping
      cradleState = 'returnRight';
    }}
    cradlePhaseR = constrain(cradlePhaseR, -0.1, CRADLE_MAX_ANGLE);
  }} else if (cradleState === 'returnRight') {{
    cradleVelR += -g_eff * sin(cradlePhaseR);
    cradleVelR *= 0.999;
    cradlePhaseR += cradleVelR;
    if (cradlePhaseR <= 0) {{
      cradlePhaseR = 0; cradleVelR = 0;
      cradleState = 'returnImpact';
      cradleTimer = 0;
    }}
  }} else if (cradleState === 'returnImpact') {{
    cradleTimer++;
    if (cradleTimer > 3) {{
      cradlePhaseL = 0;
      cradleVelL = -0.025;
      cradleState = 'returnLeft';
    }}
  }} else if (cradleState === 'returnLeft') {{
    cradleVelL += -g_eff * sin(cradlePhaseL);
    cradleVelL *= 0.999;
    cradlePhaseL += cradleVelL;
    if (cradlePhaseL >= 0 && cradleVelL > 0) {{
      cradleVelL *= -0.98;
      cradleState = 'swingLeft';
    }}
    cradlePhaseL = constrain(cradlePhaseL, -CRADLE_MAX_ANGLE, 0.1);
  }}
}}
</script></body></html>"""


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_1d_vector_diagram(
    m1: float, m2: float, u1: float, u2: float, v1: float, v2: float
) -> go.Figure:
    """
    Build a before/after velocity vector diagram for a 1D collision.

    Masses are shown as rectangles (width ~ sqrt(mass)), arrows show velocities.
    Two rows: top = before, bottom = after.

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1, u2 : initial velocities (m/s)
    v1, v2 : final velocities (m/s)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    # Layout constants
    y_before = 1.5    # y centre for before row
    y_after = -0.5    # y centre for after row
    box_h = 0.6       # fixed height for mass rectangles
    max_v = max(abs(u1), abs(u2), abs(v1), abs(v2), 1.0)
    arrow_scale = 3.5 / max_v   # arrows normalised to max display width

    # Mass widths proportional to sqrt(mass) for visual clarity
    max_m = max(m1, m2, 1.0)
    w1 = 0.6 + 1.2 * np.sqrt(m1 / max_m)
    w2 = 0.6 + 1.2 * np.sqrt(m2 / max_m)

    # Positions: m1 centred at x=-3, m2 at x=+3
    cx1 = -3.0
    cx2 = +3.0

    def add_mass_box(cx: float, cy: float, w: float, colour: str, label: str) -> None:
        """Add a filled rectangle representing a mass."""
        xs = [cx - w / 2, cx + w / 2, cx + w / 2, cx - w / 2, cx - w / 2]
        ys = [cy - box_h / 2, cy - box_h / 2, cy + box_h / 2,
              cy + box_h / 2, cy - box_h / 2]
        fig.add_trace(go.Scatter(
            x=xs, y=ys,
            mode="lines",
            fill="toself",
            fillcolor=colour,
            line=dict(color=COLOURS["text"], width=1.5),
            name=label,
            showlegend=False,
            hoverinfo="skip",
        ))
        fig.add_annotation(
            x=cx, y=cy,
            text=f"<b>{label}</b>",
            showarrow=False,
            font=dict(color=COLOURS["text"], size=11),
            xref="x", yref="y",
        )

    def add_velocity_arrow(cx: float, cy: float, vel: float,
                           colour: str, label: str) -> None:
        """Add a horizontal velocity arrow from the edge of the box."""
        if abs(vel) < 1e-10:
            # Zero velocity: draw a small cross
            fig.add_annotation(
                x=cx, y=cy + box_h / 2 + 0.25,
                text="v = 0",
                showarrow=False,
                font=dict(color=colour, size=9),
                xref="x", yref="y",
            )
            return
        arrow_len = vel * arrow_scale
        # Start from edge of box
        x_start = cx + np.sign(vel) * (w1 if "m1" in label else w2) / 2
        x_end = x_start + arrow_len
        y_arrow = cy + box_h / 2 + 0.30

        fig.add_trace(go.Scatter(
            x=[x_start, x_end],
            y=[y_arrow, y_arrow],
            mode="lines",
            line=dict(color=colour, width=2.5),
            showlegend=False,
            hoverinfo="skip",
        ))
        fig.add_annotation(
            x=x_end, y=y_arrow,
            ax=x_start, ay=y_arrow,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
            arrowcolor=colour, text="",
        )
        fig.add_annotation(
            x=(x_start + x_end) / 2, y=y_arrow + 0.22,
            text=f"{vel:.2f} m/s",
            showarrow=False,
            font=dict(color=colour, size=9),
            xref="x", yref="y",
        )

    # ── Before row ─────────────────────────────────────────────────────────────
    fig.add_annotation(
        x=-7.5, y=y_before,
        text="<b>Before</b>",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=12),
        xref="x", yref="y",
    )
    add_mass_box(cx1, y_before, w1, f"rgba(31,119,180,0.6)", "m₁")
    add_mass_box(cx2, y_before, w2, f"rgba(255,127,14,0.6)", "m₂")
    add_velocity_arrow(cx1, y_before, u1, COLOURS["primary"], "m1")
    add_velocity_arrow(cx2, y_before, u2, COLOURS["secondary"], "m2")

    # ── After row ──────────────────────────────────────────────────────────────
    fig.add_annotation(
        x=-7.5, y=y_after,
        text="<b>After</b>",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=12),
        xref="x", yref="y",
    )
    add_mass_box(cx1, y_after, w1, f"rgba(31,119,180,0.6)", "m₁")
    add_mass_box(cx2, y_after, w2, f"rgba(255,127,14,0.6)", "m₂")
    add_velocity_arrow(cx1, y_after, v1, COLOURS["primary"], "m1")
    add_velocity_arrow(cx2, y_after, v2, COLOURS["secondary"], "m2")

    # Divider line
    fig.add_hline(y=0.5, line=dict(color=COLOURS["grid"], width=1.5, dash="dash"))
    fig.add_annotation(
        x=6.0, y=0.5,
        text="collision",
        showarrow=False,
        font=dict(color=COLOURS["grid"], size=9),
        xref="x", yref="y",
        yshift=8,
    )

    # Mass labels below boxes
    fig.add_annotation(
        x=cx1, y=y_before - box_h / 2 - 0.22,
        text=f"m₁ = {m1:.3g} kg",
        showarrow=False, font=dict(color=COLOURS["primary"], size=9),
        xref="x", yref="y",
    )
    fig.add_annotation(
        x=cx2, y=y_before - box_h / 2 - 0.22,
        text=f"m₂ = {m2:.3g} kg",
        showarrow=False, font=dict(color=COLOURS["secondary"], size=9),
        xref="x", yref="y",
    )

    fig.update_layout(**plotly_layout(
        height=340,
        title=dict(text="Velocity Vectors Before & After Collision", font=dict(size=13)),
        xaxis=dict(
            range=[-9.0, 9.0],
            showticklabels=False,
            showgrid=False,
            zeroline=False,
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            range=[-1.8, 2.8],
            showticklabels=False,
            showgrid=False,
            zeroline=False,
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        margin=dict(l=20, r=20, t=50, b=20),
    ))
    return fig


def build_momentum_bar_chart(
    m1: float, m2: float, u1: float, u2: float, v1: float, v2: float
) -> go.Figure:
    """
    Build a grouped bar chart comparing momentum (and total momentum) before
    and after the collision for each object.

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1, u2 : initial velocities (m/s)
    v1, v2 : final velocities (m/s)

    Returns
    -------
    Plotly Figure
    """
    p1_before = m1 * u1
    p2_before = m2 * u2
    p_total_before = p1_before + p2_before

    p1_after = m1 * v1
    p2_after = m2 * v2
    p_total_after = p1_after + p2_after

    categories = ["p₁", "p₂", "p_total"]
    before_vals = [p1_before, p2_before, p_total_before]
    after_vals = [p1_after, p2_after, p_total_after]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Before",
        x=categories,
        y=before_vals,
        marker_color=COLOURS["primary"],
        opacity=0.85,
    ))
    fig.add_trace(go.Bar(
        name="After",
        x=categories,
        y=after_vals,
        marker_color=COLOURS["secondary"],
        opacity=0.85,
    ))

    # Zero line
    fig.add_hline(y=0, line=dict(color=COLOURS["grid"], width=1))

    fig.update_layout(**plotly_layout(
        height=280,
        title=dict(text="Momentum Before & After (kg·m/s)", font=dict(size=12)),
        barmode="group",
        yaxis=dict(
            title="Momentum (kg·m/s)",
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        xaxis=dict(
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        margin=dict(l=60, r=20, t=50, b=40),
    ))
    return fig


def build_2d_diagram(
    m1: float, m2: float, u1: float, res: dict
) -> go.Figure:
    """
    Build a 2D collision diagram showing ball positions and velocity vectors
    before and after contact.

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1     : initial speed of ball 1 (m/s)
    res    : output of compute_2d_collision(...)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    r = 0.5   # ball radius (display units)
    theta_rad = np.radians(res["theta_deg"])

    # ── Ball positions at moment of contact ───────────────────────────────────
    # Ball 2 at origin; ball 1 centre at distance (r1+r2) along line of contact
    # line of contact angle = theta_rad above x-axis
    x2_contact = 0.0
    y2_contact = 0.0
    x1_contact = -(r + r) * np.cos(theta_rad)
    y1_contact = -(r + r) * np.sin(theta_rad)

    # Draw ball 1 (before / contact position shown in blue)
    phi_arr = np.linspace(0, 2 * np.pi, 80)
    fig.add_trace(go.Scatter(
        x=x1_contact + r * np.cos(phi_arr),
        y=y1_contact + r * np.sin(phi_arr),
        mode="lines",
        fill="toself",
        fillcolor="rgba(31,119,180,0.4)",
        line=dict(color=COLOURS["primary"], width=2),
        name="Ball 1",
        showlegend=True,
    ))
    # Ball 1 approaching: dashed line from left
    x1_far = x1_contact - 4.0
    fig.add_trace(go.Scatter(
        x=[x1_far, x1_contact],
        y=[y1_contact, y1_contact],
        mode="lines",
        line=dict(color=COLOURS["primary"], width=1.5, dash="dot"),
        name="Ball 1 path",
        showlegend=False,
    ))
    # Incoming velocity arrow for ball 1
    v_scale_disp = 1.8 / max(u1, 1.0)
    fig.add_annotation(
        x=x1_contact, y=y1_contact,
        ax=x1_contact - u1 * v_scale_disp, ay=y1_contact,
        xref="x", yref="y", axref="x", ayref="y",
        showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
        arrowcolor=COLOURS["primary"], text="",
    )
    fig.add_annotation(
        x=x1_contact - u1 * v_scale_disp / 2,
        y=y1_contact + 0.3,
        text=f"u₁={u1:.1f} m/s",
        showarrow=False, font=dict(color=COLOURS["primary"], size=10),
        xref="x", yref="y",
    )

    # Draw ball 2 at rest
    fig.add_trace(go.Scatter(
        x=x2_contact + r * np.cos(phi_arr),
        y=y2_contact + r * np.sin(phi_arr),
        mode="lines",
        fill="toself",
        fillcolor="rgba(255,127,14,0.4)",
        line=dict(color=COLOURS["secondary"], width=2),
        name="Ball 2 (at rest)",
        showlegend=True,
    ))

    # ── Line of centres (dashed) ───────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=[x1_contact, x2_contact],
        y=[y1_contact, y2_contact],
        mode="lines",
        line=dict(color=COLOURS["grid"], width=1.5, dash="dash"),
        name="Line of centres",
        showlegend=True,
    ))

    # ── Post-collision velocity vectors ───────────────────────────────────────
    max_v_after = max(res["v1_speed"], res["v2_speed"], 0.5)
    v_after_scale = 1.8 / max_v_after

    if res["v1_speed"] > 1e-9:
        v1x_e = x1_contact + res["v1x"] * v_after_scale
        v1y_e = y1_contact + res["v1y"] * v_after_scale
        fig.add_trace(go.Scatter(
            x=[x1_contact, v1x_e], y=[y1_contact, v1y_e],
            mode="lines",
            line=dict(color=COLOURS["quaternary"], width=2.5),
            name=f"v₁ after ({res['v1_speed']:.2f} m/s, {res['phi1_deg']:.1f}°)",
            showlegend=True,
        ))
        fig.add_annotation(
            x=v1x_e, y=v1y_e,
            ax=x1_contact, ay=y1_contact,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
            arrowcolor=COLOURS["quaternary"], text="",
        )

    if res["v2_speed"] > 1e-9:
        v2x_e = x2_contact + res["v2x"] * v_after_scale
        v2y_e = y2_contact + res["v2y"] * v_after_scale
        fig.add_trace(go.Scatter(
            x=[x2_contact, v2x_e], y=[y2_contact, v2y_e],
            mode="lines",
            line=dict(color=COLOURS["tertiary"], width=2.5),
            name=f"v₂ after ({res['v2_speed']:.2f} m/s, {res['phi2_deg']:.1f}°)",
            showlegend=True,
        ))
        fig.add_annotation(
            x=v2x_e, y=v2y_e,
            ax=x2_contact, ay=y2_contact,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=3, arrowsize=1.4, arrowwidth=2,
            arrowcolor=COLOURS["tertiary"], text="",
        )

    # ── Impact parameter annotation ────────────────────────────────────────────
    # b is the perpendicular distance from ball 2 centre to ball 1 trajectory (y-axis)
    b_val = float(np.sin(theta_rad))  # normalised to r_sum = 1
    if b_val > 0.02:
        fig.add_trace(go.Scatter(
            x=[x1_contact, x1_contact],
            y=[0.0, y1_contact],
            mode="lines",
            line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
            name=f"Impact param b={b_val:.2f}",
            showlegend=True,
        ))

    fig.update_layout(**plotly_layout(
        height=440,
        title=dict(text="2D Collision — Side View at Contact", font=dict(size=13)),
        xaxis=dict(
            title="x",
            range=[-6.5, 4.0],
            scaleanchor="y",
            scaleratio=1,
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            title="y",
            range=[-3.0, 3.0],
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
    ))
    return fig


def build_2d_momentum_check(
    m1: float, m2: float, u1: float, res: dict
) -> go.Figure:
    """
    Build a 2-panel figure: angle vs impact parameter, and momentum vector diagram.

    Parameters
    ----------
    m1, m2 : masses (kg)
    u1     : initial speed (m/s)
    res    : single compute_2d_collision result (for current b)

    Returns
    -------
    Plotly Figure
    """
    # Generate angle vs b curve
    b_arr = np.linspace(0.0, 0.999, 200)
    phi1_arr = []
    phi2_arr = []
    for b_val in b_arr:
        r_tmp = compute_2d_collision(m1, m2, u1, float(b_val))
        phi1_arr.append(r_tmp["phi1_deg"])
        phi2_arr.append(r_tmp["phi2_deg"])

    fig = make_fig(rows=1, cols=2,
                   subplot_titles=("Deflection Angles vs Impact Parameter",
                                   "Momentum Vectors After Collision"))
    fig.update_layout(**plotly_layout(height=340))

    # Panel 1: angles vs b
    fig.add_trace(go.Scatter(
        x=b_arr, y=phi1_arr,
        mode="lines", name="φ₁ (ball 1 deflection)",
        line=dict(color=COLOURS["quaternary"], width=2),
    ), row=1, col=1)
    fig.add_trace(go.Scatter(
        x=b_arr, y=phi2_arr,
        mode="lines", name="φ₂ (ball 2 recoil angle)",
        line=dict(color=COLOURS["tertiary"], width=2),
    ), row=1, col=1)
    # Mark current b
    fig.add_vline(
        x=float(np.sin(np.radians(res["theta_deg"]))),
        line=dict(color=COLOURS["highlight"], width=1.5, dash="dot"),
        row=1, col=1,
    )

    fig.update_xaxes(
        title_text="Impact parameter b / (r₁+r₂)",
        gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )
    fig.update_yaxes(
        title_text="Deflection angle (°)",
        gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
        row=1, col=1,
    )

    # Panel 2: momentum vector diagram
    p_before_x = m1 * u1
    p1_after_x = m1 * res["v1x"]
    p1_after_y = m1 * res["v1y"]
    p2_after_x = m2 * res["v2x"]
    p2_after_y = m2 * res["v2y"]
    p_total_after_x = p1_after_x + p2_after_x
    p_total_after_y = p1_after_y + p2_after_y

    max_p = max(abs(p_before_x), 1.0)
    sc = 1.0 / max_p

    def add_vec(x0, y0, dx, dy, colour, name, row, col):
        fig.add_trace(go.Scatter(
            x=[x0, x0 + dx], y=[y0, y0 + dy],
            mode="lines", line=dict(color=colour, width=2.5),
            name=name, showlegend=True,
        ), row=row, col=col)
        fig.add_annotation(
            x=x0 + dx, y=y0 + dy,
            ax=x0, ay=y0,
            xref="x2", yref="y2", axref="x2", ayref="y2",
            showarrow=True, arrowhead=3, arrowsize=1.3, arrowwidth=2,
            arrowcolor=colour, text="",
        )

    add_vec(0, 0, p_before_x * sc, 0,
            COLOURS["primary"], f"p_before ({p_before_x:.2f} kg·m/s)", 1, 2)
    add_vec(0, -0.3, p1_after_x * sc, p1_after_y * sc,
            COLOURS["quaternary"],
            f"p₁ after ({m1 * res['v1_speed']:.2f} kg·m/s)", 1, 2)
    add_vec(0, -0.6, p2_after_x * sc, p2_after_y * sc,
            COLOURS["tertiary"],
            f"p₂ after ({m2 * res['v2_speed']:.2f} kg·m/s)", 1, 2)
    add_vec(0, -0.9, p_total_after_x * sc, p_total_after_y * sc,
            COLOURS["highlight"],
            f"p_total after ({np.sqrt(p_total_after_x**2 + p_total_after_y**2):.2f})", 1, 2)

    fig.update_xaxes(
        title_text="px (normalised)",
        range=[-0.4, 1.3],
        gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
        row=1, col=2,
    )
    fig.update_yaxes(
        title_text="py (normalised)",
        range=[-1.3, 0.5],
        gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
        row=1, col=2,
    )
    return fig


def build_cradle_diagram(
    n: int, k: int, phase: float
) -> go.Figure:
    """
    Build a Newton's Cradle side-view diagram.

    Balls hang on strings from a horizontal bar. The leftmost k balls are
    raised (swinging in/out) depending on phase. Phase in [0, 1]:
      0.0 = k left balls raised (start)
      0.25 = all balls hanging (contact/collision moment)
      0.5  = k right balls raised (mirror)
      0.75 = all hanging (return contact)
      1.0  = back to start

    Parameters
    ----------
    n     : total number of balls (1–5)
    k     : number of raised/swinging balls (1 to n-1)
    phase : float in [0, 1], position in swing cycle

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    L = 3.0       # string length (display units)
    r = 0.35      # ball radius
    spacing = 2 * r + 0.02   # ball spacing when hanging
    max_angle_rad = np.radians(45.0)   # raise angle

    # Horizontal bar
    total_width = n * spacing
    bar_x0 = -total_width / 2 - 0.3
    bar_x1 = total_width / 2 + 0.3
    bar_y = L + r + 0.2

    fig.add_trace(go.Scatter(
        x=[bar_x0, bar_x1], y=[bar_y, bar_y],
        mode="lines",
        line=dict(color=COLOURS["text"], width=4),
        showlegend=False, hoverinfo="skip",
    ))

    # Pivot points along bar
    pivots_x = [(-total_width / 2 + (i + 0.5) * spacing) for i in range(n)]

    # Determine current angle for raised and stationary balls
    # Phase 0 → 0.25: k left balls swing DOWN (raised → hanging)
    # Phase 0.25 → 0.5: k right balls swing UP (hanging → raised right)
    # Phase 0.5 → 0.75: k right balls swing DOWN (raised → hanging)
    # Phase 0.75 → 1.0: k left balls swing UP (hanging → raised left)
    # Approximate as sinusoidal swing

    # Map phase to angle for left group and right group
    cycle_pos = phase % 1.0
    half_pi = np.pi / 2

    # Left group angle (positive = raised left, 0 = hanging)
    if cycle_pos < 0.25:
        # Swinging down from raised left to hanging
        left_angle = max_angle_rad * np.cos(cycle_pos / 0.25 * half_pi)
    elif cycle_pos < 0.5:
        left_angle = 0.0
    elif cycle_pos < 0.75:
        left_angle = 0.0
    else:
        # Swinging back up to raised left
        left_angle = max_angle_rad * np.sin((cycle_pos - 0.75) / 0.25 * half_pi)

    # Right group angle (positive = raised right, 0 = hanging)
    if cycle_pos < 0.25:
        right_angle = 0.0
    elif cycle_pos < 0.5:
        # Swinging up from hanging to raised right
        right_angle = max_angle_rad * np.sin((cycle_pos - 0.25) / 0.25 * half_pi)
    elif cycle_pos < 0.75:
        # Swinging back down from raised right to hanging
        right_angle = max_angle_rad * np.cos((cycle_pos - 0.5) / 0.25 * half_pi)
    else:
        right_angle = 0.0

    phi_arr = np.linspace(0, 2 * np.pi, 60)
    colours_balls = [COLOURS["primary"]] * n

    for i in range(n):
        px = pivots_x[i]
        py = bar_y

        # Determine angle for this ball
        if i < k:
            # Left group (raised left initially)
            angle = -left_angle   # negative = swings to the left
        elif i >= n - k:
            # Right group (raised right after collision)
            angle = +right_angle   # positive = swings to the right
        else:
            angle = 0.0   # stationary middle balls

        # Ball centre position
        bx = px + L * np.sin(angle)
        by = py - L * np.cos(angle)

        # Draw string
        fig.add_trace(go.Scatter(
            x=[px, bx], y=[py, by],
            mode="lines",
            line=dict(color=COLOURS["grid"], width=1.5),
            showlegend=False, hoverinfo="skip",
        ))

        # Draw ball
        ball_colour = colours_balls[i]
        fill_rgba = (
            "rgba(31,119,180,0.7)" if i < k else
            "rgba(231,76,60,0.7)" if i >= n - k else
            "rgba(150,150,150,0.5)"
        )
        fig.add_trace(go.Scatter(
            x=bx + r * np.cos(phi_arr),
            y=by + r * np.sin(phi_arr),
            mode="lines",
            fill="toself",
            fillcolor=fill_rgba,
            line=dict(color=ball_colour, width=1.5),
            showlegend=False,
            hoverinfo="skip",
        ))
        # Ball label
        fig.add_annotation(
            x=bx, y=by,
            text=str(i + 1),
            showarrow=False,
            font=dict(color=COLOURS["text"], size=9),
            xref="x", yref="y",
        )

    # Phase label
    phase_labels = {
        0.0: "k balls raised (left)",
        0.25: "All hanging — collision!",
        0.5: "k balls raised (right)",
        0.75: "All hanging — collision!",
        1.0: "k balls raised (left) — cycle complete",
    }
    nearest_label = min(phase_labels.keys(), key=lambda x: abs(x - cycle_pos))
    fig.add_annotation(
        x=0, y=-0.5,
        text=f"<b>Phase {cycle_pos:.2f}: {phase_labels.get(cycle_pos, '')}</b>",
        showarrow=False,
        font=dict(color=COLOURS["text"], size=11),
        xref="x", yref="y",
    )

    pad_x = total_width / 2 + 1.5
    fig.update_layout(**plotly_layout(
        height=420,
        title=dict(
            text=f"Newton's Cradle — {n} balls, {k} raised",
            font=dict(size=13),
        ),
        xaxis=dict(
            range=[-pad_x, pad_x],
            scaleanchor="y", scaleratio=1,
            showticklabels=False, showgrid=False, zeroline=False,
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            range=[-1.0, bar_y + 0.5],
            showticklabels=False, showgrid=False, zeroline=False,
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        margin=dict(l=20, r=20, t=50, b=20),
    ))
    return fig


def build_cradle_momentum_fig(n: int, k: int, m: float, v: float) -> go.Figure:
    """
    Build a bar chart showing momentum and KE at each phase of Newton's cradle.

    At phases 0 and 1: p = k*m*v (left group moving), KE = 0.5*k*m*v^2.
    At phases 0.25 and 0.75: collision — instantaneous transfer.
    At phase 0.5: k right balls moving with same p and KE.

    Parameters
    ----------
    n : number of balls
    k : number of raised balls
    m : mass per ball (kg)
    v : speed of raised balls at bottom (m/s)

    Returns
    -------
    Plotly Figure
    """
    p_moving = k * m * v
    ke_moving = 0.5 * k * m * v ** 2

    phases = ["t=0\n(k left raised)", "t=T/4\n(contact)", "t=T/2\n(k right raised)",
              "t=3T/4\n(contact)", "t=T\n(k left raised)"]
    p_vals = [p_moving, p_moving, p_moving, p_moving, p_moving]
    ke_vals = [ke_moving, 0.0, ke_moving, 0.0, ke_moving]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Momentum (kg·m/s)",
        x=phases, y=p_vals,
        marker_color=COLOURS["primary"], opacity=0.85,
        yaxis="y",
    ))
    fig.add_trace(go.Bar(
        name="KE (J)",
        x=phases, y=ke_vals,
        marker_color=COLOURS["secondary"], opacity=0.85,
        yaxis="y2",
    ))

    fig.update_layout(**plotly_layout(
        height=300,
        title=dict(text="Total Momentum & KE Through Cradle Cycle", font=dict(size=12)),
        barmode="group",
        yaxis=dict(
            title="Momentum (kg·m/s)",
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis2=dict(
            title="Kinetic Energy (J)",
            overlaying="y", side="right",
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        legend=dict(
            bgcolor="rgba(0,0,0,0.4)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
        ),
        margin=dict(l=60, r=60, t=50, b=60),
    ))
    return fig


# ── Physics notes content ─────────────────────────────────────────────────────

EQUATIONS = [
    r"p = mv",
    r"J = \Delta p = F \Delta t \quad \text{(Impulse-Momentum Theorem)}",
    r"m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2 \quad \text{(Conservation of Momentum)}",
    r"e = \frac{v_{\text{sep}}}{v_{\text{approach}}} = \frac{v_2 - v_1}{u_1 - u_2}",
    r"\Delta KE_{\text{lost}} = \tfrac{1}{2}\mu (u_{\text{rel}})^2 (1 - e^2), \quad \mu = \frac{m_1 m_2}{m_1 + m_2}",
    r"v_1 = \frac{m_1 u_1 + m_2 u_2 + m_2 e(u_2 - u_1)}{m_1 + m_2}",
    r"v_2 = \frac{m_1 u_1 + m_2 u_2 + m_1 e(u_1 - u_2)}{m_1 + m_2}",
]

EXPLANATION = (
    "**Conservation of Momentum** states that the total momentum of an isolated system "
    "is constant. In every collision (elastic, inelastic, or explosion), the total "
    "momentum before equals the total momentum after — provided no external forces act.\n\n"
    "**Coefficient of Restitution (e):** Measures the 'bounciness' of a collision. "
    "e = 1 means elastic (KE conserved). e = 0 means perfectly inelastic (objects stick). "
    "For real collisions 0 < e < 1. The definition e = v_sep / v_approach means: "
    "how fast objects separate compared with how fast they approached.\n\n"
    "**Impulse-Momentum Theorem:** The impulse J = FΔt equals the change in momentum Δp. "
    "A longer collision time means a smaller force for the same impulse. This is why "
    "airbags, helmets, and crumple zones reduce injury — they increase Δt.\n\n"
    "**Elastic collision:** KE is conserved. For equal masses, the first ball stops "
    "and the second moves on with the original speed (Newton's Cradle).\n\n"
    "**Perfectly inelastic:** Objects stick together. Maximum possible KE is lost — "
    "but momentum is still conserved. v_f = (m₁u₁ + m₂u₂)/(m₁ + m₂)."
)

ADVANCED_TEXT = (
    "**Reduced mass:** For a 2-body collision, the reduced mass is "
    r"$\mu = m_1 m_2 / (m_1 + m_2)$. "
    "The KE lost in a general collision is $\\Delta KE = \\frac{1}{2}\\mu u_{rel}^2(1-e^2)$ "
    "where $u_{rel} = u_1 - u_2$. This neatly separates the role of masses from "
    "the coefficient of restitution.\n\n"
    "**Centre-of-mass (CoM) frame:** In the CoM frame, total momentum = 0. Each particle "
    "simply reverses its velocity in an elastic collision. The CoM frame simplifies "
    "2D collision calculations enormously.\n\n"
    "**Derivation of e formula:** Newton's original definition uses the normal "
    "component of relative velocity: e = -(v₁ - v₂)/(u₁ - u₂). Combined with "
    "momentum conservation, this fully determines both post-collision velocities.\n\n"
    "**Proof that perfectly inelastic maximises energy loss:** For given initial "
    "conditions, the KE lost is $\\Delta KE = \\frac{1}{2}\\mu u_{rel}^2 (1-e^2)$. "
    "This is maximised when e = 0 (perfectly inelastic), confirming that sticking "
    "together always loses the most kinetic energy while still conserving momentum. "
    "A negative e (explosion) increases total KE — energy is added from an internal source "
    "(e.g. chemical energy in an explosive)."
)


# ── Main page ─────────────────────────────────────────────────────────────────


def main() -> None:
    """Render the full Momentum & Collisions simulation page."""

    sim_header(
        "Momentum & Collisions",
        "Component 1, Topic 2 (Kinematics and Dynamics)",
    )

    left_col, right_col = two_column_layout(3, 7)

    # ────────────────────────────────────────────────────────────────────────────
    # Left column: controls
    # ────────────────────────────────────────────────────────────────────────────

    with left_col:
        mode = mode_toggle()

        ctrl_tab1, ctrl_tab2, ctrl_tab3 = st.tabs(
            ["1D Collisions", "2D Collisions", "Newton's Cradle"]
        )

        # ── Tab 1 controls: 1D Collisions ─────────────────────────────────────
        with ctrl_tab1:
            st.subheader("1D Collision Parameters")

            preset_choice_1d = st.selectbox(
                "Real-world preset",
                options=list(PRESETS_1D.keys()),
                index=0,
                key="col1d_preset",
                help="Select a real-world example or choose Custom.",
            )
            preset_1d = PRESETS_1D[preset_choice_1d]

            # Default values from preset or manual
            _m1_def = float(preset_1d["m1"]) if preset_1d else 1.0
            _m2_def = float(preset_1d["m2"]) if preset_1d else 2.0
            _u1_def = float(preset_1d["u1"]) if preset_1d else 5.0
            _u2_def = float(preset_1d["u2"]) if preset_1d else 0.0
            _e_def = float(preset_1d["e"]) if preset_1d else 1.0

            # Clamp to slider ranges for display
            _m1_disp = float(np.clip(_m1_def, 0.1, 10.0))
            _m2_disp = float(np.clip(_m2_def, 0.1, 10.0))
            _u1_disp = float(np.clip(_u1_def, -10.0, 10.0))
            _u2_disp = float(np.clip(_u2_def, -10.0, 10.0))
            _e_disp = float(np.clip(_e_def, 0.0, 1.0))

            disabled_1d = preset_1d is not None

            m1_1d = st.slider(
                "Mass m₁ (kg)", 0.1, 10.0, _m1_disp, 0.1,
                key="col1d_m1",
                disabled=disabled_1d,
                help="Mass of object 1.",
            )
            m1_1d = _m1_def if preset_1d else m1_1d

            m2_1d = st.slider(
                "Mass m₂ (kg)", 0.1, 10.0, _m2_disp, 0.1,
                key="col1d_m2",
                disabled=disabled_1d,
                help="Mass of object 2.",
            )
            m2_1d = _m2_def if preset_1d else m2_1d

            u1_1d = st.slider(
                "Initial velocity u₁ (m/s)", -10.0, 10.0, _u1_disp, 0.5,
                key="col1d_u1",
                disabled=disabled_1d,
                help="Initial velocity of object 1. Positive = rightward.",
            )
            u1_1d = _u1_def if preset_1d else u1_1d

            u2_1d = st.slider(
                "Initial velocity u₂ (m/s)", -10.0, 10.0, _u2_disp, 0.5,
                key="col1d_u2",
                disabled=disabled_1d,
                help="Initial velocity of object 2. Positive = rightward.",
            )
            u2_1d = _u2_def if preset_1d else u2_1d

            # Collision type selector
            coll_type = st.selectbox(
                "Collision type",
                ["Elastic (e = 1)", "Perfectly Inelastic (e = 0)", "Custom (set e)"],
                index=0,
                key="col1d_type",
                disabled=disabled_1d,
                help="Choose collision type or set a custom coefficient of restitution.",
            )

            if preset_1d:
                e_1d = _e_def
                if e_1d == 1.0:
                    coll_label = "Elastic"
                elif e_1d == 0.0:
                    coll_label = "Perfectly Inelastic"
                elif e_1d < 0:
                    coll_label = "Explosion"
                else:
                    coll_label = f"Custom (e = {e_1d:.2f})"
            else:
                if coll_type == "Elastic (e = 1)":
                    e_1d = 1.0
                elif coll_type == "Perfectly Inelastic (e = 0)":
                    e_1d = 0.0
                else:
                    e_1d = st.slider(
                        "Coefficient of restitution e", 0.0, 1.0, 0.7, 0.01,
                        key="col1d_e",
                        help="e = 0: stick together. e = 1: elastic. 0 < e < 1: partial bounce.",
                    )
                coll_label = coll_type

            if mode == "Advanced":
                advanced_divider()
                mu_reduced = (m1_1d * m2_1d) / (m1_1d + m2_1d)
                u_rel = u1_1d - u2_1d
                e_use = max(e_1d, 0.0)
                ke_loss_formula = 0.5 * mu_reduced * u_rel ** 2 * (1 - e_use ** 2)
                st.caption(
                    f"**Reduced mass** μ = m₁m₂/(m₁+m₂) = {mu_reduced:.3g} kg\n\n"
                    f"**Predicted KE loss** = ½μ u_rel²(1-e²) = {ke_loss_formula:.3g} J\n\n"
                    f"(Negative for explosions — energy is added.)"
                )

        # ── Tab 2 controls: 2D Collisions ─────────────────────────────────────
        with ctrl_tab2:
            st.subheader("2D Collision Parameters")
            st.caption("Ball 2 is initially at rest. Ball 1 approaches along the x-axis.")

            m1_2d = st.slider(
                "Mass m₁ (kg)", 0.1, 10.0, 1.0, 0.1,
                key="col2d_m1",
                help="Mass of approaching ball.",
            )
            m2_2d = st.slider(
                "Mass m₂ (kg)", 0.1, 10.0, 1.0, 0.1,
                key="col2d_m2",
                help="Mass of target ball (at rest).",
            )
            u1_2d = st.slider(
                "Approach speed u₁ (m/s)", 1.0, 20.0, 8.0, 0.5,
                key="col2d_u1",
                help="Speed of ball 1 before collision.",
            )
            b_2d = st.slider(
                "Impact parameter b / (r₁+r₂)", 0.0, 0.99, 0.5, 0.01,
                key="col2d_b",
                help=(
                    "Normalised impact parameter. 0 = head-on collision, "
                    "1 = glancing (barely touching)."
                ),
            )

            if mode == "Advanced":
                advanced_divider()
                e_2d = st.slider(
                    "Coefficient of restitution e", 0.0, 1.0, 1.0, 0.01,
                    key="col2d_e",
                    help="e = 1 for elastic; < 1 for partially inelastic.",
                )
                st.caption(
                    "In the 2D case e applies to the normal component of relative "
                    "velocity (along the line of centres). The tangential component "
                    "is unchanged (no friction between smooth spheres)."
                )
            else:
                e_2d = 1.0   # elastic only in basic mode

        # ── Tab 3 controls: Newton's Cradle ───────────────────────────────────
        with ctrl_tab3:
            st.subheader("Newton's Cradle Parameters")

            n_balls = st.slider(
                "Total number of balls n", 1, 5, 5,
                key="cradle_n",
                help="Total balls in the cradle.",
            )
            k_balls = st.slider(
                "Number raised k", 1, max(1, n_balls - 1), min(1, n_balls - 1),
                key="cradle_k",
                help="How many balls are raised and released.",
            )
            k_balls = min(k_balls, n_balls - 1)

            cradle_m = st.slider(
                "Mass per ball (kg)", 0.05, 1.0, 0.1, 0.01,
                key="cradle_m",
                help="Mass of each individual ball.",
            )
            cradle_v = st.slider(
                "Speed at bottom v (m/s)", 0.5, 5.0, 2.0, 0.1,
                key="cradle_v",
                help="Speed of swinging balls at the moment of collision.",
            )
            cradle_phase = st.slider(
                "Cycle phase (0 = left raised, 0.5 = right raised)", 0.0, 1.0, 0.0, 0.05,
                key="cradle_phase",
                help="Scrub through the swing cycle to see each stage.",
            )

            if mode == "Advanced":
                advanced_divider()
                p_total_cradle = k_balls * cradle_m * cradle_v
                ke_total_cradle = 0.5 * k_balls * cradle_m * cradle_v ** 2
                st.caption(
                    f"**Why k in = k out?**\n\n"
                    f"Two conservation laws must BOTH hold simultaneously:\n\n"
                    f"Momentum: p = {p_total_cradle:.3g} kg·m/s\n\n"
                    f"Kinetic energy: KE = {ke_total_cradle:.3g} J\n\n"
                    f"For n equal balls, the ONLY integer solution satisfying both "
                    f"is exactly k balls moving on the other side — not any other "
                    f"combination. Uniqueness is guaranteed by the system of two "
                    f"simultaneous equations."
                )

    # ────────────────────────────────────────────────────────────────────────────
    # Right column: plots
    # ────────────────────────────────────────────────────────────────────────────

    with right_col:
        plot_tab1, plot_tab2, plot_tab3 = st.tabs(
            ["1D Collisions", "2D Collisions", "Newton's Cradle"]
        )

        # ── Tab 1: 1D Collisions ──────────────────────────────────────────────
        with plot_tab1:
            res_1d = compute_1d_collision(m1_1d, m2_1d, u1_1d, u2_1d, e_1d)

            v1_r = res_1d["v1"]
            v2_r = res_1d["v2"]
            p_before = res_1d["p_before"]
            p_after = res_1d["p_after"]
            ke_before = res_1d["ke_before"]
            ke_after = res_1d["ke_after"]
            delta_ke = res_1d["delta_ke"]
            e_comp = res_1d["e_computed"]
            impulse = res_1d["impulse_J"]

            # Metrics
            metric_row({
                "p before": f"{p_before:.3g} kg·m/s",
                "p after": f"{p_after:.3g} kg·m/s",
                "ΔKE": f"{delta_ke:.3g} J",
                "e (computed)": f"{e_comp:.3f}" if np.isfinite(e_comp) else "—",
                "Impulse J": f"{impulse:.3g} N·s",
            })

            # Preset context card
            if preset_1d:
                st.info(f"**{preset_choice_1d}:** {preset_1d['note']}")

            # Momentum conservation check
            mom_err = abs(p_after - p_before)
            if mom_err < 1e-6 * max(abs(p_before), 1.0):
                st.success(
                    f"Momentum is conserved: p_before = {p_before:.4g} kg·m/s, "
                    f"p_after = {p_after:.4g} kg·m/s. "
                    + (
                        "KE is also conserved — elastic collision."
                        if abs(delta_ke) < 1e-6 * max(ke_before, 1.0)
                        else (
                            f"KE increased by {abs(delta_ke):.3g} J (explosion — internal energy released)."
                            if delta_ke > 1e-6
                            else f"KE lost: {abs(delta_ke):.3g} J converted to heat/sound/deformation."
                        )
                    )
                )
            else:
                st.error(f"Momentum check failed — error = {mom_err:.2e} (numerical issue).")

            # Impulse-Momentum reminder
            st.info(
                "**Impulse-Momentum Theorem:** The impulse J = FΔt = Δp. "
                "Larger collision time → smaller force for the same change in momentum. "
                "This is why car airbags, helmets, and crumple zones save lives."
            )

            # Live collision animation
            anim_html = build_collision_animation(m1_1d, m2_1d, u1_1d, u2_1d, v1_r, v2_r)
            components.html(anim_html, height=390)
            st.caption("Ball size ∝ mass · Orange arrows = velocity · ⚡ Speed · ↺ Replay")
            st.divider()

            # Velocity vector diagram
            fig_vec = build_1d_vector_diagram(m1_1d, m2_1d, u1_1d, u2_1d, v1_r, v2_r)
            st.plotly_chart(fig_vec, use_container_width=True)

            # Momentum bar chart
            fig_bar = build_momentum_bar_chart(m1_1d, m2_1d, u1_1d, u2_1d, v1_r, v2_r)
            st.plotly_chart(fig_bar, use_container_width=True)

            # Advanced: energy bar chart
            if mode == "Advanced":
                fig_ke = go.Figure()
                fig_ke.add_trace(go.Bar(
                    x=["KE before", "KE after"],
                    y=[ke_before, ke_after],
                    marker_color=[COLOURS["primary"], COLOURS["tertiary"]],
                    opacity=0.85,
                    text=[f"{ke_before:.3g} J", f"{ke_after:.3g} J"],
                    textposition="auto",
                ))
                fig_ke.update_layout(**plotly_layout(
                    height=220,
                    title=dict(text="Kinetic Energy Before & After", font=dict(size=12)),
                    yaxis=dict(
                        title="KE (J)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    xaxis=dict(
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    margin=dict(l=60, r=20, t=40, b=40),
                ))
                st.plotly_chart(fig_ke, use_container_width=True)

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 2: 2D Collisions ──────────────────────────────────────────────
        with plot_tab2:
            res_2d = compute_2d_collision(m1_2d, m2_2d, u1_2d, b_2d, e_2d)

            # Metrics
            metric_row({
                "v₁ speed": f"{res_2d['v1_speed']:.3f} m/s",
                "v₂ speed": f"{res_2d['v2_speed']:.3f} m/s",
                "φ₁ (deflection)": f"{res_2d['phi1_deg']:.1f}°",
                "φ₂ (recoil)": f"{res_2d['phi2_deg']:.1f}°",
                "ΔKE": f"{res_2d['delta_ke']:.3g} J",
            })

            # Momentum check
            p_err_2d = abs(res_2d["p_after"] - res_2d["p_before"])
            if p_err_2d < 1e-4 * max(res_2d["p_before"], 1.0):
                st.success(
                    f"Momentum conserved: |p_before| = {res_2d['p_before']:.4g} kg·m/s, "
                    f"|p_after| = {res_2d['p_after']:.4g} kg·m/s."
                )
            else:
                st.warning(f"Momentum check: error = {p_err_2d:.3g} kg·m/s.")

            # Physics insight for equal masses
            if abs(m1_2d - m2_2d) < 0.05 and e_2d > 0.99:
                st.info(
                    "**Equal mass elastic collision:** The deflection angle for ball 1 "
                    "and the recoil angle for ball 2 should sum to 90° — a classic result "
                    "that follows from simultaneous conservation of momentum and KE for "
                    "equal masses. Verify: "
                    f"φ₁ + φ₂ ≈ {abs(res_2d['phi1_deg']) + abs(res_2d['phi2_deg']):.1f}°."
                )

            # 2D diagram
            fig_2d = build_2d_diagram(m1_2d, m2_2d, u1_2d, res_2d)
            st.plotly_chart(fig_2d, use_container_width=True)

            # Angle and momentum chart
            fig_2d_check = build_2d_momentum_check(m1_2d, m2_2d, u1_2d, res_2d)
            st.plotly_chart(fig_2d_check, use_container_width=True)

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 3: Newton's Cradle ────────────────────────────────────────────
        with plot_tab3:
            p_cradle = k_balls * cradle_m * cradle_v
            ke_cradle = 0.5 * k_balls * cradle_m * cradle_v ** 2

            metric_row({
                "Balls raised k": str(k_balls),
                "Total p": f"{p_cradle:.3g} kg·m/s",
                "Total KE": f"{ke_cradle:.3g} J",
                "Speed at bottom": f"{cradle_v:.2f} m/s",
            })

            st.info(
                "Newton's Cradle only works as expected because BOTH momentum AND kinetic "
                "energy must be conserved simultaneously. With 5 equal balls raising 2, the "
                "only solution satisfying BOTH laws is exactly 2 balls rising on the other "
                "side — not all 5 moving slowly."
            )

            # Cradle diagram
            fig_cradle = build_cradle_diagram(n_balls, k_balls, cradle_phase)
            st.plotly_chart(fig_cradle, use_container_width=True)

            # Momentum & KE through cycle
            fig_cradle_mk = build_cradle_momentum_fig(n_balls, k_balls, cradle_m, cradle_v)
            st.plotly_chart(fig_cradle_mk, use_container_width=True)

            # Show why k balls on each side is the unique solution
            if mode == "Advanced":
                st.subheader("Why does k in = k out?")
                # Show possible solutions for different numbers of balls exiting
                v_exit_options = {}
                for k_out in range(1, n_balls):
                    # k_out balls exit at speed v_out
                    # p: k * m * v = k_out * m * v_out → v_out = (k/k_out)*v
                    v_out_p = (k_balls / k_out) * cradle_v
                    # KE: 0.5*k*m*v^2 = 0.5*k_out*m*v_out^2 → v_out = sqrt(k/k_out)*v
                    v_out_ke = np.sqrt(k_balls / k_out) * cradle_v
                    v_exit_options[k_out] = (v_out_p, v_out_ke)

                rows = []
                for k_out, (v_p, v_ke) in v_exit_options.items():
                    match = abs(v_p - v_ke) < 1e-9
                    rows.append({
                        "k_out": k_out,
                        "v from momentum (m/s)": f"{v_p:.3f}",
                        "v from KE (m/s)": f"{v_ke:.3f}",
                        "Both satisfied?": "YES" if match else "NO",
                    })

                # Display as a simple table
                col_headers = ["k_out", "v from momentum", "v from KE", "Both satisfied?"]
                table_md = "| " + " | ".join(col_headers) + " |\n"
                table_md += "| " + " | ".join(["---"] * len(col_headers)) + " |\n"
                for row in rows:
                    table_md += (
                        f"| {row['k_out']} "
                        f"| {row['v from momentum (m/s)']} "
                        f"| {row['v from KE (m/s)']} "
                        f"| {row['Both satisfied?']} |\n"
                    )
                st.markdown(table_md)
                st.caption(
                    "Only the row where k_out = k satisfies BOTH conservation laws simultaneously. "
                    "All other configurations conserve momentum OR energy, but not both."
                )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
