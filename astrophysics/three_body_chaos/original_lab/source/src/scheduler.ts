// Priority scheduler for a bounded pool of workers.
//
// * Work is described by JOBS that produce small requests (chunks of ~100 ms) on demand, so a
//   million-sample map never materialises a million tasks.
// * Lower `priority` number = more urgent.  A free worker always takes the next chunk of the
//   most urgent job that has work; chunks are short, so urgent jobs (a clicked trajectory)
//   start within one chunk time without pre-empting running work or loosening any tolerance.
// * Every job has isStale(): when the configuration changes, the job's results are discarded
//   (counted in `staleRejected`) instead of being merged into the new configuration's map.
import type { Request, Response } from './messages.ts';
import { handle } from './worker-core.ts';

export interface WorkerLike {
  postMessage(msg: any, transfer?: Transferable[]): void;
  onmessage: ((ev: { data: any }) => void) | null;
  terminate(): void;
}

/** Runs the compute handler in the same thread (asynchronously).  Used by tests and as a fallback. */
export class InlineWorker implements WorkerLike {
  onmessage: ((ev: { data: any }) => void) | null = null;
  private dead = false;
  postMessage(msg: Request): void {
    setTimeout(() => {
      if (this.dead) return;
      const { res } = handle(msg);
      this.onmessage?.({ data: res });
    }, 0);
  }
  terminate(): void { this.dead = true; }
}

export interface Chunk { req: Request; ctx?: any }
export interface Job {
  id: number; priority: number; label: string;
  /** next request, or null when there is nothing to hand out right now */ next(): Chunk | null;
  onResponse(res: Response, ctx: any): void;
  isStale(): boolean;
  /** true once the job has handed out everything and can be dropped when its chunks return */ exhausted(): boolean;
  onFinished?(): void;
}

interface Slot { w: WorkerLike; busy: boolean; job?: Job; ctx?: any; rid?: number; startedAt?: number }

export class Scheduler {
  private slots: Slot[] = [];
  private jobs: Job[] = [];
  private size: number;
  private factory: () => WorkerLike;
  private nextRid = 1;
  paused = false;
  stats = { completed: 0, staleRejected: 0, errors: 0, busyMs: 0, startedAt: Date.now() };
  onChange?: () => void;
  lastError = '';

  constructor(factory: () => WorkerLike, size: number) { this.factory = factory; this.size = Math.max(1, size); }

  get workerCount(): number { return this.slots.length; }
  get activeCount(): number { return this.slots.filter((s) => s.busy).length; }
  get budget(): number { return this.size; }
  get jobCount(): number { return this.jobs.length; }

  setBudget(k: number): void {
    this.size = Math.max(1, Math.floor(k));
    // retire surplus idle workers now; busy ones are retired when they finish
    this.slots = this.slots.filter((s) => { if (!s.busy && this.slots.length > this.size) { s.w.terminate(); return false; } return true; });
    this.pump();
  }

  add(job: Job): void { this.jobs.push(job); this.pump(); }
  remove(job: Job): void { this.jobs = this.jobs.filter((j) => j !== job); }
  removeWhere(pred: (j: Job) => boolean): void { this.jobs = this.jobs.filter((j) => !pred(j)); }
  pause(): void { this.paused = true; this.onChange?.(); }
  resume(): void { this.paused = false; this.pump(); this.onChange?.(); }
  isIdle(): boolean { return this.activeCount === 0 && !this.jobs.some((j) => !j.isStale() && !j.exhausted()); }

  /** Drop everything: queued jobs vanish; in-flight results are rejected when they return. */
  cancelAll(): void { this.jobs = []; }

  terminate(): void { for (const s of this.slots) s.w.terminate(); this.slots = []; this.jobs = []; }

  private ensureSlot(): Slot | null {
    const free = this.slots.find((s) => !s.busy);
    if (free) return free;
    if (this.slots.length >= this.size) return null;
    const w = this.factory(); const slot: Slot = { w, busy: false };
    w.onmessage = (ev) => this.receive(slot, ev.data as Response);
    (w as any).onerror = (e: any) => { this.lastError = String(e?.message ?? e); this.stats.errors++; slot.busy = false; this.pump(); };
    this.slots.push(slot);
    return slot;
  }

  pump(): void {
    if (this.paused) return;
    for (;;) {
      this.jobs = this.jobs.filter((j) => { if (j.isStale()) { this.stats.staleRejected++; return false; } return true; });
      const live = this.jobs.filter((j) => !j.exhausted()).sort((a, b) => a.priority - b.priority || a.id - b.id);
      if (!live.length) break;
      const slot = this.ensureSlot();
      if (!slot) break;
      let chunk: Chunk | null = null, owner: Job | null = null;
      for (const j of live) { chunk = j.next(); if (chunk) { owner = j; break; } }
      if (!chunk || !owner) break;
      const rid = this.nextRid++;
      (chunk.req as any).rid = rid;
      slot.busy = true; slot.job = owner; slot.ctx = chunk.ctx; slot.rid = rid; slot.startedAt = performance.now();
      slot.w.postMessage(chunk.req, []);
    }
    this.onChange?.();
  }

  private receive(slot: Slot, res: Response): void {
    const job = slot.job, ctx = slot.ctx;
    if (slot.startedAt !== undefined) this.stats.busyMs += performance.now() - slot.startedAt;
    slot.busy = false; slot.job = undefined; slot.ctx = undefined;
    if (!job) { this.pump(); return; }
    if (res.kind === 'error') { this.stats.errors++; this.lastError = res.message; }
    if (job.isStale()) this.stats.staleRejected++;
    else { this.stats.completed++; try { job.onResponse(res, ctx); } catch (e) { this.lastError = String((e as Error)?.message ?? e); this.stats.errors++; } }
    if (job.exhausted() && !this.slots.some((s) => s.busy && s.job === job)) { this.jobs = this.jobs.filter((j) => j !== job); job.onFinished?.(); }
    // retire surplus workers after a budget decrease
    if (this.slots.length > this.size) { const i = this.slots.indexOf(slot); if (i >= 0 && !slot.busy) { slot.w.terminate(); this.slots.splice(i, 1); } }
    this.pump();
  }
}
