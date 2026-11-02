# Validation, verification and measurements

Everything below was actually run; numbers are copied from those runs (dates: 2026-11-02).
Where something was **not** verified it says so. Environment of the runs: Linux (container), 4 logical CPUs,
Node.js 22.23.4, headless Chromium 153 driven by Playwright, SciPy 1.18.1 / NumPy 2.5.4 for the offline cross-check.

## 1. Pilot calculations for the default map (brief §5)

Real 1,600-trajectory pilots (40 × 40, horizon 200, rtol 1e-9, atol 1e-11), *b* ∈ [−3, 3], *v* ∈ [0.25, 2.5]:

| Variant | A esc | B esc | C esc | col AB | col AC | col BC | unresolved | disruption | provisional | worst scaled energy error |
|---|---|---|---|---|---|---|---|---|---|---|
| **default** (phase 0°, r = 0.02) | 158 | 127 | 561 | 113 | 270 | 234 | 68 | 69 | 17 | 2.3e-7 |
| phase 90° | 153 | 142 | 576 | 84 | 264 | 262 | 56 | 63 | 14 | 2.0e-7 |
| r = 0.005 | 236 | 211 | 570 | 70 | 165 | 156 | 116 | 76 | 20 | 1.3e-6 |
| *b* ∈ [−2, 2], *v* ∈ [0.25, 1.5] | 143 | 237 | 122 | 204 | 398 | 398 | 93 | 5 | 3 | 1.4e-7 |

No solver failures in any variant. Every outcome class occurs in the default ranges, so **the brief's defaults were kept**
(phase 0°). The delivered 100 × 100 map (browser, 10,000 runs): C escapes 3,507; A 1,002; B 766; collisions A–B 670, A–C 1,599, B–C 1,622;
unresolved 382; complete disruption 452; failed 0; provisional 86. Mean cost ≈ 1.4 ms/sample/core (see §6).

## 2. Automated tests (`npm test`)

37 tests, all passing at the time of writing (`npm test`, ≈ 25 s): `tests/physics.test.ts` (9), `tests/events.test.ts` (10), `tests/engine.test.ts` (16), `tests/build.test.mjs` (2).

| Brief §23 item | Test |
|---|---|
| Mutual gravitational acceleration | physics: matches the textbook sum to 1e-14, Newton III, all-body coupling, inverse-square |
| Two-body limit | physics: circular orbit has the Kepler period, 3 orbits return to 5e-8, energy to 1e-10, separation constant |
| Circular binary, unequal masses | physics: masses 3 / 0.5, G = 1.7, four phases: v_rel, perpendicularity, centre of mass, counter-clockwise, e = 0 and a = sep recovered; equal-mass case reproduces the brief's numbers; eccentric start at pericentre (e = 0.5, a = 2) |
| Centre-of-mass transformation | physics: relative positions and velocities preserved to 1e-14; default set-up has zero COM position/momentum |
| Energy / momentum / angular-momentum diagnostics | physics: scaled errors finite when E, P, L ≈ 0; triangle potential −3 |
| Adaptive convergence | physics: against **SciPy DOP853 rtol 1e-13** for 6 cases (table below); error decreases with tolerance; 8th-order behaviour on a Kepler orbit |
| Collision detection incl. between-step | events: analytic contact time (fast head-on, 1e-6); grazing at b = 0.0399 vs 0.0401 for contact distance 0.04; Hermite gate finds a pass whose end points are both 1 unit away; point masses → singular failure |
| Escape classification and unresolved | events: fly-by C escapes with sustain ≥ one pair period; A escapes from a B–C binary while a far but bound/inbound body is not an escaper; hierarchical triple unresolved; pending escape at horizon is provisional; disruption classified explicitly |
| Verified orbits | physics: figure-eight return, Lagrange triangle rigidity over 20 periods, Pythagorean escaper depends on tolerance (preset section) |
| Exact map-coordinate selection | engine: pixel centres, y upward, picked sample = displayed parameters = `buildInitial` state; selecting never moves a body |
| Boundary detection and subdivision | engine: exact edge set for a synthetic split, quadtree children centres, `leafAt`, mixed-depth edges, candidate limits (depth, minimum scale) |
| Priority scheduling and stale rejection | engine: dispatch order, pause/resume, stale chunk rejected; a result from before a physics change is never merged into the new map |
| Pause/resume and continuation | events: checkpoint continuation **bitwise identical** to a straight longer run; engine: horizon extension keeps decided samples and matches fresh runs |
| Cache invalidation for physics / none for colours | engine: epoch, fingerprint, layer data, completed-job count and validation results unchanged by colour edits; physics edit → new epoch and map; revert → cached layer restored |
| Hex / RGB parsing and persistence | engine: `#rgb`, `rrggbb`, channels clamp to 0–255, HSV round trip, localStorage round trip |
| Portable import / export and migration | engine: gzip round trip incl. NaN and Float64, restore paused, rejection of wrong model, newer schema, bad lengths, NaN, unphysical mass, bad outcome code; lean file migrated |
| Production build | build test: one self-contained HTML, worker inlined, no external resources, launcher serves it and refuses path traversal |

