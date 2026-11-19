# Heating and Insulation

A single, self-contained HTML file: cooling cans and insulators, radiation from different surfaces, and the heat lost from a house: what insulation saves. It needs no install and no
internet: **open `heating-insulation.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/heating_insulation.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `heating-insulation.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1) 4(b): conduction, convection, radiation; surfaces as emitters and absorbers; insulation; efficiency; the thermal energy transfer practical; 4(c) power.
- **Advanced (A level):** WJEC Eduqas thermal physics: internal energy, the first law, Q = mcΔT, Stefan's law. Beyond the spec: U-values, Newton's law of cooling (ln graph), emissivity.

## What it shows

Three views. **Cooling cans:** a can of hot water wrapped in up to five layers of newspaper, bubble wrap, cotton wool, felt or foil, with or without a lid, a thermometer and heat-loss arrows; a results table for every material; (A level) ln(T − T_room) against time. **Radiation:** a Leslie cube with a thermopile in front of each face, and the coin-drop experiment with four plates facing a heater. **The house:** heat-loss arrows from walls, windows, floor, loft and air leaks; loft and cavity insulation, glazing, draught-proofing, thermostat, outside temperature and boiler efficiency; yearly bill and payback.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How precise is one cooling-can result? | mean fall 9.0 °C, SD 0.39 (model 9.07) |
| Layers of cotton wool | 9.2, 4.1, 2.7, 2.4, 1.7, 1.1 °C (model 9.1, 4.3, 2.8, 2.1, 1.7, 1.4) |
| Which insulator is best? | bare 9.1, newspaper 7.5, bubble wrap 5.6, cotton wool 4.2, felt 5.1, foil 5.0 °C |
| Starting temperature (no lid) | 3.1 → 10.9 °C from 40 to 90 °C |
| Leslie cube: the four faces | 1.35, 1.21, 1.11, 0.10 mV (model 1.35, 1.20, 1.13, 0.10) |
| Black or shiny plate: coin drop | 169, 207, 234 s; shiny silver never |
| Loft insulation: how thick? | £2,080 with none to £1,510 at 300 mm (average year), most saved by 100 mm |
| Turning the thermostat down | £985 at 16 °C to £2,050 at 24 °C: £133 per °C |
