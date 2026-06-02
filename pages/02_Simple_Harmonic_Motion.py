"""
Simple Harmonic Motion simulation for WJEC Eduqas A Level Physics.

Component 1, Topic 6 (Vibrations), sections (a)–(q).

Covers:
  - Pendulum and spring-mass SHM (Basic)
  - Displacement, velocity, and acceleration time-series
  - Phase portrait and energy bar chart
  - Damping regimes: underdamped, critically damped, overdamped (Advanced)
  - Forced oscillation and amplitude–frequency response (Advanced)
  - Large-angle pendulum via RK4 numerical integration (Advanced)
"""

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import g, rk4_integrate
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 6 (Vibrations), sections (a)–(q)"

EQUATIONS = [
    r"x(t) = x_0 \cos(\omega_0 t)",
    r"\omega_0 = \sqrt{\frac{k}{m}} \text{ (spring)}",
    r"\omega_0 = \sqrt{\frac{g}{L}} \text{ (pendulum)}",
    r"T = \frac{2\pi}{\omega_0}",
    r"v = -x_0\omega_0\sin(\omega_0 t)",
    r"a = -\omega_0^2 x",
]

EXPLANATION = (
    "**Simple harmonic motion** occurs when the restoring force is proportional "
    "to — and directed opposite to — the displacement from equilibrium: "
    r"$F = -kx$. "
    "The displacement, velocity, and acceleration are all sinusoidal and 90° "
    "(or 180°) out of phase with each other. Energy is continuously exchanged "
    "between kinetic energy ($\\frac{1}{2}mv^2$) and potential energy "
    "($\\frac{1}{2}kx^2$ for a spring), with total mechanical energy conserved "
    "in the ideal (undamped) case. The phase portrait (v vs x) forms a perfect "
    "ellipse for ideal SHM."
)

ADVANCED_TEXT = (
    "**Damping ratio ζ** controls the energy loss per cycle. "
    "Three regimes exist:\n\n"
    "- **Underdamped (ζ < 1):** oscillation decays exponentially — "
    "amplitude envelope $\\pm x_0 e^{-\\zeta\\omega_0 t}$.\n"
    "- **Critically damped (ζ = 1):** fastest return to equilibrium without "
    "oscillation — ideal for instrument pointers and car shock absorbers.\n"
    "- **Overdamped (ζ > 1):** slow exponential return, no oscillation.\n\n"
    "**Resonance** occurs when the driving frequency equals the natural frequency "
    "($\\omega = \\omega_0$). The steady-state amplitude is "
    "$A = \\frac{x_0}{\\sqrt{(1-(\\omega/\\omega_0)^2)^2 + (2\\zeta\\omega/\\omega_0)^2}}$. "
    "Quality factor $Q = 1/(2\\zeta)$ measures sharpness of resonance.\n\n"
    "**Real examples:** Tacoma Narrows Bridge (1940) — resonance disaster from "
    "wind-induced forced oscillation at the bridge's natural frequency. MRI "
    "scanners — tuned resonance of hydrogen nuclei in a magnetic field. "
    "Car suspension — target near critical damping for comfort and handling.\n\n"
    "**Musical instruments:** A guitar string is a forced oscillating system. "
    "Fret position changes L → changes f. Tighter string increases tension → "
    "increases k → higher f. Heavier string increases m → lower f. The Q factor "
    "of a guitar string determines sustain — classical guitar strings have Q~1000, "
    "giving long sustain."
)

N_POINTS = 1000          # time-series sample count
N_PERIODS = 5            # default periods to display
RK4_DT_FACTOR = 0.002   # dt = RK4_DT_FACTOR * T  (≈ 500 steps/period)
ZETA_CRIT_TOL = 0.02     # |ζ − 1| < this → treat as critically damped
FREQ_RATIO_POINTS = 500  # points for amplitude–frequency response curve

# ── Physics helpers ───────────────────────────────────────────────────────────


def pendulum_params(L: float) -> tuple[float, float, float]:
    """
    Compute natural angular frequency, period, and frequency for a pendulum.

    Parameters
    ----------
    L : pendulum length (m)

    Returns
    -------
    omega0 : natural angular frequency (rad/s)
    T      : period (s)
    f      : frequency (Hz)
    """
    omega0 = np.sqrt(g / L)
    T = 2 * np.pi / omega0
    f = 1.0 / T
    return omega0, T, f


def spring_params(m: float, k: float) -> tuple[float, float, float]:
    """
    Compute natural angular frequency, period, and frequency for a spring-mass.

    Parameters
    ----------
    m : mass (kg)
    k : spring constant (N/m)

    Returns
    -------
    omega0 : natural angular frequency (rad/s)
    T      : period (s)
    f      : frequency (Hz)
    """
    omega0 = np.sqrt(k / m)
    T = 2 * np.pi / omega0
    f = 1.0 / T
    return omega0, T, f


