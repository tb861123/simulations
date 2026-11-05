# Taxes, Subsidies and Price Controls

The same double-auction market as [Supply, Demand and Elasticity](../supply_demand/supply-demand.html):
buyers with private values and sellers with private costs, who cannot see the curves.
Put an indirect tax (specific or ad valorem), a subsidy, a maximum price or a minimum
price on the market and watch the traders find the new outcome: who pays the tax, what
the government collects or spends, the shortage or surplus, queues and black markets,
and (Advanced) the changes in consumer and producer surplus and the deadweight loss.
Real UK policies are used as presets, with their year.

Standard: Edexcel International GCSE Economics (4EC1). Advanced: Edexcel A level
Economics A (9EC0), Theme 1.

## How to run

Open `taxes-price-controls.html` in Chrome or Edge. No install, no internet.

## What it shows

- **Trading floor**: every buyer and seller; sellers' costs include the tax. Under a
  maximum price, buyers who would pay the maximum but got nothing are ringed in red at
  the end of the day; under a minimum price, sellers left with unsold stock are.
- **Diagram**: demand, supply with no tax (dashed) and with the tax or subsidy, the tax
  wedge between what consumers pay and what sellers keep, the free-market point, the
  controlled price with the shortage or surplus, and the theory black-market price.
  Shading: tax revenue or subsidy cost; Advanced adds consumer surplus, producer surplus
  and the deadweight-loss triangle; government purchases of a surplus.
- **Price path**: what consumers paid and what sellers kept in every deal.
- Readouts: free-market and taxed prices, tax per unit, consumers' share of the tax
  (theory and measured from today's deals), quantity, revenue (in real units, e.g. £ million
  a day), shortage or surplus, black-market price; Advanced adds CS, PS, deadweight loss
  (triangle and with random rationing) and the surplus actually lost today.
- "Who pays the tax?" bar chart (theory, today's deals, and in Advanced the formula
  PES ÷ (PES − PED)); daily average prices; a box of real UK examples with dates.

## Controls

- Standard / Advanced toggle.
- 12 presets: a tax on each unit; fuel duty + VAT (52.95p a litre and 20%, 2025);
  sugar levy (24p a litre, 2018); tobacco duty rise; VAT as an ad valorem tax (20% since
  2011); Energy Price Guarantee (subsidy, October 2022); rent control (shortage); ticket
  touts (maximum price and black market); minimum unit pricing (Scotland, 65p a unit
  from 2024); farm price support (government buys the surplus); who pays with inelastic
  supply (A level); rent control in the long run, government failure (A level).
- Product (coffee, petrol, sugary drinks, cigarettes, rented flats, concert tickets,
  strong cider, wheat, household electricity), |PED|, PES, number of traders, learning or
  random traders, new traders.
- Specific tax, ad valorem tax, subsidy; price control type and level; black market;
  government buys the surplus.
- Play / pause, reset, end the day, speed ½× to 20×; hide / show panels, full screen.
- No quality setting: the views are a few shapes and lines, cheap to draw.

The minimum wage is a minimum price in the labour market; it belongs to the
labour-market simulation, and taxes on pollution to the externalities simulation.

## The model

- Straight-line theory curves through the free-market price with the chosen PED and
  PES; each trader is one unit a day (scaled to real units for each product).
- Seller keeps P − t (specific), P ÷ (1 + r) (ad valorem), P ÷ (1 + r) − t (duty with
  VAT on top, as UK fuel), P + s (subsidy). No deal above a maximum or below a minimum.
- Consumers' share of a tax = rise in consumer price ÷ tax = PES ÷ (PES − PED) on
  straight lines. Deadweight loss = ½ × tax × fall in quantity.
- Under a shortage, the scarce units go to whoever calls first (a queue), so the loss is
  bigger than the textbook triangle; the black market resells to keener buyers at a
  price halfway between their two values, with a 60% chance per possible resale.
- Elasticities and costs for the real products are illustrative values in the range of
  published estimates; tax rates are the real UK rates with their year. All assumptions
  are listed under "How the model works (and what it leaves out)".

## Batch run

Each run trades the same traders twice, with and without the policy, and compares them.
Results from the test run:

| Experiment | Result (theory) |
|---|---|
| Who pays? It depends on PED (£1 tax, PES 1, \|PED\| 0.2 to 5) | consumers' share 78% → 17% (83% → 17%) |
| Who pays? It depends on PES (£1 tax, \|PED\| 1, PES 0.2 to 5) | 14% → 84% (17% → 83%) |
| Deadweight loss ∝ tax²? (20p to £1.60, log–log) | gradient 2.00 (2) |
| Does a higher tax always raise more? (\|PED\| 3, PES 1) | hump, highest at £1.50–£1.75 (£1.67) |
| Maximum price: how big is the shortage? (\|PED\| 0.2 to 3) | best-fit gradient 6.3 (6) |
| Queues waste more than the triangle (max price £1.50 to £2.50) | lost £27 a day at £1.50 (triangle £12, random rationing £30) |

Exam practice: 6 Standard questions (tax incidence per unit, tax revenue, effect of a
tax on a diagram, specific vs ad valorem, shortage under a maximum price, minimum unit
pricing) and 6 Advanced (deadweight loss, the incidence formula, cost of a subsidy,
changes in CS and PS, government failure in rent control, queues and the triangle),
with mark schemes. Several use the numbers on screen.
