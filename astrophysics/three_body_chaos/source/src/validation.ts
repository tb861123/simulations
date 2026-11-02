// Numerical-confidence bookkeeping.  A boundary sample is re-run at the baseline tolerance and at
// tighter ones (default: 10x and 100x tighter); the classification of the runs is compared.
// Agreement is a numerical DIAGNOSTIC: it does not prove the result is right, and chaotic
// trajectories can disagree at any tolerance if run long enough.
import { OUT } from './simulate.ts';
import { VALID } from './store.ts';

export interface RunLite { outcome: number; fail: number; tEnd: number; tOnset: number; flags: number }
export const DEFAULT_TOL_SCALES = [1, 0.1, 0.01];

export interface ValidationRecord {
  layerId: number; sampleId: number; x: number; y: number; scales: number[]; runs: RunLite[]; status: number;
  /** wall-clock time of the test, ISO string */ when: string;
}

const isCol = (o: number): boolean => o >= OUT.COL_AB && o <= OUT.COL_BC;

/** Classify agreement between the baseline (runs[0]) and the tighter runs. */
export function classifyAgreement(runs: RunLite[]): number {
  if (runs.some((r) => r.outcome === OUT.FAILED)) return VALID.SOLVER_FAILURE;
  const base = runs[0];
  for (const r of runs.slice(1)) {
    if (r.outcome !== base.outcome) {
      const bu = base.outcome === OUT.UNRESOLVED, ru = r.outcome === OUT.UNRESOLVED;
      return bu !== ru ? VALID.RESOLUTION_CHANGE : VALID.OUTCOME_DIFFERS;
    }
  }
  for (const r of runs.slice(1)) {
    if (base.outcome === OUT.UNRESOLVED) continue;
    const rel = Math.abs(r.tEnd - base.tEnd) / Math.max(1, Math.abs(base.tEnd));
    // a located collision should repeat to ~3 digits; an accepted escape time is quantised by the step grid, so allow 10 %
    if (isCol(base.outcome) ? rel > 1e-3 : rel > 0.1) return VALID.EVENT_DISCREPANCY;
  }
  return VALID.AGREE;
}
