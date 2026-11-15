# Training and Adaptation

A single, self-contained HTML file (`training-adaptation.html`) for PE. Open
`training-adaptation.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587); Advanced
follows OCR A level Physical Education (H555). Switch with the **Level**
buttons. The heart and lungs as organs are covered in depth by
`medical/heart_circulation` and `medical/gas_exchange` (linked from the
right panel), and energy for exercise by `physical_education/energy_systems`.

## What it shows

Two views, chosen with the tabs at the top of the centre panel.

**🏃 One training session.** A stylised athlete warms up, trains and cools
down. The heart beats at the athlete's heart rate (and swells with stroke
volume); the lungs breathe at the breathing rate (and fill with the tidal
volume). Live equations: Q = SV × HR and VE = TV × f. Graphs: *Heart* (HR, SV
and cardiac output), *Lungs* (breathing rate, tidal volume, minute
ventilation) and *Heart rate and training zones* (aerobic 60–80%, anaerobic
80–90% of HR max = 220 − age; Karvonen lines at A level). It shows the
anticipatory rise, the plateau in stroke volume, the warm-up and cool-down,
and (A level) cardiovascular drift and the a-vO₂ difference. Methods:
continuous, interval, fartlek, circuit, weight, plyometric and HIIT. The
"athlete as in week N" slider uses the adaptations from the plan, so you can
compare the same run before and after training.

**📅 Weeks of training.** A calendar of the plan (one column per week; each
day coloured by method and load, missed sessions crossed, injuries red, the
race day gold; A level adds bands for mesocycles, the taper and an altitude
camp). Graphs: *Fitness, fatigue, performance* (the Banister impulse–response
model), *Adaptations* (% change in VO₂ max, resting HR, resting stroke volume,
lactate threshold, strength, power) and *Load and injury risk* (daily load and
the acute:chronic load ratio, with the safer 0.8–1.3 band). Readings and a
"before and after" table.

## Controls

- **Presets** (12): Q = SV × HR · Warm-up and cool-down · Interval training ·
  A trained heart · A 12-week plan · Fitness and fatigue · Reversibility ·
  Tedium · Too much, too soon · Specificity · Periodisation and taper (A
  level) · Altitude training (A level).
- **FITT**: training method (type), frequency, intensity (% of HR max) and
  time. Later weeks keep the same pace, so a fitter athlete works at a lower
  heart rate.
- **Session**: warm-up, cool-down, cardiovascular drift (A level), and the
  week whose athlete is shown.
- **Plan**: target event (specificity: 5 km run, 100 m, shot put), length,
  progressive overload (% per week), vary the methods (tedium), a break before
  the race (reversibility); A level: recovery week every N weeks
  (mesocycles), taper length and volume cut, altitude camp length and timing.
- **Athlete**: age, starting VO₂ max and resting HR, responsiveness to
  training, the training they were used to; A level adds lactate threshold,
  body mass, injury proneness and missed sessions. A random seed decides
  which sessions are missed and when injuries happen.
- Speeds: session 1× (real time) to 60×; plan ½ to 10 days per second. Click
  a graph to jump to that moment.
- No quality setting: the view is a few shapes and line graphs, cheap to draw
  at any size; canvases are sized for the screen's pixel ratio.

## The model

**Session (every second).** HR target = HR rest + I × (HR max − HR rest)
(Karvonen; ACSM), moved towards with a 25 s lag going up and 55 s coming
down; anticipatory rise up to +12 bpm in the last minute before the start;
drift +1 bpm per 10 min after 20 min (SV falls a little). SV at rest = 5000 ÷
resting HR (resting Q ≈ 5 L/min), rising to 1.35 × that by 45% intensity.
VO₂ = 3.5 + I × (VO₂ max − 3.5) ml/kg/min; VE ≈ 25 × VO₂ (L/min), rising
faster above the lactate threshold; TV rises from 0.5 L towards 55% of a 4.8 L
vital capacity; f = VE ÷ TV.

**Plan (every day).** Load = Banister TRIMP = minutes × HRr × 0.64 e^(1.92 HRr)
× a method factor. Fitness (time constant 42 days, only training specific to
the event) and fatigue (7 days, all training): performance = 100 + k₁ ×
fitness − k₂ × fatigue (k₁ = 0.02 × responsiveness, k₂ = 0.04; fitness gains
level off at very high loads). Adaptations follow a 35-day pool of specific
training with diminishing returns, scaled by responsiveness and by how much
room the athlete has to improve. On a break the athlete returns to their
everyday activity. Tedium: +2% chance of missing a session per week on the
same method after 4 weeks. Injury: daily risk rising steeply with the
acute:chronic load ratio (Gabbett 2016), higher for plyometrics and when
overtrained; an injury stops training for 1–3 weeks. Overtraining: fatigue far
above fitness for 10+ days stops adaptation, raises resting HR and costs
performance. Altitude: haemoglobin rises up to 5% (about +3% VO₂ max) and is
lost over 3–4 weeks. All rates are illustrative, chosen for realistic sizes.

Left out: nutrition, sleep and illness in detail, heat, fibre types, skill,
psychology, growth and the menstrual cycle.

## Batch experiments

**📊 Batch run** runs whole plans many times with no drawing, for athletes who
differ in responsiveness (± SD %), with random missed sessions and injuries.
Every setting is in the table; tick one to sweep it.

1. **Responders and non-responders**: 200 athletes on the same 12-week plan;
   histogram of VO₂ max gains against the average athlete and the spread
   predicted from responsiveness (HERITAGE Family Study).
2. **Best taper length for race day**: 0–28 days; performance peaks at about
   8–16 days (Bosquet et al. 2007: 8–14 days).
3. **Reversibility: how fast are gains lost?** VO₂ max gain kept after a 1–12
   week break, against simple exponential loss (35 days).
4. **Overload: how much is too much?** Injuries with 0–20% more load each
   week, against the expected number from the risk model.
5. **Specificity: which method raises VO₂ max?** The seven methods.

Other outcomes for your own sweeps: race-day performance, strength gain.

## Data sources

- HR max = 220 − age (as used at GCSE); Karvonen / heart-rate reserve method
  (ACSM's Guidelines for Exercise Testing and Prescription).
- Banister, E. W. et al. (1975), impulse–response model; TRIMP.
- Bouchard, C. et al. (1999), HERITAGE Family Study: individual responses of
  VO₂ max to the same training.
- Bosquet, L. et al. (2007), effects of tapering on performance: a
  meta-analysis.
- Gabbett, T. J. (2016), the training–injury prevention paradox (acute:chronic
  workload ratio).
