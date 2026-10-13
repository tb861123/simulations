# Traffic Flow and Phantom Jams

A teaching simulation showing how traffic jams appear "from nothing", why they
travel backwards, and how density, speed limits, lorries, road works and
variable speed limits change the flow on a motorway.

## How to run

Open `traffic-flow.html` in Chrome or Edge. There is nothing to install and it
works offline.

## What you see

- **Centre top:** the road (a 3 km ring road drawn as a circle, or a 3 km
  straight motorway drawn in two rows), with every vehicle coloured by speed
  (red stopped → green fast). Lorries have an outline. Click any vehicle to
  tap its brakes.
- **Centre bottom:** a space–time diagram (position along the road across,
  time downwards). Jams show up as red stripes sloping backwards.
- **Right:** a story, readouts (density, flow, mean speed, number stopped, jam
  wave speed, lap or journey time and its spread) and graphs: flow against
  density (with the theory curves) and speed/flow against time.

## Controls

Road (ring or straight), lanes (1–3), driver model (Nagel–Schreckenberg cells
or the smooth Intelligent Driver Model), density (ring) or arrivals per hour
and slip-road traffic (straight), % lorries, road works (lane closure from
1.8 to 2.25 km), speed limit, dawdling probability, reaction time, variable
speed limits, random seed. **🛑 Brake** makes one driver brake for 2 s.
Speeds ½× to 60× (1× = real time).

## Presets

Free flow · Phantom jam · One driver brakes · Too many cars · Smart motorway ·
Lorries in the mix · Lane closure · Slip road merge · Smooth drivers · Slow
reactions.

## The model

**Nagel–Schreckenberg (1992).** Cells of 7.5 m, steps of 1 s, speeds in whole
cells per second (1 cell/s = 27 km/h). Every driver at once: speed up by one;
slow to the gap in front; with probability p slow by one more (dawdling);
move. Lorries fill two cells and are limited to 56 mph. Stopped drivers are
slow to pull away: they wait an extra (reaction time − 0.5 s) on average.
Lane changing: move out if the gap ahead is too small and the other lane is
better and safe behind; move back left when there is room (UK keep-left);
drivers in a closed lane must merge within 300 m.

**Intelligent Driver Model (Treiber 2000)**, time step 0.1 s:
a = a_max[1 − (v/v₀)⁴ − (s*/s)²], s* = s₀ + vT + vΔv/(2√(a_max b)),
with T = 1.5 s, s₀ = 2 m, a_max = 1 m/s² (lorries 0.5), b = 2 m/s². Each
driver reacts to what they saw one reaction time ago. Lane changes use a
simple MOBIL-style rule.

**Theory.** For p = 0 (cars only) the flow per lane is exactly
q = min(ρ v_max, 1 − ρ) cars per cell per second, with the critical density
ρ = 1/(v_max + 1). The mean-field estimate pictures cars scattered at random:
q = ρ Σ_g ρ(1−ρ)^g [min(v_max, g) − p]. The jam front moves back at about
27(1 − p) km/h. Units are converted to vehicles/km and vehicles/hour.

**Variable speed limits:** every 30 s, signs show 60 mph upstream of slow
traffic (mean speed below 45 km/h) and 50 mph next to it.

### Assumptions and simplifications

Speeds are rounded to multiples of 27 km/h in the cell model (70 mph →
108 km/h); drivers look only at the vehicle in front; no exits, weather,
crashes or hard shoulders; arrivals are random (Poisson) and queue off-screen
if the road is full (their waiting time counts in the journey time).

## Batch run

**📊 Batch run** runs the model headlessly (`runOnce(params, seed)`, seeded
mulberry32): 10 minutes to settle, then 15 minutes of measurement (5 + 7.5 in
the smooth model). Repeat or sweep (density, dawdling, speed limit, lorries,
arrivals, reaction time), optional comparisons (variable limits, lorries,
cell vs smooth model), histograms or mean ± 1 SD with theory overlays,
summary statistics, fits and CSV download.

Batch experiments (results from testing):

| Experiment | Result |
|---|---|
| Fundamental diagram, p = 0 | Matches min(ρ v_max, 1 − ρ) to 0.0% on average; peak 2,880 veh/h at 26.7 veh/km |
| Fundamental diagram, p = 0.25 | Peak about 1,760 veh/h near 20 veh/km; differs from the mean-field estimate by about 15% (above it in light traffic, below it in jams) |
| Lap times at 25 veh/km (100 runs) | Mean 2.60 min, SD 0.04 min; mean-field estimate 2.97 min (−12.6%) |
| Dawdling and capacity | 2,817 veh/h at p = 0 (theory 2,880) falling to 946 at p = 0.6; mean-field barely changes (poor guide) |
| Jam wave speed (50 runs, p = 0.25) | −17.0 km/h measured; simple theory −20.3 km/h; real jams −15 to −20 km/h |
| Variable speed limits at a lane closure (30 pairs) | Journey time 5.41 → 5.53 min, spread 0.31 → 0.29 min: little effect in this model |
