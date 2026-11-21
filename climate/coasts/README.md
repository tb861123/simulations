# Coasts

A single, self-contained HTML file: waves from wind and fetch, headlands and bays, longshore drift and spits, and managing the Holderness coast. It needs no install and no
internet: **open `coasts.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/coasts.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `coasts.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 1A Coastal landscapes and processes: geology, erosion, constructive and destructive waves, longshore drift, erosional and depositional landforms, hard and soft engineering, managed retreat; Holderness.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Option 2B Coastal landscapes and change: sediment cells and budgets, wave energy and power, lithology, sea-level change and the Bruun rule, Shoreline Management Plans.

## What it shows

Four views. **Waves:** wind blowing over a fetch you set makes waves (JONSWAP growth); their height, period, wavelength and steepness say whether they are constructive or destructive; graphs of height against fetch and power against wind speed. **Headlands and bays:** a discordant coast of alternating hard and soft rock (granite, limestone, chalk, clays, till) erodes over thousands of years into bays and headlands, with crack → cave → arch → stack → stump. **Longshore drift:** pebbles zig-zag along a beach (swash at the wave angle, backwash straight down) and a spit grows across an estuary. **Holderness:** 60 km of till cliff from Bridlington to Spurn in 500 m stretches, with storms, drift and a thin beach; add groynes, a sea wall, rock armour or nourishment at Mappleton and compare with no defences (terminal groyne syndrome); the Bruun rule for sea-level rise at A level.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Do waves grow with fetch? | log–log gradient 0.499, r = 0.999 (H ∝ √F) |
| Which wave angle drives drift fastest? | peak 2.99 m per wave at 45° (theory ½S sin 2θ = 3.00) |
| Does a spit grow at a steady rate? | 34.7 m a year, r = 1.000 |
| How fast does Holderness retreat? | mean 1.79 m a year, SD 0.036 (measured about 1.8) |
| Terminal groyne syndrome | 5.5 m extra downdrift retreat in 30 years with 0.5 km of groynes, 9.8 m with 4 km |
| The Bruun rule (A level) | 54.9 m of retreat per metre of rise (theory 54) |
