# Training and Adaptation

Two time scales. **One session:** a runner warms up, trains and cools down
while the heart beats at the heart rate and the lungs fill with each breath,
with Q = SV × HR and VE = TV × f worked out live. **Weeks of training:** a
calendar of the plan fills in day by day, with fitness, fatigue and
performance (the Banister model), the adaptations, missed sessions, injuries
and race day.

## How to run

Open `training-adaptation.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- FITT: seven training methods, intensity (% of heart-rate reserve), time and
  frequency.
- Session: warm-up, cool-down, the anticipatory rise, the stroke volume
  plateau, training zones, the same run before and after training, and
  (A level) cardiovascular drift, Karvonen lines and the a-vO₂ difference.
- Weeks: the event (5 km, 100 m, shot put) for specificity, progressive
  overload, varying the methods (tedium), a break (reversibility), a taper
  (A level), and the athlete's age, fitness and responsiveness; a dice button
  gives another athlete's luck with missed sessions and injuries.
- Eleven guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab: Standard
follows OCR GCSE Physical Education (J587) 1.1 and 1.2; Advanced follows OCR
A level Physical Education (H555). The **Revise** tab has key ideas tagged
with their spec and exam-practice questions with mark schemes, one using the
numbers on screen.

## Batch run

Steady heart rate against intensity (Karvonen), responders and
non-responders (a wide spread of VO₂ max gains), frequency, reversibility,
overload and injuries (against the risk model), the best taper length, and
specificity.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one. Its altitude camp,
mesocycles and injury-proneness settings are not in this version.

## Limits

All rates are illustrative, chosen for realistic sizes; nutrition, sleep,
illness, heat, fibre types, skill and psychology are left out. See "The
model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/training_adaptation.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
