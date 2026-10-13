# Epidemics and Vaccination

A single, self-contained HTML file (`epidemics.html`) for GCSE and iGCSE
biology. It shows how an infectious disease spreads from person to person and
how vaccination, social distancing, masks and isolation slow it down. No
installation and no internet are needed: open `epidemics.html` in Chrome or
Edge, with no install. Pick a preset and press **Start**.

## What it shows

Every dot is a person: susceptible, exposed (infected but not yet
infectious), infectious (pink if isolating), recovered, vaccinated and
protected, or died. Lines show who infected whom. The graphs show S, E, I and
R over time with the SEIR equations (dashed) for comparison, and the
reproduction number R<sub>t</sub>: measured from who infected whom, and
predicted as R × S/N.

**Diseases:** seasonal flu, measles, COVID-like, common cold, Ebola-like, or
custom (R0, incubation period, infectious period, days infectious before
symptoms, share with no symptoms, death rate).

**Controls:** population size; how people mix (random mixing, local contacts
only, or households + school/work + community); starting cases; % vaccinated
and vaccine efficacy; social distancing; masks; % of symptomatic cases who
isolate; how long immunity lasts (waning immunity).

**Readouts:** R0, R at the start, R now, herd immunity threshold 1 − 1/R0
(and the vaccine coverage needed), peak infectious and its day, total
infected (with the final size equation), chance of a big outbreak, deaths.

## Presets

Measles in an unvaccinated school · Measles with 95% vaccination · Flu
season · Flattening the curve · Isolation works for Ebola-like disease ·
Isolation struggles with COVID-like disease (spread before symptoms) · Waning
immunity gives waves · One case in a small village (chance fade-out) · Local
contacts only.

## The model

- An infectious person makes on average 10 contacts a day (Poisson); each
  contact with a susceptible person passes the infection on with chance
  τ = R0 ÷ (10 × infectious period).
- Latent and infectious periods vary between people (gamma distribution,
  shape 3).
- Vaccination is "all-or-nothing"; distancing cuts contacts outside the home;
  masks cut transmission per contact; isolating cases lose 90% of contacts
  from when symptoms start.
- Theory: SEIR equations (each period split into 3 stages), final size
  equation z = s<sub>0</sub>(1 − e<sup>−Rz</sup>), chance that one case
  causes a big outbreak (1 − 1/R0 for very variable illness lengths; a little
  higher for this model's), herd immunity threshold 1 − 1/R0.

All assumptions and simplifications are listed in the app under **How the
model works (and what it leaves out)**.

## Batch run

**📊 Batch run** repeats the epidemic many times (Repeat) or changes one
setting in steps (Sweep) and compares with theory. Results can be downloaded
as CSV. Experiments:

1. One case: fade-out or big outbreak? (two-humped histogram of final size)
2. How likely is one case to start a big outbreak?
3. Does the final size equation z = 1 − e<sup>−R0 z</sup> hold? (sweep R0)
4. How much vaccination stops measles? (sweep % vaccinated, with the herd
   immunity threshold)
5. Do bigger populations peak later? (sweep population against the SEIR peak)
6. Isolating cases: how much does it help against a COVID-like disease?
