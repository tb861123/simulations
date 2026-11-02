// Persistence: portable versioned investigation files + IndexedDB storage.
//
// Reproducibility on resume: integrator checkpoints store the full state, the next step size, the
// "last step rejected" flag, the escape-persistence counters and the close-encounter hysteresis
// flags.  Continuing from a checkpoint repeats the exact same floating-point operations as a
// straight run, so it is BITWISE identical on the same JavaScript engine and platform.  Across
// different browsers/CPUs, Math.pow/Math.sqrt rounding can differ in the last bit, so results are
// then reproducible only within the integration tolerance (and chaotic trajectories can diverge
// eventually).  Imported files are restored PAUSED.
import { APP_VERSION, MODEL_VERSION, PARAM_DEFS, validateNumerics, validatePhysics, AXIS_VAR_IDS, type AxisSpec, type Numerics, type Physics } from './initial.ts';
import type { LayerState, Rect } from './store.ts';
import { NOT_COMPUTED } from './store.ts';
import type { ValidationRecord } from './validation.ts';
import type { Appearance } from './outcomes.ts';
import { CK_LEN } from './simulate.ts';

export const SCHEMA_VERSION = 1;
export const MAX_SAMPLES_IMPORT = 4_000_000;

export interface SavedRegion { name: string; rect: Rect }
export interface Snapshot {
  schema: number; app: string; model: string; savedAt: string; name: string; note: string;
  config: { physics: Physics; numerics: Numerics; axes: AxisSpec; resolution: number; presetId: string };
  layers: LayerState[]; currentLayerId: number; nextLayerId: number;
  view: Rect; history: { views: Rect[]; index: number }; savedRegions: SavedRegion[];
  selection: { layerId: number; sampleId: number } | null;
  validations: ValidationRecord[];
  explore: { settings: any; extraUsed: number; supCounter: number; rounds: number };
  weights: any; boundary: any; appearance: Appearance;
  mapMode: string; frame: string;
}

// ---------------------------------------------------------------------------------------------
// Typed-array <-> JSON codec (little-endian binary, base64)
// ---------------------------------------------------------------------------------------------
const CTORS: Record<string, any> = { F64: Float64Array, F32: Float32Array, U8: Uint8Array, U16: Uint16Array, U32: Uint32Array, I32: Int32Array };
function tag(a: ArrayBufferView): string | null {
  if (a instanceof Float64Array) return 'F64'; if (a instanceof Float32Array) return 'F32'; if (a instanceof Uint8Array) return 'U8';
  if (a instanceof Uint16Array) return 'U16'; if (a instanceof Uint32Array) return 'U32'; if (a instanceof Int32Array) return 'I32'; return null;
}
export function bytesToB64(u8: Uint8Array): string {
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH) as unknown as number[]);
  return btoa(s);
}
export function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64); const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}
export const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/** JSON.stringify replacer turning typed arrays into {__t, n, b64}. */
export function encodeReplacer(_k: string, v: any): any {
  if (ArrayBuffer.isView(v)) {
    const t = tag(v as ArrayBufferView);
    if (t) { const a = v as any; return { __t: t, n: a.length, b64: bytesToB64(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)) }; }
  }
  if (typeof v === 'number' && !Number.isFinite(v)) return { __num: Number.isNaN(v) ? 'NaN' : v > 0 ? 'Inf' : '-Inf' };
  return v;
}
export function decodeReviver(_k: string, v: any): any {
  if (v && typeof v === 'object') {
    if (typeof v.__t === 'string' && CTORS[v.__t] && typeof v.b64 === 'string') {
      const bytes = b64ToBytes(v.b64); const C = CTORS[v.__t];
      if (bytes.length !== v.n * C.BYTES_PER_ELEMENT) throw new Error('typed array length mismatch');
      const copy = new Uint8Array(bytes.length); copy.set(bytes);
      return new C(copy.buffer);
    }
    if (typeof v.__num === 'string') return v.__num === 'NaN' ? NaN : v.__num === 'Inf' ? Infinity : -Infinity;
  }
  return v;
}

