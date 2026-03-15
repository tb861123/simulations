"""
Airfoil and Body Geometry Generation
=====================================
- NACA 4-digit series with cosine panel spacing
- Image silhouette import (PNG → contour → panels)
- Interactive spline drawing (control points → smooth body)
- Arbitrary coordinate file import (Selig/Lednicer formats)
- Panel generation for the Hess-Smith solver
"""

import numpy as np
from typing import List, Tuple, Optional
from .panel_method import Panel


# ============================================================
# IMAGE SILHOUETTE IMPORT
# ============================================================

def contour_from_image(filepath: str, n_panels: int = 100,
                       chord: float = 1.0, x_center: float = 0.0,
                       y_center: float = 0.0) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extract the largest closed contour from a black-on-white PNG image.

    Requirements for the input image:
      - Single dark shape on a light/white background
      - Shape should be a single closed region (no holes or separate parts)
      - Minimum ~200px on the longest dimension for reasonable accuracy
      - PNG, JPG, or BMP format

    Returns:
        x, y: coordinate arrays (CCW ordered, normalised to chord length,
               centred at x_center, y_center)
    """
    try:
        from PIL import Image
    except ImportError:
        raise ImportError("Pillow is required for image import: pip install Pillow")

    # Load and convert to grayscale
    img = Image.open(filepath).convert('L')
    arr = np.array(img, dtype=np.float64)

    # Threshold: Otsu-style (use mean of min/max as simple threshold)
    threshold = (arr.min() + arr.max()) / 2.0
    binary = (arr < threshold).astype(np.uint8)  # 1 = shape, 0 = background

    # Find contours using marching squares
    contours = _find_contours(binary)

    if not contours:
        raise ValueError("No contours found in image. Ensure the shape is dark on a light background.")

    # Take the longest contour
    contour = max(contours, key=len)

    if len(contour) < 10:
        raise ValueError(f"Contour too small ({len(contour)} points). Use a larger/clearer image.")

    # Contour is in pixel coords (row, col). Convert to (x, y) with y flipped.
    px = contour[:, 1].astype(np.float64)  # col → x
    py = contour[:, 0].astype(np.float64)  # row → y (top-down)

    # Normalise to unit scale centred at origin
    px -= (px.min() + px.max()) / 2
    py -= (py.min() + py.max()) / 2
    # Flip y so that "up" in the image is "up" in simulation
    py = -py
    # Scale to unit chord
    span = max(px.max() - px.min(), py.max() - py.min())
    if span > 0:
        px /= span
        py /= span

    # Ensure CCW winding
    area = 0.0
    n = len(px)
    for i in range(n):
        j = (i + 1) % n
        area += px[i] * py[j] - px[j] * py[i]
    if area < 0:
        px = px[::-1]
        py = py[::-1]

    # Resample to desired panel count with cosine spacing
    px, py = _resample_contour(px, py, n_panels)

    # Scale and translate
    px = px * chord + x_center
    py = py * chord + y_center

    return px, py


def _find_contours(binary: np.ndarray) -> List[np.ndarray]:
    """
    Simple contour finder using boundary tracing.
    Returns list of (N, 2) arrays of (row, col) points.
    """
    h, w = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    contours = []

    # Moore neighbourhood (8-connected), clockwise from right
    dirs = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]

    for r in range(1, h - 1):
        for c in range(1, w - 1):
            # Find boundary pixel: shape pixel with at least one background neighbour
            if binary[r, c] == 1 and not visited[r, c]:
                # Check if it's on the boundary
                is_boundary = False
                for dr, dc in dirs:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and binary[nr, nc] == 0:
                        is_boundary = True
                        break

                if not is_boundary:
                    continue

                # Trace this contour using Moore boundary tracing
                contour = []
                cr, cc = r, c
                start_r, start_c = r, c
                # Find initial backtrack direction (the background pixel we came from)
                prev_dir = 4  # start looking from left
                steps = 0
                max_steps = h * w  # safety limit

                while steps < max_steps:
                    contour.append((cr, cc))
                    visited[cr, cc] = True

                    # Search clockwise from the direction we came from
                    found = False
                    start_search = (prev_dir + 5) % 8  # start from prev_dir - 3 (backtrack + 1 CCW)

                    for di in range(8):
                        d = (start_search + di) % 8
                        dr, dc = dirs[d]
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < h and 0 <= nc < w and binary[nr, nc] == 1:
                            cr, cc = nr, nc
                            prev_dir = d
                            found = True
                            break

                    if not found:
                        break

                    steps += 1

                    # Check if we've returned to start
                    if cr == start_r and cc == start_c and steps > 2:
                        break

                if len(contour) > 20:
                    contours.append(np.array(contour))

    return contours


def _resample_contour(x: np.ndarray, y: np.ndarray, n_panels: int) -> Tuple[np.ndarray, np.ndarray]:
    """Resample a closed contour to n_panels+1 points with uniform arc-length spacing."""
    # Close if needed
    if np.hypot(x[-1] - x[0], y[-1] - y[0]) > 1e-8:
        x = np.append(x, x[0])
        y = np.append(y, y[0])

    # Arc-length parameterisation
    dx = np.diff(x); dy = np.diff(y)
    ds = np.sqrt(dx**2 + dy**2)
    s = np.zeros(len(x))
    s[1:] = np.cumsum(ds)
    s_total = s[-1]

    if s_total < 1e-10:
        raise ValueError("Contour has zero length")

    s_norm = s / s_total

    # Target: uniform spacing (cosine is less suitable for arbitrary shapes)
    n_new = n_panels + 1
    s_target = np.linspace(0, 1, n_new, endpoint=True)
    # Last point will duplicate first (closed contour)
    s_target[-1] = 1.0 - 1e-10  # avoid exact wrap

    # Interpolate
    x_new = np.interp(s_target, s_norm, x)
    y_new = np.interp(s_target, s_norm, y)

    # Force closure
    x_new[-1] = x_new[0]
    y_new[-1] = y_new[0]

    return x_new, y_new


# ============================================================
# SPLINE FROM CONTROL POINTS (for drawing tool)
# ============================================================

def spline_from_control_points(ctrl_x: np.ndarray, ctrl_y: np.ndarray,
                                n_panels: int = 100,
                                chord: float = 1.0,
                                x_center: float = 0.0,
                                y_center: float = 0.0,
                                closed: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate a smooth closed curve through control points using cubic spline
    interpolation, then resample to n_panels points.

    Args:
        ctrl_x, ctrl_y: control point coordinates (in simulation space)
        n_panels: number of output panels
        chord: not used for rescaling (points are already in sim space)
        x_center, y_center: not used (points are already positioned)
        closed: if True, close the spline loop

    Returns:
        x, y: resampled coordinate arrays (CCW, closed)
    """
    n = len(ctrl_x)
    if n < 3:
        raise ValueError("Need at least 3 control points to form a shape")

    # Close the control points if needed
    if closed:
        cx = np.append(ctrl_x, ctrl_x[0])
        cy = np.append(ctrl_y, ctrl_y[0])
    else:
        cx = ctrl_x.copy()
        cy = ctrl_y.copy()

    # Parameterise by cumulative chord length
    dx = np.diff(cx); dy = np.diff(cy)
    ds = np.sqrt(dx**2 + dy**2)
    t = np.zeros(len(cx))
    t[1:] = np.cumsum(ds)
    t_total = t[-1]

    if t_total < 1e-10:
        raise ValueError("Control points are too close together")

    # Dense sampling along the spline
    n_dense = max(n_panels * 4, 500)
    t_dense = np.linspace(0, t_total, n_dense)

    # Cubic spline interpolation (periodic if closed)
    try:
        from scipy.interpolate import CubicSpline
        if closed:
            # For periodic spline, ensure endpoints match
            cs_x = CubicSpline(t, cx, bc_type='periodic')
            cs_y = CubicSpline(t, cy, bc_type='periodic')
        else:
            cs_x = CubicSpline(t, cx, bc_type='natural')
            cs_y = CubicSpline(t, cy, bc_type='natural')
        x_dense = cs_x(t_dense)
        y_dense = cs_y(t_dense)
    except ImportError:
        # Fallback: simple linear interpolation if scipy not available
        x_dense = np.interp(t_dense, t, cx)
        y_dense = np.interp(t_dense, t, cy)

    # Ensure CCW winding
    area = 0.0
    for i in range(len(x_dense)):
        j = (i + 1) % len(x_dense)
        area += x_dense[i] * y_dense[j] - x_dense[j] * y_dense[i]
    if area < 0:
        x_dense = x_dense[::-1]
        y_dense = y_dense[::-1]

    # Resample to desired panel count
    x_out, y_out = _resample_contour(x_dense, y_dense, n_panels)

    return x_out, y_out


