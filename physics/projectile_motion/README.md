# Projectile Motion

A teaching simulation for GCSE and A level kinematics (WJEC Eduqas A level
Physics, Component 1, Topic 2, sections (f) and (g)). Launch a ball and watch
the horizontal and vertical motions work independently, then add air
resistance, spin and wind. It replaces the old WJEC Streamlit page
`01_Projectile_Motion.py`.

## How to run

Open `projectile-motion.html` in Chrome or Edge, with no install. It works
offline.

## What you see

- **Centre:** the flight drawn to scale (tick "Same scale on both axes" off to
  stretch it), with time markers every 0.5 s, velocity arrows (vₓ, vᵧ and the
  resultant), the weight and, in Advanced, the drag and Magnus force arrows.
  Drag back from the catapult to launch (speed and angle from the pull). A
  target on the ground counts hits; "Keep this path" pins a path to compare
  with the next. Hover over the path for x, y, t and speed. Below: vₓ and vᵧ
  against time.
- **Right:** a running story, the formula results (range, maximum height,
  time of flight, vₓ, vᵧ, landing speed and angle), drag results in Advanced
  (range, height, time, terminal velocity, best angle, drag + spin), and
  graphs: range against angle (with the best angle), energy against time,
  height against time. Physics notes, exam practice and the model's
  assumptions.

## Controls

Level (Standard GCSE / Advanced A level); launch speed 1–80 m/s, angle 0–90°,
launch height 0–100 m, gravity (Earth, Moon, Mars, Jupiter). Advanced: air
resistance on/off, real objects (football, golf ball, cannonball, basketball,
tennis ball, javelin, shuttlecock, or custom C_D, area and mass), wind, and
the Magnus effect with spin −200 to +200 rad/s. Display: velocity components,
time markers, colour by speed, equal axis scales. Play/pause, launch, speed
¼×–4×.

**Picture quality** (Low / Medium / High / Ultra, default Medium): how sharply the live view is drawn. Low draws at standard resolution and redraws about 30 times a second, for slower laptops and tablets; High and Ultra draw at 1.5× and 2× the screen's resolution for smoother edges. Only the drawing changes: the model and batch-run results are identical at every level. The choice is remembered in this browser.

## Presets

Kick at 45° · 30° and 60° (same range) · Off a cliff · Dropped vs thrown ·
On the Moon · Basketball shot · Football with drag · Golf drive, backspin ·
Tennis topspin · Shuttlecock · Cannonball · Head wind.

## The model

- No air resistance: exact formulas. x = v₀ cos θ · t, y = h₀ + v₀ sin θ · t −
  ½gt². From level ground R = v₀² sin 2θ / g, H = v₀² sin²θ / 2g,
  T = 2v₀ sin θ / g; from a height T = (v₀ sin θ + √(v₀² sin²θ + 2gh₀))/g.
- Air resistance: F_D = ½ρC_DAv² against the velocity relative to the air
  (ρ = 1.225 kg/m³), solved with RK4 in 5 ms steps; terminal velocity
  v_T = √(2mg/ρC_DA).
- Magnus force: ½ρAC_L r ω v / m at right angles to the velocity (C_L = 0.5,
  r from A = πr²); topspin dips, backspin lifts.
- Left out: bouncing and rolling, side-spin, a javelin turning to follow its
  path, C_D changing with speed, air density changing with height, and the
  Earth's curvature and rotation.

## Exam practice

The three questions from the old page (maximum height, range, time of flight,
using the live speed and angle), plus a horizontal launch from a cliff,
complementary angles, and (with drag on) a terminal velocity question.

## Batch run

Each run is one launch from an imperfect launcher: a random error in the
launch speed (SD as a % of v₀) and angle (SD in degrees). Repeat, or sweep
any setting in the table below; record range,
maximum height, time of flight, landing speed or the landing speed of a
dropped object. Results against theory with mean, SD, standard error and CSV.

**Batch settings table.** The batch panel lists every starting setting the chosen outcome uses (air resistance on/off and the object; launch speed, angle, height, g, the speed and angle errors, mass (Custom object), wind and spin). Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in, and **↺ Use my left-panel settings** copies the left panel into it.

| Experiment | Result (from testing) |
|---|---|
| How much do 200 shots scatter? (10 m/s, 45°, ±2%, ±1°) | mean 10.20 m, SD 0.44 m; theory 10.19 m, predicted SD 0.41 m (+0.3 SE) |
| Does the range grow as v²? (2–30 m/s) | log–log gradient 2.000 (theory 2) |
| Which angle goes furthest? (15 m/s) | peak at 45°: 22.81 m against 22.94 m; symmetrical about 45° |
| Air resistance and the best angle (football, 25 m/s) | best angle 40° (30.95 m), against 63.7 m at 45° with no air |
| Faster sideways, longer in the air? (20 m cliff, 0–30 m/s) | 2.01–2.02 s at every speed; theory √(2h/g) = 2.02 s |
| Falling with air resistance (tennis ball, 1–200 m) | levels off at 21.9 m/s; matches the exact drag formula to 4 figures, against 62.6 m/s with no air at 200 m |

All experiments finish in under a second. To make worksheets, run
`tools/worksheets/run_all.sh ../../physics/projectile_motion/projectile-motion.html`.
