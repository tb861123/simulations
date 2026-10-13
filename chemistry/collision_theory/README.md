# Collision Theory and Rates

A particle simulation of collision theory for GCSE / iGCSE chemistry. Particles A and B
fly around a box and bounce off each other. A pair reacts only if it collides hard enough
(the collision energy is at least the activation energy, Ea) and, if you switch it on, the
right way round. You can watch how temperature, concentration, pressure, surface area and
a catalyst change the rate, then run the model hundreds of times and compare it with theory.

## How to run

Open `collision-theory.html` in Chrome or Edge. There is nothing to install and it works
offline.

## Controls

- **Presets** (12): Standard, Cold, Hot, Dilute, Concentrated, High pressure, High Ea,
  With catalyst, Right way round, A + B → C, Solid lump, Powder.
- **Conditions** (change at once): temperature (250–1000 K), volume of the box (a piston),
  activation energy (0–30 kJ/mol), catalyst (halves Ea), "must hit the right way round".
- **Reactants** (restart the reaction): reaction type (A + B → C + D, A + B → C, or
  A + solid → C), number of A and B particles, number of pieces of solid (1, 4, 16 or 64),
  random seed.
- **Centre:** Play/Pause, Reset, speed (¼×, 1×, 4×, 15×; 1× = 25 ps of reaction per
  second), **Batch run**.
- **Right panel:** a "What's happening" commentary; readings (collision frequency,
  % successful, rate now, initial rate, concentrations, half-life, each with its theory
  value); amount of product against time with the initial-rate tangent; collision energies
  (or particle speeds) with the Maxwell–Boltzmann theory curve, the Ea line and the
  successful collisions shaded; and an energy profile with and without the catalyst.
- The side panels can be resized or hidden by dragging or clicking the dividers.

## The model

- Hard discs in a 2D box 40 nm × 25 nm. A, B, C, D have mass 30 g/mol and radius 0.3 nm.
  Elastic collisions; walls reflect.
- Starting velocities: each component is normal with SD √(RT/m), which gives the 2D
  Maxwell–Boltzmann spread. Units: nm, ps, g/mol, kJ/mol (1 g/mol·(nm/ps)² = 1 kJ/mol).
- **Water bath:** an unreactive solvent (not drawn) gives each particle a fresh random
  thermal velocity about every 3 ps (an Andersen thermostat). This keeps the temperature
  steady and keeps the Maxwell–Boltzmann shape even though reactions use up the fastest
  particles. Without it, the fraction of successful collisions falls 10–15% below theory.
- **Collision energy:** E = ½μv², where v is the closing speed along the line of centres
  and μ is the reduced mass. Each collision is wound back to the exact moment of contact
  before E is worked out.
- **Reaction rule:** react if E ≥ Ea (and, with orientation on, if the other particle hits
  within ±60° of A's marked end, so P = ⅓).
- **Solid:** 64 fixed particles in square lumps. Only surface particles can be hit.
- **Theory used for comparison:**
  - fraction of collisions with E ≥ Ea = e^(−Ea/RT) (exact for hard discs);
  - collision frequency = 2d · v̄rel · g · N_A N_B / area, with v̄rel = √(πRT/2μ) and g a
    small crowding correction (Henderson);
  - rate = collision frequency × P × e^(−Ea/RT);
  - half-life from the second-order integrated rate law;
  - solid: rate ∝ the length of exposed surface around the lumps.
- **Scaled energies:** Ea is at most 30 kJ/mol (real reactions: 40–200 kJ/mol) so you can
  see reactions happen. ΔH = −30 kJ/mol is shown on the energy profile only. Heat from the
  reaction is taken away by the bath.
- **Not modelled:** 3D motion, molecular shape and rotation, attractions, reverse
  reactions, the gas heating up, multi-step catalysis.

## Batch experiments

Batch runs use the same particle model with no drawing (seeded random numbers, so a run
can be repeated exactly). There are two modes: **Repeat** (a histogram) and **Sweep** (mean
± 1 SD at each step, with the theory line and a best-fit line). Each mode shows a summary
table and can download the results as a CSV file.
Results from testing (seed 1):

| Experiment | Result | Theory |
|---|---|---|
| Arrhenius plot, 300–900 K, 7 × 4 runs | Ea from gradient = 11.6 ± 0.7 kJ/mol | Ea set 10; expected Ea + ½RT̄ = 12.2 (collisions also get faster) |
| Order with respect to A, 15–160 particles | gradient 1.06 ± 0.08 | 1 |
| Order with respect to B | gradient 1.08 ± 0.17 | 1 |
| Fraction successful against Ea at 600 K | gradient −0.197 per kJ/mol → T = 609 K | −1/RT = −0.200 (600 K) |
| 100 repeats, time for half to react | mean 267.5 ps, SD 54, SE 5.4 | 267.7 ps (−0.03 SE) |
| Lumps against powder (1, 4, 16, 64 pieces) | log–log gradient 0.62 ± 0.07 | 0.59 (from exposed surface) |

The default experiment takes a few seconds. The fraction experiment counts reactions but
leaves the mixture unchanged, so the reactant concentrations stay fixed.
