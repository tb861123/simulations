# Nature and Nurture: Twin Studies

A single, self-contained HTML file: Generate twins and adoptees from known genetic and environmental effects (the ACE model), then see how well MZ/DZ correlations, Falconer's formula, adoption studies and concordance rates recover the truth, and what happens when the equal environments assumption or selective placement fails. It needs no install and no
internet: **open `approaches-and-inheritance.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/approaches_and_inheritance.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `approaches-and-inheritance.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology 3.2.1 Approaches: the biological approach: the influence of genes on behaviour; genotype and phenotype; twin studies and concordance rates. 3.1.4 Psychopathology: genetic explanations of OCD (diathesis–stress).
- **A level (AQA 7182):** AQA A level Psychology (7182) 3.3.1 Issues and debates: the nature–nurture debate, the relative importance of heredity and environment, the interactionist approach; twin and adoption studies of schizophrenia and aggression (Gottesman, 1991), the diathesis–stress model, and the limitations of twin studies (the equal environments assumption, selective placement).

## What it shows

Scatter graphs of MZ twins together, DZ twins together, MZ twins apart, adoptees against biological and adoptive parents, with each correlation and the heritability estimates against the truth. Disorder mode: liability scatter graphs with the threshold, MZ and DZ concordance rates, and how concordance depends on heritability.

Try this first: Make MZ twins share extra environment. What does Falconer's formula now say about heritability?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Falconer's estimate v true heritability | 0: 0.0877 ± 0.0676 · 0.2: 0.148 ± 0.0602 · 0.4: 0.363 ± 0.0345 · 0.6: 0.647 ± 0.0449 · 0.8: 0.807 ± 0.029 (mean ± SE, 10 runs each) (theory: estimate = truth) |
| How many twin pairs? | 25: 0.749 ± 0.108 · 50: 0.558 ± 0.0777 · 100: 0.503 ± 0.0505 · 200: 0.508 ± 0.025 · 400: 0.492 ± 0.0256 · 800: 0.499 ± 0.0185 (mean ± SE, 12 runs each) (theory: true h²) |
| Breaking the equal environments assumption (A level) | 0: 0.466 ± 0.0453 · 0.05: 0.495 ± 0.0399 · 0.1: 0.622 ± 0.0102 · 0.15: 0.642 ± 0.0263 · 0.2: 0.768 ± 0.0212 (mean ± SE, 8 runs each) (theory: 0.4 + 2 × extra) |
| MZ concordance v heritability | 0.2: 0.0216 ± 0.00721 · 0.4: 0.115 ± 0.00807 · 0.6: 0.199 ± 0.00902 · 0.8: 0.381 ± 0.0115 · 0.9: 0.564 ± 0.00788 (mean ± SE, 4 runs each) |

## The model

The additive ACE model (genes, shared environment, unique environment as independent normal parts) with a liability threshold for disorders; probandwise concordance; optional breaks of the equal environments assumption and selective placement. Assumptions and simplifications are listed inside the simulation under **The model**.
