# Numerical Methods

A single, self-contained HTML file: Solve equations step by step: change of sign and interval bisection, staircase and cobweb diagrams for x = g(x), Newton–Raphson tangents, and the asymptotes, repeated roots, cycles and divergence that make each method fail. It needs no install and no
internet: **open `numerical-methods.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/numerical_methods.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `numerical-methods.html` by hand.

- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Pure 9.1–9.3: locating roots by a change of sign (and where it fails: asymptotes and repeated roots), iteration x(n+1) = g(x(n)) with staircase and cobweb diagrams, convergence and divergence, and the Newton–Raphson method and its failures. (Numerical methods are not in AS 8MA0.)
- **Beyond: convergence:** Beyond 9MA0: why iteration converges when |g'(α)| < 1 (the error is multiplied by about g'(α) each step), the speed of convergence (linear for iteration and bisection, quadratic for Newton–Raphson), and Newton–Raphson as the iteration x = x − f(x)/f'(x). Useful for Further Mathematics and computing.

## What it shows

Seven equations, including ones built to fail. Bisection shows the bracket halving with the signs of f(a) and f(b); iteration draws y = g(x), y = x and the staircase or cobweb, with two or three rearrangements of each equation; Newton–Raphson draws each tangent down to the axis. Click on the graph to choose the start. Charts show the iterates and log₁₀ of the error, which falls in a straight line for bisection and iteration and plunges for Newton–Raphson.

Try this first: Iterate x = x³ − 1 from 1.33, right next to the root. Why does it run away?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Bisection: how small is the error? | 1: 0.0747 ± 0 · 2: 0.0503 ± 0 · 3: 0.0122 ± 0 · 4: 0.019 ± 0 · 5: 0.00341 ± 0 · 6: 0.00441 ± 0 · 7: 4.99e-4 ± 0 · 8: 0.00145 ± 0 (mean ± SE, 1 runs each) (theory: bound 1/2ⁿ⁺¹) |
| Iteration: the error ratio | 2: -0.756 ± 0 · 4: -0.713 ± 0 · 6: -0.692 ± 0 · 8: -0.682 ± 0 · 10: -0.677 ± 0 · 12: -0.675 ± 0 · 14: -0.674 ± 0 · 16: -0.674 ± 0 (mean ± SE, 1 runs each) (theory: g'(α) = −sin α) |
| Newton–Raphson: correct digits | 1: 0.378 ± 0 · 2: 1.32 ± 0 · 3: 3.11 ± 0 · 4: 6.66 ± 0 · 5: 13.8 ± 0 (mean ± SE, 1 runs each) (theory: eₙ₊₁ = eₙ²/(2xₙ)) |
| Random starting points for Newton–Raphson | mean 1.02, SD 0.445, SE 0.0257 from 300 runs |
| Steps to reach 6 decimal places | mean 8.82, SD 0.548, SE 0.0316 from 300 runs (theory: ≈ ln(tolerance ÷ typical start error) ÷ ln|g'(α)|) |

## The model

Exact formulae for f, f' and each g; the true roots are known so that errors can be shown. Iterations stop after 60 steps or beyond ±10⁶. Assumptions and simplifications are listed inside the simulation under **The model**.
