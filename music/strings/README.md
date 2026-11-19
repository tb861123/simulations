# Strings: Pluck, Bow, Strike

A single, self-contained HTML file: standing waves on a string. Length, tension, mass per metre and frets set the note; where you pluck, strike or bow sets the harmonics. It needs no install and no
internet: **open `strings.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/strings.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `strings.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music string techniques (pizzicato, arco, how pitch is changed) and timbre; GCSE Physics frequency and pitch.
- **Advanced (A level):** A level Physics stationary waves on strings, f = (1/2L)√(T/μ), the sonometer practical; inharmonicity as an extension.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Presets (guitar low and high E, violin A, bass E, sonometer), length, tension, μ, fret and stiffness; pluck, strike or bow at any point. The string's shape and its first four modes are drawn slowed down. Charts: the spectrum and f against 1/L.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Sonometer: frequency and length | gradient 100 m/s (theory √(T/μ)/2 = 100), r = 1.000 |
| Frequency and tension | straight line against √T, r = 1.000 |
| Where you pluck: the 3rd harmonic | 0.32 near the end, 0.0004 at 1/3 (theory 0 at 1/3) |
| Frets and semitones | 1.06 per fret, 1.50 at fret 7, 2.00 at fret 12 (2^(k/12)) |
| Measuring μ with a sonometer | mean 1.04 g/m, SD 0.018 (true 1.0) |
| Stiff strings are sharp | +1 cent at n = 2 to +84 cents at n = 16 (B = 0.0004) |
