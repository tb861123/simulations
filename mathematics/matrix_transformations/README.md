# Matrix Transformations

A single, self-contained HTML file: Further Maths: watch a 2 × 2 matrix move the whole plane: columns as the images of i and j, the determinant as an area scale factor that can flip a shape, singular matrices, invariant lines, composition (order matters), and 3 × 3 matrices acting on a cube. It needs no install and no
internet: **open `matrix-transformations.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/matrix_transformations.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `matrix-transformations.html` by hand.

- **AS Further Maths (8FM0):** Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 3: matrices as linear transformations of the plane (reflections, rotations, enlargements, stretches), finding a matrix from the images of i and j, successive transformations (NM: M first), the determinant as the area scale factor and orientation, singular matrices and inverses, invariant points and invariant lines.
- **A level Further Maths (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 3: 3 × 3 matrices as transformations in 3D (rotations about the axes, reflections in planes, enlargements, stretches), the determinant as the volume scale factor. Eigenvalues and eigenvectors (Mv = λv) go beyond the Core Pure content.

## What it shows

A letter F (or square or triangle) and the whole grid transformed by a matrix, animated from the identity. Presets for rotations, reflections, enlargements, stretches and shears, a singular matrix, or your own (drag the images of i and j). Readings give det, the inverse and the invariant lines through the origin, which are drawn (solid yellow for a line of invariant points). Compose two transformations to see that order matters. A level: 3 × 3 transformations of the unit cube with their determinants.

Try this first: Reflect, then rotate. Now rotate, then reflect. Same transformation?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Random matrices: how often is the shape flipped? | mean 0.497, SD 0.0341, SE 0.00197 from 300 runs (theory: ½ by symmetry) |
| Enlargement and area | -2: 4 ± 0 · -1.5: 2.25 ± 7.90e-16 · -1: 1 ± 0 · -0.5: 0.25 ± 0 · 0.5: 0.25 ± 0 · 1: 1 ± 0 · 1.5: 2.25 ± 2.56e-16 · 2: 4 ± 0 · 2.5: 6.25 ± 1.99e-15 (mean ± SE, 3 runs each) (theory: det = k²) |
| det(AB) = det A × det B | mean -4.31e-18, SD 3.99e-17, SE 2.30e-18 from 300 runs (theory: 0 exactly) |
| Random matrices: are there invariant lines? | mean 0.678, SD 0.0346, SE 0.002 from 300 runs |
| Rotating n times by 360°/n | 3: 6.50e-16 ± 0 · 4: 2.45e-16 ± 0 · 6: 8.88e-16 ± 0 · 12: 1.11e-15 ± 0 · 24: 9.93e-16 ± 0 · 60: 2.71e-15 ± 0 · 360: 1.07e-14 ± 0 (mean ± SE, 1 runs each) (theory: 0 (Rⁿ = I)) |

## The model

Linear transformations of the plane and space; invariant lines through the origin from real eigenvectors. Assumptions and simplifications are listed inside the simulation under **The model**.
