# Foxes and Rabbits

A single, self-contained HTML file (`predator-prey.html`) for GCSE and iGCSE
biology, with a Standard (GCSE) / Advanced (A level) switch. It shows predator–prey cycles on a field of grass and compares them
with the Lotka–Volterra equations and logistic growth. No installation and
no internet are needed: open `predator-prey.html` in Chrome or Edge, with no
install. Pick a preset and press **Start**.

## What it shows

A field of grass patches (each 50 m × 50 m), with rabbits and foxes (and,
optionally, field voles as a second prey). Grass regrows; rabbits hop about,
eat grass, breed when well fed and die of hunger, old age or foxes; foxes
roam, hunt, breed when well fed and starve when prey are scarce. The graphs
show the populations over time and a phase plot of rabbits against foxes
(the loop). **Show Lotka–Volterra curve from here** fits the equations to the
run so far and draws their curve from the current point.

**Controls:** field size, starting rabbits, foxes and voles, refuges
(warrens), rules (realistic or Lotka–Volterra-like), random seed; grass
regrowth rate, rabbit breeding rate, fox hunting success, fox energy needs,
the age when young foxes can breed, fox culling, years to simulate. **Events:** rabbit
disease (kills 80%), cull half the foxes, add 10 foxes, add 50 rabbits.

**Quality** (below the field): the size of the grass cells, Low (50 m),
Medium (25 m, the default), High (17 m) or Ultra (12.5 m). Finer cells look
smoother and let grazed patches follow the rabbits, but run slower (Ultra on
a big 80 × 80 field drops to about 30 frames a second). A rabbit always
grazes a 50 m × 50 m area centred on itself, grass regrows at the same rate
per week and a full field holds the same grass, so populations behave the
same at every setting (no-fox carrying capacity 671–677 rabbits at all four).
**Batch runs always use Low**, whatever the setting, so their results are
repeatable (the batch settings table can change it).

**Readouts:** measured cycle period, Lotka–Volterra period 2π/√(ad), how far
fox peaks lag behind rabbit peaks, recent peak sizes, animals per hectare and
per km², and (with no foxes) the logistic fit and carrying capacity.

## Levels and specification

**Standard / Advanced switch** (top of the left panel, remembered in the
browser). Standard keeps the GCSE simulation as it was; Advanced keeps all of
it and adds A level views, readings, key ideas, presets and exam questions.
Advanced-only presets are hidden at Standard. Batch runs are the same at both
levels.

