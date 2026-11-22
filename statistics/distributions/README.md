# Probability Distributions

A single, self-contained HTML file: A Galton board builds the binomial distribution ball by ball; then areas under the normal curve, the inverse normal, the normal approximation with a continuity correction, and Poisson counts as an extension. It needs no install and no
internet: **open `distributions.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/distributions.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `distributions.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Statistics 3.1 and 4.1: discrete probability distributions, the binomial distribution as a model, its conditions, and calculating binomial probabilities P(X = r), P(X ≤ r).
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Statistics 4.1–4.3: binomial and normal distributions, areas under the normal curve, the inverse normal, standardising Z = (X − μ)/σ, the points of inflection at μ ± σ, choosing a model, and the normal approximation to the binomial with a continuity correction. The Poisson distribution goes beyond 9MA0 (Further Statistics 1).

## What it shows

A Galton board where every bounce goes right with probability p: balls collect in bins under the exact B(n, p) bars, with the number of routes to each bin. Choose a region (P(X ≤ b), P(X ≥ a) or between) to compare the exact probability with the fraction of balls in it. At A level, switch to the normal distribution (points of inflection, 68–95–99.7, inverse normal from a probability), overlay N(np, np(1 − p)) on the board to see the normal approximation and the continuity correction, and (beyond 9MA0) count random events in each interval to build a Poisson distribution. Charts give the probability and cumulative distributions with the balls' results.

Try this first: Before you drop a single ball: which bin of the Galton board will fill fastest, and why?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Does the mean equal np? | mean 5.99, SD 0.291, SE 0.0168 from 300 runs (theory: np) |
| Variance and p | 0.05: 0.917 ± 0.04 · 0.1: 1.8 ± 0.0287 · 0.2: 3.31 ± 0.132 · 0.3: 4.25 ± 0.141 · 0.4: 4.59 ± 0.271 · 0.5: 5.23 ± 0.3 · 0.6: 5.14 ± 0.177 · 0.7: 4.27 ± 0.0396 · 0.8: 3.19 ± 0.0704 · 0.9: 1.83 ± 0.0565 · 0.95: 0.95 ± 0.0323 (mean ± SE, 5 runs each) (theory: np(1 − p)) |
| The 68–95–99.7 rule (A level) | 0.5: 0.388 ± 0.0131 · 1: 0.678 ± 0.00802 · 1.5: 0.867 ± 0.00675 · 2: 0.959 ± 0.00341 · 2.5: 0.986 ± 0.0026 · 3: 0.997 ± 4.47e-4 (mean ± SE, 6 runs each) (theory: 2Φ(k) − 1) |
| Normal approximation with a continuity correction (A level) | 5: 0.532 ± 0.00612 · 10: 0.655 ± 0.00696 · 20: 0.612 ± 0.0028 · 40: 0.583 ± 0.00376 · 80: 0.551 ± 0.00114 · 160: 0.54 ± 0.00404 (mean ± SE, 5 runs each) (theory: normal approx. Φ((⌊np⌋ + 0.5 − np)/σ)) |
| Poisson: mean = variance? (beyond 9MA0) | 0.5: 0.945 ± 0.0469 · 1: 1.01 ± 0.0267 · 2: 1.01 ± 0.0339 · 4: 0.973 ± 0.0376 · 8: 1 ± 0.0152 · 12: 0.953 ± 0.0302 (mean ± SE, 6 runs each) (theory: 1 for a Poisson distribution) |

## The model

Independent bounces with a fixed chance p; normal values by the Box–Muller method; Poisson events with exponential gaps. Assumptions and simplifications are listed inside the simulation under **The model**.
