"""
Young's Modulus & Stress-Strain — WJEC Eduqas A Level Physics.

Interactive simulation of stress-strain behaviour for common engineering
materials.  Visualises elastic/plastic/fracture regions on a live stress-strain
curve and in a p5.js wire animation that stretches and snaps.

Spec reference: Component 1, Topic 3 (Deformation of Solids).
"""

import json

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

# ── Page configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Young's Modulus — WJEC Physics",
    page_icon="🔩",
    layout="wide",
)

# ── Material catalogue ────────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 3 (Deformation of Solids)"

# All stress values in MPa, E in GPa, fracture_strain in fraction (not %)
MATERIALS: dict[str, dict] = {
    "Steel": {
        "E_GPa":          200.0,
        "yield_MPa":      250.0,
        "UTS_MPa":        400.0,
        "fracture_strain": 0.25,    # 25 %
        "brittle":        False,
        "rubber":         False,
        "colour":         "#aaaaaa",
    },
    "Copper": {
        "E_GPa":          120.0,
        "yield_MPa":       70.0,
        "UTS_MPa":        220.0,
        "fracture_strain": 0.40,    # 40 %
        "brittle":        False,
        "rubber":         False,
        "colour":         "#b87333",
    },
    "Aluminium": {
        "E_GPa":           70.0,
        "yield_MPa":      270.0,
        "UTS_MPa":        310.0,
        "fracture_strain": 0.12,    # 12 %
        "brittle":        False,
        "rubber":         False,
        "colour":         "#d4d4d4",
    },
    "Rubber": {
        "E_GPa":            0.01,
        "yield_MPa":       None,
        "UTS_MPa":         16.0,
        "fracture_strain":  5.00,   # 500 %
        "brittle":         False,
        "rubber":          True,
        "colour":          "#333333",
    },
    "Bone": {
        "E_GPa":           17.0,
        "yield_MPa":      100.0,
        "UTS_MPa":        130.0,
        "fracture_strain": 0.02,    # 2 %
        "brittle":        False,
        "rubber":         False,
        "colour":         "#f5f0e8",
    },
    "Glass": {
        "E_GPa":           70.0,
        "yield_MPa":       None,
        "UTS_MPa":         33.0,
        "fracture_strain": 0.001,   # 0.1 %  (brittle)
        "brittle":         True,
        "rubber":          False,
        "colour":          "#aaddff",
    },
}

# Plotting colours for the comparison chart (one per material)
MATERIAL_PLOT_COLOURS = {
    "Steel":      "#aaaaaa",
    "Copper":     "#cd7f32",
    "Aluminium":  "#7ec8e3",
    "Rubber":     "#88cc44",
    "Bone":       "#f5deb3",
    "Glass":      "#99ccff",
}

# ── Stress-strain curve builders ──────────────────────────────────────────────


def _elastic_strain(mat: dict) -> float:
    """Return the strain at the elastic limit (= yield point if defined)."""
    if mat["yield_MPa"] is not None:
        return mat["yield_MPa"] / (mat["E_GPa"] * 1e3)
    # Brittle / rubber: elastic up to UTS
    return mat["UTS_MPa"] / (mat["E_GPa"] * 1e3)


