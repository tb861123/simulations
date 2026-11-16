# Simple Harmonic Motion

A single, self-contained HTML file (`simple-harmonic-motion.html`) for teaching
oscillations. It needs no install and no internet: **open `simple-harmonic-motion.html`
in Chrome or Edge**. Two tabs at the top of the centre panel switch between:

1. **Simple harmonic motion** (the default tab): a simple pendulum or a mass
   on a spring, with Standard (iGCSE) and Advanced (A level) levels. Replaces the old WJEC Streamlit
   page *Simple Harmonic Motion* (`physics_sims/pages/02_Simple_Harmonic_Motion.py`).
2. **Double pendulum (chaos)**: chaos and the limits of prediction (below).
   Chaos is beyond both specs.

A first visit opens the SHM tab; after that the page remembers which tab you
used last.

# Part 1: Simple harmonic motion

- **Standard (iGCSE):** simple harmonic motion is not in Pearson Edexcel
  International GCSE Physics (4PH1), so Standard is a gentle introduction
  using 4PH1 ideas: period and frequency f = 1/T (Section 3), KE = ½mv² and
  GPE = mgh (Section 4), Hooke's law and weight = mg (Section 1), and timing
  many swings to cut the random error.
- **Advanced (A level):** WJEC Eduqas A level Physics, Component 1, Topic 6
  (Vibrations), sections (a)–(q): SHM, x, v and a graphs, T = 2π√(m/k) and
  2π√(L/g), energy in SHM, damped and forced oscillations, resonance and
  Barton's pendulums; the Batch run models the specified practicals (timing a
  pendulum or a mass on a spring).

A key-ideas box tags each idea (iGCSE 4PH1, A level Eduqas, beyond the spec).

## Controls

