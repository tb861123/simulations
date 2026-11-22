# Electoral Systems

A single, self-contained HTML file: a country of 100 constituencies where every voter fills in a ranked ballot, and the same ballots are counted by FPTP, the supplementary vote, the alternative vote, STV, AMS and list PR. It needs no install and no
internet: **open `electoral-systems.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/electoral_systems.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `electoral-systems.html` by hand.

- **Standard (core ideas):** how FPTP works, safe and marginal seats, wasted votes, why spread-out support wins few seats, what proportional representation means.
- **Advanced (A level):** Pearson Edexcel A level Politics (9PL0) Component 1, 3 Electoral systems: FPTP, AMS, STV and SV (3.1) and their impact on government and party systems (3.3), with the 2011 AV referendum. The Gallagher index and effective number of parties are beyond the spec.

## What it shows

A map of the constituencies coloured by winner (deep = safe, pale = marginal; STV districts as blocks), the chamber as a hemicycle with the majority line, and a table of vote share against seat share for six parties. Presets (UK 2024-like, two big parties, a five-way split), sliders for each party's national vote, and at A level the STV district size, AMS list-seat share, list threshold and how many preferences voters give. A new election with a random swing every few seconds; charts of seat shares under all six systems and of the Gallagher index election by election.

## Batch run

| Experiment | What it compares |
|---|---|
| FPTP: the cube law | two-party seat share against the cube law |
| How proportional is each system? | Gallagher index for FPTP, SV, AV, STV, AMS and list PR |
| Concentration wins seats | FPTP seats for a 12% party as its support becomes more concentrated |
| List PR: the threshold | Gallagher index against the threshold |
| STV: seats per constituency (A level) | Gallagher index against district size |
