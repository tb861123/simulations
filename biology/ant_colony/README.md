# Ant Colony Foraging

A single, self-contained HTML file about how an ant colony finds food with no
ant in charge. It needs no install and no internet: **open `ant-colony.html` in
Chrome or Edge**. The scent and the ants are drawn with WebGL; if WebGL is
switched off the page says so, and the Batch run still works.

Built with the kit from `tools/kit/src/ant_colony.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `ant-colony.html` by hand. It is an
"explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you see

A 60 cm × 34 cm floor with a nest, food patches and up to 2000 ants. Searching
ants lay home scent (blue) and follow food scent; ants carrying a crumb lay
food scent (gold) and follow home scent. Each ant smells a little ahead, left
and right, and turns towards the strongest, with some randomness. The scent it
lays weakens the longer it has walked, so stronger scent points back to where
it came from. Scent evaporates; busy trails are topped up and stay.

- **Arenas:** open floor, the double bridge (after Goss et al. 1989), near and
  far food, a wall in the way, many small patches.
- **Mouse:** drop, drag and remove food; paint and erase walls; move the nest.
- **Controls:** colony size, scent half-life, exploration randomness, trail
  following, crumbs per patch, new food appearing when a patch runs out, which
  scent to show, a screenshot button.

## Investigate

From wandering to highways · The double bridge · Block the trail · Move the
food · How much randomness? · Too few ants · Near or far?

## Batch run

| Experiment | Result when tested |
|---|---|
| Evaporation: an optimum? | food per minute: 79 at a 1 s half-life, 183 at 3 s, 141 at 10 s, 90 at 80 s |
| Bigger colonies: better ants? | food per ant per minute: about 0.2–0.3 with 25–100 ants, about 0.55–0.6 from 200 ants |
| How much randomness? | about 110–140 a minute from 0° to 30°, 61 at 45° |
| The double bridge | 92% of trips on the short branch (30 runs) |

`worksheets.html` has the full test-run numbers.

## The model

One step is 0.1 s and ants walk 2.5 cm/s on a grid of 2.5 mm cells. Scent is
stored per cell and decays exponentially (no sideways spreading). Ants see food
within 17.5 mm and the nest within 22.5 mm. They never block each other and use
no cues except scent and sight. The full list of assumptions is in the page's
"The model" tab.
