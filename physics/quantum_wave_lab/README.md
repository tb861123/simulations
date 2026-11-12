# Quantum Wave Lab

The time-dependent Schrödinger equation solved live on a 256 × 144 grid. Fire a
single particle (a wave packet) at barriers, steps, slits and walls you draw
yourself, and watch tunnelling, diffraction and interference happen.

## How to run

Open `quantum-wave-lab.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Tunnelling**: a barrier taller than the particle's energy still lets part of the wave through. Height and thickness sliders.
- **Reflection above a barrier**, and resonances where almost everything gets through.
- **Double slit, one particle at a time**: each particle lands as one dot on the detector screen, placed at random by the Born rule. The fringes build up dot by dot.
- **Uncertainty principle** at a single slit: narrower slit, wider spread.
- **Measurement**: "Measure position now" collapses the wave to a point, after which it spreads rapidly.
- A harmonic "bowl" (a quantum orbit) and a hard-walled corral.
- Tools: launch a particle by dragging, draw walls, paint barriers, erase.
- Views: phase colours, probability, real part.

## Batch run

Tunnelling against thickness and against energy (compared with the textbook
plane-wave formula), double-slit fringe spacing against wavelength, and spread
against slit width. Scatter comes from counting individual random detections.

## The model

`dR/dt = HI`, `dI/dt = −HR`, with `H = −½∇² + V` (ħ = m = 1), stepped by a
leapfrog scheme. One particle, two dimensions, no spin. Assumptions and
simplifications are listed in the simulation under **The model**.

## Source

Built from `Enhanced/_build/src/quantum_wave_lab.js` with the shared kit: edit
that file and run `node build.js` inside `Enhanced/_build/`. There is no
`worksheets.html` yet.