export async function snapshotToBlob(s: Snapshot, compress = true): Promise<Blob> {
  const text = JSON.stringify(s, encodeReplacer);
  const raw = new TextEncoder().encode(text);
  if (compress && typeof CompressionStream !== 'undefined') {
    const cs = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Blob([await new Response(cs).arrayBuffer()], { type: 'application/gzip' });
  }
  return new Blob([raw], { type: 'application/json' });
}

export async function bytesToSnapshot(buf: ArrayBuffer): Promise<{ snapshot?: Snapshot; errors: string[] }> {
  let u8 = new Uint8Array(buf);
  try {
    if (u8[0] === 0x1f && u8[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') return { errors: ['This browser cannot decompress .gz investigation files.'] };
      const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
      u8 = new Uint8Array(await new Response(ds).arrayBuffer());
    }
    const raw = JSON.parse(new TextDecoder().decode(u8), decodeReviver);
    return checkSnapshot(raw);
  } catch (e) { return { errors: ['Could not read the file: ' + String((e as Error)?.message ?? e)] }; }
}

// ---------------------------------------------------------------------------------------------
// Validation and migration
// ---------------------------------------------------------------------------------------------
const isRect = (r: any): boolean => r && ['x0', 'x1', 'y0', 'y1'].every((k) => Number.isFinite(r[k])) && r.x1 > r.x0 && r.y1 > r.y0;

/** Bring older files up to the current schema (fills optional sections).  Returns null if unsupported. */
export function migrate(raw: any): any | null {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.schema)) return null;
  if (raw.schema > SCHEMA_VERSION || raw.schema < 1) return null;
  const s = { ...raw };
  // schema 1 is the first public format; migrations for later versions would be chained here.
  s.validations ??= []; s.savedRegions ??= []; s.note ??= ''; s.name ??= 'imported';
  s.history ??= { views: [s.view], index: 0 }; s.selection ??= null; s.mapMode ??= 'outcome'; s.frame ??= 'com';
  s.explore ??= { settings: null, extraUsed: 0, supCounter: 0, rounds: 0 };
  s.weights ??= null; s.boundary ??= null; s.appearance ??= null;
  return s;
}

