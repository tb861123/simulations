# Population and Famine

A single, self-contained HTML file: Malthus's population trap, the Black Death, and the Great Irish Famine of 1845–51. It needs no install and no
internet: **open `population-and-famine.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/population_and_famine.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `population-and-famine.html` by hand.

- **Standard (GCSE):** causation and consequence; Malthus's positive and preventive checks; the Black Death and wages.
- **Advanced (A level):** OCR A level History A (H505) Y316 Britain and Ireland 1791–1921: the Great Famine, Peel's and Russell's relief, the soup kitchens, the Poor Law Extension Act and the Gregory clause, emigration, the long-term fall in population; AO3 interpretations (nationalist, revisionist, post-revisionist).

## What it shows

Two views. **Malthus's world:** a farming kingdom on fixed land, a year at a time. Malthus's diagram plots the birth and death rates against food per head, with the equilibrium where they cross; random harvests, a preventive-check slider (late marriage), a plague button (40% die) or the Black Death in 1348, and an Industrial Revolution switch that lets the economy escape the trap. **Ireland 1781–1901:** the population against the census, a food bar for each year (potatoes, other food, relief, exports leaving), one figure per 100,000 people alive, dead and emigrated, and sliders for blight severity, relief, exports, emigration and the post-Famine changes.

History is a weaker fit for simulation than science: the model does not say who was to blame. It shows how much the outcome depended on each factor, and its rough figures (relief shares, food exported) are listed in "The model" tab so students can question them.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Does better technology make people richer? | food per head 0.96 at 0%, 1.02 at 0.1% a year, 1.33 at 0.5% (steady state 0.95, 1.01, 1.33) |
| After the Black Death | 69 years to recover, SD 4 (average harvests: 68) |
| Late marriage and famine | 2.5 famine years a century with no preventive check, none above 0.6 |
| Relief and the death toll | 1.69 million deaths with no relief, 1.01 million as happened, 0.39 million at twice |
| How certain is 'about a million'? | mean 1.10 million, SD 0.16 million |
| Exports or no exports? | 1.03 million with exports, 0.77 million without |
