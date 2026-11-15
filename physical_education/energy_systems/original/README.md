# Energy Systems and Recovery

A single, self-contained HTML file (`energy-systems.html`) for PE. Open
`energy-systems.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587); Advanced
follows OCR A level Physical Education (H555). Switch with the **Level**
buttons at the top of the left panel.

## What it shows

A stylised athlete runs a race (100 m, 400 m, 800 m, 1500 m, 5000 m,
marathon), plays a game with repeated sprints (football / hockey), does a
custom interval session (work time, work intensity or flat out, rest time,
rest intensity, number of reps), or a lab test at a constant intensity until
exhaustion. Afterwards they recover, passively or with an active cool-down.

- **The scene**: the athlete (stride, breathing and sweat follow the model;
  the legs glow red as H⁺ builds up; hands on knees when exhausted), the
  track or pitch, and gauges for the ATP, PC and glycogen stores, blood
  lactate (with OBLA at 4 mmol/L and the athlete's limit) and oxygen uptake.
  A bar shows where the energy is coming from at this instant, and a caption
  gives the main reaction (word equation at GCSE; coupled reactions, enzymes
  and the stages of the aerobic system at A level).
- **Graph views** under the scene: *Energy systems* (stacked energy supplied
  by the ATP store, ATP–PC, glycolytic and aerobic systems, against the
  energy demanded: the energy continuum over time); *Oxygen: deficit and
  EPOC* (oxygen uptake against the oxygen needed, the oxygen deficit shaded,
  and EPOC split into its fast and slow components); *Stores and lactate*
  (ATP, PC, glycogen and myoglobin O₂ in %, blood lactate on the right axis).
  Zoom to the whole session, the exercise, the first 60 s or the recovery;
  click a graph to jump to that moment.
- **Readings**: oxygen uptake (ml/kg/min, % of VO₂ max; L/min at A level),
  blood lactate against OBLA, PC and glycogen, the main system now, speed,
  oxygen deficit and EPOC in litres (fast/slow at A level), RER and the
  lactate threshold (A level). "Energy so far, by system" gives kJ and %.
- **The energy continuum** chart: the published aerobic share of maximal
  efforts against their length (Gastin, 2001), sports placed on it, and this
  run's point.
- A table of the three energy systems (GCSE: fuel, oxygen, speed, duration,
  sports; A level: site, reactions and enzymes, ATP yield, by-products), A
  level recovery strategies, exam practice and "How the model works".

Speeds: ½×, 1× (real time), 5×, 20×, 100×, 500×. Presets choose a sensible
speed (a marathon runs at 500×).

## Controls

- **Level**: Standard (GCSE) or Advanced (A level). Advanced adds the extra
  athlete settings, a "compare with" option, extra readings, A level exam
  questions and the "Effect of training" preset.
- **Presets** (12): 100 m sprint · 400 m · 1500 m · Marathon: hitting the
  wall · Marathon: well paced · Football: repeated sprints · Repeated sprint
  test (6 × 6 s, 24 s rest) · ATP–PC training (1:5 work:relief) · Glycolytic
  intervals (1:2) · Active vs passive recovery · Oxygen deficit and EPOC ·
  Effect of training (A level).
- **The activity**: the event; pace (as % of VO₂ max) for races and the lab
  test; work/rest times and intensities and reps for intervals (the
  work:relief ratio is shown); length of play for a game.
- **Recovery**: cool-down intensity (0 = passive), recovery time, cooling aid
  (ice bath), carbohydrate loading.
- **The athlete**: start from an untrained student, sprinter, middle-distance
  runner, distance runner or games player, then change VO₂ max, the PC store
  and the glycogen store. A level adds the lactate threshold, PC half-life,
  lactate tolerance, fastest PC breakdown and glycolysis rates, the VO₂ time
  constant, lactate removal, body mass, and "compare with" (dashed lines for
  the same athlete untrained or after endurance training).
- No quality setting: the view is a few shapes and line graphs, cheap to draw
  at any size; canvases are sized for the screen's pixel ratio.

## The model

Power is in W/kg (metabolic watts per kg of body mass) and energy in J/kg;
1 ml of O₂ releases about 20.9 J, so 60 ml/kg/min = 20.9 W/kg; resting
metabolism is 3.5 ml/kg/min (1 MET). Every 0.1 s (0.5 s in long steady
stretches):

- **Demand** = pace × the energy at VO₂ max (or, flat out, the most the
  systems can give at that instant). Running speed comes from the ACSM running
  equation, VO₂ = 0.2 × speed (m/min) + 3.5, plus an illustrative extra cost of
  flat-out sprinting.
- **Aerobic**: oxygen uptake rises towards what is needed with a time constant
  (12–30 s), up to VO₂ max; above the lactate threshold a slow component adds
  to the oxygen cost. With no glycogen left, fat alone supplies at most 55% of
  VO₂ max ("the wall"). Carbohydrate's share of the aerobic fuel rises from
  about 10% at low intensity to almost 100% near VO₂ max.
- **Oxygen deficit**: what uptake cannot cover is met, in order, by myoglobin
  O₂ (about 2 ml/kg), glycolysis (speeds up over about 5 s; slowed by H⁺),
  PC (rate proportional to the PC left) and the ATP store (about 2 s).
- **Lactate**: 1 mmol/L = 62.7 J/kg of glycolytic energy (3 ml O₂/kg).
  Production rises above the lactate threshold; removal has a maximum rate
  and is fastest with light exercise. Fatigue: H⁺ slows glycolysis; when the
  systems cannot meet the demand the athlete eases off (or, in the lab test,
  is exhausted).
- **Recovery and EPOC**: PC is rebuilt when oxygen is spare, exponentially
  with a half-life of about 30 s (slower during active recovery); myoglobin
  refills in about 15 s. EPOC fast component = oxygen used for ATP, PC and
  myoglobin; slow component = lactate removal (50% of its energy) and the
  raised heart rate, breathing and temperature (temperature falls over about
  15 min, 5 min with a cooling aid).

Athlete values are typical published ranges (VO₂ max 40–72 ml/kg/min,
lactate threshold 55–82%); several rates are illustrative, tuned so that race
times, peak lactate after a 400 m (12–18 mmol/L), the PC half-life and the
energy shares (Gastin 2001) are realistic. Left out: fibre types, tactics and
a finishing kick, heat and dehydration, the heart and lungs in detail, protein,
in-race feeding, the delay between muscle and blood lactate.

## Batch experiments

The **📊 Batch run** button runs the model many times with no drawing, for a
squad of athletes who each differ a little (the "squad spread" setting).
Every setting is in the table; tick one to sweep it. Results show mean ± 1 SD,
the theory line, the summary statistics and a CSV download.

1. **Critical power: how long can you last?** Time to exhaustion at 88–260%
   of VO₂ max against the critical power model t = W′ ÷ (P − CP), with CP and
   W′ found from just two tests (2 and 12 min). Fits well from about 2 to
   15 min; fails for very short efforts (rate limits) and near CP (glycogen).
2. **How fast does PC recover?** PC after 0–180 s of rest following a 6 s
   sprint, against exponential recovery with a 30 s half-life.
3. **How much rest between sprints?** Percentage decrement over 6 × 6 s
   sprints, rest 10–120 s, against a "PC alone" prediction (the model falls
   less, because the aerobic system covers more in later sprints).
4. **Energy continuum: how aerobic is a best effort?** Aerobic share of best
   efforts lasting 10 s to 4 min, against Gastin (2001).
5. **A squad runs 1500 m**: 200 athletes; spread of race times around the
   average athlete's time (lopsided, because a weaker athlete fades).
6. **Active or passive recovery?** Lactate 15 min after a 400 m against
   cool-down intensity 0–70% of VO₂ max (best at about 30–40%).

Other outcomes for your own sweeps: EPOC against the oxygen deficit (L).

## Data sources

- ACSM running equation (ACSM's Guidelines for Exercise Testing and
  Prescription).
- Gastin, P. B. (2001), Energy system interaction and relative contribution
  during maximal exercise, *Sports Medicine* 31(10), 725–741 (aerobic share
  of maximal efforts of 10 s to 4 min; longer efforts approximate).
- Energy equivalent of blood lactate, 3 ml O₂/kg per mmol/L (di Prampero).
- PC resynthesis half-time about 30 s; EPOC components and recovery
  strategies as in the OCR H555 specification.
