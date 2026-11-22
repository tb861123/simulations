# Investment Appraisal and Decision Trees

A single, self-contained HTML file: payback, average rate of return and net present value for four projects (a machine, a second shop, solar panels, a delivery van), with possible futures to show risk; and a decision tree whose expected monetary values you can test by playing the decision many times. It needs no install and no
internet: **open `investment-appraisal.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/investment_appraisal.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `investment-appraisal.html` by hand.

- **Standard (GCSE / AS):** Pearson Edexcel A level Business (9BS0) 3.3.2 payback and ARR; decision trees and EMV (3.3.3).
- **Advanced (A level):** 9BS0 3.3.2 NPV with discount factors, sensitivity, risk and uncertainty, limitations; 3.3.3 decision trees. Internal rate of return and risk attitude (certainty equivalents) are marked beyond the spec.

## What it shows

**Investment appraisal:** the cash-flow table (with discount factors and present values at A level), cumulative cash flow bars with the payback point, cumulative present value, cards for payback, ARR and NPV, and a second project to compare. Charts of NPV against the discount rate and of NPV across many possible futures (each year's cash flow uncertain). **Decision tree:** launch a new product, upgrade an existing one, or do nothing; EMV working on screen; press play to make the decision again and again and watch the running averages approach the EMVs; at A level, a risk-averse owner's certainty equivalents.

## Batch run

| Experiment | What it compares |
|---|---|
| Possible futures for the machine | spread of NPV against the forecast NPV |
| NPV and the discount rate | NPV from 0 to 25% against Σ CF/(1+r)ᵗ − cost |
| Payback when sales disappoint | payback at 60–120% of forecast cash flows |
| Decision tree: one launch at a time | results of single launches against the EMV |
| How many decisions before the average is near the EMV? (A level) | error of the average against σ√(2/πn) |
