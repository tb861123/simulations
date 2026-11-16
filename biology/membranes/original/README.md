# Membranes and Movement

A single, self-contained HTML file (`membranes.html`) for biology. Open it in
Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 2(d) *Movement of substances into and out of cells*: 2.15 diffusion,
osmosis and active transport; 2.16 factors affecting the rate of movement
(surface area to volume ratio, distance, temperature, concentration gradient);
2.17 practical: diffusion and osmosis in living and non-living systems
(agar cubes, potato cylinders, Visking tubing).
**Advanced** follows OCR A level Biology A (H420) Module 2, **2.1.5
Biological membranes**: the fluid mosaic model; factors affecting membrane
structure and permeability (temperature and solvents: the beetroot practical
with a colorimeter); diffusion, facilitated diffusion through channel and
carrier proteins, active transport with ATP, endocytosis and exocytosis;
osmosis and water potential, and the effects of solutions of different
water potential on plant and animal cells. Surface area to volume also links
to H420 3.1.1 *Exchange surfaces*. Tags in the page say which spec each idea
comes from; Fick's law and ψ = ψs + ψp are tagged as beyond the spec wording.

## What it shows

Tabs at the top of the centre panel:

- **🫧 Diffusion and transport**: particles crossing a membrane (a
  phospholipid bilayer drawn with folds for surface area and thickness for
  distance). Processes: diffusion, osmosis (only water crosses; the membrane
  slides as the concentrated side swells), active transport (carrier
  proteins, one ATP per trip, respiration slider; 0 = cyanide), and at A
  level facilitated diffusion through channel proteins or carrier proteins.
  Graphs: concentrations over time (with the well-mixed Fick's-law curve);
  what changes the rate (four small graphs: gradient, temperature, surface
  area, distance, your setting marked); carrier proteins level off against
  simple diffusion (A level).
- **🧊 SA : V (agar cubes)**: pink agar cubes of 1, 2 and 3 cm (plus one of
  your own size) in acid; the colourless edge moves in and each cube's time to
  clear is recorded with realistic error. Graphs: % of each cube reached over
  time; your results, time against SA:V with the model curve.
- **🥔 Osmosis practical**: potato or sweet potato cylinders (or a Visking
  tubing bag of 0.5 mol/dm³ sucrose) in 0–1.0 mol/dm³ sucrose; masses before
  and after (to 0.01 g), % change, three trials, means and the no-change
  concentration. Graphs: % change against concentration; mass over time; (A
  level) plant cells turgid / flaccid / plasmolysed and red blood cells
  burst / normal / crenated, with ψ and ψp.
- **🧬 Membranes (A level)**: the fluid mosaic model (phospholipids drift,
  cholesterol, channel and carrier proteins, glycoproteins, glycolipids,
  extrinsic proteins; proteins denature and pigment leaks with heat or
  ethanol); the beetroot practical (discs at 20–80 °C or 0–100% ethanol for
  30 min, colorimeter readings); endocytosis and exocytosis animation.
  Graphs: absorbance against temperature; against ethanol; fluidity and
  leakiness.

Right panel: what's happening, readings, results tables, sourced cards, key
ideas tagged by spec, exam practice (7 GCSE and 7 A level questions with mark
schemes; several use the numbers on screen: SA:V of your cube, % change from
your masses, your no-change concentration and its water potential) and "How
the model works (and what it leaves out)". Links to Gas Exchange, Nerve
Impulse, Enzymes and Central Limit Theorem.

## Controls

- **Presets** (12): Diffusion down a gradient · Warmer: faster diffusion ·
  Surface area and distance · Osmosis · Active transport · Agar cubes and
  SA:V · Potato osmosis practical · Visking tubing model cell · and at A level:
  Water potential and plasmolysis · Channel and carrier proteins · Fluid
  mosaic model · Beetroot practical.
- Particles: process, concentrations each side, temperature, surface area,
  distance, number of carrier/channel proteins (A level; and for active
  transport), respiration, "the cell uses it up", show water molecules.
- Agar: your extra cube's side, acid concentration, temperature.
- Osmosis: tissue, cylinder diameter, time in the solutions.
- Membrane: show (fluid mosaic, beetroot, bulk transport), temperature,
  ethanol, what to vary in the beetroot practical.
- 🧪 New trial (new cubes, cylinders or discs; results are kept) and 🗑 Clear
  results.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): how many particles stand for each concentration (Low half, High
  1.6×, Ultra 2.5× Medium) and drawing detail (lipids, cholesterol, shading).
  More particles give smoother, less random graphs; the batch run always uses
  Medium.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Particles move in straight lines with small random turns; speed ∝ √D,
  D ∝ T ÷ viscosity of water (Stokes–Einstein, Vogel viscosity). A particle
  reaching the membrane crosses with probability ∝ surface area ÷ thickness:
  rate = k (n_left − n_right), k = P × length × v ÷ π (Fick's law).
- Osmosis: equal total particles each side at the start; water crosses; the
  membrane is pushed by the particles and held by a spring.
- Carriers: an empty carrier catches a molecule hitting its binding site
  (hits at λ = n × 40 × v ÷ π a second), carries it 1.2 s, resets 0.3 s:
  rate = 1 ÷ (1/λ + 1.5 s) per carrier.
- Agar: front x = √(2 D t c_acid ÷ c_alkali), D(HCl) ≈ 3 × 10⁻⁹ m²/s at 20 °C,
  0.05 mol/dm³ alkali; time to clear = (L/2)² ÷ (2 D c_acid/c_alkali).
- Potato: dv/dt ∝ (ψ_solution − ψ_cells) × (4 ÷ diameter);
  ψ_cells = −950/v + max(0, 250 + 4000(v − 1)) kPa; half the mass is
  osmotically active water. True no-change point 0.257 mol/dm³ (−700 kPa).
- Beetroot: leakage = S-shaped curves (half at 55 °C, or 35% ethanol), 30 min.

## Data and sources (rounded; approximate where marked)

- Water potential of sucrose solutions at about 20 °C (0.1 → 1.0 mol/dm³:
  −260, −540, −820, −1120, −1450, −1800, −2180, −2600, −3050, −3510 kPa):
  standard textbook table, approximate.
- Diffusion coefficients: HCl about 3.3 × 10⁻⁹ m²/s at 25 °C, O₂ about
  2.1 × 10⁻⁹ m²/s (CRC Handbook of Chemistry and Physics; approximate).
  Viscosity of water: Vogel equation (1.00 mPa·s at 20 °C).
- Blood plasma about −700 kPa (about 290 mOsm/kg; approximate). Normal saline
  0.9% NaCl.
- Cystic fibrosis: about 11,000 people in the UK (UK Cystic Fibrosis Registry
  annual data report, 2022; approximate).
- Potato, beetroot, carrier and membrane constants are illustrative, chosen to
  match typical class results.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Double the gradient, double the rate?** Left 0 → 200 mmol/dm³: net rate
   rises in a straight line (Fick); means within about 10% of theory
   (0 → about 7 particles/s), SD about 1 particle/s.
2. **How much faster when it is warmer?** 0 → 60 °C: 3.7 → 7.9 particles/s
   against theory 3.9 → 7.8 (the rate about doubles; mostly from viscosity).
3. **Bigger cubes: how much longer?** 0.5 → 4 cm: 53 s → 3311 s against
   52 s → 3333 s; log–log gradient 1.99 (theory 2).
4. **How good is a class's no-change concentration?** 100 classes of 24
   cylinders: mean 0.257 mol/dm³ (true 0.257), SD 0.02.
5. **Do carrier proteins have a top speed?** 0 → 200 mmol/dm³: 1.0 → 3.1
   per s, levelling off towards 4 per s; theory 1.2 → 3.1; simple diffusion
   would reach 12.9.
6. **Beetroot: when do membranes leak?** 20 → 80 °C: absorbance 0.09 → 1.61,
   steepest between 45 and 65 °C; means within about 3% of the model curve.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
