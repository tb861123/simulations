# Circular Motion

A single, self-contained HTML file for iGCSE and A level. It needs no install
and no internet: **open `circular-motion.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/circular_motion.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `circular-motion.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  does not name circular motion, so Standard uses the ideas behind it:
  velocity as a vector, resultant force and F = ma, Newton's first law
  (Section 1), and orbital speed = 2πr/T (8(b)).
- **Advanced (A level):** WJEC Eduqas Component 1, circular motion: ω, v = ωr,
  T = 2π/ω, a = v²/r = ω²r, F = mω²r, banked tracks, vertical circles, the
  conical pendulum. Rotating frames are beyond the spec.

## Four situations

- **⭕ Ball on a string** (from above): radius, ω, mass; velocity and
  force/acceleration arrows; a trail; an optional breaking strength (the ball
  flies off along the tangent when mω²r exceeds it) and **✂ Snap the string**;
  the rotating frame with its "centrifugal force" (A level). Charts: x and y
  against time (side-on it is SHM); F = mω²r against ω.
- **🏎 Banked bend:** radius, bank angle, speed, grip μ. A cross-section with
  weight, normal reaction, friction and the resultant to the centre (to
  scale), and a top view where the car skids outwards or slides down. Charts:
  safe speeds against bank angle; forces per kg against speed.
- **🎢 Vertical circle:** radius, speed at the bottom, mass. Step-by-step
  motion (RK4); the string goes slack and the ball becomes a projectile when
  the tension would be negative; the circle is coloured taut / slack. Charts:
  tension and speed against angle.
- **🔻 Conical pendulum:** length, angle, mass; perspective view with tension,
  weight and resultant. Charts: period against angle (with the simple
  pendulum) and ω against angle.

## Investigate

Speed in a circle · Let go! · Faster needs more force · Strong enough string?
· Round the bend · Loop the loop · Conical pendulum · (A level) Radians and ω ·
Tension in a vertical circle · The rotating frame.

## Batch run

| Experiment | Result when tested |
|---|---|
| Whirling bung: is F = mω²r? | 100 runs: 0.975 ± 0.048 N against Mg = 0.981 N |
| Bung period against radius | follows 2π√(mr/Mg) ∝ √r |
| Conical pendulum: does mass matter? | 1.87 s at every mass (theory 1.87 s) |
| Conical pendulum: period against angle | matches 2π√(L cos θ/g) from 5° to 80° |
| Loop the loop: is √(5gr) the minimum? | the simulation matches theory; all the way round from 10 m/s (√(5gr) = 9.9) |
| Banked bend: fastest safe speed | means match the formula; spread grows with angle |

## The model

v = ωr, a = ω²r, F = mω²r; banked bend N = g cos θ + (v²/r) sin θ, friction
needed (v²/r) cos θ − g sin θ, skid when it exceeds μN; vertical circle
θ̈ = −(g/r) sin θ with T = mv²/r + mg cos θ; conical pendulum ω² = g/(L cos θ).
Left out: air resistance, pivot friction, the string's mass and stretch, tyre
deformation, the jerk when a slack string goes tight.
