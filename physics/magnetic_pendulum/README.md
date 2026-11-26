# Magnetic Pendulum Chaos Lab

A swinging bob over three magnets always settles on one, but which? Colour
every release point by the magnet it ends on and zoom into the fractal
boundaries between the basins of attraction.

## How to run

Open `magnetic-pendulum.html` in Chrome or Edge. Nothing to install; works
offline. It calculates a quick 24 × 24 preview, then the full map, in
background workers built into the file.

## What is in it

- **Experiment controls** (left): presets, pendulum length, damping, rod or
  string, editable magnets (add, move, strengthen), map horizon and
  resolution.
- **Basins of attraction** (centre): the map, with zoom, pan, colour schemes,
  boundary-confidence checks (Δt, Δt/2, Δt/4), divergence pairs, saved
  investigations and PNG / CSV / JSON export.
- **Selected trajectory** (right): replay any release from above or the side,
  compare it with a neighbour, run diagnostics and an independent adaptive
  reference solver.
- **Calibration**: fit the model to measured force data from a real
  apparatus (see `source/CALIBRATION-GUIDE.md`).

Try this first: in the Compare tab, pick Interior and then Intricate edge,
comparing each pair. Which pair ends on different magnets, and when do they
part?

## The model

A damped spherical pendulum (rigid rod, or a string that can go slack)
attracted by point magnets in a plane below it, integrated in full 3-D with
fixed-step RK4 in double precision. Assumptions, equations and validation are
under **Model & methods** inside the lab and in `source/README.md`.

`source/default-investigation.mplab` is a fully computed 100 × 100 default
map: load it through Saved investigations to inspect it straight away.

## Source

This lab was contributed as a separate React + TypeScript + Vite app and is
**not** built with the shared kit, so it has no Standard / Advanced switch,
Revise tab, Batch run tab or worksheets. Its full source, tests, validation
reports and benchmarks are in [`source/`](source/). To rebuild the single
HTML file after editing the source, from inside `source/`:

```bash
npm install
```

```bash
npm run single-file
```

That runs the Vite build and inlines it (including the workers, as classic
workers so they run from a `file://` page) into `../magnetic-pendulum.html`.
The source's own `npm run standalone` writes `standalone.html` with module
workers, which Chrome blocks on `file://` pages; use `single-file` instead.
The `Launch Lab.cmd` and `serve.mjs` launchers serve `dist/`, which exists
only after `npm run build`.
