# Exoplanet Hunting

A single, self-contained HTML file (`exoplanet-hunting.html`) for GCSE / A-level physics teaching. Students find planets around other stars with the transit and radial-velocity methods, then work out each planet's size, mass, orbit, density and what it is made of.

## How to run

Open `exoplanet-hunting.html` in Chrome or Edge. You do not need to install anything or be online.

## What it shows

- **Three views of the system:**
  - **From above:** orbits, habitable zone, centre of mass and the star's wobble (enlarged).
  - **From the side:** the line of sight to Earth and the inclination.
  - **The star seen from Earth:** planets cross its disc, and its colour shows the Doppler shift (blue = towards us, red = away).
- **Observing.** Data build up over time (1× = 1 day a second):
  - **Brightness:** a light curve with realistic noise from a ground telescope (nights only, clouds), a TESS-like or a Kepler-like telescope. Star spots and flares are optional.
  - **Radial velocities:** taken on random nights.
- **Tools:**
  - a trial-period slider, with ÷2 / ×2;
  - **Search for transits:** a box least squares (BLS) periodogram;
  - **Find next planet:** hides the transits already found and searches again;
  - **RV periodogram.**

  The light curve is folded at the trial period and a trapezoid-shaped transit is fitted, giving the depth, radius, duration and SNR. Kepler's third law gives the orbit size. A sine-wave fit to the radial velocities gives K and the (minimum) mass. From these come the density, a verdict on what the planet is made of, its temperature and whether it is in the habitable zone. **Reveal true values** compares the results with the truth.

## Controls

- **Star:** Sun-like, red dwarf, TRAPPIST-1-like ultra-cool dwarf, or a bigger A star.
- **Star activity:** spots and flares.
- **Planets b, c, d:** each can be on or off, with a type (hot Jupiter, Neptune, super-Earth, Earth, custom), radius, mass and period.
- **Orbit:** shared inclination.
- **Telescope:** instrument, noise multiplier and observing time.
- **Radial velocities:** precision and number of measurements.
- **Seed:** for repeatable random data.

## Presets

1. Hot Jupiter (easy)
2. Earth round the Sun (very hard: Kepler-like, 4 years, searching 50+ day periods takes about 12 s)
3. Earth round a red dwarf (easier)
4. TRAPPIST-1-like (3 planets)
5. Multi-planet system
6. Grazing transit
7. Not edge-on (no transit, but RV works)
8. Noisy, ground-based
9. Spotty red dwarf
10. Too small for TESS?

## Model and equations

- **Orbits:** circular, all planets in one plane. Kepler's third law: a³ = M P² (AU, years, M☉).
- **Transit depth:** the exact circle-overlap area for a uniform disc, which gives (Rp/Rs)² for a full transit.
- **Duration:** T = (P/π) arcsin(√((1 + k)² − b²)/((a/Rs) sin i)), with impact parameter b = (a/Rs) cos i.
- **Transit chance** for a random orientation: (Rs + Rp)/a.
- **Wobble:** K = 28.4 m/s × (Mp sin i/M_J) × M★^(−2/3) × (P/1 yr)^(−1/3). The minimum mass is found from K.
- **Density:** 5.51 g/cm³ × M/R³ (Earth units).
- **Habitable zone:** √(L/1.1) to √(L/0.53) AU.
- **Search (BLS):** trial periods spaced by the expected duty cycle; SNR = √(Δχ²). A planet counts as detected if SNR > 7 at the right period.
- **Fit:** linear least squares for the depth with a trapezoid template, with timing, duration, ingress and period refined by grid searches. The period error is where χ² rises by 1.
- **Detrending:** a 2-day running median, or nightly medians for the ground telescope. Flares are clipped.
- **Theory:** SNR = depth/σ × √(points in transit).

**Not modelled:** limb darkening, eccentric orbits, transit timing variations, false positives from eclipsing binaries, and errors in the star's own radius and mass. The full list is in the app.

## Batch run

Each run simulates planet b alone, with new noise and a random transit time. It then runs the BLS search and the fit. A TESS 27-day run takes about 30 ms.

| Experiment | Typical result |
|---|---|
| How small a planet can TESS find? (Sun-like, P = 5 d) | Detection rises from 3% at 2.5 R⊕ to 43% at 3 R⊕ (theory 50%) and 97% at 3.5 R⊕. All 9 steps are within 2 SE of Φ(SNR − 7). |
| Does SNR = depth/σ × √n hold? | Matches theory above about 3 R⊕ (e.g. 19.3 vs 19.4 at 5 R⊕). Below that, the search finds a noise floor of SNR ≈ 4.5 (false alarms). |
| Detection rate against noise | 90% at 1.4× noise (theory 91%), 25% at 2× (theory 14%), 0% at 2.8×. |
| Are the radius error bars honest? (300 runs, Neptune) | Mean 3.904 R⊕ (true 3.9). SD 0.20 (theory 0.17). 63% of runs are within their own 1σ (honest: 68%). |
| How precise is the period? | No bias, but SD 0.0038 d vs theory 0.0023 d, and only 52% of runs are within 1σ. A few runs lock onto a slightly wrong period with only about 5 transits, so the quoted error is too optimistic. The note in the app says so. |
| How likely is a transit? (random orientations) | Follows (Rs + Rp)/a, from 0.25 at 1 d (theory 0.24) to about 0.005 at 400 d. |
| More transits help (observing time) | Detection 0% at 15 d, 45% at 60 d (theory 43%), 95% at 120 d. |
| Minimum mass vs inclination | Matches M sin i at every step (e.g. 55 vs 55 M⊕ at 10°). |

Results can be downloaded as CSV.

**Known limitation:** at very high SNR the trapezoid template sits a little shallow compared with the true round-cornered transit, so hot-Jupiter radii come out about 1–2% small (e.g. 11.0 vs 11.2 R⊕).
