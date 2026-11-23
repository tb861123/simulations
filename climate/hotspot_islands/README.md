# Hotspot Island Chains

A single, self-contained HTML file: a plate slides over a fixed mantle plume. Each volcano grows while it is over the plume, then is carried away, worn down and sunk: active shield volcano → eroding island → atoll → guyot. A map strip and a cross-section through the ocean, plate and mantle (plume, decompression melting, magma conduits) move together; the volcano ages against distance give the plate speed, compared with real Hawaiian data. It needs no install and no internet: **open `hotspot-islands.html` in Chrome or Edge**. Printable worksheets (one per investigation and per batch experiment, with teacher notes) are in `worksheets.html`.

Built with the shared kit from `tools/kit/src/hotspot_islands.js` by `node build.js` (run inside `tools/kit/`). Do not edit `hotspot-islands.html` by hand.

- **Introduction:** hotspots and mantle plumes, a moving plate, and why islands get older, lower and more worn down along the chain.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Topic 1, 1.2 (hotspots as evidence for plate movement); AQA A level Geography (7037) 3.1.5. Decompression melting, flexure and cooling subsidence, the subsidence rate of each volcano, and the island → atoll → guyot sequence.

## What it shows

Six scenarios (Hawaiʻi today, slow and fast plates, weak plume, erosion only, subsidence only). Sliders for plate speed, magma supply, erosion, subsidence and vertical exaggeration; a time slider to scrub through the run; an "irregular plume" switch (new volcanoes at uneven times, uneven supply, from a seed). Click a volcano to follow it in every view. Graphs: age against distance from the hotspot (theory line, model volcanoes, real Hawaiian volcanoes and their fit) and summit height against age.

Try this first: Pick any volcano: divide its distance from the hotspot by its age. What plate speed do you get?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Reading the plate speed from the chain | 3: 2.98 ± 0.0455 · 4.5: 4.57 ± 0.0367 · 6: 6.04 ± 0.0635 · 7.5: 7.38 ± 0.106 · 9: 9.05 ± 0.0877 · 10.5: 10.5 ± 0.138 · 12: 12 ± 0.227 cm/yr (mean ± SE, 5 runs each) (theory: the true speed) |
| Spacing of the volcanoes | 2: 32.5 ± 0.376 · 4: 64.3 ± 1.57 · 6: 96.2 ± 1.4 · 8: 133 ± 3.8 · 10: 161 ± 3.4 · 12: 202 ± 4.19 km (mean ± SE, 5 runs each) (theory: v × 1.6 Myr) |
| Faster plate, smaller volcanoes | 2: 4890 ± 22 · 3: 4770 ± 17.9 · 4: 4720 ± 45.4 · 6: 4360 ± 46.4 · 8: 4090 ± 48.4 · 10: 3790 ± 76.1 · 12: 3350 ± 61.1 m (mean ± SE, 4 runs each) |
| How long does an island last? | 0.25: 8.92 ± 0.0239 · 0.5: 7.21 ± 0.00993 · 0.75: 5.98 ± 0.0422 · 1: 4.88 ± 0.025 · 1.25: 4 ± 0.0486 · 1.5: 3.28 ± 0.0241 · 2: 2.06 ± 0.012 Myr (mean ± SE, 4 runs each) |
| Erosion before drowning (A level) | 0.25: 1690 ± 18.1 · 0.5: 2040 ± 28.4 · 1: 2060 ± 43.3 · 1.5: 2030 ± 9.84 · 2: 2010 ± 38.2 m (mean ± SE, 4 runs each) |
| Dating errors and the fitted speed | mean 8.51, SD 0.236, SE 0.0192 cm/yr from 150 runs (theory: 8.5) |

## The model

See "The model" tab in the page, and the comment at the top of `tools/kit/src/hotspot_islands.js`. Growth, erosion, subsidence and reef rates are illustrative and sped up so the whole life cycle fits in one run.

## The original version

This simulation was contributed by a colleague as a single HTML file. That file is kept, unchanged, in `original/hotspot-island-chain.html`, and is linked from "The model" tab. The kit version keeps its model, drawing and scenarios, and adds the Batch run, worksheets, Investigate cards and a Revise tab. It also adds the irregular-plume option and simulated K–Ar dating errors, so batch runs show real scatter.
