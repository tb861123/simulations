# Ecosystems and Sampling

A single, self-contained HTML file (`ecosystems.html`) for biology. Open it in
Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 4 *Ecology and the environment*: population, community, habitat and
ecosystem (4.1); practical: population size in two areas with quadrats (4.2);
distribution and biodiversity with quadrats (4(a)); trophic levels, food
chains and webs, pyramids of number, biomass and energy (4.6–4.7); energy
transfer and why only about 10% passes on (4.8–4.9); the carbon cycle (4.10);
the nitrogen cycle with decomposers and nitrifying, nitrogen-fixing and
denitrifying bacteria (4.11B, Biology only); human influences: eutrophication
and deforestation (4(d)). Point numbers checked against teaching resources
that quote the specification (section-level references where unsure).
**Advanced** follows OCR A level Biology A (H420): **4.2.1 Biodiversity**
(random and non-random sampling, Simpson's index of diversity); **6.3.1
Ecosystems** (biomass transfer and efficiency, NPP = GPP − R, recycling of
nitrogen and carbon, succession, measuring distribution and abundance);
**6.3.2 Populations and sustainability** (conservation and preservation,
sustainable management of timber and fish). **PAG3** sampling techniques.
Statistics: Spearman's rank and Student's t-test. Succession is not in 4BI1
and is tagged "A level (H420 6.3.1)" at Standard; maximum sustainable yield
is tagged "beyond the H420 wording". Capture–recapture is in
biology/predator_prey (linked, not duplicated).

## What it shows

Tabs at the top of the centre panel:

- **🍃 Food webs**: an oak woodland or a pond web, arrows from food to feeder
  with packets of energy moving along them. Click a species to remove it: its
  prey get "↑ fewer predators", feeders get "↓ less food" or "↓↓ no food
  left". Graphs: energy at each level on a log scale from UK sunlight, with
  the efficiency of each step and what happens to the producers' energy
  (respiration, decomposers, next level; GPP, R, NPP at A level); pyramids of
  numbers, biomass and energy for three chains (inverted numbers for an oak,
  inverted biomass for plankton); real data from Silver Springs.
- **♻️ Nutrient cycles**: the nitrogen cycle (months) or carbon cycle (years)
  as stores with packets of atoms moving at random along the arrows; bacteria
  processes in blue. Nitrogen: soil oxygen (waterlogged to aerated),
  temperature, fertiliser, rainfall, legumes (Rhizobium), harvesting. Carbon:
  burning fossil fuels, deforestation. Graphs: stores over time with the
  expected (averaged) curves; now against the steady state; nitrate and
  ammonium against soil oxygen. Link to the climate Carbon Cycle sim.
- **🔲 Quadrats** (PAG3): a 40 m × 20 m field beside a wood with five species
  that grow in clumps and prefer different light (bluebell, ground ivy,
  buttercup, dandelion, daisy) and patchy grass. Random quadrats (whole field,
  zone A near the wood, zone B in the open), a belt transect every 2 or 4 m,
  or quadrats placed by clicking (and possibly biased); 0.25 m² or 1 m²; a
  close-up of the last quadrat with its 10 × 10 grid for % cover; a light
  meter reading. Results table. Graphs: mean density ± SE against the true
  density; running mean; kite diagram; at A level Simpson's index for each
  zone with the working, Spearman's rank (light against a species, critical
  value and conclusion), and a t-test between zones A and B.
- **🌱 Succession**: a 60 × 30 grid from bare rock (primary), an abandoned
  field or after a fire (secondary): pioneers, grasses, shrubs, birch, oak
  climax; soil builds as plants decompose; grazing and burning give
  deflected succession. Graphs: stages over time with the well-mixed
  prediction; soil depth and plant species (rise, then a small fall at
  climax).
- **🌍 Human effects**: a lake next to farmland (fertiliser → algal bloom →
  plants die → decomposers use the oxygen → fish die); a forest with felling,
  replanting and (A level) selective felling (cover, carbon store, CO₂
  released, soil erosion, species); at A level a fishery with catch rate and
  the maximum sustainable yield curve.

Right panel: what's happening, readings, results tables, real-data cards,
conservation and preservation (A level), key ideas tagged by spec, exam
practice (9 GCSE and 9 A level questions with mark schemes; on-screen numbers
for efficiency, population estimate, Simpson's index and Spearman's rank) and
"How the model works (and what it leaves out)". Links to Predator and Prey
(capture–recapture), Fieldwork Sampling, Carbon Cycle and Central Limit
Theorem.

## Controls

- **Presets** (12): Food web · Energy and pyramids · Carbon cycle · Nitrogen
  cycle · Quadrats: two areas · Transect and kite diagram · Eutrophication ·
  Deforestation · and at A level: Succession · Simpson's index (PAG3) ·
  Spearman's rank and t-test · Sustainable fishing.
