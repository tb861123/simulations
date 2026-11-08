# Epidemics and Vaccination

A single, self-contained HTML file (`epidemics.html`) for GCSE and iGCSE
biology, with a Standard (GCSE) / Advanced (A level) switch. It shows how an infectious disease spreads from person to person and
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

**Picture quality** (left panel, under Display): Low / Medium / High / Ultra,
default Medium. Low draws people as squares on a lower-resolution canvas
(fastest, useful with 5000 people on a slow computer); High adds a soft glow
round infectious people; Ultra also draws the picture at up to twice the
pixel density on ordinary (non-high-DPI) screens. Only the drawing changes:
the epidemic, graphs, readouts and batch runs are identical at every level.
The choice is remembered in this browser.

**Readouts:** R0, R at the start, R now, herd immunity threshold 1 − 1/R0
(and the vaccine coverage needed), peak infectious and its day, total
infected (with the final size equation), chance of a big outbreak, deaths.

## Levels and specification

**Standard / Advanced switch** (top of the left panel, remembered in the
browser). Standard keeps the GCSE simulation as it was; Advanced keeps all of
it and adds A level views, readings, key ideas, presets and exam questions.
Advanced-only presets are hidden at Standard. Batch runs are the same at both
levels.

Levels: Standard = Pearson Edexcel International GCSE Biology (4BI1);
Advanced = OCR A level Biology A (H420). The right panel has **Key ideas**,
each tagged with its spec ("4BI1 …", "A level (H420 …)" or "Beyond the
spec"), and **📝 Exam practice**: 6 GCSE questions, plus 6 A level questions
at Advanced, each with a mark scheme. Questions marked "Your…" use the numbers
on screen; **↻ Use the numbers on screen now** rebuilds them. Spec references
are given to the topic (4BI1 section and sub-section letter, H420 topic
number), not to individual statement numbers.

- **Standard (4BI1 2(h) Transport: white blood cells, antibodies, vaccination
  and memory cells; 1(b) pathogens):** the spread of disease through a
  population (R0, SEIR, herd immunity) is tagged "Beyond the spec" at this
  level.
- **Advanced (H420 4.1.1 Communicable diseases, disease prevention and the
  immune system):** an **antibody-response graph** (illustrative shapes:
  primary, secondary and passive), readings for the share protected by the
  vaccine (coverage × efficacy) against the herd immunity threshold and the
  coverage needed ((1 − 1/R0) ÷ efficacy), and England's MMR coverage for
  measles: about 89% first dose by age 2 and 84% second dose by age 5,
  2023–24 (UKHSA COVER; approximate, from memory: check the latest figures).
- **A level presets:** Measles: England's MMR coverage, Just below herd
  immunity (R0 3, 60% immune), Just above herd immunity (75% immune).

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

**Batch settings table.** The batch panel lists every starting setting a run uses: disease (choosing one fills in its six values), R0, latent period, infectious period, days infectious before symptoms, share with no symptoms, share who die, population, starting infected, vaccinated %, vaccine efficacy, distancing, masks, cases isolating, how long immunity lasts, day limit, how people mix and the random seed, plus four things that used to be fixed: contacts per day with no measures (10), the share of contacts isolation removes (0.9), the gamma shape of illness lengths (3; the outbreak-chance theory uses it too, so shape 1 gives the classic 1 − 1/R) and the batch time step (0.25 days). Defaults are the old values, so every experiment gives exactly the same results as before. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in from fixed default settings (a preset plus the experiment's own changes), never from the left panel, so they give the same results in any order and do not change the left panel; clicking one only fills the table, and **▶ Run batch** runs it. **↺ Use my left-panel settings** copies the left panel into the table instead.

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
