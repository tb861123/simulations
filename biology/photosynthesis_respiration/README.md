# Photosynthesis and Respiration

Four small experiments in one page: oxygen bubbles from pondweed under a lamp, a
leaf exchanging gases through its stomata with four hydrogencarbonate indicator
tubes, a respirometer with germinating seeds, and (A level) the Calvin cycle's
pools of RuBP, GP and TP.

## How to run

Open `photosynthesis-respiration.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Pondweed**: drag the lamp along a metre rule, change the sodium
  hydrogencarbonate, the water bath and the lamp (an LED or a hot filament bulb),
  and count bubbles for a minute. Graphs: your counts against distance with the
  model, and rate against light intensity at three CO₂ levels (limiting factors).
- **Leaf**: a cross-section with stomata opening in the light, CO₂ and O₂ moving
  in or out; a whole day of sunlight; indicator tubes (no leaf, foil, gauze, full
  light) changing colour. Graphs: net gas exchange against light at 10, 20 and
  30 °C (compensation point) and CO₂ in each tube.
- **Respirometer**: peas, sunflower seeds, maggots or boiled peas, a control tube
  of glass beads, a drop moving along a capillary read every minute. Volume =
  πr² × distance. A level: water instead of soda lime, for the RQ.
- **Calvin cycle** (A level): switch the light off or cut the CO₂ and watch the
  pools change.
- Eleven guided investigations.

## Levels and revision

Standard follows Pearson Edexcel International GCSE Biology (4BI1) 2(e), 2(f)
and 2(g); Advanced follows OCR A level Biology A (H420) 5.2.1 and 5.2.2. The
**Revise** tab has key ideas and exam practice with mark schemes.

## Batch run

The inverse square law (counts against lamp distance), CO₂ as a limiting factor,
temperature (optimum about 35 °C), the scatter of 200 counts, the compensation
point (about 1100 lux at 20 °C), respirometer rate against temperature (Q10 ≈ 2)
and the RQ of sunflower seeds (0.70).

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its views of glycolysis, the Krebs cycle, the
light-dependent reactions and leaf-pigment chromatography (PAG6) are not in this version.

## Limits

All numbers are illustrative; bubbles are taken to be pure oxygen; stomata
respond to light only; indicator colour is worked out from CO₂ alone. See "The
model" tab for the full list.

## Source

Built from `tools/kit/src/photosynthesis_respiration.js` with the shared kit: edit that
file and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
