# Complex Numbers

A single, self-contained HTML file: Further Maths: drag points on the Argand diagram to see multiplication as rotation and stretching, conjugates, loci and regions, de Moivre's powers spiralling out, and the nth roots of any number forming a regular polygon. It needs no install and no
internet: **open `complex-numbers.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/complex_numbers.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `complex-numbers.html` by hand.

- **AS Further Maths (8FM0):** Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 2: complex numbers, the Argand diagram, modulus and argument, modulus–argument form, multiplying and dividing (moduli multiply, arguments add), complex roots of polynomials with real coefficients (conjugate pairs), and loci and regions: |z − a| = r, |z − a| = |z − b|, arg(z − a) = θ.
- **A level Further Maths (9FM0):** Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 1: exponential form re^(iθ), de Moivre's theorem, powers zⁿ, the nth roots of a complex number and of unity (geometrically, a regular polygon), and the sum of the roots of unity.

## What it shows

An Argand diagram with points you drag. Arithmetic: z + w as a parallelogram, z × w animated as a rotation by arg w and a stretch by |w|, z ÷ w and z*, with moduli and arguments charted. Loci: circles, perpendicular bisectors and half-lines with their Cartesian equations, and shaded regions. A level: the powers of z spiralling by de Moivre's theorem, and the n solutions of zⁿ = w as a regular polygon that turns as you drag w.

Try this first: Make w = i and multiply. What does i do to every point?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Random quadratics: real or complex roots? | mean 0.413, SD 0.033, SE 0.00191 from 300 runs (theory: 5/12) |
| The roots of unity add to zero (A level) | 2: 1.22e-16 ± 0 · 3: 4.00e-16 ± 0 · 4: 2.88e-16 ± 0 · 5: 2.48e-16 ± 0 · 6: 4.58e-16 ± 0 · 8: 5.98e-16 ± 0 · 10: 5.55e-16 ± 0 · 12: 5.98e-16 ± 0 (mean ± SE, 1 runs each) (theory: 0) |
| Powers grow like rⁿ (A level) | 1: 1.1 ± 0 · 2: 1.21 ± 0 · 4: 1.46 ± 0 · 6: 1.77 ± 0 · 8: 2.14 ± 0 · 10: 2.59 ± 0 · 15: 4.18 ± 0 · 20: 6.73 ± 0 (mean ± SE, 1 runs each) (theory: 1.1ⁿ) |
| Distance between random points on the unit circle | mean 1.27, SD 0.0651, SE 0.00376 from 300 runs (theory: 4/π) |
| Random points in a circle locus | mean 0.196, SD 0.0196, SE 0.00113 from 300 runs (theory: π/16 (area ratio)) |

## The model

Exact complex arithmetic; arguments in the principal range −π < θ ≤ π. Assumptions and simplifications are listed inside the simulation under **The model**.
