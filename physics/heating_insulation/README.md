# Heating and Insulating a House

Conduction, convection and radiation with particle views; heat losses,
insulation, payback time and Sankey diagrams for a UK semi-detached house;
the cooling-cans (insulation) and Leslie cube (radiation) practicals with
realistic measurement error; internal energy, Q = mcΔT, the first law for a
room and Newton's cooling curve with an exponential fit.

Open `heating-insulation.html` in Chrome or Edge, with no install and no
internet needed.

## Levels

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  Section 4(b) Energy transfers: conduction, convection and radiation;
  emission and absorption of radiation and the surface; reducing unwanted
  energy transfer (insulation); efficiency and Sankey diagrams; the practical
  on thermal energy transfer (cooling cans, Leslie cube, conducting rods).
  4(c) power = energy ÷ time. Specific heat capacity (ΔQ = mcΔT) is 4PH1 5(c):
  it is used here and covered fully in States of Matter. Cited at topic level.
- **Advanced (A level):** WJEC Eduqas thermal physics: internal energy, heat
  and work, the first law ΔU = Q − W applied to a room, Q = mcΔT for the air and
  the walls; Stefan's law (from "using radiation to investigate stars").
  Tagged **Beyond the spec**: U-values and the conduction equation (Eduqas
  option D, not taught), Newton's law of cooling (the ln graph uses the same
  skill as capacitor discharge and radioactive decay), emissivity, heat pumps.

The level switch has a hint naming the spec; the key-ideas box tags each
idea (grey-green iGCSE, purple A level, blue-grey beyond the spec).
**Exam practice:** 8 iGCSE questions (conduction in metals, convection,
energy lost through your walls in an hour, the efficiency of your heating,
payback for loft insulation, how insulation works, the cooling-cans method,
the Leslie cube) and 7 A level questions (Q = mcΔT for the air, internal
energy, the first law with the numbers on screen, τ from your ln graph,
Stefan's law prediction, U-value heat loss (beyond the spec), percentage
uncertainty in a temperature fall), all with mark schemes.

## The six modes

- **🔥 Conduction.** Four rods (copper, steel, glass, wood, or four metals) in
  a hot block, with drawing pins held on by wax. A zoom shows the particles
  vibrating more at the hot end, and free electrons in metals. Graphs: when
  each pin dropped, temperature along the rods, temperature at 10 cm.
- **🌀 Convection.** A beaker heated at one corner (with potassium
  manganate(VII) dye) or a room with a radiator and a cold window: a
  temperature map, the circulating current, particles jiggling faster where
  it is hot, and an inset showing hot water is less dense.
- **☀️ Radiation.** A radiant heater between two plates (matt black, shiny
  black, matt white, shiny silver) with coins held on by wax; infrared rays
  absorbed or reflected; plate temperatures over time.
- **🏠 The house.** Loft insulation (0–300 mm), cavity wall insulation,
  single / old double / modern double glazing, draught-proofing; old or
  condensing gas boiler, electric heaters or a heat pump; thermostat, timer,
  outside temperature and fuel prices. Heat-loss arrows sized in watts, a
  thermal camera view, readings and a payback table. Graphs: temperatures over
  the day (air, walls, outside, heating firing), where the heat goes, a
  Sankey diagram for a year, cost and payback, and (A level) the first law:
  Q in, Q out and ΔU over the day.
- **🥫 Cooling cans.** The 4PH1 insulation practical: different materials,
  layers of cotton wool, or lids on and off; liquid-in-glass or digital
  thermometers; readings every 30 s, 1 or 2 min; a results table. Graphs:
  temperature against time, fall in temperature, and (A level) ln(T − 20)
  against time with the time constant τ for each can.
- **⬛ Leslie cube.** Four faces, water temperature, detector distance, take
  readings (or all four faces). Graphs: readings for each face, and (A level)
  signal against T⁴ − T_room⁴.

**12 presets:** Conduction, Convection, Absorbing radiation, Leslie cube,
Where does the heat go?, Insulating: cost and payback, Sankey diagram,
Cooling cans practical (Standard); Internal energy overnight, Q = mcΔT:
warming up, Newton's cooling curve, Stefan's law (Advanced).

**Quality** (Low / Medium / High / Ultra) changes the number of particles,
rays and electrons drawn; the model is the same at every setting.

## The physics and the data

| Part | Model |
|---|---|
| Rods | 30 slices; heat flow kAΔT/Δx between slices; side loss 15 W/m²K; contact with the block 10% |
| Convection | one circulating loop, strength ∝ √(temperature difference); semi-Lagrangian advection |
| Plates | absorbed ε × P/(4πd²) × A, P = 300 W; loss by convection (8 W/m²K, two faces) and radiation |
| House | loss = Σ UAΔT + 0.33 n V ΔT; air (3 MJ/K) and walls (25 MJ/K) joined by 1500 W/K; gains 0.8 kW |
| Year | Met Office UK monthly mean temperatures 1991–2020 (approximate) ± 3 °C a day; heating off May–September |
| Cans | loss = (U_eff A)(T − 20) + evaporation from an open top; h = 5 + 6ε W/m²K |
| Leslie cube | signal ∝ ε(T⁴ − T_room⁴)/(1 + (d/6 cm)²) |

