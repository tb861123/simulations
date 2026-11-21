# Density and Pressure

The density practicals (regular solids, irregular solids by displacement,
liquids) with realistic measuring errors; pressure = force ÷ area; pressure
in liquids, p = hρg, with a tank, a dam and the sea; floating and upthrust;
gas pressure from moving particles; and a ball falling through glycerol to
its terminal velocity.

Open `density-pressure.html` in Chrome or Edge, with no install and no
internet needed.

## Levels

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  Section 5(b) Density and pressure: ρ = m/V and the density practical;
  p = F/A; pressure at a point in a fluid at rest acts equally in all
  directions; pressure difference = height × density × g. 5(d) Ideal gas
  molecules: gas pressure from moving molecules. Terminal velocity: Section 1
  (forces and motion). Floating, sinking and upthrust are **not** in 4PH1 and
  are tagged "Beyond the spec". Cited at topic level.
- **Advanced (A level):** the WJEC Eduqas content for this topic is thin, so
  this level is deliberately modest (the level hint says so). It adds
  percentage uncertainties in a density measurement (practical skills),
  kinetic theory (p = ⅓ρc̄², the density of a gas from pV = nRT, r.m.s. speed),
  and Newton's laws for the falling ball. Hydrostatic pressure beyond 4PH1,
  upthrust, Stokes' law and viscosity are not in Eduqas and are tagged
  "Beyond the spec".

