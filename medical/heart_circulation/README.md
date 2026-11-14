# Heart and Circulation

A working model of the double circulation: four chambers, four valves and
four sets of vessels, in which blood flows from high pressure to low and the
chambers' walls stiffen as their muscle contracts. Blood pressure, the
cardiac cycle and the effects of exercise and disease all follow.

## How to run

Open `heart-circulation.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- A beating heart with valves that open and shut, blood dots that change
  colour in the lungs and the body, and live pressures in every chamber.
- An ECG trace, heart sounds, and at Advanced level the conduction system.
- A pressure graph for the left side and the left ventricle's
  pressure–volume loop, with a kept loop for comparison.
- Exercise, heart rate, strength of contraction, artery resistance and
  stiffness, blood volume, reflexes, narrowed coronary arteries, faulty
  valves and heart failure.
- Eleven guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the more demanding investigations. The **Revise** tab has key ideas tagged
with their spec and exam-practice questions with mark schemes.

## Batch run

Output against heart rate, Starling's law, pressure against resistance,
pulse pressure against stiffness, exercise with healthy and narrowed
coronary arteries, and lung-vein pressure in a failing heart.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

A lumped model with one pressure per compartment; no abnormal rhythms. The atrial fibrillation and ectopic-beat rhythms of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/heart_circulation.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
