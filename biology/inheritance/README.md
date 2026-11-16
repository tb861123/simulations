# Inheritance and Genetics

Breed fruit flies and count the offspring as they hatch, fill Punnett squares
and watch offspring appear one at a time, and read family pedigrees. Mendel's
ratios are probabilities: real counts only come close, and closer with more offspring.

## How to run

Open `inheritance.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Fruit-fly lab**: vestigial wings (monohybrid); at A level wings and ebony
  (dihybrid), white eyes (sex-linked, Morgan's cross) and wings with black body
  (linked, with a crossing-over slider). Choose the parents, breed 20–1000,
  cross two offspring for the next generation. Observed against expected, the
  running shares, and the chi-squared test at A level.
- **Punnett squares**: pea height, cystic fibrosis, roan cattle, boy or girl;
  at A level ABO blood groups, haemophilia, a dihybrid and labrador epistasis.
- **Family pedigrees**: cystic fibrosis, polydactyly and (A level) haemophilia;
  show everyone's genotype; the chance the couple's next child is affected.
- Eight guided investigations and a Revise tab.

## Batch run

How close 100 offspring come to 3 : 1 (mean 24.9%, SD 4.5); bigger samples give
closer ratios (error falls as 1 ÷ √n); a test cross (50%); chi-squared under the
null hypothesis (mean 3.2 against df = 3); measured recombination against map distance.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its Hardy–Weinberg view, extra epistasis
examples and continuous variation are not in this version.

## Limits

Every fly survives; one crossover at most between vg and b; disease alleles are
made common in the pedigrees on purpose. See "The model" tab.

## Source

Built from `tools/kit/src/inheritance.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
