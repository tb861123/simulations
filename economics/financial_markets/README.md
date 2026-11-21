# Banks, Bonds and Financial Markets

A single, self-contained HTML file: bond prices and interest rates, a bank run with a lender of last resort and deposit insurance, moral hazard from bailouts, and bubbles made by speculators. It needs no install and no
internet: **open `financial-markets.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/financial_markets.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `financial-markets.html` by hand.

- **Standard:** Pearson Edexcel International GCSE Economics (4EC1): commercial and central banks, interest, confidence and the lender of last resort.
- **Advanced (A level):** Pearson Edexcel A level Economics A (9EC0) 4.4: bonds and interest rates, market failure in the financial sector (moral hazard, speculation and bubbles, externalities), bank balance sheets (liquidity, capital ratio) and the role of central banks.

## What it shows

**Bonds** (A level): each payment and its value today, price, yield, and the price–rate curves for 2-, 10- and 30-year bonds. **Bank run:** 200 depositors, a bank with reserves, loans and capital, a rumour, the queue and a balance sheet that shrinks with fire sales; switch on the lender of last resort or deposit insurance. **Moral hazard** (A level): 200 banks choosing risky lending as bailouts become more certain, with failures and the cost to taxpayers. **Bubbles** (A level): fundamentalists and trend-following speculators, price against fundamental value.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Bank runs and the size of the rumour | no failures at 4%, 24% at 8%, almost all from 12% |
| Deposit insurance and runs | all fail with under 40% insured, 4% fail at 60%, none at 80% |
| Bond price against interest rate | £138 at 1% to £69 at 10% (exact discounting) |
| Which bonds suffer when rates rise? | 0.9% fall for a 1-year bond, 15.6% for a 30-year bond |
| Moral hazard: bailouts and risk | 3% risky lending with no bailout, 90% at a 40% bailout chance, all risky above |
| Speculators and mispricing | SD of mispricing 2.4% with no speculators to 9.8% at 70% |
