# Plant Transport and Responses

A single, self-contained HTML file (`plant-transport.html`) for biology. Open it
in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 2: **2(h) Transport in flowering plants** (phloem carries sucrose and
amino acids, xylem carries water and mineral ions, water uptake by root hair
cells, transpiration and the effect of humidity, wind, temperature and light,
and the practical on transpiration from a leafy shoot); **2(g)** stomata;
**2(j) Coordination and response** (geotropism of roots and stems,
phototropism of stems, auxin). These are cited at topic level on purpose: the
point numbers were not checked against the Pearson specification.
**Advanced** follows OCR A level Biology A (H420): **3.1.3 Transport in
plants** (xylem, phloem, transpiration, the potometer **PAG5**, root pressure,
apoplast and symplast, the Casparian strip, cohesion–tension, xerophytes and
hydrophytes, translocation by mass flow with active loading) and **5.1.5
Plant and animal responses** (auxin, gibberellins, abscisic acid, ethene,
apical dominance, stomatal closure, commercial uses, phototropism and
geotropism **PAG11**). Content on only one specification is tagged in the sim
("A level (H420 …)", "Beyond the spec").

## What it shows

Tabs at the top of the centre panel:

- **🌻 Whole plant**: a sunflower through a day. Sun, temperature and
  humidity follow the clock; water moves up the xylem (blue) and out of the
  leaves as vapour; sucrose moves in the phloem (orange) up to the flower and
  down to the roots; the plant wilts in dry soil; guttation on humid nights.
  Graphs: transpiration and uptake over the day (uptake lags); cross-sections
  of a root, stem and leaf showing where the xylem and phloem are; at A level
  the water potential from soil to air (cohesion–tension) and the stem
  diameter shrinking at midday (dendrometer evidence).
- **💧 Roots**: a strip from the soil through the root hair cell, cortex,
  endodermis and pericycle to the xylem, with water (osmosis) and mineral
  ions (active transport, ATP). Soil water, salt, soil oxygen, temperature,
  transpiration pull. A level: apoplast (cell walls) and symplast (cytoplasm)
  pathways, the Casparian strip (switchable), cyanide, root pressure on a
  manometer when the stem is cut, water potential across the root.
- **🌬️ Transpiration**: a leaf cross-section (cuticle, palisade, spongy
  mesophyll, xylem, guard cells opening with light, vapour diffusing through
  the still-air layer, wind) beside a **virtual bubble potometer** (lamp,
  fan, reservoir and tap, capillary with a mm scale). Take timed readings
  (1, 2 or 5 minutes, or three in a row); results table; graph of your results
  against the factor you changed (found automatically) with the model's line;
  bubble position against time; the four factors. Privet, marram grass
  (xerophyte) or water lily (hydrophyte); petroleum jelly on either surface;
  a shoot not cut under water may have air locks. A level: capillary radius,
  rate = πr²d ÷ t and rate per cm² of leaf.
- **🍬 Translocation**: a source leaf, a fruit sink and a root sink joined by
  phloem coloured by sucrose concentration, with the xylem alongside; ringing
  the bark; at A level a companion cell loading sucrose (H⁺ pump and
  co-transport), a metabolic poison, an aphid whose honeydew shows the
  pressure, and pressures along the stem. Feed ¹⁴CO₂ and follow the label.
  Graphs: sucrose (and pressure) along the stem, delivery over time, the
  tracer.
- **🌱 Tropisms**: six oat coleoptiles with the classic treatments (control,
  tip removed, opaque cap, opaque sleeve, gelatin block, mica plate), six
  repeats of one treatment, roots and shoots laid flat (geotropism), and at A
  level Went's agar blocks, a split mica plate and a clinostat. Light from the
  side, above or none, with an intensity. Auxin is shown on each side;
  📐 measures every angle with a protractor. Graphs: angle against time,
  measured angles, Went's curvature against auxin, and the textbook
  root / bud / stem response curves.
- **🧪 Hormones (A level)**: apical dominance (apex left on, removed, removed
  with auxin paste, removed with plain paste), gibberellin on dwarf peas,
  abscisic acid and stomata in drought (with re-watering), ethene and banana
  ripening (open air, sealed bag, bag with a ripe banana, ripening room).
  📏 measures every plant; a t-test compares the key groups. Commercial uses.

Right panel: what's happening, readings, results tables, real-data cards, key
ideas tagged by specification, exam practice (12 GCSE and 12 A level questions
with mark schemes; on-screen numbers for the potometer rate, the volume rate
and the percentage change) and "How the model works (and what it leaves
out)". Links to Membranes, Photosynthesis and Respiration, Gas Exchange,
Nerve Impulse and Central Limit Theorem.

## Controls

- **Presets** (12): Xylem and phloem · Root hair cells · Stomata and light ·
  Potometer: wind, heat, humidity · Translocation · Phototropism · Geotropism ·
  and at A level: Apoplast, symplast, root pressure · PAG5 potometer: rate =
  πr²d ÷ t · Xerophytes and hydrophytes · Mass flow: ringing and poisons ·
  Plant hormones. The potometer presets start with a series of readings
  already taken.