def naca4_geometry(designation: str, n_panels: int = 80,
                   chord: float = 1.0, x_center: float = 0.0, y_center: float = 0.0,
                   angle_deg: float = 0.0) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate NACA 4-digit airfoil coordinates.

    Args:
        designation: e.g. "2412" -> 2% camber at 40% chord, 12% thickness
        n_panels: number of panels (points = n_panels + 1 for closed loop)
        chord: chord length
        x_center: x position of quarter-chord
        y_center: y position
        angle_deg: geometry rotation in degrees

    Returns:
        x, y: coordinate arrays ordered CCW (TE upper -> LE -> TE lower -> close)
    """
    if len(designation) != 4:
        raise ValueError(f"NACA designation must be 4 digits, got '{designation}'")

    m = int(designation[0]) / 100.0   # max camber
    p = int(designation[1]) / 10.0    # max camber position
    t = int(designation[2:]) / 100.0  # max thickness

    # Cosine spacing (clusters points at LE and TE)
    n_pts = n_panels // 2 + 1
    beta = np.linspace(0, np.pi, n_pts)
    xc = 0.5 * (1.0 - np.cos(beta))  # 0 to 1

    # Thickness distribution (NACA standard)
    yt = 5.0 * t * (0.2969 * np.sqrt(xc) - 0.1260 * xc - 0.3516 * xc**2
                     + 0.2843 * xc**3 - 0.1015 * xc**4)

    # Camber line
    yc = np.zeros_like(xc)
    dyc_dx = np.zeros_like(xc)

    if m > 0 and p > 0:
        front = xc <= p
        back = ~front
        yc[front] = (m / p**2) * (2.0 * p * xc[front] - xc[front]**2)
        yc[back] = (m / (1.0 - p)**2) * (1.0 - 2.0 * p + 2.0 * p * xc[back] - xc[back]**2)
        dyc_dx[front] = (2.0 * m / p**2) * (p - xc[front])
        dyc_dx[back] = (2.0 * m / (1.0 - p)**2) * (p - xc[back])

    theta = np.arctan(dyc_dx)

    # Upper and lower surfaces
    xu = xc - yt * np.sin(theta)
    yu = yc + yt * np.cos(theta)
    xl = xc + yt * np.sin(theta)
    yl = yc - yt * np.cos(theta)

    # Assemble CCW: TE upper -> LE -> TE lower
    x_upper = xu[::-1]         # TE to LE
    y_upper = yu[::-1]
    x_lower = xl[1:]           # LE to TE, skip duplicate LE
    y_lower = yl[1:]

    x = np.concatenate([x_upper, x_lower])
    y = np.concatenate([y_upper, y_lower])

    # Force trailing edge closure
    x_te = 0.5 * (x[0] + x[-1])
    y_te = 0.5 * (y[0] + y[-1])
    x[0] = x_te; y[0] = y_te
    x[-1] = x_te; y[-1] = y_te

    # Scale
    x *= chord
    y *= chord

    # Rotate around quarter-chord
    if angle_deg != 0.0:
        alpha = np.radians(angle_deg)
        xp = 0.25 * chord
        dx, dy = x - xp, y
        ca, sa = np.cos(alpha), np.sin(alpha)
        x = dx * ca - dy * sa + xp
        y = dx * sa + dy * ca

    # Translate (quarter-chord to x_center, y_center)
    x += x_center - 0.25 * chord
    y += y_center

    return x, y


def make_panels_from_coords(x: np.ndarray, y: np.ndarray, body_id: int = 0) -> List[Panel]:
    """Convert coordinate arrays to Panel objects. Closes the loop if needed."""
    # Close loop if not already closed
    if np.hypot(x[-1] - x[0], y[-1] - y[0]) > 1e-8:
        x = np.append(x, x[0])
        y = np.append(y, y[0])

    panels = []
    for i in range(len(x) - 1):
        panels.append(Panel(x[i], y[i], x[i + 1], y[i + 1], body_id))
    return panels


def make_cylinder_panels(x_center: float, y_center: float, radius: float,
                         n_panels: int = 64, body_id: int = 0) -> List[Panel]:
    """Generate panels for a circular cylinder (CCW)."""
    theta = np.linspace(0, 2 * np.pi, n_panels + 1)
    x = x_center + radius * np.cos(theta)
    y = y_center + radius * np.sin(theta)
    return make_panels_from_coords(x, y, body_id)


def make_square_panels(x_center: float, y_center: float, half_size: float,
                       angle_deg: float = 0.0, n_per_side: int = 16,
                       body_id: int = 0) -> List[Panel]:
    """Generate panels for a square obstacle (CCW)."""
    s = half_size
    n = n_per_side

    # CCW: right side up, top left, left down, bottom right
    xr = np.full(n + 1, s)
    yr = np.linspace(-s, s, n + 1)
    xt = np.linspace(s, -s, n + 1)
    yt = np.full(n + 1, s)
    xl = np.full(n + 1, -s)
    yl = np.linspace(s, -s, n + 1)
    xb = np.linspace(-s, s, n + 1)
    yb = np.full(n + 1, -s)

    x = np.concatenate([xr, xt[1:], xl[1:], xb[1:]])
    y = np.concatenate([yr, yt[1:], yl[1:], yb[1:]])

    if angle_deg != 0.0:
        a = np.radians(angle_deg)
        ca, sa = np.cos(a), np.sin(a)
        xr, yr = x * ca - y * sa, x * sa + y * ca
        x, y = xr, yr

    x += x_center
    y += y_center
    return make_panels_from_coords(x, y, body_id)


def make_naca_panels(designation: str, n_panels: int = 80,
                     chord: float = 1.0, x_center: float = 0.0,
                     y_center: float = 0.0, angle_deg: float = 0.0,
                     body_id: int = 0) -> List[Panel]:
    """Convenience: generate NACA airfoil and return Panel list."""
    x, y = naca4_geometry(designation, n_panels, chord, x_center, y_center, angle_deg)
    return make_panels_from_coords(x, y, body_id)
