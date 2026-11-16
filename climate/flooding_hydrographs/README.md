# Flooding and Storm Hydrographs

Rain falls on a drainage basin and the storm hydrograph builds underneath. Left:
the basin from above (watershed, source, tributaries, confluence, the town and its
gauging station), with the river swelling and the town flooding above bankfull.
Right: a hillslope with arrows for interception, infiltration, overland flow,
throughflow, percolation and groundwater flow, each sized by how fast water moves.

## How to run

Open `flooding-hydrographs.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- The basin: area (5–3000 km²), relief, shape, rock (impermeable or chalk),
  drainage density; land use: urban and woodland.
- The storm: rainfall, duration, soil wetness beforehand, gusty rain.
- Flood management: dam and reservoir, embankments, dredging and straightening,
  natural flood management, SuDS.
- Case studies: Boscastle 2004, the Eden at Carlisle in Storm Desmond 2015, the
  Somerset Levels 2014, and the River Itchen on chalk.
- Storm hydrograph with base flow, bankfull, peak and lag time; keep up to three
  to compare. Rainfall bars.
- Flood frequency: up to 200 simulated years, each year's biggest flood, and the
  flood frequency graph (recurrence interval on a log scale, fitted line, the
  estimated 100-year flood).
- Eleven guided investigations.

## Levels and revision

Standard follows Pearson Edexcel GCSE Geography A (1GA0) Topic 1B; Advanced
follows Pearson Edexcel A level Geography (9GE0) Topic 5. The **Revise** tab has
key ideas and exam practice with mark schemes, one using the lag time on screen.

## Batch run

Urban area against peak (about 9 to 70 m³/s from 0 to 80% urban), basin area
against lag time (2.5 to 37 hours from 5 to 3000 km²), woodland against peak,
soil wetness against peak, the wait for a 1-in-20-year flood (mean 20 years) and
the number of 10-year floods in a century (mean 10, SD 3).

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its A level water budget and drought view, and
its flood relief channel, flood plain zoning and warnings, are not in this version.

## Limits

Rain falls evenly over the basin; no snow, tides, debris or flood-plain storage
upstream; case-study peaks are of the right size but the model is not calibrated
on gauge records. See "The model" tab for the full list.

## Source

Built from `tools/kit/src/flooding_hydrographs.js` with the shared kit: edit that file
and run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
