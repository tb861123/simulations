# Energy Changes

Exothermic and endothermic reactions: reaction profiles and activation energy, measuring
ΔH in a polystyrene cup (Q = mcΔT), burning fuels to heat water, and working out ΔH from
bond energies.
Edexcel International GCSE Chemistry, Topic 3 (energetics).

Replaces the old page `chem_sims/09_Energy_Changes.html`. Rates, collisions and how a
catalyst speeds a reaction up are in **Collision theory** (`../collision_theory/`); what
burning fuels makes is in **Organic chemistry** (`../organic_chemistry/`).

## How to run

Open `energy-changes.html` in Chrome or Edge. No install, no internet.

## What it shows

1. **Profiles.** The old page's reaction profile with a moving "reaction" you can drag:
   reactant and product levels, the activation-energy arrow, the ΔH arrow, an optional
   catalyst (the old route dashed), bond-breaking and bond-making labels, heat particles and
   the surroundings' thermometer. Below, the atoms of the molecules separate and re-join in
   step with the profile. Reactions: methane burning, neutralisation, thermal decomposition
   of calcium carbonate, photosynthesis (the old four), plus hydrogen burning, hydrogen
   peroxide decomposing and ammonium nitrate dissolving. A sketch of the particles' energies
   shows how a lower Eₐ lets more of them react.
2. **Cup.** Neutralisation, zinc + copper(II) sulfate, magnesium + hydrochloric acid, and
   dissolving ammonium nitrate, potassium nitrate or calcium chloride, in a polystyrene cup
   (with or without a lid) or a glass beaker, stirred or not. The reagent goes in at 3 min;
   readings every 30 s build the temperature–time graph; ΔT comes from the highest
   (lowest) reading or by extrapolating the cooling line. Q = mcΔT and ΔH are worked out
   live and compared with the data book. A close-up shows water particles moving faster as
   the liquid warms.
3. **Fuels.** A spirit burner on a balance heats water in a copper can (or glass beaker)
   until it is a set amount warmer. Methanol to pentan-1-ol; draught screen and can height.
   Energy per gram and ΔHc are worked out and compared; a bar shows where the energy went
   (water, can, air, incomplete combustion).
4. **Bonds.** Ten reactions: molecules break apart into atoms and re-form, with an energy
   level diagram (bonds broken up, bonds made down, ΔH) and a bond tally table.

12 presets: methane burns, a catalyst lowers Eₐ, endothermic limestone, neutralisation in a
cup, cold pack (ammonium nitrate), zinc + copper sulfate (extrapolation), glass beaker with
no stirring, ethanol in a spirit burner, no draught screen, pentanol, bond energies of
burning methane, N₂ + O₂ → 2NO.

Picture detail (Low / Medium / High / Ultra) sets the number of moving particles and glow.

Exam practice: the three questions from the old page plus live questions for each part
(profile sketch, surroundings, catalyst; Q = mcΔT and ΔH with the limiting reactant;
energy per gram, ΔHc and sources of error; bond-energy calculation).

## The model

- Cup: C = (mass of liquid × 4.18) + C(cup); the reaction goes as (n − x)/τ; heat lost at a
  fixed % of the extra temperature per minute (1.2% lid, 3% no lid, 6% glass).
  The student's ΔH = −m c ΔT ÷ n with m = mass of liquid only.
- Fuel: burn rate per alcohol; heat reaching the water 45% with a screen (28% without),
  falling with height; 0–8% incomplete combustion; 0.02 g evaporates from the wick.
- Bond energies (kJ/mol): H–H 436, C–H 413, C–C 347, C=C 612, C–O 358, C=O 805, O–H 464,
  O=O 498, Cl–Cl 243, H–Cl 432, Br–Br 193, H–Br 366, I–I 151, H–I 299, N≡N 945, N–H 391,
  O–O 146, N=O 631. ΔH = bonds broken − bonds made.
- Data-book ΔH, ΔHc and specific heat capacity 4.18 J/g/°C. Every assumption is listed in
  the simulation under "How the model works (and what it leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep it.
Random parts: measuring cylinders, balance, thermometer readings, and how much of the
flame's heat reaches the can.

| Experiment | Result (theory) |
|---|---|
| Temperature rise as alkali is added (25 cm³ 1 M HCl) | peak 6.6 °C at 25 cm³ (6.8 °C no heat lost), 4.5 °C at 50 cm³ (4.55) |
| How close does a class get to −57 kJ/mol? (100 repeats) | mean −55.2, SD 0.5 kJ/mol (data book −57.1) |
| Heat loss: how wrong does ΔH get? (0–10% per min) | −55.8 to −53.4 kJ/mol (−57.1) |
| Endothermic: temperature fall vs mass of NH₄NO₃ | gradient −1.45 °C/g (−1.54 with no heat gained) |
| Energy from the alcohols | −267, −495, −719, −936, −1145 kJ/mol (data −726 … −3329); gradient −220 per C (−651) |
| How good are bond energies? | e.g. CH₄ −818 (−802), C₂H₅OH −1276 (−1277), NO +181 (+181) kJ/mol |

Results download as CSV.
