# Changing Urban Places

A single, self-contained HTML file: a city of 1600 households with bid-rent land values, residential segregation from mild preferences (Schelling), regeneration and gentrification, an index of deprivation, location quotients and the urban heat island. It needs no install and no
internet: **open `urban-places.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/urban_places.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `urban-places.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 4 Changing cities: urban land use, inequality and deprivation, regeneration, sustainable cities.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Topic 4A Regenerating places (gentrification and displacement) and 4B Diverse places (segregation, the location quotient and index of dissimilarity). Schelling's model and the urban heat island extend the specification.

## What it shows

A 40 × 40 grid of blocks shown as land use, land value, groups, income, deprivation or night temperature. Households move when too few neighbours are like them; regeneration of the old inner east raises values and prices out poorer residents unless homes are kept affordable; parks, green roofs and trees cool the centre. Indicators: index of dissimilarity, location quotient of group B in the inner east, deprivation, original residents displaced and heat-island intensity, with a chart over time and a west–east transect.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Schelling: preference and segregation | dissimilarity 0.20 with no preference, 0.42 at 30%, 0.65 at 60% |
| Bid-rent: land value against distance | £979 per m² at the centre to £98 at 10 km |
| Affordable housing and displacement | 92 original residents displaced with none affordable, 17 with 80% |
| Green cover and the heat island | 4.2 °C with no extra green, 1.9 °C with +50% |
| The LQ of a random area | mean 0.99, SD 0.09 (LQ = 1) |
