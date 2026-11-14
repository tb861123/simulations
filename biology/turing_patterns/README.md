# Turing Patterns

How does a leopard get its spots? Two chemicals that react and spread at
different speeds can turn a nearly uniform sheet into spots, stripes or a
maze with no plan at all (Alan Turing, 1952). This is the Gray–Scott
reaction–diffusion model on a 320 × 160 grid.

## How to run

Open `turing-patterns.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Eight patterns to grow (leopard spots, zebra stripes, brain coral, dividing
  cells, giraffe, fingerprint, spiral waves, pufferfish) in matching colours.
- Drag on the skin to add activator or rub a patch out, and watch the
  pattern repair itself.
- Sliders for the feed and kill rates, how much faster the fuel spreads than
  the activator (Turing's condition) and how far both spread (pattern size).
- A clickable map of the two rates, and a mode that varies both rates across
  the picture so every kind of pattern appears at once.
- Body-and-tail and fish outlines; a live profile of the two chemicals along
  a line; counts of patches, cover and spacing.
- Nine guided investigations.

## Batch run

Spacing against diffusion (∝ √D), the diffusion ratio needed for a pattern,
spot counts from repeated random starts, cover and connectedness against the
kill rate, and the growth in number of dividing spots.

## Limits

The simplest model of its kind, not the chemistry of any real animal; the
skin does not grow; preset names describe how patterns look. See "The model"
tab in the simulation for the full list.

## Source

Built from `tools/kit/src/turing_patterns.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html`.
