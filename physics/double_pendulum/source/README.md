# Double Pendulum Chaos Lab

A working React + TypeScript + Vite application with six modes for exploring deterministic chaos. All patterns come from independently integrated double pendulums. No backend, account, or API key is needed.

## Run locally

On Windows, **double-click `Start-Lab.cmd`** to serve the included production build, then open http://127.0.0.1:4173. It uses Node from PATH or the existing Codex bundled runtime and does not need npm. Keep the launcher window open while using the lab. Alternatively run `node scripts/serve.mjs`.

For development, install Node.js 22.18 or newer (Node 24 recommended), then open a terminal in this directory:

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite, usually http://127.0.0.1:5173. To build and serve the production application:

```sh
npm run build
npm run preview
```

The included `dist/` is a successful production build. Serve it over HTTP; opening `index.html` directly with a file URL will not load module workers correctly. Dependencies and lockfile are included in the project distribution; `npm ci` can reproduce installation.

## Explore

1. **Sensitivity:** 2–1,000 pendulums with adjacent first-angle offsets, including 10⁻⁸ degrees. Choose superimposed or arranged views and trails. The first pendulum feeds the inspector.
2. **Angle & energy:** animation, two angle–time curves, angle–angle trajectory, and kinetic, potential and total energy graphs. Expand the inspector's graphs in other modes too.
3. **Pendulum grid:** defaults to 40 × 40 actual rod-and-mass pendulums. Each cell starts from rest at a different initial angle pair.
4. **Live colour map:** click **Recalculate map** to start the 40 × 40 field (up to 500 × 500). Pixel colour is a smooth periodic function of both current rod angles. The inspector can play a sampled trajectory independently from its initial condition.
5. **First-flip map:** a CPU worker pool progressively advances the requested field to 30 s by default. Set a whole-second duration from 1 to 3,600 s. Colours use a square-root time scale to expand early flips; neutral white means no flip within the computed duration. Inspect a cell for its first-flip time and replay from rest. A longer run can continue from a compatible completed checkpoint.

6. **Divergence map:** an additional field integrates a nearby partner for every initial condition. Select the angular perturbation in radians and generate the map. Colour represents `log10(d(t)/epsilon)`, with a displayed scale of 0–8; values outside the scale saturate. Click a pixel for its numerical growth. This is a finite-time sensitivity diagnostic, not a Lyapunov-exponent calculation or a proof of chaos.

**Setup (left):** Resolution, duration and the divergence offset stay pending. **Advanced** contains the model parameters and RK4 step. Only **Recalculate map** commits setup and the requested range together. **Pause map**, **Resume map** and **Step map** control the already applied calculation. A new calculation replaces the old worker; loading a checkpoint restores it paused.

**Map (centre):** Use **View** for exact θ₁/θ₂ ranges, or use rectangle zoom, pan, +/− or reset view. These change the viewport only. Previously calculated samples are previewed at their original sampling resolution; unsampled areas stay blank. **New range not yet calculated** and **Unapplied setup changes** distinguish the preview from the applied result. Colours update immediately. **Analysis** contains energy drift; **Investigation** contains saves, checkpoints, and PNG/CSV export of the full calculated range and its applied settings.

**Trajectory (right):** Click a covered region to select the original sampled cell, or click a blank region or set exact release angles to inspect an independent trajectory. Independent releases have no sampled-map outcome. Play, pause, replay and speed affect only the trajectory. **Diagnostics** contains plots, energy and trace CSV; **Validation** compares integration step sizes. Both side panels remain visible on desktop and tablet widths; on narrow screens they stack without hiding controls.

## Physics and numerical conventions

Two rigid massless rods, two point masses, motion in one vertical plane, constant gravity, no friction or air resistance. Defaults: L₁=L₂=1 m, m₁=m₂=1 kg, g=9.81 m/s². Both angular velocities initially zero. θ₁ and θ₂ are **absolute** angles from downward vertical, stored continuously without wrapping.

For δ=θ₁−θ₂, the Lagrangian is L=T−V, where:

```
T = ½(m₁+m₂)L₁²ω₁² + ½m₂L₂²ω₂² + m₂L₁L₂ω₁ω₂ cos δ
V = −(m₁+m₂)gL₁ cos θ₁ − m₂gL₂ cos θ₂
```

