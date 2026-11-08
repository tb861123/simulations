# Immunity and Vaccination

A single, self-contained HTML file (`immunity.html`) for biology. Open it in
Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1):
pathogens (bacteria, viruses, fungi, protoctists; section 1) and the immune
system in section **2(h) Transport**: phagocytes ingesting pathogens,
lymphocytes releasing antibodies specific to the pathogen, vaccination and
memory cells (antibodies made sooner, faster and in greater quantity), and
platelets and clotting as a barrier. "Antibiotics kill bacteria, not
viruses" is tagged "4BI1: check the wording".
**Advanced** follows OCR A level Biology A (H420) Module 4, **4.1.1
Communicable diseases, disease prevention and the immune system**: primary
non-specific defences, inflammation, phagocytosis (phagosome, lysosome,
antigen presentation), the specific response (clonal selection and
expansion; T helper, T killer, B, plasma and memory cells; cytokines),
antibodies as opsonins, agglutinins and antitoxins, primary and secondary
responses, active and passive, natural and artificial immunity, autoimmune
disease, vaccination programmes and antibiotics. Monoclonal antibodies are
tagged "partly beyond H420 4.1.1; pregnancy tests are in 5.1.2".
Spread through a population and herd immunity are in
[Epidemics](../epidemics/epidemics.html); this sim is the response inside
one body, and links there rather than repeating it.

## What it shows

- **🦠 In the tissue** (the core, an agent model): a patch of tissue under
  the skin with a capillary below. Every pathogen, phagocyte, killer T cell
  and tissue cell is modelled one by one. Bacteria divide; viruses and the
  malaria parasite (a protoctist) enter cells and burst them; fungi grow
  slowly. The skin keeps 95% out unless it is cut; a clot seals the cut.
  Inflammation brings neutrophils from the blood; phagocytes chase pathogens
  (chemotaxis), engulf and digest them (lysosomes), and macrophages present
  antigens. A lymph node box shows clonal selection and expansion, plasma
  cells and memory cells; antibodies (Y shapes) clump and mark pathogens and
  neutralise viruses; killer T cells destroy infected cells. Immune history:
  never met it, had it before, vaccinated, given antibodies. A level adds
  autoimmune disease (T cells attacking healthy cells). Graphs: pathogens and
  white cells; antibodies and inflammation; damaged tissue.
- **📈 Antibody responses**: a timeline of up to three events (infection,
  infection with a different pathogen, vaccine, booster, antibody injection)
  over 80–180 days, with a "well / ill" indicator and the lymph node.
  Graphs: antibody concentration (log or linear; dashed comparisons such as a
  first infection on the same day, or no vaccine); pathogen load against the
  illness level; (A level) dividing cells, plasma cells and memory cells.
- **🔬 Lab practicals**: a stained blood smear at ×400 (PAG1): fields of red
  and white cells, a differential count of 100 white cells for a healthy
  adult or patients with bacterial, viral or worm/allergy infections, and
  eyepiece-graticule sizes. Antibiotic discs on a bacterial lawn (PAG7):
  S. aureus, MRSA, E. coli or a virus culture; 48 hours' incubation; zones
  measured with a ruler. Graphs: the differential count (±2 SE) against
  typical values; cell sizes; zone diameters by antibiotic over repeated
  plates; zone diameter against the amount of antibiotic.
- **💉 Vaccination programmes**: 100 children coloured by vaccinated and
  protected, the UK routine schedule, and (graphs) UK vaccine coverage (real
  COVER data) against the WHO 95% target; herd immunity thresholds
  1 − 1/R₀ for eight diseases against current protection; (A level) types of
  immunity: active natural, active artificial and passive, each meeting the
  pathogen again on day 60.

Right panel: what's happening, readings, results tables (responses,
differential count, plates, coverage), key ideas tagged by spec, exam
practice (9 GCSE and 8 A level questions with mark schemes; on-screen numbers
for the secondary/primary ratio, the differential count, zone areas,
magnification and the herd immunity threshold) and "How the model works (and
what it leaves out)". Links to Epidemics, Antibiotic Resistance, Natural
Selection, Heart and Circulation, Homeostasis and Central Limit Theorem.

## Controls

- **Presets** (12): Bacteria in a cut · A virus infection · Primary and
  secondary · Vaccination · White blood cells · Vaccines in the UK · and at
  A level: Inflammation and phagocytosis · Clonal selection and expansion ·
  Killer T cells · Types of immunity · Antibiotics and viruses (PAG7) ·
  Autoimmune disease.
- Tissue: pathogen, number arriving, barrier broken, immune history, resident
  macrophages, labels. Responses: day-0 event, second and third events and
  their days, infection size, log scale. Lab: practical, patient, name the
  cells, organism, antibiotic per disc. Programmes: vaccine, disease, vaccine
  effectiveness.
