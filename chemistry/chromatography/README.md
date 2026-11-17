# Chromatography

A single, self-contained HTML file: paper chromatography of inks, food
colourings, leaf pigments and amino acids, with Rf measurement, and (A level)
TLC and gas chromatography. It needs no install and no internet: **open
`chromatography.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/chromatography.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `chromatography.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4CH1 1(b): paper chromatography, Rf,
  purity, identifying substances.
- **Advanced (A level):** Pearson Edexcel 9CH0 Topic 19: TLC and gas
  chromatography (retention times, peak areas).

## Three views

Paper (five lanes from 29 samples and references; five solvents; spot size;
lid; mistakes: felt-tip baseline, solvent too deep; locating agent; take the
paper out and click spots to measure Rf with a ruler error) · TLC (painkiller
tablets on silica under UV; eluent polarity) · Gas chromatography (five
alcohols; column temperature; chromatogram and composition from peak areas).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How precise is one Rf measurement? (500) | 0.380 ± 0.0096 (0.38) |
| Rf error and ruler error | 0.006 → 0.027 for 0–2.5 mm (propagated error) |
| Bigger spots: worse separation? | Rs 1.02 (1 mm) → 0.52 (10 mm) |
| Does Rf depend on how far the solvent runs? | mean 0.38 at every distance; SD falls with distance |
| How fast does the solvent rise? | follows h = √(kt) |
| Which solvent? (brilliant blue) | 0.90, 0.93, 0.35, 0.02, 0.45 (the same) |
