# Strange Attractors

A single, self-contained HTML file: a gallery of chaotic attractors drawn as up
to a million glowing particles. It needs no install and no internet: **open
`strange-attractors.html` in Chrome or Edge**. The particles are moved and
drawn by the graphics card (WebGL); if WebGL is switched off the page says so,
and the Batch run still works.

Built with the kit from `tools/kit/src/strange_attractors.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`strange-attractors.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

Seven flows (Rössler, Aizawa, Thomas, Halvorsen, Chen, Dadras, Sprott), each
three equations integrated with fourth-order Runge–Kutta on the graphics card,
and two maps (Clifford, de Jong) that jump rather than flow. Lorenz's butterfly
is deliberately left out: it is in `climate/weather_chaos`, and the double
pendulum is in `physics/simple_harmonic_motion`.

- **Controls:** the attractor and its equations, its parameters (drag to morph
  it live), number of particles (16 thousand to a million), trail length,
  brightness, four colour maps (colour = speed), speed, slow turning, scatter
  the particles, a screenshot button. Drag to turn the view, scroll to zoom.
- **Two starts:** two paths 10⁻⁶ apart (orange and blue), with charts of their
  separation (log scale) and of x against time.
- **Readouts:** the largest Lyapunov exponent for the current parameters
  (computed on the main processor) and what it means.

## Investigate

A gallery of shapes · The butterfly effect · The road to chaos · Every start,
the same shape · Turn the friction down · Maps: jumps, not flows

## Batch run

| Experiment | Result when tested |
|---|---|
| Rössler: the road to chaos | λ ≈ 0 for c = 2.5–4.2 (period doubling), 0.054 at 4.5, 0.069 at 5.7 (published 0.0714), 0.082 at 9 |
| Two nearby starts | log₁₀ gap: −6 → −4.8 (t = 50) → −2.5 (t = 150), about e^(0.054 t) |
| Thomas: friction and chaos | λ = 0.13 at b = 0.05, 0.056 at 0.1, 0.035 at 0.18, near 0 from 0.21 up |
| Clifford map: chaos and order | λ from −0.55 to +0.41 per jump, alternating with a |

`worksheets.html` has the full test-run numbers.

## The model

RK4 time steps of 0.002–0.05 depending on the attractor; particles that fly
off are restarted. Lyapunov exponents by Benettin's method (two paths 10⁻⁸
apart, renormalised every ten steps) over 1500 time units. The full list of
assumptions is in the page's "The model" tab.