Levels: Standard = Pearson Edexcel International GCSE Biology (4BI1);
Advanced = OCR A level Biology A (H420). The right panel has **Key ideas**,
each tagged with its spec ("4BI1 …", "A level (H420 …)" or "Beyond the
spec"), and **📝 Exam practice**: 6 GCSE questions, plus 6 A level questions
at Advanced, each with a mark scheme. Questions marked "Your…" use the numbers
on screen; **↻ Use the numbers on screen now** rebuilds them. Spec references
are given to the topic (4BI1 section and sub-section letter, H420 topic
number), not to individual statement numbers.

- **Standard (4BI1 4(a) The organism in the environment; 4(b) Feeding
  relationships):** populations, biotic and abiotic factors, quadrats, food
  chains and energy transfer. Predator–prey cycles, the Lotka–Volterra
  equations and the logistic fit are tagged "Beyond the spec".
- **Advanced (H420 6.3.2 Populations and sustainability; 6.3.1 Ecosystems):**
  a virtual **mark–release–recapture** practical (PAG3 sampling): set the
  trap catch (5–35%), catch and mark (marked rabbits get a blue ring), let
  the field run, recapture, and the table records n₁, n₂, m, the Lincoln
  index estimate n₁n₂/m and the true number, with the mean and SD of up to 10
  estimates. Trapping uses its own random numbers, so the field and batch
  runs are unchanged (a "marked" flag is carried with each animal). Readings
  for limiting factors: grass left and the share of rabbits caught.
- **A level presets:** Mark–release–recapture, Competition for grass
  (rabbits and voles), Bigger field, bigger K.

## Presets

Classic cycles · Too many foxes (crash) · No foxes (logistic growth) ·
Refuges stabilise · Small island (extinction by chance) · Invasive predator ·
Culling foxes · Voles as a second prey · Lotka–Volterra-like (the equations'
assumptions) · Fast-growing grass (paradox of enrichment).

## The model

- Grass: g → g + r(1 − g) each week.
- Rabbits: eat up to 0.3 units of grass a week (8 energy per unit), use 1
  energy a week, breed from 12 weeks old when well fed, 1% weekly death from
  other causes.
- Foxes: up to 5 attacks a week on prey within 2 patches; a rabbit gives 1
  energy, a vole 0.25; they use the "energy needs" amount each week, breed
  from 6 months old when well fed, and starve at zero energy.
- Lotka–Volterra: dR/dt = aR − bRF, dF/dt = cRF − dF. The rates come from
  the run's own event counts after the first year:
  a = (rabbit births − rabbit deaths not caused by foxes) ÷ Σ R,
  b = rabbits eaten ÷ Σ RF, c = fox births ÷ Σ RF, d = fox deaths ÷ Σ F
  (sums over weeks). Theory period 2π/√(ad); equilibrium d/c rabbits, a/b
  foxes. An older fit to the shape of the cycles is also reported; it gives
  periods about 25–30% too short.
- **Lotka–Volterra-like rules** remove the extra realism: unlimited grass,
  rabbits breed at a fixed rate from birth and die only when caught, foxes
  hunt anywhere in the field and catch each nearby rabbit with a small fixed
  chance (so catches ∝ R × F), each rabbit eaten gives a 10% chance of a cub,
  and foxes die at a fixed 4% a week. Then a = breeding rate × 3 ÷ 2 and
  d = 0.04 per week follow from the rules: period 2π/√(ad) ≈ 2.2 years. Logistic: N = K/(1 + ((K − N0)/N0)e<sup>−rt</sup>).

All assumptions and simplifications are listed in the app under **How the
model works (and what it leaves out)**.

## Batch run

**Batch settings table.** The batch panel lists every starting setting a run uses: field size, rabbits, foxes and voles at the start, refuges, grass regrowth, rabbit breeding, hunting success, fox energy needs, fox maturity age, culling, years per run, the rules (realistic or Lotka–Volterra-like) and the random seed, plus four things that used to be fixed: the Lotka–Volterra-like cubs per rabbit eaten (0.1) and fox death chance (0.04 per week; the 2π/√(ad) theory uses it too), rabbits safe per warren (6) and the batch grass resolution (1 cell per patch = Low). Defaults are the old values, so every experiment gives exactly the same results as before. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in from fixed default settings (a preset plus the experiment's own changes), never from the left panel, so they give the same results in any order and do not change the left panel; clicking one only fills the table, and **▶ Run batch** runs it. **↺ Use my left-panel settings** copies the left panel into the table instead.

**📊 Batch run** repeats the model many times (Repeat) or changes one setting
in steps (Sweep). Results can be downloaded as CSV. Experiments:

1. How often do foxes and rabbits both survive? (the equations say always)
2. Is the cycle period what Lotka–Volterra predicts? (realistic rules;
   measured 5.06 years against 5.16 years from the counted rates; the old
   shape fit said 3.60)
3. With Lotka–Volterra-like rules, is the period 2π/√(ad)? (measured 2.37
   years against 2.22; the small excess is from large, chance-driven swings
   and shrinks in bigger fields)
4. Why are real cycles slower than Lotka–Volterra? (sweep the age when young
   foxes can breed: the measured period rises from about 2.4 to about 3–4
   years while the Lotka–Volterra line stays at 2.2)
5. Do small fields lose their foxes by chance? (sweep field size)
6. With no foxes, do rabbits grow logistically? (mean ± SD of runs with the
   best-fit logistic curve and carrying capacity)
7. Do refuges help foxes and rabbits live together? (sweep refuges)
8. Does culling foxes mean more rabbits? (sweep culling)
