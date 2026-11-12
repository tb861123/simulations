import { useCallback, useEffect, useRef, useState } from 'react';
import { MODE_INFO, drawAxes, drawEdges, legendFor, paintMap } from '../maprender.ts';
import { axisLabel } from '../initial.ts';
import { outcomeText } from '../outcomes.ts';
import { formatEta, type Lab, type MapMode } from '../lab.ts';
import { NOT_COMPUTED, SUPPLEMENTARY } from '../store.ts';
import { useLab } from './hooks.ts';
import { fmt } from './NumInput.tsx';
import { mapPNG, downloadBlob } from '../export.ts';

const M = { l: 64, t: 8, r: 10, b: 46 };
const MODES: MapMode[] = ['outcome', 'tEscape', 'tCollision', 'survival', 'minDist', 'nClose', 'exchange', 'sens', 'complexity', 'reliability', 'density'];

export function MapView({ lab }: { lab: Lab }) {
  useLab(lab, ['layers', 'view', 'appearance', 'selection', 'progress', 'config']);
  const wrap = useRef<HTMLDivElement>(null), base = useRef<HTMLCanvasElement>(null), over = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [tool, setTool] = useState<'inspect' | 'zoom' | 'pan'>('inspect');
  const [hover, setHover] = useState('');
  const [regionName, setRegionName] = useState('');
  const drag = useRef<{ x: number; y: number; moved: boolean; mode: string; x1?: number; y1?: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const last = useRef(0);
  const timer = useRef<any>(null);

  const pw = Math.max(50, size.w - M.l - M.r), ph = Math.max(50, size.h - M.t - M.b);
  const toData = useCallback((px: number, py: number) => ({ x: lab.view.x0 + ((px - M.l) / pw) * (lab.view.x1 - lab.view.x0), y: lab.view.y1 - ((py - M.t) / ph) * (lab.view.y1 - lab.view.y0) }), [lab, pw, ph]);

  useEffect(() => {
    const el = wrap.current!; const ro = new ResizeObserver(() => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(200, el.clientHeight) })); ro.observe(el);
    setSize({ w: Math.max(200, el.clientWidth), h: Math.max(200, el.clientHeight) }); return () => ro.disconnect();
  }, []);

  // ---- base layer: map image, boundary overlay, axes. Repainted at most ~8x/s while data stream in ----
  const drawBase = useCallback(() => {
    const cv = base.current; if (!cv) return;
    const ctx = cv.getContext('2d')!; cv.width = size.w; cv.height = size.h;
    ctx.fillStyle = '#0b1019'; ctx.fillRect(0, 0, size.w, size.h);
    const img = paintMap(lab, Math.round(pw), Math.round(ph), lab.view, lab.mapMode, lab.appearance, { hatch: lab.appearance.showHatch, preview: lab.appearance.showPreview });
    ctx.putImageData(img, M.l, M.t);
    if (lab.showBoundaries && lab.mapMode !== 'density') drawEdges(ctx, lab, lab.cur, lab.view, Math.round(pw), Math.round(ph), M.l, M.t, 1.2);
    if (lab.showSamples && lab.mapMode !== 'density') {
      const s = lab.cur.store, v = lab.view; let n = 0; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = 'rgba(0,0,0,.6)';
      for (let i = 0; i < s.count && n < 40000; i++) { if (s.outcome[i] === NOT_COMPUTED) continue; const px = M.l + ((s.X[i] - v.x0) / (v.x1 - v.x0)) * pw, py = M.t + ((v.y1 - s.Y[i]) / (v.y1 - v.y0)) * ph; if (px > M.l && px < M.l + pw && py > M.t && py < M.t + ph) { ctx.fillRect(px - 1, py - 1, 2, 2); n++; } }
    }
    if (lab.mapMode === 'density') { ctx.fillStyle = '#fff'; const s = lab.cur.store, v = lab.view; for (let i = 0; i < s.count; i++) { if (s.depth[i] !== SUPPLEMENTARY) continue; const px = M.l + ((s.X[i] - v.x0) / (v.x1 - v.x0)) * pw, py = M.t + ((v.y1 - s.Y[i]) / (v.y1 - v.y0)) * ph; if (px > M.l && px < M.l + pw && py > M.t && py < M.t + ph) ctx.fillRect(px - 1, py - 1, 3, 3); } }
    drawAxes(ctx, M.l, M.t, pw, ph, lab.view, axisLabel(lab.applied.axes.varX), axisLabel(lab.applied.axes.varY));
    drawOver();
  }, [lab, size, pw, ph]);

  const drawOver = useCallback(() => {
    const cv = over.current; if (!cv) return;
    const ctx = cv.getContext('2d')!; cv.width = size.w; cv.height = size.h; ctx.clearRect(0, 0, size.w, size.h);
    const v = lab.view, sx = (x: number) => M.l + ((x - v.x0) / (v.x1 - v.x0)) * pw, sy = (y: number) => M.t + ((v.y1 - y) / (v.y1 - v.y0)) * ph;
    ctx.save(); ctx.beginPath(); ctx.rect(M.l, M.t, pw, ph); ctx.clip();
    if (lab.sel) { const L = lab.selectedLayer(); if (L) { const x = sx(L.store.X[lab.sel.sampleId]), y = sy(L.store.Y[lab.sel.sampleId]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14); ctx.stroke(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9.5, 0, 2 * Math.PI); ctx.stroke(); } }
    if (lab.highlight) { const h = lab.highlight; ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(sx(h.x0), sy(h.y1), sx(h.x1) - sx(h.x0), sy(h.y0) - sy(h.y1)); ctx.setLineDash([]); }
    // outline of the current calculation layer when zoomed
    const L = lab.cur; if (L !== lab.layers[0]) { ctx.strokeStyle = 'rgba(120,200,255,.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.strokeRect(sx(L.rect.x0), sy(L.rect.y1), sx(L.rect.x1) - sx(L.rect.x0), sy(L.rect.y0) - sy(L.rect.y1)); ctx.setLineDash([]); }
    const d = drag.current;
    if (d && d.mode === 'zoom' && d.moved && d.x1 !== undefined) { ctx.strokeStyle = '#fff'; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.fillRect(d.x, d.y, d.x1 - d.x, d.y1! - d.y); ctx.strokeRect(d.x, d.y, d.x1 - d.x, d.y1! - d.y); }
    ctx.restore();
  }, [lab, size, pw, ph]);

  const schedule = useCallback(() => {
    const now = performance.now(), wait = Math.max(0, 120 - (now - last.current));
    clearTimeout(timer.current); timer.current = setTimeout(() => { last.current = performance.now(); drawBase(); }, wait);
  }, [drawBase]);
  useEffect(() => { schedule(); });  // runs after every render (render itself is driven by lab topics)
  useEffect(() => { drawOver(); });

  // ---- interaction ------------------------------------------------------------------------------
  useEffect(() => {
    const el = over.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect(); const d = toData(e.clientX - r.left, e.clientY - r.top);
      lab.zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), d.x, d.y);
    };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, [lab, toData]);

  const rel = (e: React.PointerEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = rel(e); pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = Math.hypot(a.x - b.x, a.y - b.y); drag.current = null; return; }
    drag.current = { x: p.x, y: p.y, moved: false, mode: tool === 'zoom' && !e.shiftKey ? 'zoom' : 'pan' };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = rel(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y); const c = toData((a.x + b.x) / 2, (a.y + b.y) / 2);
      if (dist > 0) { lab.zoomBy(pinch.current / dist, c.x, c.y); pinch.current = dist; } return;
    }
    const d = drag.current;
    if (d) {
      if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) > 4) d.moved = true;
      if (d.moved && d.mode === 'pan') { const v = lab.view; lab.pan(-((p.x - d.x) / pw) * (v.x1 - v.x0), ((p.y - d.y) / ph) * (v.y1 - v.y0)); d.x = p.x; d.y = p.y; }
      if (d.mode === 'zoom') { d.x1 = p.x; d.y1 = p.y; drawOver(); }
    }
    // hover read-out
    if (!pointers.current.size || pointers.current.size === 1) {
      const dd = toData(p.x, p.y), v = lab.view;
      if (dd.x >= v.x0 && dd.x <= v.x1 && dd.y >= v.y0 && dd.y <= v.y1) {
        const pk = lab.pick(dd.x, dd.y), ax = lab.applied.axes;
        let t = `${ax.varX} = ${fmt(Number(dd.x.toPrecision(6)))}, ${ax.varY} = ${fmt(Number(dd.y.toPrecision(6)))}`;
        if (pk) { const o = pk.layer.store.outcome[pk.sampleId]; t += o === NOT_COMPUTED ? ' · this cell: not yet calculated' : ` · nearest sample (${pk.layer.label}): ${outcomeText(o)}`; }
        setHover(t);
      } else setHover('');
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const p = rel(e); pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (d.mode === 'zoom' && d.moved && d.x1 !== undefined) {
      const a = toData(Math.min(d.x, d.x1), Math.max(d.y, d.y1!)), b = toData(Math.max(d.x, d.x1), Math.min(d.y, d.y1!));
      if (b.x - a.x > 0 && b.y - a.y > 0) lab.zoomToRect({ x0: a.x, x1: b.x, y0: a.y, y1: b.y });
      drawOver(); return;
    }
    if (d.moved) { lab.commitView(); return; }
    // click: select the exact sample under the pointer (its axis parameters, not a physical position)
    const dd = toData(p.x, p.y), pk = lab.pick(dd.x, dd.y);
    if (pk) lab.select(pk.layer.id, pk.sampleId);
  };
  const onDbl = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const d = toData(e.clientX - r.left, e.clientY - r.top), v = lab.view, f = e.shiftKey ? 2 : 0.5;
    lab.setView({ x0: d.x - (d.x - v.x0) * f, x1: d.x + (v.x1 - d.x) * f, y0: d.y - (d.y - v.y0) * f, y1: d.y + (v.y1 - d.y) * f }, 'now');
  };

  const pr = lab.progress();
  const warns = lab.viewWarnings();
  const covered = lab.coveringLayer() !== null;
  const leg = legendFor(lab, lab.mapMode);
  const v = lab.view, N = lab.applied.resolution;

  return (
    <section className="map-pane" aria-label="Parameter map">
      <div className="toolbar" role="toolbar" aria-label="Map tools">
        <div className="seg">
          {(['inspect', 'zoom', 'pan'] as const).map((t) => <button key={t} className={tool === t ? 'on' : ''} onClick={() => setTool(t)} title={t === 'inspect' ? 'Click selects a sample; drag pans' : t === 'zoom' ? 'Drag a rectangle to zoom (and calculate at that scale)' : 'Drag to pan'}>{t === 'inspect' ? 'Select' : t === 'zoom' ? 'Zoom box' : 'Pan'}</button>)}
        </div>
        <div className="seg">
          <button onClick={() => lab.back()} disabled={lab.histIndex <= 0} title="Previous view">◀</button>
          <button onClick={() => lab.forward()} disabled={lab.histIndex >= lab.history.length - 1} title="Next view">▶</button>
          <button onClick={() => lab.resetView()} title="Back to the full map">Reset</button>
        </div>
        <label className="inline">Map shows
          <select value={lab.mapMode} onChange={(e) => { lab.mapMode = e.target.value as MapMode; lab.emit('layers'); }}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_INFO[m].label}</option>)}
          </select>
        </label>
        <label className="inline"><input type="checkbox" checked={lab.showBoundaries} onChange={(e) => { lab.showBoundaries = e.target.checked; lab.emit('layers'); }} /> Boundaries</label>
        <label className="inline" title="Mark every actual simulated sample location (cell centres; dots in zoomed views). Filled cells are footprints of one sample each."><input type="checkbox" checked={lab.showSamples} onChange={(e) => { lab.showSamples = e.target.checked; lab.emit('layers'); }} /> Sample points</label>
        <button className="small" onClick={() => mapPNG(lab).toBlob((b) => b && downloadBlob(b, 'three-body-map.png'))} title="Labelled high-resolution PNG with legend and settings">PNG</button>
      </div>

      <div className="stats" aria-live="polite">
        <span title="samples calculated / samples in this layer"><b>{pr.done.toLocaleString()}</b>/{pr.total.toLocaleString()} done</span>
        <span title="not yet calculated">left <b>{pr.remaining.toLocaleString()}</b></span>
        <span title="calculated but unresolved at the horizon">unres. <b>{pr.unresolved.toLocaleString()}</b></span>
        <span title="numerically unreliable or failed">failed <b>{pr.failed.toLocaleString()}</b></span>
        <span title="provisionally classified">prov. <b>{pr.provisional.toLocaleString()}</b></span>
        <span title="estimated remaining wall time HH:MM:SS">ETA <b>{formatEta(pr.etaSeconds)}</b></span>
        <span title="busy workers / worker budget">workers <b>{pr.workersBusy}/{pr.workers}</b>{pr.rate ? ` · ${Math.round(pr.rate).toLocaleString()}/s` : ''}</span>
        <span className="grow" />
        {pr.paused ? <button className="primary small" onClick={() => lab.resume()}>▶ Resume</button> : <button className="small" onClick={() => lab.pause()}>⏸ Pause</button>}
        <button className="small" onClick={() => lab.continueCalc()} title="Queue any uncalculated samples">Calc</button>
        <button className="small" onClick={() => lab.cancelAll()}>Cancel</button>
      </div>
      <div className="progressbar"><div style={{ width: `${(100 * pr.done) / Math.max(1, pr.total)}%` }} /></div>

      {lab.restoredPaused ? <div className="banner info">Investigation restored <b>paused</b>. Review it, then press Resume to continue unfinished work.</div> : null}
      {!covered ? <div className="banner info">The current view is shown from coarser data. <button className="small primary" onClick={() => lab.ensureLayerForView()}>Calculate this view</button></div> : null}
      {warns.map((w, i) => <div key={i} className="banner warn">⚠ {w}</div>)}

      <div className="map-wrap" ref={wrap}>
        <canvas ref={base} className="map-canvas" style={{ width: size.w, height: size.h }} />
        <canvas ref={over} className="map-canvas over" style={{ width: size.w, height: size.h, cursor: tool === 'zoom' ? 'crosshair' : tool === 'pan' ? 'grab' : 'pointer', touchAction: 'none' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDbl} onPointerLeave={() => setHover('')} aria-label="Click a pixel to select its experiment parameters" />
      </div>

      <div className="hoverline">{hover || 'Hover for coordinates · a click selects experiment parameters (not a physical position)'}</div>
      <div className="viewinfo">
        {lab.applied.axes.varX} ∈ [{fmt(Number(v.x0.toPrecision(6)))}, {fmt(Number(v.x1.toPrecision(6)))}] · {lab.applied.axes.varY} ∈ [{fmt(Number(v.y0.toPrecision(6)))}, {fmt(Number(v.y1.toPrecision(6)))}] · layer “{lab.cur.label}” {N}×{N}, Δ = ({lab.cur.dx.toPrecision(3)}, {lab.cur.dy.toPrecision(3)}) · {lab.cur.store.count.toLocaleString()} samples ≈{(lab.memoryBytes() / 1048576).toFixed(0)} MB
      </div>
      <div className="legend">
        {leg.kind === 'categorical' ? leg.entries!.map((en) => <span key={en.label} title={en.label}><i style={{ background: en.colour }} />{en.label} <em>{en.count.toLocaleString()}</em></span>) : (
          <span className="cbar"><em>{fmt(Number((leg.min ?? 0).toPrecision(4)))}</em><i className="grad" style={{ background: `linear-gradient(90deg, ${leg.stops!.map((c) => `rgb(${c.join(',')})`).join(',')})` }} /><em>{fmt(Number((leg.max ?? 1).toPrecision(4)))} {leg.unit}</em>{leg.logNote ? <em> ({leg.logNote})</em> : null}</span>
        )}
        <span><i className="hatch" />not yet calculated</span>
        <span><i className="dimmed" />preview / coarser data (not calculated at this pixel)</span>
        {lab.showBoundaries ? <><span><i style={{ background: '#fff' }} />outcome boundary</span><span><i style={{ background: '#ff3df2' }} />collision↔ejection</span><span><i style={{ background: '#ffd43b' }} />time jump</span><span><i style={{ background: '#69db7c' }} />closest-approach jump</span><span><i style={{ background: '#ff6b6b' }} />numerical</span></> : null}
      </div>
      <div className="legend-note" title={MODE_INFO[lab.mapMode].help}>{MODE_INFO[lab.mapMode].help}
        {lab.mapMode === 'sens' ? <> <button className="small" onClick={() => lab.computeSensitivity()}>Compute for this layer</button></> : null}</div>
      <div className="regions-row">
        <input type="text" placeholder="name this view" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
        <button className="small" onClick={() => { lab.saveRegion(regionName); setRegionName(''); }}>Save region</button>
        {lab.savedRegions.map((r) => <span key={r.name} className="chip"><button className="link" onClick={() => lab.gotoRegion(r.name)}>{r.name}</button><button className="x" aria-label={`delete ${r.name}`} onClick={() => lab.deleteRegion(r.name)}>×</button></span>)}
      </div>
    </section>
  );
}
