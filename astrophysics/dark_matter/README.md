# Dark Matter and Galaxy Rotation Curves

A single, self-contained HTML file (`dark-matter.html`) for GCSE / A-level physics teaching. It shows why galaxies' flat rotation curves are evidence for dark matter.

## How to run

Open `dark-matter.html` in Chrome or Edge. You do not need to install anything or be online.

## What it shows

- **Face-on view.** A spiral galaxy made of stars and gas clouds. Each one orbits at the speed the mass model gives. Under the picture you can choose how the stars move:
  - with the model's gravity;
  - with the gravity of the visible matter only, so the outer stars lag behind;
  - with the observed speeds but only visible gravity, so the stars fly off.
- **Edge-on view.** Doppler colours show stars coming towards us in blue and going away in red. A spectrograph slit runs along the long axis.
- **Slit spectrum.** The Hα line (656.3 nm), shifted by Δλ = λv/c at each position along the slit. This is how Vera Rubin measured rotation curves.
- **Rotation curve.** The observed points with error bars, plus the speed from each part of the model: bulge, star disc, gas, black hole and dark halo. It also shows the total, the visible matter alone, the Kepler expectation √(GM_visible/r) and an optional MOND curve.
- **Readouts.** Visible and dark mass inside the last data point, the dark ÷ visible ratio, χ², the mass from v²r/G, and the whole halo ÷ visible compared with the cosmic 5.3 (Planck). A chart shows the mass inside radius r.
- **Fit the halo for me.** Finds the best halo mass by least squares, and the halo radius too if ticked.

## Controls

- **Data set:** Milky Way, M31, M31 as Rubin & Ford 1970, NGC 3198, DDO 154, a mystery galaxy made by the computer, or the Solar System. The real-galaxy curves are approximate re-creations of published curves, for teaching.
- **Bulge (Hernquist):** mass and size.
- **Star disc and gas disc (exponential):** mass and scale length.
- **Central black hole:** mass.
- **Halo:** on/off, shape (NFW or pseudo-isothermal), mass out to r₂₀₀ and scale/core radius.
- **MOND:** a toggle, with a₀ = 1.2 × 10⁻¹⁰ m/s².
- **Mystery galaxy / batch data:** number of points, error, furthest point and seed.

## Presets

1. Solar System (Keplerian)
2. Milky Way
3. Andromeda
4. NGC 3198
5. Dwarf galaxy (DDO 154)
6. No dark matter (stars fly off)
7. Vera Rubin, 1970
8. Mystery galaxy (fit the hidden halo, then press Reveal)
9. MOND instead

## Model and equations

All the speeds add as squares: v² = Σ v_i².

- **Bulge:** M(<r) = M r²/(r + a)².
- **Exponential discs (Freeman 1970):** v² = 4πGΣ₀R_d y²[I₀K₀ − I₁K₁], with y = R/2R_d. The Bessel functions use Abramowitz & Stegun polynomial approximations.
- **NFW halo:** M(<r) ∝ ln(1 + x) − x/(1 + x).
- **Pseudo-isothermal halo:** M(<r) ∝ x − arctan x.
- **Halo mass:** the mass inside r₂₀₀ (200 × the critical density).
- **MOND ("simple" interpolating function):** g = g_N[½ + √(¼ + a₀/g_N)].
- **Goodness of fit:** χ² = Σ((v_obs − v_model)/σ)².
- **Animation:** circular orbits, or leapfrog integration in "fly off" mode.
- **Units:** kpc, km/s and M☉, with G = 4.30 × 10⁻⁶ kpc (km/s)²/M☉. 1× speed = 10 million years a second.

The model leaves out warps, non-circular motion, disc thickness and pressure support. The full list is in the app.

## Batch run

Each run makes noisy synthetic observations from the current model, which is the "truth", and fits the halo mass automatically. The theory comes from the Fisher matrix (how much the speeds change with the halo mass), plus χ² statistics.

| Experiment | Typical result |
|---|---|
| Which halo mass fits best? (χ² against trial ÷ true mass) | Minimum χ² ≈ 26 at a ratio of 1, for 25 points. All 13 steps agree with the theory N + misfit. |
| How well can we weigh the halo? (500 fits) | Mean 1.045 × 10¹² M☉ (true 1.047 × 10¹²). SD 3.9 × 10¹⁰ (theory 3.8 × 10¹⁰). |
| More data points | The SD of the fitted mass falls with gradient −0.41 ± 0.06 (theory −0.5; the small-N points are noisy). |
| Noisier measurements | Gradient 1.01 ± 0.04 (theory +1). |
| How far out must we look? | The SD falls about 4.5× from r_max = 5 to 60 kpc, following theory. |
| Is the best fit as good as it should be? | Mean χ²_min 23.8 ± 6.7 (theory 24 ± 6.9). |
| Dark-to-visible ratio vs the cosmic 5.3 | The Milky Way model gives about 15, well above the cosmic ratio. |

Results can be downloaded as CSV.
