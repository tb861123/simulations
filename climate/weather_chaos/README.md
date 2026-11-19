# Weather Chaos and the Butterfly Effect

A single, self-contained HTML file: two forecasts a butterfly-flap apart drift into completely different weather: chaos, forecast limits and ensembles. It needs no install and no
internet: **open `weather-chaos.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/weather_chaos.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `weather-chaos.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** weather forecasting and its limits, how small differences grow (the butterfly effect), why forecasts are given as probabilities, models and their limitations.
- **Advanced (A level):** non-linear systems, exponential growth of errors (Lyapunov exponents), ensembles and probabilistic forecasts.

## What it shows

Lorenz 63 (the butterfly attractor: two forecasts, an ensemble, heating ρ) and Lorenz 96 (a ring of weather stations with forcing F, shown as a time–station Hovmöller picture). Starting difference, failure threshold and ensemble size. Charts: separation or RMS error on a log scale against time, and x against time or every station now.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Forecast horizon and starting error (Lorenz 63) | 3.5 → 21 time units as δ shrinks from 10⁻¹ to 10⁻⁸ (theory 4.3 → 22: +2.5 per factor of 10) |
| How long does one forecast last? | mean 16.4, SD 2.0 (theory 17) |
| When does chaos switch on? | Lyapunov exponent below 0 for ρ ≤ 20, about 0.9 above 24.7 |
| Weather ring: forcing and growth rate | 0.21 at F = 4 to 3.3 at F = 16 |
| Weather ring: forecast length | 12 → 48 steps as the starting error shrinks from 10⁻¹ to 10⁻⁶ |
