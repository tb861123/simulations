# Sound Made Visible

Chladni figures. Sand on a plate driven at one frequency gathers on the nodal
lines of whichever modes are ringing, drawing the shape of the resonance.

## How to run

Open `chladni-plates.html` in Chrome or Edge. Nothing to install; works
offline. "Hear the tone" plays the driving frequency through the speakers.

## What it shows

- A square plate, a rectangular plate or a round drum, with up to 30,000
  grains of sand hopping wherever the surface shakes.
- Frequency slider, step-to-next-resonance buttons, a slow upward sweep, and a
  response curve you can click to tune.
- Drag the driver: a mode cannot be excited from one of its own nodes.
- Material (steel, aluminium, brass, glass), size and thickness in real units,
  so frequencies are in hertz; drum radius and skin tension.
- "Show the motion" colours the parts moving up and down, slowed down.
- A readout of which modes are ringing and their shares.

## Batch run

Frequency against number of nodal lines (f ∝ n²), against thickness (f ∝ h)
and against side length (f ∝ 1/L²); a drum's overtones against the ideal
Bessel-zero ratios; and how fast the pattern forms against loudness.

## Limits

The plate's mode shapes are the standard cosine approximation, exact for
guided edges and close for free ones. The driver is a massless point, sand
does not load the plate, and air is ignored.

## Source

Built from `tools/kit/src/chladni_plates.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html`.
