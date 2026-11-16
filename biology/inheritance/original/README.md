# Inheritance and Genetics

A single, self-contained HTML file (`inheritance.html`) for biology. Open it
in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section **3(b) Inheritance**: genes and alleles; dominant and recessive;
homozygous and heterozygous; genotype and phenotype; codominance; monohybrid
crosses with genetic diagrams and Punnett squares; ratios and probabilities;
family pedigrees; sex determination; genetic and environmental variation
(3.33) and polygenic inheritance (3.22). 4BI1 does not name continuous and
discontinuous variation, so the sim tags it "Not named in 4BI1" at Standard;
it is named in H420 6.1.2(d) and 4.2.2(f).
**Advanced** follows OCR A level Biology A (H420) Module 6, **6.1.2 Patterns
of inheritance**: genetic and environmental variation; continuous and
discontinuous variation and their genetic basis (also 4.2.2(f)); meiosis and
random fertilisation as sources of variation; dihybrid, codominant, multiple-allele, sex-linked and autosomally
linked inheritance; epistasis; the chi-squared test; Hardy–Weinberg. 6.1.2 also covers
stabilising and directional selection, genetic drift, bottleneck and founder
effects, speciation and artificial selection; these are listed in the sim and
modelled in `biology/natural_selection`.
Recombination frequency is tagged "widely taught; check the H420 wording".

## What it shows

- **🪰 Fruit-fly lab** (the core): choose a female and a male, breed them, and
  watch the offspring hatch in a vial, drawn with their phenotypes (long or
  vestigial wings, grey or ebony/black body, red or white eyes, male or
  female), sorted and counted. "Cross two of the offspring" takes an F1 female
  and male for an F2 (and so on). Standard: wings only (monohybrid, test
  cross). A level: wings + ebony (dihybrid, 9 : 3 : 3 : 1), white eyes
  (X-linked; Morgan's 1910 cross), black body + vestigial wings (linked,
  about 17 map units; a slider changes the distance). Graphs: observed counts
  beside the expected numbers; running proportions as offspring hatch, with
  ±2 standard errors. A level adds χ², degrees of freedom, critical value,
  p-value and conclusion, and recombination frequency.
- **🟦 Punnett squares**: gametes and offspring for pea height, cystic
  fibrosis, roan cattle (codominance), sex determination; at A level ABO blood
  groups (multiple alleles), haemophilia and colour blindness (sex-linked),
  pea seed shape and colour (dihybrid), labrador coat colour (recessive
  epistasis, 9 : 3 : 4) and squash fruit colour (dominant epistasis,
  12 : 3 : 1). Offspring are made one at a time (+1, +10, +100 or playing) as
  coloured squares; the observed ratio converges on the expected one.
- **👪 Family pedigrees**: a random three-generation family for cystic
  fibrosis (autosomal recessive) or polydactyly (autosomal dominant); at A
  level haemophilia A and red–green colour blindness (X-linked recessive).
  Standard symbols and numbering; "Show everyone's genotype" reveals carriers.
  The chance that the couple's next girl or boy is affected is worked out
  exactly from who is affected (as an exam would ask) and compared with the
  true chance. A level: Hardy–Weinberg curves (p², 2pq, q²) with the
  condition's real allele frequency.
- **📏 Variation**: men's heights from a chosen number of genes plus an
  environmental effect (a line-up of people and a histogram with the normal
  curve); one gene and no environment gives three separate classes. ABO blood
  groups as discontinuous variation against UK proportions.

Right panel: what's happening, readings (ratios, χ², p-values, carrier
probabilities, mean, SD, standard error), results tables with (O − E)²/E, key
ideas tagged by spec, exam practice (9 GCSE and 8 A level questions with mark
schemes; on-screen numbers for the cross, ratio, pedigree probability, χ² and
recombination frequency) and "How the model works (and what it leaves out)".
Links to Natural Selection (Hardy–Weinberg table), Antibiotic Resistance,
Central Limit Theorem and Fieldwork and Sampling.

## Controls

