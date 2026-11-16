# Market Failure and Externalities

Why free markets can produce the wrong quantity, and what governments can do about it. A market of individual traders feels an external cost or benefit (a chemical works polluting a river, sugary drinks, plastic bags, landfill, flu jabs, apprenticeship training); then pollution permits (cap and trade), a public good with free riders, and (A level) the market for lemons.

**How to run:** open `externalities.html` in Chrome or Edge. Nothing to install, and no internet needed.

## Levels

- **Standard (GCSE)**: Edexcel International GCSE Economics (4EC1). Market failure; external costs and benefits of production and consumption; social cost = private cost + external cost; over- and under-production; the welfare loss; government responses: indirect taxes, subsidies, regulation, information, pollution permits (the spec's phrase: 4EC1 1.2.6, 2.1.1e, 2.1.2d), state provision; public goods (non-rival, non-excludable, 1.1.5g) and the free-rider problem; external benefits (1.1.6d); UK examples. Merit and demerit goods are named in neither spec, so wherever they appear they are tagged "Not named in 9EC0 (or 4EC1); taught via 9EC0 1.3.2d and 1.3.4".
- **Advanced (A level)**: Edexcel A level Economics A (9EC0), Theme 1 (1.3 market failure, 1.4 government intervention). MPC/MSC and MPB/MSB with the welfare-loss triangle; Pigouvian taxes; information gaps (1.3.4; merit and demerit goods, which 9EC0 does not name: tagged "Not named in 9EC0 (or 4EC1); taught via 9EC0 1.3.2d and 1.3.4"); cap and trade with firms of different marginal abatement costs; asymmetric information and adverse selection (Akerlof's market for lemons); property rights and the Coase bargain; government failure (a wrong estimate of the external cost).

## Views

1. **Externalities.** 40 firms and 40 buyers trade in a double auction (the same engine as the other economics simulations). Each unit traded harms (or helps) third parties: pollution flows down the river to the town, or spills over to the NHS, wildlife or neighbours. Right: the MPC/MSC/MPB/MSB diagram with the market and the social optimum and the shaded welfare loss; the day's deals as dots. Below: units traded and the welfare loss measured from the traders each day. Policies: none, a tax per unit (with "make it equal to the external cost" and, A level, "the government's estimate"), a subsidy, a limit on the quantity, an information campaign, and (A level) property rights with a bargaining cost.
2. **Cap and trade.** Eight firms with different marginal abatement costs, given permits in proportion to their emissions. They meet in pairs and trade lots of permits until no swap saves money. The market for permits (vertical supply = the cap), the price of each trade against the theory price, and the total cost of meeting the cap compared with equal percentage cuts.
3. **Public goods.** A street of households each with £10 a round decides how much to give towards street lights. Free riders, conditional co-operators and altruists; contributions fall round by round; a compulsory tax provides the good instead.
4. **The market for lemons (A level).** 60 used cars of random quality; buyers pay for average quality; good cars leave; the market unravels unless buyers value cars at least twice as much as owners, or cars have inspection reports.

## Controls

Left: level, 12 presets, then the controls for the view: product, external cost or benefit, (A level) information gap, PED and PES, new traders, finish the day, the policy and its size; the cap and the spread of abatement costs; households, benefit of each £1, share of free riders and compulsory tax; buyer ÷ owner value and share of inspected cars. Centre: view tabs, Play/Pause, Reset, speeds ½× to 20×, Batch run. Right: what's happening, readings, a chart, UK examples with sources, key ideas, exam practice (6 Standard and 6 Advanced questions with mark schemes; "On screen" questions use the live numbers) and "How the model works".

No quality setting: the views are a few hundred shapes and lines, cheap to draw on any laptop.

## The model

- Market (view 1): uniform private values and costs give straight-line D (= MPB) and S (= MPC) through the reference price with the chosen PED and PES. Constant MEC or MEB per unit: MSC = MPC ± MEC/MEB (production) or MSB = MPB ± MEC/MEB (consumption). Information gap: perceived demand = true MPB ± gap; a campaign closes a share of it. Social optimum Q* where MSB = MSC; welfare loss = W(Q*) − W(Q), the triangle between MSB and MSC. A tax or subsidy is a wedge between what buyers pay and sellers keep. Coase: if the welfare gain is bigger than the bargaining cost, output moves to Q*.
- Permits: MAC = k × abatement; theory price p* where Σ min(e0, p*/k) = emissions − cap; least cost = Σ ½ k a²; equal cuts for comparison.
- Public goods game: each £1 given creates £m shared by N households (MPCR = m ÷ N); conditional co-operators give 85% of what they saw others give.
- Lemons: share of cars sold in round t = cert + (1 − cert) × min(1, (r ÷ 2)^t).

All market numbers are illustrative. Assumptions and what the model leaves out are listed in the simulation.

## UK examples and sources

- Soft Drinks Industry Levy (April 2018): 18p a litre (5 g to under 8 g sugar per 100 ml), 24p (8 g or more); average sugar per 100 ml in levied drinks fell 43.7%, 2015–19 (HMRC; Public Health England, October 2020).
- Plastic bag charge, England: 5p in large retailers from 5 October 2015, 10p in all retailers from 21 May 2021; main supermarkets' bag sales down by more than 95% (DEFRA).
- Landfill tax: £7 a tonne in October 1996; £126.15 standard / £4.05 lower from April 2025; £130.75 / £8.65 from April 2026, shown as the current rate (HMRC). The landfill preset uses £130.75.
- UK ETS (from 2021): first auction May 2021 at £43.99 a tonne; peak auction clearing price £90.00 a tonne on 24 August 2022 (secondary-market high £92.80 the same day; UK ETS Authority, July 2023; NAO, June 2025); 2024 average £37 a tonne (NAO, HC 950, 30 June 2025); about £50 at the end of May 2025. EU ETS phase 1 over-allocation, price near zero by 2007.
- UK government carbon value: £245 per tCO₂e (2021, central series, 2020 prices; BEIS, 2021): an appraisal value, not a market price. Apprenticeship Levy: 0.5% of pay bills over £3 million (from April 2017).

## Batch experiments

| Experiment | Result (theory) |
|---|---|
| Does a free market overproduce? (repeat, 200 markets, MEC £40) | Mean 20.6 units a day, SD 2.3 (theory 20; social optimum 16). Slightly above 20 because traders sometimes make an extra deal beyond the margin. |
| Where should the tax be set? (sweep tax £0–£80) | U shape: welfare loss 116 at no tax (theory 80), lowest about 12 at £40–£50 (theory 0 at £40), 67 at £80 (theory 80). Measured losses sit £10–£35 above the triangle because the traders lose about 2% of the market's surplus through their own trading mistakes. |
| Subsidise a positive externality (training, subsidy £0–£4,800) | Quantity rises in a straight line from 20.6 to 28.4 (theory 20 to 28) and reaches the optimum, 24, at a subsidy of about £2,400 = MEB (24.5). |
| Cap and trade: where does the permit price settle? (cap 300–800 kt) | £82.6 at 300 (theory £81.4), £40.5 at 500 (£40.1), £10.5 at 650 (£10.0), zero at or above 700 (over-allocation). |
| Free riders: do people keep giving? (rounds 1–10) | 39% in round 1, 20% by round 3, 15% by round 10; the selfish (Nash) prediction is 0% and the social optimum 100%: theory fails at first, then contributions fall towards it. |
| The market for lemons (A level; r from 1 to 3) | Follows (r ÷ 2)^8: 12.8% sold at r = 1.5 (theory 10.0), 70% at 1.9 (66.3), 93% at 2 (100), 100% above. |

Results can be downloaded as CSV. Re-run `tools/worksheets` if the batch experiments change.
