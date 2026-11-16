# Ice–Albedo Tipping Points

A single, self-contained HTML file about the ice–albedo feedback, multiple
stable climates, hysteresis and tipping points. It needs no install and no
internet: **open `ice-albedo.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/ice_albedo.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `ice-albedo.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** energy balance, albedo, positive feedback, tipping
  points.
- **Advanced (A level):** the global energy budget, feedbacks and tipping
  points; the Budyko–Sellers model and hysteresis are beyond the spec.

## What it shows

- A rotating globe whose ice caps grow and shrink (ice where the yearly mean
  is below −10 °C).
- A "ball in a valley" landscape: valleys are stable climates (snowball, ice
  caps, ice-free), hilltops are tipping points.
- Charts: the equilibrium curve (ice-edge latitude against Sun %: stable solid,
  unstable dashed, the snowball and ice-free branches) with the planet's path,
  and temperature against latitude.
- Controls: Sun %, CO₂ (log scale), heat transport, ice albedo, surface
  (ocean, Earth-like, land), weather noise; slow changes (Sun dims or
  brightens, a down-then-up loop, CO₂ builds up or falls); warm or snowball
  restarts.

## Investigate

Today's ice caps · The ice–albedo feedback · Snowball Earth · Can you get back?
· Hysteresis loop · CO₂ to escape · (A level) Small ice cap instability ·
Heat transport.

## Batch run

| Experiment | Result when tested |
|---|---|
| Hysteresis: starting warm | ice caps down to 94% Sun, snowball at 93% and below |
| Hysteresis: starting from a snowball | frozen up to 120%, ice-free at 130% |
| CO₂ and global temperature | 8.8 °C at 280 ppm, 11.5 °C at 420 ppm, 15.4 °C at 560 ppm |
| Heat transport and the equator–pole difference | 77 °C (D = 0.2) to 21 °C (D = 1) |
| Near the edge: weather noise (93.6% Sun) | no tipping below 10 W/m²; nearly always above 15 W/m² |
| Ice albedo and the tipping point | snowball threshold 82% (albedo 0.45) to 100% (0.75) |

## The model

A Budyko–Sellers energy balance model with 90 bands of 2°: C dT/dt =
Q s(φ)(1 − α(T)) − (A + BT) + D∇²T. Q = 1361 × Sun % ÷ 4; albedo 0.30, or the
ice albedo below −10 °C; A = 207.5 − 5.35 ln(CO₂/420), B = 2.09; D = 0.45;
implicit time steps. Today's settings give an ice edge at 64° and a global
mean of 11.5 °C; a snowball below 93.3% Sun, melting only above about 131%.
No seasons, clouds or separate land and ocean.
