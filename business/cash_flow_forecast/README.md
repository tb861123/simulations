# Cash-Flow Forecast

A single, self-contained HTML file: a month-by-month cash-flow forecast for a garden-furniture maker, a gym or a toy shop, with the actual year played out against it. Profit is not cash. It needs no install and no
internet: **open `cash-flow-forecast.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/cash_flow_forecast.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `cash-flow-forecast.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Business (1BS0) 1.3.3 cash and cash flow (inflows, outflows, net cash flow, opening and closing balances, cash against profit) and 1.3.4 overdrafts and loans.
- **Advanced (A level):** Pearson Edexcel A level Business (9BS0) 2.1.4 cash-flow forecasts, 2.1.2 overdrafts, loans and debt factoring, 2.3.2 liquidity and ways to improve cash flow, 2.3.3 business failure.

## What it shows

The full forecast table (cash sales, credit sales paid, loans; materials, wages, rent, equipment and interest; net cash flow, opening and closing balances), with overdrawn months in red. Below it the closing balance month by month: the forecast as outlines and the actual year (uncertain sales, late payers) as solid bars against the overdraft limit. Controls for seasonality, growth, credit given to customers and taken from suppliers, equipment, a bank loan; at A level, debt factoring, bad debts and overdraft interest. Charts of cumulative profit against the bank balance, and the lowest balance in each year run.

## Batch run

| Experiment | What it compares |
|---|---|
| Lowest balance in an uncertain year | spread of actual lowest balances against the forecast |
| Credit terms for customers | lowest balance at 0, 30, 60 and 90 days |
| Credit from suppliers | lowest balance at 0 to 90 days (toy shop) |
| Seasonality and the overdraft | lowest balance from flat to very seasonal sales |
| Factoring: cash against profit (A level) | profit for the year against the factoring fee |
