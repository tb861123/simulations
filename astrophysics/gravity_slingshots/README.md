# Gravity-Assist Sandbox

A single, self-contained HTML file about gravity assists (slingshots): how a
spacecraft gains, or loses, speed by flying past a moving planet. It needs no
install and no internet: **open `gravity-slingshots.html` in Chrome or Edge**.
The main view runs on the graphics card (WebGL); without WebGL the page draws a
simpler 2D picture, and the Batch run works either way.

Built with the kit from `tools/kit/src/gravity_slingshots.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`gravity-slingshots.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

- **One flyby, up close**: a Jupiter-like planet moving at 13 km/s and a probe
  swinging past it, at true scale. Switch between the Sun's frame (the probe
  leaves faster) and the planet's frame (it leaves at exactly the speed it
  arrived: only its direction turns). A vector diagram shows probe velocity =
  planet velocity + relative velocity. Drag to choose where the probe passes.
- **Escape with Jupiter**: escape the Solar System with only 10 km/s (12.3 km/s
  would be needed without help). Find the launch window, then aim the flyby.
- **Dive towards the Sun**: use a Venus flyby to fall within 0.55 AU of the
  Sun with only 4 km/s, as MESSENGER and Parker Solar Probe did.
- **Grand tour (Voyager)**: visit Jupiter, Saturn, Uranus and Neptune with one
  launch and small course corrections.
- **Sandbox**: click to add planets of any mass and use them.

The dashed line predicts the path (using exactly the same steps as the real
flight), with ghosts of the planets at closest approach. Rocket burns come out
of a Δv budget. Charts: speed against the local escape speed, and orbital
energy per kg (above zero = escaping the Sun).

## The model

Sun and planets on fixed circular orbits (real radii, masses and sizes,
G·M☉ = 4π² AU³/yr²); the probe feels all of them and is stepped with RK4,
with steps that shrink to minutes near a planet. The close-up lab starts the
probe exactly on the right hyperbola and reads its "far away" speeds from the
hyperbola's asymptotes, so they can be compared directly with the slingshot
formula sin(δ/2) = 1/(1 + r·v∞²/GM). Assumptions are listed in the page's
"The model" tab.

## Batch run

Speed gain against flyby distance, approach angle, side (behind or in front)
and planet mass, each against the slingshot formula; and a check that the
speed relative to the planet is unchanged. Each run has a small random aiming
error. `worksheets.html` has a printable sheet for each investigation and
experiment, with teacher notes and test-run results.
