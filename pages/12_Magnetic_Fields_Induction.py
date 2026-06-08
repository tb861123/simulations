"""
Magnetic Fields & Electromagnetic Induction — WJEC Eduqas A Level Physics.

Four sub-simulations:
  1. Magnetic Force on a current-carrying wire / charged particle in a B field.
  2. Electromagnetic Induction (Faraday's law) — magnet moving through a coil.
  3. Transformer — turns ratio, voltages, currents and power.
  4. DC Motor — torque on a current-carrying coil, commutator effect.

Spec reference: Component 2, Topic 7 (Magnetic Fields), sections (a)–(n).
"""

import json

import numpy as np
from utils.exam_ui import show_exam_panel
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import mu0, e_charge, m_e, m_p  # noqa: F401
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
    page_title="Magnetic Fields & Induction — WJEC Physics",
    page_icon="🧲",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

SPEC_REF = "Component 2, Topic 7 (Magnetic Fields), sections (a)–(n)"

N_TIME = 400   # time-series samples for induction sim
N_ORBIT = 500  # points around one circular orbit


# ── Physics helpers ───────────────────────────────────────────────────────────

def force_on_wire(B: float, I: float, L: float, theta_deg: float) -> float:
    """F = BIL sin θ — force on current-carrying conductor in a magnetic field."""
    return B * I * L * np.sin(np.radians(theta_deg))


def circular_orbit(
    particle: str, speed: float, B: float
) -> tuple[float, float, float, np.ndarray, np.ndarray]:
    """
    Circular motion of a charged particle in a uniform magnetic field.

    Parameters
    ----------
    particle : 'Electron' or 'Proton'
    speed    : particle speed (m/s)
    B        : magnetic flux density (T)

    Returns
    -------
    r    : orbital radius (m)
    T    : orbital period (s)
    f    : cyclotron frequency (Hz)
    x, y : trajectory arrays (m)
    """
    mass = m_e if particle == "Electron" else m_p
    charge = e_charge  # magnitude only (same for e and p)

    r = mass * speed / (charge * B)
    T = 2 * np.pi * mass / (charge * B)
    f = charge * B / (2 * np.pi * mass)

    theta = np.linspace(0, 2 * np.pi, N_ORBIT)
    x = r * np.cos(theta)
    y = r * np.sin(theta)

    return r, T, f, x, y


@st.cache_data
def compute_induction(
    N: int, A: float, v_mag: float, B_max: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """
    Model flux and induced EMF as a magnet passes through a coil.

    B_coil(t) = B_max * exp(-((t - t_peak)/sigma)²)
    EMF = -N * dΦ/dt  (numerical derivative)

    Parameters
    ----------
    N     : number of turns
    A     : coil area (m²)
    v_mag : magnet speed (m/s)
    B_max : peak field strength (T)

    Returns
    -------
    t_arr   : time array (s)
    flux    : magnetic flux array (Wb)
    emf     : induced EMF array (V)
    peak_emf: peak absolute EMF (V)
    """
    t_arr = np.linspace(0, 4, N_TIME)
    t_peak = 2.0
    sigma = 1.0 / v_mag  # wider Gaussian for slower magnet

    B_coil = B_max * np.exp(-((t_arr - t_peak) / sigma) ** 2)
    flux = B_coil * A  # Φ = B·A (uniform field through area)

    # Numerical derivative for EMF = -N dΦ/dt
    dflux_dt = np.gradient(flux, t_arr)
    emf = -N * dflux_dt

    peak_emf = float(np.max(np.abs(emf)))
    return t_arr, flux, emf, peak_emf


@st.cache_data
def compute_transformer(
    N_p: int, N_s: int, V_p: float, R_L: float
) -> tuple[float, float, float, float, np.ndarray, np.ndarray, np.ndarray]:
    """
    Ideal transformer calculations plus sinusoidal voltage traces.

    Parameters
    ----------
    N_p : primary turns
    N_s : secondary turns
    V_p : primary (peak) voltage (V)
    R_L : load resistance (Ω)

    Returns
    -------
    V_s   : secondary peak voltage (V)
    I_s   : secondary current (A)
    I_p   : primary current (A)
    P     : power delivered to load (W)
    t     : time array (s) — two full cycles of a 50 Hz signal
    v_pri : primary voltage trace (V)
    v_sec : secondary voltage trace (V)
    """
    k = N_s / N_p
    V_s = k * V_p
    I_s = V_s / R_L
    I_p = I_s * N_s / N_p
    P = (V_s / np.sqrt(2)) ** 2 / R_L  # rms power

    t = np.linspace(0, 2 / 50, 400)  # 2 cycles at 50 Hz
    omega = 2 * np.pi * 50
    v_pri = V_p * np.sin(omega * t)
    v_sec = V_s * np.sin(omega * t)

    return V_s, I_s, I_p, P, t, v_pri, v_sec


# ── Plot builders ─────────────────────────────────────────────────────────────

def build_force_diagram(
    B: float, I: float, L: float, theta_deg: float, F: float
) -> go.Figure:
    """
    Schematic force diagram: wire in a magnetic field.

    Draws the wire (along y-axis), B-field arrows (into/out of page
    represented as crosses/dots on a grid), and annotates the force.
    """
    fig = go.Figure()

    # Grid of B-field symbols (into page = cross, out of page = dot)
    xs = np.linspace(-1.5, 1.5, 7)
    ys = np.linspace(-1.5, 1.5, 7)
    Xg, Yg = np.meshgrid(xs, ys)
    symbol = "x" if theta_deg < 90 else "circle"

    fig.add_trace(go.Scatter(
        x=Xg.ravel(), y=Yg.ravel(),
        mode="markers",
        marker=dict(symbol=symbol, size=10, color=COLOURS["quaternary"],
                    opacity=0.5),
        name="B field (into page)" if theta_deg < 90 else "B field (out of page)",
        showlegend=True,
    ))

    # Wire — drawn as a bold vertical line at x=0
    fig.add_trace(go.Scatter(
        x=[0, 0], y=[-L / 2, L / 2],
        mode="lines+markers",
        line=dict(color=COLOURS["primary"], width=8),
        marker=dict(size=10, color=COLOURS["primary"]),
        name=f"Wire (I = {I} A, L = {L} m)",
    ))

    # Force arrow (horizontal, direction indicates sign)
    arrow_x = min(F / (max(abs(F), 1e-9)) * 0.8, 0.8)
    fig.add_annotation(
        x=arrow_x, y=0,
        ax=0, ay=0,
        xref="x", yref="y", axref="x", ayref="y",
        arrowhead=3, arrowsize=2, arrowwidth=3,
        arrowcolor=COLOURS["highlight"],
        text=f"<b>F = {F:.4f} N</b>",
        font=dict(color=COLOURS["highlight"], size=13),
        showarrow=True,
        bgcolor="rgba(0,0,0,0.5)",
        bordercolor=COLOURS["highlight"],
        borderwidth=1,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=380,
        title=dict(text="Force on Wire in Magnetic Field (F = BIL sinθ)",
                   font=dict(size=14)),
        xaxis=dict(range=[-2, 2], title="x (relative)", **grid_style),
        yaxis=dict(range=[-2, 2], title="y (relative)", scaleanchor="x",
                   scaleratio=1, **grid_style),
        showlegend=True,
    ))
    return fig


def build_orbit_plot(
    x: np.ndarray,
    y: np.ndarray,
    r: float,
    particle: str,
    speed: float,
) -> go.Figure:
    """
    Circular orbit trajectory of a charged particle in a uniform B field.
    """
    fig = go.Figure()

    colour = COLOURS["advanced"] if particle == "Electron" else COLOURS["secondary"]

    fig.add_trace(go.Scatter(
        x=x * 100, y=y * 100,   # convert to cm for readability
        mode="lines",
        line=dict(color=colour, width=2.5),
        name=f"{particle} orbit",
    ))

    # Mark starting position
    fig.add_trace(go.Scatter(
        x=[x[0] * 100], y=[y[0] * 100],
        mode="markers",
        marker=dict(symbol="arrow-right", size=14, color=COLOURS["highlight"],
                    angleref="previous"),
        name="Start / velocity direction",
        showlegend=True,
    ))

    # Centre marker
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode="markers",
        marker=dict(symbol="cross", size=10, color=COLOURS["text"]),
        name="Centre",
        showlegend=False,
    ))

    # Radius annotation
    fig.add_annotation(
        x=r * 100 / 2, y=r * 100 / 2,
        text=f"r = {r * 100:.2f} cm",
        showarrow=False,
        font=dict(color=colour, size=11),
        bgcolor="rgba(0,0,0,0.5)",
    )

    pad = r * 100 * 1.3
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=400,
        title=dict(
            text=f"Circular Orbit of {particle} in Magnetic Field  (v = {speed:.2e} m/s)",
            font=dict(size=13),
        ),
        xaxis=dict(range=[-pad, pad], title="x (cm)", scaleanchor="y",
                   scaleratio=1, **grid_style),
        yaxis=dict(range=[-pad, pad], title="y (cm)", **grid_style),
        showlegend=True,
    ))
    return fig


