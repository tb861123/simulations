# Organic Mechanisms and Synthesis

A single, self-contained HTML file: a map of twenty organic compounds joined by twenty-nine reactions: plan multi-step routes, step through curly-arrow mechanisms, test for functional groups, and run competing reactions in the lab. It needs no install and no
internet: **open `organic-mechanisms.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/organic_mechanisms.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `organic-mechanisms.html` by hand.

- **Standard:** Pearson Edexcel International GCSE Chemistry (4CH1) 4(c)–4(g): alkanes with bromine, alkenes (bromine water, hydration, polymerisation), ethanol by fermentation and hydration, oxidation to ethanoic acid, carboxylic acids and esters.
- **Advanced (A level):** Pearson Edexcel A level Chemistry (9CH0) Topics 6, 17 and 18: nucleophilic substitution and elimination of halogenoalkanes, oxidation of alcohols, carbonyl chemistry and tests, acyl chlorides, electrophilic substitution of benzene, amines and amides, multi-step synthesis.

## What it shows

Click two compounds to find the shortest route; the steps, conditions and overall yield (the product of the step yields) are listed. Click any road to see its mechanism, step by step with curly arrows: SN2 with OH⁻, CN⁻ and NH₃, elimination, electrophilic addition, nucleophilic addition, addition–elimination, nitration of benzene and free-radical substitution. Nine functional-group tests (bromine water, dichromate, carbonate, Tollens', Fehling's, 2,4-DNPH, iodoform, PCl₅, silver nitrate). Four lab experiments: the C–Cl/C–Br/C–I hydrolysis race, oxidation by distillation or reflux, substitution against elimination, and the esterification equilibrium.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Hydrolysis race: C–Cl, C–Br, C–I | about 7000 s, 900 s and 100 s to cloud: each about ten times faster |
| Primary, secondary, tertiary | 900 s, 230 s and 16 s |
| Elimination and temperature | 64% alkene at 20 °C to 87% at 78 °C in ethanol |
| Esterification: more alcohol, more ester? | 0.67 mol ester with 1 mol ethanol, 0.97 with 6 (Kc = 4) |
| Yield of a three-step route | mean 50%, SD 10% (0.9 × 0.7 × 0.8 = 50%) |
| Distil quickly to keep the aldehyde | 26% collected at k_d = 0.005 s⁻¹, 95% at 0.2 |
