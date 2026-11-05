# The Labour Market

Employers and workers set wages in weekly hiring rounds. Each employer has a job worth
its marginal revenue product (MRP); each worker has a reservation wage. Nobody can see
the curves, yet the wage settles where the demand for labour meets the supply. Add the
National Living Wage or a union wage and watch unemployment appear in a competitive
market, or (Advanced) employment rise under monopsony. Compare two labour markets to see
why wages differ and how mobility closes (or fails to close) the gap, and watch the
division of labour in a workshop.

Standard: Edexcel International GCSE Economics (4EC1). Advanced: Edexcel A level
Economics A (9EC0), Theme 3.

## How to run

Open `labour-market.html` in Chrome or Edge, with no install and no internet.

## The four views

1. **Wage determination.** The hiring floor (employers by MRP, workers by reservation wage;
   hires ticked; unemployed workers ringed red at the end of a week) beside the labour
   market diagram (D = MRP, S, the people's own step curves, the wage floor and the
   unemployment it causes) and every hire's wage. Derived demand: the product's price and
   productivity shift MRP. Migration shifts supply. Wage floors: UK minimum wage rates by
   date, your own value, and a union wage.
2. **Monopsony (Advanced).** One employer owns every job. Left: who applies at the wage it
   offers, who is hired, the MRP of each job. Right: MRP, supply (= average cost of labour),
   MCL, the monopsony wage and employment, the competitive point, and the outcome with a
   minimum wage or a union (bargaining power from none to all). The employer learns its
   best wage week by week.
3. **Wage differences.** Two labour markets side by side, with workers moving between them
   when the expected-wage gap beats the cost of moving. Scenarios: skills (occupational
   immobility), London vs the North East (geographical immobility), discrimination, a
   union in one market, migration into one market, or identical markets.
4. **Division of labour.** Two workshops making chairs in four tasks: generalists making
   whole chairs vs specialists passing work along (practice, no switching time, boredom).

Right panel: what's happening, readings (wage, employment, unemployment, wage bill; in
Advanced elasticities and the % changes), a chart comparing employment against the minimum
wage in the competitive and monopsony models, a table of UK minimum wage rates with dates,
real examples, key ideas, 12 exam questions (6 Standard, 6 Advanced; several built from the
numbers on screen) with mark schemes, and "How the model works (and what it leaves out)".

## Controls

- Standard / Advanced toggle (the monopsony view, union bargaining power, elasticity
  readings and A level questions appear in Advanced).
- 12 presets: how wages are set; National Living Wage 2026 (£12.71); derived demand: a
  boom; lorry driver shortage (2021); a trade union; monopsony: one big employer (A level);
  minimum wage in a monopsony (A level); union in a monopsony (A level); skills and wage
  differences; London and the North East; discrimination; division of labour.
- Job (hospitality and retail, care workers, HGV drivers, nurses, software developers),
  elasticities of labour demand and supply, numbers, product price, productivity,
  migration, minimum wage, union wage / bargaining power, learning or random traders.
- Play / pause, reset, end the week (or step), speed ½× to 20×; hide / show panels,
  full screen. A hover tip on the hiring floor shows each person's MRP or reservation wage.
- No quality setting: the views are a few shapes and lines (at most 200 people).

## The model

- The same double auction with learning (ZIP) traders as Supply, Demand and Elasticity,
  with employers as buyers (value = MRP = MPP × MR) and workers as sellers (cost =
  reservation wage). Straight-line theory curves through the reference wage with the chosen
  elasticities; MRP scales with the product price and productivity (derived demand).
- A minimum wage or union wage is a wage floor (a minimum price): unemployment =
  people willing to work at the floor who are not hired.
- Monopsony: S(L) = cLo + sL, MCL = cLo + 2sL, MRP = vHi − dL; hires where MRP = MCL;
  with a floor f above the monopsony wage, employment = min(Ls(f), Ld(f)). Union wage =
  monopsony wage + power × (MRP at monopsony employment − monopsony wage).
- Two markets: each clears every week (or sits at a union floor); a share of workers (the
  mobility setting) move when the expected wage (wage × chance of a job) elsewhere is higher
  by more than the cost of moving; only workers with the skills can enter market B;
  discrimination lowers employers' valuation of group B.
- Wage rates are the real UK NMW/NLW rates with their dates; the reference wages,
  elasticities and job sizes are illustrative. All assumptions are listed in the simulation.

## Batch run

| Experiment | Result from the test run (theory) |
|---|---|
| Does hiring find the market wage? (100 markets) | £12.25, SD £1.66 (£12.00, SD £1.69) |
| Minimum wage in a competitive market (£10–£16) | employment 30.4 → 24.6 (30 → 25); monopsony model shown for contrast |
| Minimum wage in a monopsony (£8–£16) | 23.8 → 27.4 at £12 → 24.6 at £16 (22 → 30 → 25) |
| A union in a monopsony (bargaining power 0–1) | 25.2 → 28.0 → 24.6 (25 → 30 → 25) |
| Elastic labour demand: more jobs lost (NLW £12.71, elasticity 0.1–2) | about 1.9% → 10.8% (0.6% → 11.8%) |
| Skill shortages: fewer workers, higher pay (15–120 workers, 60 jobs) | £37.80 → £6.93 an hour (£36.62 → £6.75) |

Each experiment's note explains what the result shows and why results scatter (and, for
the monopsony peak, why the mean falls short of the theory). Re-run `tools/worksheets` for
this simulation if the batch experiments change.

## Data sources

National Minimum Wage and National Living Wage rates (GOV.UK, Low Pay Commission): £3.60
(1999), £7.20 (2016), £8.72 (2020), £8.91 (2021), £9.50 (2022), £10.42 (2023), £11.44
(2024), £12.21 (2025), £12.71 (April 2026; 18–20 £10.85, 16–17 and apprentices £8.00).
ONS ASHE 2024 (median full-time pay about £37,400; gender pay gap 7.0% full-time, 13.1%
all employees); Department for Business and Trade trade union statistics 2024 (about 22%
of employees); ONS net migration (peak about 906,000, year to June 2023); the EU bankers'
bonus cap (UK 2014 to October 2023); public-sector pay freeze 2011–12 and 1% cap to 2017;
Card and Krueger (1994); Adam Smith's pin factory (1776).
