# Social Influence

A single, self-contained HTML file: Run Asch's line study with simulated participants (group size, a dissenter, task difficulty, private answers), Milgram's obedience study and its variations on a shock generator, and a consistent minority converting a majority through the snowball effect. It needs no install and no
internet: **open `conformity-obedience.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/conformity_obedience.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `conformity-obedience.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology (7181/7182) 3.1.1 Social influence: types and explanations of conformity; Asch's research and variations (group size, unanimity, task difficulty); conformity to social roles (Zimbardo); obedience (Milgram) and situational variables (proximity, location, uniform); explanations (agentic state, legitimacy of authority, authoritarian personality); resistance (social support, locus of control); minority influence (consistency, commitment, flexibility) and social change.
- **A level (AQA 7182):** AQA A level Psychology (7182): evaluating social influence research (ethics: deception, protection from harm, right to withdraw; validity; temporal and cultural context), and using the data: percentages, distributions and sampling variation.

## What it shows

Asch: the line task, the confederates around the table, and every simulated participant's 12 critical trials, with the distribution of conforming answers and the group-size curve. Milgram: each participant climbing the shock generator until they stop or reach 450 V, where they stopped, and Milgram's percentages for each variation against your sample. A level: 100 agents and a committed minority whose view spreads (or not) with consistency, commitment and flexibility.

Try this first: Add one confederate who gives the right answer. What happens to conformity?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Asch: group size | 1: 3.49 ± 0.131 · 2: 14.3 ± 0.733 · 3: 36.2 ± 1.97 · 4: 35.2 ± 3.34 · 6: 37 ± 3.06 · 8: 39.1 ± 2.23 · 12: 36.7 ± 2.52 · 15: 33.2 ± 1.51 (mean ± SE, 4 runs each) (theory: model average) |
| Asch: who never conforms? | mean 0.249, SD 0.0701, SE 0.00405 from 300 runs (theory: Asch: about 25%) |
| Milgram's variations | 1: 71.3 ± 2.6 · 2: 38.8 ± 3.75 · 3: 33.1 ± 3.59 · 4: 21.9 ± 5.14 · 5: 49.4 ± 4.38 · 6: 12.5 ± 1.77 · 7: 7.5 ± 1.77 (mean ± SE, 4 runs each) (theory: Milgram's percentages) |
| Consistency and minority influence (A level) | 0.1: 0.02 ± 0.00577 · 0.3: 0.025 ± 0.005 · 0.5: 0.0875 ± 0.0111 · 0.7: 0.168 ± 0.0566 · 0.9: 0.315 ± 0.0817 · 1: 0.33 ± 0.0394 (mean ± SE, 4 runs each) |

## The model

Individual differences in conformity (Beta-distributed tendencies) scaled by situational factors; Milgram's published obedience rates per condition; an illustrative snowballing conversion model for minority influence. Assumptions and simplifications are listed inside the simulation under **The model**.
