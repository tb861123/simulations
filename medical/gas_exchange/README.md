# Lungs and gas exchange

A teaching simulation (GCSE / iGCSE biology, with a Standard (GCSE) / Advanced (A level) switch) of breathing and gas exchange in
the alveoli. It shows the ribs and diaphragm moving, a spirometer trace, and a
zoomed-in alveolus where red blood cells travel along a capillary as oxygen
diffuses in and carbon dioxide diffuses out. Students can change altitude,
exercise and lung or blood disease, and see why the body copes or does not.

## How to run

Open `gas-exchange.html` in Chrome or Edge, with no install. It is one
self-contained file that works offline.

## What is on screen

- **Left:** 12 presets and all the controls. Changes take effect at once.
- **Centre:** the chest (lungs, ribs, diaphragm) beside a zoomed-in alveolus
  and capillary. Particles in the air sac show partial pressures (5 dots per
  kPa). Red blood cells change colour as they load oxygen (the colour change is
  exaggerated). Below these is a spirometer trace, with a button for the
  deepest possible breath (it shows vital capacity, residual volume and total
  lung capacity). There are Play/Pause, Reset and speed buttons (0.1× to 2×;
  1× is real time).
- **Right:** a pulse oximeter (SpO₂ and pulse), readout tiles, a graph of PO₂
  along the capillary (normally full within the first third), the oxygen
  dissociation curve with arterial and venous points, a story that updates,
  and "How the model works (and what it leaves out)".
- **Batch run** button: run many people with natural variation and compare
  with theory and real measurements.

## Controls

Breathing rate, tidal volume and cardiac output are automatic (the body
chooses) unless you untick "Body controls breathing and heart rate
automatically". The other controls are altitude (0–8848 m), being
acclimatised, exercise (0–100% of maximum), fitness (average / trained
athlete), alveolar surface area (10–100 m²), membrane thickness (0.2–5 µm),
airway narrowing (asthma), haemoglobin (5–21 g/dL), carbon monoxide (COHb
0–60%), smoker, and the Bohr shift on or off.

## Levels and specification

**Standard / Advanced switch** (top of the left panel, remembered in the
browser). Standard keeps the GCSE simulation as it was; Advanced keeps all of
it and adds A level views, readings, key ideas, presets and exam questions.
Advanced-only presets are hidden at Standard. Batch runs are the same at both
levels.

