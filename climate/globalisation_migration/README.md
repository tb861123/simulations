# Globalisation and Migration

A single, self-contained HTML file: sixteen countries linked by trade, migration and remittances from 1960 to 2020, with the gravity model, time–space compression, push and pull, diasporas, borders and a KOF-style globalisation score. It needs no install and no
internet: **open `globalisation-migration.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/globalisation_migration.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `globalisation-migration.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 5 Global development: uneven development, international migration, push and pull factors, trade links.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Topic 3 Globalisation (flows, time–space compression, switched-on and switched-off places, KOF index) and Topic 8B Migration, identity and sovereignty (distance decay and the gravity model, intervening obstacles, remittances, EU free movement and Brexit).

## What it shows

A world map with countries sized by GDP and coloured by income, and animated flows of goods (orange), people (blue) and remittances (green). Drag the year from 1960 to 2020 or play it; set the world tariff, migration barriers, EU free movement for the UK, USA border restrictions and Gulf work visas. Click a country for its income, trade share, migrants in and out, remittances and globalisation score. Charts show trade and migration over time and the score for every country.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Ravenstein: migrants against distance | 1150 a year at 500 km to 62 at 8000 km (∝ 1 ÷ distance) |
| Fitting the distance-decay exponent | mean 1.00, SD 0.07 from 100 students (true 1) |
| Tariffs and world trade | 17.5% of GDP with no tariff to 8.7% at 30% |
| The shrinking world, 1960–2020 | 8.4% of GDP in 1960 to 16% in 2020 |
| Remittances and the wage gap | 0.1% of home GDP at a wage ratio of 2 to 9.6% at 20 |
