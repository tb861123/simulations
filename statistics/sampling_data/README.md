# Sampling and Data

A single, self-contained HTML file: A large data set of daily weather at eight stations: take a census or a simple random, systematic, stratified, quota or opportunity sample, clean 'tr' and 'n/a' values, then box plots, histograms, cumulative frequency, outliers, mean and standard deviation. It needs no install and no
internet: **open `sampling-data.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/sampling_data.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `sampling-data.html` by hand.

- **AS (8MA0):** Pearson Edexcel AS Mathematics (8MA0) Statistics 1 and 2: populations, census and sample, sampling units and frames; simple random, systematic, stratified, quota and opportunity sampling; histograms, frequency polygons, box plots, cumulative frequency; mean, median, mode, variance and standard deviation, IQR and percentiles; outliers and cleaning data; the large data set (weather, 1987 and 2015).
- **A level (9MA0):** Pearson Edexcel A level Mathematics (9MA0) Statistics 1 and 2: the same content in more depth: Sxx and σ² = Sxx/n, coding (y = (x − a)/b), linear interpolation from grouped data, histograms with unequal class widths (frequency density), comparing distributions and the large data set.

## What it shows

A calendar of all 184 days (1 May to 31 October) coloured by the chosen variable, with the sampled days outlined as they are chosen. Below, box plots of the sample and the (normally unknown) population with outliers, and a dot plot; charts give a histogram (equal classes, or unequal classes with frequency density at A level) and a cumulative frequency graph with the quartiles. Readings give n, Σx, Σx², mean, median, σ and s, quartiles, IQR and outliers. 'Repeat 200 times' shows how much the sample mean varies from sample to sample.

Try this first: Record 30 days in a row in the summer holidays. Why is your mean so far from the truth?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How close is a sample mean? | mean 19.3, SD 0.58, SE 0.029 from 400 runs (theory: population mean) |
| Bigger samples, less scatter | 5: 1.24 ± 0.0254 · 10: 0.879 ± 0.0143 · 20: 0.587 ± 0.0167 · 40: 0.402 ± 0.00661 · 80: 0.237 ± 0.00264 · 120: 0.157 ± 0.00436 · 160: 0.08 ± 0.00136 (mean ± SE, 4 runs each) (theory: σ/√n × √((N − n)/(N − 1))) |
| Does a bigger opportunity sample help? | 10: 2.99 ± 0 · 20: 2.75 ± 0 · 40: 2.52 ± 0 · 60: 1.63 ± 0 · 90: 0.284 ± 0 · 120: -0.0972 ± 0 · 150: 0.0774 ± 0 · 184: 0 ± 0 (mean ± SE, 1 runs each) (theory: no error) |
| Stratified or simple random? | mean 0.643, SD 0.049, SE 0.00775 from 40 runs (theory: no difference) |
| How many outliers? (rain against temperature) | mean 1.84, SD 1.38, SE 0.0795 from 300 runs |

## The model

Invented weather in the style of the Edexcel large data set (seasonal temperature with warm and cool spells, exponential rainfall, sunshine and gusts, with tr and n/a values); Edexcel's quartile rule for raw data and σ with divisor n. Assumptions and simplifications are listed inside the simulation under **The model**.
