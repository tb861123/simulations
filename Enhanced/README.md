# Enhanced simulations

Ten simulations, one from each subject, rebuilt from scratch as showpieces.
**Open [`index.html`](index.html)** in Chrome or Edge for the gallery. Each
simulation is one self-contained HTML file with nothing to install, and works
offline. The originals are untouched in their subject folders.

| Subject | Simulation | File | What the model is |
|---|---|---|---|
| Physics | Ripple Tank | [`waves/waves.html`](waves/waves.html) | 2-D wave equation on a 320 × 180 grid: draw walls, glass and sources |
| Chemistry | Dynamic Equilibrium | [`dynamic_equilibrium/dynamic-equilibrium.html`](dynamic_equilibrium/dynamic-equilibrium.html) | Hard-disc particles, A + B ⇌ AB with activation energies |
| Biology | Natural Selection | [`natural_selection/natural-selection.html`](natural_selection/natural-selection.html) | Moths with a heritable colour, predation by camouflage, mutation; "be the bird" mode |
| Medicine | Nerve Impulse | [`nerve_impulse/nerve-impulse.html`](nerve_impulse/nerve-impulse.html) | Hodgkin–Huxley cable model with myelin, lesions and channel block |
| Engineering | Earthquake Engineering | [`earthquake_buildings/earthquake-buildings.html`](earthquake_buildings/earthquake-buildings.html) | Multi-storey shear buildings on a shake table; bracing, isolation, tuned mass damper |
| Geography | Wildfire | [`forest_fire/forest-fire.html`](forest_fire/forest-fire.html) | Cellular fire spread with wind, slope, dryness and embers; percolation threshold |
| Astrophysics | Three-Body Chaos | [`three_body_chaos/three-body-chaos.html`](three_body_chaos/three-body-chaos.html) | N-body gravity with a "twin universe" to measure divergence |
| Statistics | Central Limit Theorem | [`central_limit_theorem/central-limit-theorem.html`](central_limit_theorem/central-limit-theorem.html) | Draw-your-own population, sampling distributions, confidence intervals |
| Economics | The Trading Pit | [`supply_demand/supply-demand.html`](supply_demand/supply-demand.html) | Haggling buyers and sellers; tax, price cap and floor |
| Physical Education | Luck, Skill and the League | [`luck_and_skill/luck-and-skill.html`](luck_and_skill/luck-and-skill.html) | Poisson-goal league and cup; regression to the mean |

## What every one has

- **Controls**: the live model with sliders, and direct manipulation on the picture (draw, drag, click).
- **Investigate**: six to eight one-click investigations. Each sets the model up, pins a question over it, and hides a "what to look for" explanation until asked.
- **📊 Batch run**: runs the model many times without drawing, plots single runs and mean ± standard error against theory, shows a table of mean, SD and SE, and downloads the runs as CSV.
- **The model**: the rules, the equations, and a list of assumptions and simplifications.
- Light / dark switch (◐), full screen (⛶), and <kbd>Space</kbd> to pause.

## How they are built

The ten pages share one small toolkit (page frame, sliders, charts, batch-run
window) so they look and behave alike. To keep every page a single file, the
toolkit is copied into each page by a build step:

```
_build/kit.css      shared styles
_build/kit.js       shared toolkit (K.app, K.slider, K.chart, batch run…)
_build/src/*.js     one script per simulation: the science lives here
_build/build.js     writes <folder>/<name>.html from the three parts
```

To change a simulation, edit its file in `_build/src/` (or the kit), then from
inside `_build/` run:

```
node build.js
```

Do not edit the built `.html` files by hand: the next build overwrites them.
`thumbs/` holds the 640 × 360 gallery pictures.

These pages have no `worksheets.html` yet; the Investigate tab and the batch
notes carry the questions and explanations instead.
