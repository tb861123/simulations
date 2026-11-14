# Traffic Flow and Phantom Jams

Every vehicle on a loop of road follows one rule, the Intelligent Driver
Model, with occasional lapses of attention. Above a certain density a small
slow-down grows into a jam that travels backwards round the road.

## How to run

Open `traffic-flow.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- A night-time view of a 230 m test track or a 1 to 3 km loop with 1 to 3
  lanes: headlights, brake lights, lorries, lane changing and roadworks.
- A scrolling space–time diagram on which jams appear as backward-sloping
  stripes, and a live flow–density graph against the steady-flow curve.
- Sliders for the number of vehicles, speed limit, lorries, self-driving
  cars and inattention. Click any car to tap its brakes.
- Eight guided investigations.

## Batch run

The fundamental diagram, speed against density, the speed of a jam, whether
a lower limit helps, self-driving cars, and inattention.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

A closed loop with no junctions; drivers differ only in preferred speed. The cell-based (Nagel–Schreckenberg) model, slip roads and automatic variable speed limits of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/traffic_flow.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
