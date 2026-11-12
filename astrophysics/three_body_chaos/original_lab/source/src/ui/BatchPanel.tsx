import { useMemo, useRef, useState } from 'react';
import type { Lab } from '../lab.ts';
import { BATCH_EXPS, BDEF, BOPTS, BOUTS, BVARS, batchCSV, clampVar, runBatch, varName, type BatchResult, type BatchSpec, type OutKey, type Settings } from '../batch.ts';
import { downloadBlob } from '../export.ts';
import { Plot } from './Plot.tsx';

/** The batch settings table: every starting value (as typed), the ticked setting and its sweep range. */
interface Table { vals: Record<string, string>; opts: Record<string, string>; vary: string | null; from: string; to: string; kind: '+' | '×'; step: string; exact: number[] | null }
const nice = (v: number): number => (v === 0 || !Number.isFinite(v) ? v : +(+v).toPrecision(4));
const disp = (v: number | string): string => (typeof v === 'number' && Number.isFinite(v) && v !== 0 ? String(+v.toPrecision(10)) : String(v));
const fmt = (v: number | string): string | number => (typeof v === 'number' ? (Number.isFinite(v) ? (Math.abs(v) < 1e-3 && v !== 0 || Math.abs(v) >= 1e5 ? v.toExponential(3) : Number(v.toPrecision(5))) : '') : v);

function tableFrom(p: Settings, e?: { v?: string; xs?: number[]; logx?: boolean }): Table {
  const t: Table = { vals: {}, opts: {}, vary: null, from: '', to: '', kind: '+', step: '', exact: null };
  for (const k of Object.keys(BVARS)) t.vals[k] = disp(p[k]);
  for (const O of BOPTS) t.opts[O.k] = String(p[O.k]);
  if (e && e.v && e.xs) {
    const xs = e.xs, a = xs[0], b = xs[xs.length - 1];
    t.vary = e.v; t.exact = xs.slice(); t.from = disp(a); t.to = disp(b);
    if (e.logx) { const r = Math.pow(b / a, 1 / (xs.length - 1)); t.kind = '×'; t.step = disp(nice(r >= 1 ? r : 1 / r)); }
    else { t.kind = '+'; t.step = disp(nice(Math.abs(b - a) / (xs.length - 1))); }
  }
  return t;
}
/** The values the ticked setting takes: from, from+step, … (or from, from×step, …) up to "to"; at most 60. */
function sweepValues(t: Table): number[] {
  if (!t.vary) return [];
  if (t.exact) return t.exact.slice();             // an experiment's own values, until the range is edited
  const from = +t.from, to = +t.to, up = to >= from, out: number[] = [];
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  if (t.kind === '×') {
    let f = Math.abs(+t.step); if (!(f > 1) || from <= 0 || to <= 0) return [from];
    if (!up) f = 1 / f;
    for (let v = from, i = 0; i < 60 && (up ? v <= to * 1.01 : v >= to * 0.99); i++, v *= f) out.push(nice(v));
  } else {
    let d = Math.abs(+t.step); if (!(d > 0)) return [from];
    if (!up) d = -d;
    for (let i = 0; i < 60; i++) { const v = from + i * d; if (up ? v > to + 1e-3 * Math.abs(d) : v < to - 1e-3 * Math.abs(d)) break; out.push(nice(v)); }
  }
  const vals = out.map((v) => clampVar(t.vary!, v));
  return vals.filter((v, i) => i === 0 || v !== vals[i - 1]);
}
/** A sensible first range when a setting is ticked. */
function startVary(t: Table, k: string): Table {
  const V = BVARS[k], cur = +t.vals[k];
  if (cur > 0 && cur < 1e-2) return { ...t, vary: k, exact: null, kind: '×', from: disp(nice(Math.max(V.min, cur / 100))), to: disp(nice(Math.min(V.max, cur * 100))), step: '10' };   // tiny numbers: powers of ten
  let from: number, to: number;
  if (cur > 0) { from = nice(Math.max(V.min, cur / 2)); to = nice(Math.min(V.max, cur * 2)); } else if (cur < 0) { from = nice(Math.max(V.min, cur * 2)); to = nice(Math.min(V.max, cur / 2)); } else { from = V.min; to = nice(Math.min(V.max, V.min + 1)); }
  let step = nice((to - from) / 4); if (V.int) step = Math.max(1, Math.round(step));
  return { ...t, vary: k, exact: null, kind: '+', from: disp(from), to: disp(to), step: disp(step) };
}

