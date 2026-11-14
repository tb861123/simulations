# Lightning

A lightning leader grown step by step with the dielectric breakdown model
(Niemeyer, Pietronero and Wiesmann, 1984): solve for the voltage in the air,
find the field at every cell touching the channel, and let the channel grow
into one of them at random with probability ∝ field^η. Branching, and the way
lightning seeks out tall pointed things, come out of those rules.

## How to run

Open `lightning.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- A leader working its way down from the cloud, then the return stroke.
- Voltage lines or field strength over the whole scene, updated as the leader
  moves, and a chart of the field along the ground (the spike at a rod's tip).
- Build rods, towers, trees, houses and people on the ground by clicking, and
  a tally of what has been struck.
- η slider: bushy fractal at 1, nearly straight at 6.
- Seven guided investigations, including lightning rods, sheltering under a
  tree, and blunt against pointed buildings.

## Batch run

Scatter of strike points on open ground, fraction of strikes caught against
rod height, the width of a rod's protected zone, and channel length against
η. These use a coarser grid (6 m cells) and take a few seconds each.

## Limits

Two-dimensional; the channel is a perfect conductor; everything on the ground
conducts equally; no upward streamers or side flash; the scene is a scale
model with the cloud base about 280 m up.

## Source

Built from `tools/kit/src/lightning.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html`.
