# Homeostasis

A single, self-contained HTML file (`homeostasis.html`) for biology. Open it
in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel International GCSE Biology (4BI1),
section 2: **2(j) Co-ordination and response** (homeostasis, 2.81; insulin
controlling blood glucose and the liver's glycogen store, 2.94;
thermoregulation by the skin: sweating, vasodilation and vasoconstriction,
shivering, 2.93; hormones such as ADH and adrenaline; nervous and hormonal
control compared; 2.81, 2.93 and 2.94 carry no B) and **2(i) Excretion**
(2.72B–2.79B, all Biology only: the kidney and nephron, ultrafiltration,
selective reabsorption of glucose, water reabsorption in the collecting duct,
ADH and osmoregulation, the composition of urine). Glucagon, negative
feedback and the names type 1 and type 2 diabetes are not in the 4BI1
wording, so at Standard they are tagged "beyond the 4BI1 wording".
**Advanced** follows OCR A level Biology A (H420) Module 5: **5.1.1
Communication and homeostasis** (cell signalling, negative and positive
feedback, endotherms and ectotherms), **5.1.2 Excretion as an example of
homeostatic control** (the nephron in detail, the loop of Henle, the
collecting duct and ADH, kidney failure,
dialysis and transplants, urine testing including pregnancy tests with
monoclonal antibodies), **5.1.4 Hormonal communication** (insulin
secretion by beta cells, control of blood glucose, diabetes types 1 and 2 and
their treatment, including the potential of stem cells: 5.1.4(e)) and
**5.1.5(j)** (adrenaline, adenylyl cyclase and the second messenger cyclic
AMP). The name "countercurrent multiplier" is tagged as beyond the H420
5.1.2 wording (enrichment), and the glucose tolerance test as clinical
enrichment, not in H420.

## What it shows

- **🩸 Blood glucose** (the core): a body with stomach, small intestine,
  liver (with its glycogen store), pancreas (alpha and beta cells), muscle,
  brain and kidney, joined by the blood, with glucose, insulin and glucagon
  particles and arrows whose width shows each rate. A day from 06:00 to
  midnight with breakfast, lunch and dinner and an optional walk or run, or a
  75 g glucose tolerance test. People: no diabetes, type 2, type 1;
  treatments: insulin injections (rapid-acting by carbohydrate counting,
  long-acting), metformin, none, and (A level) stem-cell beta cells. A gauge
  shows the normal range, hypo and hyper levels. Graphs: glucose through the
  day (with the same day for someone without diabetes); insulin, glucagon and
  glycogen; your glucose tolerance tests against the WHO thresholds; UK
  diabetes prevalence (real data).
- **🌡️ Body temperature**: a person in a room (air temperature, humidity,
  activity, clothing) with heat-flow arrows and a skin cross-section (sweat
  gland, arterioles dilating and constricting, hair erector muscle, fat);
  shivering; a "hypothalamus control working" switch. A level adds a lizard
  (an ectotherm) shuttling between sun and shade. Graphs: core and skin
  temperature with data-logger readings (PAG10); sweating, shivering and skin
  blood flow; body temperature against air temperature for an endotherm, the
  same body with no control, and an ectotherm.
- **🫘 Kidney and water**: a nephron in the cortex and medulla (the medulla
  shaded by its salt gradient) with water, glucose and urea particles,
  reabsorption arrows, ADH and a bladder. Drink, eat a salty meal, exercise in
  the heat; blood glucose for the renal threshold. A level: kidney function
  (GFR), dialysis, diabetes insipidus, hCG in the urine. Graphs: urine flow,
  ADH and blood concentration over time; urine tests (Benedict's, PAG9) and a
  colorimeter calibration line with unknowns (PAG5); filtrate concentration
  along the nephron (A level); blood urea over days in kidney failure and
  dialysis (A level).
- **📡 Feedback and signalling**: a negative feedback loop (stimulus →
  receptor → coordination centre → effector → response) with a disturbance
  button; (A level) positive feedback, a beta cell (GLUT2, ATP, K⁺ channels,
  depolarisation, Ca²⁺, exocytosis of insulin) and a liver cell (adrenaline →
  receptor → G protein → adenylyl cyclase → cAMP → protein kinase A →
  glycogen phosphorylase) with amplification on a log scale.

Right panel: what's happening, the feedback summary, readings, results tables
(glucose tolerance tests, data logger, urine tests, colorimeter), a nervous
versus hormonal table, key ideas tagged by spec, exam practice (10 GCSE and 9
A level questions with mark schemes; on-screen numbers for percentage change,
percentage reabsorbed, the colorimeter reading and kidney function) and "How
the model works (and what it leaves out)". Links to Heart and Circulation,
Nerve Impulse, Membranes and Movement, Photosynthesis and Respiration,
Enzymes, Immunity and Vaccination, and Central Limit Theorem.

## Controls

- **Presets** (12): A day of meals · Type 1 diabetes · Glucose tolerance test
  · A hot day · Out in the cold · Drinking and ADH · and at A level: Insulin
  from beta cells · Adrenaline and cAMP · Endotherms and ectotherms · The
  nephron in detail · Kidney failure and dialysis · Urine tests (PAG9, PAG5).
- Glucose: day or tolerance test, person, food, carbohydrate, skip breakfast,
  exercise and its time, treatment, rapid-acting and long-acting insulin.
  Temperature: air temperature, humidity, activity, clothing, control on/off,
  sun (lizard). Kidney: drink size and Drink, salty meal, exercising in the
  heat, blood glucose; A level: GFR, dialysis, diabetes insipidus, hCG; test
  the urine; colorimeter run. Signalling: picture, feedback type,
  disturbance; A level: glucose at the beta cell, fright (adrenaline).
- 🧪 New trial (a new person: insulin secretion and sensitivity ±15%; or new
  random readings) and 🗑 Clear.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered):
  glucose, hormone, sweat and water particles drawn (12 / 36 / 80 / 160) and
  small details. Picture only; the models and batch runs are unchanged.
