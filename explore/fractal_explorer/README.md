# Fractal Explorer

A single, self-contained HTML file for exploring the Mandelbrot set, Julia sets
and Newton's-method fractals. It needs no install and no internet: **open
`fractal-explorer.html` in Chrome or Edge**. Every frame is computed by the
graphics card (WebGL); if WebGL is switched off the page says so, and the
Batch run still works.

Built with the kit from `tools/kit/src/fractal_explorer.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `fractal-explorer.html` by hand. It is
an "explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you can do

- **Mandelbrot set:** drag to move, scroll to zoom where the mouse is. Below a
  view about 10⁻⁴ wide the page switches to double-single arithmetic (two
  floats as one number), which reaches about 10⁻¹².
- **Julia preview:** a live inset of the Julia set for the point under the
  mouse; click to open it full size (the inset then marks c on the
  Mandelbrot set).
- **Orbit:** the path of z under z → z² + c for the point under the mouse.
- **Newton's method** for z³ − 1, z⁴ − 1, z³ − 2z + 2 (with black regions that
  never settle) and z⁵ − 1.
- **Famous places** (Seahorse valley, Elephant valley, a baby Mandelbrot, a
  triple spiral, a 10⁻¹⁰ deep view, the cusp, the needle), named Julia sets,
  a 40-second zoom tour, four palettes, colour cycling, a screenshot button.

## Investigate

Seahorse valley · Inside or outside? · Follow the orbit · π in the cusp ·
Newton's three colours · The edge of precision · How long is the coastline?

## Batch run

| Experiment | Result when tested |
|---|---|
| π in the cusp | steps to escape at c = 0.25 + ε: 30, 61, 124, 249, 500, 1010 for 1/√ε = 10 … 320 (π/√ε gives 31 … 1005) |
| π through the neck | steps at c = −0.75 + iε: 33, 95, 316, 941, 3120 for 1/ε = 10 … 1000 (π/ε gives 31 … 3142) |
| The area of the Mandelbrot set | 1.53 ± 0.006 (SE) from 120 runs of 2000 random points (best known value 1.5066) |
| Rough edges: box-counting dimension | 1.00 for the circle (c = 0), about 1.2 for the basilica (c = −1; true value 1.27), 1.3 at c = −1.3 |

`worksheets.html` has the full test-run numbers.

## The model

Escape-time colouring with smooth iteration counts; the iteration limit rises
automatically as you zoom. "In the set" means "not escaped within the limit".
Box-counting uses a 512 × 512 grid. The full list of assumptions is in the
page's "The model" tab.
