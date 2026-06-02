"""
Electric & Gravitational Fields — WJEC Eduqas A Level Physics
Component 2, Topic 6 (Fields), sections (a)–(f)

Covers:
  Basic    : Interactive field-line / equipotential visualisation for point
             charges (electric) and point masses (gravitational).  Probe-point
             readout of field strength and potential.
  Advanced : Side-by-side electric vs gravitational comparison, test-particle
             trajectory integrated with RK4, energy-conservation check.
"""

import numpy as np
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import k_e, G, point_charge_field, point_mass_field, rk4_integrate
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
    page_title="Electric & Gravitational Fields — WJEC Physics",
    page_icon="⚡",
    layout="wide",
)

# ── Constants ─────────────────────────────────────────────────────────────────

GRID_N: int = 60          # grid resolution (NxN)
GRID_RANGE: float = 6.0   # grid extent ±6 m
ARROW_SKIP: int = 6       # subsample: every 6th point → ~10×10 arrows
ARROW_SCALE: float = 0.4  # arrow display length (m)
EPS: float = 1e-20        # division-by-zero guard

# staggered default positions for charges/masses
_DEFAULT_POS = [(-2.0, 0.0), (2.0, 0.0), (0.0, 2.0), (0.0, -2.0)]
_DEFAULT_MASS_POS = [(-2.0, 0.0), (2.0, 0.0), (0.0, 2.0)]

# Spec / notes content
SPEC_REF = "Component 2, Topic 6 (Fields), sections (a)–(f)"

EQUATIONS = [
    r"E = \frac{kQ}{r^2}",
    r"V = \frac{kQ}{r}",
    r"g = \frac{GM}{r^2}",
    r"V_g = -\frac{GM}{r}",
    r"F = \frac{kQ_1Q_2}{r^2}",
    r"F = \frac{GM_1M_2}{r^2}",
]

EXPLANATION = (
    "Field lines show the direction of force on a positive test charge or mass. "
    "Equipotentials (shown as contours) are always **perpendicular** to field lines. "
    "The gravitational field always points **towards** the mass (always attractive). "
    "The electric field can be repulsive (like charges) or attractive (opposite charges). "
    "Use the probe sliders to read off the field magnitude and potential at any point."
)

ADVANCED_TEXT = (
    "Coulomb's law and Newton's law of gravitation are both **inverse-square laws**. "
    "Key difference: gravity is always attractive, while electric force can be repulsive. "
    "The field represents energy stored in space — moving a charge or mass against the "
    "field requires work equal to the change in potential energy. "
    "Potential energy = qV (electric) or mVg (gravitational). "
    "When a test particle is released, kinetic energy gained equals potential energy lost, "
    "so the total mechanical energy E = KE + PE remains constant (verified in the plot below)."
)

