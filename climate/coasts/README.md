# Coasts: Erosion, Deposition and Management

A single, self-contained HTML file (`coasts.html`) for physical geography.
Open `coasts.html` in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0), Component 1
Topic 1A *Coastal landscapes and processes*: geology (concordant and
discordant coasts) and rock type; weathering and mass movement (rockfall,
rotational slumping); erosion (hydraulic action, abrasion, attrition,
solution); constructive and destructive waves (wind speed, fetch, wave
energy); longshore drift; landforms of erosion (headlands and bays, caves,
arches, stacks and stumps, wave-cut notches and platforms) and deposition
(beaches, spits, bars, tombolos, saltmarsh); hard and soft engineering and
managed retreat; a UK coast (Holderness, with Mappleton, Spurn Head, the
Dorset coast and Happisburgh).
**Advanced** follows Pearson Edexcel A level Geography (9GE0) Topic 2: *Landscape
Systems, Processes and Change*, Option 2B: *Coastal Landscapes and Change*: littoral (sediment) cells and sediment budgets, wave
energy and power, breaker types (Iribarren number), lithology and structure,
sea-level change (eustatic and isostatic) and emergent and submergent coasts,
the Bruun rule, Shoreline Management Plans (hold the line, advance the line,
managed realignment, no active intervention), ICZM and cost–benefit analysis
with discounting. The level hint in the page says which topic each level
serves.

## What it shows

Tabs at the top of the centre panel:

- **🌊 Waves and beaches**: a beach in cross-section with waves made by the
  wind (speed, fetch and distance travelled as swell). Waves shoal, break,
  and run up the beach; sand grains are moved up by the swash and down by
  the backwash. Constructive waves build a berm; destructive waves comb the
  beach down to an offshore bar. Graphs: the berm over time; wave height
  against fetch (log scale) with UK fetches marked.
- **🪨 Cliffs and headlands**: a 10 km coast in plan view. Discordant
  (alternating hard and soft bands), concordant (Lulworth-style cove), Swanage
  Bay, or Holderness boulder clay. Bays retreat and shelter, headlands are
  attacked by refracted waves and pass through crack → cave → arch → stack →
  stump; stacks are left offshore. Graphs: a headland close-up showing the
  stage; the cliff profile (wave-cut notch, overhang, rockfall and debris,
  wave-cut platform; slumping for clay); retreat of headlands and bays over
  time.
- **↔ Drift and spits**: a 60 m beach close-up where pebbles zig-zag along
  the shore (swash at the wave angle, backwash straight down), above a map
  of the coast where a spit grows across an estuary (recurved hooks,
  saltmarsh behind, a river keeping the channel open), a bar seals off a
  bay as a lagoon, or a tombolo joins an island. Graphs: drift against wave
  angle (CERC); spit length over time with theory.
- **🏗 Managing Holderness**: the 60 km coast from Flamborough Head to Spurn
  Head with villages, run for 100 years (2025–2125) twice on the same
  storms: with your defences and doing nothing. Choose a scheme or click the
  map to place groynes, rock armour, groynes + armour (as at Mappleton), sea
  walls or beach nourishment. Shows land and houses lost, terminal groyne
  syndrome downdrift, costs and benefits. Graphs: retreat along the coast;
  cost–benefit (discounted at A level); sediment budget (A level).
- **📈 Sea level (A level)**: 20 000 years ago to 2100 for central Scotland
  (raised beaches, relict cliffs), south-west England (rias) or western
  Norway (fjords): a cross-section and a plan map flooded to the relative
  sea level, and a graph of relative, eustatic and isostatic sea level.

Right panel: what's happening, readings, real-world cards with sources, key
ideas tagged by spec, exam practice (6 GCSE and 6 A level questions with
mark schemes; several use the numbers on screen: waves per minute, retreat
rate, wave energy and power, the sediment budget) and "How the model works
(and what it leaves out)". Links to Sea Level Rise, Rivers and Landforms,
Flooding and Storm Hydrographs, Glaciers and Glacial Landscapes,
Ice–Albedo Feedback and Weather and Chaos.

## Controls

- **Presets** (12): Constructive waves · Destructive waves · Fetch and wave
  size · Headlands and bays · Swanage and Old Harry · Lulworth Cove ·
  Happisburgh and Holderness · Longshore drift · Spurn Head spit · A bar:
  Slapton Ley · Mappleton's groynes · Raised beaches and rias (A level).
- Waves: wind speed, fetch (log), distance travelled as swell, sand or
  shingle, reset the beach.
- Cliffs: geology, hard and soft bands, wave energy, profile at a headland
  or a bay, seed.
- Drift: breaker height, wave angle, spread of directions, coast type,
  river discharge, second wave direction, water depth, share of the drift
  reaching the end.
- Holderness: scheme, defence to place by clicking, close-up position,
  sea-level rise, discount rate (A level), storm seed.
