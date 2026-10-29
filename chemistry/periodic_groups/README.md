# Groups 1 and 7

Alkali metals with water and the halogens, side by side, with a periodic-table strip
that links them. Both trends down the group are explained the same way: bigger atoms,
more inner shells shielding the outer shell, so a weaker pull from the nucleus.
Edexcel International GCSE Chemistry, Topic 2 (Group 1 and Group 7).

Replaces the old pages `chem_sims/16_Group1_Alkali_Metals.html` and
`chem_sims/17_Group7_Halogens.html`. Metal displacement and the reactivity series of
metals are in the **Reactivity and Extracting Metals** simulation (`../reactivity_metals/`).

## How to run

Open `periodic-groups.html` in Chrome or Edge. No install, no internet.

## What it shows

**Group 1 · Alkali metals.** Choose lithium to caesium, the mass of the piece, the volume
and temperature of the water, then drop it in. The piece floats (Li, Na, K) or sinks
(Rb, Cs: denser than water), melts into a ball (all but lithium), fizzes, and for
potassium and below the hydrogen catches fire with the metal's flame colour; caesium
explodes. A gas reading, a thermometer and universal indicator (pH) update live, with
graphs of hydrogen and temperature against time.

**Group 7 · Halogens.** Three pictures:
- *States*: jars of F₂, Cl₂, Br₂, I₂ and At₂ at a temperature you choose (−250 to 350 °C),
  with molecules that vibrate (solid), slide (liquid) or fly (gas), from the real melting
  and boiling points.
- *Test tubes*: the 3 × 3 grid of chlorine, bromine and iodine water added to KCl, KBr
  and KI, with the real colours and an optional hexane layer.
- *Particles*: halogen molecules taking electrons from halide ions (with K⁺ spectators),
  and a graph of how many halide ions have been displaced.

**Shared parts.** The periodic-table strip (click an element to choose it), and the
lower picture: the chosen atom drawn to scale with its shells, outer electron(s) and
the shielding inner shells, beside a bar chart of a property down the group (atomic
radius, ionisation energy, melting and boiling points, density, reaction time;
electronegativity and E° for Group 7). Francium and astatine appear as estimates.

12 presets: lithium, sodium, potassium, rubidium (sinks), caesium (slow motion),
warm water; the halogens at 20 °C, heated to 120 °C, chlorine + bromide, chlorine +
iodide, a reaction that fails (iodine + chloride), the reactivity order (all nine tubes).

Exam practice: the six questions from the two old pages plus live questions that use the
settings (equations, hydrogen volume, concentration, floating or sinking, predicting
francium and astatine, displacement and oxidation/reduction, states at a temperature).

## The model

- Real data: melting and boiling points, densities, metallic and covalent radii, first
  ionisation energies, electronegativities, E° values (CRC Handbook / data tables).
- Group 1 piece: a ball of radius r₀ = (3m / 4πρ)^(1/3) that shrinks at a steady speed v,
  so it lasts t = r₀ / v. v (Li 0.05, Na 0.15, K 0.6, Rb 2, Cs 5 mm/s at 20 °C) is chosen
  to match classroom times, and rises with temperature (Arrhenius, Ea = 30 kJ/mol).
- Hydrogen: V = ½ (m / Ar) × 24 000 cm³. Temperature rise: ΔT = n|ΔH| × heat kept ÷
  (m_water × 4.18), ΔH from enthalpies of formation (Li −222, Na −184, K −197, Rb −195,
  Cs −203 kJ/mol). pH = 14 + log₁₀[OH⁻].
- Displacement X₂ + 2Y⁻ ⇌ 2X⁻ + Y₂: the amount that reacts comes from the equilibrium
  constant K = e^(2FΔE°/RT), solved exactly (Cl₂ +1.36, Br₂ +1.09, I₂ +0.54 V).
- Assumptions and what is left out are listed in the simulation under
  "How the model works (and what it leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep
it. Random parts: the mass of each hand-cut piece (SD 10%), its shape and surface (rate
SD 10%), the gas syringe, thermometer and pH meter, pipettes and the colorimeter.

| Experiment | Result (theory) |
|---|---|
| More reactive down Group 1? (time for 50 mg) | Li 54 (56) s, Na 14.9 (15.4), K 3.9 (4.0), Rb 0.96 (0.99), Cs 0.35 (0.37) s |
| Which metal makes most hydrogen per gram? (50 mg) | Li 86 (86.5) cm³, Na 26 (26.1), K 15 (15.4), Rb 7.0 (7.0), Cs 4.5 (4.5) |
| More sodium, bigger temperature rise? (70% heat kept) | straight line through 0: 200 mg → 2.73 (2.69) °C |
| How alkaline does the water get? | pH 11.64 (10 mg) to 12.95 (200 mg), +1 per ×10 mass |
| How much bromine can chlorine make? | rises 0.05 mmol per cm³, levels at 0.25 mmol after 5 cm³ (limiting reactant) |
| Which halides can bromine displace? | Cl⁻ 0.09%, Br⁻ 0%, I⁻ 100% (equilibrium from E°) |

Results download as CSV.
