# Flooding and Storm Hydrographs

A single, self-contained HTML file (`flooding-hydrographs.html`) for physical
geography. Open `flooding-hydrographs.html` in Chrome or Edge, with no install
and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0), Component 1
Topic 1B *River landscapes and processes*: the drainage basin (watershed,
source, tributaries, confluence, mouth), storm hydrographs, the physical and
human factors that affect flood risk, hard and soft engineering, and UK flood
examples. Flood frequency (recurrence intervals, return periods) is on the
GCSE spec as a numerical skill, tagged "1GA0 Mathematics and Statistics
Skills: magnitude and frequency (e.g. 1:200 flood events)".
**Advanced** follows Pearson Edexcel A level Geography (9GE0) Topic 5 *The
water cycle and water insecurity*: the drainage basin as an open system,
infiltration-excess and saturation-excess overland flow, human impacts on the
water cycle, water budgets (named A level content: 9GE0 5.3a, skill 3: water
budget graphs, so the water budget tab is Advanced only), river regimes, drought (meteorological,
agricultural, hydrological), recurrence intervals and climate change. Switch
with the **Level** buttons.

## What it shows

Three tabs at the top of the centre panel:

- **🌧 Storm hydrograph**: an OS-map style plan of the drainage basin
  (contours, woodland and built-up areas, watershed, source, tributaries, a
  labelled confluence, the mouth, the town and its gauging station) with rain
  falling and water running down the channels; and a hillslope cross-section
  showing precipitation, interception, infiltration, overland flow,
  throughflow, percolation and groundwater flow, each arrow sized by its flow
  in mm/h. Below, the live **storm hydrograph**: rainfall bars, discharge,
  base flow shaded, peak discharge, peak rainfall, lag time, rising and
  falling limbs, and the bankfull line. At A level the flows are stacked
  (overland, throughflow, base flow) and a second view draws **the basin as an
  open system** (inputs, stores, flows and outputs with running totals and the
  water balance P = Q + E + ΔS). Press **📌 Keep** to keep a hydrograph for
  comparison; several presets show a "before" hydrograph automatically.
- **📅 Flood frequency**: 30–200 simulated years, each with its biggest storm.
  Bar chart of each year's biggest flood against bankfull and the T-year
  flood; a flood frequency graph of discharge against recurrence interval
  ((n + 1) ÷ rank, log scale) with a fitted Gumbel line, the estimated
  100-year flood and the model's true curve; a ranked table.
- **💧 Water budget and drought** (A level): a year of daily weather for a
  Lake District valley, the Somerset lowlands or London, in an average year,
  a 2022-like drought, a 2013–14-like wet winter or a 2070s climate. Hillslope
  view through the year; water budget graph (precipitation, potential and
  actual evapotranspiration, soil moisture, with surplus, utilisation,
  deficit and recharge marked month by month); river regime graph with the
  hydrological drought line (30% of mean flow). Groundwater abstraction,
  urban land and woodland change the budget (human impacts).

Right panel: what's happening, live readings, the real event for case-study
basins (with sources), key ideas tagged by spec, exam practice (7 GCSE and 7 A
level questions with mark schemes; several use the numbers on screen: lag
time, rise in discharge, runoff coefficient, mm/h conversion) and "How the
model works (and what it leaves out)". Links to Rivers and Landforms, Sea
Level Rise, Weather and Chaos, Forest Fire and Carbon Cycle.

## Controls

- **Presets** (12): A storm hydrograph · Urbanisation · Deforestation ·
  Saturated ground · Permeable chalk (Itchen) · Boscastle 2004 · Storm
  Desmond 2015 · Somerset Levels 2014 · Hard engineering · Soft engineering ·
  How often do floods come? · and at A level Drought: 2022.
- **The drainage basin**: case-study basin (your own, Valency at Boscastle,
  Eden at Carlisle, Parrett and Tone, Itchen), area (5–3000 km²), relief
  (mean slope), shape (round, average, elongated), rock (impermeable or
  permeable), drainage density. **Land use**: urban %, woodland %.
- **The storm**: rainfall, duration (1 hour to 10 days), pattern, soil
  saturation before the storm (antecedent conditions), random gusts.
- **Flood management**: hard (dam and reservoir, relief channel,
  embankments, dredging and straightening) and soft (natural flood
  management, flood plain zoning, flood warnings, SuDS; afforestation is the
  woodland slider).
- **Flood frequency**: years, the T-year flood to mark, usual soil
  saturation, whether wetness varies each year, seed.
- **Water budget** (A level): place, year type, rainfall %, groundwater
  abstraction, seed.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in
  this browser): number of raindrops and flowing-water dots, and the
  resolution of the contour grid. It changes only the picture, never the
  model or the batch runs.
- Play / Pause, Reset, Finish, speeds (storm 1× = 1 hour per second; flood
  frequency 1× = 1 year per second; water budget 1× = 10 days per second),
  hide/show panels, full screen.

## The model

A conceptual "bucket" model, run every 15 minutes:

