# Pitch, Intervals and Tuning

A single, self-contained HTML file: notes and intervals on a clickable keyboard and the treble stave (correctly spelled), equal against just tuning, beats and consonance. It needs no install and no
internet: **open `pitch-intervals.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/pitch_intervals.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `pitch-intervals.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music pitch, intervals and their names, tones and semitones, consonance and dissonance, treble clef, concert pitch; GCSE Physics frequency and pitch.
- **Advanced (A level):** A level Music interval spelling, temperament and tuning systems; A level Physics superposition and beats.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Lower note (keyboard or slider), interval P1–P8, equal or just tuning, detune in cents, concert pitch 415–466 Hz, harmonic or melodic playing, pure or rich tones. The page shows the keyboard, the stave, both waves and their sum. Charts: both notes' harmonics, and roughness across the octave.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Frequency against semitones | 220 Hz at −12 to 1760 Hz at +24 (440 × 2^(k/12)) |
| Equal temperament's errors | thirds and sixths 14–18 cents out, fifths and fourths 2 cents, octave 0 |
| Measuring beats | beat rate = Δf, gradient 1.00, r = 1.000 |
| Roughness across the octave | dips at the unison, fifth, fourth, sixths and octave; peak near the semitone |
| Beats in an equal-tempered fifth | 0.37 per second at 110 Hz to 1.77 at 523 Hz (gradient 0.0034, theory identical) |
