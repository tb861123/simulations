# The Exposure Triangle

A single, self-contained HTML file: aperture, shutter speed and ISO on a live photograph, with a meter and histogram, and a film-and-darkroom view. It needs no install and no
internet: **open `exposure-triangle.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. Also listed under Physics on the front page.

Built from `tools/kit/src/exposure_triangle.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `exposure-triangle.html` by hand.

- **Standard (GCSE):** AQA GCSE Photography (8206): aperture, shutter speed, ISO, exposure and the histogram; depth of field; freezing and blurring movement; camera modes.
- **Advanced (A level):** AQA A level Photography (7206) 3.8: viewpoint, aperture, depth of field, shutter speed and movement; film and the darkroom. The physics (photon noise, the circle of confusion, the characteristic curve) is context.

## What it shows

**Camera:** a street scene in layers (buildings at 40 m, a moving cyclist at 10 m, a person at 3 m, flowers at 1.2 m) photographed with an 85 mm lens. Every frame is exposed like a real sensor: blur circles for depth of field, motion blur for the cyclist, random hand shake without a tripod, photon and read noise, clipping, then a display gamma. M, A, S and P modes with a centre-weighted meter and exposure compensation, six light levels, a live histogram, and a graph of blur circle against distance with the 0.03 mm limit. **Film and darkroom:** a negative film's characteristic curve (toe, straight line, shoulder), development time and temperature setting the contrast γ, pushing and pulling, and the resulting negative and print tones.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Reciprocity: equal exposures | 18.0–18.1% at every aperture (18%) |
| Noise and ISO | SNR 85 at ISO 100 to 4.6 at ISO 25600 (√n theory) |
| Depth of field and autofocus misses | 71% sharp at f/1.4, 95% at f/2.8, 100% from f/5.6 |
| Shutter speed and motion blur | 0.6 cm at 1 ms to 43 cm at 67 ms (speed × time) |
| Handheld: the 1/focal length rule | 92% sharp at 8 ms, 68% at 12 ms, 1% at 100 ms (Rayleigh theory) |
| Film: development time and contrast | γ 0.20 at 2 min, 0.60 at 8 min, 0.86 at 20 min (0.95(1 − e^(−0.12t))) |
