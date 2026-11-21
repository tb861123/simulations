# Rate Equations and Kinetics

A single, self-contained HTML file: follow a reaction as it goes, read rates from tangents and half-lives, find orders by the initial-rates method with an iodine clock, and find the activation energy from an Arrhenius plot. It needs no install and no
internet: **open `rate-equations.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/rate_equations.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `rate-equations.html` by hand.

- **Standard:** Pearson Edexcel International GCSE Chemistry (4CH1) 3(b): following a reaction, rate from the gradient, the effect of concentration and temperature, clock experiments.
- **Advanced (A level):** Pearson Edexcel A level Chemistry (9CH0) Topics 9 and 16: rate equations, orders, k and its units, half-lives, initial rates and continuous monitoring, the rate-determining step (SN1, SN2, iodination of propanone, CP13), the Arrhenius equation (CP14).

## What it shows

Five reactions, each following its exact rate equation: propanone + iodine (zero order in I₂, colorimeter), the SN1 and SN2 hydrolysis of bromoalkanes (first and second order), the iodine clock (H₂O₂ + I⁻ with thiosulfate) and a reaction of your own order. A beaker whose colour fades, 200 molecules disappearing in step with the solution, the rate equation and mechanism with the rate-determining step highlighted, a concentration–time graph with a movable tangent and successive half-lives, and a rate–concentration graph whose shape shows the order. **Initial rates** records clock times into a table; **Arrhenius** plots ln(1/t) against 1/T and works out Ea. Measurements carry colorimeter noise, a wandering water bath and a human stopwatch.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| First order: does t½ depend on [A]₀? | 86–91 s at every starting concentration (ln 2 ÷ k = 87 s) |
| Second order: t½ against [A]₀ | 1210 s at 0.02 to 247 s at 0.1 mol dm⁻³ (1/k[A]₀: 1250 to 250) |
| Zero order in iodine | 14.0 × 10⁻⁶ mol dm⁻³ s⁻¹ at every [I₂]₀ (14.0) |
| Iodine clock: 1/t against [I⁻] | straight line through the origin, 0.0091 to 0.046 s⁻¹ |
| CP14: Arrhenius plot | gradient −6750 K: Ea = 56 kJ/mol (56) |
| How good is one class's Ea? | mean 56.1, SD 1.8 kJ/mol (56) |
| Reaction time and the error in Ea | mean error 0.4 kJ/mol with no stopwatch error, 5.6 kJ/mol at 1.6 s |
