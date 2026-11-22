# Break-even and Margins

A single, self-contained HTML file: fixed and variable costs, contribution, the break-even chart, margin of safety, target profit, and what a price change really does to profit when customers respond. It needs no install and no
internet: **open `breakeven-and-margins.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/breakeven_and_margins.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `breakeven-and-margins.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Business (1BS0) 1.3.2: fixed, variable and total costs, revenue, profit, break-even output, margin of safety, reading break-even diagrams.
- **Advanced (A level):** Pearson Edexcel A level Business (9BS0) 2.2.2 and 2.2.3 (contribution, break-even, margin of safety, target profit, limitations), 1.2.4 price elasticity of demand, 2.4.2 capacity utilisation and stepped fixed costs.

## What it shows

Three businesses (a coffee cart, a phone-case maker, a T-shirt printer). A large break-even chart with the loss and profit regions shaded, the break-even point, expected sales and the margin of safety; drag up or down on the chart to change the price. Beside it, each month's sales fill a grid of squares: orange squares are paying off the fixed costs, green squares are profit, with a running profit statement. Demand responds to price through the price elasticity of demand, and each month's sales are uncertain. Charts of profit (and revenue) against price, and of profit in each month. At A level: target profit, the profit-maximising price, and a second site that adds a stepped fixed cost and a second break-even point.

## Batch run

| Experiment | What it compares |
|---|---|
| A year of uncertain months | spread of monthly profit against the expected profit |
| Margin of safety and the risk of loss | % of loss-making months against 100 Φ(−MoS ÷ SD) |
| Break-even and price | break-even output against FC ÷ (P − VC) |
| Which price makes the most profit? | profit against price when demand responds (PED 1.4) |
| Price rise of 10% (A level) | change in revenue against 1.1^(1−PED) − 1 |
