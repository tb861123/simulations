# Double Pendulum Chaos

A single, self-contained HTML file (`double-pendulum.html`) for teaching chaos
and the limits of prediction. It needs no install and no internet: **open
`double-pendulum.html` in Chrome or Edge**. Pick a preset; it starts swinging
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

## Batch run

The **📊 Batch run** button opens a panel that runs many pendulums without
drawing, with seeded random starts (random big swings, the angles on the left ± 2°,
or exactly the angles on the left). *Repeat* mode draws a histogram; *Sweep*
steps one setting (starting difference δ, starting angle, rod length, gravity
or the "different" threshold), using the same set of random starts at every step,
and plots mean ± 1 SD with theory. Summaries give n, mean, SD, standard error,
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
