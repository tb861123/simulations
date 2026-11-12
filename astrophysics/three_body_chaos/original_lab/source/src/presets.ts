// Experiment presets.  Each carries a full physical setup, a useful duration, sensible map
// variables/ranges, and honest notes on how it was checked (see tests/physics.test.ts and
// VALIDATION.md for the numbers quoted in `evidence`).
import { DEFAULT_AXES, DEFAULT_NUMERICS, DEFAULT_PHYSICS, clonePhysics, type AxisSpec, type Numerics, type Physics } from './initial.ts';

export interface Preset {
  id: string; name: string; summary: string;
  physics: Physics; numerics: Partial<Numerics>; axes: AxisSpec; resolution: number;
  /** what was checked and the numbers found */ evidence: string[];
  limitations: string[];
  /** status of the preset claim: 'verified' only when a test reproduces the quoted behaviour */
  status: 'verified' | 'constructed';
}

const round = (x: number): number => Math.round(x * 1e12) / 1e12;

function explicit(m: number[], r: number[], pos: number[][], vel: number[][], horizon: number, G = 1): Physics {
  const p = clonePhysics(DEFAULT_PHYSICS);
  p.G = G; p.mode = 'explicit'; p.frame = 'com'; p.m = m.slice(); p.r = r.slice(); p.horizon = horizon;
  p.explicit = { x: pos.map((q) => q[0]), y: pos.map((q) => q[1]), vx: vel.map((q) => q[0]), vy: vel.map((q) => q[1]) };
  return p;
}

// ---- Figure-eight (Moore 1993; Chenciner & Montgomery 2000) ----------------------------------
// Equal masses, G = 1.  Initial data as tabulated by Chenciner & Montgomery (8 significant digits).
export const FIG8_POS = [[-0.97000436, 0.24308753], [0.97000436, -0.24308753], [0, 0]];
export const FIG8_VEL = [[0.4662036850, 0.4323657300], [0.4662036850, 0.4323657300], [-0.93240737, -0.86473146]];
export const FIG8_PERIOD = 6.32591398;

// ---- Lagrange equilateral rotating triangle --------------------------------------------------
export function lagrangeTriangle(m: number[], side: number, G = 1): { pos: number[][]; vel: number[][]; period: number } {
  const M = m[0] + m[1] + m[2];
  const R = side / Math.sqrt(3);
  let pos = [0, 1, 2].map((k) => { const a = Math.PI / 2 + (2 * Math.PI * k) / 3; return [R * Math.cos(a), R * Math.sin(a)]; });
  const cx = pos.reduce((s, q, k) => s + m[k] * q[0], 0) / M, cy = pos.reduce((s, q, k) => s + m[k] * q[1], 0) / M;
  pos = pos.map((q) => [q[0] - cx, q[1] - cy]);
  const omega = Math.sqrt(G * M / (side ** 3));  // exact for ANY masses: omega^2 = G M / s^3
  const vel = pos.map((q) => [-omega * q[1], omega * q[0]]);
  return { pos: pos.map((q) => q.map(round)), vel: vel.map((q) => q.map(round)), period: 2 * Math.PI / omega };
}

// ---- Hierarchical triple ---------------------------------------------------------------------
export function hierarchical(G = 1): { pos: number[][]; vel: number[][] } {
  const mIn = 1, sep = 0.2, mC = 1, R = 3;
  const M = 2 * mIn + mC;
  const vRelOut = Math.sqrt(G * M / R);            // circular relative speed of C about the inner pair
  const vC = vRelOut * (2 * mIn) / M, vBin = -vRelOut * mC / M;
  const vIn = Math.sqrt(G * 2 * mIn / sep) / 2;    // each inner star's speed about the inner centre of mass
  // shift positions so the total centre of mass is at the origin (momentum is already zero)
  const shift = (mC * R) / M;
  return {
    pos: [[-sep / 2 - shift, 0], [sep / 2 - shift, 0], [R - shift, 0]].map((q) => q.map(round)),
    vel: [[0, -vIn + vBin], [0, vIn + vBin], [0, vC]].map((q) => q.map(round)),
  };
}

