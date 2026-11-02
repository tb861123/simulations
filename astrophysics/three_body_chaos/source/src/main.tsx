import { createRoot } from 'react-dom/client';
import './style.css';
import { Lab } from './lab.ts';
import { InlineWorker, type WorkerLike } from './scheduler.ts';
import LabWorker from './worker.ts?worker&inline';
import { App } from './ui/App.tsx';

const cores = navigator.hardwareConcurrency || 4;
let useInline = false;
const factory = (): WorkerLike => {
  if (!useInline) {
    try { return new LabWorker() as unknown as WorkerLike; } catch (e) { console.warn('Web Workers unavailable; computing on the main thread', e); useInline = true; }
  }
  return new InlineWorker();
};
const lab = new Lab(factory, Math.max(1, Math.min(8, cores - 1)));
lab.loadAppearance(); lab.startAutosave();
(window as any).__lab = lab;       // handle for the browser test-suite and for curious users
createRoot(document.getElementById('root')!).render(<App lab={lab} />);
