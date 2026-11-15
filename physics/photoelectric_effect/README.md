# The Photoelectric Effect

Photons drawn as wave packets strike a metal; each one frees an electron if
its energy hf exceeds the work function. A vacuum photocell measures the
current and stopping potential; a gold-leaf electroscope repeats Hertz and
Hallwachs's discovery.

## How to run

Open `photoelectric-effect.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Wavelength 200–700 nm and brightness; seven metals (Cs, K, Na, Ca, Zn, Cu,
  Pt) with their work functions; an energy bar comparing hf with φ.
- Photocell with anode voltage and a voltage sweep: the I–V curve and
  stopping potential. Electroscope that discharges in ultraviolet but not
  in red light, or when positively charged.
- KE_max against frequency for every metal (Advanced: extended to −φ).
- Eight guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Millikan's V_s–f graph (gradient h/e), current against brightness,
stopping potential against brightness, threshold wavelengths, the time to
the first electron in dim light, and the spread of electron energies.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

The quantum efficiency is a fixed 25%; contact potentials are ignored. Hydrogen spectra are in the Atomic Spectra simulation. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/photoelectric_effect.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
