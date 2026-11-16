# Crystallisation

A single, self-contained HTML file for iGCSE chemistry (and geology), with an
A level option. It needs no install and no internet: **open
`crystallisation.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/crystallisation.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `crystallisation.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Chemistry (4CH1):
  solubility and solubility curves (1(a)), crystallisation as a separation
  (1(b)), making salt crystals (2(g)). Magma (granite, basalt, obsidian) is
  geology, beyond 4CH1.
- **Advanced (A level):** 9CH0 recrystallisation (core practical 16), yields
  from solubility data, and the energetics of dissolving.

## What you see

A 20 mm × 13 mm slice divided into 0.1 mm cells. Each crystal has its own
colour, as in a thin section under a polarising microscope.

- **🌋 Molten rock:** cooling rate (log scale, from about 1 °C per 1000 years
  to 170 °C per minute), starting temperature, impurity specks. Slow cooling
  gives a few big crystals (granite), fast cooling many small ones (basalt),
  very fast cooling a glass (obsidian). The latent heat makes a plateau on the
  cooling curve; a pure melt supercools and then jumps back up.
- **🧪 A salt solution:** copper(II) sulfate, sodium chloride or potash alum;
  starting temperature, amount dissolved, cooling rate, evaporation. Click to
  drop in a seed crystal. The chart shows the solubility curve and the
  solution's concentration.
- Charts: the cooling curve (or the solubility curve) and a histogram of
  crystal sizes. Readings: temperature, status, crystals per cm², mean size,
  amount crystallised.

## Investigate

Granite or basalt? · Obsidian: a glass · Porphyry · Impurities · Copper
sulfate crystals · Salt by cooling? · Seed crystal · (A level) Recrystallisation
yield.

## Batch run

| Experiment | Result when tested |
|---|---|
| Cooling rate and crystal size | log–log gradient about −0.27 (JMAK theory −0.30) |
| Cooling rate and number of crystals | log–log gradient about +0.5 (theory +0.6) |
| Impurities and the number of crystals | 202 → 502 per cm² from 0 to 5 specks per mm² |
| Crystals from cooling copper sulfate | follows the solubility curve, a little below it (losses on the filter paper) |
| Which salts crystallise on cooling? | alum 65 g, copper sulfate 34 g, salt 2 g (80 °C → 20 °C) |

## The model and its simplifications

Magma: freezing point 1100 °C, glass at 650 °C, mobility from the Vogel–Fulcher
equation, growth G ∝ M × ΔT, nucleation I ∝ M × ΔT^2.5, impurity specks each start
one crystal, latent heat 350 °C. Solutions: supersaturation S = concentration ÷
solubility (tables for 0–100 °C); nucleation rises steeply above S = 1, growth
∝ (S − 1); crystals remove solute; evaporation removes water. Theory: JMAK
(Avrami). Left out: several minerals and freezing ranges, crystal faces,
convection, diffusion of dissolved particles (the earlier version modelled it,
with dendrites), water of crystallisation. The grid gives up to about half as
many crystals as the JMAK formula at middle cooling rates (each new crystal
fills a whole cell at once), with the same trends.
