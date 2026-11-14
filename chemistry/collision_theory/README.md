# Collision Theory and Rates

Molecules as hard spheres in a box. A reactant pair reacts only if the energy
of their collision along the line of centres is at least the activation
energy. The effects of temperature, concentration, pressure, surface area
and a catalyst on the rate all follow from that one rule.

## How to run

Open `collision-theory.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Gas reaction A₂ + B₂ → 2AB with a flash at every successful collision, or a
  solid lump / chips / powder dissolving in acid.
- Sliders for temperature, amounts, volume, activation energy and energy
  change; catalyst beads; an orientation rule; water bath or insulated flask
  (an exothermic reaction in an insulated flask runs away).
- Energy distribution with the Maxwell–Boltzmann curve and the Ea line, an
  energy-profile diagram, and product-against-time curves that stay on the
  graph so runs can be compared.
- Nine guided investigations.

## Batch run

Rate against temperature, the Arrhenius plot (gradient −Ea/R), rate against
concentration and against volume, share of successful collisions against Ea
(e^(−Ea/RT)), surface area, and amount of catalyst.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Activation energies are far lower than real ones so reactions happen while
you watch; no reverse reaction; the catalyst is a rule, not a surface
mechanism. The rate equations, initial-rates and Arrhenius practicals and
exam questions of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/collision_theory.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
