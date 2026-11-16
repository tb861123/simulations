# Ecosystems and Sampling

A single, self-contained HTML file for iGCSE biology with an A level option.
It needs no install and no internet: **open `ecosystems.html` in Chrome or
Edge**.

★ Enhanced: built from `tools/kit/src/ecosystems.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `ecosystems.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Biology (4BI1)
  section 4: ecosystems, quadrats, food chains and webs, pyramids, energy
  transfer, the nitrogen cycle, eutrophication.
- **Advanced (A level):** OCR A level Biology A (H420) 4.2.1 (sampling,
  Simpson's index), 6.3.1 (energy transfer, the nitrogen cycle, succession),
  6.3.2; PAG3.

## Five views

- **🍃 Food web and energy:** an oak woodland web; click a species to remove
  it and see the knock-on effects; energy at each level (log scale) from UK
  sunlight; pyramids of numbers, biomass and energy.
- **♻️ Nitrogen cycle:** stores and bacterial processes with arrow widths
  showing rates; soil oxygen, temperature, fertiliser, rain, legumes, harvest.
  Charts: stores over time; nitrate and ammonium against soil oxygen.
- **🔲 Quadrats:** a 40 m × 20 m field beside a wood with five species in clumps
  (shade lovers near the wood, open-ground species away from it); random
  quadrats (whole field or either zone), a belt transect; running estimate
  against the true population; kite diagram; Simpson's index for each zone.
- **🌱 Succession:** primary (bare rock) or secondary (abandoned field) on a
  60 × 30 grid, with grazing and fires; charts of stages and soil depth.
- **🐟 Eutrophication:** fertiliser washed into a lake: algal bloom, plants
  shaded out, decomposers use the oxygen, fish die.

## Investigate

Remove a species · Why only 10%? · Pyramids · Nitrogen in waterlogged soil ·
Peas and beans · Estimate a population · Transect · Eutrophication · (A level)
Succession and grazing · Simpson's index.

## Batch run

| Experiment | Result when tested |
|---|---|
| How many quadrats are enough? | error falls from 27% (5 quadrats) to 8% (80) |
| Random or chosen? | random 98% of the true population; chosen by eye 173% |
| Transfer efficiency and the top of the chain | energy at level 4 ∝ efficiency³ |
| Soil oxygen and nitrate | 0.5 kg/ha waterlogged → 12 kg/ha aerated |
| Fertiliser runoff and the fish | lowest oxygen falls below 3 mg/L above about 0.2 |
| Grazing and succession | woodland 89% with no grazing, 14% with heavy grazing |

## The models and their simplifications

Typical and illustrative numbers. Energy: sunlight × photosynthesis
efficiency × transfer efficiency per step. Nitrogen: monthly rates for each
process, faster when warm. Quadrats count every plant inside them. Succession:
each stage needs enough soil and spreads from neighbours. Lake: nitrate → algae
→ shading → decomposition → oxygen → fish. The earlier version's pond web,
carbon-cycle view, deforestation, fishery, Spearman's rank and t-test are not
included (the carbon cycle has its own simulation).
