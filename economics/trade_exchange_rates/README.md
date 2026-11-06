# Trade and Exchange Rates

Why countries trade and who gains, what tariffs, quotas and customs unions do, and how the pound's exchange rate is set and what it changes. Two countries specialise by comparative advantage; a UK steel market of individual traders faces foreign sellers at the world price; a market of traders buys and sells pounds for dollars; real exchange-rate data from 2000 to 2025.

**How to run:** open `trade-exchange-rates.html` in Chrome or Edge. Nothing to install, and no internet needed.

## Levels

- **Standard (GCSE)**: Edexcel International GCSE Economics (4EC1), the global economy: specialisation; absolute and comparative advantage; opportunity cost; gains from trade and the terms of trade; free trade and protectionism (tariffs, quotas) and the arguments for and against; exchange rates set by demand for and supply of a currency; appreciation and depreciation and their effects on exports, imports and inflation (SPICED / WPIDEC); the current account.
- **Advanced (A level)**: Edexcel A level Economics A (9EC0), Theme 4: the welfare effects of tariffs and quotas (consumer and producer surplus, revenue, quota rent, deadweight loss); the terms of trade index; trading blocs and customs unions, trade creation and trade diversion; increasing opportunity cost (workers with different skills); fixed and floating exchange rates, central bank intervention and reserves; the Marshall–Lerner condition and the J-curve.

## Views

1. **Comparative advantage.** The UK and country B, each with workers who make machinery or clothing. Workers move to the industry that pays more; once trade opens each country specialises, ships carry the exports, and the terms of trade settle between the two opportunity costs. PPFs with production (white), consumption (gold, outside the PPF with trade) and the trading line; the terms of trade over time against theory.
2. **Tariffs and quotas.** 40 UK buyers, 40 UK steel firms and up to 40 foreign sellers at the world price trade in a double auction. Policies: no trade, free trade, tariff, quota and (A level) a customs union with a partner. The diagram shades tariff revenue (or quota rent), the two deadweight-loss triangles and (A level) the producer-surplus gain and trade-diversion cost; bars show who gains and who loses.
3. **Exchange rates.** 40 buyers and 40 sellers of pounds. Sliders for UK interest rates, inflation and growth compared with abroad, speculation buttons, and (A level) a fixed rate defended with reserves and the PEDs for exports and imports. Below: the rate each day and the SPICED / WPIDEC effects (US price of a £20,000 UK car, UK price of a $100 import, volumes, inflation, current account); right: (A level) the J-curve.
4. **The real pound.** Annual average dollars and euros per pound, 2000–2025, with big moves (2007 peak, 2008 crisis, 2016 referendum, Covid-19, 2022 mini-budget), the year-on-year change, and the UK's main trading partners.

## Controls

Left: level, 12 presets, then the controls for the view (output per worker in each country, size of country B, trade on/off, A level skill differences; trade policy, world price, tariff, quota, partner price; interest, inflation and growth differences, speculation, A level regime, peg and PEDs; a year slider). Centre: view tabs, Play/Pause, Reset, speeds ½× to 20×, Batch run. Right: what's happening, readings, a chart, UK facts with sources, key ideas, exam practice (7 Standard and 5 Advanced questions with mark schemes; "On screen" questions use the live numbers) and "How the model works".

No quality setting: the views are a few hundred shapes and lines, cheap to draw on any laptop.

## The model

- Comparative advantage: constant output per worker (straight-line PPFs unless skills differ); everyone spends half their income on each good; prices adjust towards where demand equals supply and workers switch to the better-paid job. Theory: full specialisation gives terms of trade = clothing made by the clothing country ÷ machines made by the other, limited to the range between the two opportunity costs. Gains = rise in √(machines × clothing) consumed.
- Steel: straight-line UK D and S (no-trade price £700); horizontal world supply at the world price (+ tariff). Imports = Qd − Qs; revenue = tariff × imports; deadweight loss = two triangles; quota rent = (P − Pw) × quota.
- Pounds: each point of interest-rate difference shifts D£ and S£ up by 3 cents, each point of extra inflation down by 2 cents, faster growth shifts S£ right; speculation shifts both. Exports and imports £200bn a quarter; elasticities rise from 0.1 to their long-run values over about a year (J-curve); inflation rises about 0.2 points per 1% fall in the pound. Fixed rate: the Bank buys pounds left unsold at the peg from $60bn of reserves.

All model numbers are illustrative. Assumptions and what the model leaves out are listed in the simulation.

## Real data and sources

- Exchange rates: Bank of England Database, annual average spot exchange rates (US dollar into sterling; euro into sterling), rounded to 2 decimal places; 2025 provisional. Dates and approximate intraday levels of big moves: Nov 2007 about $2.11; Jan 2009 about $1.37; 24 June 2016 about $1.49 to $1.32; March 2020 about $1.15; 26 September 2022 a record low near $1.04.
- Trading partners (2024, approximate shares of total UK trade, goods and services, exports + imports): United States about 17%, Germany 8%, Netherlands 6%, France 5%, China 5%, Ireland 5%; EU about 40% (ONS, "UK trade in numbers" and "UK trade: country by country").
- ERM: UK left on 16 September 1992; Treasury estimate of the cost about £3.3bn. UK Global Tariff from January 2021; UK–US deal (June 2025): 100,000 UK cars a year at a 10% US tariff.

## Batch experiments

| Experiment | Result (theory) |
|---|---|
| Where do the terms of trade settle? (sweep country B's workers 20–400) | 2.005 at 20 workers (theory 2, the UK's opportunity cost), 2.67 at 89 (2.67), 3.90 at 130 (3.90), 5.68 at 189 (5.67), 6.00 at 400 (6, B's opportunity cost). |
| Who gains most from trade? (same sweep) | UK gain about 0% while B is small (theory 0; B gains 73%), 39.6% at 130 (39.6), 73.1% at 400 (73.2). |
| Higher tariff, fewer imports? (tariff £0–£300) | 13.6 kt a day at no tariff (14.3), 7.6 at £90 (7.9), 2.9 at £180 (1.4), about 0 above £210 (prohibitive). SD about 3: each market's own random UK traders. |
| Does the market find the exchange rate? (repeat, 200 markets, UK rates +2 points) | Mean $1.359 per £, SD 0.026 (theory $1.360; 0.3 standard errors). |
| Interest rates and the pound (−3 to +4 points) | $1.211 to $1.418 (theory $1.21 to $1.42); best-fit gradient 2.9 cents per point (theory 3). |
| Marshall–Lerner (A level; PED for exports 0.1–2, imports 0.3, pound falls about 6%) | Long-run current account −£7.4bn a quarter at 0.1, −£0.4bn at 0.67, +£2.0bn at 0.86, +£17.1bn at 2 (theory −7.3, −0.4, +2.0, +16.7): it improves only when the PEDs add to more than 1. First quarter −£9.8bn whatever the PEDs (the J-curve). |

Results can be downloaded as CSV. Re-run `tools/worksheets` if the batch experiments change.
