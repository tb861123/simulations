# Crude Oil, Cracking and Polymers

From crude oil to plastic, one molecule at a time, in five linked parts:
distil, crack, burn, polymerise and (A level) chlorinate.

## How to run

Open `organic-chemistry.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Distil:** alkane chains rise up a column, hot at the bottom and cool at
  the top, and each condenses where the column is cooler than its boiling
  point. The fractions (refinery gases to bitumen) sort themselves out; each
  tray shows its chain lengths, temperature range and use. Charts of boiling
  point against chain length, and supply against demand.
- **Crack:** long alkanes break on a hot catalyst into a shorter alkane and an
  alkene, with the balanced equation and a bromine water test. Catalyst on or
  off, temperature and time in the tube.
- **Burn:** a flame with more or less oxygen: carbon dioxide, carbon monoxide
  and soot, and the energy released.
- **Polymerise:** ethene, propene, chloroethene or TFE join into chains; the
  repeat unit is drawn; chain lengths depend on the initiator.
- **Chlorinate (A level):** methane and chlorine in UV light, step by step:
  initiation, propagation and termination, and the mixture of products.
- Ten guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab: Standard
follows Pearson Edexcel International GCSE Chemistry (4CH1) 4(b), 4(c), 4(d)
and 4(h); Advanced follows Pearson Edexcel A level Chemistry (9CH0) Topic 6.
The **Revise** tab has key ideas tagged with their spec and exam-practice
questions with mark schemes, one using the latest cracking equation.

## Batch run

Condensing temperature against chain length (data-book boiling points),
furnace temperature and the residue, heavy crude and petrol, cracking against
temperature with and without a catalyst (Arrhenius), carbon monoxide and
energy against oxygen supply, initiator and polymer chain length
(2 × monomers ÷ initiator), and (A level) the chlorine ratio and the
products.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one. Its A level boxes on
alkene reactions, polymer disposal and fuels are not in this version.

## Limits

Straight-chain alkanes only; a simplified column; cracking gives one alkane
and one alkene per break; polymer chains do not branch. See "The model" tab
in the simulation for the full list.

## Source

Built from `tools/kit/src/organic_chemistry.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
