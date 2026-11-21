# Energy Resources and Electricity

A single, self-contained HTML file: how each resource makes electricity, running Britain's grid hour by hour, why we transmit at high voltage, wind power ∝ v³, and Britain's electricity since 2000. It needs no install and no
internet: **open `energy-resources.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/energy_resources.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `energy-resources.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1) Section 4: energy resources and electricity generation, efficiency and Sankey diagrams, power; Section 2: P = IV; Section 6: transformers and transmission at high voltage. Wind power ∝ v³ is tagged beyond the spec.
- **Advanced (A level):** WJEC Eduqas core ideas only: power and efficiency, deriving ½ρAv³, P = IV = I²R, log–log graphs and the uncertainty of a gradient. Capacity factor, storage and the Betz limit belong to option D (not taught) and are tagged beyond the spec.

## What it shows

Five views. **Power stations:** eleven resources, each as a chain of stages (boiler, turbine, generator…) with a Sankey diagram to scale and bar charts of life-cycle CO₂ and capacity factor; readings for cost and land. **Run Britain:** set the capacity of nuclear, wind, solar, hydro, biomass, gas, coal, interconnectors, pumped storage and batteries, the season, a day or a week, a calm spell and the demand; it plays hour by hour (merit order) with the supply stack against demand, storage gauges, blackouts and curtailed wind; graphs of the stacked supply and CO₂ per kWh (storage at A level). **National Grid:** power, voltage (25–400 kV) and line length, with the current, I²R loss and a log–log graph of gradient −2; the classroom model power line with and without 1 : 20 transformers. **Wind turbine:** blade length, wind speed and a site's mean wind, the power curve against the site's winds and its capacity factor; the model-turbine practical with readings (log P against log v with the gradient and its standard error at A level). **GB since 2000:** the mix for any year and stacked over time, in % or TWh.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Why transmit at high voltage? | log–log gradient −2.00 |
| Longer lines lose more | 0.019% per km, r = 1.000 |
| Model turbine: is P ∝ v³? | log–log gradient 2.99 |
| How precise is one turbine reading? | mean 0.653 W (true 0.649), SD 11% |
| A real turbine's year | capacity factor 0.392, SD 0.018 (theory 0.388) |
| Windier sites | 0.087 at 4 m/s to 0.556 at 10 m/s (theory 0.084 to 0.564) |
| A winter week: how much does the weather matter? | mean 119 g/kWh, SD 37 (steady average weather 105) |
| More wind: diminishing returns | 250 g/kWh with no wind, 106 at 30 GW, 36 at 100 GW |
| No gas: how much storage? (beyond the spec) | unserved energy falls only slowly: about 590 GWh a week with no batteries, 330 with 400 GWh |
