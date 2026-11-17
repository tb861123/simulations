# Acids, Salts and Chemical Tests

A single, self-contained HTML file: pH and indicators, titrations, making
salts, a tests lab with unknowns to identify, and (A level) buffers. It needs no
install and no internet: **open `acids-salts-tests.html` in Chrome or Edge**.
Printable worksheets (one per investigation and per batch experiment, with
teacher notes) are in `worksheets.html`.

★ Enhanced: built from `tools/kit/src/acids_salts_tests.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `acids-salts-tests.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4CH1 2(f) acids, alkalis and titrations,
  2(g) salts, 2(h) chemical tests.
- **Advanced (A level):** Pearson Edexcel 9CH0 Topic 12: Kw, pH of weak acids,
  pH curves and indicators, half-equivalence (CP9), buffers.

## Five views

pH scale (HCl, ethanoic acid, NaOH, ammonia at any concentration; five
indicators and a pH meter; exact pH from the charge balance) · Titration
(burette with a zoomed meniscus, five acids, three alkalis, four indicators;
fast, dropwise or one drop; a results table with concordant titres; the pH
curve) · Making salts (mix two solutions; the solubility rules decide the
precipitate; spectator ions) · Tests lab (flame tests, NaOH, acid, acidified
silver nitrate and barium chloride on a known salt or an unknown X; gas tests;
water) · Buffers (ethanoate buffer against pure water).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| How close are your titres? (300 careful titrations) | 25.00 ± 0.10 cm³ (25.00) |
| Careless or careful? | overshoot 0.02, 0.03 and 0.32 cm³ |
| Dilution and pH | pH = −log c down to 10⁻⁶, then levels at 7 |
| Weak acid: exact and approximate pH | ½(pKa − log c) good above 10⁻³ mol/dm³ |
| Equivalence point and acid strength | pH 7.4 → 9.9 for pKa 2 → 7 (7 + ½(pKa + log c)) |
