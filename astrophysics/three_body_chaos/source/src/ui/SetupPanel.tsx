import { useEffect, useRef, useState } from 'react';
import type { Lab } from '../lab.ts';
import { AXIS_VAR_IDS, GLOBAL_LIMITS, PARAM_DEFS, axisLabel, buildInitial, clampParam, getParam, setParam, validatePhysics, type Numerics, type Physics } from '../initial.ts';
import { BODY_NAMES, OUTCOMES } from '../outcomes.ts';
import { useLab } from './hooks.ts';
import { NumInput, type Commit } from './NumInput.tsx';
import { ColourPicker } from './ColourPicker.tsx';
import { RESOLUTIONS } from '../lab.ts';
import { PRESETS, getPreset } from '../presets.ts';

export function SetupPanel({ lab }: { lab: Lab }) {
  useLab(lab, ['config', 'appearance', 'progress', 'selection']);
  const P = lab.pending.physics, N = lab.pending.numerics, A = lab.pending.axes;
  const [problems, setProblems] = useState<string[]>([]);
  const dirty = lab.pendingDirty();
  const edit = (fn: () => void) => { fn(); lab.emit('config'); };
  const isAxis = (id: string) => id === A.varX || id === A.varY;
  /** commit a Physics parameter with clamping, overlap rejection and an explanation */
  const setP = (id: string) => (v: number): Commit => {
    const prev = getParam(P, id), c = clampParam(id, v, prev);
    setParam(P, id, c.value);
    if (P.mode === 'explicit' || id.startsWith('r') || id.startsWith('m') || id === 'sep' || id === 'cx') {
      const probe = validatePhysics(P, { [A.varX]: (A.minX + A.maxX) / 2, [A.varY]: (A.minY + A.maxY) / 2 });
      const overlap = probe.find((e) => /overlap|coincide/.test(e));
      if (overlap) { setParam(P, id, prev); lab.emit('config'); return { value: prev, message: 'Rejected: ' + overlap } as Commit; }
    }
    lab.emit('config'); return { value: c.value, message: c.message };
  };
  const setN = (k: keyof Numerics, min: number, max: number) => (v: number): Commit => {
    const c = Math.min(max, Math.max(min, v)); (N as any)[k] = c; lab.emit('config');
    return { value: c, message: c !== v ? `${k}: allowed range is ${min}–${max}; set to ${c}.` : undefined };
  };
  const setG = (v: number): Commit => { const c = Math.min(GLOBAL_LIMITS.G.max, Math.max(GLOBAL_LIMITS.G.min, v)); P.G = c; lab.emit('config'); return { value: c, message: c !== v ? `G must be in ${GLOBAL_LIMITS.G.min}–${GLOBAL_LIMITS.G.max}.` : undefined }; };
  const setH = (v: number): Commit => { const c = Math.min(GLOBAL_LIMITS.horizon.max, Math.max(GLOBAL_LIMITS.horizon.min, v)); P.horizon = c; lab.emit('config'); return { value: c, message: c !== v ? `Horizon must be in ${GLOBAL_LIMITS.horizon.min}–${GLOBAL_LIMITS.horizon.max}.` : undefined }; };
  const axisCommit = (k: 'minX' | 'maxX' | 'minY' | 'maxY') => (v: number): Commit => { (A as any)[k] = v; lab.emit('config'); return { value: v }; };
  const modeVars = AXIS_VAR_IDS(P.mode);
  const preset = getPreset(lab.pending.presetId);

  return (
    <div className="panel-body setup">
      {dirty ? (
        <div className="banner pending">
          <b>Pending physical changes.</b> The map still shows the configuration that produced it. Applying will <b>discard incompatible results</b> and recalculate.
          <div className="btnrow"><button className="primary" onClick={() => setProblems(lab.applyPending())}>Apply &amp; recalculate</button><button onClick={() => { lab.discardPending(); setProblems([]); }}>Discard</button></div>
          {problems.length ? <ul className="errs">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        </div>
      ) : null}

      <details open>
        <summary>Experiment</summary>
        <select aria-label="Experiment preset" value={lab.pending.presetId} onChange={(e) => { if (e.target.value === 'custom') return; if (dirty && !confirm('Loading a preset replaces your pending edits. Continue?')) return; const pr = lab.loadPreset(e.target.value); setProblems(pr); }}>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === 'verified' ? ' ✔' : ''}</option>)}
          {lab.pending.presetId === 'custom' ? <option value="custom">Custom (edited)</option> : null}
        </select>
        {lab.pending.presetId !== 'custom' ? (
          <div className="preset-note">
            <p>{preset.summary}</p>
            <details><summary>Evidence &amp; limitations ({preset.status})</summary>
              <ul>{preset.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul><ul className="lim">{preset.limitations.map((e, i) => <li key={i}>{e}</li>)}</ul></details>
          </div>
        ) : null}
        <label className="inline">Set-up
          <select value={P.mode} onChange={(e) => edit(() => { P.mode = e.target.value as Physics['mode']; lab.pending.presetId = 'custom'; A.varX = P.mode === 'scattering' ? 'b' : 'x2'; A.varY = P.mode === 'scattering' ? 'v' : 'y2'; setBounds(A, 'X', P); setBounds(A, 'Y', P); })}>
            <option value="scattering">binary–single scattering (b, v, φ …)</option><option value="explicit">explicit bodies (x, y, vx, vy)</option>
          </select>
        </label>
      </details>

      <details open>
        <summary>Global physics &amp; time</summary>
        <NumInput label="G" value={P.G} onCommit={setG} hint="Gravitational constant (1 in dimensionless units)" />
        <NumInput label="Horizon" unit="T" value={P.horizon} onCommit={setH} hint="Integration continues until the first accepted step at or beyond this time. Raising it later continues unresolved samples from their checkpoints." />
        <label className="inline">Initial frame
          <select value={P.frame} onChange={(e) => edit(() => { P.frame = e.target.value as any; lab.pending.presetId = 'custom'; })} disabled={P.mode === 'explicit'}>
            <option value="com">total centre of mass (default)</option><option value="binary">binary rest frame</option>
          </select>
        </label>
        <p className="hint">Dimensionless units, no damping, friction or softening. A change of <i>viewing</i> frame never alters the integration.</p>
      </details>

      <details open>
        <summary>Bodies</summary>
        {[0, 1, 2].map((b) => (
          <fieldset key={b} className="body">
            <legend><ColourPicker label={`body ${BODY_NAMES[b]}`} value={lab.appearance.bodies[b]} onChange={(h) => lab.setBodyColour(b, h)} /> Body {BODY_NAMES[b]}</legend>
            <div className="grid2">
              <NumInput label="mass" value={P.m[b]} onCommit={setP('m' + b)} />
              <NumInput label="radius" value={P.r[b]} onCommit={setP('r' + b)} hint="Physical contact radius; 0 = point mass" />
              {P.mode === 'explicit' ? <>
                <NumInput label="x" value={P.explicit.x[b]} onCommit={setP('x' + b)} disabled={isAxis('x' + b)} title={isAxis('x' + b) ? 'swept on the map' : undefined} />
                <NumInput label="y" value={P.explicit.y[b]} onCommit={setP('y' + b)} disabled={isAxis('y' + b)} />
                <NumInput label="vx" value={P.explicit.vx[b]} onCommit={setP('vx' + b)} disabled={isAxis('vx' + b)} />
                <NumInput label="vy" value={P.explicit.vy[b]} onCommit={setP('vy' + b)} disabled={isAxis('vy' + b)} />
              </> : null}
            </div>
          </fieldset>
        ))}
        {P.mode === 'scattering' ? (
          <fieldset className="body"><legend>Binary &amp; incoming body</legend>
            <div className="grid2">
              <NumInput label="A–B separation" unit="L" value={P.scatter.sep} onCommit={setP('sep')} />
              <NumInput label="eccentricity e" value={P.scatter.ecc} onCommit={setP('ecc')} hint="Binary starts at pericentre; e = 0 is circular" />
              <NumInput label="binary phase φ" unit="°" value={P.scatter.phaseDeg} onCommit={setP('phase')} disabled={isAxis('phase')} hint="Rotates the binary's relative position and velocity together (0°–360°)" />
              <NumInput label="C start x" unit="L" value={P.scatter.cx} onCommit={setP('cx')} />
              <NumInput label="b (offset)" unit="L" value={P.scatter.b} onCommit={setP('b')} disabled={isAxis('b')} title={isAxis('b') ? 'swept on the map' : undefined} />
              <NumInput label="v (speed)" unit="L/T" value={P.scatter.v} onCommit={setP('v')} disabled={isAxis('v')} title={isAxis('v') ? 'swept on the map' : undefined} />
            </div>
            <p className="hint">v is C's speed at the finite start x, not its speed at infinity. The circular binary velocity is derived from the masses ( v_rel = √(G(mA+mB)(1+e)/sep) ), so unequal masses are handled correctly. After construction all bodies are transformed to the chosen frame.</p>
          </fieldset>
        ) : (
          <button className="small" onClick={() => edit(() => {
            let M = 0, cx = 0, cy = 0, vx = 0, vy = 0; for (let b = 0; b < 3; b++) { M += P.m[b]; cx += P.m[b] * P.explicit.x[b]; cy += P.m[b] * P.explicit.y[b]; vx += P.m[b] * P.explicit.vx[b]; vy += P.m[b] * P.explicit.vy[b]; }
            for (let b = 0; b < 3; b++) { P.explicit.x[b] -= cx / M; P.explicit.y[b] -= cy / M; P.explicit.vx[b] -= vx / M; P.explicit.vy[b] -= vy / M; } lab.pending.presetId = 'custom';
          })}>Transform to centre-of-mass frame</button>
        )}
      </details>

      <PlacementEditor lab={lab} />

      <details open>
        <summary>Map</summary>
        <label className="inline">Horizontal
          <select value={A.varX} onChange={(e) => edit(() => { A.varX = e.target.value; lab.pending.presetId = 'custom'; setBounds(A, 'X', P); })}>{modeVars.map((id) => <option key={id} value={id}>{axisLabel(id)}</option>)}</select></label>
        <div className="grid2"><NumInput label="min" value={A.minX} onCommit={axisCommit('minX')} /><NumInput label="max" value={A.maxX} onCommit={axisCommit('maxX')} /></div>
        <label className="inline">Vertical
          <select value={A.varY} onChange={(e) => edit(() => { A.varY = e.target.value; lab.pending.presetId = 'custom'; setBounds(A, 'Y', P); })}>{modeVars.map((id) => <option key={id} value={id}>{axisLabel(id)}</option>)}</select></label>
        <div className="grid2"><NumInput label="min" value={A.minY} onCommit={axisCommit('minY')} /><NumInput label="max" value={A.maxY} onCommit={axisCommit('maxY')} /></div>
        <label className="inline">Resolution
          <select value={lab.pending.resolution} onChange={(e) => edit(() => { lab.pending.resolution = +e.target.value; })}>{RESOLUTIONS.map((r) => <option key={r} value={r}>{r} × {r}{r === 1000 ? ' (heavy)' : ''}</option>)}</select></label>
        <p className="hint">Samples sit at pixel centres; the vertical axis increases upward. {lab.pending.resolution >= 500 ? `At ${lab.pending.resolution}² the map holds ${(lab.pending.resolution ** 2).toLocaleString()} trajectories (~${Math.round(lab.pending.resolution ** 2 * 62 / 1048576)} MB of results).` : ''}</p>
      </details>

      <details>
        <summary>Numerics &amp; criteria</summary>
        <NumInput label="rtol" value={N.rtol} onCommit={setN('rtol', GLOBAL_LIMITS.rtol.min, GLOBAL_LIMITS.rtol.max)} hint="Relative tolerance of the DOP853 integrator (default 1e-9)" />
        <NumInput label="atol" value={N.atol} onCommit={setN('atol', GLOBAL_LIMITS.atol.min, GLOBAL_LIMITS.atol.max)} hint="Absolute tolerance (default 1e-11)" />
        <NumInput label="max steps / trajectory" value={N.maxSteps} onCommit={setN('maxSteps', GLOBAL_LIMITS.maxSteps.min, GLOBAL_LIMITS.maxSteps.max)} hint="Bounded work; exceeding it is reported as a failure" />
        <NumInput label="escape: hierarchy ×" value={N.hierarchy} onCommit={setN('hierarchy', 1, 1000)} hint="Escaper must be ≥ this many pair apocentres from the pair" />
        <NumInput label="escape: sustain (pair periods)" value={N.sustainPeriods} onCommit={setN('sustainPeriods', 0, 100)} />
        <NumInput label="escape: min sustain" unit="T" value={N.minSustain} onCommit={setN('minSustain', 0, 1e4)} />
        <NumInput label="close encounter: factor × L" value={N.closeFactor} onCommit={setN('closeFactor', 1e-6, 100)} />
        <NumInput label="close encounter: hysteresis ratio" value={N.closeHyst} onCommit={setN('closeHyst', 1.01, 100)} />
        <NumInput label="energy error: provisional ≥" value={N.warnE} onCommit={setN('warnE', 1e-14, 1)} />
        <NumInput label="energy error: unreliable ≥" value={N.failE} onCommit={setN('failE', 1e-14, 1)} />
        <p className="hint">Tolerances are never loosened automatically. Method: DOP853 (adaptive 8th-order Runge–Kutta, 7th-order dense output). A symplectic option is not provided.</p>
      </details>

      <details open>
        <summary>Compute budget</summary>
        <label className="inline">Workers <input type="range" min={1} max={navigator.hardwareConcurrency || 4} value={lab.scheduler.budget} onChange={(e) => lab.setWorkers(+e.target.value)} /> {lab.scheduler.budget} of {navigator.hardwareConcurrency || '?'} logical CPUs</label>
        <p className="hint">Map memory ≈ {(lab.memoryBytes() / 1048576).toFixed(0)} MB of {(900).toFixed(0)} MB limit (oldest zoom layers are dropped beyond it).</p>
      </details>

      <details>
        <summary>Colours (appearance only)</summary>
        <p className="hint"><b>Body colours</b> identify bodies A, B, C in the geometry, trails, labels and comparisons. <b>Outcome colours</b> label categories on the map (e.g. “C escapes”); an outcome colour is not a body colour. Changing colours recolours everything instantly and never recalculates anything.</p>
        <div className="colours">{OUTCOMES.map((o) => <label key={o.code} className="crow"><ColourPicker label={o.label} value={lab.appearance.outcomes[o.code]} onChange={(h) => lab.setOutcomeColour(o.code, h)} /> {o.short}</label>)}</div>
        <label><input type="checkbox" checked={lab.appearance.showHatch} onChange={(e) => lab.setAppearance({ showHatch: e.target.checked })} /> hatch uncalculated areas</label>
        <label><input type="checkbox" checked={lab.appearance.showPreview} onChange={(e) => lab.setAppearance({ showPreview: e.target.checked })} /> dimmed preview of coarse results</label>
        <button className="small" onClick={() => lab.resetAppearance()}>Reset colours</button>
      </details>
    </div>
  );
}

