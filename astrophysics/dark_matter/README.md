# Dark Matter and Rotation Curves

A single, self-contained HTML file that shows why flat rotation curves mean
galaxies are wrapped in dark matter. It needs no install and no internet:
**open `dark-matter.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/dark_matter.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `dark-matter.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** gravity and orbits (further out, slower), the Doppler
  effect and red-shift, galaxies; dark matter as evidence.
- **Advanced (A level):** v = √(GM/r), M = v²r/G, Δλ/λ = v/c, χ² fitting;
  NFW haloes and MOND are beyond the spec.

## What it shows

- A face-on galaxy whose stars move with the model's gravity, with the
  visible mass only, or at the observed speeds with visible gravity only (so
  the outer stars fly off).
- An edge-on view in Doppler colours and a slit spectrum of the Hα line, the
  way Vera Rubin measured rotation curves.
- Galaxies: Milky Way, Andromeda (M31), NGC 3198, dwarf DDO 154 and a mystery
  galaxy whose halo you fit, then reveal.
- Mass model: bulge (Hernquist), exponential disc (Freeman), gas, central
  black hole and a dark halo (NFW or isothermal); or MOND instead of a halo.
- Charts: the rotation curve (observed points with error bars, total, visible
  only, Kepler fall-off) and the mass inside radius r. A one-click halo fit
  with χ².

## Investigate

What should happen? · Stars would fly off · Add the halo · Vera Rubin's
method · A dwarf galaxy · Weigh the mystery halo · (A level) Mass from the
speed · MOND instead.

## Batch run

| Experiment | Result when tested |
|---|---|
| Which halo mass fits best? | χ² valley, lowest (about 26) at 1.0–1.05 × the true mass |
| How well can we weigh the halo? | 200 fits: 1.20 ± 0.035 × 10¹² M☉ (true 1.2) |
| More data points | error 5.9% (5 points) to 1.4% (80 points), about ∝ 1/√N |
| Visible mass against total mass | Milky Way 23%, M31 28%, NGC 3198 20%, DDO 154 14% visible |

## The model

Circular speeds add in quadrature: v² = v²bulge + v²disc + v²gas + v²BH +
v²halo. The disc uses the Freeman formula with Bessel functions; the halo is
NFW (with r₂₀₀ from the halo mass) or a cored isothermal sphere. MOND uses the
simple interpolating function with a₀ = 1.2 × 10⁻¹⁰ m/s². "Observed" points
are the model plus Gaussian errors. Leaves out non-circular motions,
inclination corrections, the real shape of each galaxy's light, and
adiabatic contraction.