### SciPy DOP853 cross-check (max |Δstate| over all 12 components at the listed times)

| Case | t_max | rtol 1e-7 | rtol 1e-9 (default) | rtol 1e-11 |
|---|---|---|---|---|
| scattering b = 0.5, v = 1 | 30 | 4.0e-5 | 2.8e-7 | 3.3e-9 |
| scattering b = 1.0, v = 0.8 | 20 | 1.7e-5 | 1.7e-7 | 1.8e-9 |
| unequal masses (1, 2.5, 0.4), e = 0.3, φ = 37° | 20 | 1.1e-5 | 7.5e-8 | 2.2e-9 |
| figure-eight | 6.3259 | 2.1e-6 | 2.7e-8 | 9.5e-11 |
| Pythagorean (to t = 12) | 12 | 4.4e-4 | 3.9e-6 | 1.9e-8 |
| Lagrange triangle | 50 | 8.2e-7 | 4.0e-9 | 1.0e-10 |

Error falls roughly as expected with tolerance. The reference states come from `scripts/make-scipy-reference.py` (fixtures in `tests/fixtures`).

## 3. Presets (brief §18)

* **Binary–single scattering** – §1 above.
* **Figure-eight** (Chenciner & Montgomery 2000 data, 8 digits, T = 6.32591398): return error after one period 1.6e-8 (rtol 1e-9);
  after 10 periods 2.5e-6 (rtol 1e-9) or 3.7e-7 (rtol 1e-11); E = −1.287142; scaled conservation error 1.7e-8.
* **Pythagorean** (3-4-5, from rest): the unperturbed run's outcome depends on the tolerance. rtol 1e-9 → *wrong* escaper (mass 5, t = 61.08);
  1e-10 → mass 3 at 61.38; 1e-11 → 61.83; 1e-12 → 61.80; 1e-13 → 61.85 (min separation 4.1e-4, 34 close encounters in all). The mass-3 body
  being ejected near t ≈ 62 agrees with the classical result; the preset therefore uses rtol 1e-12. Its 100 × 100 map (rtol 1e-12) has 248 numerically unreliable results (2.5 %, mostly extremely close passes between point masses), reported as failures, not hidden.
* **Hierarchical triple** (constructed, not sourced): unresolved to t = 200 (≈ 500 inner orbits), scaled conservation error 6.4e-8. Survival is finite-time only.
* **Near-collision scattering** (constructed): 100 × 100 map with radius 0.05, 83 % collisions, no failures.
* **Equilateral rotating triangle** (exact Lagrange solution): masses (1, 0.01, 0.01), side 1, ω² = GM/s³; sides remain 1.0000000 after 20 periods
  (scaled error 4e-10). With three equal masses the triangle breaks up (contact at t = 9.3), as the Routh criterion predicts.

No arbitrary polygon arrangements were transplanted into the gravitational problem.

## 4. Batch experiments (real runs, seeded)

