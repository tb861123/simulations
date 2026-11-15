# Ionic, Covalent and Metallic Bonding

One simulation for all three kinds of bonding in Edexcel International GCSE Chemistry
(Topic 1). A mode switch chooses ionic, covalent or metallic. The top picture shows how the
bond forms (electron transfer, shared pairs with a 3-D shape, or a sea of delocalised
electrons). The bottom picture shows the structure as particles between two electrodes:
heat it and watch it melt and boil, switch on a battery to see whether it conducts, or push
its top layers to see whether it bends or shatters. The right panel compares melting
points and properties across giant ionic, simple molecular, giant covalent and metallic
structures.

## How to run

Open `bonding.html` in Chrome or Edge. There is nothing to install and it works offline.

## Levels (Standard / Advanced)

A **Standard (iGCSE) / Advanced (A level)** switch sits at the top of the left panel. Standard follows Pearson Edexcel International GCSE Chemistry (4CH1); Advanced follows Pearson Edexcel A level Chemistry (9CH0) and keeps everything in Standard. The choice is remembered in the browser. Key ideas carry spec tags (grey-green 4CH1, purple 9CH0, blue-grey beyond both). Exam practice has questions with mark schemes at both levels; questions marked "Your…" use the numbers on screen. Batch runs are the same at both levels.

- **Standard:** 4CH1 Section 1(f) Ionic, 1(g) Covalent and 1(h) Metallic bonding, with structure
  and properties.
- **Advanced:** 9CH0 Topic 2 Bonding and structure, kept moderate (shapes of molecules and
  intermolecular forces have their own simulation): extra readings (electronegativity difference,
  bond polarity, polar or non-polar molecule; ionic radii and polarising power), six A level
  presets (H–Cl; polar bonds in non-polar CO₂; ionic or covalent; polarisation in Al₂O₃; dative
  bond in NH₄⁺; Al₂Cl₆) and seven A level exam questions. **A level box** (under the readings):
  *Electronegativity* (any two atoms, the shared pair drawn shifting, δ+/δ−, and where the bond
  sits from non-polar to ionic) and *Dative bonds* (NH₄⁺, H₃O⁺, NH₃BF₃, CO, Al₂Cl₆, with the lone
  pair being donated).

## Controls

- **Type of bonding:** Ionic, Covalent or Metallic (sets the substance list).
- **Presets** (12): Salt: electron transfer; Salt melts and conducts; Magnesium oxide;
  Ionic crystals are brittle; Water: a bent molecule; Methane boils at −162 °C; Nitrogen: a
  triple bond; Diamond: giant covalent; Graphite conducts; Copper conducts; Metals bend;
  Aluminium: 3 electrons each.
- **Substances** (26): NaCl, KBr, CaCl₂, Na₂O, MgO, Al₂O₃; H₂, Cl₂, O₂, N₂, HCl, H₂O, NH₃,
  CH₄, CO₂, C₂H₄ and the alkanes CH₄ to C₁₀H₂₂ (slider); diamond, graphite, SiO₂; Na, K, Mg,
  Al, Cu, Fe.
- **Conditions:** temperature (−273 to 4000 °C), heater power, and for soluble salts
  "Dissolve it in water" with a concentration (0.001 to 1 mol/dm³).
- **Tests:** battery voltage for the conductivity test (a 6 V 0.5 A bulb in series), and
  "Push the top layers sideways".
- **Display:** picture detail (Low / Medium / High / Ultra: particle numbers and shading),
  3-D shape or lattice, lone pairs, forces between particles.
- **Centre:** Play/Pause, Replay (re-forms the bond and mends a broken crystal), Heat and Cool
  (the temperature stops rising while the substance melts or boils), speed (½×, 1×, 4×,
  20×), **Batch run**. In ionic mode you can drag the electron from the metal to the
  non-metal. Drag a 3-D model to turn it. Hover over particles for details.
- **Right panel:** commentary, readings (structure, melting and boiling points, state,
  moving charges, conductivity and current), a live heating curve, melting points of every
  substance grouped by structure, a structure-and-properties table, key ideas, exam
  practice and "How the model works (and what it leaves out)".
- The side panels can be resized or hidden, and the centre can go full screen.

## Merged in

This simulation replaces three old pages, which overlapped (all three explained melting
point and conductivity from structure):

- `chem_sims/03_Ionic_Bonding.html`: the four compounds (NaCl, MgO, CaCl₂, KBr), the electron
  transfer animation with a draggable electron, the half-equations, the ions with charges,
  the giant ionic lattice with its electrostatic attractions, hover details, the five
  tour steps (now presets 1–4) and its three exam questions.
