# Lenses and Perspective

A single, self-contained HTML file: focal length, field of view, crop factor, perspective ('telephoto compression'), focusing and macro. It needs no install and no
internet: **open `lens-optics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. Also listed under Physics on the front page.

Built from `tools/kit/src/lens_optics.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `lens-optics.html` by hand. Ray diagrams and the lens equation are not repeated here: they are in `physics/optics_refraction/`, which the page links to.

- **Standard (GCSE):** AQA GCSE Photography (8206): wide-angle, standard, telephoto, zoom and macro lenses; viewpoint and framing. GCSE Physics: real images and magnification.
- **Advanced (A level):** AQA A level Photography (7206) 3.8: viewpoint, composition, depth of field and the use of lenses; A level Physics context: 1/f = 1/u + 1/v, magnification.

## What it shows

A live view through the camera (a person, a church tower and trees a chosen distance behind, mountains 5 km away) with rule-of-thirds guides, and a plan from above showing where the camera stands and its field of view. Choose the focal length (8–600 mm) and the sensor (full frame, APS-C, Micro Four Thirds, phone), and either stand still and zoom or walk to keep the person the same size. Readings for field of view, full-frame equivalent, distance, tower ÷ person, lens extension, magnification, depth of field and hyperfocal distance; graphs of field of view and of 'compression' against focal length.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Field of view: how much wall fits? | 51 m at 14 mm to 3.6 m at 200 mm (20 × 36 ÷ f) |
| Telephoto 'compression' | tower ÷ person 0.47 at 14 mm to 5.9 at 300 mm |
| Longer lens, more shake | at 1/60 s: 100% sharp at 14 mm, 80% at 50 mm, 4% at 300 mm (Rayleigh theory) |
| Depth of field at the same framing | 1.7–2.0 m at every focal length (2Nc(1 + m) ÷ m² = 1.7 m) |
| Extension tubes and magnification | m = 0.20 per 10 mm, 1.01 at 50 mm (e ÷ f) |
