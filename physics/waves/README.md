# Ripple Tank

A true 2-D wave-equation solver: interference, Young's slits, diffraction, refraction, lenses, mirrors and sonic booms all emerge from one rule. Draw your own walls, glass and sources.

## How to run

Open `waves.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Draw your own lens or mirror on the water and find its focus.

## The model

2-D wave equation by finite differences on a 320 × 180 grid. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/waves.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
