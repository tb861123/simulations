# Trade and Exchange Rates

A single, self-contained HTML file: comparative advantage and gains from trade, tariffs and quotas, the market for pounds, and the real pound since 2000. It needs no install and no
internet: **open `trade-exchange-rates.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/trade_exchange_rates.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `trade-exchange-rates.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Edexcel International GCSE Economics (4EC1): specialisation, comparative advantage, opportunity cost, terms of trade; tariffs and quotas; exchange rates, SPICED / WPIDEC; the current account.
- **Advanced (A level):** Edexcel A level Economics A (9EC0) Theme 4: welfare effects of protection, quota rent, customs unions (trade creation and diversion), increasing opportunity cost, fixed and floating rates and reserves, Marshall–Lerner and the J-curve.

## What it shows

Four views. **Comparative advantage:** the UK (200 workers) and country B, workers moving to the better-paid job, ships carrying exports, the terms of trade settling between the two opportunity costs; PPF with production and consumption. **Tariffs and quotas:** UK steel demand and supply with the world price, tariff revenue or quota rent, deadweight loss, customs union at A level; daily markets of 40 buyers and 40 firms. **Exchange rates:** demand for and supply of pounds moved by interest rates, inflation, growth and speculation; SPICED effects; a fixed rate defended with reserves; the J-curve. **The real pound:** Bank of England annual averages 2000–2025 with the big moves, and the UK's main export markets.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Where do the terms of trade settle? | 2.00 for a small B, 2.67 at 89 workers, 3.90 at 130, 5.67 at 189, 6.00 for a large B (theory identical) |
| Who gains most from trade? | UK 0% while B is small, 39.6% at 130, 73.2% at 250+ (theory identical) |
| Higher tariff, fewer imports? | 24.3 kt a day at no tariff to 0 at £300 (theory 24 → 0), SD about 1 |
| Does the market find the exchange rate? | mean $1.360, SD 0.007 (theory $1.36) |
| Interest rates and the pound | gradient 3.0 cents per point, r = 0.999 (theory 3) |
| Marshall–Lerner (A level) | −£7.5bn at PEDx 0.1 to +£15.2bn at 2 (theory −7.5 → +15.3); improves once PEDx + PEDm > 1 |
