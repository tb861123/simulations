"""
Projectile Motion — WJEC Eduqas A Level Physics
Component 1, Topic 2 (Kinematics), sections (f) and (g)

Covers:
  Basic  : analytical trajectory, range, max height, velocity components.
  Advanced: quadratic air drag (RK4 integration), Magnus effect (topspin/
            backspin), terminal velocity, real-world object presets.
"""

import json
import numpy as np
import streamlit as st
import streamlit.components.v1 as components

from utils.style import COLOURS, make_fig
from utils.physics import g, rk4_integrate
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
    page_title="Projectile Motion — WJEC Physics",
    page_icon="🎯",
    layout="wide",
)

# ── Physical constants (SI) ───────────────────────────────────────────────────

RHO_AIR: float = 1.225          # kg m⁻³  density of air at sea level, 15 °C
CL_MAGNUS: float = 0.5          # dimensionless  Magnus lift coefficient
N_TRAJ_POINTS: int = 500        # number of points along the analytical trajectory
DT_RK4: float = 0.005           # s  RK4 integration time step
MARKER_INTERVAL: float = 0.5    # s  interval between time markers on trajectory

# ── Real-world object presets ─────────────────────────────────────────────────

PRESETS: dict[str, dict] = {
    "Custom":      {},
    "Football":    {"mass": 0.43,  "area": 0.038,    "cd": 0.47},
    "Golf ball":   {"mass": 0.046, "area": 0.00143,  "cd": 0.47},
    "Cannonball":  {"mass": 5.0,   "area": 0.0177,   "cd": 0.47},
    "Basketball":  {"mass": 0.62,  "area": 0.0452,   "cd": 0.47},
    "Tennis ball": {"mass": 0.057, "area": 0.00346,  "cd": 0.55},
    "Javelin":     {"mass": 0.8,   "area": 0.004,    "cd": 0.4},
    "Shuttlecock": {"mass": 0.005, "area": 0.00283,  "cd": 0.6},
}

PRESET_FACTS: dict[str, str] = {
    "Football":    "A professional free kick can reach 140 km/h. The ball curves due to spin (Magnus effect).",
    "Golf ball":   "Dimples on a golf ball reduce drag and create lift — a smooth ball would travel ~50% less far.",
    "Basketball":  "A 3-point shot is typically launched at 45–52° at ~7–8 m/s.",
    "Tennis ball": "Topspin in tennis uses the Magnus effect to bring the ball down faster.",
    "Javelin":     "Elite javelin throwers release at ~33 m/s at ~30° — slightly below the theoretical optimum due to aerodynamics.",
    "Shuttlecock": "A shuttlecock decelerates from 300 km/h to 100 km/h in under 0.5 seconds due to extreme drag!",
    "Cannonball":  "A 12-pounder Napoleon cannon fired at ~450 m/s. Air resistance was a major tactical consideration.",
}

# ── Spec / notes content ──────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 2 (Kinematics), sections (f) and (g)"

EQUATIONS = [
    r"x = v_0 \cos\theta \cdot t",
    r"y = v_0 \sin\theta \cdot t - \tfrac{1}{2}g t^2",
    r"R = \frac{v_0^2 \sin 2\theta}{g}",
    r"H = \frac{v_0^2 \sin^2\!\theta}{2g}",
]

EXPLANATION = (
    "Projectile motion separates into two **independent** components. "
    "Horizontally, there is no force (ignoring air resistance) so "
    r"$v_x = v_0\cos\theta$ remains constant throughout the flight. "
    "Vertically, gravity provides a constant downward acceleration $g$, "
    "so $v_y$ decreases linearly from $v_0\\sin\\theta$ to zero at maximum "
    "height, then increases downward until landing. "
    "The result is a **parabolic** path. "
    "Range is maximised at $\\theta = 45°$ in the absence of air resistance."
    "\n\n"
    "**Horizontal velocity is CONSTANT (no air resistance in basic mode). "
    "This is the key insight: x and y motions are completely independent.**"
    "\n\n"
    "**Energy:** At launch, all energy is kinetic ($\\frac{1}{2}mv^2$). "
    "At maximum height: $KE = \\frac{1}{2}mv_0^2\\cos^2\\theta$ (horizontal), "
    "$PE = mgh_{max}$."
)

