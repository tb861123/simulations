"""
Landing page for the WJEC Eduqas A Level Physics Simulation Suite.

Displays a card grid of all available simulations with spec references,
a description of Basic vs Advanced modes, and a spec coverage table.
"""

import streamlit as st
import streamlit.components.v1 as components

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
    {
        "num": "11",
        "title": "Optics: Refraction & Lenses",
        "page": "pages/11_Optics_Refraction.py",
        "spec": "Component 3, Topic 9 (Wave Properties of Light)",
        "desc": "Refraction, Snell's law, total internal reflection and lens behaviour. Advanced: dispersion and ray diagrams.",
        "icon": "🔬",
        "component": "3",
        "topic": "Optics",
    },
    {
        "num": "12",
        "title": "Magnetic Fields & Induction",
        "page": "pages/12_Magnetic_Fields_Induction.py",
        "spec": "Component 2, Topic 7 (Magnetic Fields), sections (a)–(n)",
        "desc": "Magnetic field patterns, force on current-carrying conductors, electromagnetic induction and Faraday's law.",
        "icon": "🧲",
        "component": "2",
        "topic": "Magnetism",
    },
    {
        "num": "13",
        "title": "Photoelectric Effect",
        "page": "pages/13_Photoelectric_Effect.py",
        "spec": "Component 2, Topic 6 (Photons and Wave-Particle Duality)",
        "desc": "Einstein's photoelectric equation, work function, stopping potential, and threshold frequency.",
        "icon": "⚡",
        "component": "2",
        "topic": "Quantum",
    },
    {
        "num": "14",
        "title": "Doppler Effect",
        "page": "pages/14_Doppler_Effect.py",
        "spec": "Component 2, Topic 8 (Waves) and Component 3, Topic 11 (Astrophysics)",
        "desc": "Change in observed frequency for moving source or observer. Advanced: redshift, Hubble's law.",
        "icon": "🔊",
        "component": "2",
        "topic": "Waves",
    },
    {
        "num": "15",
        "title": "Circular Motion",
        "page": "pages/15_Circular_Motion.py",
        "spec": "Component 1, Topic 3 (Circular Motion), sections (a)–(k)",
        "desc": "Centripetal acceleration and force, banked tracks, conical pendulum. Advanced: vertical circles and energy.",
        "icon": "⭕",
        "component": "1",
        "topic": "Dynamics",
    },
    {
        "num": "16",
        "title": "Momentum & Collisions",
        "page": "pages/16_Momentum_Collisions.py",
        "spec": "Component 1, Topic 2 (Kinematics and Dynamics), sections on momentum and Newton's laws",
        "desc": "Conservation of momentum, elastic and inelastic collisions, impulse and Newton's third law.",
        "icon": "💥",
        "component": "1",
        "topic": "Dynamics",
    },
    {
        "num": "17",
        "title": "Ideal Gas Processes",
        "page": "pages/17_Ideal_Gas_Processes.py",
        "spec": "Component 1, Topic 4 (Thermal Physics); Component 3, Topic 10 (Thermodynamics)",
        "desc": "Isothermal, isobaric and isochoric processes on p-V diagrams. Advanced: heat engines and entropy.",
        "icon": "🌡️",
        "component": "1",
        "topic": "Thermal",
    },
    {
        "num": "18",
        "title": "Standing Waves",
        "page": "pages/18_Standing_Waves.py",
        "spec": "Component 1, Topic 5 (m)–(r)",
        "desc": "String harmonics, open/closed pipes, nodes and antinodes. Visualise superposition of travelling waves.",
        "icon": "〰️",
        "component": "1",
        "topic": "Waves",
    },
    {
        "num": "19",
        "title": "Diffraction Grating",
        "page": "pages/19_Diffraction_Grating.py",
        "spec": "Component 1, Topic 5 (s)–(u)",
        "desc": "Grating equation d sinθ = nλ. See monochromatic and white-light diffraction patterns.",
        "icon": "🌈",
        "component": "1",
        "topic": "Waves",
    },
    {
        "num": "20",
        "title": "Young's Modulus",
        "page": "pages/20_Youngs_Modulus.py",
        "spec": "Component 1, Topic 3 (a)–(h)",
        "desc": "Stress-strain curves for steel, rubber, glass and more. Watch a wire stretch, neck and fracture.",
        "icon": "🔩",
        "component": "1",
        "topic": "Materials",
    },
    {
        "num": "21",
        "title": "Blackbody Radiation",
        "page": "pages/21_Blackbody_Radiation.py",
        "spec": "Component 3, Topic 4 (a)–(e)",
        "desc": "Planck's law, Wien's law and Stefan-Boltzmann. Compare classical Rayleigh-Jeans to Planck — the UV catastrophe.",
        "icon": "🌟",
        "component": "3",
        "topic": "Quantum",
    },
    {
        "num": "22",
        "title": "Atomic Spectra",
        "page": "pages/22_Atomic_Spectra.py",
        "spec": "Component 3, Topic 4 (f)–(k)",
        "desc": "Bohr model energy levels, electron transitions, emission and absorption spectra for hydrogen and other elements.",
        "icon": "⚛️",
        "component": "3",
        "topic": "Quantum",
    },
    {
        "num": "23",
        "title": "Nuclear Fission",
        "page": "pages/23_Nuclear_Fission.py",
        "spec": "Component 3, Topic 6 (i)–(n)",
        "desc": "Chain reactions, multiplication factor k, and the binding energy curve. Watch a fission chain reaction grow from subcritical to supercritical.",
        "icon": "💥",
        "component": "3",
        "topic": "Nuclear",
    },
    {
        "num": "24",
        "title": "Stellar Evolution",
        "page": "pages/24_Stellar_Evolution.py",
        "spec": "Component 3, Topic 5 (a)–(j)",
        "desc": "HR diagram with real stars, stellar life cycles from protostar to white dwarf or supernova. Stefan-Boltzmann and Wien's law applied to stars.",
        "icon": "⭐",
        "component": "3",
        "topic": "Astrophysics",
    },
    {
        "num": "25",
        "title": "Particle Physics",
        "page": "pages/25_Particle_Physics.py",
        "spec": "Component 3, Topic 7 (a)–(l)",
        "desc": "Quark model, conservation laws checker, and Feynman diagrams. Test whether particle reactions are allowed by the fundamental conservation laws.",
        "icon": "⚛️",
        "component": "3",
        "topic": "Particles",
    },
]