export function checkSnapshot(rawIn: any): { snapshot?: Snapshot; errors: string[] } {
  const errors: string[] = [];
  if (rawIn && typeof rawIn.schema === 'number' && rawIn.schema > SCHEMA_VERSION) return { errors: [`File schema ${rawIn.schema} was written by a newer version of the lab (this build reads schema ≤ ${SCHEMA_VERSION}).`] };
  const raw = migrate(rawIn);
  if (!raw) return { errors: ['Not a Three-Body Chaos Lab investigation file (missing or unsupported schema).'] };
  if (raw.model !== MODEL_VERSION) return { errors: [`Computed with model version “${raw.model}”; this build uses “${MODEL_VERSION}”. Classifications from a different model are not imported silently.`] };
  const c = raw.config;
  if (!c || !c.physics || !c.numerics || !c.axes) return { errors: ['Configuration missing.'] };
  const p: Physics = c.physics, nu: Numerics = c.numerics, ax: AxisSpec = c.axes;
  try {
    const pe = validatePhysics(p); errors.push(...pe.map((e) => 'Physics: ' + e));
  } catch (e) { errors.push('Physics block malformed.'); }
  errors.push(...validateNumerics(nu).map((e) => 'Numerics: ' + e));
  if (![ax.varX, ax.varY].every((v) => PARAM_DEFS[v] && AXIS_VAR_IDS(p.mode).includes(v)) || ax.varX === ax.varY) errors.push('Axis variables are not valid for this setup.');
  if (![ax.minX, ax.maxX, ax.minY, ax.maxY].every(Number.isFinite) || !(ax.maxX > ax.minX) || !(ax.maxY > ax.minY)) errors.push('Axis ranges invalid.');
  if (!Array.isArray(raw.layers) || raw.layers.length === 0 || raw.layers.length > 64) errors.push('Layer list missing or too long.');
  let total = 0;
  for (const L of raw.layers ?? []) {
    const where = `Layer ${L?.id}: `;
    if (!L || !isRect(L.rect) || !Number.isInteger(L.n) || L.n < 2 || L.n > 1000) { errors.push(where + 'geometry invalid.'); continue; }
    const cnt = L.count, nn = L.n * L.n;
    if (!Number.isInteger(cnt) || cnt < nn || cnt > MAX_SAMPLES_IMPORT) { errors.push(where + 'sample count invalid.'); continue; }
    total += cnt;
    const lens: [string, any, number, any][] = [['X', L.X, cnt, Float64Array], ['Y', L.Y, cnt, Float64Array], ['tEnd', L.tEnd, cnt, Float64Array], ['tOn', L.tOn, cnt, Float32Array], ['minD', L.minD, cnt, Float32Array],
      ['eErr', L.eErr, cnt, Float32Array], ['exch', L.exch, cnt, Float32Array], ['sens', L.sens, cnt, Float32Array], ['outcome', L.outcome, cnt, Uint8Array], ['fail', L.fail, cnt, Uint8Array], ['flags', L.flags, cnt, Uint8Array],
      ['minPair', L.minPair, cnt, Uint8Array], ['valid', L.valid, cnt, Uint8Array], ['depth', L.depth, cnt, Uint8Array], ['nClose', L.nClose, cnt, Uint16Array], ['steps', L.steps, cnt, Uint32Array],
      ['rootChild', L.rootChild, nn, Int32Array]];
    let bad = false;
    for (const [nm, arr, len, C] of lens) if (!(arr instanceof C) || arr.length !== len) { errors.push(where + `array ${nm} has wrong type or length.`); bad = true; }
    const k = L.nodeCount;
    if (!Number.isInteger(k) || k < 0 || k % 4 !== 0) { errors.push(where + 'node count invalid.'); bad = true; }
    for (const [nm, arr, C] of [['nCx', L.nCx, Float64Array], ['nCy', L.nCy, Float64Array], ['nHw', L.nHw, Float64Array], ['nHh', L.nHh, Float64Array], ['nDepth', L.nDepth, Uint8Array], ['nParent', L.nParent, Int32Array], ['nChild', L.nChild, Int32Array], ['nSample', L.nSample, Int32Array]] as [string, any, any][])
      if (!(arr instanceof C) || arr.length !== k) { errors.push(where + `array ${nm} has wrong type or length.`); bad = true; }
    if (!(L.ckIds instanceof Int32Array) || !(L.ck instanceof Float64Array) || L.ck.length !== L.ckIds.length * CK_LEN) { errors.push(where + 'checkpoint table malformed.'); bad = true; }
    if (bad) continue;
    const r: Rect = L.rect; const eps = 1e-9 * (r.x1 - r.x0 + r.y1 - r.y0);
    for (let i = 0; i < cnt; i++) {
      if (!Number.isFinite(L.X[i]) || !Number.isFinite(L.Y[i]) || L.X[i] < r.x0 - eps || L.X[i] > r.x1 + eps || L.Y[i] < r.y0 - eps || L.Y[i] > r.y1 + eps) { errors.push(where + `sample ${i} lies outside the layer or is not finite.`); break; }
      const o = L.outcome[i];
      if (o !== NOT_COMPUTED && o > 8) { errors.push(where + `sample ${i} has an invalid outcome code.`); break; }
      if (o !== NOT_COMPUTED && !Number.isFinite(L.tEnd[i])) { errors.push(where + `sample ${i} has a non-finite end time.`); break; }
    }
    for (let i = 0; i < nn; i++) if (L.rootChild[i] >= k || L.rootChild[i] < -1) { errors.push(where + 'quadtree root index out of range.'); break; }
    for (let i = 0; i < k; i++) {
      if (L.nChild[i] >= k || L.nChild[i] < -1 || L.nSample[i] < 0 || L.nSample[i] >= cnt || !(L.nHw[i] > 0) || !(L.nHh[i] > 0)) { errors.push(where + `quadtree node ${i} invalid.`); break; }
    }
    for (let q = 0; q < L.ckIds.length; q++) if (L.ckIds[q] < 0 || L.ckIds[q] >= cnt) { errors.push(where + 'checkpoint refers to a missing sample.'); break; }
    for (let q = 0; q < L.ck.length; q++) if (!Number.isFinite(L.ck[q]) && ![13, 14].includes(q % CK_LEN)) { errors.push(where + 'checkpoint contains a non-finite value.'); break; }
  }
  if (total > MAX_SAMPLES_IMPORT) errors.push(`Too many samples in total (${total}).`);
  if (!raw.layers?.some((L: any) => L.id === raw.currentLayerId)) errors.push('Current layer is missing.');
  if (errors.length) return { errors };
  return { snapshot: raw as Snapshot, errors: [] };
}

