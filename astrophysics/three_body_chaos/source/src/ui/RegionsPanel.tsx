import { useState } from 'react';
import type { Lab } from '../lab.ts';
import { EDGE, DEFAULT_WEIGHTS, type Region } from '../boundaries.ts';
import { OUTCOMES, outcomeText } from '../outcomes.ts';
import { useLab } from './hooks.ts';
import { NumInput } from './NumInput.tsx';
import { fmt } from './NumInput.tsx';
import { axisLabel } from '../initial.ts';

export function RegionsPanel({ lab }: { lab: Lab }) {
  useLab(lab, ['layers', 'explore', 'progress', 'config', 'validation']);
  const ex = lab.explore, S = ex.settings, ax = lab.applied.axes;
  const [msg, setMsg] = useState('');
  const complete = lab.remainingUniform() === 0;
  const regs = lab.regions();
  const crit = (bit: number, label: string) => <label><input type="checkbox" checked={!!(S.criteria & bit)} onChange={(e) => { S.criteria = e.target.checked ? S.criteria | bit : S.criteria & ~bit; lab.emit('explore'); }} />{label}</label>;
  return (
    <div className="panel-body">
      <h3>Auto-Explore Boundaries</h3>
      <p className="hint">Splits cells next to detected boundaries into four and runs <b>real simulations</b> at the four new cell centres (quadtree). Uniform sampling is kept, and a seeded stratified random sample looks for islands the boundary search can miss. It never claims all boundaries were found.</p>
      <div className="grid2">
        <NumInput label="max depth" value={S.maxDepth} onCommit={(v) => { S.maxDepth = Math.max(1, Math.min(12, Math.round(v))); lab.exploreDefaults(); lab.emit('explore'); return { value: S.maxDepth }; }} />
        <NumInput label="max extra simulations" value={S.maxExtra} onCommit={(v) => { S.maxExtra = Math.max(4, Math.min(5e6, Math.round(v))); lab.emit('explore'); return { value: S.maxExtra }; }} />
        <NumInput label={`min Δ${ax.varX}`} value={S.minDx || lab.cur.dx / 2 ** (S.maxDepth + 1)} onCommit={(v) => { S.minDx = Math.max(0, v); ex.minDxAuto = false; lab.emit('explore'); return { value: S.minDx }; }} hint="Smallest allowed refined cell width" />
        <NumInput label={`min Δ${ax.varY}`} value={S.minDy || lab.cur.dy / 2 ** (S.maxDepth + 1)} onCommit={(v) => { S.minDy = Math.max(0, v); ex.minDxAuto = false; lab.emit('explore'); return { value: S.minDy }; }} />
        <NumInput label="seed" value={S.seed} onCommit={(v) => { S.seed = Math.round(v) >>> 0; lab.emit('explore'); return { value: S.seed }; }} hint="Seed for the supplementary stratified samples (reproducible)" />
        <NumInput label="supplementary fraction" value={S.supFraction} onCommit={(v) => { S.supFraction = Math.max(0, Math.min(1, v)); lab.emit('explore'); return { value: S.supFraction }; }} />
      </div>
      <div className="opts">Priority: {crit(EDGE.OUTCOME, 'outcome change')}{crit(EDGE.COLEJ, 'collision↔ejection')}{crit(EDGE.TIME, 'event-time jump')}{crit(EDGE.CLOSE, 'closest-approach jump')}</div>
      <div className="btnrow">
        {!ex.running ? <button className="primary" disabled={!complete} onClick={() => setMsg(lab.startExplore() ?? '')}>Auto-Explore Boundaries</button>
          : ex.paused ? <button className="primary" onClick={() => lab.resumeExplore()}>Resume</button> : <button onClick={() => lab.pauseExplore()}>Pause</button>}
        <button onClick={() => lab.cancelExplore()} disabled={!ex.running}>Cancel</button>
      </div>
      {!complete ? <p className="hint">Available once the uniform grid of this layer is complete ({lab.remainingUniform().toLocaleString()} cells left).</p> : null}
      <p className="status">Status: <b>{ex.status}</b> · rounds {ex.rounds} · extra simulations {ex.extraUsed.toLocaleString()} / {S.maxExtra.toLocaleString()} · leaves {Math.round(lab.cur.leafCount()).toLocaleString()} · {lab.islands.size} island hint(s) {msg ? ' · ' + msg : ''}</p>
      <p className="hint">Manual investigations (a clicked trajectory, comparisons) take priority over this background work.</p>

      <h3>Interesting Regions to Explore</h3>
      <p className="hint">Blocks of the current layer ranked by a documented score (below). “Boundary” means neighbouring samples differ; it is not a claim of an exact or complete boundary.</p>
      {regs.interest.length === 0 ? <p className="hint">{lab.progress().done < 100 ? 'Waiting for enough computed samples…' : 'No block shows outcome transitions yet.'}</p> : regs.interest.map((r, i) => <RegionCard key={i} lab={lab} r={r} n={i + 1} />)}

      <h3>Regions needing numerical validation</h3>
      <p className="hint">Kept separate from scientific interest: unvalidated boundary samples, disagreement, failed or provisional trajectories.</p>
      {regs.validation.length === 0 ? <p className="hint">None flagged.</p> : regs.validation.map((r, i) => <RegionCard key={i} lab={lab} r={r} n={i + 1} />)}

      <details><summary>Ranking score &amp; weights</summary>
        <p className="hint mono">interest = [ w_o (D−1) ln(1+E_outcome) + w_c ln(1+E_col↔ej) + w_t ln(1+E_time) + w_d ln(1+E_close) + w_u ln(1+U_unresolved-cluster) ] × (1 + w_k × coarse-fraction)<br />validation = w_n ln(1+E_numeric) + w_x ln(1+untested boundary samples) + w_p ln(1+provisional+failed)</p>
        <div className="grid2">{(Object.keys(DEFAULT_WEIGHTS) as (keyof typeof DEFAULT_WEIGHTS)[]).map((k) => <NumInput key={k} label={'w_' + k} value={lab.weights[k]} onCommit={(v) => { lab.weights[k] = Math.max(0, v); lab.emit('layers'); return { value: lab.weights[k] }; }} />)}</div>
        <div className="grid2"><NumInput label="time-jump factor" value={lab.boundary.timeFactor} onCommit={(v) => { lab.boundary.timeFactor = Math.max(1.01, v); lab.emit('layers'); return { value: lab.boundary.timeFactor }; }} /><NumInput label="closest-approach factor" value={lab.boundary.closeFactor} onCommit={(v) => { lab.boundary.closeFactor = Math.max(1.01, v); lab.emit('layers'); return { value: lab.boundary.closeFactor }; }} /></div>
      </details>
    </div>
  );
}

