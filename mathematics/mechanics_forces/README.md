# Forces and Newton's Laws

A single, self-contained HTML file: Force diagrams that move: connected particles over a pulley, an Atwood machine, friction and resolving on a rough slope, and moments on a beam that tips when a reaction reaches zero. It needs no install and no
internet: **open `mechanics-forces.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/mechanics_forces.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `mechanics-forces.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Mechanics 8.1–8.4: Newton's three laws, F = ma, weight and g, force diagrams, connected particles (strings and smooth pulleys, the same tension and acceleration), forces in one dimension.
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Mechanics 8.5–8.6 and 9: resolving forces, inclined planes, friction F ≤ μR and limiting equilibrium, statics; moments, equilibrium of a rigid body, beams on supports and the condition for tilting.

## What it shows

Four set-ups with every force drawn to scale. A block on a table pulled by a hanging mass (smooth or, at A level, rough), and an Atwood machine, with the acceleration and tension and how they change with the hanging mass. A rough slope (A level) with the weight resolved into mg sin θ and mg cos θ, friction that grows until it is limiting, and an optional push. A beam on two supports (A level): drag the load and watch the reactions change, until the beam tips.

Try this first: Is the tension in the string equal to the hanging mass's weight? Predict, then look.

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Measuring the acceleration with a stopwatch | 0.5: 2.01 ± 0.18 · 1: 3.69 ± 0.251 · 1.5: 4.22 ± 0.33 · 2: 4.47 ± 0.314 · 3: 5.94 ± 0.951 · 4: 6 ± 0.489 · 6: 7.51 ± 0.83 (mean ± SE, 6 runs each) (theory: m₂g/(m₁ + m₂)) |
| Tension in an Atwood machine | 0.5: 7.84 ± 0 · 1: 13.1 ± 0 · 2: 19.6 ± 0 · 3: 23.5 ± 0 · 4: 26.1 ± 0 · 6: 29.4 ± 0 · 8: 31.4 ± 0 · 12: 33.6 ± 0 (mean ± SE, 1 runs each) (theory: 2m₁m₂g/(m₁ + m₂)) |
| Acceleration down a rough slope (A level) | 10: 0 ± 0 · 20: 0 ± 0 · 25: 0 ± 0 · 30: 0.656 ± 0 · 40: 2.55 ± 0 · 50: 4.36 ± 0 · 60: 6.04 ± 0 · 75: 8.2 ± 0 · 90: 9.8 ± 0 (mean ± SE, 1 runs each) (theory: g(sin θ − μ cos θ)) |
| Measuring μ by tilting (A level) | mean 0.5, SD 0.0337, SE 0.00168 from 400 runs (theory: true μ) |
| Reaction at a support (A level) | 0: 49 ± 0 · 0.5: 73.5 ± 0 · 1: 98 ± 0 · 1.5: 123 ± 0 · 2: 147 ± 0 · 2.5: 172 ± 0 · 3: 196 ± 0 · 3.5: 221 ± 0 · 4: 245 ± 0 (mean ± SE, 1 runs each) (theory: (10g × 2 + 20g x)/4) |

## The model

Particles, light inextensible strings, smooth light pulleys, F ≤ μR with one μ for starting and sliding, a uniform rigid beam on point supports, g = 9.8 m s⁻². Assumptions and simplifications are listed inside the simulation under **The model**.