Levels: Standard = Pearson Edexcel International GCSE Biology (4BI1);
Advanced = OCR A level Biology A (H420). The right panel has **Key ideas**,
each tagged with its spec ("4BI1 …", "A level (H420 …)" or "Beyond the
spec"), and **📝 Exam practice**: 6 GCSE questions, plus 6 A level questions
at Advanced, each with a mark scheme. Questions marked "Your…" use the numbers
on screen; **↻ Use the numbers on screen now** rebuilds them. Spec references
are given to the topic (4BI1 section and sub-section letter, H420 topic
number), not to individual statement numbers.

- **Standard (4BI1 2(g) Gas exchange, with 2(d) diffusion and 2(h) red blood
  cells):** ventilation by the intercostal muscles and diaphragm, alveolar
  adaptations, smoking, the exercise-and-breathing practical. Altitude, the
  pulse oximeter and capillary transit time are tagged "Beyond the spec".
- **Advanced (H420 3.1.1 Exchange surfaces; 3.1.2 Transport in animals):**
  lung-volume braces on the spirometer (tidal volume, IRV, ERV, vital
  capacity), a **soda-lime spirometer** option whose trace falls by the
  oxygen used (a dashed line through the troughs gives O₂ uptake), the
  **fetal haemoglobin** curve on the dissociation graph (P50 2.5 kPa,
  approximate), and readings for vital capacity, ventilation rate = tidal
  volume × breathing rate, reserve volumes and P50 in the lungs and tissues.
- **A level presets:** Measure vital capacity, O₂ uptake at rest, O₂ uptake in
  exercise (both with soda lime), No Bohr shift.

## Presets

Resting at sea level · Hard exercise · High on Everest (8400 m, acclimatised climber) ·
Emphysema · Fibrosis · Anaemia · Carbon monoxide · Asthma attack · Trained
athlete · Acclimatised at altitude · Shallow breathing (dead space) · Smoker.

## The model and its equations

The model finds the steady state for the chosen settings (60 rounds of
calculation until everything agrees):

- **Air pressure:** West's formula, P (mmHg) = exp(6.63268 − 0.1112 h − 0.00149 h²)
  with h in km, fitted to pressures measured on high mountains. It gives 33.7 kPa
  (253 mmHg) on the summit of Everest, as measured there. (The standard atmosphere
  gives only 31.4 kPa, because near the equator the air is warmer.)
  Inspired PO₂ = 0.2093 × (P − 6.3 kPa water vapour).
- **Ventilation:** minute ventilation = rate × tidal volume. Alveolar
  ventilation = rate × (tidal volume − 0.15 L dead space).
- **Alveolar gas equations:** PACO₂ = 0.115 × VCO₂ (mL/min) ÷ alveolar
  ventilation (L/min); PAO₂ = PIO₂ − PACO₂ × (0.2093 + 0.7907 ÷ R).
- **Automatic breathing:** keeps PaCO₂ near 5.3 kPa (lower above 60%
  exercise), plus a hypoxic drive below PaO₂ ≈ 9 kPa (2.2 times as strong when
  acclimatised, which drives CO₂ right down and so raises alveolar PO₂). Narrow airways limit the most air you can move (∝ (1 −
  narrowing)⁴, Poiseuille).
- **Fick's law:** diffusing capacity D = 3.0 × area ÷ thickness (mL O₂/min/kPa,
  area in m², thickness in µm). 45% of capillaries are in use at rest and 100%
  in hard exercise. Along the capillary (80 steps), oxygen moves in at
  D × (PAO₂ − P_capillary). CO₂ crosses 20 times faster.
- **Transit time** = capillary blood volume (75–150 mL) ÷ cardiac output:
  0.9 s at rest, 0.3–0.45 s in hard exercise.
- **Haemoglobin:** 1.34 mL O₂ per g at full saturation. Saturation follows the
  Severinghaus equation (P50 = 3.6 kPa), plus 0.0225 mL/dL dissolved per kPa.
  Bohr shift: P50 × 10^(−0.48 ΔpH), with ΔpH = −0.06 per kPa of extra CO₂, plus
  acid and heat in exercising muscle. CO blocks part of the haemoglobin and
  shifts the rest to the left. A pulse oximeter counts COHb as oxygen.
- **Mismatch (shunt):** 2% of blood normally misses fresh air; more with
  asthma, emphysema and fibrosis.
- **Tissues:** oxygen demand is 250 mL/min at rest, up to 3000 (athlete 5000).
  Fick principle: uptake = cardiac output × (arterial − venous content).
  Uptake is capped if the muscles cannot extract any more.

Assumptions are listed in full in the app. The main ones: a steady state only
(no time to adapt), one average alveolus and capillary for the whole lung,
haemoglobin reacts instantly, a simple version of the kidneys' adaptation at
altitude, and simple lung-volume rules for disease.

## Batch experiments

Each run is a different person: haemoglobin, lung area, membrane thickness,
metabolism, cardiac output, breathing control, dead space and lung size all
vary randomly (seeded, so results repeat). Results below are from the default
seed.