The Euler–Lagrange equations form a 2 × 2 mass matrix solved by `src/physics.ts`:

```
A α₁ + B α₂ = −m₂L₁L₂ sin δ ω₂² − (m₁+m₂)gL₁ sin θ₁
B α₁ + D α₂ = +m₂L₁L₂ sin δ ω₁² − m₂gL₂ sin θ₂
A=(m₁+m₂)L₁², B=m₂L₁L₂ cos δ, D=m₂L₂²
```

Classical fixed-step RK4 uses Δt=0.004 s by default, configurable from 0.001–0.008 s. All states use JavaScript doubles or Float64Array, including high-resolution fields and tiny differences. Rendering and elapsed wall time never alter the integrator step. Under load, simulation time advances more slowly than wall time; no numerical accuracy is silently reduced. Replay and main-thread animation cap catch-up work per frame to keep controls usable.

Energy potential is zero when both rods are horizontal. Drift is `100(E−E₀)/max(|E₀|, (m₁+m₂)gL₁+m₂gL₂)`; this gravitational energy scale avoids singular percentages near E₀=0. RK4 is not symplectic and can drift over long integrations. The inspector reports its current trajectory drift. Maps track each primary trajectory's peak absolute normalised drift after every integration step. A heat-map toggle shows these peaks; the summary reports the worst pixel and counts values exceeding 0.1% or becoming non-finite. The 0.1% level is an exploratory warning threshold, not an accuracy guarantee. In first-flip mode each trajectory stops at its first crossing step, so its drift is frozen there. The divergence partner's energy is not included in this primary-trajectory summary. Extreme mass/length ratios require a smaller step and independent convergence checks.

A first flip occurs when either continuous angle goes **beyond** +π or −π. Linear interpolation within the crossing step estimates the event time. Starting exactly at ±π does not count until motion crosses outwards. A trajectory already outside the threshold counts immediately. The first qualifying rod determines the time.

Colour uses a cyclic phase from θ₁+0.8 sin(θ₂) and sinusoidal lightness from θ₂; periodicity is preserved in each rod angle. Ocean and Ember also use periodic phase-dependent hue/lightness variations. This is a visual encoding, not an injective map of all possible angle pairs. First-flip colours use sqrt(t / maximum duration). Finite-time colour irregularity and first flips are **not rigorous chaos classifications**. This application makes no Lyapunov-exponent or stable/chaotic classification claim.

## Saved experiments and resumable calculations

The map’s **Investigation** panel supports named map saves, a list of saved experiments, restoring paused, deleting saved records, downloading a JSON checkpoint, and importing a checkpoint. All four map modes are supported. Each checkpoint includes the computed time, physical parameters, initial-angle bounds, resolution, integration step, colour settings, selected initial condition, map playback speed, graph display settings, energy-drift view and Float64 trajectory state. Divergence saves include both neighbouring trajectories. Graph histories and the sensitivity/single-pendulum modes are not checkpointed.

Maps autosave under **Autosave** roughly every 15 seconds of wall time while frames are arriving, and on completion. Autosave replaces the preceding autosave; use **Save map** for a named copy. Saving while running waits for a coherent tile barrier. On restore the experiment stays paused until Play/Continue is chosen. Imported files are validated for schema version, array dimensions, numerical settings and finite states. Float64 arrays are encoded as binary Base64, preserving precision through a file round trip.

Browser saves use IndexedDB, without an external server. They are specific to the browser profile and origin (including the local port). Browser clearing, private browsing or storage quota limits can remove/prevent saves. Keep downloaded checkpoint files for durable backups or moving between URLs/browsers. The status line reports storage failures; file downloads remain available if storage is unavailable. The last approximately 15 seconds of progress may be lost on an abrupt close; a named save/download completes only when the status confirms it. Closing the page does not keep computation running.

## Accuracy checks and divergence interpretation

Toggle **Show energy-drift map** to inspect the field's peak energy error on a logarithmic colour scale from 1e−8% to 0.1%. Magenta identifies larger errors or non-finite results. Click a pixel for its individual drift. Changing this view preserves the calculation. Inspect suspicious regions with a smaller fixed Δt; accuracy is never silently reduced to improve speed.

