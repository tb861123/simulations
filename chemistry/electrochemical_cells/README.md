# Electrochemical Cells

A single, self-contained HTML file: displacement and the reactivity series, simple cells, half-cells and E°, fuel and storage cells, and redox titrations. It needs no install and no
internet: **open `electrochemical-cells.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/electrochemical_cells.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `electrochemical-cells.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Chemistry (4CH1) 2(d) Reactivity series: displacement, order of reactivity, oxidation and reduction; simple cells and the hydrogen fuel cell (check whether in 4CH1).
- **Advanced (A level):** Pearson Edexcel A level Chemistry (9CH0) Topic 14 Redox II: half-cells, salt bridge, the SHE, E°cell = E°(+) − E°(−), feasibility and its limits, fuel and storage cells, redox titrations, Core Practical 10. Nernst and ΔG = −nFE are extensions.

## What it shows

Five views. **Displacement:** five metals in five salt solutions in a polystyrene cup, with a thermometer, a zoomed-in view of electron transfer, and a results grid that gives the order of reactivity. **Simple cells:** two of eight electrodes in salt water, 1–4 cells in series, a voltmeter, LED or bulb, electrons moving round the circuit. **Half-cells and E°** (A level): any two of 18 couples, concentrations, temperature, voltmeter type, cleaned electrodes and salt bridge; cell diagrams; CP10 readings with realistic errors. **Fuel and storage:** hydrogen fuel cell (acid or alkaline) with its V–I and power curves, and a lithium-ion cell. **Redox titrations** (A level): manganate(VII) or thiosulfate, with a burette, colour changes and concordant titres.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Simple cells: reactivity and voltage | 0.16 V (Pb) to 1.27 V (Mg) against copper, all below the E° difference; aluminium 0.43 V, well below the trend |
| CP10: EMF of the zinc–copper cell | mean 1.100 V, SD 0.008 V (E°cell 1.10 V) |
| Concentration and EMF | gradient 0.030 V per tenfold dilution (Nernst 0.0296) |
| Electrode potentials via a copper reference | on the data-book line except Mg (−1.66 V against −2.37 V) |
| Why a high-resistance voltmeter? | 0.37 V with a 1 kΩ meter, 1.10 V above 1 MΩ |
| Fuel cell: voltage falls as current rises | 0.99 V at 0.01 A cm⁻² to 0.48 V at 1.2 A cm⁻² |
| Redox titration: 200 students | mean 0.1000 mol dm⁻³, SD 0.0002 |
| Displacement: how hot does it get? | Mg 37.6, Zn 15.7, Fe 6.5 °C (no heat lost: 60, 25, 17.5) |
