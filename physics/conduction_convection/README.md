# Conduction and Convection

A single, self-contained HTML file: a heated metal rod with wax-held ball bearings (conduction), and a room in cross-section where you place a heater or an air conditioner anywhere and watch the convection currents. It needs no install and no
internet: **open `conduction-convection.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/conduction_convection.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `conduction-convection.html` by hand.

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1) 4(b): conduction (free electrons, insulators), convection currents, insulation, the lagging and conduction practicals.
- **Advanced (A level):** WJEC Eduqas thermal physics: conduction P = kAΔT/L (Fourier's law), convection from density differences. Beyond the spec: thermal diffusivity.

## What it shows

Two views. **Convection: a room:** click to place a heater (floor, ceiling or anywhere) or an air conditioner (ceiling, floor or anywhere), drag to move them; the air is a small fluid simulation (buoyancy, drag, pressure projection) with smoke tracers, a temperature map, a height profile and temperature-against-time graphs. Smoke dots slide along the walls, floor and ceiling rather than leaving the room. Add a window (left or right wall, click it to open or shut it), and set the starting and outside temperatures. Turn off "air can move" to see conduction alone. **Conduction: a rod:** copper, aluminium, steel, glass, wood or polystyrene heated at one end; wax at four pins drops each ball bearing at 60 °C; optional lagging; (A level) heat flow against kAΔT/L.

## Batch run

| Experiment | Result when tested |
|---|---|
| How precise is one pin-drop time? | copper, 10 cm pin: mean 124 s, SD 29 s |
| Which material conducts best? | 5 cm pin: copper 26 s, aluminium 32 s, steel 283 s; glass, wood and polystyrene never |
| Fourier's law | 2.5 W at ΔT = 20 K up to 20.6 W at 160 K (P = kAΔT/L) |
| Heater height | lower half warms 14.4 K (floor heater) down to 0.09 K (ceiling heater) after 8 min |
| Air conditioner height | cooler near the ceiling cools the room by about 12 K, near the floor by 0.3 K |
| Convection or conduction only? | far side of the room at head height: +10.7 °C with convection, 0 without |
| Open the window | 0 °C outside: the room cools 3.6 K in 8 min with the window shut, 8.1 K with it open |

The room runs in batch mode use a coarser 32 × 20 grid, so the numbers are indicative.
