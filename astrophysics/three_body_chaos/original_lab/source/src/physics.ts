// Newtonian N-body physics (the app uses n = 3, but nothing here is hard-wired to three bodies).
//
// State layout (Float64Array of length 4n):
//     y = [ x0,y0, x1,y1, ... | vx0,vy0, vx1,vy1, ... ]
// i.e. all positions first, then all velocities.  Units are dimensionless by default (G = 1).
//
// Law of gravitation (every body pulls on every other body, no softening, no damping):
//     a_i = G * sum_{j != i} m_j (r_j - r_i) / |r_j - r_i|^3

/** Index pairs for n = 3: (0,1) (0,2) (1,2).  PAIRS[k] = [i, j]. */
export const PAIRS: ReadonlyArray<readonly [number, number]> = [[0, 1], [0, 2], [1, 2]];
/** For pair index k, the body that is NOT in the pair (the "third" body). */
export const THIRD: ReadonlyArray<number> = [2, 1, 0];
export const BODY_NAMES = ['A', 'B', 'C'] as const;

/**
 * Right-hand side of the equations of motion, dy/dt = f(y).
 * Computed pair by pair using Newton's third law (the force on j is minus the force on i),
 * so each pair needs only one square root and one division.
 */
export function derivative(n: number, m: ArrayLike<number>, G: number, y: Float64Array, dy: Float64Array): void {
  const n2 = 2 * n;
  // d(position)/dt = velocity
  for (let k = 0; k < n2; k++) dy[k] = y[n2 + k];
  // d(velocity)/dt = acceleration; start from zero then add each pair's pull
  for (let k = n2; k < 2 * n2; k++) dy[k] = 0;
  for (let i = 0; i < n - 1; i++) {
    const xi = y[2 * i], yi = y[2 * i + 1];
    for (let j = i + 1; j < n; j++) {
      const dx = y[2 * j] - xi, dyy = y[2 * j + 1] - yi;
      const r2 = dx * dx + dyy * dyy;
      const f = G / (r2 * Math.sqrt(r2)); // G / r^3
      const fi = f * m[j], fj = f * m[i];
      dy[n2 + 2 * i] += fi * dx; dy[n2 + 2 * i + 1] += fi * dyy;
      dy[n2 + 2 * j] -= fj * dx; dy[n2 + 2 * j + 1] -= fj * dyy;
    }
  }
}

/**
 * Textbook form a_i = G sum_j m_j (r_j - r_i)/|r_j - r_i|^3, written exactly as in the brief.
 * Used by the independent reference solver and by tests (it shares no code with `derivative`).
 */
export function accelerationDirect(n: number, m: ArrayLike<number>, G: number, pos: ArrayLike<number>, out: Float64Array): void {
  for (let i = 0; i < n; i++) {
    let ax = 0, ay = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pos[2 * j] - pos[2 * i], dyy = pos[2 * j + 1] - pos[2 * i + 1];
      const r = Math.hypot(dx, dyy);
      ax += G * m[j] * dx / (r * r * r);
      ay += G * m[j] * dyy / (r * r * r);
    }
    out[2 * i] = ax; out[2 * i + 1] = ay;
  }
}

export interface Diagnostics {
  /** kinetic energy */ K: number;
  /** gravitational potential energy (negative) */ U: number;
  /** total mechanical energy K + U */ E: number;
  /** linear momentum (px, py) */ px: number; py: number;
  /** angular momentum about the origin (z component) */ L: number;
  /** centre of mass position and velocity */ cx: number; cy: number; cvx: number; cvy: number;
  /** total mass */ M: number;
}

/** Energy, momentum, angular momentum and centre of mass of a state. */
export function diagnostics(n: number, m: ArrayLike<number>, G: number, y: Float64Array, out?: Diagnostics): Diagnostics {
  const n2 = 2 * n;
  let K = 0, U = 0, px = 0, py = 0, L = 0, cx = 0, cy = 0, M = 0;
  for (let i = 0; i < n; i++) {
    const x = y[2 * i], yy = y[2 * i + 1], vx = y[n2 + 2 * i], vy = y[n2 + 2 * i + 1];
    K += 0.5 * m[i] * (vx * vx + vy * vy);
    px += m[i] * vx; py += m[i] * vy;
    L += m[i] * (x * vy - yy * vx);
    cx += m[i] * x; cy += m[i] * yy; M += m[i];
    for (let j = i + 1; j < n; j++) {
      U -= G * m[i] * m[j] / Math.hypot(y[2 * j] - x, y[2 * j + 1] - yy);
    }
  }
  const d = out ?? ({} as Diagnostics);
  d.K = K; d.U = U; d.E = K + U; d.px = px; d.py = py; d.L = L;
  d.cx = cx / M; d.cy = cy / M; d.cvx = px / M; d.cvy = py / M; d.M = M;
  return d;
}

/**
 * Scales used to turn conservation errors into meaningful *relative* numbers, even when the
 * initial energy, momentum or angular momentum is close to zero (a bound system can have E ~ 0,
 * and in the centre-of-mass frame P = 0 exactly, so dividing by the initial value would blow up).
 *
 *   energy scale    S_E = K0 + |U0|            (the total "energy content", never zero)
 *   momentum scale  S_P = sqrt(M * S_E)        (momentum of a mass M carrying energy S_E)
 *   angular scale   S_L = M * R0 * sqrt(S_E/M) (mass * typical radius * typical speed)
 *
 * The scaled errors reported are |E-E0|/S_E, |P-P0|/S_P and |L-L0|/S_L.
 */
