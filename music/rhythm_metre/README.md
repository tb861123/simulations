# Rhythm and Metre

A single, self-contained HTML file: a drum step sequencer for tempo, simple, compound and irregular metres, accents, syncopation, swing, polyrhythm and tap tempo. It needs no install and no
internet: **open `rhythm-metre.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/rhythm_metre.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `rhythm-metre.html` by hand. The earlier version from the
music pack and its README are kept in [`original/`](original/).

- **Standard (GCSE):** GCSE Music rhythm, metre and tempo: time signatures, BPM, syncopation, swing, cross-rhythm.
- **Advanced (A level):** A level Music hemiola, polyrhythm, irregular metres, swing and groove.

Sound uses the Web Audio API and starts only when you press Play.

## What it shows

Metres 2/4, 3/4, 4/4, 6/8, 9/8, 12/8, 5/4 and 7/8 (2+2+3); tempo, swing ratio, human timing error, four drum lanes (click: rest → note → accent), a polyrhythm layer (a against b) and tap tempo. Swing moves the off-beat cells on the grid. Charts: metrical weight of each step, and where the swung off-beat sounds.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Beat length and tempo | 1.5 s at 40 BPM to 0.3 s at 200 BPM (60 ÷ BPM) |
| Swing ratio and the off-beat | 300 ms straight, 400 ms at 2:1, 450 ms at 3:1 (theory identical) |
| When polyrhythms line up | 6, 3, 12, 15, 6, 21 parts for a = 2–7 against 3 (lcm) |
| Human timing: how far off the grid? | mean 11.9 ms, SD 2.4 (theory 15√(2/π) = 12.0) |
| Syncopation score | rises from 1.7 (2 notes) to a peak of 3.1 (8 notes), then falls to 1.1 (14 notes) |
