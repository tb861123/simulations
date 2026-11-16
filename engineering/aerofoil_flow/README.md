# Aerofoil Flow

A single, self-contained HTML file: a 2D wind tunnel showing how shape, angle
of attack and spin make lift. It needs no install and no internet: **open
`aerofoil-flow.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/aerofoil_flow.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `aerofoil-flow.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** forces on bodies in a fluid; faster flow, lower
  pressure; lift and how it depends on speed and angle.
- **Advanced (A level):** Bernoulli and Cp = 1 − (v/V∞)², L = ½ρv²cC_L,
  circulation and Kutta–Joukowski, thin-aerofoil theory C_L = 2π(α − α₀).

## What it shows

- The flow round a NACA 4-digit aerofoil (camber, its position, thickness) or
  a cylinder (with spin, the Magnus effect), solved live with the Hess–Smith
  panel method: a colour map of air speed or pressure, streamlines, smoke
  particles, the stagnation point and a lift arrow.
- Controls: angle of attack, wind speed, chord, number of panels.
- Charts: pressure along the upper and lower surfaces (−Cp); C_L against α
  (panel method, thin-aerofoil theory, and a sketch of a real wing that
  stalls at about 15°), or C_L against spin for the cylinder.
- Readings: C_L from the circulation and from adding up the surface pressures,
  lift per metre of wing, the lowest Cp and the air speed there, the
  thin-aerofoil prediction.

## Investigate

No angle, no lift · Tilt it · Faster, more lift · Camber · Lift against angle
· Spinning ball (Magnus effect) · (A level) Bernoulli and Cp · Thin-aerofoil
theory.

## Batch run

| Experiment | Result when tested |
|---|---|
| Lift against angle of attack (NACA 0012) | gradient 0.121 per degree (thin theory 0.110) |
| Camber and lift at zero angle | 0.129 per 1% of camber |
| Does thickness change the lift slope? | 0.116 (6%) to 0.133 per degree (24%) |
| Lift against wind speed | ∝ v²: 37 N/m at 10 m/s, 1340 N/m at 60 m/s |
| Spinning cylinder | C_L = 12.5 × s (theory 4π = 12.6) |
| Gusts (α = 5° ± 1.5°) | C_L 0.62 ± 0.19 |

## The model and its limits

Hess–Smith panel method (constant-strength source panels plus one vortex
strength, Kutta condition, Gaussian elimination). Checked: NACA 0012 at 5°
gives C_L = 0.61; a cylinder's lowest Cp is −3.0. Potential flow has no
viscosity, so no drag, separation or stall. The earlier version's drawn and
image shapes, slotted flap, vortex wake, pitching wing and boundary-layer
model are not included; real viscous flow is in the Wind Tunnel simulation.
