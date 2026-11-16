# Membranes and Movement

Particles moving at random across a membrane (diffusion, osmosis, active
transport and, at A level, facilitated diffusion); agar cubes of different sizes
in acid (surface area to volume); and potato cylinders in sucrose solutions.

## How to run

Open `membranes.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Across a membrane**: particles on each side, temperature, pores (surface
  area), thickness, respiration for active transport; the membrane moves as one
  side swells in osmosis. Graphs: particles on each side; the factors in Fick's law.
- **Agar cubes**: 0.5, 1, 2 and 3 cm cubes changing colour from the outside in,
  with their SA : V ratios and times.
- **Potato and osmosis**: nine cylinders in 0–1 mol/dm³ sucrose over 24 hours;
  % change in mass with the zero crossing; a plant cell turgid, flaccid or
  plasmolysed; water potentials at A level.
- Eight guided investigations and a Revise tab.

## Batch run

Agar cube size against time (∝ side²); potato mass change against concentration
(crosses zero at about 0.3 mol/dm³); temperature and diffusion; membrane
thickness; active transport against respiration; facilitated diffusion saturating.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its beetroot permeability practical and
endocytosis are not in this version.

## Limits

A few hundred particles in two dimensions; illustrative constants. See "The model" tab.

## Source

Built from `tools/kit/src/membranes.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
