# Water Insecurity and Drought

A single, self-contained HTML file: a river basin month by month for thirty years: the soil-moisture budget, a reservoir through runs of dry years, rising demand, Day Zero, the Falkenmark index, and ways of managing water. It needs no install and no
internet: **open `water-insecurity.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/water_insecurity.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `water-insecurity.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 6 Resource management (water): supply and demand, water insecurity, large-scale and sustainable management.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Topic 5: the water budget, soil moisture budgets, drought and ENSO, causes of water insecurity, the Falkenmark index, hard engineering and sustainable management, transboundary basins.

## What it shows

Three basins (Cape Town-like, South East England, a shared semi-arid river). The picture shows rain, the catchment's soil water, the river, the reservoir with restriction levels, the city and its farms. Controls: warming, rainfall change, population growth, dam capacity, desalination, leak repairs, meters, drip irrigation and the share taken upstream. Charts: reservoir level over 30 years with dry-tap months, and either the year's soil-moisture budget (P, PET and actual ET with surplus and deficit months) or water per person against the Falkenmark thresholds.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Day Zero risk and population | no dry taps at 2 million, 75% of futures at 5 million |
| Day Zero risk and warming | 30% of futures with no warming, 90% at +2 °C |
| Runoff against rainfall | no runoff at 300 mm, 49 mm at 600, 445 mm at 1100 |
| Water stress over 30 years | about 150 m³ a person falling to about 100 (absolute scarcity) |
| Which measure saves most? | 136–167 Mm³ avoided by single measures, 185 by all together |
