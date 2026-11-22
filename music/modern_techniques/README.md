# Twentieth-Century Techniques

A single, self-contained HTML file: tone rows and their 48 forms in a 12 × 12 matrix, Steve Reich's phasing and Philip Glass's additive process. It needs no install and no
internet: **open `modern-techniques.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/modern_techniques.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `modern-techniques.html` by hand.

- **Standard (GCSE):** Eduqas GCSE Music (C660): ostinato, repetition and minimalist techniques (phasing, additive melody), and moving away from major and minor keys.
- **Advanced (A level):** Eduqas A level Music (A660QS) Areas of study E and F: atonality and serialism (prime, retrograde, inversion, retrograde inversion, the matrix) and minimalism (phasing, additive process, layering).

## What it shows

**Tone row** (A level): rows by Schoenberg, Berg and Webern (or a random row) in a 12 × 12 matrix; choose P, R, I or RI and a transposition, see it highlighted, hear it, and compare its pitch-class use with a tonal tune. **Phasing:** two clocks for Reich's 12-note 'Piano Phase' pattern, player 2 slightly faster, with the drift, the offset and how often both play the same note. **Additive process:** a six-note cell growing and shrinking.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Tonal or atonal: how even are the notes? | 2.6 bits for a tonal tune, 3.58 (the maximum) for serial music |
| Phasing: how long until the parts line up? | 197 patterns at 0.5% faster to 21 at 5% (100 ÷ percentage) |
| Intervals in a random row | mean 7.0 different intervals of 11, SD 1.1 |
