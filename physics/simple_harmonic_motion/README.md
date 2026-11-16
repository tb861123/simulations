# Simple Harmonic Motion

A pendulum or a mass on a spring, with live graphs of displacement, velocity,
acceleration and energy; at A level damping, driven oscillations and resonance,
Barton's pendulums, and the chaotic double pendulum.

## How to run

Open `simple-harmonic-motion.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Oscillator**: pendulum (length, Earth / Moon / Mars / Jupiter, starting
  angle up to 85°) or spring (k, mass, starting displacement); drag the bob or
  mass to set it going. Measured period against the formula; x, v and a against
  time; kinetic, potential and total energy.
- **A level**: damping, the small-angle approximation, a driving force and its
  frequency with the resonance curve, Barton's pendulums (amplitude and phase),
  and two double pendulums released 10⁻¹ to 10⁻⁷ rad apart.
- Eight guided investigations and a Revise tab.

## Batch run

Period against length (matches 2π√(L/g)); timing one swing against ten (g
spread about 1.4 against 0.14 m/s²); period against mass on a spring; big
swings take longer (matches the series formula); the resonance curve; how long
a double pendulum stays predictable.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its separate chaos settings and batch settings
table are not in this version.

## Limits

Point bob on a massless string, massless spring, no air resistance unless damping
is added. See "The model" tab.

## Source

Built from `tools/kit/src/simple_harmonic_motion.js` with the shared kit: edit that
file and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
