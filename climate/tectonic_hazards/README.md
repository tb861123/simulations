# Tectonic Hazards

A single, self-contained HTML file (`tectonic-hazards.html`) for physical
geography. Open it in Chrome or Edge, with no install and no internet.

**Advanced** follows Pearson Edexcel A level Geography (9GE0) Topic 1
*Tectonic processes and hazards*: plate boundaries (constructive,
destructive ocean–continent and ocean–ocean, collision, conservative) and the
theory of plate movement (mantle convection, slab pull, ridge push,
sea-floor spreading, palaeomagnetism, Benioff zones); earthquakes (focus,
epicentre, P, S and surface waves, moment magnitude and Modified Mercalli
intensity, frequency–magnitude); tsunamis; volcanic hazards (magma type,
VEI, pyroclastic flows, ash, lahars, jökulhlaups); disaster risk (risk =
hazard × vulnerability ÷ capacity), the PAR and Park models; and case studies
(Haiti 2010, Chile 2010, Christchurch 2011, Tōhoku 2011, Nepal 2015, Indian
Ocean 2004, Eyjafjallajökull 2010, Mount St Helens 1980, Pinatubo 1991,
Kīlauea 2018).

**Standard** is a **gentle introduction**: as far as we know, tectonic
hazards are not in Edexcel GCSE Geography A (1GA0) (they are in other GCSE
specifications, e.g. AQA and Edexcel B), and the level hint in the page says
so. It keeps to plate boundaries, earthquakes, volcanoes, tsunamis and why
the same hazard affects rich and poor countries differently.

## What it shows

Five tabs at the top of the centre panel:

- **🌍 Plate boundaries**: a cross-section of each boundary with moving
  plates, mantle convection, a sinking slab and melting at about 100 km,
  volcanoes, mountains, and earthquakes coloured by depth (shallow, 70–300 km,
  over 300 km); the conservative boundary in plan view with fences bending
  and snapping (elastic rebound). A level: slab pull and ridge push arrows.
  Graphs: earthquake depth against distance (a Benioff zone with line of best
  fit and slab angle); magnetic stripes and sea-floor age; plate speeds
  (plates with sinking slabs move fastest).
- **📈 Earthquakes**: P and S wavefronts spreading from the focus, surface
  waves, four seismometers, intensity along the surface, soft sediment.
  Graphs: seismograms with S − P times and distances; intensity against
  distance with felt reports; a global catalogue built a month at a time
  against Gutenberg–Richter and USGS numbers, with Aki's b-value; locating
  the epicentre by triangulation.
- **🌊 Tsunami**: the shallow-water equations along a line through the ocean:
  the wave crosses the deep ocean fast and low, then slows and grows on the
  shelf. Cases: Tōhoku 2011, Indian Ocean 2004, or your own. Graphs: tide
  gauge at the coast with the arrival time; speed against depth (√(gd));
  wave height along the route against Green's law.
- **🌋 Volcanoes**: shield or composite cone at true vertical scale, magma
  chamber, ash column bending in the wind, lava flows, pyroclastic flows,
  jökulhlaups. Cases: Eyjafjallajökull 2010, Mount St Helens 1980, Pinatubo
  1991, Kīlauea 2018, or your own. Graphs: column height against eruption
  rate (model and Mastin et al. 2009); VEI with examples; ash fall downwind.
- **⚠ Risk and response**: a city of 40 districts shaken by an earthquake,
  coloured by building collapse, beside bars for hazard, vulnerability and
  capacity and the risk equation. Cases: Haiti 2010, Chile 2010, Nepal 2015,
  Christchurch 2011, or your own. Graphs: the Park model; the PAR model;
  real earthquakes' deaths against magnitude coloured by HDI.

Right panel: what's happening, readings, case-study cards with sources, key
ideas, exam practice (8 introductory and 8 A level questions with mark
schemes; several use the numbers on screen: S − P distance, energy ratio,
tsunami speed and travel time, Benioff zone angle, the risk equation) and
"How the model works (and what it leaves out)". Links to Earthquakes and
Buildings, Weather Hazards and Tropical Storms, Sea Level Rise and The Carbon
Cycle.

## Controls

- **Presets** (12): Constructive: Iceland · Subduction: the Andes · Japan:
  ocean under ocean · Collision: the Himalaya · Conservative: San Andreas ·
  Focus, epicentre and waves · Magnitude and intensity · How often?
  Gutenberg–Richter · Tsunami: Tōhoku 2011 · Tsunami: Indian Ocean 2004 ·
  Eyjafjallajökull 2010 · Haiti 2010: why so many deaths?
