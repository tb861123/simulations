# Taxes, Subsidies and Price Controls

A single, self-contained HTML file: a market of buyers and sellers who haggle,
with indirect taxes, subsidies, maximum and minimum prices. It needs no install
and no internet: **open `taxes-price-controls.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/taxes_price_controls.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`taxes-price-controls.html` by hand. The earlier version and its worksheets are
kept in [`original/`](original/).

- **Standard (GCSE):** Edexcel International GCSE Economics (4EC1): specific
  and ad valorem taxes, subsidies, who bears the tax, maximum and minimum
  prices, shortages and surpluses.
- **Advanced (A level):** Edexcel A level Economics A (9EC0) Theme 1:
  incidence and elasticity, consumer and producer surplus, deadweight loss,
  government failure (rent control, buffer stocks).

## What it shows

- A trading floor of 40 buyers (private values) and 40 sellers (private
  costs) who haggle each day; who traded, who wanted to buy but got nothing
  (shortage), who could not sell (surplus), who sold to the government.
- The diagram: demand, supply with and without the tax, the wedge between
  what consumers pay and what sellers keep, tax revenue or subsidy cost;
  Advanced adds consumer and producer surplus and the deadweight loss.
  Maximum and minimum prices with the shortage or surplus, and the theory
  black-market price.
- Products with real units and UK examples: takeaway coffee, petrol (fuel duty
  52.95p + VAT 20%, 2025), sugary drinks (sugar levy 24p a litre, 2018),
  cigarettes, rented flats, concert tickets, cheap alcohol (minimum unit
  pricing 65p, Scotland 2024), wheat (price support), household electricity
  (Energy Price Guarantee 2022).
- Charts: every deal's price with the theory line; who pays the tax (theory,
  measured, and PES ÷ (PES + |PED|) at Advanced).

## Investigate

Who pays a tax? · Fuel duty and VAT · The sugar levy · VAT: an ad valorem tax ·
Energy Price Guarantee · Rent control · Ticket touts · Minimum unit pricing ·
(A level) Farm price support · Incidence and elasticity · Deadweight loss.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Who pays? It depends on PED (\|PED\| 0.2–5, PES 1) | consumers' share 96%, 75%, 47%, 33%, 11% (83, 67, 50, 33, 17) |
| Who pays? It depends on PES (PES 0.2–5, \|PED\| 1) | 24%, 34%, 50%, 68%, 91% (17, 33, 50, 67, 83) |
| Does a higher tax always raise more? (\|PED\| 3) | revenue rises, peaks at a tax of about 60% of the price, then falls |
| Deadweight loss and the size of the tax | 0.09, 0.31, 0.54, 1.24, 1.63 for taxes of 10–50% (0.08, 0.3, 0.68, 1.2, 1.87) |
| Maximum price: how big is the shortage? | 20, 16, 13, 9, 6 units for caps of 50–90% (20, 16, 12, 8, 4) |

## The model

Traders sit on straight-line demand and supply curves through the free-market
price with the chosen elasticities. They meet at random, shop around a little,
and give ground in equal steps after failed meetings; each day opens near
yesterday's average price. A seller keeps P ÷ (1 + VAT) − specific tax +
subsidy. Optional black market (resale to keener buyers) and government
purchases of a surplus. Leaves out the long run, firms changing the product,
collection costs and avoidance; elasticities are illustrative.
