# Fields and Orbits

Electric and gravitational fields from point sources, drawn as a potential
map with equipotentials, field lines and a flowing field, and anything you
launch is moved step by step by the inverse-square law.

## How to run

Open `fields-orbits.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Electric scenes (one charge, + and −, + and +, charged plates) and
  gravitational scenes (Earth and satellites, Earth and Moon, the Sun and
  planets, a planet round two stars), in real units.
- Drag to launch ions or satellites with a dotted prediction of the path;
  move, add and remove sources; a probe reads field and potential.
- Tilt the map to see potential as a landscape of hills and wells.
- Equal-time sectors for Kepler's second law, an energy graph for the
  tracked object, orbit type, period, circular and escape speeds.
- Engine burns on the tracked object, and an A level Earth-to-Mars Hohmann
  transfer.
- Ten guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab (remembered in
the browser) hides or shows the A level investigations. The **Revise** tab has
key ideas tagged with their spec and exam-practice questions with mark
schemes; questions marked with on-screen numbers can be refreshed.

## Batch run

Kepler's third law, greatest height against launch speed (escape), the
inverse-square law, Kepler's second law, and deflection of ions by plates.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Everything is in one plane; launched objects do not affect the sources.
Galaxy rotation curves and binary-star radial-velocity curves from the
earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/fields_orbits.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
