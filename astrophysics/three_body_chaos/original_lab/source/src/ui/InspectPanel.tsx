import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lab, RefData, TrajData } from '../lab.ts';
import { FAIL_LABELS, FLAG } from '../simulate.ts';
import { NOT_COMPUTED, VALID_LABELS } from '../store.ts';
import { BODY_NAMES, outcomeText } from '../outcomes.ts';
import { buildSeries, stateAt } from '../traj.ts';
import { diagnostics, PAIRS } from '../physics.ts';
import { axisLabel, clonePhysics, buildInitial } from '../initial.ts';
import { useLab } from './hooks.ts';
import { fmt } from './NumInput.tsx';
import { Plot, type PlotSeries } from './Plot.tsx';
import { TrajCanvas, type CamOpts } from './TrajCanvas.tsx';
import { downloadBlob, trajectoryCSV } from '../export.ts';
import { scaledSeparation } from '../worker-core.ts';

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16];
export const statusOf = (flags: number, outcome: number): string => outcome === NOT_COMPUTED ? 'Not yet calculated' : outcome === 7 ? 'Numerically unreliable or failed' : outcome === 6 ? 'Calculated but unresolved at the horizon' : flags & FLAG.PROVISIONAL ? 'Provisionally classified' : 'Classified under the documented criteria';