- Food web: ecosystem, chain for the pyramids, photosynthesis efficiency,
  transfer efficiency, number of levels. Cycles: cycle, soil oxygen,
  temperature, fertiliser, rainfall, legumes, harvest, burning, deforestation.
  Quadrats: method, zone, transect interval, quadrat size, species to follow;
  ➕ one / ten quadrats, 🗑 clear, 🎲 new field. Succession: start, grazing,
  burning interval. Human effects: scene, fertiliser, felling, replanting,
  selective felling, fishing rate.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  energy packets on the web (0 / 3 / 6 / 10 per arrow), atom dots and moving
  atoms in the cycles, the field's grass resolution and plant drawings, trees
  in the succession and forest, lake bubbles and bacteria, fish. Picture only;
  the model and the batch runs are the same at every level. The field is drawn
  once and cached; every view draws in under about 3 ms at 1920×1080.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Energy: sunlight 3.6 million kJ/m²/yr; GPP = ps% of it; R = half of GPP;
  each step passes the transfer efficiency on; half of each level is not eaten
  and 30% of what is eaten is egested; the rest is respiration.
- Cycles: each packet of atoms leaves its store with chance (sum of rates) ×
  Δt along one arrow chosen in proportion to its rate (per month for
  nitrogen, per year for carbon). Nitrification ∝ oxygen; denitrification ∝
  (1 − oxygen)²; bacteria and decomposers × 2 per 10 °C. Nitrogen enters by
  fixation (3 per month, +12 with legumes) and fertiliser; it leaves by
  denitrification, leaching and harvest. Steady state = solution of the
  averaged linear equations. Fossil fuels start with 30% of the carbon.
- Field: light = 0.15 + 0.85(1 − e^(−x/7 m)); each species a clustered
  (Thomas) pattern: parents at random, about 6 × suitability offspring within
  about 0.45 m; suitability a bell curve in light. Grass: a smooth random
  mask, more likely in the light. Exact counts; light meter ±4%. True
  densities and spreads from all plants and from 3000 test quadrats.
- Succession: chance of moving up a stage = r × (0.15 + 0.85 × fraction of the
  8 neighbours at that stage or higher), if the soil is deep enough (0, 1.5, 6,
  12, 20 cm); soil grows 0.06–0.35 cm a year; grazing reverts shrubs (50% ×
  grazing a year), birch (25%) and oak (4%) to grassland. Well-mixed
  prediction: the same rules with global fractions.
- Lake (days): algae grow at 0.4 N/(N + 2) − 0.1 per day; light at the bottom
  e^(−0.12 × algae); decomposers break down 15% of dead matter a day using
  0.8 mg of oxygen per mg; re-aeration 0.3 per day; fish die below 4 mg/dm³.
- Forest: 800 plots in 100 ha; trees take 30 years to grow; 250 t carbon per
  ha; half the carbon of felled trees released as CO₂; 40 t/ha/yr soil loss
  on bare ground; species S = 50 (cover)^0.25.
- Fishery: logistic growth, r = 0.5 a year, K = 100 thousand t, lognormal
  random years (σ = 0.25); catch = h × stock; long-run catch hK(1 − h/r);
  MSY = rK/4 at h = r/2.

## Data and sources

- Silver Springs, Florida (H. T. Odum, 1957): 20 810, 3368, 383, 21 kcal/m²/yr
  for producers, herbivores, carnivores and top carnivores; decomposers 5060.
- FAO Global Forest Resources Assessment 2020: deforestation about 10 million
  ha a year in 2015–2020; net forest loss about 4.7 million ha a year
  2010–2020.
- North Sea cod spawning stock: roughly 250 000 t in the early 1970s to under
  50 000 t by the mid-2000s (ICES assessments; from memory, approximate).
- UK sunlight about 1000 kWh/m² a year (approximate). Pyramid values and all
  model rates are illustrative.
- Spearman's and t critical values (p = 0.05, two-tailed): standard tables.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How much energy reaches each level?** 10% efficiency: 100, 9.99, 0.996,
   0.099, 0.0099% against 100, 10, 1, 0.1, 0.01%.
2. **Waterlogged soil: where does the nitrate go?** soil oxygen 0 → 1: 0 → 40
   nitrate atoms against the steady state 0 → 45 (runs scatter about ±√n).
3. **Random quadrats: estimating a population** (10 quadrats, daisies):
   mean 7760 (SD 1820) against the true 7730 (predicted SD 1860).
4. **More quadrats, better estimates**: SD falls from 4500 (2 quadrats) to
   800 (50); means stay near 7730.
5. **Simpson's index from quadrats** (zone A): 0.58 with one quadrat rising to
   0.73 with 40, against the true 0.748 (small samples underestimate D).
6. **Two zones: is the difference significant?** buttercups, 10 + 10
   quadrats: mean t = 2.79 (SD 0.98) against an approximate expected 2.49;
   about a quarter of runs fall below the critical value 2.10.
7. **Grazing and deflected succession**: woodland after 150 years 98, 21, 3.9,
   1.4, 0.7, 0.5% for grazing 0 → 0.5, against the well-mixed 99, 25, 4.1, 1.3,
   0.6, 0.3%.
8. **Fishing: catch against fishing rate**: peaks at 12.6 thousand t a year at
   h = 0.25 (theory 12.5), falling to about 0 at h ≥ 0.5.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
