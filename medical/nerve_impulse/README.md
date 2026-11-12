# Nerve Impulse

The Hodgkin–Huxley equations solved live along an axon, with a close-up of the channels. Threshold, refractory period, myelin, an MS lesion and sodium-channel block.

## How to run

Open `nerve-impulse.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Fire both ends at once and see whether the impulses pass through each other.

## The model

Hodgkin–Huxley cable model, 150 compartments, implicit solver. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/nerve_impulse.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
