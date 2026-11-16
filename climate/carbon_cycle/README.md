# Carbon Cycle and CO₂

A single, self-contained HTML file that follows carbon between the air,
plants, soils, the ocean and fossil fuels from 1750 to 2300. It needs no
install and no internet: **open `carbon-cycle.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/carbon_cycle.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `carbon-cycle.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** the carbon cycle, human effects on CO₂, the greenhouse
  effect, ocean acidification.
- **Advanced (A level):** stores and fluxes, sinks and feedbacks, carbonate
  equilibria and pH; the Revelle factor and SSP scenarios are beyond the spec.

## What it shows

- A landscape of stores (box area ∝ √carbon, change since 1750) joined by
  flows (arrow width ∝ flow): photosynthesis, respiration, decomposition,
  burning fossil fuels, deforestation, air–sea exchange, ocean mixing.
- Futures after 2024: sudden stop, net zero 2050, low / middle / high (like
  SSP1-2.6, SSP2-4.5, SSP5-8.5), keep going, no humans. Extra deforestation,
  tree planting, volcanic activity.
- How the Earth responds: CO₂ fertilisation β, ocean mixing, climate
  sensitivity; switch off ocean uptake or the warming feedback; a seasonal
  wiggle.
- Charts: CO₂ with ice-core and Mauna Loa points; where the emitted carbon
  has gone (air, ocean, land). Readings: CO₂, airborne fraction, ocean pH,
  warming, Revelle factor.

## Investigate

Since 1750 · Where does the carbon go? · Stop today · High emissions · Cutting
down forests · Plant trees · (A level) The ocean fills up · No ocean.

## Batch run

| Experiment | Result when tested |
|---|---|
| CO₂ in 2100 under each scenario | stop 379, net zero 391, low 436, middle 553, high 835 ppm |
| Stop today: how fast does CO₂ fall? | 385 ppm (slow mixing) to 352 ppm (fast) in 2100 |
| Plants and the land sink | airborne fraction 0.59 (β = 0) to 0.36 (β = 0.5) |
| Warming against total emissions | a straight line, about 1.2 °C per 1000 GtC |
| Ocean acidification | pH 8.08 (stop) to 7.77 (high) in 2100 |

## The model

Stores in 1750: air 595, plants 550, soils 1700, surface ocean 870, middle
8800, deep 29 500, fossil fuels 5000 GtC. Photosynthesis with CO₂
fertilisation (β = 0.22), respiration, litter, soil respiration (faster when
warmer); air–sea exchange from carbonate chemistry (alkalinity 2300 µmol/kg,
18 °C, with borate), giving the Revelle factor; ocean mixing on 6 and 300
year timescales; volcanoes, weathering and burial; a two-layer warming
model (CO₂ only). Gives 424 ppm and pH 8.05 in 2024. Leaves out methane,
aerosols, permafrost, nitrogen limits and circulation changes.