The inspector's **Selected trajectory · accuracy check** re-integrates a chosen initial condition at Δt, Δt/2 and Δt/4 in a separate cancellable worker. Set the horizon, or use the map's computed time. It reports energy peaks, first-flip times, and differences between the final states in dimensionless phase space. A refinement ratio near 16 is consistent with RK4's fourth-order convergence in the resolved regime. Long chaotic trajectories can separate under refinement, even with small energy drift; neither energy conservation nor a particular ratio proves long-term trajectory accuracy. The actual horizon is rounded to a whole selected integration step and reported.

For divergence, angles are compared modulo 2π and velocity differences are divided by `sqrt(g/L1)` before taking the Euclidean norm of the four differences. The partner starts from rest with θ1 shifted by epsilon. There is no renormalisation or tangent-equation calculation, so separation may saturate and the displayed value depends on horizon, perturbation, norm and numerical resolution. The UI and exports explicitly avoid rigorous stable/chaotic classifications. Energy-error diagnostics refer to the primary member of each pair.

## Tests

```sh
npm test
npm run build
npm run test:engine
node --test tests/http.test.mjs
npm run benchmark
```

Physics checks cover initial geometry, equilibrium, linear small-angle acceleration, a small-angle normal-mode period, 30-second energy conservation in regular and high-amplitude motion, RK4 refinement convergence, reproducibility, continuous rotations, interpolated event boundaries, pixel mapping, tiny double-precision perturbations, cyclic palettes, and finite results across an angle grid. The optimised RK4 kernel is checked against the readable reference, including non-default parameters and fast rotations. Production worker tests verify full-map versus row-shard equivalence, event detection against the reference, 30-second maps, a one-hour horizon, and resumed versus uninterrupted 70-second integrations. Checkpoint tests verify binary round trips and exact resumed state, invalid-file rejection, and the storage-unavailable fallback. Divergence is checked against two independent reference integrations. The built accuracy worker is checked for regular-motion RK4 convergence and consistent first flips. Real parallel worker tests cover synchronisation, dynamic assignment under unequal worker speed, consistent snapshots, cancellation, cached reuse/extension, invalidation and pause/step sequencing. Build before running engine tests or benchmarks: they execute the actual production worker bundle. The separate HTTP check verifies the launcher serves the page, JavaScript and worker with correct MIME types; sandbox network restrictions can prevent that check.

## Browser engine optimisations

- Allocation-free RK4 scratch storage, with fixed physical constants computed once per stepper. The sensitivity view also uses the optimised kernel. Equations, Float64 state and the chosen Δt are preserved.
- A dynamic queue of row tiles (at most eight rows per tile) uses up to four workers below 100 × 100 and up to eight at larger resolutions, reserving one reported logical CPU where available. Whichever worker becomes free receives the next tile. Single-core and worker-creation fallback use fewer workers. State transfers between tasks allow tile ownership to change. A barrier ensures all displayed pixels represent the same simulated time; workers cannot flood the main thread with unchecked batches. Tile progress is shown in the controls.
- First-flip generation runs continuously instead of deliberately waiting between calculation batches. An adaptive **number of fixed RK4 steps per batch** targets roughly 40 ms of work; it never adapts or enlarges Δt. Pause takes effect after the current time barrier; remaining small tiles finish that batch before a coherent paused image is published. Restart/experiment changes terminate outstanding workers.
- Images, colours and transferable readouts are generated at roughly 10 Hz, independently of calculation batches; final results and paused/stepped states are always published. Pixel writers avoid per-pixel colour arrays. The large canvas redraws only for new map data, selection or display changes. Numeric map values are retained for display-only recolouring, and a palette change never launches computation. Paused graphs avoid redundant updates.
- Completed first-flip and divergence checkpoints are retained in a 64 MiB page-memory cache. Keys include angle bounds, resolution, masses, lengths, gravity and integration step. A compatible result at or before the requested duration can be reused or extended; changed physics/bounds/Δt invalidates it. Colours are regenerated for the new duration. Cache entries are evicted when over budget and disappear on page reload. Incomplete cancelled maps are not retained in the automatic memory cache; they can be saved explicitly or recovered from the latest browser autosave. Restarting an unchanged completed experiment may return its cached result.

