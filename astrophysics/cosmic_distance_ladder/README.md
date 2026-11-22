# The Cosmic Distance Ladder

A single, self-contained HTML file about how astronomers measure distances,
from the Moon to the edge of the observable universe. It needs no install
and no internet: **open `cosmic-distance-ladder.html` in Chrome or Edge**.

Built with the kit from `tools/kit/src/cosmic_distance_ladder.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`cosmic-distance-ladder.html` by hand.

- **Standard (GCSE):** radar (distance = speed × time ÷ 2), the light-year,
  parallax (nearer stars shift more), standard candles and the inverse-square
  law, red-shift and the expanding universe.
- **Advanced (A level):** the parsec and d = 1/p, absolute magnitude and
  m − M = 5 log₁₀(d/10 pc), Cepheids and Type Ia supernovae as standard
  candles, Hubble's law v = H₀d, z ≈ v/c, age ≈ 1/H₀; random and systematic
  uncertainties (zero-point error, uncorrected dust, stretch correction).

## The six tabs

Each rung really calibrates the next: change a setting low down and the
effect climbs to H₀ at the top.

1. **The ladder:** every method on one logarithmic distance scale (Moon to
   the edge of the universe), where the rungs overlap, and the chain of
   results (1 AU → Cepheid zero point → galaxy distances → supernova peak M →
   H₀) with the uncertainty building up rung by rung. Click a rung to open it.
2. **Radar:** Venus, Earth and Mars on their orbits. Send radar pulses and
   time the echo; d = ct/2. Kepler's laws give the distance in AU, so radar
   gives the AU in metres (the gradient of radar distance against Kepler
   distance). No echo when the planet is behind the Sun.
3. **Parallax:** the Earth's orbit and lines of sight, a magnified telescope
   view of the star shifting against background stars with the measurement
   uncertainty shown as a haze, real stars (Proxima Centauri to the Galactic
   centre), and Bessel's 1838 telescope, Hipparcos and Gaia.
4. **Cepheids:** seven galaxies (LMC to NGC 1015) with ground, Hubble or JWST.
   Pulsing Cepheids in the galaxy, a light curve, Leavitt's law calibrated by
   Milky Way Cepheids with parallaxes, and the galaxy's Cepheids shifted by the
   distance modulus. Only Cepheids brighter than the telescope's limit are
   found, and only periods well clear of the limit are used (Malmquist bias).
5. **Supernovae:** a Type Ia supernova rises and fades in its galaxy; its
   peak, the stretch correction (slow faders are brighter), and the
   calibration of peak M in galaxies whose Cepheids were measured.
6. **Hubble's law:** red-shifted spectra, the Hubble diagram of supernova
   distance against speed, H₀ from each supernova on its own (nearby ones
   scatter from their own motion), then Hubble's law as a ruler, d = cz/H₀.

## Investigate

Why a ladder? · Radar echo from Venus · The gradient is the AU · Measure
Proxima Centauri · How far can parallax reach? · Leavitt's law · Too faint to
see · (A level) Baade's mistake (1952) · Five billion Suns · (A level) Slow
fade, bright supernova · Measure H₀ · Why use far-away supernovae? · (A level)
Errors climb the ladder · (A level) The Hubble tension.

## Batch run

| Experiment | Result when tested |
|---|---|
| Radar: does averaging pulses help? | AU error 392 km (1 pulse, 1 ms timing) to 59 km (64 pulses), about ∝ 1/√N |
| Parallax: the error grows with distance | Gaia: 0.9% at 500 pc to 15.5% at 8 kpc, ∝ d |
| Calibrating Cepheids: how many do we need? | zero-point error 0.061 mag (5 stars) to 0.018 mag (80) |
| A systematic error climbs the ladder | zero point −0.3 → H₀ 61.6; +0.3 → 81.5 (theory 70 × 10^(error/5)) |
| Does the stretch correction help? | error in H₀ 3.9 without, 1.5 with |
| Why far-away supernovae? | error in H₀ 4.2 with supernovae to 20 Mpc, under 1.1 beyond 200 Mpc |
| How much does Gaia help? | error in H₀ 1.1 (0.025 mas) to 66 (1 mas) |
| H₀ from 300 complete ladders | 69.9, SD 1.7 (true 70) |

## The model

Circular planetary orbits, all lined up on day 0; a random timing error per
radar pulse. Parallax = 1000/d mas plus the instrument's random error, with
our radar AU as the baseline. Leavitt's law M = −2.43(log₁₀P − 1) − 4.05 with
0.15 mag scatter; 300–3000 pc Milky Way Cepheids fix its zero point. Type Ia
peak M = −19.3 − 2(s − 1) + 0.12 mag scatter. Up to 16 galaxies with both
Cepheids and a supernova (distances like the SH0ES team's); up to 200
supernovae spread evenly through space, v = H₀d + peculiar velocity. Weighted
fits throughout; H₀'s quoted uncertainty adds the lower rungs' calibration
errors. Leaves out dust corrections by colour, metallicity, infrared
photometry, other anchors (LMC eclipsing binaries, NGC 4258's maser) and
cosmic acceleration (low red-shift only). The full list is in the page's
"The model" tab.
