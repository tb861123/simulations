# Harmony, Chords and Cadences

A single, self-contained HTML file: build chord progressions with Roman numerals in eleven keys, see them voiced in four parts on a grand stave, check the voice-leading rules, name the cadences and hear them. It needs no install and no
internet: **open `harmony-cadences.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/harmony_cadences.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `harmony-cadences.html` by hand.

- **Standard (GCSE):** Eduqas GCSE Music (C660): primary and secondary chords, the four cadences, major and minor keys, staff notation.
- **Advanced (A level):** Eduqas A level Music (A660QS) Component 3 (harmony): inversions, cadences, four-part voice leading, dominant 7ths, secondary dominants, the Neapolitan sixth and diminished 7ths.

## What it shows

A pad of Roman numerals (and inversions at A level) builds a progression of up to ten chords. Each is voiced in soprano, alto, tenor and bass by a search for the smoothest legal path, drawn on a grand stave with correct spelling and accidentals, with rule-breaks flagged and the cadence named. Presets: the four cadences, Pachelbel, I–V–vi–IV, a minor-key progression and chromatic chords. Charts show each chord's roughness and how each part moves.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Random voicings break rules | about 1.8 rule-breaks in 2 chords, 11 in 8 |
| Careful voicing: how far do the parts move? | mean 29 semitones for six chords, SD 7 |
| How rough is each kind of chord? | major 0.71, minor 0.76, diminished 0.95, augmented 0.86, dominant 7th 1.45, diminished 7th 1.67 |