const eq = lagrangeTriangle([1, 0.01, 0.01], 1);
const hi = hierarchical();

function axes(vx: string, a: number, b: number, vy: string, c: number, d: number): AxisSpec { return { varX: vx, minX: a, maxX: b, varY: vy, minY: c, maxY: d }; }

export const PRESETS: Preset[] = [
  {
    id: 'scattering', name: 'Binary–single scattering',
    summary: 'A circular equal-mass binary (A, B) is approached by a third body C from x = −12. The map sweeps the impact offset b and the incoming speed v.',
    physics: clonePhysics(DEFAULT_PHYSICS), numerics: {}, axes: { ...DEFAULT_AXES }, resolution: 100,
    evidence: ['Pilot, 40 × 40 (1,600 real runs), b ∈ [−3, 3], v ∈ [0.25, 2.5], phase 0°, r = 0.02, horizon 200: every outcome class occurs (C escapes 35 %, A or B escapes 18 %, collisions 38 %, unresolved 4 %, complete disruption 4 %); no solver failures; worst scaled energy error 2.3 × 10⁻⁷. The delivered 100 × 100 map: C escapes 3,507, A 1,002, B 766, collisions 3,891, unresolved 382, disruption 452, failed 0. Phase 90° and radius 0.005 give the same diversity, so the brief’s defaults were kept.'],
    limitations: ['v is the speed at the finite start x = −12, not at infinity.', 'Finite horizon: "unresolved" means no accepted event by t ≈ 200, not stability.'],
    status: 'verified',
  },
  {
    id: 'figure8', name: 'Figure-eight orbit',
    summary: 'Three equal masses chase each other round one figure-eight curve (Moore 1993; Chenciner & Montgomery 2000). Map: small changes to body C’s velocity.',
    physics: explicit([1, 1, 1], [0.02, 0.02, 0.02], FIG8_POS, FIG8_VEL, 100),
    numerics: {}, axes: axes('vx2', -1.03240737, -0.83240737, 'vy2', -0.96473146, -0.76473146), resolution: 100,
    evidence: ['Initial data from Chenciner & Montgomery (2000), 8 significant digits, period 6.32591398, E = −1.287142. This app (DOP853): after one period every coordinate returns to within 1.6 × 10⁻⁸ (rtol 1e-9); after 10 periods within 2.5 × 10⁻⁶ (rtol 1e-9) or 3.7 × 10⁻⁷ (rtol 1e-11); the 8-digit data limit the ultimate accuracy. Scaled conservation error 1.7 × 10⁻⁸. Asserted in tests/physics.test.ts.'],
    limitations: ['The eight-digit initial data limit how long the orbit stays visibly periodic.', 'The orbit is linearly stable but only for a small region of velocity space; most of the map shows eventual break-up.'],
    status: 'verified',
  },
  {
    id: 'pythagorean', name: 'Pythagorean three-body problem',
    summary: 'Masses 3, 4, 5 at the corners of a 3-4-5 triangle, released from rest (Burrau 1913). Point masses; a famously chaotic sequence of close encounters. Map: position of the mass-3 body.',
    physics: explicit([3, 4, 5], [0, 0, 0], [[1, 3], [-2, -1], [1, -1]], [[0, 0], [0, 0], [0, 0]], 100),
    numerics: { rtol: 1e-12, atol: 1e-14, maxSteps: 1000000 }, axes: axes('x0', 0.6, 1.4, 'y0', 2.6, 3.4), resolution: 100,
    evidence: ['Unperturbed start, this app’s DOP853: at rtol 1e-9 the run ends with the WRONG body escaping (mass 5, t ≈ 61.1); at rtol 1e-10, 1e-11, 1e-12 and 1e-13 the mass-3 body escapes at t ≈ 61.4, 61.8, 61.8 and 61.8 (agreeing with the classic result that the lightest body is ejected near t ≈ 62). The preset therefore uses rtol 1e-12. Asserted in tests/physics.test.ts.'],
    limitations: ['Point masses (radius 0): extremely close passes are possible; encounters closer than 10⁻⁸ of the initial separation are reported as singular failures, not collisions.', 'Detailed trajectories after the first few close encounters depend on tolerance.'],
    status: 'verified',
  },
  {
    id: 'hierarchical', name: 'Hierarchical triple',
    summary: 'A tight equal-mass binary (separation 0.2) with a third body on a circular orbit of radius 3 around it. Map: C’s starting radius and orbital speed.',
    physics: explicit([1, 1, 1], [0.01, 0.01, 0.01], hi.pos, hi.vel, 200),
    numerics: {}, axes: axes('x2', 0.8, 4.0, 'vy2', 0.3, 1.3), resolution: 50,
    evidence: ['Outer/inner separation ratio 15, far outside the Mardling–Aarseth instability region (critical ratio ≈ 3–4 for these masses). Run to the full horizon t = 200 (about 500 inner orbits): unresolved, 9,778 steps, scaled conservation error 6.4 × 10⁻⁸, closest approach 0.200 (the inner separation). In the 50 × 50 map most of the plane is unresolved, with ejections where C starts too close or too fast.'],
    limitations: ['Survival to t = 200 is a finite-time observation, not proof of stability.', 'Not constructed by a published table: derived from circular-orbit formulae in the app.'],
    status: 'constructed',
  },
  {
    id: 'near-collision', name: 'Near-collision scattering',
    summary: 'The scattering experiment with larger bodies (radius 0.05) and slow, close approaches so that contacts and strong slingshots dominate the map.',
    physics: (() => { const p = clonePhysics(DEFAULT_PHYSICS); p.r = [0.05, 0.05, 0.05]; return p; })(),
    numerics: {}, axes: axes('b', -1.5, 1.5, 'v', 0.3, 1.5), resolution: 100,
    evidence: ['100 × 100 map with radius 0.05: collisions 83 % (A–B 1,579, A–C 3,190, B–C 3,496), B escapes 726, A escapes 472, C escapes 215, unresolved 303, disruption 19; failed 0. Pilot 30 × 30 agreed in mix.'],
    limitations: ['Contacts stop the integration; no merger or fragmentation is modelled.'],
    status: 'constructed',
  },
  {
    id: 'lagrange', name: 'Equilateral rotating triangle',
    summary: 'A heavy body (mass 1) and two light bodies (0.01) at the corners of a rotating equilateral triangle: an exact solution of the three-body problem (Lagrange 1772). Map: velocity of one light body.',
    physics: explicit([1, 0.01, 0.01], [0.002, 0.002, 0.002], eq.pos, eq.vel, 200),
    numerics: {}, axes: axes('vx1', eq.vel[1][0] - 0.05, eq.vel[1][0] + 0.05, 'vy1', eq.vel[1][1] - 0.05, eq.vel[1][1] + 0.05), resolution: 100,
    evidence: ['Exact solution: ω² = G M / s³ with s the side length. Routh’s stability criterion (M² > 27 Σ mᵢmⱼ) holds for these masses; with three equal masses it fails and the triangle breaks up. With masses (1, 0.01, 0.01), side 1 (period 6.22128) all three sides remain 1.0000000 after 20 periods (scaled conservation error 4 × 10⁻¹⁰), asserted in tests/physics.test.ts; with three equal masses the triangle breaks up (B–C contact at t = 9.3).'],
    limitations: ['Stability is linear stability of the exact solution; finite-amplitude perturbations in the map can still escape.'],
    status: 'verified',
  },
];

export function getPreset(id: string): Preset { return PRESETS.find((p) => p.id === id) ?? PRESETS[0]; }
export function presetNumerics(p: Preset): Numerics { return { ...DEFAULT_NUMERICS, ...p.numerics }; }
