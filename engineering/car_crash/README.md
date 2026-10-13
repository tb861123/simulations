# Car Crash Safety

A teaching simulation for GCSE momentum, impulse and forces. A car hits a
rigid wall or another vehicle, and you can design its crumple zone, seatbelt
and airbag and see in slow motion what happens to the car and the crash-test
dummy inside.

## How to run

Open `car-crash.html` in Chrome or Edge. There is nothing to install and it
works offline.

## What you see

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

## Controls

Impact speed (10–70 mph); target (wall, parked vehicle, oncoming vehicle);
your car (small, family, SUV) and its mass; the other vehicle (small, family,
SUV, lorry) and its mass; crumple zone length and crush force, an "auto"
option that designs the crush force for the speed, and a rigid-front button;
occupant mass and distance to the steering wheel; seatbelt (slack, stretch,
pretensioner, load limiter); airbag (firing time). Slow motion ¼×, 1× (1/50 of
real speed, 20 ms per second), 4× and real time.

## Presets

30 mph rigid front · 30 mph crumple zone · No seatbelt · Seatbelt only ·
Airbag fires late · Small car vs SUV · SUV vs small car · 20 mph · 40 mph ·
70 mph motorway · Car into a lorry · Loose belt.

## The model

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

### Assumptions and simplifications

Full-width frontal impacts only; no rotation or pitching; the car is one
rigid mass apart from its crumple zone; the occupant has only two parts (no
legs, arms or neck injury); the steering column and dashboard do not intrude;
crush force does not depend on speed. Real crash-test values differ, but the
trends (energy ∝ v², longer stopping distance → smaller force, restraints
cut head injury) are the same.

## Batch run

**📊 Batch run** runs whole crashes headlessly (`runOnce(params, seed)`,
seeded mulberry32). Repeat mode can add random variation (occupant mass
±18%, seat position ±5 cm, belt slack +0–6 cm, speed ±3 mph) and compare
with/without airbag, seatbelt, pretensioner or crumple zone. Sweep mode
changes speed, crumple length, crush force, either mass, airbag timing or
belt slack. Theory overlays, summary statistics, fits and CSV download.

Batch experiments (results from testing):

| Experiment | Result |
|---|---|
| Crush distance ∝ v²? (10–44 mph, 1 m zone) | 2.9% below d = ½mv²/F on average; log–log gradient 1.86 |
| Speed and deceleration (10–70 mph) | About 21 g at all speeds while the zone lasts (theory v²/2d, 5% mean difference); climbs steeply once it is used up |
| Longer crumple zone, smaller force? | Within 2.4% of F = mv²/2d; log–log gradient −1.03 |
| Airbags and head injuries (200 pairs, 35 mph) | Mean HIC 1,261 → 386; runs over HIC 1000: 42% → 0.5% |
| Seatbelts save lives (200 pairs, 30 mph) | Mean HIC 5,587 → 406; runs over HIC 1000: 100% → 14% |
| Momentum: parked vehicle 600 kg–40 t | Shared speed within about 2% of m₁v₁/(m₁ + m₂) |
| Momentum: 200 random pairs | Shared speed ÷ theory = 0.984 ± 0.016; total momentum change 0% |
