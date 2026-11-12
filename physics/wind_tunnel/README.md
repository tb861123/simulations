# Wind Tunnel

A viscous fluid simulation (lattice Boltzmann method) running live on a
240 × 120 grid. Put a wing, cylinder, plate, teardrop or your own drawing in
the wind, see the flow, and measure lift and drag.

## How to run

Open `wind-tunnel.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Lift growing with angle of attack; flow separation and vortex shedding at high angles.
- The Kármán vortex street behind a cylinder, and its frequency.
- Streamlining: plate, cylinder and teardrop of the same height.
- The effect of Reynolds number (viscosity slider).
- Views: vorticity, speed, pressure, with smoke streams.
- Live lift and drag coefficients, and a "Record this point" button to build your own lift and drag curves.

## Batch run

Lift against angle of attack (with frictionless thin-wing theory for
comparison), drag against fineness ratio, shedding frequency against wind
speed, and drag against speed squared. These run a smaller tunnel and take
up to a minute each.

## How it differs from Aerofoil Flow

`engineering/aerofoil_flow` uses a panel method: no viscosity, so no drag or
separation, but accurate lift and surface pressure for full-size wings. This
wind tunnel is the opposite: real viscosity, wakes and drag, but only at low
Reynolds number (about 20 to 600), where a wing gives less lift and does not
stall sharply. They complement each other.

## Source

Built from `tools/kit/src/wind_tunnel.js` with the shared kit: edit that
file and run `node build.js` inside `tools/kit/`. There is no
`worksheets.html` yet.
