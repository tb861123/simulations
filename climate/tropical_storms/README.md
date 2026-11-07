# Weather Hazards and Tropical Storms

A single, self-contained HTML file (`tropical-storms.html`) for physical
geography. Open it in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0), Component 1
Topic 2 *Weather hazards and climate change*: the global atmospheric
circulation (Hadley, Ferrel and polar cells, pressure belts, surface winds,
the Coriolis effect, heat transfer towards the poles); climate graphs;
tropical cyclones: distribution and seasonality, the conditions for formation
(sea above 26.5 °C, warm water about 50 m deep, low wind shear, 5–30° from the
equator), structure (eye, eyewall, rain bands), movement and decay over land
or cold water, the Saffir–Simpson scale; hazards (wind, storm surge,
rainfall, landslides) and impacts in countries at different levels of
development (Typhoon Haiyan 2013, Hurricane Katrina 2005, Cyclone Idai 2019);
responses (prediction, preparation, protection); and how climate change may
affect storms. Drought is also in 1GA0 Topic 2 (2.7a–c and 2.8a–c, with
skill (5) graphs of medium-term rainfall trends): a short card under the
climate graph gives its causes and impacts and the GCSE treatment (rainfall
against the long-term average, a simple surplus / deficit idea, also 1GA0
6.8c), and links to the water budget and drought tab of
`climate/flooding_hydrographs` (formal P − ET water budgets are A level,
9GE0 5.3a). UK weather hazards
are summarised beside the London climate graph, tagged "beyond the spec"
because they are not a named 1GA0 topic.

**Advanced**: Edexcel A level Geography (9GE0) has **no weather hazards
topic**, and the level hint in the page says so: tropical cyclones appear only
incidentally, in 2B.9b (storm surges, Option 2B: Coastal Landscapes and
Change) and 1.7c (the Philippines as a multiple-hazard zone). This level goes
further for interest and links: Topic 1 (1.7c, the Philippines as a
multiple-hazard zone; risk, Park and PAR models), Topic 5 (atmospheric
circulation; storms as a cause of floods) and Topic 6 (warming oceans). It
adds the Coriolis parameter f = 2Ω sin φ, Hadley cell width against the
planet's spin (Held and Hou), jet streams, potential intensity, storm-surge
and rainfall physics, the Poisson distribution of storm counts, ENSO, and
climate projections (Knutson et al. 2020).

## What it shows

Four tabs at the top of the centre panel:

- **🌍 Global circulation**: a globe with the pressure belts and animated
  surface winds (trade winds, westerlies, polar easterlies), beside a
  pole-to-pole cross-section of the Hadley, Ferrel and polar cells with
  moving air, clouds where air rises (L) and deserts where it sinks (H). The
  ITCZ and belts follow the Sun through the year. A level: the planet's spin
  and heating contrast change the number and width of the cells; jet streams
  marked. Graphs: Coriolis deflection of moving air at five latitudes;
  climate graphs (Singapore, Miami, Cairo, London, Reykjavík, Utqiaġvik);
  energy surplus and deficit by latitude.
- **🌀 How a storm forms**: one storm from a cluster of thunderstorms, from
  above (satellite-style spiral bands and eye) and in cross-section (eyewall,
  eye, rain bands, inflow, outflow, warm core, the sea doming under low
  pressure). Sliders for sea temperature, wind shear, latitude, depth of
  warm water, landfall and terrain; a checklist of the four conditions.
  Graphs: strength over time against the Saffir–Simpson bands and the
  potential intensity; wind and pressure across the storm; the
  Saffir–Simpson scale with wind force (∝ V²) and power (∝ V³).
- **🗺 A hurricane season**: a stylised North Atlantic coloured by sea
  temperature (white line: 26.5 °C) from 1 June to 30 November. Disturbances
  appear, some grow into named storms, are steered west by the trade winds
  and recurve into the westerlies; landfalls marked; some reach Europe as
  post-tropical storms. Settings: ocean warming, El Niño / La Niña, number of
  disturbances, and at A level whether the formation threshold rises as the
  tropics warm. Graphs: this season against the NOAA averages; storms per
  season over many seasons against a Poisson distribution; sea temperature by
  latitude.
- **🌊 Hazards and impacts**: a coastal cross-section as the storm comes
  ashore: storm surge plus tide flooding the coastal plain (or breaching
  levees, Katrina), roofs lost to the wind, rain, landslides on steep hills.
  Cases: Haiyan, Katrina, Idai, or your own storm. Graphs: real deaths,
  damage, GDP per person and surge for the three storms; a forecast cone;
  wind and damage.

Right panel: what's happening, readings, real-world cards with sources, key
ideas tagged by spec, exam practice (11 GCSE questions and 6 extension
questions with mark schemes; several use the numbers on screen: climate graph
range and total, Saffir–Simpson category, percentage difference, Coriolis
parameter, inverse barometer) and "How the model works (and what it leaves
out)". Links to Weather and Chaos, The Greenhouse Effect, Sea Level Rise,
Flooding and Storm Hydrographs and Tectonic Hazards.

## Controls

- **Presets** (12): Three cells and the seasons · The Coriolis effect ·
  Climate graphs and UK weather · A storm is born · No storm: conditions not
  met · Inside a hurricane · Landfall: the storm weakens · A hurricane season ·
  Warmer seas · Typhoon Haiyan 2013 · Hurricane Katrina 2005 · Cyclone Idai
  2019.
