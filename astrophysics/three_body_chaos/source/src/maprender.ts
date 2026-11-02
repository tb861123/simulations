// Renders the parameter map from the stored samples.  Pure drawing: it reads the lab's data and
// the appearance, and never starts a calculation.  Used both by the on-screen map and by PNG export.
import type { Lab, MapMode } from './lab.ts';
import { Layer, NOT_COMPUTED, SUPPLEMENTARY, VALID, type Rect } from './store.ts';
import { OUT, FLAG } from './simulate.ts';
import { OUTCOMES, type Appearance } from './outcomes.ts';
import { parseHex, packRGB, mix, type RGB } from './colours.ts';
import { EDGE, type Edges } from './boundaries.ts';
import { levelOfCell } from './store.ts';

export const BG: RGB = [17, 22, 33];
export const MISSING: RGB = [40, 46, 60];
export const RELIABILITY = [
  { label: 'failed / unreliable', colour: '#ff6b6b' }, { label: 'provisional (energy warning or pending escape)', colour: '#ffa94d' },
  { label: 'classified, not yet validated', colour: '#748ffc' }, { label: 'validated: agrees at tighter tolerances', colour: '#51cf66' },
  { label: 'validated: disagrees / discrepancy', colour: '#f06595' },
];
export const MODE_INFO: Record<MapMode, { label: string; unit: string; help: string }> = {
  outcome: { label: 'Outcome', unit: '', help: 'Classified outcome of each calculated sample.' },
  tEscape: { label: 'Time to accepted escape', unit: 'time units', help: 'Time at which the escape criteria were accepted (escape or disruption outcomes only). Missing for collisions and unresolved samples.' },
  tCollision: { label: 'Collision time', unit: 'time units', help: 'Time of the located contact (collision outcomes only).' },
  minDist: { label: 'Closest approach', unit: 'log₁₀ length', help: 'Smallest pair separation reached before the run ended (log scale).' },
  nClose: { label: 'Significant close encounters', unit: 'count', help: 'Number of encounters closer than closeFactor × L (with hysteresis: leave at hysteresis × that distance before another counts).' },
  survival: { label: 'Survival time', unit: 'time units', help: 'Time until the first collision or accepted escape. Unresolved samples are censored at the horizon (shown at the top of the scale).' },
  sens: { label: 'Finite-time sensitivity', unit: '1 / time', help: 'ln(Δ(T*)/Δ(0))/T*: finite-time growth rate of the scaled phase-space separation between a sample and a partner offset by 1e-7 of the x-axis span. Not a Lyapunov exponent. Compute it with the button below.' },
  exchange: { label: 'Binary energy exchange', unit: 'fraction', help: '(E_binary,final − E_binary,initial)/|E_binary,initial| for the surviving binary. Negative: binary became more tightly bound. Missing for collisions, unresolved and disruption.' },
  complexity: { label: 'Boundary complexity', unit: 'fraction', help: 'Fraction of the (up to 8) neighbours whose classified outcome differs: high where outcomes change on a small scale.' },
  reliability: { label: 'Numerical reliability', unit: '', help: 'Failed / provisional / classified / validated status of each sample.' },
  density: { label: 'Sampling density', unit: 'refinement depth', help: 'Quadtree depth of the cell the sample represents (0 = original grid spacing).' },
};

// colour maps -----------------------------------------------------------------------------------
function lut(stops: RGB[]): Uint32Array {
  const out = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const f = (i / 255) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(f));
    out[i] = packRGB(mix(stops[k], stops[k + 1], f - k));
  }
  return out;
}
export const VIRIDIS_STOPS: RGB[] = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
export const DIVERGING_STOPS: RGB[] = [[33, 102, 172], [146, 197, 222], [247, 247, 247], [244, 165, 130], [178, 24, 43]];
const VIRIDIS = lut(VIRIDIS_STOPS), DIVERGING = lut(DIVERGING_STOPS);

export interface Legend {
  kind: 'categorical' | 'continuous';
  title: string; note: string;
  entries?: { label: string; colour: string; count: number }[];
  min?: number; max?: number; unit?: string; stops?: RGB[]; logNote?: string;
}

interface Scale { lo: number; hi: number }
const scaleCache = new Map<string, Scale>();

