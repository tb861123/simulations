# Capacitors

A single, self-contained HTML file: charge and discharge through a resistor: Q = CV, exponential change, the time constant RC, ln V graphs, energy ½CV², series and parallel. It needs no install and no
internet: **open `capacitors.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/capacitors.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `capacitors.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** capacitors are not in Pearson Edexcel 4PH1; Standard uses the circuit to practise Section 2: Q = It, V = IR, E = QV, P = IV, conventional current and electrons.
- **Advanced (A level):** WJEC Eduqas A level Physics Component 2 Topic 4 Capacitance: Q = CV, exponential charge and discharge, τ = RC, ln V against t, U = ½CV², series and parallel. Leakage is beyond the spec.

## What it shows

A circuit with a cell, a two-way switch, a resistor and a capacitor (or three in series or parallel at A level). Electrons flow round the active loop and slow down as the current falls; + and − build up on the plates; the resistor glows with I²R. Click the switch to charge or discharge. Charts: V and I against time with τ marked, the Q–V graph with the stored energy shaded, and (A level) ln V against t from your own readings with a fitted RC. Energy from the cell and heat in the resistor are tracked.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Discharge curve | 6.0 → 0.05 V over 20 s, on V₀e^(−t/RC) within the ±10% capacitor tolerance |
| Time constant and resistance | gradient 0.46 s per kΩ, r = 1.000 (theory C = 0.47) |
| Finding C from a ln V graph | mean 469 µF, SD 10 (true 470) |
| Energy stored | 0.235 mJ at 1 V to 33.8 mJ at 12 V (½CV², identical) |
| Half the energy is always lost | 0.500 for every R from 10 Ω to 1 MΩ |
| Series and parallel | 100, 50, 33, 25, 20, 17 µF in series; 100n in parallel |
