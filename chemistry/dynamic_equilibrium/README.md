# Dynamic Equilibrium

A particle simulation of reversible reactions and Le Chatelier's principle for GCSE / iGCSE
chemistry. Particles react forwards and backwards. At equilibrium both reactions carry on at
the same rate, so the amounts stay steady. Change the temperature, pressure or amounts and
watch the position of equilibrium shift. Then run the model many times to compare the
measured Kc, yields and van 't Hoff plot with theory.

## How to run

Open `dynamic-equilibrium.html` in Chrome or Edge. There is nothing to install and it works
offline.

## Reactions

| Reaction | Forward step | Reverse step | ΔH in the model |
|---|---|---|---|
| A ⇌ B | one particle, chance ν e^(−Ea/RT) | one particle | −6 kJ/mol |
| 2NO₂ (brown) ⇌ N₂O₄ (colourless) | NO₂ + NO₂ collision | N₂O₄ splits on its own | −25 kJ/mol (real −57) |
| H₂ + I₂ ⇌ 2HI | collision | HI + HI collision (1 in 5 the right way round) | −9.4 kJ/mol (about real) |
| N₂ + 3H₂ ⇌ 2NH₃ (Haber) | N₂ + H₂ collision, × chance ([H₂] ÷ 1 per nm²)² that two more H₂ are close | NH₃ + NH₃ collision | −23 kJ/mol (real −92) |

## Controls

- **Presets** (13): Reaching equilibrium; From the other side; Labelled atoms; Add more
  reactant; Remove product; NO₂ in ice; NO₂ in hot water; Heat it up; Squeeze NO₂; Squeeze
  H₂ + I₂; Haber 450 °C, 200 atm; Haber 300 °C; Haber catalyst. Some presets make a change
  part-way through (a message appears in the box when they do).
- **Conditions** (change at once): temperature, volume (a piston), catalyst.
- **Add or remove** 10 particles of any species.
- **Isotope labelling:** label 10 particles (yellow ring). Labels follow the atoms through
  reactions, so they turn up in products and reactants even at equilibrium.
- **Starting mixture** (restarts): amount, start from reactants or products, random seed.
- **Graphs:** amounts against time, forward and reverse rates (they meet at equilibrium),
  Q against Kc (log scale), and the energy profile.
- **Readings:** temperature, pressure, Kc measured (average of the last 300 ps) and theory,
  % yield now and at equilibrium, forward and reverse rates, where the labels are.

## The model

- Hard discs (radius 0.3 nm, mass 30 g/mol for every species) in a 2D box 40 nm × 25 nm,
  with Maxwell–Boltzmann speeds. They are drawn as molecules (N blue, H white, I purple,
  O red).
- Collision steps react if the energy along the line of centres (½μv²) is at least Ea. Each
  collision is wound back to the moment of contact. One-particle steps happen with chance
  k = ν e^(−Ea/RT) per ps. ΔH = Ea(forward) − Ea(reverse), so K depends on temperature
  without any extra rule.
- An unreactive solvent (not drawn) gives each particle a fresh thermal velocity about once
  every 3 ps. This keeps the temperature and the Maxwell–Boltzmann spread steady.
- A catalyst lowers both activation energies by the same amount (60% of the forward Ea).
- **Theory:** Kc = k_forward ÷ k_reverse. For collisions, k = 2d · v̄rel · g · P · e^(−Ea/RT)
  (halved for two identical particles). The equilibrium mixture is found by solving
  Q(ξ) = Kc for the extent of reaction ξ. Concentrations are in particles per 100 nm².
- Energies are scaled down for NO₂ and Haber so both directions happen often enough to
  watch. Haber pressure is shown in "scaled atmospheres" (the preset is about 200 atm).
- **Not modelled:** 3D, attractions, different molecular sizes and masses, heat from the
  reaction changing the temperature, and real multi-step mechanisms (Haber uses an iron
  surface).

## Batch experiments

A ⇌ B runs as numbers only (same chances, no positions), so it is very fast. The others run
the full particle model with no drawing. Results from testing (seed 1):

| Experiment | Result | Theory |
|---|---|---|
| Kc from 50 repeat runs (HI, 700 K) | mean 56.4, SD 14.9, SE 2.1 | 50.3 (+12%, 2.9 SE) |
| SD of Kc against number of particles (A ⇌ B, 25–1600) | log–log gradient −0.53 ± 0.05 | −0.5 |
| van 't Hoff, A ⇌ B 300–700 K | ΔH = −5.6 ± 0.1 kJ/mol | −6.0 |
| Haber yield against pressure, 100–600 atm (723 K) | 38% → 64%, every point within 2 SE | 40% → 64% |
| Haber yield against temperature, 550–900 K (200 atm) | 58% → 37% | 61% → 37% |
| Time to equilibrium, A ⇌ B, without and with catalyst | 238 ps and 28.7 ps | 243 and 27.9 ps |

**Known limitation.** The HI Kc runs come out a few percent above theory. Only about 13
H₂ and 13 I₂ molecules sit on the bottom of the Kc fraction, so their fluctuations push the
average ratio up (a small-number effect; about +4% is expected from this). This is noted in
the experiment. More particles shrink both the scatter and this bias.