- `chem_sims/04_Covalent_Bonding.html`: the eight molecules (H₂, HCl, H₂O, NH₃, CH₄, O₂,
  CO₂, N₂), the dot-and-cross diagrams, the rotating 3-D shapes with bond angles, lone-pair
  and 3-D toggles, the molecule readout, the simple-molecular vs giant-covalent key facts,
  the tour steps (now presets 5–8) and its three exam questions.
- `chem_sims/08_Metallic_Bonding.html`: sodium, magnesium and aluminium with 1, 2 and 3
  delocalised electrons, the sea of electrons, the voltage drift, the force slider that
  slides the layers, hover details, the tour steps (now presets 10–12) and its three
  exam questions.

New: Na₂O and Al₂O₃ (2:1 and 2:3 formulas), Cl₂, C₂H₄ and the alkanes, diamond, graphite and
silicon dioxide in 3-D, K, Cu and Fe, real 3-D NaCl and CaF₂-type lattices, heating with
melting and boiling, the conductivity circuit, dissolving, brittleness vs malleability, the
melting-point comparison, the batch run and live exam questions.

Dropped: the old guided tours as separate step-through panels (their steps are now presets
with the same explanations) and the old metallic page's checkbox that hid the electrons
(the forces checkbox now hides the electron sea glow; the electrons themselves are always
shown because they are the bond).

## The model

- **Heating** 0.1 mol (live) or n mol (batch) with power P: ΔT = Q/(nc) below and between
  transitions; at the melting point Q = nΔH_fus with the temperature fixed; at the boiling
  point Q = nΔH_vap. CO₂ and graphite sublime.
- **Conductivity test:** R_sample = 1/(σ × 0.01 m), I = V/(12 Ω + R_sample).
  Metals: σ = σ₂₀/(1 + α(T − 20)); molten metals half the value at the melting point.
  Molten salts: NaCl 3.6 S/cm, KBr 1.6, CaCl₂ 2.0, others a typical 3 S/cm. Salt
  solutions: σ = cΛ with Λ = Λ₀ − K√c/(1 + √c) (matches NaCl data within about 2% to
  1 mol/dm³). Graphite 10⁵ S/m. Everything else (and every gas) does not conduct.
- **Particles:** solids vibrate about lattice sites (more when hotter); melting starts at
  the top surface; liquids slide past each other; gases fly about. Moving ions drift to the
  electrode of opposite charge, electrons towards +.
- Data: melting and boiling points, enthalpies, conductivities and α from the CRC Handbook
  and NIST. Approximate values are flagged in the simulation (molten conductivities of Na₂O,
  MgO and Al₂O₃, some enthalpies of vaporisation, α for Na and K, diamond's melting point).

## Assumptions and simplifications

- Melting and boiling points are data, not predicted from the bonding.
- One heat capacity per substance, no heat losses, an instant thermometer.
- The particle picture is 2-D; formulas such as CaCl₂ are drawn with the right ratio, not
  the real arrangement (the 3-D view shows the real NaCl, CaF₂-type, diamond, graphite and
  SiO₂ structures; CaCl₂'s real lattice differs slightly from CaF₂'s).
- Ions reaching an electrode are put back at the other side (really they are discharged:
  electrolysis).
- The push test is a picture of the explanation, not a force calculation.
- Left out: hydrogen bonding and polar molecules, impurities, pressure, diamond turning
  into graphite, metals' different crystal structures.

## Batch experiments

Two model experiments, run many times without drawing: a heating-curve experiment (the
thermometer has a random reading error; the "student" averages the flat part of the curve)
and a conductivity test (the meter reading flickers because the charges move randomly;
2% × √(T/293 K)/√(averaging time)). Every setting is in the batch settings table:
substance, dissolved or not, temperature, voltage, concentration, averaging time, carbon
atoms (alkanes), amount, heater power, thermometer error and reading interval.

| Experiment | What it shows |
|---|---|
| Does solid salt conduct? | current 0 up to 800 °C, then about 0.49 A once molten (801 °C) |
| Find the melting point of salt | 200 heating curves average 801.0 °C with SD 0.13 °C (theory 0.12) |
| Bigger molecules, higher boiling point? | alkane boiling points rise from −162 °C (CH₄) to 174 °C (C₁₀H₂₂) |
| Do metals conduct worse when hot? | copper's conductivity falls from 6.5 × 10⁷ to 2.1 × 10⁷ S/m between 0 and 500 °C |
| More ions, more conduction? | salt solutions: σ nearly ∝ c (log–log gradient 0.95), falling below the ideal line at high c |
| How long does ice take to melt? | t = nΔH_fus/P: half the time for double the power (gradient −1) |

Each experiment uses fixed random seeds, so the results are reproducible. After changing the
experiments, re-run `tools/worksheets` to update the worksheets.
