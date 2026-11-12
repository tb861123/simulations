import { useEffect, useRef } from 'react';
import type { Lab, TrajData } from '../lab.ts';
import { stateAt, accelAt } from '../traj.ts';
import { PAIRS, pairKepler } from '../physics.ts';
import { BODY_NAMES } from '../outcomes.ts';

export interface TrajItem { data: TrajData; label: string; hollow?: boolean }
export interface CamOpts { mode: 'auto' | 'manual'; track: 'none' | 'com' | 0 | 1 | 2; frame: 'com' | 'integration' }
interface Props {
  lab: Lab; items: TrajItem[]; tRef: { current: number }; trail: number; trailStart: { current: number };
  cam: CamOpts; showVel: boolean; showAcc: boolean; showBinary: boolean; height: number; onManual: () => void; resetKey?: number;
}

/** Canvas animation of one or more trajectories at time tRef.current (recorded dense output, interpolated). */
export function TrajCanvas({ lab, items, tRef, trail, trailStart, cam, showVel, showAcc, showBinary, height, onManual, resetKey }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = useRef({ cx: 0, cy: 0, s: 50, init: false });
  const live = useRef({ items, trail, cam, showVel, showAcc, showBinary, lab });
  live.current = { items, trail, cam, showVel, showAcc, showBinary, lab };
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { view.current.init = false; }, [resetKey, items.map((i) => i.data.key).join()]);

  useEffect(() => {
    const el = ref.current!;
    const wheel = (e: WheelEvent) => { e.preventDefault(); view.current.s *= Math.exp(-e.deltaY * 0.0015); onManualRef.current(); };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, []);
  const onManualRef = useRef(onManual); onManualRef.current = onManual;
  useEffect(() => {
    const cv = ref.current!; let raf = 0; let lastSig = '';
    const tmp = new Float64Array(12), tmp2 = new Float64Array(12), acc = new Float64Array(6);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const L = live.current; const t = tRef.current;
      const W = cv.clientWidth, H = height, dpr = window.devicePixelRatio || 1;
      if (W < 20 || H < 20) return;   // panel hidden or squeezed: nothing to draw (and no camera scale of zero)
      const sig = [t, W, H, dpr, L.trail, trailStart.current, L.cam.mode, L.cam.track, L.cam.frame, L.showVel, L.showAcc, L.showBinary, L.items.map((i) => i.data.key).join(), L.lab.appearance.bodies.join(), view.current.cx, view.current.cy, view.current.s].join('|');
      if (sig === lastSig) return; lastSig = sig;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#0b1019'; ctx.fillRect(0, 0, W, H);
      if (!L.items.length) return;
      const colours = L.lab.appearance.bodies;
      // position of body b of item at time tt in the chosen frame
      const posAt = (it: TrajItem, tt: number, out: number[]): void => {
        const d = it.data; stateAt(d, tt, tmp2);
        let ox = 0, oy = 0;
        if (L.cam.frame === 'com') { let M = 0; for (let b = 0; b < 3; b++) { M += d.m[b]; ox += d.m[b] * tmp2[2 * b]; oy += d.m[b] * tmp2[2 * b + 1]; } ox /= M; oy /= M; }
        for (let b = 0; b < 3; b++) { out[2 * b] = tmp2[2 * b] - ox; out[2 * b + 1] = tmp2[2 * b + 1] - oy; }
        out[6] = ox; out[7] = oy;
      };
      const p = new Array(8).fill(0);
      // ---- camera ----
      const V = view.current;
      if (L.cam.mode === 'auto' || !V.init) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const it of L.items) {
          const tEnd = it.data.trace.t[it.data.trace.n - 1], tc = Math.min(t, tEnd), ts = Math.max(0, tc - L.trail, trailStart.current);
          for (let k = 0; k <= 12; k++) { posAt(it, ts + ((tc - ts) * k) / 12, p); for (let b = 0; b < 3; b++) { x0 = Math.min(x0, p[2 * b]); x1 = Math.max(x1, p[2 * b]); y0 = Math.min(y0, p[2 * b + 1]); y1 = Math.max(y1, p[2 * b + 1]); } }
        }
        const bw = Math.max(x1 - x0, 0.2), bh = Math.max(y1 - y0, 0.2), tx = (x0 + x1) / 2, ty = (y0 + y1) / 2, ts = Math.min(W / bw, H / bh) * 0.82;
        if (!V.init) { V.cx = tx; V.cy = ty; V.s = ts; V.init = true; } else { V.cx += (tx - V.cx) * 0.2; V.cy += (ty - V.cy) * 0.2; V.s += (ts - V.s) * 0.2; }
      }
      const it0 = L.items[0]; posAt(it0, Math.min(t, it0.data.trace.t[it0.data.trace.n - 1]), p);
      let camx = V.cx, camy = V.cy;
      if (L.cam.track === 'com') { camx = 0; camy = 0; if (L.cam.frame === 'integration') { camx = p[6]; camy = p[7]; } if (L.cam.mode === 'manual') { /* keep scale */ } }
      else if (typeof L.cam.track === 'number') { camx = p[2 * L.cam.track]; camy = p[2 * L.cam.track + 1]; }
      const sx = (x: number) => W / 2 + (x - camx) * V.s, sy = (y: number) => H / 2 - (y - camy) * V.s;
      // grid / scale bar
      ctx.strokeStyle = '#1b2336'; ctx.lineWidth = 1; const gs = Math.pow(10, Math.floor(Math.log10(80 / V.s)));
      for (let gx = Math.ceil((camx - W / 2 / V.s) / gs) * gs; gx < camx + W / 2 / V.s; gx += gs) { ctx.beginPath(); ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), H); ctx.stroke(); }
      for (let gy = Math.ceil((camy - H / 2 / V.s) / gs) * gs; gy < camy + H / 2 / V.s; gy += gs) { ctx.beginPath(); ctx.moveTo(0, sy(gy)); ctx.lineTo(W, sy(gy)); ctx.stroke(); }
      ctx.fillStyle = '#6b7a93'; ctx.font = '11px system-ui'; ctx.fillText(`grid ${gs} length units`, 8, H - 8);
      // ---- each trajectory ----
      L.items.forEach((it, idx) => {
        const d = it.data, tEnd = d.trace.t[d.trace.n - 1], tc = Math.min(t, tEnd), ended = t > tEnd;
        // trails
        const ts = Math.max(0, tc - L.trail, trailStart.current), steps = 140;
        const pts: number[][] = [];
        for (let k = 0; k <= steps; k++) { posAt(it, ts + ((tc - ts) * k) / steps, p); pts.push(p.slice()); }
        for (let b = 0; b < 3; b++) {
          ctx.strokeStyle = colours[b]; ctx.lineWidth = it.hollow ? 1.2 : 1.8; if (it.hollow) ctx.setLineDash([4, 3]);
          for (let seg = 0; seg < 7; seg++) {
            ctx.globalAlpha = 0.12 + (0.8 * (seg + 1)) / 7; ctx.beginPath();
            const a = Math.floor((seg * steps) / 7), z = Math.floor(((seg + 1) * steps) / 7);
            for (let k = a; k <= z; k++) { const q = pts[k]; if (k === a) ctx.moveTo(sx(q[2 * b]), sy(q[2 * b + 1])); else ctx.lineTo(sx(q[2 * b]), sy(q[2 * b + 1])); }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1; ctx.setLineDash([]);
        posAt(it, tc, p); stateAt(d, tc, tmp);
        // candidate binary highlight
        if (L.showBinary && idx === 0) {
          let best = Infinity, bp = 0; for (let q = 0; q < 3; q++) { const k = pairKepler(d.m, d.G, tmp, 3, PAIRS[q][0], PAIRS[q][1]); const mu = d.m[PAIRS[q][0]] * d.m[PAIRS[q][1]] / (d.m[PAIRS[q][0]] + d.m[PAIRS[q][1]]); if (mu * k.eps < best) { best = mu * k.eps; bp = q; } }
          if (best < 0) { ctx.strokeStyle = '#ffffff55'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sx(p[2 * PAIRS[bp][0]]), sy(p[2 * PAIRS[bp][0] + 1])); ctx.lineTo(sx(p[2 * PAIRS[bp][1]]), sy(p[2 * PAIRS[bp][1] + 1])); ctx.stroke(); ctx.setLineDash([]); }
        }
        // centre of mass (cross)
        { let M = 0, cx = 0, cy = 0; for (let b = 0; b < 3; b++) { M += d.m[b]; cx += d.m[b] * p[2 * b]; cy += d.m[b] * p[2 * b + 1]; } cx /= M; cy /= M;
          ctx.strokeStyle = '#e6edf7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx(cx) - 5, sy(cy)); ctx.lineTo(sx(cx) + 5, sy(cy)); ctx.moveTo(sx(cx), sy(cy) - 5); ctx.lineTo(sx(cx), sy(cy) + 5); ctx.stroke(); }
        accelAt(d, tmp, acc);
        for (let b = 0; b < 3; b++) {
          const x = sx(p[2 * b]), y = sy(p[2 * b + 1]), rad = 3.5 + 2.5 * Math.cbrt(d.m[b]);
          const contact = d.r[b] * V.s;
          if (contact > 2) { ctx.strokeStyle = colours[b] + '88'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, contact, 0, 2 * Math.PI); ctx.stroke(); }
          ctx.globalAlpha = ended ? 0.45 : 1;
          if (it.hollow) { ctx.strokeStyle = colours[b]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.stroke(); } else { ctx.fillStyle = colours[b]; ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.fill(); }
          ctx.globalAlpha = 1; ctx.fillStyle = colours[b]; ctx.font = 'bold 12px system-ui'; ctx.fillText(BODY_NAMES[b] + (L.items.length > 1 ? idx + 1 : ''), x + rad + 3, y - rad - 1);
          const arrow = (vx: number, vy: number, scale: number, colour: string) => { const x2 = x + vx * scale, y2 = y - vy * scale; ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); const a = Math.atan2(y2 - y, x2 - x); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 7 * Math.cos(a - 0.4), y2 - 7 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 7 * Math.cos(a + 0.4), y2 - 7 * Math.sin(a + 0.4)); ctx.fill(); };
          if (L.showVel) arrow(tmp[6 + 2 * b], tmp[7 + 2 * b], 28, '#a5d8ff');
          if (L.showAcc) arrow(acc[2 * b], acc[2 * b + 1], 12, '#ffc9c9');
        }
        if (ended) { ctx.fillStyle = '#ffa94d'; ctx.font = '12px system-ui'; ctx.fillText(`${it.label}: ended at t = ${tEnd.toFixed(3)}`, 8, 16 + 15 * idx); }
      });
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [height]);

  return (
    <canvas ref={ref} className="traj-canvas" style={{ width: '100%', height, touchAction: 'none', cursor: 'grab' }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; }}
      onPointerMove={(e) => { const d = drag.current; if (!d) return; const V = view.current; V.cx -= (e.clientX - d.x) / V.s; V.cy += (e.clientY - d.y) / V.s; d.x = e.clientX; d.y = e.clientY; onManual(); }}
      onPointerUp={() => { drag.current = null; }} />
  );
}
