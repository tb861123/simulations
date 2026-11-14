# Black Holes and Gravitational Lensing

Mass bends light. One page follows that idea from a 1.75 arcsecond nudge at
the Sun to the shadow of a black hole, in four views.

## How to run

Open `gravitational-lensing.html` in Chrome or Edge. Nothing to install; works
offline. The first two views are drawn by the graphics card (WebGL); if the
browser has none, the other two views and the batch runs still work.

## The four views

- **Black hole.** Every pixel is a light ray traced backwards through the
  space around a non-spinning black hole. Fly round it by dragging. A glowing
  gas disc shows the far side arching over the hole, Doppler brightening on
  the approaching side, and the photon ring. Dashed rings mark the predicted
  shadow (2.6 Schwarzschild radii) and horizon. A side panel fires single
  photons past the hole and compares the exact bending with the simple formula.
  Put a galaxy behind the hole and pull back to make an Einstein ring.
- **Lensed sky.** The lens equation, for a point mass, a galaxy, an elliptical
  galaxy (four images) and a lumpy cluster with a dark-matter switch. Drag the
  source (galaxy, grid, deep field or quasar) behind the lens. Real units:
  mass, redshifts, Einstein radius in arcseconds.
- **Microlensing.** A star, with or without a planet, drifts in front of a
  distant star. A map shows where the planet changes the brightness, and the
  light curve builds up with noisy measurements.
- **Eclipse 1919.** Photograph the stars round the eclipsed Sun and decide
  between Einstein (1.75″) and Newton (0.87″).

## Batch run

Light bending against distance (exact against the simple formula), the size
of the shadow from random photons, the 1919 expedition repeated 300 times,
Einstein radius against mass, microlensing peak against alignment, and the
chance of detecting a planet against its distance from its star.

## The earlier version

The previous Gravitational Lensing simulation is kept, unchanged, in
`original/` with its worksheets. It has some things this one does not: NFW
and true elliptical mass models, critical curves and caustics, time delays,
and a Bullet Cluster preset. It is not linked from the front page.

## Limits

The black hole does not spin; the disc is thin, flat and painted; the camera
hovers. The "Elliptical" lens is a round galaxy plus a stretch. See "The
model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/gravitational_lensing.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html`.
