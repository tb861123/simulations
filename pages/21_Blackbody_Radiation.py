"""
Blackbody Radiation — WJEC Eduqas A Level Physics.

Simulates Planck's law of blackbody radiation, Wien's displacement law,
the Stefan-Boltzmann law, and the classical Rayleigh-Jeans UV catastrophe.

Spec reference: Component 3, Topic 4 (Thermal Physics + Quantum concepts)
"""

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.physics import h_planck, c_light, k_B
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
    page_title="Blackbody Radiation — WJEC Physics",
    page_icon="🌟",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

SPEC_REF = "Component 3, Topic 4 (Thermal Physics & Quantum concepts)"

WIEN_B    = 2.898e-3   # m K  Wien's displacement constant
SIGMA     = 5.67e-8    # W m⁻² K⁻⁴  Stefan-Boltzmann constant
R_SUN     = 6.957e8    # m  solar radius

# Reference temperatures for multi-curve spectral plot
REFERENCE_TEMPS = [300, 1000, 2700, 5778, 10000, 20000]

# Named colour descriptions for temperature ranges
COLOUR_NAMES = [
    (0,    500,   "Invisible (IR)"),
    (500,  800,   "Faint dark red"),
    (800,  1200,  "Dull red"),
    (1200, 1800,  "Bright red-orange"),
    (1800, 2500,  "Orange"),
    (2500, 3500,  "Yellow-orange"),
    (3500, 5000,  "Yellow-white"),
    (5000, 7500,  "White"),
    (7500, 12000, "Blue-white"),
    (12000, 1e9,  "Deep blue-white"),
]

# Objects for Stefan-Boltzmann reference chart
SB_REFERENCE_OBJECTS = {
    "Earth (avg 288 K)":         {"T": 288,   "marker": "diamond",   "colour": "#2ca02c"},
    "Incandescent bulb (2700 K)": {"T": 2700,  "marker": "square",    "colour": "#ff7f0e"},
    "Sun (5778 K)":               {"T": 5778,  "marker": "star",      "colour": "#ffdd44"},
    "Sirius A (10000 K)":         {"T": 10000, "marker": "triangle-up","colour": "#1f77b4"},
    "Blue giant (30000 K)":       {"T": 30000, "marker": "pentagon",  "colour": "#9b59b6"},
}


# ── Physics helpers ───────────────────────────────────────────────────────────


def temp_to_colour_name(T: float) -> str:
    """Return a human-readable colour description for a given temperature."""
    for lo, hi, name in COLOUR_NAMES:
        if lo <= T < hi:
            return name
    return "Deep blue-white"


def temp_to_rgb(T: float) -> tuple[int, int, int]:
    """
    Approximate the perceived colour of a blackbody at temperature T (K).

    Uses a simplified model matching the COLOUR_NAMES table.

    Returns
    -------
    (r, g, b) with components in 0-255.
    """
    if T < 500:
        return (20, 5, 5)
    if T < 800:
        return (100, 10, 5)
    if T < 1200:
        return (180, 30, 10)
    if T < 1800:
        return (220, 70, 10)
    if T < 2500:
        return (240, 120, 30)
    if T < 3500:
        return (255, 165, 60)
    if T < 5000:
        return (255, 220, 130)
    if T < 7500:
        return (255, 255, 240)
    if T < 12000:
        return (200, 220, 255)
    return (160, 185, 255)


@st.cache_data
def compute_planck_spectrum(T: float) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute the Planck spectral radiance B(λ,T) over 1 nm to 3000 nm.

    Parameters
    ----------
    T : blackbody temperature (K)

    Returns
    -------
    (lam_nm, B) : wavelength array in nm and spectral radiance in W m⁻³ sr⁻¹
    """
    lambdas = np.linspace(1e-9, 3000e-9, 400)
    exponent = h_planck * c_light / (lambdas * k_B * T)
    # Clip exponent to avoid overflow
    exponent = np.clip(exponent, 0, 700)
    B = (2 * h_planck * c_light**2 / lambdas**5) / (np.exp(exponent) - 1)
    lam_nm = lambdas * 1e9
    # Subsample to 200 points
    idx = np.round(np.linspace(0, len(lam_nm) - 1, 200)).astype(int)
    return lam_nm[idx], B[idx]


@st.cache_data
def compute_rayleigh_jeans(T: float, lam_nm: np.ndarray) -> np.ndarray:
    """
    Compute the Rayleigh-Jeans (classical) spectral radiance.

    B_RJ(λ,T) = 2ckT / λ⁴  (diverges as λ → 0: UV catastrophe)

    Parameters
    ----------
    T      : temperature (K)
    lam_nm : wavelength array in nm

    Returns
    -------
    B_RJ array in W m⁻³ sr⁻¹
    """
    lambdas = lam_nm * 1e-9
    return 2 * c_light * k_B * T / lambdas**4


@st.cache_data
def compute_wien_peak(T: float) -> float:
    """Return peak wavelength in nm via Wien's displacement law."""
    return (WIEN_B / T) * 1e9   # m → nm