Measured on this machine with Node 24 and eight available logical CPUs after adding tile scheduling and energy checks: the RK4 kernel was **2.84× faster** than the readable allocation-heavy reference (median 496 ms → 175 ms for 800,000 steps), with zero measured state difference in that workload. A 100 × 100, five-second first-flip map took **6.16 s with one worker versus 1.43 s with four** (4.32×). The largest difference in first-flip times was 8.9 × 10⁻¹⁶ s. These are separate comparisons, not a promised combined speedup. Full samples and methodology are in `BENCHMARK.json`; `npm run benchmark` reproduces the workloads using real CPU worker threads and the built browser worker protocol. The map benchmark includes energy diagnostics, state transfer, colour, scheduling and worker startup. Browser/hardware load and worker limits affect actual results; this is not a browser UI benchmark.

## Architecture and limitations

`physics.ts` is UI-independent. `map.worker.ts` integrates row-tile tasks; `map-pool.ts` coordinates the dynamic queue, snapshots, synchronised frames and cache; `experiments.ts` manages IndexedDB and portable checkpoints; `accuracy.worker.ts` runs independent convergence checks; `export-map.ts` draws annotated figures; `palette.ts` owns colour encoding. React owns controls and selection; Canvas renders the field, rods and graphs. Computation and image storage are separate so WebAssembly or GPU backends can be added later.

40 × 40 remains the conservative default. 250 × 250 and 500 × 500 can be slow, especially for long first-flip maps. A high-resolution batch can exceed the scheduling target and delay pause responses. Restart terminates the worker pool immediately. The 1,000-pendulum trail view is also demanding. The current CPU implementation does not claim real-time high-resolution maps, WebGL/WebGPU acceleration, or the video's four-million-pendulum stretch target. Worker state remains Float64; the rendered image is 8-bit RGBA.

The selected inspector is re-integrated, not copied from map worker state; matching parameters, initial conditions and step produce matching motion at equal simulated times. At very high resolution it may catch up gradually. Graph traces retain the chosen recent window only, and wrapped traces split at branch cuts. Map PNG includes axes and metadata, but not the inspector graphs. PNG exports use plain-text theta1/theta2 labels for reliable font coverage. Native Canvas renderings of first-flip and divergence exports have been visually inspected. The selected first-flip readout updates as computation progresses.

The video URL in the brief could not be accessed from the build environment; implementation follows the detailed written specification. Automated physics/worker tests and the production build pass. An initial in-process HTTP preview returned 200, but subsequent sandbox HTTP checks were blocked. Interactive browser inspection was rejected by the browser security policy. Live UI and IndexedDB behaviour remain unverified in an actual browser in this environment; source/type checks, physics tests, worker integration tests, checkpoint file round trips, and static export rendering provide the available verification.




## Linear ROYGBIV first-flip palette and energy exclusion

Select ROYGBIV to recolour an existing map without recalculation. Time uses the applied calculation duration: blue at 0, green at half the window, red at the window maximum. Indigo and violet occupy early-time stops (1/12 and 1/6), yellow 2/3 and orange 5/6. Interpolation is piecewise linear in time; other palettes keep their existing square-root time scaling. The on-screen legend and PNG exports use the same calibration. White still means no observed flip, rather than the longest finite flip time.

With A=(m1+m2)gL1 and B=m2gL2, potential energy is -A cos(theta1)-B cos(theta2). The minimum potential on the first-rod inversion surface is A-B; on the second-rod inversion surface it is B-A. Therefore E < -abs(A-B), with a conservative rounding margin, guarantees neither rod can flip in this ideal conservative model. Above that bound a flip is energetically possible, not guaranteed. For unit lengths/masses and g=9.81, the threshold is -9.81 J in the app's energy convention (19.62 J above the hanging equilibrium). This is derived by minimising potential on each inversion surface; it is not a chaos classification.

First-flip maps skip cells certified by this bound; their saved states remain at the initial configuration, their flip sentinel stays -1 and their drift stays zero because no integration steps were performed. Inspector replay still integrates the actual motion independently. Existing checkpoint trajectories may already contain earlier integrated states and drift. The inspector identifies energy-forbidden releases and map CSV includes energy_forbids_flip_all_time. Other no-flip cells are only unresolved within the computed horizon. The test does not apply to driven or dissipative model extensions without re-derivation.

