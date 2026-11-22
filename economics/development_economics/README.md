# Development Economics

A single, self-contained HTML file: fifty years of a developing country, with surplus labour moving from village to city (Lewis), saving and investment (Harrod–Domar), volatile commodity prices, a foreign-currency gap, aid, education and the HDI. It needs no install and no
internet: **open `development-economics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/development_economics.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `development-economics.html` by hand.

- **Standard:** Pearson Edexcel International GCSE Economics (4EC1): growth and development, GDP per head and the HDI, barriers to development and policies (education, aid, FDI).
- **Advanced (A level):** Pearson Edexcel A level Economics A (9EC0) 4.3: measures of development, primary product dependency and Prebisch–Singer, the savings gap and Harrod–Domar, the foreign currency gap, the Lewis model, market-orientated and interventionist strategies, aid and microfinance.

## What it shows

Four country presets (a copper exporter, a garment maker, a tiger economy, a well-run diamond exporter) and policy sliders: saving, education, the share of investment going to industry, openness to FDI, aid and its efficiency, microfinance, the Prebisch–Singer trend and commodity volatility. The picture shows the village (farm workers needed and surplus labour), the city's growing factories and the mine with its world price; charts show income per head and HDI, and either the Lewis turning point (industrial employment and wage) or the commodity price, investment and foreign-currency-gap years.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Harrod–Domar: saving and growth | −3.4% a year at s = 5% to 6.7% at 35% (s ÷ 3 − 5%: −3.3% to 6.7%) |
| Commodity dependence and volatile growth | SD of yearly growth 1.7% at 5% commodity share to 5.5% at 55% |
| Aid and growth | 2.1% a year with no aid invested to 3.1% with all of it invested |
| When is the Lewis turning point? | year 15 at s = 15% to year 10 at 35% |
| Copper luck: 200 exporters | income after 30 years mean $1620, SD $74 |
