# Energy Changes

Bonds break (energy in) and bonds form (energy out). Watch molecules come apart
into atoms and re-form as a ball rolls over the reaction profile, measure ΔH in
a polystyrene cup, burn alcohols under a can of water, and (A level) find when a
reaction becomes feasible with ΔG = ΔH − TΔS.

## How to run

Open `energy-changes.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Profiles and bonds**: seven reactions (methane, hydrogen, H₂ + Cl₂, ammonia,
  ethene + H₂, H₂ + I₂, N₂ + O₂); activation energy and ΔH arrows; a catalyst;
  atoms separating and re-joining; an energy-level staircase of bonds broken
  and made; a bond tally against the data book.
- **Cup**: neutralisation, zinc + copper(II) sulfate, magnesium + acid, and
  dissolving ammonium nitrate or calcium chloride; lid, no lid or glass beaker,
  stirred or not; readings every 30 s, extrapolation of the cooling line;
  Q = m c ΔT and ΔH worked out.
- **Fuels**: methanol to pentan-1-ol, draught screen and can height; energy per
  gram, ΔHc and where the energy went.
- **ΔG (A level)**: five reactions, ΔH and −TΔS bars, the feasibility temperature
  and K.
- Nine guided investigations and a Revise tab.

## Batch run

A class measuring the enthalpy of neutralisation (mean −55.4 kJ/mol against
−57.1); insulation (lid −55.5, no lid −55.0, glass −46.0); ΔT against
concentration (a straight line, 6.6 °C per mol/dm³); highest reading against
extrapolation for zinc (−195 against −210; data −217); the alcohol series (a
straight line, under half the data book); can height and efficiency.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its Hess cycles, Born–Haber cycles and batch
settings table are not in this version.

## Limits

Molecules are drawn flat; solutions are treated as water; bond energies are
averages. See "The model" tab.

## Source

Built from `tools/kit/src/energy_changes.js` with the shared kit: edit that file and
run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
