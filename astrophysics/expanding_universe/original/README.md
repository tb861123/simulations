# The Expanding Universe and Hubble's Law

A single, self-contained HTML file (`expanding-universe.html`) for GCSE / A-level physics teaching.

## How to run

Open `expanding-universe.html` in Chrome or Edge. You do not need to install anything or be online.

## What it shows

- **The picture.** You can see the expansion as galaxies on a stretching grid, as raisins in rising bread, or as dots on a balloon being blown up. Click a galaxy to *stand on it*: every other galaxy still moves away, faster the further away it is, so there is no centre. Choose *see its light* to watch a light wave stretch on its way to you.
- **Spectra.** A lab spectrum is shown above the galaxy's spectrum. The galaxy's calcium, hydrogen, magnesium and sodium absorption lines are all shifted by the same factor, 1 + z.
- **The survey.** Galaxies are measured one at a time:
  - **distance** comes from a standard candle: a Cepheid (period–luminosity law, up to 40 Mpc) or a Type Ia supernova;
  - **velocity** comes from the redshift, v = cz.

  Each measured galaxy is added to the Hubble diagram, with error bars. A weighted line is fitted through the origin to give H0 ± its uncertainty and the Hubble time 1/H0. The "Latest measurement" box shows each step of the working.

- **Redshift of one spectral line** (right panel). Pick a galaxy (Andromeda, Virgo, Coma, quasar 3C 273, a galaxy at z = 1) or set the rest wavelength and the speed β = v/c (−0.1 to 0.95). It shows the observed wavelength (relativistic Doppler, λ_obs = λ√((1 + β)/(1 − β))), Δλ, z = Δλ/λ, the speed, the small-speed estimate v = zc (flagged when it fails), colour swatches, a rest-versus-observed line graph and a Hubble's-law distance (H0 = 70), with the working shown live.
- **Hubble's law with real cluster data**: ten galaxy clusters fitted with a line through the origin, compared with the Planck (67.4) and SH0ES (73.0) values (the Hubble tension).
- **More about redshift** (A level): light versus sound Doppler, Hubble's law from uniform expansion, the CMB at z ≈ 1100, Olbers' paradox and lookback.
- **📝 Exam practice: redshift**: three questions (z from a spectral line, v from Δλ/λ = v/c, distance from Hubble's law) whose numbers and mark schemes follow the calculator.

These four parts came from the redshift section of the old WJEC Physics Streamlit "Doppler Effect" page; the sound Doppler effect is now a mode of `physics/waves`.

## Controls

| Group | Controls |
|---|---|
| The real universe | True H0, and the expansion model: a simple Hubble law, ΛCDM (accelerating) or matter only (slowing) |
| Your survey | Number of galaxies, furthest galaxy, distance method |
| Errors | Random scatter in brightness (magnitudes); calibration (systematic) error in %; peculiar-velocity spread; fit only galaxies closer than … |
| Animation | Expansion speed in the picture; Observe / Measure all now / Reset; speed buttons (1× = 2 galaxies a second) |

## Presets

1. Hubble 1929
2. Modern Cepheids
3. Supernovae out far (accelerating universe)
4. Matter-only universe
5. Perfect data
6. Peculiar velocities dominate nearby
7. Tiny sample
8. Wrong yardstick (distances 20% too big)

## Model and equations

- **Hubble's law:** v = H0 d.
- **Redshift:** z = Δλ/λ, and v = cz. This is only approximate above z ≈ 0.1.
- **Distance modulus:** m − M = 5 log10(d / 10 pc).
- **Cepheids:** M = −2.43 (log P − 1) − 4.05.
- **Type Ia supernovae:** M = −19.3.
- **Random scatter:** each galaxy's brightness is off by a random amount σ_m, which gives a distance error of about 46% × σ_m.
- **Calibration error:** every distance is multiplied by (1 + error).
- **Peculiar velocities:** a normal random speed is added: (1 + z_obs) = (1 + z_cos)(1 + v_pec/c). The redshift measurement also has a 30 km/s error.
- **Far galaxies (ΛCDM / matter only):** the comoving distance is D = (c/H0) ∫ dz/E(z), with E(z) = √(Ωm(1+z)³ + ΩΛ). Standard candles measure the luminosity distance d_L = (1 + z) D.
- **Fit:** weighted least squares through the origin. Each galaxy's weight is 1/(30² + 250² + H²σ_d²). The quoted error is scaled by √(χ²/ν).
- **Age:** the Hubble time is 977.8/H0 billion years. With ΛCDM the age is 0.964/H0; with matter only it is (2/3)/H0.

**Assumptions:** galaxies are spread evenly through space. The model leaves out dust, K-corrections, Malmquist bias and the "Hubble tension". The full list is inside the app under *How the model works*.

## Batch run

Press **📊 Batch run**. Each run is a whole new survey followed by a fit, so it is fast (500 runs take well under a second).

- **Modes:** Repeat (histogram) and Sweep (mean ± SD or standard error).
- **Outcomes:** fitted H0, Hubble time, quoted uncertainty, pull, and whether the true H0 is within 1σ.
- **Batch settings table.** The batch panel lists every starting setting a survey uses: the universe model, standard candle and random seed; number of galaxies, calibration error, brightness scatter, peculiar velocity, furthest galaxy, true H0 and the fit limit (0 = fit every galaxy); and three numbers that used to be fixed: the closest galaxy (1 Mpc), the redshift measuring error (30 km/s) and the peculiar-velocity allowance the fitter assumes (250 km/s). Their defaults are the old values, so results are unchanged. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in (from fixed defaults, seed 1), and **↺ Use my left-panel settings** copies the left panel into it. (The redshift calculator in the right panel has no batch experiments.)

The theory comes from 400 noise-free "expected" galaxies. It gives the expected fit, including the calibration bias and a small regression-dilution bias. The spread uses the standard formula for the error of a weighted fit (each galaxy's weight × its true scatter).

| Experiment | What it shows (typical result) |
|---|---|
| Do more galaxies shrink the random error? | The SD of H0 falls as 1/√N. Log–log gradient −0.49 ± 0.02 (theory −0.5). |
| Can more galaxies fix a calibration error? | With distances 20% too small, the fit converges on about 87, not 70. The error bars shrink around the wrong value. |
| How big is the bias from a calibration error? | Fitted H0 = H0/(1 + error), matching theory at every step. |
| How old is the universe? | Hubble time 14.07 ± 0.40 Gyr (theory 14.07 ± 0.41). |
| What age did Hubble's 1929 data give? | About 2.0 Gyr, younger than the Earth. |
| Are the quoted error bars honest? | 65% of runs fall within 1σ (theory 68%). |
| Peculiar velocities: does looking further help? | The SD of H0 falls roughly as 1/d_max (gradient about −1). |

Results can be downloaded as CSV.
