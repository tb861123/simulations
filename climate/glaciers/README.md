# Glaciers

A single, self-contained HTML file: a valley glacier that grows and shrinks with the climate, corries, U-shaped troughs and freeze–thaw. It needs no install and no
internet: **open `glaciers.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/glaciers.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `glaciers.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 1C Glaciated upland landscapes and processes: freeze–thaw, abrasion and plucking, accumulation and ablation, corries, arêtes, U-shaped valleys, truncated spurs, hanging valleys, moraines.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Option 1A Glaciated landscapes and change: mass balance and the ELA, warm- and cold-based ice (internal deformation, basal sliding), response to climate change, erosion processes and landforms, periglacial processes.

## What it shows

Four views. **Valley glacier:** a flowline ice model on a mountain valley; the equilibrium line rises about 150 m per °C of warming, the snout advances or retreats to a new balance and leaves terminal and recessional moraines; warm-based sliding at A level; graphs of mass balance with height and length over time. **Corrie aspect:** turn a mountain slope to every direction; shade from the midday sun and snow drifting on the lee of south-westerly winds give north-east-facing slopes the best balance. **V to U:** ice fills a V-shaped river valley and erodes hardest where it drags most, turning it into a U-shaped trough (the shape exponent b rises towards 2). **Freeze–thaw:** daily and yearly temperature cycles with weather; count the crossings of 0 °C for any mean temperature.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Does the snowline rise about 150 m per °C? | gradient 152 m per °C, r = 0.999 |
| How long is a glacier in a warmer climate? | 17.8 km at −1 °C to 7.8 km at +3 °C |
| Which way should a corrie face? | best balance at 0–30° (N to NE), worst at 180° (S) |
| Does ice turn a V into a U? | shape exponent b from 1.1 (V) to 2.0 at 40 thousand years and 2.9 at 60 |
| When is freeze–thaw most active? (A level) | about 200–220 cycles a year between −4 and +4 °C, about 20 at ±14 °C |
