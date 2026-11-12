# Dynamic Equilibrium

A + B ⇌ AB with real collisions: every bond made and broken flashes, and the rates chart shows them come into balance. Le Chatelier by adding, squeezing and heating.

## How to run

Open `dynamic-equilibrium.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Add 20 A at equilibrium and watch Q fall, then climb back to K.

## The model

Hard-disc particles with activation energies for the forward and reverse steps. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/dynamic_equilibrium.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
