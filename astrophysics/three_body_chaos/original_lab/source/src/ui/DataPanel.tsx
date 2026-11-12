import { useEffect, useRef, useState } from 'react';
import type { Lab } from '../lab.ts';
import { AUTOSAVE_NAME, bytesToSnapshot, idbDelete, idbList, idbLoad, snapshotToBlob, type SavedMeta } from '../persist.ts';
import { configJSON, downloadBlob, edgesCSV, mapPNG, regionsReport, samplesCSV, trajectoryCSV, validationReport } from '../export.ts';
import { useLab } from './hooks.ts';

export function DataPanel({ lab }: { lab: Lab }) {
  useLab(lab, ['status', 'layers', 'selection']);
  const [name, setName] = useState('my investigation'), [note, setNote] = useState('');
  const [list, setList] = useState<SavedMeta[]>([]), [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const refresh = () => idbList().then(setList);
  useEffect(() => { void refresh(); }, []);
  const doSave = async () => { const r = await lab.saveNow(name.trim() || 'untitled', note); setMsg((r.ok ? '✔ ' : '✖ ') + r.message); void refresh(); };
  const load = async (n: string) => { const r = await idbLoad(n); if (r.snapshot) { lab.restore(r.snapshot); setMsg(`Restored “${n}” (paused).`); } else setMsg('✖ ' + r.errors.join(' ')); };
  const sel = lab.sel ? lab.trajs.get(lab.trajKey(lab.overridesFor(lab.selectedLayer()!, lab.sel.sampleId))) : undefined;
  const big = lab.cur.store.count > 200000;
  return (
    <div className="panel-body">
      <h3>Save, restore &amp; extend</h3>
      <p className="hint">Browser storage (IndexedDB) is per browser profile and address. Autosave runs about every 20 s while calculating and on completion; the status line reports the real outcome of each transaction. Keep downloaded files for durable backup. Investigations restore <b>paused</b>.</p>
      <p className="status">{lab.saveStatus || 'No save yet in this session.'}</p>
      <div className="grid2"><label className="num"><span className="num-l">name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label><label className="num"><span className="num-l">note</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label></div>
      <div className="btnrow">
        <button className="primary" onClick={doSave}>Save to browser</button>
        <button onClick={async () => { const b = await snapshotToBlob(lab.snapshot(name, note), true); downloadBlob(b, `${name.replace(/[^\w-]+/g, '_')}.tbcl.${b.type === 'application/gzip' ? 'json.gz' : 'json'}`); setMsg('Downloaded investigation file.'); }}>Download file</button>
        <button onClick={() => file.current?.click()}>Import file…</button>
        <input ref={file} type="file" accept=".json,.gz,.tbcl" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = await bytesToSnapshot(await f.arrayBuffer()); if (r.snapshot) { lab.restore(r.snapshot); setMsg(`Imported “${r.snapshot.name}” (paused).`); } else setMsg('✖ Import refused: ' + r.errors.join(' ')); e.target.value = ''; }} />
      </div>
      {msg ? <p className="status">{msg}</p> : null}
      <h4>Saved in this browser</h4>
      {list.length === 0 ? <p className="hint">Nothing saved yet.</p> : (
        <table className="data compact"><thead><tr><th>name</th><th>saved</th><th>samples</th><th></th></tr></thead>
          <tbody>{list.map((m) => <tr key={m.name}><td>{m.name === AUTOSAVE_NAME ? 'autosave' : m.name}{m.note ? <small> — {m.note}</small> : null}</td><td>{new Date(m.savedAt).toLocaleString()}</td><td>{m.samples.toLocaleString()}</td><td><button className="small" onClick={() => load(m.name)}>Restore</button> <button className="small" onClick={async () => { await idbDelete(m.name); void refresh(); }}>×</button></td></tr>)}</tbody></table>
      )}
      <p className="hint">Reproducibility on resume: checkpoints store the full integrator state, so continuing is <b>bitwise identical</b> to a straight run on the same browser/CPU; across different browsers or CPUs it is reproducible within the integration tolerance (and chaotic trajectories can differ eventually).</p>

      <h3>Scientific exports</h3>
      <div className="btnrow wrap">
        <button onClick={() => mapPNG(lab).toBlob((b) => b && downloadBlob(b, 'three-body-map.png'))}>Map PNG (labelled)</button>
        <button onClick={() => downloadBlob(new Blob([samplesCSV(lab)], { type: 'text/csv' }), 'samples.csv')}>Samples CSV{big ? ' (no initial states)' : ''}</button>
        <button disabled={!sel} onClick={() => sel && downloadBlob(new Blob([trajectoryCSV(lab, sel)], { type: 'text/csv' }), 'trajectory.csv')}>Selected trajectory CSV</button>
        <button onClick={() => downloadBlob(new Blob([configJSON(lab)], { type: 'application/json' }), 'initial-configuration.json')}>Initial configuration JSON</button>
        <button onClick={() => downloadBlob(new Blob([validationReport(lab)], { type: 'application/json' }), 'validation-report.json')}>Validation report</button>
        <button onClick={() => downloadBlob(new Blob([regionsReport(lab)], { type: 'application/json' }), 'boundary-regions.json')}>Boundary regions JSON</button>
        <button onClick={() => downloadBlob(new Blob([edgesCSV(lab)], { type: 'text/csv' }), 'boundary-edges.csv')}>Boundary edges CSV</button>
      </div>
      <p className="hint">Every export carries units, axis variables and ranges, physical parameters, solver and tolerances, collision and escape criteria, horizon, sampling convention and density, refinement settings, application/model version, and reliability and unresolved counts. PNG exports use the current colours.</p>
    </div>
  );
}
