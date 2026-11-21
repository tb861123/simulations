# The Great Depression

A single, self-contained HTML file: why the Wall Street Crash became a world depression, and what ended it, in the USA and Germany, 1929–39. It needs no install and no
internet: **open `great-depression.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. Also listed under Economics on the front page.

Built from `tools/kit/src/great_depression.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `great-depression.html` by hand.

- **Standard (GCSE):** the Wall Street Crash, Hoover and the New Deal; the Depression in Germany and the rise of the Nazis.
- **Advanced (A level):** OCR A level History A (H505) Y221 Democracy and dictatorships in Germany 1919–1963 (Brüning's deflation, the Nazi recovery) and Y113 Britain 1930–1997 context; AO3 interpretations (Keynes, Friedman and Schwartz, Eichengreen, the Borchardt debate).

## What it shows

A quarter-by-quarter model: 100 banks (each about 250 real ones) failing in runs, the money supply against 1929, cash hoarding and confidence, prices, the gold standard and fiscal policy, a 'dole queue', and a timeline of events. Graphs of output and unemployment against the real figures (US real GDP and unemployment; German registered unemployed and the Nazi vote). 'As it happened' replays the real policies; 'Your choices' lets students choose when to leave gold, when to stop bank runs and the fiscal stance from 1930.

History is a weaker fit for simulation than science: the model is a rough fit to US output, reused for Germany, and the page lists its simplifications (one country, no trade, no politics inside the model).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Leave gold sooner? | output 1932–34 about 86 leaving in 1930 against 77–78 leaving in 1933 or later (expected 86 and 78) |
| Stop the bank runs in 1930? | 53% of banks fail as happened, 9% with runs stopped in 1930 |
| Austerity or spending in Germany? | peak unemployed 6.2 million with cuts, 5.6 neutral, 4.7 with heavy spending |
| Unemployment and the Nazi vote | estimated 38% for July 1932 (real 37.3%) |
| How much was bad luck? | output in 1933: mean 74, SD 6 (real about 74) |
