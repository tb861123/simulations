# DNA, Protein Synthesis and Cell Division

A single, self-contained HTML file (`dna-cell-division.html`) for biology.
Open it in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 3(b) *Inheritance*: genome, genes and chromosomes; DNA as a double
helix with paired bases A–T and C–G (3.16B); RNA with uracil (3.17B);
protein synthesis, transcription and translation with mRNA, ribosomes, tRNA,
codons and anticodons (3.18B); mitosis making identical cells for growth,
repair, cloning and asexual reproduction (3.28–3.29); meiosis making
genetically different haploid gametes (3.30); random fertilisation (3.31);
46 and 23 chromosomes (3.32); mutation (3.34) and the B points after it
(effect on the amino acid sequence, most mutations have no effect, ionising
radiation and chemical mutagens). B = Biology only. The point numbers were
checked against teaching resources that quote the specification; the mitosis
points are 3.28 or 3.29 depending on the source, so check them against the
Pearson PDF.
**Advanced** follows OCR A level Biology A (H420): **2.1.3 Nucleotides and
nucleic acids** (nucleotides, antiparallel strands, semi-conservative
replication with helicase and DNA polymerase, Meselson and Stahl, the genetic
code, transcription and translation); **2.1.6 Cell division, cell diversity
and cellular organisation** (the cell cycle, G0, checkpoints, mitosis,
meiosis with crossing over and independent assortment, root tip squash);
**6.1.1 Cellular control** (substitution, insertion and deletion mutations and
their effects; the lac operon). **PAG1** microscopy: the root tip squash and
mitotic index. cAMP/CRP catabolite repression is tagged "beyond the H420
wording".

## What it shows

Tabs at the top of the centre panel:

- **🧬 DNA and proteins**: a twisting double helix of a real gene (the start
  of human β-globin, HBB codons 1–18), a short made-up gene, or a random one.
  *The double helix*: base pairs, sugar–phosphate backbones, (A level) 5′/3′
  ends, hydrogen bonds, a nucleotide. *Protein synthesis*: RNA polymerase
  unwinds the DNA and builds mRNA (U for T); the mRNA leaves through a nuclear
  pore; a ribosome reads codons, tRNAs with anticodons bring amino acids and
  the polypeptide grows until a stop codon. A level adds *Replication* (old
  strands dark, new light; helicase and DNA polymerase) and *Meselson–Stahl*
  (centrifuge tubes for generations 0–4, with semi-conservative, conservative
  or dispersive copying). Mutations: substitution, insertion or deletion at
  any base, a random mutation, or the real sickle-cell change (GAG → GTG);
  a mutagen dose slider. Graphs: the real codon table with the current codon
  lit; the normal and mutated protein (silent / missense / nonsense /
  frameshift, R groups coloured); base composition (Chargaff); Meselson–Stahl
  bands against each hypothesis (A level).
- **🔄 Cell cycle and mitosis**: a cell (onion root tip or human cell in
  culture, shown with 2n = 4 or 6) through G1, S, G2, prophase, metaphase,
  anaphase, telophase and cytokinesis; homologous pairs coloured (darker from
  the mother, lighter from the father). The clock shows real hours (mitosis
  slowed to watch). A level: checkpoints working on/off, DNA damage (arrest
  and repair at G1, or the damage copied into both cells), an unattached
  chromosome (spindle checkpoint wait, or non-disjunction), no growth signals
  (G0). Graphs: DNA per cell (2C → 4C → 2C), cell cycle times, cell numbers.
- **🔬 Root tip squash** (PAG1): a field of view of a stained onion root tip at
  ×400 (or ×100), cells in each phase in proportion to the phase durations;
  cells stop dividing 1.5–3 mm from the tip. Count a field automatically
  (very early prophase is missed, as by a real counter) or mark the dividing
  cells yourself and get feedback; click a cell to see its phase; move to new
  fields and distances. Results table, tallies, mitotic index along the root
  (model curves), and (A level) phase durations from counts × cycle time.
  Scale bar for magnification questions.
- **🎲 Meiosis**: n = 2, 3 or 4 pairs through interphase, meiosis I (pairing,
  random orientation, separation of homologues) and meiosis II (separation of
  chromatids) to four haploid gametes; at A level, crossing over at one
  chiasma per pair. Gametes are collected: bar chart of the 2ⁿ types (or the
  last gametes' mixed segments with crossing over) and a 2ⁿ / (2ⁿ)² chart up
  to humans (2²³ ≈ 8.4 million).
- **🧫 lac operon** (A level only): lacI, promoter, operator, lacZ, lacY,
  lacA; the repressor on the operator or released by lactose; RNA polymerase,
  mRNA molecules and β-galactosidase counted in one stochastic E. coli cell;
  glucose present (catabolite repression, beyond the H420 wording). Graphs:
  mRNA and β-galactosidase over time against the expected mean; diauxic growth
  of a culture on glucose then lactose.

Right panel: what's happening, readings, sequence card (coding, template,
mRNA, protein), results tables, key ideas tagged by spec, exam practice (8 GCSE
and 9 A level questions with mark schemes; on-screen numbers for the mRNA
sequence, % bases, codon table, Meselson–Stahl sample, mitotic index and phase
duration) and "How the model works (and what it leaves out)". Links to Natural
Selection, Antibiotic Resistance, Enzymes, Membranes and Movement and Central
Limit Theorem.

