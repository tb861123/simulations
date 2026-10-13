# Carbon Cycle and CO₂

A single, self-contained HTML file (`carbon-cycle.html`) that follows carbon
between the air, plants, soils, the ocean, fossil fuels and rocks from 1750 to
2300. It is for GCSE / iGCSE teaching. Open `carbon-cycle.html` in Chrome or
Edge. There is nothing to install and no internet is needed. Pick a preset; it
starts running at once.

## What you see

- **Centre:** a landscape diagram. Each store of carbon is a box whose area is
  proportional to √(carbon stored), so the huge deep ocean still fits on
  screen. Flows are arrows with width ∝ flow, and dots of carbon move along
  them. Each box shows how much it has gained or lost since 1750. The year
  counter runs from 1750 to 2300. At 1× speed, 3 years pass every second.
- **Right:** a "What's happening" story, readout tiles (CO₂ ppm, airborne
  fraction, the ocean's and land's share, ocean pH, CO₂-only warming, total
  emitted, the Revelle factor, fossil fuels left), and three graphs:
  - CO₂ in ppm, with ice-core points and Mauna Loa annual means.
  - Where the emitted carbon has gone (air / ocean / land, % of the total).
  - Surface ocean pH.
- **Left:** presets and controls.

## Controls

- **Future emissions after 2024:** historical only, sudden stop, net zero 2050,
  low / middle / high (like SSP1-2.6, SSP2-4.5 and SSP5-8.5), keep going at
  today's rate, *draw your own* (drag the dots), or no humans at all.
- Extra deforestation (2025–2100), trees planted (2025–2075) and volcanic
  activity.
- How the Earth responds: CO₂ fertilisation (β), ocean mixing speed and climate
  sensitivity. You can also switch off ocean uptake or the warming feedbacks, or
  turn on the seasonal wiggle (Keeling curve look).

## Presets

Historical run · Stop emissions today · Net zero 2050 · Middle road · High
emissions · Keep going · Deforestation · Plant a trillion trees · Volcanic CO₂
(double all volcanoes, no humans) · No ocean uptake · Keeling curve · Draw your
own.

## The model

Stores in 1750 (GtC): air 595 (280 ppm; 1 ppm = 2.124 GtC), plants 550, soils
1,700, surface ocean ~870 (top 100 m), middle ocean ~8,800 (100–1,000 m), deep
ocean ~29,500, fossil fuels 5,000, rocks ~60 million. Each step (0.1 yr) the
model works out change = flows in − flows out.

- Photosynthesis GPP = 120 × forest area × (1 + β ln(CO₂/280)), with β = 0.30.
  Plants breathe out half of GPP straight away. Litter fall = 60 × plants/550.
  Soil respiration = 60 × soils/1,700 × 1.3^(warming/10).
- Air–sea flow: 0.286 × pCO₂(air) into the sea and 0.286 × pCO₂(sea) out of it.
  pCO₂ and pH of the sea come from real carbonate chemistry: DIC, alkalinity
  2,300 µmol/kg, 18 °C, and the Lueker, Dickson, Weiss and Millero constants.
  This gives the Revelle buffer factor (9.5 in 1750, rising as the ocean takes
  up carbon), so ocean uptake slows as the ocean fills up.
- The extra dissolved carbon mixes down: surface ↔ middle ocean on a 6-year
  timescale (of surface water), middle ↔ deep on a 300-year timescale.
- Volcanoes add 0.1 GtC/yr. Weathering moves 0.1 × √(CO₂/280) GtC/yr from the
  air into the sea, and burial puts 0.1 GtC/yr into sediments.
- Deforestation moves carbon from plants to the air. 10% of the cleared area
  never grows back. Planting increases the forest area.
- Warming: F = 5.35 ln(CO₂/280) W/m², fed into a two-layer energy balance. It
  counts CO₂ only.
- Emissions 1750–2024 approximate the Global Carbon Project figures (fossil fuels
  plus land-use change). Future paths are simplified SSP-like curves.

Assumptions and simplifications are listed in the app under **How the model
works**. Mainly, it leaves out methane, aerosols, permafrost, nitrogen limits,
circulation changes, carbonate sediment dissolution and year-to-year noise.

## Batch run

Press **📊 Batch run**. Each run picks the uncertain numbers at random: ocean
mixing (×/÷ 1.4), CO₂ fertilisation (60–150% of the slider value) and climate
sensitivity (log-normal, about 2.3–3.9 °C for 1 SD). There are two modes:
*Repeat* (histogram plus a fan chart of CO₂ against time) and *Sweep* (mean
± 1 SD for each step). Results download as CSV. Headless runs use a 0.2-year
step.

Batch experiments and typical results:

| Question | Result | Compared with |
|---|---|---|
| CO₂ in 2100, middle road | 562 ± 32 ppm | IPCC SSP2-4.5: 603 ppm (our sinks are a little stronger) |
| Warming by 2100, high emissions | 3.9 ± 0.7 °C (CO₂ only, from 1750) | IPCC SSP5-8.5: 4.4 °C (all gases) |
| Does the model match Mauna Loa? | RMS 1.1 ppm with default settings; ensemble mean 6.9 ppm | measured annual means 1959–2024 |
| Pulse left in the air after 100 yr | 0.40 ± 0.05 (default run: 0.59 / 0.41 / 0.25 at 20 / 100 / 1000 yr) | Joos et al. 2013: 0.60 / 0.41 / 0.24 |
| CO₂ in 2100 for each scenario | sweep, with IPCC values marked | SSP1-2.6 446, SSP2-4.5 603, SSP5-8.5 1135 ppm |
| Stronger CO₂ fertilisation | about −31 ppm in 2100 for each +0.1 of β | — |

Mauna Loa annual means used (ppm, NOAA): 1959 316.0, 1965 320.0, 1970 325.7,
1975 331.1, 1980 338.8, 1985 346.1, 1990 354.4, 1995 360.8, 2000 369.7, 2005
379.8, 2010 389.9, 2015 401.0, 2020 414.2, 2024 424.6.
