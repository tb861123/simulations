# Foxes and Rabbits

A meadow where every rabbit and fox is followed, one day at a time. Grass
regrows; rabbits graze and breed; foxes hunt, raise cubs where there is
room, and starve when rabbits are scarce. Population cycles, carrying
capacity and extinction all come out of those rules.

## How to run

Open `predator-prey.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- A meadow of up to 82 hectares seen from above: grass cover, rabbits, foxes,
  kills and refuges.
- Populations against time (with grass cover) and foxes against rabbits
  (the predator–prey loop).
- Sliders for grass regrowth, rabbit breeding, fox hunting success, the
  energy a fox needs, refuges and culling; events: disease, cull, add animals.
- Small, medium and large meadows.
- Eight guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Carrying capacity against grass regrowth, fox survival against meadow area,
how far fox peaks lag rabbit peaks, culling, refuges and stability, and
hunting success.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Individual-based and stochastic, so no two runs are the same; no seasons, sexes or alternative prey; rates are set for clear cycles on a small meadow. The field voles, Lotka–Volterra fitting and quality settings of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/predator_prey.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
