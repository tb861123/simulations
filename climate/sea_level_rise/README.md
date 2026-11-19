# Sea Level Rise

A single, self-contained HTML file: why the sea is rising, how fast, and what it means for a low-lying coast in storms, from 1900 to 2300. It needs no install and no
internet: **open `sea-level-rise.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/sea_level_rise.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `sea-level-rise.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** causes of sea level rise (thermal expansion, melting land ice), effects on coasts (flooding, storm surges), responses (sea walls, managed retreat), evidence from tide gauges and satellites.
- **Advanced (A level):** eustatic change, thermal expansion and ice-sheet contributions, committed rise, storm-surge return periods and risk.

## What it shows

A coast map (estuary town, delta city or coral island) flooded by the sea level of any year plus a storm surge, with an adjustable sea wall; five emissions pathways (including “all emissions stop in 2025”); Greenland and Antarctica switches; an ice demo (floating ice against land ice). Charts: sea level since 1900 stacked by cause with measurements, and the warming pathway.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Sea level rise by 2100 in each pathway | 39, 48, 52, 60, 79 cm (theory 40, 45, 49, 60, 77) |
| How sure are we? (middle pathway) | mean 62 cm, SD 11, range 33–103 cm (central 60) |
| How much more often is the 100-year flood? | ×1.0 at +0 m to ×7.0 at +0.5 m (theory ×7.2) |
| Committed rise after emissions stop | 19 cm by 2050 to 129 cm by 2300 (theory 18 → 123) |
