// Scientific exports: labelled PNG maps, sample CSV, trajectory CSV, configuration JSON, validation
// and boundary-region reports.  All text carries units, ranges, physical parameters, solver
// settings, criteria, horizon, sampling convention and version information.
import type { Lab, TrajData } from './lab.ts';
import { APP_VERSION, MODEL_VERSION, axisLabel, buildInitial, type Initial } from './initial.ts';
import { NOT_COMPUTED, SUPPLEMENTARY, VALID_LABELS, type Layer } from './store.ts';
import { OUTCOMES, outcomeText } from './outcomes.ts';
import { FAIL_LABELS, FLAG } from './simulate.ts';
import { EDGE_LABELS } from './boundaries.ts';
import { MODE_INFO, drawAxes, drawEdges, legendFor, paintMap, VIRIDIS_STOPS } from './maprender.ts';
import { buildSeries } from './traj.ts';

export function metadataLines(lab: Lab, layer: Layer = lab.cur): string[] {
  const c = lab.applied, p = c.physics, n = c.numerics, a = c.axes;
  const prog = lab.progress(layer);
  const lines = [
    `Three-Body Gravitational Chaos Lab v${APP_VERSION}   model ${MODEL_VERSION}   exported ${new Date().toISOString()}`,
    `Units: dimensionless (G = ${p.G}); lengths L, masses M, times T = sqrt(L³/(G M)); speeds L/T.`,
    `Set-up: ${p.mode === 'scattering' ? `binary–single scattering, binary separation ${p.scatter.sep} (e = ${p.scatter.ecc}, phase ${p.scatter.phaseDeg}°), C starts at x = ${p.scatter.cx}; frame: ${p.frame === 'com' ? 'total centre of mass' : 'binary rest frame'}` : 'explicit bodies'}`,
    `Masses A,B,C = ${p.m.join(', ')};  contact radii = ${p.r.join(', ')};  horizon = ${p.horizon} (integration ends at the first accepted step at or beyond it)`,
    `Map axes: x = ${axisLabel(a.varX)} [${a.minX}, ${a.maxX}];  y = ${axisLabel(a.varY)} [${a.minY}, ${a.maxY}]   layer “${layer.label}” rect [${layer.rect.x0}, ${layer.rect.x1}] × [${layer.rect.y0}, ${layer.rect.y1}]`,
    `Sampling: ${layer.n}×${layer.n} uniform pixel-centre grid (x_i = x0 + (i+0.5)Δx, y_j = y0 + (j+0.5)Δy; j increases upward), Δx = ${layer.dx}, Δy = ${layer.dy}; ${layer.nodeCount} quadtree nodes (adaptive); ${layer.store.count} samples in total`,
    `Solver: DOP853 adaptive Runge–Kutta (order 8), rtol = ${n.rtol}, atol = ${n.atol}, max steps ${n.maxSteps}; contact located inside steps with the 7th-order dense output; Float64 throughout`,
    `Escape criteria: surviving pair bound; escaper unbound relative to the pair's centre of mass and moving outward; separation ≥ ${n.hierarchy} × the pair's apocentre; held for ≥ max(${n.minSustain}, ${n.sustainPeriods} × pair period)`,
    `Close encounter: pair closer than ${n.closeFactor} × L (L = ${n.lengthScale || 'smallest initial separation'}), ends beyond ${n.closeHyst}× that distance (hysteresis).  Reliability: scaled energy error > ${n.warnE} provisional, > ${n.failE} unreliable.`,
    `Refinement: max depth ${lab.explore.settings.maxDepth}, max extra ${lab.explore.settings.maxExtra}, seed ${lab.explore.settings.seed}, extra used ${lab.explore.extraUsed}; boundary thresholds: time ×${lab.boundary.timeFactor}, closest approach ×${lab.boundary.closeFactor}`,
    `Counts: computed ${prog.done}/${prog.total}, unresolved ${prog.unresolved}, failed ${prog.failed}, provisional ${prog.provisional}.  Finite-time results only: not proofs of stability or of mathematical chaos.`,
  ];
  return lines;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}

