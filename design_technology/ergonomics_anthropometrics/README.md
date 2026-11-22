# Ergonomics and Anthropometrics

A single, self-contained HTML file: a crowd of 400 simulated users (men, women or children with realistic body sizes) tries a doorway, a control panel, an adjustable chair and a kitchen worktop. Set the design until 90–95% are accommodated, and see percentiles on the normal distribution. It needs no install and no
internet: **open `ergonomics-anthropometrics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/ergonomics_anthropometrics.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `ergonomics-anthropometrics.html` by hand.

- **Standard (GCSE):** AQA GCSE Design and Technology (8552): ergonomics and anthropometrics, 5th to 95th percentile, clearance, reach and adjustability.
- **Advanced (A level):** AQA A level Product Design (7552) 3.1.8 ergonomics and anthropometrics, user-centred design, percentiles from the mean and SD, the normal distribution and sampling. Mixed-population percentiles and correlated dimensions are beyond the spec.

## What it shows

The product drawn with a figure at any percentile (green if accommodated), plus faint 5th percentile woman and 95th percentile man figures; every user in the crowd as a dot (green fits, red doesn't) against the design limits; the percentage accommodated from the crowd and from theory. Charts of the dimension's normal distributions with the 5th and 95th percentiles and the design, and of a survey of 30 people (sorted, or on a cumulative % curve at A level). Users: adults, men, women or children aged 11.

## Batch run

| Experiment | What it compares |
|---|---|
| Door height and the percentile designed for | % of adults accommodated against the mixed-population normal CDF |
| Adjustable chair: range against fit | % accommodated against the normal CDF of the range |
| Surveying 30 people | 5th percentile estimated by counting, against the true value |
| From the mean and SD instead (A level) | 5th percentile as mean − 1.645 SD, against the true value |
