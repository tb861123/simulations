# Particle Physics

A single, self-contained HTML file on the atom, quarks, conservation laws and
Feynman diagrams. It needs no install and no internet: **open
`particle-physics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/particle_physics.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `particle-physics.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4PH1 7: protons, neutrons and electrons,
  atomic and mass numbers, isotopes, β⁻ decay.
- **Advanced (A level):** WJEC Eduqas particles: quarks, leptons, hadrons, the
  four forces, conservation of Q, B and L. Strangeness, lepton family numbers
  and Feynman diagrams are tagged beyond the spec.

## Four views

The atom (choose Z and A) · Quarks (build a hadron from 2 or 3 quarks or
antiquarks: charge, B, S, name, or why it is not allowed) · Conservation (ten
examples or build your own reaction from 20 particles; Q, B, L, S checks and a
cartoon bubble chamber) · Feynman diagrams (β⁻, β⁺, electron capture,
annihilation, muon decay).

## Batch run

| Experiment | Result when tested (exact) |
|---|---|
| How often is charge conserved by chance? (1 → 2) | 29.6% (29.6%) |
| Q, B and L all at once? | 4.6% (4.5%) |
| More products, less chance? | 36.6% → 22.8% for 1–5 products (35.5% → 21.3%) |
| Does strangeness make it rarer? (2 → 2) | 2.0% (2.01%) |
| Why are beta electrons spread out? | 0–0.78 MeV, mean 0.300 MeV (0.303) |
