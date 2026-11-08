# Enzymes

A single, self-contained HTML file (`enzymes.html`) for biology. Open it in
Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 2(c) *Biological molecules*: 2.10 enzymes as biological catalysts;
2.11 temperature and the shape of the active site; 2.12 practical:
temperature and enzyme activity; 2.13B and 2.14B pH and the active site, and
its practical (B = Biology only, not Double Award). Rates from graphs.
Substrate concentration is not in 4BI1 and is tagged "Beyond 4BI1".
**Advanced** follows OCR A level Biology A (H420) Module 2, **2.1.4
Enzymes**: mechanism (lock and key, induced fit, enzyme–substrate complex,
activation energy); temperature (Q10), pH, enzyme and substrate concentration;
cofactors, coenzymes and prosthetic groups; competitive, non-competitive and
end-product inhibition; PAG4 rates of enzyme-controlled reactions (initial
rates from tangents). Vmax is shown; Km is tagged as beyond the H420 wording.

## What it shows

- **🔑 Enzyme molecules** (the core agent model): enzyme molecules with a
  notch-shaped active site and substrate wedges moving and colliding. A
  substrate entering an active site binds (if the pH and cofactor allow),
  forms an enzyme–substrate complex and is released as products. Wrong-shaped
  molecules never bind (specificity). Heat denatures enzymes one by one
  (grey, misshapen); pH squashes the active site. A level adds induced fit
  (the site closes round the substrate), competitive inhibitors (in the active
  site), non-competitive inhibitors and end-product inhibition (on the far
  side), and chloride ions as amylase's cofactor. Enzymes: salivary amylase,
  pepsin, trypsin, catalase, and a heat-stable DNA polymerase (beyond the
  spec). Graphs: products over time with tangents at the start and now; rate
  against temperature (1-minute and 5-minute assays, optimum marked); rate
  against pH for every enzyme; rate against substrate concentration
  (Michaelis–Menten; Vmax, ½Vmax and Km at A level; with and without
  inhibitor).
- **🧪 Amylase and starch (iodine)**: water bath, pH buffer, a drop on iodine
  every 10, 20 or 30 s on a spotting tile; the time of the first orange-brown
  drop is recorded; rate = 1000 ÷ time. Results table and graphs of rate
  against temperature or pH (means and the model curve); starch over time.
- **🫧 Catalase (gas syringe)**: potato discs in hydrogen peroxide in a water
  bath; oxygen read every 10 s for 2 minutes. Graphs: volume against time with
  the mean rate over 30 s and (A level) the tangent at t = 0; initial rate
  against temperature from your runs; (A level) initial rate against peroxide
  concentration. A Q10 tile uses two of your runs 10 °C apart.

Right panel: what's happening, readings (Vmax, Km, Q10 at A level), results
tables, an enzyme fact card, key ideas tagged by spec, exam practice (7 GCSE
and 7 A level questions with mark schemes; on-screen numbers for 1000 ÷ time,
mean rate from the syringe, Q10, the tangent and Km) and "How the model works
(and what it leaves out)". Links to Membranes and Movement, Heart and
Circulation, Antibiotic Resistance and Central Limit Theorem.

## Controls

- **Presets** (12): Lock and key · Rate from a graph · Too hot: denaturation ·
  Amylase and iodine: temperature · Amylase and iodine: pH · Catalase and a
  gas syringe · pH and the active site · and at A level: Induced fit · Vmax
  and Km · Competitive and non-competitive · End-product inhibition and
  cofactors · Q10 with catalase (PAG4).
- Molecules: enzyme, temperature, pH, substrate and enzyme molecules, keep
  substrate topped up, add wrong-shaped molecules; A level: lock and key /
  induced fit, inhibitor type and number, chloride ions.
- Amylase: water bath, pH, amylase and starch concentrations, sampling
  interval. Catalase: discs, peroxide concentration, temperature, pH.
- 🧪 New trial (results kept) and 🗑 Clear results.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  decorative water molecules (0 / 160 / 420 / 900), bubbles, and molecule
  detail. Picture only; the model and batch runs are unchanged.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Molecules move in straight lines with small random turns, speed ∝ √D,
  D ∝ T ÷ viscosity of water. A free enzyme catches substrate entering its
  active-site circle (radius r) at f × 2 r v n per second (f = pH × cofactor
  factor); a complex turns over at kcat (Arrhenius, Ea 45–50 kJ/mol, Q10 ≈
  1.8–2). So rate = Vmax[S] ÷ (Km + [S]) with Vmax = E × kcat and
  Km = kcat ÷ (2 r v f). Denaturation: each enzyme at rate kd(T)
  (Ed = 250 kJ/mol, kd = 0.01/s at 47–52 °C). Competitive inhibitors block the
  active site for 0.5 s on average; non-competitive (and end-product)
  inhibitors bind the far side and stop the enzyme while there.
- Amylase practical: ds/dt = −Vm a s ÷ (Km + s), end point 0.02% starch;
  bath ±0.5 °C, enzyme ±5%; time rounded up to the sampling interval.
- Catalase practical: Michaelis–Menten with Km ≈ 80 mmol/dm³; 1 mol H₂O₂ →
  12 000 cm³ O₂; discs ±8%, syringe to 0.5 cm³, up to 1 s delay, 0.2 cm³
  dissolved; tangent from a quadratic through the first 40 s of readings.

## Data and sources (approximate)

- Optimum pH: pepsin about 2, salivary amylase about 6.8–7, trypsin about 8
  (textbook values). Salivary amylase is activated by chloride ions.
- Catalase turns over about 4 × 10⁷ molecules a second (enzyme databases such
  as BRENDA; order of magnitude); haem prosthetic group. Catalase Km values
  vary widely between sources; 80 mmol/dm³ is illustrative.
- Taq polymerase optimum about 72–80 °C (beyond both specs).
- All other enzyme constants are illustrative, slowed down for viewing.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **More substrate: how much faster?** 0 → 600 molecules at 37 °C:
   6.0 → 14.9 products/s against Michaelis–Menten 6.9 → 15.2 (a few % below at
   high [S] from local depletion near busy enzymes).
2. **A competitive inhibitor:** 2.5 → 11.0 against 2.8 → 10.8, climbing
   towards the no-inhibitor curve (Km rises, Vmax unchanged).
3. **A non-competitive inhibitor:** 1.8 → 5.0 against 2.1 → 4.7, about a
   third of the no-inhibitor rate at every [S] (Vmax falls).
4. **Where is the optimum temperature?** 10 → 70 °C, 1-minute assay:
   2.6 → 15.6 (45 °C) → 0.08; theory 2.6 → 15.7 → 0.12; most means within
   5% except on the steep fall (50–55 °C), where only 12 enzymes make
   denaturation timing very random.
5. **Amylase practical: rate against temperature:** optimum about 40 °C
   (5.3 against 5.9); measured rates sit below the model because times are
   rounded up to the next 30-s drop; 0 above 50 °C.
6. **Catalase: initial rate and Q10:** 5 → 45 °C: tangents 0.09 → 1.22
   cm³/s against 0.11 → 1.24; Q10 ≈ 1.8.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
