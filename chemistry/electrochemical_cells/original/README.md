# Electrochemical Cells

A single, self-contained HTML file (`electrochemical-cells.html`) for chemistry. Open it in
Chrome or Edge, with no install and no internet.

Displacement and the reactivity series, simple cells, half-cells with a salt bridge and the
standard hydrogen electrode, E° values and feasibility, the effect of concentration, fuel
cells and lithium-ion storage cells, and redox titrations, with a virtual Core Practical 10.

The reactivity series in full (metals with water and acid, extraction) is in **Reactivity and
Extracting Metals** (`../reactivity_metals/`), electrolysis in **Electrolysis**
(`../electrolysis/`), halogen displacement in **Groups 1 and 7** (`../periodic_groups/`) and
titration technique in **Acids, Salts and Chemical Tests** (`../acids_salts_tests/`); the
page links to them rather than repeating them.

## Levels (Standard / Advanced)

A **Standard (iGCSE) / Advanced (A level)** switch sits at the top of the left panel and is
remembered in the browser. Advanced keeps everything in Standard and adds two tabs (Half-cells
and E°, Redox titrations), the lithium-ion cell, A level views, readings, presets and exam
questions. Key ideas carry spec tags (grey-green 4CH1, purple 9CH0, blue-grey beyond the
spec). Batch runs are the same at both levels.

- **Standard:** Pearson Edexcel International GCSE Chemistry (4CH1) **Section 2(d) Reactivity
  series**: displacement reactions, deducing the order of reactivity, oxidation and reduction
  (and 3(a): displacement is exothermic). **Simple cells** and the **hydrogen fuel cell** build
  on this but may not be in 4CH1 itself: they are tagged "Beyond 4CH1 (check)".
- **Advanced:** Pearson Edexcel A level Chemistry (9CH0) **Topic 14 Redox II**: half-cells, the
  salt bridge, the standard hydrogen electrode and standard conditions, E°cell = E°(positive) −
  E°(negative), feasibility and its limits (kinetics, non-standard conditions), fuel cells and
  storage cells, redox titrations with manganate(VII) and iodine–thiosulfate, and **Core
  Practical 10** (electrochemical cells). Ionic equations and oxidising/reducing agents are
  tagged Topic 3.
- Tagged **beyond 9CH0 (extension)**: the size of the concentration effect (the Nernst
  equation), ΔG = −nFE and the potential curve during a redox titration.

## What it shows

Tabs at the top of the centre panel:

- **🔩 Displacement**: magnesium, zinc, iron, copper or silver (powder or strip) in 25 cm³ of
  0.50 mol/dm³ MgSO₄, ZnSO₄, FeSO₄, CuSO₄ or AgNO₃ in a polystyrene cup. The metal is coated,
  the blue fades, a thermometer rises; a zoomed-in view shows metal atoms giving electrons to
  the ions. Graphs: temperature against time (with the "no heat lost" rise from ΔH); the
  results grid (▦ Do them all), which gives the order of reactivity; A level: the E° ladder.
- **🍋 Simple cells**: two of eight electrodes (Mg, Zn, Al, Fe, Pb, Cu, Ag, graphite) in salt
  water, 1–4 cells in series, connected to a voltmeter, a red LED or a torch bulb; electrons
  move round the circuit. Graphs: your recorded voltages (with the E° differences for
  comparison); where the metals sit in the galvanic series.
- **⚡ Half-cells and E°** (A level): any two of 16 couples (metals, the SHE, I₂/I⁻, Fe³⁺/Fe²⁺,
  Br₂/Br⁻, O₂/H₂O, Cr₂O₇²⁻/Cr³⁺, Cl₂/Cl⁻, MnO₄⁻/Mn²⁺), concentrations, temperature, a
  high-resistance or moving-coil voltmeter, cleaned or dirty metals, the salt bridge in or out.
  Beakers, electrodes (platinum and gas tubes where needed), a salt bridge with K⁺ and NO₃⁻
  moving, electrons in the wire, the cell diagram, which electrode is oxidised and which
  reduced. 📏 Take a reading (CP10, with realistic errors). Graphs: the E° ladder; measured
  against predicted; EMF against log concentration; ΔG = −nFE (extension).
- **🔋 Fuel and storage**: a hydrogen–oxygen fuel cell (acid membrane, or alkaline at A level)
  with gases in, ions crossing, electrons through a motor, and the V–I and power curves; at A
  level a lithium-ion cell (Li⁺ moving between graphite and LiCoO₂) discharging or charging,
  with its discharge curve.
