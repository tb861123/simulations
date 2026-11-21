# Light and Colour

A single, self-contained HTML file: colour temperature and white balance, additive and subtractive colour mixing, and studio lighting (inverse square law, lighting ratios, hard and soft light). It needs no install and no
internet: **open `light-and-colour.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. Also listed under Physics on the front page.

Built from `tools/kit/src/light_and_colour.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `light-and-colour.html` by hand.

- **Standard (GCSE):** AQA GCSE Photography (8206): natural and artificial light, direction, hard and soft, key and fill; colour and white balance. GCSE Physics: colour, filters, black-body colour.
- **Advanced (A level):** AQA A level Photography (7206) 3.8: studio and location lighting, colour temperature and casts; Physics context: inverse square law, black-body radiation, additive and subtractive colour.

## What it shows

**White balance:** a still life (grey card, white shirt, skin, apple, lemon, leaves, mug, black cloth) under black-body light from 1800 to 12000 K, with a manual or 'grey world' auto white balance and a slider that fills the frame with leaves; the grey card's recorded red, green and blue. **Mixing colour:** red, green and blue lights added on a dark wall, cyan, magenta and yellow filters multiplied on white light. **Studio lighting:** a head lit by a key light (distance, angle, size) and a fill light, with its shadow on the wall, a plan of the set, light-meter readings, the lighting ratio in stops and the penumbra width.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| The inverse square law | 3200 lux at 0.5 m to 50 lux at 4 m (E = I ÷ d²) |
| Fill distance and lighting ratio | 2.0 : 1 with the fill at 1.5 m to 12.5 : 1 at 5 m (1 + (d_fill ÷ d_key)²) |
| Soft and hard shadows | penumbra equal to the light's size (similar triangles) |
| Auto white balance and a green scene | grey-card cast about 15% in a mixed scene, 47% with 80% leaves |
| Colour temperature and the blue–red balance | blue ÷ red 0.002 at 2000 K, 1.0 at 5500 K, 2.25 at 10000 K |
