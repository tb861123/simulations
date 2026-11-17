# Biotechnology and Genetic Engineering

A single, self-contained HTML file: glasshouses and limiting factors,
fertilisers, fermenters, the genetic engineering of insulin, and selective
breeding. It needs no install and no internet: **open `biotechnology.html` in
Chrome or Edge**. Printable worksheets (one per investigation and per batch
experiment, with teacher notes) are in `worksheets.html`.

★ Enhanced: built from `tools/kit/src/biotechnology.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `biotechnology.html` by hand. The earlier
version (with pest control, cloning and DNA profiling) and its worksheets are
kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4BI1 5: food production, fermenters,
  selective breeding, genetic modification.
- **Advanced (A level):** OCR H420 6.1.3 and 6.2.1 (genetic engineering,
  biotechnology), 6.1.2 artificial selection; the breeder's equation and the
  economic optimum are tagged beyond the spec.

## Five views

Glasshouse (light, CO₂, temperature; the limiting factor; season yield, costs
and profit) · Fertiliser (wheat yield, uptake, leaching and eutrophication;
harvest plots; economic optimum) · Fermenter (temperature, pH, oxygen,
aseptic precautions; growth and insulin) · Genetic engineering (six steps from
gene to insulin) · Selective breeding (a herd of 200 cows over 10 generations).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Nitrogen and wheat yield | 5.1 → 10.6 t/ha (5.1 → 10.4) |
| Selective breeding: does heritability matter? | gain 554 → 4800 L (breeder's equation 840 → 7560) |
| Fermenter temperature | insulin peaks at 37 °C, almost none at 25 or 45 °C |
| Aseptic technique: batches lost of 20 | 7.7 ± 2.1 (binomial 7.6) |
| Limiting factors: CO₂ in dim light | rate 18 → 48% in dim light, below the bright-light curve |
