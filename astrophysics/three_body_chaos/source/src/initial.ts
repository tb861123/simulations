// Initial-condition construction, parameter definitions, validation and cache fingerprints.
import { PAIRS } from './physics.ts';

/** Bump when anything that changes computed numbers changes (integrator, classifier, event rules). */
export const MODEL_VERSION = 'nbody-newtonian-dop853-v1';
export const APP_VERSION = '1.0.0';

export interface ScatterParams { sep: number; ecc: number; phaseDeg: number; cx: number; b: number; v: number }
export interface ExplicitBodies { x: number[]; y: number[]; vx: number[]; vy: number[] }

export interface Physics {
  /** gravitational constant (1 in dimensionless units) */ G: number;
  /** 'scattering' builds A,B as a binary and C as an incoming body; 'explicit' uses the listed x,y,vx,vy */
  mode: 'scattering' | 'explicit';
  /** frame the initial state is expressed in: total centre of mass, or the binary's rest frame */
  frame: 'com' | 'binary';
  m: number[]; r: number[];
  scatter: ScatterParams;
  explicit: ExplicitBodies;
  /** simulation horizon (time units) */ horizon: number;
}

export interface Numerics {
  rtol: number; atol: number;
  /** work bound per trajectory (accepted + rejected steps) */ maxSteps: number;
  /** escaper must be at least this many times the surviving pair's apocentre away */ hierarchy: number;
  /** escape criteria must hold for this many pair periods ... */ sustainPeriods: number;
  /** ... and at least this long (time units) */ minSustain: number;
  /** close encounter when a pair gets closer than closeFactor * lengthScale ... */ closeFactor: number;
  /** ... and it ends when it exceeds closeFactor * closeHyst * lengthScale */ closeHyst: number;
  /** scaled energy error above which a result is flagged provisional / unreliable */ warnE: number; failE: number;
  /** reference length for close-encounter counting and phase-space scaling (0 = automatic) */ lengthScale: number;
}

export const DEFAULT_NUMERICS: Numerics = {
  rtol: 1e-9, atol: 1e-11, maxSteps: 200000,
  hierarchy: 5, sustainPeriods: 1, minSustain: 1,
  closeFactor: 0.25, closeHyst: 2,
  warnE: 1e-6, failE: 1e-3, lengthScale: 0,
};

export interface AxisSpec { varX: string; minX: number; maxX: number; varY: string; minY: number; maxY: number }

export const DEFAULT_PHYSICS: Physics = {
  G: 1, mode: 'scattering', frame: 'com',
  m: [1, 1, 1], r: [0.02, 0.02, 0.02],
  scatter: { sep: 1, ecc: 0, phaseDeg: 0, cx: -12, b: 0, v: 1 },
  explicit: { x: [-0.5, 0.5, -12], y: [0, 0, 0], vx: [0, 0, 1], vy: [-Math.SQRT1_2, Math.SQRT1_2, 0] },
  horizon: 200,
};
export const DEFAULT_AXES: AxisSpec = { varX: 'b', minX: -3, maxX: 3, varY: 'v', minY: 0.25, maxY: 2.5 };

// ---------------------------------------------------------------------------------------------
// Parameter definitions (labels, units, genuine limits).  Limits are those the numerics and
// physics genuinely need (positive finite masses, non-negative radii, tolerances above the
// double-precision floor); positions are NOT confined to any "length of a pendulum" box.
// ---------------------------------------------------------------------------------------------
export interface ParamDef { id: string; label: string; unit: string; min: number; max: number; modes: ('scattering' | 'explicit')[]; hint?: string }
const BODY = ['A', 'B', 'C'];
const defs: ParamDef[] = [
  { id: 'b', label: 'impact offset b', unit: 'L', min: -1e4, max: 1e4, modes: ['scattering'], hint: "C's initial y-offset from the binary's centre of mass" },
  { id: 'v', label: 'incoming speed v', unit: 'L/T', min: 1e-3, max: 1e3, modes: ['scattering'], hint: 'speed of C at its finite starting distance, not the speed at infinity' },
  { id: 'phase', label: 'binary phase φ', unit: '°', min: 0, max: 360, modes: ['scattering'], hint: 'direction of the A→B line at t = 0' },
  { id: 'ecc', label: 'binary eccentricity e', unit: '', min: 0, max: 0.99, modes: ['scattering'], hint: 'binary starts at pericentre' },
  { id: 'sep', label: 'initial A–B separation', unit: 'L', min: 1e-3, max: 1e3, modes: ['scattering'] },
  { id: 'cx', label: 'C starting x', unit: 'L', min: -1e5, max: 1e5, modes: ['scattering'] },
];
BODY.forEach((n, i) => {
  defs.push({ id: 'm' + i, label: `mass ${n}`, unit: 'M', min: 1e-6, max: 1e6, modes: ['scattering', 'explicit'] });
  defs.push({ id: 'r' + i, label: `radius ${n}`, unit: 'L', min: 0, max: 1e3, modes: ['scattering', 'explicit'] });
  defs.push({ id: 'x' + i, label: `x ${n}`, unit: 'L', min: -1e6, max: 1e6, modes: ['explicit'] });
  defs.push({ id: 'y' + i, label: `y ${n}`, unit: 'L', min: -1e6, max: 1e6, modes: ['explicit'] });
  defs.push({ id: 'vx' + i, label: `vx ${n}`, unit: 'L/T', min: -1e4, max: 1e4, modes: ['explicit'] });
  defs.push({ id: 'vy' + i, label: `vy ${n}`, unit: 'L/T', min: -1e4, max: 1e4, modes: ['explicit'] });
});
export const PARAM_DEFS: Record<string, ParamDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const AXIS_VAR_IDS = (mode: 'scattering' | 'explicit'): string[] =>
  defs.filter((d) => d.modes.includes(mode) && !d.id.startsWith('r') ).map((d) => d.id);