- **Presets** (12): A monohybrid cross · 3 : 1 from many flies · Codominance
  · Boy or girl? · Cystic fibrosis in a family · Continuous and discontinuous
  · and at A level: Dihybrid cross: 9 : 3 : 3 : 1 · Sex linkage: white-eyed
  flies · Linked genes: a test cross · Epistasis: labrador colours · ABO blood
  groups · Haemophilia and Hardy–Weinberg.
- Fly lab: genes followed, female and male parents, offspring to count,
  (A level) distance between b and vg; breed again; cross two offspring.
- Punnett: characteristic, the two parents' genotypes, +1/+10/+100, clear.
- Pedigrees: condition, sex of the next child, show genotypes, new family.
- Variation: characteristic, number of genes, environment, people sampled,
  new sample.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered): flies
  drawn (60 / 160 / 320 / 600), offspring squares (100 / 400 / 900 / 1600),
  people drawn (40 / 100 / 200 / 400) and fly detail (legs, stripes, wing
  outlines). Picture only: every offspring is still counted, and batch runs
  are unchanged.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Each gamete gets one allele of each gene at random; genes on different
  chromosomes assort independently; fertilisation is random.
- Fruit flies: vg and b on chromosome 2, about 17 map units apart
  (approximate; real values 17–18); e on chromosome 3; w on the X. Females
  cross over between b and vg with chance = recombination frequency; males do
  not cross over (true of Drosophila).
- χ² = Σ(O − E)²/E, E from the Mendelian hypothesis (for two genes,
  independent assortment); critical values at p = 0.05 and exact p-values
  from the χ² distribution.
- Pedigrees: grandparents drawn with a high allele frequency (15–20%) so the
  condition shows; the "from the tree" probability uses the real population
  frequency for people who married in and adds up over every possible
  genotype of the key people.
- Height: n genes, two equally common alleles, additive effects with a total
  genetic SD of 6.5 cm, plus an environmental SD (default 3 cm).

## Data and sources (approximate)

- Cystic fibrosis: about 1 in 2500 UK births, about 1 in 25 carriers (Cystic
  Fibrosis Trust).
- Haemophilia A: about 1 in 5000 male births (Haemophilia Society / World
  Federation of Hemophilia).
- Red–green colour blindness: about 8% of men and 0.5% of women of northern
  European descent.
- ABO blood groups in the UK: O 48%, A 38%, B 10%, AB 4%, labelled
  **illustrative** (approximate; not one dated dataset). NHS Blood Donation
  (2017) gives O about 48% and B about 10%; the Welsh Blood Service gives UK
  proportions of O 44%, A 42%, B 10%, AB 4%.
- Height of adult men in England: mean about 175 cm, SD about 7 cm (Health
  Survey for England 2019).
- Drosophila b–vg distance about 17 map units; Morgan's white-eye cross, 1910.
- About 105 boys are born per 100 girls (general demographic figure).

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Ratios emerge from many offspring:** Aa × Aa, 10 → 5000 offspring: mean
   proportion recessive 0.29 (SD 0.14) at n = 10 down to 0.248 (SD 0.006) at
   n = 5000; theory 0.25, SD ∝ 1/√n.
2. **How far from 3 : 1 is normal?** 500 families of 100: mean 0.251, SD
   0.044 (theory 0.25 and 0.043).
3. **χ² when the hypothesis is true:** 1000 dihybrid F2s of 160: mean χ²
   3.14, SD 2.55 (theory 3 and 2.45).
4. **Does χ² spot linkage?** Test crosses of 100, 100 at each distance:
   linkage detected every time up to 25 map units, then 94% at 30, 81% at 35,
   45% at 40, 12% at 45 and 6% at 50 (the false-positive rate), against the
   non-central χ² power curve 93%, 71%, 36%, 12%, 5%.
5. **Measuring recombination frequency:** 200 offspring per test cross:
   measured values within a few per cent of the true distance at every step.
6. **Sons of a carrier mother:** 500 families of 40 sons: mean 0.504, SD 0.079
   (theory 0.5 and 0.079).
7. **Hardy–Weinberg: counting CF carriers:** estimated 2pq from samples of
   1000 to 1 000 000 people: 0.027 ± 0.035 at 1000 (biased low: often no
   affected people at all) to 0.0391 ± 0.0014 at a million (theory 0.0392).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
