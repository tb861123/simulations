import { useEffect, useRef, useState } from 'react';
import { fmtTick, niceTicks } from '../maprender.ts';

export interface PlotSeries { label: string; colour: string; x: ArrayLike<number>; y: ArrayLike<number>; dash?: number[] }
interface Props { series: PlotSeries[]; xLabel: string; yLabel: string; log?: boolean; logx?: boolean; height?: number; cursor?: number; onCursor?: (x: number) => void; yMin?: number; yMax?: number; title?: string }

/** Small multi-series line chart on a canvas, with optional log-y, a time cursor and click-to-scrub. */
export function Plot({ series, xLabel, yLabel, log, logx, height = 150, cursor, onCursor, yMin, yMax, title }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const geom = useRef({ x0: 0, x1: 1, l: 46, w: 1 });
  // redraw when the canvas changes width (a side panel resized, hidden or shown again)
  const [cw, setCw] = useState(0);
  useEffect(() => { const cv = ref.current; if (!cv) return; const ro = new ResizeObserver(() => setCw(cv.clientWidth)); ro.observe(cv); return () => ro.disconnect(); }, []);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = height;
    if (W < 80) return;   // hidden or squeezed too narrow to draw a readable graph
    const fx = (v: number) => (logx ? Math.log10(v) : v);   // log x: positions use log10 of the value
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const L = 50, R = 8, T = 6, B = 30, w = W - L - R, h = H - T - B;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const tf = (v: number) => (log ? Math.log10(Math.max(v, 1e-300)) : v);
    for (const s of series) for (let i = 0; i < s.x.length; i++) { const yv = s.y[i]; if (!Number.isFinite(yv) || (log && yv <= 0) || (logx && !(s.x[i] > 0))) continue; x0 = Math.min(x0, fx(s.x[i])); x1 = Math.max(x1, fx(s.x[i])); y0 = Math.min(y0, tf(yv)); y1 = Math.max(y1, tf(yv)); }
    if (!Number.isFinite(x0)) { ctx.fillStyle = '#6b7a93'; ctx.font = '12px system-ui'; ctx.fillText('no data', L + 10, T + 20); return; }
    if (yMin !== undefined) y0 = tf(yMin); if (yMax !== undefined) y1 = tf(yMax);
    if (x1 <= x0) x1 = x0 + 1; if (y1 <= y0) { y1 = y0 + 1; y0 -= 1; }
    const pad = (y1 - y0) * 0.06; if (yMin === undefined) y0 -= pad; if (yMax === undefined) y1 += pad;
    geom.current = { x0, x1, l: L, w };
    ctx.strokeStyle = '#2a3347'; ctx.fillStyle = '#8091ab'; ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const yt = log ? Array.from({ length: Math.floor(y1) - Math.ceil(y0) + 1 }, (_, i) => Math.ceil(y0) + i).filter((_, i, a) => a.length < 8 || i % Math.ceil(a.length / 6) === 0) : niceTicks(y0, y1, 4);
    for (const t of yt) { const py = T + h - ((t - y0) / (y1 - y0)) * h; ctx.beginPath(); ctx.moveTo(L, py); ctx.lineTo(L + w, py); ctx.stroke(); ctx.fillText(log ? '1e' + t : fmtTick(t, y1 - y0), L - 4, py); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (logx) for (let t = Math.ceil(x0 - 1e-9); t <= x1 + 1e-9; t += Math.max(1, Math.ceil((x1 - x0) / 7))) { const px = L + ((t - x0) / (x1 - x0)) * w; ctx.fillText('1e' + t, px, T + h + 3); }
    else for (const t of niceTicks(x0, x1, 5)) { const px = L + ((t - x0) / (x1 - x0)) * w; ctx.fillText(fmtTick(t, x1 - x0), px, T + h + 3); }
    ctx.fillText(xLabel, L + w / 2, T + h + 16);
    ctx.save(); ctx.translate(10, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'top'; ctx.fillText(yLabel, 0, -4); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, w, h); ctx.clip();
    for (const s of series) {
      ctx.strokeStyle = s.colour; ctx.lineWidth = 1.5; ctx.setLineDash(s.dash ?? []); ctx.beginPath(); let pen = false;
      for (let i = 0; i < s.x.length; i++) {
        const yv = s.y[i]; if (!Number.isFinite(yv) || (log && yv <= 0) || (logx && !(s.x[i] > 0))) { pen = false; continue; }
        const px = L + ((fx(s.x[i]) - x0) / (x1 - x0)) * w, py = T + h - ((tf(yv) - y0) / (y1 - y0)) * h;
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
      }
      ctx.stroke();
    }
    ctx.restore(); ctx.setLineDash([]);
    if (cursor !== undefined && cursor >= x0 && cursor <= x1) { const px = L + ((cursor - x0) / (x1 - x0)) * w; ctx.strokeStyle = '#e6edf7'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(px, T); ctx.lineTo(px, T + h); ctx.stroke(); ctx.globalAlpha = 1; }
  }, [series, log, logx, height, cursor, xLabel, yLabel, yMin, yMax, cw]);
  return (
    <div className="plot">
      {title ? <div className="plot-t">{title}</div> : null}
      <canvas ref={ref} style={{ width: '100%', height }} onPointerDown={(e) => { if (!onCursor) return; const r = e.currentTarget.getBoundingClientRect(); const g = geom.current; const f = (e.clientX - r.left - g.l) / g.w; onCursor(g.x0 + Math.min(1, Math.max(0, f)) * (g.x1 - g.x0)); }} />
      <div className="plot-leg">{series.map((s) => <span key={s.label}><i style={{ background: s.colour }} />{s.label}</span>)}</div>
    </div>
  );
}
