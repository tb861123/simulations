# Moles, Reacting Masses and Yield

A single, self-contained HTML file (`moles-reacting-masses.html`) for chemistry. Open it
in Chrome or Edge, with no install and no internet.

Counting particles by weighing, reacting masses and the limiting reactant, empirical
formulae and water of crystallisation by experiment, percentage yield and atom economy,
gas volumes (24 dm³ and pV = nRT) and the concentration of solutions, with virtual
practicals that have realistic measurement error.

Titration is deliberately **not** repeated here: the full virtual titration (pipette,
burette, indicators, pH curves, concordant titres) is in
**Acids, Salts and Chemical Tests** (`../acids_salts_tests/`), and the page links to it.

## Levels (Standard / Advanced)

A **Standard (iGCSE) / Advanced (A level)** switch sits at the top of the left panel and is
remembered in the browser. Advanced keeps everything in Standard and adds A level presets,
views, readings and exam questions. Key ideas carry spec tags (grey-green 4CH1, purple 9CH0,
blue-grey beyond the spec). Batch runs are the same at both levels.

- **Standard:** Pearson Edexcel International GCSE Chemistry (4CH1) **Section 1(e) Chemical
  formulae, equations and calculations**: relative formula mass, the mole, reacting masses,
  the limiting reactant, empirical and molecular formulae from experiment (metal oxides by
  combustion or reduction; water of crystallisation), percentage yield; concentration in
  mol/dm³ and the molar gas volume (24 dm³ at rtp) are tagged **Chemistry only (C)**. Preparing
  a soluble salt is tagged 4CH1 2(g). Cited at topic level: the point numbers were not checked
  against the Pearson PDF.
- **Advanced:** Pearson Edexcel A level Chemistry (9CH0) **Topic 5 Formulae, equations and
  amounts of substance**: the Avogadro constant, concentration in mol dm⁻³ and dilution,
  pV = nRT, percentage yield, atom economy and **Core Practical 1** (the molar volume of a gas);
  percentage uncertainties (the practical-skills requirements). Relative atomic masses switch
  to the one-decimal A level table.
- Tagged **beyond the spec**: the Avogadro constant at iGCSE, magnesium nitride forming in air,
  the decomposition of CuSO₄ on strong heating, the water-vapour correction for gas collected
  over water.

## What it shows

Tabs at the top of the centre panel:

- **⚖️ Mole**: a balance with a heap of the substance and a box of particles (each drawn
  particle stands for a stated number of real ones). Eleven substances, from water to copper
  sulfate crystals; "⚖ Weigh out 1 mole". Graphs: mass against moles (gradient = Mr) for every
  substance; the mass of one mole of each. A level: number of particles and of atoms.
- **🔥 Reacting masses**: nine reactions (magnesium burning, hydrogen + oxygen, Haber, methane,
  iron + sulfur, sodium + chlorine, marble + acid, thermite, zinc + copper sulfate). Two masses;
  particles join in the ratio of the equation and the excess reactant is left over, ringed.
  "⚖ Just enough B" gives the exact ratio. Worked calculation in three steps. Graphs: product
  mass against the mass of A (the kink where the limiting reactant changes); moles before and
  after.
- **🧪 Empirical formula**: a virtual practical. Burning magnesium in a crucible (weigh, add,
  heat while lifting the lid rarely / once a minute / very often, cool, weigh, heat again to
  constant mass), or reducing copper(II) oxide in methane (keep the gas on while it cools, or
  not). Balance 0.01 g or 0.001 g. Results table and worked formula. Graphs: class results
  (mass of O against mass of metal, with MO, MO₂ and M₂O lines); mass after each heating.
- **💧 Hydrates**: heating CuSO₄·5H₂O, MgSO₄·7H₂O, BaCl₂·2H₂O or CoCl₂·6H₂O on a gentle or
  strong flame, to constant mass; colour changes; spitting and decomposition on a strong flame.
  Graphs: mass after each heating; your values of x.
- **📉 Yield**: making copper(II) sulfate crystals from CuO and sulfuric acid in five steps
  (acid volume and concentration, how far to evaporate, how cold to cool, care, drying).
  Graphs: where the product went (a waterfall from theoretical to actual yield); yield against
  the volume left after evaporating. A level: atom economy for eight routes (two to copper
  sulfate, two to ethanol, iron, two to hydrogen, ammonia).
- **🫧 Gases**: magnesium or marble with hydrochloric acid, the gas collected in a 100 cm³
  syringe, a measuring cylinder over water or a burette over water; mass, acid volume and
  concentration (so either reactant can be limiting), room temperature, oxide coat on the
  ribbon, putting the bung in late. A level: air pressure. Graphs: volume against time;
  volume against mass (class results); molar volume against temperature (pV = nRT, CP1).