def build_induction_plot(
    t_arr: np.ndarray,
    flux: np.ndarray,
    emf: np.ndarray,
    N: int,
    show_current: bool = False,
    R_coil: float = 10.0,
) -> go.Figure:
    """
    Dual subplot: flux vs time (top) and induced EMF vs time (bottom).
    In Advanced mode a third panel shows induced current.
    """
    rows = 3 if show_current else 2
    subplot_titles = ["Magnetic Flux Φ vs Time", "Induced EMF vs Time"]
    if show_current:
        subplot_titles.append("Induced Current vs Time")

    fig = make_subplots(
        rows=rows, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.10,
        subplot_titles=subplot_titles,
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])

    # Row 1: Flux
    fig.add_trace(go.Scatter(
        x=t_arr, y=flux * 1000,  # mWb
        mode="lines",
        name="Φ (mWb)",
        line=dict(color=COLOURS["primary"], width=2.5),
    ), row=1, col=1)

    # Row 2: EMF
    fig.add_trace(go.Scatter(
        x=t_arr, y=emf,
        mode="lines",
        name="EMF (V)",
        line=dict(color=COLOURS["secondary"], width=2.5),
    ), row=2, col=1)

    # Zero-line reference for EMF
    fig.add_hline(y=0, line_dash="dot",
                  line_color=COLOURS["grid"], opacity=0.6, row=2, col=1)

    if show_current:
        current = emf / R_coil
        fig.add_trace(go.Scatter(
            x=t_arr, y=current,
            mode="lines",
            name=f"I = EMF/R (R={R_coil:.0f}Ω)",
            line=dict(color=COLOURS["tertiary"], width=2.5),
        ), row=3, col=1)
        fig.add_hline(y=0, line_dash="dot",
                      line_color=COLOURS["grid"], opacity=0.6, row=3, col=1)
        fig.update_yaxes(title_text="Current (A)", row=3, col=1, **grid_style)
        fig.update_xaxes(title_text="Time (s)", row=3, col=1, **grid_style)
    else:
        fig.update_xaxes(title_text="Time (s)", row=2, col=1, **grid_style)

    fig.update_yaxes(title_text="Flux (mWb)", row=1, col=1, **grid_style)
    fig.update_yaxes(title_text="EMF (V)", row=2, col=1, **grid_style)

    height = 560 if not show_current else 720
    fig.update_layout(**plotly_layout(
        height=height,
        title=dict(
            text=f"Electromagnetic Induction  (N = {N} turns)",
            font=dict(size=14),
        ),
        showlegend=True,
    ))
    return fig


def build_transformer_plot(
    t: np.ndarray,
    v_pri: np.ndarray,
    v_sec: np.ndarray,
    V_p: float,
    V_s: float,
) -> go.Figure:
    """
    Primary and secondary voltage sinusoids on the same axes.
    """
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t * 1000, y=v_pri,
        mode="lines",
        name=f"Primary V_p (peak {V_p:.1f} V)",
        line=dict(color=COLOURS["primary"], width=2.5),
    ))

    fig.add_trace(go.Scatter(
        x=t * 1000, y=v_sec,
        mode="lines",
        name=f"Secondary V_s (peak {V_s:.1f} V)",
        line=dict(color=COLOURS["secondary"], width=2.5, dash="dash"),
    ))

    # Zero reference
    fig.add_hline(y=0, line_dash="dot",
                  line_color=COLOURS["grid"], opacity=0.6)

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=400,
        title=dict(text="Transformer Voltages (50 Hz, 2 cycles)", font=dict(size=14)),
        xaxis=dict(title="Time (ms)", **grid_style),
        yaxis=dict(title="Voltage (V)", **grid_style),
        showlegend=True,
    ))
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────

def build_induction_animation(v_magnet: float, B_field: float, N_coil: int) -> str:
    """
    Return a self-contained HTML/p5.js string that animates electromagnetic
    induction: a bar magnet moves toward/away from a solenoid coil and a
    galvanometer needle deflects in proportion to the induced EMF.

    Parameters
    ----------
    v_magnet : float  — magnet speed from the Streamlit slider (m/s)
    B_field  : float  — peak B field from the Streamlit slider (T)
    N_coil   : int    — number of coil turns from the Streamlit slider
    """
    data = json.dumps({"vMagnet": float(v_magnet), "B": float(B_field), "N": int(N_coil)})
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{
    margin: 0; padding: 0;
    background: #0e1117;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    font-family: 'Segoe UI', sans-serif;
    color: #fafafa;
    overflow: hidden;
  }}
  #controls {{
    width: 780px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px;
    background: #1a1d27;
    border-radius: 8px;
    margin: 6px 0 2px;
    font-size: 12px;
  }}
  #controls button {{
    background: #2d4a8a; color: #fff; border: none;
    padding: 4px 14px; border-radius: 5px; cursor: pointer;
    font-size: 12px;
  }}
  #controls button:hover {{ background: #3a5eb0; }}
  #speedLabel {{ min-width: 60px; }}
  #eqBox {{
    width: 780px;
    background: #161922;
    border: 1px solid #2a3044;
    border-radius: 6px;
    padding: 5px 14px;
    font-size: 12px;
    color: #a0b4d8;
    margin-top: 3px;
    text-align: center;
    min-height: 22px;
  }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<div id="controls">
  <div>
    <button id="playBtn">⏸ Pause</button>
  </div>
  <div>
    Speed:
    <input id="speedSlider" type="range" min="0.2" max="3" step="0.1" value="1" style="width:100px; vertical-align:middle;"/>
    <span id="speedLabel">×1.0</span>
  </div>
  <div style="color:#7090c0; font-size:11px;">Drag magnet ← → to induce EMF manually</div>
</div>
<canvas id="c"></canvas>
<div id="eqBox">ℰ = −N dΦ/dt</div>

<script>
// ── Simulation parameters from Python ────────────────────────────────────────
const PARAMS = {data};
const V_BASE   = Math.min(Math.max(PARAMS.vMagnet, 0.1), 5.0);
const B_BASE   = Math.min(Math.max(PARAMS.B, 0.01), 2.0);
const N_TURNS  = Math.min(Math.max(PARAMS.N, 1), 500);

// ── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 780, H = 360;
canvas.width  = W;
canvas.height = H;

// Layout zones
const COIL_CX   = 210;   // centre-x of coil
const COIL_CY   = H / 2;
const COIL_RY   = 54;    // ellipse y-radius (loop height/2)
const COIL_RX   = 18;    // ellipse x-radius (loop depth)
const COIL_W    = 90;    // physical width of solenoid
const METER_CX  = W / 2; // galvanometer centre-x
const METER_CY  = H / 2;
const METER_R   = 52;
const MAG_W     = 100;   // magnet total width
const MAG_H     = 32;    // magnet height

// ── State ─────────────────────────────────────────────────────────────────────
let auto      = true;           // auto-oscillation running
let speedMult = 1.0;
let magX      = 560;            // magnet centre-x  (right half: ~450–750)
let magDir    = -1;             // -1 = moving left (toward coil), +1 = away
let lastTime  = null;
let dragging  = false;
let dragOffX  = 0;
let prevMagX  = magX;
let dragVel   = 0;              // estimated drag velocity (px/s)
let lastDragTime = null;
let emfNeedle = 0;              // current needle deflection (radians, smoothed)

// Auto-oscillation bounds
const AUTO_LEFT  = 360;  // closest approach (just outside coil right edge ~300)
const AUTO_RIGHT = 680;  // furthest right
let autoPaused = false;

// ── Controls ──────────────────────────────────────────────────────────────────
document.getElementById('playBtn').addEventListener('click', () => {{
  autoPaused = !autoPaused;
  auto = !autoPaused;
  document.getElementById('playBtn').textContent = autoPaused ? '▶ Play' : '⏸ Pause';
}});
document.getElementById('speedSlider').addEventListener('input', function() {{
  speedMult = parseFloat(this.value);
  document.getElementById('speedLabel').textContent = '×' + speedMult.toFixed(1);
}});

// ── Drag handling ─────────────────────────────────────────────────────────────
function magHit(mx, my) {{
  return mx >= magX - MAG_W/2 - 8 && mx <= magX + MAG_W/2 + 8 &&
         my >= METER_CY - MAG_H/2 - 8 && my <= METER_CY + MAG_H/2 + 8;
}}
canvas.addEventListener('mousedown', e => {{
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  if (magHit(mx, my)) {{
    dragging  = true; autoPaused = true; auto = false;
    dragOffX  = mx - magX;
    prevMagX  = magX;
    lastDragTime = performance.now();
    document.getElementById('playBtn').textContent = '▶ Play';
  }}
}});
canvas.addEventListener('mousemove', e => {{
  if (!dragging) return;
  const r   = canvas.getBoundingClientRect();
  const mx  = e.clientX - r.left;
  const now = performance.now();
  const dt  = (now - lastDragTime) / 1000 || 0.016;
  prevMagX  = magX;
  magX      = Math.min(Math.max(mx - dragOffX, 290), 730);
  dragVel   = (magX - prevMagX) / dt;   // px/s (+ = rightward = away from coil)
  lastDragTime = now;
}});
canvas.addEventListener('mouseup',    () => {{ dragging = false; }});
canvas.addEventListener('mouseleave', () => {{ dragging = false; }});

