# Plant Transport and Responses

A single, self-contained HTML file: xylem and phloem through a day, the
potometer practical, the leaf and cohesion–tension, and tropisms with auxin. It
needs no install and no internet: **open `plant-transport.html` in Chrome or
Edge**. Printable worksheets (one per investigation and per batch experiment,
with teacher notes) are in `worksheets.html`.

★ Enhanced: built from `tools/kit/src/plant_transport.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `plant-transport.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4BI1 2(h) transport in plants and
  transpiration, 2(g) stomata, 2(j) tropisms and auxin.
- **Advanced (A level):** OCR H420 3.1.3 (potometer PAG5, cohesion–tension,
  translocation) and 5.1.5 (plant responses, PAG11).

## Four views

Whole plant (a sunflower through a day: water up the xylem, sucrose in the
phloem, wilting in dry soil) · Potometer (light, humidity, wind, temperature,
capillary radius; measure and plot) · Leaf (palisade, spongy mesophyll, stomata
and the water pathway) · Tropisms (light from one side; a seedling laid on its
side).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Light and transpiration | 5.2 → 18.8 mm/min, levelling off above 40% (5.6 → 18.6) |
| Humidity and transpiration | 30.4 → 1.8 mm/min, a straight line (29.5 → 1.85) |
| Wind and transpiration | 19.8, 34.6, 38.5, 38.3, 37.8 (18.4, 34.8, 37.3, 38.3, 38.8) |
| How precise is one potometer result? (500) | 18.6 ± 2.4 mm/min (18.4) |
| Capillary radius and bubble speed (log–log) | gradient −1.96 (−2) |
| Phototropism: brighter light, bigger bend? | 0 → 23° in 4 h |
