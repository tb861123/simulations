# Weathering, Slopes and Landslides

A single, self-contained HTML file (`slopes-landslides.html`) for physical
geography. Open it in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0),
Component 1 Topic 1A *Coastal landscapes and processes* and Topic 1B *River
landscapes and processes*: mechanical, chemical and biological weathering and
mass movement (sliding, slumping, rockfalls; soil creep), and how they shape
cliffs and valley sides, with UK examples.
**Advanced** follows Pearson Edexcel A level Geography (9GE0) Topic 2B
*Coastal landscapes and change* (sub-aerial processes: weathering and mass
movement, managing risk) and Topic 2A *Glaciated landscapes and change*
(freeze–thaw, solifluction): weathering against climate (a Peltier-style
diagram), the factor of safety, pore water pressure, kinds of slope failure,
rainfall thresholds (Caine 1980) and landslide management.

## What it shows

Tabs at the top of the centre panel:

- **🪨 Weathering**: a rock outcrop (granite, limestone, iron-rich sandstone or
  chalk) in a climate you set (mean temperature, rainfall). Freeze–thaw opens
  joints and builds scree; exfoliation peels shells in hot deserts;
  hydrolysis, carbonation or oxidation make a rind or dissolve the surface;
  roots and lichens act biologically. Graphs: a Peltier-style diagram with UK
  and world places; rates against temperature; rates against rainfall.
- **⛰ Slope stability**: a real-shaped cross-section (Holbeck Hall till
  cliff, Ventnor Undercliff, the Aberfan tip on a hillside, a Seven Sisters
  chalk cliff, a river bank on a meander). The most dangerous slip circle is
  found by Bishop's method; its factor of safety F = resisting ÷ driving
  forces changes with slope angle, the water table (rain raises it while
  playing), vegetation (roots only help if they reach the slip surface),
  undercutting by waves or the river, loading on top and weathering. When
  F < 1 the slope fails as a slump, rockfall or flow slide, the debris is
  left at the foot and the run pauses; Ventnor creeps slowly instead, faster
  when groundwater is high. Graphs: resisting vs driving forces; F over time
  with the water table; F against slope angle (dry, now, saturated); forces
  on a block (A level, the infinite-slope equation with the numbers).
- **🐌 Kinds of mass movement**: animated soil creep (heave and drop, tilting
  posts, terracettes), rockfall to scree, rotational slump, translational
  slide, mudflow, and solifluction over permafrost (A level). Graphs: Carson
  and Kirkby's heave–slide–flow triangle; the Cruden and Varnes speed scale.
- **🌧 Landslides over the years**: a steep hillside like Glen Croe above the
  A83 at the Rest and Be Thankful, in 24 strips, through up to 100 years of
  random daily rain. Shallow slides become debris flows that close the road;
  scars slowly regrow soil. Settings: slope, soil depth, rainfall, storminess,
  heavier storms (climate change), vegetation, debris fences (A level).
  Graphs: daily rain with the weakest strip's F; landslides each year;
  intensity–duration of triggering storms against Caine's threshold (A level).

Right panel: what's happening, readings, a sourced UK case card for each
slope, key ideas tagged by spec, exam practice (7 GCSE and 6 A level
questions with mark schemes; several use the numbers on screen: rate of rock
loss, F from forces, infinite-slope F, landslide frequency) and "How the
model works (and what it leaves out)". Links to Coasts, Rivers and
Landforms, Glaciers and Earthquakes and Buildings.

## Controls

- **Presets** (12): Which weathering, where? · Freeze–thaw on a crag ·
  Limestone and carbonation · Rainforest: deep rotting · Soil creep ·
  Rockfall from a chalk cliff · Holbeck Hall, 1993 · Ventnor Undercliff ·
  Aberfan, 1966 · Rest and Be Thankful, A83 · River bank collapse ·
  More rain, more landslides? (A level).
- Weathering: rock, mean annual temperature, annual rainfall.
- Slope: slope, angle, water table now, rain while playing, vegetation,
  foot cut back, erosion of the foot, load on top, strength left after
  weathering, show the slip circle's centre (A level).
