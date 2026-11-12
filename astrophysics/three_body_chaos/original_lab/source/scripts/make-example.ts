// Builds examples/example-investigation.tbcl.json.gz : a small, reproducible investigation
//   50 x 50 default scattering map (horizon 200) -> auto-explore (seed 2024, depth 3, 3000 extra) -> validate 80 boundary samples.
// Open it in the lab via  Save & export > Import file.   Re-running reproduces the same samples (fixed seeds, deterministic maths).
import { mkdirSync, writeFileSync } from 'node:fs';
import { Lab } from '../src/lab.ts';
import { InlineWorker } from '../src/scheduler.ts';
import { snapshotToBlob } from '../src/persist.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lab = new Lab(() => new InlineWorker(), 2); lab.scheduler.cancelAll();
lab.pending.resolution = 50; lab.applyPending();
while (lab.remainingUniform() > 0) await sleep(50);
lab.explore.settings.maxExtra = 3000; lab.explore.settings.maxDepth = 3; lab.explore.settings.seed = 2024;
lab.startExplore(); while (lab.explore.running) await sleep(100);
await sleep(100);
lab.validate(lab.untestedBoundary(lab.cur, 80)); await sleep(100); while (!lab.scheduler.isIdle()) await sleep(100);
lab.saveRegion('example boundary region'); lab.setView({ x0: -1.0, x1: 1.0, y0: 1.0, y1: 1.8 }, 'none');
const snap = lab.snapshot('example investigation', 'Default scattering, 50x50, explored (seed 2024) and 80 boundary samples validated.');
snap.savedAt = '2026-11-02T00:00:00.000Z';
const blob = await snapshotToBlob(snap, true);
const out = new URL('../../examples/example-investigation.tbcl.json.gz', import.meta.url);
mkdirSync(new URL('../../examples/', import.meta.url), { recursive: true });
writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
const p = lab.progress();
console.log(`wrote examples/example-investigation.tbcl.json.gz (${(blob.size / 1024).toFixed(0)} KiB): ${p.total} samples, ${lab.validations.length} validated, unresolved ${p.unresolved}, status: ${lab.explore.status}`);
lab.dispose(); process.exit(0);
