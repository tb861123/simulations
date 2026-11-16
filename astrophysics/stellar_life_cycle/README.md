# Stellar Life Cycle

Follow a star from protostar to white dwarf, neutron star or black hole. Its
mass decides everything. Three views of the same star: what it looks like and
what its core is doing, its black-body spectrum, and its track across the
Hertzsprung–Russell diagram.

## How to run

Open `stellar-life-cycle.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Mass 0.05 to 60 solar masses (quick buttons for a brown dwarf, red dwarf,
  the Sun, 3, 15 and 40 Suns); play through its life or drag the stage.
- **Life cycle**: the star drawn in its colour, nebulae and supernovae, the
  stage timeline; luminosity, temperature and radius through its life.
- **Spectrum**: Planck's curve with the visible band and Wien's peak; power
  per m² and luminosity; comparison with 3300 K and the Sun.
- **H–R diagram**: main sequence, giants, supergiants and white dwarfs, 15
  real stars, the star's track, kept tracks; lifetime and luminosity against mass.
- Seven guided investigations and a Revise tab.

## Batch run

Lifetime against mass (10¹⁰ M^−2.5); mass and luminosity (gradient 3.5 on
log–log axes); Wien's law (matches b ÷ T); Stefan's law (gradient 4); remnant
mass against starting mass.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its metallicity, stellar wind and binary
(Type Ia) options are not in this version.

## Limits

Smooth, typical tracks between keyframes; approximate mass boundaries. See "The
model" tab.

## Source

Built from `tools/kit/src/stellar_life_cycle.js` with the shared kit: edit that file
and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
