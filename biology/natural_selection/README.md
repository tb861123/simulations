# Natural Selection

Moths on bark that darkens and recovers. Camouflage is real: well-matched moths are hard to see. Mutation, selection strength, extinction, and a "be the bird" mode.

## How to run

Open `natural-selection.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Be the bird: click the moths you can find and watch the population evolve.

## The model

One heritable colour trait, predation by mismatch, mutation, carrying capacity. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/natural_selection.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
