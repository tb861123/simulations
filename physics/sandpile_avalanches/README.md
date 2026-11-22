# Sandpile Avalanches

A single, self-contained HTML file about self-organised criticality. It needs
no install and no internet: **open `sandpile-avalanches.html` in Chrome or
Edge**. The pile is drawn with WebGL; if WebGL is switched off the page says
so, and the Batch run still works.

Built with the kit from `tools/kit/src/sandpile_avalanches.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`sandpile-avalanches.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

- **The sandpile** (Bak, Tang and Wiesenfeld 1987): squares hold 0–3 grains;
  at 4 a square topples, giving one grain to each neighbour, and grains fall
  off the edge. Drop grains at random, at the centre (the sandpile fractal) or
  where you click, on tables from 32 × 32 to 512 × 512. Toppled squares glow.
  A live log–log histogram of avalanche sizes with a power-law fit, and a
  chart of recent avalanches.
- **The hourglass:** a falling-sand cellular automaton with fine and coarse
  grains; turn it over, refill, empty the box, pour with the mouse, and change
  how readily coarse grains roll.

## Investigate

Build up to the edge · A straight line on a log–log graph · All in one place ·
Where do avalanches start? · The hourglass · Angle of repose

## Batch run

| Experiment | Result when tested |
|---|---|
| The power law: τ against table size | τ = 1.06–1.08 for L = 16 to 128 (simple straight-line fit) |
| Mean height of the critical pile | 2.02 (L = 8) rising to 2.11 (L = 64 and 128); infinite table 17/8 = 2.125 |
| Mean avalanche size | 3.46, 11.4, 40.6, 87.8, 153, 337, 592 for L = 8 … 128, matching Dhar's exact values |
| Pouring a mixture | coarse share in the outer thirds of the heap: 0.50 with no extra rolling, 0.76 when coarse grains always roll |

`worksheets.html` has the full test-run numbers.

## The model

Grains are added only when the last avalanche has finished. The hourglass has
no forces (no arching, no air): grains fall, or slide one cell diagonally, so
its angle of repose is fixed at 45° and its flow does not depend on the width
of the neck. The full list of assumptions is in the page's "The model" tab.
