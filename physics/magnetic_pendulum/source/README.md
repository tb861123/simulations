# Magnetic Pendulum Chaos Lab

## Version 3 refinements

This revision adds all seven requested work areas, with the two external verification limits stated explicitly:

| Work area | Delivered | Evidence / remaining requirement |
|---|---|---|
| Side view | Pivot, support, bob, magnet plane, true 3D inclination, height and projection displacement | Actual drawing function rendered and visually inspected with a native Canvas adapter; not a browser screenshot |
| Angular release | Lower-hemisphere angle/direction and finite local meridional/azimuthal speeds | Pole and near-horizontal regression checks |
| Map confidence | Automatic bounded boundary sample at Δt, Δt/2 and Δt/4, categorical map, coverage and cancellation | Actual diagnostic worker checked; default portable includes 128 checked pixels |
| Independent solver | Independently coded adaptive Dormand–Prince 5(4) rod reference, selectable tolerances | Compared with separately implemented SciPy DOP853; see REFERENCE-VALIDATION.json |
| Rod versus string | Tension/compression readout; slack flight and event-resolved inelastic reattachment | Constraint, impact-energy and continuation tests |
| Experimental calibration | Measured CSV import, fitting, diagnostics, draft application and full report export | Workflow tested with synthetic ground truth; **real apparatus calibration awaits measured data** |
| Browser/tablet QA | 12 runnable Playwright scenarios and manual checklist | **Live execution blocked by the available browser environment/policy**; see BROWSER-QA.md |

Launch remains local and requires no accounts or external runtime services. The optional standalone.html embeds the same built application and worker sources; file-origin browser storage is browser-dependent. The HTTP launcher remains the recommended route.

For angular controls, positive meridional speed is along increasing inclination and azimuthal speed is the orthogonal tangent component, both in m/s. They apply as local basis components across the basin map; φ=0 defines the basis at the bottom pole. The release chart remains restricted to θ<90°, while subsequent motion can cross the equator.

Boundary confidence is **sampled agreement**, not a probability of correctness. The default 128 samples are distributed deterministically among classified grid pixels with a differently classified four-neighbour sample. Unchecked pixels remain grey; disagreement, resolved/unresolved change and failed checks receive separate colours. Extending the horizon clears old confidence codes. Display changes do not rerun the physics.

The independent adaptive reference is for the smooth rigid-rod model. It has separate force evaluation and constraint projection, relative/absolute error control and a 0.02 s internal cap. Absolute tolerance applies numerically to each state's SI component (position, velocity, specific dissipation and horizontal path). Capture and reversal observations use the same Δt grid as RK4. Reference budget residuals are sampled at those observation times. String motion uses explicit event-refinement checks instead; the adaptive-reference button explains this limitation.

See CALIBRATION-GUIDE.md for measurement requirements and the distinction between an effective fitted point-attraction model and real magnetic dipole physics.

A local React + TypeScript + Vite numerical experiment with rigid spherical pendulum geometry. The basin image is calculated from independent initial conditions, using the same Float64 RK4 engine as the trajectory inspector. No accounts, database service, API keys, remote fonts or network calls are needed at runtime.

## Open the supplied production build

On Windows, double-click **Launch Lab.cmd**. Keep its console open while using the lab; closing it stops the server. Node.js 22 or newer is required. The launcher also recognises the Node runtime bundled with Codex on this computer.

Or, on any supported platform:

```sh
node serve.mjs --open
```

Open **http://127.0.0.1:4173/**. The supplied `dist/` works without installing dependencies. Do not open `dist/index.html` with a `file:` URL: module workers and browser storage need an HTTP origin. `PORT=...` can select another port, but a different origin has separate browser storage.

