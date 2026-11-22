# Domino Chain Reactions

A single, self-contained HTML file about domino waves and chain reactions. It
needs no install and no internet: **open `domino-chains.html` in Chrome or
Edge**. The main view runs on the graphics card (WebGL); without WebGL the page
draws a simpler 2D picture, and the Batch run works either way.

Built with the kit from `tools/kit/src/domino_chains.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `domino-chains.html` by hand. It is an
"explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you see

A side view of a table. Stand dominoes (singly or in rows at a chosen
spacing), steel balls, ramps and see-saws, then push one domino. Presets: a
classic line, gaps that widen until the wave stops, a domino amplifier (each
domino 1.35 times taller than the last), a line down stairs, a ball run, and a
two-way split started by a dropped ball. Each domino lights up as it falls;
charts show the position of the toppling front (its slope is the wave speed)
and the kinetic energy of everything.

## The model

A small 2D rigid-body engine written for the page, with no libraries: boxes
and circles, contact points from separating axes and clipping, and sequential
impulses with friction and warm starting, at 1/600 s steps. Pinned see-saws.
Real domino sizes (48 × 7.5 mm, 10 g). The wave speed is compared with van
Leeuwen's (2004) frictionless model, computed in the page: with friction set
to 0 the simulation agrees with it to a few per cent.

## Batch run

Wave speed against spacing (against van Leeuwen's model), against friction,
and against domino height (∝ √h); the chance that the wave gets through as the
spacing approaches height plus thickness; and how fast a domino amplifier can
grow. `worksheets.html` has a printable sheet for each investigation and
experiment, with teacher notes and test-run results.
