# Gerrymandering and District Maps

A single, self-contained HTML file: a 10 × 10 grid of precincts split into 10 districts. Try ready-made maps, draw your own, or let the gerrymander machine pack and crack for either party; then test the map against hundreds of random fair maps. It needs no install and no
internet: **open `gerrymandering.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/gerrymandering.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `gerrymandering.html` by hand.

- **Standard (core ideas):** constituencies and boundaries, packing and cracking, why the UK uses independent Boundary Commissions.
- **Advanced (A level):** Pearson Edexcel A level Politics (9PL0) Component 3 USA: House elections, redistricting and gerrymandering, Reynolds v Sims, Rucho v Common Cause, Allen v Milligan; Component 1: electoral bias under FPTP. The efficiency gap and ensemble analysis are beyond the spec.

## What it shows

Precincts coloured from red to blue, thick district boundaries and a circle in each district showing its winner and Blue's share. Seat and vote bars, and each district's Blue share from lowest to highest (packed and cracked districts stand out). Controls for Blue's share and how concentrated the city is; rows, columns, blocks or a random fair map; gerrymander buttons for each party (simulated annealing, animated); click and drag to redraw by hand (with warnings for unequal or broken districts). Charts of the random-map ensemble and wasted votes.

## Batch run

| Experiment | What it compares |
|---|---|
| Random fair maps | Blue seats on random legal maps against proportional (5) |
| How much can a gerrymander win? | gerrymandered seats against proportional, 35–60% of the vote |
| Efficiency gap of fair maps | spread of the gap on random maps against zero |
| Seats and votes, rows as districts | seats against votes under a simple map |
