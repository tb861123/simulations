# Build a Timbre

A single, self-contained HTML file: mix twelve harmonics and shape an ADSR envelope to design a sound; why the same note sounds different on different instruments. It needs no install and no
internet: **open `build-timbre.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/build_timbre.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `build-timbre.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music timbre and sonority, synthesisers and ADSR; GCSE Physics pitch, loudness and waveform.
- **Advanced (A level):** A level Music timbre and synthesis; A level Physics superposition (Fourier ideas). The missing fundamental and spectral centroid are extensions.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Ten presets (sine, square, sawtooth, triangle, flute-, clarinet-, oboe-, brass-like, plucked string, bell-like), twelve harmonic sliders, random or zero phases, remove the fundamental, ADSR, faster decay of high harmonics. The page shows each harmonic and their sum. Readings: pitch by autocorrelation and spectral centroid.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Building a square wave | RMS error 0.435 with 1 harmonic to 0.092 with 24 (theory identical) |
| Brightness of a sawtooth | centroid 220 Hz → 851 Hz for 1 → 12 harmonics (theory identical) |
| The missing fundamental | 200 Hz found for every lowest harmonic 1–6 (theory 200) |
| Same spectrum, different waveform | peak mean 4.9, SD 0.68 (8 with phases aligned) |
| Pitch from autocorrelation | under 2 cents up to noise ÷ signal 0.5; octave errors from 1 upwards |
