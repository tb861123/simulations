# Creature Evolution Arena

A single, self-contained HTML file about evolution by natural selection, run
as a genetic algorithm. It needs no install and no internet: **open
`creature-evolution.html` in Chrome or Edge**. The arena is drawn with WebGL;
if WebGL is switched off the page says so, and the Batch run still works.

Built with the kit from `tools/kit/src/creature_evolution.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`creature-evolution.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

Each creature is 3–8 balls joined by springs; some springs are muscles whose
natural length swings in and out at the creature's own beat, each with its own
timing. A whole generation races at once (faint ghosts, the leader bright).
After each trial the fitter half survive and breed: children copy a parent's
genes with mutations, and sometimes mix two parents (crossover). Colour is an
inherited gene with no effect on fitness, so you can watch one family line take
over.

- **Tasks:** walk (distance), jump (height of the lowest ball), swim (no
  gravity; water drags on every spring as it sweeps sideways).
- **Ground:** flat, hills, uphill, steps, rocky, or draw your own with the
  mouse. Changing it keeps the population, so you can change the environment
  mid-evolution.
- **Controls:** population, mutation rate, crossover, selection on or off,
  trial length, speed, zoom, whole generation or leader only, "10 generations"
  fast-forward, a screenshot button.
- **Gallery of ancestors:** the champion of earlier generations; click one to
  watch it again.

## Investigate

From flailing to walking · Turn selection off · How much mutation? · The
environment changes · Learning to swim · Jumpers · Run it again

## Batch run

Populations of 30, 8 s trials.

| Experiment | Result when tested |
|---|---|
| Walkers: fitness over generations | best distance 0.37 m (random) → 1.0 m (5 generations) → 3.8 m (10) → 9.3 m (20) → 9.5 m (30) |
| Is selection needed? | after 20 generations: 0.15 m without selection, 5.1 m with |
| Mutation rate | after 20 generations: 0.39 m with no mutation, 5–7 m from 0.05 to 0.6 per gene |
| Swimmers: fitness over generations | 0.5 m (random) → 1.3 m (10) → 1.8 m (20) → 2.6 m (30) |

`worksheets.html` has the full test-run numbers.

## The model

Balls of 1 kg, Hooke's-law springs with damping, gravity, ground contact with
friction set by each ball's grip gene, time step 1/120 s. Muscles change their
natural length by up to 35% at 0.3–3 beats a second. No brains or senses, no
self-collision, no energy cost. Survivors are kept unchanged (elitism) and
children are bred from pairs chosen by small tournaments. The full list of
assumptions is in the page's "The model" tab.