export function axisLabel(id: string): string {
  const d = PARAM_DEFS[id];
  return d ? `${d.label}${d.unit ? ' (' + d.unit + ')' : ''}` : id;
}

/** Current (un-overridden) value of a parameter in a Physics object. */
export function getParam(p: Physics, id: string): number {
  if (id in p.scatter) return (p.scatter as any)[id === 'phase' ? 'phaseDeg' : id];
  if (id === 'phase') return p.scatter.phaseDeg;
  const k = +id.slice(-1);
  if (id[0] === 'm') return p.m[k];
  if (id[0] === 'r') return p.r[k];
  if (id.startsWith('vx')) return p.explicit.vx[k];
  if (id.startsWith('vy')) return p.explicit.vy[k];
  if (id[0] === 'x') return p.explicit.x[k];
  if (id[0] === 'y') return p.explicit.y[k];
  throw new Error('unknown parameter ' + id);
}
export function setParam(p: Physics, id: string, val: number): void {
  if (id === 'phase') { p.scatter.phaseDeg = val; return; }
  if (id in p.scatter) { (p.scatter as any)[id] = val; return; }
  const k = +id.slice(-1);
  if (id[0] === 'm') p.m[k] = val;
  else if (id[0] === 'r') p.r[k] = val;
  else if (id.startsWith('vx')) p.explicit.vx[k] = val;
  else if (id.startsWith('vy')) p.explicit.vy[k] = val;
  else if (id[0] === 'x') p.explicit.x[k] = val;
  else if (id[0] === 'y') p.explicit.y[k] = val;
  else throw new Error('unknown parameter ' + id);
}

export function clonePhysics(p: Physics): Physics { return JSON.parse(JSON.stringify(p)); }

// ---------------------------------------------------------------------------------------------
// Circular / eccentric binary construction
// ---------------------------------------------------------------------------------------------
export interface BinaryState { rA: [number, number]; rB: [number, number]; vA: [number, number]; vB: [number, number]; a: number; period: number }

/**
 * Binary of masses mA, mB started at PERICENTRE, separation `sep`, eccentricity `ecc`.
 *   semi-major axis a = sep/(1-e)
 *   relative speed at pericentre v_rel = sqrt(G (mA+mB)(1+e)/sep)         (=sqrt(G M / sep) when e = 0, circular)
 * The A→B direction at t = 0 makes angle φ with the +x axis; motion is counter-clockwise.
 * Positions/velocities are about the binary's own centre of mass:
 *   rA = -(mB/M) sep û,  rB = +(mA/M) sep û,   vA = -(mB/M) v_rel t̂,  vB = +(mA/M) v_rel t̂,
 * with û = (cos φ, sin φ) and t̂ = (-sin φ, cos φ).  This derivation holds for ANY masses
 * (it is not the equal-mass shortcut v = sqrt(G m / (2 sep)) ... which only appears as its special case).
 */
export function binaryState(G: number, mA: number, mB: number, sep: number, ecc: number, phaseDeg: number): BinaryState {
  const M = mA + mB;
  const vRel = Math.sqrt(G * M * (1 + ecc) / sep);
  const ph = (phaseDeg * Math.PI) / 180;
  const ux = Math.cos(ph), uy = Math.sin(ph), tx = -Math.sin(ph), ty = Math.cos(ph);
  const a = sep / (1 - ecc);
  return {
    rA: [-(mB / M) * sep * ux, -(mB / M) * sep * uy], rB: [(mA / M) * sep * ux, (mA / M) * sep * uy],
    vA: [-(mB / M) * vRel * tx, -(mB / M) * vRel * ty], vB: [(mA / M) * vRel * tx, (mA / M) * vRel * ty],
    a, period: 2 * Math.PI * Math.sqrt(a * a * a / (G * M)),
  };
}

