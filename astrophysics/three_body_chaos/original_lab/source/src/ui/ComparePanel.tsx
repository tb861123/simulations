import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lab, TrajData } from '../lab.ts';
import { EDGE } from '../boundaries.ts';
import { NOT_COMPUTED } from '../store.ts';
import { PARAM_DEFS, DELTA_PARAMS, getParam, axisLabel } from '../initial.ts';
import { BODY_NAMES, outcomeText } from '../outcomes.ts';
import { buildSeries, separationSeries } from '../traj.ts';
import { useLab } from './hooks.ts';
import { NumInput } from './NumInput.tsx';
import { Plot, type PlotSeries } from './Plot.tsx';
import { TrajCanvas } from './TrajCanvas.tsx';

type G = 'dist' | 'sep' | 'energy' | 'speed' | 'binary' | 'mom';
export function ComparePanel({ lab }: { lab: Lab }) {
  useLab(lab, ['compare', 'traj', 'selection', 'appearance', 'layers']);
  const c = lab.compare;
  const a = c ? lab.trajs.get(c.a) : undefined, b = c ? lab.trajs.get(c.b) : undefined;
  const tRef = useRef(0), trailStart = useRef(0);
  const [uiT, setUiT] = useState(0), [playing, setPlaying] = useState(false), [layout, setLayout] = useState<'overlay' | 'side'>('overlay'), [group, setGroup] = useState<G>('sep');
  const [pparam, setPparam] = useState('v'), [delta, setDelta] = useState(1e-6), [msg, setMsg] = useState('');
  const tMax = a && b ? Math.max(a.trace.t[a.trace.n - 1], b.trace.t[b.trace.n - 1]) : 0;
  useEffect(() => { tRef.current = 0; setUiT(0); setPlaying(false); }, [c?.a, c?.b]);
  useEffect(() => {
    if (!playing) return; let raf = 0, last = performance.now(), ui = 0;
    const loop = (now: number) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; tRef.current = Math.min(tMax, tRef.current + dt * 2); if (now - ui > 80) { ui = now; setUiT(tRef.current); } if (tRef.current >= tMax) { setUiT(tMax); setPlaying(false); return; } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [playing, tMax]);
  const sep = useMemo(() => (a && b ? separationSeries(a, b) : null), [a, b]);
  const sA = useMemo(() => (a ? buildSeries(a) : null), [a]), sB = useMemo(() => (b ? buildSeries(b) : null), [b]);
  const plot = useMemo<{ s: PlotSeries[]; log?: boolean; y: string }>(() => {
    if (!sA || !sB || !sep) return { s: [], y: '' };
    const two = (label: string, colour: string, fa: Float64Array, fb: Float64Array): PlotSeries[] => [{ label: label + ' (1)', colour, x: sA.t, y: fa }, { label: label + ' (2)', colour, x: sB.t, y: fb, dash: [5, 3] }];
    switch (group) {
      case 'sep': return { y: 'scaled phase-space separation', log: true, s: [{ label: 'Δ(t) between the two runs', colour: '#ffd43b', x: sep.t, y: sep.sep }] };
      case 'dist': return { y: 'separation', log: true, s: [0, 1, 2].flatMap((p) => two(['A–B', 'A–C', 'B–C'][p], ['#e6edf7', '#a5d8ff', '#ffd8a8'][p], sA.d[p], sB.d[p])) };
      case 'energy': return { y: 'scaled |ΔE|/S_E', log: true, s: two('E err', '#ff8787', sA.relE, sB.relE).concat(two('L err', '#8ce99a', sA.relL, sB.relL)) };
      case 'speed': return { y: 'speed', s: [0, 1, 2].flatMap((k) => two(BODY_NAMES[k], lab.appearance.bodies[k], sA.speed[k], sB.speed[k])) };
      case 'binary': return { y: 'binary orbital energy (osculating)', s: two('E_bin ' + sA.binLabel, '#ffd43b', sA.binEnergy, sB.binEnergy) };
      case 'mom': return { y: 'COM speed', s: two('COM speed', '#8ce99a', Float64Array.from(sA.cvx, (v, i) => Math.hypot(v, sA.cvy[i])), Float64Array.from(sB.cvx, (v, i) => Math.hypot(v, sB.cvy[i]))).concat(two('|P|', '#74c0fc', Float64Array.from(sA.px, (v, i) => Math.hypot(v, sA.py[i])), Float64Array.from(sB.px, (v, i) => Math.hypot(v, sB.py[i])))) };
    }
  }, [sA, sB, sep, group, lab.appearance.bodies.join()]);

  /** nearest detected boundary at the selected sample */
  const compareBoth = () => {
    const L = lab.selectedLayer(); if (!L || !lab.sel) { setMsg('Select a sample on a boundary first.'); return; }
    const e = lab.edges(L); let best = -1, bs = -1;
    for (let q = 0; q < e.n; q++) { if (!(e.kind[q] & EDGE.OUTCOME)) continue; if (e.a[q] === lab.sel.sampleId || e.b[q] === lab.sel.sampleId) if (e.score[q] > bs) { bs = e.score[q]; best = q; } }
    if (best < 0) { setMsg('The selected sample has no neighbour with a different classified outcome. Select a sample next to a drawn boundary, or use the Regions tab.'); return; }
    setMsg(''); void lab.compareSides(L, e.a[best], e.b[best]);
  };
  const ids = [...Object.keys(PARAM_DEFS).filter((id) => PARAM_DEFS[id].modes.includes(lab.applied.physics.mode) && !id.startsWith('r') && !/^[xy]\d$|^v[xy]\d$/.test(id)), ...DELTA_PARAMS.map((d) => d.id)];
  const items = a && b ? [{ data: a, label: 'run 1' }, { data: b, label: 'run 2', hollow: true }] : [];
  const ended = (t: TrajData | undefined) => t ? `${outcomeText(t.summary.outcome)}, ended at t = ${t.trace.t[t.trace.n - 1].toFixed(4)}` : '…';

  return (
    <div className="panel-body">
      <h3>Compare nearby encounters</h3>
      <div className="btnrow"><button className="primary small" onClick={compareBoth}>Compare Both Sides (selected boundary)</button></div>
      <div className="perturb">
        <label className="inline">Perturb <select value={pparam} onChange={(e) => setPparam(e.target.value)}>{ids.map((id) => <option key={id} value={id}>{DELTA_PARAMS.find((d) => d.id === id)?.label ?? axisLabel(id)}</option>)}</select></label>
        <NumInput label="by" value={delta} onCommit={(v) => { setDelta(v); return { value: v }; }} hint="Added to the selected sample's value of this parameter" />
        <button className="small" onClick={async () => { const r = await lab.comparePerturbation(pparam, delta); setMsg(r ?? ''); }}>Compare perturbed</button>
      </div>
      {msg ? <p className="errs">{msg}</p> : null}
      {!c || !a || !b ? <p className="hint">{c ? 'Calculating both trajectories…' : 'Select a sample, then compare it with its neighbour across a boundary, or with a copy perturbed in one chosen parameter (b, speed, binary phase, a body position/velocity, or a mass).'}</p> : (
        <>
          <p className="hint">{c.description}.</p>
          <table className="data compact"><thead><tr><th>changed</th><th>run 1</th><th>run 2</th></tr></thead>
            <tbody>{c.changed.map((x) => <tr key={x.name}><td>{DELTA_PARAMS.find((d) => d.id === x.name)?.label ?? axisLabel(x.name)}</td><td className="mono">{x.a}</td><td className="mono">{x.b}</td></tr>)}
              <tr><td>result</td><td>{ended(a)}</td><td>{ended(b)}</td></tr></tbody></table>
          <div className="seg"><button className={layout === 'overlay' ? 'on' : ''} onClick={() => setLayout('overlay')}>Overlaid</button><button className={layout === 'side' ? 'on' : ''} onClick={() => setLayout('side')}>Side by side</button></div>
          {layout === 'overlay' ? <TrajCanvas lab={lab} items={items} tRef={tRef} trail={10} trailStart={trailStart} cam={{ mode: 'auto', track: 'none', frame: lab.frame }} showVel={false} showAcc={false} showBinary={false} height={280} onManual={() => undefined} />
            : <div className="side"><TrajCanvas lab={lab} items={[items[0]]} tRef={tRef} trail={10} trailStart={trailStart} cam={{ mode: 'auto', track: 'none', frame: lab.frame }} showVel={false} showAcc={false} showBinary={false} height={240} onManual={() => undefined} /><TrajCanvas lab={lab} items={[{ ...items[1], hollow: false }]} tRef={tRef} trail={10} trailStart={trailStart} cam={{ mode: 'auto', track: 'none', frame: lab.frame }} showVel={false} showAcc={false} showBinary={false} height={240} onManual={() => undefined} /></div>}
          <div className="transport">
            <button className="primary" onClick={() => { if (tRef.current >= tMax) { tRef.current = 0; } setPlaying(!playing); }}>{playing ? '⏸' : '▶'}</button>
            <button onClick={() => { tRef.current = 0; setUiT(0); setPlaying(false); }}>⏮</button>
            <input className="scrub" type="range" min={0} max={tMax} step={tMax / 2000 || 0.01} value={uiT} onChange={(e) => { setPlaying(false); tRef.current = +e.target.value; setUiT(+e.target.value); }} />
            <span className="mono">t = {uiT.toFixed(3)}</span>
          </div>
          <div className="seg wrap">{([['sep', 'Neighbour separation'], ['dist', 'Distances'], ['energy', 'Conservation'], ['speed', 'Speeds'], ['binary', 'Binary energy'], ['mom', 'Momentum & COM']] as [G, string][]).map(([g, l]) => <button key={g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{l}</button>)}</div>
          <Plot series={plot.s} xLabel="time" yLabel={plot.y} log={plot.log} cursor={uiT} onCursor={(x) => { setPlaying(false); tRef.current = x; setUiT(x); }} height={180} />
          {sep ? <p className="hint">Compared at common physical times 0 ≤ t ≤ {sep.tMax.toFixed(4)} (the earlier run's end); after a run terminates its state is <b>not</b> continued, it is shown frozen in grey and excluded from the separation. Separation Δ = √Σᵢ[(|Δrᵢ|/L₀)² + (|Δvᵢ|/V₀)²] with L₀ = {sep.L0.toPrecision(4)} (smallest initial pair distance) and V₀ = √(G M/L₀) = {sep.V0.toPrecision(4)}. Growth of Δ is a finite-time diagnostic: <b>not a Lyapunov exponent</b>. Interpolation limits resolution to ≈10⁻⁸.</p> : null}
        </>
      )}
      {void getParam}
    </div>
  );
}
