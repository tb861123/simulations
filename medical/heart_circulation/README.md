# The Heart and Circulation

A single, self-contained HTML file (`heart-circulation.html`) that shows how
the heart pumps blood round the double circulation, for GCSE / iGCSE / WJEC
biology, with a Standard (GCSE) / Advanced (A level) switch. Open `heart-circulation.html` in Chrome or Edge. Nothing needs to be
installed and no internet is needed.

## What it shows

- **A cut-away heart** (seen from the front, so the heart's right side is on
  your left). The four chambers swell and squeeze in time with the beat, the
  four valves open and shut, and blood flows through them (red = oxygenated,
  blue = deoxygenated). Each chamber shows its pressure in mmHg. Leaky valves
  flash "leak!" when blood goes backwards.
- **The double circulation**: a loop diagram with the lungs (pulmonary
  circuit) and the body (systemic circuit). It shows the live pressures and
  the flow round each loop.
- **A Wiggers diagram** that sweeps across like a hospital monitor: aortic,
  left-ventricle and left-atrium pressures, left-ventricle volume and an ECG
  on one time axis. "lub" (S1) and "dub" (S2) are marked where the valves shut.
- **A pressure–volume loop** for the left ventricle, with the full-squeeze
  (end-systolic) and relaxed (end-diastolic) stiffness lines.
- **Readouts**: heart rate, blood pressure (systolic/diastolic), mean arterial
  pressure, stroke volume, cardiac output (= HR × SV), ejection fraction,
  venous pressure and left atrial pressure. A "What's happening" panel
  explains the current state, and a pill above the picture names the phase
  of the cardiac cycle.
- Optional heart sounds ("lub-dub", off by default).

1× runs in real time; ¼× and ½× give slow motion to watch the valves.

## Controls

Heart rate, contractility, heart failure, valve problem (leaky mitral, aortic
stenosis, leaky aortic, mitral stenosis) and its severity, hole in the heart
(ventricular septal defect), blood volume (haemorrhage or transfusion),
arteriole resistance (narrowed arteries / vasodilation), artery stiffness
(age), exercise level, the baroreceptor reflex (on/off) and sound. Changes
take effect at once without restarting.

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

- **Standard (4BI1 2(h) Transport):** structure of the heart, double
  circulation, valves, heart rate with exercise and adrenaline, coronary heart
  disease. Valve disease, the pressure–volume loop and the pressure graph are
  tagged "Beyond the spec".
- **Advanced (H420 3.1.2 Transport in animals; 5.1.5 for control of heart
  rate):** the conduction system drawn on the heart (SAN, AVN, bundle of His,
  Purkyne fibres) lighting up in time with each beat; labels on the Wiggers
  pressure graph where the AV and semilunar valves open and shut, and P, QRS
  and T on the ECG; readings for the R–R interval (heart rate = 60 ÷ R–R),
  PR interval, pulmonary artery pressure and peak LV pressure; a **Heart
  rhythm** control: normal sinus rhythm, atrial fibrillation (no P waves,
  irregular QRS) and ectopic beats (every 5th beat early with a wide QRS,
  then a compensatory pause). Rhythms are live view only; batch runs always
  use a normal rhythm.
- **A level presets:** Reading the cardiac cycle (¼ speed), Adrenaline
  (sympathetic), Atrial fibrillation, Ectopic beats.

## Presets

Resting adult, exercise, trained athlete, high blood pressure, old stiff
arteries, heart failure, leaky mitral valve, aortic stenosis, leaky aortic
valve, blood loss (with reflexes), hole in the heart, and a too-fast heart
(SVT at 190 beats/min).

## The model

A lumped ("Windkessel") model with nine compartments: left atrium, left
ventricle, aorta, body arteries, body veins, right atrium, right ventricle,
pulmonary arteries and pulmonary veins. The capillaries are the resistance
between arteries and veins.

- Chambers (time-varying elastance): `P = E(t) × (V − V0)`. E rises from
  E_min to E_max as the muscle contracts, then falls. Left ventricle
  E_max 2.6, E_min 0.075 mmHg/mL; right ventricle 0.55 and 0.035.
- Vessels: `P = (V − V0) / C`, with compliance C divided by the stiffness
  setting for the aorta and arteries.
