# Lines and Planes in 3D

A single, self-contained HTML file: Further Maths: turn a 3D scene with your mouse to see intersecting, parallel and skew lines, where a line meets a plane, the line where two planes meet, angles from the scalar product, and shortest distances along common perpendiculars. It needs no install and no
internet: **open `vectors-3d.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/vectors_3d.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `vectors-3d.html` by hand.

- **AS Further Maths (8FM0):** Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 4, vectors: vector and Cartesian equations of lines, the scalar product and angles between lines, intersecting, parallel and skew lines; vector and Cartesian equations of planes, the angle between a line and a plane and between two planes; the intersection of a line and a plane; perpendicular distance from a point to a plane.
- **A level Further Maths (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 4: the vector product a × b as a normal, the line of intersection of two planes, the shortest distance between two skew lines (along the common perpendicular) and from a point to a line, and the reflection of a point in a plane.

## What it shows

A 3D view you can turn by dragging. Two lines: lift one to change them from intersecting to skew, with the angle, b₁ × b₂ and (A level) the common perpendicular and shortest distance. A line, a plane and a point: where the line meets the plane, the angle between them and the perpendicular from the point to the plane. Two planes (A level): the line of intersection along n₁ × n₂ and the angle between the planes.

Try this first: Lift line 2 off line 1. Are the lines now parallel, or something else?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Skew distance and lift (A level) | 0: 0 ± 0 · 0.5: 0.456 ± 0 · 1: 0.913 ± 0 · 1.5: 1.37 ± 0 · 2: 1.83 ± 0 · 3: 2.74 ± 0 · 4: 3.65 ± 0 (mean ± SE, 1 runs each) (theory: |h k·n̂|) |
| Angle between random directions | mean 90.7, SD 5.83, SE 0.336 from 300 runs (theory: 90°) |
| Random points: distance to a plane | mean 1.5, SD 0.0917, SE 0.0053 from 300 runs (theory: 1.5) |
| Formula against a search | mean 4.46e-4, SD 0.00156, SE 1.56e-4 from 100 runs (theory: never negative) |

## The model

Exact vector formulae (scalar and vector products); an orthographic 3D projection. Assumptions and simplifications are listed inside the simulation under **The model**.