function valueOf(lab: Lab, L: Layer, mode: MapMode, id: number, inc: Uint8Array | null): number {
  const s = L.store, o = s.outcome[id];
  if (o === NOT_COMPUTED) return NaN;
  switch (mode) {
    case 'tEscape': return (o <= OUT.C_ESC || o === OUT.DISRUPTION) && !(s.flags[id] & FLAG.PENDING) ? s.tEnd[id] : NaN;
    case 'tCollision': return o >= OUT.COL_AB && o <= OUT.COL_BC ? s.tEnd[id] : NaN;
    case 'survival': return o === OUT.FAILED ? NaN : o === OUT.UNRESOLVED || (s.flags[id] & FLAG.PENDING) ? lab.applied.physics.horizon : s.tEnd[id];
    case 'minDist': return s.minD[id] > 0 ? Math.log10(s.minD[id]) : NaN;
    case 'nClose': return s.nClose[id];
    case 'sens': return s.sens[id];
    case 'exchange': return s.exch[id];
    case 'complexity': return inc ? Math.min(8, inc[id]) / 8 : NaN;
    case 'density': return s.depth[id] === SUPPLEMENTARY ? NaN : s.depth[id];
    default: return NaN;
  }
}

function scaleFor(lab: Lab, L: Layer, mode: MapMode, inc: Uint8Array | null): Scale {
  const key = `${L.id}:${L.version}:${mode}`;
  const c = scaleCache.get(key); if (c) return c;
  const vals: number[] = []; const s = L.store;
  const step = Math.max(1, Math.floor(s.count / 20000));
  for (let id = 0; id < s.count; id += step) { const v = valueOf(lab, L, mode, id, inc); if (Number.isFinite(v)) vals.push(v); }
  let sc: Scale;
  if (!vals.length) sc = { lo: 0, hi: 1 };
  else {
    vals.sort((a, b) => a - b);
    const q = (p: number): number => vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))];
    if (mode === 'exchange') { const m = Math.max(1e-9, Math.abs(q(0.05)), Math.abs(q(0.95))); sc = { lo: -m, hi: m }; }
    else if (mode === 'sens') sc = { lo: q(0.02), hi: q(0.98) };
    else if (mode === 'complexity') sc = { lo: 0, hi: 1 };
    else if (mode === 'density') sc = { lo: 0, hi: Math.max(1, vals[vals.length - 1]) };
    else if (mode === 'nClose') sc = { lo: 0, hi: Math.max(1, q(0.98)) };
    else sc = { lo: vals[0], hi: vals[vals.length - 1] > vals[0] ? vals[vals.length - 1] : vals[0] + 1 };
  }
  if (scaleCache.size > 200) scaleCache.clear();
  scaleCache.set(key, sc); return sc;
}

/** Number of outcome-type edges touching each sample (for the boundary-complexity map). */
const incCache = new Map<number, { v: number; arr: Uint8Array }>();
function incidence(lab: Lab, L: Layer): Uint8Array {
  const hit = incCache.get(L.id); if (hit && hit.v === L.version) return hit.arr;
  const e: Edges = lab.edges(L), arr = new Uint8Array(L.store.count);
  for (let q = 0; q < e.n; q++) if (e.kind[q] & EDGE.OUTCOME) { if (arr[e.a[q]] < 255) arr[e.a[q]]++; if (arr[e.b[q]] < 255) arr[e.b[q]]++; }
  incCache.set(L.id, { v: L.version, arr }); return arr;
}

function reliabilityIndex(L: Layer, id: number): number {
  const s = L.store;
  if (s.outcome[id] === OUT.FAILED) return 0;
  if (s.valid[id] >= VALID.OUTCOME_DIFFERS) return 4;
  if (s.valid[id] === VALID.AGREE) return 3;
  if (s.flags[id] & FLAG.PROVISIONAL) return 1;
  return 2;
}

export function legendFor(lab: Lab, mode: MapMode, L: Layer = lab.cur): Legend {
  const app = lab.appearance;
  const info = MODE_INFO[mode];
  if (mode === 'outcome') {
    const cnt = new Array(9).fill(0); const s = L.store;
    for (let i = 0; i < s.count; i++) if (s.outcome[i] < 9) cnt[s.outcome[i]]++;
    return { kind: 'categorical', title: info.label, note: info.help, entries: OUTCOMES.map((o) => ({ label: o.label, colour: app.outcomes[o.code], count: cnt[o.code] })) };
  }
  if (mode === 'reliability') {
    const cnt = new Array(5).fill(0); const s = L.store;
    for (let i = 0; i < s.count; i++) if (s.outcome[i] !== NOT_COMPUTED) cnt[reliabilityIndex(L, i)]++;
    return { kind: 'categorical', title: info.label, note: info.help, entries: RELIABILITY.map((r, i) => ({ label: r.label, colour: r.colour, count: cnt[i] })) };
  }
  const inc = mode === 'complexity' ? incidence(lab, L) : null;
  const sc = scaleFor(lab, L, mode, inc);
  return { kind: 'continuous', title: info.label, note: info.help, min: sc.lo, max: sc.hi, unit: info.unit, stops: mode === 'exchange' ? DIVERGING_STOPS : VIRIDIS_STOPS, logNote: mode === 'minDist' ? 'log₁₀ scale' : undefined };
}

