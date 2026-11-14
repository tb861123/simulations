# Tropical Storms

Grow a hurricane on a map of the North Atlantic. Its strength follows the
sea temperature beneath it, wind shear, distance from the equator and land;
its track follows the steering winds. Bring it ashore and read the damage.

## How to run

Open `tropical-storms.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- A sea-temperature map with the 26.5 °C line, steering winds, spiral storm
  clouds that organise and open an eye as they strengthen, and tracks
  coloured by Saffir–Simpson category.
- A cross-section through the storm: eye, eyewall, inflow, outflow, rain
  and the sea bulging under the low pressure.
- A landfall report: surge, flooding, rain, wind damage and people in
  danger, depending on the sea bed, defences, evacuation and buildings.
- A whole hurricane season from June to November, and a warmer world.
- **Global winds:** the pressure belts and surface winds on a globe beside a
  pole-to-pole slice of the Hadley, Ferrel and polar cells, shifting with the
  month, with climate graphs for six places.
- **Three real storms:** Haiyan, Katrina and Idai side by side, with sourced
  figures for deaths, damage, surge and income per person.
- Thirteen guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the more demanding investigations. The **Revise** tab has key ideas tagged
with their spec and exam-practice questions with mark schemes.

## Batch run

Peak wind against sea temperature and against wind shear, formation
against latitude, decay over land, surge against wind speed, hurricanes
per season, and major hurricanes in a warmer world.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Each storm is a single point with one wind speed; steering winds are the same every day. The drought card, jet streams and forecast cone of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/tropical_storms.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
