import { useState } from 'react';
import type { Lab } from '../lab.ts';
import { DEFAULT_TOL_SCALES } from '../validation.ts';
import { VALID, VALID_LABELS, NOT_COMPUTED } from '../store.ts';
import { outcomeText } from '../outcomes.ts';
import { OUT } from '../simulate.ts';
import { useLab } from './hooks.ts';
import { NumInput } from './NumInput.tsx';
import { downloadBlob, validationReport } from '../export.ts';

export function ValidationPanel({ lab }: { lab: Lab }) {
  useLab(lab, ['validation', 'layers', 'config', 'progress']);
  const [n, setN] = useState(100);
  const L = lab.cur, s = L.store;
  const e = lab.edges(L);
  const boundary = new Set<number>(); for (let q = 0; q < e.n; q++) if (e.kind[q] & (1 | 2 | 4)) { boundary.add(e.a[q]); boundary.add(e.b[q]); }
  const counts = new Array(6).fill(0); let untested = 0;
  boundary.forEach((id) => { if (s.outcome[id] === NOT_COMPUTED || s.outcome[id] === OUT.FAILED) return; counts[s.valid[id]]++; if (s.valid[id] === 0) untested++; });
  const recent = lab.validations.slice(-8).reverse();
  return (
    <div className="panel-body">
      <h3>Numerical confidence</h3>
      <p className="hint">Selected boundary samples are re-run at the baseline tolerance and at <b>10× and 100× tighter</b> tolerances (rtol {lab.applied.numerics.rtol} → {(lab.applied.numerics.rtol * 0.01).toExponential(0)}). Agreement is a numerical <b>diagnostic, not a proof</b>; untested samples stay visibly untested (map mode “Numerical reliability”).</p>
      <div className="grid2"><NumInput label="max samples to test" value={n} onCommit={(v) => { const c = Math.max(1, Math.min(2000, Math.round(v))); setN(c); return { value: c }; }} /></div>
      <div className="btnrow">
        <button className="primary" onClick={() => lab.validate(lab.untestedBoundary(lab.cur, n))} disabled={untested === 0}>Validate boundary samples ({Math.min(n, untested)})</button>
        <button onClick={() => downloadBlob(new Blob([validationReport(lab)], { type: 'application/json' }), 'validation-report.json')}>Export report</button>
      </div>
      <table className="data compact">
        <thead><tr><th>Boundary samples in current layer ({boundary.size.toLocaleString()})</th><th>count</th></tr></thead>
        <tbody>
          <tr><td>untested</td><td>{counts[VALID.UNTESTED].toLocaleString()}</td></tr>
          {[VALID.AGREE, VALID.OUTCOME_DIFFERS, VALID.RESOLUTION_CHANGE, VALID.EVENT_DISCREPANCY, VALID.SOLVER_FAILURE].map((k) => <tr key={k}><td>{VALID_LABELS[k]}</td><td>{counts[k].toLocaleString()}</td></tr>)}
        </tbody>
      </table>
      <p className="hint">Total validation records: {lab.validations.length.toLocaleString()}. “Different classified outcomes”, “resolved/unresolved change”, “collision/event discrepancy” and “solver failures” are recorded separately. Tolerances tested: ×{DEFAULT_TOL_SCALES.join(', ×')}.</p>
      {recent.length ? <><h4>Latest records</h4><table className="data compact"><thead><tr><th>{lab.applied.axes.varX}</th><th>{lab.applied.axes.varY}</th><th>status</th><th>baseline → tightest</th></tr></thead>
        <tbody>{recent.map((r, i) => <tr key={i} className="click" onClick={() => lab.select(r.layerId, r.sampleId)}><td className="mono">{r.x.toPrecision(7)}</td><td className="mono">{r.y.toPrecision(7)}</td><td>{VALID_LABELS[r.status]}</td><td>{outcomeText(r.runs[0].outcome)} → {outcomeText(r.runs[r.runs.length - 1].outcome)}</td></tr>)}</tbody></table></> : null}
      <h4>Independent reference</h4>
      <p className="hint">Select a sample and use “Compare with independent reference solver” in the Sample tab. It re-integrates the identical initial condition with a different algorithm (Gragg–Bulirsch–Stoer extrapolation) and a separate acceleration routine, and reports actual differences at common times. Chaotic divergence eventually limits detailed agreement even when short-time convergence is excellent.</p>
    </div>
  );
}
