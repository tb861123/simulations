# Car Crash Safety and Collisions Lab

A teaching simulation for GCSE and A level momentum, impulse and forces, with
two modes chosen by the tabs at the top of the centre panel:

- **Car crash:** a car hits a rigid wall or another vehicle, and you can
  design its crumple zone, seatbelt and airbag and see in slow motion what
  happens to the car and the crash-test dummy inside.
- **Collisions lab:** 1D elastic and inelastic collisions and explosions, 2D
  collisions, and Newton's cradle, with a Standard (GCSE) / Advanced (A level)
  switch and exam practice questions. It replaces the old WJEC Streamlit page
  `16_Momentum_Collisions.py`.

Open `car-crash.html#lab` to start in the Collisions lab.

## How to run

Open `car-crash.html` in Chrome or Edge. There is nothing to install and it
works offline.

## Car crash mode

### What you see

- **Centre:** a side view of the crash in slow motion with the time in
  milliseconds: the front crumpling, the dummy moving forward, the belt, the
  airbag, and force arrows (kN). Below it, deceleration in g against time for
  the car, the chest and the head (click the graph to jump to a moment).
- **Right:** a story, a head-injury gauge (HIC with injury risk), readouts
  (impact speed in mph and m/s, kinetic energy, crumple distance with
  theory, collision time, average and peak car g, peak and average force on
  the occupant, peak chest and head g, momentum before and after) and graphs:
  velocity against time, force against crush distance (shaded area = energy
  absorbed), and momentum against time.

### Controls

Impact speed (10–70 mph); target (wall, parked vehicle, oncoming vehicle);
your car (small, family, SUV) and its mass; the other vehicle (small, family,
SUV, lorry) and its mass; crumple zone length and crush force, an "auto"
option that designs the crush force for the speed, and a rigid-front button;
occupant mass and distance to the steering wheel; seatbelt (slack, stretch,
pretensioner, load limiter); airbag (firing time). Slow motion ¼×, 1× (1/50 of
real speed, 20 ms per second), 4× and real time.

### Presets

30 mph rigid front · 30 mph crumple zone · No seatbelt · Seatbelt only ·
Airbag fires late · Small car vs SUV · SUV vs small car · 20 mph · 40 mph ·
70 mph motorway · Car into a lorry · Loose belt.

### The model

Every part obeys F = ma, stepped forward every 0.02 ms (semi-implicit Euler).

- **Car body:** one mass. The crumple zone force rises over the first 3% of
  its length to the crush force F, stays at F, then the stiff passenger cell
  (30 MN/m) takes over. Crushed metal springs back at most 3 mm.
  Theory: F × d = ½mv², so d ≈ ½mv²/F; average deceleration = v²/2d;
  average force = Δp/Δt = mv²/2d for a steady force.
- **Two vehicles:** both fronts crush, joined by a 20 kg bumper beam. At the
  moment of greatest crush they move at the same speed; momentum theory gives
  v = (m₁v₁ + m₂v₂)/(m₁ + m₂).
- **Occupant:** torso (mass − 4.5 kg) plus a 4.5 kg head on a springy neck.
- **Seatbelt:** lap and shoulder parts each with half the stiffness
  (stiffness = 10 kN ÷ stretch); slack first; pretensioner removes slack
  10–15 ms after impact; load limiter caps the shoulder belt at 4 kN.
- **Airbag:** fires at the chosen time, fills to 35 cm in 30 ms, then acts as
  a soft vented cushion on head (≤ 2 kN) and chest (≤ 5 kN). A late bag is
  still filling when the occupant arrives and hits them harder.
- **Hard contacts:** chest on the wheel rim, head on the wheel or windscreen.
- **HIC₁₅:** the largest (t₂ − t₁)·[mean head g]^2.5 over windows up to
  15 ms; risk of serious (AIS 3+) head injury P = Φ((ln HIC − 7.45)/0.74).

#### Assumptions and simplifications

Full-width frontal impacts only; no rotation or pitching; the car is one
rigid mass apart from its crumple zone; the occupant has only two parts (no
legs, arms or neck injury); the steering column and dashboard do not intrude;
crush force does not depend on speed. Real crash-test values differ, but the
trends (energy ∝ v², longer stopping distance → smaller force, restraints
cut head injury) are the same.

## Collisions lab mode

### Controls

- **Level:** Standard (GCSE) or Advanced (A level). Advanced adds the reduced
  mass and predicted KE loss ½μu²(1 − e²), a centre-of-mass view, restitution
  in 2D and in the cradle, and the "why k in = k out" algebra.
- **1D collisions:** masses m₁ and m₂ (10 g to 1000 t on a powers-of-ten
  slider), initial velocities u₁ and u₂, collision type (elastic,
  perfectly inelastic, custom e, explosion with energy E) and the contact time
  Δt. The animation goes into slow motion during the contact. Below it is a
  before/after velocity diagram; graphs show momentum (bars), velocity–time
  and force–time through the contact (shaded area = impulse) and kinetic
  energy.
- **2D collisions:** masses, approach speed, impact parameter b/(r₁ + r₂)
  and (Advanced) e. Top view of the collision, deflection angles against b,
  and the momentum vectors drawn tip to tail.
- **Newton's cradle:** number of balls (2–7), balls pulled back k, mass,
  speed at the bottom, (Advanced) restitution. A thought experiment forces k′
  balls out keeping only momentum or only kinetic energy, so you can see why
  the real cradle sends out exactly k balls. A table compares the speeds
  momentum and KE would each need. Graphs: KE, GPE and total energy, and
  total momentum, against time.

### Presets