export interface PaintOptions { hatch: boolean; preview: boolean }

/** Paint the map into an ImageData of size W x H showing `view` (row 0 = top = largest y). */
export function paintMap(lab: Lab, W: number, H: number, view: Rect, mode: MapMode, app: Appearance, opt: PaintOptions = { hatch: true, preview: true }): ImageData {
  const img = new ImageData(W, H), u32 = new Uint32Array(img.data.buffer);
  const bg = packRGB(BG); u32.fill(bg);
  const palette = app.outcomes.map((h) => packRGB(parseHex(h) ?? [128, 128, 128]));
  const relPal = RELIABILITY.map((r) => packRGB(parseHex(r.colour)!));
  const missing = packRGB(MISSING), hatchCol = packRGB([58, 66, 86]);
  const dim = (c: number): number => {
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    return packRGB([Math.round(r * 0.42 + BG[0] * 0.58), Math.round(g * 0.42 + BG[1] * 0.58), Math.round(b * 0.42 + BG[2] * 0.58)]);
  };
  const layers = [...lab.layers].sort((a, b) => b.dx * b.dy - a.dx * a.dy);
  const vw = view.x1 - view.x0, vh = view.y1 - view.y0;
  for (const L of layers) {
    const inc = mode === 'complexity' ? incidence(lab, L) : null;
    const sc = mode === 'outcome' || mode === 'reliability' ? null : scaleFor(lab, L, mode, inc);
    const map = mode === 'exchange' ? DIVERGING : VIRIDIS;
    const s = L.store, n = L.n;
    const colourOf = (id: number): number => {
      const o = s.outcome[id];
      if (o === NOT_COMPUTED) return 0;
      if (mode === 'outcome') return palette[o] ?? missing;
      if (mode === 'reliability') return relPal[reliabilityIndex(L, id)];
      const v = valueOf(lab, L, mode, id, inc);
      if (!Number.isFinite(v)) return missing;
      const f = (v - sc!.lo) / (sc!.hi - sc!.lo || 1);
      return map[Math.max(0, Math.min(255, Math.round(f * 255)))];
    };
    const colI = new Int32Array(W).fill(-1), rowJ = new Int32Array(H).fill(-1);
    let anyX = false, anyY = false;
    for (let px = 0; px < W; px++) { const x = view.x0 + ((px + 0.5) * vw) / W; if (x >= L.rect.x0 && x <= L.rect.x1) { colI[px] = Math.min(n - 1, Math.floor((x - L.rect.x0) / L.dx)); anyX = true; } }
    for (let py = 0; py < H; py++) { const y = view.y1 - ((py + 0.5) * vh) / H; if (y >= L.rect.y0 && y <= L.rect.y1) { rowJ[py] = Math.min(n - 1, Math.floor((y - L.rect.y0) / L.dy)); anyY = true; } }
    if (!anyX || !anyY) continue;
    const isBase = L === layers[0];
    for (let py = 0; py < H; py++) {
      const j = rowJ[py]; if (j < 0) continue;
      for (let px = 0; px < W; px++) {
        const i = colI[px]; if (i < 0) continue;
        const id = j * n + i;
        if (L.rootChild[id] >= 0) continue;               // refined: painted from its leaves below
        if (s.outcome[id] !== NOT_COMPUTED) { u32[py * W + px] = colourOf(id); continue; }
        // not yet calculated in this layer
        let prev = -1;
        if (opt.preview) for (let l = 1; l <= L.maxLevel; l++) { const m = (1 << l) - 1; const aid = (j & ~m) * n + (i & ~m); if (s.outcome[aid] !== NOT_COMPUTED && levelOfCell(i & ~m, j & ~m, L.maxLevel) >= l) { prev = aid; break; } }
        if (prev >= 0) u32[py * W + px] = dim(colourOf(prev));
        else if (!isBase) u32[py * W + px] = dim(u32[py * W + px]);
        else u32[py * W + px] = opt.hatch && ((px + py) & 7) === 0 ? hatchCol : bg;
      }
    }
    // refined leaves
    for (let k = 0; k < L.nodeCount; k++) {
      if (L.nChild[k] >= 0) continue;
      const cx = L.nCx[k], cy = L.nCy[k], hw = L.nHw[k], hh = L.nHh[k];
      const x0 = Math.max(0, Math.floor(((cx - hw - view.x0) / vw) * W)), x1 = Math.min(W, Math.ceil(((cx + hw - view.x0) / vw) * W));
      const y0 = Math.max(0, Math.floor(((view.y1 - cy - hh) / vh) * H)), y1 = Math.min(H, Math.ceil(((view.y1 - cy + hh) / vh) * H));
      if (x1 <= x0 || y1 <= y0) continue;
      const id = L.nSample[k]; const done = s.outcome[id] !== NOT_COMPUTED;
      const c = done ? colourOf(id) : 0;
      for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) u32[py * W + px] = done ? c : dim(u32[py * W + px]);
    }
  }
  return img;
}