export function InspectPanel({ lab }: { lab: Lab }) {
  useLab(lab, ['selection', 'traj', 'layers', 'appearance', 'config', 'validation']);
  const sel = lab.sel;
  const info = sel ? lab.describe(sel.layerId, sel.sampleId) : null;
  const layer = lab.selectedLayer();
  const overrides = sel && layer ? lab.overridesFor(layer, sel.sampleId) : null;
  const tr: TrajData | undefined = overrides ? lab.trajs.get(lab.trajKey(overrides)) : undefined;
  const app = lab.appearance;

  if (!info || !sel) return <div className="panel-body"><GeometryPreview lab={lab} /><p className="hint">Click the map to select a sample. The panel then shows the exact experiment parameters, the generated initial positions and velocities, the solver settings, the outcome and its reliability, and replays the trajectory from t = 0.</p><p className="hint">A click selects <b>experiment parameters</b> ({axisLabel(lab.applied.axes.varX)}, {axisLabel(lab.applied.axes.varY)}), never a physical x/y position.</p></div>;

  const ini = info.ini;
  return (
    <div className="panel-body">
      <h3>Selected sample <small>#{info.id} · {info.layer} · depth {info.depth === 255 ? 'supplementary' : info.depth}</small></h3>
      <table className="kv">
        <tbody>
          <tr><th>{axisLabel(info.varX)}</th><td className="mono">{info.x}</td></tr>
          <tr><th>{axisLabel(info.varY)}</th><td className="mono">{info.y}</td></tr>
          <tr><th>Outcome</th><td><b>{outcomeText(info.outcome)}</b>{info.outcome === 7 ? ` — ${FAIL_LABELS[info.fail]}` : ''}</td></tr>
          <tr><th>Status</th><td>{statusOf(info.flags, info.outcome)}</td></tr>
          {info.computed ? <>
            <tr><th>Run ended at t</th><td className="mono">{info.tEnd.toPrecision(8)} <small>{info.outcome <= 2 || info.outcome === 8 ? '(accepted escape time)' : info.outcome <= 5 ? '(located contact time)' : '(first accepted step ≥ horizon)'}</small></td></tr>
            {Number.isFinite(info.tOn) ? <tr><th>Escape onset (est.)</th><td className="mono">{info.tOn.toFixed(4)} <small>resolved to one integration step; ≠ acceptance time</small></td></tr> : null}
            <tr><th>Closest approach</th><td className="mono">{info.minD.toPrecision(5)} <small>({['A–B', 'A–C', 'B–C'][info.minPair]})</small></td></tr>
            <tr><th>Close encounters</th><td>{info.nClose}</td></tr>
            <tr><th>Max scaled conservation error</th><td className="mono">{info.eErr.toExponential(2)}</td></tr>
            <tr><th>Binary energy exchange</th><td className="mono">{Number.isFinite(info.exch) ? info.exch.toFixed(4) : '—'}</td></tr>
            <tr><th>Integration steps</th><td>{info.steps.toLocaleString()}</td></tr>
            <tr><th>Validation</th><td>{VALID_LABELS[info.valid]}</td></tr>
          </> : null}
        </tbody>
      </table>
      {!info.computed ? <p><button className="primary small" onClick={() => lab.computeSampleNow(sel.layerId, sel.sampleId)}>Calculate this sample now</button> <span className="hint">This cell has not been calculated yet.</span></p> : null}
      <details>
        <summary>Generated initial state &amp; solver settings (exactly what was integrated)</summary>
        <table className="data">
          <thead><tr><th></th><th>m</th><th>radius</th><th>x</th><th>y</th><th>vx</th><th>vy</th></tr></thead>
          <tbody>{[0, 1, 2].map((b) => <tr key={b}><th style={{ color: app.bodies[b] }}>{BODY_NAMES[b]}</th><td>{fmt(ini.m[b])}</td><td>{fmt(ini.r[b])}</td><td>{ini.y[2 * b].toPrecision(10)}</td><td>{ini.y[2 * b + 1].toPrecision(10)}</td><td>{ini.y[6 + 2 * b].toPrecision(10)}</td><td>{ini.y[7 + 2 * b].toPrecision(10)}</td></tr>)}</tbody>
        </table>
        <p className="hint">G = {lab.applied.physics.G} · DOP853 · rtol {lab.applied.numerics.rtol} · atol {lab.applied.numerics.atol} · max steps {lab.applied.numerics.maxSteps} · horizon {lab.applied.physics.horizon} · frame: {lab.applied.physics.mode === 'scattering' ? (lab.applied.physics.frame === 'com' ? 'total centre of mass' : 'binary rest frame') : 'as entered'}</p>
        <button className="small" onClick={() => {
          const p = clonePhysics(lab.applied.physics); const s = buildInitial(lab.applied.physics, lab.overridesFor(layer!, sel.sampleId));
          p.mode = 'explicit'; p.explicit = { x: [0, 1, 2].map((b) => s.y[2 * b]), y: [0, 1, 2].map((b) => s.y[2 * b + 1]), vx: [0, 1, 2].map((b) => s.y[6 + 2 * b]), vy: [0, 1, 2].map((b) => s.y[7 + 2 * b]) };
          lab.pending.physics = p; lab.pending.axes = { ...lab.pending.axes, varX: 'x2', minX: s.y[4] - 1, maxX: s.y[4] + 1, varY: 'y2', minY: s.y[5] - 1, maxY: s.y[5] + 1 }; lab.pending.presetId = 'custom'; lab.emit('config');
        }} title="Copy these exact values into the editable explicit-body set-up (left panel, pending until you apply)">Copy to explicit set-up…</button>
      </details>
      {info.computed && (info.outcome === 6 || info.flags & FLAG.PENDING) ? <ExtendBox lab={lab} info={info} /> : null}
      {info.computed ? <Viewer lab={lab} tr={tr} info={info} /> : null}
    </div>
  );
}

function ExtendBox({ lab, info }: { lab: Lab; info: any }) {
  const [h, setH] = useState(String(lab.applied.physics.horizon * 2));
  return <p className="box"><b>Unresolved at t ≈ {info.tEnd.toFixed(1)}.</b> Extend the horizon to <input className="mini" value={h} onChange={(e) => setH(e.target.value)} /> to continue unresolved samples from their saved checkpoints (completed samples are kept). <button className="small" onClick={() => { const v = Number(h); if (v > lab.applied.physics.horizon) { lab.pending.physics.horizon = v; const pr = lab.applyPending(); if (pr.length) alert(pr.join('\n')); } }}>Extend</button></p>;
}

