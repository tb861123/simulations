# Rivers and Landforms

A single, self-contained HTML file (`river-landforms.html`) for physical
geography. Open `river-landforms.html` in Chrome or Edge, with no install and
no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0), Component 1
Topic 1B *River landscapes and processes*: the long profile and cross profile
and how the channel changes downstream (the Bradshaw model); erosion
(hydraulic action, abrasion, attrition, solution), transport (traction,
saltation, suspension, solution) and deposition; landforms (V-shaped valleys
and interlocking spurs, waterfalls and gorges, meanders and oxbow lakes, flood
plains and levees, estuaries); a UK river (the Tees); river fieldwork.
**Advanced**: Edexcel A level Geography (9GE0) has no river landscapes topic,
so this level adds what supports Topic 5 (channel flow and discharge) and the
independent investigation (NEA) fieldwork skills: channel efficiency
(wetted perimeter, hydraulic radius, Manning's equation), the Hjulström curve
with numbers, competence and capacity, helicoidal flow, sinuosity and meander
wavelength, and Spearman's rank with significance testing. The level hint in
the page says this.

## What it shows

Four tabs at the top of the centre panel:

- **🏞 Source to mouth**: the long profile (with upper, middle and lower
  courses, landforms labelled, a waterfall where a band of hard rock crosses
  the river) and, where you are, the valley cross-section (V-shaped to wide
  flood plain, with vertical exaggeration stated) and the channel
  cross-section to scale with its bed load (and whether this flow can move
  it). Press Play to travel downstream. Graphs: the Bradshaw model (every
  characteristic against distance, increasing solid, decreasing dashed);
  fieldwork scatter graph with line of best fit; the Hjulström curve at this
  point. **Fieldwork**: measure a site (width, 5 depths, a float timed three
  times over 10 m, 10 pebbles' size and Powers roundness), or measure every
  10 km automatically; results table; at A level Spearman's rank with ranks,
  d, d², r_s and the critical value.
- **🪨 Erosion and transport**: a 3 m stretch of river bed (side view) with
  particles from clay to boulders. Velocity steady (log slider) or a flood
  rising and falling. Particles are picked up, roll (traction), bounce
  (saltation), are carried (suspension) or settle, following the Hjulström
  curve; abrasion lowers the bed, hydraulic action breaks off angular
  pieces, attrition rounds stones, and a limestone bed dissolves (solution).
  Live Hjulström curve with every particle plotted.
- **〰 Meanders and oxbow lakes**: plan view of a river that starts almost
  straight. River cliffs on the outside of bends, point bars on the inside,
  necks narrowing, cutoffs leaving oxbow lakes that fill in to meander
  scars. Graphs: sinuosity over time (cutoffs marked); cross-section of the
  sharpest bend (river cliff, slip-off slope, point bar, thalweg, helicoidal
  flow); flood plain and levees built up flood by flood.
- **🌊 Waterfalls and gorges**: side view of hard cap rock over softer rock:
  undercutting, overhang, collapse into the plunge pool, and the waterfall
  retreating upstream; plan inset of the gorge. Graph: retreat against time
  (a step at each collapse) with the average rate. Cases: your own, High
  Force (River Tees), Niagara Falls (before 1950).

Right panel: what's happening, readings, real-world cards with sources, key
ideas tagged by spec, exam practice (9 GCSE and 5 A level questions with mark
schemes; several use the numbers on screen: cross-section area, discharge
from float times, sinuosity, hydraulic radius, Manning's equation) and "How
the model works (and what it leaves out)". Links to Flooding and Storm
Hydrographs, Sea Level Rise and Earthquakes and Buildings.

## Controls

- **Presets** (12): Source to mouth: the Tees · The Bradshaw model ·
  Fieldwork down the river · Erosion and transport · The Hjulström curve ·
  Deposition and sorting · Solution and attrition · Meanders form · Oxbow
  lakes · Levees and flood plain · High Force · Niagara Falls.
- Source to mouth: river (typical UK river or the Tees), where you are,
  flow (low, mean, bankfull flood), source height, mean discharge at the
  mouth, hard rock band; fieldwork buttons, auto-measure, graph variable,
  seed.
- Erosion and transport: velocity mode and value, load (all sizes, coarse,
  fine), bed rock (sandstone or limestone), seed.
- Meanders: channel width, bank erodibility, flood frequency (for levees),
  seed, "straight river again".
- Waterfalls: case, discharge (log slider), cap rock, softer rock, seed.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): number of particles in the flume, water dots on the meanders and
  falling drops at the waterfall. It changes only the picture, never the
  models or the batch runs. Draw times measured at 1920×1080: under 2.5 ms a
  frame at every level.
- Play / Pause, Reset, speeds (source to mouth 1× = 1 km per second; flume
  1× = real time; meanders 1× = 5 years per second; waterfall 1× = 20 years
  per second), hide/show panels, full screen.

## The models

- Long profile z = z₀(e^(−x/λ) − e^(−L/λ)) ÷ (1 − e^(−L/λ)), λ = L ÷ 4, plus a
  20 m step at the hard rock band.
- Drainage area ∝ distance^1.67 (Hack's law); bankfull = 4 × mean flow;
  width 3.2√Q_bankfull (Leopold and Maddock), narrower at low flow
  (∝ Q^0.26); depth and velocity from Manning's equation v = R^(2/3)S^(1/2) ÷ n
  with n from particle size (Strickler) plus upstream roughness.
- Sternberg's law D = D₀e^(−0.07x) (250 mm at the source); roundness rises
  downstream; pebbles at a site vary log-normally.
- Hjulström curve fit (cm/s, mm): erosion 28√D + 7 ÷ √D; settling
  0.7 × 28√D × (D ÷ (D + 0.06))^1.5; ±15% turbulence.
- Meanders: Howard and Knutson (1984) migration, rate ∝ −C + 2.5 ×
  upstream-weighted curvature; neck cutoff below 1.1 channel widths.
- Levees: each flood deposits a layer that thins away from the channel.
- Waterfalls: undercutting 0.03 × k × √(Q ÷ 10) m/yr (k = 1 shale, 0.55
  limestone, 0.3 sandstone); cap collapses at a random 0.6–1.4 × its
  thickness × strength.
- Fieldwork errors: width ±2%, depth ±6%, float speed ±8% and ±0.3 s
  reaction time; mean velocity = 0.85 × surface speed.

Constants are illustrative unless a source is given; the page lists every
assumption and what is left out (weathering and mass movement,
rejuvenation, braiding, estuaries in detail, vegetation, human changes).

## Data and sources (rounded)

- River Tees: source on Cross Fell (893 m), about 137 km to Teesmouth;
  High Force about 21 m over the Whin Sill dolerite onto Carboniferous
  limestone and shale, with a gorge roughly 700 m long. Environment Agency;
  Ordnance Survey; Tees Rivers Trust; North Pennines AONB Partnership; BGS.
- Niagara Falls: about 51 m, Lockport dolomite over shale; about 11 km of
  gorge in about 12 500 years, about 1 m/yr until the 1950s diversions.
  Niagara Parks Commission; US Geological Survey.
- Leopold and Wolman (1960): meander wavelength λ ≈ 10.9 w^1.01.
- Hjulström (1935) curves; Spearman critical values (0.05, two-tailed) as
  printed in fieldwork tables (n = 10: 0.648).

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **When do grains start to move?** 0.002–500 mm: a U-shaped curve like
   Hjulström's, about 13% below it (turbulent gusts lift grains early).
2. **Do pebbles get smaller downstream?** Median of 10 pebbles, 0–100 km,
   20 groups per site: within about 8% of Sternberg's law (straight line on
   a log axis); SD about 20%.
3. **Does velocity increase downstream?** Float measurements match
   Manning's velocity within 1%, SD about 4%: 0.51 m/s at 2 km to 1.30 m/s at
   74 km, levelling off near the mouth.
4. **Are meanders about 11 widths long?** Width 10–60 m: λ = 11.9 w
   (Leopold and Wolman 10.9 w^1.01), SD about 16%.
5. **Does more water mean faster retreat?** 1–3000 m³/s: log–log gradient
   0.512 (theory 0.5); 8 to 503 mm/yr.
6. **Spearman's rank: how many pebbles per site?** (A level) 10 sites over
   20 km: mean r_s −0.47 with 1 pebble (often not significant against
   −0.648) to −0.93 with 30.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
