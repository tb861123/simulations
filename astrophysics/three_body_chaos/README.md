# Three-Body Chaos

Newtonian gravity with a ghost "twin universe" that starts a millionth of a unit away, so you can watch prediction fail. Figure-eight, Lagrange, Trojans, planets of two and three suns.

## How to run

Open `three-body-chaos.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Make the measurement 1000× better. Do you get 1000× more warning?

## The model

N-body leapfrog integration with adaptive time step. Assumptions and simplifications are listed inside the
simulation under **The model**.

## The original lab

The earlier Three-Body Chaos Lab (outcome maps, validation suite, source and
docs) is kept unchanged in [`original_lab/`](original_lab/). Open
`original_lab/three-body-chaos.html` to use it.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/three_body_chaos.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
