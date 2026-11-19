# Inside a Sound

A single, self-contained HTML file: air particles bunching into compressions and rarefactions, the pressure along the line, an oscilloscope, waveforms and their harmonics, decibels, and sound in air, water and steel. It needs no install and no
internet: **open `inside-sound.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/inside_sound.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `inside-sound.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music elements (pitch, dynamics, timbre); GCSE Physics sound waves, v = fλ, oscilloscope traces, the range of hearing.
- **Advanced (A level):** A level Physics progressive waves, superposition and harmonics; intensity and decibels.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Frequency, amplitude, waveform (sine, square, triangle, sawtooth) and the number of harmonics; the medium (air at any temperature, water, steel); oscilloscope timebase and volts/div. Charts: the spectrum and two cycles of the waveform.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Measuring wavelength: v = fλ | λ = 3.43 m at 100 Hz down to 0.430 m at 800 Hz (theory 3.43 → 0.429) |
| Speed of sound and temperature | 325 m/s at −10 °C to 355 m/s at 40 °C (331 + 0.6θ) |
| Harmonics of a square wave | 1, 0, 0.333, 0, 0.2 … (1/n for odd n only) |
| Reading the period from an oscilloscope | mean 399 Hz, SD 15 Hz (true 400 Hz) |
| Doubling the amplitude | +6 dB for each doubling (40 → 100 dB, theory identical) |