- **🧫 Solutions**: weighing by difference, dissolving, transferring (rinsing or not), making
  up to the mark (meniscus on, above or below the line), and an optional 25.0 → 250 cm³
  dilution. Four solids including NaOH (not a primary standard). Graphs: concentration against
  mass for three flasks; A level percentage-uncertainty budget.

Right panel: what's happening, readings, worked calculations, results tables, key ideas
with spec tags, exam practice (13 iGCSE and 10 A level questions with mark schemes; "Your…"
questions use the substance, masses, results and gas readings on screen) and "How the model
works (and what it leaves out)". Links to Acids, Salts and Chemical Tests, Electrolysis,
Electrochemical Cells, Crystallisation, Atomic Structure, Gas in a Box and the Central Limit
Theorem.

## Controls

- **Presets** (12): The mole · Reacting masses · Limiting reactant · Empirical formula: MgO ·
  Water of crystallisation · Percentage yield · Gas volumes: 24 dm³ · Concentration · and at
  A level: CP1: molar volume of a gas · Atom economy · Percentage uncertainty · Why MgO comes
  out low. Several start an experiment, or fill in a few class results, straight away.
- The left panel shows the controls for the tab in use.
- Play / Pause, Reset, speed 1×, 3×, 10× (heating runs at 1 minute a second), hide/show panels,
  full screen.
- **No quality setting**: every picture is a few dozen shapes and draws in about a millisecond,
  so there is nothing to turn down.

## The models

- Ar: IUPAC standard atomic weights (2021, abridged) for the model; the Pearson iGCSE
  periodic-table values (Mg 24, Cu 63.5, Cl 35.5) or A level values (Mg 24.3, S 32.1) for the
  students' calculations. L = 6.02214076 × 10²³ mol⁻¹, R = 8.314 J K⁻¹ mol⁻¹, 24.0 dm³ mol⁻¹ at rtp.
- Magnesium: burned fraction 1 − e^(−t/τ), τ = 1.2 + 2.0 ÷ L^0.7 min (L = lid lifts a minute);
  smoke lost 0.2% + 1% × L² of the oxide (lognormal scatter); 7% ÷ (1 + L) of the magnesium
  forms Mg₃N₂ unless water is added and it is reheated. Copper(II) oxide: reduction time
  constant 2 min; 5–15% re-oxidised if the gas is turned off while hot.
- Hydrates: x − 1 waters leave with time constant 2.5 min (gentle) or 1.0 min (strong); the
  last one 12 or 2.5 min. Strong flame: 0.6% spitting loss; CuSO₄ decomposes slowly after
  6 minutes (CuSO₄ → CuO + SO₃).
- Yield: crystals X from A g of CuSO₄ in W g of water at saturation S: A − 0.639X = S(W − 0.361X),
  with CuSO₄ solubility 14.3 (0 °C), 20.7 (20 °C), 28.5 (40 °C) g per 100 g water (CRC Handbook,
  smoothed). Transfer losses by care; undried crystals hold about 6% water.
- Gases: ideal gas; rate ∝ n^(2/3) × [acid], ×2 per 10 °C; oxide coat 0–6% of the ribbon's
  mass; late bung loses about 3.5%; syringe sticks about 0.8 cm³; over water the gas carries
  water vapour (Tetens formula, 2.3 kPa at 20 °C); CO₂ dissolves a little.
- Solutions: weighing by difference (two readings), class B flask tolerances (BS EN ISO 1042:
  100 cm³ ±0.20, 250 ±0.30, 500 ±0.50; 25 cm³ pipette ±0.06), meniscus ±0.1 cm³ (or 2 cm³ if
  misread), 2% lost if not rinsed, NaOH pellets about 97% NaOH.
- Balances read to 0.01 g or 0.001 g with a wobble of a quarter of the last digit.

## Batch run

**📊 Batch run** runs many students' experiments with no drawing, with the batch settings
table (every setting used; tick one to sweep it), mean, SD, standard error, theory overlays
and CSV export. One-click experiments:

1. **Formula of magnesium oxide: 200 students**: centred near 0.90, not 1.00 (systematic error).
2. **How often to lift the lid?**: an inverted U, best near once a minute.
3. **Bigger sample, better result?**: the SD shrinks with mass; the mean does not move.
4. **Water of crystallisation: heat for longer**: x creeps up to 5 on a gentle flame.
5. **Too strong a flame?**: x overshoots 5 (spitting, decomposition).
6. **Limiting reactant: magnesium and acid**: volume rises, then levels at 60 cm³.
7. **CP1: molar volume of hydrogen**: close to RT/p because two errors cancel.
8. **pV = nRT: molar volume and temperature**: a straight line, 22.8 → 25.7 dm³.
9. **Percentage yield: how far to evaporate?**: 83% → 15% as more liquid is left.
10. **Standard solution: how much to weigh?**: the spread shrinks as 1 ÷ mass.

## Files

- `moles-reacting-masses.html`: the simulation.
- `README.md`: this file.