// Touch support
canvas.addEventListener('touchstart', e => {{
  e.preventDefault();
  const r  = canvas.getBoundingClientRect();
  const t  = e.touches[0];
  const mx = t.clientX - r.left, my = t.clientY - r.top;
  if (magHit(mx, my)) {{
    dragging = true; autoPaused = true; auto = false;
    dragOffX = mx - magX; prevMagX = magX; lastDragTime = performance.now();
  }}
}}, {{passive: false}});
canvas.addEventListener('touchmove', e => {{
  if (!dragging) return; e.preventDefault();
  const r  = canvas.getBoundingClientRect();
  const t  = e.touches[0];
  const mx = t.clientX - r.left;
  const now = performance.now();
  const dt  = (now - lastDragTime) / 1000 || 0.016;
  prevMagX  = magX;
  magX      = Math.min(Math.max(mx - dragOffX, 290), 730);
  dragVel   = (magX - prevMagX) / dt;
  lastDragTime = now;
}}, {{passive: false}});
canvas.addEventListener('touchend', () => {{ dragging = false; }});

// ── Physics helpers ───────────────────────────────────────────────────────────
// Distance from magnet centre to coil centre
function distToCoil() {{
  return magX - (COIL_CX + COIL_W / 2);  // +ve = magnet right of coil
}}

// Instantaneous flux linkage (normalised, Gaussian falloff with distance)
function fluxNorm() {{
  const d  = distToCoil();
  const sigma = 120 / Math.max(V_BASE, 0.1);   // scale sigma with base speed
  return B_BASE * Math.exp(-(d * d) / (2 * sigma * sigma));
}}

// EMF = -N * dΦ/dt  →  proportional to velocity toward coil * field strength
// Returns value in range roughly ±1 (normalised for display)
function computeEMF(velPxPerSec) {{
  // Negative sign: toward coil (vel < 0 in our convention) → positive EMF
  const dFluxdx = -fluxNorm() * (distToCoil()) /
                  (Math.pow(120 / Math.max(V_BASE, 0.1), 2));
  const rawEMF  = -N_TURNS * dFluxdx * velPxPerSec / 200;  // normalise px→m
  return Math.max(-1, Math.min(1, rawEMF / 50));  // clamp to ±1
}}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawBackground() {{
  ctx.fillStyle = '#0e1117';
  ctx.fillRect(0, 0, W, H);
  // Subtle divider line between coil half and magnet half
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = '#2a3044';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2, 20); ctx.lineTo(W/2, H-10); ctx.stroke();
  ctx.setLineDash([]);
  // Labels
  ctx.fillStyle = '#4a6080'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('COIL', 120, 22);
  ctx.fillText('MAGNET', 660, 22);
  ctx.fillText('GALVANOMETER', METER_CX, 22);
}}

