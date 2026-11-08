# Biotechnology and Genetic Engineering

A single, self-contained HTML file (`biotechnology.html`) for biology. Open it in
Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 5 *Use of biological resources*: **5(a) food production**
(glasshouses and polythene tunnels; carbon dioxide, temperature and light;
fertilisers; pest control by pesticides and biological control; industrial
fermenters with aseptic precautions, nutrients, temperature, pH, oxygenation
and agitation); **5(b) selective breeding**; **5(c) Genetic modification (genetic engineering)**
(restriction enzymes, ligase, plasmid vectors, human insulin from bacteria,
GM crops); **5(d) cloning** (micropropagation, Dolly). These are cited at
topic level on purpose: the point numbers were not checked against the
Pearson specification. **Advanced** follows OCR A level Biology A (H420):
**6.1.3 Manipulating genomes** (DNA sequencing, PCR, gel electrophoresis and
DNA profiling **PAG6**, genetic engineering, gene therapy, ethics) and
**6.2.1 Cloning and biotechnology** (micropropagation, artificial twinning,
somatic cell nuclear transfer, microorganisms in biotechnology, culturing
microorganisms, growth curves, serial dilution **PAG7**, immobilised
enzymes), plus **6.1.2(h)** artificial selection, its consequences and
conserving genetic resources (links to **4.2.1** biodiversity). Content that is on only one specification, or beyond both (the
breeder's equation, economic optimum of fertiliser), is tagged in the sim.

## What it shows

Tabs at the top of the centre panel (each with scenes chosen on the left):

- **🌾 Food**: a glasshouse of tomatoes (light, CO₂ and temperature with a
  heater, CO₂ burner and lamps; limiting-factor curves; the crop, costs and
  profit over a 120-day season); a wheat field with eight plots (nitrogen
  fertiliser, 🌾 harvest with plot-to-plot variation, nitrate leaching to a
  river, the yield curve with your harvests and at A level the economic
  optimum; real UK wheat yields since 1950, approximate); aphids with no
  control, pesticide sprays (resistance evolves) or ladybirds (biological
  control).
- **🐄 Breeding**: a herd of 200 dairy cows (milk yield from 40 genes plus
  environment); keep the best fraction as parents for any number of
  generations; graphs of the mean (with the breeder's equation at A level),
  the distribution against generation 0, and at A level the loss of genetic
  diversity and variance.
- **🧫 Microbes**: an industrial fermenter (Penicillium, GM E. coli or yeast;
  temperature, pH, air, glucose, water jacket, stirring, aseptic technique;
  probes; contamination); growth curve (linear at Standard, log scale with
  lag, log, stationary and death phases at A level) and product. At A level:
  serial dilution and plate counts (PAG7) with a results table, and
  immobilised lactase in alginate beads (flow rate, temperature, bead size,
  reuse, free enzyme for comparison).
- **🧬 GM**: making human insulin step by step (choose restriction enzymes for
  the gene and the plasmid: matching sticky ends or not; transformation;
  antibiotic plates; at A level a marker test for recombinant colonies;
  insulin from the fermenter); GM crops (Bt maize, herbicide-tolerant soya,
  Golden Rice; at A level Bt resistance evolving with and without refuges);
  at A level gene therapy (somatic with repeated doses, ex vivo stem cells,
  germ line).
- **🔬 DNA lab (A level)**: PCR (thermal cycler, strands at each stage,
  starting copies, annealing temperature, cycles; copies on a log scale
  against perfect doubling); gel electrophoresis and DNA profiling (crime
  scene with three suspects, or paternity; voltage; 📏 measure bands;
  calibration line of log size against distance); Sanger sequencing
  (fragments, electropherogram, reading the sequence).
- **🐑 Cloning**: micropropagation (cytokinin : auxin ratio, sterile or not;
  plantlets on a log scale); Dolly step by step with the real numbers
  (277 → 29 → 1) and repeats of the attempt; at A level artificial embryo
  twinning.

Right panel: what's happening, readings, results tables, real-data and
"for and against" cards, key ideas tagged by specification, exam practice
(12 GCSE and 12 A level questions with mark schemes; on-screen numbers for
yield percentage change, plate counts and PCR copies) and "How the model works
(and what it leaves out)". Links to Inheritance, DNA and Cell Division,
Enzymes, Natural Selection, Antibiotic Resistance, Photosynthesis and
Respiration, and Ecosystems.

## Controls

- **Presets** (12): Glasshouses · Fertilisers · Selective breeding ·
  Industrial fermenter · Making human insulin · GM crops · Cloning plants and
  animals · and at A level: PCR · DNA profiling (PAG6) · Gene therapy · Growth
  curves and serial dilution (PAG7) · Immobilised enzymes.
- The left panel shows the controls for the tab and scene in use (listed
  above).
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  numbers of moving cells, bubbles and particles, aphids, plant detail.
  Picture only; the model and the batch runs are the same at every level.
  Every view draws in under 1 ms at 1920×1080, so this is mainly for weak
  tablets.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Glasshouse: rate = 1 ÷ (40 ÷ L + 700 ÷ CO₂ + 1 ÷ f(T)), f peaking at 1.6 at
  27 °C; crop B grows 0.12 × rate × B(1 − B) a day; yield 55B kg/m²; costs
  £0.012 per °C above 10 °C, £0.006 per 100 ppm, £0.004 per % of light above
  30%, a day per m²; tomatoes £1.20/kg (illustrative).
- Wheat: Y = 10.5(1 − e^(−(60 + N)/90)) t/ha, plots ±8%; leaching 10 + 0.08N
  + 0.6 × (N − 200 above 200) kg N/ha; optimum where the marginal grain pays
  for the nitrogen (£200/t grain, £1.20/kg N, approximate).
- Aphids: logistic r = 0.22 a day, K = 200 per plant; ladybirds eat 0.5AL ÷
  (1 + 0.02A) and die 0.08 a day; sprays kill 95% of susceptible, 10% of
  resistant aphids and 90% of ladybirds.
- Breeding: 40 genes, 50 L per plus allele, base 6000 L; environmental
  variance set from the heritability; parents chosen on their own yield;
  Mendelian inheritance gene by gene; breeder's equation R = h² × i × σP per
  generation.
- Fermenter: μ = 0.4 × S ÷ (S + 0.5) × temperature × pH × oxygen factors,
  2-hour lag; yield 0.5 g cells per g glucose; death 0.004 + 0.012 when
  glucose has run out; oxygen supply (0.2 + 2.8 × air) × (1 or 0.35 without
  stirring); without the jacket respiration heats the broth; contaminant
  chance 1% an hour (0.02% with aseptic technique).
- Plates: colonies = Poisson(cells × 10^−k × 0.1 × 0.9), 3% pipetting error
  per transfer.
- Lactase: conversion = 1 − e^(−k × 10 ÷ flow); k = 0.5 × 2^((T − 30)/10) ×
  (3 ÷ bead mm), denaturing above 55 °C (45 °C free); 0.5% activity lost per
  run.
- PCR: each copy copied with chance e (0.95 at or below 58 °C, falling above;
  primers' Tm 62 °C), growth slowing towards 10¹² copies; binomial chance in
  early cycles.
- Gel: distance = 17 × (4 − log₁₀ size) × (V ÷ 100) × (t ÷ 45) mm; bands
  measured ±0.5 mm.
- Micropropagation: shoots per explant 1 + 5 ÷ (1 + e^(−2.5(r − 0.3))), r =
  log₁₀(cytokinin : auxin); subculture every 4 weeks; 2% (sterile) or 30% of
  jars lost.
- Gene therapy: somatic cells replaced with a 28-day half-life; ex vivo
  stem cells settle at 1.6 × dose efficiency; germ line 100%.

## Data and sources

- UK wheat yields 1950–2023 (t/ha): approximate, from memory of DEFRA cereal
  and oilseed production statistics; marked "check before quoting" in the sim.
  The 1950 value (about 2.6 t/ha) could not be confirmed from the primary
  dataset and is labelled approximate / unverified.
- Dolly: 277 fused eggs, 29 embryos, 1 lamb, born 5 July 1996 (Wilmut et
  al., Nature, 1997).
- Human insulin from GM bacteria first approved 1982 (Humulin).
- Casgevy (CRISPR, ex vivo editing of blood stem cells for sickle cell
  disease and β-thalassaemia) approved by the UK MHRA in 2023, the first in
  the world.
- Human Genome Project: about 3 billion base pairs, finished 2003, about 3
  billion US dollars (approximate).
- GM crops on roughly 190 million hectares: the ISAAA 2019 estimate, not a
  current-year figure. Golden Rice 2 up to about 30 µg β-carotene per g
  (Paine et al., 2005, approximate). The Philippines issued a cultivation
  permit in 2021; the Court of Appeals revoked it in April 2024 and the
  ruling is contested, so the sim does not present it as approved today.
- Artificial selection's consequences (loss of genetic diversity) and
  conserving genetic resources are tagged H420 6.1.2(h), with a link to
  4.2.1 (biodiversity).
- Fertiliser and grain prices, glasshouse costs, all model rates:
  illustrative.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Nitrogen and wheat yield** (0 → 300 kg N/ha): 4.99, 7.23, 8.51, 9.25,
   9.67, 9.92, 10.06 t/ha against 5.11, 7.41, 8.73, 9.48, 9.92, 10.16, 10.31
   (the same plots at every step, slightly below average).
2. **Selective breeding: does heritability matter?** (h² 0.1 → 0.9, 10
   generations): gains of 750, 1240, 1530, 1680, 1800 L against the
   breeder's equation 990, 1710, 2210, 2620, 2970 L (selection uses up
   variation).
3. **Fermenter temperature** (20 → 50 °C, insulin at 48 h): 0.03, 1.15, 1.19,
   1.20, 1.19, 0.008, 0.0001 g/dm³, matching the no-noise run.
4. **Aseptic technique: how many batches are lost?** (20 batches, no
   precautions): mean 7.8 (SD 2.1) against binomial 7.6 (SD 2.2).
5. **PCR: copies against cycles** (log y): within 1–2% of the expected curve;
   plateau near 10¹² after 35–40 cycles, below perfect doubling.
6. **Plate counts: how accurate?** (3 × 10⁸ per cm³, 10⁻⁵): mean 2.70 × 10⁸,
   about 10% low because of clumps; SD 9%.
7. **Reading a gel** (600 bp): mean 600.5 bp, SD 41 bp.
8. **Immobilised lactase: flow rate** (0.5 → 16 cm³/min): 97, 83, 63, 49,
   40, 34, 30, 26% against 100, 84, 64, 50, 41, 35, 30, 27%.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
