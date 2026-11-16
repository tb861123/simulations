# Exoplanet Hunting

Find planets round other stars from the dips in their light (transits) and the
wobble in their speed (radial velocity). The star seen from Earth with planets
crossing its face, a top view with the habitable zone, and the data arriving day by day.

## How to run

Open `exoplanet-hunting.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Stars: Sun-like, red dwarf, ultra-cool dwarf, A star; ground, TESS-like or
  Kepler-like telescope; up to three planets (radius, mass, period); orbit tilt;
  observing time and noise. Presets: hot Jupiter, Earth round the Sun, Earth
  round a red dwarf, TRAPPIST-1-like.
- Light curve; folded light curve at a trial period (÷2, ×2); a box search for
  transits; radial velocities (A level).
- Readouts: dip depth, planet radius, orbit size from Kepler's third law,
  temperature and the habitable zone, wobble and mass (A level).
- Seven guided investigations and a Revise tab.

## Batch run

Transit depth against planet radius (matches (Rp ÷ Rs)²); stacking transits
(signal-to-noise grows as √transits); radial velocity against planet mass
(matches theory); how many orbits are lined up (Rs ÷ a); Kepler's third law.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its star spots, flares and "find the next
planet" tool are not in this version.

## Limits

Circular orbits, no limb darkening, no planet–planet tugs. See "The model" tab.

## Source

Built from `tools/kit/src/exoplanet_hunting.js` with the shared kit: edit that file
and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