**Real data used (approximate; check before quoting):**

- U-values (W/m²K): uninsulated loft ceiling 2.3, 270 mm mineral wool about
  0.14–0.16, empty cavity wall 1.5, filled cavity 0.55, single glazing 4.8,
  1990s double glazing 2.8, modern double glazing 1.4. Sources: RdSAP default
  U-values (BRE, SAP 10) and Approved Document L, Volume 1: Dwellings (2021
  edition; limiting values for new dwellings: wall 0.26, roof 0.16, floor
  0.18, windows 1.6; threshold for a cavity wall fill 0.55).
- Energy prices: Ofgem price cap, 1 October – 31 December 2026, direct debit,
  typical unit rates as reported (gas 7.97 p/kWh including 5% VAT;
  electricity 26.32 p/kWh, 0% VAT this quarter); typical annual bill £1,723.
  Unit rates vary by region: check the Ofgem website for the current cap.
- Typical consumption: Ofgem's typical domestic consumption values (from
  April 2023) are 11,500 kWh of gas and 2,700 kWh of electricity a year. The
  model's half-insulated house uses about this much gas.
- Where the heat goes in an uninsulated house: about a third through the
  walls and a quarter through the roof (Energy Saving Trust figures, widely
  quoted).
- Installed costs (semi-detached, approximate, Energy Saving Trust and Which?
  guides 2024–26): loft insulation about £750–£930 (model £900), cavity wall
  about £2,700, double glazing several thousand pounds (model £8,000),
  draught-proofing about £250 professionally (much less DIY). Savings are
  worked out by the model, not quoted.
- Emissivities in the infrared: matt black paint 0.95, gloss black 0.85, matt
  white paint 0.80, polished aluminium 0.07 (typical handbook values).
- Thermal conductivities (W/m K): copper 401, aluminium 237, brass 109, steel
  50, glass 1.0, pine 0.12.

## Assumptions and simplifications

Listed in the simulation under "How the model works (and what it leaves out)":
the floor loses heat as if to outside air; sunshine and people are a steady
0.8 kW; the convection pattern is a single loop; the heater in Radiation is a
point source; cans lose heat with a constant h; the house has a perfect
thermostat for the yearly figures.

## Batch run

📊 **Batch run** runs the model many times with no drawing and compares the
results with theory (mean, SD, standard error, CSV). The settings table lists
every setting the chosen outcome uses; tick one to sweep it.

One-click experiments (results from the test run):

| Experiment | Result | Theory |
|---|---|---|
| How precise is one cooling-can result? (300 cans) | mean fall 9.06 °C, SD 0.57 | 9.09 °C; predicted SD 0.52 |
| Layers of cotton wool (0–5) | 9.1, 4.3, 2.8, 2.0, 1.6, 1.4 °C | 9.1, 4.3, 2.9, 2.1, 1.7, 1.4 °C |
| Which insulator is best? | bare 9.1, newspaper 7.9, bubble wrap 5.5, cotton wool 4.3, felt 5.1, foil 4.9 °C | within 0.15 °C of the model |
| Starting temperature (40–90 °C, no lid) | 3.0 → 15.2 °C, curving upwards | 3.3 → 15.4 °C |
| Leslie cube: the four faces | 1.35, 1.21, 1.14, 0.11 mV | 1.35, 1.20, 1.13, 0.10 mV |
| Black or shiny plate: coin drop | matt black 170 s, shiny black 223 s, matt white 279 s, shiny silver never | 169, 219, 263 s |
| Loft insulation: how thick? (0–300 mm) | £1,979 → £1,459 a year; most saved by 100 mm | £1,955 → £1,439 (average year) |
| Turning the thermostat down (16–24 °C) | £984 → £2,051; about £133 (9%) per °C | £955 → £2,023 |
| Colder days use more gas (−5 to 15 °C) | straight line, gradient −8.65 kWh per °C | −24H/(1000 η) = −8.7 kWh per °C |
| Newton's cooling: τ from an ln graph (A level) | mean 60.5 min, SD 0.7 | 60.4 min fitted to perfect readings |
| Stefan's law (A level, 30–95 °C) | 0.17 → 1.79 mV | ε(T⁴ − T_room⁴): 0.17 → 1.81 mV |

Run `node tools/worksheets/run-batch-experiments.js` on this file to check
all experiments (0 errors at the time of writing).

## Cross-links

States of Matter (specific heat capacity and latent heat practicals), Gas in a
Box (internal energy and the first law for a gas), Greenhouse Effect (infrared
radiation and the Earth's energy balance), Density and Pressure (why warm
fluids rise).