## Develop and verify

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
npm run benchmark
```

Use a normal Node/npm installation for development. The lockfile is included. `npm run dev` uses port 5173; `npm run preview` and the production launcher use 4173 by default. Storage does not transfer automatically between these origins.

The project has 55 automated Node checks, including a production HTTP smoke test when `dist/` exists. Tests use Node's test runner and `tsx`. `fake-indexeddb` is a development-only IndexedDB implementation. The worker tests bundle and run the actual browser-worker source with only its message transport adapted to Node worker threads. They do not replace the solver with a mock.

`node --import tsx scripts/validate.ts` regenerates `VALIDATION.json`: three release positions at three step sizes for all eight presets. `npm run benchmark` regenerates `BENCHMARKS.json` and `default-investigation.mplab`, a genuinely computed, complete 100×100 default basin. Import that portable file through Saved investigations to inspect it immediately, initially paused.

## Use the experiment

1. Opening a fresh origin calculates a labelled **24×24 preview**, then a fresh map at the requested resolution. Preview pixels are never counted as completed higher-resolution samples.
2. Edit physical parameters, ranges, initial velocity, horizon, resolution or settling criteria. Press **Recalculate map**. Until then, the inspector retains the applied settings and the map previews existing samples where they overlap the requested view. Zoom, pan, rectangle selection, coordinate edits and view history stage a range without launching a job. Areas outside the previous map are blank. The export tools continue to describe the computed grid until you recalculate.
3. Click a pixel to inspect its exact centre coordinate. The inspector calculates in a separate worker and then replays from release. Map progress, analysis horizon and replay time are separate quantities.
4. Drag to pan, select Rectangle zoom, double-click, use the mouse wheel, or use +/−. Every view change calculates a new physical grid. Touch dragging works; dedicated pinch zoom is not implemented. Numerical ranges allow independent horizontal and vertical spans. At deep zoom, axis ticks are offsets from a full-precision reference printed with the axis.
5. Use Play, Pause, Restart, Step, speed selection, timeline scrubbing and Clear trace. Numerical integration happens before replay and does not depend on display frame rate.
6. Choose a +x neighbour offset, then Compare this pair. Trails and logarithmic position separation are recorded over the primary replay interval; both outcomes and both convergence times are reported when both releases are geometrically possible. A neighbour outside reach is marked unavailable; the primary release still runs. The neighbour continues independently to its own classification or horizon after the primary stops. Interior selects an equilibrium; Smooth edge selects a locally simple two-outcome boundary; Intricate edge selects a locally mixed neighbourhood. These inspect fully classified 5×5 grid neighbourhoods, using at most 10,000 uniformly distributed candidate centres, and are finite-resolution examples.
7. Run the selected release at Δt, Δt/2 and Δt/4, or recompute a 4×4 uniform sample of the current region at Δt and Δt/2. These checks have progress and cancellation and do not alter the original map.
8. Raising the horizon and applying continues compatible unresolved samples. Already classified or failed samples are retained. Changes to physical settings, initial velocities, solver step, ranges, resolution or convergence criteria create incompatible grids and discard their numerical cache. Named saves can retain earlier experiments for comparison.
9. Save an investigation, save a named zoom location, or download a portable backup. Restore starts paused; Resume continues remaining samples. Cancel terminates workers, retaining the latest returned checkpoints. Regenerate computes a fresh preview and map.

## Physical model and units

The default rod follows a sphere of radius **L**, enforced throughout integration. An optional string remains on that sphere while taut and may move inside it while slack. Position r=(x,y,z) is measured from the pivot, with z upwards. At release the bob is on the lower hemisphere:

```text
x² + y² < L²
z₀ = −sqrt(L² − x² − y²)
vz₀ = −(x vx₀ + y vy₀)/z₀
```

Coordinate fields clamp to their permitted minimum/maximum when you leave the field or press Enter. Release limits depend on the other coordinate: for L=1 m and y=0.8 m, x is approximately limited to ±0.6 m. Map-bound limits use the furthest endpoint of the other axis and preserve minimum < maximum. Shortening the pendulum and panning/zooming fit map bounds within reach. A relative radial margin of 10⁻¹² keeps clamped releases just inside the chart boundary. Invalid coordinates supplied directly to the physics engine or imported files are still rejected. Strict inequality excludes the equator at release, where the horizontal-velocity chart becomes singular. Subsequent trajectories can cross the equator smoothly: integration uses full Cartesian 3D coordinates, not the release chart.

The fixed magnet plane lies at z=−(L+h). **h is bottom clearance**, the separation between the lowest bob position and the magnet plane. Instantaneous bob height above that plane is H=L+h+z. Gravity acts vertically downwards. Magnets supply effective inverse-square point attraction in 3D, not a full electromagnetic dipole model.

```text
Rᵢ = (Xᵢ, Yᵢ, −L−h)
F = (0,0,−g) − γv + Σ kᵢ(Rᵢ−r)/|Rᵢ−r|³   [acceleration before constraint]
r′ = v
v′ = F − [(r·F + |v|²)/L²] r
|r| = L; r·v = 0
```

The **rigid rod** allows tension and compression. The **string** has zero tension when slack and follows unconstrained gravity, damping and magnetic forces until it reaches radius L outward again. The required tension per unit mass is (r·F+|v|²)/L. A negative value detaches the string. Detachment and reattachment are located by 36 bisection iterations within the RK4 step. Reattachment removes outward radial velocity, retaining tangential velocity (zero radial restitution); its lost specific kinetic energy is added to q. The dashed slack-string shape is schematic, not a simulated string shape. The application view is a horizontal projection; the inspector reports z, vertical speed, full 3D speed, rod length and clearance above the magnets.

Lengths and coordinates: m. Time: s. Velocities: m/s. Gravity: m/s². Damping γ: s⁻¹. Strength k: m³/s². **k already specifies acceleration strength.** Changing bob mass does not change motion. Mass converts specific energy (J/kg) to joules.

Validated defaults:

| Quantity | Default |
|---|---:|
| Pendulum length / bob mass / gravity | 1 m / 0.1 kg / 9.81 m/s² |
| Magnet layout | equilateral triangle on radius 0.12 m |
| Side-to-side magnet spacing | 0.2078460969 m |
| Each k | 0.020 m³/s² |
| Bottom clearance h | 0.035 m |
| Damping γ | 0.65 s⁻¹ |
| Release velocity | 0, 0 m/s |
| View bounds | x, y in [−0.2, +0.2] m |
| RK4 step / horizon | 0.004 s / 30 s |

The farthest default corner is 0.283 L horizontally. A notice above 0.3 L identifies large-angle motion, which the spherical equations support. The geometric reach constraint is enforced independently of that notice. The default strength was recalibrated from 0.018 to 0.020 m³/s² after introducing vertical magnetic forces and changing height, retaining three stable magnet-associated equilibria. This is a physical model change: old planar results are not interchangeable.

The step-size notice uses Δt √(g/L + Σk/h³) > 0.2 as a timescale heuristic, not a validated global error estimator. Small clearances, high velocities or large steps need refinement checks.

Default equilibria, found independently of their magnet positions:

| Label | x / m | y / m | Force-Jacobian eigenvalues / s⁻² |
|---|---:|---:|---|
| A | ≈0 | 0.1082120045577 | −281.5815, −251.9762 |
| B | −0.09371434494137 | −0.05410600227883 | −281.5815, −251.9762 |
| C | +0.09371434494137 | −0.05410600227883 | −281.5815, −251.9762 |

Each is a strict potential minimum and is attracting for positive damping. Weak/zero magnetic presets instead have one central stable equilibrium. Zero damping has potential minima but no dissipative attraction; capture classification is disabled, so unresolved trajectories are expected.

Inputs reject zero/negative height, invalid bounds, non-finite values and unsupported resolutions. Allowed Δt is 10⁻⁵–0.02 s and duration is 1–3600 s. These limits do not guarantee accuracy for every permitted physical configuration.

## Integration and energy

The allocation-efficient RK4 integrator uses eight-component reusable Float64 scratch arrays, including z and vz. For attached motion, after each full RK4 step position is projected to radius L and radial velocity is removed. Slack motion is not projected to the sphere; event detection confines it to the interior. This enforces both constraints to floating-point precision. Projection error is included in the monitored energy residual; it is not hidden by resetting energy. In addition to position and velocity, it integrates dissipation and path length with the same four RK stages:

```text
U = g(z+L) − Σ kᵢ / |Rᵢ−r|
e = ½(vx²+vy²+vz²) + U
q′ = γ(vx²+vy²+vz²)  (plus discrete radial kinetic-energy loss on string reattachment)
path′ = sqrt(vx²+vy²)
budget residual = e(t) + q(t) − e(0)
```

Mechanical energy decreasing under positive damping is physical, not numerical drift. Percentage residuals use the non-zero scale

```text
S = max(|e(0)|, (g/L) × 0.12², Σkᵢ/h, 10⁻⁶) J/kg
normalised residual = [e(t)+q(t)−e(0)] / S
```

The maximum absolute normalised residual is recorded at every integration step. The map warning threshold is **10⁻⁴**, i.e. **0.01%**. A small budget error does not guarantee a correct basin classification. Default representative refinements and energy checks are recorded in `VALIDATION.json`.

The last step is shortened to reach the requested horizon exactly. Continuation is deterministic from its checkpoint. If an intermediate horizon is not an integer multiple of Δt, continuation inserts that shortened step; a run without that intermediate endpoint can differ slightly. Aligned-horizon continuation is regression-tested against uninterrupted calculation. This is distinct from changing the physical time step to improve rendering performance, which the application never does.

## Equilibria and classification

Newton iteration uses a central-difference Jacobian of static horizontal constrained acceleration on the lower hemisphere (difference step min(10⁻⁶ L, 0.1 times the remaining radial margin)). Seeds comprise the origin, magnet coordinates and a 17×17 grid spanning at least ±0.3 m (or 1.5 times the largest magnet radius). Seeds outside 0.999 L are discarded. Each search has at most 80 iterations and a 0.05 m update cap; updates are shortened to remain inside 0.999 L. Force residual must be ≤10⁻⁷ m/s²; roots within 10⁻⁷ m merge. Both static-acceleration Jacobian eigenvalues must be below −10⁻⁸ s⁻² to mark a strict potential minimum. Magnet association uses distance ≤max(0.025 m, 0.55 times that magnet's radius).

This finite seed search is effective for the validated presets but is not a proof that every equilibrium of every edited configuration was found. Degenerate flat minima are not classified as strict minima.

Capture requires an attached support and all of these **continuously for 0.5 s** by default:

- 3D distance from a detected lower-hemisphere stable equilibrium < 0.001 m;
- full 3D speed < 0.002 m/s;
- magnitude of total constrained 3D acceleration < 0.02 m/s².

Thresholds are editable and part of the numerical cache key. Capture time is the time the complete settling interval has elapsed. There is no near-magnet shortcut. A candidate change or failed criterion resets its settling counter. Outcomes distinguish classified equilibria, unresolved, failed and not computed. Non-finite state or excursion above 10⁸ m is a numerical failure.

## Map statistics and interpretation

All stored outcomes use pixel centres:

```text
x = xmin + (column+½)(xmax−xmin)/N
y = ymax − (row+½)(ymax−ymin)/N
```

Rows run from positive to negative y. Sampling spans and axes use doubles, independently in x and y. The screen is a square plot even for unequal physical spans; use the axes for distances. The cursor shows 15 significant digits; exports preserve double precision. Indistinguishable adjacent coordinates are rejected. Spatial spacing below 10⁻⁶ m triggers a reliability notice; it is not claimed that all larger spacings are reliable.

Available displays reuse stored statistics:

- **Attractor:** red A, blue B, yellow C; additional equilibria get additional colours. Grey means unresolved/no metric; checkerboard means not computed; magenta means failure.
- **Capture time:** seconds until sustained convergence. Unresolved points remain separate.
- **Path length:** RK4 integral of horizontal speed, in metres, until capture or horizon.
- **Directional reversals:** each velocity component must exceed 0.01 m/s in the opposite sign for at least 0.04 s before a reversal counts. Deadband or reversion resets persistence. Counts depend on coordinate axes.
- **Outcome sensitivity:** four available adjacent grid neighbours, ±x and ±y. Physical perturbations are the displayed Δx and Δy, which may differ. Only pairs in which both outcomes are classified are valid. Sensitivity = differing outcomes / valid comparisons. Coverage = valid comparisons / available neighbours. The separate coverage mode prevents missing outcomes being mistaken for low sensitivity. It is not an infinitesimal or isotropic invariant.
- **Budget residual:** maximum absolute normalised residual, displayed on a fixed log₁₀ scale from −12 to −2.
- **Finite-time divergence:** a second, explicit worker calculation, with configurable +x offset and fixed horizon. It computes log₁₀[d(t)/d(0)], with d² = Δx² + Δy² + Δz² + (L/g)(Δvx² + Δvy² + Δvz²). If g=0, the distance scale substitutes 10⁻⁶ m/s². Both members integrate to the same horizon even if capture criteria were met. Default offset is 10⁻⁶ m and horizon 5 s. Fixed colour limits are −6 to +6; the exact selected value remains available. Nonrepresentable offsets, neighbours outside the allowed release disk or failed pairs are flagged. Editing pair settings invalidates that metric.

Growth can saturate at the system scale; damping causes eventual contraction in the same basin. Small offsets amplify rounding and discretisation error. None of these displays is a rigorous Lyapunov-exponent calculation or, on its own, proof of chaos.

## Workers, checkpoints and memory

`Pool` assigns **32-sample tiles** dynamically to whichever worker becomes free. The default budget is min(4, hardware concurrency−1), at least one; it is editable from 1 to 8. There is at most one outstanding tile per worker. Workers yield approximately every 14 ms and return partial checkpoints at most every 400 ms. A trajectory advances in batches of 256 unchanged RK steps; divergence uses paired batches of 128. Paint updates are throttled to about 8 Hz. Workload imbalance is handled by the next free worker taking the next tile.

Pause preserves live worker state; Resume continues. Cancel or a changed job terminates obsolete workers. Job identifiers reject late results. Checkpoints retain position, velocity, time, dissipation, path length, candidate, settling counter, capture time, initial energy, energy scale, maximum residual and all reversal counters. A cancelled/restored job may redo up to the most recent unreported chunk; it does not skip simulated time. Pair-map cancellation retains finished pairs; the current unfinished pair restarts.

One map uses 27 Float64 checkpoint entries plus one Float64 divergence entry per release: **224 bytes/release**, approximately 2.24 MB at 100² and 224 MB at 1000², before temporary copies and rendering. At 1000², saving/exporting can transiently need several times that amount. Resolution is capped at 1000²; 2000² is not implemented. Only one current grid is retained in memory; previous views retain settings and are recalculated. Exact compatible current samples can be reused. Saved lists use small metadata summaries rather than loading every numerical array.

## Browser storage and portable format

IndexedDB stores at most four named investigations through the interface plus one overwritten automatic recovery checkpoint. Automatic saves occur every 30 seconds while calculating and on successful completion. Only the most recent returned worker checkpoints are persisted. Saving is acknowledged after transaction completion; storage denial and quota failure are shown as errors. Recovery and named restore start paused. An imported file is not silently saved as a named browser record.

Browser storage belongs to the browser profile and origin; it can be cleared or evicted. Portable `.mplab` downloads are an independent backup. An abrupt reload can lose work since the previous successful automatic save. Reopening the same origin restores the automatic recovery entry.

Portable format 3 (model `magnetic-spherical-2`; support/velocity choices are explicit configuration fields):

1. Four-byte little-endian unsigned JSON-header length.
2. UTF-8 JSON metadata, including model version, configuration, equilibria, selection, display mode, history and locations.
3. N² × 27 binary Float64 values, row-major.
4. N² binary Float64 divergence values, same order. NaN means not computed; +Infinity means a failed/unrepresentable pair.

Checkpoint columns are `[x,y,vx,vy,q,path,t,outcome,candidate,settling,convergence,e0,scale,maxResidual,reversals,signX,signY,pendingX,pendingY,persistX,persistY,z,vz,taut,impacts,impactLoss,confidenceCode]`. Outcome codes: −3 not computed, −2 failed, −1 unresolved, non-negative detected-equilibrium index. NaN convergence means not captured. Values preserve IEEE-754 doubles. Current supported platforms are little-endian. Imports are capped at 260 MB and validate versions, settings, bounds, array lengths, outcomes, finite active checkpoint entries, history limits and agreement of stored equilibria with a fresh equilibrium search, and checkpoint rod-length/tangency constraints. Format-2 spherical rod files and saved records migrate losslessly: attached=true, zero impacts/loss and unchecked confidence. Old planar portable files and IndexedDB saves are explicitly rejected for continuation. They are not silently reinterpreted; start a new calculation using the desired settings.

Scientific PNGs contain axes, title, legend, bounds, resolution, horizon, physical parameters, solver settings, convergence thresholds and a reliability summary. Map CSVs include coordinates, outcome, time, path length, reversals, residual and paired metrics. Trajectory CSV energy columns are **specific energies (J/kg)**, while the live inspector shows joules. Metadata JSON accompanies numerical exports; portable files contain the full resumable checkpoint state. Matching saved maps can be compared pointwise; differing ranges/resolutions are reported without inventing pixel correspondences.

## Validation and benchmarks

Automated checks cover geometric reach rejection, constant rod length, tangent velocity, equator crossings, variable height, full 3D energy, force components, damping, constrained potential gradients, Jacobian, rotational symmetry, strict equilibrium stability, energy conservation/balance, sustained settling, rapid passages, deterministic results, reference/optimised RK4, step refinement, unresolved/failure distinction, pixel mapping, deep precision, continuation, cache invalidation, one-hour zero-magnet evolution, portable imports, IndexedDB round trips/storage errors, sensitivity coverage, fixed-horizon phase distance, actual worker tiling, worker budgets, pause/resume/cancel, stale-result rejection and production HTTP assets.

`BENCHMARKS.json` contains the measured environment, settings, results and 16 numerically sampled boundary releases refined at three steps. Timings use Node on Windows with the **actual browser-worker source via a worker_threads transport adapter**. They are not browser-engine or device-independent performance claims. The regenerated spherical-model benchmark records complete 100×100 maps at one and four workers, including state and classification differences. See the JSON for the measured times. Previous planar timings do not describe this model. The separate 100,000-step reference/optimised benchmark reports numerical differences as well as elapsed times. Worker startup plus one one-second trajectory is measured separately and includes both startup and computation.

The production build and HTTP asset checks were run successfully. The current run also discovered 12 real-browser scenarios without executing them; BROWSER-QA.md documents the browser policy/connectivity block and owner-run instructions. The included `default-basin-figure.png` was generated using the application export function with a native Canvas adapter and visually inspected; it is not a browser screenshot. In-app-browser navigation to the available preview servers timed out in this execution environment. **Interactive browser behaviour, rendered appearance, downloads, real-browser IndexedDB/quota behaviour and tablet layout were not visually verified.** Automated worker/persistence/HTTP tests are not represented as substitutes for those checks. Use the launcher for local review.

Optional parameter-space mapping, GPU/Wasm, 2000² maps, full electromagnetic dipole/torque dynamics, a production adaptive basin solver, an independent adaptive hybrid-string solver, dedicated pinch gestures and rigorous Lyapunov analysis are not implemented. The adaptive solver is a selected-trajectory reference. No optional extension blocks the core numerical workflow.

## Source layout

| File | Responsibility |
|---|---|
| `src/physics.ts` | units, validation, forces, reference and optimised RK4, energy, equilibria, classification |
| `src/compute.worker.ts` | resumable tiles, fixed-horizon pairs, selected trajectories |
| `src/diagnostics.worker.ts` | selected refinement and region sampling |
| `src/scheduler.ts` | bounded worker pool, jobs, pause/cancel and stale-result rejection |
| `src/data.ts` | packed checkpoints, compatibility, sensitivity, IndexedDB, portable validation |
| `src/render.ts` | colour encoding, scientific PNG and data exports |
| `src/main.tsx`, `src/style.css`, `src/Refinements.tsx` | responsive controls, map interactions, side view, angular and calibration panels |
| `src/reference.ts` | independent adaptive DP5(4) rod reference |
| `src/calibration.ts`, `src/confidence.ts` | measured-data fitting and diagnostic sample selection |
| `browser-tests/`, `playwright.config.ts` | owner-run desktop/tablet scenarios, not executed here |
| `tests/`, `scripts/` | regression checks, preset validation and measured benchmarks |
| `serve.mjs`, `Launch Lab.cmd` | dependency-free production server and Windows launcher |






## Additional validation commands

```sh
npm run test:browser -- --list   # parses scenarios only
npx playwright install chromium
npm run test:browser            # actual owner-run browser execution
```

Independent SciPy regeneration requires Python, NumPy and SciPy as development tools only:

```sh
python -m pip install numpy scipy
npm run test:reference
```

Set REFERENCE_PYTHON to a specific Python executable if required. REFERENCE-VALIDATION.json compares three trajectories at a common five-second horizon. Reported component errors are absolute errors in each component’s SI units; the maximum combines differently dimensioned components and is not a spatial error bound.

BENCHMARKS.json preserves an unusually long four-worker wall-clock observation, rather than silently discarding it. BENCHMARK-REPEAT.json adds follow-up wall-clock/process-CPU measurements. Device scheduling/suspension was not controlled, and these are Node worker-thread timings, not browser benchmarks. Do not assume adding workers always improves throughput.

## Colour schemes and polar board

Repulsion has been removed: all magnets attract. Older saved results containing repelling magnets are rejected rather than silently relabelled; recreate those configurations using attraction.

The Colour scheme menu offers Soft coastal (default), Ocean blues, Sage & moss, Lavender dusk, Warm earth and Slate monochrome. Scheme changes recolour existing results immediately, without recomputation, and carry through to trajectories, legends and PNG exports. Individual Hex/RGB colour controls remain available. Numerical scalar maps use the selected scheme as a continuous ramp. Fixed diagnostic colours remain meaningful for failures, missing data and confidence categories. Attractor boundaries remain discrete; colours are coordinated rather than spatially blurred. Monochrome can make attractors less distinct; use labels for identification.

Polar mode is retained: choose Board coordinates → r, θ for the circular window on the computed Cartesian grid. The pivot is the origin; theta runs anticlockwise from +x in degrees. Positions can be edited using r/theta. Selected release radius remains constrained by pendulum length. Physics still integrates Cartesian components to avoid a polar singularity. Circular view zoom stays centred on the pivot; Cartesian mode supports panning.
