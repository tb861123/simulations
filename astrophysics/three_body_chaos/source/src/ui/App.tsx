import { useEffect, useRef, useState } from 'react';
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

  // Resizable, hideable side panels (drag the ⋮ bars, click ‹ › to hide); remembered in this browser.
  const panels = usePanels();
  const narrowCls = (p: string) => (narrow && pane !== p ? ' paneoff' : '');
  const left = <aside id="left" className={'left pside' + (panels.st.lc ? ' collapsed' : '') + narrowCls('setup')} aria-label="Physical settings"><button className="reopen" title="Show this panel" onClick={() => panels.set({ lc: false })}>Settings ›</button><SetupPanel lab={lab} /></aside>;
  const centre = <main id="centre" className={'centre' + narrowCls('map')}><MapView lab={lab} /></main>;
  const right = (
    <aside id="right" className={'right pside' + (panels.st.rc ? ' collapsed' : '') + narrowCls('inspect')} aria-label="Inspector">
      <button className="reopen" title="Show this panel" onClick={() => panels.set({ rc: false })}>‹ Inspector</button>
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
      {/* every pane stays mounted (the narrow layout only hides the ones not chosen), so the view bar's handles stay valid */}
      <div className="panes" ref={panels.ref} style={panels.style}>
        {left}
        <div className="splitter" id="splitL" title="Drag to resize · double-click to reset" {...panels.dragProps('l')}><button title="Hide/show the left panel" onClick={() => panels.set({ lc: !panels.st.lc })}>{panels.st.lc ? '›' : '‹'}</button></div>
        {centre}
        <div className="splitter" id="splitR" title="Drag to resize · double-click to reset" {...panels.dragProps('r')}><button title="Hide/show the right panel" onClick={() => panels.set({ rc: !panels.st.rc })}>{panels.st.rc ? '‹' : '›'}</button></div>
        {right}
      </div>
      <footer role="status">{lab.status}{lab.saveStatus ? '  ·  ' + lab.saveStatus : ''}{lab.scheduler.lastError ? '  ·  worker error: ' + lab.scheduler.lastError : ''}</footer>
      {batch ? <BatchPanel lab={lab} onClose={() => setBatch(false)} /> : null}
    </div>
  );
}

// ---- side panels: widths and hidden state, kept in localStorage --------------------------------
interface PanelState { lw: number; rw: number; lc: boolean; rc: boolean }
const PANEL_KEY = 'three-body-chaos-layout', STRIP = 30, MIN = 170;
const defaults = (): PanelState => ({ lw: 280, rw: Math.round(Math.min(520, Math.max(370, 0.29 * window.innerWidth))), lc: false, rc: false });
function usePanels() {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<PanelState>(() => { const d = defaults(); try { return { ...d, ...JSON.parse(localStorage.getItem(PANEL_KEY) || '{}') }; } catch { return d; } });
  const [, setTick] = useState(0);
  useEffect(() => { try { localStorage.setItem(PANEL_KEY, JSON.stringify(st)); } catch { /* storage unavailable: layout still works for this session */ } }, [st]);
  useEffect(() => { const f = () => setTick((n) => n + 1); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  // a panel is at most 42 % of the window, so the map always keeps some room
  const maxW = () => Math.max(MIN, (ref.current?.clientWidth || window.innerWidth) * 0.42);
  const w = (v: number) => Math.round(Math.min(maxW(), Math.max(MIN, v)));
  const style = { ['--lw' as string]: (st.lc ? STRIP : w(st.lw)) + 'px', ['--rw' as string]: (st.rc ? STRIP : w(st.rw)) + 'px' } as React.CSSProperties;
  const set = (p: Partial<PanelState>) => setSt((s) => ({ ...s, ...p }));
  const dragProps = (side: 'l' | 'r') => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      const sp = e.currentTarget, box = ref.current!.getBoundingClientRect(); sp.setPointerCapture(e.pointerId); sp.classList.add('drag');
      const move = (ev: PointerEvent) => { const v = side === 'l' ? ev.clientX - box.left : box.right - ev.clientX; if (v < 110) set({ [side + 'c']: true }); else set({ [side + 'c']: false, [side + 'w']: v }); };
      const up = () => { sp.classList.remove('drag'); sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); };
      sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up);
    },
    onDoubleClick: () => setSt(defaults()),
  });
  return { ref, st, set, style, dragProps };
}