## Controls

- **Presets** (12): The double helix · Making a protein · Sickle-cell mutation
  · Mitosis · Counting cells in a root tip · Meiosis makes gametes · and at A
  level: Semi-conservative replication · Meselson and Stahl · Frameshift and
  nonsense · Checkpoints and cancer · Crossing over · The lac operon.
- Gene, what to show, Meselson–Stahl hypothesis; mutation type, position and
  base; random and sickle-cell buttons; mutagen dose. Cell type and 2n; (A
  level) checkpoints, DNA damage, unattached chromosome, growth signals.
  Root tip: distance from the tip, magnification, labels; Next field, Count
  this field, Clear. Meiosis: pairs, (A level) crossing over. lac operon:
  lactose, glucose.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  free nucleotides drifting in the background (0 / 30 / 70 / 140), backbone
  beads, shading and detail in the root tip cells. Picture only; the model
  and the batch runs are the same at every level. Every view draws in under
  about 6 ms at 1920×1080 (60 fps at all levels).
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Genetic code: the standard 64-codon table; translation from the start
  codon to the first stop codon. Mutation effects are worked out with it.
  Mutation rate μ = 2 × 10⁻⁴ per base × (1 + dose), scaled up enormously
  (real copying makes about one mistake per 10⁹–10¹⁰ bases).
- Meselson–Stahl: 2000 molecules, each strand with a heavy fraction; copied
  by the chosen rule (dispersive: 10 random pieces per strand); a random half
  kept each generation; 200 sampled. Bands: heavy > 0.75, hybrid 0.25–0.75,
  light < 0.25 heavy fraction. Densities 1.724 / 1.717 / 1.710 g/cm³.
- Cell cycle (hours, approximate): onion G1 6.5, S 7.5, G2 3.0, prophase 1.4,
  metaphase 0.4, anaphase 0.2, telophase 0.5 (19.5 h); human G1 11, S 8, G2 4,
  mitosis 1 h (24 h).
- Root tip: fraction cycling = 1 ÷ (1 + e^((d − 2 mm)/0.35 mm)); phase
  probabilities = fraction cycling × phase time ÷ cycle time; 30% of prophase
  cells are too early to see. Cells 26 µm × 18 µm, longer beyond 1.5 mm.
- Meiosis: random orientation of each pair in metaphase I and of the
  chromatids in metaphase II; at A level one chiasma per pair at a random
  point, swapping the ends of two non-sister chromatids. The four gametes from
  one cell are two complementary pairs, so M gametes from M/4 cells contain on
  average 2ⁿ(1 − (1 − 2/2ⁿ)^(M/4)) kinds.
- lac operon (minutes): repressor binds the operator at 2 per min, lets go at
  0.02 + 20 L²/(L² + 0.5²) per min (L = lactose, mmol/dm³); while free, mRNA
  is made at 6 per min (× 0.12 with glucose); mRNA breaks down at 0.5 per min;
  β-galactosidase made at 4 per mRNA per min and diluted by growth (doubling
  30 min). Mean mRNA = 6 × fraction free ÷ 0.5; spread from the two-state
  (telegraph) model. Culture: doubling 30 min on glucose, 40 min on lactose,
  lac genes switch on over about 15 min.

## Data and sources

- β-globin (HBB) coding sequence, codons 1–18, and the sickle-cell mutation
  (codon 6 of the mature protein, GAG → GTG, Glu → Val): standard reference
  sequence.
- Meselson and Stahl (1958): ¹⁵N and ¹⁴N DNA densities about 1.724 and
  1.710 g/cm³ in CsCl (approximate).
- Cell cycle and phase times, mRNA half-life and rates: approximate textbook
  values; lac operon rates illustrative.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Meselson–Stahl: hybrid DNA each generation**: 0, 100, 49.5, 24.4, 12.7,
   6.3% against 0, 100, 50, 25, 12.5, 6.25% (semi-conservative); conservative
   predicts 0 throughout.
2. **Counting cells: how variable is the mitotic index?** 500 counts of 100
   cells at 0.5 mm: mean 10.7% (SD 3.1) against 10.5% (SD 3.07) for a careful
   counter (true index 12.6%).
3. **Mitotic index along the root**: 10.7% at 0.25 mm falling to 0.1% at 4 mm,
   on the model curve within about 1 point.
4. **How many different gametes?** n = 1 → 12 with 200 gametes: 2, 4, 8, 16,
   31.6, 50, 68.8, 80.4 … 99.6 against 2, 4, 8, 16, 30.7, 50.9, 69.8, 83.1 …
   98.8.
5. **Random substitutions: how many change the protein?** β-globin, 50 per
   run: 73.9% (SD 6.5) against 73.9% (SD 6.2) from all 153 substitutions.
6. **Mutagens**: 1000 copies, dose 0 → 20: 10 → 200.5 mutated copies against
   10.7 → 203.3.
7. **lac operon: mRNA against lactose**: 0.3 → 11 molecules against 0.12 →
   10.9; single cells scatter by about ±3.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