export interface Initial { n: 3; m: Float64Array; r: Float64Array; y: Float64Array }

/** Subtract the total centre-of-mass position and velocity (keeps all relative positions/velocities). */
export function toCentreOfMass(m: ArrayLike<number>, y: Float64Array): void {
  let M = 0, cx = 0, cy = 0, cvx = 0, cvy = 0;
  for (let i = 0; i < 3; i++) {
    M += m[i]; cx += m[i] * y[2 * i]; cy += m[i] * y[2 * i + 1]; cvx += m[i] * y[6 + 2 * i]; cvy += m[i] * y[6 + 2 * i + 1];
  }
  cx /= M; cy /= M; cvx /= M; cvy /= M;
  for (let i = 0; i < 3; i++) { y[2 * i] -= cx; y[2 * i + 1] -= cy; y[6 + 2 * i] -= cvx; y[6 + 2 * i + 1] -= cvy; }
}

/**
 * Generate the exact initial state for a physics setup, with some parameters overridden
 * (this is what a map sample is: the setup plus overrides for the two axis variables).
 */
export function buildInitial(p: Physics, overrides?: Record<string, number>): Initial {
  const q = clonePhysics(p);
  // keys like "dx0", "dvy2" are small deltas added to the FINAL generated state (any set-up): used for perturbation studies
  const deltas: [number, number][] = [];
  if (overrides) for (const k of Object.keys(overrides)) {
    const d = /^d(x|y|vx|vy)([012])$/.exec(k);
    if (d) deltas.push([(d[1] === "x" ? 0 : d[1] === "y" ? 1 : d[1] === "vx" ? 6 : 7) + 2 * +d[2], overrides[k]]);
    else setParam(q, k, overrides[k]);
  }
  const m = Float64Array.from(q.m), r = Float64Array.from(q.r);
  const y = new Float64Array(12);
  if (q.mode === 'scattering') {
    const s = q.scatter;
    const bin = binaryState(q.G, m[0], m[1], s.sep, s.ecc, s.phaseDeg);
    y[0] = bin.rA[0]; y[1] = bin.rA[1]; y[2] = bin.rB[0]; y[3] = bin.rB[1];
    y[6] = bin.vA[0]; y[7] = bin.vA[1]; y[8] = bin.vB[0]; y[9] = bin.vB[1];
    // C starts at (cx, b) moving in +x at speed v, measured in the binary's centre-of-mass frame
    y[4] = s.cx; y[5] = s.b; y[10] = s.v; y[11] = 0;
    if (q.frame === 'com') toCentreOfMass(m, y);
  } else {
    for (let i = 0; i < 3; i++) { y[2 * i] = q.explicit.x[i]; y[2 * i + 1] = q.explicit.y[i]; y[6 + 2 * i] = q.explicit.vx[i]; y[6 + 2 * i + 1] = q.explicit.vy[i]; }
  }
  for (const [idx, dv] of deltas) y[idx] += dv;
  return { n: 3, m, r, y };
}

/** Perturbation parameters: a delta added to one coordinate of the generated initial state. */
export const DELTA_PARAMS: { id: string; label: string; unit: string }[] = ['A', 'B', 'C'].flatMap((n, i) => [
  { id: `dx${i}`, label: `Δx of ${n}`, unit: 'L' }, { id: `dy${i}`, label: `Δy of ${n}`, unit: 'L' },
  { id: `dvx${i}`, label: `Δvx of ${n}`, unit: 'L/T' }, { id: `dvy${i}`, label: `Δvy of ${n}`, unit: 'L/T' },
]);

// ---------------------------------------------------------------------------------------------
// Validation and clamping of user input
// ---------------------------------------------------------------------------------------------
export interface ClampResult { value: number; changed: boolean; message?: string }

/** Clamp a typed value to the parameter's genuine limits; reject non-finite values. */
export function clampParam(id: string, raw: number, previous: number): ClampResult {
  const d = PARAM_DEFS[id];
  if (!Number.isFinite(raw)) return { value: previous, changed: true, message: `${d?.label ?? id}: not a finite number; kept ${previous}.` };
  if (!d) return { value: raw, changed: false };
  if (raw < d.min) return { value: d.min, changed: true, message: `${d.label}: minimum is ${d.min}; set to ${d.min}.` };
  if (raw > d.max) return { value: d.max, changed: true, message: `${d.label}: maximum is ${d.max}; set to ${d.max}.` };
  return { value: raw, changed: false };
}

