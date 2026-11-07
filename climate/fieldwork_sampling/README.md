# Fieldwork: Sampling and Statistics

A single, self-contained HTML file (`fieldwork-sampling.html`) for geography
fieldwork. Open it in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0),
Component 3 (Paper 3) *Geographical investigations: fieldwork* and its
geographical and quantitative skills: hypotheses and null hypotheses;
random, systematic, stratified and opportunistic sampling; mean, median,
mode, range and interquartile range; scatter graphs with a line of best fit;
reliability and evaluating conclusions. Spearman's rank is shown as an
extension at this level.
**Advanced** follows Pearson Edexcel A level Geography (9GE0) Component 4
*Independent investigation* (NEA) and the quantitative skills appendix:
sampling frameworks, standard deviation and standard error, the three 9GE0
statistical tests (Spearman's rank, Student's t-test and chi-squared) with
significance levels, Type I and Type II errors and the power of a test,
reliability and validity. 9GE0 skills cited: Spearman's rank 2A(5), 4A(5),
4B(5); Student's t-test 2A(8), 2B(5); chi-squared 2B(10). Student's t-test
(two samples, with working and critical values) is the primary test for a
difference between two groups, shown with Edexcel's formula
t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂). Standard deviations divide by n (Pearson's
worked standard deviation divides by n), for the t-test and wherever SD is
shown at Advanced; the degrees of freedom n₁ + n₂ − 2 are labelled "check
against an Edexcel mark scheme; the formula is given in the exam".
Mann–Whitney U is kept and tagged "alternative test for non-normal data, listed by Pearson as relevant for the NEA; not a specified 9GE0 exam technique".

## What it shows

Three made-up field sites, each with a hidden true pattern:

- a **pebble beach** like Chesil Beach (pebbles bigger to the east; shape by
  zone),
- a **river downstream** (channel width, the Bradshaw model; bedload shape),
- a **town-centre transect** (environmental quality score; land use by zone;
  busy main road vs quiet back streets).

Tabs at the top of the centre panel:

- **🗺 Fieldtrip**: a map of the site with zones, car parks / bridges /
  station, and your sites. A group walks from site to site and records each
  reading. Graphs: scatter graph with line of best fit (and the true pattern
  if revealed, and a second group's readings for reliability); box plots by
  zone.
- **📊 Statistics**: the same data with worked statistics: Spearman's rank on
  a number line with critical values; mean, median, IQR (box plots); and at
  A level chi-squared (observed vs expected), Student's t-test (first zone vs
  last zone, e.g. town centre vs suburbs: each group's values, mean and ± 1 SD,
  then t on a number line with the two-tailed critical values) and, for
  comparison, Mann–Whitney U (alternative test for non-normal data, listed by Pearson as relevant for the NEA; not a specified 9GE0 exam technique). The right
  panel shows the full working and data table (ranks, d, d²; O and E; means,
  SDs, t, df and critical values; rank sums and U).
- **🎲 Many fieldtrips**: the same plan done by class after class: the spread
  of the trips' means against the true mean and SD ÷ √n, and the spread of
  their Spearman's rs with the share that is significant (power, or false
  alarms when there is no pattern).

Right panel: what's happening, readings, working, key ideas tagged by spec,
exam practice (7 GCSE and 8 A level questions with mark schemes; most use the
data on screen, including a Student's t-test worked from your stratified data) and "How the model works (and what it leaves out)". Links to
The Central Limit Theorem, Coasts, Rivers and Landforms and Weathering, Slopes
and Landslides.

## Controls

- **Presets** (13): A pebble beach: random sampling · Systematic sampling ·
  Stratified sampling · Opportunistic: near the car parks · Too few sites ·
  River width downstream · Town centre: environmental quality · Is your data
  reliable? · Chi-squared: pebble shape by zone (A level) · Student's t-test:
  centre vs suburbs (A level) · Mann–Whitney U (non-normal data; A
  level) · How many sites do you need? · No real pattern: false alarms (A
  level).
- Field site (with its hypothesis and null hypothesis), sampling method
  (including "Your own": click the map to add sites, right-click to remove
  the last), number of sites, items measured at each site, measuring error,
  pick items by eye (biased), random seed, New sites, strength of the hidden
  pattern, show the true pattern, show a second group's readings.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in this
  browser): pebbles, buildings and trees on the map and the true-pattern
  strip. Picture only; data and batch runs are unchanged. The map draws in
  0.6–2.6 ms at 1920×1080.