- Global circulation: month, seasons change while playing, climate graph
  place; A level: planet's spin, heating contrast.
- How a storm forms: sea temperature, wind shear, latitude, depth of warm
  water, landfall day, terrain, seed.
- A hurricane season: ocean warming, El Niño / La Niña, threshold (A level),
  disturbances a year, seed.
- Hazards: case study; wind at landfall, shelf width and depth, forward
  speed, tidal range, hills, houses (any change makes it your own storm).
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): wind particles, cloud puffs, rain streaks and sea-temperature map
  resolution. It changes only the picture, never the models or batch runs.
  Measured at 1920×1080: about 60 frames a second at every level (the
  sea-temperature map is cached and redrawn once per simulated day).
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Circulation drawn from cell edges at 0°, 30°, 60°, 90° shifted with the
  ITCZ (about 2°S in January to 12°N in July); A level Hadley edge
  = 30° × √(heating) ÷ spin (Held and Hou 1980).
- Coriolis: a frictionless puck on a spinning sphere, f = 2Ω sin φ.
- Storm strength grows towards the potential intensity
  V = 28.2 + 55.8e^(0.1813(SST − 30)) m/s (DeMaria and Kaplan 1994), cut by
  wind shear, dry air (random per storm) and upwelling of cold water; it
  needs the Coriolis effect (none within 3° of the equator). Over land:
  Kaplan and DeMaria (1995) decay. Pressure from wind: Atkinson and
  Holliday (1977). Wind and pressure profiles: modified Rankine vortex,
  Holland (1980).
- Season: disturbances arrive as a Poisson process peaking in September;
  each becomes a named storm with a chance set by sea temperature, potential
  intensity, shear, latitude and warm-water depth. Calibrated to about 14
  named storms, 9 hurricanes and 3 major hurricanes a season (NOAA 1991–2020:
  14.4, 7.2, 3.2).
- Storm surge: 1 cm per hPa below 1013 hPa plus wind set-up stepped across
  the shelf, dη/dx = τ ÷ (ρg(h + η)), τ = ρ_air × 0.002 × (0.75V)².
- Rain at a town = rain rate × chord across the rain area ÷ forward speed.

Constants are illustrative unless a source is given; the page lists every
assumption and what is left out.

## Data and sources (rounded)

- NOAA Climate Prediction Center: Atlantic averages 1991–2020 (14.4 named
  storms, 7.2 hurricanes, 3.2 major hurricanes; ACE about 120).
- Typhoon Haiyan 2013: NDRRMC final report (April 2014): 6,300 dead, 1,061
  missing, 28,689 injured; 16 million affected, 4.1 million displaced, damage
  about US$2.2 bn; winds about 315 km/h (JTWC, 1-minute); storm surge over
  5 m at Tacloban (IFRC final report MDRPH014, June 2017), locally up to about
  7 m (field surveys).
- Hurricane Katrina 2005: NOAA NHC report (Knabb et al.); NCEI (damage about
  US$125 bn); deaths about 1 830; surge up to about 8.5 m; 80% of New
  Orleans flooded.
- Cyclone Idai 2019: UN OCHA, WMO, World Bank: over 1 300 deaths in three
  countries, about 3 million affected, damage about US$2.2 bn, surge about
  4.4 m at Beira.
- Climate graphs: Met Office (London Heathrow 1991–2020), Meteorological
  Service Singapore, NOAA NCEI normals (Miami, Utqiaġvik); Cairo and
  Reykjavík approximate.
- UK hazards: Met Office (Storm Eunice 2022, 196 km/h at the Needles; Storm
  Desmond 2015, 341.4 mm in 24 h at Honister Pass, the UK record; 40.3 °C at Coningsby, 2022);
  Met Éireann (Ophelia 2017).
- Projections: Knutson et al. (2020), *BAMS*: at 2 °C, about −14% storm
  frequency, +13% share of Category 4–5, +5% intensity, +14% rain rate.
- Forecast track errors: rounded from NOAA NHC verification.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How many storms in a season?** 200 seasons: mean 14.65, SD 3.56 against
   theory 14.29 and Poisson SD 3.78 (+2.5%, 1.4 standard errors).
2. **How strong can a storm get?** SST 26–31 °C: peak winds rise from 132 to
   247 km/h, about 75% of the potential intensity (177–342 km/h): few storms
   reach their limit.
3. **How fast do storms weaken over land?** Within 1–4 km/h of Kaplan–DeMaria
   at every hour (225 → 53 km/h over 48 h).
4. **How high is the storm surge?** 900–1000 hPa: 4.5 m to 0.1 m, about 20%
   below the simple formula (storms not head-on; deeper water as it piles
   up); inverse barometer alone is only 0.1–1.1 m.
5. **Slow storms, more rain?** 2–40 km/h: log–log gradient −1.000 (theory
   −1); 1 290 mm at 2 km/h to 64 mm at 40 km/h.
6. **Warmer seas, more storms?** (A level) With a fixed 26.5 °C threshold
   storm numbers rise about 70% by 2 °C (matching the model's expected
   number), unlike climate models (about −14%, Knutson et al. 2020): a
   simple model that leaves out how the whole atmosphere changes is wrong.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