- Plates: boundary type, Iceland hot spot, seed. Earthquakes: magnitude,
  focus depth, soft sediment, catalogue seed. Tsunami: case, magnitude,
  ocean depth, shelf width and depth, section length. Volcanoes: case,
  silica, gas, ice cap, eruption rate (log), duration, wind. Risk: case,
  magnitude, depth, distance, population, vulnerability, capacity, seed.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): earthquakes and convection dots shown, wavefront rings, ash
  particles, and the number of cells in the live tsunami grid (300 / 600 /
  1 000 / 1 600). Batch runs always use their own fixed settings. Measured at
  1920×1080: about 60 frames a second at every level.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Earthquake sizes from Gutenberg–Richter (b = 1); depths typical of each
  boundary (Benioff zone 30° under the Andes, 45° under Japan).
- Seismic waves in a uniform crust: P 6.0 km/s, S 3.5 km/s, distance =
  8.4 km × (S − P). Energy 10^(1.5M + 4.8) J.
- Intensity: Bakun and Wentworth (1997), I = 3.67 + 1.17M − 3.19 log₁₀(R),
  +1 on soft ground.
- Tsunami: linear shallow-water equations on a staggered grid; uplift and
  rupture width from rough magnitude scalings.
- Volcanoes: viscosity from silica (illustrative); tephra = rate × time ×
  2.5; VEI from volume; a buoyant plume (Morton, Taylor and Turner 1956) set
  to match Mastin et al. (2009) at 10 000 m³/s.
- Risk: building collapse chance Φ((I − (10.5 − 3V)) ÷ 0.8); deaths ∝ 1 ÷
  capacity. Case-study vulnerability and capacity values are our
  illustrative choices (model deaths within a factor of about two of the
  real totals).

## Data and sources (rounded)

- USGS world earthquake averages a year: M8+ 1, M7–7.9 15, M6–6.9 134,
  M5–5.9 1 319.
- Haiti 2010: EM-DAT (about 220 000 deaths; estimates 100 000–316 000);
  Government of Haiti PDNA (damage about US$7.8 bn). Chile 2010: 525 deaths,
  about US$30 bn. Nepal 2015: Government of Nepal PDNA, about 9 000 deaths,
  about US$7 bn. Christchurch 2011: 185 deaths, about NZ$40 bn.
- Tōhoku 2011: about 18 500 dead or missing; run-up about 40 m; damage about
  US$235 bn (World Bank). Indian Ocean 2004: about 228 000 deaths in 14
  countries (USGS, UNESCO IOC).
- Eyjafjallajökull 2010: VEI 4, column 6–9 km, about 100 000 flights
  cancelled, airline losses about US$1.7 bn (IATA, Eurocontrol, Icelandic Met
  Office). Mount St Helens 1980: VEI 5, 57 deaths (USGS). Pinatubo 1991: VEI
  6, about 850 deaths (USGS, PHIVOLCS). Kīlauea 2018: about 700 homes
  destroyed (USGS HVO).
- HDI values approximate (UNDP). Plate speeds approximate.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How many big earthquakes a year?** 500 years: mean 14.91 M7+, SD 3.9
   against Gutenberg–Richter 14.69 and Poisson SD 3.83 (+1.5%); USGS about 16.
2. **Finding the distance from S − P**: 20–600 km, best-fit gradient 1.00;
   SD grows from 5 km to 40 km with distance.
3. **Does shaking fall with distance?** Mw 7.0: means within 0.2 of
   Bakun–Wentworth plus the average ground effect; SD about 0.65.
4. **How fast is a tsunami?** 10–6000 m: within 0.2% of √(gd), log–log
   gradient 0.500 (theory 0.5); 36 km/h to 872 km/h.
5. **Bigger eruptions, higher columns**: 10 to 10⁶ m³/s: 2.0 to 55.7 km
   against Mastin's 3.5 to 55.9 km; log–log gradient 0.286 (Mastin 0.241),
   steeper because wind bends small plumes.
6. **Does capacity reduce deaths?** (A level) Haiti: deaths fall from about
   320 000 to 48 000 as capacity rises from 0.1 to 1; log–log gradient −0.88
   (−1 except where nearly everyone trapped dies).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