// Draw solenoid coil as stacked ellipses
function drawCoil() {{
  const visLoops = Math.min(N_TURNS, 14);   // cap visible loops
  const step     = COIL_W / (visLoops + 1);
  const coilLeft = COIL_CX - COIL_W / 2;

  // Wire connecting coil to meter (top)
  ctx.strokeStyle = '#4a7aaa'; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(COIL_CX + COIL_W/2, COIL_CY - COIL_RY);
  ctx.lineTo(METER_CX - METER_R * 0.6, METER_CY - METER_R * 0.6);
  ctx.stroke();
  // Wire connecting coil to meter (bottom)
  ctx.beginPath();
  ctx.moveTo(COIL_CX + COIL_W/2, COIL_CY + COIL_RY);
  ctx.lineTo(METER_CX - METER_R * 0.6, METER_CY + METER_R * 0.6);
  ctx.stroke();

  // Draw back halves of ellipses first (faded)
  for (let i = 0; i < visLoops; i++) {{
    const cx = coilLeft + step * (i + 1);
    ctx.beginPath();
    ctx.ellipse(cx, COIL_CY, COIL_RX, COIL_RY, 0, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#1e3a5a';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  }}
  // Draw front halves (solid)
  for (let i = 0; i < visLoops; i++) {{
    const cx = coilLeft + step * (i + 1);
    ctx.beginPath();
    ctx.ellipse(cx, COIL_CY, COIL_RX, COIL_RY, 0, 0, Math.PI);
    ctx.strokeStyle = '#5599dd';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  }}

  // Coil label
  ctx.fillStyle = '#5599dd'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(`N = ${{N_TURNS}} turns`, COIL_CX, COIL_CY + COIL_RY + 20);
}}

// Draw galvanometer (needle meter)
function drawMeter(needleAngle) {{
  // Outer circle
  ctx.beginPath();
  ctx.arc(METER_CX, METER_CY, METER_R, 0, 2 * Math.PI);
  ctx.fillStyle   = '#131825';
  ctx.fill();
  ctx.strokeStyle = '#3a5080';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Scale arc (bottom semicircle)
  ctx.beginPath();
  ctx.arc(METER_CX, METER_CY, METER_R - 10, Math.PI * 0.85, Math.PI * 0.15);
  ctx.strokeStyle = '#2a3a55';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Tick marks
  const maxAngle = Math.PI * 0.65;
  for (let t = -maxAngle; t <= maxAngle + 0.01; t += maxAngle / 4) {{
    const sinT = Math.sin(t - Math.PI/2 + Math.PI);
    const cosT = Math.cos(t - Math.PI/2 + Math.PI);
    const r1 = METER_R - 10, r2 = METER_R - 16;
    ctx.beginPath();
    ctx.moveTo(METER_CX + r1 * sinT, METER_CY - r1 * cosT + 8);
    ctx.lineTo(METER_CX + r2 * sinT, METER_CY - r2 * cosT + 8);
    ctx.strokeStyle = '#4a6080'; ctx.lineWidth = 1.5;
    ctx.stroke();
  }}

  // Needle
  const needleLen = METER_R - 14;
  // Map needleAngle ±1 → angle sweeping left/right from bottom-centre
  const swingMax  = Math.PI * 0.55;
  const angle     = -Math.PI/2 + needleAngle * swingMax;
  ctx.beginPath();
  ctx.moveTo(METER_CX, METER_CY + 8);
  ctx.lineTo(METER_CX + needleLen * Math.cos(angle),
             METER_CY + 8 + needleLen * Math.sin(angle));
  const needleColour = needleAngle > 0.05  ? '#ff6644'
                     : needleAngle < -0.05 ? '#44aaff'
                     : '#aabbcc';
  ctx.strokeStyle = needleColour; ctx.lineWidth = 2.5; ctx.stroke();

  // Pivot dot
  ctx.beginPath(); ctx.arc(METER_CX, METER_CY + 8, 4, 0, 2 * Math.PI);
  ctx.fillStyle = '#667799'; ctx.fill();

  // "G" label
  ctx.fillStyle = '#8899bb'; ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('G', METER_CX, METER_CY - METER_R + 14);

  // +/- labels
  ctx.font = '10px Segoe UI'; ctx.fillStyle = '#4a6080';
  ctx.fillText('−', METER_CX - METER_R + 10, METER_CY + 12);
  ctx.fillText('+', METER_CX + METER_R - 10, METER_CY + 12);
}}

// Draw bar magnet
function drawMagnet() {{
  const my   = METER_CY;
  const half = MAG_W / 2;
  const mh2  = MAG_H / 2;

  // N pole (red, left half)
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.roundRect(magX - half, my - mh2, half, MAG_H, [6, 0, 0, 6]);
  ctx.fill();
  ctx.fillStyle = '#ff5555'; ctx.font = 'bold 14px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('N', magX - half/2, my + 5);

  // S pole (blue, right half)
  ctx.fillStyle = '#2244bb';
  ctx.beginPath();
  ctx.roundRect(magX, my - mh2, half, MAG_H, [0, 6, 6, 0]);
  ctx.fill();
  ctx.fillStyle = '#77aaff'; ctx.font = 'bold 14px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('S', magX + half/2, my + 5);

  // Outline
  ctx.strokeStyle = '#667799'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(magX - half, my - mh2, MAG_W, MAG_H, 6);
  ctx.stroke();
}}

// Draw dashed field lines curving from N pole toward coil
function drawFieldLines(flux) {{
  if (flux < 0.005) return;
  const alpha = Math.min(flux / B_BASE, 1) * 0.7 + 0.1;
  const nPole = magX - MAG_W / 2;   // left face of magnet = N pole
  const coilR = COIL_CX + COIL_W / 2;  // right face of coil

  const offsets = [-28, -12, 0, 12, 28];   // vertical spread of lines
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1.5;

  offsets.forEach((dy, idx) => {{
    // Colour gradient: red near magnet, purple near coil
    const t   = idx / (offsets.length - 1);
    const r   = Math.round(200 - t * 140);
    const g   = Math.round(40  + t * 20);
    const b   = Math.round(40  + t * 160);
    ctx.strokeStyle = `rgb(${{r}},${{g}},${{b}})`;
    ctx.beginPath();
    ctx.moveTo(nPole, METER_CY + dy);
    const cpx = (nPole + coilR) / 2;
    const cpy = METER_CY + dy * 1.4;
    ctx.quadraticCurveTo(cpx, cpy, coilR, COIL_CY + dy * 0.5);
    ctx.stroke();

    // Arrowhead on field line
    const t2  = 0.85;
    const ax  = (1-t2)*(1-t2)*nPole + 2*(1-t2)*t2*cpx + t2*t2*coilR;
    const ay  = (1-t2)*(1-t2)*(METER_CY+dy) + 2*(1-t2)*t2*cpy + t2*t2*(COIL_CY+dy*0.5);
    const t3  = 0.83;
    const bx  = (1-t3)*(1-t3)*nPole + 2*(1-t3)*t3*cpx + t3*t3*coilR;
    const by  = (1-t3)*(1-t3)*(METER_CY+dy) + 2*(1-t3)*t3*cpy + t3*t3*(COIL_CY+dy*0.5);
    const ang = Math.atan2(ay - by, ax - bx);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8*Math.cos(ang-0.4), ay - 8*Math.sin(ang-0.4));
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8*Math.cos(ang+0.4), ay - 8*Math.sin(ang+0.4));
    ctx.stroke();
    ctx.setLineDash([5, 6]);
  }});
  ctx.restore();
}}

// ── Main animation loop ───────────────────────────────────────────────────────
function frame(ts) {{
  const dt = lastTime === null ? 0.016 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  // Auto-oscillation
  if (auto && !dragging) {{
    const speed = V_BASE * speedMult * 60;   // px/s
    magX += magDir * speed * dt;
    if (magX <= AUTO_LEFT)  {{ magX = AUTO_LEFT;  magDir =  1; }}
    if (magX >= AUTO_RIGHT) {{ magX = AUTO_RIGHT; magDir = -1; }}
  }}

  // Compute velocity for EMF
  let vel;
  if (dragging) {{
    vel = dragVel;
  }} else if (auto) {{
    vel = magDir * V_BASE * speedMult * 60;  // px/s
  }} else {{
    vel = 0;
  }}

  // Compute EMF and smooth needle
  const targetEMF = computeEMF(vel);
  const tau = 0.12;   // smoothing time constant
  emfNeedle += (targetEMF - emfNeedle) * (1 - Math.exp(-dt / tau));

  // Flux for field-line opacity
  const flux = fluxNorm();

  // Compute actual EMF in Volts (approximate)
  const sigma_m  = 1.0 / Math.max(V_BASE, 0.1);        // Gaussian width in seconds
  const dFluxdx  = -B_BASE * (distToCoil() / 200) *    // rough metres
                    Math.exp(-(distToCoil()/200)**2 / (2 * sigma_m**2)) / (sigma_m**2);
  const velMS    = vel / 200 * Math.max(V_BASE, 0.1);  // rough m/s
  // EMF ≈ -N * dΦ/dt ≈ -N * (dΦ/dx) * (dx/dt)
  const A_coil   = 0.01;  // default coil area m² (representative)
  const emfVolts = -N_TURNS * dFluxdx * A_coil * velMS;

  // ── Render ─────────────────────────────────────────────────────────────────
  drawBackground();
  drawCoil();
  drawFieldLines(flux);
  drawMagnet();
  drawMeter(emfNeedle);

  // Cursor hint over magnet
  const pMouse = canvas._lastMouse;
  if (pMouse && magHit(pMouse[0], pMouse[1])) {{
    canvas.style.cursor = 'ew-resize';
  }} else {{
    canvas.style.cursor = dragging ? 'ew-resize' : 'default';
  }}

  // Update equation box
  const sign    = emfVolts >= 0 ? '+' : '';
  const absEMF  = Math.abs(emfVolts).toFixed(3);
  const fluxMWb = (flux * A_coil * 1000).toFixed(3);
  document.getElementById('eqBox').innerHTML =
    `ℰ = −N dΦ/dt &nbsp;|&nbsp; N = ${{N_TURNS}} &nbsp; Φ = ${{fluxMWb}} mWb &nbsp;|&nbsp; ` +
    `ℰ ≈ <b style="color:${{emfVolts>=0?'#ff8866':'#66aaff'}}">${{sign}}${{emfVolts.toFixed(3)}} V</b>` +
    ` &nbsp; (B_max = ${{B_BASE}} T, v = ${{V_BASE}} m/s)`;

  requestAnimationFrame(frame);
}}

// Track mouse position for cursor
canvas.addEventListener('mousemove', e => {{
  const r = canvas.getBoundingClientRect();
  canvas._lastMouse = [e.clientX - r.left, e.clientY - r.top];
}});
canvas.addEventListener('mouseleave', () => {{ canvas._lastMouse = null; }});

requestAnimationFrame(frame);
</script>
</body>
</html>"""


# ── Sub-sim renderers ─────────────────────────────────────────────────────────

def render_magnetic_force(mode: str) -> None:
    """Sub-sim 1: Magnetic Force on a current-carrying wire / charged particle."""

    # ── Presets ────────────────────────────────────────────────────────────────
    PRESETS_FORCE = {
        "Custom": None,
        "MRI scanner (B = 1.5 T)": dict(B=1.5, I=5.0, L=0.5, theta=90.0,
            context="MRI scanners use superconducting coils to maintain fields "
                    "of 1.5–3 T. The strong field is essential for aligning "
                    "hydrogen nuclei in the body."),
        "Cyclotron (B = 1.2 T)": dict(B=1.2, I=10.0, L=1.0, theta=90.0,
            context="Cyclotrons use a uniform magnetic field to bend protons "
                    "into a spiral path, accelerating them each half-revolution. "
                    "Used in hospitals to produce radioisotopes for PET scans."),
        "Earth's field (B ≈ 50 μT)": dict(B=5e-5, I=1.0, L=1.0, theta=90.0,
            context="Earth's magnetic field is ~50 μT — extremely weak compared "
                    "to laboratory magnets. A compass needle experiences only a "
                    "tiny torque from it."),
    }

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        preset_name = st.selectbox(
            "Real-world preset",
            list(PRESETS_FORCE.keys()),
            key="force_preset",
        )
        preset = PRESETS_FORCE[preset_name]

        def _pv(key, default):
            return preset[key] if preset and key in preset else default

        st.markdown("#### Wire parameters")
        B = st.slider("Magnetic flux density B (T)",
                      0.01, 2.0, float(_pv("B", 0.5)),
                      step=0.01, key="force_B",
                      disabled=(preset is not None),
                      help="Strength of the applied magnetic field.")
        I = st.slider("Current I (A)",
                      1.0, 20.0, float(_pv("I", 5.0)),
                      step=0.5, key="force_I",
                      disabled=(preset is not None))
        L = st.slider("Wire length L (m)",
                      0.1, 2.0, float(_pv("L", 1.0)),
                      step=0.05, key="force_L",
                      disabled=(preset is not None))
        theta = st.slider("Angle θ between I and B (°)",
                          0, 90, int(_pv("theta", 90)),
                          key="force_theta",
                          disabled=(preset is not None))

        F = force_on_wire(B, I, L, theta)
        torque_est = F * 0.05  # rough torque for a 10 cm coil radius

        st.markdown("---")
        metric_row({
            "Force F": f"{F:.4f} N",
            "Torque τ": f"{torque_est:.5f} N·m",
        })

        if preset:
            st.info(f"**{preset_name}**\n\n{preset['context']}")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Charged particle in B field")

            particle = st.selectbox(
                "Particle type",
                ["Electron", "Proton"],
                key="orbit_particle",
            )
            speed = st.select_slider(
                "Particle speed v (m/s)",
                options=[1e5, 5e5, 1e6, 5e6, 1e7, 2e7, 3e7],
                value=1e6,
                format_func=lambda v: f"{v:.1e}",
                key="orbit_speed",
            )
            B_orb = st.select_slider(
                "Field strength B (T)",
                options=[0.001, 0.005, 0.01, 0.02, 0.05, 0.1],
                value=0.01,
                format_func=lambda v: f"{v:.3f}",
                key="orbit_B",
            )

    with right_col:
        # Preset context card (always shown if a preset is active)
        st.info(
            "**F = BIL sinθ** — The force on a wire is maximised when the "
            "current is perpendicular to the field (θ = 90°) and zero when "
            "parallel (θ = 0°). This is the principle behind electric motors."
        )

        fig_wire = build_force_diagram(B, I, L, theta, F)
        st.plotly_chart(fig_wire, use_container_width=True)

        st.markdown("**Key result:**")
        metric_row({
            "F = BIL sinθ": f"{F:.4f} N",
            "θ": f"{theta}°",
            "B": f"{B} T",
            "I": f"{I} A",
            "L": f"{L} m",
        })

        if theta == 0:
            st.warning(
                "θ = 0°: the current is parallel to the field — **no force** "
                "acts on the wire (sinθ = 0)."
            )
        elif theta == 90:
            st.success(
                "θ = 90°: maximum force — current is perpendicular to the field."
            )

        if mode == "Advanced":
            st.markdown("---")
            st.markdown("#### Circular orbit of charged particle")

            st.info(
                "This is how particle accelerators work — magnetic fields steer "
                "charged particles into circular paths. The Lorentz force "
                "F = qvB provides the centripetal force mv²/r, so r = mv/(qB)."
            )

            r, T_orb, f_cyc, xp, yp = circular_orbit(particle, speed, B_orb)

            metric_row({
                "Radius r": f"{r * 100:.3f} cm",
                "Period T": f"{T_orb:.3e} s",
                "Cyclotron freq": f"{f_cyc:.3e} Hz",
            })

            fig_orbit = build_orbit_plot(xp, yp, r, particle, speed)
            st.plotly_chart(fig_orbit, use_container_width=True)

            mass_label = "m_e" if particle == "Electron" else "m_p"
            st.caption(
                f"r = mv/(qB) = {mass_label}×{speed:.1e}/({e_charge:.3e}×{B_orb}) "
                f"= {r * 100:.3f} cm.  "
                f"Period T = 2πm/(qB) = {T_orb:.3e} s (independent of speed!)."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"F = BIL\sin\theta",
                r"F = Bqv",
                r"r = \frac{mv}{qB}",
                r"T = \frac{2\pi m}{qB}",
                r"f_c = \frac{qB}{2\pi m}",
            ],
            explanation=(
                "A current-carrying wire in a magnetic field experiences a force "
                "given by F = BIL sinθ. The direction is given by Fleming's left-hand "
                "rule. When θ = 90° the force is maximum; when θ = 0° there is no "
                "force.\n\n"
                "A single moving charge experiences F = qvB (when v ⊥ B). This "
                "provides the centripetal force for circular motion. The radius of "
                "the orbit r = mv/(qB) depends on the momentum of the particle. "
                "Crucially, the period T = 2πm/(qB) is **independent of speed** — "
                "this is why cyclotrons work."
            ),
            advanced_text=(
                "The cyclotron frequency f_c = qB/(2πm) is also called the Larmor "
                "frequency. Cyclotrons exploit the constant period to continuously "
                "accelerate particles. At relativistic speeds (v → c) the mass "
                "increases, so the period is no longer constant — synchrotrons "
                "compensate by varying the field or frequency. The Hall effect "
                "arises when a current-carrying conductor is placed in a B field: "
                "the deflected carriers build up a transverse voltage V_H = IB/(nqt)."
            ),
            mode=mode,
        )


def render_induction(mode: str) -> None:
    """Sub-sim 2: Electromagnetic Induction — Faraday's Law."""

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        st.markdown("#### Coil parameters")
        N = st.slider("Number of turns N",
                      1, 500, 100, step=1, key="ind_N")
        A = st.select_slider(
            "Coil area A (m²)",
            options=[0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1],
            value=0.01,
            format_func=lambda v: f"{v:.3f}",
            key="ind_A",
        )
        v_mag = st.slider("Magnet speed v (m/s)",
                          0.1, 5.0, 1.0, step=0.1, key="ind_v",
                          help="Faster magnet → narrower flux pulse → larger EMF.")
        B_max = st.slider("Peak field B_max (T)",
                          0.01, 2.0, 0.5, step=0.01, key="ind_B")

        t_arr, flux, emf, peak_emf = compute_induction(N, A, v_mag, B_max)

        st.markdown("---")
        metric_row({
            "Peak EMF": f"{peak_emf:.4f} V",
            "Peak Flux Φ": f"{float(np.max(flux)) * 1000:.3f} mWb",
        })

        show_current = False
        R_coil = 10.0

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Induced current")
            R_coil = st.slider("Coil resistance R (Ω)",
                               1, 100, 10, key="ind_R")
            show_current = st.checkbox("Show induced current panel",
                                       value=True, key="ind_show_I")

            I_peak_ind = peak_emf / R_coil
            energy = float(np.trapz((emf / R_coil) ** 2 * R_coil, t_arr))

            metric_row({
                "Peak current": f"{I_peak_ind:.4f} A",
                "Energy dissipated": f"{energy:.4f} J",
            })

    with right_col:
        st.info(
            "**Lenz's Law:** The induced EMF always opposes the change that "
            "caused it — this is why it takes effort to push a magnet into a "
            "coil. The induced current creates its own field that repels the "
            "approaching magnet."
        )

        components.html(build_induction_animation(v_mag, B_max, N), height=440)
        st.caption("▶ Play/pause auto-oscillation · Drag magnet to induce EMF manually")
        st.divider()

        fig_ind = build_induction_plot(
            t_arr, flux, emf, N,
            show_current=show_current,
            R_coil=R_coil,
        )
        st.plotly_chart(fig_ind, use_container_width=True)

        # Insight callouts
        sigma_val = 1.0 / v_mag
        st.caption(
            f"Gaussian half-width σ = 1/v = {sigma_val:.2f} s  |  "
            f"Peak EMF = −N × dΦ/dt ≈ {peak_emf:.4f} V  |  "
            f"N = {N}, A = {A} m², B_max = {B_max} T"
        )

        if v_mag >= 3.0:
            st.warning(
                f"Fast magnet (v = {v_mag} m/s): narrow flux pulse → steep "
                "dΦ/dt → large induced EMF. Regenerative braking uses this "
                "principle to harvest energy from deceleration."
            )
        elif v_mag <= 0.5:
            st.info(
                f"Slow magnet (v = {v_mag} m/s): broad flux pulse → gentle "
                "dΦ/dt → small induced EMF. More turns (N) or larger area (A) "
                "can compensate."
            )

        if mode == "Advanced" and show_current:
            energy_val = float(np.trapz((emf / R_coil) ** 2 * R_coil, t_arr))
            st.success(
                f"Energy dissipated in coil resistance R = {R_coil} Ω: "
                f"E = ∫I²R dt ≈ {energy_val:.5f} J. This energy comes from the "
                "kinetic energy of the moving magnet."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\Phi = BA\cos\theta",
                r"\mathcal{E} = -N\frac{d\Phi}{dt}",
                r"\mathcal{E} = -N\frac{\Delta\Phi}{\Delta t}",
                r"I = \frac{\mathcal{E}}{R}",
            ],
            explanation=(
                "Faraday's law states that the induced EMF is proportional to the "
                "rate of change of magnetic flux linkage. The negative sign "
                "(Lenz's law) means the induced current always opposes the change "
                "causing it, consistent with conservation of energy.\n\n"
                "Here the magnetic flux through the coil rises as the magnet "
                "approaches, peaks at t = 2 s, then falls as the magnet moves "
                "away. The EMF is the negative gradient of the flux curve — it "
                "is positive while flux is increasing and negative while flux is "
                "decreasing."
            ),
            advanced_text=(
                "Self-inductance L is the tendency of a coil to oppose changes "
                "in its own current: EMF = −L dI/dt. Energy stored in the "
                "magnetic field of an inductor: E = ½LI². Mutual inductance M "
                "describes how one coil induces EMF in another — the principle "
                "behind transformers. Eddy currents are induced in solid "
                "conductors by changing flux; laminating a core reduces them."
            ),
            mode=mode,
        )


