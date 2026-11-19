# Rivers and Landforms

A single, self-contained HTML file: source to mouth with the Bradshaw model and fieldwork; erosion and transport on the Hjulström curve; meanders and oxbow lakes; waterfalls and gorges. It needs no install and no
internet: **open `river-landforms.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/river_landforms.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `river-landforms.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 1B River landscapes and processes: profiles, the Bradshaw model, erosion, transport and deposition, landforms, the Tees, river fieldwork.
- **Advanced (A level):** Edexcel A level Geography (9GE0) has no river landscapes topic, so this level supports Topic 5 and the NEA: hydraulic radius and Manning's equation, Hjulström with numbers, competence and capacity, sinuosity, Spearman's rank with significance.

## What it shows

Four views. **Source to mouth:** the long profile (typical UK river or the Tees, with a waterfall at a hard rock band), the valley cross-section and the channel to scale with its bed load; flow (low, mean, bankfull); fieldwork at any site or every 10 km with Spearman's rank. **Erosion and transport:** 160 grains from clay to boulders in a flume, at rest, rolling, bouncing or suspended according to the Hjulström curve, with a flood option. **Meanders:** a channel that migrates (Howard and Knutson), cuts off oxbow lakes and leaves meander scars. **Waterfalls:** undercutting, collapse and retreat at your own fall, High Force or Niagara. Charts: the Bradshaw model and fieldwork; Hjulström and the load; sinuosity and a bend cross-section; retreat over time and against discharge.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| When do grains start to move? | a U-shaped curve, lowest (25 cm/s) for sand, about 12% below Hjulström's line |
| Do pebbles get smaller downstream? | 262 mm at the source to 0.24 mm at 100 km (Sternberg 250 → 0.23) |
| Does velocity increase downstream? | 0.57 m/s at 2 km to 1.09 m/s at 40–50 km, falling slightly to 0.96 near the mouth (Manning, within 1%) |
| Are meanders about 11 widths long? | gradient 10.5, r = 0.996 (10.9 w^1.01) |
| Does more water mean faster retreat? | log–log gradient 0.51 (theory 0.5) |
| Spearman's rank: how many pebbles per site? | r_s −0.61 with 1 pebble (often not significant against −0.648) to −0.98 with 30 |
