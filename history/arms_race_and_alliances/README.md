# Arms Races and Alliances

A single, self-contained HTML file: Richardson's arms-race equations for the Anglo-German naval race and the Soviet–American nuclear arms race, and the July Crisis of 1914 as a chain of chances. It needs no install and no
internet: **open `arms-race-and-alliances.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/arms_race_and_alliances.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `arms-race-and-alliances.html` by hand.

- **Standard (GCSE):** the causes of the First World War (MAIN, the naval race, the July Crisis); the Cold War arms race, deterrence and arms control.
- **Advanced (A level):** OCR A level History A (H505) Y218 International Relations 1890–1941 and Y223 The Cold War in Europe 1941–1995; AO1 causation and contingency; AO3 interpretations (Fischer, Taylor, Clark).

## What it shows

**Arms race:** each side's fleet or arsenal as icons, Richardson's stability test (fatigue a·b against fear k·l) and balance point, the race over time against approximate historical figures, and the race in the x–y plane with the two lines where each side stops changing. Six sliders (each side's reaction, fatigue and ambition), random budget years and, for the Cold War, arms-control treaties from 1972. **The July Crisis:** the great powers on a map with their alliances and ententes, coloured by state (at peace, in crisis, mobilising, at war), a dated diary of each simulated July, the exact chances of each outcome and a tally of simulated Julys. Switches for the blank cheque and the Schlieffen Plan; sliders for alliance rigidity and mediation.

History is a weaker fit for simulation than science: the chances in the July Crisis are judgements, not measurements, and the page says so. The model's value is in showing how a chain of likely steps multiplies, and how much each link mattered.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| When does an arms race run away? | 6.0 ships at k = 0 to 25.8 at k = 0.12 (balance point 6.0 to about 27) |
| A general war: how likely? | 46% of Julys, SD 7 points in batches of 50 (chain of chances 46%) |
| Alliances and the chance of general war | 21% at rigidity 0.1 to 54% at 1 |
| The Schlieffen Plan | 16% without, 46% with |
| Can diplomacy save the peace? | 62% with no mediation, 47% at 4% a day, 9% at 20% |