- Play / Pause, Reset, speeds (1× = 2 sites a second; many fieldtrips 1× = 10
  trips a second), hide/show panels, full screen.

## The models and statistics

- Each site: a trend along it (scaled by the strength slider) plus fixed
  local differences; each item measured differs at random; then measuring
  error; picking by eye adds bias.
- Quartiles at the (n + 1)/4 positions; SD dividing by n (Pearson's worked
  method); least-squares line;
  Spearman's rank with tied ranks averaged, two-tailed critical values (Zar
  1972; above n = 30 from Student's t); chi-squared 3 × 3 with standard
  critical values and a warning when E < 5; Student's t-test (two samples,
  unpaired) on the first and last zones, t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂)
  with each SD dividing by n, df = n₁ + n₂ − 2 (check against an Edexcel mark
  scheme; the formula is given in the exam), two-tailed critical values from
  the t distribution (e.g. 2.228 for df = 10 at 0.05; dividing by n makes t a
  little bigger than the textbook pooled Student's t, by √(6 ÷ 5) with 6 sites
  per group); Mann–Whitney U (not a specified 9GE0 exam technique) with exact critical values from
  the distribution of U.
- The truth (true mean, whole-site rs, bias of opportunistic sampling) comes
  from a survey of 3000 places; power predicted with Fisher's z and
  variance 1.06/(n − 3).

## Data and sources

The sites are illustrative. The beach is inspired by Chesil Beach (about
29 km from West Bay to Portland; pea-sized pebbles at West Bay, potato-sized
near Portland). Critical values: Zar (1972) for Spearman's rank; standard
chi-squared and Student's t tables (the t values are computed from the t
distribution and match the printed tables to 3 decimal places).

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How close is one fieldtrip's mean?** 500 trips of 10 random sites: mean
   30.96 mm against a true mean of 31.03 mm (−0.4 standard errors); SD 3.62
   against SD ÷ √n = 3.78.
2. **Does a bigger sample fix a biased method?** Opportunistic, 5 → 40 sites:
   about −12 mm at every sample size (method bias −12.1 mm; random 0).
3. **How many sites to find a real pattern?** Weak pattern, 6 → 40 sites:
   12% → 53% → 89% → 98% significant against Fisher-z power 23% → 50% → 84% →
   99% (the formula overestimates at 6 sites, where the table needs rs ≥ 0.886).
4. **False alarms when there is no pattern** (A level): 1.5–6.5% of trips
   significant at every n (theory 5%).
5. **Stratified or random: which is more precise?** RMS error of the mean
   2.4 → 0.86 mm against SE 2.5 → 0.90 (random would be 4.9 → 1.7); log–log
   gradient −0.52 (theory −0.5).
6. **Chi-squared when there is no link** (A level): mean 4.03, SD 2.85 against
   df = 4 and √(2df) = 2.83.
7. **Student's t-test when there is no difference** (A level): 500 trips of 18
   stratified sites, west end vs east end (df = 10) with no real pattern,
   SDs dividing by n: t mean −0.03, SD 1.26 against theory 0 and
   √(df ÷ (df − 2)) × √(6 ÷ 5) = 1.22 (−0.4 standard errors); about 7% of
   trips (not 5%) pass the critical value ±2.228, because dividing by n makes
   t about 10% bigger with 6 sites per group.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
