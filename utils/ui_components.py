"""
Shared Streamlit UI elements used across all simulation pages.

Every simulation imports from here to ensure a consistent look and feel.
"""

import streamlit as st
from utils.style import COLOURS


def mode_toggle() -> str:
    """
    Render a Basic / Advanced mode radio button at the top of the sidebar.

    Returns
    -------
    'Basic' or 'Advanced'
    """
    return st.radio(
        "Mode",
        ["Basic", "Advanced"],
        horizontal=True,
        help="Basic covers WJEC spec content. Advanced adds deeper physics.",
    )


def two_column_layout(left_weight: int = 3, right_weight: int = 7):
    """
    Return (left_col, right_col) split at 30/70 by default.

    Parameters
    ----------
    left_weight  : relative width of left column (controls)
    right_weight : relative width of right column (plots)

    Returns
    -------
    tuple of two st.columns objects
    """
    return st.columns([left_weight, right_weight])


def physics_notes(
    spec_ref: str,
    equations: list[str],
    explanation: str,
    advanced_text: str = "",
    mode: str = "Basic",
) -> None:
    """
    Render the collapsible Physics Notes expander below a plot.

    Parameters
    ----------
    spec_ref     : exact WJEC spec statement(s) being illustrated
    equations    : list of LaTeX equation strings (without $$ delimiters)
    explanation  : plain-English description of what the simulation shows
    advanced_text: additional text shown only in Advanced mode
    mode         : 'Basic' or 'Advanced'
    """
    with st.expander("📐 Physics Notes", expanded=False):
        st.markdown(f"**Spec reference:** {spec_ref}")
        st.markdown("**Key equations:**")
        for eq in equations:
            st.latex(eq)
        st.markdown("**What this shows:**")
        st.markdown(explanation)
        if mode == "Advanced" and advanced_text:
            st.divider()
            st.markdown("**Advanced context:**")
            st.markdown(advanced_text)


def metric_row(metrics: dict[str, str]) -> None:
    """
    Display a row of named metrics using st.metric.

    Parameters
    ----------
    metrics : dict mapping display label → formatted value string
    """
    cols = st.columns(len(metrics))
    for col, (label, value) in zip(cols, metrics.items()):
        col.metric(label, value)


def advanced_divider() -> None:
    """Render the labelled divider that marks the start of Advanced options."""
    st.divider()
    adv_colour = COLOURS["advanced"]
    st.markdown(
        f"<p style='color:{adv_colour};font-weight:600;"
        "font-size:0.85rem;margin-bottom:0'>⚗️ Advanced options</p>",
        unsafe_allow_html=True,
    )


def sim_header(title: str, spec_ref: str) -> None:
    """
    Render a consistent page header for each simulation.

    Parameters
    ----------
    title    : simulation title (e.g. "Projectile Motion")
    spec_ref : short spec reference string
    """
    st.title(title)
    st.caption(f"WJEC Eduqas A Level Physics — {spec_ref}")
