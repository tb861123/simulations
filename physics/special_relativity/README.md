# Special Relativity

Five classic thought experiments, each of which can be watched from any moving
frame, with a live spacetime diagram lined up underneath the picture.

## How to run

Open `special-relativity.html` in Chrome or Edge. Nothing to install; works offline.

## The five scenes

- **Light clocks**: time dilation from the zig-zag path of light. Each observer sees the other's clock run slow.
- **Simultaneity**: a lamp flashes in the middle of a carriage; whether the light reaches both ends "at the same time" depends on who is watching.
- **Train in the tunnel**: the length-contraction paradox, resolved by the order in which the doors shut.
- **Twin paradox**: a trip to a star 4 light-years away, with both twins sending a flash every birthday.
- **Cosmic-ray muons**: random decays, with relativity switched on or off, seen from the ground and from the muon.

## Controls

Speed of the train / ship / muons; "Watch from" buttons for the natural frames
and an **Observer's speed** slider that boosts the whole diagram smoothly; a
time scrubber; playback speed.

## Batch run

Muon survival against speed and against altitude (random decays, compared with
e^(−t/γτ)); time dilation and length contraction measured with a stopwatch
that has a 2% error.

## The model

All events and worldlines are stored in one frame and passed through the
Lorentz transformation `t′ = γ(t − vx/c²)`, `x′ = γ(x − vt)`. Nothing else is
coded separately. Assumptions are listed in the simulation under **The model**.

## Source

Built from `Enhanced/_build/src/special_relativity.js` with the shared kit:
edit that file and run `node build.js` inside `Enhanced/_build/`. There is no
`worksheets.html` yet.
