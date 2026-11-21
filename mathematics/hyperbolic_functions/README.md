# Hyperbolic Functions

A single, self-contained HTML file: Further Maths: cosh, sinh and tanh built from eˣ and e⁻ˣ, the point (cosh t, sinh t) on x² − y² = 1 beside (cos t, sin t) on the circle with equal sector areas t/2, inverse hyperbolic functions as logarithms, and a hanging chain (catenary) against a parabola. It needs no install and no
internet: **open `hyperbolic-functions.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/hyperbolic_functions.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `hyperbolic-functions.html` by hand.

- **Definitions and graphs (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, hyperbolic functions: definitions of sinh, cosh and tanh in terms of eˣ, their graphs and ranges, the identity cosh²x − sinh²x = 1 and other identities (Osborn's rule). Not in AS 8FM0.
- **Inverses and calculus (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: inverse hyperbolic functions and their logarithmic forms, differentiating and integrating hyperbolic functions (e.g. ∫ 1/√(x² + 1) dx = arsinh x). The catenary is an application, beyond the specification.

## What it shows

Graphs of cosh, sinh and tanh with the two exponential halves that build them, and (A level) their inverses reflected in y = x. The hyperbola x² − y² = 1 and the circle x² + y² = 1 with the points (cosh t, sinh t) and (cos t, sin t) and their equal sector areas. A chain of chosen length hanging between posts as y = a cosh(x/a), compared with a parabola, with its sag.

Try this first: Is a hanging chain a parabola? Compare them.

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| cosh²x − sinh²x = 1? | mean 1.08e-14, SD 2.09e-13, SE 1.21e-14 from 300 runs (theory: 0) |
| Hyperbolic sector area = t/2 | 0.25: 0.125 ± 0 · 0.5: 0.25 ± 0 · 1: 0.5 ± 0 · 1.5: 0.75 ± 0 · 2: 1 ± 0 · 2.5: 1.25 ± 0 · 3: 1.5 ± 0 (mean ± SE, 1 runs each) (theory: t/2) |
| Length of a hanging chain | 3: 15.3 ± 0 · 4: 12.8 ± 0 · 5: 11.8 ± 0 · 6: 11.2 ± 0 · 8: 10.7 ± 0 · 10: 10.4 ± 0 · 15: 10.2 ± 0 (mean ± SE, 1 runs each) (theory: 2a sinh(5/a)) |
| arsinh as a logarithm (A level) | mean -2.02e-15, SD 3.30e-14, SE 1.91e-15 from 300 runs (theory: 0) |

## The model

Exponential definitions; the catenary's a found from 2a sinh(s/a) = L by repeated halving. Assumptions and simplifications are listed inside the simulation under **The model**.