ADVANCED_TEXT = (
    "**Quadratic drag** arises because the projectile must accelerate a "
    "column of air out of its path. The drag force is "
    r"$F_D = \tfrac{1}{2}\rho C_D A v^2$, "
    "where $\\rho$ is air density, $C_D$ the drag coefficient, $A$ the "
    "cross-sectional area, and $v$ the speed. Because drag depends on $v^2$ "
    "it is negligible at low speeds but dominant at high speeds. The ODE "
    "system is stiff enough to require a numerical integrator (RK4 here). "
    "**Terminal velocity** is reached when drag exactly balances gravity: "
    r"$v_T = \sqrt{\dfrac{2mg}{\rho C_D A}}$."
    "\n\n"
    "**Magnus effect:** a spinning ball drags the surrounding air with it "
    "(viscous boundary layer). On one side the boundary layer adds to the "
    "free-stream flow (faster → lower pressure, Bernoulli); on the other it "
    "opposes it (slower → higher pressure). The net pressure differential "
    "produces a force perpendicular to the velocity. Topspin ($\\omega > 0$) "
    "deflects the ball **downward** (shorter range); backspin ($\\omega < 0$) "
    "deflects it **upward** (longer range). This is exploited in football "
    "free-kicks, golf, tennis, and cricket swing bowling."
)

# ─────────────────────────────────────────────────────────────────────────────
# Pure-physics helpers
# ─────────────────────────────────────────────────────────────────────────────


def time_of_flight(v0: float, theta_rad: float) -> float:
    """
    Analytical time of flight for vacuum projectile.

    Uses T = 2·v₀·sinθ / g.  Returns a small positive floor (1 ms) when
    θ = 0 so downstream computations do not divide by zero.

    Parameters
    ----------
    v0        : initial speed (m/s)
    theta_rad : launch angle (radians)

    Returns
    -------
    T (s)
    """
    raw = 2.0 * v0 * np.sin(theta_rad) / g
    return max(raw, 1e-3)


def analytical_range(v0: float, theta_rad: float) -> float:
    """
    Analytical horizontal range R = v₀² sin2θ / g.

    Parameters
    ----------
    v0        : initial speed (m/s)
    theta_rad : launch angle (radians)

    Returns
    -------
    R (m)
    """
    return v0**2 * np.sin(2.0 * theta_rad) / g


def analytical_max_height(v0: float, theta_rad: float) -> float:
    """
    Analytical maximum height H = v₀² sin²θ / (2g).

    Parameters
    ----------
    v0        : initial speed (m/s)
    theta_rad : launch angle (radians)

    Returns
    -------
    H (m)
    """
    return v0**2 * np.sin(theta_rad) ** 2 / (2.0 * g)


