# Transition Metals and Colour

A single, self-contained HTML file: test-tube reactions of nine metal ions with sodium hydroxide, ammonia, chloride, thiocyanate, EDTA and zinc; why complexes are coloured; colorimetry; and transition-metal catalysts. It needs no install and no
internet: **open `transition-metals.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/transition_metals.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `transition-metals.html` by hand.

- **Standard:** Pearson Edexcel International GCSE Chemistry (4CH1) 2(h): sodium hydroxide tests for Cu²⁺, Fe²⁺ and Fe³⁺; transition metals form coloured compounds and are catalysts.
- **Advanced (A level):** Pearson Edexcel A level Chemistry (9CH0) Topic 15: complex ions and ligands, shapes, colour from d-orbital splitting, ligand exchange, the chelate effect, amphoteric hydroxides, vanadium oxidation states, homogeneous catalysis and autocatalysis; colorimetry.

## What it shows

**Test tubes:** start with Cu²⁺, Fe²⁺, Fe³⁺, Co²⁺, Ni²⁺, Cr³⁺, Mn²⁺, Zn²⁺ or vanadium(V); add reagents and see each precipitate or solution, with its equation and observation. Every solution's colour is calculated from the complex's absorption bands, weighted by the eye's colour sensitivities (CIE 1931). **Why colour?:** the d-orbital splitting diagram with electrons, ΔE = hc/λ, the absorption and transmission spectra and a colour wheel. **Colorimeter:** filters, standards, a calibration line and an unknown. **Catalysis:** Fe²⁺ catalysing S₂O₈²⁻ + I⁻ (with energy profiles), and the S-shaped autocatalysis of manganate(VII) with ethanedioate.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Beer–Lambert: absorbance against concentration | a straight line through the origin, A = 1.00 at 0.020 mol dm⁻³ |
| Which filter? | error 0.0049 mol dm⁻³ with violet, 0.0002 with yellow or orange |
| One class's unknown | mean 0.0090, SD 0.0002 mol dm⁻³ (0.009) |
| Iron as a catalyst | initial rate rises in a straight line from 0.50 to 1.66 × 10⁻⁵ mol dm⁻³ s⁻¹ |
| Autocatalysis: adding Mn²⁺ at the start | time to half 118 s with none, 16 s with 0.004 mol dm⁻³ |
