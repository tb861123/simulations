# Lungs and Gas Exchange

A breathing chest beside one alveolus and its capillary: red blood cells arrive
dark and leave bright as oxygen diffuses in. Change exercise, altitude, the
alveolar wall and surface area, airways, haemoglobin and carbon monoxide, and
see whether the blood still fills with oxygen before it leaves the lung.

## How to run

Open `gas-exchange.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- The chest: lungs, ribs and diaphragm moving with each breath; a "deepest
  breath" for vital capacity.
- The alveolus: oxygen and CO₂ molecules, the wall thickness, red cells moving
  through in the transit time, where the blood becomes full; a pulse oximeter
  (fooled by carbon monoxide).
- Graphs: a spirometer trace; PO₂ along the capillary, or (A level) the oxygen
  dissociation curve with arterial and venous points and the Bohr shift.
- Manual breathing: rate and depth, to show dead space.
- Ten guided investigations and a Revise tab.

## Batch run

Altitude against saturation (97% at sea level, 87% at 4000 m, 55% at 7000 m);
acclimatisation; wall thickness in exercise; shallow breathing and dead space
(matches the alveolar ventilation equation exactly); carbon monoxide and oxygen
content; how much 300 people differ at 4000 m.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its soda-lime spirometer, fetal haemoglobin,
presets and batch settings table are not in this version.

## Limits

A steady state with one average alveolus and capillary; haemoglobin reacts
instantly; acclimatisation changes breathing only. See "The model" tab.

## Source

Built from `tools/kit/src/gas_exchange.js` with the shared kit: edit that file and
run `node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
