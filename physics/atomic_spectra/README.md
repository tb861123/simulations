# Atomic Spectra and Energy Levels

A single, self-contained HTML file for WJEC Eduqas A level Physics, Component 3,
Topic 4 (Quantum physics) and Component 2, Topic 6 (Photons). It needs no install
and no internet: **open `atomic-spectra.html` in Chrome or Edge**.

It replaces the old WJEC Streamlit page *Atomic Spectra & Bohr Model*
(`physics_sims/pages/22_Atomic_Spectra.py`) and also takes over the "Energy Level
Transitions" tab of the old *Photoelectric Effect* page (n<sub>i</sub>/n<sub>f</sub>
sliders, emission/absorption of one chosen transition, all Balmer lines).

It is about energy levels, emission and absorption lines and photon energies.
It does not repeat what other simulations cover, and links to them instead:
black-body spectra and Wien's law are in `../../astrophysics/stellar_life_cycle/`,
and red-shift of spectral lines is in `../../astrophysics/expanding_universe/`.

## What you see

- **Bohr atom** (not to scale): the electron orbits on its level. In "discharge
  tube" mode collisions lift it to a higher level and it drops back by random
  jumps, sending out one photon per jump (coloured by wavelength; UV and IR drawn
  pale and labelled). In absorption mode white-light photons stream through; only
  those with exactly the right energy are absorbed, and the excited atom re-emits
  in a random direction. "Repeat the chosen transition" plays your n<sub>i</sub> →
  n<sub>f</sub> jump; **⚡ Do my transition** makes it happen now.
- **Energy level diagram** (E<sub>n</sub> = −13.6/n² eV, spacing drawn ∝ 1/n so the
  upper levels can be seen) with every line of the chosen series as an arrow, the
  latest jump highlighted, and your chosen transition with ΔE and λ.
  For helium, sodium and neon it shows the photon energy ΔE = hc/λ of each line.
- **Spectrum**: a log-scale strip from 90 to 2000 nm (UV, visible, IR) and the
  visible part as seen in a spectroscope, with H-α … H-δ labelled; bright lines on
  black (emission) or dark lines on a continuous spectrum (absorption).

## Controls

- **Level:** Standard or Advanced. **Element:** hydrogen, helium, sodium, neon.
  **Spectrum mode:** emission or absorption. **Series** (hydrogen): All, Lyman,
  Balmer, Paschen. **n<sub>max</sub>** 2–8. **Initial / final level** 1–8 (they
  must differ; the mode follows the direction of the jump).
- Advanced: Balmer series table; Balmer swatches (n = 3–6 → 2); extra tiles
  (1/λ from Rydberg, orbit radius n²a₀); Rydberg formula and extra notes.
- Animation: random jumps or repeat the chosen transition; Play/Pause, Reset,
  speed ½×–4×; **quality** Low/Medium/High/Ultra (number of photons and glow only).
- Presets (12): hydrogen's visible lines; H-α; Lyman (UV); Paschen (IR); all
  hydrogen lines; absorption dark lines; ground-state absorption; biggest jump
  (8 → 1); helium; sodium yellow doublet; neon sign; sodium absorption.

Readouts: E initial/final, ΔE (eV and J), λ, frequency, series and region, the
ionisation energy, physics notes (Standard and Advanced), and the old page's 3 exam
questions with live mark schemes for the chosen transition.

## The model

    E_n = −13.6/n² eV      ΔE = E_upper − E_lower = hf = hc/λ      λ(nm) ≈ 1240/ΔE(eV)
    1/λ = R(1/n_lower² − 1/n_upper²),   R = 13.6 eV / hc ≈ 1.097 × 10⁷ m⁻¹

hc ≈ 1240 eV nm as in the old page (H-α comes out at 656.5 nm; 656.3 nm measured in
air). Helium, sodium and neon use measured wavelengths. Left out: fine structure,
line widths, atom recoil, reduced mass, real transition probabilities (random jumps
are equally likely in the model).

## Batch run

A diffraction-grating spectrometer (d sin θ = λ, first order) with a random error
in each angle reading. Repeat or sweep, histogram or mean ± SD with theory, summary
statistics and CSV download. One-click experiments:

1. **Do the Balmer lines fit Rydberg's formula?** n = 3–9: means on the formula,
   converging to 365 nm.
2. **Measure the Rydberg constant** (200 students, H-α–H-δ): mean 1.097 × 10⁷ m⁻¹,
   SD about 0.8%.
3. **The Lyman series converges to 13.6 eV** (n = 2–20).
4. **Ionisation energy from the Lyman lines** (intercept at 1/n² = 0): mean 13.6 eV.
5. **Finer grating, better wavelength?** The spread of H-α falls from about 10 nm
   (100 lines/mm) to 0.5 nm (1200 lines/mm).
6. **How many photons can we see?** Random cascades from n = 6: about 22% visible
   (exact average 21.9%).
