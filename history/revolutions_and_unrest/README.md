# Revolutions and Unrest

A single, self-contained HTML file: why regimes that look secure can collapse suddenly, with Granovetter's crowd-threshold model and Epstein's rebellion model, applied to Russia in 1905 and 1917. It needs no install and no
internet: **open `revolutions-and-unrest.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/revolutions_and_unrest.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `revolutions-and-unrest.html` by hand.

- **Standard (GCSE):** Russia 1894–1924: discontent, Bloody Sunday and 1905, the October Manifesto, the war and the February Revolution; long-term causes and triggers.
- **Advanced (A level):** OCR A level History A (H505) Y219 Russia 1894–1941: 1905, Stolypin's repression and reform, the impact of war, the collapse of tsarism; AO1 causation; AO3 interpretations (liberal, Soviet, revisionist).

## What it shows

**Crowd thresholds:** 100 people, each labelled with their threshold, joining step by step; the cobweb diagram (who would join for each crowd size against the diagonal) and a histogram of thresholds. Granovetter's classic crowd (0, 1, 2 … 99) and the 'change one person' button. **Rebellion:** Epstein's grid of people (coloured by grievance, red when openly rebelling) and police, a prison, and graphs of rebellion, prison and legitimacy over time. Sliders for legitimacy, hardship, police and prison terms, and buttons for Bloody Sunday, the October Manifesto, Stolypin's repression, war and shortages, and the garrison mutinies.

History is a weaker fit for simulation than science: the model has no leaders, parties or ideas, so it cannot show the role of individuals such as Lenin. It shows a mechanism (grievance, fear and tipping points), and the page says so.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Spread of opinions and the size of the riot | 2 people at SD 2–5, 13 at SD 10, 52 at SD 12, 97–100 at SD 15 and above (large crowd: tips between SD 10 and 15) |
| Same average, different crowds | two humps: about half fizzle, half riot (large crowd: 100) |
| Legitimacy and rebellion | none at 0.9 and above, 1.3% at 0.85, levelling off near 7% below 0.7 |
| Police and rebellion | 46% with 1% police, 6% with 4%, almost none with 10% |
| Slow decline or sudden shock? | peak 25% when gradual, 64% when sudden |