# ─────────────────────────────────────────────────────────────────────────────
# Grid computation — cached
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_data(show_spinner=False)
def compute_electric_field(
    charges: tuple,   # tuple of (q_C, x, y) — hashable for cache
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute the total electric field and potential on a 60×60 grid.

    Parameters
    ----------
    charges : tuple of (q_C, x, y) triplets

    Returns
    -------
    X, Y      : meshgrid arrays
    Ex, Ey    : total field components (V/m)
    V_total   : total potential (V)
    """
    xs = np.linspace(-GRID_RANGE, GRID_RANGE, GRID_N)
    X, Y = np.meshgrid(xs, xs)
    Ex_total = np.zeros_like(X)
    Ey_total = np.zeros_like(Y)
    V_total  = np.zeros_like(X)
    for q_C, cx, cy in charges:
        Ex, Ey, V = point_charge_field(q_C, np.array([cx, cy]), X, Y)
        Ex_total += Ex
        Ey_total += Ey
        V_total  += V
    return X, Y, Ex_total, Ey_total, V_total


@st.cache_data(show_spinner=False)
def compute_gravitational_field(
    masses: tuple,   # tuple of (M, x, y) — hashable for cache
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute the total gravitational field and potential on a 60×60 grid.

    Parameters
    ----------
    masses : tuple of (M, x, y) triplets

    Returns
    -------
    X, Y      : meshgrid arrays
    gx, gy    : total field components (N/kg)
    Vg_total  : total gravitational potential (J/kg)
    """
    xs = np.linspace(-GRID_RANGE, GRID_RANGE, GRID_N)
    X, Y = np.meshgrid(xs, xs)
    gx_total = np.zeros_like(X)
    gy_total = np.zeros_like(Y)
    Vg_total = np.zeros_like(X)
    for M, cx, cy in masses:
        gx, gy, Vg = point_mass_field(M, np.array([cx, cy]), X, Y)
        gx_total += gx
        gy_total += gy
        Vg_total += Vg
    return X, Y, gx_total, gy_total, Vg_total


# ─────────────────────────────────────────────────────────────────────────────
# Interpolation helpers
# ─────────────────────────────────────────────────────────────────────────────

def bilinear_interp(X: np.ndarray, Y: np.ndarray, F: np.ndarray,
                    xq: float, yq: float) -> float:
    """
    Bilinear interpolation of scalar field F on meshgrid (X,Y) at (xq, yq).

    Returns nearest-grid-point value when query is near an edge.

    Parameters
    ----------
    X, Y : 2-D meshgrid arrays (uniform spacing)
    F    : 2-D field values matching X, Y
    xq   : query x coordinate
    yq   : query y coordinate

    Returns
    -------
    Interpolated scalar value
    """
    x1d = X[0, :]
    y1d = Y[:, 0]
    # Clamp to grid
    xq = float(np.clip(xq, x1d[0], x1d[-1]))
    yq = float(np.clip(yq, y1d[0], y1d[-1]))

    ix = int(np.searchsorted(x1d, xq)) - 1
    iy = int(np.searchsorted(y1d, yq)) - 1
    ix = int(np.clip(ix, 0, len(x1d) - 2))
    iy = int(np.clip(iy, 0, len(y1d) - 2))

    dx = (xq - x1d[ix]) / (x1d[ix + 1] - x1d[ix] + EPS)
    dy = (yq - y1d[iy]) / (y1d[iy + 1] - y1d[iy] + EPS)
    dx = float(np.clip(dx, 0.0, 1.0))
    dy = float(np.clip(dy, 0.0, 1.0))

    f00 = F[iy,     ix    ]
    f10 = F[iy,     ix + 1]
    f01 = F[iy + 1, ix    ]
    f11 = F[iy + 1, ix + 1]

    return float(
        f00 * (1 - dx) * (1 - dy)
        + f10 * dx       * (1 - dy)
        + f01 * (1 - dx) * dy
        + f11 * dx       * dy
    )


def interp_field_at(X, Y, Fx, Fy, xq, yq):
    """Return (Fx_interp, Fy_interp) at query point."""
    return (
        bilinear_interp(X, Y, Fx, xq, yq),
        bilinear_interp(X, Y, Fy, xq, yq),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Arrow / quiver building
# ─────────────────────────────────────────────────────────────────────────────

def build_quiver_traces(
    X: np.ndarray,
    Y: np.ndarray,
    Fx: np.ndarray,
    Fy: np.ndarray,
    colour: str,
    skip: int = ARROW_SKIP,
    scale: float = ARROW_SCALE,
    name: str = "Field",
) -> list:
    """
    Build Plotly Scatter traces representing field arrows (quiver plot).

    Uses NaN separators for efficiency (single trace per field).
    Arrowheads are drawn as two short lines at the tip.

    Parameters
    ----------
    X, Y   : meshgrid arrays
    Fx, Fy : field component arrays
    colour : arrow colour hex string
    skip   : subsample every nth grid point
    scale  : arrow display length (m)
    name   : legend label

    Returns
    -------
    list of go.Scatter traces (arrows + heads)
    """
    Xs = X[::skip, ::skip]
    Ys = Y[::skip, ::skip]
    Fxs = Fx[::skip, ::skip]
    Fys = Fy[::skip, ::skip]

    # Normalise
    mag = np.sqrt(Fxs**2 + Fys**2) + EPS
    Fxn = Fxs / mag
    Fyn = Fys / mag

    xs_arr, ys_arr = [], []
    xh_arr, yh_arr = [], []   # arrowhead segments

    head_len = scale * 0.25   # arrowhead arm length
    head_angle = np.radians(25)

    for i in range(Xs.shape[0]):
        for j in range(Xs.shape[1]):
            x0 = float(Xs[i, j])
            y0 = float(Ys[i, j])
            dx = float(Fxn[i, j]) * scale
            dy = float(Fyn[i, j]) * scale
            x1 = x0 + dx
            y1 = y0 + dy

            # Shaft
            xs_arr += [x0, x1, None]
            ys_arr += [y0, y1, None]

            # Arrowhead: two arms pointing back from tip
            angle = np.arctan2(dy, dx)
            for side in (+1, -1):
                arm_angle = angle + np.pi + side * head_angle
                xa = x1 + head_len * np.cos(arm_angle)
                ya = y1 + head_len * np.sin(arm_angle)
                xh_arr += [x1, xa, None]
                yh_arr += [y1, ya, None]

    shaft_trace = go.Scatter(
        x=xs_arr,
        y=ys_arr,
        mode="lines",
        line=dict(color=colour, width=1.2),
        name=name,
        showlegend=True,
        hoverinfo="skip",
    )
    head_trace = go.Scatter(
        x=xh_arr,
        y=yh_arr,
        mode="lines",
        line=dict(color=colour, width=1.2),
        name=name + " head",
        showlegend=False,
        hoverinfo="skip",
    )
    return [shaft_trace, head_trace]


# ─────────────────────────────────────────────────────────────────────────────
# Field line tracing — numerical streamline integration
# ─────────────────────────────────────────────────────────────────────────────

def trace_field_lines(
    X: np.ndarray,
    Y: np.ndarray,
    Fx: np.ndarray,
    Fy: np.ndarray,
    sources: list,          # list of (x, y, sign) where sign=+1 or -1
    field_type: str = "electric",   # "electric" or "gravitational"
    n_seeds: int = 12,
    seed_radius: float = 0.35,
    ds: float = 0.06,
    max_steps: int = 800,
    colour: str | None = None,
) -> list:
    """
    Trace field lines by numerical integration from seed points.

    For electric fields: seeds are placed around each positive charge and
    integrated forward; seeds around negative charges integrate backward so
    lines terminate there naturally.

    For gravitational fields: seeds are placed on an outer circle at radius
    5.5 m and integrated inward (forward, since g always points inward).

    Parameters
    ----------
    X, Y       : meshgrid arrays (GRID_N × GRID_N)
    Fx, Fy     : field component arrays
    sources    : list of (x, y, sign) tuples; sign = +1 for + charge or mass,
                 −1 for − charge
    field_type : "electric" or "gravitational"
    n_seeds    : seeds per source
    seed_radius: distance of seeds from source centre (m)
    ds         : integration step size (m)
    max_steps  : maximum integration steps per line
    colour     : line colour; defaults to COLOURS["text"]

    Returns
    -------
    list containing a single go.Scatter trace (NaN-separated field lines)
    """
    if colour is None:
        colour = COLOURS["text"]

    domain = GRID_RANGE * 0.97   # stop when line exits this radius from origin
    stop_r2 = 0.12 ** 2          # stop if within 0.12 m of any source (near-source singularity)

    # Source positions for proximity check
    source_pos = [(sx, sy) for sx, sy, _ in sources]

    # ── Build seed points ─────────────────────────────────────────────────────
    seeds: list[tuple[float, float, float]] = []  # (x, y, direction)

    if field_type == "gravitational":
        # Seed from outer ring — one ring for all masses collectively
        r_outer = GRID_RANGE * 0.90
        angles = np.linspace(0, 2 * np.pi, len(sources) * n_seeds, endpoint=False)
        for ang in angles:
            seeds.append((r_outer * np.cos(ang), r_outer * np.sin(ang), +1.0))
    else:
        # Electric: seed from each charge, direction depends on sign
        for sx, sy, sign in sources:
            angles = np.linspace(0, 2 * np.pi, n_seeds, endpoint=False)
            # Offset starting angle slightly to avoid exact axis alignment
            angles += np.pi / n_seeds
            direction = float(sign)   # +1 integrates outward from +; −1 from −
            for ang in angles:
                seeds.append((
                    sx + seed_radius * np.cos(ang),
                    sy + seed_radius * np.sin(ang),
                    direction,
                ))

    # ── Integrate each seed ───────────────────────────────────────────────────
    xs_out: list[float] = []
    ys_out: list[float] = []

    for x0, y0, direction in seeds:
        x, y = x0, y0
        line_x: list[float] = [x]
        line_y: list[float] = [y]

        for _ in range(max_steps):
            # Check domain
            if abs(x) > domain or abs(y) > domain:
                break
            # Check proximity to any source
            near = any((x - sx) ** 2 + (y - sy) ** 2 < stop_r2
                       for sx, sy in source_pos)
            if near:
                break

            # Interpolate field
            fx = bilinear_interp(X, Y, Fx, x, y)
            fy = bilinear_interp(X, Y, Fy, x, y)
            mag = np.sqrt(fx ** 2 + fy ** 2)
            if mag < 1e-30:
                break

            # Normalised step in direction
            x += direction * ds * fx / mag
            y += direction * ds * fy / mag
            line_x.append(x)
            line_y.append(y)

        # Append with NaN separator
        if len(line_x) > 2:
            xs_out.extend(line_x)
            xs_out.append(float("nan"))
            ys_out.extend(line_y)
            ys_out.append(float("nan"))

    if not xs_out:
        return []

    return [go.Scatter(
        x=xs_out,
        y=ys_out,
        mode="lines",
        line=dict(color=colour, width=1.0),
        name="Field lines",
        showlegend=True,
        hoverinfo="skip",
        opacity=0.65,
    )]


# ─────────────────────────────────────────────────────────────────────────────
# Main field figure builder
# ─────────────────────────────────────────────────────────────────────────────

def build_field_figure(
    X: np.ndarray,
    Y: np.ndarray,
    Fx: np.ndarray,
    Fy: np.ndarray,
    V: np.ndarray,
    *,
    title: str,
    colorscale: str,
    v_clip: float,
    source_markers: list | None = None,   # list of (x, y, label, colour)
    field_line_sources: list | None = None,  # list of (x, y, sign) for streamline seeding
    field_type: str = "electric",
    traj_x: np.ndarray | None = None,
    traj_y: np.ndarray | None = None,
    probe_xy: tuple | None = None,
    field_name: str = "Field",
) -> go.Figure:
    """
    Build a Plotly figure showing equipotential contours + field lines + arrows.

    Parameters
    ----------
    X, Y         : meshgrid arrays
    Fx, Fy       : field component arrays
    V            : potential array
    title        : plot title
    colorscale   : Plotly colorscale string
    v_clip       : clip magnitude for display
    source_markers : list of (x, y, label, color) for charge/mass markers
    traj_x/y     : test-particle trajectory to overlay
    probe_xy     : (px, py) probe marker location
    field_name   : label used in legend ("E field" or "g field")

    Returns
    -------
    go.Figure
    """
    V_plot = np.clip(V, -v_clip, v_clip)

    fig = go.Figure()

    # ── Potential contour / heatmap ───────────────────────────────────────────

    fig.add_trace(go.Contour(
        x=X[0, :],
        y=Y[:, 0],
        z=V_plot,
        colorscale=colorscale,
        ncontours=30,
        contours=dict(
            showlabels=False,
            coloring="fill",
        ),
        line=dict(width=0.5, color="rgba(255,255,255,0.3)"),
        colorbar=dict(
            title=dict(text="Potential", side="right"),
            thickness=12,
            len=0.75,
            tickfont=dict(size=9),
        ),
        name="Potential",
        hovertemplate="x=%{x:.2f} m<br>y=%{y:.2f} m<br>V=%{z:.3e}<extra></extra>",
        opacity=0.85,
    ))

    # ── Field arrows ──────────────────────────────────────────────────────────

    # ── Field lines (streamline integration from each source) ─────────────────

    if field_line_sources:
        fl_traces = trace_field_lines(
            X, Y, Fx, Fy,
            sources=field_line_sources,
            field_type=field_type,
            n_seeds=12,
            colour=COLOURS["primary"] if field_type == "electric" else COLOURS["secondary"],
        )
        for tr in fl_traces:
            fig.add_trace(tr)

    # ── Field arrows (quiver) ─────────────────────────────────────────────────

    arrow_traces = build_quiver_traces(
        X, Y, Fx, Fy,
        colour=COLOURS["text"],
        name=field_name,
    )
    for tr in arrow_traces:
        fig.add_trace(tr)

    # ── Source markers (charges / masses) ─────────────────────────────────────

    if source_markers:
        for mx, my, mlabel, mcol in source_markers:
            fig.add_trace(go.Scatter(
                x=[mx],
                y=[my],
                mode="markers+text",
                marker=dict(size=14, color=mcol,
                            line=dict(color=COLOURS["text"], width=1.5),
                            symbol="circle"),
                text=[mlabel],
                textposition="top center",
                textfont=dict(size=11, color=mcol),
                name=mlabel,
                showlegend=False,
                hovertemplate=f"{mlabel}<br>x={mx:.2f} m, y={my:.2f} m<extra></extra>",
            ))

    # ── Probe marker ──────────────────────────────────────────────────────────

    if probe_xy is not None:
        px, py = probe_xy
        fig.add_trace(go.Scatter(
            x=[px],
            y=[py],
            mode="markers",
            marker=dict(
                size=12,
                color=COLOURS["highlight"],
                symbol="x",
                line=dict(color=COLOURS["text"], width=1.5),
            ),
            name="Probe",
            hovertemplate=f"Probe<br>x={px:.2f} m, y={py:.2f} m<extra></extra>",
        ))

    # ── Particle trajectory ───────────────────────────────────────────────────

    if traj_x is not None and len(traj_x) > 1:
        fig.add_trace(go.Scatter(
            x=traj_x,
            y=traj_y,
            mode="lines",
            line=dict(color=COLOURS["highlight"], width=2.5),
            name="Trajectory",
            hovertemplate="x=%{x:.2f}<br>y=%{y:.2f}<extra></extra>",
        ))
        # Start and end markers
        fig.add_trace(go.Scatter(
            x=[traj_x[0]],
            y=[traj_y[0]],
            mode="markers",
            marker=dict(size=10, color=COLOURS["tertiary"], symbol="circle"),
            name="Start",
            showlegend=True,
        ))
        if len(traj_x) > 1:
            fig.add_trace(go.Scatter(
                x=[traj_x[-1]],
                y=[traj_y[-1]],
                mode="markers",
                marker=dict(size=10, color=COLOURS["highlight"], symbol="square"),
                name="End",
                showlegend=True,
            ))

    # ── Layout ────────────────────────────────────────────────────────────────

    fig.update_layout(
        **plotly_layout(
            title=dict(text=title, font=dict(size=14)),
            height=560,
            xaxis=dict(
                title="x (m)",
                range=[-GRID_RANGE, GRID_RANGE],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
                scaleanchor="y",
                scaleratio=1,
            ),
            yaxis=dict(
                title="y (m)",
                range=[-GRID_RANGE, GRID_RANGE],
                gridcolor=COLOURS["grid"],
                linecolor=COLOURS["grid"],
                zerolinecolor=COLOURS["grid"],
            ),
            legend=dict(
                x=0.01, y=0.99,
                bgcolor="rgba(0,0,0,0.5)",
                bordercolor=COLOURS["grid"],
                borderwidth=1,
                font=dict(size=10),
            ),
            margin=dict(l=55, r=30, t=55, b=55),
        )
    )

    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Comparison figure (advanced)
# ─────────────────────────────────────────────────────────────────────────────

def build_comparison_figure(
    X: np.ndarray,
    Y: np.ndarray,
    Ex: np.ndarray, Ey: np.ndarray, Ve: np.ndarray,
    gx: np.ndarray, gy: np.ndarray, Vg: np.ndarray,
) -> go.Figure:
    """
    Build a side-by-side Plotly figure comparing electric and gravitational fields.

    Left  : electric dipole (±q)
    Right : two equal gravitational masses

    Parameters
    ----------
    X, Y : meshgrid arrays
    Ex, Ey, Ve : electric field components and potential
    gx, gy, Vg : gravitational field components and potential

    Returns
    -------
    go.Figure with 1 row × 2 cols subplots
    """
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=["Electric Field (dipole ±q)", "Gravitational Field (two masses)"],
        horizontal_spacing=0.12,
    )

    Ve_plot = np.clip(Ve, -5e10, 5e10)
    Vg_plot = np.clip(Vg, -1e-7, 0.0)

    # ── Electric contour ─────────────────────────────────────────────────────

    fig.add_trace(go.Contour(
        x=X[0, :], y=Y[:, 0], z=Ve_plot,
        colorscale="RdBu", ncontours=25,
        contours=dict(coloring="fill", showlabels=False),
        line=dict(width=0.4, color="rgba(255,255,255,0.25)"),
        showscale=True,
        colorbar=dict(x=0.44, thickness=10, len=0.8, title=dict(text="V (V)", side="right"),
                      tickfont=dict(size=8)),
        name="V electric",
        showlegend=False,
        opacity=0.85,
    ), row=1, col=1)

    for tr in build_quiver_traces(X, Y, Ex, Ey, COLOURS["text"], name="E field"):
        tr.showlegend = False
        fig.add_trace(tr, row=1, col=1)

    # ── Gravitational contour ────────────────────────────────────────────────

    fig.add_trace(go.Contour(
        x=X[0, :], y=Y[:, 0], z=Vg_plot,
        colorscale="Blues_r", ncontours=25,
        contours=dict(coloring="fill", showlabels=False),
        line=dict(width=0.4, color="rgba(255,255,255,0.25)"),
        showscale=True,
        colorbar=dict(x=1.01, thickness=10, len=0.8, title=dict(text="Vg (J/kg)", side="right"),
                      tickfont=dict(size=8)),
        name="Vg grav",
        showlegend=False,
        opacity=0.85,
    ), row=1, col=2)

    for tr in build_quiver_traces(X, Y, gx, gy, COLOURS["text"], name="g field"):
        tr.showlegend = False
        fig.add_trace(tr, row=1, col=2)

    # Source markers
    for col_idx, markers in [
        (1, [(-2, 0, "+q", COLOURS["highlight"]), (2, 0, "−q", COLOURS["primary"])]),
        (2, [(-2, 0, "M", COLOURS["secondary"]),  (2, 0, "M", COLOURS["secondary"])]),
    ]:
        for mx, my, lbl, col in markers:
            fig.add_trace(go.Scatter(
                x=[mx], y=[my],
                mode="markers+text",
                marker=dict(size=12, color=col,
                            line=dict(color=COLOURS["text"], width=1.2),
                            symbol="circle"),
                text=[lbl],
                textposition="top center",
                textfont=dict(size=10, color=col),
                showlegend=False,
                hoverinfo="skip",
            ), row=1, col=col_idx)

    fig.update_layout(
        **plotly_layout(
            height=440,
            margin=dict(l=55, r=60, t=60, b=55),
        )
    )

    for col_idx in (1, 2):
        fig.update_xaxes(
            title_text="x (m)", range=[-GRID_RANGE, GRID_RANGE],
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            scaleanchor=f"y{'' if col_idx == 1 else col_idx}",
            scaleratio=1,
            row=1, col=col_idx,
        )
        fig.update_yaxes(
            title_text="y (m)", range=[-GRID_RANGE, GRID_RANGE],
            gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
            row=1, col=col_idx,
        )

    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Energy conservation figure
# ─────────────────────────────────────────────────────────────────────────────

def build_energy_figure(
    t_arr: np.ndarray,
    ke_arr: np.ndarray,
    pe_arr: np.ndarray,
    field_type: str,
) -> go.Figure:
    """
    Build KE + PE vs time figure to verify energy conservation.

    Parameters
    ----------
    t_arr    : time array (s)
    ke_arr   : kinetic energy array (J)
    pe_arr   : potential energy array (J)
    field_type : 'Electric' or 'Gravitational' (for axis labelling)

    Returns
    -------
    go.Figure
    """
    total = ke_arr + pe_arr

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t_arr, y=ke_arr,
        mode="lines",
        name="KE",
        line=dict(color=COLOURS["secondary"], width=2),
    ))
    fig.add_trace(go.Scatter(
        x=t_arr, y=pe_arr,
        mode="lines",
        name="PE",
        line=dict(color=COLOURS["primary"], width=2),
    ))
    fig.add_trace(go.Scatter(
        x=t_arr, y=total,
        mode="lines",
        name="Total E",
        line=dict(color=COLOURS["tertiary"], width=2.5, dash="dash"),
    ))

    fig.update_layout(
        **plotly_layout(
            title=dict(text="Energy Conservation", font=dict(size=13)),
            height=240,
            xaxis=dict(title="Time t (s)", gridcolor=COLOURS["grid"],
                       linecolor=COLOURS["grid"]),
            yaxis=dict(title="Energy (J)", gridcolor=COLOURS["grid"],
                       linecolor=COLOURS["grid"]),
            margin=dict(l=60, r=30, t=45, b=50),
            legend=dict(x=0.75, y=0.98),
        )
    )

    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Trajectory integration helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_electric_deriv(X, Y, Ex, Ey, q_test, m_test):
    """
    Return ODE derivative function for a test charge in an electric field.

    State vector: [x, y, vx, vy].
    Acceleration: a = (q/m) * E  (interpolated from grid).

    Parameters
    ----------
    X, Y  : meshgrid arrays
    Ex, Ey: electric field components
    q_test: test charge (C)
    m_test: test mass (kg)

    Returns
    -------
    f(t, y) → dy/dt
    """
    def deriv(t, y):
        px, py = y[0], y[1]
        vx, vy = y[2], y[3]
        Efx = bilinear_interp(X, Y, Ex, px, py)
        Efy = bilinear_interp(X, Y, Ey, px, py)
        ax = (q_test / m_test) * Efx
        ay = (q_test / m_test) * Efy
        return np.array([vx, vy, ax, ay])
    return deriv


