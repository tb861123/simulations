# The Labour Market

A single, self-contained HTML file in which employers and workers set wages in
weekly hiring rounds. It needs no install and no internet:
**open `labour-market.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/labour_market.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `labour-market.html` by hand. The earlier
version (with a division-of-labour workshop) and its worksheets are kept in
[`original/`](original/).

- **Standard (GCSE):** Edexcel International GCSE Economics (4EC1): demand for
  and supply of labour, wage determination, the national minimum wage, trade
  unions, why wages differ.
- **Advanced (A level):** Edexcel A level Economics A (9EC0) Theme 3: MRP and
  derived demand, monopsony (MCL, the wage gap), minimum wages and unions in a
  monopsony, occupational and geographical immobility.

## Three views

1. **Wage determination.** 40 employers (each job worth its MRP) and 40
   workers (reservation wages) haggle each week; hires, and workers who want
   a job at the wage but were not hired. Diagram: D = MRP, S, the minimum
   wage and the unemployment it causes. Product price and productivity
   (derived demand), migration.
2. **Monopsony (A level).** One employer learns, week by week, how many
   workers to hire; diagram with MRP, supply, MCL, the monopsony and
   competitive points and the MRP − wage gap; a chart of employment against
   the minimum wage in both models.
3. **Wage differences.** Two labour markets (identical; skills; London and the
   North East; a union in one market; migration into one market) with workers
   moving when the gap in expected wages beats their cost of moving.

Jobs: hospitality and retail, care workers, HGV drivers, nurses, software
developers (illustrative wages and elasticities), with the National Living
Wage of £12.71 (April 2026).

## Investigate

How wages are set · The National Living Wage · Derived demand: a boom · Lorry
driver shortage · A trade union · Why wages differ: skills · London and the
North East · (A level) Monopsony · Minimum wage in a monopsony · Elasticity of
labour demand.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Minimum wage and unemployment (90–130% of the market wage) | 1.5, 4.4, 5.1, 6.8, 9.2, 13.2 (0, 0, 2, 4, 8, 12, plus a little frictional unemployment) |
| Minimum wage in a monopsony | employment 14 → 20 as the minimum wage rises to the competitive wage (£12), then falls |
| Derived demand (product price × 0.7–1.3) | wage £10.3–£13.2 (theory £10.2–£13.2) |
| Does mobility close the wage gap? (cost of moving £0–£6) | expected-wage gap 0.2 → 4.3 (≈ 0.8 × cost) |
| Does haggling find the market wage? (200 markets) | £12.0 ± 0.19 (theory £12.00) |

## The model

Straight-line labour demand (MRP) and supply through the market wage with
the chosen elasticities; haggling as in the trading pit, with a minimum wage
making lower wages illegal. The monopsonist pays the L-th worker's
reservation wage (or the minimum wage) to all L workers and picks L for the
most profit. Two markets clear each week at their competitive (or union)
wage, and workers move with an 8% chance a week if the expected-wage gap beats
their own cost of moving. Leaves out hours, benefits, taxes, search, training
and discrimination.
