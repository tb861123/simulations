# Murmuration

Up to 4000 starlings in three dimensions over a lake at dusk. Each bird
follows three rules (separation, alignment, cohesion) using only the birds
near it; alignment and separation use its nearest seven, as measured in real
flocks. The flock, its turns and its response to a falcon emerge from that.

## How to run

Open `murmuration.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Sliders for each rule, the number of neighbours tracked, and steering
  "wobble"; switch a rule off to see what it was for.
- A peregrine falcon that chases one bird at a time; the flock splits and
  re-forms, and catches are counted.
- "Follow one bird" draws the only birds it pays attention to.
- Charts of alignment, share of birds in the biggest flock, spacing and
  catches. Drag to walk round the flock.

## Batch run

Alignment against wobble (order collapses), number of groups against
neighbours tracked, each bird's risk against flock size (the dilution
effect), and the time a scattered flock takes to line up.

## Limits

Birds are points with tuned, not measured, rule strengths. Cohesion uses a
wider view (about 25 m, plus a weak pull to the whole flock's centre) than the
other two rules. Neighbour search reaches only a few metres. The falcon is a
simple pursuer.

## Source

Built from `tools/kit/src/murmuration.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html`.
