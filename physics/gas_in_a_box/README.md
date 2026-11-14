# Gas in a Box

Every atom of a gas followed as a hard sphere in a small box with a piston.
Nothing in the code knows the gas laws: pressure is added up from the kicks
on the walls, temperature is the average kinetic energy, and Boyle's law,
the pressure law, Charles's law and the Maxwell–Boltzmann spread of speeds
all come out of collisions.

## How to run

Open `gas-in-a-box.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Up to 3000 helium, neon, argon or xenon atoms, coloured by kinetic energy,
  with a spark at every wall hit.
- A piston you drag (or leave free under a steady outside pressure), walls
  that conduct heat or are insulated, and a wall-temperature slider.
- Live speed histogram against the Maxwell–Boltzmann curve, and a second
  graph of p–V, p–T, V–T, height or mixing against the ideal gas equation.
- Energy tally ΔU = Q + W, mean free path, a smoke particle for Brownian
  motion, a tracked molecule, two-gas mixing with a partition, and gravity.
- Ten guided investigations.

## Batch run

Boyle's law, the pressure law (with the intercept at absolute zero),
Charles's law, adiabatic compression, equal mean kinetic energy for
different masses, mean free path against number, and the spread of speeds.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Hard spheres with no attractions (no liquid), single atoms only, a tiny dense
sample (so readings flicker), a thin box seen from the front. The heat
engines, p–V process diagrams and the ammonia / hydrogen chloride diffusion
tube of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/gas_in_a_box.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
