"""
Stellar Evolution & HR Diagram — WJEC Eduqas A Level Physics.

Interactive Hertzsprung-Russell diagram, stellar properties calculator,
p5.js star animation, and lifetime vs mass chart.

Spec reference: Component 3, Topic 5 — Stars and Cosmology
"""

import json
import math

import numpy as np
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from utils.exam_ui import show_exam_panel
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
    page_title="Stellar Evolution & HR Diagram — WJEC Physics",
    page_icon="⭐",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

SPEC_REF   = "Component 3, Topic 5 — Stars and Cosmology"
SIGMA      = 5.67e-8    # W m⁻² K⁻⁴  Stefan-Boltzmann constant
WIEN_B     = 2.898e-3   # m K  Wien's displacement constant
L_SUN      = 3.83e26    # W  solar luminosity
T_SUN      = 5778.0     # K  solar effective temperature
R_SUN      = 6.96e8     # m  solar radius
M_SUN      = 1.99e30    # kg solar mass
TAU_SUN    = 1.0e10     # years  solar main-sequence lifetime

# ── Stellar catalogue ─────────────────────────────────────────────────────────

# (name, T [K], L/L_sun, R/R_sun, spectral class, type)
STARS = [
    ("Sun",              5778,  1,        1,      "G", "main"),
    ("Sirius A",         9940,  25.4,     1.71,   "A", "main"),
    ("Rigel",           12100,  120000,   78.9,   "B", "supergiant"),
    ("Betelgeuse",       3500,  126000,   887,    "M", "supergiant"),
    ("Vega",             9602,  40.1,     2.36,   "A", "main"),
    ("Aldebaran",        3910,  518,      44.2,   "K", "giant"),
    ("Arcturus",         4286,  170,      25.7,   "K", "giant"),
    ("Proxima Centauri", 3042,  0.0017,   0.15,   "M", "main"),
    ("Deneb",            8525,  196000,   203,    "A", "supergiant"),
    ("Sirius B",        25200,  0.056,    0.0084, "A", "white_dwarf"),
    ("Pollux",           4666,  32,       9,      "K", "giant"),
    ("Alpha Centauri A", 5790,  1.519,    1.23,   "G", "main"),
    ("Canopus",          7350,  10700,    71,     "F", "supergiant"),
    ("Achernar",        15000,  3150,     6.78,   "B", "main"),
    ("61 Cygni A",       4526,  0.153,    0.67,   "K", "main"),
]

# Spectral class colour mapping (for HR diagram dots)
SPECTRAL_COLOURS = {
    "O": "#9bb4ff",   # blue
    "B": "#aabfff",   # blue-white
    "A": "#cad7ff",   # white
    "F": "#f8f7ff",   # yellow-white
    "G": "#fff4e8",   # yellow
    "K": "#ffd2a1",   # orange
    "M": "#ffaa7f",   # red
}

# Stellar type colours for HR background regions
TYPE_COLOURS = {
    "main":       COLOURS["primary"],
    "giant":      COLOURS["secondary"],
    "supergiant": COLOURS["highlight"],
    "white_dwarf": COLOURS["advanced"],
}


# ── Physics helpers ───────────────────────────────────────────────────────────

def spectral_class_from_T(T: float) -> str:
    """Return the spectral class letter for a given effective temperature."""
    if T >= 30000:
        return "O"
    if T >= 10000:
        return "B"
    if T >= 7500:
        return "A"
    if T >= 6000:
        return "F"
    if T >= 5200:
        return "G"
    if T >= 3700:
        return "K"
    return "M"


def temp_to_rgb_stellar(T: float) -> tuple[int, int, int]:
    """Return approximate (r, g, b) blackbody colour for stellar temperature."""
    if T >= 30000:
        return (155, 180, 255)
    if T >= 15000:
        return (170, 191, 255)
    if T >= 10000:
        return (202, 215, 255)
    if T >= 7500:
        return (220, 230, 255)
    if T >= 6000:
        return (248, 247, 255)
    if T >= 5200:
        return (255, 244, 232)
    if T >= 3700:
        return (255, 210, 161)
    if T >= 3000:
        return (255, 170, 127)
    return (255, 120, 80)


def ms_temperature(M: float) -> float:
    """
    Approximate main-sequence effective temperature for a star of mass M (solar units).

    Uses a piecewise power-law calibration anchored to the Sun.
    """
    return T_SUN * (M ** 0.57)


def ms_radius(M: float) -> float:
    """Approximate main-sequence radius in solar radii."""
    return M ** 0.8


def ms_luminosity(M: float) -> float:
    """Main-sequence luminosity in solar units: L ∝ M^3.5."""
    return M ** 3.5


def main_sequence_lifetime(M: float) -> float:
    """Main-sequence lifetime in years: τ ∝ M^-2.5 × τ_sun."""
    return TAU_SUN * (M ** -2.5)


def rg_temperature(M: float) -> float:
    """Approximate red-giant effective temperature (cool, ~3500–4500 K)."""
    # Giants cool to lower T; more massive stars become slightly hotter giants
    return 3500 + 200 * math.log10(max(M, 0.1))


