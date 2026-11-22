# Structure and Texture

A single, self-contained HTML file: pieces composed by the computer in binary, ternary, rondo, theme and variations, 32-bar song, verse–chorus and sonata forms, played in six textures, with a self-similarity map that finds the repeats. It needs no install and no
internet: **open `structure-texture.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/structure_texture.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `structure-texture.html` by hand.

- **Standard (GCSE):** Eduqas GCSE Music (C660): structures (binary, ternary, rondo, variations, verse–chorus) and textures (monophonic, homophonic, melody and accompaniment, polyphonic, canon).
- **Advanced (A level):** Eduqas A level Music (A660QS) Component 3 (structure and texture): sonata form and key areas, song forms, contrapuntal, imitative and heterophonic textures.

## What it shows

A timeline of coloured sections with their keys, a piano roll of every part with a playhead, and playback. Choose the form, the texture and how much repeats are varied; the self-similarity map lights up where sections match, and automatic labelling compares its letters with the true form. A mystery mode hides the form for listening practice.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Variation and automatic form-finding | 90–97% of variation sets labelled correctly with light variation, 70% with heavy |
| Canon: when do the parts clash? | 77% of beats dissonant with a one-beat delay, 24% with two |
| How thick is each texture? | 1 note at once (monophonic) to 4 (homophonic) |
