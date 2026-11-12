# Central Limit Theorem

Draw any population by hand, then watch sample means pile into a bell curve. Mean, median, maximum and SD; live confidence intervals show what 95% means.

## How to run

Open `central-limit-theorem.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Sculpt the strangest population you can and try to break the theorem.

## The model

Random sampling from a 40-bar population you can redraw. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/central_limit_theorem.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
