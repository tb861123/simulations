# Regression and Correlation

A single, self-contained HTML file: Drag, add and delete points on a scatter diagram: the least-squares regression line, residuals and their squares, PMCC, outliers and leverage, interpolation and extrapolation, tests for zero correlation and log graphs for y = axⁿ and y = kbˣ. It needs no install and no
internet: **open `regression-correlation.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/regression_correlation.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `regression-correlation.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Statistics 2.2: scatter diagrams and regression lines for bivariate data, explanatory and response variables, interpolation and the danger of extrapolation, informal interpretation of correlation, and correlation does not imply causation. 2.4 outliers and cleaning data.
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0): the product moment correlation coefficient and hypothesis tests for zero correlation (Statistics 5.1, critical values of r), and using logarithmic graphs to estimate the parameters of y = axⁿ and y = kbˣ (Pure 6.6).

## What it shows

A scatter diagram you can edit: click to add, drag to move, right-click to delete. The least-squares regression line of y on x with residuals (and the squares it minimises), the mean point, Sxx, Syy, Sxy and r, and a prediction marked as interpolation or extrapolation. Data sets: random samples with a chosen ρ (with a live histogram of r from new samples), arm span and height, ice creams and drownings (confounding), and daily weather in the style of the large data set. At A level: the hypothesis test for zero correlation with exact critical values, and log transformations for bacterial growth (y = kbˣ) and the real planetary data (y = axⁿ, Kepler's third law).

Try this first: Drag the right-most point up and down, then a middle one. Which moves the line more?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How variable is r? | mean 0.504, SD 0.167, SE 0.00749 from 500 runs (theory: population ρ) |
| False alarms (A level) | 5: 3.5 ± 0.354 · 8: 5 ± 0.866 · 12: 4.8 ± 0.718 · 20: 4.9 ± 0.828 · 30: 4.7 ± 0.406 · 50: 6.1 ± 1.12 (mean ± SE, 5 runs each) (theory: significance level) |
| Power of the correlation test (A level) | 6: 20.3 ± 1.45 · 10: 31.6 ± 2.35 · 15: 46.5 ± 1.35 · 20: 57.3 ± 0.561 · 30: 72.8 ± 1.63 · 45: 86.6 ± 0.485 · 60: 93.7 ± 1.12 (mean ± SE, 5 runs each) (theory: Fisher z approximation) |
| Leverage of one outlier | 0: -0.00512 ± 0.0763 · 15: -0.0806 ± 0.0456 · 30: 0.177 ± 0.05 · 45: 0.364 ± 0.0413 · 60: 0.533 ± 0.0181 · 90: 0.722 ± 0.0167 · 120: 0.791 ± 0.0265 (mean ± SE, 8 runs each) (theory: approximate expected r) |
| Estimating Kepler's n (A level) | mean 1.5, SD 0.024, SE 0.0012 from 400 runs (theory: Kepler's n) |

## The model

Least squares (y on x) and the PMCC; critical values of r from the t distribution with n − 2 degrees of freedom; random samples from a bivariate normal population. Assumptions and simplifications are listed inside the simulation under **The model**.
