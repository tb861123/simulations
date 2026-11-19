# Air Columns and Wind Instruments

A single, self-contained HTML file: standing waves in open and closed tubes; finger holes, overblowing, temperature and end correction, with the resonance-tube practical. It needs no install and no
internet: **open `air-columns.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/air_columns.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `air-columns.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music woodwind and brass (holes, valves, overblowing; flute against clarinet tone); GCSE Physics v = fλ.
- **Advanced (A level):** A level Physics stationary waves in air columns, open and closed pipes, end correction, the resonance tube for the speed of sound.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Presets (flute-like, clarinet-like, pan pipe, organ pipe, resonance tube), open or closed, length, radius, finger holes, temperature, end correction on or off, modes 1–4, displacement or pressure view. Charts: the modes the tube supports, and f₁ against length for open and closed tubes.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Resonance tube: frequency and length | 168 Hz to 632 Hz, curving below c/4L for short tubes (end correction) |
| Finding c and e from L against 1/f | mean 344 m/s, SD 6 (true 343.0) |
| Open against closed | closed modes 142, 425, 708 … Hz against open 281, 561, 842 … Hz |
| Temperature and tuning | −62 cents at 0 °C to +45 cents at 35 °C (about 3 cents per °C) |
| Finger holes and semitones | 0.600 m → 0.294 m at 12 semitones |
