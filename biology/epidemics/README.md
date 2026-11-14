# Epidemics and Vaccination

A town of up to 5000 people followed hour by hour. Everyone has a
household; children share a class, adults a workplace, and people visit
shops and cafés. An infectious person can infect those in the same place.

## How to run

Open `epidemics.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- The town map with people moving between home, school, work and shops
  through day and night, coloured by state (S, E, I, R, vaccinated).
- Four diseases (COVID-like, flu, measles, Ebola-like) with R0, incubation
  and infectious period sliders.
- Vaccination and efficacy; distancing, isolation of the ill, household
  quarantine, school closures, working from home and masks, all changeable
  while the outbreak runs.
- Epidemic curve against the SEIR equations, hospital demand against beds,
  daily new infections, measured R, and where infections happened.
- A switch between the structured town and "everyone mixes equally".
- Eight guided investigations.

## Batch run

Final size against R0 (final size equation), vaccination and herd immunity,
the chance that one case starts an epidemic, flattening the curve, isolation
for two contrasting diseases, and a check that the town achieves its R0.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

No weekends, travel, age effects or waning immunity; disease settings are
round numbers. The A level views and exam questions of the earlier version
are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/epidemics.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
