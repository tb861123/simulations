# Differential Equations

A single, self-contained HTML file: Further Maths: slope fields you click to start solution curves, Euler's method stepping along beside the exact solution, and a damped, driven mass on a spring classified by its auxiliary equation, with the phase plane and resonance. It needs no install and no
internet: **open `differential-equations.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/differential_equations.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `differential-equations.html` by hand.

- **First order (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, differential equations: first-order equations solved by separating variables or an integrating factor, general and particular solutions, families of solution curves, and the slope field. Euler's step-by-step method is in Further Pure 1 (FP1 numerical methods).
- **Second order (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: second-order equations with constant coefficients, the auxiliary equation, complementary function and particular integral; simple harmonic motion; damped oscillations (light, critical, heavy damping) and forced oscillations. Resonance is an extension.

## What it shows

First order: a slope field for six equations (exponential growth, integrating-factor and separable examples, logistic, circles). Click to start solution curves; each is drawn exactly and by Euler's method with your step size, with Euler's error charted. Second order (A level): a mass on a spring with damping and an optional driving force; the auxiliary equation and its roots, the type of damping, the x–t graph with the decay envelope, the phase-plane path and the resonance curve.

Try this first: Click three points on the slope field for dy/dx = 4 − 2y. Where do all the solutions end up?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Euler's method: error against step size | 0.025: 0.0332 ± 0 · 0.05: 0.065 ± 0 · 0.1: 0.125 ± 0 · 0.2: 0.23 ± 0 · 0.25: 0.277 ± 0 · 0.5: 0.468 ± 0 (mean ± SE, 1 runs each) (theory: ≈ eh/2) |
| Logistic: where do solutions settle? | mean 2, SD 3.45e-4, SE 1.99e-5 from 300 runs (theory: stable equilibrium y = 2) |
| Period of SHM (A level) | 1: 6.28 ± 0 · 1.5: 4.19 ± 0 · 2: 3.14 ± 0 · 3: 2.09 ± 0 · 4: 1.57 ± 0 · 6: 1.05 ± 0 · 8: 0.785 ± 0 (mean ± SE, 1 runs each) (theory: 2π/ω) |
| Settling time and damping (A level) | 0.25: 18.2 ± 0 · 0.5: 9.21 ± 0 · 1: 4.51 ± 0 · 2: 2.04 ± 0 · 2.5: 2.03 ± 0 · 3: 1.9 ± 0 · 3.14: 2.11 ± 0 · 4: 3.2 ± 0 · 6: 5.28 ± 0 · 8: 7.23 ± 0 (mean ± SE, 1 runs each) (theory: ≈ ln 100 / k (light damping)) |
| Resonance curve (A level) | 1: 0.337 ± 0 · 2: 0.501 ± 0 · 2.5: 0.766 ± 0 · 2.8: 1.14 ± 0 · 3: 1.5 ± 0 · 3.14: 1.59 ± 0 · 3.3: 1.35 ± 0 · 3.5: 0.945 ± 0 · 4: 0.456 ± 0 · 5: 0.194 ± 0 (mean ± SE, 1 runs each) (theory: F/√((ω² − Ω²)² + (2kΩ)²)) |

## The model

Exact solutions of the first-order equations; Euler's method; fourth-order Runge–Kutta (step 0.002 s) for the oscillator; Hooke's law and damping proportional to velocity. Assumptions and simplifications are listed inside the simulation under **The model**.