@st.cache_data(show_spinner=False)
def compute_no_drag_trajectory(
    v0: float, theta_deg: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute the vacuum (no-drag) projectile trajectory analytically.

    Cached so that the basic plots never recompute when only advanced
    parameters change.

    Parameters
    ----------
    v0        : initial speed (m/s)
    theta_deg : launch angle (degrees)

    Returns
    -------
    t_arr : time array (s),  shape (N_TRAJ_POINTS,)
    x_arr : x positions (m), shape (N_TRAJ_POINTS,)
    y_arr : y positions (m), shape (N_TRAJ_POINTS,)
    vx_arr: x-velocity (m/s), constant, shape (N_TRAJ_POINTS,)
    vy_arr: y-velocity (m/s), shape (N_TRAJ_POINTS,)
    """
    theta_rad = np.radians(theta_deg)
    vx0 = v0 * np.cos(theta_rad)
    vy0 = v0 * np.sin(theta_rad)
    T = time_of_flight(v0, theta_rad)

    t_arr = np.linspace(0.0, T, N_TRAJ_POINTS)
    x_arr = vx0 * t_arr
    y_arr = vy0 * t_arr - 0.5 * g * t_arr**2
    vx_arr = np.full_like(t_arr, vx0)
    vy_arr = vy0 - g * t_arr

    # Clamp any floating-point negatives at landing to exactly zero
    y_arr = np.maximum(y_arr, 0.0)

    return t_arr, x_arr, y_arr, vx_arr, vy_arr


def make_drag_deriv(cd: float, area: float, mass: float):
    """
    Return a derivative function for quadratic-drag projectile motion.

    State vector y = [x, y, vx, vy].

    Parameters
    ----------
    cd   : drag coefficient (dimensionless)
    area : cross-sectional area (m²)
    mass : projectile mass (kg)

    Returns
    -------
    f(t, y) → dy/dt  (shape (4,))
    """
    k = 0.5 * RHO_AIR * cd * area  # drag constant (kg/m)

    def deriv(t: float, y: np.ndarray) -> np.ndarray:
        """RHS of drag ODE: [vx, vy, ax, ay]."""
        vx, vy = y[2], y[3]
        speed = np.hypot(vx, vy)
        # Avoid division by zero when ball is stationary
        if speed < 1e-12:
            return np.array([vx, vy, 0.0, -g])
        ax = -(k / mass) * speed * vx
        ay = -g - (k / mass) * speed * vy
        return np.array([vx, vy, ax, ay])

    return deriv


def make_magnus_deriv(cd: float, area: float, mass: float, omega: float):
    """
    Return a derivative function with quadratic drag **and** Magnus force.

    The Magnus lift coefficient CL is taken as CL_MAGNUS = 0.5.
    Ball radius is inferred from cross-sectional area: r = sqrt(A / π).

    Sign convention (positive = topspin, negative = backspin):
      Topspin  → top of ball moves forward → clockwise in (x-right, y-up) →
                 omega_z < 0 in right-hand coords.
      The physical spin-axis component is omega_z = -omega.
      Magnus direction from cross product (0,0,omega_z) × (vx,vy,0):
        FM ∝ (-omega_z·vy,  omega_z·vx) = (omega·vy, -omega·vx)
      For topspin (omega>0) with forward-and-upward velocity (vx,vy>0):
        FM_y = -omega·vx < 0  → downward deflection  ✓

    State vector y = [x, y, vx, vy].

    Parameters
    ----------
    cd    : drag coefficient
    area  : cross-sectional area (m²)
    mass  : mass (kg)
    omega : spin rate (rad/s); positive = topspin (dips), negative = backspin (lifts)

    Returns
    -------
    f(t, y) → dy/dt
    """
    k = 0.5 * RHO_AIR * cd * area          # drag constant  (kg/m)
    radius = np.sqrt(area / np.pi)          # ball radius (m)
    # Magnus acceleration coefficient: 0.5·ρ·A·CL·r / m  (units: m⁻¹)
    # Full Magnus accel = km_acc * |ω| * v_perp (m/s²)
    # where v_perp = perpendicular speed component from spin-axis cross product
    km_acc = 0.5 * RHO_AIR * area * CL_MAGNUS * radius / mass
    # Physical spin axis: topspin (clockwise when x-right, y-up) → omega_z < 0
    omega_z = -omega  # rad/s  (right-hand z-axis convention)

    def deriv(t: float, y: np.ndarray) -> np.ndarray:
        """RHS of drag + Magnus ODE: [vx, vy, ax, ay]."""
        vx, vy = y[2], y[3]
        speed = np.hypot(vx, vy)
        if speed < 1e-12:
            return np.array([vx, vy, 0.0, -g])

        # Drag (opposes velocity)
        drag_ax = -(k / mass) * speed * vx
        drag_ay = -g - (k / mass) * speed * vy

        # Magnus: F_M = 0.5·ρ·A·CL·(|ω|·r)·v  in direction perp to v
        # Cross product (0,0,omega_z) × (vx,vy,0) = (-omega_z·vy, omega_z·vx, 0)
        # |cross product| = |omega_z| * speed  →  unit perp = (-omega_z·vy, omega_z·vx)/(|omega_z|·speed)
        # a_M = km_acc · |omega_z| · speed · unit_perp
        #      = km_acc · (-omega_z·vy, omega_z·vx)    [|omega_z| and speed cancel]
        magnus_ax = km_acc * (-omega_z * vy)
        magnus_ay = km_acc * ( omega_z * vx)

        return np.array([vx, vy, drag_ax + magnus_ax, drag_ay + magnus_ay])

    return deriv


def integrate_until_landing(
    deriv,
    v0: float,
    theta_rad: float,
    t_max_factor: float = 5.0,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate the projectile ODE and truncate when y returns to zero.

    Parameters
    ----------
    deriv         : derivative function f(t, y)
    v0            : initial speed (m/s)
    theta_rad     : launch angle (radians)
    t_max_factor  : integrate for at most this multiple of the vacuum T_flight

    Returns
    -------
    t_arr : 1-D time array (s)
    y_arr : 2-D state array, shape (n, 4) — columns: x, y, vx, vy
    """
    vx0 = v0 * np.cos(theta_rad)
    vy0 = v0 * np.sin(theta_rad)
    y0 = np.array([0.0, 0.0, vx0, vy0])

    T_vacuum = time_of_flight(v0, theta_rad)
    t_end = T_vacuum * t_max_factor

    t_arr, y_arr = rk4_integrate(deriv, y0, (0.0, t_end), DT_RK4)

    # Find first index after launch where y crosses zero again
    # (y_arr[:, 1] is the height column)
    heights = y_arr[:, 1]
    # Skip the first few steps (ball is still near the ground at launch)
    start_idx = min(10, len(heights) - 1)
    landing_candidates = np.where(heights[start_idx:] <= 0.0)[0]
    if len(landing_candidates) > 0:
        landing_idx = start_idx + landing_candidates[0]
        t_arr = t_arr[:landing_idx + 1]
        y_arr = y_arr[:landing_idx + 1]

    # Clamp heights to zero for cleanliness
    y_arr[:, 1] = np.maximum(y_arr[:, 1], 0.0)

    return t_arr, y_arr


def terminal_velocity(cd: float, area: float, mass: float) -> float:
    """
    Compute terminal velocity v_T = sqrt(2mg / (ρ Cᴅ A)).

    Parameters
    ----------
    cd   : drag coefficient
    area : cross-sectional area (m²)
    mass : mass (kg)

    Returns
    -------
    v_T (m/s)
    """
    return np.sqrt(2.0 * mass * g / (RHO_AIR * cd * area))


# ─────────────────────────────────────────────────────────────────────────────
# Plotting helpers
# ─────────────────────────────────────────────────────────────────────────────


def _time_marker_indices(t_arr: np.ndarray) -> list[int]:
    """
    Return indices in t_arr closest to each MARKER_INTERVAL multiple.

    Parameters
    ----------
    t_arr : 1-D time array (s)

    Returns
    -------
    List of integer indices
    """
    if t_arr[-1] <= 0.0:
        return []
    marker_times = np.arange(0.0, t_arr[-1], MARKER_INTERVAL)
    indices = []
    for mt in marker_times:
        idx = int(np.argmin(np.abs(t_arr - mt)))
        if idx not in indices:
            indices.append(idx)
    return indices


def build_trajectory_figure(
    t_arr: np.ndarray,
    x_arr: np.ndarray,
    y_arr: np.ndarray,
    vx_arr: np.ndarray,
    vy_arr: np.ndarray,
    *,
    drag_x: np.ndarray | None = None,
    drag_y: np.ndarray | None = None,
    magnus_x: np.ndarray | None = None,
    magnus_y: np.ndarray | None = None,
    terminal_vel: float | None = None,
    v0: float,
    theta_deg: float,
    colour_by_speed: bool = False,
) -> object:
    """
    Build the combined trajectory + velocity-components Plotly figure.

    Top subplot  : y vs x trajectory with optional drag/Magnus overlays.
    Bottom subplot: Vx(t) and Vy(t) for the vacuum case.

    Parameters
    ----------
    t_arr, x_arr, y_arr  : vacuum trajectory arrays
    vx_arr, vy_arr       : vacuum velocity component arrays
    drag_x, drag_y       : with-drag trajectory (optional)
    magnus_x, magnus_y   : with-Magnus trajectory (optional)
    terminal_vel         : terminal velocity (m/s), shown as annotation if given
    v0                   : initial speed (m/s)  — used for axis scaling
    theta_deg            : launch angle (degrees) — used in title
    colour_by_speed      : if True, colour the vacuum trajectory by speed (plasma colorscale)

    Returns
    -------
    plotly.graph_objects.Figure
    """
    import plotly.graph_objects as go

    fig = make_fig(
        rows=2,
        cols=1,
        shared_xaxes=False,
        vertical_spacing=0.14,
        subplot_titles=[
            "Trajectory  (y vs x)",
            "Velocity components  vs  time",
        ],
    )

    # ── Top subplot: trajectories ─────────────────────────────────────────────

    # Vacuum trajectory — optionally colour by speed
    if colour_by_speed:
        speed_arr = np.hypot(vx_arr, vy_arr)
        fig.add_trace(
            go.Scatter(
                x=x_arr,
                y=y_arr,
                mode="lines+markers",
                name="No drag",
                marker=dict(
                    color=speed_arr,
                    colorscale="plasma",
                    size=3,
                    colorbar=dict(
                        title="Speed (m/s)",
                        thickness=12,
                        len=0.45,
                        y=0.78,
                    ),
                    showscale=True,
                ),
                line=dict(color=COLOURS["primary"], width=1.5),
            ),
            row=1,
            col=1,
        )
    else:
        fig.add_trace(
            go.Scatter(
                x=x_arr,
                y=y_arr,
                mode="lines",
                name="No drag",
                line=dict(color=COLOURS["primary"], width=2),
            ),
            row=1,
            col=1,
        )

    # Time markers on vacuum trajectory
    marker_idxs = _time_marker_indices(t_arr)
    if marker_idxs:
        fig.add_trace(
            go.Scatter(
                x=x_arr[marker_idxs],
                y=y_arr[marker_idxs],
                mode="markers+text",
                name="Time (s)",
                marker=dict(
                    color=COLOURS["primary"],
                    size=8,
                    symbol="circle",
                    line=dict(color=COLOURS["text"], width=1),
                ),
                text=[f"{t_arr[i]:.1f}s" for i in marker_idxs],
                textposition="top center",
                textfont=dict(size=9, color=COLOURS["text"]),
                showlegend=True,
            ),
            row=1,
            col=1,
        )

    # With-drag overlay
    if drag_x is not None and drag_y is not None and len(drag_x) > 1:
        fig.add_trace(
            go.Scatter(
                x=drag_x,
                y=drag_y,
                mode="lines",
                name="With drag",
                line=dict(color=COLOURS["secondary"], width=2, dash="dash"),
            ),
            row=1,
            col=1,
        )

    # With-Magnus overlay
    if magnus_x is not None and magnus_y is not None and len(magnus_x) > 1:
        fig.add_trace(
            go.Scatter(
                x=magnus_x,
                y=magnus_y,
                mode="lines",
                name="Drag + Magnus",
                line=dict(color=COLOURS["tertiary"], width=2, dash="dot"),
            ),
            row=1,
            col=1,
        )

    # Terminal velocity annotation (dashed horizontal line at y=0 with label)
    if terminal_vel is not None:
        # Place label at the right edge of the plot
        x_max = float(max(
            x_arr[-1] if len(x_arr) else 1.0,
            drag_x[-1] if drag_x is not None and len(drag_x) else 0.0,
        ))
        fig.add_shape(
            type="line",
            x0=0,
            x1=x_max,
            y0=0,
            y1=0,
            line=dict(color=COLOURS["advanced"], width=1, dash="longdash"),
            row=1,
            col=1,
        )
        fig.add_annotation(
            x=x_max,
            y=2.0,   # slightly above ground line
            text=f"v_T = {terminal_vel:.1f} m/s",
            showarrow=False,
            font=dict(color=COLOURS["advanced"], size=10),
            xanchor="right",
            row=1,
            col=1,
        )

    # ── Bottom subplot: velocity components ───────────────────────────────────

    fig.add_trace(
        go.Scatter(
            x=t_arr,
            y=vx_arr,
            mode="lines",
            name="Vₓ (constant)",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        row=2,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=t_arr,
            y=vy_arr,
            mode="lines",
            name="Vᵧ (decreasing)",
            line=dict(color=COLOURS["secondary"], width=2),
        ),
        row=2,
        col=1,
    )

    # Zero-velocity reference line on velocity plot
    fig.add_hline(
        y=0,
        line=dict(color=COLOURS["grid"], width=1, dash="dot"),
        row=2,
        col=1,
    )

    # ── Layout ────────────────────────────────────────────────────────────────

    fig.update_layout(
        height=680,
        showlegend=True,
        legend=dict(
            x=0.75,
            y=0.98,
            bgcolor="rgba(0,0,0,0.4)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
        ),
        paper_bgcolor=COLOURS["background"],
        plot_bgcolor=COLOURS["background"],
        font=dict(color=COLOURS["text"], size=11),
        margin=dict(l=60, r=30, t=70, b=60),
    )

    # Axis labels
    fig.update_xaxes(
        title_text="Horizontal distance x (m)",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=1,
        col=1,
    )
    fig.update_yaxes(
        title_text="Height y (m)",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        rangemode="tozero",
        row=1,
        col=1,
    )
    fig.update_xaxes(
        title_text="Time t (s)",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=2,
        col=1,
    )
    fig.update_yaxes(
        title_text="Velocity (m/s)",
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
        row=2,
        col=1,
    )

    return fig


# ─────────────────────────────────────────────────────────────────────────────
# p5.js animation builder
# ─────────────────────────────────────────────────────────────────────────────


def build_projectile_animation(x_arr, y_arr, vx_arr, vy_arr, x_max, y_max):
    """Build p5.js animated projectile HTML."""
    import json
    import numpy as np

    # Subsample to 300 frames max
    n = len(x_arr)
    step = max(1, n // 300)
    xs = x_arr[::step].tolist()
    ys = y_arr[::step].tolist()
    vxs = vx_arr[::step].tolist()
    vys = vy_arr[::step].tolist()

    data = json.dumps({
        "x": xs, "y": ys, "vx": vxs, "vy": vys,
        "xMax": float(x_max), "yMax": float(y_max),
        "n": len(xs)
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>body{{margin:0;overflow:hidden;background:#0e1117;}}</style>
</head><body>
<script>
const D = {data};
const PAD = 40;
let frame = 0, playing = true, speed = 2;
let trailLen = 60;

function setup() {{
  let cnv = createCanvas(windowWidth || 700, 420);
  cnv.mousePressed(togglePlay);
  textFont('monospace');
}}

function windowResized() {{ resizeCanvas(windowWidth, 420); }}

function togglePlay() {{
  // click play/pause area
  if (mouseX > width-110 && mouseX < width-10 && mouseY > 10 && mouseY < 40) {{
    playing = !playing;
  }} else if (mouseX > width-110 && mouseX < width-10 && mouseY > 50 && mouseY < 80) {{
    frame = 0; playing = true;
  }} else if (mouseX > width-110 && mouseX < width-10 && mouseY > 90 && mouseY < 120) {{
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  }}
}}

function worldToScreen(wx, wy) {{
  let sx = PAD + (wx / D.xMax) * (width - 2*PAD);
  let sy = height - PAD - (wy / D.yMax) * (height - 2*PAD - 20);
  return [sx, sy];
}}

function drawArrow(x1, y1, x2, y2, col) {{
  stroke(col); strokeWeight(2); fill(col);
  line(x1, y1, x2, y2);
  let angle = atan2(y2-y1, x2-x1);
  let hs = 8;
  push();
  translate(x2, y2);
  rotate(angle);
  triangle(0,0,-hs,-hs/2,-hs,hs/2);
  pop();
}}

function draw() {{
  background('#0e1117');

  // Grid
  stroke('#2a2a2a'); strokeWeight(1);
  let gx = (width-2*PAD)/5;
  let gy = (height-2*PAD-20)/4;
  for(let i=0;i<=5;i++) line(PAD+i*gx, PAD, PAD+i*gx, height-PAD);
  for(let i=0;i<=4;i++) line(PAD, PAD+i*gy, width-PAD, PAD+i*gy);

  // Axes
  stroke('#fafafa'); strokeWeight(1.5);
  line(PAD, height-PAD, width-PAD, height-PAD);
  line(PAD, height-PAD, PAD, PAD);

  // Ground
  stroke('#2ca02c'); strokeWeight(2);
  line(PAD, height-PAD, width-PAD, height-PAD);

  // Axis labels
  noStroke(); fill('#fafafa'); textSize(10);
  text('x (m)', width/2, height-8);
  push(); translate(12, height/2); rotate(-HALF_PI); text('y (m)', 0, 0); pop();

  // Tick labels
  textSize(9); fill('#999');
  for(let i=0;i<=5;i++) {{
    let val = (D.xMax * i/5).toFixed(0);
    text(val, PAD+i*gx-10, height-PAD+12);
  }}
  for(let i=0;i<=4;i++) {{
    let val = (D.yMax * (4-i)/4).toFixed(0);
    text(val, 2, PAD+i*gy+4);
  }}

  // Full trajectory (faint path)
  noFill(); stroke(100,100,150,60); strokeWeight(1);
  beginShape();
  for(let i=0;i<D.n;i++) {{
    let [sx,sy] = worldToScreen(D.x[i], D.y[i]);
    vertex(sx, sy);
  }}
  endShape();

  // Trail
  let trailStart = max(0, frame - trailLen);
  for(let i=trailStart; i<frame && i<D.n; i++) {{
    let alpha = map(i, trailStart, frame, 20, 200);
    let [sx,sy] = worldToScreen(D.x[i], D.y[i]);
    let r=i===frame-1?8:4;
    noStroke();
    fill(31,119,180, alpha);
    circle(sx, sy, r);
  }}

  // Current ball
  if(frame < D.n) {{
    let [bx,by] = worldToScreen(D.x[frame], D.y[frame]);

    // Glow
    noStroke();
    for(let r=20;r>0;r-=4) {{
      fill(31,119,180, map(r,0,20,0,30));
      circle(bx,by,r*2);
    }}
    fill('#1f77b4'); stroke('#ffffff'); strokeWeight(1.5);
    circle(bx, by, 16);

    // Velocity vector
    let vscale = min(width,height)*0.15 / (D.xMax * 0.5 + 1);
    let vx = D.vx[frame], vy = D.vy[frame];
    let vmag = sqrt(vx*vx + vy*vy);
    if(vmag > 0.1) {{
      let vxs = vx * vscale * 0.3;
      let vys = vy * vscale * 0.3;
      drawArrow(bx, by, bx+vxs, by-vys, color(255,127,14));
    }}

    // Gravity vector (always down, fixed length)
    drawArrow(bx, by, bx, by+35, color(231,76,60));

    // Labels
    noStroke(); fill('#ff7f0e'); textSize(10);
    text('v = ' + vmag.toFixed(1) + ' m/s', bx+12, by-12);
    fill('#e74c3c');
    text('g', bx+4, by+40);
  }}

  // Landing impact flash
  if(frame >= D.n-1) {{
    let [lx,ly] = worldToScreen(D.x[D.n-1], 0);
    let alpha = 255 - (frame-(D.n-1))*20;
    if(alpha > 0) {{
      noStroke(); fill(255,200,50,alpha);
      for(let r=40;r>0;r-=8) {{ circle(lx,ly,r); }}
    }}
  }}

  // Controls panel
  let cx = width-105, cy = 15;
  noStroke(); fill(20,20,30,200); rect(cx-5,cy-5,100,120,6);
  fill('#fafafa'); textSize(11);
  text(playing ? '⏸ Pause' : '▶ Play', cx, cy+14);
  text('↺ Replay', cx, cy+54);
  text('⚡ ' + speed + 'x speed', cx, cy+94);

  // Frame counter
  noStroke(); fill('#555'); textSize(9);
  text('t = ' + (frame/D.n * D.xMax / (D.xMax/(D.n*0.033+0.001))).toFixed(1) + 's', PAD+4, PAD+14);

  if(playing && frame < D.n + 20) frame += speed;
  if(frame >= D.n + 20) {{ frame = D.n-1; playing = false; }}
}}
</script></body></html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Main page
# ─────────────────────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point — render the full Projectile Motion simulation page."""

    sim_header("🎯 Projectile Motion", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ── Left column: controls ─────────────────────────────────────────────────

    with left_col:
        mode = mode_toggle()

        st.markdown("### Launch parameters")

        v0 = st.slider(
            "Initial speed v₀ (m/s)",
            min_value=1,
            max_value=50,
            value=20,
            step=1,
            help="Magnitude of the launch velocity",
        )

        theta_deg = st.slider(
            "Launch angle θ (°)",
            min_value=0,
            max_value=90,
            value=45,
            step=1,
            help="Angle above the horizontal. 45° gives maximum range in vacuum.",
        )

        # ── Advanced controls ─────────────────────────────────────────────────

        drag_enabled = False
        magnus_enabled = False
        cd = 0.47
        area = 0.1
        mass = 1.0
        omega = 0.0

        if mode == "Advanced":
            advanced_divider()

            drag_enabled = st.checkbox(
                "Enable air resistance (quadratic drag)",
                value=False,
                help="Adds F_D = ½ρCᴅAv² opposing motion. Solved with RK4.",
            )

            if drag_enabled:
                # Object preset
                preset_name = st.selectbox(
                    "Real-world object preset",
                    options=list(PRESETS.keys()),
                    index=0,
                    help="Select a preset to auto-fill mass, area, and Cᴅ.",
                )
                preset = PRESETS[preset_name]
                is_custom = preset_name == "Custom"

                cd = st.slider(
                    "Drag coefficient Cᴅ",
                    min_value=0.10,
                    max_value=1.50,
                    value=float(preset.get("cd", 0.47)),
                    step=0.01,
                    disabled=not is_custom,
                    help="Sphere ≈ 0.47, streamlined body < 0.1, bluff body > 1.",
                )

                area = st.slider(
                    "Cross-sectional area A (m²)",
                    min_value=0.001,
                    max_value=0.500,
                    value=float(preset.get("area", 0.10)),
                    step=0.001,
                    format="%.3f",
                    disabled=not is_custom,
                    help="Projected area facing the direction of motion.",
                )

                st.info(f"Air density ρ = {RHO_AIR} kg/m³ (sea level, 15 °C)")

                # Mass: show slider only for Custom preset
                if is_custom:
                    mass = st.slider(
                        "Mass m (kg)",
                        min_value=0.01,
                        max_value=10.00,
                        value=1.00,
                        step=0.01,
                        format="%.2f",
                        help="Heavier objects are less affected by drag.",
                    )
                else:
                    mass = float(preset["mass"])
                    st.markdown(
                        f"**Mass:** {mass} kg &nbsp;|&nbsp; "
                        f"**A:** {area} m² &nbsp;|&nbsp; **Cᴅ:** {cd}",
                    )

                # Preset fact card
                if preset_name in PRESET_FACTS:
                    st.info(PRESET_FACTS[preset_name])

                # Magnus effect
                magnus_enabled = st.checkbox(
                    "Enable Magnus effect (requires drag)",
                    value=False,
                    help=(
                        "Spin creates a pressure differential (Bernoulli). "
                        "Positive ω = topspin (ball dips), "
                        "negative ω = backspin (ball climbs)."
                    ),
                )

                if magnus_enabled:
                    omega = st.slider(
                        "Spin rate ω (rad/s)",
                        min_value=-200,
                        max_value=200,
                        value=0,
                        step=5,
                        help=(
                            "Positive: topspin → downward deflection. "
                            "Negative: backspin → upward deflection."
                        ),
                    )
                    radius = np.sqrt(area / np.pi)
                    st.caption(
                        f"Ball radius r = {radius * 100:.1f} cm  "
                        f"(inferred from A = π r²)"
                    )

                # ── Optimal angle finder (drag enabled) ───────────────────────
                angles_deg = np.arange(1, 90)
                deriv_opt = make_drag_deriv(cd, area, mass)
                ranges_with_drag = []
                for ang in angles_deg:
                    try:
                        _, s = integrate_until_landing(
                            deriv_opt, float(v0), np.radians(float(ang))
                        )
                        ranges_with_drag.append(float(s[-1, 0]))
                    except Exception:
                        ranges_with_drag.append(0.0)
                optimal_angle = int(angles_deg[np.argmax(ranges_with_drag)])
                st.metric(
                    "Optimal angle (with drag)",
                    f"{optimal_angle}°",
                )
                st.caption(
                    "Without drag, optimal angle is always 45°. "
                    "Air resistance shifts this downward — the heavier and "
                    "more streamlined the object, the smaller the shift."
                )

    # ── Right column: plots and metrics ───────────────────────────────────────

    with right_col:

        # Always compute the vacuum trajectory
        theta_rad = np.radians(theta_deg)
        t_arr, x_arr, y_arr, vx_arr, vy_arr = compute_no_drag_trajectory(
            float(v0), float(theta_deg)
        )

        # Derived scalar quantities
        T_flight = time_of_flight(float(v0), theta_rad)
        R = analytical_range(float(v0), theta_rad)
        H = analytical_max_height(float(v0), theta_rad)

        # Metric row (always shown)
        metric_row(
            {
                "Range (m)": f"{R:.1f}",
                "Max Height (m)": f"{H:.1f}",
                "Time of Flight (s)": f"{T_flight:.2f}",
            }
        )

        # ── Optional: drag trajectory ─────────────────────────────────────────

        drag_x_out: np.ndarray | None = None
        drag_y_out: np.ndarray | None = None
        vt: float | None = None
        drag_t_arr: np.ndarray | None = None
        drag_state: np.ndarray | None = None

        if mode == "Advanced" and drag_enabled:
            try:
                deriv_drag = make_drag_deriv(cd, area, mass)
                drag_t_arr, drag_state = integrate_until_landing(
                    deriv_drag, float(v0), theta_rad
                )
                drag_x_out = drag_state[:, 0]
                drag_y_out = drag_state[:, 1]
                vt = terminal_velocity(cd, area, mass)
            except Exception as exc:
                st.warning(f"Drag integration failed: {exc}")

            # Advanced metrics
            if drag_x_out is not None and len(drag_x_out) > 1:
                drag_range = float(drag_x_out[-1])
                drag_height = float(np.max(drag_state[:, 1]))
                drag_tof = float(drag_t_arr[-1])
                st.markdown("#### With air resistance")
                metric_row(
                    {
                        "Range (m)": f"{drag_range:.1f}",
                        "Max Height (m)": f"{drag_height:.1f}",
                        "Time of Flight (s)": f"{drag_tof:.2f}",
                    }
                )
                if vt is not None:
                    st.caption(
                        f"Terminal velocity v_T = {vt:.1f} m/s  "
                        f"(= √(2mg / ρCᴅA))"
                    )

        # ── Optional: Magnus trajectory ───────────────────────────────────────

        magnus_x_out: np.ndarray | None = None
        magnus_y_out: np.ndarray | None = None

        if mode == "Advanced" and drag_enabled and magnus_enabled:
            try:
                deriv_magnus = make_magnus_deriv(cd, area, mass, float(omega))
                magnus_t_arr, magnus_state = integrate_until_landing(
                    deriv_magnus, float(v0), theta_rad
                )
                magnus_x_out = magnus_state[:, 0]
                magnus_y_out = magnus_state[:, 1]
            except Exception as exc:
                st.warning(f"Magnus integration failed: {exc}")

            if magnus_x_out is not None and len(magnus_x_out) > 1:
                magnus_range = float(magnus_x_out[-1])
                magnus_height = float(np.max(magnus_state[:, 1]))
                magnus_tof = float(magnus_t_arr[-1])
                spin_label = (
                    "topspin" if omega > 0
                    else ("backspin" if omega < 0 else "no spin")
                )
                st.markdown(f"#### Drag + Magnus ({spin_label})")
                metric_row(
                    {
                        "Range (m)": f"{magnus_range:.1f}",
                        "Max Height (m)": f"{magnus_height:.1f}",
                        "Time of Flight (s)": f"{magnus_tof:.2f}",
                    }
                )

        # ── Live animation panel ──────────────────────────────────────────────

        st.markdown("#### Live Animation")

        anim_x_max = float(max(x_arr)) * 1.1
        anim_y_max = float(max(y_arr)) * 1.1 if float(max(y_arr)) > 0 else 1.0
        anim_html = build_projectile_animation(
            x_arr, y_arr, vx_arr, vy_arr, anim_x_max, anim_y_max
        )
        components.html(anim_html, height=430)

        st.caption(
            "Click the canvas to play/pause · Click ↺ to replay · Click ⚡ to change speed"
        )

        st.divider()

        # ── Build and render figure ───────────────────────────────────────────

        fig = build_trajectory_figure(
            t_arr=t_arr,
            x_arr=x_arr,
            y_arr=y_arr,
            vx_arr=vx_arr,
            vy_arr=vy_arr,
            drag_x=drag_x_out,
            drag_y=drag_y_out,
            magnus_x=magnus_x_out,
            magnus_y=magnus_y_out,
            terminal_vel=vt,
            v0=float(v0),
            theta_deg=float(theta_deg),
            colour_by_speed=(mode == "Basic"),
        )

        st.plotly_chart(fig, use_container_width=True)

        # ── Physics notes ─────────────────────────────────────────────────────

        physics_notes(
            spec_ref=SPEC_REF,
            equations=EQUATIONS,
            explanation=EXPLANATION,
            advanced_text=ADVANCED_TEXT,
            mode=mode,
        )


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    # Streamlit executes the module directly — call main() at import time
    main()