def rg_luminosity(M: float) -> float:
    """Red-giant luminosity in solar units (greatly expanded)."""
    return ms_luminosity(M) * 150 * (M ** 0.3)


def rg_radius(M: float) -> float:
    """Red-giant radius in solar radii."""
    L   = rg_luminosity(M)
    T   = rg_temperature(M)
    # L = 4πR²σT⁴  →  R = sqrt(L * L_sun / (4π σ T⁴)) / R_sun
    return math.sqrt(L * L_SUN / (4 * math.pi * SIGMA * T ** 4)) / R_SUN


def end_state(M: float) -> dict:
    """
    Return a dict describing the stellar remnant after the end of evolution.

    Returns keys: type, T, L, R, label
    """
    if M < 8:
        # White dwarf: hot, tiny, dim
        T_wd = 25000 + 5000 * M
        R_wd = 0.01 * (M ** -0.33)          # ~0.01 R_sun
        L_wd = (4 * math.pi * (R_wd * R_SUN) ** 2 * SIGMA * T_wd ** 4) / L_SUN
        return {"type": "White Dwarf", "T": T_wd, "L": L_wd, "R": R_wd,
                "label": "WHITE DWARF"}
    if M < 20:
        # Neutron star (off HR diagram — placeholder at extreme low-L)
        return {"type": "Neutron Star", "T": 1e6, "L": 1e-4, "R": 1e-5,
                "label": "NEUTRON STAR"}
    # Black hole
    return {"type": "Black Hole", "T": 0, "L": 0, "R": 0,
            "label": "BLACK HOLE"}


