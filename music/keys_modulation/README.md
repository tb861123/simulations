# Keys, Scales and Modulation

A single, self-contained HTML file: scales and modes on a keyboard and stave, the circle of fifths, and how a computer (and your ear) finds the key of a melody and hears it modulate. It needs no install and no
internet: **open `keys-modulation.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/keys_modulation.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `keys-modulation.html` by hand.

- **Standard (GCSE):** Eduqas GCSE Music (C660): major, minor, modal, pentatonic, blues and chromatic scales; key signatures; modulation to related keys.
- **Advanced (A level):** Eduqas A level Music (A660QS) Component 3 (tonality): modes, whole-tone and blues scales, related keys and the circle of fifths, modulation and tonal ambiguity.

## What it shows

**Scales and modes:** 14 scales on any of 13 tonics, shown on a keyboard and stave with their tone–semitone pattern, played up and down, with the keys they fit best. **Keys and key finding:** a melody in any of 24 keys, optionally modulating to the dominant, subdominant, relative minor or a distant key; the Krumhansl–Schmuckler algorithm estimates the key from a sliding window and shows it on the circle of fifths, with the fit of each key over time.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How many notes to find the key? | 78% correct from 4 notes to 80–93% from 16 or more (random major and minor keys) |
| Closeness on the circle of fifths | correlation 0.85 with the home key, 0.68 one step away, −0.66 a tritone away |
| How long to hear a modulation? | 2–6 notes after the change, depending on the window |
