import { useRef, useState } from 'react';
import type { Lab } from '../lab.ts';
import { BATCH_EXPS, batchCSV, runBatch, type BatchExp, type BatchResult } from '../batch.ts';
import { downloadBlob } from '../export.ts';
import { Plot } from './Plot.tsx';

/** Batch run overlay: one-click experiments that run many real simulations headlessly. */
export function BatchPanel({ lab, onClose }: { lab: Lab; onClose: () => void }) {
  const [exp, setExp] = useState<BatchExp>(BATCH_EXPS[0]);
  const [runs, setRuns] = useState(exp.runs), [samples, setSamples] = useState(exp.samples), [seed, setSeed] = useState('2024');
  const [res, setRes] = useState<BatchResult | null>(null), [busy, setBusy] = useState(false), [status, setStatus] = useState('Ready');
  const stop = useRef(false);
  const pick = (e: BatchExp) => { setExp(e); setRuns(e.runs); setSamples(e.samples); setRes(null); setStatus('Ready'); };
  const run = async () => {
    stop.current = false; setBusy(true); setRes(null); const t0 = performance.now();
    try {
      const r = await runBatch(exp, { runs, samples, seed: Number(seed) || 1 }, (req) => lab.runBatchRequest(req), (d, t, txt) => setStatus(`Running… ${txt} (${d}/${t})`), () => stop.current);
      setRes(r); setStatus(`${stop.current ? 'Stopped' : 'Done'} in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${r.rows.length} rows`);
    } catch (e) { setStatus('Error: ' + String((e as Error).message ?? e)); }
    setBusy(false);
  };
  const o = { runs, samples, seed: Number(seed) || 1 };
  const plotX = res?.plot.x ?? [];
  return (
    <div className="overlay" role="dialog" aria-label="Batch run">
      <div className="batch" data-batchbox="">
        <div className="bhead"><h2>Batch run</h2><span className="seg"><button className={exp.mode === 'repeat' ? 'on' : ''} tabIndex={-1}>Repeat</button><button className={exp.mode === 'sweep' ? 'on' : ''} tabIndex={-1}>Sweep</button></span><span className="grow" /><button onClick={onClose} aria-label="Close batch run">✕</button></div>
        <p className="hint">Runs many real simulations headlessly on the worker pool (default scattering set-up; this does not change your map). Every experiment uses fixed seeds, so results are reproducible.</p>
        <div className="exps">{BATCH_EXPS.map((e) => <button key={e.id} className={e.id === exp.id ? 'exp on' : 'exp'} onClick={() => pick(e)}><b>{e.title}</b><span>{e.sub}</span></button>)}</div>
        <div className="bset">
          {exp.mode === 'repeat' ? <label>Runs <select id="bRuns" value={runs} onChange={(e) => setRuns(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label> : null}
          <label>Simulations per {exp.mode === 'repeat' ? 'run' : 'setting'} <select id="bSamples" value={samples} onChange={(e) => setSamples(+e.target.value)}>{[20, 40, 60, 100, 200].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Seed <input id="bSeed" value={seed} onChange={(e) => setSeed(e.target.value)} size={8} /></label>
          <span className="grow" />
          <button id="bRun" className="primary" onClick={run} disabled={busy}>▶ Run batch</button>
          <button id="bStop" onClick={() => { stop.current = true; }} disabled={!busy}>■ Stop</button>
          <button id="bCsv" onClick={() => res && downloadBlob(new Blob([batchCSV(exp, res, o)], { type: 'text/csv' }), `batch-${exp.id}.csv`)} disabled={!res || !res.rows.length}>⬇ Download CSV</button>
        </div>
        <div id="bStatus" className="status">{status}</div>
        {res ? (
          <div className="bres">
            <Plot series={[{ label: 'simulation (mean' + (exp.mode === 'sweep' ? ' ± SE' : '') + ')', colour: '#74c0fc', x: plotX, y: res.plot.mean }, ...(res.plot.theory ? [{ label: exp.theoryLabel, colour: '#ffd43b', x: plotX, y: res.plot.theory, dash: [5, 3] }] : []), ...(exp.mode === 'sweep' ? [{ label: 'mean + SE', colour: '#4c6a8f', x: plotX, y: res.plot.mean.map((m, i) => m + res.plot.se[i]) }, { label: 'mean − SE', colour: '#4c6a8f', x: plotX, y: res.plot.mean.map((m, i) => m - res.plot.se[i]) }] : [])]} xLabel={res.plot.xLabel} yLabel={exp.yLabel.slice(0, 40)} log={exp.logy} height={220} />
            <ul className="bsum">{res.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="btable"><table className="data compact"><thead><tr>{res.header.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{res.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{typeof v === 'number' ? (Number.isFinite(v) ? (Math.abs(v) < 1e-3 && v !== 0 || Math.abs(v) >= 1e5 ? v.toExponential(3) : Number(v.toPrecision(5))) : '') : v}</td>)}</tr>)}</tbody></table></div>
          </div>
        ) : null}
        <div id="bnote" className="bnote">{res ? exp.note : 'Pick an experiment above and press Run. ' + exp.note}</div>
      </div>
    </div>
  );
}
