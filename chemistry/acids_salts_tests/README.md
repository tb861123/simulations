# Acids, Salts and Chemical Tests

Acids and alkalis from the pH scale to titrations, making soluble and insoluble salts,
and a tests lab for flame tests, ions, gases and water, where students identify unknowns.
The precipitates in the salt-making part and in the tests lab come from the same
chemistry engine, so they always have the same colours and follow the same solubility rules.
Edexcel International GCSE Chemistry: acids, alkalis and titrations; salts; chemical tests.

Replaces the old pages `chem_sims/10_Acids_Bases_Salts.html` and
`chem_sims/13_Tests_Ions_Gases.html`. Metals reacting with acids are covered in
**Reactivity and Extracting Metals** (`../reactivity_metals/`), halogen displacement in
**Groups 1 and 7** (`../periodic_groups/`) and crystal growth in **Crystallisation**
(`../crystallisation/`); the left panel links to them.

## How to run

Open `acids-salts-tests.html` in Chrome or Edge. No install, no internet.

## What it shows

**A · Acids and salts**

- **pH scale.** Five tubes of the same solution with universal indicator, litmus, methyl
  orange, bromothymol blue and phenolphthalein, plus a pH meter, [H⁺] and [OH⁻]. Choose
  hydrochloric acid, ethanoic acid, sodium hydroxide or ammonia at any concentration
  (Dilute ×10 button), or one of 17 everyday solutions marked on the universal-indicator scale.
- **Titration.** HCl, HNO₃, H₂SO₄, ethanoic acid or a weak acid HA (choose its pKa) in a
  conical flask; NaOH, KOH or ammonia in the burette; five indicators or none. Open the tap
  (fast, dropwise, one drop) or press **Auto** (good technique). A zoomed burette scale shows
  the meniscus; **Record reading** fills a results table (rough + accurate runs, concordant
  titres ticked, mean titre). The pH curve, the indicator's range, the equivalence point and
  the temperature rise are plotted live; a close-up shows H⁺ + OH⁻ → H₂O (or the weak acid's
  molecules reacting).
- **Soluble salt.** Eight recipes by the four routes (insoluble base, metal, carbonate, or a
  titration for soluble bases): CuO / CuCO₃ / Zn / MgCO₃ / Mg / NaOH / KOH / NH₃. Step by
  step: measure, warm, add the solid in excess, filter, evaporate to the crystallisation
  point, cool, filter and dry, or evaporate to dryness. The yield comes from real solubility
  data (solubility curve and crystals-vs-crystallisation-point chart).
- **Insoluble salt.** Mix any of 9 metal-salt solutions with any of 7 sodium/potassium
  salts (or NaOH): the precipitate, its colour and ionic equation, then filter, wash, dry
  and weigh. A solubility-rules grid shows every precipitate colour.

**B · Tests lab** — flame tests (Li, Na, K, Ca, Cu, Ba, with the real emission lines in a
spectrum, a sodium-contaminated wire and cobalt glass); cations with NaOH (few drops,
excess, warm with damp red litmus for NH₄⁺, leave to stand for Fe²⁺ → brown); anions
(dilute HCl or HNO₃, BaCl₂, AgNO₃, gas → limewater, in any order, so wrong orders give real
false positives); gases (H₂, O₂, CO₂, Cl₂, NH₃, air and an unknown gas, with splints,
limewater, both litmus papers and an HCl rod); water (anhydrous CuSO₄, cobalt chloride
paper, boiling and freezing curves, evaporating a drop); and **Identify the unknown**: a
random soluble salt, tests on fresh portions, a lab notebook, then choose the cation and
anion and check (with a score).

12 presets: the pH scale, strong and weak acids, neutralisation, choosing an indicator,
copper sulfate crystals, a salt by titration, barium sulfate precipitate, flame tests,
hydroxide precipitates, halide test, gas tests, identify the unknown.

Exam practice: all six questions from the two old pages, plus questions that use the
settings on screen (titration calculation from your concordant titres, describing salt
preparations, theoretical mass of crystals or precipitate, ionic equations, solubility
rules, ion and gas tests, tests for water).

## The model

- pH is found exactly from a charge balance (bisection on log[H⁺]) with Kw = 10⁻¹⁴,
  ethanoic acid pKa 4.76, ammonia pKb 4.75 and HSO₄⁻ Ka 10⁻². Indicators change colour over
  their real ranges; the end point is half-way through the change.
- Heat of neutralisation: −57.9 kJ/mol (strong + strong), −56.1 (ethanoic acid),
  −53.4 (ammonia); no heat lost.
- Ion engine: neutralisation, acid + carbonate → CO₂, acids dissolving hydroxide and
  carbonate precipitates, precipitation of each insoluble pair with its real solubility
  (S × volume stays dissolved, so calcium sulfate and calcium hydroxide are only "slightly"
  precipitated), Al(OH)₃ / Zn(OH)₂ / Pb(OH)₂ dissolving in excess OH⁻, NH₄⁺ + OH⁻ → NH₃ on warming.
- Crystals: evaporate until saturated at the crystallisation point Th, cool to Tc;
  crystals x = (A − S(Tc)/100 × W) ÷ (fa − S(Tc)/100 × fw), with W = 100A/S(Th) (CRC data).
- Boiling point = 100 + 0.512 m, freezing point = −1.86 m (m = mol of particles per kg).
- Every assumption is listed in the simulation under "How the model works (and what it
  leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep
it. Random parts: burette parallax and rounding to 0.05 cm³, pipette volume, the size of
the last drops, pH meter, filtering losses, balance (0.01 g), judging the
crystallisation point, crystals lost on the glassware.

| Experiment | Result (theory) |
|---|---|
| Is the titre proportional to the acid's concentration? (HCl 0.02–0.20 M) | gradient 250 cm³ per mol/dm³ (250); each point about 0.03 cm³ above the line (half a drop) |
| How precise is one titre? (500 titrations) | mean 25.03, SD 0.059 cm³ (25.00, predicted SD 0.058): a systematic +0.03 cm³ from overshooting by half a drop |
| Which indicator for ethanoic acid? | methyl orange 2.22, litmus 24.49, bromothymol blue 24.82, universal 24.91, phenolphthalein 25.06 cm³ (equivalence 25.00) |
| pH at equivalence vs acid strength (pKa 2–10) | 7.38 → 11.33 (exact 7.39 → 11.34; formula 7.35 → 11.35) |
| Weighing the sulfate test: BaSO₄ vs volume of BaCl₂ | rises 0.023 g/cm³, levels at 0.572 g after 25 cm³ (0.583 g; 0.572 with 2% filtering loss) |
| Copper sulfate crystals: yield vs crystallisation point | 29.7% at 40 °C → 79.2% at 100 °C (model 30.1% → 79.7%) |

Results download as CSV. The other outcomes (acid concentration from the titre, mass of
crystals, boiling point of salty water) can be set up in the table.