def render_transformer(mode: str) -> None:
    """Sub-sim 3: Ideal Transformer."""

    PRESETS_XFMR = {
        "Custom": None,
        "Step-up (×5)": dict(N_p=100, N_s=500, V_p=230, R_L=1000,
            context="A step-up transformer increases voltage. Used at power "
                    "stations to raise generation voltage (~25 kV) to "
                    "transmission voltage (~400 kV), reducing I²R losses."),
        "Step-down (÷5)": dict(N_p=500, N_s=100, V_p=1150, R_L=500,
            context="Step-down transformers reduce voltage for safe domestic "
                    "or industrial use. The UK national grid uses many stages "
                    "of step-down before reaching homes at 230 V."),
        "Isolation (1:1)": dict(N_p=100, N_s=100, V_p=230, R_L=1000,
            context="An isolation transformer has equal turns. No voltage "
                    "transformation — but it breaks the direct electrical "
                    "connection for safety (e.g., bathroom shaver sockets)."),
        "Phone charger (÷20)": dict(N_p=200, N_s=10, V_p=230, R_L=20,
            context="A phone charger typically steps 230 V AC down to ~12 V "
                    "before rectification and regulation to 5 V DC. Modern "
                    "switched-mode supplies operate at high frequency (~100 kHz) "
                    "so tiny transformers suffice."),
    }

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        preset_name = st.selectbox(
            "Real-world preset",
            list(PRESETS_XFMR.keys()),
            key="xfmr_preset",
        )
        preset = PRESETS_XFMR[preset_name]

        def _pv(key, default):
            return preset[key] if preset and key in preset else default

        st.markdown("#### Transformer parameters")

        N_p = st.slider("Primary turns N_p",
                        10, 1000, int(_pv("N_p", 100)), step=10,
                        key="xfmr_Np", disabled=(preset is not None))
        N_s = st.slider("Secondary turns N_s",
                        10, 1000, int(_pv("N_s", 200)), step=10,
                        key="xfmr_Ns", disabled=(preset is not None))
        V_p = st.slider("Primary peak voltage V_p (V)",
                        10, 2000, int(_pv("V_p", 230)), step=10,
                        key="xfmr_Vp", disabled=(preset is not None))
        R_L = st.select_slider(
            "Load resistance R_L (Ω)",
            options=[10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
            value=int(_pv("R_L", 1000)),
            key="xfmr_RL",
            disabled=(preset is not None),
        )

        V_s, I_s, I_p, P, t_xfmr, v_pri, v_sec = compute_transformer(
            N_p, N_s, V_p, R_L
        )
        k = N_s / N_p

        st.markdown("---")
        metric_row({
            "Turns ratio k": f"{k:.3f}",
            "V_s (peak)": f"{V_s:.2f} V",
        })
        metric_row({
            "I_p (rms)": f"{I_p / np.sqrt(2):.4f} A",
            "I_s (rms)": f"{I_s / np.sqrt(2):.4f} A",
        })
        st.metric("Power P (rms)", f"{P:.4f} W")

        if preset:
            st.info(f"**{preset_name}**\n\n{preset['context']}")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Efficiency")
            eta = st.slider("Transformer efficiency η (%)",
                            80, 100, 98, key="xfmr_eta",
                            help="Real transformers are 95–99% efficient. "
                                 "Losses come from eddy currents (reduced by "
                                 "laminated core), hysteresis, and copper resistance.")
            P_input = P / (eta / 100)
            P_loss = P_input - P
            st.metric("Input power P_in", f"{P_input:.4f} W")
            st.metric("Power loss P_loss", f"{P_loss:.4f} W")
            st.caption(
                f"At η = {eta}%, {P_loss:.4f} W is wasted as heat in the core "
                "and windings."
            )

    with right_col:
        st.info(
            "The National Grid uses step-up transformers to increase voltage to "
            "400 kV for long-distance transmission — higher voltage means lower "
            "current, reducing I²R heating losses in cables. At the other end, "
            "step-down transformers bring it back to the safe 230 V used in homes."
        )

        if k > 1.05:
            st.success(
                f"**Step-up transformer** (k = {k:.2f}): V_s = {V_s:.1f} V > "
                f"V_p = {V_p} V. Voltage increases, current decreases."
            )
        elif k < 0.95:
            st.warning(
                f"**Step-down transformer** (k = {k:.2f}): V_s = {V_s:.1f} V < "
                f"V_p = {V_p} V. Voltage decreases, current increases."
            )
        else:
            st.info(
                f"**Isolation transformer** (k ≈ 1): V_s ≈ V_p = {V_p} V. "
                "No voltage transformation — used for electrical isolation."
            )

        fig_xfmr = build_transformer_plot(t_xfmr, v_pri, v_sec, V_p, V_s)
        st.plotly_chart(fig_xfmr, use_container_width=True)

        metric_row({
            "N_p": str(N_p),
            "N_s": str(N_s),
            "V_s/V_p": f"{k:.3f}",
            "V_s (peak)": f"{V_s:.2f} V",
            "V_s (rms)": f"{V_s / np.sqrt(2):.2f} V",
            "Power P": f"{P:.3f} W",
        })

        if mode == "Advanced":
            eta_val = st.session_state.get("xfmr_eta", 98)
            P_in_adv = P / (eta_val / 100)
            P_loss_adv = P_in_adv - P
            st.markdown("---")
            st.markdown(
                f"**Efficiency η = {eta_val}%** → input = {P_in_adv:.4f} W, "
                f"losses = {P_loss_adv:.4f} W  \n"
                "Losses arise from:  \n"
                "- **Eddy currents** in the iron core (reduced by lamination)  \n"
                "- **Hysteresis** — energy to repeatedly reverse core magnetisation  \n"
                "- **Copper losses** — I²R heating in primary and secondary windings"
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\frac{V_s}{V_p} = \frac{N_s}{N_p}",
                r"\frac{I_p}{I_s} = \frac{N_s}{N_p}",
                r"P_{in} = V_p I_p = V_s I_s = P_{out} \quad \text{(ideal)}",
                r"\eta = \frac{P_{out}}{P_{in}} \times 100\%",
            ],
            explanation=(
                "An ideal transformer obeys the turns-ratio equation: V_s/V_p = "
                "N_s/N_p. Because energy is conserved in an ideal transformer, "
                "V_p I_p = V_s I_s — so if voltage is stepped up by a factor k, "
                "current is stepped down by the same factor k.\n\n"
                "Real transformers achieve 95–99% efficiency. The UK National Grid "
                "transmits power at 400 kV; at lower voltage the same power would "
                "require enormous currents, causing excessive I²R heating in cables."
            ),
            advanced_text=(
                "Transformer operation depends on mutual inductance M = k√(L₁L₂), "
                "where k (coupling coefficient) is close to 1 for a well-designed "
                "core. Self-inductance of primary: L₁ = μ₀N₁²A/l. Leakage "
                "inductance (flux that doesn't link both coils) causes voltage "
                "regulation problems under load. Switched-mode power supplies use "
                "transformers at 50–500 kHz — much higher than mains — allowing "
                "tiny, lightweight transformers (power ∝ frequency × volume)."
            ),
            mode=mode,
        )


