# Life and Cellular Automata

A single, self-contained HTML file: Conway's Game of Life, other "life-like"
rules and Wolfram's one-dimensional automata. It needs no install and no
internet: **open `life-automata.html` in Chrome or Edge**. The grid is stepped
and drawn by the graphics card (WebGL); if WebGL is switched off the page says
so, and the Batch run still works.

Built with the kit from `tools/kit/src/life_automata.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `life-automata.html` by hand. It is an
"explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you can do

- **Life-like rules** on a 512 × 288, 1024 × 576 or 2048 × 1152 grid (edges
  wrap round): Life (B3/S23), HighLife, Seeds, Day & Night, Maze, Replicator,
  Anneal, Life without death, or type your own B…/S… rule.
- **Patterns** (from run-length encoding): glider, lightweight spaceship,
  blinker, pulsar, pentadecathlon, Gosper glider gun, R-pentomino, acorn,
  diehard, the HighLife replicator. Draw, erase, place, random soup, clear.
- **Elementary rules** 0–255 with the rule's eight bits shown; start from one
  cell or a random row; rows scroll up the screen.
- Speed up to 600 generations a second, zoom and drag, age colours and fading
  trails, three palettes, a population chart, a screenshot button.

## Investigate

A gun that fires gliders · Five cells, a thousand generations · Primordial
soup · A replicator · Day and Night · Rule 30, 90 and 110 · Make your own rule

## Batch run

| Experiment | Result when tested |
|---|---|
| Soup density and the ash | 4–6% alive after 600 generations for starting densities 10–70%; under 1% at 5% and 80% |
| Will a small soup die out? | 70% of 10%-density patches die out completely, 20% at 20%, none from 30% up |
| Order, chaos and the edge | activity 0 at λ = 0.06, about 0.3–0.46 for λ = 0.28–0.72, 0 at λ = 0.94 |
| Rule 30 as a coin | centre column 50.1% ones, SD 0.0148 (a fair coin: 0.0158) |

`worksheets.html` has the full test-run numbers.

## The model

All cells update at once from their eight neighbours (B/S rules) or, in 1D,
from themselves and their two neighbours (Wolfram's numbering). The batch run
uses small grids on the main processor. The full list of assumptions is in the
page's "The model" tab.
