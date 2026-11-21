# The Trading Pit

Supply and demand built from people who haggle. Nobody sets the price, yet it finds the equilibrium. Then add a tax, a price cap or a price floor and see who gains and loses.

Standard / Advanced switch: **Standard (iGCSE)** Pearson Edexcel 4EC1 1.2 (demand, supply, equilibrium, PED and revenue, taxes and price controls); **Advanced (A level)** 9EC0 1.2 adds PED, YED, XED and PES, total revenue and the price mechanism, with a Revise tab.

## How to run

Open `supply-demand.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Tax sellers £20. Does the price rise by £20, £0 or something else?

## The model

Buyers with private values and sellers with private costs who haggle and learn. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/supply_demand.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
