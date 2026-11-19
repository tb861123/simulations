# Inequality and Redistribution

A single, self-contained HTML file: a population that earns, saves, inherits and pays tax: Lorenz curves and Gini, poverty, luck, the Kuznets curve, and the equity–efficiency trade-off. It needs no install and no
internet: **open `inequality.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/inequality.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `inequality.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Edexcel International GCSE Economics (4EC1): distribution of income and wealth, causes of inequality, relative and absolute poverty, progressive, regressive and proportional taxes, benefits, the minimum wage.
- **Advanced (A level):** Edexcel A level Economics A (9EC0) 4.2.2 (Lorenz curve, Gini, causes of inequality) and 4.5.2 (Laffer curve, equity and efficiency). The Kuznets curve is beyond the spec.

## What it shows

Four views. **Earn, save, inherit:** 400 people with log-normal pay, unemployment, part-time work, pensions, returns on wealth, saving, inheritance (and inheritance tax), UK income tax and NI 2026/27, VAT, means-tested benefits or a basic income, and the National Living Wage; Pen's parade of income and of wealth, Lorenz curves, Gini and poverty over time. **Luck:** the trading game (everyone starts with £100; random exchange gives a Gini of 0.5). **Kuznets curve:** people moving from farms to cities. **Equity and efficiency:** the Laffer curve and the trade-off between the Gini and GDP.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Does luck alone create inequality? | Gini 0.497, SD 0.021 (theory 0.4975) |
| Saving in the trading game | 0.495 → 0.155 as the share kept rises 0 → 0.8 (gamma-distribution theory 0.500 → 0.155) |
| How much does redistribution lower the Gini? | 0.330 → 0.101 for t = 0 → 0.7 (theory (1 − t) × 0.329) |
| How many are in relative poverty? | 0.5% at σ = 0.2 to 30% at σ = 1 (theory Φ(ln 0.6 ÷ σ)) |
| The Kuznets curve | 0.14 → 0.43 (peak near 60% urban) → 0.38 (exact mixture Gini) |
| Where does the Laffer curve peak? | highest revenue at 67–70% (theory t* = 1 ÷ (1 + e) = 67%) |
