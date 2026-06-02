"""
Shared colour palette, font settings, and plot defaults.

All Plotly figures use template="plotly_dark" plus these colours.
All Matplotlib figures call setup_matplotlib() then use plt.style.use('dark_background').
"""

import matplotlib.pyplot as plt
import plotly.graph_objects as go

COLOURS = {
    "primary":    "#1f77b4",   # main trace / particle
    "secondary":  "#ff7f0e",   # second trace / comparison
    "tertiary":   "#2ca02c",   # third trace
    "background": "#0e1117",   # Streamlit dark bg
    "grid":       "#2a2a2a",
    "text":       "#fafafa",
    "highlight":  "#e74c3c",   # alerts, maxima, critical points
    "advanced":   "#9b59b6",   # advanced-mode elements
    "quaternary": "#17becf",   # fourth trace
}


def setup_matplotlib() -> None:
    """Apply dark-background style and shared font/colour settings to Matplotlib."""
    plt.style.use("dark_background")
    plt.rcParams.update({
        "figure.facecolor":  COLOURS["background"],
        "axes.facecolor":    COLOURS["background"],
        "axes.edgecolor":    COLOURS["grid"],
        "axes.labelcolor":   COLOURS["text"],
        "axes.grid":         True,
        "grid.color":        COLOURS["grid"],
        "grid.linewidth":    0.5,
        "xtick.color":       COLOURS["text"],
        "ytick.color":       COLOURS["text"],
        "text.color":        COLOURS["text"],
        "font.size":         11,
        "figure.dpi":        120,
    })


def plotly_layout(**kwargs) -> dict:
    """
    Return a base Plotly layout dict consistent with the dark theme.

    Parameters
    ----------
    **kwargs : any additional layout keys that override defaults.

    Returns
    -------
    dict suitable for passing to fig.update_layout(**plotly_layout(...)).
    """
    base = dict(
        template="plotly_dark",
        paper_bgcolor=COLOURS["background"],
        plot_bgcolor=COLOURS["background"],
        font=dict(color=COLOURS["text"], size=12),
        xaxis=dict(
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        yaxis=dict(
            gridcolor=COLOURS["grid"],
            linecolor=COLOURS["grid"],
            zerolinecolor=COLOURS["grid"],
        ),
        margin=dict(l=60, r=30, t=50, b=60),
        legend=dict(
            bgcolor="rgba(0,0,0,0.4)",
            bordercolor=COLOURS["grid"],
            borderwidth=1,
        ),
    )
    base.update(kwargs)
    return base


def make_fig(rows: int = 1, cols: int = 1, **subplot_kwargs):
    """
    Create a Plotly Figure with the shared dark layout and optional subplots.

    Parameters
    ----------
    rows, cols : subplot grid dimensions.
    **subplot_kwargs : forwarded to make_subplots if rows>1 or cols>1.

    Returns
    -------
    plotly.graph_objects.Figure
    """
    if rows > 1 or cols > 1:
        from plotly.subplots import make_subplots
        fig = make_subplots(rows=rows, cols=cols, **subplot_kwargs)
    else:
        fig = go.Figure()
    fig.update_layout(**plotly_layout())
    return fig