# ── DC Motor helpers ──────────────────────────────────────────────────────────

MOTOR_PRESETS = {
    "Custom": None,
    "Toy motor": {
        "B": 0.1, "I": 0.5, "N": 200, "A": 0.0004,
        "note": (
            "Tiny DC motors in toys run at 3–6V with currents of a few hundred mA. "
            "They use permanent magnets (B ≈ 0.1T) and many turns of fine wire."
        ),
    },
    "Car starter motor": {
        "B": 1.5, "I": 150.0, "N": 20, "A": 0.005,
        "note": (
            "A car starter motor draws 100–200 A for a fraction of a second to crank "
            "the engine. The huge current creates enormous torque despite few turns — "
            "thick copper windings."
        ),
    },
    "Electric bicycle motor": {
        "B": 1.2, "I": 15.0, "N": 80, "A": 0.008,
        "note": (
            "A typical e-bike hub motor runs at 36V, drawing 10–20A (360–720W). "
            "Modern motors use rare-earth permanent magnets for high field strength "
            "in a compact package."
        ),
    },
    "Industrial servo motor": {
        "B": 1.0, "I": 10.0, "N": 150, "A": 0.012,
        "note": (
            "Servo motors in CNC machines and robots require precise torque control. "
            "They often use encoders and feedback control to maintain exact position "
            "and speed."
        ),
    },
}


