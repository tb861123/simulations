# Moles, Reacting Masses and Yield

A single, self-contained HTML file: counting particles by weighing, reacting
masses and the limiting reactant, formulae and water of crystallisation by
experiment, gas volumes and atom economy, with virtual practicals that have
realistic random and systematic errors. It needs no install and no internet:
**open `moles-reacting-masses.html` in Chrome or Edge**. Printable worksheets
(one per investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/moles_reacting_masses.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`moles-reacting-masses.html` by hand. The earlier version and its worksheets
are kept in [`original/`](original/). Titrations are in Acids, Salts and
Chemical Tests.

- **Standard (iGCSE):** Pearson Edexcel 4CH1 1(e): Mr, moles, reacting masses,
  limiting reactant, empirical formula, water of crystallisation, yield, molar
  gas volume.
- **Advanced (A level):** Pearson Edexcel 9CH0 Topic 5: Avogadro constant,
  pV = nRT, atom economy, Core Practical 1.

## Five views

The mole (11 substances on a balance) · Reacting masses (nine reactions, the
limiting reactant ringed, a three-step worked calculation, atom economy) ·
Empirical formula (burning magnesium: lid, sample size, balance; heat to
constant mass; class results) · Hydrates (CuSO₄·xH₂O on a gentle or strong
flame) · Gas volumes (magnesium + acid; syringe or over water; oxide coat;
temperature; molar volume).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Formula of magnesium oxide: 200 students | 0.90 ± 0.05 (1: systematic error) |
| How often to lift the lid? | 0.68, 0.89, 0.75: an inverted U |
| Bigger sample, better result? | SD shrinks with mass; the mean stays below 1 |
| Water of crystallisation: heat for longer | x 1.5 → 4.9 over 1–8 heatings (5) |
| Too strong a flame? | x overshoots to 6.8 (5) |
| Limiting reactant: magnesium and acid | levels off at 60 cm³ |
| CP1: molar volume of hydrogen | 23.7 ± 0.3 dm³ (RT/p = 24.1) |
| pV = nRT | 22.3 → 25.8 dm³ from 0 to 40 °C (22.4 → 25.7) |
