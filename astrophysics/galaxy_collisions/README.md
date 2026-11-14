# Galaxy Collisions

Two galaxies meet. Up to 300 000 stars, each feeling the gravity of both
galaxies, are drawn by the graphics card. Tides throw out tails and bridges,
a head-on hit makes a ring, a dwarf is shredded into streams, and friction
against dark matter makes the pair merge (a restricted model after Toomre &
Toomre, 1972, with Chandrasekhar dynamical friction).

## How to run

Open `galaxy-collisions.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Presets: Antennae, Whirlpool, Cartwheel, a cannibalised dwarf, and the
  Milky Way with Andromeda from today's measured distance and speed.
- Sliders for mass ratio, closest approach, speed, the spin of each disc and
  the amount of dark matter. Drag to turn the view, scroll to zoom.
- Natural colours or colour by galaxy; squeezed gas clouds glow pink as
  starbursts. Graphs of separation, stars in tails and starbursts.
- Nine guided investigations.

## Batch run

Tails against disc spin, closest approach, visitor mass and encounter
speed; time to merge against dark matter and against closest approach.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Stars are massless tracers and each galaxy keeps a fixed shape, so merger
remnants are not properly relaxed. Needs WebGL for the full picture (falls
back to a sample of dots without it). The self-gravitating N-body mode of
the earlier version is not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/galaxy_collisions.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