def build_motor_diagram(theta_deg: float, show_commutator: bool) -> go.Figure:
    """
    Schematic side-view of a DC motor coil at angle theta_deg from the field.

    theta_deg is the angle between the coil plane and B (θ=0 → max torque).
    The diagram shows:
      - Horizontal B-field arrows
      - The coil as a projected rectangle (two active sides)
      - Force arrows (Fleming's left-hand rule) on each active side
      - An arc marking the angle θ
      - Optionally: a simplified commutator symbol at the bottom
    """
    fig = go.Figure()

    # ── Background B-field arrows ─────────────────────────────────────────────
    for y_arrow in [-0.8, -0.4, 0.0, 0.4, 0.8]:
        fig.add_annotation(
            x=0.9, y=y_arrow,
            ax=-0.9, ay=y_arrow,
            xref="x", yref="y", axref="x", ayref="y",
            arrowhead=2, arrowsize=1.2, arrowwidth=1.5,
            arrowcolor=COLOURS["quaternary"],
            opacity=0.55,
            showarrow=True, text="",
        )
    fig.add_trace(go.Scatter(
        x=[None], y=[None],
        mode="lines",
        line=dict(color=COLOURS["quaternary"], width=1.5),
        name="B field →",
        showlegend=True,
    ))

    # ── Coil sides ────────────────────────────────────────────────────────────
    # At θ=0 the coil is in the plane of B (side view: full width visible).
    # The coil half-width projected onto the x-axis = w * cos(θ).
    # We represent the coil as two vertical line segments at ±x_proj.
    coil_h = 0.7        # half-height of coil side
    w = 0.55            # half-width of coil
    theta_rad = np.radians(theta_deg)
    x_proj = w * np.cos(theta_rad)

    # Active side 1 (right): current direction depends on θ
    # Convention: at θ=0 right side has current into page (red), left side out (blue)
    # Swap every 180° (but with commutator the direction reverses to keep torque same)
    quadrant = int(theta_deg // 180) % 2  # 0 for 0–179°, 1 for 180–359°
    if quadrant == 0:
        col_right, col_left = COLOURS["tertiary"], COLOURS["secondary"]  # red, blue
        label_right, label_left = "Current into page ⊗", "Current out of page ⊙"
    else:
        col_right, col_left = COLOURS["secondary"], COLOURS["tertiary"]
        label_right, label_left = "Current out of page ⊙", "Current into page ⊗"

    # Right active side
    if x_proj > 0.02:
        fig.add_trace(go.Scatter(
            x=[x_proj, x_proj], y=[-coil_h, coil_h],
            mode="lines+markers",
            line=dict(color=col_right, width=5),
            marker=dict(size=8, color=col_right),
            name=f"Right side: {label_right}",
            showlegend=True,
        ))
        # Left active side
        fig.add_trace(go.Scatter(
            x=[-x_proj, -x_proj], y=[-coil_h, coil_h],
            mode="lines+markers",
            line=dict(color=col_left, width=5),
            marker=dict(size=8, color=col_left),
            name=f"Left side: {label_left}",
            showlegend=True,
        ))
    else:
        # Edge-on — coil appears as a single thick line at x≈0
        fig.add_trace(go.Scatter(
            x=[0, 0], y=[-coil_h, coil_h],
            mode="lines",
            line=dict(color=COLOURS["primary"], width=8),
            name="Coil (edge-on — zero torque)",
            showlegend=True,
        ))

    # Top and bottom connecting wires (faded, not in field)
    fig.add_trace(go.Scatter(
        x=[-x_proj, x_proj], y=[coil_h, coil_h],
        mode="lines",
        line=dict(color=COLOURS["text"], width=2, dash="dot"),
        showlegend=False,
    ))
    fig.add_trace(go.Scatter(
        x=[-x_proj, x_proj], y=[-coil_h, -coil_h],
        mode="lines",
        line=dict(color=COLOURS["text"], width=2, dash="dot"),
        showlegend=False,
    ))

    # ── Force arrows on active sides ──────────────────────────────────────────
    # Force direction: F = IL × B.  Right side current into page + B rightward → F upward
    # Left side current out of page + B rightward → F downward  (when quadrant==0)
    force_scale = 0.45
    if x_proj > 0.02:
        f_dir_right = 1 if quadrant == 0 else -1   # +1 = up, -1 = down
        f_dir_left = -f_dir_right

        fig.add_annotation(
            x=x_proj, y=f_dir_right * force_scale,
            ax=x_proj, ay=0,
            xref="x", yref="y", axref="x", ayref="y",
            arrowhead=3, arrowsize=1.5, arrowwidth=2.5,
            arrowcolor=COLOURS["highlight"],
            text="<b>F</b>", font=dict(color=COLOURS["highlight"], size=11),
            showarrow=True,
        )
        fig.add_annotation(
            x=-x_proj, y=f_dir_left * force_scale,
            ax=-x_proj, ay=0,
            xref="x", yref="y", axref="x", ayref="y",
            arrowhead=3, arrowsize=1.5, arrowwidth=2.5,
            arrowcolor=COLOURS["highlight"],
            text="<b>F</b>", font=dict(color=COLOURS["highlight"], size=11),
            showarrow=True,
        )

    # ── Angle arc and label ───────────────────────────────────────────────────
    # Draw arc from 0 (B direction, +x axis) to theta_deg (coil normal)
    arc_r = 0.30
    arc_angles = np.linspace(0, theta_rad, 30)
    fig.add_trace(go.Scatter(
        x=arc_r * np.cos(arc_angles),
        y=arc_r * np.sin(arc_angles),
        mode="lines",
        line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
        showlegend=False,
    ))
    mid_arc = theta_rad / 2
    fig.add_annotation(
        x=arc_r * 1.35 * np.cos(mid_arc),
        y=arc_r * 1.35 * np.sin(mid_arc),
        text=f"θ={theta_deg:.0f}°",
        showarrow=False,
        font=dict(color=COLOURS["advanced"], size=11),
    )

    # ── Coil normal arrow ─────────────────────────────────────────────────────
    normal_len = 0.42
    fig.add_annotation(
        x=normal_len * np.sin(theta_rad),
        y=normal_len * np.cos(theta_rad),
        ax=0, ay=0,
        xref="x", yref="y", axref="x", ayref="y",
        arrowhead=2, arrowsize=1.2, arrowwidth=1.5,
        arrowcolor=COLOURS["primary"],
        text="<b>n̂</b>", font=dict(color=COLOURS["primary"], size=11),
        showarrow=True,
    )

    # ── Optional commutator symbol ────────────────────────────────────────────
    if show_commutator:
        # Two half-circles at the bottom of the coil representing the split ring
        comm_y = -coil_h - 0.18
        comm_r = 0.12
        half1 = np.linspace(0, np.pi, 30)
        half2 = np.linspace(np.pi, 2 * np.pi, 30)
        fig.add_trace(go.Scatter(
            x=comm_r * np.cos(half1),
            y=comm_y + comm_r * np.sin(half1),
            mode="lines",
            line=dict(color=COLOURS["tertiary"], width=3),
            name="Commutator (split ring)",
            showlegend=True,
        ))
        fig.add_trace(go.Scatter(
            x=comm_r * np.cos(half2),
            y=comm_y + comm_r * np.sin(half2),
            mode="lines",
            line=dict(color=COLOURS["secondary"], width=3),
            showlegend=False,
        ))
        fig.add_annotation(
            x=0, y=comm_y - comm_r - 0.06,
            text="Commutator",
            showarrow=False,
            font=dict(color=COLOURS["text"], size=10),
        )

    # ── Layout ────────────────────────────────────────────────────────────────
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=430,
        title=dict(
            text="DC Motor Coil — Side View  (θ = angle of coil plane from B)",
            font=dict(size=13),
        ),
        xaxis=dict(range=[-1.2, 1.2], title="", showticklabels=False,
                   scaleanchor="y", scaleratio=1, **grid_style),
        yaxis=dict(range=[-1.2, 1.2], title="", showticklabels=False, **grid_style),
        showlegend=True,
        legend=dict(font=dict(size=10), x=1.01, xanchor="left"),
    ))
    return fig


def build_motor_torque_plot(
    tau_max: float,
    theta_deg: float,
    show_commutator: bool,
) -> go.Figure:
    """
    Torque vs angle plot over two full rotations (0–720°).

    Without commutator: τ = τ_max · sin(φ)  (can go negative)
    With commutator:    τ = τ_max · |sin(φ)| (rectified, always ≥ 0)
    Current angle is marked with a vertical dashed line.
    """
    phi_deg = np.linspace(0, 720, 1440)
    phi_rad = np.radians(phi_deg)

    tau_raw = tau_max * np.sin(phi_rad)
    tau_rect = tau_max * np.abs(np.sin(phi_rad))

    fig = go.Figure()

    # Without commutator — always shown dashed grey for reference
    fig.add_trace(go.Scatter(
        x=phi_deg, y=tau_raw,
        mode="lines",
        name="Without commutator (τ = τ_max sin φ)",
        line=dict(color=COLOURS["grid"], width=1.8, dash="dash"),
    ))

    # With commutator — shown solid in primary colour
    fig.add_trace(go.Scatter(
        x=phi_deg, y=tau_rect,
        mode="lines",
        name="With commutator (τ = τ_max |sin φ|)",
        line=dict(
            color=COLOURS["primary"] if show_commutator else COLOURS["secondary"],
            width=2.5,
        ),
        visible=True,
    ))

    # Current angle marker — normalise to 0–720° range for display
    current_phi = theta_deg % 360  # position within one rotation
    current_tau = tau_max * abs(np.sin(np.radians(current_phi)))

    fig.add_vline(
        x=current_phi,
        line_dash="dot",
        line_color=COLOURS["highlight"],
        line_width=2,
        annotation_text=f"θ = {theta_deg:.0f}°",
        annotation_font_color=COLOURS["highlight"],
        annotation_position="top right",
    )
    fig.add_trace(go.Scatter(
        x=[current_phi], y=[current_tau],
        mode="markers",
        marker=dict(size=11, color=COLOURS["highlight"], symbol="circle"),
        name=f"Current τ = {current_tau:.4f} N·m",
        showlegend=True,
    ))

    # τ_avg line
    tau_avg = (2 / np.pi) * tau_max
    fig.add_hline(
        y=tau_avg,
        line_dash="dashdot",
        line_color=COLOURS["tertiary"],
        line_width=1.5,
        annotation_text=f"τ_avg = {tau_avg:.4f} N·m",
        annotation_font_color=COLOURS["tertiary"],
        annotation_position="bottom right",
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"],
                      zeroline=True)
    fig.update_layout(**plotly_layout(
        height=360,
        title=dict(
            text="Torque vs Angle (two full rotations)",
            font=dict(size=14),
        ),
        xaxis=dict(
            title="Angle φ (°)",
            tickvals=[0, 90, 180, 270, 360, 450, 540, 630, 720],
            **grid_style,
        ),
        yaxis=dict(title="Torque τ (N·m)", **grid_style),
        showlegend=True,
    ))
    return fig


# ── DC Motor renderer ─────────────────────────────────────────────────────────