type Group = 'dist' | 'energy' | 'speed' | 'binary' | 'mom';
function Viewer({ lab, tr, info }: { lab: Lab; tr?: TrajData; info: any }) {
  const tRef = useRef(0), trailStart = useRef(0);
  const [uiT, setUiT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [trail, setTrail] = useState(8);
  const [cam, setCam] = useState<CamOpts>({ mode: 'auto', track: 'none', frame: lab.frame });
  const [vel, setVel] = useState(false), [acc, setAcc] = useState(false), [bin, setBin] = useState(true);
  const [group, setGroup] = useState<Group>('dist');
  const [resetKey, setResetKey] = useState(0);
  const [refBusy, setRefBusy] = useState(false);
  const [ref, setRef] = useState<RefData | null>(null);
  const tEnd = tr ? tr.trace.t[tr.trace.n - 1] : 0;
  const key = tr?.key;
  useEffect(() => { tRef.current = 0; trailStart.current = 0; setUiT(0); setPlaying(false); setRef(null); }, [key]);
  // playback clock (simulation time per second = speed * 2)
  useEffect(() => {
    if (!playing || !tr) return; let raf = 0, last = performance.now(), ui = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      tRef.current = Math.min(tEnd, tRef.current + dt * speed * 2);
      if (now - ui > 80) { ui = now; setUiT(tRef.current); }
      if (tRef.current >= tEnd) { setUiT(tRef.current); setPlaying(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [playing, speed, tr, tEnd]);
  const setT = (t: number) => { tRef.current = Math.max(0, Math.min(tEnd, t)); setUiT(tRef.current); };
  const series = useMemo(() => (tr ? buildSeries(tr) : null), [tr]);
  const state = useMemo(() => { if (!tr) return null; const y = new Float64Array(12); stateAt(tr, uiT, y); return y; }, [tr, uiT]);
  const dg = useMemo(() => (tr && state ? diagnostics(3, tr.m, tr.G, state) : null), [tr, state]);
  const colours = lab.appearance.bodies;
  const plots = useMemo<{ s: PlotSeries[]; y: string; log?: boolean }>(() => {
    if (!series) return { s: [], y: '' };
    const t = series.t;
    switch (group) {
      case 'dist': return { y: 'separation', s: [0, 1, 2].map((p) => ({ label: ['A–B', 'A–C', 'B–C'][p], colour: ['#e6edf7', '#a5d8ff', '#ffd8a8'][p], x: t, y: series.d[p] })), log: true };
      case 'energy': return { y: 'scaled error', log: true, s: [{ label: '|ΔE|/S_E', colour: '#ff8787', x: t, y: series.relE }, { label: '|ΔP|/S_P', colour: '#74c0fc', x: t, y: series.relP }, { label: '|ΔL|/S_L', colour: '#8ce99a', x: t, y: series.relL }] };
      case 'speed': return { y: 'speed', s: [0, 1, 2].map((b) => ({ label: BODY_NAMES[b], colour: colours[b], x: t, y: series.speed[b] })) };
      case 'binary': return { y: `${series.binLabel} orbital energy`, s: [{ label: `E_${series.binLabel} (osculating two-body)`, colour: '#ffd43b', x: t, y: series.binEnergy }, { label: 'total E', colour: '#adb5bd', x: t, y: series.E }] };
      case 'mom': return { y: 'momentum / COM', s: [{ label: '|P|', colour: '#74c0fc', x: t, y: Array.from(series.px, (v, i) => Math.hypot(v, series.py[i])) }, { label: 'COM speed', colour: '#8ce99a', x: t, y: Array.from(series.cvx, (v, i) => Math.hypot(v, series.cvy[i])) }, { label: 'COM |r|', colour: '#ffa8a8', x: t, y: Array.from(series.cx, (v, i) => Math.hypot(v, series.cy[i])) }] };
    }
  }, [series, group, colours.join()]);

  if (!tr) return <div className="box"><b>Trajectory:</b> calculating… <span className="hint">(calculation progress is separate from replay time)</span></div>;
  const sm = tr.summary;
  const pairs = ['A–B', 'A–C', 'B–C'];
  const dist = (p: number) => Math.hypot(state![2 * PAIRS[p][1]] - state![2 * PAIRS[p][0]], state![2 * PAIRS[p][1] + 1] - state![2 * PAIRS[p][0] + 1]);
  const escaperText = sm.outcome <= 2 ? `${BODY_NAMES[sm.outcome]} is the candidate escaper; ${series!.binLabel} is the surviving binary.` : sm.outcome === 8 ? 'No bound pair: complete disruption.' : sm.outcome <= 5 ? `Contact ${pairs[sm.outcome - 3]}: the integration stops at the located contact.` : `Most strongly bound pair at the end: ${series!.binLabel} (candidate binary).`;
  const ctl = (a: Partial<CamOpts>) => setCam({ ...cam, ...a });

  return (
    <div className="viewer">
      <h3>Trajectory <small>{tr.trace.n.toLocaleString()} recorded samples · replay from t = 0</small></h3>
      <TrajCanvas lab={lab} items={[{ data: tr, label: 'trajectory' }]} tRef={tRef} trail={trail} trailStart={trailStart} cam={cam} showVel={vel} showAcc={acc} showBinary={bin} height={300} onManual={() => cam.mode !== 'manual' && setCam({ ...cam, mode: 'manual' })} resetKey={resetKey} />
      <div className="transport">
        <button onClick={() => { setT(0); setPlaying(false); }} title="Restart">⏮</button>
        <button onClick={() => { setPlaying(false); setT(uiT - 0.05); }} title="Step back 0.05">◀|</button>
        <button className="primary" onClick={() => { if (tRef.current >= tEnd) setT(0); setPlaying(!playing); }}>{playing ? '⏸' : '▶'}</button>
        <button onClick={() => { setPlaying(false); setT(uiT + 0.05); }} title="Step forward 0.05">|▶</button>
        <select value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Playback speed">{SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}</select>
        <input className="scrub" type="range" min={0} max={tEnd} step={tEnd / 2000} value={uiT} onChange={(e) => { setPlaying(false); setT(+e.target.value); }} aria-label="Timeline" />
        <span className="mono">t = {uiT.toFixed(3)} / {tEnd.toFixed(3)}</span>
      </div>
      <div className="opts">
        <label>Trail <input type="range" min={0} max={Math.max(1, tEnd)} step={0.1} value={trail} onChange={(e) => setTrail(+e.target.value)} /> {trail.toFixed(1)}</label>
        <button className="small" onClick={() => { trailStart.current = tRef.current; setUiT(tRef.current + 1e-9); }} title="Hide the trace drawn so far (the physical trajectory is unchanged)">Clear trace</button>
        <button className="small" onClick={() => { trailStart.current = 0; setUiT(tRef.current + 1e-9); }}>Restore trace</button>
        <label>Camera <select value={cam.mode} onChange={(e) => { ctl({ mode: e.target.value as any }); setResetKey(resetKey + 1); }}><option value="auto">auto-frame</option><option value="manual">manual (drag / wheel)</option></select></label>
        <label>Track <select value={String(cam.track)} onChange={(e) => ctl({ track: (e.target.value === 'none' || e.target.value === 'com' ? e.target.value : +e.target.value) as any })}><option value="none">nothing</option><option value="com">centre of mass</option>{[0, 1, 2].map((b) => <option key={b} value={b}>body {BODY_NAMES[b]}</option>)}</select></label>
        <label>View frame <select value={cam.frame} onChange={(e) => { ctl({ frame: e.target.value as any }); lab.frame = e.target.value as any; }}><option value="com">centre-of-mass</option><option value="integration">as integrated</option></select></label>
        <label><input type="checkbox" checked={vel} onChange={(e) => setVel(e.target.checked)} />velocity</label>
        <label><input type="checkbox" checked={acc} onChange={(e) => setAcc(e.target.checked)} />acceleration</label>
        <label><input type="checkbox" checked={bin} onChange={(e) => setBin(e.target.checked)} />candidate binary</label>
      </div>
      <p className="hint">Changing the view frame or camera never changes the integration. {escaperText} {sm.outcome <= 5 || sm.outcome === 8 ? `Event time ${sm.tEnd.toFixed(4)}.` : ''}</p>
      {dg && state ? (
        <table className="data compact">
          <thead><tr><th></th><th>x</th><th>y</th><th>vx</th><th>vy</th><th>|v|</th></tr></thead>
          <tbody>
            {[0, 1, 2].map((b) => <tr key={b}><th style={{ color: colours[b] }}>{BODY_NAMES[b]}</th><td>{state[2 * b].toFixed(5)}</td><td>{state[2 * b + 1].toFixed(5)}</td><td>{state[6 + 2 * b].toFixed(5)}</td><td>{state[7 + 2 * b].toFixed(5)}</td><td>{Math.hypot(state[6 + 2 * b], state[7 + 2 * b]).toFixed(5)}</td></tr>)}
            <tr><th>COM</th><td>{dg.cx.toFixed(5)}</td><td>{dg.cy.toFixed(5)}</td><td>{dg.cvx.toFixed(5)}</td><td>{dg.cvy.toFixed(5)}</td><td>{Math.hypot(dg.cvx, dg.cvy).toFixed(5)}</td></tr>
          </tbody>
        </table>
      ) : null}
      {dg && state && series ? (
        <table className="data compact">
          <tbody>
            <tr><th>Distances</th><td colSpan={2}>A–B {dist(0).toFixed(4)}</td><td>A–C {dist(1).toFixed(4)}</td><td>B–C {dist(2).toFixed(4)}</td></tr>
            <tr><th>Energy</th><td>K {dg.K.toFixed(6)}</td><td>U {dg.U.toFixed(6)}</td><td colSpan={2}>E = K+U {dg.E.toFixed(8)}</td></tr>
            <tr><th>Momentum P</th><td>{dg.px.toExponential(2)}</td><td>{dg.py.toExponential(2)}</td><th>L</th><td>{dg.L.toFixed(8)}</td></tr>
            <tr><th>Scale S_E, S_P, S_L</th><td colSpan={4}>{series.scale.SE.toPrecision(5)}, {series.scale.SP.toPrecision(5)}, {series.scale.SL.toPrecision(5)} (relative errors are |Δ|/S: defined even when E, P or L ≈ 0)</td></tr>
          </tbody>
        </table>
      ) : null}
      <div className="seg wrap">{([['dist', 'Distances'], ['energy', 'Conservation'], ['speed', 'Speeds'], ['binary', 'Binary energy'], ['mom', 'Momentum & COM']] as [Group, string][]).map(([g, l]) => <button key={g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{l}</button>)}</div>
      <Plot series={plots.s} xLabel="time" yLabel={plots.y} log={plots.log} cursor={uiT} onCursor={(x) => { setPlaying(false); setT(x); }} height={170} />
      {group === 'binary' ? <p className="hint">Binary orbital energy is an <b>osculating two-body approximation</b>: the energy the pair would have if the third body vanished at that instant. It changes as the third body perturbs the pair.</p> : null}
      <div className="actions">
        <button className="small" onClick={() => downloadBlob(new Blob([trajectoryCSV(lab, tr)], { type: 'text/csv' }), 'trajectory.csv')}>Export trajectory CSV</button>
        <button className="small" disabled={refBusy} onClick={async () => { setRefBusy(true); try { setRef(await lab.loadReference(tr.overrides)); } catch (e) { alert(String(e)); } setRefBusy(false); }}>{refBusy ? 'Running reference…' : 'Compare with independent reference solver'}</button>
      </div>
      {ref ? <RefTable ref_={ref} /> : null}
      <p className="hint">Chaotic trajectories amplify tiny differences exponentially, so even two accurate solvers eventually disagree in detail; short-time convergence is the meaningful test.</p>
      {void info}
    </div>
  );
}

function RefTable({ ref_ }: { ref_: RefData }) {
  const rows = useMemo(() => {
    const out: { t: number; dr: number; dv: number; sep: number }[] = [];
    let L0 = Infinity; for (const [i, j] of PAIRS) L0 = Math.min(L0, 1); void L0;
    for (let k = 0; k < ref_.times.length; k++) {
      const a = ref_.main.subarray(k * 12, k * 12 + 12), b = ref_.ref.subarray(k * 12, k * 12 + 12);
      if (!Number.isFinite(a[0]) || !Number.isFinite(b[0])) continue;
      let dr = 0, dv = 0; for (let i = 0; i < 6; i++) { dr = Math.max(dr, Math.abs(a[i] - b[i])); dv = Math.max(dv, Math.abs(a[6 + i] - b[6 + i])); }
      out.push({ t: ref_.times[k], dr, dv, sep: scaledSeparation(a, b, 1, 1) });
    }
    return out;
  }, [ref_]);
  const s = ref_.mainSummary;
  return (
    <div className="box">
      <b>Independent reference (Gragg–Bulirsch–Stoer extrapolation, its own acceleration routine and contact finder)</b>
      <p className="hint">Same physical initial conditions; states compared at common times t_k up to the main run’s end (t = {s.tEnd.toFixed(4)}). Main: DOP853 rtol/atol as set; reference rtol {ref_.rtol}, atol {ref_.atol}. Reference steps: {ref_.refSteps.toLocaleString()}. {ref_.refContactPair >= 0 ? `Reference located a contact between ${['A–B', 'A–C', 'B–C'][ref_.refContactPair]} at t = ${ref_.refTContact.toFixed(6)}` + (s.outcome >= 3 && s.outcome <= 5 ? ` (main: ${s.tEnd.toFixed(6)}, difference ${Math.abs(ref_.refTContact - s.tEnd).toExponential(2)}).` : ' — the main run did NOT report this collision.') : 'Reference found no contact before the common end time.'} {!ref_.refOk ? '⚠ ' + ref_.refMessage : ''}</p>
      <table className="data compact"><thead><tr><th>t</th><th>max |Δposition|</th><th>max |Δvelocity|</th></tr></thead>
        <tbody>{rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 10)) === 0 || i === rows.length - 1).map((r) => <tr key={r.t}><td>{r.t.toFixed(3)}</td><td>{r.dr.toExponential(2)}</td><td>{r.dv.toExponential(2)}</td></tr>)}</tbody></table>
    </div>
  );
}

/** Initial three-body geometry of the applied set-up at the centre of the map (shown on opening, before anything is selected). */
function GeometryPreview({ lab }: { lab: Lab }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const a = lab.applied.axes, P = lab.applied.physics;
  const centre = { [a.varX]: (a.minX + a.maxX) / 2, [a.varY]: (a.minY + a.maxY) / 2 };
  useEffect(() => {
    const c = cv.current!, W = c.width, H = c.height, ctx = c.getContext('2d')!, ini = buildInitial(P, centre);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let b = 0; b < 3; b++) { x0 = Math.min(x0, ini.y[2 * b]); x1 = Math.max(x1, ini.y[2 * b]); y0 = Math.min(y0, ini.y[2 * b + 1]); y1 = Math.max(y1, ini.y[2 * b + 1]); }
    const s = Math.min((W - 60) / Math.max(x1 - x0, 1), (H - 60) / Math.max(y1 - y0, 1)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ctx.fillStyle = '#0b1019'; ctx.fillRect(0, 0, W, H);
    for (let b = 0; b < 3; b++) {
      const x = W / 2 + (ini.y[2 * b] - cx) * s, y = H / 2 - (ini.y[2 * b + 1] - cy) * s, vx = ini.y[6 + 2 * b], vy = ini.y[7 + 2 * b];
      ctx.strokeStyle = lab.appearance.bodies[b]; ctx.fillStyle = lab.appearance.bodies[b]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx * 28, y - vy * 28); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 5 + 2.5 * Math.cbrt(ini.m[b]), 0, 2 * Math.PI); ctx.fill();
      ctx.font = 'bold 12px system-ui'; ctx.fillText(BODY_NAMES[b], x + 9, y - 9);
    }
    ctx.fillStyle = '#6b7a93'; ctx.font = '11px system-ui'; ctx.fillText('arrows: initial velocities', 8, H - 8);
  });
  return (
    <div>
      <h3>Initial three-body geometry <small>centre of the map: {a.varX} = {Number((centre[a.varX]).toPrecision(5))}, {a.varY} = {Number((centre[a.varY]).toPrecision(5))}</small></h3>
      <canvas ref={cv} width={420} height={190} className="geo" aria-label="Initial three-body geometry" />
    </div>
  );
}
