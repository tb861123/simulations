# Reactivity and Extracting Metals

The reactivity series from start to finish: how metals react with water, steam and
acid; displacement reactions in salt solutions (with the temperature rise and the
electrons that move); and how each metal's place in the series decides how it is
extracted, from the blast furnace to the electrolysis of aluminium.
Edexcel International GCSE Chemistry, Topic 2 (reactivity series, extraction of metals,
oxidation and reduction).

Replaces the old pages `chem_sims/12_Reactivity_Displacement.html` and
`chem_sims/18_Extraction_Metals.html`. Group 1 metals with water and halogen
displacement are covered in detail in the **Groups 1 and 7** simulation
(`../periodic_groups/`).

## How to run

Open `reactivity-metals.html` in Chrome or Edge. No install, no internet.

## What it shows

A strip across the top shows the series K, Na, Li, Ca, Mg, Al, (C), Zn, Fe, (H), Cu, Ag,
Au, coloured by extraction method; click a metal to choose it.

1. **Water, acid.** Any metal with cold water, steam or dilute hydrochloric acid, as ribbon,
   granules or powder. Hydrogen collects in a gas syringe; a thermometer shows the heat
   released; the equation and observations are listed. Steam is shown as a heated tube
   with wet mineral wool (magnesium burns with a white glow). Aluminium is slow to start
   because of its oxide layer. Group 1 metals with acid are flagged as explosive.
2. **Displacement.** Mg, Al, Zn, Fe, Cu or Ag (powder or a strip) in CuSO₄, FeSO₄, ZnSO₄,
   AgNO₃ or MgSO₄, in a polystyrene cup. The solution's colour changes, the displaced metal
   coats the solid, and the temperature rises; the full, ionic and half-equations show
   which species is oxidised and which reduced. A results grid in the right panel builds the
   series from the ticks.
3. **Extraction.** *Method*: each metal's ore, method and year of first extraction, and a
   close-up of heating its oxide with carbon (it works only below carbon). *Blast furnace*:
   the charge falling, hot air, the five reactions in their zones, slag and molten iron.
   *Electrolysis*: aluminium oxide in molten cryolite, ions moving to the electrodes, the
   anodes burning away, with Faraday's law for the output and the energy per kg.

Both the acid and displacement parts have a particle close-up: metal atoms lose electrons
and leave as ions; H⁺ ions (or metal ions) take the electrons.

12 presets: calcium in water, magnesium and steam, magnesium in acid, aluminium's oxide
layer, zinc + copper sulfate, copper + magnesium sulfate (fails), magnesium + copper
sulfate (biggest rise), copper + silver nitrate, reactivity decides the method, carbon
reduces copper oxide, the blast furnace, electrolysis of aluminium.

Exam practice: the six questions from the two old pages plus live questions from the
settings (equations, hydrogen from a mass of magnesium with a limiting reactant, Q = mcΔT
and ΔH, half-equations, reacting masses of iron, Faraday for aluminium).

## The model

- Hydrogen rate = k × area × [acid] × e^((Ea/R)(1/293 − 1/T)), with k for each metal and
  liquid chosen to give classroom-like times (not measured). Area: 60, 3 or 300 cm² per
  gram for ribbon, granules or powder, shrinking as mass^(2/3). The acid is used up.
- Displacement happens only if the metal is above the metal in the salt (E°). Rate is a
  made-up k × ΔE° × area × [ion]. ΔH per mole of metal = ΔHf(metal ion) − (x/y) ΔHf(other
  ion), e.g. Zn + Cu²⁺ −218.7 kJ/mol. ΔT = n|ΔH| ÷ (mass of solution × 4.18), with heat lost
  from the cup at a steady fraction per minute.
- Iron = ore × purity × 111.7 ÷ 159.7. Aluminium = efficiency × (I t ÷ 3F) × 26.98 g.
- Assumptions and what is left out are listed in the simulation under
  "How the model works (and what it leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep
it. Random parts: balance, surface area of the pieces, room temperature, stopwatch, gas
syringe, thermometer, measuring cylinder, ore analysis, slag losses, current efficiency.

| Experiment | Result (theory) |
|---|---|
| Which metal reacts fastest with acid? (time for 20 cm³) | Mg 12 (13) s, Al 106 (109), Zn 216 (226), Fe 815 (852) s; Cu never |
| How much hydrogen from 0.1 g of each metal? | Mg 98 (98.7), Al 133 (133.4), Zn 36 (36.7), Fe 42 (43.0) cm³ |
| Temperature rise vs mass of zinc (25 cm³ 0.5 M CuSO₄) | straight line, then levels off at 25.6 °C after 0.82 g (theory 26.2 °C, no heat loss) |
| Further apart in the series, bigger rise? | Mg 63.3 (63.6), Al 49.5 (50.1), Zn 25.7 (26.2), Fe 18.0 (18.4) °C; Cu, Ag 0 |
| How much iron from 1 tonne of ore? | gradient 6.84 kg per % (6.99 ideal; 2% lost in slag) |
| Aluminium from a 300 kA cell | 2240 kg in 24 h (2247 at 93%, 2416 at 100%) |

Results download as CSV.
