# Enzymes

Enzyme and substrate molecules drift about a test tube. A substrate that
reaches a free enzyme's active site, and fits, binds, is turned into products
and leaves; the enzyme is unchanged. Heat denatures enzymes for good, and pH
changes how well the active site fits. The optimum temperature, the pH curves
and the levelling-off at high substrate concentration all come out of
molecules colliding and fitting.

## How to run

Open `enzymes.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Amylase, pepsin, trypsin, catalase and Taq polymerase, each with its own
  optimum pH and heat tolerance.
- Temperature, pH, substrate and enzyme amounts, all changeable while it runs;
  denatured enzymes turn grey and misshapen.
- Products made against time (keep up to four curves to compare), and the
  model's rate-against-temperature curve.
- A level: competitive and non-competitive inhibitors, Vmax and Q10.
- Eight guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab: Standard
follows Pearson Edexcel International GCSE Biology (4BI1) 2(c); Advanced
follows OCR A level Biology A (H420) 2.1.4. The **Revise** tab has key ideas
tagged with their spec and exam-practice questions with mark schemes, one
using the numbers on screen.

## Batch run

Rate against temperature (optimum about 40 °C), against pH for pepsin
(peak near 2) and amylase (peak near 7), against substrate concentration
(levels off at Vmax), against enzyme concentration (a straight line), and
with non-competitive inhibitors (Vmax falls).

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Molecules are hugely magnified and few; pH changes the fit reversibly (no
denaturing at extreme pH); no induced fit, cofactors or end-product
inhibition. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/enzymes.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
