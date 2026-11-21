# Fieldwork: Sampling and Statistics

A single, self-contained HTML file: sample a pebble beach, a river or a town with random, systematic, stratified or opportunistic sites, then test your hypothesis with Spearman's rank, chi-squared and Student's t-test. It needs no install and no
internet: **open `fieldwork-sampling.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/fieldwork_sampling.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `fieldwork-sampling.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Component 3 fieldwork: hypotheses and null hypotheses; random, systematic, stratified and opportunistic sampling; mean, median, range, interquartile range; scatter graphs and lines of best fit; reliability. Spearman's rank as an extension.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Component 4 (NEA) and quantitative skills: standard deviation (÷ n) and standard error, Spearman's rank 2A(5), Student's t-test 2A(8), chi-squared 2B(10), significance, Type I and II errors and power. Mann–Whitney U as an alternative for non-normal data (not a specified exam technique).

## What it shows

Three views. **Fieldtrip:** a map of the site (a beach like Chesil Beach, a river downstream, or a town-centre transect) with zones, car parks or bridges, and your sites appearing two a second; choose the sampling method (or click the map to place your own), the number of sites, items at each, measuring error, picking by eye, and the strength of the hidden pattern; reveal the true pattern or a second group's readings; scatter graph with line of best fit and box plots by zone. **Statistics:** the full working of Spearman's rank (ranks, d, d², rs and critical values), the mean, median and quartiles, and at A level chi-squared (O and E), Student's t-test and Mann–Whitney U. **Many fieldtrips:** the same plan done by class after class: the spread of their means against the truth and the share that find a significant correlation (power, or false alarms when there is no pattern).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How close is one fieldtrip's mean? | mean 31.0 mm, SD 3.7 (true mean 31.1) |
| Does a bigger sample fix a biased method? | opportunistic error about −12 mm at every sample size (method bias −12.2) |
| How many sites to find a real pattern? | 12% significant at 6 sites, 50% at 10, 98% at 30 (Fisher-z power 23%, 45%, 95%) |
| False alarms when there is no pattern (A level) | 2–10% of trips significant (theory 5%) |
| Stratified or random: which is more precise? | unbiased; SD of the error 2.2 mm at 6 sites to 0.9 at 45 |
| Chi-squared when there is no link (A level) | mean 4.0, SD 3.0 (df = 4) |
| Student's t-test when there is no difference (A level) | mean −0.21, SD 1.16 (about 1.2 expected) |
