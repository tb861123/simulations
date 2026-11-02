import { useEffect, useState } from 'react';
import type { Lab } from '../lab.ts';
import { AUTOSAVE_NAME, idbList, idbLoad, type SavedMeta } from '../persist.ts';
import { MapView } from './MapView.tsx';
import { SetupPanel } from './SetupPanel.tsx';
import { InspectPanel } from './InspectPanel.tsx';
import { RegionsPanel } from './RegionsPanel.tsx';
import { ComparePanel } from './ComparePanel.tsx';
import { ValidationPanel } from './ValidationPanel.tsx';
import { DataPanel } from './DataPanel.tsx';
import { Learn } from './Learn.tsx';
import { BatchPanel } from './BatchPanel.tsx';
import { useLab } from './hooks.ts';
import { APP_VERSION } from '../initial.ts';

const TABS = [['sample', 'Sample'], ['regions', 'Regions'], ['compare', 'Compare'], ['validate', 'Validate'], ['data', 'Save & export'], ['learn', 'Learn']] as const;
type Tab = (typeof TABS)[number][0];

export function App({ lab }: { lab: Lab }) {
  useLab(lab, ['status', 'config']);
  const [tab, setTab] = useState<Tab>('sample');
  const [narrow, setNarrow] = useState(window.innerWidth < 1180);
  const [pane, setPane] = useState<'setup' | 'map' | 'inspect'>('map');
  const [batch, setBatch] = useState(false);
  const [recover, setRecover] = useState<SavedMeta | null>(null);
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 1180); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { lab.navigate = (t) => { setTab(t as Tab); setPane('inspect'); }; idbList().then((l) => { const a = l.find((m) => m.name === AUTOSAVE_NAME); if (a) setRecover(a); }); }, [lab]);
  useEffect(() => { if (lab.sel) setTab((t) => (t === 'sample' || t === 'compare' ? t : t)); }, [lab.sel]);

  const left = <aside className="left" aria-label="Physical settings"><SetupPanel lab={lab} /></aside>;
  const centre = <main className="centre"><MapView lab={lab} /></main>;
  const right = (
    <aside className="right" aria-label="Inspector">
      <nav className="tabs" role="tablist">{TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>)}</nav>
      <div className="tabbody">
        {tab === 'sample' ? <InspectPanel lab={lab} /> : tab === 'regions' ? <RegionsPanel lab={lab} /> : tab === 'compare' ? <ComparePanel lab={lab} /> : tab === 'validate' ? <ValidationPanel lab={lab} /> : tab === 'data' ? <DataPanel lab={lab} /> : <Learn />}
      </div>
    </aside>
  );
  return (
    <div className={'app' + (narrow ? ' narrow' : '')}>
      <header>
        <h1>Three-Body Gravitational Chaos Lab</h1>
        <span className="sub">Newtonian binary–single scattering · every pixel is a real simulation · finite-time results</span>
        <span className="grow" />
        {narrow ? <div className="seg">{(['setup', 'map', 'inspect'] as const).map((p) => <button key={p} className={pane === p ? 'on' : ''} onClick={() => setPane(p)}>{p === 'setup' ? 'Settings' : p === 'map' ? 'Map' : 'Inspect'}</button>)}</div> : null}
        <button onClick={() => setBatch(true)}>📊 Batch run</button>
        <span className="ver">v{APP_VERSION}</span>
      </header>
      {recover ? <div className="banner info recover">A previous session was autosaved ({recover.samples.toLocaleString()} samples, {new Date(recover.savedAt).toLocaleString()}). <button className="small primary" onClick={async () => { const r = await idbLoad(AUTOSAVE_NAME); if (r.snapshot) lab.restore(r.snapshot); setRecover(null); }}>Restore it (paused)</button> <button className="small" onClick={() => setRecover(null)}>Dismiss</button></div> : null}
      <div className="panes">
        {!narrow || pane === 'setup' ? left : null}
        {!narrow || pane === 'map' ? centre : null}
        {!narrow || pane === 'inspect' ? right : null}
      </div>
      <footer role="status">{lab.status}{lab.saveStatus ? '  ·  ' + lab.saveStatus : ''}{lab.scheduler.lastError ? '  ·  worker error: ' + lab.scheduler.lastError : ''}</footer>
      {batch ? <BatchPanel lab={lab} onClose={() => setBatch(false)} /> : null}
    </div>
  );
}
