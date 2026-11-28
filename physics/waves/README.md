# Ripple Tank

A true 2-D wave-equation solver: interference, Young's slits, diffraction, refraction, lenses, mirrors and sonic booms all emerge from one rule. Draw your own walls, glass and sources, or add blocks of material (rectangles or prisms) that you can move, resize and turn, each with its own refractive index from 1 to 3.

## How to run

Open `waves.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **Standard / Advanced**: GCSE (iGCSE 4PH1 waves) or A level (Eduqas: path difference and phase, Young's slits, the diffraction grating, stationary waves, Snell's law and total internal reflection). The A level group adds a second dipper in antiphase, the path difference under the pointer, and the intensity along the centre line.
- **Revise**: key ideas with spec tags and exam practice at each level.
- **Partial reflections**: a switch in *Barrier and glass*. Off makes the glass "impedance-matched", so waves slow down and bend exactly as before but almost nothing bounces back off it (for n = 1.5 the reflected energy falls from about 4% to under 0.1%).
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Draw your own lens or mirror on the water and find its focus.

## The model

2-D wave equation by finite differences on a 320 × 180 grid. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/waves.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and its printable worksheets are in `worksheets.html` (regenerate with `node worksheets.js waves` in `tools/kit/`).
