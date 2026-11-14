# Light: Refraction, Lenses and Fibres

A free-form optical bench. Glass blocks, prisms, lenses, mirrors, a raindrop
and an optical fibre can be placed, dragged and turned, and every ray is
traced with the law of reflection, Snell's law and Fresnel's equations.

## How to run

Open `optics-refraction.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Ray boxes giving one ray, a parallel beam or a spreading beam, in white
  (traced as seven colours) or a single colour.
- Normals and the angles i and r marked where the selected ray meets each
  surface; total internal reflection; weak partial reflections.
- Real lenses made of two curved faces, so focal length, images, virtual
  images and spherical aberration come out of the ray tracing.
- Dispersion: spectra from prisms, a rainbow from a raindrop, fire in a
  diamond. Pulses of light that slow down in glass.
- Live graphs of r against i and of the share of light reflected.
- Ten guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the more demanding investigations. The **Revise** tab has key ideas tagged
with their spec and exam-practice questions with mark schemes.

## Batch run

Snell's law, critical angle against refractive index, focal length against
curvature, the lens equation, the rainbow angle, and light lost round a
bend in a fibre.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Everything is a flat slice; no diffraction or polarisation; dispersion is exaggerated. The thin-lens ray-diagram mode and fibre cladding of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/optics_refraction.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