| Experiment | Result |
|---|---|
| Outcome fractions, 20 runs × 100 | mean P(C escapes) = 0.348; SD between runs 0.0482 vs binomial prediction 0.0476; SE of mean 0.0108 |
| Energy error vs tolerance (7 values, 40 runs each) | log–log slope 0.98 (error ∝ rtol) |
| Fast fly-by energy transfer, *b* ∈ [1, 1.5], *v* 8–64 | log–log slope ≈ −0.8 overall, approaching the impulse-approximation −1. *(An earlier draft of this experiment predicted v⁻²; the measurement showed that was the wrong theory (the first-order kick gives v⁻¹ in mean magnitude), so the experiment and its text were corrected.)* |
| Sensitivity of the outcome to δ in *b* | 100 % unchanged up to δ = 10⁻³, 75 % at 3·10⁻³, 55 % at 10⁻², 28 % at 0.1 (base point *b* = 0.5, *v* = 1) |

## 5. Browser verification (`tests/browser-check.mjs`, headless Chromium 153)

17 checks across desktop 1280 × 720 and tablet-sized viewports 1024 × 768 and 800 × 1100 (touch emulation, CDP pinch gesture), all passing, no console errors:
opens from `file://`; progressive map; 100 × 100 complete with ≥ 6 outcome classes; click selects exact parameters without moving a body; trajectory result identical to
the map result; regions listed; zoom creates a finer layer and history works; Auto-Explore with pause/resume adds only real simulated samples; Compare Both Sides across a
genuine boundary; validation and independent reference run; buffered typing of `-` and `2.5e-1`, clamping and explanations; Hex / RGB / spectrum colour changes with **no epoch
change, no new jobs, caches and validation results intact** and recoloured map pixels; apply physics change and revert (cache restore); IndexedDB save, reload, recovery,
restore paused, resume; downloads of CSV, JSON, PNG, validation report, investigation file; Batch run; no horizontal overflow on tablets, pane switcher, tap and pinch.
Screenshots are written to `source/.tmp/shots/` when you run it.

**Not verified:** real Microsoft Edge or headed Chrome on Windows, Safari, Firefox, a physical Surface or touch device, Windows `Start-Lab.cmd` (the Node
server it runs was tested on Linux), 1,000 × 1,000 maps end-to-end, long (hours) runs, browsers without `CompressionStream`.
Emulated touch is not a substitute for a real tablet. Use `CHECKLIST.md`.

## 6. Benchmarks (`BENCHMARK.json`)

Hardware/runtime: Linux container, 4 logical CPUs, Node 22.23.4 (single thread), Chromium 153 for the pool.

| Case | mean ms/sample | median | p95 | µs/step (mean) |
|---|---|---|---|---|
| default scattering, rtol 1e-9 (60 × 60) | 1.45 | 1.0 | 4.5 | ≈ 6.5 |
| rtol 1e-7 / 1e-11 / 1e-13 (40 × 40) | 0.94 / 2.1 / 3.0 | 0.74 / 1.3 / 1.9 | 2.8 / 6.6 / 10 | ≈ 6 |
| figure-eight / Lagrange (24 × 24) | 4.4 / 5.1 | | | |
| Pythagorean rtol 1e-12 / hierarchical (24 × 24) | 30 / 38 | | | |

Browser worker pool, 100 × 100 default map: 1 / 2 / 3 / 4 workers → 11.5 / 5.8 / 4.0 / 3.7 s (868 / 1,721 / 2,481 / 2,731 samples/s). The main thread kept 60 fps
(median frame gap 16.7 ms, max 16.8 ms) while 3 workers computed.
**Disclosed outlier:** one 78-step run in the rtol 1e-7 sweep took 31 ms (≈ 400 µs/step against a 6.7 µs/step mean); the same 31 ms appeared as the maximum in another sweep. It is
not reproduced by step count and is most likely a one-off GC or JIT pause, but the cause was **not** established. Other maxima are explained by long runs (e.g. 17,119 steps at ≈ 4.5 µs/step).

## 7. Things that are verified only in part, or not at all

* The reference solver and the main solver implement the same physical law; independence is in the numerics. The SciPy comparison is offline, not part of the in-app check.
* Escape acceptance is a finite-time criterion; no test proves an accepted escape is permanent.
* The finite-time sensitivity map is tested for finiteness and growth, not against an analytic Lyapunov value (there is none to compare with).
* Memory limits and the eviction path of zoom layers were exercised only on small maps.