function setBounds(A: any, which: 'X' | 'Y', P: Physics): void {
  const id = which === 'X' ? A.varX : A.varY, d = PARAM_DEFS[id], v = getParam(P, id);
  const span = Math.max(1, Math.abs(v)) * 0.5;
  const lo = Math.max(d.min, v - span), hi = Math.min(d.max, v + span);
  A['min' + which] = lo; A['max' + which] = hi > lo ? hi : lo + 1;
}

/** Optional physical-placement editor: click in the picture to set the selected body's x/y fields. */
function PlacementEditor({ lab }: { lab: Lab }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [body, setBody] = useState(2);
  const [placing, setPlacing] = useState(false);
  const geo = useRef({ cx: 0, cy: 0, s: 1 });
  const P = lab.pending.physics, A = lab.pending.axes;
  const centre = { [A.varX]: lab.sel ? lab.selectedLayer()?.store.X[lab.sel.sampleId] ?? (A.minX + A.maxX) / 2 : (A.minX + A.maxX) / 2, [A.varY]: lab.sel ? lab.selectedLayer()?.store.Y[lab.sel.sampleId] ?? (A.minY + A.maxY) / 2 : (A.minY + A.maxY) / 2 };
  useEffect(() => {
    const c = cv.current!; const W = c.width, H = c.height; const ctx = c.getContext('2d')!;
    let ini; try { ini = buildInitial(P, lab.sel && lab.pendingDirty() === false ? centre : { [A.varX]: (A.minX + A.maxX) / 2, [A.varY]: (A.minY + A.maxY) / 2 }); } catch { return; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let b = 0; b < 3; b++) { x0 = Math.min(x0, ini.y[2 * b]); x1 = Math.max(x1, ini.y[2 * b]); y0 = Math.min(y0, ini.y[2 * b + 1]); y1 = Math.max(y1, ini.y[2 * b + 1]); }
    const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1), s = Math.min(W / bw, H / bh) * 0.8;
    geo.current = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s };
    ctx.fillStyle = '#0b1019'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#1b2336';
    ctx.beginPath(); ctx.moveTo(0, H / 2 + geo.current.cy * s); ctx.lineTo(W, H / 2 + geo.current.cy * s); ctx.moveTo(W / 2 - geo.current.cx * s, 0); ctx.lineTo(W / 2 - geo.current.cx * s, H); ctx.stroke();
    for (let b = 0; b < 3; b++) {
      const x = W / 2 + (ini.y[2 * b] - geo.current.cx) * s, y = H / 2 - (ini.y[2 * b + 1] - geo.current.cy) * s;
      ctx.fillStyle = lab.appearance.bodies[b]; ctx.beginPath(); ctx.arc(x, y, 4 + 2.5 * Math.cbrt(P.m[b]), 0, 2 * Math.PI); ctx.fill();
      if (b === body) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 2 * Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#c3cfe0'; ctx.font = '11px system-ui'; ctx.fillText(BODY_NAMES[b], x + 8, y - 8);
      const vx = ini.y[6 + 2 * b], vy = ini.y[7 + 2 * b]; ctx.strokeStyle = lab.appearance.bodies[b]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx * 22, y - vy * 22); ctx.stroke();
    }
  });
  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placing) return;
    const r = e.currentTarget.getBoundingClientRect(), W = e.currentTarget.width, H = e.currentTarget.height;
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H, g = geo.current;
    const x = g.cx + (px - W / 2) / g.s, y = g.cy - (py - H / 2) / g.s;
    const prev = JSON.stringify(P);
    if (P.mode === 'explicit') { P.explicit.x[body] = x; P.explicit.y[body] = y; }
    else if (body === 2) { P.scatter.cx = x; P.scatter.b = y; }
    else { alert('In the scattering set-up the binary is constructed from its separation, eccentricity and phase. Switch the Set-up to “explicit bodies” to place A or B freely.'); setPlacing(false); return; }
    if (validatePhysics(P).some((m) => /overlap|coincide/.test(m))) { Object.assign(P, JSON.parse(prev)); alert('That position overlaps another body; not placed.'); }
    else lab.pending.presetId = 'custom';
    setPlacing(false); lab.emit('config');
  };
  return (
    <details open>
      <summary>Initial geometry &amp; body placement</summary>
      <canvas ref={cv} width={280} height={170} className="geo" onClick={click} style={{ cursor: placing ? 'crosshair' : 'default' }} aria-label="Initial geometry" />
      <div className="btnrow">
        <select value={body} onChange={(e) => setBody(+e.target.value)}>{[0, 1, 2].map((b) => <option key={b} value={b}>body {BODY_NAMES[b]}</option>)}</select>
        <button className={placing ? 'primary small' : 'small'} onClick={() => setPlacing(!placing)}>{placing ? 'Click the picture…' : 'Place body'}</button>
      </div>
      <p className="hint">Physical placement sets the body's x/y fields (then fine-tune them above). Clicking the <i>parameter map</i> never moves a body: it selects experiment parameters.</p>
    </details>
  );
}
