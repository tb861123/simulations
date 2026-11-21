# Density and Pressure

A single, self-contained HTML file: the density practicals with real measuring errors, pressure = force ÷ area, pressure in liquids, floating and upthrust, and terminal velocity in a thick liquid. It needs no install and no
internet: **open `density-pressure.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/density_pressure.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `density-pressure.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1) 5(b) Density and pressure: ρ = m/V and the density practical, p = F/A, pressure in a fluid acts in all directions, Δp = hρg; terminal velocity (Section 1). Floating and upthrust are tagged beyond the spec.
- **Advanced (A level):** WJEC Eduqas practical skills: percentage uncertainties, random and systematic errors; Newton's laws for a falling sphere. Stokes' law and viscosity are beyond the spec; gas pressure from molecules is in Gas in a Box.

## What it shows

Five views. **Density practicals:** a regular block (eight materials, 1–6 cm, ruler or vernier callipers), an irregular object (pebble, modelling clay, brass keys; measuring cylinder or eureka can) or a liquid; each 📏 Measure adds a row to the results table; graphs of your results against the data-book value (with ± % uncertainty at A level) and mass against volume. **p = F ÷ A:** trainers, snowshoes, a stiletto, an elephant, a brick and a drawing pin on soft snow (log sliders for mass and area). **Liquid pressure:** a 1 m tank with three jets, or the sea to 200 m; water, sea water, olive oil or mercury; a sensor that reads the same whichever way it faces; your readings and their gradient. **Floating:** a 10 cm cube of any density bobbing to equilibrium in six liquids, with weight and upthrust arrows; hang it from a spring balance. **Falling sphere:** steel, glass or nylon balls in glycerol, golden syrup, olive oil or water; forces to scale; light gates or a stopwatch at 40 and 80 cm; your v against r² with η from the gradient at A level.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| One aluminium block, measured by many students | mean 2710 kg/m³, SD 144 (predicted about 135) |
| Small blocks are less precise | SD 234 at 1 cm to 53 at 6 cm; means stay near 2700 |
| Ruler or vernier callipers? (A level) | mean 8500, SD 54 (predicted 57) |
| Eureka can: a systematic error | mean 2800 kg/m³ (+3.7%) however many repeats |
| Liquid: how much should you measure? | SD 28 kg/m³ at 10 cm³ to 2.8 at 100 cm³ |
| Pressure and depth | gradient 9.75 kPa per m (ρg = 9.79) |
| Floating: how much is under? | 19.5, 38.9, 60.0, 80.1, 100, 100% (theory 20, 40, 60, 80, 100) |
| Archimedes: upthrust and volume | gradient 0.00983 N per cm³ (ρg = 0.00979) |
| Terminal velocity and radius | log–log gradient 1.80 (Stokes 2; walls and inertia lower it) |
