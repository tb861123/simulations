# Car Crash Safety and Collisions

A slow-motion crash: the car's front crumples, the dummy is caught by the
seatbelt and airbag (or not), and graphs show the deceleration of the car,
chest and head. A second view is a collisions lab with two trolleys for
momentum and kinetic energy.

## How to run

Open `car-crash.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Speed 10–70 mph into a wall, a parked vehicle or an oncoming one (small car,
  family car, SUV, lorry); crumple-zone length and crush force.
- Seatbelt (none, belt, pretensioner and load limiter), belt slack, airbag and
  when it fires, occupant mass.
- Readouts: crush distance, crash time, car average and peak g, chest and head
  peak g, head injury criterion (HIC₁₅) and risk.
- Graphs: deceleration against time; speed against time, with up to three kept crashes.
- Collisions lab: masses, velocities, restitution, explosions; momentum and
  kinetic energy against time.
- Eight guided investigations and a Revise tab.

## Batch run

Crumple length against average deceleration (follows v² ÷ 2d); speed against
crush distance (follows ½mv² ÷ F until the zone runs out); belt slack against
chest g; airbag timing against HIC; mass of the other vehicle against Δv
(matches momentum exactly); restitution against kinetic energy kept.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its 2D collisions, Newton's cradle and batch
settings table are not in this version.

## Limits

Full-width frontal impacts only; the dummy is a torso and a head; crush force
does not depend on speed. See "The model" tab.

## Source

Built from `tools/kit/src/car_crash.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
