# Spectroscopy and Structure

A single, self-contained HTML file: the mass spectrum, infrared spectrum, ¹³C and ¹H NMR spectra of seventeen organic molecules, with peak assignments, and mystery molecules to identify. It needs no install and no
internet: **open `spectroscopy.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/spectroscopy.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `spectroscopy.html` by hand.

- **Standard:** Pearson Edexcel A level Chemistry (9CH0) Topic 7 (AS): mass spectrometry (molecular ion, fragments, M+1, Cl and Br isotope peaks) and infrared spectroscopy. (Spectroscopy is not in iGCSE.)
- **Advanced (A level):** 9CH0 Topic 19: ¹³C NMR (environments, chemical shift) and ¹H NMR (environments, integration, n + 1 splitting, TMS, D₂O), combined to deduce structures.

## What it shows

Four spectra side by side for one molecule (alcohols, aldehydes, ketones, acids, esters, halogenoalkanes, a nitrile, an amine, an alkane, an alkene and an arene). The structure is coloured by environment to match the NMR signals. Controls: the NMR frequency (60–600 MHz), the number of scans (noise falls as √scans), D₂O shake, peak labels, a zoom on any ¹H multiplet (lines 7 Hz apart) and the molecular-ion region (M+1 = 1.1% × number of C). **Mystery molecule** hides the name: work it out, check your answer and keep score.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| M+1 and the number of carbons | 2.24% for C₂ to 11.1% for C₁₀ (1.1 × n) |
| Chlorine: how close to 3 : 1? | mean 3.14, SD 0.31 (75.8 ÷ 24.2 = 3.13) |
| Scans and signal-to-noise | 50 at 1 scan to 801 at 256 (∝ √scans: 50 to 800) |
| How accurate is the 3 : 2 integration? | 1.55 ± 0.12 at 1 scan, 1.50 ± 0.01 at 64 (1.5) |
| Higher field, better resolved? | dip 0.30 at 60 MHz, 0.84 at 100, fully resolved from 300 MHz |
| How much evidence do you need? | 75% identified from the mass spectrum alone, 87% with IR, 95% with ¹³C, 97% with ¹H |
