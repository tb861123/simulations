# Antibiotic resistance during an infection

A teaching simulation (GCSE / iGCSE biology) of how antibiotic resistance can
evolve inside one patient during a course of antibiotics. Students see bacteria
dividing and dying in a sample of infected tissue, the drug level rising and
falling after each tablet, and resistant strains taking over when the
treatment goes wrong.

## How to run

Open `antibiotic-resistance.html` in Chrome or Edge, with no install. It is one
self-contained file that works offline.

## What is on screen

- **Left:** 12 presets and all the controls. Changing any setting starts a new patient.
- **Centre:** a sample of the infection site (rods = bacteria, coloured by
  strain; pale cells = white blood cells; blue tint = antibiotic), Play/Pause,
  Reset and speed buttons (1× = 1 hour of the infection per second), and two
  graphs against time:
  - bacteria by strain on a log scale, with the "feels ill" level;
  - drug concentration (mg/L) with the MIC lines, the therapeutic window,
    the mutant selection window, and each dose (taken, missed or still to come).
- **Right:** what's happening (a story that updates), how ill the patient
  feels, readout tiles, key ideas, and "How the model works (and what it leaves out)".
- **Batch run** button: treat hundreds of patients and compare with theory.

## Controls

| Control | What it does |
|---|---|
| What is making the patient ill? | Bacteria, or a virus (a cold) treated with antibiotics anyway |
| Bacteria at the start | 10⁵ to 10¹⁰ (log scale) |
| Resistance already present | 0 to 1% fully resistant cells caught from someone else |
| Antibiotic | Amoxicillin-like (half-life 1 h), ciprofloxacin-like (4 h), doxycycline-like (18 h) |
| Dose, dose interval, course length | The prescription |
| Patient stops taking it | Stops after day N (or finishes the course) |
| Chance of missing a dose | Each dose is missed at random with this chance |
| Second antibiotic | Combination therapy |
| Immune system strength | 100% = healthy; 30% = weak |
| Mutation rate | Chance per new cell of a resistance mutation (10⁻¹⁰ to 10⁻⁶) |
| Fitness cost | How much more slowly resistant cells divide |
| Plasmids | Lets fully resistant cells pass resistance genes to their neighbours |
| Random seed | Same seed and settings give the same patient |
| Picture quality (Display) | Low / Medium / High / Ultra (default Medium): how many rods are drawn in the sample, about ½×, 1×, 2× or 3× the Medium number (never fewer than 40; every bacterium when there are 40 or fewer). Rods are drawn a little smaller at High and Ultra. Only the picture changes: it does not start a new patient, and the numbers, graphs and batch runs are identical at every level. Remembered in this browser. |

## Presets

Full course works · Stops after 2 days · Missed doses · Dose too low (in the
mutant selection window) · Weak immune system · Combination therapy (the same
low dose plus a second drug) · Long half-life drug with missed doses ·
Resistance already there · Antibiotics for a cold · No treatment · Long
half-life drug · High dose.

## The model

One infection site, well mixed: every bacterium sees the same drug level.
There are six genotypes: resistance to drug 1 (none, partly with MIC × 8, fully
with MIC × 64) × resistance to drug 2 (none, or MIC × 64). Counts are kept as
numbers, and each 0.1-hour step draws random numbers:

- divisions ~ Poisson(n × b × (1 − N/K) × Δt), with b = ln 2 ÷ 3 h × (1 − fitness cost), K = 10¹⁰
  (bacteria divide every few hours in the body, far more slowly than in a lab flask);
- deaths ~ Binomial(n, 1 − e^(−(d₀ + immune + drug) Δt)), with d₀ = 0.05 per hour;
- immune kill rate per cell = 0.3 × strength × 30 000 ÷ (30 000 + N) per hour
  (the immune system is swamped by a large infection);
- drug kill rate (Emax / Hill dose–response) = Emax (C/MIC)ʰ ÷ ((C/MIC)ʰ + E), with E
  chosen so that killing exactly balances growth at C = MIC (Emax 0.5 per hour for
  amoxicillin, 0.4 for the other two);
- two drugs combine by Bliss independence: 1 − (1 − f₁)(1 − f₂) of the larger
  maximum, so a second drug fills gaps rather than doubling the kill rate;
- mutations ~ Poisson(new cells × μ): sensitive → partly → fully resistant, plus
  a separate mutation for drug 2;