- Mass movement: kind, slope angle, heave per cycle, cycles a year.
- Hillside: slope angle, soil depth, rainfall, how the rain comes, heavier
  storms, vegetation, debris fences (A level), weather seed.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): rain, scree, soil grains and the resolution of the Peltier
  diagram. Picture only; the models and batch runs are unchanged. All views
  draw in under 1 ms at 1920×1080 at every level.
- Play / Pause, Reset, speeds (weathering 1× = 1000 years per second; slope
  and hillside 10 days per second; creep 1 year per second), hide/show
  panels, full screen.

## The models

- Chemical weathering ∝ rainfall × Arrhenius factor (55 kJ/mol, about ×2.2
  per 10 °C); carbonation ∝ runoff × CO₂ solubility (higher in cold water).
  Freeze–thaw ∝ days whose temperature range straddles 0 °C × wetness².
  Exfoliation/salt ∝ (day–night swing)². Biological ∝ plant growth (Lieth's
  Miami model). Rates illustrative, of the order measured.
- Slopes: Mohr–Coulomb strength τ = c′ + (σ − u) tan φ′; Bishop's simplified
  method of slices over about 120 trial circles; strong bedrock below the
  base. Soil strengths are typical published values chosen to show each case,
  not site measurements.
- Infinite slope: F = [c′ + c_r + (γ − mγ_w) z cos²β tan φ′] ÷ [γ z sin β cos β].
- Soil creep: ε tan β downslope per heave cycle.
- Hillside: daily random rain (wetter winters), interception, drainage with a
  1-day time constant, evaporation, upslope water collecting in hollows.

## Data and sources (rounded)

- Holbeck Hall, Scarborough, 3–5 June 1993: rotational slip in glacial till,
  about one million tonnes; cracks from April. British Geological Survey case
  study; Scarborough News (2018).
- Ventnor Undercliff: about 6000 residents; slow movement about 5–10 mm a
  year, up to about 34 mm a year with high groundwater (1998–2002); management
  over £3 million a year. Isle of Wight Council Ventnor geotechnical study
  (2000); Carey et al., Landslides (2014).
- Aberfan, 21 October 1966: tip No. 7, about 34 m high, begun 1958, on a
  spring; about 105 000–117 000 m³ of spoil travelled about 500–600 m; 144
  deaths, 116 of them children. Davies Tribunal report (1967); BGS.
- Rest and Be Thankful, A83: 4 August 2020, about 100 mm of rain, about 6000
  tonnes of debris, about 2000 tonnes caught in catch pits, road shut about
  five weeks; more than £13 million spent on mitigation. BEAR Scotland and
  Transport Scotland as reported by STV News and The Scotsman (2020).
- Chalk cliff retreat in East Sussex about 0.3–0.5 m a year (Dornbusch et al.
  2008). Caine (1980) threshold I = 14.82 D^−0.39. Cruden and Varnes (1996)
  speed classes. Carson and Kirkby (1972). Peltier (1950).

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How steep can wet sand stand?** Tilt box, water table 0 → 100%: 33.8° dry
   (theory 34.0°) falling to 18.0° saturated (theory 18.1°); every mean within
   0.2° of tan β = (1 − mγ_w/γ) tan φ′; SD about 1.3–2.1°.
2. **Do roots stop landslides?** Root cohesion 0 → 3 kPa, 200 years: 336 →
   47 → 0.25 slides per century; the single-day-storm theory (233 → 31 → 0.6)
   is about 1.5× lower at low cohesion because wet antecedent soil matters.
3. **How long until an undercut cliff fails?** 0.2 → 3 m a year: 137 → 11
   years against 136 → 9 (critical undercut about 27 m); log–log gradient
   −0.94 (theory −1).
4. **Does chemical weathering double every 10 °C?** Granite tablets 0 → 30 °C:
   2.5 → 27 mm per 1000 years, ×2.1–2.4 per 10 °C, means within 3% of theory.
5. **Where is freeze–thaw most active?** −15 → +15 °C: peak about 189 days a
   year at 0 °C (theory 182); within about 5 days of theory at every step.
6. **Does soil creep faster on steeper slopes?** 5° → 35°: 3.4 → 26.9 mm a
   year against ε tan β × cycles 3.5 → 28.0 (within about 4%).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
