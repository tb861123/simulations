// Writes tests/fixtures/ics.json: initial conditions (as built by the app) for the SciPy cross-check.
import { writeFileSync } from 'node:fs';
import { buildInitial, DEFAULT_PHYSICS, clonePhysics } from '../src/initial.ts';
import { PRESETS } from '../src/presets.ts';
const cases: any[] = [];
const add = (name: string, phys: any, ov: any, times: number[]) => { const ini = buildInitial(phys, ov); cases.push({ name, G: phys.G, m: Array.from(ini.m), y0: Array.from(ini.y), times }); };
add('scattering b=0.5 v=1', DEFAULT_PHYSICS, { b: 0.5, v: 1 }, [5, 10, 20, 30]);
add('scattering b=1.0 v=0.8', DEFAULT_PHYSICS, { b: 1.0, v: 0.8 }, [5, 10, 20]);
const un = clonePhysics(DEFAULT_PHYSICS); un.m = [1, 2.5, 0.4]; un.scatter.phaseDeg = 37; un.scatter.ecc = 0.3;
add('unequal masses, e=0.3, phase 37', un, { b: -0.7, v: 1.2 }, [5, 10, 20]);
add('figure-eight', PRESETS[1].physics, {}, [1.5, 3.1629, 6.32591398]);
add('pythagorean (t<=12, before the worst encounters)', PRESETS[2].physics, {}, [2, 6, 12]);
add('lagrange triangle', PRESETS[5].physics, {}, [10, 50]);
writeFileSync(new URL('../tests/fixtures/ics.json', import.meta.url), JSON.stringify(cases, null, 1));
console.log('wrote', cases.length, 'cases');
