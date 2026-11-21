# Polar Curves

A single, self-contained HTML file: Further Maths: an arm turns through θ and stretches to r = f(θ), tracing cardioids, limaçons, roses, spirals and lemniscates; areas split into thin sectors approach ½∫r² dθ, and tangents parallel and perpendicular to the initial line are marked. It needs no install and no
internet: **open `polar-curves.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/polar_curves.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `polar-curves.html` by hand.

- **Curves and areas (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, polar coordinates: converting between polar and Cartesian, sketching curves r = f(θ) (cardioids, limaçons, roses, spirals, circles), and the area enclosed, A = ½∫r² dθ. (Polar coordinates are not in AS 8FM0.)
- **Tangents (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: tangents to polar curves parallel to the initial line (dy/dθ = 0, with y = r sin θ) and perpendicular to it (dx/dθ = 0, with x = r cos θ), and areas between two curves.

## What it shows

A polar grid with an arm turning at a steady rate and the curve drawn where r ≥ 0. Shade the area between any two angles and split it into N thin sectors whose total approaches ½∫r² dθ (charted). Charts show r against θ. A level: points where the tangent is parallel (dy/dθ = 0) or perpendicular (dx/dθ = 0) to the initial line.

Try this first: Shade one petal of r = 2 cos 3θ. Can you get its area from ½∫r² dθ?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Sectors approaching the area | 2: 0.105 ± 0 · 4: 0.0258 ± 0 · 6: 0.0114 ± 0 · 8: 0.00643 ± 0 · 12: 0.00286 ± 0 · 16: 0.00161 ± 0 · 24: 7.14e-4 ± 0 (mean ± SE, 1 runs each) (theory: ≈ 0.411/N²) |
| Random points inside a cardioid | mean 0.295, SD 0.0229, SE 0.00132 from 300 runs (theory: (3π/2) ÷ 16) |
| Area of a rose | 1: 0.785 ± 0 · 2: 0.785 ± 0 · 3: 0.785 ± 0 · 4: 0.785 ± 0 · 5: 0.785 ± 0 · 6: 0.785 ± 0 · 7: 0.785 ± 0 (mean ± SE, 1 runs each) (theory: π/4 for every n) |
| Spiral area grows like θ³ | 0.5: 1.29 ± 0 · 1: 10.3 ± 0 · 1.5: 34.9 ± 0 · 2: 82.7 ± 0 · 2.5: 161 ± 0 · 3: 279 ± 0 (mean ± SE, 1 runs each) (theory: θ³/24) |
| Average distance from the pole | mean 1.99, SD 0.143, SE 0.00827 from 300 runs (theory: a) |

## The model

r ≥ 0 (Edexcel convention); areas by Simpson's rule with 2000 strips; tangent points by locating sign changes of dy/dθ and dx/dθ. Assumptions and simplifications are listed inside the simulation under **The model**.
