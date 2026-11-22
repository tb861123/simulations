# Materials: Properties and Selection

A single, self-contained HTML file: tensile tests of seventeen materials (metals, polymers, timbers, boards, glass and composites) with a live stress–strain curve, and a selection view that sizes a part for a design brief in every material and plots selection charts. It needs no install and no
internet: **open `materials-properties.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/materials_properties.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `materials-properties.html` by hand. (The physics of Young's modulus and Searle's method is in `physics/youngs_modulus/`.)

- **Standard (GCSE):** AQA GCSE Design and Technology (8552) 3.1.6 materials and their working properties, 3.2.2 forces and stresses, categories of materials.
- **Advanced (A level):** AQA A level Design and Technology: Product Design (7552) 3.1.1 materials and their applications, 3.1.2 performance characteristics, 3.1.3 enhancement (work hardening, annealing), with stress, strain, Young's modulus and factor of safety. Ashby charts and Weibull scatter are beyond the spec.

## What it shows

**Tensile test:** the machine pulls a dog-bone sample; the stress–strain curve draws itself with yield and UTS marked, toughness shaded and a close-up of the elastic line; necking and fracture; each sample's strength is scattered (normal for metals and polymers, Weibull for brittle materials); test 20 samples at once; work hardening and annealing. **Selection and design:** three briefs (a shelf tie, a bike tube, a toy link) sized in every material with a factor of safety, ranked by mass and cost, showing whether strength or stiffness sets the size; selection charts of E or strength against density, and E against cost.

## Batch run

| Experiment | What it compares |
|---|---|
| Twenty steel samples | spread of UTS against the data-book value |
| Twenty glass samples | Weibull spread of brittle strength against the typical value |
| Factor of safety and failure (A level) | % of parts failing against Φ(−(FoS − 1)/√(σL² + σS²)) |
| Stiffness: measuring E from the graph | E from a best-fit line against the true value |
| The lightest bike tube (A level) | mass of the tube in six materials |