**Exam practice:** 9 iGCSE questions (density of your block, the
displacement method, the eureka can's systematic error, the pressure of your
situation, hρg at your depth, why dams are thick at the bottom, gas pressure
from molecules, terminal velocity, speed of your falling ball) and 5 A level
questions (percentage and absolute uncertainty of your block's density,
c_rms from p = ⅓ρc̄², density of air from pV = nRT, Newton's laws at terminal
velocity, deriving v ∝ r² from Stokes' law (beyond the spec)), with mark
schemes.

## The six modes

- **⚖️ Density practicals.** A regular block (eight materials, 1–6 cm,
  measured with a ruler or vernier callipers), an irregular object (stone,
  modelling clay, brass keys; measuring cylinder before-and-after or eureka
  can) or a liquid (empty and full measuring cylinder on a balance). Each
  press of 📏 Measure adds a row to the results table. Graphs: your results
  against the data-book value (with ± percentage uncertainty bars at A level)
  and mass against volume (gradient = density).
- **📌 p = F ÷ A.** Trainers, snowshoes, stiletto heels, an elephant, a
  brick, a drawing pin; mass and area sliders (logarithmic). The object sinks
  into soft snow. Graph: pressure against area on log–log axes.
- **🌊 Liquid pressure.** A 1 m tank with three jets, a 40 m reservoir behind a
  dam, or the sea to 200 m (diver, submarine); fresh water, sea water, olive
  oil or mercury. A pressure sensor that can face any way (the reading does
  not change). Graph: pressure against depth with your readings and the
  best-fit gradient (= ρg). At A level the total pressure (with the
  atmosphere) is shown too.
- **🚢 Floating.** A 10 cm cube of any density in six liquids, bobbing to
  equilibrium; weight and upthrust arrows; hang it from a spring balance
  under water (Archimedes). Graph: weight and upthrust against depth under
  the surface.
- **🎈 Gas pressure.** Particles in a 3-D box (drawn from the front); the
  force on one wall averaged over 2 s on a gauge. Graphs: the gauge over
  time with the theory p = NkT/V, and air pressure with height (Everest, Ben
  Nevis, airliner).
- **⚪ Falling sphere.** Steel, glass or nylon balls (0.5–5 mm) in glycerol,
  golden syrup, olive oil or water; weight, upthrust and drag drawn to scale;
  timing between the 40 cm and 80 cm marks by stopwatch or light gates.
  Graphs: speed against time (zoomed on the speeding-up) and your results
  (v against r², with η from the gradient at A level).

**12 presets:** Density of a block, Irregular solid, Density of a liquid,
Pressure: snowshoes, Pressure in a liquid, Dams and divers, Gas pressure,
Floating and sinking, Terminal velocity (Standard); Uncertainty in density,
p = ⅓ρc², Viscosity: falling spheres (Advanced). Nine are at Standard because
the A level content is thin.

**Quality** (Low / Medium / High / Ultra) changes the gas particles drawn,
jets and bubbles; the model is the same at every setting.

## Data (approximate; data books at about 20 °C)

- Densities (kg/m³): aluminium 2700, copper 8960, brass 8500 (8400–8730),
  steel 7850, oak about 700, pine about 500, HDPE 950, acrylic 1180, granite
  2700, modelling clay about 1700; water 998, sea water 1025, ethanol 789,
  olive oil 912, glycerol 1261, golden syrup about 1430, mercury 13 534
  (Kaye & Laby; CRC Handbook).
- Viscosities at 20 °C: glycerol 1.41 Pa s (about 0.95 Pa s at 25 °C), olive
  oil 0.084 Pa s, water 0.0010 Pa s, golden syrup about 50 Pa s (varies).
- Air: 101.3 kPa and 1.20 kg/m³ at sea level, molar mass 0.029 kg/mol;
  approximate pressures: Ben Nevis summit 86 kPa, Mont Blanc 55 kPa, Everest
  summit 33.7 kPa, airliner cruising altitude (11 km) 22.6 kPa.
- Contact areas and masses in p = F ÷ A are typical round numbers.

## Assumptions and simplifications

Listed in the simulation: errors of each instrument (ruler ±0.5 mm reading
scatter rounded to 1 mm, vernier ±0.05 mm rounded to 0.1 mm, balance 0.01 g,
cylinder read to 0.5 cm³, eureka can loses 1.0 ± 0.4 cm³); snow gives way
above 3 kPa (illustrative); liquids incompressible; ideal gas with no
collisions between particles, each standing for about 10²⁰ molecules;
isothermal atmosphere; Stokes drag with a standard high-Reynolds-number
correction and a wall factor (1 + 2.1r/R).

## Batch run

📊 **Batch run** runs the model many times with no drawing and compares the
results with theory (mean, SD, standard error, CSV); every setting used is in
the settings table.

| Experiment | Result | Theory |
|---|---|---|
| One aluminium block, ruler (300) | mean 2705 kg/m³, SD 122 | 2700; predicted SD 120 |
| Small blocks are less precise (1–6 cm) | SD 630 → 100 kg/m³ | means stay at 2700 |
| Ruler or vernier callipers? (A level, 1.5 cm brass, 300) | mean 8501, SD 76 | 8500; predicted SD 76 |
| Eureka can: a systematic error (300) | mean 2788 kg/m³ (+3.3%, 29 standard errors) | 2700: repeating does not remove it |
| Liquid: how much to measure? (10–100 cm³) | SD 20 → 1.9 kg/m³ | 998 |
| Pressure and depth (0–1 m) | gradient 9.78 kPa/m | ρg = 9.79 kPa/m |
| Floating: how much is under? | 19.8, 39.8, 59.8, 79.8, 99.6, 99.6, 99.6% | 20, 40, 60, 80, 100% |
| Archimedes (20–400 cm³) | gradient 0.00983 N per cm³ | ρg = 0.00979 N per cm³ |
| Gas: pressure and number of particles | 20.1 → 200.4 kPa, gradient 0.667 kPa per particle | p = NkT/V: 20.1 → 200.6 kPa |
| Terminal velocity and radius (beyond the spec) | log–log gradient 1.83 | Stokes: 2; walls and inertia lower it |

Run `node tools/worksheets/run-batch-experiments.js` on this file to check
all experiments (0 errors at the time of writing).

## Cross-links

Gas in a Box (gas laws, p = ⅓ρc²), States of Matter (particles), Heating and
Insulating a House (convection: warm fluids are less dense), Projectile Motion
(air resistance), Central Limit Theorem (why repeats help).