def stress_strain_curve(
    mat: dict,
    n_points: int = 500,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Return (strain, stress_MPa, region_labels) arrays for a material.

    region_labels is an integer array: 0=elastic, 1=plastic, 2=fractured.
    Rubber uses a J-curve (neo-Hookean-inspired), others use a linear-then-
    parabolic model that peaks at UTS and drops to fracture.

    Returns
    -------
    strain       : dimensionless strain array
    stress_MPa   : stress in MPa
    region_int   : 0=elastic, 1=plastic (or necking), 2=post-UTS/fracture
    """
    eps_y = _elastic_strain(mat)   # elastic limit strain
    eps_f = mat["fracture_strain"]
    E_MPa = mat["E_GPa"] * 1e3    # GPa → MPa
    uts   = mat["UTS_MPa"]

    if mat["rubber"]:
        # J-curve: σ ≈ E·ε for small ε, stiffens at large ε
        strain = np.linspace(0, eps_f, n_points)
        # neo-Hookean inspired: σ = E*(ε + ε³/3 + ε⁵/5) scaled to UTS at eps_f
        raw = strain + strain**3 / 3.0 + strain**5 / 5.0
        raw_max = eps_f + eps_f**3 / 3.0 + eps_f**5 / 5.0
        stress_MPa = uts * raw / raw_max
        region_int = np.zeros(n_points, dtype=int)  # all "elastic" for rubber
        return strain, stress_MPa, region_int

    if mat["brittle"]:
        # Perfectly linear up to fracture (no plastic region)
        strain = np.linspace(0, eps_f, n_points)
        stress_MPa = E_MPa * strain
        # Cap at UTS
        stress_MPa = np.minimum(stress_MPa, uts)
        region_int = np.zeros(n_points, dtype=int)
        return strain, stress_MPa, region_int

    # Ductile materials: three regions
    # 1. Elastic: linear 0 → eps_y
    # 2. Plastic / strain hardening: parabolic eps_y → eps_UTS, peaking at UTS
    # 3. Necking / fracture: drops from UTS down to ~0.6×UTS at eps_f

    sigma_y = mat["yield_MPa"]

    # Find eps_UTS: the point where stress peaks (UTS)
    # Use eps_UTS = eps_y + (eps_f - eps_y) * 0.5  (midpoint in plastic zone)
    eps_UTS = eps_y + (eps_f - eps_y) * 0.5

    n_elastic = max(2, int(n_points * (eps_y / eps_f)))
    n_plastic = max(2, int(n_points * ((eps_UTS - eps_y) / eps_f)))
    n_neck    = max(2, n_points - n_elastic - n_plastic)

    # Elastic segment
    s_elastic = np.linspace(0, eps_y, n_elastic)
    sig_elastic = E_MPa * s_elastic

    # Plastic segment: parabola from (eps_y, sigma_y) → (eps_UTS, UTS)
    s_plastic = np.linspace(eps_y, eps_UTS, n_plastic)
    # Fit: σ = a*(ε - eps_UTS)² + UTS, with σ(eps_y) = sigma_y
    a_coeff = (sigma_y - uts) / (eps_y - eps_UTS) ** 2
    sig_plastic = a_coeff * (s_plastic - eps_UTS) ** 2 + uts

    # Necking/fracture segment: drops from UTS → ~0 at eps_f
    s_neck = np.linspace(eps_UTS, eps_f, n_neck)
    frac_stress = uts * 0.05   # stress at fracture point (visible drop)
    sig_neck = uts + (frac_stress - uts) * ((s_neck - eps_UTS) / (eps_f - eps_UTS)) ** 0.5

    strain     = np.concatenate([s_elastic, s_plastic, s_neck])
    stress_MPa = np.concatenate([sig_elastic, sig_plastic, sig_neck])

    region_int = np.concatenate([
        np.zeros(n_elastic, dtype=int),
        np.ones(n_plastic, dtype=int),
        np.full(n_neck, 2, dtype=int),
    ])

    return strain, stress_MPa, region_int


@st.cache_data
def get_curve(material_name: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cached wrapper around stress_strain_curve."""
    return stress_strain_curve(MATERIALS[material_name])


# ── Physics helpers ───────────────────────────────────────────────────────────


def compute_current_point(
    mat: dict,
    F_N: float,
    A_m2: float,
    L0_m: float,
) -> dict:
    """
    Return a dict of all derived quantities given inputs.

    Keys: sigma_Pa, sigma_MPa, epsilon, delta_L_m, delta_L_mm,
          E_GPa, region, k_Nm
    """
    sigma_Pa  = F_N / A_m2 if A_m2 > 0 else 0.0
    sigma_MPa = sigma_Pa / 1e6
    E_Pa      = mat["E_GPa"] * 1e9

    # Determine which region we are in
    eps_y    = _elastic_strain(mat)
    eps_UTS  = eps_y + (mat["fracture_strain"] - eps_y) * 0.5
    eps_f    = mat["fracture_strain"]

    if mat["rubber"]:
        # For rubber, compute strain from the J-curve (invert numerically)
        strain_arr, stress_arr, _ = stress_strain_curve(mat)
        epsilon = float(np.interp(min(sigma_MPa, mat["UTS_MPa"]), stress_arr, strain_arr))
        region = "Elastic" if sigma_MPa < mat["UTS_MPa"] else "Failed"
    elif mat["brittle"]:
        epsilon = sigma_Pa / E_Pa
        uts = mat["UTS_MPa"]
        region = "Failed" if sigma_MPa >= uts else "Elastic"
    else:
        # In elastic region: Hooke's law gives strain
        sigma_y = mat["yield_MPa"]
        uts     = mat["UTS_MPa"]
        if sigma_MPa <= sigma_y:
            epsilon = sigma_Pa / E_Pa
            region  = "Elastic"
        elif sigma_MPa <= uts:
            # In plastic region: use the parabolic inverse
            a_coeff = (sigma_y - uts) / (eps_y - eps_UTS) ** 2
            # sigma = a*(eps - eps_UTS)^2 + uts  →  eps = eps_UTS ± sqrt((sigma-uts)/a)
            disc = (sigma_MPa - uts) / a_coeff
            if disc >= 0:
                epsilon = eps_UTS - np.sqrt(disc)  # left branch (before peak)
            else:
                epsilon = eps_UTS
            epsilon = float(np.clip(epsilon, eps_y, eps_UTS))
            region  = "Plastic"
        else:
            epsilon = eps_f
            region  = "Failed"

    delta_L_m   = epsilon * L0_m
    delta_L_mm  = delta_L_m * 1000.0
    k_Nm        = (E_Pa * A_m2) / L0_m if L0_m > 0 else 0.0

    return {
        "sigma_Pa":   sigma_Pa,
        "sigma_MPa":  sigma_MPa,
        "epsilon":    epsilon,
        "delta_L_m":  delta_L_m,
        "delta_L_mm": delta_L_mm,
        "E_GPa":      mat["E_GPa"],
        "region":     region,
        "k_Nm":       k_Nm,
    }


# ── Plotly figure builders ────────────────────────────────────────────────────


def build_stress_strain_figure(
    material_name: str,
    current_sigma: float,
    current_epsilon: float,
    mode: str = "Basic",
    show_hysteresis: bool = False,
) -> go.Figure:
    """
    Build the stress-strain plot for a single material.

    The figure shows:
    - Elastic region (blue line), plastic region (orange line),
      necking/fracture region (red line).
    - Annotated key points: elastic limit, UTS, fracture.
    - A moving dot at the current stress/strain.
    - Advanced: loading + unloading hysteresis loop.

    Parameters
    ----------
    material_name   : key in MATERIALS dict
    current_sigma   : current stress (MPa)
    current_epsilon : current strain (dimensionless)
    mode            : 'Basic' or 'Advanced'
    show_hysteresis : if True (Advanced), overlay a hysteresis loop
    """
    mat = MATERIALS[material_name]
    strain, stress_MPa, region_int = get_curve(material_name)

    fig = go.Figure()

    # Split into segments by region
    for seg_id, seg_colour, seg_name in [
        (0, COLOURS["primary"],   "Elastic"),
        (1, COLOURS["secondary"], "Plastic / Strain-hardening"),
        (2, COLOURS["highlight"], "Necking / Fracture"),
    ]:
        mask = region_int == seg_id
        if not np.any(mask):
            continue
        fig.add_trace(go.Scatter(
            x=strain[mask] * 100,   # → %
            y=stress_MPa[mask],
            mode="lines",
            name=seg_name,
            line=dict(color=seg_colour, width=2.5),
        ))

    # Key point annotations
    eps_y   = _elastic_strain(mat)
    eps_UTS = eps_y + (mat["fracture_strain"] - eps_y) * 0.5
    eps_f   = mat["fracture_strain"]
    uts     = mat["UTS_MPa"]

    markers_x = []
    markers_y = []
    markers_text = []

    if mat["yield_MPa"] is not None:
        markers_x.append(eps_y * 100)
        markers_y.append(mat["yield_MPa"])
        markers_text.append("Elastic limit / Yield point")

    if not mat["brittle"] and not mat["rubber"]:
        markers_x.append(eps_UTS * 100)
        markers_y.append(uts)
        markers_text.append("UTS")

    markers_x.append(eps_f * 100)
    # stress at fracture
    frac_stress_val = uts * 0.05 if (not mat["brittle"] and not mat["rubber"]) else uts
    markers_y.append(frac_stress_val)
    markers_text.append("Fracture")

    if markers_x:
        fig.add_trace(go.Scatter(
            x=markers_x,
            y=markers_y,
            mode="markers+text",
            name="Key points",
            marker=dict(color="white", size=10, symbol="diamond"),
            text=markers_text,
            textposition="top right",
            textfont=dict(size=10, color="white"),
            showlegend=True,
        ))

    # Advanced hysteresis loop
    if mode == "Advanced" and show_hysteresis and not mat["brittle"] and not mat["rubber"]:
        # Simple Bauschinger-inspired: unload with slope E from a point mid-plastic
        eps_load_end = min(current_epsilon, eps_UTS)
        if eps_load_end > eps_y:
            sig_at_end = float(np.interp(eps_load_end, strain, stress_MPa))
            E_MPa = mat["E_GPa"] * 1e3
            eps_unload_zero = eps_load_end - sig_at_end / E_MPa
            hys_eps = np.array([0, eps_y, eps_load_end, eps_unload_zero])
            hys_sig = np.array([0, mat["yield_MPa"], sig_at_end, 0.0])
            fig.add_trace(go.Scatter(
                x=hys_eps * 100,
                y=hys_sig,
                mode="lines",
                name="Unloading path",
                line=dict(color=COLOURS["advanced"], width=1.5, dash="dash"),
            ))
            # Fill the hysteresis loop area
            fig.add_trace(go.Scatter(
                x=np.concatenate([
                    strain[(strain >= 0) & (strain <= eps_load_end)] * 100,
                    [eps_unload_zero * 100, 0],
                ]),
                y=np.concatenate([
                    stress_MPa[(strain >= 0) & (strain <= eps_load_end)],
                    [0.0, 0.0],
                ]),
                fill="toself",
                fillcolor="rgba(155,89,182,0.15)",
                line=dict(color="rgba(0,0,0,0)"),
                name="Hysteresis area (energy lost)",
                showlegend=True,
            ))

    # Current operating point
    fig.add_trace(go.Scatter(
        x=[current_epsilon * 100],
        y=[current_sigma],
        mode="markers",
        name="Current state",
        marker=dict(
            color=COLOURS["highlight"],
            size=14,
            symbol="circle",
            line=dict(color="white", width=2),
        ),
    ))

    # X-axis limit: show at least up to fracture, plus 10 % headroom
    x_max = eps_f * 100 * 1.1
    y_max = uts * 1.15

    fig.update_layout(
        **plotly_layout(
            title=dict(text=f"Stress–Strain Curve — {material_name}", font=dict(size=14)),
            xaxis=dict(
                title="Strain ε (%)",
                range=[0, x_max],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Stress σ (MPa)",
                range=[0, y_max],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            height=380,
            legend=dict(x=0.65, y=0.98, font=dict(size=10)),
        )
    )

    return fig


def build_comparison_figure(
    material_names: list[str],
    current_material: str,
    current_sigma: float,
    current_epsilon: float,
) -> go.Figure:
    """
    Build an overlay stress-strain comparison chart for multiple materials.

    Parameters
    ----------
    material_names   : list of material names to plot
    current_material : name of currently selected material (highlighted)
    current_sigma    : current stress (MPa) for moving dot
    current_epsilon  : current strain (dimensionless)
    """
    fig = go.Figure()

    for name in material_names:
        mat = MATERIALS[name]
        strain, stress_MPa, _ = get_curve(name)
        colour = MATERIAL_PLOT_COLOURS[name]
        lw = 3.0 if name == current_material else 1.5
        opacity = 1.0 if name == current_material else 0.6

        fig.add_trace(go.Scatter(
            x=strain * 100,
            y=stress_MPa,
            mode="lines",
            name=name,
            line=dict(color=colour, width=lw),
            opacity=opacity,
        ))

    # Current state dot on the selected material
    fig.add_trace(go.Scatter(
        x=[current_epsilon * 100],
        y=[current_sigma],
        mode="markers",
        name=f"{current_material} — current",
        marker=dict(
            color=COLOURS["highlight"],
            size=12,
            symbol="circle",
            line=dict(color="white", width=2),
        ),
    ))

    # X axis: clamp to Steel fracture (25 %) for readability; rubber is huge
    x_max = 30.0
    y_max = max(MATERIALS[m]["UTS_MPa"] for m in material_names) * 1.15

    fig.update_layout(
        **plotly_layout(
            title=dict(text="Material Comparison — Stress–Strain", font=dict(size=14)),
            xaxis=dict(
                title="Strain ε (%)",
                range=[0, x_max],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Stress σ (MPa)",
                range=[0, y_max],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            height=380,
            legend=dict(x=0.75, y=0.98, font=dict(size=10)),
        )
    )

    return fig


# ── p5.js wire animation ──────────────────────────────────────────────────────


def build_wire_animation(
    strain: float,
    region: str,
    material_name: str,
    force_N: float,
) -> str:
    """
    Build a complete p5.js wire-stretching animation as an HTML string.

    The wire is drawn from a fixed left wall to a hanging weight on the right.
    Visual effects encode the deformation region:
    - Elastic : wire is silver/grey, uniform thickness
    - Plastic  : wire turns orange, visible necking at centre
    - Failed   : wire turns red, snaps with flash, two broken ends separate

    Parameters
    ----------
    strain        : current engineering strain (dimensionless, clamped 0–fracture)
    region        : 'Elastic', 'Plastic', or 'Failed'
    material_name : display name for the label
    force_N       : applied force in Newtons

    Returns
    -------
    str : full HTML document embedding the p5.js sketch
    """
    mat = MATERIALS[material_name]
    eps_f = mat["fracture_strain"]
    mat_colour = mat["colour"]

    data = json.dumps({
        "strain":        float(strain),
        "eps_f":         float(eps_f),
        "region":        region,
        "material":      material_name,
        "mat_colour":    mat_colour,
        "force_N":       float(force_N),
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
  const W = 700, H = 440;

  // Wire geometry at zero strain
  const WALL_X   = 80;
  const WIRE_Y   = 180;
  const WIRE_L0  = 360;   // pixel length at zero strain
  const WIRE_H0  = 18;    // half-thickness of wire at zero strain (pixels)

  // Weight block dimensions
  const BLK_W = 60, BLK_H = 80;

  // Animation state
  let flashTimer  = 0;
  let separating  = false;
  let sepOffset   = 0;
  let paused      = false;
  let autoForce   = 0;       // 0→1 fraction for play mode
  let playing     = false;
  let btnPlay;

  // Highlight colour components (declared early to avoid TDZ errors)
  const COLOURS_HIGHLIGHT_R = 231;
  const COLOURS_HIGHLIGHT_G = 76;
  const COLOURS_HIGHLIGHT_B = 60;

  // Derived from data
  const strain   = D.strain;
  const eps_f    = D.eps_f;
  const region   = D.region;
  const matName  = D.material;
  const force_N  = D.force_N;

  // Wire colour based on region
  function wireColour() {{
    if (region === 'Failed')  return p.color(220, 50, 50);
    if (region === 'Plastic') return p.color(230, 140, 40);
    // Parse hex mat colour or default silver
    return p.color(180, 180, 185);
  }}

  // Neck factor: 1=no necking, <1 = narrowed (only in Plastic/Failed)
  function neckFactor() {{
    if (region === 'Elastic') return 1.0;
    // Normalise plastic progress 0→1
    let eps_y_approx = eps_f * 0.3;
    let t = p.constrain((strain - eps_y_approx) / (eps_f - eps_y_approx), 0, 1);
    return 1.0 - 0.55 * t;   // neck down to 45 % of original radius
  }}

  p.setup = function() {{
    p.createCanvas(W, H);
    p.textFont('monospace');

    btnPlay = p.createButton('▶ Auto-stretch');
    btnPlay.position(10, H - 36);
    btnPlay.style('background', '#1f2937');
    btnPlay.style('color', '#fafafa');
    btnPlay.style('border', '1px solid #374151');
    btnPlay.style('padding', '4px 10px');
    btnPlay.style('cursor', 'pointer');
    btnPlay.style('font-family', 'monospace');
    btnPlay.mousePressed(function() {{
      playing = !playing;
      btnPlay.html(playing ? '⏸ Pause' : '▶ Auto-stretch');
    }});
  }};

  p.draw = function() {{
    p.background(14, 17, 23);

    // ── Compute stretched wire geometry ─────────────────────────────────────
    let wireLen  = WIRE_L0 * (1 + strain);
    let wireEnd  = WALL_X + wireLen;
    let neckF    = neckFactor();
    let wHalf    = WIRE_H0 * neckF;       // half-height at narrowest (centre)
    let wHalf0   = WIRE_H0;               // half-height at ends (full)

    // ── Draw fixed wall ──────────────────────────────────────────────────────
    p.fill(90, 90, 100);
    p.noStroke();
    p.rect(0, WIRE_Y - 60, WALL_X, 120, 0, 6, 6, 0);
    // Hatching
    p.stroke(60, 60, 70);
    p.strokeWeight(1);
    for (let y = WIRE_Y - 55; y < WIRE_Y + 60; y += 12) {{
      p.line(0, y, WALL_X - 2, y - 12);
    }}

    // ── Flash on fracture ────────────────────────────────────────────────────
    if (region === 'Failed' && flashTimer > 0) {{
      let alpha = p.map(flashTimer, 0, 20, 0, 200);
      p.fill(255, 255, 200, alpha);
      p.noStroke();
      let fx = WALL_X + wireLen * 0.5;
      p.ellipse(fx, WIRE_Y, 80, 60);
      flashTimer--;
    }}

    // ── Draw wire ────────────────────────────────────────────────────────────
    let wc = wireColour();
    p.noStroke();

    if (region !== 'Failed') {{
      // Draw wire as a tapered quad (wider at ends, narrow in middle)
      let midX = WALL_X + wireLen * 0.5;
      // Left half
      p.beginShape();
      p.fill(wc);
      p.vertex(WALL_X,  WIRE_Y - wHalf0);
      p.vertex(midX,    WIRE_Y - wHalf);
      p.vertex(midX,    WIRE_Y + wHalf);
      p.vertex(WALL_X,  WIRE_Y + wHalf0);
      p.endShape(p.CLOSE);
      // Right half
      p.beginShape();
      p.fill(wc);
      p.vertex(midX,    WIRE_Y - wHalf);
      p.vertex(wireEnd, WIRE_Y - wHalf0);
      p.vertex(wireEnd, WIRE_Y + wHalf0);
      p.vertex(midX,    WIRE_Y + wHalf);
      p.endShape(p.CLOSE);

      // Highlight sheen on top surface
      p.fill(255, 255, 255, 40);
      p.beginShape();
      p.vertex(WALL_X,  WIRE_Y - wHalf0);
      p.vertex(midX,    WIRE_Y - wHalf);
      p.vertex(midX,    WIRE_Y - wHalf * 0.4);
      p.vertex(WALL_X,  WIRE_Y - wHalf0 * 0.4);
      p.endShape(p.CLOSE);
      p.beginShape();
      p.vertex(midX,    WIRE_Y - wHalf);
      p.vertex(wireEnd, WIRE_Y - wHalf0);
      p.vertex(wireEnd, WIRE_Y - wHalf0 * 0.4);
      p.vertex(midX,    WIRE_Y - wHalf * 0.4);
      p.endShape(p.CLOSE);

      // Stress lines in plastic region
      if (region === 'Plastic' || region === 'Failed') {{
        p.stroke(255, 100, 0, 80);
        p.strokeWeight(1);
        let nLines = 6;
        for (let i = 1; i < nLines; i++) {{
          let lx = WALL_X + wireLen * i / nLines;
          let halfH = (i < nLines/2)
            ? p.map(lx, WALL_X, midX, wHalf0, wHalf)
            : p.map(lx, midX, wireEnd, wHalf, wHalf0);
          p.line(lx, WIRE_Y - halfH, lx, WIRE_Y + halfH);
        }}
        p.noStroke();
      }}

    }} else {{
      // FAILED — two separated halves
      let breakX = WALL_X + wireLen * 0.5;
      let gap = sepOffset;
      // Left fragment
      p.fill(wc);
      p.beginShape();
      p.vertex(WALL_X,       WIRE_Y - wHalf0);
      p.vertex(breakX - gap, WIRE_Y - wHalf * 1.4);
      p.vertex(breakX - gap, WIRE_Y + wHalf * 1.4);
      p.vertex(WALL_X,       WIRE_Y + wHalf0);
      p.endShape(p.CLOSE);
      // Right fragment (droops slightly)
      let droop = gap * 0.6;
      p.beginShape();
      p.vertex(breakX + gap, WIRE_Y - wHalf * 1.4 + droop);
      p.vertex(wireEnd,      WIRE_Y - wHalf0 * 0.7 + droop);
      p.vertex(wireEnd,      WIRE_Y + wHalf0 * 0.7 + droop);
      p.vertex(breakX + gap, WIRE_Y + wHalf * 1.4 + droop);
      p.endShape(p.CLOSE);

      // Jagged fracture surface marks
      p.stroke(255, 200, 200, 180);
      p.strokeWeight(1.5);
      for (let k = -2; k <= 2; k++) {{
        p.line(breakX - gap - 4, WIRE_Y + k * 4,
               breakX - gap + 4, WIRE_Y + k * 4 + 3);
        p.line(breakX + gap - 4, WIRE_Y + k * 4 + droop,
               breakX + gap + 4, WIRE_Y + k * 4 + 3 + droop);
      }}
      p.noStroke();

      if (sepOffset < 30) sepOffset += 1.2;
      if (flashTimer === 0 && sepOffset < 2) flashTimer = 20;
    }}

    // ── Weight block ─────────────────────────────────────────────────────────
    if (region !== 'Failed') {{
      let bx = wireEnd;
      let by = WIRE_Y;
      // Chain links
      p.stroke(140, 140, 150);
      p.strokeWeight(2);
      p.noFill();
      for (let cy = by + wHalf0; cy < by + wHalf0 + 20; cy += 8) {{
        p.ellipse(bx, cy, 10, 6);
      }}
      p.noStroke();

      // Block shadow
      p.fill(0, 0, 0, 80);
      p.rect(bx - BLK_W/2 + 4, by + wHalf0 + 20 + 4, BLK_W, BLK_H, 4);
      // Block body (brightness scales with force)
      let bright = p.map(force_N, 0, 10000, 60, 140);
      p.fill(bright, bright + 10, bright + 20);
      p.rect(bx - BLK_W/2, by + wHalf0 + 20, BLK_W, BLK_H, 4);
      // Block highlight
      p.fill(255, 255, 255, 30);
      p.rect(bx - BLK_W/2 + 3, by + wHalf0 + 22, BLK_W - 6, 12, 3);
      // Force label on block
      p.fill(220, 220, 220);
      p.noStroke();
      p.textSize(11);
      p.textAlign(p.CENTER);
      let fStr = force_N < 1000
        ? force_N.toFixed(0) + ' N'
        : (force_N/1000).toFixed(1) + ' kN';
      p.text(fStr, bx, by + wHalf0 + 20 + BLK_H/2 + 4);

      // Gravity arrow
      p.stroke(200, 200, 200, 150);
      p.strokeWeight(1.5);
      p.line(bx, by + wHalf0 + 20 + BLK_H, bx, by + wHalf0 + 20 + BLK_H + 25);
      p.fill(200, 200, 200, 150);
      p.noStroke();
      p.triangle(bx - 5, by + wHalf0 + 20 + BLK_H + 22,
                 bx + 5, by + wHalf0 + 20 + BLK_H + 22,
                 bx,     by + wHalf0 + 20 + BLK_H + 32);
    }}

    // ── Extension arrow + label ──────────────────────────────────────────────
    if (strain > 0.001 && region !== 'Failed') {{
      let arrY = WIRE_Y + WIRE_H0 + 30;
      let extPx = WIRE_L0 * strain;
      let origEnd = WALL_X + WIRE_L0;

      // Arrow
      p.stroke(COLOURS_HIGHLIGHT_R, COLOURS_HIGHLIGHT_G, COLOURS_HIGHLIGHT_B, 200);
      p.strokeWeight(1.5);
      p.line(origEnd, arrY, origEnd + extPx, arrY);
      // Left tick
      p.line(origEnd,          arrY - 5, origEnd,          arrY + 5);
      // Right tick
      p.line(origEnd + extPx,  arrY - 5, origEnd + extPx,  arrY + 5);
      // Label
      p.noStroke();
      p.fill(255, 200, 100);
      p.textSize(11);
      p.textAlign(p.CENTER);
      p.text('ΔL', origEnd + extPx / 2, arrY - 8);
    }}

    // ── Region badge ─────────────────────────────────────────────────────────
    let badgeCol;
    if (region === 'Elastic')  badgeCol = p.color(34, 197, 94);
    else if (region === 'Plastic') badgeCol = p.color(251, 146, 60);
    else badgeCol = p.color(239, 68, 68);

    p.fill(0, 0, 0, 150);
    p.noStroke();
    p.rect(10, 10, 150, 28, 5);
    p.fill(badgeCol);
    p.textSize(13);
    p.textAlign(p.LEFT);
    p.text('⬤ ' + region, 18, 28);

    // ── Material label ───────────────────────────────────────────────────────
    p.fill(200, 200, 210);
    p.textSize(12);
    p.textAlign(p.RIGHT);
    p.text('Material: ' + matName, W - 12, 24);

    // ── Strain readout ───────────────────────────────────────────────────────
    p.fill(180, 180, 200);
    p.textSize(11);
    p.textAlign(p.RIGHT);
    p.text('ε = ' + (strain * 100).toFixed(3) + ' %', W - 12, 42);
  }};

}});
</script>
</body>
</html>"""


# ── Sidebar ───────────────────────────────────────────────────────────────────


def render_sidebar() -> dict:
    """
    Render all sidebar controls and return a params dict.

    Returns
    -------
    dict with keys: material, A_mm2, L0_m, F_N, mode, show_hysteresis,
                    compare_materials
    """
    st.sidebar.header("⚙️ Controls")

    mode = mode_toggle()

    st.sidebar.divider()

    material = st.sidebar.selectbox(
        "Material",
        list(MATERIALS.keys()),
        index=0,
        help="Select a material to see its characteristic stress-strain curve.",
    )

    st.sidebar.divider()
    st.sidebar.subheader("Wire / Rod parameters")

    A_mm2 = st.sidebar.slider(
        "Cross-section area A (mm²)",
        min_value=0.1,
        max_value=5.0,
        value=1.0,
        step=0.1,
        help="Cross-sectional area of the wire or rod.",
    )

    L0_m = st.sidebar.slider(
        "Original length L₀ (m)",
        min_value=0.1,
        max_value=2.0,
        value=1.0,
        step=0.05,
        help="Unstretched length of the sample.",
    )

    F_max = 10000
    F_N = st.sidebar.slider(
        "Applied force F (N)",
        min_value=0,
        max_value=F_max,
        value=0,
        step=50,
        help="Tensile force applied to the sample.",
    )

    params: dict = {
        "material":    material,
        "A_mm2":       A_mm2,
        "L0_m":        L0_m,
        "F_N":         float(F_N),
        "mode":        mode,
        "show_hysteresis":  False,
        "compare_materials": list(MATERIALS.keys()),
    }

    if mode == "Advanced":
        advanced_divider()
        params["show_hysteresis"] = st.sidebar.checkbox(
            "Show hysteresis loop",
            value=False,
            help="Display the loading/unloading hysteresis loop (energy lost to plastic deformation).",
        )
        params["compare_materials"] = st.sidebar.multiselect(
            "Materials to compare",
            list(MATERIALS.keys()),
            default=list(MATERIALS.keys()),
            help="Select which materials to include in the comparison chart.",
        )

    return params


# ── Main layout ───────────────────────────────────────────────────────────────


def main() -> None:
    sim_header(
        title="Young's Modulus & Stress-Strain",
        spec_ref=SPEC_REF,
    )

    params = render_sidebar()

    material_name = params["material"]
    mat           = MATERIALS[material_name]
    A_m2          = params["A_mm2"] * 1e-6    # mm² → m²
    L0_m          = params["L0_m"]
    F_N           = params["F_N"]
    mode          = params["mode"]

    # Compute derived quantities
    pt = compute_current_point(mat, F_N, A_m2, L0_m)

    # ── Layout: left (notes + metrics) | right (animation + charts) ──────────
    left_col, right_col = two_column_layout(left_weight=3, right_weight=7)

    # ── LEFT COLUMN ───────────────────────────────────────────────────────────
    with left_col:
        # Physics notes
        physics_notes(
            spec_ref=(
                "Component 1, Topic 3: Deformation of Solids — "
                "stress, strain and Young's modulus"
            ),
            equations=[
                r"\sigma = \frac{F}{A} \quad \text{(Pa)}",
                r"\varepsilon = \frac{\Delta L}{L_0} \quad \text{(dimensionless)}",
                r"E = \frac{\sigma}{\varepsilon} = \frac{FL_0}{A \,\Delta L} \quad \text{(Pa)}",
                r"k = \frac{EA}{L_0} \quad \text{(N m}^{-1}\text{)}",
            ],
            explanation=(
                "Young's modulus E measures a material's stiffness — how much "
                "stress is needed to produce a given strain in the elastic region. "
                "Below the elastic limit the material obeys Hooke's law and returns "
                "to its original shape when the load is removed. Beyond the yield "
                "point permanent (plastic) deformation occurs. The UTS is the "
                "maximum stress the material can withstand before necking leads to "
                "fracture."
            ),
            advanced_text=(
                "The area under the elastic portion of the stress-strain curve is "
                "the modulus of resilience (energy stored elastically per unit "
                "volume). The total area up to fracture is the modulus of toughness. "
                "The hysteresis loop shows energy dissipated as heat during a "
                "loading-unloading cycle in the plastic region (Bauschinger effect). "
                "Rubber's J-shaped curve arises from entropy-elastic (entropic) "
                "mechanisms in the polymer chains."
            ),
            mode=mode,
        )

        st.divider()

        # Status badge
        region = pt["region"]
        badge_colours = {
            "Elastic": "#16a34a",
            "Plastic": "#d97706",
            "Failed":  "#dc2626",
        }
        badge_hex = badge_colours.get(region, "#6b7280")
        st.markdown(
            f"<div style='background:{badge_hex};padding:6px 12px;"
            f"border-radius:6px;font-weight:600;font-size:0.9rem;"
            f"text-align:center;margin-bottom:8px'>"
            f"{region}</div>",
            unsafe_allow_html=True,
        )

        # Key metrics
        metric_row({
            "σ (MPa)": f"{pt['sigma_MPa']:.2f}",
            "ε (%)":   f"{pt['epsilon'] * 100:.4f}",
        })
        metric_row({
            "ΔL (mm)":  f"{pt['delta_L_mm']:.3f}",
            "E (GPa)":  f"{pt['E_GPa']:.1f}",
        })
        metric_row({
            "k (kN/m)": f"{pt['k_Nm'] / 1000:.2f}",
            "F (N)":    f"{F_N:.0f}",
        })

        # Material properties summary
        st.divider()
        st.subheader("Material data")
        st.markdown(f"**{material_name}**")
        col_a, col_b = st.columns(2)
        col_a.metric("E", f"{mat['E_GPa']} GPa")
        col_b.metric("UTS", f"{mat['UTS_MPa']} MPa")
        y_val = f"{mat['yield_MPa']} MPa" if mat['yield_MPa'] is not None else "—"
        col_a.metric("Yield stress", y_val)
        col_b.metric("Fracture strain", f"{mat['fracture_strain'] * 100:.1f} %")

    # ── RIGHT COLUMN ──────────────────────────────────────────────────────────
    with right_col:

        # ── p5.js wire animation ─────────────────────────────────────────────
        anim_strain = float(np.clip(pt["epsilon"], 0, mat["fracture_strain"]))
        components.html(
            build_wire_animation(anim_strain, region, material_name, F_N),
            height=440,
        )
        st.caption(
            "Wire stretches as force increases · Colour indicates deformation region · "
            "▶ Auto-stretch button animates gradually increasing force"
        )
        st.divider()

        # ── Stress-strain chart ──────────────────────────────────────────────
        fig_ss = build_stress_strain_figure(
            material_name=material_name,
            current_sigma=pt["sigma_MPa"],
            current_epsilon=pt["epsilon"],
            mode=mode,
            show_hysteresis=params["show_hysteresis"],
        )
        st.plotly_chart(fig_ss, use_container_width=True)

        # ── Advanced: material comparison ────────────────────────────────────
        if mode == "Advanced":
            advanced_divider()
            st.subheader("Material Comparison")

            compare_list = params.get("compare_materials", list(MATERIALS.keys()))
            if len(compare_list) < 1:
                st.info("Select at least one material in the sidebar to compare.")
            else:
                if material_name not in compare_list:
                    compare_list = [material_name] + compare_list

                fig_cmp = build_comparison_figure(
                    material_names=compare_list,
                    current_material=material_name,
                    current_sigma=pt["sigma_MPa"],
                    current_epsilon=pt["epsilon"],
                )
                st.plotly_chart(fig_cmp, use_container_width=True)
                st.caption(
                    "Note: X-axis capped at 30 % strain for readability. "
                    "Rubber's full fracture strain is 500 % — far off the right edge."
                )

            # Spring constant comparison table
            st.subheader("Spring constants k = EA/L₀")
            k_data = []
            for mname, mdata in MATERIALS.items():
                k = (mdata["E_GPa"] * 1e9 * A_m2) / L0_m
                k_data.append({
                    "Material": mname,
                    "E (GPa)": mdata["E_GPa"],
                    "k (kN/m)": round(k / 1000, 1),
                })
            st.dataframe(
                k_data,
                use_container_width=True,
                hide_index=True,
            )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__" or True:
    main()
