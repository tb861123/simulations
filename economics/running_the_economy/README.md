# Running the Economy

Booms and recessions, inflation and unemployment. Set Bank Rate, government spending, taxes and supply-side policy (or let the Bank of England's autopilot set Bank Rate) and try to hit the five macroeconomic objectives. See how banks create money, and compare with real UK data from 2000 to 2025.

**How to run:** open `running-the-economy.html` in Chrome or Edge. Nothing to install, and no internet needed.

## Levels

- **Standard (GCSE)**: Edexcel International GCSE Economics (4EC1). Macroeconomic objectives (growth, CPI inflation and the 2% target, unemployment, the current account, the budget), the business cycle, fiscal, monetary and supply-side policy, conflicts between objectives.
- **Beyond the spec (enrichment), both levels**: view 2, how banks create money and the money (credit) multiplier. Neither 4EC1 nor 9EC0 covers money creation by banks (9EC0 has only growth of the money supply, 2.1.2e, and QE, 2.6.2b), so the view, its key ideas, its exam question and its batch experiment are tagged "Beyond the spec (enrichment)".
- **Advanced (A level)**: Edexcel A level Economics A (9EC0), Themes 2 and 4. The output gap; short-run and long-run Phillips curves and expectations; a Taylor-style interest-rate rule (kept as "Taylor-style" and tagged "beyond the spec": 9EC0 does not name the Taylor rule); quantitative easing and the lower bound; policy time lags; automatic stabilisers; crowding out.

## Views

1. **Run the economy.** A dashboard of the five objectives (green zone = on target), real GDP against its trend with recessions shaded, the phase of the cycle (boom, slowdown, recession, recovery), and (A level) the output gap. Below: CPI inflation, Bank Rate and unemployment (A level: expected inflation too). Shock buttons: confidence boom, credit crunch, energy prices jump, new random future.
2. **Banks and money (beyond the spec: enrichment).** £100m of new reserves arrives at one of six banks. Each round banks keep a reserve ratio of deposits and lend the rest; part of each payment is kept as cash; the rest is re-deposited. Total money grows towards the theory value. A "demand for loans" slider shows why, in reality (Bank of England, 2014), lending is limited by demand rather than reserves.
3. **The real UK economy.** CPI inflation (with the 2% ± 1 target), Bank Rate (each change since 1997), unemployment and real GDP growth, 2000–2025, with the 2008–09 and 2020 recessions shaded, plus UK unemployment against inflation (is there a Phillips curve?) and the real Bank Rate. A year slider reads off the values with a note on what happened.

## Controls

Left: level, 12 presets, who sets Bank Rate (the Bank of England's rule, you, or (A level) aim for an unemployment rate), Bank Rate, QE and "use QE at the floor" (A level), changes in government spending and taxes (% of GDP), supply-side spending, A level settings (credibility of the 2% target, monetary and fiscal time lags, slope of the Phillips curve), the size of random demand and cost shocks; banks' reserve ratio, cash share and demand for loans; the year slider. Centre: Play/Pause, Reset, one step, speeds ½× to 20× (1× = one quarter a second), Batch run. Right: what's happening, readings, a chart (the model's Phillips curve; where the new money is; the real Bank Rate), UK facts with sources, key ideas, exam practice (Standard and Advanced, with mark schemes; "On screen" questions use the live numbers) and "How the model works".

No quality setting: the views are a few lines, bars and shapes, cheap to draw on any laptop.

## The model (one step = one quarter)

- Output gap: y(next) = 1.3 y − 0.45 y(last) + 0.15 × (fiscal push − real-rate gap) + random shock. The momentum turns shocks into cycles about six years long. Fiscal push = 0.8 × ΔG − 0.5 × Δtax (% of GDP); real-rate gap = Bank Rate − QE effect − expected inflation − 1%. Both reach spending through time lags.
- Unemployment (Okun's law): moves towards 4.5% − 0.5 y.
- Inflation (expectations-augmented Phillips curve): moves towards expected inflation + κ y, plus cost shocks that fade. Expected inflation = credibility × 2% + (1 − credibility) × (adaptive expectations).
- Bank of England autopilot (Taylor-style): target = 1% + π + 0.5 (π − 2) + 0.5 y, moved 40% of the way each quarter, floor 0.1%; QE at the floor (each £100bn lowers longer-term rates by about 0.5 points, illustrative).
- Supply-side spending raises potential growth (1.5% a year to start) and lowers the natural rate after about two years.
- Budget balance = −2.5% − ΔG + Δtax − supply-side spending + 0.5 y − interest effect; debt starts at 95% of GDP; current account starts at −2.5% of GDP and worsens with booms and a strong pound.
- Money: money created = R0 × [1 + (1 − rr) ÷ (rr + c − rr c)] (= R0 ÷ rr with no cash).

All model numbers are illustrative. Assumptions and what the model leaves out are listed in the simulation.

## Real data and sources

- CPI inflation, annual average: ONS (series D7G7). Unemployment rate, 16+, annual average: ONS Labour Force Survey (MGSX). Real GDP growth: ONS (IHYP). Bank Rate: Bank of England, official Bank Rate history. Figures rounded; 2025 values are first estimates and may be revised (real GDP growth 2025: 1.3%, ONS first estimate). 2024: CPI 2.5%, GDP growth 1.1%, unemployment about 4.3%.
- Bank of England: Bank Rate cut to 3.75% on 18 December 2025 (5–4 vote); QE peaked at £895bn (total agreed November 2020).
- Money creation: McLeay, Radia and Thomas, "Money creation in the modern economy", Bank of England Quarterly Bulletin, 2014 Q1.

## Batch experiments

| Experiment | What it shows |
|---|---|
| Does the Bank of England hit 2%? (repeat, 300 ten-year futures) | Mean inflation 2.009% vs the 2% target (0.7 standard errors), SD 0.21 points between futures. |
| The short-run Phillips curve (A level; sweep the unemployment aim 3–6%, credibility 1) | Inflation follows 2 + κ (4.5 − u) ÷ 0.5: e.g. 2.26 (theory 2.25) at 4%, 1.25 (1.25) at 6%; a little below the line at 3%. |
| Long run: expectations catch up (A level; credibility 0) | Inflation ends far above the short-run curve (6.2% vs 2.75% at an aim of 3%) and keeps rising; only at the natural rate does it stay at 2%: the vertical long-run Phillips curve. |
| Fiscal stimulus, Bank Rate fixed (sweep ΔG 0–3% of GDP) | Output gap rises by 0.80 per 1% of GDP, as the multiplier predicts (all points about 0.1 above the line, from shared random futures). |
| Fiscal stimulus when the Bank reacts | Gradient 0.43 per 1% of GDP, matching F ÷ (1 + kr(1.5κ + 0.5)): the Bank offsets about half. |
| Banks create money (beyond the spec: enrichment; sweep reserve ratio 2–20%, log axes) | Means match 1 + (1 − rr) ÷ (rr + c − rr c) to within 0.01 (9.30 at 2%, 3.86 at 20%), far below the textbook 1 ÷ rr because of cash. |

Results can be downloaded as CSV. Re-run `tools/worksheets` if the batch experiments change.