export const GLOBAL_LIMITS = {
  G: { min: 1e-6, max: 1e6 }, horizon: { min: 1e-3, max: 1e6 },
  rtol: { min: 1e-13, max: 1e-3 }, atol: { min: 1e-16, max: 1e-3 }, maxSteps: { min: 1000, max: 5e7 },
};

/** Physical validity of a complete setup.  Returns human-readable problems (empty = valid). */
export function validatePhysics(p: Physics, overrides?: Record<string, number>): string[] {
  const errs: string[] = [];
  if (!(Number.isFinite(p.G) && p.G > 0)) errs.push('G must be positive and finite.');
  if (!(Number.isFinite(p.horizon) && p.horizon > 0)) errs.push('Horizon must be positive and finite.');
  for (let i = 0; i < 3; i++) {
    if (!(Number.isFinite(p.m[i]) && p.m[i] > 0)) errs.push(`Mass ${BODY[i]} must be positive and finite.`);
    if (!(Number.isFinite(p.r[i]) && p.r[i] >= 0)) errs.push(`Radius ${BODY[i]} must be non-negative and finite.`);
  }
  if (errs.length) return errs;
  if (p.mode === 'scattering') {
    const s = p.scatter;
    if (!(s.sep > 0)) errs.push('A–B separation must be positive.');
    if (!(s.ecc >= 0 && s.ecc < 1)) errs.push('Eccentricity must satisfy 0 ≤ e < 1 (a bound binary).');
    if (!(s.v > 0)) errs.push('Incoming speed v must be positive.');
  }
  const ini = buildInitial(p, overrides);
  if (!Array.from(ini.y).every(Number.isFinite)) { errs.push('Initial state is not finite.'); return errs; }
  for (const [i, j] of PAIRS) {
    const d = Math.hypot(ini.y[2 * j] - ini.y[2 * i], ini.y[2 * j + 1] - ini.y[2 * i + 1]);
    const R = ini.r[i] + ini.r[j];
    if (d <= R) errs.push(`Bodies ${BODY[i]} and ${BODY[j]} overlap at t = 0 (distance ${d.toPrecision(4)} ≤ sum of radii ${R.toPrecision(4)}), which the contact model cannot start from.`);
    if (d === 0) errs.push(`Bodies ${BODY[i]} and ${BODY[j]} coincide: the force is singular.`);
  }
  return errs;
}

export function validateNumerics(n: Numerics): string[] {
  const e: string[] = [];
  const L = GLOBAL_LIMITS;
  if (!(n.rtol >= L.rtol.min && n.rtol <= L.rtol.max)) e.push(`Relative tolerance must be within ${L.rtol.min}–${L.rtol.max}.`);
  if (!(n.atol >= L.atol.min && n.atol <= L.atol.max)) e.push(`Absolute tolerance must be within ${L.atol.min}–${L.atol.max}.`);
  if (!(n.maxSteps >= L.maxSteps.min && n.maxSteps <= L.maxSteps.max)) e.push('Max steps out of range.');
  if (!(n.hierarchy >= 1)) e.push('Hierarchy factor must be ≥ 1.');
  if (!(n.sustainPeriods >= 0 && n.minSustain >= 0)) e.push('Sustain times must be ≥ 0.');
  if (!(n.closeFactor > 0 && n.closeHyst > 1)) e.push('Close-encounter factor must be > 0 and hysteresis ratio > 1.');
  if (!(n.warnE > 0 && n.failE >= n.warnE)) e.push('Energy-error thresholds must satisfy 0 < warn ≤ fail.');
  return e;
}

// ---------------------------------------------------------------------------------------------
// Fingerprints: identify which results are compatible with a configuration.
// Excludes: appearance (colours), the horizon (handled by extension) and the *base values* of
// the two variables that the map sweeps (every sample overrides them).
// ---------------------------------------------------------------------------------------------
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

/** 53-bit string hash (cyrb53) rendered in hex. */
export function hashString(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function physicsFingerprint(p: Physics, nu: Numerics, axes: AxisSpec): string {
  const q = clonePhysics(p);
  // neutralise the swept variables: their base value never reaches a sample
  for (const id of [axes.varX, axes.varY]) setParam(q, id, 0);
  const { horizon, ...rest } = q;
  void horizon;
  return hashString(stableStringify({ model: MODEL_VERSION, phys: rest, nu, vx: axes.varX, vy: axes.varY }));
}
