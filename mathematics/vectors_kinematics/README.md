# Kinematics and Vectors

A single, self-contained HTML file: A particle on a line with live displacement–time and velocity–time graphs (gradients, areas, SUVAT and variable acceleration with calculus), vectors you drag on a grid, and projectiles described by r and v. It needs no install and no
internet: **open `vectors-kinematics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/vectors_kinematics.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `vectors-kinematics.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Mechanics 7.1–7.4: displacement, velocity, acceleration, distance and speed; displacement–time and velocity–time graphs (gradient and area); the constant acceleration (SUVAT) formulae; variable acceleration using calculus. Pure 10: vectors in 2D, magnitude and direction, position vectors, adding and scaling.
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Mechanics 7.4–7.5: kinematics in 2D with vectors (r, v = dr/dt, a = dv/dt), projectile motion, range, greatest height and time of flight; Pure 10: vectors in 3D (in context), unit vectors and the angle of a vector.

## What it shows

Three views. Motion on a line: a particle on a track with velocity and acceleration arrows, its s–t graph with the tangent and its v–t graph with the area shaded (blue forwards, red backwards), for constant acceleration or a cubic displacement. Vectors: drag a and b on a grid to see a + b (parallelogram), a − b, λa or the unit vector with its angle, and the components. Projectile (A level): the position vector r and the velocity v with its components, the trail, and the range for every angle at this speed and height.

Try this first: u = 8, a = −2: where is the particle after 6 s, and how far has it actually travelled?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Step-by-step v. SUVAT | 0.05: 0.225 ± 0 · 0.1: 0.45 ± 0 · 0.2: 0.9 ± 0 · 0.3: 1.35 ± 0 · 0.5: 2.25 ± 0 · 0.75: 3.38 ± 0 · 1: 4.5 ± 0 (mean ± SE, 1 runs each) (theory: ½ a t Δt) |
| Range against angle (A level) | 10: 14 ± 0 · 20: 26.3 ± 0 · 30: 35.4 ± 0 · 40: 40.2 ± 0 · 45: 40.8 ± 0 · 50: 40.2 ± 0 · 60: 35.4 ± 0 · 70: 26.2 ± 0 · 80: 14 ± 0 (mean ± SE, 1 runs each) (theory: u² sin 2θ / g) |
| Throws are never identical (A level) | mean 40.9, SD 4.2, SE 0.21 from 400 runs (theory: u²(1 + 0.05²)/g) |
| Adding two random unit vectors | mean 1.27, SD 0.0647, SE 0.00374 from 300 runs (theory: 4/π) |
| Distance against displacement | 0.5: 0 ± 0 · 1: 0 ± 0 · 1.5: 1.25 ± 0 · 2: 4 ± 0 · 2.5: 6.75 ± 0 · 3: 8 ± 0 · 3.5: 8 ± 0 · 4: 8 ± 0 (mean ± SE, 1 runs each) (theory: split at the turning points t = 1, 3) |

## The model

Exact formulae for constant and cubic motion and for projectiles (no air resistance, g = 9.8 m s⁻²); the particle model. Assumptions and simplifications are listed inside the simulation under **The model**.