export const EDGE_COLOURS: Record<number, string> = { 1: '#ffffff', 2: '#ff3df2', 4: '#ffd43b', 8: '#69db7c', 32: '#ff6b6b' };

/** Draw boundary-edge segments (perpendicular bars at the midpoint between two neighbouring samples). */
export function drawEdges(ctx: CanvasRenderingContext2D, lab: Lab, L: Layer, view: Rect, W: number, H: number, ox = 0, oy = 0, lw = 1.2): void {
  const e = lab.edges(L), s = L.store, vw = view.x1 - view.x0, vh = view.y1 - view.y0;
  ctx.save(); ctx.lineWidth = lw; ctx.lineCap = 'butt';
  for (const bit of [1, 2, 4, 8, 32]) {
    ctx.strokeStyle = EDGE_COLOURS[bit]; ctx.globalAlpha = bit === 1 ? 0.85 : 0.9; ctx.beginPath();
    let drawn = 0;
    for (let q = 0; q < e.n; q++) {
      const k = e.kind[q];
      // draw each edge once, in its highest-priority colour (outcome > collision/ejection > time > close > numeric)
      const top = k & 1 ? 1 : k & 2 ? 2 : k & 4 ? 4 : k & 8 ? 8 : k & 32 ? 32 : 0;
      if (top !== bit) continue;
      const ax = s.X[e.a[q]], ay = s.Y[e.a[q]], bx = s.X[e.b[q]], by = s.Y[e.b[q]];
      const horizNeighbours = Math.abs(bx - ax) / vw >= Math.abs(by - ay) / vh; // neighbours side by side: the dividing bar is vertical
      const px = ox + ((e.mx[q] - view.x0) / vw) * W, py = oy + ((view.y1 - e.my[q]) / vh) * H;
      if (px < ox - 2 || px > ox + W + 2 || py < oy - 2 || py > oy + H + 2) continue;
      const span = horizNeighbours ? Math.max(2, (Math.abs(by - ay) || L.dy) / vh * H) : Math.max(2, (Math.abs(bx - ax) || L.dx) / vw * W);
      const half = Math.min(span, 40) / 2;
      if (horizNeighbours) { ctx.moveTo(px, py - half); ctx.lineTo(px, py + half); } else { ctx.moveTo(px - half, py); ctx.lineTo(px + half, py); }
      if (++drawn > 150000) break;
    }
    ctx.stroke();
  }
  ctx.restore();
}

// axes ------------------------------------------------------------------------------------------
export function niceTicks(lo: number, hi: number, target = 7): number[] {
  const span = hi - lo; if (!(span > 0)) return [lo];
  const raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
  const out: number[] = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}
export function fmtTick(v: number, span: number): string {
  if (v === 0) return '0';
  const dec = Math.max(0, 1 - Math.floor(Math.log10(span / 7)));
  if (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e6) return v.toExponential(2);
  return v.toFixed(Math.min(12, dec)).replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m));
}

export function drawAxes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, view: Rect, xl: string, yl: string, colour = '#9fb0c8', font = '12px system-ui, sans-serif'): void {
  ctx.save(); ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.font = font; ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  for (const t of niceTicks(view.x0, view.x1)) { const px = x + ((t - view.x0) / (view.x1 - view.x0)) * w; ctx.beginPath(); ctx.moveTo(px, y + h); ctx.lineTo(px, y + h + 4); ctx.stroke(); ctx.fillText(fmtTick(t, view.x1 - view.x0), px, y + h + 6); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const t of niceTicks(view.y0, view.y1)) { const py = y + h - ((t - view.y0) / (view.y1 - view.y0)) * h; ctx.beginPath(); ctx.moveTo(x - 4, py); ctx.lineTo(x, py); ctx.stroke(); ctx.fillText(fmtTick(t, view.y1 - view.y0), x - 7, py); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(xl, x + w / 2, y + h + 38);
  ctx.save(); ctx.translate(x - 50, y + h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'top'; ctx.fillText(yl, 0, -6); ctx.restore();
  ctx.restore();
}
