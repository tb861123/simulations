# Fitness Testing

A single, self-contained HTML file (`fitness-testing.html`) for PE. Open
`fitness-testing.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587); Advanced
follows OCR A level Physical Education (H555). Switch with the **Level**
buttons. What training changes is modelled in
`physical_education/training_adaptation` (linked from the page).

## What it shows

A squad of simulated performers (6–30, boys, girls or mixed, 15–16 or 17–19,
inactive / typical / county-level) does the standard fitness tests. Each
performer has true values for every component of fitness; every recorded
score is the true score plus day-to-day variation, trial-to-trial variation,
tester error and protocol effects.

Tests: multi-stage fitness (bleep) test and Cooper 12-minute run (the whole
squad runs together, seen from above), sit and reach, hand grip
dynamometer, Illinois agility run (seen from above), 30 m sprint, vertical
jump (with the Lewis power formula), one-minute sit-up and press-up tests,
ruler drop (with t = √(2d ÷ g)), Harvard step test (with the three pulse
counts and the index), and at A level the Queens College step test (VO₂ max
from a 15 s pulse count). Each has its protocol, equipment, component
(health- or skill-related), maximal or submaximal, and its rating table with
the source.

Each test is tagged with the OCR spec that names it, from the test lists in
J587 1.2.a (Cooper 12 minute run/walk, multi-stage fitness test, press-up,
sit-up, 30 m sprint, grip dynamometer, 1RM, standing or vertical jump, sit and
reach, Illinois agility, stork stand, wall throw, ruler drop) and H555 1.2.b
(direct gas analysis VO₂ max, NCF multi-stage fitness test, Queen's College
step test, Cooper 12 minute run, grip dynamometer, 1RM, press-up or sit-up,
vertical jump, sit and reach, goniometer). The **Harvard step test** and the
**YMCA sit-up protocol and norms** are tagged "not named in the OCR specs".
OCR prescribes no norm tables: those used here are approximate, with sources.

Graph tabs: **Squad results** (bar chart coloured by rating, mean and
median lines), **Ratings** (frequency of each rating), **Retest** (the same
test a week later, against the line of perfect agreement; A level adds the
typical error band), **Training** (line graph of every performer retested
every 2 weeks during training, with the smallest worthwhile change band at A
level), **Validity** (the test against a criterion: lab VO₂ max, goniometer
hamstring flexibility, force-plate peak power) and **Profile** (one
performer's rating on every test, health- and skill-related).

Right panel: the story, live statistics (mean, median, mode, range; A level
SD and sensitivity; typical error, CV and the smallest worthwhile change,
tagged "beyond the spec" because H555 does not name them), the
results table (click a name to follow that performer), the rating table, the
components of fitness and their tests, key ideas (reliability, validity,
protocols, quantitative / qualitative, objective / subjective; maximal /
submaximal, direct / indirect at A level), exam practice (6 GCSE and 6 A
level questions with mark schemes, built from the data on screen: mean,
median, mode and range, rating a score, Lewis power, typical error and CV,
interpreting a change (the Lewis, TE / CV and smallest-worthwhile-change
questions are tagged beyond the spec), ruler-drop time, bleep-test VO₂ max) and "How the
model works (and what it leaves out)".

## Controls

- **Presets** (12): 30 m sprint · Multi-stage fitness test · Ruler drop ·
  Reliability: test and retest · Why protocols matter · Fitness profile ·
  Before and after training · Validity: sit and reach · and at A level:
  Submaximal: Queens College · Direct vs indirect VO₂ max · Smallest
  worthwhile change · Power: the Lewis formula.
- **Squad**: size, age group, sex, fitness, random seed.
- **Protocol**: warm-up, a practice attempt, motivation, tester error (0 =
  timing gates), the same or varied conditions, number of trials, best or
  mean trial.
- **Training between tests**: none, aerobic, strength, speed and power,
  flexibility, circuit; 2–16 weeks.
- Play / Pause, Reset, ⏭ Finish (everyone at once), speed 1× (real time) to
  60×.
- No quality setting: each view is a few shapes and simple charts, cheap to
  draw; canvases are sized for the screen's pixel ratio.

## The model

- True components as z-scores linked by a general fitness factor (and a
  shared speed factor for speed, agility and power). VO₂ max: boys 48, girls
  40 ml/kg/min on average (SD 6). True test scores have typical means and
  spreads for 15–19 year-olds (illustrative), plus a test-specific part that
  is not the component (pacing, limb length, hand size, technique), so no
  test is perfectly valid.
- Measured score = true + day-to-day SD + trial SD + tester SD (× the tester
  setting) + protocol effects: no warm-up (worse), no practice (worse on the
  first test: the learning effect), motivation (maximal tests change most),
  varied conditions (extra SD). Scores are rounded as a tester records them.
- Equations: bleep VO₂ max = 3.46 × (L + S ÷ (0.4325 L + 7.0048)) + 12.2;
  Cooper VO₂ max = (d − 504.9) ÷ 44.73; Harvard index = 100 × time ÷ (2 × sum
  of three 30 s counts); Queens College VO₂ max = 111.33 − 0.42 HR (male),
  65.81 − 0.1847 HR (female); Lewis power = √4.9 × m × √h × 9.81; ruler
  t = √(2d ÷ g).
- Training raises the true z-scores of the components it trains (up to
  about 0.6 SD, time constant 6 weeks, responsiveness ±40%).
- Typical error TE = SD of the test–retest differences ÷ √2; CV = TE ÷ mean ×
  100%; smallest worthwhile change SWC = 0.2 × the between-performer SD.

Left out: injury, fatigue from other tests on the same day, growth and
maturation, the menstrual cycle, and the many versions of each norm table.

## Batch experiments

**📊 Batch run** tests many new performers (or performers with a set true
value) with no drawing. Every setting is in the table; tick one to sweep it.

1. **Test and retest: how big is the typical error?** 500 performers jump
   twice: SD of the differences 3.64 cm against √2 × TE = 3.6 cm (TE about
   2.6 cm); mean 0.2 cm (1.4 standard errors from 0). Untick the practice
   attempt to see the learning effect shift the curve.
2. **How many drops give a reliable ruler-drop score?** Error of the average
   of 1–10 drops falls from about 3.7 to 1.5 cm; log–log gradient −0.39
   (−0.5 for the trial part, flattening because day-to-day variation does not
   average out).
3. **Can a retest show a real training improvement?** Bleep test, squads of
   20, true gain 0–1.5 levels: the percentage whose retest beats the smallest
   worthwhile change (about 0.45 levels) rises from 22% to 95%, on top of
   Φ((Δ − SWC) ÷ (√2 TE)).
4. **Ruler drop: distance and reaction time**: log–log gradient 1.94 (theory
   2); means a few % above ½gt².
5. **Does the bleep test measure VO₂ max?** Predicted against true VO₂ max:
   gradient 0.999, intercept −1.5, individual scatter about 2.6 ml/kg/min.

## Data sources

Normative tables (the widely reproduced teaching versions, stated in the
simulation for each test and labelled approximate there; published versions
differ): Davis, B. et al. (2000), *Physical Education and
the Study of Sport*, as reproduced by BrianMac (Mackenzie, B., 101
Performance Evaluation Tests, 2005) and Topend Sports: multi-stage fitness
test, Illinois agility, 30 m sprint (16–19 years); BrianMac sit and reach,
grip, vertical jump, press-up and ruler-drop norms; Cooper, K. H. (1968,
1982) 12-minute run; YMCA (2000) one-minute sit-up; Brouha, L. (1943)
Harvard step test; McArdle, W. D. et al. (1972) Queens College step test
(rated with illustrative bands based on ACSM VO₂ max norms). Prediction
equations: Flouris, A. D. et al. (2005) for the Ramsbottom et al. (1988)
multi-stage test; Sayers, S. P. et al. (1999) peak power. Typical error and
the smallest worthwhile change: Hopkins, W. G. (2000), Measures of
reliability in sports medicine and science, *Sports Medicine* 30, 1–15.
Error sizes are typical published test–retest values where known, otherwise
illustrative.
