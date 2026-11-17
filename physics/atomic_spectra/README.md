# Atomic Spectra and Energy Levels

A single, self-contained HTML file about energy levels, emission and absorption
lines, photon energies, the diffraction grating and lasers. It needs no install
and no internet: **open `atomic-spectra.html` in Chrome or Edge**. Printable
worksheets (one per investigation and per batch experiment, with teacher notes)
are in `worksheets.html`.

★ Enhanced: built from `tools/kit/src/atomic_spectra.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `atomic-spectra.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4PH1 3(c), the electromagnetic spectrum
  (energy levels are not in 4PH1, and the level hint says so).
- **Advanced (A level):** WJEC Eduqas photons, energy levels, line spectra,
  ionisation and lasers; the Rydberg formula is tagged beyond the spec.

## Three views

Atom and spectrum (a Bohr atom in a discharge tube or white light; hydrogen,
helium, sodium, neon; series; your own transition with ΔE and λ; an energy-level
diagram; log and spectroscope spectra) · Grating (d sin θ = λ with a reading
error) · Laser (3-level and 4-level populations and inversion).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Do the Balmer lines fit Rydberg's formula? | 656, 486, 434 … 384 nm (the same) |
| Measure the Rydberg constant (200 students) | 1.10 ± 0.003 × 10⁷ m⁻¹ (1.097) |
| The Lyman series converges to 13.6 eV | 10.2 → 13.6 eV |
| How fine a grating? | error 12.9 nm (100 lines/mm) to 0.9 nm (1200) |
| How many photons can we see? | 21.6% visible (exact 21.9%) |
