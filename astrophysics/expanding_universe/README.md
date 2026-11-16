# The Expanding Universe

A single, self-contained HTML file about red-shift, Hubble's law and the age
of the universe, measured from a survey of galaxies. It needs no install and
no internet: **open `expanding-universe.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/expanding_universe.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `expanding-universe.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** red-shift, more distant galaxies move away faster,
  evidence for the Big Bang and an expanding universe.
- **Advanced (A level):** Δλ/λ = v/c, Hubble's law v = H₀d, H₀ from data,
  age ≈ 1/H₀, standard candles; the accelerating expansion is beyond the spec.

## What it shows

- Expanding space: a grid of galaxies that all move apart. Click any galaxy
  to stand on it: everything still moves away from you (no centre).
- Spectra: lab and red-shifted absorption lines (Ca, Hβ, Mg, Na, Hα); every
  line shifts by the same factor 1 + z; the relativistic formula at A level.
- A survey: galaxies observed one by one, distance from a standard candle
  (Cepheids nearby, Type Ia supernovae far away), speed from the red-shift,
  added to a Hubble diagram with a weighted fit through the origin.
- Settings: true H₀, simple Hubble law / ΛCDM (accelerating) / matter only,
  number of galaxies, furthest galaxy, brightness scatter, calibration error,
  galaxies' own (peculiar) motions.
- A second chart of real galaxy clusters with the Planck and SH0ES values.

## Investigate

Everything moves away · Red-shift · Measure Hubble's law · Age of the
universe · Hubble in 1929 · Wrong yardstick · (A level) The accelerating
universe · Redshift calculator.

## Batch run

| Experiment | Result when tested |
|---|---|
| Do more galaxies shrink the random error? | error in H₀ 1.5 (10 galaxies) to 0.25 (160), about ∝ 1/√N |
| Can more galaxies fix a calibration error? | 20% too far: H₀ → 58.3 whatever the number of galaxies |
| Peculiar velocities nearby | error 6 km/s per Mpc within 10 Mpc, under 1 beyond 100 Mpc |
| H₀ from 500 surveys | 70.1 ± 0.8 (true 70) |
| Age of the universe | 1/H₀ = 14.0 ± 0.16 billion years |

## The model

Galaxies are spread evenly through space. Red-shift from the chosen expansion
(z = H₀d/c, or the ΛCDM / matter-only comoving distance), times each galaxy's
own motion, plus a 30 km/s measurement error. Distances scatter by σ magnitudes
and can carry a calibration error. Weighted least squares through the origin;
Hubble time = 977.8/H₀ billion years. Leaves out dust, K-corrections,
Malmquist bias and the details of the distance ladder.
