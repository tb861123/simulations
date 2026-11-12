# Earthquake Engineering

A shake table for three buildings: resonance, cross-bracing, base isolation and tuned mass dampers, all from F = ma. Steady shaking, sweeps, random earthquakes, or drag the ground.

## How to run

Open `earthquake-buildings.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Drag the ground yourself and bring down the tower without touching the bungalow.

## The model

Multi-storey shear buildings integrated at 500 steps a second. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/earthquake_buildings.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
