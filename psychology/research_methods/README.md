# Research Methods: Inferential Tests

A single, self-contained HTML file: Run simulated psychology studies, choose the right test from the decision tree (sign test, chi-squared, Mann-Whitney, Wilcoxon, Spearman, t-tests, Pearson), compare calculated and critical values, and watch Type I and Type II errors happen when you can see the hidden truth. It needs no install and no
internet: **open `research-methods.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/research_methods.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `research-methods.html` by hand.

- **AS (AQA 7181):** AQA AS Psychology (7181) 3.2.3 Research methods: experimental designs (independent groups, repeated measures, matched pairs), levels of measurement, the sign test, probability and significance (p ≤ 0.05), use of statistical tables and critical values, Type I and Type II errors.
- **A level (AQA 7182):** AQA A level Psychology (7182) 3.2.3 Research methods: factors affecting the choice of statistical test (difference/correlation, design, level of data): Spearman's rho, Pearson's r, Wilcoxon, Mann-Whitney, related t-test, unrelated t-test and chi-squared; one- and two-tailed tests; parametric criteria; Type I and Type II errors.

## What it shows

The simulated data (dot plots, paired lines, scatter graph or contingency table), the working for the chosen test with calculated and critical values and the decision, the null distribution with its critical region and your calculated value, and the running proportion of significant studies (Type I error rate or power).

Try this first: Set the true effect to 0 and run 50 studies. How many are 'significant'?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Type I error rate | 0.01: 0.00667 ± 0.00471 · 0.025: 0.0267 ± 0.00932 · 0.05: 0.04 ± 0.0113 · 0.1: 0.123 ± 0.019 (mean ± SE, 300 runs each) (theory: α) |
| Power and sample size (Mann-Whitney) | 5: 0.247 ± 0.0353 · 8: 0.313 ± 0.038 · 12: 0.52 ± 0.0409 · 16: 0.647 ± 0.0392 · 20: 0.827 ± 0.031 · 25: 0.827 ± 0.031 · 30: 0.907 ± 0.0238 (mean ± SE, 150 runs each) (theory: t approximation) |
| Related designs and participant variables (A level) | 0: 0.313 ± 0.038 · 0.3: 0.333 ± 0.0386 · 0.5: 0.48 ± 0.0409 · 0.7: 0.667 ± 0.0386 · 0.85: 0.893 ± 0.0253 (mean ± SE, 150 runs each) (theory: t approximation) |
| Spearman's rho: how big a sample? (A level) | 6: 0.117 ± 0.0294 · 10: 0.283 ± 0.0413 · 15: 0.35 ± 0.0437 · 20: 0.575 ± 0.0453 · 30: 0.717 ± 0.0413 · 40: 0.858 ± 0.032 · 50: 0.892 ± 0.0285 (mean ± SE, 120 runs each) (theory: Fisher z approximation) |

## The model

Normally distributed scores shifted by a true effect size d (or correlated with true r), turned into nominal, ordinal or interval data; exact null distributions for Mann-Whitney, Wilcoxon, sign test and Spearman (N ≤ 12), t and χ² distributions for the rest. Assumptions and simplifications are listed inside the simulation under **The model**.