@st.cache_data
def compute_total_power(T: float) -> float:
    """Return total radiated power per unit area (W m⁻²) via Stefan-Boltzmann law."""
    return SIGMA * T**4


@st.cache_data
def compute_luminosity(T: float, radius_solar: float) -> float:
    """
    Return stellar luminosity (W) for a sphere of given radius.

    Parameters
    ----------
    T            : effective temperature (K)
    radius_solar : radius in solar radii
    """
    r_m = radius_solar * R_SUN
    return SIGMA * 4 * np.pi * r_m**2 * T**4


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_spectral_plot(
    T: float,
    show_rayleigh_jeans: bool,
    show_visible: bool,
    log_y: bool,
) -> go.Figure:
    """
    Build the Planck spectral irradiance plot.

    Shows the current temperature curve (highlighted) plus several reference
    temperature curves (faded). Marks λ_max with a dotted vertical line.
    Optionally overlays the Rayleigh-Jeans curve and a visible-spectrum band.

    Parameters
    ----------
    T                   : current blackbody temperature (K)
    show_rayleigh_jeans : whether to draw the Rayleigh-Jeans (classical) curve
    show_visible        : whether to shade the visible-spectrum band
    log_y               : whether to use a log y-axis

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    # ── Visible spectrum band ─────────────────────────────────────────────────
    if show_visible:
        # Coloured rectangles representing the visible spectrum rainbow
        vis_colours = [
            (380, 430, "rgba(120,0,180,0.18)"),
            (430, 480, "rgba(0,0,255,0.18)"),
            (480, 520, "rgba(0,180,255,0.18)"),
            (520, 565, "rgba(0,200,50,0.18)"),
            (565, 590, "rgba(200,220,0,0.18)"),
            (590, 625, "rgba(255,140,0,0.18)"),
            (625, 780, "rgba(200,0,0,0.18)"),
        ]
        for x0, x1, rgba in vis_colours:
            fig.add_vrect(
                x0=x0, x1=x1,
                fillcolor=rgba,
                layer="below",
                line_width=0,
            )
        fig.add_vrect(
            x0=380, x1=780,
            fillcolor="rgba(0,0,0,0)",
            layer="below",
            line_width=1,
            line_color="rgba(255,255,255,0.25)",
            annotation_text="Visible",
            annotation_position="top left",
            annotation_font=dict(color="rgba(255,255,255,0.5)", size=10),
        )

    # ── Reference temperature curves (faded) ─────────────────────────────────
    ref_temps_to_plot = [rt for rt in REFERENCE_TEMPS if rt != T]
    ref_colours = [
        "rgba(100,149,237,0.30)",
        "rgba(100,200,100,0.30)",
        "rgba(255,165,0,0.30)",
        "rgba(200,100,255,0.30)",
        "rgba(255,100,100,0.30)",
        "rgba(0,200,200,0.30)",
    ]
    for rt, rcol in zip(ref_temps_to_plot, ref_colours):
        lam_r, B_r = compute_planck_spectrum(float(rt))
        fig.add_trace(
            go.Scatter(
                x=lam_r,
                y=B_r,
                mode="lines",
                name=f"{rt:,} K",
                line=dict(color=rcol, width=1.2),
                hovertemplate=f"T={rt:,} K<br>λ=%{{x:.0f}} nm<br>B=%{{y:.2e}} W m⁻³ sr⁻¹<extra></extra>",
            )
        )

    # ── Rayleigh-Jeans (classical) curve ─────────────────────────────────────
    if show_rayleigh_jeans:
        lam_main, _ = compute_planck_spectrum(float(T))
        B_rj = compute_rayleigh_jeans(float(T), lam_main)
        # Only show up to 600 nm to avoid extreme divergence making plot unreadable
        mask = lam_main <= 600
        fig.add_trace(
            go.Scatter(
                x=lam_main[mask],
                y=B_rj[mask],
                mode="lines",
                name="Rayleigh-Jeans (classical)",
                line=dict(color=COLOURS["highlight"], width=2, dash="dash"),
                hovertemplate="Classical (R-J)<br>λ=%{x:.0f} nm<br>B=%{y:.2e}<extra></extra>",
            )
        )

    # ── Current temperature curve (highlighted) ───────────────────────────────
    lam_nm, B = compute_planck_spectrum(float(T))
    r, g, b = temp_to_rgb(T)
    current_colour = f"rgb({r},{g},{b})"

    fig.add_trace(
        go.Scatter(
            x=lam_nm,
            y=B,
            mode="lines",
            name=f"<b>{T:,.0f} K (current)</b>",
            line=dict(color=current_colour, width=3),
            hovertemplate="λ=%{x:.0f} nm<br>B=%{y:.2e} W m⁻³ sr⁻¹<extra></extra>",
        )
    )

    # ── λ_max dotted vertical line ────────────────────────────────────────────
    lam_peak = compute_wien_peak(float(T))
    B_peak_interp = float(np.interp(lam_peak, lam_nm, B))

    fig.add_vline(
        x=lam_peak,
        line_dash="dot",
        line_color=COLOURS["secondary"],
        line_width=2,
    )
    fig.add_annotation(
        x=lam_peak,
        y=B_peak_interp,
        text=f"<b>λ_max = {lam_peak:.0f} nm</b>",
        showarrow=True,
        arrowhead=2,
        arrowcolor=COLOURS["secondary"],
        font=dict(color=COLOURS["secondary"], size=11),
        bgcolor="rgba(0,0,0,0.65)",
        bordercolor=COLOURS["secondary"],
        borderwidth=1,
        ax=50, ay=-40,
    )

    # ── Layout ────────────────────────────────────────────────────────────────
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    yaxis_cfg = dict(
        title="Spectral radiance B(λ,T) (W m⁻³ sr⁻¹)",
        type="log" if log_y else "linear",
        **grid_style,
    )

    fig.update_layout(
        **plotly_layout(
            height=420,
            title=dict(
                text=f"Blackbody Spectral Radiance — Planck's Law  (T = {T:,.0f} K)",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Wavelength λ (nm)",
                range=[0, 3000],
                **grid_style,
            ),
            yaxis=yaxis_cfg,
            showlegend=True,
            legend=dict(font=dict(size=10)),
            margin=dict(l=70, r=30, t=60, b=60),
        )
    )
    return fig


def build_stefan_boltzmann_plot(T_selected: float) -> go.Figure:
    """
    Build a log-log Stefan-Boltzmann plot of total emitted power vs temperature.

    Shows a T⁴ reference line, marks the selected temperature, and annotates
    several reference astronomical/physical objects.

    Parameters
    ----------
    T_selected : currently selected temperature (K)

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    T_arr = np.logspace(2, 5, 300)    # 100 K to 100 000 K
    P_arr = SIGMA * T_arr**4

    # Main T⁴ curve
    fig.add_trace(
        go.Scatter(
            x=T_arr,
            y=P_arr,
            mode="lines",
            name="σT⁴ (Stefan-Boltzmann)",
            line=dict(color=COLOURS["primary"], width=2.5),
            hovertemplate="T=%{x:.0f} K<br>P=%{y:.2e} W m⁻²<extra></extra>",
        )
    )

    # Reference object markers
    for obj_name, obj_data in SB_REFERENCE_OBJECTS.items():
        T_obj = obj_data["T"]
        P_obj = SIGMA * T_obj**4
        fig.add_trace(
            go.Scatter(
                x=[T_obj],
                y=[P_obj],
                mode="markers+text",
                name=obj_name,
                marker=dict(
                    color=obj_data["colour"],
                    size=12,
                    symbol=obj_data["marker"],
                    line=dict(color=COLOURS["text"], width=1),
                ),
                text=[obj_name.split(" ")[0]],
                textposition="top right",
                textfont=dict(size=9, color=obj_data["colour"]),
                hovertemplate=f"{obj_name}<br>T={T_obj:,} K<br>P={SIGMA*T_obj**4:.2e} W m⁻²<extra></extra>",
            )
        )

    # Selected temperature marker (large, prominent)
    P_sel = compute_total_power(float(T_selected))
    r, g, b_val = temp_to_rgb(T_selected)
    sel_colour = f"rgb({r},{g},{b_val})"

    fig.add_trace(
        go.Scatter(
            x=[T_selected],
            y=[P_sel],
            mode="markers",
            name=f"Selected: {T_selected:,.0f} K",
            marker=dict(
                color=sel_colour,
                size=18,
                symbol="circle",
                line=dict(color=COLOURS["text"], width=2),
            ),
            hovertemplate=f"Selected T={T_selected:,.0f} K<br>P={P_sel:.2e} W m⁻²<extra></extra>",
        )
    )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(
                text="Stefan-Boltzmann Law: Total Radiated Power vs Temperature",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Temperature T (K)",
                type="log",
                **grid_style,
            ),
            yaxis=dict(
                title="Power per unit area P (W m⁻²)",
                type="log",
                **grid_style,
            ),
            showlegend=True,
            legend=dict(font=dict(size=10)),
            margin=dict(l=80, r=30, t=60, b=60),
        )
    )
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_blackbody_animation(
    T: float,
    lam_peak_nm: float,
    lam_nm_arr: list[float],
    B_arr: list[float],
) -> str:
    """
    Build a self-contained p5.js animation of a glowing blackbody sphere.

    The sphere changes colour with temperature, emits radiating photon
    particles (rate ∝ T⁴, colour by wavelength), and shows a live
    λ_max label and temperature readout. A star field in the background
    also tints with temperature.

    Parameters
    ----------
    T           : blackbody temperature (K)
    lam_peak_nm : peak wavelength (nm)
    lam_nm_arr  : subsampled wavelength array (nm) for colour reference
    B_arr       : subsampled spectral radiance array

    Returns
    -------
    HTML string containing the self-contained p5.js sketch
    """
    r, g, b = temp_to_rgb(T)
    colour_name = temp_to_colour_name(T)

    # Normalise B to 0-1 for the in-canvas mini spectrum
    B_arr_np = np.array(B_arr)
    B_max = float(B_arr_np.max()) if B_arr_np.max() > 0 else 1.0
    B_norm = (B_arr_np / B_max).tolist()

    # Particle spawn rate proportional to T⁴, capped for display
    T_sun = 5778.0
    t4_ratio = (T / T_sun) ** 4
    spawn_rate = float(np.clip(t4_ratio * 15, 1, 60))

    data = json.dumps({
        "T": float(T),
        "lam_peak": float(lam_peak_nm),
        "colour_name": colour_name,
        "star_r": r, "star_g": g, "star_b": b,
        "spawn_rate": spawn_rate,
        "lam_arr": lam_nm_arr[:80],    # 80 pts sufficient for mini spectrum
        "B_norm": B_norm[:80],
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
  const W = 680, H = 440;
  const CX = 240, CY = 200;   // star/sphere centre
  const BASE_R = 90;           // sphere radius

  let photons = [];
  let stars = [];
  let speed = 1.0;
  let spawnTimer = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Map wavelength (nm) to RGB — approximate
  function wlToRGB(wl) {{
    if (wl < 380) return [180, 60, 255];
    if (wl < 440) return [int_lerp(440-wl,60,180,60), 0, 255];
    if (wl < 490) return [0, int_lerp(wl-440,0,255,50), 255];
    if (wl < 510) return [0, 255, int_lerp(510-wl,0,255,20)];
    if (wl < 580) return [int_lerp(wl-510,0,255,70), 255, 0];
    if (wl < 645) return [255, int_lerp(645-wl,0,255,65), 0];
    if (wl <= 780) return [220, 0, 0];
    return [180, 100, 60];   // IR: brownish
  }}

  function int_lerp(val, out_lo, out_hi, range_sz) {{
    return Math.round(out_lo + (out_hi - out_lo) * Math.min(1, val / range_sz));
  }}

  // Pick a photon wavelength sampled from the spectrum
  function sampleWavelength() {{
    // Weighted random sample from B_norm
    const lams = SIM.lam_arr;
    const weights = SIM.B_norm;
    let cumSum = [];
    let total = 0;
    for (let i = 0; i < weights.length; i++) {{
      total += weights[i];
      cumSum.push(total);
    }}
    const r = Math.random() * total;
    for (let i = 0; i < cumSum.length; i++) {{
      if (r <= cumSum[i]) return lams[i];
    }}
    return lams[lams.length - 1];
  }}

  // Spawn interval in frames
  function spawnInterval() {{
    return Math.max(1, Math.round(60 / (SIM.spawn_rate * speed)));
  }}

  function spawnPhoton() {{
    // Random angle on sphere surface
    const angle = Math.random() * Math.PI * 2;
    const r_spawn = BASE_R + 2;
    const sx = CX + Math.cos(angle) * r_spawn;
    const sy = CY + Math.sin(angle) * r_spawn;
    const spd = p.random(0.6, 2.0) * speed;
    const wl = sampleWavelength();
    const [pr, pg, pb] = wlToRGB(wl);
    photons.push({{
      x: sx, y: sy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r: p.random(2, 4),
      wl: wl,
      pr: pr, pg: pg, pb: pb,
      alpha: 255,
      trail: [],
    }});
  }}

  // ── p5 setup ────────────────────────────────────────────────────────────────
  p.setup = function() {{
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');

    // Seed star field
    p.randomSeed(42);
    for (let i = 0; i < 120; i++) {{
      stars.push({{
        x: p.random(W),
        y: p.random(H),
        sz: p.random(0.5, 2.5),
        twinkle: p.random(0, Math.PI * 2),
      }});
    }}
  }};

  // ── p5 draw ─────────────────────────────────────────────────────────────────
  p.draw = function() {{
    // Background
    p.background(14, 17, 23);

    drawStarField();
    drawSphere();
    updatePhotons();
    drawInfoPanel();
    drawMiniSpectrum();
    drawSpeedControls();

    // Spawn new photon
    spawnTimer++;
    if (spawnTimer >= spawnInterval()) {{
      spawnPhoton();
      spawnTimer = 0;
    }}
  }};

  // ── Star field ───────────────────────────────────────────────────────────────
  function drawStarField() {{
    const sr = SIM.star_r, sg = SIM.star_g, sb = SIM.star_b;
    for (const s of stars) {{
      s.twinkle += 0.03;
      const alpha = 80 + 60 * Math.sin(s.twinkle);
      p.noStroke();
      // Tint stars faintly toward the blackbody colour
      const br = Math.round(180 + (sr - 180) * 0.3);
      const bg = Math.round(180 + (sg - 180) * 0.3);
      const bb = Math.round(180 + (sb - 180) * 0.3);
      p.fill(br, bg, bb, alpha);
      p.ellipse(s.x, s.y, s.sz, s.sz);
    }}
  }}

  // ── Glowing sphere ───────────────────────────────────────────────────────────
  function drawSphere() {{
    const sr = SIM.star_r, sg = SIM.star_g, sb_c = SIM.star_b;
    const T = SIM.T;

    // Outer halo layers
    const haloLayers = [
      [BASE_R * 2.8, 0.04],
      [BASE_R * 2.2, 0.08],
      [BASE_R * 1.7, 0.14],
      [BASE_R * 1.35, 0.22],
    ];
    for (const [hr, ha] of haloLayers) {{
      p.noStroke();
      p.fill(sr, sg, sb_c, Math.round(255 * ha));
      p.ellipse(CX, CY, hr * 2, hr * 2);
    }}

    // Main sphere body — radial gradient approximated with stacked ellipses
    for (let layer = BASE_R; layer > 0; layer -= 3) {{
      const t = layer / BASE_R;
      const lightness = 1.0 - t * 0.55;   // brighter at centre
      p.fill(
        Math.min(255, Math.round(sr * lightness + 255 * (1 - lightness) * 0.4)),
        Math.min(255, Math.round(sg * lightness + 255 * (1 - lightness) * 0.4)),
        Math.min(255, Math.round(sb_c * lightness + 255 * (1 - lightness) * 0.4)),
        255
      );
      p.noStroke();
      p.ellipse(CX, CY, layer * 2, layer * 2);
    }}

    // Specular highlight
    p.fill(255, 255, 255, 80);
    p.noStroke();
    p.ellipse(CX - BASE_R * 0.28, CY - BASE_R * 0.28, BASE_R * 0.45, BASE_R * 0.35);

    // λ_max label below sphere
    p.fill(255, 220, 100);
    p.noStroke();
    p.textSize(13);
    p.textAlign(p.CENTER, p.TOP);
    p.text('λ_max = ' + SIM.lam_peak.toFixed(0) + ' nm', CX, CY + BASE_R + 12);

    // Temperature label
    p.fill(200, 210, 230);
    p.textSize(11);
    p.textAlign(p.CENTER, p.TOP);
    p.text('T = ' + SIM.T.toLocaleString() + ' K', CX, CY + BASE_R + 30);

    // Colour name label
    p.fill(sr, sg, sb_c);
    p.textSize(10);
    p.textAlign(p.CENTER, p.TOP);
    p.text(SIM.colour_name, CX, CY + BASE_R + 46);
  }}

  // ── Photon particles ─────────────────────────────────────────────────────────
  function updatePhotons() {{
    for (let i = photons.length - 1; i >= 0; i--) {{
      const ph = photons[i];

      // Trail
      ph.trail.push({{ x: ph.x, y: ph.y }});
      if (ph.trail.length > 14) ph.trail.shift();

      // Draw trail
      for (let j = 0; j < ph.trail.length; j++) {{
        const a = Math.round((j / ph.trail.length) * ph.alpha * 0.4);
        p.stroke(ph.pr, ph.pg, ph.pb, a);
        p.strokeWeight(1);
        const next = ph.trail[j + 1] || {{ x: ph.x, y: ph.y }};
        p.line(ph.trail[j].x, ph.trail[j].y, next.x, next.y);
      }}

      // Draw photon dot
      p.noStroke();
      p.fill(ph.pr, ph.pg, ph.pb, ph.alpha);
      p.ellipse(ph.x, ph.y, ph.r * 2, ph.r * 2);

      // Faint glow halo
      p.fill(ph.pr, ph.pg, ph.pb, Math.round(ph.alpha * 0.18));
      p.ellipse(ph.x, ph.y, ph.r * 5, ph.r * 5);

      // Move
      ph.x += ph.vx;
      ph.y += ph.vy;
      ph.alpha -= 2.5;

      // Remove if off-screen or faded
      if (ph.alpha <= 0 || ph.x < -20 || ph.x > W + 20 || ph.y < -20 || ph.y > H + 20) {{
        photons.splice(i, 1);
      }}
    }}
  }}

  // ── Info panel (top-right) ───────────────────────────────────────────────────
  function drawInfoPanel() {{
    const px = W - 210, py = 10, pw = 200, ph_h = 110;
    p.fill(18, 22, 34, 210);
    p.stroke(70, 80, 110);
    p.strokeWeight(1);
    p.rect(px, py, pw, ph_h, 6);
    p.noStroke();

    const wien_b = 2.898e-3;
    const sigma = 5.67e-8;
    const T = SIM.T;
    const lam_peak = wien_b / T * 1e9;
    const P = sigma * T * T * T * T;

    p.fill(180, 210, 255);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Wien: λ_max = b/T', px + 8, py + 10);
    p.fill(255, 230, 100);
    p.text('  = ' + lam_peak.toFixed(1) + ' nm', px + 8, py + 24);
    p.fill(180, 210, 255);
    p.text('Stefan-Boltz.: P = σT⁴', px + 8, py + 42);
    p.fill(100, 220, 140);
    p.text('  = ' + P.toExponential(2) + ' W m⁻²', px + 8, py + 56);
    p.fill(180, 210, 255);
    p.text('Photon rate ∝ T⁴', px + 8, py + 74);
    p.fill(200, 180, 255);
    p.text('(spawn: ' + SIM.spawn_rate.toFixed(1) + '/s)', px + 8, py + 88);
  }}

  // ── Mini spectrum bar chart ───────────────────────────────────────────────────
  function drawMiniSpectrum() {{
    const mx = 460, my = 300, mw = 200, mh = 100;
    p.fill(18, 22, 34, 180);
    p.stroke(70, 80, 110);
    p.strokeWeight(1);
    p.rect(mx, my, mw, mh + 24, 4);
    p.noStroke();

    p.fill(180, 200, 230);
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);
    p.text('Spectral distribution', mx + mw / 2, my + 4);

    const lams = SIM.lam_arr;
    const norms = SIM.B_norm;
    const n = lams.length;
    const barW = mw / n;

    for (let i = 0; i < n; i++) {{
      const lam = lams[i];
      const val = norms[i];
      const [cr, cg, cb_c] = wlToRGB(lam);
      const bh = val * (mh - 10);
      p.fill(cr, cg, cb_c, 200);
      p.noStroke();
      p.rect(mx + i * barW, my + mh - bh + 14, barW, bh);
    }}

    // X-axis labels
    p.fill(140, 150, 170);
    p.textSize(8);
    p.textAlign(p.LEFT, p.TOP);
    p.text('200nm', mx + 2, my + mh + 16);
    p.textAlign(p.RIGHT, p.TOP);
    p.text('3000nm', mx + mw - 2, my + mh + 16);
  }}

  // ── Speed controls ───────────────────────────────────────────────────────────
  function drawSpeedControls() {{
    const barY = H - 34;
    p.fill(18, 22, 34, 200);
    p.noStroke();
    p.rect(0, barY, W, 34);

    p.fill(160, 170, 190);
    p.textSize(10);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('Speed: ' + speed.toFixed(1) + '×', 10, barY + 17);

    // − button
    p.fill(50, 60, 95);
    p.rect(80, barY + 4, 28, 24, 4);
    p.fill(200, 215, 245);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(14);
    p.text('−', 94, barY + 16);

    // + button
    p.fill(50, 60, 95);
    p.rect(116, barY + 4, 28, 24, 4);
    p.fill(200, 215, 245);
    p.text('+', 130, barY + 16);

    p.fill(100, 110, 130);
    p.textSize(9);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('Particle rate ∝ T⁴  |  Colour = photon wavelength', W - 10, barY + 17);
  }}

  // ── Mouse interaction ────────────────────────────────────────────────────────
  p.mousePressed = function() {{
    const barY = H - 34;
    if (p.mouseX >= 80 && p.mouseX <= 108 && p.mouseY >= barY + 4 && p.mouseY <= barY + 28) {{
      speed = Math.max(0.25, speed - 0.25);
    }}
    if (p.mouseX >= 116 && p.mouseX <= 144 && p.mouseY >= barY + 4 && p.mouseY <= barY + 28) {{
      speed = Math.min(4.0, speed + 0.25);
    }}
  }};

  p.windowResized = function() {{
    p.resizeCanvas(p.windowWidth || W, H);
  }};
}});
</script>
</body>
</html>"""


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full Blackbody Radiation simulation page."""
    sim_header("🌟 Blackbody Radiation", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ── Sidebar controls (left column) ────────────────────────────────────────
    with left_col:
        mode = mode_toggle()

        st.markdown("### Temperature")
        st.divider()

        # Quick preset buttons
        st.markdown("**Quick presets:**")
        preset_cols = st.columns(2)
        preset_T = None
        with preset_cols[0]:
            if st.button("Room\n(300 K)", use_container_width=True, key="preset_room"):
                preset_T = 300
            if st.button("Bulb\n(2700 K)", use_container_width=True, key="preset_bulb"):
                preset_T = 2700
        with preset_cols[1]:
            if st.button("Sun\n(5778 K)", use_container_width=True, key="preset_sun"):
                preset_T = 5778
            if st.button("Blue star\n(15000 K)", use_container_width=True, key="preset_blue"):
                preset_T = 15000

        # Session-state-driven temperature (presets override slider default)
        if "bb_T" not in st.session_state:
            st.session_state["bb_T"] = 5778
        if preset_T is not None:
            st.session_state["bb_T"] = preset_T

        T = st.slider(
            "Temperature T (K)",
            min_value=500,
            max_value=30000,
            value=int(st.session_state["bb_T"]),
            step=50,
            key="bb_T_slider",
            help="Surface temperature of the blackbody.",
        )
        st.session_state["bb_T"] = T

        st.divider()

        # Derived physics values
        lam_peak = compute_wien_peak(float(T))
        P_total  = compute_total_power(float(T))
        col_name = temp_to_colour_name(T)
        r, g, b  = temp_to_rgb(T)

        # Colour square — CSS coloured box
        st.markdown("**Perceived colour:**")
        st.markdown(
            f"<div style='background:rgb({r},{g},{b}); border-radius:6px; "
            f"padding:10px 12px; margin:4px 0 8px 0; text-align:center; "
            f"color:{'#111' if r+g+b > 400 else '#eee'}; font-weight:600; "
            f"font-size:0.9rem; border:1px solid rgba(255,255,255,0.15);'>"
            f"{col_name}</div>",
            unsafe_allow_html=True,
        )

        st.divider()

        # Display options
        st.markdown("### Display options")
        show_visible = st.checkbox(
            "Show visible spectrum overlay",
            value=True,
            key="show_vis",
            help="Shades the 380–780 nm visible range on the spectrum plot.",
        )
        log_y = st.checkbox(
            "Log y-axis (spectral plot)",
            value=False,
            key="log_y",
            help="Toggle between linear and log scale for the spectral plot.",
        )

        if mode == "Advanced":
            advanced_divider()
            show_rj = st.checkbox(
                "Show Rayleigh-Jeans curve",
                value=False,
                key="show_rj",
                help="Classical (pre-quantum) prediction. Diverges at short λ — the UV catastrophe.",
            )
            radius_solar = st.slider(
                "Object radius (solar radii)",
                min_value=0.1,
                max_value=100.0,
                value=1.0,
                step=0.1,
                key="radius_solar",
                help="Sphere radius for total luminosity calculation.",
            )
        else:
            show_rj = False
            radius_solar = 1.0

    # ── Right column: animation + charts ─────────────────────────────────────
    with right_col:

        # Compute spectrum arrays for passing to p5.js and Plotly
        lam_nm_arr_np, B_arr_np = compute_planck_spectrum(float(T))
        lam_nm_list  = lam_nm_arr_np.tolist()
        B_arr_list   = B_arr_np.tolist()

        # Metrics row
        luminosity = compute_luminosity(float(T), float(radius_solar))
        lum_display = f"{luminosity:.2e} W" if mode == "Advanced" else "—"
        metric_row({
            "Temperature T":   f"{T:,} K",
            "Peak λ_max":      f"{lam_peak:.0f} nm",
            "Colour":          col_name,
            "Power P":         f"{P_total:.2e} W m⁻²",
            "Luminosity":      lum_display,
        })

        st.markdown("")

        # ── p5.js animation ───────────────────────────────────────────────────
        components.html(
            build_blackbody_animation(
                T=float(T),
                lam_peak_nm=float(lam_peak),
                lam_nm_arr=lam_nm_list,
                B_arr=B_arr_list,
            ),
            height=450,
        )
        st.caption(
            "Particle rate ∝ T⁴ (Stefan-Boltzmann) · Particle colour = emitted photon wavelength · "
            "Use − / + buttons to change animation speed"
        )

        st.divider()

        # ── Spectral irradiance plot ──────────────────────────────────────────
        fig_spec = build_spectral_plot(
            T=float(T),
            show_rayleigh_jeans=show_rj,
            show_visible=show_visible,
            log_y=log_y,
        )
        st.plotly_chart(fig_spec, use_container_width=True)

        if mode == "Advanced" and show_rj:
            st.info(
                "**UV catastrophe:** The Rayleigh-Jeans law (classical physics) predicts that "
                "spectral radiance → ∞ as λ → 0. This was a major failure of classical theory. "
                "Planck resolved it in 1900 by quantising oscillator energy: E = nhf. "
                "The Planck curve correctly falls to zero at short wavelengths."
            )

        # ── Stefan-Boltzmann plot (Advanced) ─────────────────────────────────
        if mode == "Advanced":
            st.divider()
            fig_sb = build_stefan_boltzmann_plot(float(T))
            st.plotly_chart(fig_sb, use_container_width=True)

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"B(\lambda, T) = \frac{2hc^2}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}",
                r"\lambda_{\max} = \frac{b}{T}, \quad b = 2.898 \times 10^{-3}\ \text{m K}",
                r"P = \sigma T^4, \quad \sigma = 5.67 \times 10^{-8}\ \text{W m}^{-2}\text{K}^{-4}",
            ],
            explanation=(
                "A blackbody is an idealised object that absorbs all incident radiation and "
                "re-emits it thermally. The spectrum of radiation emitted depends only on "
                "temperature T.\n\n"
                "**Wien's displacement law** states that the peak wavelength shifts to shorter "
                "values (bluer light) as temperature increases: λ_max = b/T. The Sun peaks near "
                "500 nm (visible green), while a 3000 K bulb filament peaks in the infrared.\n\n"
                "**Stefan-Boltzmann law** gives the total power emitted per unit area. "
                "Doubling T increases radiated power by a factor of 16 (T⁴ dependence). "
                "This explains why even a small increase in stellar temperature produces "
                "dramatically higher luminosity.\n\n"
                "**Planck's law** (1900) gave the first successful description of the full "
                "blackbody spectrum. It required quantisation of oscillator energy (E = nhf), "
                "marking the birth of quantum mechanics."
            ),
            advanced_text=(
                "**UV catastrophe:** Classical Rayleigh-Jeans theory predicted B ∝ T/λ⁴, "
                "which diverges as λ → 0 — an infinite total radiated power. Planck's "
                "quantisation resolves this because high-frequency (short-λ) modes require "
                "large energy quanta hf that are rarely thermally excited at finite T, "
                "causing the spectrum to fall exponentially at short wavelengths.\n\n"
                "**Stefan-Boltzmann log-log plot:** The slope is exactly 4 on a log-log scale "
                "(since log P = log σ + 4 log T), confirming the T⁴ law.\n\n"
                "**Stellar spectra:** Real stars approximate blackbodies closely. "
                "The colour-temperature relationship underpins stellar classification "
                "(O B A F G K M — blue to red). The Sun (G-type, 5778 K) has a roughly "
                "flat visible spectrum, appearing white-yellow.\n\n"
                "**Cosmic Microwave Background (CMB):** The most perfect blackbody spectrum "
                "ever measured — the afterglow of the Big Bang at T ≈ 2.725 K, peaking "
                "in the microwave region (~1.9 mm)."
            ),
            mode=mode,
        )


main()
