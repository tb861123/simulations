# Calculus Explorer

A single, self-contained HTML file: Shrink a chord into a tangent, trace the gradient function, find and classify stationary points, and fill the area under a curve with rectangles or trapezia until the sum becomes the integral. It needs no install and no
internet: **open `calculus-explorer.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/calculus_explorer.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `calculus-explorer.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Pure 7.1–7.3: the gradient as the limit of a chord, differentiation from first principles for small powers of x, gradients, tangents and normals, increasing and decreasing functions, stationary points and the second derivative; Pure 8.1–8.3: indefinite and definite integrals and the area under a curve.
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Pure 7: first principles for sin x and cos x, derivatives of eˣ and ln x, concave and convex curves and points of inflection; Pure 8: area as the limit of a sum, areas below the axis and between curves; Pure 9: the trapezium rule and its over- or under-estimates.

## What it shows

A graph of a cubic with coefficient sliders, x², x³ and (A level) sin x, eˣ and ln x. Gradient mode: drag a point, shrink h, and watch the chord gradient approach the tangent gradient, with the first-principles algebra and the gradient function traced as you move. Stationary points mode: maxima, minima, increasing and decreasing intervals, f'(x) and f''(x), and at A level concave/convex shading and points of inflection. Area mode: left, right or midpoint rectangles or the trapezium rule with any number of strips against the exact F(b) − F(a), with how fast each converges.

Try this first: Shrink h on y = x² at x = 1. What does the chord's gradient home in on, and why?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How fast does the chord gradient converge? | 1: 4 ± 0 · 0.8: 3.04 ± 0 · 0.6: 2.16 ± 0 · 0.4: 1.36 ± 0 · 0.2: 0.64 ± 0 · 0.1: 0.31 ± 0 · 0.05: 0.153 ± 0 (mean ± SE, 1 runs each) (theory: 3h + h²) |
| Trapezium rule error | 2: 0.429 ± 0 · 3: 0.186 ± 0 · 4: 0.104 ± 0 · 6: 0.0459 ± 0 · 8: 0.0258 ± 0 · 12: 0.0114 ± 0 · 16: 0.00643 ± 0 (mean ± SE, 1 runs each) (theory: π²/(6n²)) |
| Left rectangles against the trapezium rule | 2: 0.394 ± 0 · 4: 0.206 ± 0 · 6: 0.139 ± 0 · 8: 0.105 ± 0 · 12: 0.0706 ± 0 · 16: 0.0531 ± 0 · 24: 0.0355 ± 0 (mean ± SE, 1 runs each) (theory: (e − 1)/(2n)) |
| Random cubics: how many stationary points? | mean 1.33, SD 0.125, SE 0.00881 from 200 runs (theory: 2 × P(b² > 3c) = 4/3) |
| Area by random darts | mean 0.334, SD 0.0242, SE 0.00139 from 300 runs (theory: 1/3) |

## The model

Exact derivatives and antiderivatives for each function; chord gradients from function values; stationary points by sign changes of f' and interval halving. Assumptions and simplifications are listed inside the simulation under **The model**.