def shm_kinematics(
    t: np.ndarray,
    x0: float,
    omega0: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Analytical SHM displacement, velocity, and acceleration arrays.

    Assumes initial conditions x(0) = x0, v(0) = 0.

    Parameters
    ----------
    t      : time array (s)
    x0     : initial displacement amplitude (m)
    omega0 : natural angular frequency (rad/s)

    Returns
    -------
    x : displacement (m)
    v : velocity (m/s)
    a : acceleration (m/s²)
    """
    x = x0 * np.cos(omega0 * t)
    v = -x0 * omega0 * np.sin(omega0 * t)
    a = -x0 * omega0**2 * np.cos(omega0 * t)
    return x, v, a


def damped_displacement(
    t: np.ndarray,
    x0: float,
    omega0: float,
    zeta: float,
) -> np.ndarray:
    """
    Analytical damped displacement for three regimes.

    Parameters
    ----------
    t      : time array (s)
    x0     : initial displacement (m)
    omega0 : natural angular frequency (rad/s)
    zeta   : damping ratio (dimensionless)

    Returns
    -------
    x_damped : displacement array (m)
    """
    if abs(zeta - 1.0) < ZETA_CRIT_TOL:
        # Critically damped: x = x0 * exp(-omega0 * t) * (1 + omega0 * t)
        return x0 * np.exp(-omega0 * t) * (1.0 + omega0 * t)
    elif zeta < 1.0:
        # Underdamped
        omega_d = omega0 * np.sqrt(1.0 - zeta**2)
        return x0 * np.exp(-zeta * omega0 * t) * np.cos(omega_d * t)
    else:
        # Overdamped
        sqrt_term = np.sqrt(zeta**2 - 1.0)
        r1 = omega0 * (-zeta + sqrt_term)
        r2 = omega0 * (-zeta - sqrt_term)
        # Initial conditions x(0)=x0, v(0)=0  →  A + B = x0,  A*r1 + B*r2 = 0
        A = x0 * r2 / (r2 - r1)
        B = x0 - A
        return A * np.exp(r1 * t) + B * np.exp(r2 * t)


def amplitude_response(
    freq_ratios: np.ndarray,
    zeta: float,
) -> np.ndarray:
    """
    Normalised steady-state amplitude response for a driven damped oscillator.

    A(r) = 1 / sqrt((1 - r²)² + (2ζr)²)  where r = ω/ω₀.

    Parameters
    ----------
    freq_ratios : array of ω/ω₀ values
    zeta        : damping ratio

    Returns
    -------
    A : normalised amplitude (dimensionless)
    """
    r = freq_ratios
    denom = np.sqrt((1.0 - r**2) ** 2 + (2.0 * zeta * r) ** 2)
    # Guard against zero denominator at ζ=0, r=1
    denom = np.where(denom < 1e-12, 1e-12, denom)
    return 1.0 / denom


def pendulum_ode(L: float):
    """
    Return the ODE function for the nonlinear pendulum.

    State vector y = [θ, dθ/dt].

    Parameters
    ----------
    L : pendulum length (m)

    Returns
    -------
    f : callable f(t, y) → dy/dt
    """

    def f(t: float, y: np.ndarray) -> np.ndarray:
        """Nonlinear pendulum ODE: dθ/dt = ω, dω/dt = -(g/L) sin(θ)."""
        theta, omega = y
        return np.array([omega, -(g / L) * np.sin(theta)])

    return f


def energy_at_time(
    t_val: float,
    x0: float,
    omega0: float,
    m: float,
    system: str,
    L: float = 1.0,
) -> tuple[float, float]:
    """
    Compute kinetic and potential energy at a specific time for ideal SHM.

    Parameters
    ----------
    t_val  : time instant (s)
    x0     : initial displacement amplitude (m)
    omega0 : natural angular frequency (rad/s)
    m      : mass (kg)
    system : 'Spring-Mass' or 'Simple Pendulum'
    L      : pendulum length (m), used only for Pendulum

    Returns
    -------
    KE : kinetic energy (J)
    PE : potential energy (J)
    """
    x, v, _ = shm_kinematics(np.array([t_val]), x0, omega0)
    x_val = float(x[0])
    v_val = float(v[0])

    KE = 0.5 * m * v_val**2
    if system == "Spring-Mass":
        k_spring = m * omega0**2
        PE = 0.5 * k_spring * x_val**2
    else:
        # Pendulum: approximate PE = ½ m ω₀² x² (small angle, x = Lθ)
        PE = 0.5 * m * omega0**2 * x_val**2

    return max(KE, 0.0), max(PE, 0.0)


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_time_series_fig(
    t: np.ndarray,
    x: np.ndarray,
    v: np.ndarray,
    a: np.ndarray,
    x_damped: np.ndarray | None = None,
    envelope: np.ndarray | None = None,
    x_rk4: np.ndarray | None = None,
    t_rk4: np.ndarray | None = None,
    system: str = "Spring-Mass",
) -> go.Figure:
    """
    Build the three-row synchronised time-series subplot figure.

    Row 1: displacement x(t)
    Row 2: velocity v(t)
    Row 3: acceleration a(t)

    Optional overlays on Row 1:
      - Damped analytical solution (COLOURS["advanced"])
      - Damping envelope ±x0·exp(-ζω₀t) (COLOURS["highlight"], dashed)
      - RK4 large-angle numerical solution (COLOURS["advanced"])

    Parameters
    ----------
    t        : uniform time array (s)
    x, v, a  : kinematic arrays from shm_kinematics
    x_damped : optional damped displacement array
    envelope : optional envelope array (positive half; negative plotted too)
    x_rk4    : optional RK4 theta*L displacement array
    t_rk4    : optional time array matching x_rk4
    system   : 'Simple Pendulum' or 'Spring-Mass'

    Returns
    -------
    fig : Plotly Figure with 3 rows, shared x-axis
    """
    x_label = "Angular displacement θ (rad)" if system == "Simple Pendulum" else "Displacement x (m)"
    v_label = "Angular velocity (rad/s)" if system == "Simple Pendulum" else "Velocity v (m/s)"
    a_label = "Angular accel (rad/s²)" if system == "Simple Pendulum" else "Acceleration a (m/s²)"

    fig = make_subplots(
        rows=3,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.06,
        subplot_titles=[x_label, v_label, a_label],
    )

    # Row 1 — displacement
    fig.add_trace(
        go.Scatter(
            x=t,
            y=x,
            mode="lines",
            name="x(t) — small angle",
            line=dict(color=COLOURS["primary"], width=2),
        ),
        row=1, col=1,
    )
    if x_rk4 is not None and t_rk4 is not None:
        fig.add_trace(
            go.Scatter(
                x=t_rk4,
                y=x_rk4,
                mode="lines",
                name="x(t) — large angle (RK4)",
                line=dict(color=COLOURS["advanced"], width=2, dash="dot"),
            ),
            row=1, col=1,
        )
    if x_damped is not None:
        fig.add_trace(
            go.Scatter(
                x=t,
                y=x_damped,
                mode="lines",
                name="x(t) — damped",
                line=dict(color=COLOURS["advanced"], width=2),
            ),
            row=1, col=1,
        )
    if envelope is not None:
        fig.add_trace(
            go.Scatter(
                x=t,
                y=envelope,
                mode="lines",
                name="Envelope +",
                line=dict(color=COLOURS["highlight"], width=1, dash="dash"),
                showlegend=True,
            ),
            row=1, col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=t,
                y=-envelope,
                mode="lines",
                name="Envelope −",
                line=dict(color=COLOURS["highlight"], width=1, dash="dash"),
                showlegend=True,
            ),
            row=1, col=1,
        )

    # Row 2 — velocity
    fig.add_trace(
        go.Scatter(
            x=t,
            y=v,
            mode="lines",
            name="v(t)",
            line=dict(color=COLOURS["secondary"], width=2),
        ),
        row=2, col=1,
    )

    # Row 3 — acceleration
    fig.add_trace(
        go.Scatter(
            x=t,
            y=a,
            mode="lines",
            name="a(t)",
            line=dict(color=COLOURS["tertiary"], width=2),
        ),
        row=3, col=1,
    )

    layout = plotly_layout(
        height=600,
        title=dict(text="Kinematics vs Time", font=dict(size=14)),
        showlegend=True,
    )
    # Propagate grid styling to all axes
    axis_style = dict(
        gridcolor=COLOURS["grid"],
        linecolor=COLOURS["grid"],
        zerolinecolor=COLOURS["grid"],
    )
    layout.update(
        xaxis=axis_style,
        xaxis2=axis_style,
        xaxis3=dict(**axis_style, title="Time t (s)"),
        yaxis=axis_style,
        yaxis2=axis_style,
        yaxis3=axis_style,
    )
    fig.update_layout(**layout)
    return fig


def build_phase_portrait(
    x: np.ndarray,
    v: np.ndarray,
    x_damped: np.ndarray | None = None,
    v_damped: np.ndarray | None = None,
) -> go.Figure:
    """
    Build a phase portrait (v vs x) Plotly figure.

    For ideal SHM this is an ellipse. Damped trajectories spiral inward.

    Parameters
    ----------
    x, v          : ideal SHM arrays
    x_damped      : optional damped displacement array
    v_damped      : optional damped velocity array

    Returns
    -------
    fig : Plotly Figure
    """
    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=x,
            y=v,
            mode="lines",
            name="Ideal SHM",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )
    if x_damped is not None and v_damped is not None:
        fig.add_trace(
            go.Scatter(
                x=x_damped,
                y=v_damped,
                mode="lines",
                name="Damped",
                line=dict(color=COLOURS["advanced"], width=2),
            )
        )

    # Mark start point
    fig.add_trace(
        go.Scatter(
            x=[x[0]],
            y=[v[0]],
            mode="markers",
            name="t = 0",
            marker=dict(color=COLOURS["highlight"], size=10, symbol="circle"),
        )
    )

    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Phase Portrait (v vs x)", font=dict(size=14)),
            xaxis=dict(
                title="Displacement x (m)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Velocity v (m/s)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


def build_energy_bar(
    KE: float,
    PE: float,
    t_val: float,
) -> go.Figure:
    """
    Build a Plotly bar chart showing KE and PE at a selected time instant.

    Parameters
    ----------
    KE    : kinetic energy (J)
    PE    : potential energy (J)
    t_val : time instant for chart title (s)

    Returns
    -------
    fig : Plotly Figure
    """
    total = KE + PE
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=["KE", "PE", "Total"],
            y=[KE, PE, total],
            marker_color=[COLOURS["secondary"], COLOURS["tertiary"], COLOURS["primary"]],
            name="Energy",
            text=[f"{KE:.4f} J", f"{PE:.4f} J", f"{total:.4f} J"],
            textposition="outside",
        )
    )
    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(
                text=f"Energy at t = {t_val:.3f} s",
                font=dict(size=14),
            ),
            xaxis=dict(
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Energy (J)",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            showlegend=False,
        )
    )
    return fig


def build_amplitude_response(
    zeta: float,
    omega_drive_ratio: float,
) -> go.Figure:
    """
    Build the amplitude–frequency response (Bode amplitude) figure.

    Shows the normalised steady-state amplitude A(ω/ω₀) with the current
    driving frequency marked and the resonance peak annotated.

    Parameters
    ----------
    zeta             : damping ratio
    omega_drive_ratio: current driving frequency ratio ω/ω₀

    Returns
    -------
    fig : Plotly Figure
    """
    r = np.linspace(0.05, 3.0, FREQ_RATIO_POINTS)
    A = amplitude_response(r, zeta)

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=r,
            y=A,
            mode="lines",
            name="A(ω/ω₀)",
            line=dict(color=COLOURS["primary"], width=2),
        )
    )

    # Current driving frequency marker
    A_drive = float(amplitude_response(np.array([omega_drive_ratio]), zeta)[0])
    fig.add_vline(
        x=omega_drive_ratio,
        line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
    )
    fig.add_trace(
        go.Scatter(
            x=[omega_drive_ratio],
            y=[A_drive],
            mode="markers+text",
            text=[f"  A = {A_drive:.2f}"],
            textposition="middle right",
            textfont=dict(color=COLOURS["highlight"]),
            marker=dict(color=COLOURS["highlight"], size=10),
            name=f"ω/ω₀ = {omega_drive_ratio:.2f}",
        )
    )

    # Resonance peak annotation (near ω/ω₀ = sqrt(1 - 2ζ²) for underdamped)
    if zeta < 1.0 / np.sqrt(2):
        r_peak = np.sqrt(1.0 - 2.0 * zeta**2)
        A_peak = float(amplitude_response(np.array([r_peak]), zeta)[0])
        fig.add_annotation(
            x=r_peak,
            y=A_peak,
            text=f"Peak A = {A_peak:.2f}<br>Q = {1/(2*zeta):.2f}",
            showarrow=True,
            arrowhead=2,
            arrowcolor=COLOURS["advanced"],
            font=dict(color=COLOURS["advanced"], size=11),
            bgcolor="rgba(0,0,0,0.6)",
        )

    fig.update_layout(
        **plotly_layout(
            height=380,
            title=dict(text="Amplitude–Frequency Response", font=dict(size=14)),
            xaxis=dict(
                title="ω / ω₀",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            yaxis=dict(
                title="Normalised amplitude A",
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
        )
    )
    return fig


# ── Animation builder ─────────────────────────────────────────────────────────


def build_shm_animation(t_arr, x_arr, v_arr, sim_type, params):
    """
    Build p5.js animated SHM HTML.

    sim_type: 'spring' or 'pendulum'
    params: dict with keys like 'omega0', 'amplitude', 'L' (pendulum length)
    """
    import json, numpy as np
    step = max(1, len(t_arr)//300)
    ts = t_arr[::step].tolist()
    xs = x_arr[::step].tolist()  # displacement in metres (or radians for pendulum)
    vs = v_arr[::step].tolist()

    x_max = float(np.max(np.abs(x_arr))) or 1.0
    v_max = float(np.max(np.abs(v_arr))) or 1.0

    data = json.dumps({
        "t": ts, "x": xs, "v": vs,
        "xMax": x_max, "vMax": v_max,
        "simType": sim_type,
        "n": len(ts),
        "params": params
    })

    return f"""<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<style>body{{margin:0;overflow:hidden;background:#0e1117;}}</style>
</head><body>
<script>
const D = {data};
let frame=0, playing=true, speed=1;
let phaseTrail = [];

function setup(){{
  createCanvas(windowWidth||700, 420);
  textFont('monospace');
}}
function windowResized(){{ resizeCanvas(windowWidth,420); }}

function mousePressed(){{
  if(mouseX>width-120&&mouseX<width-10){{
    if(mouseY>10&&mouseY<40) playing=!playing;
    else if(mouseY>50&&mouseY<80){{frame=0;playing=true;phaseTrail=[];}}
    else if(mouseY>90&&mouseY<120) speed=speed===1?2:speed===2?4:1;
  }}
}}

function drawSpring(x1,y1,x2,y2,coils,w){{
  // Draw a coil spring between two points
  let dx=x2-x1, dy=y2-y1;
  let len=sqrt(dx*dx+dy*dy);
  let nx=-dy/len, ny=dx/len;
  let segs=coils*2+2;
  beginShape();
  vertex(x1,y1);
  for(let i=1;i<segs;i++){{
    let t=i/segs;
    let mx=x1+dx*t, my=y1+dy*t;
    let sign=(i%2===0)?1:-1;
    vertex(mx+nx*sign*w, my+ny*sign*w);
  }}
  vertex(x2,y2);
  endShape();
}}

function draw(){{
  background('#0e1117');
  let idx=min(frame, D.n-1);
  let x=D.x[idx], v=D.v[idx];

  // Energy
  let ke=v*v/(D.vMax*D.vMax);
  let pe=x*x/(D.xMax*D.xMax);

  if(D.simType==='spring'){{
    // ── SPRING-MASS ──
    let wallX=50, ceilY=height/2;
    let restLen=150, massW=40, massH=40;
    let dispPx=x/D.xMax * 120;  // px displacement
    let massX=wallX+restLen+dispPx;
    let massY=ceilY-massH/2;

    // Support rail
    stroke('#555'); strokeWeight(3);
    line(wallX, ceilY-60, wallX, ceilY+60);
    // Hatch wall
    stroke('#555'); strokeWeight(1);
    for(let i=-3;i<=3;i++) line(wallX-12,ceilY+i*20,wallX,ceilY+i*20-12);

    // Spring
    stroke('#17becf'); strokeWeight(2); noFill();
    drawSpring(wallX, ceilY, massX, ceilY, 8, 14);

    // Mass glow
    noStroke();
    for(let r=30;r>0;r-=6) fill(31,119,180,map(r,0,30,0,25));
    for(let r=30;r>0;r-=6) rect(massX-massW/2-r/4,massY-r/4,massW+r/2,massH+r/2,4);

    // Mass block
    fill('#1f77b4'); stroke('#ffffff'); strokeWeight(1.5);
    rect(massX-massW/2, massY, massW, massH, 4);
    noStroke(); fill('#ffffff'); textSize(10); textAlign(CENTER);
    text('m', massX, massY+massH/2+4);
    textAlign(LEFT);

    // Equilibrium line
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6,4]);
    line(wallX+restLen, 60, wallX+restLen, height-60);
    setLineDash([]);

    // Velocity arrow
    if(abs(v)>0.01){{
      stroke('#ff7f0e'); fill('#ff7f0e'); strokeWeight(2);
      let arrowLen=map(abs(v),0,D.vMax,0,60)*sign(v);
      let ax=massX+massW/2, ay=ceilY;
      line(ax,ay,ax+arrowLen,ay);
      let dir=v>0?1:-1;
      triangle(ax+arrowLen,ay, ax+arrowLen-dir*10,ay-5, ax+arrowLen-dir*10,ay+5);
    }}

  }} else {{
    // ── PENDULUM ──
    let pivX=width/2, pivY=80;
    let L=min(width,height)*0.35;
    let theta=x;  // x is angle in radians
    let bobX=pivX+L*sin(theta);
    let bobY=pivY+L*cos(theta);

    // Support
    stroke('#555'); strokeWeight(3); fill('#555');
    rect(pivX-30, 60, 60, 20, 3);
    // Hatch
    stroke('#555'); strokeWeight(1);
    for(let i=-3;i<=3;i++) line(pivX-30+i*10,60,pivX-20+i*10,42);

    // Rod/string
    stroke('#aaa'); strokeWeight(2);
    line(pivX, pivY+8, bobX, bobY);

    // Pivot
    fill('#888'); noStroke(); circle(pivX, pivY+8, 10);

    // Equilibrium dashed line
    stroke('#2a2a2a'); strokeWeight(1); setLineDash([6,4]);
    line(pivX, pivY+8, pivX, pivY+L+20);
    setLineDash([]);

    // Angle arc
    if(abs(theta)>0.02){{
      noFill(); stroke('#9b59b6'); strokeWeight(1.5);
      arc(pivX, pivY+8, 60, 60, PI/2-abs(theta)/2, PI/2+abs(theta)/2);
      noStroke(); fill('#9b59b6'); textSize(9);
      text('θ='+degrees(abs(theta)).toFixed(1)+'°', pivX+8, pivY+40);
    }}

    // Bob glow
    noStroke();
    for(let r=24;r>0;r-=5) fill(31,119,180,map(r,0,24,0,30));
    for(let r=24;r>0;r-=5) circle(bobX,bobY,r*2);

    fill('#1f77b4'); stroke('#ffffff'); strokeWeight(1.5);
    circle(bobX, bobY, 24);

    // Velocity arrow (tangential)
    if(abs(v)>0.01){{
      let tx=-cos(theta)*sign(v), ty=sin(theta)*sign(v);  // tangential direction
      let spd=map(abs(v),0,D.vMax,0,60);
      stroke('#ff7f0e'); fill('#ff7f0e'); strokeWeight(2);
      let ax=bobX+tx*spd, ay=bobY+ty*spd;
      line(bobX,bobY,ax,ay);
      let ang=atan2(ty,tx);
      push(); translate(ax,ay); rotate(ang);
      triangle(0,0,-10,-5,-10,5); pop();
    }}

    // Gravity arrow
    stroke('#e74c3c'); fill('#e74c3c'); strokeWeight(2);
    line(bobX,bobY,bobX,bobY+40);
    triangle(bobX,bobY+40,bobX-4,bobY+30,bobX+4,bobY+30);
  }}

  // ── ENERGY BARS (bottom) ──
  let barY=height-30, barH=18, barW=160, bx=PAD=20;
  // KE
  noStroke(); fill('#2a2a2a'); rect(bx,barY-barH,barW,barH,3);
  fill('#ff7f0e'); rect(bx,barY-barH,barW*ke,barH,3);
  fill('#fafafa'); textSize(9); text('KE',bx+barW+5,barY-4);
  // PE
  fill('#2a2a2a'); rect(bx,barY-barH*2-4,barW,barH,3);
  fill('#1f77b4'); rect(bx,barY-barH*2-4,barW*pe,barH,3);
  fill('#fafafa'); text('PE',bx+barW+5,barY-barH-8);
  // TE line
  stroke('#2ca02c'); strokeWeight(1); setLineDash([4,3]);
  line(bx+barW,barY-barH*2-4,bx+barW,barY);
  setLineDash([]);
  fill('#2ca02c'); noStroke(); textSize(9); text('Total E',bx+barW-35,barY+12);

  // Phase space trail (x vs v)
  phaseTrail.push([x,v]);
  if(phaseTrail.length>80) phaseTrail.shift();
  let phX=width-120, phY=height/2, phR=70;
  noStroke(); fill('#111',200); circle(phX,phY,phR*2+10);
  stroke('#2a2a2a'); strokeWeight(1); noFill();
  circle(phX,phY,phR*2);
  // trail
  for(let i=1;i<phaseTrail.length;i++){{
    let alpha=map(i,0,phaseTrail.length,30,200);
    let px1=phX+phaseTrail[i-1][0]/D.xMax*phR;
    let py1=phY-phaseTrail[i-1][1]/D.vMax*phR;
    let px2=phX+phaseTrail[i][0]/D.xMax*phR;
    let py2=phY-phaseTrail[i][1]/D.vMax*phR;
    stroke(155,89,182,alpha); strokeWeight(1.5);
    line(px1,py1,px2,py2);
  }}
  noStroke(); fill('#9b59b6'); textSize(8);
  text('phase', phX-18, phY+phR+14);

  // Controls
  noStroke(); fill(15,15,25,220); rect(width-118,8,110,120,6);
  fill('#fafafa'); textSize(11);
  text(playing?'⏸ Pause':'▶ Play', width-112, 28);
  text('↺ Replay', width-112, 68);
  text('⚡ '+speed+'x', width-112, 108);

  if(playing) frame+=speed;
  if(frame>=D.n){{ frame=0; phaseTrail=[]; }}
}}

function sign(x){{ return x>0?1:x<0?-1:0; }}
function setLineDash(list){{
  drawingContext.setLineDash(list);
}}
</script></body></html>"""


# ── Streamlit page ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="SHM — WJEC A Level Physics",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded",
)

sim_header("Simple Harmonic Motion", SPEC_REF)

mode = mode_toggle()

left_col, right_col = two_column_layout(3, 7)

# ── Left column: controls ─────────────────────────────────────────────────────
with left_col:
    st.subheader("System")
    system = st.selectbox("System", ["Simple Pendulum", "Spring-Mass"])

    st.divider()

    # System-specific controls
    if system == "Simple Pendulum":
        L = st.slider(
            "Length L (m)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.05,
            help="Effective length from pivot to centre of mass.",
        )
        theta0_deg = st.slider(
            "Initial amplitude θ₀ (°)",
            min_value=1,
            max_value=30,
            value=10,
            step=1,
            help="Initial angular displacement (small-angle approximation valid ≲ 15°).",
        )
        theta0_rad = np.radians(theta0_deg)
        # Convert to linear displacement for plotting
        x0 = L * theta0_rad          # linear amplitude ≈ L·θ₀ (small angle)
        m_eff = 1.0                   # normalise: 1 kg bob assumed for energy
        omega0, T_period, freq = pendulum_params(L)

    else:  # Spring-Mass
        m_eff = st.slider(
            "Mass m (kg)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.1,
        )
        k_spring = st.slider(
            "Spring constant k (N/m)",
            min_value=1,
            max_value=200,
            value=20,
            step=1,
        )
        x0 = st.slider(
            "Initial displacement x₀ (m)",
            min_value=0.01,
            max_value=0.50,
            value=0.10,
            step=0.01,
        )
        omega0, T_period, freq = spring_params(m_eff, k_spring)
        L = 1.0  # unused for spring; set for function signatures

    # ── Basic: period verification checkbox ──────────────────────────────────
    show_period_verification = False
    if mode == "Basic":
        st.divider()
        show_period_verification = st.checkbox(
            "Show period verification",
            value=False,
            help="Show graphs illustrating how period depends on system parameters.",
        )

    # ── Advanced controls (inside left column) ────────────────────────────────
    # Defaults needed before Advanced block
    zeta = 0.0
    enable_forced = False
    omega_drive_ratio = 1.0
    show_large_angle = False

    if mode == "Advanced":
        advanced_divider()

        zeta = st.slider(
            "Damping ratio ζ",
            min_value=0.0,
            max_value=2.0,
            value=0.1,
            step=0.05,
            help="ζ < 1: underdamped  |  ζ = 1: critically damped  |  ζ > 1: overdamped",
        )

        # Regime label
        if abs(zeta - 1.0) < ZETA_CRIT_TOL:
            st.info("Regime: **Critically damped** — fastest return without oscillation.")
        elif zeta < 1.0:
            st.info(f"Regime: **Underdamped** (ζ = {zeta:.2f} < 1) — decaying oscillation.")
        else:
            st.info(f"Regime: **Overdamped** (ζ = {zeta:.2f} > 1) — slow exponential return.")

        # ── Real-world damping presets ────────────────────────────────────────
        _DAMPING_PRESETS = {
            "Custom": None,
            "Car suspension (comfort)": (
                0.25,
                "Slightly underdamped: the body bounces gently once after a bump, "
                "giving a plush ride feel.",
            ),
            "Car suspension (sport)": (
                0.7,
                "Well-damped: the suspension rebounds quickly and controlled — "
                "minimal body roll, responsive handling.",
            ),
            "Building with TMD (tuned mass damper)": (
                0.05,
                "Very lightly damped: the tuned mass damper inside the building "
                "absorbs sway energy during earthquakes or wind loading.",
            ),
            "Door damper (soft close)": (
                1.0,
                "Critically damped: the door closes smoothly to the frame without "
                "bouncing or slamming — exactly critical damping.",
            ),
            "Old clock pendulum (air)": (
                0.002,
                "Extremely lightly damped: air resistance is tiny, so the pendulum "
                "swings for hours before losing appreciable amplitude.",
            ),
            "Seismograph": (
                0.6,
                "Moderately damped: the needle responds clearly to ground motion "
                "then settles quickly, ready to record the next wave.",
            ),
        }

        preset_choice = st.selectbox(
            "Real-world example",
            options=list(_DAMPING_PRESETS.keys()),
            index=0,
            help="Select a preset to update ζ and see a real-world context card.",
        )

        if preset_choice != "Custom" and _DAMPING_PRESETS[preset_choice] is not None:
            _preset_zeta, _preset_info = _DAMPING_PRESETS[preset_choice]
            zeta = _preset_zeta
            st.info(_preset_info)

        if zeta > 0.0:
            enable_forced = st.checkbox(
                "Enable forced oscillation",
                value=False,
                help="Drive the oscillator sinusoidally and explore resonance.",
            )
            if enable_forced:
                omega_drive_ratio = st.slider(
                    "Driving frequency ratio ω/ω₀",
                    min_value=0.1,
                    max_value=3.0,
                    value=1.0,
                    step=0.05,
                    help="Ratio of driving frequency to natural frequency. At 1.0: resonance.",
                )

        if system == "Simple Pendulum":
            show_large_angle = st.checkbox(
                "Show large-angle comparison",
                value=False,
                help=(
                    "Uses RK4 to integrate the exact pendulum ODE "
                    "d²θ/dt² = -(g/L) sin(θ). "
                    "Deviations grow with amplitude."
                ),
            )

# ── Derived time array ────────────────────────────────────────────────────────

t_end = N_PERIODS * T_period
t = np.linspace(0.0, t_end, N_POINTS)

# ── Analytical SHM kinematics ─────────────────────────────────────────────────

x_ideal, v_ideal, a_ideal = shm_kinematics(t, x0, omega0)

# ── Advanced: damped solution and numerical pendulum ─────────────────────────

x_damped_arr = None
v_damped_arr = None
envelope_arr = None
x_rk4_arr = None
t_rk4_arr = None

if mode == "Advanced":
    if zeta > 0.0:
        x_damped_arr = damped_displacement(t, x0, omega0, zeta)
        # Numerical velocity for damped phase portrait (finite difference)
        v_damped_arr = np.gradient(x_damped_arr, t)
        if zeta < 1.0 and not (abs(zeta - 1.0) < ZETA_CRIT_TOL):
            envelope_arr = x0 * np.exp(-zeta * omega0 * t)

    if show_large_angle and system == "Simple Pendulum":
        dt_rk4 = RK4_DT_FACTOR * T_period
        ode_func = pendulum_ode(L)
        y0_rk4 = np.array([theta0_rad, 0.0])
        t_rk4_arr, y_rk4 = rk4_integrate(ode_func, y0_rk4, (0.0, t_end), dt_rk4)
        # Convert angular displacement to linear displacement for comparison
        x_rk4_arr = L * y_rk4[:, 0]

# ── Right column: plots ───────────────────────────────────────────────────────

with right_col:

    # Metric row
    metric_row(
        {
            "Period T": f"{T_period:.3f} s",
            "Frequency f": f"{freq:.3f} Hz",
            "Angular freq ω₀": f"{omega0:.3f} rad/s",
        }
    )

    st.markdown("")  # spacing

    # ── Live animation panel ──────────────────────────────────────────────────
    shm_type = "pendulum" if system == "Simple Pendulum" else "spring"
    if system == "Simple Pendulum":
        # Pass angle in radians and angular velocity for the pendulum animation
        anim_x = x_ideal / L   # convert linear displacement back to radians
        anim_v = v_ideal / L   # angular velocity (rad/s)
        anim_params = {"omega0": float(omega0), "amplitude": float(theta0_rad), "L": float(L)}
    else:
        anim_x = x_ideal
        anim_v = v_ideal
        anim_params = {"omega0": float(omega0), "amplitude": float(x0)}
    anim_html = build_shm_animation(t, anim_x, anim_v, shm_type, anim_params)
    components.html(anim_html, height=430)
    st.caption("▶ Click Play/Pause · ↺ Replay · ⚡ Speed toggle")
    st.divider()

    # ── Time-series subplots ──────────────────────────────────────────────────
    fig_ts = build_time_series_fig(
        t=t,
        x=x_ideal,
        v=v_ideal,
        a=a_ideal,
        x_damped=x_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
        envelope=envelope_arr,
        x_rk4=x_rk4_arr,
        t_rk4=t_rk4_arr,
        system=system,
    )
    st.plotly_chart(fig_ts, use_container_width=True)

    # ── Phase portrait + Energy bar ───────────────────────────────────────────
    col_phase, col_energy = st.columns(2)

    with col_phase:
        fig_phase = build_phase_portrait(
            x=x_ideal,
            v=v_ideal,
            x_damped=x_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
            v_damped=v_damped_arr if (mode == "Advanced" and zeta > 0.0) else None,
        )
        st.plotly_chart(fig_phase, use_container_width=True)

    with col_energy:
        t_slider_max = float(t_end)
        t_selected = st.slider(
            "Time point for energy (s)",
            min_value=0.0,
            max_value=t_slider_max,
            value=0.0,
            step=t_slider_max / 200.0,
            format="%.3f",
            key="energy_time_slider",
        )
        KE_val, PE_val = energy_at_time(
            t_val=t_selected,
            x0=x0,
            omega0=omega0,
            m=m_eff,
            system=system,
            L=L,
        )
        fig_energy = build_energy_bar(KE_val, PE_val, t_selected)
        st.plotly_chart(fig_energy, use_container_width=True)

    # ── Basic: period verification graphs ────────────────────────────────────
    if mode == "Basic" and show_period_verification:
        st.markdown("#### Period Verification")
        pv_col_left, pv_col_right = st.columns(2)

        if system == "Simple Pendulum":
            # Left: T vs L
            L_arr = np.linspace(0.1, 5.0, 300)
            T_vs_L = 2 * np.pi * np.sqrt(L_arr / g)

            fig_TL = go.Figure()
            fig_TL.add_trace(
                go.Scatter(
                    x=L_arr,
                    y=T_vs_L,
                    mode="lines",
                    name="T vs L",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_TL.add_vline(
                x=L,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"L={L:.2f} m",
                annotation_position="top right",
            )
            # Log-log slope annotation
            fig_TL.add_annotation(
                x=0.5,
                y=max(T_vs_L) * 0.85,
                text="log-log slope = 0.5",
                showarrow=False,
                font=dict(color=COLOURS["advanced"], size=11),
                xref="paper",
                yref="y",
            )
            fig_TL.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ √L (Pendulum)", font=dict(size=13)),
                    xaxis=dict(
                        title="Length L (m)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_left:
                st.plotly_chart(fig_TL, use_container_width=True)

            # Right: T on different planets
            _PLANETS = {
                "Moon": 1.62,
                "Mars": 3.72,
                "Earth": 9.81,
                "Jupiter": 24.8,
            }
            _planet_names = list(_PLANETS.keys())
            _planet_g = list(_PLANETS.values())
            _planet_T = [2 * np.pi * np.sqrt(L / _gp) for _gp in _planet_g]

            fig_Tg = go.Figure()
            fig_Tg.add_trace(
                go.Scatter(
                    x=_planet_g,
                    y=_planet_T,
                    mode="markers+text",
                    text=_planet_names,
                    textposition="top center",
                    marker=dict(color=COLOURS["secondary"], size=12),
                    name="Planets",
                )
            )
            fig_Tg.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T on different planets", font=dict(size=13)),
                    xaxis=dict(
                        title="g (m/s²)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_right:
                st.plotly_chart(fig_Tg, use_container_width=True)

        else:  # Spring-Mass
            # Left: T vs m (k fixed)
            m_arr = np.linspace(0.1, 5.0, 300)
            T_vs_m = 2 * np.pi * np.sqrt(m_arr / k_spring)

            fig_Tm = go.Figure()
            fig_Tm.add_trace(
                go.Scatter(
                    x=m_arr,
                    y=T_vs_m,
                    mode="lines",
                    name="T vs m",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_Tm.add_vline(
                x=m_eff,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"m={m_eff:.1f} kg",
                annotation_position="top right",
            )
            fig_Tm.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ √m (Spring-Mass)", font=dict(size=13)),
                    xaxis=dict(
                        title="Mass m (kg)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_left:
                st.plotly_chart(fig_Tm, use_container_width=True)

            # Right: T vs k (m fixed)
            k_arr = np.linspace(1.0, 200.0, 300)
            T_vs_k = 2 * np.pi * np.sqrt(m_eff / k_arr)

            fig_Tk = go.Figure()
            fig_Tk.add_trace(
                go.Scatter(
                    x=k_arr,
                    y=T_vs_k,
                    mode="lines",
                    name="T vs k",
                    line=dict(color=COLOURS["primary"], width=2),
                )
            )
            fig_Tk.add_vline(
                x=k_spring,
                line=dict(color=COLOURS["highlight"], dash="dash", width=1.5),
                annotation_text=f"k={k_spring} N/m",
                annotation_position="top right",
            )
            fig_Tk.update_layout(
                **plotly_layout(
                    height=320,
                    title=dict(text="T ∝ 1/√k (Spring-Mass)", font=dict(size=13)),
                    xaxis=dict(
                        title="Spring constant k (N/m)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                    yaxis=dict(
                        title="Period T (s)",
                        gridcolor=COLOURS["grid"],
                        linecolor=COLOURS["grid"],
                        zerolinecolor=COLOURS["grid"],
                    ),
                )
            )
            with pv_col_right:
                st.plotly_chart(fig_Tk, use_container_width=True)

    # ── Advanced: amplitude–frequency response ────────────────────────────────
    if mode == "Advanced" and enable_forced:
        st.markdown("")
        fig_ampl = build_amplitude_response(zeta, omega_drive_ratio)
        st.plotly_chart(fig_ampl, use_container_width=True)

        # Steady-state amplitude note
        A_ss = float(amplitude_response(np.array([omega_drive_ratio]), zeta)[0])
        Q_factor = 1.0 / (2.0 * zeta)
        st.info(
            f"At ω/ω₀ = {omega_drive_ratio:.2f}: "
            f"steady-state amplitude = **{A_ss:.3f}×** natural amplitude.  "
            f"Quality factor Q = 1/(2ζ) = **{Q_factor:.2f}**"
        )

    # ── Key insight cards ─────────────────────────────────────────────────────
    if mode == "Basic":
        st.info(
            "⚡ At equilibrium position (x=0): ALL energy is kinetic "
            "(KE = ½mω²A²). At maximum displacement: ALL energy is potential "
            "(PE = ½kA²)."
        )
        st.info(
            f"🔄 The period T = {T_period:.3f} s is independent of amplitude — "
            "this is what makes SHM special. A 10° swing takes the same time "
            "as a 1° swing."
        )
    else:  # Advanced
        if zeta < 1.0 and not (abs(zeta - 1.0) < ZETA_CRIT_TOL):
            st.info(
                f"⚠️ Damping ratio ζ = {zeta:.2f}: oscillations decay with envelope "
                f"A·e^(−ζω₀t). The system still oscillates but amplitude shrinks "
                "each cycle."
            )
        if enable_forced and abs(omega_drive_ratio - 1.0) < 0.15:
            st.info(
                "🔊 Near resonance! Maximum energy transfer from driver to system. "
                "Real-world: Tacoma Narrows Bridge (1940) collapsed due to "
                "wind-driven resonance."
            )

    # ── Physics notes ─────────────────────────────────────────────────────────
    physics_notes(
        spec_ref=SPEC_REF,
        equations=EQUATIONS,
        explanation=EXPLANATION,
        advanced_text=ADVANCED_TEXT,
        mode=mode,
    )