function RegionCard({ lab, r, n }: { lab: Lab; r: Region; n: number }) {
  const ax = lab.applied.axes;
  return (
    <div className={'region ' + r.kind} onMouseEnter={() => lab.setHighlight(r.rect)} onMouseLeave={() => lab.setHighlight(null)}>
      <div className="rh"><b>#{n}</b> <span className="mono">{ax.varX} ∈ [{fmt(Number(r.rect.x0.toPrecision(5)))}, {fmt(Number(r.rect.x1.toPrecision(5)))}], {ax.varY} ∈ [{fmt(Number(r.rect.y0.toPrecision(5)))}, {fmt(Number(r.rect.y1.toPrecision(5)))}]</span> <small>score {r.score.toFixed(2)}</small></div>
      <div className="chips">{r.outcomes.map((o, i) => <span key={o} className="oc"><i style={{ background: lab.appearance.outcomes[o] }} />{OUTCOMES[o].short} {r.outcomeCounts[i]}</span>)}</div>
      <div className="hint">{r.samples} samples · {r.edges} boundary pairs · reliability: <b>{r.reliability}</b>{r.untested ? ` (${r.untested} untested)` : ''}</div>
      <ul className="why">{r.reasons.map((w) => <li key={w}>{w}</li>)}</ul>
      <div className="btnrow">
        <button className="small" onClick={() => { lab.setHighlight(null); lab.zoomToRect(r.rect); }}>Zoom</button>
        <button className="small" disabled={lab.remainingUniform() > 0} onClick={() => { const m = lab.startExplore(r.rect); if (m) alert(m); }}>Refine</button>
        <button className="small" onClick={() => { const h = lab.applied.physics.horizon * 2; if (confirm(`Extend the horizon from ${lab.applied.physics.horizon} to ${h}? Unresolved samples (everywhere) continue from their checkpoints; completed samples are kept.`)) lab.extendHorizon(h); }}>Extend</button>
        <button className="small" disabled={!r.pair} onClick={() => { if (r.pair) void lab.compareSides(lab.cur, r.pair[0], r.pair[1]).then(() => lab.emit('compare')); lab.emit('compare'); lab.navigate?.('compare'); }}>Compare both sides</button>
        <button className="small" onClick={() => lab.validate(lab.untestedBoundary(lab.cur, 120, r.rect))}>Validate</button>
      </div>
      {r.pair ? <div className="hint">pair: {outcomeText(lab.cur.store.outcome[r.pair[0]])} ↔ {outcomeText(lab.cur.store.outcome[r.pair[1]])}</div> : null}
      {void axisLabel}
    </div>
  );
}
