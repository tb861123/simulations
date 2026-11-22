# Series and Convergence

A single, self-contained HTML file: Further Maths: add terms one at a time and watch Maclaurin and binomial polynomials hug a curve inside their interval of convergence and fly off outside it, then watch partial sums of Σr, Σr², Σr³, Σ1/r and Σ1/r² settle or run away. It needs no install and no
internet: **open `series-convergence.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/series_convergence.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `series-convergence.html` by hand.

- **AS Further Maths (8FM0):** Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 1: sums of series using the standard results Σr, Σr², Σr³. Also the binomial expansion of (1 + x)ⁿ for rational n and its validity |x| < 1 (A level Mathematics 9MA0 Pure 4.1) and convergent geometric series (Pure 4.2).
- **A level Further Maths (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, series: Maclaurin series f(x) = f(0) + f'(0)x + f''(0)x²/2! + …, the standard series for eˣ, sin x, cos x, ln(1 + x) and (1 + x)ⁿ with their ranges of validity, and approximations from the first few terms. Partial sums and convergence tests go beyond.

## What it shows

Series for a function: the curve and the polynomial from the first n terms (earlier ones faint), the interval of convergence shaded, the estimate at a chosen x as terms are added, and the error across x. Sums of series: each term as a bar and the partial sums as a line, compared with the standard-result formula or the limit, or growing without limit.

Try this first: Add terms of 1/(1 + x). Where does the polynomial get closer, and where does it get worse?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How many terms for eˣ at x = 1? | 2: -0.144 ± 0 · 3: -0.661 ± 0 · 4: -1.29 ± 0 · 5: -2 ± 0 · 6: -2.79 ± 0 · 7: -3.65 ± 0 · 8: -4.56 ± 0 · 10: -6.52 ± 0 · 12: -8.65 ± 0 (mean ± SE, 1 runs each) (theory: first missing terms 1/n! + …) |
| Σ1/r² closing in on π²/6 | 5: 0.181 ± 0 · 10: 0.0952 ± 0 · 20: 0.0488 ± 0 · 40: 0.0247 ± 0 · 80: 0.0124 ± 0 · 160: 0.00623 ± 0 (mean ± SE, 1 runs each) (theory: ≈ 1/N − 1/(2N²)) |
| Σr³ = (Σr)² | 1: 1 ± 0 · 2: 1 ± 0 · 3: 1 ± 0 · 5: 1 ± 0 · 10: 1 ± 0 · 20: 1 ± 0 · 50: 1 ± 0 · 100: 1 ± 0 (mean ± SE, 1 runs each) (theory: exactly 1) |
| Alternating harmonic series | 10: 0.0475 ± 0 · 20: 0.0244 ± 0 · 40: 0.0123 ± 0 · 80: 0.00621 ± 0 · 160: 0.00312 ± 0 · 320: 0.00156 ± 0 (mean ± SE, 1 runs each) (theory: ≈ 1/(2N)) |
| Random points: is the binomial expansion any good? | mean 0.313, SD 0.0342, SE 0.00197 from 300 runs (theory: ≈ 1.25/4 (−0.62 < x < 0.63)) |

## The model

Exact Maclaurin and binomial coefficients; partial sums added term by term in computer arithmetic. Assumptions and simplifications are listed inside the simulation under **The model**.
