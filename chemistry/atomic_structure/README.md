# Atomic Structure and Isotopes

A single, self-contained HTML file for iGCSE chemistry with an A level option.
It needs no install and no internet: **open `atomic-structure.html` in Chrome
or Edge**.

★ Enhanced: built from `tools/kit/src/atomic_structure.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `atomic-structure.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Chemistry (4CH1)
  1(c) atomic structure (particles, atomic and mass number, isotopes, Ar,
  electronic configurations, ions) and 1(d) the Periodic Table.
- **Advanced (A level):** 9CH0 Topic 1: s, p, d configurations (Cr and Cu
  exceptions, 4s emptied first in ions), successive and first ionisation
  energies, Ar from mass spectra.

## What you can do

- **Build the atom:** choose hydrogen to calcium, copper or bromine; − / + for
  protons (new element), neutrons (new isotope) and electrons (an ion, up to 3
  either way); buttons for each natural isotope, the neutral atom and the usual
  ion. The picture shows the nucleus and shells; the card shows the isotope
  symbol, charge, configuration (s, p, d at A level) and whether the nucleus
  is stable, radioactive (with half-life) or does not exist.
- **Isotope sample:** atoms are "weighed" one at a time (natural abundances or
  your own two-isotope mix, exact masses or mass numbers). Charts: the mass
  spectrum against the data book, and the running average against Ar.
- **⚡ Ionisation energies (A level):** successive ionisation energies on a log
  scale (estimated with Slater's rules) and first ionisation energies H to Kr
  (data).

## Investigate

Build sodium · Make an ion · Isotopes of chlorine · Carbon-14 · Full shells ·
Copper's Ar · (A level) s, p and d · Transition metal ions · Successive
ionisation energies · First ionisation energy across a period.

## Batch run

| Experiment | Result when tested |
|---|---|
| Is chlorine's Ar really 35.5? | 500 samples of 100 atoms: mean 35.45, SD 0.087 |
| Bigger samples, better answers? | the error falls as 1 ÷ √N |
| How does the mix set Ar? | a straight line from 34.97 to 36.97 |
| Why is copper 63.5, not 63.6? | exact masses 63.55, mass numbers 63.62 |
| Magnesium: three isotopes | mean 24.305 |
| How common is carbon-13? | 1.07% ± 0.32% in samples of 1000 |

## The model and its simplifications

Isotope masses and abundances are IUPAC / NIST values; Ar = Σ(mass ×
abundance) ÷ 100; samples are drawn at random. Orbitals fill 1s 2s 2p 3s 3p 4s
3d 4p with the Cr and Cu exceptions. Successive ionisation energies are Slater
estimates (too large, but the jumps are in the right places). Shell (Bohr)
picture, not to scale; abundances fixed. The earlier version's time-of-flight
spectrometer is not included.
