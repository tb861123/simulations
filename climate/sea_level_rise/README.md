# Sea Level Rise

A single, self-contained HTML file (`sea-level-rise.html`) about why the sea is
rising, how fast it is rising, and what that means for a low-lying coast. It runs
from 1900 to 2300 and is written for GCSE / iGCSE teaching. Open
`sea-level-rise.html` in Chrome or Edge. Nothing needs installing and it works
without the internet.

## What you see

- **Coast view (centre):** a made-up but realistic map of one of three places:
  an east-coast estuary town (UK-like), a delta city or a low-lying coral
  island. Flooding is coloured three ways: the sea, land flooded at high tide,
  and land flooded only during a storm. Homes turn red when they flood. Below
  the map is a cross-section from A to B with houses, walls and the water. Use
  the ✂ tool to pick where the cross-section is taken.
- **🌊 Storm:** a storm surge plus high tide on top of the new mean sea level.
  You can choose a 1-in-1, 1-in-10, 1-in-100 or 1-in-1000-year storm.
- **Sea walls:** draw them freehand or as an area, with a small, medium or large
  brush. You can set the wall height, raise every wall by 0.5 m, erase walls or
  remove them all. A wall only works if its top is above the water *and* it
  joins up with high ground.
- **🧊 Ice demo:** two glasses, one with an ice cube floating in water and one
  with an ice cube on a stone "land" block. Melt them and compare. The floating
  ice does not change the level; the land ice raises it by about 14 mm.
- **Right panel:** a story of what is happening and readout tiles: rise in cm,
  rate in mm/yr, thermal expansion, glaciers, Greenland, Antarctica, % of land
  flooded at high tide, homes and people affected, storm damage, and how often
  today's 100-year flood happens now. There are also two graphs: sea level since
  1900 stacked by contribution, with measured tide-gauge/satellite points, and
  the warming pathway.

At 1× speed the simulation runs at 2 years every second.

## Presets

Past century · Low emissions 2100 · High emissions 2100 · 2300, high
emissions · Antarctic instability · All Greenland melts (what-if +7.4 m) ·
Floating ice demo · Storm surge on top · Defended town (5 m walls hold in
2100; try 2200) · Sinking island.

## The model

The model is driven by global warming ΔT above 1850–1900. From 1900 to 2024 it
uses the measured record (smoothed). After that it follows SSP1-2.6, SSP2-4.5 or
SSP5-8.5-like pathways extended to 2300, or a slider.

- **Thermal expansion:** two ocean layers relax towards ΔT, the upper layer in
  25 years and the deep layer in 400 years. Rise = 0.065 m/°C × upper +
  0.22 m/°C × deep.
- **Glaciers** (0.32 m in total): rate = 0.42 mm/yr × (ΔT + 1.2)(1 + 0.5ΔT) ×
  (fraction left)^1.5.
- **Greenland** (7.4 m): rate = 0.45 mm/yr × (ΔT − 0.2 + 3f)(1 + 0.2(ΔT − 0.2))
  × (1 − f). The 3f term is the height–melt feedback.
- **Antarctica:** rate = 0.9 mm/yr per °C of lagged ocean warming (30 yr), minus
  0.05 mm/yr per °C for extra snowfall. There is an optional marine ice-cliff
  instability: above a threshold (2.5 °C by default) extra loss ramps up to
  25 mm/yr, to a maximum of 15 m.
- **Land water:** dams −0.3 mm/yr (1950–1990); groundwater +0.35 mm/yr
  (2000–2100).
- **Maps:** 5 km × 3.25 km. A **Map detail** setting picks the square size:
  Low 50 m (100 × 65), Medium 25 m (200 × 130, the default), High 12.5 m or
  Ultra 6.25 m (800 × 520, may be slow). The terrain and heights are the same
  at every setting, and homes are counted per area, so totals agree within a
  few per cent. Walls you draw are kept when you change it. Batch runs never
  use the map, so their results do not depend on this setting.
  Each grid square is 25 m at Medium. Water floods every square below the water
  level that it can reach from the sea, unless a higher wall blocks the way. There
  are 5 homes per 25 m × 25 m of built-up land, with 2.3 people per home.
- **Storms:** the annual maximum water level (tide + surge) follows a Gumbel
  distribution for each coast (estuary: mode 3.0 m, scale 0.25 m; delta: 1.6,
  0.30; island: 1.0, 0.10).

Calibration checks:

| Check | Model | Real world |
|---|---|---|
| Rise 1900–2018 | 0.16 m | about 0.20 m (tide gauges) |
| Rise 1900–2024 | 0.19 m | about 0.21 m |
| Rate 2006–2018 | 3.5 mm/yr | 3.7 mm/yr |
| 2100 vs 1995–2014, SSP1-2.6 / SSP2-4.5 / SSP5-8.5 | 0.44 / 0.54 / 0.72 m | AR6 medians 0.44 / 0.56 / 0.77 m |

The app lists every assumption under **How the model works**. Here are the main
things the model leaves out:

- Regional differences (gravity, land sinking or rising, ocean currents).
- Erosion and waves.
- Rivers flooding at the same time as the sea.
- How people adapt.

## Batch run

Press **📊 Batch run**. Projection runs pick the uncertain numbers at random each
time:

- future warming ×/÷ ≈1.25
- thermal expansion ±20%
- glaciers ±25%
- Greenland ×/÷ 1.5
- Antarctica ×/÷ 1.8

Projection runs use a 0.5-year step and no map. Storm runs simulate years of
random Gumbel storms. There are two modes, Repeat and Sweep, and results
download as CSV.

| Batch experiment | Result | Theory / IPCC |
|---|---|---|
| SSP1-2.6, 2100 (500 runs) | mean 0.47 m; 17–83% 0.39–0.54 m; 93% of runs inside the IPCC range | AR6 0.44 m (likely 0.32–0.62) |
| SSP5-8.5, 2100 (500 runs) | mean 0.77 m; 17–83% 0.62–0.90 m; 70% inside | AR6 0.77 m (likely 0.63–1.01) |
| Sweep warming 1.5–5 °C → 2100 | +0.16 m per °C | AR6 medians marked |
| Sweep warming → 2300 | +0.63 m per °C (about 1–3.3 m) | AR6 2300: 0.3–3.1 m (SSP1-2.6), 1.7–6.8 m (SSP5-8.5) |
| +0.5 m: floods above today's 100-yr level per century (1000 runs) | 7.3 ± 2.7 | theory 7.2 (Gumbel) |
| Sweep rise 0–1 m → return period | falls ×1.46 per 10 cm (100 yr → about 2.3 yr at +1 m) | theory ×1.49 per 10 cm |

The model's SSP1-2.6 spread is narrower than the IPCC's. The IPCC range
includes more Antarctic uncertainty than this simple model samples.