- plasmid transfer rate per cell = 5 × (number of plasmid carriers ÷ K) per hour.

**Drug level** (one-compartment model with absorption): a tablet goes into the
gut and is absorbed at rate kₐ; the blood level falls with the half-life. This
is solved exactly over each step.

**Before treatment** the infection grows from 100 cells to the starting size
one generation at a time, with random mutations, so resistant mutants may
already be there (the Luria–Delbrück set-up).

**Outcome**, judged 7 days after the planned end of the course: cured (no
bacteria left), resistant infection (more than half of the survivors are
resistant), or still infected (ordinary bacteria grew back).

### Assumptions and simplifications

Listed in full in the app. The main ones: one well-mixed site (no abscesses,
biofilms or hiding inside cells); no "persister" cells; the immune response
does not build up over days; the drug level in the tissue equals the blood
level; two drugs simply add their kill rates; all drugs kill (none are purely
bacteriostatic). Drug values are realistic but simplified and must not be used
for real dosing.

## Batch experiments

Each one fills the batch settings table from a preset's settings (without changing the left panel); press **▶ Run batch** to run it. The default mutation rate is
μ = 10⁻⁸ per new cell, with 10⁸ bacteria at the start. Results below are from
the default seeds.

**Batch settings table.** The batch panel lists every starting setting a run
uses: drug, second drug, dose, dose interval, course length, the day the
patient stops (99 = finishes), missed doses, immune strength, bacteria at the
start, resistance already there, mutation rate, fitness cost, plasmids, "a
virus", and the patient number (random seed), plus two things that used to be
fixed: the days watched after the course (7) and the time step (0.1 h).
Defaults are the old values, so results are unchanged. Tick one setting to
vary it and give from / to / step (+ adds the step, × multiplies by it; up to
60 steps, previewed as you type); every other setting stays at the value
shown, and a run uses exactly what the table shows. Unticking goes back to
Repeat. One-click experiments fill the whole table in from fixed default
settings, never from the left panel, so they give the same results in any
order; **↺ Use my left-panel settings** copies the left panel into the table
instead.

| Question | Set-up | Result |
|---|---|---|
| Does stopping early cause resistance? | Sweep stopping day 1–7, 40 patients each | Stopping after 1–2 days: no one cured (relapse with ordinary bacteria). From day 3: 100% cured. No resistant infections at any stopping day. |
| Where is the mutant selection window? | Sweep dose 0–500 mg, 30 each | Resistant infection: 0% at 50 mg, 100% at 100, 97% at 150, 90% at 200, 43% at 250, 7% at 300, 0% from 350. Cured 93–100% from 300 mg. Theory band 81–333 mg (drug-level and dose–response equations only). |
| Is a resistant mutant there before treatment? (1 − e^(−μN)) | Sweep starting size 10⁵–10¹⁰, 300 each | 10⁷: 0.087 vs theory 0.095; 3.16 × 10⁷: 0.280 vs 0.271; 10⁸: 0.633 vs 0.632; 3.16 × 10⁸: 0.977 vs 0.958. All within about 2 standard errors. |
| How many patients does a full course cure? | Repeat 300 | 100% cured (bar chart), although about 63% start with partly resistant mutants. |
| Do missed doses matter? | Sweep 0–60% missed, 40 each | Cured 100% (none missed), 97.5% (10%), 87.5% (20%), 47.5% (30%), 15% (40%). Resistant infection 2.5% (10%), 10% (20%), 22.5% (30–40%). |
| Luria–Delbrück: how many mutants before treatment? | Repeat 1000 at N = 10⁸ | Mean 5.8 (SD 35, max 977) vs theory mean ½μN log₂(N/N₀) = 10.0. The theory mean is set by very rare early "jackpots", so samples usually fall below it. |
| How long a course does a weak immune system need? | Immune 30%, sweep course 1–10 days | 0% cured up to 3 days, 5% at 4 days, 60–80% at 5–9 days, 92.5% at 10 days. The rest are mostly resistant infections. |

Why results scatter: every patient has different random mutations, divisions
and deaths, and each point comes from only 30–300 patients. Error bars show
± 1 standard error.

**Known limitations:** a full standard course clears the infection by about
day 4 (combination therapy about day 3), which is faster than many real
infections. Stopping early in this model causes relapse, not resistance. The
model leaves out persister cells, abscesses and biofilms, which make real
infections harder to clear. Drug values are realistic but simplified.
