# Circular Motion

A teaching simulation for GCSE and A level circular motion (WJEC Eduqas A
level Physics, Component 1, Topic 3, sections (a)–(k)). Four situations, chosen
by the tabs at the top of the centre panel. It replaces the old WJEC
Streamlit page `15_Circular_Motion.py`.

## How to run

Open `circular-motion.html` in Chrome or Edge, with no install. It works
offline.

## The four tabs

- **Circular motion (ball on a string):** overhead view with the velocity
  along the tangent and the acceleration and force towards the centre, a
  trail or stroboscope images, and a scale bar. Radius, ω and mass have
  sliders plus typing boxes for any value (the electron preset needs
  9.1 × 10⁻³¹ kg). Drag the circle to change the radius. The string can be
  given a breaking strength: when it snaps the ball carries straight on
  along the tangent. Very fast motion is slowed on screen and labelled.
  Advanced: view from the rotating frame with the centrifugal pseudo-force.
  Graph: x and y against time (circular motion seen side-on is SHM).
- **Banked tracks:** a cross-section with weight, normal reaction, friction
  and the resultant towards the centre, a top view where an unsafe car skids
  outwards or slides down the bank, and v_max and v_min against bank angle
  with the safe range shaded. Advanced: the friction coefficient μ and a
  check that the forces resolve.
- **Vertical circles (loop the loop):** the ball goes round, swings back, or
  its string goes slack and it falls as a projectile; the loop is coloured
  where the string would be taut or slack. A ring marker shows the speed and
  tension at any chosen angle. Graphs: tension and speed against angle.
  Advanced: the √(5gr) derivation and g-forces.
- **Conical pendulum:** a perspective side view with r, h, θ and the forces
  (tension, weight, resultant mω²r). Graph: period against angle with the
  simple pendulum value; Advanced adds ω against angle.

Each tab has a running story, readouts, information cards, physics notes and
exam practice.

## Presets

Fairground roundabout · Washing machine spin · Car on a roundabout ·
Electron in a magnetic field · Conical pendulum (from above) · Banked bend ·
Talladega, 33° · Loop: just makes it · Loop: too slow · Steam engine governor
· Chair-swing ride · Short demo pendulum. (These are all the presets from the
old page's two drop-down lists, plus two for banking and two for the loop.)

## The model

- v = ωr, a = v²/r = ω²r, F = mω²r, T = 2π/ω.
- Banked bend: N = m(g cos θ + (v²/r) sin θ), friction along the slope
  F = m((v²/r) cos θ − g sin θ); it skids when the grip needed exceeds μ.
  v_max² = rg(tan θ + μ)/(1 − μ tan θ), v_min² = rg(tan θ − μ)/(1 + μ tan θ),
  ideal angle tan θ = v²/(rg).
- Loop: energy gives v² = v_b² − 2gr(1 − cos θ); tension
  T = mv²/r + mg cos θ (θ from the bottom). Solved with RK4 in 1 ms steps;
  slack string → free fall until the string is taut again.
- Conical pendulum: ω² = g/(L cos θ), T_string = mg/cos θ, r = L sin θ.
- Left out: air resistance, friction at the pivot, tyre deformation,
  relativity for the electron, and the jerk when a slack string goes tight.

Corrections to the old page: its tension-against-angle graph and the force
arrow on the loop used T = mv²/r − mg cos θ (the sign was wrong; the
annotations were right); the banked-track normal force used mg/cos θ, true
only at the ideal speed; its p5 animation's "string snap" could never happen.
The washing machine note now says about 550g (ω²r/g for 1400 rpm and 25 cm),
not 580g.

## Exam practice

The three questions from the old page (centripetal force and period from the
ball-on-a-string values, ideal banking angle from the banked-track values),
plus the minimum speed for a loop and a conical pendulum period.

## Batch run

Model class practicals with stopwatch reaction errors (SD 0.15 s per press,
10 turns timed) and car-to-car variation in tyre grip.

| Experiment | Result (from testing) |
|---|---|
| Whirling bung: is F = mω²r? (100 runs) | mean 0.973 N against Mg = 0.981 N (−0.8%, −1.2 SE); SD 0.06 N as predicted |
| Bung period against radius (0.2–1.2 m) | log–log gradient 0.504 (theory 0.5) |
| Conical pendulum: does mass matter? (50 g–2 kg) | 1.862 s at every mass; theory 1.867 s; fitted gradient 0 |
| Conical pendulum: period against angle (5°–80°) | within 0.2% of 2π√(L cos θ/g) at every angle |
| Loop the loop: is √(5gr) the minimum? (2 m loop, 3–12 m/s) | agrees with theory at every speed; full 360° from 10 m/s (√(5gr) = 9.9 m/s) |
| Banked bend: fastest safe speed (0°–40°, μ = 0.7 ± 0.08) | means within 1% of the formula (36.9 vs 37.1 m/s at 0°, 86.4 vs 85.6 m/s at 40°); spread grows with angle |

All experiments finish in under a second. To make worksheets, run
`tools/worksheets/run_all.sh ../../physics/circular_motion/circular-motion.html`.