/** Batch run overlay: one-click experiments, or your own, that run many real simulations headlessly. */
export function BatchPanel({ lab, onClose }: { lab: Lab; onClose: () => void }) {
  const first = BATCH_EXPS[0];
  const [expI, setExpI] = useState(0);
  const [mode, setMode] = useState<'repeat' | 'sweep'>(first.mode), [out, setOut] = useState<OutKey>(first.out);
  const [runs, setRuns] = useState(first.runs ?? 20), [samples, setSamples] = useState(first.samples), [seed, setSeed] = useState('2024');
  const [tbl, setTbl] = useState<Table>(() => tableFrom({ ...BDEF, ...first.set }, first.mode === 'sweep' ? first : undefined));
  const [res, setRes] = useState<{ r: BatchResult; spec: BatchSpec; exp: number } | null>(null), [busy, setBusy] = useState(false), [status, setStatus] = useState('Ready');
  const stop = useRef(false);
  const visible = (outs: OutKey[]) => outs.includes(out);
  const xs = useMemo(() => sweepValues(tbl), [tbl]);
  const edited = () => setExpI(-1);

  const load = (i: number) => {
    const e = BATCH_EXPS[i];
    setExpI(i); setMode(e.mode); setOut(e.out); if (e.runs) setRuns(e.runs); setSamples(e.samples);
    setTbl(tableFrom({ ...BDEF, ...e.set }, e.mode === 'sweep' ? e : undefined)); setRes(null); setStatus('Experiment set up: press ▶ Run batch');
  };
  const changeMode = (m: 'repeat' | 'sweep') => {
    edited(); setMode(m);
    if (m === 'repeat') setTbl((t) => ({ ...t, vary: null, exact: null }));
    else if (!tbl.vary) { const k = Object.keys(BVARS).find((q) => BVARS[q].outs.includes(out)); if (k) setTbl((t) => startVary(t, k)); }
  };
  const changeOut = (o: OutKey) => { edited(); setOut(o); if (tbl.vary && !BVARS[tbl.vary].outs.includes(o)) { setTbl((t) => ({ ...t, vary: null, exact: null })); setMode('repeat'); } };
  const tick = (k: string, on: boolean) => { edited(); if (on) { setTbl((t) => startVary(t, k)); setMode('sweep'); } else { setTbl((t) => ({ ...t, vary: null, exact: null })); setMode('repeat'); } };
  const useLeft = () => {
    // the settings on the left panel (as shown, before or after Apply); the batch always uses the scattering set-up
    const cfg = lab.pending, ph = cfg.physics, s = ph.scatter, ax = cfg.axes;
    const p: Settings = { ...BDEF, G: ph.G, m0: ph.m[0], m1: ph.m[1], m2: ph.m[2], r0: ph.r[0], r1: ph.r[1], r2: ph.r[2], sep: s.sep, ecc: s.ecc, cx: s.cx, horizon: ph.horizon,
      rtol: cfg.numerics.rtol, rtolAtol: nice(cfg.numerics.rtol / cfg.numerics.atol), b: s.b, v: s.v, phase: s.phaseDeg, frame: ph.frame };
    if (ax.varX === 'b') { p.bLo = ax.minX; p.bHi = ax.maxX; } if (ax.varY === 'v') { p.vLo = ax.minY; p.vHi = ax.maxY; }
    if (ax.varX === 'phase') { p.phLo = ax.minX; p.phHi = ax.maxX; } if (ax.varY === 'phase') { p.phLo = ax.minY; p.phHi = ax.maxY; }
    setExpI(-1); setMode('repeat'); setTbl(tableFrom(p));
    setStatus(ph.mode === 'scattering' ? 'Table filled from the left panel' : 'Table filled from the left panel (the batch always uses the scattering set-up: masses, radii, G, horizon and tolerances were copied)');
  };
  /** The settings for a run: the defaults, then every value in the table, clamped to genuine limits. */
  const settings = (): Settings => {
    const p: Settings = { ...BDEF };
    for (const [k, v] of Object.entries(tbl.vals)) { const x = Number(v); if (v.trim() !== '' && Number.isFinite(x)) p[k] = clampVar(k, x); }
    for (const [k, v] of Object.entries(tbl.opts)) p[k] = v;
    return p;
  };
  const run = async () => {
    const sweep = mode === 'sweep' && !!tbl.vary;
    if (sweep && !xs.length) { setStatus('Check the from / to / step values'); return; }
    const spec: BatchSpec = { out, mode: sweep ? 'sweep' : 'repeat', p: settings(), vary: sweep ? tbl.vary : null, xs: sweep ? xs : [], runs, samples, seed: Number(seed) || 1, logx: sweep && tbl.kind === '×' };
    stop.current = false; setBusy(true); setRes(null); const t0 = performance.now();
    try {
      const r = await runBatch(spec, (req) => lab.runBatchRequest(req), (d, t, txt) => setStatus(`Running… ${txt} (${d}/${t})`), () => stop.current);
      setRes({ r, spec, exp: expI }); setStatus(`${stop.current ? 'Stopped' : 'Done'} in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${r.rows.length} rows`);
    } catch (e) { setStatus('Error: ' + String((e as Error).message ?? e)); }
    setBusy(false);
  };
  const exp = expI >= 0 ? BATCH_EXPS[expI] : null;
  const note = exp ? (res && res.exp === expI ? exp.note : 'Pick an experiment above and press Run. ' + exp.note) : 'Your own experiment. ' + BOUTS[out].theory;
  const R = res?.r, plotX = R?.plot.x ?? [];
  const sweepRes = res?.spec.mode === 'sweep';
  return (
    <div className="overlay" role="dialog" aria-label="Batch run">
      <div className="batch" data-batchbox="">
        <div className="bhead"><h2>📊 Batch run</h2><span className="hint">Runs many real simulations headlessly on the worker pool (your map is not changed). Repeat with new random draws, or sweep one setting; fixed seeds make every result reproducible.</span><button id="bClose" onClick={onClose} aria-label="Close batch run">✕</button></div>
        <div id="bsetup">
          <div className="exps">{BATCH_EXPS.map((e, i) => <button key={e.id} className={i === expI ? 'exp on' : 'exp'} onClick={() => !busy && load(i)} disabled={busy}><b>{e.title}</b><span>{e.sub}</span></button>)}</div>
          <div className="brow">
            <label>Mode <select id="bMode" value={mode} onChange={(e) => changeMode(e.target.value as 'repeat' | 'sweep')}><option value="repeat">Repeat (new random draws each run)</option><option value="sweep">Sweep (vary the ticked setting in steps)</option></select></label>
            <label>Record <select id="bOut" value={out} onChange={(e) => changeOut(e.target.value as OutKey)}>{(Object.keys(BOUTS) as OutKey[]).map((k) => <option key={k} value={k}>{BOUTS[k].label}</option>)}</select></label>
            {mode === 'repeat' ? <label>Runs <select id="bRuns" value={runs} onChange={(e) => { edited(); setRuns(+e.target.value); }}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label> : null}
            <label>Simulations per {mode === 'repeat' ? 'run' : 'step'} <select id="bSamples" value={samples} onChange={(e) => { edited(); setSamples(+e.target.value); }}>{[20, 40, 60, 100, 200].map((n) => <option key={n}>{n}</option>)}</select></label>
            <label>Seed <input id="bSeed" value={seed} onChange={(e) => { edited(); setSeed(e.target.value); }} size={7} /></label>
          </div>
          <details id="bSetBox" open>
            <summary>Starting settings: tick the one to vary</summary>
            <div className="bhint">Every starting setting the chosen outcome uses is listed (the binary–single scattering set-up). Tick one to sweep it from → to in steps (+ adds the step each time, × multiplies by it); every other setting stays at the value shown. Values outside the genuine limits are clamped. What you see is what runs.</div>
            <div id="bOpts">{BOPTS.filter((O) => visible(O.outs)).map((O) => <label key={O.k}>{O.label} <select data-o={O.k} value={tbl.opts[O.k]} onChange={(e) => { edited(); setTbl((t) => ({ ...t, opts: { ...t.opts, [O.k]: e.target.value } })); }}>{O.choices.map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}</select></label>)}</div>
            <div id="bTbl">{Object.keys(BVARS).filter((k) => visible(BVARS[k].outs)).map((k) => {
              const on = tbl.vary === k, setR = (f: 'from' | 'to' | 'step' | 'kind', v: string) => { edited(); setTbl((t) => ({ ...t, exact: null, [f]: v })); };
              return (
                <div key={k} className={'bt' + (on ? ' on' : '')} data-k={k}>
                  <label {...(on ? { 'data-ws-change': '' } : {})}><input type="checkbox" data-vary={k} checked={on} onChange={(e) => tick(k, e.target.checked)} /> {varName(k)}</label>
                  <input type="number" className="bval" data-v={k} step="any" min={BVARS[k].min} max={BVARS[k].max} value={tbl.vals[k]} onChange={(e) => { edited(); const v = e.target.value; setTbl((t) => ({ ...t, vals: { ...t.vals, [k]: v } })); }} />
                  <span className="bsw">from <input type="number" data-ws="from" data-r="from" step="any" value={on ? tbl.from : ''} onChange={(e) => setR('from', e.target.value)} /> to <input type="number" data-ws="to" data-r="to" step="any" value={on ? tbl.to : ''} onChange={(e) => setR('to', e.target.value)} />
                    {' '}step <select data-ws="step type" data-r="kind" value={tbl.kind} onChange={(e) => setR('kind', e.target.value)}><option value="+">+</option><option value="×">×</option></select>
                    {' '}<input type="number" data-ws="step" data-r="step" step="any" value={on ? tbl.step : ''} onChange={(e) => setR('step', e.target.value)} />
                    {' '}<span className="bcount">{on ? `→ ${xs.length} steps: ${xs.slice(0, 4).map((v) => fmt(v)).join(', ')}${xs.length > 4 ? ' … ' + fmt(xs[xs.length - 1]) : ''}` : ''}</span></span>
                </div>);
            })}</div>
            <div className="brow" style={{ marginTop: 5 }}><button id="bLeft" onClick={useLeft} disabled={busy} title="Fill the table from the settings on the left panel">↺ Use my left-panel settings</button></div>
          </details>
        </div>
        <div id="bresults">
          <div className="brow">
            <button id="bRun" className="primary" onClick={run} disabled={busy}>▶ Run batch</button>
            <button id="bStop" onClick={() => { stop.current = true; }} disabled={!busy}>■ Stop</button>
            <button id="bCsv" onClick={() => res && downloadBlob(new Blob([batchCSV(res.exp >= 0 ? BATCH_EXPS[res.exp].title : 'Your own batch experiment', res.spec, res.r)], { type: 'text/csv' }), `batch-${res.exp >= 0 ? BATCH_EXPS[res.exp].id : 'custom'}.csv`)} disabled={!res || !res.r.rows.length}>⬇ Download CSV</button>
            <span id="bStatus" className="status">{status}</span>
          </div>
          {R && res ? (
            <div className="bres">
              <Plot series={[{ label: 'simulation (mean' + (sweepRes ? ' ± SE' : '') + ')', colour: '#74c0fc', x: plotX, y: R.plot.mean }, ...(R.plot.theory ? [{ label: BOUTS[res.spec.out].theoryLabel, colour: '#ffd43b', x: plotX, y: R.plot.theory, dash: [5, 3] }] : []), ...(sweepRes ? [{ label: 'mean + SE', colour: '#4c6a8f', x: plotX, y: R.plot.mean.map((m, i) => m + R.plot.se[i]) }, { label: 'mean − SE', colour: '#4c6a8f', x: plotX, y: R.plot.mean.map((m, i) => m - R.plot.se[i]) }] : [])]}
                xLabel={R.plot.xLabel} yLabel={R.plot.yLabel.slice(0, 44)} log={R.plot.logy} logx={R.plot.logx} height={250} />
              <ul className="bsum">{R.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <div className="btable"><table className="data compact"><thead><tr>{R.header.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{R.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{fmt(v)}</td>)}</tr>)}</tbody></table></div>
            </div>
          ) : null}
          <div id="bNote" className="bnote">{note}</div>
        </div>
      </div>
    </div>
  );
}
