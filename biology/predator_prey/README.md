# Foxes and Rabbits

A single, self-contained HTML file (`predator-prey.html`) for GCSE and iGCSE
biology. It shows predator–prey cycles on a field of grass and compares them
with the Lotka–Volterra equations and logistic growth. No installation and
no internet are needed: open `predator-prey.html` in Chrome or Edge, with no
install. Pick a preset and press **Start**.

## What it shows

A field of grass patches (each 50 m × 50 m), with rabbits and foxes (and,
optionally, field voles as a second prey). Grass regrows; rabbits hop about,
eat grass, breed when well fed and die of hunger, old age or foxes; foxes
roam, hunt, breed when well fed and starve when prey are scarce. The graphs
show the populations over time and a phase plot of rabbits against foxes
(the loop). **Show Lotka–Volterra curve from here** fits the equations to the
run so far and draws their curve from the current point.

**Controls:** field size, starting rabbits, foxes and voles, refuges
(warrens), random seed; grass regrowth rate, rabbit breeding rate, fox hunting
success, fox energy needs, fox culling, years to simulate. **Events:** rabbit
disease (kills 80%), cull half the foxes, add 10 foxes, add 50 rabbits.

**Readouts:** measured cycle period, Lotka–Volterra period 2π/√(ad), how far
fox peaks lag behind rabbit peaks, recent peak sizes, animals per hectare and
per km², and (with no foxes) the logistic fit and carrying capacity.

## Presets

Classic cycles · Too many foxes (crash) · No foxes (logistic growth) ·
Refuges stabilise · Small island (extinction by chance) · Invasive predator ·
Culling foxes · Voles as a second prey · Fast-growing grass (paradox of
enrichment).

## The model

- Grass: g → g + r(1 − g) each week.
- Rabbits: eat up to 0.3 units of grass a week (8 energy per unit), use 1
  energy a week, breed from 12 weeks old when well fed, 1% weekly death from
  other causes.
- Foxes: up to 5 attacks a week on prey within 2 patches; a rabbit gives 1
  energy, a vole 0.25; they use the "energy needs" amount each week, breed
  from 6 months old when well fed, and starve at zero energy.
- Lotka–Volterra: dR/dt = aR − bRF, dF/dt = cRF − dF, fitted by straight-line
  fits of the per-head growth rates. Logistic: N = K/(1 + ((K − N0)/N0)e<sup>−rt</sup>).

All assumptions and simplifications are listed in the app under **How the
model works (and what it leaves out)**.

## Batch run

**📊 Batch run** repeats the model many times (Repeat) or changes one setting
in steps (Sweep). Results can be downloaded as CSV. Experiments:

1. How often do foxes and rabbits both survive? (the equations say always)
2. Is the cycle period what Lotka–Volterra predicts? (measured periods
   against 2π/√(ad) fitted to each run)
3. Do small fields lose their foxes by chance? (sweep field size)
4. With no foxes, do rabbits grow logistically? (mean ± SD of runs with the
   best-fit logistic curve and carrying capacity)
5. Do refuges help foxes and rabbits live together? (sweep refuges)
6. Does culling foxes mean more rabbits? (sweep culling)