export interface ConservationScales { E0: number; px0: number; py0: number; L0: number; SE: number; SP: number; SL: number }

export function conservationScales(n: number, m: ArrayLike<number>, G: number, y0: Float64Array): ConservationScales {
  const d = diagnostics(n, m, G, y0);
  const SE = d.K + Math.abs(d.U);
  const SP = Math.sqrt(d.M * SE);
  // typical radius: mass-weighted rms distance from the centre of mass
  let r2 = 0;
  for (let i = 0; i < n; i++) r2 += m[i] * ((y0[2 * i] - d.cx) ** 2 + (y0[2 * i + 1] - d.cy) ** 2);
  const R0 = Math.sqrt(r2 / d.M);
  const SL = d.M * R0 * Math.sqrt(SE / d.M) || SP;
  return { E0: d.E, px0: d.px, py0: d.py, L0: d.L, SE, SP, SL };
}

export interface ScaledErrors { absE: number; relE: number; relP: number; relL: number }
export function conservationErrors(s: ConservationScales, d: Diagnostics): ScaledErrors {
  const absE = d.E - s.E0;
  return {
    absE,
    relE: Math.abs(absE) / s.SE,
    relP: Math.hypot(d.px - s.px0, d.py - s.py0) / s.SP,
    relL: Math.abs(d.L - s.L0) / s.SL,
  };
}

/** Distance between bodies i and j. */
export function pairDistance(n: number, y: Float64Array, i: number, j: number): number {
  return Math.hypot(y[2 * j] - y[2 * i], y[2 * j + 1] - y[2 * i + 1]);
}

/**
 * Two-body (Kepler) quantities for the pair (i, j) treated in isolation:
 *   eps  = specific orbital energy  v_rel^2/2 - G(mi+mj)/r        (negative = bound)
 *   a    = semi-major axis = -G(mi+mj)/(2 eps)                   (bound only)
 *   e    = eccentricity from the specific angular momentum h
 *   period = 2 pi sqrt(a^3 / (G (mi+mj)))
 * These are *instantaneous osculating* values: they describe the two-body orbit the pair
 * would follow if the third body vanished now.  In a real three-body system they change in time.
 */
export interface PairKepler { r: number; vrel2: number; eps: number; a: number; e: number; period: number; rApo: number; radialDot: number }
export function pairKepler(m: ArrayLike<number>, G: number, y: Float64Array, n: number, i: number, j: number, out?: PairKepler): PairKepler {
  const n2 = 2 * n;
  const rx = y[2 * j] - y[2 * i], ry = y[2 * j + 1] - y[2 * i + 1];
  const vx = y[n2 + 2 * j] - y[n2 + 2 * i], vy = y[n2 + 2 * j + 1] - y[n2 + 2 * i + 1];
  const r = Math.hypot(rx, ry), v2 = vx * vx + vy * vy;
  const mu = G * (m[i] + m[j]);
  const eps = 0.5 * v2 - mu / r;
  const h = rx * vy - ry * vx; // specific angular momentum
  const o = out ?? ({} as PairKepler);
  o.r = r; o.vrel2 = v2; o.eps = eps; o.radialDot = rx * vx + ry * vy;
  if (eps < 0) {
    const a = -mu / (2 * eps);
    const e2 = 1 + 2 * eps * h * h / (mu * mu);
    const e = Math.sqrt(Math.max(0, e2));
    o.a = a; o.e = e; o.period = 2 * Math.PI * Math.sqrt(a * a * a / mu); o.rApo = a * (1 + e);
  } else { o.a = Infinity; o.e = NaN; o.period = Infinity; o.rApo = Infinity; }
  return o;
}

/** Position/velocity of body k relative to the centre of mass of the other two (for escape tests). */
export interface Relative { Rx: number; Ry: number; R: number; Vx: number; Vy: number; V2: number; eps: number; radialDot: number }
export function escaperRelative(m: ArrayLike<number>, G: number, y: Float64Array, n: number, k: number, i: number, j: number, out?: Relative): Relative {
  const n2 = 2 * n;
  const Mp = m[i] + m[j];
  const cx = (m[i] * y[2 * i] + m[j] * y[2 * j]) / Mp, cy = (m[i] * y[2 * i + 1] + m[j] * y[2 * j + 1]) / Mp;
  const cvx = (m[i] * y[n2 + 2 * i] + m[j] * y[n2 + 2 * j]) / Mp, cvy = (m[i] * y[n2 + 2 * i + 1] + m[j] * y[n2 + 2 * j + 1]) / Mp;
  const Rx = y[2 * k] - cx, Ry = y[2 * k + 1] - cy, Vx = y[n2 + 2 * k] - cvx, Vy = y[n2 + 2 * k + 1] - cvy;
  const R = Math.hypot(Rx, Ry), V2 = Vx * Vx + Vy * Vy;
  const o = out ?? ({} as Relative);
  o.Rx = Rx; o.Ry = Ry; o.R = R; o.Vx = Vx; o.Vy = Vy; o.V2 = V2;
  o.eps = 0.5 * V2 - G * (m[k] + Mp) / R; // specific energy of k about the pair's centre of mass
  o.radialDot = Rx * Vx + Ry * Vy;
  return o;
}