- Stores: interception (0.5 mm on grass to 2.7 mm under full woodland), soil
  (100 mm, or 150 mm over permeable rock; field capacity 45%), groundwater,
  urban depression storage (1 mm).
- Infiltration capacity f = f_c + (f_0 − f_c)(1 − θ)^1.5 (θ = how full the
  soil is); rain beyond it, or on saturated soil, is overland flow.
- Throughflow q = (S_max − S_fc) ÷ k × w^2.5 with k = 10 × (2 ÷ drainage
  density) ÷ √(slope ÷ 4) h; percolation up to 3 mm/h (permeable) or
  0.12 mm/h; base flow = G ÷ k_g (k_g = 1200 h chalk, 300 h otherwise).
- Routing: overland flow travels 1 ÷ (2 × drainage density) km to a stream;
  channels flow at 0.35 + 0.65√slope m/s (faster with urban drains and
  dredging); main river length L = 1.5 A^0.6 km (Hack's law); basin shape
  sets the time–area curve. Q (m³/s) = flow (mm/h) × area (km²) ÷ 3.6.
- Bankfull = the 2-year flood of the basin with its usual land use.
- Rational method (theory in the batch run): Q = C i A ÷ 3.6.
- Flood frequency: each year's biggest storm is drawn from a Gumbel
  distribution (100-year storm ≈ 2.2 × the 2-year storm).
- Water budget: daily bucket model; actual evapotranspiration = PE while the
  soil is more than 60% full, less when drier.

Assumptions and what is left out are listed in the page ("How the model
works"): no spatial variation of rain, no snow, no tides (tide-locking on the
Somerset Levels), no debris blockage (Boscastle), no upstream flood plain
storage; it is a teaching model, not the Flood Estimation Handbook.

## Data and sources (rounded)

- Boscastle, 16 Aug 2004: about 185 mm of rain on high ground (181 mm in 5 h
  at Otterham); peak flow about 140 m³/s, the best estimate (estimates
  130–150 m³/s); about 100 rescued, 58 properties flooded, 115 cars washed
  away. Met Office (2004); Environment Agency (2005); HR Wallingford (2005).
- Storm Desmond, Dec 2015: 341.4 mm in 24 h at Honister Pass (UK record);
  record peak flows of about 1700 m³/s on the Eden, Lune and Tyne (CEH); Eden
  at Sheepmount (NRFA 76007, 2287 km²) about 1700 m³/s (approximate); about
  2100 properties flooded in Carlisle. Met Office (2016); CEH (2016); NRFA;
  Cumbria County Council.
- Somerset Levels, winter 2013–14: wettest Dec–Feb in the England and Wales
  series since 1766; about 65 km² flooded; about 150 homes; 8 km dredged.
  Met Office (2014); Environment Agency / Somerset Rivers Authority.
- River Itchen: chalk, baseflow index above 0.9 (NRFA 42010).
- 2022: 40.3 °C at Coningsby on 19 July 2022 (Met Office); hosepipe bans.
- Monthly rainfall: approximate 1991–2020 means after Met Office climate
  averages, rounded; PE values and year patterns are illustrative.
- Natural flood management: Pickering "Slowing the Flow".

The case-study basins' settings (area, slope, rock, shape, drainage density)
are the model's estimates of each basin's character; the model's peaks for
Boscastle (about 140 m³/s, matching the best estimate; the preset spreads
125 mm of rain evenly over the basin) and Storm Desmond (about 1700–1800 m³/s) are of the right size, but
it is not calibrated on gauge records.

## Batch run

**📊 Batch run** opens the batch panel (all settings in an editable table;
tick one to sweep it; Repeat or Sweep; CSV download). One-click experiments:

1. **Does building on the basin raise the peak?** Urban 0–80%: peak rises
   from about 11 to 56 m³/s; the rational method agrees for rural basins
   and falls behind (44 m³/s at 80%) because gusty rain on roofs passes on
   peaks above the average rate.
2. **Does a bigger basin mean a longer lag?** 5–3000 km²: lag 0.75 → 14 h;
   log–log gradient 0.48 (rule of thumb 0.6 × time of concentration
   predicts 0.6).
3. **How long do you wait for a 1-in-20-year flood?** 1000 records: mean
   19.95 years (theory 20), SD 19.1 (theory 19.5).
4. **How many 10-year floods in a century?** 500 centuries: mean 10.1
   (theory 10), SD 3.05 (theory 3.0). Ticking "soil wetness varies" shows
   joint probability.
5. **How long a record do you need?** Records of 10–200 years: the SD of the
   estimated 100-year flood falls from 49 to 10 m³/s; estimates settle near
   the long-record Gumbel value (85 m³/s), below the true 107 m³/s, because
   floods have a longer tail than the Gumbel curve.
6. **Does the water budget balance?** (A level) London, rainfall 40–200%:
   runoff equals P − AE − abstraction − ΔS exactly; it lies above the
   surplus P − PE in dry years (soil moisture deficit).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
