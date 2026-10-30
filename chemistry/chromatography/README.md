# Paper Chromatography

Separate the dyes in inks and food colourings, watch the solvent front rise, measure
Rf values with a ruler, test whether a substance is pure, and identify the components of
a mixture by comparing them with reference substances on the same paper.
Edexcel International GCSE Chemistry: paper chromatography and Rf values.

Replaces the old page `chem_sims/20_Chromatography.html`.

## How to run

Open `chromatography.html` in Chrome or Edge. No install, no internet.

## What it shows

- A tank with a lid, the solvent, and a sheet of chromatography paper with five lanes on a
  pencil baseline. Choose what is spotted in each lane: inks, food colourings, sweet
  coatings, permanent marker, spinach extract, amino acids, or any pure substance (18
  references). The paper is drawn cell by cell; overlapping dyes mix like paints.
- Five solvents (water, salt water, ethanol, a propanone mixture for leaf pigments, and
  butanol / ethanoic acid / water for amino acids), spot size, amount of dye, where to stop,
  lid on or off, and two classic mistakes: a felt-tip baseline (it runs) and solvent above
  the baseline (the spots wash into the tank).
- The front rises by capillary flow (height² ∝ time); take the paper out to mark the front.
  Hover to read the ruler; click a spot to measure it, and your Rf goes into a table next to
  the true value. Colourless amino acids appear when you spray the locating agent.
- Under the tank, every spot's Rf is plotted lane by lane, with dashed lines through lane
  1's spots so matching substances line up. The right panel lists Rf values and which
  references match, plus charts of the front height and of spot spreading.

12 presets: separating black ink, measuring Rf, identifying an unknown, what is in green
colouring, pure or a mixture, choosing the solvent, spot too big, solvent too deep,
felt-tip baseline, leaf pigments, colourless amino acids, lid off.

Exam practice: the three questions from the old page, plus questions using the
chromatogram on screen (Rf from your distances, how many substances and which ones) and
on method (baseline, lid, purity, solvent choice, locating agents, spot size).

## The model

- Front height above the solvent h = √(k t) (Lucas–Washburn), k = 3.0 (water), 2.8, 1.6,
  5.0, 0.7 cm²/min; the baseline is 1 cm above the solvent. Lid off: dh/dt = k/(2h) − 0.15
  cm/min, so the front stops near 9 cm, and Rf values are 8% higher and ±0.03 less repeatable.
- Each substance moves Rf × the front distance. Spot blur σ² = (diameter/4)² + 0.002 cm ×
  distance + 2 × 0.0002 cm²/min × time. Resolution Rs = gap ÷ 2(σ₁ + σ₂).
- Rf values are typical school values (food dyes, leaf pigments, amino acids); real values
  depend on the paper, temperature and tank saturation. All assumptions are listed in the
  simulation under "How the model works (and what it leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep
it. Random parts: how fast each piece of paper soaks up solvent (±5%), hand-made spot size
(±20%), ruler reading error and rounding to the nearest mm, judging the centre of a spot.

| Experiment | Result (theory) |
|---|---|
| How precise is one Rf measurement? (500 × allura red, front 8 cm) | mean 0.380, SD 0.0099 (0.38, predicted SD 0.0096) |
| Rf error against ruler error (0–2.5 mm) | mean error 0.0065 → 0.031 (0.0054 → 0.027; this seed set runs ~10% large; with 20 000 runs it matches to 1%) |
| Bigger spots: worse separation? (sunset yellow vs ponceau 4R) | Rs 0.99 at 1 mm → 0.48 at 10 mm (1.00 → 0.49) |
| Does Rf depend on how far the solvent runs? (3–12 cm) | mean 0.375–0.379 at every distance (0.38); SD falls from 0.025 to 0.008 |
| How fast does the solvent rise? (1–100 min, log–log) | gradient 0.501 (0.5); 17.2 cm at 100 min (17.3) |
| Which solvent? (brilliant blue) | water 0.90, salt water 0.92, ethanol 0.35, propanone 0.02, BAW 0.45 (0.90, 0.93, 0.35, 0.02, 0.45) |

Results download as CSV.
