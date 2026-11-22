# Thin-Film Interference Colours

A single, self-contained HTML file about the colours of soap bubbles, oil
slicks and coated lenses. It needs no install and no internet: **open
`thin-film-colours.html` in Chrome or Edge**. Every pixel's colour is worked
out by the graphics card (WebGL); if WebGL is switched off the page says so,
and the Batch run still works.

Built with the kit from `tools/kit/src/thin_film_colours.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`thin-film-colours.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

For every pixel: the exact reflectance of the film (Airy's formula with
Fresnel coefficients, both polarisations) at 36 wavelengths from 380 to
730 nm, weighted by daylight and the CIE 1931 colour-matching functions, and
converted to screen colour.

- **Scenes:** a soap bubble that drains (black cap at the top) and swirls, a
  vertical wedge film, oil on a wet road, an even film, Newton's colour chart
  (0–1600 nm).
- **Controls:** thickness, the film's refractive index, what is behind it
  (air, water, glass), viewing angle, light (daylight, sodium lamp, red, green
  or blue laser/LED), draining, swirling, brightness, a screenshot button.
- **Charts:** the reflection spectrum and reflection against thickness, for
  the thickness under the mouse (wedge, even film, chart) or set by the slider.

## Investigate

Why does the top go black? · Newton's sequence of colours · One colour of
light · Tilt it · Oil on a wet road · A non-reflective coating

## Batch run

Simulated measurements (photon counting, thickness known to ±3 nm, noisy
photographs) compared with the formula.

| Experiment | Result when tested |
|---|---|
| Reflection against thickness (green light) | dark at 0, 200 and 400 nm; peaks of 7.5% near 100 and 325 nm (λ/4n, 3λ/4n) |
| The spectrum of a 300 nm film | peak 7.5% at 525 nm, under 0.1% at 400 nm |
| Fringe spacing and wavelength | 317, 354, 390, 429, 467 μm for 420–620 nm (theory λ/1.33) |
| Tilting shifts the colour | strongest red reflection 704 nm straight on → 488 nm at 75° (theory 709 → 488) |

`worksheets.html` has the full test-run numbers.

## The model

No dispersion or absorption in the film; daylight as a 6500 K black body; the
bubble's draining and swirling are made to look right rather than computed
from fluid dynamics; only reflected light is shown. The full list is in the
page's "The model" tab.
