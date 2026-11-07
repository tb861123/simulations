# The Circular Flow and the Multiplier

Money flowing between households, firms, banks, government and overseas. Injections and withdrawals, national income settling where they balance, the multiplier building up round by round, the components of aggregate demand, and (A level) the marginal propensities, the accelerator and AD/AS with output gaps.

**How to run:** open `circular-flow.html` in Chrome or Edge. Nothing to install, and no internet needed.

## Levels

- **Standard (GCSE)**: Edexcel International GCSE Economics (4EC1). A simple picture of the circular flow, injections (I, G, X) and withdrawals (S, T, M), AD = C + I + G + (X − M). 4EC1 does not include the circular flow in detail or the multiplier calculation (they are 9EC0 2.4.2 and 2.4.4), so the multiplier view, its calculation questions and its reading are tagged "A level (9EC0 2.4.4)" at Standard and kept as background; the level hint says so.
- **Advanced (A level)**: Edexcel A level Economics A (9EC0), Theme 2. MPC, MPS, MPT, MPM and MPW; multiplier = 1 ÷ (1 − MPC) = 1 ÷ MPW; households who differ; the accelerator; AD/AS with SRAS, classical LRAS and the Keynesian AS curve; output gaps; demand-pull and cost-push shocks.

## Views

1. **The circular flow.** Households, firms, banks, government and overseas as boxes; money flows as moving dots (incomes, spending, saving, tax, imports, investment, government spending, exports). Choose 2, 3, 4 or 5 sectors. Tick "Show the real flows" for factor services and goods.
2. **The multiplier.** Press + G, + I or + X to add new spending every round. A bar chart shows the extra income after each round, built from coloured layers (the first spending, then what is re-spent from it, round after round), with the measured value from the economy as a white line. A second chart shows equilibrium where injections = withdrawals.
3. **AD/AS and output gaps (A level).** Shift AD (C, I, G, X − M, each multiplied by the multiplier) or AS (costs, productive potential). Classical view: wages adjust and the economy returns to LRAS. Keynesian view: flat AS with spare capacity, vertical at full capacity, sticky wages.

## Controls

- Left: level (Standard / Advanced), 12 presets, sectors, MPS, MPT, MPM, injections I, G, X, the size of a new injection, random ups and downs in spending; A level: number of households, how much their MPCs differ, income inequality, "richer households save more", the accelerator v; AD/AS shifts and the view of aggregate supply.
- **Picture detail** (quality setting): Low / Medium / High / Ultra changes how much money each dot stands for (£20bn, £10bn, £5bn, £2.5bn) and adds a glow at High and Ultra. It changes only the live picture, never the model or the batch results. The choice is remembered in this browser.
- Centre: Play/Pause, Reset, one round, speeds ½× to 20× (1× = one round, about a quarter of a year, every 1.5 seconds), Batch run.
- Right: what's happening, readings, aggregate demand bar chart (C, I, G, X, −M), real UK numbers, key ideas, exam practice (Standard and Advanced, with mark schemes; "On screen" questions use the live numbers), and "How the model works".

## The model

Each round, firms pay out last round's revenue as incomes (national income Y). Each household splits its income: c × y spent on UK-made goods, s × y saved, t × y taxed, m × y spent on imports, with c + s + t + m = 1 (so MPC on UK goods = 1 − MPW). Firms' revenue = C + I + G + X becomes next round's income. Income settles where J = W (only implicit in the A level spec, 9EC0 2.4.2a injections and withdrawals), at Y = (I + G + X) ÷ MPW. After a permanent rise in injections of ΔJ, income after n rounds is up by ΔJ (1 − MPCⁿ) ÷ (1 − MPC), and in the long run by ΔJ ÷ MPW. Accelerator: I = I₀ + v × (income this round − income last round).

Households (A level) each have their own MPC (the average plus a random difference) and unequal incomes (log-normal). The economy's real MPC is the income-weighted average. AD/AS: AD = A − b (P − 100); classical SRAS P = W + costs + β (Y − Y*), with W rising when output is above potential; Keynesian AS flat, then curving up to vertical at full capacity.

Default flows give national income of about £714bn a quarter, close to UK GDP in 2024 (about £2.85 trillion a year, ONS), with expenditure shares close to the ONS figures (C ≈ 62%, I ≈ 18%, G ≈ 21%, X ≈ 31%, M ≈ 32% of GDP, 2023). The propensities are illustrative. All assumptions and what the model leaves out are listed in the simulation.

## Batch experiments

Each run builds a new economy (new households), then compares it with and without extra government spending using the same random numbers.

| Experiment | What it shows |
|---|---|
| Does the multiplier equal 1 ÷ MPW? (repeat, 300) | Mean 2.502 vs theory 2.5 (0.9 standard errors); SD 0.042 vs predicted 0.042 from the random draw of households. |
| Bigger leakages, smaller multiplier (sweep MPM 0.05–0.5) | Means follow 1 ÷ (0.3 + MPM), from 2.84 (theory 2.86) to 1.25 (1.25). |
| Rounds of spending (sweep rounds 1–15, MPC 0.8) | Means follow the geometric series (1 − 0.8ⁿ) ÷ 0.2: 1, 1.80, 2.43 … 4.78 (theory 4.82); long run 5. |
| Who gets the money? (A level, sweep tilt 0–1) | When richer households save more, the multiplier falls from 2.50 to 2.19, below 1 ÷ MPW, and matches 1 ÷ (1 − income-weighted MPC). |
| The accelerator (A level, sweep v 0–1) | The peak rise follows the multiplier–accelerator model: 2.49 (2.5) at v = 0 up to 5.11 (5.13) at v = 1. |
| Does income settle where J = W? (repeat, 300) | Starting at £400bn, income settles at a mean of £1,001bn vs theory £1,000bn; SD 17 vs predicted 16.9. |

Results can be downloaded as CSV. Re-run `tools/worksheets` if the batch experiments change.