- 🧪 New trial (new random numbers: a new tissue, person, smear or plate;
  results kept) and 🗑 Clear.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  antibodies drawn (15 / 50 / 120 / 250), detail inside cells (lysosomes,
  presented antigens, viruses inside cells), red cells in the smear and the
  bacterial lawn texture. Picture only: every pathogen and cell is still
  modelled, and batch runs are unchanged.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Specific response (time in days): each meeting with an antigen starts a
  pulse of plasma-cell activity P ∝ x e^(1 − x/w): first meeting lag 3 days,
  w = 2.6 days; with memory cells lag 0.5 day, w = 1.2 days and 15× larger
  (more with each meeting). dA/dt = P − A/30. Killer T cells ∝ P. Vaccine:
  60% of an infection's pulse; passive: +40 units of antibody, no memory.
- Pathogen load: dL/dt = 2.6 L (1 − L/10⁵) − 1.2 L/(1 + L/5) − 0.25 A L −
  1.5 T L; ill while L > 100.
- Tissue (agent model, steps of 6 minutes): bacteria double in about 2.3 h
  (up to 400); viruses: cell bursts after 8 h releasing 6, free virus
  half-life about 3 h; malaria parasite bursts after 24 h; phagocytes engulf
  at 3% per step when touching (30% if opsonised) and digest in 1–3 h;
  neutrophils recruited at (0.4 + 5 × inflammation) per hour, up to 60;
  antibodies bind at 0.08 × A per hour; killer T cells arrive at T per hour
  (up to 30). Dead cells are replaced after 2 days.
- Blood smear: typical proportions (see sources); sizes ±8%; graticule
  2.5 µm per division at ×400, read to half a division.
- Discs: zone = 6 + 9√ln(content/critical) mm; plates ±0.8 mm; ruler
  ±0.5 mm.

## Data and sources (approximate)

- UK vaccine coverage: UKHSA / NHS England, Childhood Vaccination Coverage
  Statistics (COVER), England, 2013–14 to 2023–24: MMR first dose by 2 years
  from about 92.7% to 88.9%; 6-in-1 (three doses) by 1 year from about 94.3%
  to 91.2%; MMR second dose by 5 years from about 88.3% to 83.9%. Values from
  memory: marked approximate in the sim; check the latest release.
- WHO target: 95% coverage. R₀ ranges (typical textbook values): measles
  12–18, whooping cough 12–17, mumps 4–7, rubella 6–7, polio 5–7, diphtheria
  6–7, COVID-19 (2020 variant) 2.5–3.5, seasonal flu 1.3–1.8.
- UK routine schedule: approximate, about 2024 (the schedule changes; check
  the current NHS schedule).
- White cell proportions (healthy adult): neutrophils about 60%, lymphocytes
  30%, monocytes 6%, eosinophils 3%, basophils 1% (textbook values; real
  ranges are wide). Sizes: neutrophil about 12 µm, lymphocyte 8–9 µm,
  monocyte 16 µm, red cell 7.5 µm.
- Antibody timings follow the usual textbook primary/secondary curves;
  amounts are arbitrary units. All other constants are illustrative.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **How much bigger is the secondary response?** 200 people (clone growth,
   phagocytes and memory ±20%): secondary ÷ primary peak mean 7.15
   (SD 3.1, SE 0.22) against 8.23 for the average person: the spread is
   lopsided (explained in the note).
2. **Time to the antibody peak:** gap 15 → 300 days: secondary peak
   6.3–6.5 days after re-infection (model 6.4–6.5), primary 13.8 days.
3. **Bigger doses, more illness:** infection 0.01 → 100 × usual: days ill
   0 → 8.8 (average person 0 → 8.1); vaccinated (grey) 0 except 0.7 days at
   100 ×.
4. **Memory in the tissue (agent model):** 4 → 60 viruses: cleared in
   2.9–3.7 days against 9.8–11.6 days for the smooth model: the tissue runs
   out of cells to infect (explained in the note: theory fails here).
5. **Skin as a barrier:** 200 runs of 200 pathogens: mean 9.89 got in
   (theory 10), SD 2.99 (binomial theory 3.08).
6. **How many cells should you count? (PAG1):** 10 → 1000 cells: proportion
   of neutrophils 0.61 ± 0.17 (10 cells) → 0.597 ± 0.013 (1000), true 0.60;
   SD falls as 1/√n.
7. **Antibiotic dose and zone size (PAG7):** penicillin 0.1 → 300 µg on
   S. aureus: 13.3 → 32.5 mm against the diffusion rule 13.5 → 32.6 mm,
   SD about 1 mm.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