- Play / Pause, Reset, speeds, hide/show panels, full screen.

## The models

- Glucose: one pool of about 14 L. Stomach → small intestine → blood (the
  stomach passes on up to 1.0 / 0.6 / 0.35 g of carbohydrate a minute for
  sugary / mixed / starchy food). Brain 0.55 G/(G + 2) mmol/min (no insulin
  needed); muscle (0.004 + 0.0042 I_eff) G (more in exercise); liver stores
  glycogen at 0.004 I_eff G (up to 100 g) and releases glucose at
  (0.3 + 0.55 glucagon)/(1 + 0.06 I_eff); urine loss above 10 mmol/L.
  Insulin secretion rises steeply above about 5 mmol/L (plus a gut-hormone
  boost while food is absorbed); half-life about 6 minutes. Type 2: beta cells
  38%, sensitivity 30%, liver output ×1.5; type 1: beta cells 2%, weak
  glucagon response. Injected insulin reaches the blood over 1–3 hours.
- Temperature: core 157 kJ/°C, shell 52 kJ/°C; metabolism 80 / 220 / 450 W;
  shivering up to 250 W; core-to-skin conductance 10–90 W/°C; skin-to-air
  heat loss 1.8 m² ÷ (clothing + 0.12); sweat up to 25 g/min at 2.4 kJ/g,
  limited by humidity. Lizard: time constant 10 min, +9 °C in sun, moves
  below 32 °C / above 36 °C.
- Kidney: blood concentration 287 − 0.0068 × extra water (mL); ADH =
  0.42 × (concentration − 283); urine concentration 60–1200 mOsm/kg; urine
  flow = 0.45 mOsm/min ÷ urine concentration; GFR 125 mL/min; urea
  400 mmol/day cleared at half the GFR; dialysis 4 h every other day.
- Colorimeter: absorbance = 0.85 − 0.06 × glucose, read to ±0.015.
- Beta cell and cAMP: switch-like curves showing the sequence and
  amplification (illustrative).

## Data and sources (approximate)

- UK diabetes: Diabetes UK estimates of people with diagnosed diabetes: about
  1.4 million (1996), 3.5 million (2015), about 4.4 million (2023), plus about
  1.2 million undiagnosed; about 90% type 2, 8% type 1. England GP registers
  (NHS Digital Quality and Outcomes Framework, QOF): about 5.4% of patients
  aged 17+ (2009–10) rising to about 7.5% (2022–23). Values from memory:
  marked approximate in the sim; check the latest releases.
- Diagnosis: WHO (2006) / NICE: fasting ≥ 7.0 mmol/L or 2-hour ≥ 11.1 mmol/L
  after 75 g glucose; impaired glucose tolerance 7.8–11.0.
- Normal ranges: blood glucose 4–7 mmol/L; blood urea 2.5–7.8 mmol/L; plasma
  osmolality 285–295 mOsm/kg; GFR about 125 mL/min (180 L/day); urine up to
  about 1200 mOsm/kg (textbook values).
- All other constants are illustrative, chosen to give realistic proportions.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Glucose tolerance test: type 2:** 200 people (insulin secretion and
   sensitivity ±15%), 2-hour meter reading: mean 16.95 mmol/L (average
   person 16.95), SD 1.4, standard error 0.10; all above 11.1.
2. **Bigger meals, higher peaks:** carbohydrate × 0.5 → 2, no diabetes: the
   day's peak rises only from 6.9 to 7.8 mmol/L (model 7.0 → 7.9); untreated
   type 2 (grey) 13.2 → 22.2.
3. **Insulin dose and hypos:** type 1 with a run at 16:00, rapid-acting
   insulin 0 → 3 units per 10 g: lowest glucose 4.3 → 2.6 mmol/L (model
   4.4 → 2.8); below 3.5 from about 2 units per 10 g.
4. **Keeping 37 °C in any weather:** air −5 → 45 °C for 2 hours: core
   36.91–37.09 °C (model the same within 0.01); with no control 29.3 → 39.9 °C.
5. **Drinking and urine: ADH:** 0 → 2000 mL: urine in 3 hours 139 → 1303 mL
   (model 140 → 1305); gradient 0.67; with no ADH 733 → 1326 mL.
6. **The renal threshold for glucose:** blood glucose 4 → 24 mmol/L: none
   below 8, then 0.26 (12) → 1.79 mmol/min (24) against the sharp-threshold
   line 0.25 → 1.75; the means round the corner ("splay").
7. **How good is the colorimeter? (PAG5):** 200 calibrations, unknown
   6 mmol/L: mean 6.04, SD 0.26 (theory SD 0.27).
8. **Kidney failure: blood urea:** GFR 5 → 100%: 90.8 → 4.54 mmol/L against
   production ÷ clearance 88.9 → 4.44; log–log gradient −1.000 (theory −1).

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
