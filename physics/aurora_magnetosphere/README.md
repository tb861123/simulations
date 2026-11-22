# Aurora and the Magnetosphere

A single, self-contained HTML file about how the solar wind gets into Earth's
magnetic field and makes the aurora. It needs no install and no internet:
**open `aurora-magnetosphere.html` in Chrome or Edge**. The 3D view is drawn
with WebGL; if WebGL is switched off the page says so, and the Batch run still
works.

Built with the kit from `tools/kit/src/aurora_magnetosphere.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`aurora-magnetosphere.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

Dungey's open magnetosphere: Earth's dipole plus a uniform interplanetary
field Bz. Field lines are coloured closed (blue), open (orange: one end on
Earth, one in the solar wind) or solar wind (grey). Solar-wind particles slide
along field lines and drift with E = −v × B wherever their field line is
connected to the solar wind; those that reach the atmosphere make a glowing
aurora (green low down, red higher up) on a stylised globe.

- **Controls:** IMF Bz (−30 to +10 nT), wind speed, density, presets (quiet,
  typical, storm, superstorm), number of particles, speed, field lines and
  particles on or off, a screenshot button. Drag to turn, scroll to zoom.
- **Readouts:** Kp (from Newell et al.'s 2008 fit), the open–closed boundary
  latitude, particles precipitating per minute, where they land; charts of the
  precipitation rate and its latitude.

## Investigate

North or south? · A storm pushes the aurora south · Kp: the aurora forecast ·
Spiralling down field lines · Why green and red?

## Batch run

| Experiment | Result when tested |
|---|---|
| Where is the open–closed boundary? | 77.2° at −1 nT, 73.2° at −5, 71.1° at −10, 68.7° at −20, 65.9° at −40 (formula within 0.2°) |
| How much gets in? | 27–39% of particles precipitate for southward Bz; none for northward |
| Faster wind, more aurora? | precipitation rate 6.7 → 20.7 (arbitrary units) from 300 to 900 km/s, roughly in proportion |
| Where do they land? | mean 80.5° (−2 nT) to 76.3° (−20 nT), poleward of the boundary |

`worksheets.html` has the full test-run numbers.

## The model

No magnetopause, bow shock or magnetotail; no mirror force; an upright dipole;
closed field lines shielded from the solar-wind electric field; particles count
as precipitating at 1.5 Earth radii. The full list is in the page's
"The model" tab.
