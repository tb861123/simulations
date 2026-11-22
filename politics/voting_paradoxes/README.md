# Voting Paradoxes and the Median Voter

A single, self-contained HTML file: parties competing for voters on a left–right line (the median voter theorem, and what breaks it: abstention, a third party, tactical voting and primaries), then Condorcet's paradox, agenda setting and how plurality, AV and the Borda count can pick different winners from the same ballots. It needs no install and no
internet: **open `voting-paradoxes.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/voting_paradoxes.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `voting-paradoxes.html` by hand.

- **Standard (core ideas):** majority and plurality, why parties move to the centre ground, tactical voting, how the counting rule can change the winner.
- **Advanced (A level):** Pearson Edexcel A level Politics (9PL0): consensus and adversarial politics and catch-all parties, AV and majoritarian systems, rational choice and tactical voting, US primaries and polarisation. The median voter theorem, Condorcet's paradox and Arrow's theorem are marked as theory beyond the spec.

## What it shows

**Median voter:** 2,000 voters as a histogram coloured by the party each votes for (dark = abstaining); two or three parties that move each round to win more votes (or that you drag); controls for polarisation, skew, abstention, tactical voting and the pull of primaries. **Paradoxes:** six groups of voters, one for each ranking of A, B and C; a triangle of head-to-head results that shows a cycle; winners under plurality, AV, Borda and each of the three agendas; random electorates that count how often cycles happen.

## Batch run

| Experiment | What it compares |
|---|---|
| How common are cycles? (three candidates) | % of random elections with no Condorcet winner against Guilbaud's 8.77% |
| More candidates, more cycles (A level) | % with no Condorcet winner for 3–7 candidates against large-electorate theory |
| Do two parties converge? | winning party's position against the median voter |
| Abstention keeps parties apart | distance between parties against readiness to abstain |
| Tactical voting squeezes the third party (A level) | third party's vote against sincere share × (1 − tactical fraction) |