Snooker: equal masses · Heavy hits light · Light hits heavy · Car crash
(they stick) · Bouncy ball on a wall · Explosion: gun recoil · Snooker cut
shot · Light ball hits heavy · Newton's cradle · Two balls in · What if two
came out?

### The model

- 1D: momentum conservation plus Newton's law of restitution
  v₂ − v₁ = e(u₁ − u₂), giving v₁ = (m₁u₁ + m₂u₂ + m₂e(u₂ − u₁))/(m₁ + m₂) and
  v₂ = (m₁u₁ + m₂u₂ + m₁e(u₁ − u₂))/(m₁ + m₂). The contact force is a
  half-sine pulse lasting Δt whose area is the impulse J = Δp, so the average
  force is J/Δt and the peak is π/2 times that.
- Explosion: the objects start together; energy E becomes KE with momentum
  unchanged.
- 2D: smooth equal-sized spheres; the impulse acts along the line of centres,
  the tangential speeds are unchanged.
- Newton's cradle: 1 m pendulums solved in 0.5 ms steps; collisions resolved
  one pair at a time.
- Left out: friction, air resistance, spin and rolling, permanent
  deformation, and (in the cradle) sound and the compression wave through the
  balls.

### Exam practice

The three questions from the old page (total momentum before, KE before and
after, impulse on object 1), which use the live 1D values, plus two more: a
2D equal-mass glancing collision and why a cradle cannot send out two balls
at half speed.

## Display (both modes)

- **Picture quality** (Low / Medium / High / Ultra, default Medium): how sharply the live view is drawn. Low draws at standard resolution and redraws about 30 times a second, for slower laptops and tablets; High and Ultra draw at 1.5× and 2× the screen's resolution for smoother edges. Only the drawing changes: the model and batch-run results are identical at every level. The choice is remembered in this browser.

## Batch run

**📊 Batch run** (in either mode) lists the experiments of both modes;
choosing one from the other mode switches the page to that mode. Each
one-click experiment starts from fixed default settings, never from the left
panel.

**Batch settings table.** The panel lists every setting the current mode uses for the chosen outcome, and
follows whichever mode's experiment or outcome is chosen. Car crash: what you hit, the other vehicle, speed,
both masses, crumple length and crush force (or set automatically), occupant mass, seat position, seatbelt,
slack, stretch, pretensioner, load limiter, airbag and its firing time, random masses, and the sizes of the
random variation between crashes. Collisions lab: collision type, both masses and speeds, e, light-gate error;
2D masses, speed, impact parameter, restitution and protractor error; cradle balls, balls pulled back, ball
mass, speed and restitution. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill in the whole table (press ▶ Run batch to run), and **↺ Use my left-panel settings** copies the left panel into it. Repeat-mode random variation and the with/without comparisons
stay as switches above the table (a comparison overrides the one setting it compares).

### Car crash

**📊 Batch run** runs whole crashes headlessly (`runOnce(params, seed)`,
seeded mulberry32). Repeat mode can add random variation (by default occupant
mass ±18%, seat position ±5 cm, belt slack +0–6 cm, speed ±3 mph; all four are
settings in the table) and compare with/without airbag, seatbelt, pretensioner
or crumple zone. Sweep mode varies any one setting in the table. Theory overlays, summary statistics, fits and CSV download.

Car crash batch experiments (results from testing, unchanged by the
Collisions lab merge):

| Experiment | Result |
|---|---|
| Crush distance ∝ v²? (10–44 mph, 1 m zone) | 2.9% below d = ½mv²/F on average; log–log gradient 1.86 |
| Speed and deceleration (10–70 mph) | About 21 g at all speeds while the zone lasts (theory v²/2d, 5% mean difference); climbs steeply once it is used up |
| Longer crumple zone, smaller force? | Within 2.4% of F = mv²/2d; log–log gradient −1.03 |
| Airbags and head injuries (200 pairs, 35 mph) | Mean HIC 1,261 → 386; runs over HIC 1000: 42% → 0.5% |
| Seatbelts save lives (200 pairs, 30 mph) | Mean HIC 5,587 → 406; runs over HIC 1000: 100% → 14% |
| Momentum: parked vehicle 600 kg–40 t | Shared speed within about 2% of m₁v₁/(m₁ + m₂) |
| Momentum: 200 random pairs | Shared speed ÷ theory = 0.984 ± 0.016; total momentum change 0% |

### Collisions lab

A model air-track practical: each speed is measured by a light gate with a
random error (SD 2% unless stated), and 2D angles with a protractor (SD 1°).
Repeat mode can choose a random set-up for every run (masses 0.2–5 kg, speeds
1–5 m/s, impact parameter). Sweep mode varies any one setting in the table,
including the light-gate and protractor errors.

| Experiment | Result |
|---|---|
| Is momentum conserved? (200 random collisions, ±2% light gates) | p_after/p_before = 0.999, SD 0.029, SE 0.002 (theory 1; −0.6 SE) |
| KE lost against restitution (equal gliders, e = 0–1) | follows ½μu²(1 − e²)/KE: 0.499 at e = 0 (theory 0.500), 0.375 at e = 0.5 (0.375), 0.017 ± 0.029 at e = 1 (0); mean difference 1.7% |
| Which target takes the most energy? (0.1–10 kg) | follows 4m₁m₂/(m₁ + m₂)², peak 1.01 at equal masses; mean difference 1.2% |
| Glancing collisions: always 90°? (200 random b) | 90.0° ± 1.3° (SE 0.10), theory 90° |
| Newton's cradle: k in, k out? (k = 1–4) | exactly 1, 2, 3, 4 balls out |

After changing batch experiments, regenerate `worksheets.html` with
`tools/worksheets/run_all.sh ../../engineering/car_crash/car-crash.html`.
