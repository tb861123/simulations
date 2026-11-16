# The Circular Flow and the Multiplier

A single, self-contained HTML file: money flowing between households, firms,
banks, government and overseas, the multiplier built up round by round, and
(A level) AD/AS with output gaps. It needs no install and no internet:
**open `circular-flow.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/circular_flow.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `circular-flow.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Edexcel International GCSE Economics (4EC1): the
  circular flow in outline, injections and withdrawals, AD = C + I + G +
  (X − M). The multiplier calculation is tagged as A level.
- **Advanced (A level):** Edexcel A level Economics A (9EC0) Theme 2: MPC, MPS,
  MPT, MPM, MPW, k = 1 ÷ MPW, households who differ, the accelerator, AD/AS
  (classical and Keynesian), output gaps, demand-pull and cost-push shocks.

## Three views

1. **Circular flow:** 2 to 5 sectors as boxes; money (one dot per £10bn)
   moving along incomes, consumption, saving and investment, tax and
   government spending, imports and exports, with the flows in £bn and
   whether injections exceed withdrawals.
2. **Multiplier:** press + G, + I or + X; bars for each round built from
   coloured layers (the first spending, then each round of re-spending) and
   the measured rise in the economy as a white line.
3. **AD/AS (A level):** AD from circular-flow income; classical SRAS and LRAS
   with wages that adjust, or a Keynesian AS curve; cost-push shocks and
   productive potential; the output gap.

Charts: national income with J ÷ MPW; the components of aggregate demand.

## Investigate

Follow the money · Two sectors · Injections = withdrawals · The multiplier ·
Leaky economies · (A level) Who gets the money? · The accelerator ·
Demand-pull inflation · Spare capacity.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Does the multiplier equal 1 ÷ MPW? (300 economies) | 2.50 ± 0.026 (2.5) |
| Bigger leakages, smaller multiplier (MPM 0.05–0.5) | 3.36 → 1.33 (3.33 → 1.33) |
| Rounds of spending (MPC 0.8) | 1, 1.8, 2.44 … 4.82 after 15 rounds (the same) |
| Who gets the money? (richer save more) | 2.49 → 2.13 (2.48 → 2.09, from the income-weighted MPC) |
| The accelerator (v 0–1) | peak 2.5 → 5.12 (2.5 → 5.13) |
| Does income settle where J = W? (from £400bn) | £1,000bn ± 19 (£1,000bn) |

## The model

Each round, firms' revenue C + I + G + X becomes next round's income;
households spend c = 1 − MPW of it on UK goods. 200 households with
log-normal incomes and their own MPCs (the economy's MPC is the
income-weighted average). Accelerator I = I₀ + v ΔY. Default national income
about £714bn a quarter (close to UK GDP, 2024); the propensities are
illustrative. Leaves out interest rates, money, crowding out, confidence and
the government budget.
