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
| Co(H₂O)₆²⁺ (pink) + 4Cl⁻ ⇌ CoCl₄²⁻ (blue) + 6H₂O, in water | Co(H₂O)₆²⁺ + Cl⁻ collision, × chance ([Cl⁻] ÷ 0.3 per nm²)³ that three more Cl⁻ are close | CoCl₄²⁻ splits on its own (k = ν) | +9 kJ/mol (real about +50) |

## Controls

- **Presets** (16): Reaching equilibrium; From the other side; Labelled atoms; Add more
  reactant; Remove product; NO₂ in ice; NO₂ in hot water; Heat it up; Squeeze NO₂; Squeeze
  H₂ + I₂; Haber 450 °C, 200 atm; Haber 300 °C; Haber catalyst; Cobalt: add chloride;
  Cobalt: warm it up; Cobalt: add water.
- **Guided tour** (7 steps): dynamic equilibrium, the Haber equilibrium, raising the
  temperature, raising the pressure, pressure on NO₂/N₂O₄, the cobalt colour change, and a
  catalyst.
- **Concentration stress** buttons (+/− reactant, +/− product), with notes for each reaction
  on what pressure and a catalyst do.
- **Position of equilibrium** gauge with a "shifting left/right" arrow. Hover over a
  molecule to see what it is.
- **Key equations** (Le Chatelier's rules and the Kc expression for the chosen reaction)
  and **Exam practice** (three questions with mark schemes). Some presets make a change
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

## Merged in

This simulation replaces `chem_sims/07_Le_Chateliers.html`. From that page it took:
- the cobalt chloride equilibrium (written the correct way round: forming blue CoCl₄²⁻ is endothermic, so heating turns it blue; the old page had the sign reversed);
- the guided tour and the concentration-stress buttons;
- the per-reaction notes on pressure and catalysts;
- the equilibrium-position gauge;
- the Le Chatelier key equations and the exam questions with mark schemes.

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

**Batch settings table.** The batch panel lists every starting setting a run uses: reaction, temperature, volume, starting pressure (0 = set by the volume), number of particles (0 = set by the amount), amount, catalyst, what the mixture starts as, the run length, how long Kc and the yield are averaged over, the first random seed, and whether A ⇌ B runs as moving particles instead of numbers only (it was always numbers only before). Defaults are the old values, so every experiment gives exactly the same results as before. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in from fixed default settings (a preset plus the experiment's own changes), never from the left panel, so they give the same results in any order and do not change the left panel; clicking one only fills the table, and **▶ Run batch** runs it. **↺ Use my left-panel settings** copies the left panel into the table instead.

A ⇌ B runs as numbers only (same chances, no positions), so it is very fast. The others run
the full particle model with no drawing. Each experiment sets every input itself, so its result is the same whatever is in the left panel or was run before. Results from testing (seed 1):

| Experiment | Result | Theory |
|---|---|---|
| Kc from 50 repeat runs (HI, 700 K) | mean 56.4, SD 14.9, SE 2.1 | 50.3 (+12%, 2.9 SE) |
| SD of Kc against number of particles (A ⇌ B, 25–1600) | log–log gradient −0.53 ± 0.05 | −0.5 |
| van 't Hoff, A ⇌ B 300–700 K (800 particles) | ΔH = −6.2 ± 0.1 kJ/mol; every row within 2.7 SE | −6.0 |
| Haber yield against pressure, 100–600 atm (723 K) | 38% → 64%, every point within 2 SE | 40% → 64% |
| Haber yield against temperature, 550–900 K (200 atm) | 58% → 37% | 61% → 37% |
| Time to equilibrium, A ⇌ B, without and with catalyst | 238 ps and 28.7 ps | 243 and 27.9 ps |

**Known limitation.** The HI Kc runs come out a few percent above theory. Only about 13
H₂ and 13 I₂ molecules sit on the bottom of the Kc fraction, so their fluctuations push the
average ratio up (a small-number effect; about +4% is expected from this). This is noted in
the experiment. More particles shrink both the scatter and this bias.
