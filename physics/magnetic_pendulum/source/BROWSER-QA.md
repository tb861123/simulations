# Browser and tablet verification

## Current verification status

The Node numerical/worker/storage suite and production HTTP smoke tests passed. The browser suite's **12 desktop/tablet scenarios were discovered and parsed successfully**, but **were not executed** in this task.

The in-app browser could not reach the local HTTP preview. Connected Chrome automation could not attach. A subsequent attempt to open the offline artifact was explicitly rejected by the browser URL policy, which only permits HTTP(S). No security controls were disabled and no alternate automation path was used to circumvent that rejection. Real-browser interactions, responsive appearance and browser-specific IndexedDB/quota behaviour remain unverified.

## Run the supplied real-browser suite locally

From the project directory, using a normal Node/npm installation:

```sh
npm install
npm run build
npx playwright install chromium
npm run test:browser
```

The configuration starts the production server on `http://127.0.0.1:4173/`; that port must be free. Desktop uses 1440×1000; tablet uses 820×1180 with touch support. Tests use isolated browser contexts and synthetic calibration data, never real accounts or external services. Test output, screenshots, traces and the HTML report are written under `work/`.

The scenarios cover coordinate clamping and layout width; side view; angular/tangent release and replay; calibration input; named saves/reload recovery; portable import including malformed files; labelled PNG, map CSV and trajectory CSV exports; rod/string selection and impact accounting; sampled boundary confidence; adaptive-reference comparison; pixel selection; view history; pause/resume/cancellation. The default-map confidence test can take over a minute on slower devices.

`npm run test:browser -- --list` only parses/discovers scenarios. It is **not** evidence that any browser interaction passed.

## Manual review

Open **Launch Lab.cmd**, or run `node serve.mjs --open`, and review the HTTP application in your browser:

1. Enter out-of-range release and map coordinates; leave the field or press Enter and check the reset limits account for both axes. Try shortening L.
2. Choose a release, inspect top and side views, and compare the reported height, angle, distance and support force. Check the out-of-plane label; the side view is a projection.
3. Apply angular/tangent conditions close to 90° and verify finite velocities. Review the displayed actual coordinates after the small numerical reach margin is applied.
4. In string mode, use zero damping/zero magnetic attraction and about 5 m/s initial speed. Check slack flight, reattachment, support force and impact loss. Step-refine the result.
5. Allow a default basin to complete. Check that only sampled boundary pixels receive confidence colours; grey means untested, and green is not a mathematical guarantee.
6. Run selected RK4 refinement and the independent adaptive rod reference. Check actual tolerances and capture times. The adaptive reference is explicitly unavailable for string events.
7. Use a labelled synthetic calibration example to exercise the workflow, then real measurements when available. Verify target magnet and draft changes before applying.
8. Save, reload, restore initially paused, extend a horizon and export/import a portable file. Check errors for malformed files or denied storage. Inspect PNG labels and CSV units.
9. Repeat on a tablet-sized window and an actual touch device; review scrolling, contrast, field labels, pan/zoom and controls. Dedicated pinch zoom remains unsupported.

Please retain pass/fail output and any failed scenario name. The supplied suite is reviewable test code, not a claim that browser verification has already succeeded.

UI redesign check: stage a damping edit, zoom, then go back and forward. Verify that damping remains pending and the calculation status does not restart. Click **Recalculate map** and verify the new range is calculated. In the trajectory panel, run an angular release and confirm that the basin map does not restart.