- **Level:** Standard (iGCSE: ideal SHM) or Advanced (A level: adds damping, forcing, big swings, Barton's pendulums), with a hint naming the spec.
- **System:** simple pendulum (length 0.1–5 m, starting angle 1°–80°, gravity on
  Earth, Moon, Mars or Jupiter) or spring–mass (k = 1–200 N/m, x₀ = 0.01–0.5 m);
  mass 0.1–5 kg. Drag the bob or the mass on the picture to set a new start.
- **Standard:** "Show period verification graphs": T against L and T on four planets
  (pendulum), or T against m and T against k (spring).
- **Advanced:** damping ratio ζ (0–2) with the regime (under-, critically or
  over-damped); real-world examples (car suspension comfort/sport, tuned mass damper,
  door closer, old clock, seismograph); forced oscillation with driving frequency
  ratio ω/ω₀ (0.1–3) and the amplitude–frequency response curve with peak and Q;
  large-angle comparison (solves θ'' = −(g/L) sin θ exactly); **Barton's
  pendulums**: a heavy driver and eight light pendulums of different lengths
  (0.4–1.75 × the driver's length) drawn on the right. The one with the same
  length resonates and lags a quarter of a cycle; shorter ones swing nearly in
  phase, longer ones nearly in antiphase.
- Play/Pause, Restart, speed ¼×–4× (1× = real time), "+ Add pendulum" (up to two
  more pendulums, 10% longer and 8% shorter, so you can watch them drift out of step),
  and a **Look back** slider while paused, to step through the last few periods
  (it sets the moment shown in the energy chart, like the old page's time slider).

## Views and readouts

Animated pendulum (angle arc, weight, velocity and driving-force arrows, damping
envelope, scale bar) or spring (driven wall, velocity and restoring-force arrows);
x, v and a against time with the ideal-SHM and envelope curves; phase portrait
(v against x) with the ideal ellipse; KE / PE / total energy as bars ("Now"),
**against time** or **against displacement** (with the ideal parabolas
½kx² and ½k(A² − x²) dashed); tiles for T, f,
ω₀, measured period, x, v, a, energies and Q; a "what's happening" commentary and
the key-insight cards; Physics notes (spec reference, equations, explanation, and the
advanced context in Advanced); **📝 Exam practice**, built from the current
settings with marks, hints and a "Show mark scheme" toggle. Standard: frequency
from f = 1/T, why time 10 swings, GPE and speed at the bottom of a swing (or
weight and extension for the spring), energy changes in a swing, what changes
a pendulum's period. Advanced: the old page's 3 questions (period, maximum
speed, maximum acceleration) plus the definition of SHM, KE at half the
amplitude, Barton's pendulums and the resonance curve with damping.

## Presets

Classroom pendulum (T = 2.006 s) · Seconds pendulum (L = 0.994 m, T = 2.000 s) ·
Pendulum on the Moon · Spring and mass (T = 0.993 s) · Four times the mass (T doubles) ·
Big swing 60° (exact T = 2.153 s, 7% long) · Car suspension (ζ = 0.25) ·
Door closer (ζ = 1) · Overdamped (ζ = 2) · Resonance (ζ = 0.1, driven at ω₀: 5× amplitude) ·
Energy in a swing (Standard: 0.5 kg bob from 15°, energy against time) ·
Barton's pendulums (Advanced, energy against displacement).

## The model

q'' = −ω₀²q − 2ζω₀q' + ω₀²q₀cos(ωt), with q = θ (pendulum) or x (spring),
ω₀ = √(g/L) or √(k/m). Standard level uses only the first term. Large-angle mode uses
−ω₀² sin q. Solved with RK4 (1000 steps per period live, 800 in batch runs).
Pendulum displacement is measured along the arc, x = Lθ.
Left out: the mass of the string or spring, bob size, stretching, the spring's limit
of proportionality, friction with the track; damping is proportional to speed.
Every assumption is listed in the app.

## Batch experiments (SHM)

Timing experiments add a random reaction time (normal, SD set in the panel) to
the start and the end of each stopwatch timing. Results from the test run:

| Question | Result |
|---|---|
| Why time 10 swings, not 1? (n = 1–16 swings, 30 timings each, SD 0.15 s) | mean 1.998–2.006 s at every n (theory 2.006 s); SD falls from 0.17 s (1 swing) to 0.017 s (10) and 0.011 s (16), as √2σ/n predicts |
| How much do stopwatch timings scatter? (200 × 10 swings) | mean 2.008 s, SD 0.022 s (theory 2.006 s, SD 0.0212 s), +0.1%, 1.0 standard errors |
| Is T = 2π√(L/g)? (L = 0.2–4 m, 5 timings each) | log–log gradient 0.500 (theory 0.5); every mean within 0.1% |
| Where does the small-angle approximation fail? (10°–80°, exact equation) | matches the exact formula at every angle; 0.2% longer than 2π√(L/g) at 10°, 1.7% at 30°, 7.3% at 60°, 13.8% at 80° |
| Resonance (ζ = 0.1, ω/ω₀ = 0.2–2.5) | peak 5.00× at ω = ω₀ (theory 5.00); every point within 0.2% of 1/√[(1−r²)² + (2ζr)²] |
| How quickly does damping shrink the swings? (ζ = 0–0.6) | next swing ÷ first = 1, 0.532, 0.277, …, 0.0090: equal to e^(−2πζ/√(1−ζ²)) to 4 significant figures |
| Is T = 2π√(m/k)? (spring timed by hand: m = 0.1–3.2 kg, k = 20 N/m, 10 timings of 10 oscillations each, SD 0.1 s) | NEW (Nov 2026): means 0.440, 0.624, 0.884, 1.252, 1.773, 2.509 s against theory 0.444, 0.628, 0.889, 1.257, 1.777, 2.513 s (each 0.004 s low, about 1.4 SE: the same reaction times are reused at every mass); SD 0.0097 s (predicted 0.014 s); log–log gradient 0.502 (theory 0.5) |

# Part 2: Double pendulum

A single, self-contained HTML file (`simple-harmonic-motion.html`) for teaching chaos
and the limits of prediction. It needs no install and no internet: **open
`simple-harmonic-motion.html` in Chrome or Edge**. Pick a preset; it starts swinging
straight away.

Two (or up to 50) double pendulums start a tiny fraction of a degree apart.
They follow exactly the same laws with no randomness, yet after a few seconds
they do completely different things. A log-scale graph of their separation shows
the gap growing exponentially; its gradient is the Lyapunov exponent λ.

## What you can change

- Single or double pendulum; masses m₁, m₂ (0.1–5 kg); rod lengths L₁, L₂ (0.2–2 m)
- Gravity: Earth, Moon, Mars or Jupiter
- Starting angles θ₁, θ₂ (sliders, or drag the bobs on the picture)
- Number of pendulums (1–50) and the difference between neighbours (10⁻⁹° to 1°)
- What counts as "different" (1°–90°), used for the prediction horizon
- Damping (acts at once) and trail length

Speed: ¼×, ½×, 1× (real time), 2×, 4×.

**Display quality** (Low / Medium / High / Ultra, default High) sets how finely the
trails are drawn (a point every 50, 33, 16 or 8 ms). Canvases are sized for the screen's
pixel ratio. The physics and the batch runs are the same at every setting.

## Presets

| Preset | Idea |
|---|---|
| Small swings | Not chaotic: the gap stays tiny |
| Big swings: chaos | The 0.001° gap grows exponentially; prediction lost after about 8 s |
| Fan of 30 | 30 copies spanning 0.03° move together, then scatter |
| Moon gravity / Jupiter gravity | Same chaos, slower or faster (λ ∝ √g) |
| Heavy upper bob / Heavy lower bob | How the mass ratio changes the motion |
| Single pendulum | Even a near-upside-down swing is not chaotic: the gap grows only linearly |
| Small-angle period | Measured period matches 2π√(L/g) |
| Damped chaos | Chaos switches off as energy drains away |

## Readouts and graphs

Energy and energy drift (so students can trust the solver), separation, λ from the
gradient of the log graph, a long-run λ (Benettin method), the time when the
pendulums became "different" with the theory ln(X/δ)/λ, measured period with
2π√(L/g) and the exact large-swing period (single), normal-mode periods (double).
Graphs: separation on a log scale with the fitted gradient and δe^(λt); and a
choice of angles against time, phase space (θ against ω) or a Poincaré section.

## The model

- Point masses on light rigid rods, frictionless hinges, in a vertical plane.
- Equations of motion from Lagrange's method (shown in the app). Damping adds −bω to each angular acceleration.
- Solved with 4th-order Runge–Kutta, fixed 1 ms step. Energy drift is about 10⁻⁷ % per minute.
- Separation = √(Δθ₁² + Δθ₂² + (L₁/g)(Δω₁² + Δω₂²)) in radians (phase-space distance).
- Lyapunov exponent: gradient of ln(separation) against time, and the Benettin average
  (a shadow pendulum 10⁻⁸ rad away is pulled back every 0.05 s).
- Prediction horizon ≈ ln(X/δ)/λ, so each 10× smaller starting error adds only ln(10)/λ seconds.
- Single pendulum period: 2π√(L/g) for small swings; exact 4√(L/g)·K(sin(θ₀/2)).

**Left out:** heavy rods, bob size, hinge friction, air resistance that depends on
speed², the arms bending, and the pendulums colliding.

## Batch run (double pendulum)

The **📊 Batch run** button opens a panel that runs many pendulums without
drawing, with seeded random starts (random big swings, the angles on the left ± 2°,
or exactly the angles on the left). *Repeat* mode draws a histogram; *Sweep*
steps one setting (starting difference δ, starting angle, rod length, gravity
or the "different" threshold), using the same set of random starts at every step,
and plots mean ± 1 SD with theory. Each one-click experiment sets every input itself (from fixed defaults), so it gives the
same result whatever is on the left panel and in any order. Summaries give n, mean, SD, standard error,
min, max, theory and the difference; results download as CSV.

Built-in experiments and typical results (each takes a few seconds):

| Question | Result |
|---|---|
| How far ahead can we predict? (100 random big swings, δ = 0.001°, X = 10°) | mean horizon 7.6 s (median 7.3 s); each run's own ln(X/δ)/λ gives 7.3 s on average (+4.7%) |
| Does 1000× smaller error give 1000× longer? (δ = 10⁻⁹°–0.1°) | straight line against log δ: −1.70 s per factor of 10 (theory −1.73), so λ ≈ 1.35 /s, matching the long-run λ of 1.35 /s |
| When does chaos switch on? (starting angle 10°–170°) | λ ≈ 0.02–0.06 /s up to 70°, then 0.9–1.4 /s from 90° |
| Is the period 2π√(L/g)? (L = 0.25–4 m, 5° swing) | log–log gradient 0.500; within 0.05% (the exact formula matches) |
| When does the small-angle formula fail? (5°–170°) | 25° is 1% long, 90° about 17%, 170° is 2.4×; exact formula matches every point |
| Can we trust the computer? (50 runs, 60 s each) | energy drift 6 × 10⁻⁷ % on average |
