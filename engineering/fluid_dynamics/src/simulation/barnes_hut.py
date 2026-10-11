"""
Barnes-Hut Quadtree for O(N log N) Vortex-Vortex Induction
===========================================================
Replaces the O(N²) mutual-induction loop when the vortex count exceeds
BARNES_HUT_THRESHOLD.

Algorithm:
  1. Build a quadtree from the N free-vortex positions in O(N log N).
  2. For each vortex i, traverse the tree.  If a node is "far enough"
     (node_size / distance < THETA), treat the entire node as a single
     vortex located at its circulation-weighted centre-of-mass.
  3. Otherwise recurse into children.

Complexity: O(N log N) time, O(N) space.

Parameters
----------
THETA : float
    Opening-angle criterion.  Smaller = more accurate but slower.
    0.5 gives ~1 % error vs direct; 0.9 gives ~5 % error but is 3× faster.
BARNES_HUT_THRESHOLD : int
    Minimum vortex count before switching from Numba O(N²) to this method.
"""

import numpy as np

THETA                  = 0.5
BARNES_HUT_THRESHOLD   = 600   # use BH above this count
_TWO_PI                = 2.0 * np.pi


# ---------------------------------------------------------------------------
# Quadtree node (flat-struct using __slots__ for cache efficiency)
# ---------------------------------------------------------------------------

class _Node:
    __slots__ = ['x0', 'x1', 'y0', 'y1', 'size',
                 'total_gamma', 'com_x', 'com_y', 'n',
                 'children', 'leaf_idx']

    def __init__(self, x0, x1, y0, y1):
        self.x0, self.x1 = x0, x1
        self.y0, self.y1 = y0, y1
        self.size = max(x1 - x0, y1 - y0)
        self.total_gamma = 0.0
        self.com_x = 0.0
        self.com_y = 0.0
        self.n = 0
        self.children = None   # list[4] or None (leaf)
        self.leaf_idx = []     # vortex indices (leaf only)


# ---------------------------------------------------------------------------
# Tree construction
# ---------------------------------------------------------------------------

def _build(x, y, gamma, indices, x0, x1, y0, y1, depth):
    node = _Node(x0, x1, y0, y1)
    node.n = len(indices)
    if node.n == 0:
        return node

    # Circulation-weighted centre-of-mass (multipole term)
    g_sub = gamma[indices]
    tot   = g_sub.sum()
    node.total_gamma = tot
    if abs(tot) > 1e-30:
        node.com_x = (x[indices] * g_sub).sum() / tot
        node.com_y = (y[indices] * g_sub).sum() / tot
    else:
        node.com_x = x[indices].mean()
        node.com_y = y[indices].mean()

    # Leaf condition: few enough vortices or too deep
    if len(indices) <= 4 or depth >= 24:
        node.leaf_idx = list(indices)
        return node

    # Subdivide into 4 quadrants
    mx = 0.5 * (x0 + x1)
    my = 0.5 * (y0 + y1)
    xi = x[indices]
    yi = y[indices]
    q0 = indices[( xi <  mx) & (yi <  my)]
    q1 = indices[( xi >= mx) & (yi <  my)]
    q2 = indices[( xi <  mx) & (yi >= my)]
    q3 = indices[( xi >= mx) & (yi >= my)]

    node.children = [
        _build(x, y, gamma, q0, x0, mx, y0, my, depth + 1),
        _build(x, y, gamma, q1, mx, x1, y0, my, depth + 1),
        _build(x, y, gamma, q2, x0, mx, my, y1, depth + 1),
        _build(x, y, gamma, q3, mx, x1, my, y1, depth + 1),
    ]
    return node


def build_tree(x, y, gamma, n):
    """Build a Barnes-Hut quadtree for n active vortices."""
    xs = x[:n]; ys = y[:n]
    margin = max((xs.max() - xs.min()) * 0.05, 0.1)
    indices = np.arange(n, dtype=np.intp)
    return _build(xs, ys, gamma[:n], indices,
                  xs.min() - margin, xs.max() + margin,
                  ys.min() - margin, ys.max() + margin, 0)


# ---------------------------------------------------------------------------
# Velocity query
# ---------------------------------------------------------------------------

def _node_velocity(xi, yi, node, skip_i, xs, ys, gs, core_r2):
    """Traverse tree from `node`, accumulate velocity induced at (xi, yi)."""
    u = 0.0; v = 0.0
    stack = [node]
    theta2 = THETA * THETA

    while stack:
        nd = stack.pop()
        if nd.n == 0:
            continue

        ddx = xi - nd.com_x
        ddy = yi - nd.com_y
        r2  = ddx * ddx + ddy * ddy

        use_multipole = (nd.children is None and len(nd.leaf_idx) == 1 and
                         nd.leaf_idx[0] == skip_i)
        if use_multipole:
            continue   # skip self

        if nd.children is None:
            # Leaf: direct sum over stored vortices
            for j in nd.leaf_idx:
                if j == skip_i:
                    continue
                dx2 = xi - xs[j]; dy2 = yi - ys[j]
                r_sq = dx2 * dx2 + dy2 * dy2 + core_r2
                fac  = gs[j] / (_TWO_PI * r_sq)
                u   += -dy2 * fac
                v   +=  dx2 * fac
        elif r2 > 0 and nd.size * nd.size < theta2 * r2:
            # Far-field multipole approximation
            r_sq = r2 + core_r2
            fac  = nd.total_gamma / (_TWO_PI * r_sq)
            u   += -ddy * fac
            v   +=  ddx * fac
        else:
            # Recurse
            stack.extend(nd.children)

    return u, v


# ---------------------------------------------------------------------------
# Public API — drop-in for the mutual-induction part of advect_wake
# ---------------------------------------------------------------------------

def barnes_hut_mutual_velocity(x, y, gamma, n, core_r2):
    """
    Compute mutual-induction velocities for all n active vortices.

    Returns:
        u_mut, v_mut: shape (n,) arrays — velocity from all OTHER vortices.
    """
    xs = x[:n]; ys = y[:n]; gs = gamma[:n]
    tree = build_tree(x, y, gamma, n)

    u_mut = np.zeros(n); v_mut = np.zeros(n)
    for i in range(n):
        u_mut[i], v_mut[i] = _node_velocity(
            xs[i], ys[i], tree, i, xs, ys, gs, core_r2)

    return u_mut, v_mut