- Flow: `Q = ΔP / R` (Ohm's law for blood). Body resistance 0.95 mmHg·s/mL,
  lungs 0.085.
- Valves only open forwards. Flow through an opening of area A follows the
  Gorlin/Bernoulli relation `ΔP = (Q / 44.3A)²`. Stenosis shrinks A; a leaky
  valve has a small backwards opening.
- Timing: atria first, then after the AV delay the ventricles contract for
  0.16 + 0.13T s and relax for 55% of that (T = time per beat). Fast rates
  squeeze out filling time.
- Exercise raises heart rate and contractility, lowers body resistance by
  62% and returns about 800 mL of blood from the veins to the heart.
- Heart failure weakens and enlarges the left ventricle.
- The optional baroreflex adjusts heart rate, resistance, contractility and
  vein tone over a few seconds to hold mean pressure near 93 mmHg.
- Integration: Euler steps of 0.2 ms.

Resting values: about 117/72 mmHg, MAP 93 mmHg, cardiac output 5.2 L/min,
stroke volume 72 mL, ejection fraction 58%.

### Assumptions and simplifications

No blood momentum (so no proper dicrotic notch), no pericardium, breathing,
gravity or posture, no coronary circulation, no kidney control of blood
volume and no hormones. The body is one combined circuit, not separate
organs. The ECG and heart sounds are drawn from the timing, not calculated.
The blood pressure shown is aortic (an arm cuff reads a few mmHg higher
systolic). The heart picture is simplified and not to scale. The full list is
inside the simulation under "How the model works".

## Batch run

**📊 Batch run** opens a panel over the centre view. Each run simulates
20–40 s of heartbeats with no drawing (about 0.02 s of computer time), then
averages the last few beats. Mode A repeats a set-up N times with random
patient variation (age 18–80, with normal differences in resistance, artery
stiffness, heart rate, contractility and blood volume). Mode B sweeps one
input. Results show as a histogram or as a scatter graph with mean ± 1 SD
error bars, with theory overlaid, a summary table and a CSV download.

**Batch settings table.** The batch panel lists every starting setting a run
uses: heart rate, contractility, heart failure, valve problem and how bad it
is, hole between the ventricles, blood volume, blood loss, arteriole
resistance, artery stiffness, exercise and reflexes, plus things that used to
be fixed: the seconds of heartbeats run before measuring (20, or 40 with
reflexes) and the random-patient spreads (ages 18–80; SD 8% stiffness, 8%
resistance, 8 beats/min, 6% contractility, 3.5% blood volume). Defaults are
the old values, so results are unchanged. Each batch now uses fixed seeds (it
used a random starting seed before), so a batch gives the same result every
time. Tick one setting to vary it and give from / to / step (+ adds the step,
× multiplies by it; up to 60 steps, previewed as you type); every other
setting stays at the value shown, and a run uses exactly what the table shows.
Unticking goes back to Repeat. One-click experiments fill the whole table in
from fixed default settings, never from the left panel, so they give the same
results in any order; **↺ Use my left-panel settings** copies the left panel
into the table instead.

| Experiment | What it shows | Typical result |
|---|---|---|
| Does a faster heart always pump more blood? | CO vs HR against the naïve CO = HR × SV | CO peaks at about 6 L/min near 100–120 beats/min, then falls to about 3.5 L/min at 220 |
| Is mean pressure = cardiac output × resistance? | MAP vs resistance against MAP = CVP + CO₀ × R | Model bends below the line (the heart pumps less against high resistance), but MAP − CVP = CO × R holds to within 0.2% at every step |
| How spread out is blood pressure in a population? | 500 random patients against an approximate UK adult distribution (mean 126, SD 17) | Model mean 127–128 mmHg, SD about 15; 18–19% at 140/90 or above |
| When does blood loss cause shock? | Systolic pressure vs % blood loss, reflexes on | Falls below 90 mmHg at about 28% loss (clinical guide: about 30%, class III) |
| Why do stiff arteries widen the pulse pressure? | Pulse pressure vs stiffness against PP ∝ 1/compliance | Rises in a straight line, about 17% below the simple theory at 2.6× stiffness |