- **🧪 Redox titrations** (A level, light): iron(II) with manganate(VII) (self-indicating) or
  iodine with thiosulfate (starch near the end); rough then accurate titrations, concordant
  titres, a new unknown each time. Graphs: your titres; the potential of the flask during the
  titration (beyond the spec).

Right panel: what's happening, readings, half-equations and worked calculations, results
tables, key ideas with spec tags, exam practice (9 iGCSE and 12 A level questions with mark
schemes; "Your…" questions use the metals, cell and titres on screen) and "How the model works
(and what it leaves out)".

## Controls

- **Presets** (12): Displacement · Reactivity series · A simple cell · Bigger difference, bigger
  voltage · Cells in series · Hydrogen fuel cell · and at A level: CP10: half-cells and EMFs ·
  Standard hydrogen electrode · Feasibility and its limits · Concentration and EMF ·
  Lithium-ion storage cell · Redox titration.
- The left panel shows the controls for the tab in use.
- Play / Pause, Reset, speed 1×, 5×, 20×, hide/show panels, full screen.
- **No quality setting**: every picture is a few dozen shapes and draws in about a millisecond.

## The models and data

- **E°** (V, 298 K): Li −3.04, K −2.93, Ca −2.87, Na −2.71, Mg −2.37, Al −1.66, Zn −0.76,
  Fe −0.44, Ni −0.25, Pb −0.13, H⁺/H₂ 0.00, Cu +0.34, I₂/I⁻ +0.54, Fe³⁺/Fe²⁺ +0.77, Ag +0.80,
  Br₂/Br⁻ +1.09, O₂/H₂O +1.23, Cr₂O₇²⁻/Cr³⁺ +1.33, Cl₂/Cl⁻ +1.36, MnO₄⁻/Mn²⁺ +1.51 (standard tables:
  CRC Handbook; Bard, Parsons and Jordan 1985; the same to 2 d.p. as A level data booklets).
  Concentration effects by the Nernst equation; F = 96 485 C mol⁻¹, R = 8.314 J K⁻¹ mol⁻¹.
- **Displacement**: ΔH from standard enthalpies of formation of the aqueous ions (NBS tables /
  CRC Handbook: Mg²⁺ −466.9, Zn²⁺ −153.9, Fe²⁺ −89.1, Cu²⁺ +64.8, Ag⁺ +105.6 kJ mol⁻¹); heat
  capacity 110 J K⁻¹; heat loss 0.5% of the excess a second; iron reacts slowly.
- **Simple cells**: approximate galvanic series in seawater (V vs SCE: Mg −1.60, Zn −1.03,
  Al −0.79, Fe −0.61, Pb −0.50, Cu −0.34, Ag −0.13, graphite +0.25; ASTM G82 and corrosion
  handbooks), internal resistance 400 Ω per cell, LED threshold 1.8 V.
- **CP10 errors**: voltmeter ±0.005 V read to 0.01 V; junction ±0.006 V; concentrations ±5%;
  oxide films on uncleaned metals; magnesium (+0.7 V) and aluminium (+1.0 V) never reach E°;
  a 1 kΩ meter on a cell of about 2 kΩ internal resistance.
- **Fuel cell**: V = 1.229 − 0.05 ln((j + 0.003)/0.0001) − 0.15 j + 0.05 ln(1 − j/1.4), 10 cm²;
  efficiency V ÷ 1.48 V. **Lithium-ion**: illustrative curve 3.0–4.2 V, 3.0 A h, 0.05 Ω.
- **Titrations**: 0.0200 mol dm⁻³ KMnO₄ or 0.100 mol dm⁻³ Na₂S₂O₃; pipette ±0.06 cm³, burette
  read to 0.05 cm³, 0.05 cm³ drops, up to 0.4 cm³ overshoot without dropwise addition.

## Batch run

**📊 Batch run** with the batch settings table, mean, SD, standard error, theory overlays and
CSV export. One-click experiments:

1. **Simple cells: reactivity and voltage**: rises with distance from copper, except aluminium.
2. **CP10: EMF of the zinc–copper cell**: 200 students, mean 1.099 V, SD 0.009 V.
3. **CP10: electrode potentials via a copper reference**: on the E° line except magnesium.
4. **Concentration and EMF**: 0.030 V per tenfold dilution of Cu²⁺.
5. **Why a high-resistance voltmeter?**: a 1 kΩ meter reads a third of the EMF.
6. **Fuel cell: voltage falls as current rises**.
7. **Redox titration: 200 students**: within about ±0.2% of 0.1000 mol dm⁻³.
8. **Displacement: how hot does it get?**: Mg > Zn > Fe, all below the "no heat lost" rise.

## Files

- `electrochemical-cells.html`: the simulation.
- `README.md`: this file.
