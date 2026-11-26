# Version 3 verification — 21 October 2026

## Passed

- **55 Node tests passed, 0 failed, 0 skipped.** Includes actual compute/diagnostic worker source, string detachment and reattachment, impact-energy accounting, angular/tangent input, adaptive reference, synthetic calibration ground truth, confidence selection/codes, format-2 migration, IndexedDB round trips, cancellation and production HTTP assets.
- TypeScript compilation and Vite production build passed. `dist/` and the optional self-contained HTML build are included.
- Independent SciPy DOP853 comparison passed for three smooth rod trajectories at a common five-second horizon. Maximum absolute SI-component discrepancy of the browser's adaptive DP5(4) reference was **6.14×10⁻¹⁰**. Production RK4 maximum discrepancy across these cases was **2.27×10⁻⁶**. These are differently dimensioned state components, not spatial error bounds. See `REFERENCE-VALIDATION.json`.
- Hybrid string test: all three steps, 0.004/0.002/0.001 s, produced four reattachments over five seconds. Specific impact loss converged to about **1.933655012 J/kg**. Maximum normalised budget residual decreased from **4.45×10⁻⁹** to **1.76×10⁻¹¹**. See `HYBRID-VALIDATION.json`.
- Complete default 100×100 map: **10,000 independently simulated releases**. Single/multiple-worker stored results agreed exactly. **128/128 sampled boundary outcomes agreed** at Δt, Δt/2 and Δt/4; no resolved/unresolved changes or failed checks in this sample. The remaining pixels are not certified. The portable default includes the confidence codes.
- Actual side-view and scientific-export drawing functions were rendered through a native Canvas adapter and visually inspected. Those figures are **not browser screenshots**.
- The owner-run Playwright suite parsed and discovered **12 desktop/tablet scenarios**. Discovery is not execution.

## Measurement and verification still required

**Experimental calibration:** no real apparatus data was supplied. The importer/fitter was tested using explicitly synthetic datasets, including a known coefficient and a non-inverse-square case. No claim of a calibrated physical apparatus is made. `CALIBRATION-GUIDE.md` explains required measurements and report provenance.

**Live browser/tablet QA:** not executed. The in-app browser's local HTTP navigation timed out; connected Chrome automation could not attach; the browser URL policy explicitly rejected file URLs. No security policy was bypassed. `BROWSER-QA.md` gives owner-run commands and the manual checklist. Browser-specific downloads, real IndexedDB/quota behaviour, gesture behaviour and responsive layout remain unverified in a live browser.

## Performance measurements

`BENCHMARKS.json` preserves both complete-map results, numerical comparisons and an unusually long four-worker wall-clock observation. A follow-up in `BENCHMARK-REPEAT.json` completed the same map in **7.47 s with four workers** and **33.58 s with one**, also recording process CPU time. Scheduling/suspension was not controlled; do not interpret the anomalous run as a repeatable speed ratio or silently discard it. All timings are **Node worker-thread measurements of the actual worker source**, not browser benchmarks.

The integration microbenchmark and default investigation can be regenerated with `npm run benchmark`. Independent SciPy checks additionally require Python, NumPy and SciPy; the normal browser application and launcher do not.