- The left panel shows the controls for the tab in use (listed above).
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  numbers of moving water, vapour, ion and sucrose particles, auxin dots, and
  cell detail. Picture only; the model and the batch runs are the same at
  every level. Every view draws in a few milliseconds, so this is mainly for
  weak tablets.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Transpiration (mm³/min) = 0.4 × leaf area (cm²) × conductance × es(T) × (1 −
  RH), with es the saturation vapour pressure (kPa). Conductance = 1 ÷ (1 ÷
  (stomata + cuticle) + 1 ÷ still air); stomata = gmax × (0.08 + 0.92 L ÷ (L +
  25)) (L = light %), partly closing above 35 °C or in drought; still air =
  0.5 + 1.5√wind. Privet gmax 1 (15% of stomata on top), marram 0.3 with
  thicker still air and cuticle, water lily 1.6 (all on top).
- Potometer: bubble speed = rate ÷ πr². The rate approaches a new value with a
  3-minute time constant, wanders ±4%; shoots differ (area ±12%, stomata
  ±10%); scale ±0.4 mm, read to 0.5 mm; stopwatch ±0.25 s. Not cut under
  water: 60% chance of air locks (30–70% of the rate).
- Day: 5000 cm² of leaf; temperature mean ±5 °C (peak 15:00), the same water
  vapour all day; stem capacitance 150 cm³/MPa, root and shoot resistances
  0.008 and 0.006 MPa per g/h; soil Ψ = −0.03 − 1.5(1 − s)³ MPa; stomata close
  as stem Ψ falls below −0.8 MPa; stem diameter change −0.5 µm per g of water
  deficit; leaf starch exported at night.
- Root: water uptake = 30 × Lp × (Ψsoil − Ψxylem) mm³/min; Ψxylem = −0.6 ×
  pull − 0.25 × ion pumping; pumping ∝ ATP = (0.08 + 0.92 O₂) × 2^((T − 20)/10),
  ×0.05 with cyanide; without a Casparian strip ions leak back (×0.2). Root
  pressure = Ψsoil − xylem solute potential (up to about 0.2 MPa). 70% of water
  through the cortex by the apoplast (illustrative).
- Phloem: 20 sections of 5 cm; loading 150 × L ÷ (L + 30) × 2^((T − 20)/10);
  pressure = 0.07 × % sucrose − 0.1 MPa; flow = 140 × pressure difference
  (sections an hour); sinks unload 45 (fruit) and 30 (roots) × strength × C ÷
  (C + 5) per section; stem respiration 0.5 C. ¹⁴C moves with the sap.
- Tropisms: lateral auxin shift 0.25 I ÷ (I + 20) × cos(angle) to the shaded
  side, 0.12 (shoots) or 0.2 (roots) × sin(angle) to the lower side; shoot
  elongation 0.15 + 1.36x ÷ (x + 0.6), root 1.2 − 0.9x ÷ (x + 0.4); bending
  60° (shoots), 40° (roots) or 25° (Went) per hour per unit difference.
- Hormones: bud growth 6 ÷ (1 + (auxin ÷ 0.3)²) mm/day; dwarf pea growth
  factor 0.25 + 0.75 GA ÷ (GA + 0.1); ABA rises below 45% soil water, aperture
  8 ÷ (1 + (ABA ÷ 0.4)²) µm; ethene made by ripening fruit (positive
  feedback), vented 3 a day in open air, 0.2 in a bag.

## Data and sources

- Water potential of air from Ψ = (RT ÷ V̄w) ln(RH): about −94 MPa at 50% and
  20 °C (calculated).
- Tallest tree about 116 m (coast redwood; published measurements,
  approximate); water lifted 116 m needs at least 1.2 MPa of tension.
- Transpiration of a large oak (a few hundred litres on a hot day) and a maize
  plant (about 200 litres over its life); over 95% of water taken up is
  transpired; phloem sap 10–25% sucrose moving about 0.5–1 m/h at 1–2 MPa;
  root pressure about 0.1–0.2 MPa: typical textbook values from memory,
  marked approximate in the sim.
- Auxin response curves for roots, buds and stems: shape only, after Thimann
  (1937). Went (1928) agar block test.
- All model rates are illustrative.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Light and transpiration** (light 0 → 100%): 5.3, 14.9, 16.8, 17.6, 18.1,
   18.4 mm/min against 5.4, 15.2, 17.1, 18.0, 18.4, 18.7 (SD about 15%).
2. **Humidity and transpiration** (20 → 95%): 29.0 falling in a straight line
   to 1.8 mm/min (theory 29.5 → 1.8).
3. **Wind and transpiration** (0 → 4 m/s): 18.1, 33.8, 36.3, 37.7, 38.6
   (theory 18.4, 34.4, 36.9, 38.3, 39.2).
4. **How precise is one potometer result?** 500 shoots: mean 18.40 (SE 0.11)
   against 18.42; SD 2.47 against a predicted 2.51.
5. **Capillary radius and bubble speed** (0.2 → 1 mm, log–log): gradient
   −1.99 (theory −2).
6. **Phototropism: brighter light, bigger bend?** (0 → 100%, 4 h): 0, 26.8,
   34.7, 38.3, 40.4, 41.8° against 0, 27.3, 35.4, 39.2, 41.3, 42.8°.
7. **Went's agar blocks** (0 → 1.6, 2 h): 0 rising to 32° against 0 → 35°
   (the same 48 coleoptiles at every step, slightly less sensitive than
   average).
8. **Translocation: which sink wins?** (fruit sink 0.2 → 3): ¹⁴C share 27%
   rising to 72%, within about 0.5% of the steady-state share.
9. **Apical dominance: how much auxin?** (paste 0 → 2, 14 days): 48 mm
   falling to 1.8 mm against 50.5 → 2.2 mm.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