def hr_region(T: float, L: float) -> str:
    """
    Classify a point on the HR diagram into a named region.

    Returns one of: "Main Sequence", "Giant Branch", "Supergiant", "White Dwarf"
    """
    log_L = math.log10(max(L, 1e-10))
    log_T = math.log10(max(T, 1))
    # White dwarf: hot and very dim
    if T > 8000 and log_L < -1.5:
        return "White Dwarf"
    # Supergiant: very luminous
    if log_L > 4.0:
        return "Supergiant"
    # Giant: moderately luminous and cool
    if log_L > 1.5 and T < 6000:
        return "Giant Branch"
    return "Main Sequence"


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_hr_diagram(
    selected_T: float,
    selected_L: float,
    selected_name: str,
    show_main: bool,
    show_giants: bool,
    show_supergiants: bool,
    show_wd: bool,
    stage: str,
    M: float,
) -> go.Figure:
    """
    Build the interactive HR diagram.

    Parameters
    ----------
    selected_T     : effective temperature of the user-selected star (K)
    selected_L     : luminosity of the user-selected star (L/L_sun)
    selected_name  : display name for the selected star
    show_main      : display main-sequence catalogue stars
    show_giants    : display giant catalogue stars
    show_supergiants: display supergiant catalogue stars
    show_wd        : display white-dwarf catalogue stars
    stage          : "ZAMS" / "Red Giant" / "End state"
    M              : stellar mass in solar units

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    # ── Background region shading ─────────────────────────────────────────────
    # Main sequence band — slanted diagonal rectangle approximated with shapes
    # We use a filled scatter polygon instead.
    ms_T  = np.logspace(np.log10(2500), np.log10(50000), 80)
    # Upper main sequence edge
    ms_L_upper = [10 ** (3.8 * (math.log10(t) - math.log10(3000)) + 0.3) for t in ms_T]
    # Lower main sequence edge
    ms_L_lower = [10 ** (3.8 * (math.log10(t) - math.log10(3000)) - 1.0) for t in ms_T]

    fig.add_trace(go.Scatter(
        x=list(ms_T) + list(reversed(ms_T)),
        y=ms_L_upper + list(reversed(ms_L_lower)),
        fill="toself",
        fillcolor="rgba(31,119,180,0.09)",
        line=dict(color="rgba(31,119,180,0.20)", width=0.8),
        mode="lines",
        name="Main Sequence band",
        hoverinfo="skip",
        showlegend=False,
    ))

    # Giant region
    fig.add_trace(go.Scatter(
        x=[6000, 3200, 3200, 6000],
        y=[10,   10,   1000, 1000],
        fill="toself",
        fillcolor="rgba(255,127,14,0.08)",
        line=dict(color="rgba(255,127,14,0.18)", width=0.8),
        mode="lines",
        name="Giant region",
        hoverinfo="skip",
        showlegend=False,
    ))

    # Supergiant region
    fig.add_trace(go.Scatter(
        x=[50000, 2500, 2500, 50000],
        y=[10000, 10000, 1e6, 1e6],
        fill="toself",
        fillcolor="rgba(231,76,60,0.07)",
        line=dict(color="rgba(231,76,60,0.15)", width=0.8),
        mode="lines",
        name="Supergiant region",
        hoverinfo="skip",
        showlegend=False,
    ))

    # White dwarf region
    fig.add_trace(go.Scatter(
        x=[50000, 8000,  8000, 50000],
        y=[1e-4,  1e-4,  0.03, 0.03],
        fill="toself",
        fillcolor="rgba(155,89,182,0.10)",
        line=dict(color="rgba(155,89,182,0.20)", width=0.8),
        mode="lines",
        name="White Dwarf region",
        hoverinfo="skip",
        showlegend=False,
    ))

    # ── Region text annotations ───────────────────────────────────────────────
    for txt, Tx, Ly in [
        ("Main Sequence", 8000,  0.04),
        ("Giant Branch",  4000,  70),
        ("Supergiant",    6000,  3e5),
        ("White Dwarf",   15000, 0.008),
    ]:
        fig.add_annotation(
            x=math.log10(Tx), y=math.log10(Ly),
            text=f"<i>{txt}</i>",
            showarrow=False,
            font=dict(size=10, color="rgba(200,200,200,0.50)"),
            xref="x", yref="y",
        )

    # ── Catalogue stars ───────────────────────────────────────────────────────
    type_filter = {
        "main":       show_main,
        "giant":      show_giants,
        "supergiant": show_supergiants,
        "white_dwarf": show_wd,
    }
    type_labels = {
        "main":       "Main Sequence",
        "giant":      "Giant",
        "supergiant": "Supergiant",
        "white_dwarf": "White Dwarf",
    }

    for stype, slabel in type_labels.items():
        if not type_filter[stype]:
            continue
        t_list, l_list, names, specs = [], [], [], []
        for name, T, L, R, spec, stp in STARS:
            if stp == stype:
                t_list.append(T)
                l_list.append(L)
                names.append(name)
                specs.append(spec)
        if not t_list:
            continue

        dot_colours = [SPECTRAL_COLOURS.get(sp, "#ffffff") for sp in specs]
        hover_texts = [
            f"<b>{n}</b><br>T = {T:,} K<br>L = {L:.3g} L☉<br>Class {sp}"
            for n, T, L, sp in zip(names, t_list, l_list, specs)
        ]

        fig.add_trace(go.Scatter(
            x=t_list,
            y=l_list,
            mode="markers+text",
            name=slabel,
            marker=dict(
                color=dot_colours,
                size=9,
                line=dict(color="rgba(255,255,255,0.4)", width=1),
                symbol="circle",
            ),
            text=names,
            textposition="top right",
            textfont=dict(size=8, color="rgba(210,220,240,0.80)"),
            hovertext=hover_texts,
            hoverinfo="text",
        ))

    # ── Evolutionary track arrow ──────────────────────────────────────────────
    zams_T = ms_temperature(M)
    zams_L = ms_luminosity(M)
    rg_T   = rg_temperature(M)
    rg_L_v = rg_luminosity(M)
    es     = end_state(M)

    track_T = [zams_T, rg_T]
    track_L = [zams_L, rg_L_v]
    if es["L"] > 0:
        track_T.append(es["T"])
        track_L.append(es["L"])

    fig.add_trace(go.Scatter(
        x=track_T,
        y=track_L,
        mode="lines",
        name="Evolutionary track",
        line=dict(color="rgba(255,220,80,0.55)", width=1.5, dash="dot"),
        hoverinfo="skip",
    ))
    # Arrow head at end of track
    if len(track_T) >= 2:
        fig.add_annotation(
            x=track_T[-1], y=math.log10(max(track_L[-1], 1e-6)),
            ax=track_T[-2], ay=math.log10(max(track_L[-2], 1e-6)),
            xref="x", yref="y",
            axref="x", ayref="y",
            showarrow=True,
            arrowhead=3,
            arrowsize=1.2,
            arrowwidth=2,
            arrowcolor="rgba(255,220,80,0.70)",
        )

    # ── Selected star (highlighted dot) ──────────────────────────────────────
    sel_r, sel_g, sel_b = temp_to_rgb_stellar(selected_T)
    fig.add_trace(go.Scatter(
        x=[selected_T],
        y=[selected_L],
        mode="markers",
        name=f"Selected: {selected_name}",
        marker=dict(
            color=f"rgb({sel_r},{sel_g},{sel_b})",
            size=18,
            symbol="star",
            line=dict(color="white", width=2),
        ),
        hovertemplate=(
            f"<b>{selected_name}</b><br>"
            f"T = {selected_T:,.0f} K<br>"
            f"L = {selected_L:.3g} L☉<br>"
            f"Stage: {stage}<extra></extra>"
        ),
    ))

    # ── Layout ────────────────────────────────────────────────────────────────
    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=460,
            title=dict(
                text="Hertzsprung-Russell Diagram",
                font=dict(size=15),
            ),
            xaxis=dict(
                title="Surface Temperature T (K)",
                type="log",
                autorange="reversed",
                range=[math.log10(55000), math.log10(2200)],
                tickvals=[50000, 30000, 20000, 10000, 7000, 5000, 3500, 2500],
                ticktext=["50 000", "30 000", "20 000", "10 000", "7 000",
                          "5 000", "3 500", "2 500"],
                **grid_style,
            ),
            yaxis=dict(
                title="Luminosity L / L☉",
                type="log",
                range=[-5, 6.5],
                tickvals=[1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100,
                          1e3, 1e4, 1e5, 1e6],
                ticktext=["10⁻⁵", "10⁻⁴", "10⁻³", "10⁻²", "0.1", "1",
                          "10", "100", "10³", "10⁴", "10⁵", "10⁶"],
                **grid_style,
            ),
            showlegend=True,
            legend=dict(font=dict(size=10)),
            margin=dict(l=80, r=30, t=60, b=70),
        )
    )
    return fig


def build_lifetime_plot(M_selected: float) -> go.Figure:
    """
    Build the lifetime-vs-mass log-log plot (Advanced view).

    Parameters
    ----------
    M_selected : currently selected stellar mass (solar units)

    Returns
    -------
    Plotly Figure
    """
    M_arr  = np.logspace(-1, np.log10(50), 300)
    tau_arr = TAU_SUN * M_arr ** -2.5

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=M_arr,
        y=tau_arr,
        mode="lines",
        name="τ ∝ M⁻²·⁵",
        line=dict(color=COLOURS["primary"], width=2.5),
        hovertemplate="M = %{x:.2f} M☉<br>τ = %{y:.2e} yr<extra></extra>",
    ))

    # Sun marker
    fig.add_trace(go.Scatter(
        x=[1.0],
        y=[TAU_SUN],
        mode="markers+text",
        name="Sun (1 M☉)",
        marker=dict(color="#ffdd44", size=14, symbol="star",
                    line=dict(color="white", width=1.5)),
        text=["Sun"],
        textposition="top right",
        textfont=dict(size=10, color="#ffdd44"),
        hovertemplate="Sun<br>M = 1 M☉<br>τ = 10¹⁰ yr<extra></extra>",
    ))

    # Selected star marker
    tau_sel = main_sequence_lifetime(M_selected)
    sel_r, sel_g, sel_b = temp_to_rgb_stellar(ms_temperature(M_selected))
    fig.add_trace(go.Scatter(
        x=[M_selected],
        y=[tau_sel],
        mode="markers+text",
        name=f"Selected ({M_selected:.1f} M☉)",
        marker=dict(
            color=f"rgb({sel_r},{sel_g},{sel_b})",
            size=16,
            symbol="circle",
            line=dict(color="white", width=2),
        ),
        text=[f"{M_selected:.1f} M☉"],
        textposition="top right",
        textfont=dict(size=10, color="rgba(220,230,255,0.9)"),
        hovertemplate=(
            f"M = {M_selected:.1f} M☉<br>τ = {tau_sel:.2e} yr<extra></extra>"
        ),
    ))

    # Vertical reference lines at key masses
    for m_ref, label, colour in [
        (0.08, "H-burn limit\n0.08 M☉", "rgba(150,150,200,0.5)"),
        (8.0,  "Supernova limit\n8 M☉",  "rgba(231,76,60,0.5)"),
    ]:
        fig.add_vline(
            x=m_ref, line_dash="dash",
            line_color=colour, line_width=1.2,
        )
        fig.add_annotation(
            x=math.log10(m_ref), y=5,
            text=label,
            showarrow=False,
            font=dict(size=9, color=colour.replace("0.5", "0.7")),
            xref="x", yref="y",
            textangle=-90,
        )

    grid_style = dict(gridcolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"])
    fig.update_layout(
        **plotly_layout(
            height=360,
            title=dict(
                text="Main-Sequence Lifetime vs Stellar Mass  (τ ∝ M⁻²·⁵)",
                font=dict(size=14),
            ),
            xaxis=dict(
                title="Stellar mass M / M☉",
                type="log",
                range=[math.log10(0.09), math.log10(52)],
                **grid_style,
            ),
            yaxis=dict(
                title="Lifetime τ (years)",
                type="log",
                range=[4.5, 12],
                **grid_style,
            ),
            showlegend=True,
            legend=dict(font=dict(size=10)),
            margin=dict(l=80, r=30, t=55, b=65),
        )
    )
    return fig


# ── p5.js animation ───────────────────────────────────────────────────────────


def build_stellar_animation(
    T: float,
    L_ratio: float,
    R_ratio: float,
    stage: str,
) -> str:
    """
    Build a self-contained p5.js stellar animation.

    Shows a glowing star whose colour reflects its blackbody temperature,
    whose size scales with log(R/R_sun), emitting photon particles at a rate
    proportional to luminosity, against a dark starfield.

    Parameters
    ----------
    T       : effective temperature (K)
    L_ratio : luminosity in solar units
    R_ratio : radius in solar radii
    stage   : "ZAMS" / "Red Giant" / "End state"

    Returns
    -------
    HTML string containing the self-contained p5.js sketch.
    """
    r, g, b = temp_to_rgb_stellar(T)

    # Star display radius: log-scale so huge supergiants stay on canvas
    R_clamped  = max(R_ratio, 0.001)
    star_px    = int(np.clip(25 + 30 * math.log10(R_clamped + 1), 12, 115))

    # Photon spawn rate ∝ L, capped for display
    spawn_rate = float(np.clip(5 + 8 * math.log10(max(L_ratio, 1e-6) + 1), 1, 50))

    # Stage display label and colour
    stage_labels = {
        "ZAMS":      ("MAIN SEQUENCE", "#88ccff"),
        "Red Giant": ("RED GIANT PHASE", "#ffaa66"),
        "End state": ("END STATE", "#cc88ff"),
    }
    stage_txt, stage_col = stage_labels.get(stage, ("MAIN SEQUENCE", "#88ccff"))

    # Spectral class label
    spec = spectral_class_from_T(T)

    data = json.dumps({
        "T":          float(T),
        "L":          float(L_ratio),
        "R":          float(R_ratio),
        "star_r":     r,
        "star_g":     g,
        "star_b":     b,
        "star_px":    star_px,
        "spawn_rate": spawn_rate,
        "stage_txt":  stage_txt,
        "stage_col":  stage_col,
        "spec":       spec,
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
  const W = 700, H = 420;
  const CX = W / 2, CY = H / 2 - 10;

  let photons   = [];
  let bgStars   = [];
  let spawnTimer = 0;
  let frame      = 0;
  let paused     = false;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function spawnInterval() {{
    return Math.max(1, Math.round(60 / SIM.spawn_rate));
  }}

  function spawnPhoton() {{
    const angle = Math.random() * Math.PI * 2;
    const sr = SIM.star_px + 3;
    const sx = CX + Math.cos(angle) * sr;
    const sy = CY + Math.sin(angle) * sr;
    const spd = p.random(0.8, 2.4);
    // photon colour drifts toward star colour
    photons.push({{
      x: sx, y: sy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r:  p.random(1.5, 3.5),
      pr: SIM.star_r, pg: SIM.star_g, pb: SIM.star_b,
      alpha: 220,
      trail: [],
    }});
  }}

  // ── p5 setup ─────────────────────────────────────────────────────────────────
  p.setup = function() {{
    const cnv = p.createCanvas(p.windowWidth || W, H);
    cnv.parent(document.body);
    p.textFont('monospace');

    p.randomSeed(42);
    for (let i = 0; i < 140; i++) {{
      bgStars.push({{
        x:       p.random(W * 1.2),
        y:       p.random(H),
        sz:      p.random(0.4, 2.2),
        twinkle: p.random(0, Math.PI * 2),
      }});
    }}
  }};

  // ── p5 draw ──────────────────────────────────────────────────────────────────
  p.draw = function() {{
    p.background(14, 17, 23);
    drawBgStars();

    if (!paused) {{
      frame++;
      updatePhotons();
      spawnTimer++;
      if (spawnTimer >= spawnInterval()) {{
        spawnPhoton();
        spawnTimer = 0;
      }}
    }} else {{
      drawPhotonsStatic();
    }}

    drawStar();
    drawInfoPanel();
    drawStageLabel();
    drawPlayPause();
  }};

  // ── Background stars ──────────────────────────────────────────────────────────
  function drawBgStars() {{
    for (const s of bgStars) {{
      if (!paused) s.twinkle += 0.025;
      const alpha = 70 + 55 * Math.sin(s.twinkle);
      p.noStroke();
      p.fill(190, 200, 220, alpha);
      p.ellipse(s.x, s.y, s.sz, s.sz);
    }}
  }}

  // ── Main star ─────────────────────────────────────────────────────────────────
  function drawStar() {{
    const sr = SIM.star_r, sg = SIM.star_g, sb = SIM.star_b;
    const BASE = SIM.star_px;
    const pulse = paused ? 0 : 0.015 * BASE * Math.sin(frame * 0.04);
    const R = BASE + pulse;

    // Halo layers
    const halos = [
      [R * 3.0, 0.035],
      [R * 2.3, 0.07],
      [R * 1.75, 0.13],
      [R * 1.35, 0.20],
    ];
    for (const [hr, ha] of halos) {{
      p.noStroke();
      p.fill(sr, sg, sb, Math.round(255 * ha));
      p.ellipse(CX, CY, hr * 2, hr * 2);
    }}

    // Body gradient
    for (let layer = R; layer > 0; layer -= 2) {{
      const t = layer / R;
      const lt = 1.0 - t * 0.52;
      p.fill(
        Math.min(255, Math.round(sr * lt + 255 * (1 - lt) * 0.35)),
        Math.min(255, Math.round(sg * lt + 255 * (1 - lt) * 0.35)),
        Math.min(255, Math.round(sb * lt + 255 * (1 - lt) * 0.35)),
        255
      );
      p.noStroke();
      p.ellipse(CX, CY, layer * 2, layer * 2);
    }}

    // Specular highlight
    p.fill(255, 255, 255, 70);
    p.noStroke();
    p.ellipse(CX - R * 0.30, CY - R * 0.30, R * 0.42, R * 0.33);

    // Labels below star
    const wien_b = 2.898e-3;
    const lam = (wien_b / SIM.T * 1e9).toFixed(0);
    p.fill(255, 220, 100);
    p.noStroke();
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    p.text('T = ' + SIM.T.toLocaleString() + ' K   ·   λ_max = ' + lam + ' nm',
           CX, CY + R + 14);
    p.fill(180, 195, 220);
    p.textSize(10);
    p.text('L = ' + SIM.L.toExponential(2) + ' L☉   ·   R = ' + SIM.R.toFixed(2) + ' R☉',
           CX, CY + R + 30);
    p.fill(SIM.star_r, SIM.star_g, SIM.star_b);
    p.textSize(10);
    p.text('Spectral class ' + SIM.spec, CX, CY + R + 46);
  }}

  // ── Photon particles ──────────────────────────────────────────────────────────
  function updatePhotons() {{
    for (let i = photons.length - 1; i >= 0; i--) {{
      const ph = photons[i];

      ph.trail.push({{ x: ph.x, y: ph.y }});
      if (ph.trail.length > 12) ph.trail.shift();

      for (let j = 0; j < ph.trail.length; j++) {{
        const a = Math.round((j / ph.trail.length) * ph.alpha * 0.35);
        p.stroke(ph.pr, ph.pg, ph.pb, a);
        p.strokeWeight(1);
        const nx = ph.trail[j + 1] ? ph.trail[j + 1].x : ph.x;
        const ny = ph.trail[j + 1] ? ph.trail[j + 1].y : ph.y;
        p.line(ph.trail[j].x, ph.trail[j].y, nx, ny);
      }}

      p.noStroke();
      p.fill(ph.pr, ph.pg, ph.pb, ph.alpha);
      p.ellipse(ph.x, ph.y, ph.r * 2, ph.r * 2);
      p.fill(ph.pr, ph.pg, ph.pb, Math.round(ph.alpha * 0.15));
      p.ellipse(ph.x, ph.y, ph.r * 5, ph.r * 5);

      ph.x += ph.vx;
      ph.y += ph.vy;
      ph.alpha -= 2.2;

      if (ph.alpha <= 0 ||
          ph.x < -25 || ph.x > W + 25 ||
          ph.y < -25 || ph.y > H + 25) {{
        photons.splice(i, 1);
      }}
    }}
  }}

  function drawPhotonsStatic() {{
    for (const ph of photons) {{
      p.noStroke();
      p.fill(ph.pr, ph.pg, ph.pb, ph.alpha);
      p.ellipse(ph.x, ph.y, ph.r * 2, ph.r * 2);
    }}
  }}

  // ── Info panel ────────────────────────────────────────────────────────────────
  function drawInfoPanel() {{
    const px = W - 210, py = 10, pw = 198, ph_h = 100;
    p.fill(18, 22, 34, 215);
    p.stroke(70, 80, 115);
    p.strokeWeight(1);
    p.rect(px, py, pw, ph_h, 6);
    p.noStroke();

    const sigma = 5.67e-8;
    const P = sigma * Math.pow(SIM.T, 4);

    p.fill(180, 210, 255);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Stefan-Boltz.: P = σT⁴', px + 8, py + 10);
    p.fill(100, 220, 140);
    p.text('  = ' + P.toExponential(2) + ' W m⁻²', px + 8, py + 24);

    p.fill(180, 210, 255);
    p.text('L = 4πR²σT⁴', px + 8, py + 42);
    p.fill(255, 220, 100);
    p.text('  = ' + SIM.L.toExponential(2) + ' L☉', px + 8, py + 56);

    p.fill(180, 210, 255);
    p.text('Wien: λ_max = b/T', px + 8, py + 74);
    p.fill(200, 180, 255);
    const lam = (2.898e-3 / SIM.T * 1e9).toFixed(0);
    p.text('  = ' + lam + ' nm', px + 8, py + 88);
  }}

  // ── Stage label ───────────────────────────────────────────────────────────────
  function drawStageLabel() {{
    p.fill(18, 22, 34, 190);
    p.noStroke();
    p.rect(10, 10, 195, 28, 5);

    const col = p.color(SIM.stage_col);
    p.fill(col);
    p.textSize(12);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('◆ ' + SIM.stage_txt, 18, 24);
  }}

  // ── Play/Pause button ─────────────────────────────────────────────────────────
  function drawPlayPause() {{
    const barY = H - 32;
    p.fill(18, 22, 34, 200);
    p.noStroke();
    p.rect(0, barY, W, 32);

    p.fill(50, 60, 95);
    p.rect(10, barY + 4, 60, 22, 4);
    p.fill(200, 215, 245);
    p.textSize(11);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(paused ? '▶ Play' : '⏸ Pause', 40, barY + 15);

    p.fill(100, 115, 140);
    p.textSize(9);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('Photon rate ∝ L  ·  Star size ∝ log(R/R☉)  ·  Colour = blackbody T', W - 10, barY + 15);
  }}

  // ── Mouse ────────────────────────────────────────────────────────────────────
  p.mousePressed = function() {{
    const barY = H - 32;
    if (p.mouseX >= 10 && p.mouseX <= 70 &&
        p.mouseY >= barY + 4 && p.mouseY <= barY + 26) {{
      paused = !paused;
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
    """Entry point — render the full Stellar Evolution simulation page."""
    sim_header("⭐ Stellar Evolution & HR Diagram", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ── Sidebar / left column ─────────────────────────────────────────────────
    with left_col:
        mode = mode_toggle()

        st.markdown("### Stellar Mass")
        st.divider()

        mass_solar = st.slider(
            "Star mass (M / M☉)",
            min_value=0.1,
            max_value=50.0,
            value=1.0,
            step=0.1,
            key="se_mass",
            help="Stellar mass in solar units. Drives L ∝ M³·⁵ and lifetime τ ∝ M⁻²·⁵",
        )

        st.divider()

        st.markdown("### Life Stage")
        stage = st.radio(
            "Evolution stage",
            ["ZAMS", "Red Giant", "End state"],
            key="se_stage",
            help=(
                "ZAMS = Zero Age Main Sequence (hydrogen burning).  "
                "Red Giant = post-main-sequence expansion.  "
                "End state = stellar remnant (white dwarf / neutron star / black hole)."
            ),
        )

        st.divider()

        st.markdown("### Show on HR Diagram")
        show_main        = st.checkbox("Main sequence stars",  value=True,  key="se_show_main")
        show_giants      = st.checkbox("Giants",               value=True,  key="se_show_giant")
        show_supergiants = st.checkbox("Supergiants",          value=True,  key="se_show_sg")
        show_wd          = st.checkbox("White dwarfs",         value=True,  key="se_show_wd")

        if mode == "Advanced":
            advanced_divider()
            st.markdown("**Advanced HR options**")
            show_evtrack = st.checkbox(
                "Highlight evolutionary track",
                value=True,
                key="se_evtrack",
                help="Dotted arrow showing where the selected star moves as it evolves.",
            )
        else:
            show_evtrack = True

    # ── Compute properties for selected mass and stage ────────────────────────
    M = float(mass_solar)

    if stage == "ZAMS":
        sel_T     = ms_temperature(M)
        sel_L     = ms_luminosity(M)
        sel_R     = ms_radius(M)
        stage_key = "ZAMS"
    elif stage == "Red Giant":
        sel_T     = rg_temperature(M)
        sel_L     = rg_luminosity(M)
        sel_R     = rg_radius(M)
        stage_key = "Red Giant"
    else:  # End state
        es        = end_state(M)
        sel_T     = es["T"] if es["T"] > 0 else 1.0
        sel_L     = es["L"] if es["L"] > 0 else 1e-10
        sel_R     = es["R"] if es["R"] > 0 else 1e-5
        stage_key = "End state"

    sel_spec    = spectral_class_from_T(sel_T)
    sel_name    = f"{M:.1f} M☉ ({stage})"
    lifetime_yr = main_sequence_lifetime(M)
    lambda_max  = WIEN_B / sel_T * 1e9   # nm
    sel_L_watts = sel_L * L_SUN

    # ── Right column ──────────────────────────────────────────────────────────
    with right_col:

        # Metrics row
        lifetime_str = f"{lifetime_yr:.2e} yr"
        if stage == "End state":
            es_info = end_state(M)
            region_str = es_info["type"]
        else:
            region_str = hr_region(sel_T, sel_L)

        metric_row({
            "L (L☉)":          f"{sel_L:.3g}",
            "T (K)":           f"{sel_T:,.0f}",
            "R (R☉)":          f"{sel_R:.3g}",
            "Spectral class":  sel_spec,
            "Lifetime (yr)":   lifetime_str,
        })

        if mode == "Advanced":
            st.caption(
                f"HR region: **{region_str}**  ·  "
                f"L = {sel_L_watts:.3e} W  ·  "
                f"λ_max = {lambda_max:.0f} nm"
            )

        st.markdown("")

        # ── p5.js animation ───────────────────────────────────────────────────
        components.html(
            build_stellar_animation(
                T       = float(sel_T),
                L_ratio = float(sel_L),
                R_ratio = float(sel_R),
                stage   = stage_key,
            ),
            height=450,
        )
        st.caption(
            "Photon emission rate ∝ L  ·  Star size ∝ log(R/R☉)  ·  "
            "Colour matches blackbody temperature  ·  Click ⏸ Pause to freeze"
        )

        st.divider()

        # ── HR Diagram ────────────────────────────────────────────────────────
        fig_hr = build_hr_diagram(
            selected_T        = float(sel_T),
            selected_L        = float(sel_L),
            selected_name     = sel_name,
            show_main         = show_main,
            show_giants       = show_giants,
            show_supergiants  = show_supergiants,
            show_wd           = show_wd,
            stage             = stage_key,
            M                 = M,
        )
        st.plotly_chart(fig_hr, use_container_width=True)

        # ── Lifetime plot (Advanced) ──────────────────────────────────────────
        if mode == "Advanced":
            st.divider()
            fig_lt = build_lifetime_plot(M_selected=M)
            st.plotly_chart(fig_lt, use_container_width=True)

        # ── Physics notes ─────────────────────────────────────────────────────
        physics_notes(
            spec_ref=SPEC_REF,
            equations=[
                r"L = 4\pi R^2 \sigma T^4, \quad \sigma = 5.67 \times 10^{-8}\ \text{W m}^{-2}\text{K}^{-4}",
                r"\lambda_{\max} = \frac{2.898 \times 10^{-3}}{T}\ \text{m}",
                r"L \propto M^{3.5}, \quad \tau \propto M^{-2.5}\ \tau_\odot",
            ],
            explanation=(
                "The **Hertzsprung-Russell (HR) diagram** plots stellar luminosity against "
                "surface temperature. Most stars lie along the **main sequence** — a diagonal "
                "band running from hot/bright (top left) to cool/dim (bottom right). Stars spend "
                "most of their lives here burning hydrogen in their cores.\n\n"
                "**Stefan-Boltzmann law** L = 4πR²σT⁴ links luminosity, radius, and temperature. "
                "A small hotter star can have the same luminosity as a large cooler giant.\n\n"
                "**Wien's displacement law** λ_max = b/T tells us the peak wavelength of the "
                "star's emitted radiation and hence its colour — from blue O-type stars (T > 30 000 K) "
                "to red M-type stars (T < 3700 K).\n\n"
                "**Stellar evolution:** a star's lifetime τ ∝ M⁻²·⁵. Massive stars burn "
                "fuel faster (L ∝ M³·⁵) and live far shorter lives. After the main sequence, "
                "stars expand to become red giants before ending as white dwarfs, neutron stars, "
                "or black holes depending on their mass."
            ),
            advanced_text=(
                "**Mass-luminosity relation** L ∝ M³·⁵ arises because more massive stars need "
                "higher core pressure and temperature to maintain hydrostatic equilibrium. "
                "The steep dependence means a 10 M☉ star is ~3000 times more luminous than the Sun.\n\n"
                "**Lifetime scaling:** since the nuclear fuel supply ∝ M, and L ∝ M³·⁵, "
                "lifetime τ ∝ M / L ∝ M⁻²·⁵. A 25 M☉ star lives only ~3 million years; "
                "a 0.1 M☉ red dwarf could burn for trillions of years.\n\n"
                "**HR diagram regions:** the giant branch (cool, luminous) forms when stars "
                "exhaust hydrogen and expand their outer envelopes. Supergiants represent the "
                "most massive evolved stars. White dwarfs (lower left) are Earth-sized, hot "
                "remnants cooling over billions of years.\n\n"
                "**Spectral classes** O B A F G K M (mnemonic: 'Oh Be A Fine Girl/Guy Kiss Me') "
                "reflect surface temperature and show as colour in the HR diagram."
            ),
            mode=mode,
        )

        # ── Exam questions ────────────────────────────────────────────────────
        T_ms        = ms_temperature(M)
        R_ms        = ms_radius(M)
        L_ms        = ms_luminosity(M)
        L_watts     = L_ms * L_SUN
        R_metres    = R_ms * R_SUN
        lam_peak_nm = WIEN_B / T_ms * 1e9
        tau_yr      = main_sequence_lifetime(M)

        questions = [
            {
                "q": (
                    f"A star has surface temperature T = {T_ms:.0f} K and radius "
                    f"R = {R_ms:.2f} R☉.  Calculate its luminosity in watts.  "
                    f"(R☉ = 6.96 × 10⁸ m, σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴)"
                ),
                "marks": 3,
                "answer": f"{L_watts:.3e} W  ({L_ms:.2f} L☉)",
                "working": [
                    f"R = {R_ms:.2f} × 6.96 × 10⁸ = {R_metres:.3e} m",
                    f"L = 4πR²σT⁴ = 4π × ({R_metres:.2e})² × 5.67 × 10⁻⁸ × ({T_ms:.0f})⁴",
                    f"L = {L_watts:.3e} W",
                ],
                "hint": "Use L = 4πR²σT⁴ with SI units throughout.",
            },
            {
                "q": (
                    f"Use Wien's displacement law to find the peak wavelength of light "
                    f"emitted by this star (T = {T_ms:.0f} K)."
                ),
                "marks": 2,
                "answer": f"{lam_peak_nm:.0f} nm",
                "working": [
                    f"λ_max = 2.898 × 10⁻³ / T",
                    f"λ_max = 2.898 × 10⁻³ / {T_ms:.0f} = {WIEN_B / T_ms:.3e} m",
                    f"λ_max = {lam_peak_nm:.0f} nm",
                ],
                "hint": "Wien's law: λ_max T = 2.898 × 10⁻³ m K",
            },
            {
                "q": (
                    f"Estimate the main-sequence lifetime of a star with mass "
                    f"{M:.1f} M☉, given the Sun's lifetime is ~10¹⁰ years."
                ),
                "marks": 3,
                "answer": f"{tau_yr:.2e} years",
                "working": [
                    "L ∝ M³·⁵ so the star burns fuel far faster for larger M",
                    f"Fuel supply ∝ M, so τ ∝ M / L ∝ M / M³·⁵ = M⁻²·⁵",
                    f"τ = τ☉ × (M/M☉)⁻²·⁵ = 10¹⁰ × {M:.1f}⁻²·⁵ = {tau_yr:.2e} years",
                ],
                "hint": "Use τ ∝ M⁻²·⁵ relative to the Sun.",
            },
        ]
        show_exam_panel(questions)


main()
