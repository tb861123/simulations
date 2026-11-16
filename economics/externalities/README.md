# Market Failure and Externalities

Why free markets can produce the wrong amount, and what governments can do about
it. Forty buyers and forty sellers trade each day while every unit sends a cost
(or a benefit) to a third party; eight firms trade pollution permits; a street
decides whether to pay for its lights; and (A level) a used-car market unravels.

## How to run

Open `externalities.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- **Externalities**: chemicals polluting a river, sugary drinks, plastic bags,
  flu jabs and apprenticeship training. Policies: a tax, a subsidy, a limit on
  sales or an information campaign. The MPC / MSC / MPB / MSB diagram is drawn
  live with the welfare-loss triangle and the day's deals; graphs of units made
  and welfare loss each day.
- **Cap and trade**: firms with different costs of cutting emissions trade
  permits until their marginal abatement costs are equal; trade prices against
  theory, and the total cost against equal cuts.
- **Public goods**: free riders, conditional co-operators and altruists; a
  compulsory tax.
- **The market for lemons** (A level): adverse selection, and inspection reports.
- Ten guided investigations.

## Levels and revision

Standard follows Edexcel International GCSE Economics (4EC1); Advanced follows
Edexcel A level Economics A (9EC0) 1.3 and 1.4. The **Revise** tab has key ideas
and exam practice with mark schemes.

## Batch run

A free market overproduces (20.2 a day against the optimum 16); the welfare loss
against the tax (a U shape, lowest at £40 = the external cost); a subsidy for
training (reaches the optimum at £24); the permit price against the cap (£82 at
300 kt, £40 at 500 kt, zero at 700 kt or more, all within £1 of theory); free
riders (36% given in round 1, under 20% by round 6); the market for lemons
(follows (r ÷ 2)⁸).

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its elasticity sliders, UK policy presets and
batch settings table are not in this version.

## Limits

All numbers are illustrative; external costs are constant per unit; traders do
not learn from day to day; the government knows the external cost exactly. See
"The model" tab for the full list.

## Source

Built from `tools/kit/src/externalities.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
