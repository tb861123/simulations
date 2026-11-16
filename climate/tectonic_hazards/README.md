# Tectonic Hazards

Four views: plate boundaries with earthquakes coloured by depth (a Benioff zone
forms along the sinking slab), earthquake waves spreading across a map to three
seismometers, a tsunami crossing the ocean and growing on the shelf, and a city
shaken by an earthquake to show why the same hazard kills far more where
buildings are weak.

## How to run

Open `tectonic-hazards.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Plate boundaries**: constructive (magnetic stripes), destructive (slab angle,
  volcanoes above 100 km), collision, and conservative in plan view (fences bend
  and snap: elastic rebound). Graphs: depth against distance with the fitted
  slab angle; magnitude–frequency against Gutenberg–Richter.
- **Earthquake waves**: P, S and surface waves, intensity shading, seismograms,
  travel-time curves, S − P distances and triangulation circles. Drag the epicentre.
- **Tsunami**: the shallow-water equations along a line; Tōhoku 2011, the Indian
  Ocean 2004, or your own ocean. Tide gauge at the coast; highest wave against
  Green's law.
- **Risk**: 40 districts, soft sediment, fragility curves, hazard × vulnerability
  ÷ capacity; Haiti 2010, Chile 2010, Christchurch 2011, Nepal 2015; real deaths
  against magnitude.
- Ten guided investigations and a Revise tab (an introduction level and A level).

## Batch run

Gutenberg–Richter (log N falls by 1 per magnitude); distance from S − P
(gradient 0.995); tsunami speed against depth (matches √(gd)); growth on the
shelf (Green's law, less on shallow shelves because of reflection); the
Benioff-zone angle (44.8° against 45°); deaths against building vulnerability.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its volcanic hazards view, the Park and PAR
model graphs and the batch settings table are not in this version.

## Limits

A uniform crust; the tsunami stops at 10 m depth (no run-up); vulnerability and
capacity are single numbers chosen to give deaths of the right size. See "The model" tab.

## Source

Built from `tools/kit/src/tectonic_hazards.js` with the shared kit: edit that file
and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