// ---------------------------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------------------------
const DB_NAME = 'three-body-chaos-lab', STORE = 'investigations', META = 'meta';
export const AUTOSAVE_NAME = '__autosave__';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is not available in this browser context.')); return; }
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => { const db = rq.result; db.createObjectStore(STORE, { keyPath: 'name' }); db.createObjectStore(META, { keyPath: 'name' }); };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error ?? new Error('IndexedDB open failed'));
    rq.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

export interface SaveReport { ok: boolean; message: string; ms: number }
export interface SavedMeta { name: string; savedAt: string; samples: number; layers: number; preset: string; note: string }

/** Store a snapshot.  Resolves only after the transaction has COMPLETED (or reports its error / abort). */
export async function idbSave(snap: Snapshot): Promise<SaveReport> {
  const t0 = performance.now();
  try {
    const db = await openDb();
    return await new Promise<SaveReport>((resolve) => {
      const tx = db.transaction([STORE, META], 'readwrite');
      const samples = snap.layers.reduce((s, l) => s + l.count, 0);
      tx.objectStore(STORE).put(snap);
      tx.objectStore(META).put({ name: snap.name, savedAt: snap.savedAt, samples, layers: snap.layers.length, preset: snap.config.presetId, note: snap.note } as SavedMeta);
      tx.oncomplete = () => { db.close(); resolve({ ok: true, message: `Saved “${snap.name}” (${samples.toLocaleString()} samples) to IndexedDB`, ms: performance.now() - t0 }); };
      tx.onerror = () => { db.close(); resolve({ ok: false, message: 'Save failed: ' + (tx.error?.message ?? 'transaction error'), ms: performance.now() - t0 }); };
      tx.onabort = () => { db.close(); resolve({ ok: false, message: 'Save aborted: ' + (tx.error?.message ?? 'quota exceeded or storage unavailable'), ms: performance.now() - t0 }); };
    });
  } catch (e) { return { ok: false, message: 'Save failed: ' + String((e as Error)?.message ?? e), ms: performance.now() - t0 }; }
}

export async function idbLoad(name: string): Promise<{ snapshot?: Snapshot; errors: string[] }> {
  try {
    const db = await openDb();
    const raw = await new Promise<any>((resolve, reject) => { const rq = db.transaction(STORE).objectStore(STORE).get(name); rq.onsuccess = () => resolve(rq.result); rq.onerror = () => reject(rq.error); });
    db.close();
    if (!raw) return { errors: [`No saved investigation called “${name}”.`] };
    return checkSnapshot(raw);
  } catch (e) { return { errors: ['Load failed: ' + String((e as Error)?.message ?? e)] }; }
}

export async function idbList(): Promise<SavedMeta[]> {
  try {
    const db = await openDb();
    const all = await new Promise<SavedMeta[]>((resolve, reject) => { const rq = db.transaction(META).objectStore(META).getAll(); rq.onsuccess = () => resolve(rq.result); rq.onerror = () => reject(rq.error); });
    db.close();
    return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch { return []; }
}

export async function idbDelete(name: string): Promise<boolean> {
  try {
    const db = await openDb();
    const ok = await new Promise<boolean>((resolve) => { const tx = db.transaction([STORE, META], 'readwrite'); tx.objectStore(STORE).delete(name); tx.objectStore(META).delete(name); tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false); tx.onabort = () => resolve(false); });
    db.close(); return ok;
  } catch { return false; }
}

export const FILE_VERSION_INFO = { schema: SCHEMA_VERSION, app: APP_VERSION, model: MODEL_VERSION };
