# Hypothesis Testing

A single, self-contained HTML file: Spin, sow and weigh: binomial and normal hypothesis tests with critical regions, p-values and significance levels, then run hundreds of tests to count Type I and II errors and trace the power curve. It needs no install and no
internet: **open `hypothesis-testing.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/hypothesis_testing.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `hypothesis-testing.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Statistics 5.1–5.2: the language of hypothesis testing (H0, H1, significance level, test statistic, one- and two-tailed tests, critical value and region, acceptance region, p-value) and the binomial test for a proportion.
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Paper 3 Statistics 5.1–5.3: binomial tests, plus the test for the mean of a normal distribution with known variance (x̄ ~ N(μ, σ²/n)). Type I / II errors and power go beyond 9MA0 (Further Statistics 1) and are marked as such.

## What it shows

Five stories (a spinner, seeds, a coin, flour bags, reaction times). The top panel draws a real random sample (tiles for successes, or a dot plot of values); the bottom panel shows the distribution of the test statistic if H₀ is true, with the critical region in red and the observed value marked. Press ▶ to take sample after sample: the tally counts how often H₀ is rejected, and (with the true value shown) how many Type I or Type II errors were made. Overlay the true distribution to see the power, and the power curve below gives P(reject H₀) for every possible true value.

Try this first: A spinner that really is biased: why does 20 spins so often miss it?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How often is a true H0 rejected? | mean 4.07, SD 1.42, SE 0.184 from 60 runs (theory: actual significance level) |
| Power curve: how big a bias can 20 spins detect? | 0.15: 0 ± 0 · 0.25: 4 ± 0.365 · 0.3: 12.2 ± 1.11 · 0.35: 23.8 ± 2.1 · 0.4: 36.8 ± 2.3 · 0.5: 76 ± 2.05 · 0.6: 91.5 ± 0.619 · 0.7: 98.8 ± 0.167 (mean ± SE, 6 runs each) (theory: P(X ≥ 9 | p)) |
| Does a bigger sample help? | 10: 8.2 ± 1.36 · 20: 26.6 ± 1.54 · 40: 30.4 ± 0.927 · 60: 43 ± 2.02 · 100: 74.6 ± 2.18 · 150: 85.2 ± 1.39 (mean ± SE, 5 runs each) (theory: exact binomial power) |
| p-values when H0 is true (A level) | mean 0.504, SD 0.299, SE 0.0122 from 600 runs (theory: mean of a uniform) |
| Power of the z test (A level) | 5: 29.4 ± 2.62 · 10: 45.6 ± 1.99 · 15: 61.6 ± 1.72 · 20: 70.4 ± 3.17 · 30: 88.2 ± 1.46 · 40: 93.6 ± 1.29 · 60: 99.2 ± 0.374 (mean ± SE, 5 runs each) (theory: Φ(−1.645 + 3√n/6)) |

## The model

Independent trials with a fixed probability (binomial), or values from a normal population with known σ (x̄ ~ N(μ, σ²/n)). Critical regions follow the Edexcel convention (largest region with probability at most α, α/2 per tail). Assumptions and simplifications are listed inside the simulation under **The model**.