def render_dc_motor(mode: str) -> None:
    """Sub-sim 4: DC Motor — torque on a rotating coil in a uniform B field."""

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        preset_name = st.selectbox(
            "Real-world preset",
            list(MOTOR_PRESETS.keys()),
            key="motor_preset",
        )
        preset = MOTOR_PRESETS[preset_name]

        def _pv(key, default):
            return preset[key] if preset and key in preset else default

        st.markdown("#### Motor parameters")

        B = st.slider(
            "Magnetic flux density B (T)",
            0.01, 2.0, float(_pv("B", 0.5)),
            step=0.01, key="motor_B",
            disabled=(preset is not None),
            help="Field strength of the permanent magnets.",
        )
        I_mot = st.slider(
            "Current I (A)",
            0.1, 20.0, float(_pv("I", 5.0)),
            step=0.1, key="motor_I",
            disabled=(preset is not None),
        )
        N_mot = st.slider(
            "Number of turns N",
            1, 500, int(_pv("N", 100)),
            step=1, key="motor_N",
            disabled=(preset is not None),
        )
        A_mot = st.slider(
            "Coil area A (m²)",
            0.001, 0.1, float(_pv("A", 0.01)),
            step=0.001, key="motor_A",
            format="%.3f",
            disabled=(preset is not None),
        )
        theta_mot = st.slider(
            "Coil angle θ (°)  [0° = max torque]",
            0, 360, 45,
            step=1, key="motor_theta",
            help=(
                "Angle between the coil plane and B. "
                "θ=0° → coil parallel to B → maximum torque. "
                "θ=90° → coil perpendicular to B → zero torque."
            ),
        )
        show_commutator = st.checkbox(
            "Show commutator effect",
            value=True, key="motor_commutator",
            help=(
                "The commutator (split-ring) reverses the current every half-turn "
                "so torque always acts in the same rotational direction."
            ),
        )

        # ── Computed quantities ────────────────────────────────────────────────
        tau_max = B * I_mot * N_mot * A_mot                      # BINA
        theta_rad = np.radians(theta_mot)
        tau_current = tau_max * abs(np.sin(theta_rad))
        tau_avg = (2 / np.pi) * tau_max

        st.markdown("---")
        metric_row({
            "τ_max = BINA": f"{tau_max:.4f} N·m",
            "τ current": f"{tau_current:.4f} N·m",
        })
        metric_row({
            "τ_avg (2/π)·BINA": f"{tau_avg:.4f} N·m",
        })

        if preset:
            st.info(f"**{preset_name}**\n\n{preset['note']}")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("#### Back-EMF & Power")
            omega = st.slider(
                "Angular velocity ω (rad/s)",
                1, 1000, 100,
                step=1, key="motor_omega",
                help="Rate of rotation of the coil.",
            )
            back_emf = B * I_mot * N_mot * A_mot * omega * abs(np.cos(theta_rad))
            # For an ideal motor: input voltage V drives current I against back-EMF
            # V = back_emf (at steady state, ignoring winding resistance)
            P_mech = tau_avg * omega
            # Assume supply voltage equals back-EMF (ideal, no winding resistance)
            V_supply = back_emf if back_emf > 0 else tau_max * omega
            P_in = V_supply * I_mot if V_supply > 0 else P_mech
            efficiency = (P_mech / P_in * 100) if P_in > 0 else 100.0

            metric_row({
                "Back-EMF ε": f"{back_emf:.4f} V",
                "P_mech = τ_avg·ω": f"{P_mech:.4f} W",
            })
            st.caption(
                f"ε = BINAω cos(θ) = {back_emf:.4f} V  |  "
                f"P_mech = τ_avg × ω = {P_mech:.4f} W  |  "
                f"ω = {omega} rad/s"
            )

    with right_col:
        st.info(
            "**Fleming's Left-Hand Rule:** point your left-hand fingers in the "
            "direction of the field (B), curl them toward the current direction "
            "(I) — your thumb points in the direction of the force (F = BIL). "
            "This gives the direction of rotation for each side of the coil."
        )

        fig_diagram = build_motor_diagram(theta_mot, show_commutator)
        st.plotly_chart(fig_diagram, use_container_width=True)

        st.caption(
            "The commutator ensures torque is always in the same rotational direction."
        )

        fig_torque = build_motor_torque_plot(tau_max, theta_mot, show_commutator)
        st.plotly_chart(fig_torque, use_container_width=True)

        metric_row({
            "B": f"{B} T",
            "I": f"{I_mot} A",
            "N": str(N_mot),
            "A": f"{A_mot:.3f} m²",
            "θ": f"{theta_mot}°",
            "τ_max": f"{tau_max:.4f} N·m",
        })

        if theta_mot % 180 == 0:
            st.success(
                f"θ = {theta_mot}°: coil is **parallel to B** → **maximum torque** "
                f"(τ = τ_max = {tau_max:.4f} N·m)."
            )
        elif theta_mot % 90 == 0:
            st.warning(
                f"θ = {theta_mot}°: coil is **perpendicular to B** → **zero torque**. "
                "The commutator fires here to reverse current and keep rotation going."
            )

        if mode == "Advanced":
            omega_adv = st.session_state.get("motor_omega", 100)
            P_mech_adv = tau_avg * omega_adv
            st.markdown("---")
            st.markdown(
                f"**Back-EMF ε = BINAω cos(θ)**  \n"
                f"At ω = {omega_adv} rad/s, ε = {B * I_mot * N_mot * A_mot * omega_adv * abs(np.cos(theta_rad)):.4f} V  \n\n"
                "The back-EMF opposes the supply voltage — it is the mechanism by "
                "which the motor self-regulates speed under load. At higher load "
                "the motor slows, back-EMF falls, more current flows, more torque "
                "is produced until equilibrium is reached."
            )

        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"\tau = BINA\sin\phi",
                r"\tau_{\max} = BINA",
                r"\bar{\tau} = \frac{2}{\pi}BINA",
                r"\varepsilon = BINA\omega\cos\phi",
                r"P = \tau\omega",
            ],
            explanation=(
                "A DC motor converts electrical energy to mechanical energy. A "
                "rectangular coil carrying current I in a magnetic field B "
                "experiences a torque τ = BINA sin(φ), where φ is the angle between "
                "the coil's normal and the field. Torque is maximum when the coil "
                "plane is parallel to B (φ = 90°) and zero when perpendicular.\n\n"
                "The commutator (split-ring) reverses the current every half-turn, "
                "ensuring torque always acts in the same rotational direction. "
                "Without it the torque would alternate in sign and produce no net "
                "rotation. The average torque over a full rotation is τ_avg = (2/π)BINA."
            ),
            advanced_text=(
                "As the coil rotates it acts as a generator, producing a back-EMF "
                "ε = BINAω cos(φ) that opposes the supply voltage. At steady state "
                "the net voltage driving current is V_supply − ε. This back-EMF "
                "mechanism provides automatic speed regulation: heavier loads slow "
                "the motor, reducing ε, increasing current, and restoring torque. "
                "Mechanical power output P = τω; for an ideal motor this equals the "
                "electrical power input P = εI. Real motors have copper (I²R) and "
                "iron (eddy current, hysteresis) losses that reduce efficiency below 100%."
            ),
            mode=mode,
        )


# ── Main layout ───────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point — render the full simulation page."""

    sim_header(
        "🧲 Magnetic Fields & Electromagnetic Induction",
        SPEC_REF,
    )

    left_col, right_col = two_column_layout(3, 7)

    with left_col:
        mode = mode_toggle()

    # Tabs span both columns — we use st.tabs at top level
    tab1, tab2, tab3, tab4 = st.tabs(
        ["⚡ Magnetic Force", "🔄 Electromagnetic Induction", "🔌 Transformer",
         "⚙️ DC Motor"]
    )

    with tab1:
        render_magnetic_force(mode)

    with tab2:
        render_induction(mode)

    with tab3:
        render_transformer(mode)

    with tab4:
        render_dc_motor(mode)

    # ── Exam practice questions ────────────────────────────────────────────────
    # Use force-sim slider values (B, I, L) from render_magnetic_force context
    # We re-read from session state keys set by the sliders
    _B_exam = st.session_state.get("force_B", 0.5)
    _I_exam = st.session_state.get("force_I", 5.0)
    _L_exam = st.session_state.get("force_L", 1.0)
    _F_exam = _B_exam * _I_exam * _L_exam  # at theta=90 (perpendicular)

    _N_exam = st.session_state.get("ind_N", 100)
    _coil_A_exam = st.session_state.get("ind_A", 0.01)
    _B_ind_exam = st.session_state.get("ind_B", 0.5)
    # Use a representative omega for the rotating coil question
    _omega_exam = 2.0 * 3.14159  # 1 Hz = 2π rad/s

    _exam_questions_12 = [
        {
            "q": (
                f"A conductor of length L = {_L_exam:.2f} m carrying current "
                f"I = {_I_exam:.1f} A is placed perpendicular to a magnetic field "
                f"B = {_B_exam:.3f} T. Calculate the magnetic force on it."
            ),
            "marks": 2,
            "answer": f"F = {_F_exam:.3f} N",
            "working": [
                f"F = BIL sin90° = BIL",
                f"F = {_B_exam:.3f} × {_I_exam:.1f} × {_L_exam:.2f} = {_F_exam:.3f} N",
            ],
            "hint": "F = BIL sinθ; perpendicular means θ = 90°",
        },
        {
            "q": (
                "State Faraday's law of electromagnetic induction and explain what "
                "factors affect the size of the induced EMF."
            ),
            "marks": 3,
            "answer": (
                "EMF = −NdΦ/dt. Factors: rate of change of flux (speed of magnet), "
                "number of turns N, strength of B field."
            ),
            "working": [],
            "hint": "Faraday's law relates EMF to the rate of change of flux linkage.",
        },
        {
            "q": (
                f"A coil of N = {_N_exam:.0f} turns and area A = {_coil_A_exam:.4f} m² "
                f"rotates at ω = {_omega_exam:.2f} rad/s in a field B = {_B_ind_exam:.3f} T. "
                "State the maximum (peak) EMF."
            ),
            "marks": 2,
            "answer": f"EMF_max = NBAω = {_N_exam * _coil_A_exam * _B_ind_exam * _omega_exam:.3f} V",
            "working": [
                f"Peak EMF = NBAω (when coil plane is parallel to the field)",
                f"EMF_max = {_N_exam:.0f} × {_B_ind_exam:.3f} × {_coil_A_exam:.4f} × {_omega_exam:.2f}",
                f"EMF_max = {_N_exam * _coil_A_exam * _B_ind_exam * _omega_exam:.3f} V",
            ],
        },
    ]

    show_exam_panel(_exam_questions_12)


# ── Run ───────────────────────────────────────────────────────────────────────

main()