- Sea level: place, time, global rise by 2100.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in
  this browser): foam, sand grains and pebbles drawn, and the map grid in
  the sea-level view. It changes only the picture, never the models or the
  batch runs. Draw times at 1920×1080 are under 2 ms a frame at every level.
- Play / Pause, Reset, speeds (waves real time with the beach changing 1 hour
  per second; cliffs 1× = 10 years a second; drift 1 wave a second and the
  map 2 years a second; Holderness 2 years a second; sea level about 200
  years a second), hide/show panels, full screen.

## The models

- Waves (JONSWAP): Hs = 0.0016 (U²/g)√(gF/U²), Tp = 0.286 (U/g)(gF/U²)^⅓,
  capped when fully developed (Hs = 0.243 U²/g). Energy E = ρgH²/8, power
  P = ρg²H²T/64π, breaker height Hb = 0.39 g^0.2 (TH²)^0.4 (Komar and Gaughan),
  run-up (Stockdon et al. 2006), Iribarren number for breaker type.
  Steepness above about 0.025 = destructive.
- Cliffs: each point moves inland at rock erodibility × wave energy ×
  exposure (sheltered bays e^(−depth/320 m), refraction onto headlands).
  Erodibility at moderate waves: granite 0.002, Portland limestone 0.03,
  chalk 0.25, Wealden clays 1.0, boulder clay 1.8 m/yr.
- Longshore drift: CERC Q = 0.0909 Hb^2.5 sin 2θ (m³/s); pebble drift per wave
  ½ S sin 2θ. Spit growth = drift reaching the end ÷ ((depth + 4 m) × 150 m).
- Holderness: one-line sediment model, 120 stretches of 500 m; drift south
  ∝ beach volume up to saturation; cliff retreat 4 m/yr × storminess ×
  e^(−beach width/40 m); 30% of eroded till stays on the beach; 8.4%/yr lost
  offshore. Natural retreat about 1.8 m/yr, as measured. Groynes trap drift,
  sea walls stop retreat but scour beaches, armour cuts retreat by 85%,
  nourishment adds 60 m³/m every 5 years.
- Bruun rule R = S L/(B + h), closure depth 1.57 × the year's biggest wave,
  Dean profile h = 0.1 x^⅔.
- Sea level: eustatic curve (rounded) + isostatic rebound decaying with a
  time constant of 3–4 thousand years.

Constants are illustrative unless a source is given; the page lists every
assumption and what is left out.

## Data and sources (rounded)

- Holderness: about 61 km of boulder clay cliffs, average retreat about
  1.8 m/yr (sources give 1.5–2 m/yr), more than 25 villages lost since Roman
  times; Mappleton 1991 scheme, two rock groynes and rock armour, about
  £2 million (£1.9–2.1 million in different sources). East Riding of
  Yorkshire Council; Environment Agency; Humber Estuary SMP.
- Spurn Head about 5.5 km, breached in the storm surge of 5 December 2013.
  Yorkshire Wildlife Trust.
- Happisburgh: no active intervention policy (Kelling to Lowestoft Ness SMP).
- Dorset: Old Harry Rocks (Old Harry's Wife fell in 1896), Swanage Bay,
  Lulworth Cove, Durdle Door, Chesil Beach (about 29 km); Jurassic Coast World
  Heritage Site since 2001. Jurassic Coast Trust; BGS.
- Slapton Sands and Slapton Ley (Devon). Field Studies Council.
- Medmerry managed realignment (2013), about £28 million, about 180 ha.
  Environment Agency.
- Global sea level rose about 0.20 m (likely range 0.15–0.25 m) 1901–2018, about 3.7 mm/yr 2006–2018
  (IPCC AR6 WG1, 2021). Sognefjord about 200 km long and 1300 m deep.
- Costs (sea wall £8000/m, rock armour and groynes £2000/m each,
  nourishment £15/m³), house and land values, village house numbers and
  positions are illustrative.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Do waves grow with fetch?** 1–400 km at 15 m/s: log–log gradient 0.499
   (theory 0.5); means about 3% below the JONSWAP line, SD about 12%.
2. **Which wave angle drives longshore drift fastest?** 0–85°: peak at 45°,
   means within 0.5% of ½NS sin 2θ (e.g. 1888 m vs 1882 m at 45°).
3. **Does a spit grow at a steady rate?** 10–120 years: straight line,
   gradient 35.1 m/yr against theory 34.6 m/yr; 4144 m vs 4156 m at 120 years.
4. **How fast does Holderness retreat?** 100 runs of 50 years: mean
   1.801 m/yr, SD 0.067, theory 1.795 (+0.4%, 1.0 SE); measured about 1.8.
5. **Terminal groyne syndrome** 0–4 km of groynes at Mappleton: extra
   retreat in the 3 km downdrift rises linearly (4.6 m per km of groynes
   after 30 years), about 58% of the long-run sediment-budget estimate.
6. **The Bruun rule** (A level) 0–1.2 m: retreat 52.7 m per metre of rise,
   about 2% below the rule with the average storm (53.6 m per metre).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
