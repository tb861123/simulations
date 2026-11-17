# Immunity and Vaccination

A single, self-contained HTML file: phagocytes, lymphocytes and antibodies
fight an infection inside one body; memory cells, vaccination, passive
immunity and antibiotics. It needs no install and no internet: **open
`immunity.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. Spread between people is in Epidemics.

★ Enhanced: built from `tools/kit/src/immunity.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `immunity.html` by hand. The earlier version (an
agent model of the tissue) and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4BI1: pathogens; phagocytes,
  lymphocytes and antibodies; memory cells and vaccination.
- **Advanced (A level):** OCR H420 4.1.1: clonal selection and expansion,
  primary and secondary responses, active and passive immunity, antibiotics.

## What it shows

A tissue picture (phagocytes, pathogens, antibodies, plasma cells) drawn from a
day-by-day model; six scenarios (first infection, infected again, vaccinated,
antibody injection, antibiotics, a weakened immune system); four pathogens
(bacterium, virus, fungus, protoctist); the dose. Charts: antibodies and
pathogens over time with the illness threshold; the plasma-cell clone.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How much bigger is the secondary response? (200 people) | 8.1 ± 1.5 times (average person 8) |
| Time to the antibody peak | about 8.4 days after re-infection, whatever the gap |
| Bigger doses, more illness | 6.2 → 12.2 days ill as the dose rises 10 000 times |
| Does vaccination protect against big doses? | 0 days ill at normal doses, 4.4 at 1000 times |
| Antibiotics: bacteria or virus? | bacterium 7.9 → 0.9 days; virus 8.9 → 8.8 |
| How long does passive immunity last? | 3.9 days ill after 5 days, 7.7 after 60 (protection fades) |