**Batch settings table.** The batch panel lists every starting setting a run
uses: altitude, acclimatised, exercise, athlete, surface area, membrane
thickness, airway narrowing, haemoglobin, carbon monoxide, smoker, Bohr shift,
automatic breathing (and the manual rate, tidal volume and cardiac output used
when it is off), "no person-to-person differences", and the ten
person-to-person spreads that used to be fixed (SD as a % of the average:
haemoglobin 7, area 10, thickness 10, P50 4, oxygen use 10, cardiac output 10,
low-O₂ breathing response 35, dead space 15, fitness 10, lung size 8).
Defaults are the old values, so results are unchanged. Tick one setting to
vary it and give from / to / step (+ adds the step, × multiplies by it; up to
60 steps, previewed as you type); every other setting stays at the value
shown, and a run uses exactly what the table shows. Unticking goes back to
Repeat. One-click experiments fill the whole table in from fixed default
settings, never from the left panel, so they give the same results in any
order; **↺ Use my left-panel settings** copies the left panel into the table
instead.

| Question | Result |
|---|---|
| Does diffusion follow Fick's law? (sweep thickness 0.3–4 µm, rate where blood enters) | Matches Fick's law (∝ 1/thickness) within 1–3% up to 1.6 µm. Fitted log–log gradient −0.85 (theory −1). Above about 2 µm the model is higher, because blood returns from the body with less oxygen, so the pressure difference is bigger. |
| Why does SpO₂ stay normal until the membrane is badly damaged? (50% exercise) | 96.6% at 0.3 µm, 96.0% at 0.64 µm, then 89.5% at 0.97, 74% at 1.3 and 61% at 1.65 µm. This threshold comes from the safety margin in transit time and the flat top of the S-curve. |
| Does O₂ uptake follow Fick's law? (sweep area 10–100 m², 50% exercise) | Uptake is flat at about 1650 mL/min (what the muscles need) from 40 to 100 m² (perfusion-limited). It falls only below 40 m² (510 mL/min at 10 m²). Fitted gradient 0.46 vs Fick's 1. |
| SpO₂ at altitude vs real measurements (unacclimatised) | Model (mean of 20 people) vs typical measured: sea level 97.2 vs 97.5; 1500 m 94.5 vs 95.5; 2500 m 91.9 vs 92.5; 3000 m 91.1 vs 90.5; 4000 m 86.8 vs 86.5; 4500 m 84.1 vs 84; 5500 m 76.9 vs 80 (the average person: 79.1). |
| Everest check: blood from climbers at 8400 m (500 acclimatised people, Hb 19 g/dL) | Model mean PaO₂ 3.16 kPa (SD 0.40, range 2.2–4.2), PaCO₂ 1.75 kPa, SaO₂ 50.8% (range 30–71%). Grocott et al. 2009 (NEJM), four climbers breathing air at 8400 m on the way down from the summit: PaO₂ 3.28 kPa (range 2.55–3.93), PaCO₂ 1.77 kPa, SaO₂ about 54% (34–70%). The average person in the model gives 3.21 kPa, 1.69 kPa and 52.3%. |
| How much do people vary? SpO₂ at rest (500 people) | Mean 97.2%, SD 0.38, range 96.0–98.1. The average person reads 97.4%. The crowd's mean is lower by 12 SE: this is real (variation pulls the mean down where the curve is flat), not chance. |
| …and during hard exercise (80%, 500 people) | Mean 96.7%, SD 1.05, range 91–98: a wider spread than at rest. |
| How much air do you need for exercise? (sweep 0–100%) | Follows the alveolar ventilation equation (CO₂ held at 5.3 kPa) within about 7% up to 80% exercise. Above that, the model rises above it (102 vs 76 L/min at 100%): the ventilatory threshold. |

**Known limitations:** Grocott's samples were taken at 8400 m (36.3 kPa), so
the Everest preset uses that height. On the summit itself (33.7 kPa) the model
predicts SpO₂ about 45%, PaO₂ 2.85 kPa and PaCO₂ 1.61 kPa; no blood has been
taken there. Above about 5000 m the model's average for unacclimatised
visitors is 2–3% below the survey values, because random variation pulls the
mean down on the steep part of the curve. The variation between people in the
batch is smaller than real variation. Values are for teaching, not for
clinical use.
