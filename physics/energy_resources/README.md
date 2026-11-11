# Energy Resources and Electricity

How fossil fuels, nuclear, wind, solar, hydro, tidal, wave, geothermal and
biomass generate electricity, with Sankey diagrams and a comparison of
reliability, cost, CO₂ and land; a "Run Britain" game where you meet the
demand hour by hour for a day or a week with real-ish wind and sunshine,
storage and interconnectors; the National Grid, transformers and I²R losses
(with the classroom model power line); a wind turbine, power ∝ v³ and the
model-turbine practical; and real GB generation data since 2000.

Open `energy-resources.html` in Chrome or Edge, with no install and no
internet needed.

## Levels

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  Section 4: energy resources and electricity generation (energy transfers in
  fossil fuel, nuclear, wind, water, geothermal and solar generation;
  advantages and disadvantages), efficiency and Sankey diagrams, power.
  Section 2: P = IV. Section 6: step-up and step-down transformers, the
  transformer equation and why electricity is transmitted at high voltage.
  Several of these points are separate-physics only (marked P); cited at topic
  level (point numbers not checked against the Pearson PDF). Wind power ∝ v³ is
  tagged **Beyond the 4PH1 spec**.
- **Advanced (A level):** WJEC Eduqas core ideas only: power, efficiency,
  kinetic energy (deriving the power in the wind, ½ρAv³), P = IV = I²R with
  numbers, log–log graphs and the uncertainty in a gradient. Most of this
  topic is Eduqas **option D Energy and the environment, which is not taught**:
  capacity factor, storage, the Betz limit, the grid as a system are tagged
  **Beyond the spec (Eduqas option D, not taught)**. The A level side is kept
  modest on purpose, and the level hint says so.

The key-ideas box tags each idea (grey-green iGCSE, purple A level, blue-grey
beyond the spec). **Exam practice:** 9 iGCSE questions (efficiency of your
station, energy transfers, wind against gas, why high voltage, turns on your
transformer, current in your line, why Britain needs reliable supply in your
week, the 2012 → 2024 data, P ∝ v³) and 7 A level questions (derive ½ρAv³ and
use it, I²R losses for your line and at double the voltage, P = I²R from P = IV,
a year's energy in J from capacity factor and efficiency, the classroom line,
the log–log gradient and its uncertainty, a storage calculation tagged option
D), all with mark schemes and numbers from the screen.

## The five modes

- **🏭 Power stations.** Choose any of 11 resources: an animated chain from the
  source through each stage (boiler, turbine, generator…) with the losses
  peeling off. Graphs: a Sankey diagram to scale, and bar charts comparing
  life-cycle CO₂, reliability (capacity factor), rough cost and land use, with a
  table of all of them.
- **🇬🇧 Run Britain.** Set the capacity of nuclear, wind, solar, hydro,
  biomass, gas, coal, interconnectors, pumped storage and batteries; the
  season, a day or a week, a weather pattern (or a calm, cold spell) and the
  demand (up to 170% for a future with heat pumps and electric cars). Plays
  hour by hour: the supply stack against the demand, storage gauges, imports
  and exports, blackouts and switched-off wind. Score: CO₂ per kWh, low-carbon
  share, blackout hours, curtailment and an illustrative cost. Graphs: supply
  and demand (stacked), storage, CO₂ per kWh, wind and sun.
- **🔌 National Grid.** Power sent, transmission voltage (25, 66, 132, 275,
  400 kV), line length and cable resistance: current, I²R loss, step-up turns
  ratio, delivered power. Graphs: loss against voltage (log–log, gradient −2)
  and a Sankey of where the power goes. The **classroom model power line**: a
  12 V lamp at the end of long resistance wires, with and without 1 : 10 or
  1 : 20 transformers. Links to Magnetism and Induction for how a transformer
  works (not rebuilt here).
- **🌬️ Wind turbine.** Wind speed, blade length, the site's mean wind and (A
  level) air density: the power in the wind, the power curve (cut-in, rated,
  cut-out), a year of winds at the site and its capacity factor, and log P
  against log v. **Model turbine practical**: fan setting, anemometer,
  voltmeter and ammeter (P = VI) with realistic error, a results table with
  logs at A level, and a best-fit gradient with its standard error.
- **📈 GB data.** UK generation by fuel 2000–2024 as a ring for one year and a
  stacked graph over time, in % or TWh.

**12 presets:** How a power station works, Compare the resources, Run Britain:
a winter week, Run Britain: a calm, cold week, Why high voltage?, Classroom
model power line, Wind turbine: power ∝ v³, Britain's electricity since 2000
(Standard); Efficiency and the fuel bill, I²R losses with numbers, Deriving
½ρAv³: model turbine, Storage and a sunny summer (Advanced).

**Quality** (Low / Medium / High / Ultra) changes the number of moving dots,
air streaks and charges drawn; the model is the same at every setting.

## The physics and the data

