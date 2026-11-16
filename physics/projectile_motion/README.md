# Projectile Motion

Launch a ball and watch its two motions at once: steady sideways, accelerating
downwards. Shadows on the ground and on a wall pull the two motions apart, time
markers show equal intervals, and live velocity arrows and graphs show vₓ
staying constant while vᵧ falls by g every second. Add air resistance, wind
and spin at A level.

## How to run

Open `projectile-motion.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Drag back from the launcher like a catapult (speed and angle from the pull),
  or use the sliders: speed, angle (−30° to 90°), launch height (a cliff).
- Earth, Moon, Mars and Jupiter; football, golf ball, tennis ball, basketball,
  shot and shuttlecock.
- Time markers, vₓ / vᵧ / v arrows, shadows on the ground and wall, a second
  ball dropped at the moment of launch, kept paths to compare.
- A target flag to drag or move at random, with a hit count; an optional aiming guide.
- Graphs: vₓ and vᵧ against time; KE, GPE and total energy against time.
- A level: air resistance (½ρC_D A v²), wind and the Magnus effect (spin).
- Nine guided investigations.

## Levels and revision

A **Standard / Advanced** switch: Standard follows Pearson Edexcel International
GCSE Physics (4PH1) 1(b), 1(c) and the energy stores of section 4; Advanced follows
WJEC Eduqas A level Physics Component 1 Topic 2 (kinematics), with drag and spin
tagged "Beyond the spec". The **Revise** tab has key ideas and exam practice with
mark schemes, some using the numbers on screen.

## Batch run

Scatter of 200 imperfect shots (mean 10.2 m against 10.19 m); range against speed
(follows v²); range against angle (symmetrical about 45°); launching from a 30 m
cliff (best angle about 28°); horizontal throws from 20 m (2.02 s at every speed);
and at A level: the best angle with drag (about 40°, two-thirds of the vacuum
range), a tennis ball falling to its terminal velocity (21.7 m/s, matching the
exact drag formula) and backspin on a golf drive.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one. Its batch settings table and
picture-quality setting are not in this version.

## Limits

The ball is a point (no bouncing or rolling); drag and lift coefficients are
constant; no side-spin; air density and gravity do not change with height.
See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/projectile_motion.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
