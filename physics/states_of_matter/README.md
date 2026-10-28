# States of Matter

A single, self-contained HTML file: **open `states-of-matter.html` in Chrome or
Edge**, with no install and no internet. It is listed under both Physics and
Chemistry.

It merges and replaces two old pages, keeping all of their controls,
explanations and exam questions:

- WJEC Physics Streamlit page *Specific Heat Capacity & Latent Heat*
  (`physics_sims/pages/28_Specific_Heat_Latent_Heat.py`): heating curve,
  Q = mcΔT, Q = mL, Q = Pt, stage energies and times, method of mixtures.
- Edexcel iGCSE Chemistry page *Particle Theory & States of Matter*
  (`chemistry/chem_sims/01_Particle_Theory.html`): the particle model of
  solids, liquids and gases, changes of state, the guided tour, key equations.

One particle view shows every state. In a solid the particles vibrate about
lattice sites (bonds drawn); in a liquid they stay touching but slide past each
other; in a gas they fly freely and hit the walls (hits per second shown as
"pressure"). Speed ∝ √T (KE ∝ T in kelvin), colour = speed (blue → yellow → red).
During melting and boiling the right fraction of particles has changed state,
starting at the surface, with bubbles while boiling. Hover over a particle to
inspect it.

## Controls

- **Level:** Standard (GCSE / iGCSE) or Advanced (A level: time per stage,
  method of mixtures calculator, advanced physics notes).
- **Guided tour** (5 steps: solid, melting, liquid, boiling, gas) from the chemistry page.
- **What controls the substance?**
  - *Set the temperature:* temperature slider, or drag the thermometer (as on the
    chemistry page). At exactly the melting or boiling point the substance is half
    changed.
  - *Heater (energy):* mass 0.1–5 kg, heater power 100–5000 W, starting
    temperature, insulation (perfect, lagged 0.5 W/K, open beaker 2 W/K, very poor
    8 W/K, to a room at 20 °C). **🔥 Heat** and **❄ Cool** (energy removed at the
    same rate) give heating and cooling curves. Speed ½×–10× (1× = 1 minute of
    heating per second).
- **Substances:** water, ethanol, lead, aluminium (from the physics page) and iron
  (from the chemistry page).
- **Quality** (Low 40 / Medium 90 / High 160 / Ultra 300 particles); canvases are
  sized for the screen's pixel ratio. The physics and batch runs do not depend on it.

## Views and readouts

Heating / cooling curve (temperature against energy supplied, or against time),
coloured by stage, with the plateaus labelled ΔQ = mL and the path heated (yellow)
and cooled (blue); tiles for temperature (°C and K), state and fraction changed,
particle speed and mean KE relative to 20 °C, energy supplied, time, wall hits;
stage energies (heat to melting point, melt mL_f, heat liquid, boil mL_v, heat gas,
total and total time at P); Advanced: time per stage and the method of mixtures
calculator (T_f, Q lost, Q gained, working). Key equations box, 📐 Physics notes,
**📝 Exam practice** (4 live thermal-physics questions from the physics page, 3 if
the substance has no boiling stage, and the 3 particle-theory questions from the
chemistry page, each with marks and a "Show mark scheme" toggle), and "How the
model works (and what it leaves out)".

## Presets

Ice to steam (heating curve) · Steam to ice (cooling curve) · A solid (−30 °C) ·
A liquid (45 °C) · A gas (160 °C) · Ethanol · Lead · Iron (5 kW) · Poor insulation
(500 W, 8 W/K: levels off at about 82 °C and never boils).

## The model

The energy supplied Q is tracked; the curve is built from Q = mcΔT for each state
(its own c) and Q = mL for each change of state, so the temperature and the
fraction melted or boiled follow from Q. Heat loss/gain = k(T − 20 °C).
Left out: 3D, realistic particle numbers and spacing (gas particles would be about
10× further apart), collisions between gas particles, c changing with temperature,
pressure other than 1 atm, temperature differences inside the sample, the
container's heat capacity. Aluminium is heated only to 60 °C above its melting point.

## Batch run

Model class experiments with random thermometer and timing errors (normal
distributions) and heat lost to or gained from the room. Repeat → histogram with
mean, SD, standard error, theory and predicted spread; Sweep → mean ± 1 SD with the
theory line and a fitted line or log–log gradient; CSV download. Every one-click
experiment sets all of its own inputs. Results from the test run:

**Batch settings table.** The batch panel lists every starting setting the chosen outcome uses (substance; mass, heater power, heat loss to the room, starting temperature, heating time, thermometer and timing errors; and, for the method of mixtures, both masses, specific heat capacities and starting temperatures and the block's cooling on the way). Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in, and **↺ Use my left-panel settings** copies the left panel into it.

| Question | Result |
|---|---|
| Measuring c of water: what do heat losses do? (50 W, 10 min, loss 0–2 W/K) | 4270 ± 150 J/kg/K with no loss (theory 4200); rises steadily to 5640 at 2 W/K |
| How precise is one measurement of c? (200 runs) | mean 4196, SD 217 (theory 4200, predicted SD 208), −0.2 standard errors |
| Does doubling the mass double the time to boil? (2 kW, 0.2–2 kg) | straight line, gradient 168 s/kg (theory 168) |
| Time to boil against heater power (1 kg, 1 W/K loss) | log–log gradient −1.055 (theory −1 with no loss); 1303 s against 1120 s at 300 W, 114 s against 112 s at 3 kW |
| Measuring the latent heat of fusion of ice (room gain 0–2 W/K) | 333 900 J/kg with no gain (theory 334 000), falling to 238 500 at 2 W/K |
| Method of mixtures (copper into water, 200 runs) | mean 25.15 °C against ideal 25.47 °C (−8 standard errors: a real systematic error from the block cooling in transit) |
