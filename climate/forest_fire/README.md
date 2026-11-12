# Wildfire

Fire spreading over hills with wind, drought, embers and smoke, and a sharp tipping point hidden in the tree density. Firebreaks, water drops and a save-the-village challenge.

## How to run

Open `forest-fire.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Save the village with 250 cells of firebreak, then try it in a gale.

## The model

Cellular fire spread on a 200 × 112 grid; pure-percolation mode. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/forest_fire.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