def make_gravitational_deriv(X, Y, gx, gy):
    """
    Return ODE derivative function for a test mass in a gravitational field.

    State vector: [x, y, vx, vy].
    Acceleration: a = g  (same for all test masses).

    Parameters
    ----------
    X, Y  : meshgrid arrays
    gx, gy: gravitational field components

    Returns
    -------
    f(t, y) → dy/dt
    """
    def deriv(t, y):
        px, py = y[0], y[1]
        vx, vy = y[2], y[3]
        ax = bilinear_interp(X, Y, gx, px, py)
        ay = bilinear_interp(X, Y, gy, px, py)
        return np.array([vx, vy, ax, ay])
    return deriv


def integrate_trajectory(
    deriv,
    x0: float, y0: float,
    vx0: float, vy0: float,
    t_end: float = 5.0,
    dt: float = 0.005,
    domain: float = GRID_RANGE,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Integrate test-particle trajectory, stopping if it leaves the domain.

    Parameters
    ----------
    deriv         : derivative function f(t, y)
    x0, y0        : initial position (m)
    vx0, vy0      : initial velocity (m/s)
    t_end         : integration end time (s)
    dt            : RK4 time step (s)
    domain        : half-width of allowed domain (m)

    Returns
    -------
    t_arr, x_arr, y_arr, state_arr (full y array)
    """
    y_init = np.array([x0, y0, vx0, vy0], dtype=float)
    t_arr, y_arr = rk4_integrate(deriv, y_init, (0.0, t_end), dt)

    # Truncate when particle leaves domain
    xs = y_arr[:, 0]
    ys = y_arr[:, 1]
    out_of_bounds = np.where(
        (np.abs(xs) > domain) | (np.abs(ys) > domain)
    )[0]
    if len(out_of_bounds) > 0:
        cut = out_of_bounds[0]
        t_arr  = t_arr[:cut + 1]
        y_arr  = y_arr[:cut + 1]

    return t_arr, y_arr[:, 0], y_arr[:, 1], y_arr


# ─────────────────────────────────────────────────────────────────────────────
# Main page
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point — render the full Electric & Gravitational Fields simulation page."""

    sim_header("⚡ Electric & Gravitational Fields", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ──────────────────────────────────────────────────────────────────────────
    # LEFT COLUMN — Controls
    # ──────────────────────────────────────────────────────────────────────────

    with left_col:
        mode = mode_toggle()

        st.markdown("### Field selector")

        field_type = st.radio(
            "Field type",
            ["Electric Field", "Gravitational Field"],
            horizontal=False,
            label_visibility="collapsed",
        )

        # ── Preset configurations ─────────────────────────────────────────────

        # Preset definitions — keyed by field_type
        _ELECTRIC_PRESETS: dict[str, dict] = {
            "Custom": {
                "context": None,
                "charges": None,   # None → use sliders
            },
            "Electric dipole (±)": {
                "context": (
                    "A water molecule acts as an electric dipole. "
                    "This is why water is such a good solvent."
                ),
                "charges": [
                    (+3e-9, -2.0, 0.0),
                    (-3e-9,  2.0, 0.0),
                ],
            },
            "Two equal positive charges": {
                "context": (
                    "Like charges repel. There is a saddle point (unstable equilibrium) "
                    "midway between them."
                ),
                "charges": [
                    (+2e-9, -2.0, 0.0),
                    (+2e-9,  2.0, 0.0),
                ],
            },
            "Capacitor plates (approx)": {
                "context": (
                    "Between parallel plates, the field is approximately uniform "
                    "— the basis of every capacitor."
                ),
                "charges": [
                    (+5e-9, -1.0, -1.0),
                    (+5e-9, -1.0,  1.0),
                    (-5e-9,  1.0, -1.0),
                    (-5e-9,  1.0,  1.0),
                ],
            },
            "Three-phase symmetry": {
                "context": (
                    "Three-fold symmetry: the field cancels exactly at the centre."
                ),
                "charges": [
                    (+3e-9,  0.0,   2.0),
                    (+3e-9, -1.73, -1.0),
                    (+3e-9,  1.73, -1.0),
                ],
            },
        }

        _GRAV_PRESETS: dict[str, dict] = {
            "Custom": {
                "context": None,
                "masses": None,   # None → use sliders
            },
            "Earth-Moon system": {
                "context": (
                    "The Lagrange L1 point (between them) is where gravitational pulls exactly "
                    "balance. The DSCOVR spacecraft orbits there."
                ),
                "masses": [
                    (5.97e24, -2.0, 0.0),
                    (7.34e22,  2.0, 0.0),
                ],
            },
            "Binary star (equal masses)": {
                "context": (
                    "About half of all stars are in binary systems. Both stars orbit their "
                    "common centre of mass."
                ),
                "masses": [
                    (2e30, -2.0, 0.0),
                    (2e30,  2.0, 0.0),
                ],
            },
            "Star + giant planet": {
                "context": (
                    "Jupiter is 1/1000th the mass of the Sun. The Sun actually wobbles slightly "
                    "— this is how exoplanets are detected (radial velocity method)."
                ),
                "masses": [
                    (2e30, -1.0, 0.0),
                    (1.9e27, 2.0, 0.0),
                ],
            },
        }

        preset_map = _ELECTRIC_PRESETS if field_type == "Electric Field" else _GRAV_PRESETS
        preset_names = list(preset_map.keys())

        preset_key = f"preset_{field_type}"
        if preset_key not in st.session_state:
            st.session_state[preset_key] = "Custom"

        selected_preset = st.selectbox(
            "Preset configuration",
            options=preset_names,
            index=preset_names.index(st.session_state[preset_key])
            if st.session_state[preset_key] in preset_names else 0,
            key=f"selectbox_{field_type}",
        )
        st.session_state[preset_key] = selected_preset

        preset_data = preset_map[selected_preset]
        if preset_data["context"]:
            st.info(preset_data["context"])

        # ── Electric field controls ───────────────────────────────────────────

        charges_list: list[tuple[float, float, float]] = []  # (q_C, x, y)
        masses_list:  list[tuple[float, float, float]] = []  # (M, x, y)

        if field_type == "Electric Field":

            # If a preset is active, bypass sliders
            if selected_preset != "Custom" and preset_data.get("charges"):
                charges_list = list(preset_data["charges"])
                st.markdown("### Charges")
                st.caption(
                    f"{len(charges_list)} charges defined by preset. "
                    "Select **Custom** above to adjust individually."
                )
            else:
                st.markdown("### Charges")

                n_charges = st.slider(
                    "Number of charges", min_value=1, max_value=4, value=2, step=1,
                )

                for i in range(n_charges):
                    def_x, def_y = _DEFAULT_POS[i]
                    with st.expander(f"Charge {i + 1}", expanded=(i < 2)):
                        cx = st.slider(
                            f"x position (m)##{i}",
                            min_value=-5.0, max_value=5.0,
                            value=def_x, step=0.5,
                            format="%.1f",
                            label_visibility="visible",
                            key=f"charge_x_{i}",
                        )
                        cy = st.slider(
                            f"y position (m)##{i}",
                            min_value=-5.0, max_value=5.0,
                            value=def_y, step=0.5,
                            format="%.1f",
                            key=f"charge_y_{i}",
                        )
                        cmag = st.slider(
                            f"Magnitude (nC)##{i}",
                            min_value=0.1, max_value=10.0,
                            value=1.0, step=0.1,
                            format="%.1f",
                            key=f"charge_mag_{i}",
                            help="1 nC = 1×10⁻⁹ C",
                        )
                        csign = st.radio(
                            f"Sign##{i}",
                            ["+", "−"],
                            horizontal=True,
                            key=f"charge_sign_{i}",
                        )
                        sign_val = +1.0 if csign == "+" else -1.0
                        q_C = sign_val * cmag * 1e-9   # convert nC → C
                        charges_list.append((q_C, cx, cy))

        # ── Gravitational field controls ──────────────────────────────────────

        else:

            # If a preset is active, bypass sliders
            if selected_preset != "Custom" and preset_data.get("masses"):
                masses_list = list(preset_data["masses"])
                st.markdown("### Masses")
                st.caption(
                    f"{len(masses_list)} masses defined by preset. "
                    "Select **Custom** above to adjust individually."
                )
            else:
                st.markdown("### Masses")

                n_masses = st.slider(
                    "Number of masses", min_value=1, max_value=3, value=2, step=1,
                )

                for i in range(n_masses):
                    def_x, def_y = _DEFAULT_MASS_POS[i]
                    with st.expander(f"Mass {i + 1}", expanded=(i < 2)):
                        mx = st.slider(
                            f"x position (m)##{i}",
                            min_value=-5.0, max_value=5.0,
                            value=def_x, step=0.5,
                            format="%.1f",
                            key=f"mass_x_{i}",
                        )
                        my = st.slider(
                            f"y position (m)##{i}",
                            min_value=-5.0, max_value=5.0,
                            value=def_y, step=0.5,
                            format="%.1f",
                            key=f"mass_y_{i}",
                        )
                        # Log-scale mass slider: map [0,1] to [1e10, 1e13]
                        m_log = st.slider(
                            f"log₁₀(Mass / kg)##{i}",
                            min_value=10.0, max_value=13.0,
                            value=12.0, step=0.1,
                            format="%.1f",
                            key=f"mass_val_{i}",
                            help="Slide to set mass on a log scale. 12 → 1×10¹² kg",
                        )
                        M_val = 10.0 ** m_log
                        st.caption(f"M = {M_val:.2e} kg")
                        masses_list.append((M_val, mx, my))

        # ── Probe point controls ──────────────────────────────────────────────

        st.markdown("### Probe point")

        probe_x = st.slider(
            "Probe x (m)",
            min_value=-5.0, max_value=5.0,
            value=3.0, step=0.25, format="%.2f",
            key="probe_x",
        )
        probe_y = st.slider(
            "Probe y (m)",
            min_value=-5.0, max_value=5.0,
            value=3.0, step=0.25, format="%.2f",
            key="probe_y",
        )

        # ── Advanced controls ─────────────────────────────────────────────────

        show_comparison = False
        launch_particle = False
        p_x0 = p_y0 = p_vx0 = p_vy0 = 0.0
        q_test = 1e-9
        m_test = 1e-3

        if mode == "Advanced":
            advanced_divider()

            show_comparison = st.checkbox(
                "Show electric vs gravitational comparison",
                value=False,
                help="Renders a side-by-side dipole comparison. May take a moment.",
            )

            st.markdown("---")
            launch_particle = st.checkbox(
                "Launch test particle",
                value=False,
                help="Integrate a particle trajectory in the current field using RK4.",
            )

            if launch_particle:
                st.markdown("**Initial conditions**")
                p_x0 = st.slider(
                    "Particle x₀ (m)",
                    min_value=-5.0, max_value=5.0,
                    value=0.0, step=0.25, format="%.2f",
                    key="part_x0",
                )
                p_y0 = st.slider(
                    "Particle y₀ (m)",
                    min_value=-5.0, max_value=5.0,
                    value=-3.0, step=0.25, format="%.2f",
                    key="part_y0",
                )
                p_vx0 = st.slider(
                    "Initial vx₀ (m/s)",
                    min_value=-20.0, max_value=20.0,
                    value=5.0, step=0.5, format="%.1f",
                    key="part_vx0",
                )
                p_vy0 = st.slider(
                    "Initial vy₀ (m/s)",
                    min_value=-20.0, max_value=20.0,
                    value=5.0, step=0.5, format="%.1f",
                    key="part_vy0",
                )

                if field_type == "Electric Field":
                    q_test_nc = st.slider(
                        "Test charge q (nC, signed)",
                        min_value=-10.0, max_value=10.0,
                        value=1.0, step=0.1, format="%.1f",
                        key="q_test_nc",
                        help="Positive → follows field lines. Negative → opposite.",
                    )
                    q_test = q_test_nc * 1e-9
                    m_test = st.slider(
                        "Test mass m (g)",
                        min_value=0.1, max_value=100.0,
                        value=1.0, step=0.1, format="%.1f",
                        key="m_test_g",
                    ) * 1e-3
                else:
                    st.info("Test mass = 1 kg (gravitational acceleration is independent of mass).")
                    m_test = 1.0

    # ──────────────────────────────────────────────────────────────────────────
    # RIGHT COLUMN — Plots and metrics
    # ──────────────────────────────────────────────────────────────────────────

    with right_col:

        # ── Compute field ─────────────────────────────────────────────────────

        if field_type == "Electric Field":
            charges_key = tuple(charges_list)
            X, Y, Fx, Fy, V = compute_electric_field(charges_key)
            v_clip = 5e10
            colorscale = "RdBu"
            field_label = "E field"
            pot_label = "V (V)"

            # Source markers
            source_markers = []
            field_line_sources = []
            for q_C, cx, cy in charges_list:
                sign_str = "+" if q_C > 0 else "−"
                mag_nc = abs(q_C) * 1e9
                lbl = f"{sign_str}{mag_nc:.1f} nC"
                col = COLOURS["highlight"] if q_C > 0 else COLOURS["primary"]
                source_markers.append((cx, cy, lbl, col))
                sign = +1 if q_C >= 0 else -1
                field_line_sources.append((cx, cy, sign))

            plot_title = "Electric Field — Equipotentials, Field Lines & Vectors"

        else:
            masses_key = tuple(masses_list)
            X, Y, Fx, Fy, V = compute_gravitational_field(masses_key)
            v_clip = abs(V).max() * 1.05 + 1e-30
            colorscale = "Blues_r"
            field_label = "g field"
            pot_label = "Vg (J/kg)"

            source_markers = []
            field_line_sources = []
            for M_val, mx, my in masses_list:
                lbl = f"{M_val:.1e} kg"
                source_markers.append((mx, my, lbl, COLOURS["secondary"]))
                field_line_sources.append((mx, my, +1))  # sign irrelevant for gravity seeding

            plot_title = "Gravitational Field — Equipotentials, Field Lines & Vectors"

        # ── Probe readout ─────────────────────────────────────────────────────

        Fx_probe = bilinear_interp(X, Y, Fx, probe_x, probe_y)
        Fy_probe = bilinear_interp(X, Y, Fy, probe_x, probe_y)
        F_mag    = float(np.hypot(Fx_probe, Fy_probe))
        V_probe  = bilinear_interp(X, Y, V, probe_x, probe_y)

        if field_type == "Electric Field":
            metric_row({
                "E at probe (V/m)": f"{F_mag:.3e}",
                "V at probe (V)":   f"{V_probe:.3e}",
            })
            st.caption(
                "⚡ Real measurements: E field near thundercloud base ≈ 10,000 V/m. "
                "E field that ionises air ≈ 3×10⁶ V/m (dielectric breakdown). "
                "E inside a cell membrane ≈ 10⁷ V/m."
            )
        else:
            metric_row({
                "g at probe (N/kg)": f"{F_mag:.3e}",
                "Vg at probe (J/kg)": f"{V_probe:.3e}",
            })
            st.caption(
                "🌍 Real measurements: g at Earth's surface = 9.81 N/kg. "
                "g at ISS altitude (408 km) = 8.69 N/kg (only 11% less!). "
                "g at Moon's surface = 1.62 N/kg."
            )

        # ── Test-particle trajectory ──────────────────────────────────────────

        traj_x = traj_y = None
        t_traj = ke_arr = pe_arr = None

        if mode == "Advanced" and launch_particle:
            try:
                if field_type == "Electric Field":
                    deriv_fn = make_electric_deriv(X, Y, Fx, Fy, q_test, m_test)
                else:
                    deriv_fn = make_gravitational_deriv(X, Y, Fx, Fy)

                t_traj, traj_x, traj_y, state_arr = integrate_trajectory(
                    deriv_fn, p_x0, p_y0, p_vx0, p_vy0,
                )

                # Energy arrays
                vx_arr = state_arr[:, 2]
                vy_arr = state_arr[:, 3]
                ke_arr = 0.5 * m_test * (vx_arr**2 + vy_arr**2)

                # PE: q*V or m*Vg, interpolated along trajectory
                V_along = np.array([
                    bilinear_interp(X, Y, V, traj_x[k], traj_y[k])
                    for k in range(len(traj_x))
                ])
                if field_type == "Electric Field":
                    pe_arr = q_test * V_along
                else:
                    pe_arr = m_test * V_along

            except Exception as exc:
                st.warning(f"Trajectory integration failed: {exc}")

        # ── Main field figure ─────────────────────────────────────────────────

        fig_field = build_field_figure(
            X, Y, Fx, Fy, V,
            title=plot_title,
            colorscale=colorscale,
            v_clip=v_clip,
            source_markers=source_markers,
            field_line_sources=field_line_sources,
            field_type="electric" if field_type == "Electric Field" else "gravitational",
            traj_x=traj_x,
            traj_y=traj_y,
            probe_xy=(probe_x, probe_y),
            field_name=field_label,
        )

        st.plotly_chart(fig_field, use_container_width=True)

        # ── Field strength vs distance (Basic mode) ───────────────────────────

        if mode == "Basic":
            show_fvd = st.checkbox(
                "Show field vs distance graph",
                value=False,
                key="show_field_vs_dist",
            )
            if show_fvd:
                r_arr = np.linspace(0.5, 6.0, 300)

                if field_type == "Electric Field" and charges_list:
                    q_first = charges_list[0][0]   # first charge (C)
                    F_arr = k_e * abs(q_first) / r_arr ** 2
                    y_label = "E (V/m)"
                    title_fvd = f"Electric field strength vs distance (first charge: {q_first*1e9:.2f} nC)"
                    E_1m = k_e * abs(q_first) / 1.0 ** 2
                    E_2m = k_e * abs(q_first) / 2.0 ** 2
                    ratio = E_1m / (E_2m + 1e-30)
                    cols_fvd = st.columns(3)
                    cols_fvd[0].metric("E at r = 1 m", f"{E_1m:.3e} V/m")
                    cols_fvd[1].metric("E at r = 2 m", f"{E_2m:.3e} V/m")
                    cols_fvd[2].metric(
                        "Ratio (expect 4.0 for double distance)",
                        f"{ratio:.2f}",
                    )
                else:
                    M_first = masses_list[0][0] if masses_list else 1e12
                    F_arr = G * M_first / r_arr ** 2
                    y_label = "g (N/kg)"
                    title_fvd = f"Gravitational field strength vs distance (first mass: {M_first:.2e} kg)"
                    E_1m = G * M_first / 1.0 ** 2
                    E_2m = G * M_first / 2.0 ** 2
                    ratio = E_1m / (E_2m + 1e-30)
                    cols_fvd = st.columns(3)
                    cols_fvd[0].metric("g at r = 1 m", f"{E_1m:.3e} N/kg")
                    cols_fvd[1].metric("g at r = 2 m", f"{E_2m:.3e} N/kg")
                    cols_fvd[2].metric(
                        "Ratio (expect 4.0 for double distance)",
                        f"{ratio:.2f}",
                    )

                # Log-log chart (slope = -2 ↔ inverse-square law)
                fig_fvd = go.Figure()
                fig_fvd.add_trace(go.Scatter(
                    x=r_arr,
                    y=F_arr,
                    mode="lines",
                    line=dict(
                        color=COLOURS["primary"] if field_type == "Electric Field"
                        else COLOURS["secondary"],
                        width=2,
                    ),
                    name=y_label,
                    hovertemplate="r=%{x:.2f} m<br>" + y_label + "=%{y:.3e}<extra></extra>",
                ))
                fig_fvd.add_annotation(
                    x=0.72, y=0.85,
                    xref="paper", yref="paper",
                    text="Slope = −2 confirms inverse-square law",
                    showarrow=False,
                    font=dict(size=11, color=COLOURS["text"]),
                    bgcolor="rgba(0,0,0,0.5)",
                    bordercolor=COLOURS["grid"],
                    borderwidth=1,
                )
                fig_fvd.update_layout(
                    **plotly_layout(
                        title=dict(text=title_fvd, font=dict(size=13)),
                        height=300,
                        xaxis=dict(
                            title="r (m)",
                            type="log",
                            gridcolor=COLOURS["grid"],
                            linecolor=COLOURS["grid"],
                        ),
                        yaxis=dict(
                            title=y_label,
                            type="log",
                            gridcolor=COLOURS["grid"],
                            linecolor=COLOURS["grid"],
                        ),
                        margin=dict(l=60, r=30, t=55, b=50),
                    )
                )
                st.plotly_chart(fig_fvd, use_container_width=True)

        # ── Energy conservation plot ──────────────────────────────────────────

        if mode == "Advanced" and launch_particle and t_traj is not None and ke_arr is not None:
            total_E = ke_arr + pe_arr
            E_drift = float(np.max(np.abs(total_E - total_E[0])))
            E_rel   = E_drift / (abs(total_E[0]) + 1e-30)
            st.caption(
                f"Energy drift: {E_drift:.3e} J  "
                f"({E_rel * 100:.3f}% relative) — "
                "small drift is expected from finite RK4 step size."
            )
            fig_energy = build_energy_figure(t_traj, ke_arr, pe_arr, field_type)
            st.plotly_chart(fig_energy, use_container_width=True)

        # ── Advanced: comparison ──────────────────────────────────────────────

        if mode == "Advanced" and show_comparison:
            st.markdown("---")
            st.markdown(
                f"<p style='color:{COLOURS['advanced']};font-weight:600;"
                "font-size:1.0rem'>⚗️ Electric vs Gravitational Comparison</p>",
                unsafe_allow_html=True,
            )

            # Fixed comparison layout: dipole ±q and two equal masses at (±2, 0)
            COMP_Q = 3e-9   # 3 nC
            COMP_M = 1e12   # 1×10¹² kg
            comp_charges = ((+COMP_Q, -2.0, 0.0), (-COMP_Q, 2.0, 0.0))
            comp_masses  = ((COMP_M,  -2.0, 0.0), (COMP_M,  2.0, 0.0))

            Xc, Yc, Exc, Eyc, Vec = compute_electric_field(comp_charges)
            _,  _,  gxc, gyc, Vgc = compute_gravitational_field(comp_masses)

            fig_comp = build_comparison_figure(Xc, Yc, Exc, Eyc, Vec, gxc, gyc, Vgc)
            st.plotly_chart(fig_comp, use_container_width=True)

            # Comparison table
            st.markdown("""
| Property | Electric | Gravitational |
|---|---|---|
| Source | Charge *q* | Mass *M* |
| Force law | *F* = k_e q₁q₂/r² | *F* = GM₁M₂/r² |
| Field | *E* = k_e q/r² | *g* = GM/r² |
| Potential | *V* = k_e q/r | *Vg* = −GM/r |
| Can be repulsive? | **Yes** | **No** |
| Constant | k_e = 8.988×10⁹ N m² C⁻² | G = 6.674×10⁻¹¹ N m² kg⁻² |
| Relative strength | ~10³⁶ × gravity | Weakest fundamental force |
""")

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
    main()
