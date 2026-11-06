# Inequality and Redistribution

A population of adults who earn, save, grow old and leave what they own to their children. Everyone starts with the same wealth, yet inequality emerges from differences in skill, from luck (at work and in investments) and from returns on wealth that compound and are inherited. Then the government redistributes with progressive, proportional or regressive taxes, benefits, a state pension and a minimum wage, and you watch the Lorenz curves and Gini coefficients respond.

- **Standard** (Edexcel International GCSE Economics 4EC1): income and wealth, causes of inequality, progressive / proportional / regressive taxes, average and marginal tax rates (the real UK 2026/27 rules), benefits and the national minimum wage, absolute and relative poverty (60% of the median).
- **Advanced** (Edexcel A level Economics A 9EC0, Theme 4): the Lorenz curve and G = A ÷ (A + B), S80/S20 and Palma ratios, wealth and income inequality (r > g), the Kuznets curve, equity against efficiency (incentives, the Laffer curve, Okun's leaky bucket) and international comparisons.

## How to run

Open `inequality.html` in Chrome or Edge, with no install. It works offline by double-clicking the file.

## Views

1. **Earn, save, inherit.** Pen's parade (everyone's disposable income, poorest first, coloured full-time / part-time / unemployed / retired), a wealth parade, and Lorenz curves for original income, disposable income and wealth. Bottom views: Gini and poverty over time; the income distribution with the median, relative and absolute poverty lines; "Who pays?" (taxes and benefits as a % of original income for each tenth); UK tax rates and real Gini data; countries compared (A level).
2. **Luck: the trading game.** Everyone starts with £100 and swaps money at random with a random partner. The money ends up exponentially distributed (Gini 0.5), with no skill involved at all. Saving (keeping a share back) and a wealth tax narrow it.
3. **Kuznets curve** (A level). People move from farms (low, similar incomes) to cities (higher, more spread out). The Gini traces an inverted U; the theory curve is exact.
4. **Equity and efficiency** (A level). A flat tax on earnings with an elasticity of taxable income: the Laffer curve, t* = 1 ÷ (1 + e), and the trade-off between the Gini and GDP per person.

## Controls

Left panel: Standard / Advanced, 12 presets, and the settings for the current view: wages, skill spread, luck, unemployment, part-time work, how far children's skills follow their parents', starting wealth, returns on wealth and their luck, saving, inheritance and inheritance tax, the income tax system (UK 2026/27, flat rate, poll tax or none), National Insurance, VAT, benefits (means-tested, basic income, share all revenue, none), the state pension, the National Living Wage and the job losses it causes, growth, and a tax calculator for one worker. A population (quality) setting chooses 100, 200, 500 or 1,000 people. Centre: Play/Pause, Reset, skip ahead, speed (1× = one year every 0.7 seconds), Batch run. Right: what's happening, readings, a chart of the Gini at each ONS stage of income, UK data with sources, key ideas, exam practice and "How the model works".

## The model (view 1)

- Wage = median × e^(σ_skill z_skill + σ_luck z_year): log-normal earnings. Skills last a lifetime and are linked between parent and child: z_child = ρ z_parent + √(1 − ρ²) × new luck. Unemployment and part-time work (half the hours) are random each year. Over-66s retire with a workplace pension of 30% of a typical wage for their skill.
- Minimum wage: a worker below the National Living Wage × 1,950 hours is paid the minimum, but loses their job with chance (jobs-lost setting) × (gap ÷ minimum).
- Wealth earns r + σ_r z a year; returns are reinvested. Workers spend everything up to £25,000, save a share of the rest and spend 3% of their wealth; retired people spend their other income and 4% of their wealth. Nobody borrows.
- At 85 a person dies; their children (aged about 55, a random number of them) share the estate after inheritance tax (40% above £325,000 in the UK); a new adult of 20 takes their place.
- ONS stages: original income → gross (+ benefits) → disposable (− income tax and NI) → post-tax (− VAT).
- UK rules 2026/27: personal allowance £12,570 (tapered above £100,000), 20% to £50,270, 40% to £125,140, 45% above; employee NI 8% then 2%; Universal Credit taper 55%; state pension £12,548 a year; National Living Wage £12.71 an hour.
- Gini = Σ|xᵢ − xⱼ| ÷ (2n² × mean); relative poverty: below 60% of this year's median; absolute: below 60% of year 1's median, fixed in real terms.

Assumptions and simplifications are listed in the simulation ("How the model works"). The main ones: adults not households (no equivalisation), no housing costs or house prices, no benefits in kind, no tax avoidance or migration, and illustrative parameters. Real UK figures are given with dates and sources.

## Batch experiments

Each runs the model many times with no drawing and compares the result with theory.

| Experiment | What it shows |
|---|---|
| Does luck alone create inequality? | 200 trading games: the Gini ends near 0.5 (theory 0.4975 for 200 people). |
| How much does redistribution lower the Gini? | A flat tax t with the revenue shared out: G(disposable) = (1 − t) × G(original) exactly. |
| How many are in relative poverty? | Log-normal incomes: the share below 60% of the median follows Φ(ln 0.6 ÷ σ). |
| Returns on wealth: does r concentrate wealth? | Wealth and income Gini rise with the average return (r > g). No closed-form theory. |
| The Kuznets curve (A level) | Gini against the urban share follows the exact mixture-of-two-log-normals curve. |
| Where does the Laffer curve peak? (A level) | Revenue per person follows t × mean wage × (1 − t)^e, peaking at t* = 1 ÷ (1 + e). |

Results can be downloaded as CSV. Every setting a run uses is in the batch settings table; tick one to sweep it. The worksheet tool in `tools/worksheets/` re-runs these experiments (see its README).

## Data sources

ONS, *Household income inequality, UK: financial year ending 2024* (Gini 32.9%; 33.1% in FYE 2023); ONS, *Total wealth in Great Britain: April 2018 to March 2020* (wealth Gini about 0.6); HMRC income tax and National Insurance rates 2026/27; GOV.UK National Minimum Wage and National Living Wage rates (April 2025 and April 2026); ONS Annual Survey of Hours and Earnings 2025 (median full-time pay £39,039, provisional); DWP *Households Below Average Income* (definitions; recent poverty rates given as approximate); OECD Income Distribution Database and World Bank (country Ginis, approximate). Earlier UK Gini values in the chart are approximate.