# ── Hero animation ───────────────────────────────────────────────────────────

def build_hero_animation():
    return """<!DOCTYPE html>
<html>
<head>
<style>
body { margin:0; background:#0e1117; overflow:hidden; }
canvas { display:block; }
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
// Hero animation: 5 mini-physics scenes in a horizontal strip
// Scene 1: Projectile arc (left)
// Scene 2: Standing wave (centre-left)
// Scene 3: Orbiting planet (centre)
// Scene 4: Double-slit interference (centre-right)
// Scene 5: Atomic orbital (right)

let t = 0;
const W5 = () => (windowWidth || 800) / 5;

function setup() {
  createCanvas(windowWidth || 800, 320);
  frameRate(60);
  textFont('monospace');
}

function draw() {
  background(14, 17, 23);
  t += 0.025;
  let w = width / 5;

  // Dividers
  stroke(40, 40, 60); strokeWeight(1);
  for (let i = 1; i < 5; i++) line(i * w, 10, i * w, height - 10);

  drawProjectile(0, w);
  drawStandingWave(w, w);
  drawOrbital(2 * w, w);
  drawInterference(3 * w, w);
  drawBohrAtom(4 * w, w);
}

function drawProjectile(x0, w) {
  // Faint grid
  stroke(30, 30, 50); strokeWeight(0.5);
  for (let y = height - 30; y > 10; y -= 40) line(x0 + 5, y, x0 + w - 5, y);
  // Trajectory arc
  noFill(); stroke(31, 119, 180, 180); strokeWeight(2);
  beginShape();
  for (let i = 0; i <= 40; i++) {
    let tx = i / 40;
    let px = x0 + 10 + tx * (w - 20);
    let py = height - 30 - (tx * (1 - tx) * 4 * (height - 60));
    vertex(px, py);
  }
  endShape();
  // Ball
  let bt = (t * 0.4) % 1;
  let bx = x0 + 10 + bt * (w - 20);
  let by = height - 30 - (bt * (1 - bt) * 4 * (height - 60));
  fill(255, 127, 14); noStroke(); circle(bx, by, 10);
  // Label
  fill(150); noStroke(); textSize(9); textAlign(CENTER);
  text('Projectile', x0 + w / 2, height - 5);
}

function drawStandingWave(x0, w) {
  let n = 3, L = w - 20;
  stroke(44, 160, 44, 200); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i <= 60; i++) {
    let xi = i / 60;
    let px = x0 + 10 + xi * L;
    let py = height / 2 + sin(n * PI * xi) * cos(t * 3) * 50;
    vertex(px, py);
  }
  endShape();
  // Envelope
  stroke(44, 160, 44, 50); strokeWeight(1);
  beginShape();
  for (let i = 0; i <= 60; i++) {
    let xi = i / 60; vertex(x0 + 10 + xi * L, height / 2 + sin(n * PI * xi) * 50);
  }
  endShape();
  beginShape();
  for (let i = 0; i <= 60; i++) {
    let xi = i / 60; vertex(x0 + 10 + xi * L, height / 2 - sin(n * PI * xi) * 50);
  }
  endShape();
  // Nodes
  fill(255, 200, 0); noStroke();
  for (let ni = 0; ni <= n; ni++) circle(x0 + 10 + (ni / n) * L, height / 2, 6);
  fill(150); textSize(9); textAlign(CENTER);
  text('Standing Wave', x0 + w / 2, height - 5);
}

function drawOrbital(x0, w) {
  let cx = x0 + w / 2, cy = height / 2;
  // Star
  fill(255, 200, 50); noStroke(); circle(cx, cy, 16);
  // Orbit
  noFill(); stroke(100, 100, 140, 80); strokeWeight(1);
  ellipse(cx, cy, 120, 80);
  // Planet trail
  for (let i = 20; i >= 0; i--) {
    let a = t * 1.2 - i * 0.05;
    let px = cx + 60 * cos(a); let py = cy + 40 * sin(a);
    let alpha = map(i, 20, 0, 0, 150);
    fill(31, 119, 180, alpha); noStroke();
    circle(px, py, lerp(6, 2, i / 20));
  }
  fill(150); noStroke(); textSize(9); textAlign(CENTER);
  text('Orbital Motion', x0 + w / 2, height - 5);
}

function drawInterference(x0, w) {
  // Two source points
  let s1y = height / 2 - 30, s2y = height / 2 + 30;
  let lam = 25;
  // Draw interference pattern as colored pixels
  for (let px = x0 + 30; px < x0 + w - 5; px += 3) {
    for (let py = 20; py < height - 20; py += 3) {
      let d1 = dist(x0 + 15, s1y, px, py);
      let d2 = dist(x0 + 15, s2y, px, py);
      let phase = (d1 - d2) / lam * TWO_PI + t * 2;
      let intensity = (cos(phase) + 1) / 2;
      let c = intensity * 200;
      fill(c * 0.5, c * 0.8, c); noStroke();
      rect(px, py, 3, 3);
    }
  }
  // Sources
  fill(255, 255, 100); circle(x0 + 15, s1y, 8); circle(x0 + 15, s2y, 8);
  fill(150); textSize(9); textAlign(CENTER);
  text('Interference', x0 + w / 2, height - 5);
}

function drawBohrAtom(x0, w) {
  let cx = x0 + w / 2, cy = height / 2;
  // Nucleus
  fill(231, 76, 60); noStroke(); circle(cx, cy, 12);
  // Shells
  for (let n = 1; n <= 3; n++) {
    noFill(); stroke(80, 80, 120, 100); strokeWeight(1);
    circle(cx, cy, n * n * 28);
  }
  // Electron on shell 2
  let ex = cx + 2 * 2 * 14 * cos(t * 1.5);
  let ey = cy + 2 * 2 * 14 * sin(t * 1.5);
  fill(31, 119, 180); noStroke(); circle(ex, ey, 7);
  // Photon emitting occasionally
  if (sin(t * 0.3) > 0.9) {
    let ph = (t * 0.3 % 1);
    fill(255, 255, 0, 200 * (1 - ph)); noStroke();
    circle(cx + ph * 60 * cos(t), cy + ph * 60 * sin(t), 5);
  }
  fill(150); textSize(9); textAlign(CENTER);
  text('Atomic Spectra', x0 + w / 2, height - 5);
}

function windowResized() { resizeCanvas(windowWidth || 800, 320); }
</script>
</body>
</html>"""


# ── Header ────────────────────────────────────────────────────────────────────

# Hero canvas
components.html(build_hero_animation(), height=340)

st.title("⚛️ A Level Physics — Interactive Simulations")
st.subheader("WJEC Eduqas Specification · 25 Simulations")
st.markdown(
    "25 standalone simulations spanning the full A Level specification. "
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
                st.markdown(f"### {sim['icon']} {sim['num']}. {sim['title']}")
                st.caption(sim["spec"])
                st.markdown(sim["desc"])
                st.page_link(sim["page"], label=f"Open {sim['title']} →", use_container_width=True)

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
