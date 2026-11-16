# Antibiotic Resistance

Natural selection inside one patient. Bacteria (sensitive, partly resistant
and resistant) divide, mutate and die while the antibiotic level rises after each
dose and falls between them, and the immune system mops up what is left.

## How to run

Open `antibiotic-resistance.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Bacteria or a virus; starting numbers; resistance already present.
- Three antibiotics (amoxicillin-, ciprofloxacin- and doxycycline-like), dose,
  course length; the patient stopping early or missing doses.
- A tissue sample with bacteria coloured by strain and white blood cells; the
  bacteria on a log scale with the "feels ill" level; the drug level with each
  strain's MIC and every dose taken or missed.
- Seven guided investigations and a Revise tab.

## Batch run

Stopping early (fails if stopped on day 1 or 2, cures from day 3 on); low doses
select resistance; missed doses (40% cure at 20% missed); resistance already
present (the course almost always fails); dose and cure.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its presets and batch settings table are not in
this version.

## Limits

One well-mixed infection; no plasmids or biofilms; "like" real drugs, not
prescribing data. See "The model" tab.

## Source

Built from `tools/kit/src/antibiotic_resistance.js` with the shared kit: edit that
file and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
