# Aerofoil Flow

A 2D wind tunnel. It shows how shape, angle of attack and spin make lift. The flow is solved live with the
Hess–Smith panel method. This is a single-file browser version of the Python/Pygame app in
`engineering/fluid_dynamics` (now retired; its code is in the git history), using the same solver written in JavaScript.

## How to run

Open `aerofoil-flow.html` in Chrome or Edge. There is nothing to install and it works offline.

## What it shows

- Potential flow (no viscosity) round NACA 4-digit aerofoils, a cylinder, a square, a shape you draw, or a
  shape loaded from a picture.
- A colour map of pressure Cp or speed |V|/V∞, streamlines, moving smoke particles, velocity arrows,
  panel normals, the stagnation point, and boundary-layer transition (T) and separation (S) marks.
- The Cp distribution along the surface (upper and lower), with thin flat-plate theory, or the exact
  answer for a cylinder.
- Lift from the Kutta condition (Kutta–Joukowski, CL = 2Γ/(V∞c)), checked against CL found by adding up
  the surface pressures, plus thin-aerofoil theory 2π(α − α₀).
- Graphs: CL against α (panel method, thin-aerofoil theory and a sketch of a real wing that stalls at about
  15°), a drag polar, and the CL–α loop of a pitching wing compared with Theodorsen's theory.
- **Potential flow has no viscosity, so it has no stall and no drag (d'Alembert's paradox).** Real CL
  against α curves stall at about 12–16°. The simulation says this on screen.

## Controls

- **Presets** (12): symmetric at 0° and at 5°, cambered at 0°, high angle 15°, thin (0006) and thick (0024)
  aerofoils, cylinder with no spin, spinning cylinder (Magnus effect), wing with a slotted flap, starting
  vortex (sudden start), pitching wing, Kármán street behind a cylinder.
- **The body:** Aerofoil (NACA code list, or camber m, position p and thickness t sliders), Cylinder,
  Square (with a spin slider: Γ ÷ 4πV∞R), Draw, Image. On the aerofoil, drag the round handles: the tail
  sets the angle, the top sets the thickness, the middle sets the camber.
- **The flow:** angle of attack α, wind speed V∞ (m/s), size (chord c, m), number of panels N (20–500).
- **Extras from the Python app:** vortex shedding (an unsteady wake), pitch oscillation (frequency,
  amplitude), viscous boundary-layer coupling, a slotted flap.
- **View:** colour map choice, Streamlines / Particles / Arrows / Normals / BL marks, and
  **Quality** Low / Medium / High / Ultra (colour-map and velocity-grid resolution, number of streamlines
  and particles; the physics is the same at every setting). Canvases are sized for the screen's pixel ratio.
- Pause, Restart (sudden start), speed ¼× to 2×, Cp plot on/off, save a picture, help.
- Keys: Space pause, ↑/↓ α ±0.5°, ←/→ V∞ ±1 m/s, R restart, S picture, P drag polar, H help,
  Ctrl+Z undo a drawn point, [ ] F panels and full screen.
- Drawing tool: click to place points, click the yellow first point to close, drag points to move them,
  right-click to delete, Ctrl+Z to undo. A shape that crosses itself is refused with a warning.
- Image import: one dark shape on a light background. The outline is traced, smoothed and resampled.

## The model

- N straight panels, each with a constant source strength σ; one vortex strength γ per body. Each panel's
  influence is integrated exactly along the panel. N no-penetration equations (V·n = 0 at each panel
  middle) plus one Kutta condition per body (equal tangential speed on the two trailing-edge panels),
  solved by LU decomposition.
- Pressure from Bernoulli: Cp = 1 − (V/V∞)². Lift: L′ = ρV∞Γ, CL = 2Γ/(V∞c).
- Angle of attack turns the body about its quarter chord; the wind always comes from the left.
- Cylinder and square: no sharp tail, so their circulation is set by the spin slider.
- Boundary layer (Thwaites laminar, Michel transition, Head turbulent) for friction drag, transition and
  separation; Re = V∞c/ν with ν = 1.5 × 10⁻⁵ m²/s. Optional viscous coupling by transpiration (δ*).
- Vortex wake: Kelvin's theorem sheds the change in circulation from the trailing edge; Lamb–Oseen
  cores; the wake is fed back into the panel equations (Wagner effect). Bluff bodies: vortices released
  alternately from top and bottom at about the Strouhal frequency (a picture, not a prediction).
- Pitching: quasi-steady (or with the wake on, coupled to it), compared with Theodorsen's theory
  (including added mass) for k = πfc/V∞.
- Assumptions and what is left out are listed in the simulation under "How the model works".

## Batch run

Every setting a run uses is in the batch settings table; tick one row to sweep it (+ or × steps).
Repeats differ only when "Gusts: random α, SD" is above 0. Batch runs use only the panel solution
(N panels from the table), not the colour map, so results do not depend on the quality setting.

| Experiment | Result (default settings) |
|---|---|
| Is CL = 2πα? (NACA 0012, −4° to 14°) | Straight line, slope 7.05 per radian, about 12% above 2π; within about 3% of 2π(1 + 0.77t)α |
| What does camber add? (NACA 4412) | Line shifted up; CL = 0 at −4.29° (thin-aerofoil α₀ = −4.15°) |
| How many panels are enough? (2412 at 5°, N 10–640) | Wobbles a few % below 100 panels; within 0.8% at 160, 0.2% at 320 of the 800-panel value |
| Does thickness change the lift? (00xx at 5°) | 2πα = 0.548 for all t; panel method 4.5% above at t = 2%, 28% above at 30% |
| Gusty wind (200 runs, α = 5° ± 1°) | Mean 0.629, SD 0.133 (predicted spread 0.12) |
| Magnus effect (cylinder, spin −1 to 1) | CL from pressures within 0.6% of 4π × spin |
| d'Alembert's paradox (2412, 0°–20°) | Pressure CD below 0.0025 at every angle (falls with more panels) |
| Friction drag against Re (0006, V∞ 0.5–80 m/s) | Laminar: 5% below Blasius 2.656/√Re; after transition Cd ≈ 0.005, between the laminar and turbulent flat-plate lines |

Each experiment has a short explanation and a CSV download.

## Self-check

The six tests of `tests/test_panel_method.py` (cylinder Cp, cylinder zero lift, NACA 0012 lift slope,
NACA 2412 lift at 0°, far field, field routine against single-point routine) plus five checks of the port
(Kutta condition, pressure lift = Kutta–Joukowski lift, zero pressure drag, spinning cylinder CL = 4π × spin,
Theodorsen C(1)) run when the page loads. Results are under "Self-check" in the right panel.