| Part | Model |
|---|---|
| Stations | chain of stage efficiencies (coal 88% × 43% × 98% ≈ 37%; CCGT ≈ 53%; nuclear ≈ 36%; wind ≈ 42% of the wind's KE; solar cells 20%) |
| Run Britain | 1-hour steps; merit order: nuclear (90% available), wind, solar, hydro (35%) → storage (batteries 1.5 h, 88% round trip; pumped 9 h, 75%) → biomass (70%) → imports (25–60% of capacity, less when calm) → gas (95%) → coal → blackout; surplus → charge → export → curtail |
| Weather | wind fleet capacity factor: random walk with ~30 h memory, winter mean 40% (SD 22%), spring 30%, summer 22%; solar: Sun's height at 52.5° N × random daily cloud |
| Demand | GB-like daily shape: winter 24–42 GW, spring 19–33, summer 16–29; weekends −10%; ±1.5% noise |
| Grid | I = P/V; P_loss = I²R, R = 0.03 Ω/km × length (illustrative); transformers ideal |
| Classroom line | 12 V, lamp 6 Ω, ideal 1 : n transformers then 90% each |
| Turbine | P = Cp ½ρAv³, Cp = 0.45, cut-in 3, cut-out 25 m/s; rated power from blade length; Weibull k = 2 winds |
| Model turbine | r = 15 cm, Cp 0.20 × 60%, 10 Ω load; ±3% wind, ±6% power, meters 0.01 V and 1 mA |

**Data and sources (all approximate; check before quoting):**

- GB generation mix 2000–2024 (% of UK generation and TWh): DESNZ, *Digest of
  UK Energy Statistics* (DUKES) Chapter 5 and *Energy Trends* section 5,
  rounded and entered from memory of the published summaries. Coal's last
  plant, Ratcliffe-on-Soar, closed on 30 September 2024. 2025 is not included.
- Capacity (load) factors: DUKES Chapter 6 load factors for recent years,
  rounded (onshore wind ~26%, offshore ~39%, solar ~10.5%, nuclear 60–65%, hydro
  ~35%).
- Life-cycle CO₂: IPCC AR5 (2014) WG3 Annex III median values (coal 820, gas
  490, biomass 230, solar 48, geothermal 38, hydro 24, ocean 17, nuclear 12,
  offshore wind 12, onshore wind 11 g CO₂e/kWh).
- Operational CO₂ in Run Britain: approximately the factors of the NESO
  Carbon Intensity service (gas 394, coal 937, biomass 120 g/kWh); imports
  taken as 150 g/kWh.
- Costs: Contracts for Difference strike prices (Allocation Round 6, 2024, for
  onshore and offshore wind, solar and tidal stream; Hinkley Point C £92.50 in
  2012 prices) raised to roughly 2024 prices, and DESNZ *Electricity Generation
  Costs* (2023) for gas, coal, biomass and geothermal. The bases differ, so use
  them only for ranking.
- Land use: our own rough estimates (e.g. biomass from an energy crop yielding
  about 12 t/ha/yr, wind including the spacing between turbines).
- 2024 capacities used as the default mix (approximate, DUKES and NESO):
  nuclear 6 GW, wind 30 GW, solar 18 GW, gas 35 GW, biomass 4 GW,
  interconnectors 10 GW, pumped storage ~26 GWh, batteries ~8 GWh.
- Run Britain calibration: with the default mix a winter week averages about
  145 g/kWh, spring about 110 and summer about 100 (GB averaged about 125 g/kWh
  in 2024).

## Batch run

Opens over the centre and right panels. The settings table lists every
setting each outcome uses; tick one to sweep it. Results show mean, SD and
standard error against theory, and export to CSV.

| Experiment | What it shows |
|---|---|
| Why transmit at high voltage? | % lost ∝ 1/V²: log–log gradient −2 (100 → 400 kV) |
| Longer lines lose more | loss ∝ length (straight line through the origin) |
| Model turbine: is P ∝ v³? | log–log gradient 3.00 from scattered readings |
| How precise is one turbine reading? | 500 readings at 5 m/s: SD about 11% (a 3% error in v is cubed) |
| A real turbine's year | capacity factor varies a few % year to year; mean = theory |
| Windier sites | capacity factor rises steeply with mean wind, then levels |
| A winter week: how much does the weather matter? | 200 weeks: 40–240 g/kWh; mean ≠ steady-weather theory (non-linear) |
| More wind: diminishing returns | CO₂ falls then levels off; curtailment and calm spells |
| No gas: how much storage? (beyond the spec) | blackout energy falls slowly with battery size |

Re-run the teacher worksheet scripts in `tools/worksheets/` if the batch
experiments change.

## How the model works (and what it leaves out)

See the panel in the simulation. In short: the Run Britain operator follows
fixed rules and does not plan ahead; there are no limits on how fast plant can
change output, no grid bottlenecks, no inertia or frequency control and no
reserve margin. Transmission is treated as one pair of cables carrying the
whole current. The lamp's resistance is constant. Wind speed does not change
with height. Costs and land use are rough.