const csvCell = (v: unknown): string => { if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''; const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export function samplesCSV(lab: Lab, layer: Layer = lab.cur, includeInitial = layer.store.count <= 200000): string {
  const s = layer.store, ax = lab.applied.axes;
  const out: string[] = metadataLines(lab, layer).map((l) => '# ' + l);
  out.push('# Columns: kind = uniform | refined | supplementary; outcome codes 0..8 = A esc, B esc, C esc, collision AB, AC, BC, unresolved, failed, disruption; t_end = event/acceptance time or time reached; t_onset = estimated escape onset (resolved to the step); blank = missing data.');
  const head = ['sample_id', 'kind', 'depth', ax.varX, ax.varY, 'outcome_code', 'outcome', 'status', 'fail_reason', 't_end', 't_onset', 'closest_approach', 'closest_pair', 'close_encounters', 'max_scaled_energy_error', 'steps', 'binary_energy_exchange', 'finite_time_sensitivity', 'validation'];
  const bodies = ['A', 'B', 'C'];
  if (includeInitial) for (const q of ['x', 'y', 'vx', 'vy']) for (const b of bodies) head.push(`${q}_${b}`);
  out.push(head.join(','));
  const n2 = layer.n * layer.n;
  for (let id = 0; id < s.count; id++) {
    const o = s.outcome[id];
    const kind = id < n2 ? 'uniform' : s.depth[id] === SUPPLEMENTARY ? 'supplementary' : 'refined';
    const status = o === NOT_COMPUTED ? 'not calculated' : o === 7 ? 'failed' : o === 6 ? 'unresolved' : s.flags[id] & FLAG.PROVISIONAL ? 'provisional' : 'classified';
    const row: unknown[] = [id, kind, s.depth[id] === SUPPLEMENTARY ? '' : s.depth[id], s.X[id], s.Y[id], o === NOT_COMPUTED ? '' : o, o === NOT_COMPUTED ? '' : outcomeText(o), status, o === 7 ? FAIL_LABELS[s.fail[id]] : '',
      o === NOT_COMPUTED ? '' : s.tEnd[id], s.tOn[id], s.minD[id], o === NOT_COMPUTED ? '' : ['A–B', 'A–C', 'B–C'][s.minPair[id]], s.nClose[id], s.eErr[id], s.steps[id], s.exch[id], s.sens[id], VALID_LABELS[s.valid[id]]];
    if (includeInitial) {
      const ini: Initial = buildInitial(lab.applied.physics, { [ax.varX]: s.X[id], [ax.varY]: s.Y[id] });
      for (let q = 0; q < 4; q++) for (let b = 0; b < 3; b++) row.push(q < 2 ? ini.y[2 * b + q] : ini.y[6 + 2 * b + (q - 2)]);
    }
    out.push(row.map(csvCell).join(','));
  }
  return out.join('\n') + '\n';
}

export function trajectoryCSV(lab: Lab, tr: TrajData): string {
  const s = buildSeries(tr);
  const out = metadataLines(lab).map((l) => '# ' + l);
  out.push(`# Trajectory of ${JSON.stringify(tr.overrides)}; outcome ${outcomeText(tr.summary.outcome)}; t_end ${tr.summary.tEnd}; rows are the recorded dense-output samples (spacing ≤ 0.01), decimated to ≤ 2500 rows.`);
  out.push('t,xA,yA,xB,yB,xC,yC,vxA,vyA,vxB,vyB,vxC,vyC,d_AB,d_AC,d_BC,K,U,E,rel_E_err,rel_P_err,rel_L_err,Px,Py,L,com_x,com_y,com_vx,com_vy,binary,binary_orbital_energy');
  const N = tr.trace.n, stride = Math.max(1, Math.ceil(N / 2500)); let q = 0;
  for (let i = 0; i < N && q < s.n; i += stride, q++) {
    const y = tr.trace.y.subarray(i * 12, i * 12 + 12);
    out.push([s.t[q], ...Array.from(y), s.d[0][q], s.d[1][q], s.d[2][q], s.K[q], s.U[q], s.E[q], s.relE[q], s.relP[q], s.relL[q], s.px[q], s.py[q], s.L[q], s.cx[q], s.cy[q], s.cvx[q], s.cvy[q], s.binLabel, s.binEnergy[q]].map(csvCell).join(','));
  }
  return out.join('\n') + '\n';
}

export function configJSON(lab: Lab): string {
  const sel = lab.sel ? lab.describe(lab.sel.layerId, lab.sel.sampleId) : null;
  return JSON.stringify({
    app: APP_VERSION, model: MODEL_VERSION, exported: new Date().toISOString(), config: lab.applied,
    selectedSample: sel ? { varX: sel.varX, x: sel.x, varY: sel.varY, y: sel.y, initialState: { positions: Array.from(sel.ini.y.slice(0, 6)), velocities: Array.from(sel.ini.y.slice(6)), masses: Array.from(sel.ini.m), radii: Array.from(sel.ini.r) }, outcome: outcomeText(sel.outcome), tEnd: sel.tEnd } : null,
    notes: metadataLines(lab),
  }, null, 2);
}

export function validationReport(lab: Lab): string {
  const rows = lab.validations.map((r) => ({ layer: r.layerId, sample: r.sampleId, [lab.applied.axes.varX]: r.x, [lab.applied.axes.varY]: r.y, status: VALID_LABELS[r.status], toleranceScales: r.scales, runs: r.runs.map((u) => ({ outcome: outcomeText(u.outcome), tEnd: u.tEnd, tOnset: u.tOnset })), when: r.when }));
  const counts: Record<string, number> = {}; for (const r of lab.validations) counts[VALID_LABELS[r.status]] = (counts[VALID_LABELS[r.status]] ?? 0) + 1;
  return JSON.stringify({ meta: metadataLines(lab), caveat: 'Agreement across tolerances is a numerical diagnostic, not a proof. Untested samples are untested.', counts, records: rows }, null, 2);
}

export function regionsReport(lab: Lab): string {
  const r = lab.regions();
  const fmt = (x: any) => ({ kind: x.kind, rect: x.rect, score: x.score, reasons: x.reasons, outcomesPresent: x.outcomes.map((o: number, i: number) => ({ outcome: outcomeText(o), samples: x.outcomeCounts[i] })), samples: x.samples, boundaryEdges: x.edges, edgeKinds: Object.fromEntries(Object.entries(x.edgeCounts).map(([k, v]) => [EDGE_LABELS[+k], v])), reliability: x.reliability, untestedBoundarySamples: x.untested });
  return JSON.stringify({ meta: metadataLines(lab), weights: lab.weights, caveat: 'Regions are ranked blocks of computed samples. Boundaries are where neighbouring samples differ; they are not claimed to be exact, nor complete.', interesting: r.interest.map(fmt), needingValidation: r.validation.map(fmt) }, null, 2);
}

export function edgesCSV(lab: Lab, layer: Layer = lab.cur): string {
  const e = lab.edges(layer), s = layer.store, ax = lab.applied.axes;
  const out = metadataLines(lab, layer).map((l) => '# ' + l);
  out.push(`edge,sample_a,sample_b,${ax.varX}_mid,${ax.varY}_mid,outcome_a,outcome_b,kinds,score`);
  for (let q = 0; q < e.n; q++) {
    const kinds = [1, 2, 4, 8, 32].filter((b) => e.kind[q] & b).map((b) => EDGE_LABELS[b]).join('; ');
    out.push([q, e.a[q], e.b[q], e.mx[q], e.my[q], outcomeText(s.outcome[e.a[q]]), outcomeText(s.outcome[e.b[q]]), kinds, e.score[q]].map(csvCell).join(','));
  }
  return out.join('\n') + '\n';
}

/** Labelled, high-resolution PNG of the map with current colours, legend, scale bar, axes and settings. */
export function mapPNG(lab: Lab, opts: { plotW?: number; plotH?: number; boundaries?: boolean } = {}): HTMLCanvasElement {
  const layer = lab.cur, view = lab.view, mode = lab.mapMode;
  const PW = opts.plotW ?? 1400, PH = opts.plotH ?? 1000;
  const margin = { l: 110, t: 90, r: 40, b: 80 }, legendW = 520, gap = 30;
  const meta = metadataLines(lab, layer);
  const leg = legendFor(lab, mode, layer);
  // measure everything first so nothing is clipped, however many categories there are
  const probe = document.createElement('canvas').getContext('2d')!;
  const fontS = '17px system-ui, sans-serif';
  probe.font = fontS;
  const wrap = (text: string, maxW: number): string[] => {
    const words = text.split(/\s+/), lines: string[] = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (probe.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  };
  const totalW = margin.l + PW + gap + legendW + margin.r;
  const legLines: { text: string; colour?: string; head?: boolean }[] = [];
  legLines.push({ text: leg.title, head: true });
  if (leg.kind === 'categorical') for (const en of leg.entries!) for (const [i, ln] of wrap(`${en.label}  (${en.count.toLocaleString()})`, legendW - 40).entries()) legLines.push({ text: ln, colour: i === 0 ? en.colour : undefined });
  else legLines.push({ text: '' }, { text: '' }, { text: '' });
  const noteLines = wrap(MODE_INFO[mode].help, legendW);
  const metaLines = meta.flatMap((m) => wrap(m, totalW - margin.l - margin.r));
  const legendH = 40 + legLines.length * 26 + noteLines.length * 22 + 40;
  const totalH = Math.max(margin.t + PH + margin.b + 30 + metaLines.length * 22 + 30, margin.t + legendH + 40 + 30 + metaLines.length * 22);
  const cv = document.createElement('canvas'); cv.width = totalW; cv.height = totalH;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0b1019'; ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = '#e6edf7'; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`Three-body outcome map — ${MODE_INFO[mode].label}`, margin.l, 40);
  ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#9fb0c8';
  ctx.fillText(`${axisLabel(lab.applied.axes.varX)} vs ${axisLabel(lab.applied.axes.varY)}   ·   ${layer.n}×${layer.n} samples   ·   horizon ${lab.applied.physics.horizon}`, margin.l, 66);
  const img = paintMap(lab, PW, PH, view, mode, lab.appearance, { hatch: lab.appearance.showHatch, preview: lab.appearance.showPreview });
  const tmp = document.createElement('canvas'); tmp.width = PW; tmp.height = PH; tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.drawImage(tmp, margin.l, margin.t);
  if (opts.boundaries ?? lab.showBoundaries) drawEdges(ctx, lab, layer, view, PW, PH, margin.l, margin.t, 2);
  if (lab.sel) {
    const L = lab.selectedLayer(); if (L) {
      const sx = margin.l + ((L.store.X[lab.sel.sampleId] - view.x0) / (view.x1 - view.x0)) * PW, sy = margin.t + ((view.y1 - L.store.Y[lab.sel.sampleId]) / (view.y1 - view.y0)) * PH;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 2 * Math.PI); ctx.moveTo(sx - 15, sy); ctx.lineTo(sx + 15, sy); ctx.moveTo(sx, sy - 15); ctx.lineTo(sx, sy + 15); ctx.stroke();
    }
  }
  drawAxes(ctx, margin.l, margin.t, PW, PH, view, axisLabel(lab.applied.axes.varX), axisLabel(lab.applied.axes.varY), '#c3cfe0', '16px system-ui, sans-serif');
  // legend
  let y = margin.t + 10; const lx = margin.l + PW + gap;
  ctx.font = fontS; ctx.textBaseline = 'middle';
  for (const l of legLines) {
    if (l.head) { ctx.fillStyle = '#e6edf7'; ctx.font = 'bold 19px system-ui, sans-serif'; ctx.fillText(l.text, lx, y + 12); ctx.font = fontS; y += 34; continue; }
    if (leg.kind === 'continuous') break;
    if (l.colour) { ctx.fillStyle = l.colour; ctx.fillRect(lx, y, 20, 20); ctx.strokeStyle = '#2a3347'; ctx.strokeRect(lx + 0.5, y + 0.5, 19, 19); }
    ctx.fillStyle = '#c3cfe0'; ctx.fillText(l.text, lx + 30, y + 11); y += 26;
  }
  if (leg.kind === 'continuous') {
    const g = ctx.createLinearGradient(lx, 0, lx + legendW - 20, 0);
    leg.stops!.forEach((c, i) => g.addColorStop(i / (leg.stops!.length - 1), `rgb(${c[0]},${c[1]},${c[2]})`));
    ctx.fillStyle = g; ctx.fillRect(lx, y, legendW - 20, 24); ctx.fillStyle = '#c3cfe0';
    ctx.textAlign = 'left'; ctx.fillText(leg.min!.toPrecision(4), lx, y + 42); ctx.textAlign = 'right'; ctx.fillText(leg.max!.toPrecision(4) + ' ' + (leg.unit ?? ''), lx + legendW - 20, y + 42); ctx.textAlign = 'left'; y += 70;
  }
  ctx.fillStyle = '#8091ab'; ctx.font = '15px system-ui, sans-serif';
  for (const ln of noteLines) { ctx.fillText(ln, lx, y + 12); y += 22; }
  // metadata footer
  let fy = Math.max(margin.t + PH + margin.b - 20, margin.t + legendH + 20);
  ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#8091ab'; ctx.textBaseline = 'alphabetic';
  for (const ln of metaLines) { ctx.fillText(ln, margin.l, fy); fy += 22; }
  void VIRIDIS_STOPS; void OUTCOMES;
  return cv;
}
