"""
Landing page for the WJEC Eduqas A Level Physics Simulation Suite.

Displays a card grid of all available simulations with spec references,
a description of Basic vs Advanced modes, and a spec coverage table.
"""

import streamlit as st

st.set_page_config(
    page_title="A Level Physics Simulations — WJEC Eduqas",
    page_icon="⚛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Simulation catalogue ──────────────────────────────────────────────────────

SIMS = [
    {
        "num": "01",
        "title": "Projectile Motion",
        "page": "pages/01_Projectile_Motion.py",
        "spec": "Component 1, Topic 2 (f)–(g)",
        "desc": "Explore trajectories, range, and max height. Advanced: quadratic drag and Magnus effect.",
        "icon": "🎯",
        "component": "1",
        "topic": "Kinematics",
    },
    {
        "num": "02",
        "title": "Simple Harmonic Motion",
        "page": "pages/02_Simple_Harmonic_Motion.py",
        "spec": "Component 1, Topic 6 (a)–(q)",
        "desc": "Pendulum and spring-mass systems. Advanced: damping, resonance, and large-angle behaviour.",
        "icon": "🔄",
        "component": "1",
        "topic": "Vibrations",
    },
    {
        "num": "03",
        "title": "Capacitor Charge & Discharge",
        "page": "pages/03_Capacitor_Charge_Discharge.py",
        "spec": "Component 2, Topic 4 (i)–(j)",
        "desc": "Observe Q, V, I vs time for RC circuits. Advanced: log plots, series/parallel builder, energy.",
        "icon": "⚡",
        "component": "2",
        "topic": "Capacitance",
    },
    {
        "num": "04",
        "title": "Nuclear Decay (Statistical)",
        "page": "pages/04_Nuclear_Decay.py",
        "spec": "Component 3, Topic 6 (a)–(h)",
        "desc": "Dice analogy simulation of radioactive decay. Advanced: log plots, background correction.",
        "icon": "☢️",
        "component": "3",
        "topic": "Nuclear Decay",
    },
    {
        "num": "05",
        "title": "Electric & Gravitational Fields",
        "page": "pages/05_Electric_Gravitational_Fields.py",
        "spec": "Component 2, Topic 6 (a)–(f)",
        "desc": "2D field maps and equipotentials for point charges and masses. Advanced: particle dynamics.",
        "icon": "🧲",
        "component": "2",
        "topic": "Fields",
    },
    {
        "num": "06",
        "title": "Wave Interference & Diffraction",
        "page": "pages/06_Wave_Interference.py",
        "spec": "Component 3, Topic 2 (a)–(o)",
        "desc": "Young's slits, diffraction gratings, stationary waves. Advanced: N-slit transition, resolution.",
        "icon": "〰️",
        "component": "3",
        "topic": "Wave Properties",
    },
    {
        "num": "07",
        "title": "Kinetic Theory",
        "page": "pages/07_Kinetic_Theory.py",
        "spec": "Component 1, Topic 7 (a)–(f)",
        "desc": "2D particle gas with elastic collisions and Maxwell-Boltzmann distribution. Advanced: Boyle's law.",
        "icon": "💨",
        "component": "1",
        "topic": "Kinetic Theory",
    },
    {
        "num": "08",
        "title": "AC Circuits",
        "page": "pages/08_AC_Circuits.py",
        "spec": "Component 3, Option A (a)–(p)",
        "desc": "Phasor diagrams and phase relationships in RCL circuits. Advanced: Bode plots, resonance, Q factor.",
        "icon": "〜",
        "component": "3",
        "topic": "Option A — AC",
    },
    {
        "num": "09",
        "title": "Orbital Motion & Gravity",
        "page": "pages/09_Orbital_Motion.py",
        "spec": "Component 2, Topic 8 (a)–(g)",
        "desc": "RK4 orbital integration, Kepler's 3rd law. Advanced: escape velocity, galaxy rotation curves.",
        "icon": "🪐",
        "component": "2",
        "topic": "Orbits",
    },
    {
        "num": "10",
        "title": "Radioactive Decay Chains",
        "page": "pages/10_Radioactive_Decay_Chains.py",
        "spec": "Component 3, Topic 6 (extension)",
        "desc": "Bateman equations for U-238 and Th-232 chains. Advanced: secular/transient equilibrium, custom chains.",
        "icon": "⛓️",
        "component": "3",
        "topic": "Decay Chains",
    },
]

# ── Header ────────────────────────────────────────────────────────────────────

st.title("⚛️ A Level Physics — Interactive Simulations")
st.subheader("WJEC Eduqas Specification")
st.markdown(
    "Ten standalone simulations spanning the full A Level specification. "
    "Use the **sidebar** to navigate between simulations."
)

st.divider()

# ── Basic vs Advanced explanation ─────────────────────────────────────────────

col_l, col_r = st.columns(2)
with col_l:
    st.markdown(
        """
        ### 📗 Basic Mode
        Covers the **examinable WJEC specification content** exactly.
        Parameters and displays are limited to what the spec requires.
        Ideal for revision, homework, and class demonstrations.
        """
    )
with col_r:
    st.markdown(
        """
        ### 🔬 Advanced Mode
        Introduces **richer physics** beyond the specification —
        drag, damping, resonance, chaos, and more.
        Each Advanced feature includes contextual explanation.
        Use it to build deeper intuition and explore connections.
        """
    )

st.divider()

# ── Simulation card grid (3 columns) ─────────────────────────────────────────

st.subheader("Simulations")

for row_start in range(0, len(SIMS), 3):
    row_sims = SIMS[row_start : row_start + 3]
    cols = st.columns(3)
    for col, sim in zip(cols, row_sims):
        with col:
            with st.container(border=True):
                st.markdown(
                    f"### {sim['icon']} {sim['num']}. {sim['title']}"
                )
                st.caption(sim["spec"])
                st.markdown(sim["desc"])

st.divider()

# ── Spec coverage table ───────────────────────────────────────────────────────

st.subheader("Specification Coverage")

table_rows = []
for sim in SIMS:
    table_rows.append({
        "Sim": f"{sim['icon']} {sim['num']}",
        "Title": sim["title"],
        "Component": sim["component"],
        "Topic": sim["topic"],
        "Spec Reference": sim["spec"],
    })

st.dataframe(
    table_rows,
    use_container_width=True,
    hide_index=True,
    column_config={
        "Sim":           st.column_config.TextColumn(width="small"),
        "Title":         st.column_config.TextColumn(width="medium"),
        "Component":     st.column_config.TextColumn(width="small"),
        "Topic":         st.column_config.TextColumn(width="medium"),
        "Spec Reference":st.column_config.TextColumn(width="large"),
    },
)

st.divider()
st.caption(
    "Built with Streamlit · Python 3.11 · NumPy · SciPy · Plotly · Matplotlib"
)
