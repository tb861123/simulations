// Message types exchanged between the main thread and compute workers.
import type { Numerics, Physics } from './initial.ts';
import type { ResultColumns } from './store.ts';
import type { Trace } from './simulate.ts';

export interface JobConfig { physics: Physics; numerics: Numerics; varX: string; varY: string }

export type Request =
  | { kind: 'batch'; rid: number; cfg: JobConfig; horizon: number; ids: Int32Array; xs: Float64Array; ys: Float64Array; wantCk: boolean; ck?: Float64Array; hasCk?: Uint8Array; tolScale?: number; varZ?: string; zs?: Float64Array }
  | { kind: 'trajectory'; rid: number; cfg: JobConfig; overrides: Record<string, number>; horizon: number; dtOut: number; tolScale?: number }
  | { kind: 'reference'; rid: number; cfg: JobConfig; overrides: Record<string, number>; horizon: number; nTimes: number; rtol: number; atol: number }
  | { kind: 'validate'; rid: number; cfg: JobConfig; horizon: number; ids: Int32Array; xs: Float64Array; ys: Float64Array; scales: number[] }
  | { kind: 'sensitivity'; rid: number; cfg: JobConfig; horizon: number; ids: Int32Array; xs: Float64Array; ys: Float64Array; dx: number; nLadder: number };

export interface RunSummary { outcome: number; fail: number; flags: number; tEnd: number; tOnset: number; minDist: number; minPair: number; nClose: number; eErr: number; steps: number; exchange: number; escaper: number; yEnd: Float64Array }

export type Response =
  | { kind: 'batch'; rid: number; cols: ResultColumns; ms: number }
  | { kind: 'trajectory'; rid: number; y0: Float64Array; m: Float64Array; r: Float64Array; G: number; trace: Trace; summary: RunSummary; ms: number }
  | { kind: 'reference'; rid: number; times: Float64Array; main: Float64Array; ref: Float64Array; mainSummary: RunSummary; refTEnd: number; refContactPair: number; refTContact: number; refOk: boolean; refMessage: string; refSteps: number; refCascade: boolean; ms: number }
  | { kind: 'validate'; rid: number; ids: Int32Array; scales: number[]; outcome: Uint8Array; fail: Uint8Array; flags: Uint8Array; tEnd: Float64Array; tOnset: Float32Array; ms: number }
  | { kind: 'sensitivity'; rid: number; ids: Int32Array; sens: Float32Array; ms: number }
  | { kind: 'error'; rid: number; message: string };
