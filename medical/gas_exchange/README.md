# Lungs and gas exchange

A teaching simulation (GCSE / iGCSE biology) of breathing and gas exchange in
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

## Presets

Resting at sea level · Hard exercise · Top of Everest (acclimatised climber) ·
Emphysema · Fibrosis · Anaemia · Carbon monoxide · Asthma attack · Trained
athlete · Acclimatised at altitude · Shallow breathing (dead space) · Smoker.

## The model and its equations

The model finds the steady state for the chosen settings (60 rounds of
calculation until everything agrees):

- **Air pressure:** P = 101.3 × (1 − 2.256 × 10⁻⁵ h)^5.256 kPa (standard
  atmosphere). Inspired PO₂ = 0.2093 × (P − 6.3 kPa water vapour).
- **Ventilation:** minute ventilation = rate × tidal volume. Alveolar
  ventilation = rate × (tidal volume − 0.15 L dead space).
- **Alveolar gas equations:** PACO₂ = 0.115 × VCO₂ (mL/min) ÷ alveolar
  ventilation (L/min); PAO₂ = PIO₂ − PACO₂ × (0.2093 + 0.7907 ÷ R).
- **Automatic breathing:** keeps PaCO₂ near 5.3 kPa (lower above 60%
  exercise), plus a hypoxic drive below PaO₂ ≈ 9 kPa (twice as strong when
  acclimatised). Narrow airways limit the most air you can move (∝ (1 −
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
altitude, and simple lung-volume rules for disease. The standard atmosphere
gives 31.5 kPa at the top of Everest; the real summit pressure is about 33.7
kPa.

## Batch experiments

Each run is a different person: haemoglobin, lung area, membrane thickness,
metabolism, cardiac output, breathing control, dead space and lung size all
vary randomly (seeded, so results repeat). Results below are from the default
seed.

| Question | Result |
|---|---|
| Does diffusion follow Fick's law? (sweep thickness 0.3–4 µm, rate where blood enters) | Matches Fick's law (∝ 1/thickness) within 1–3% up to 1.6 µm. Fitted log–log gradient −0.85 (theory −1). Above about 2 µm the model is higher, because blood returns from the body with less oxygen, so the pressure difference is bigger. |
| Why does SpO₂ stay normal until the membrane is badly damaged? (50% exercise) | 96.6% at 0.3 µm, 96.0% at 0.64 µm, then 90.8% at 0.97, 78% at 1.3 and 64% at 1.65 µm. This threshold comes from the safety margin in transit time and the flat top of the S-curve. |
| Does O₂ uptake follow Fick's law? (sweep area 10–100 m², 50% exercise) | Uptake is flat at about 1650 mL/min (what the muscles need) from 40 to 100 m² (perfusion-limited). It falls only below 40 m² (526 mL/min at 10 m²). Fitted gradient 0.44 vs Fick's 1. |
| SpO₂ at altitude vs real measurements | Model (mean of 20 people) vs typical measured: sea level 97.2 vs 97.5; 1500 m 94.3 vs 95.5; 3000 m 91.4 vs 90.5; 4000 m 87.9 vs 86.5; 4500 m 85.7 vs 84; 5500 m 79.7 vs 80. |
| How much do people vary? SpO₂ at rest (500 people) | Mean 97.2%, SD 0.38, range 96.0–98.1. The average person reads 97.4%. The crowd's mean is lower by 12 SE: this is real (variation pulls the mean down where the curve is flat), not chance. |
| …and during hard exercise (80%, 500 people) | Mean 96.7%, SD 1.0, range 92–98: a wider spread than at rest. |
| How much air do you need for exercise? (sweep 0–100%) | Follows the alveolar ventilation equation (CO₂ held at 5.3 kPa) within about 7% up to 80% exercise. Above that, the model rises above it (102 vs 76 L/min at 100%): the ventilatory threshold. |

**Known limitations:** the acclimatised climber on Everest reads about 45%
(arterial PO₂ 2.8 kPa); blood samples taken on the summit (2007) gave about
54% and 3.3 kPa. The variation between people in the batch is smaller than
real variation. Values are for teaching, not for clinical use.
