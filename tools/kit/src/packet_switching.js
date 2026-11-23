/* =====================================================================
   PACKET SWITCHING LAB
   Cambridge International AS & A Level Computer Science 9618, §14.2
   "Circuit switching, packet switching" (links to §14.1 TCP/IP and
   §18.1 Dijkstra's algorithm).

   PACKET SWITCHING: the message is split into PACKETS. Each header holds
   the source and destination addresses and a SEQUENCE NUMBER. Every
   router reads the destination, looks it up in its ROUTING TABLE and
   sends the packet on to the next hop. Packets are routed independently,
   so they can take different routes and arrive out of order; the
   receiver puts them back in order using the sequence numbers.
   CIRCUIT SWITCHING: a path is set up and reserved from end to end
   before any data is sent; all the data follows it, in order, and nobody
   else can use those links until the circuit is released.

   THE MODEL (a discrete-event simulation: time in milliseconds, events
   kept in a priority queue, so the results do not depend on frame rate)
     * 2 hosts (A, B) and 11 routers joined by 23 full-duplex links. Each
       direction of a link has its own first-in-first-out output queue.
     * Store-and-forward: on each link a packet of L bits takes
           serialisation delay  L / R   (R = link rate)
         + propagation delay    d       (drawn length ÷ 100 ms; 0.5 ms for host links)
         + queueing delay       (time waiting behind other packets)
       Core links run at the rate you set; host links at 10 Mbps.
     * A router holds at most `buffer` waiting packets per output; a packet
       arriving at a full queue is dropped (tail drop).
     * Routing is link-state: each router runs Dijkstra's algorithm.
         static metric   = 10 × propagation delay (distance)
         adaptive metric = static + 10 × current queueing delay, refreshed every 5 ms
       Routers learn about a failed or restored link 10 ms after it happens.
     * Hop limit (TTL): each router takes 1 off; at 0 the packet is thrown away.
     * Packets: 40 B header + payload + 4 B trailer;
         packets needed N = ⌈message bytes ÷ (packet bytes − 44)⌉
     * Files: B acknowledges every packet; A re-sends after a timeout
       (RFC 6298 round-trip estimate, Karn's rule, doubling back-off,
       first timeout 250 ms (real TCP: 1 s), clock granularity 10 ms, at most 8 re-sends). A sends at most 16
       packets ahead of the acknowledgements (a fixed sliding window);
       there is no congestion control.
     * Calls: 160 B of audio every 20 ms, 40 frames, never re-sent;
       "late" means a one-way delay above 80 ms.
     * Circuit: the setup request travels hop by hop (propagation + 4 ms
       per switch), the confirmation comes back (+1 ms per hop). Then the
       data flows as one bit stream at the slowest link's rate:
           transfer time = setup + message bits ÷ R + Σ propagation delays
       A failed link drops the call; A redials after 10 ms (3 tries).
     * Other users' traffic: 1000 B packets between random routers,
       arriving at random (Poisson), from a seeded random generator.
   CHECKS: packets created = delivered + dropped + still in the network,
   at every instant; and, with static routing and a quiet network, the
   finish time equals an independent store-and-forward calculation
       F[k][i] = max(F[k−1][i], F[k][i−1] + d) + L/R,  T = F[N][n] + d(n)
   where packet k leaves A once the acknowledgement for packet k − 16
   is back (when the window never runs dry, for equal packets:
   T = Σ(L/Rᵢ + dᵢ) + (N − 1)·L/R_slowest).
   ===================================================================== */

// ---------------- 1. Small tools ----------------
const clamp = K.clamp;
const fmt = (v, dp = 1) => Number.isFinite(v) ? v.toFixed(dp) : "–";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The event queue: a binary heap ordered by time (ties broken by the order events were added)
class EventHeap {
  constructor() { this.a = []; this.n = 0; }
  lt(x, y) { return x.t < y.t || (x.t === y.t && x.s < y.s); }
  push(t, type, data) {
    const e = { t, type, data, s: this.n++ }, a = this.a; a.push(e); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (this.lt(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this.lt(a[l], a[m])) m = l; if (r < a.length && this.lt(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
    return top;
  }
  peek() { return this.a[0]; }
  get size() { return this.a.length; }
}

// ---------------- 2. Settings and the network ----------------
const CFG = {
  HDR: 40, TRL: 4, ACK_BYTES: 64, ACCESS_MBPS: 10, ACCESS_PROP: 0.5,
  CONVERGE: 10, ROUTE_TICK: 5, SETUP_PROC: 4, CONFIRM_PROC: 1, RELEASE_PROC: 1,
  STREAM_PAYLOAD: 160, STREAM_INTERVAL: 20, STREAM_FRAMES: 40, LATE_MS: 80,
  WINDOW: 16,      // A may have at most this many packets sent but not yet acknowledged (a fixed sliding window)
  MAX_RETX: 8, MIN_RTO: 20, INIT_RTO: 250, RTO_G: 10, MAX_RTO: 2000, REDIAL_LIMIT: 3,
  BG_BYTES: 1000, LOG_MAX: 200, REC_MAX: 6000, EVENT_CAP: 60000
};
// Addresses are from the ranges reserved for documentation
const NODES = [
  { short: "A", name: "Host A", type: "host", x: 55, y: 270, addr: "198.51.100.10" },
  { short: "R1", name: "R1", type: "router", x: 175, y: 270, addr: "10.0.0.1" },
  { short: "R2", name: "R2", type: "router", x: 320, y: 120, addr: "10.0.0.2" },
  { short: "R3", name: "R3", type: "router", x: 320, y: 270, addr: "10.0.0.3" },
  { short: "R4", name: "R4", type: "router", x: 320, y: 420, addr: "10.0.0.4" },
  { short: "R5", name: "R5", type: "router", x: 490, y: 70, addr: "10.0.0.5" },
  { short: "R6", name: "R6", type: "router", x: 490, y: 200, addr: "10.0.0.6" },
  { short: "R7", name: "R7", type: "router", x: 490, y: 350, addr: "10.0.0.7" },
  { short: "R8", name: "R8", type: "router", x: 490, y: 475, addr: "10.0.0.8" },
  { short: "R9", name: "R9", type: "router", x: 660, y: 170, addr: "10.0.0.9" },
  { short: "R10", name: "R10", type: "router", x: 660, y: 385, addr: "10.0.0.10" },
  { short: "R11", name: "R11", type: "router", x: 815, y: 270, addr: "10.0.0.11" },
  { short: "B", name: "Host B", type: "host", x: 945, y: 270, addr: "203.0.113.25" }
];
const A = 0, B = 12;
const LINK_DEFS = [[0, 1], [1, 2], [1, 3], [1, 4], [2, 3], [2, 5], [2, 6], [3, 4], [3, 6], [3, 7], [4, 7], [4, 8],
  [5, 6], [5, 9], [6, 7], [6, 9], [6, 10], [7, 10], [8, 10], [9, 10], [9, 11], [10, 11], [11, 12]];
const nodeR = i => NODES[i].type === "host" ? 24 : 17;

// ---------------- 3. Parameters and scenarios ----------------
const BUFS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64, 96, 128, 256, 512];   // router buffer sizes the slider steps through
const bufIndex = b => { let k = 0; BUFS.forEach((v, i) => { if (Math.abs(v - b) < Math.abs(BUFS[k] - b)) k = i; }); return k; };
const DEFAULTS = { mode: "packet", traffic: "message", msgKB: 12, pktBytes: 1000, coreMbps: 2, hopLimit: 16, routing: "adaptive", bgLevel: 0, buffer: 32, seed: 2027 };
const P = Object.assign({}, DEFAULTS);
const SCENARIOS = [
  { id: "web", name: "1 · Web page download", desc: "Quiet network. A 12 kB page is split into packets. With adaptive routing, packets from one message take different routes and arrive out of order.",
    p: { mode: "packet", traffic: "message", msgKB: 12, pktBytes: 1000, coreMbps: 2, hopLimit: 16, routing: "adaptive", bgLevel: 0, buffer: 32 }, speed: 20 },
  { id: "busy", name: "2 · Busy network", desc: "Heavy traffic from other users and small router buffers. Queues fill, packets are dropped and A has to re-send them.",
    p: { mode: "packet", traffic: "message", msgKB: 24, pktBytes: 1000, coreMbps: 2, hopLimit: 16, routing: "adaptive", bgLevel: 90, buffer: 6 }, speed: 25 },
  { id: "fail", name: "3 · Link failure", desc: "Link R6–R9 fails at 60 ms. Run it with packet switching, then with circuit switching, and compare.",
    p: { mode: "packet", traffic: "message", msgKB: 24, pktBytes: 1000, coreMbps: 2, hopLimit: 16, routing: "static", bgLevel: 0, buffer: 32 }, speed: 25,
    events() { schedule(60, "scenCut", { L: linkBetween(6, 9) }); } },
  { id: "loop", name: "4 · Routing loop and hop limit", desc: "R9 has a faulty routing entry that sends packets for B back to R6. Packets bounce until their hop limit reaches 0. A routing update fixes R9 at 120 ms.",
    p: { mode: "packet", traffic: "message", msgKB: 6, pktBytes: 1000, coreMbps: 2, hopLimit: 10, routing: "static", bgLevel: 0, buffer: 32 }, speed: 30,
    events() { S.stale = { node: 9, dest: B, chan: chanBetween(9, 6).id }; schedule(120, "repairStale", {}); } },
  { id: "call", name: "5 · Real-time call", desc: "A voice/video stream sends a small packet every 20 ms over a busy network. Compare the jitter with packet and circuit switching.",
    p: { mode: "packet", traffic: "stream", msgKB: 12, pktBytes: 1000, coreMbps: 2, hopLimit: 16, routing: "adaptive", bgLevel: 90, buffer: 24 }, speed: 80 },
  { id: "free", name: "Free exploration", desc: "Keeps your settings and removes any scheduled failures or faults.", p: null }
];
let scenario = SCENARIOS[0];

// ---------------- 4. Simulation state ----------------
let S = null;
function schedule(t, type, data) { S.heap.push(t, type, data); }
function linkBetween(a, b) { return S.links.find(L => (L.a === a && L.b === b) || (L.a === b && L.b === a)); }
function chanBetween(a, b) { return S.chans.find(c => c.from === a && c.to === b); }
function log(msg, cls) { S.log.push({ t: S.t, msg, cls }); if (S.log.length > CFG.LOG_MAX) S.log.shift(); S.logDirty = true; }

function buildNetwork() {
  S.links = LINK_DEFS.map((l, i) => {
    const a = NODES[l[0]], b = NODES[l[1]], len = Math.hypot(a.x - b.x, a.y - b.y), access = a.type === "host" || b.type === "host";
    return { id: i, a: l[0], b: l[1], access, len, d: access ? CFG.ACCESS_PROP : len / 100, cost: access ? 5 : Math.round(len / 10),
      rate: (access ? CFG.ACCESS_MBPS : P.coreMbps) * 1000,        // bits per ms (1 Mbps = 1000 bits/ms)
      up: true, knownUp: true, reserved: false, chans: [] };
  });
  S.chans = []; S.adj = NODES.map(() => []);
  for (const L of S.links) for (const [f, t] of [[L.a, L.b], [L.b, L.a]]) {
    const c = { id: S.chans.length, from: f, to: t, link: L, queue: [], busy: null, inFlight: new Set(), unlimited: NODES[f].type === "host" };
    S.chans.push(c); L.chans.push(c); S.adj[f].push(c);
  }
}

// ---------------- 5. Routing: link-state, each router runs Dijkstra ----------------
function edgeCost(c, adaptive) {
  const L = c.link; if (!L.knownUp || L.reserved) return Infinity;
  let cost = L.cost;
  if (adaptive) { let bits = 0; for (const p of c.queue) bits += p.bits; if (c.busy) bits += c.busy.bits * 0.5; cost += 10 * bits / L.rate; }   // + queueing delay, in the same 0.1 ms units
  return cost;
}
function dijkstra(src, costFn) {
  const n = NODES.length, dist = new Array(n).fill(Infinity), first = new Array(n).fill(-1), hops = new Array(n).fill(0), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  dist[src] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1, best = Infinity; for (let v = 0; v < n; v++) if (!done[v] && dist[v] < best) { best = dist[v]; u = v; }
    if (u < 0) break; done[u] = true;
    if (u !== src && NODES[u].type === "host") continue;          // hosts do not pass on other people's traffic
    for (const c of S.adj[u]) { const w = costFn(c); if (!Number.isFinite(w)) continue; const v = c.to, nd = dist[u] + w; if (nd < dist[v] - 1e-9) { dist[v] = nd; first[v] = u === src ? c.id : first[u]; hops[v] = hops[u] + 1; prev[v] = u; } }
  }
  return { dist, first, hops, prev };
}
function computeTables() { const ad = P.routing === "adaptive"; S.tables = NODES.map((_, s) => dijkstra(s, c => edgeCost(c, ad))); }
function nextChan(node, dest) {
  if (S.stale && S.stale.node === node && S.stale.dest === dest) return S.chans[S.stale.chan];   // the faulty entry (scenario 4)
  const f = S.tables[node].first[dest]; return f >= 0 ? S.chans[f] : null;
}
function tablePath(src, dst) { const path = [src]; let u = src; for (let k = 0; k < 30 && u !== dst; k++) { const c = nextChan(u, dst); if (!c) return null; u = c.to; path.push(u); } return u === dst ? path : null; }
function staticPath(src, dst) {
  const r = dijkstra(src, c => (c.link.up && c.link.knownUp) ? c.link.cost : Infinity); if (!Number.isFinite(r.dist[dst])) return null;
  const path = [dst]; let u = dst; while (u !== src) { u = r.prev[u]; if (u < 0) return null; path.unshift(u); } return path;
}
function pathLinks(path) { const out = []; for (let i = 0; i < path.length - 1; i++) out.push(linkBetween(path[i], path[i + 1])); return out; }
function startRouteTick() { if (!S.routeTick) { S.routeTick = true; schedule(S.t + CFG.ROUTE_TICK, "routeTick", {}); } }

// ---------------- 6. Moving packets: store-and-forward ----------------
function newPacket(kind, src, dst, bytes, extra) {
  const p = Object.assign({ id: ++S.pktId, kind, src, dst, bytes, bits: bytes * 8, hop: P.hopLimit, hopInit: P.hopLimit, created: S.t, path: [src], status: "queued", at: src, chan: null, retx: 0 }, extra || {});
  S.created++; if (kind === "bg") S.bgCreated++; return p;
}
const WHY = { overflow: "buffer full", ttl: "hop limit reached 0", linkfail: "link failed while it was in transit", linkdown: "next link is down and tables not yet updated", noroute: "no route", reserved: "link reserved" };
function drop(p, node, reason) {
  p.status = "dropped"; p.dropReason = reason; p.at = node; p.droppedAt = S.t; S.dropped++; S.dropBy[reason] = (S.dropBy[reason] || 0) + 1;
  if (p.kind === "bg") S.bgDropped++;
  if (p.kind === "data") { S.dataDrops[reason] = (S.dataDrops[reason] || 0) + 1; log(`${NODES[node].short}: data packet ${p.seq + 1} discarded (${WHY[reason]})`, "bad"); }
  else if (p.kind === "ack") log(`${NODES[node].short}: ACK for packet ${p.seq + 1} discarded`, "warn");
}
function forward(p, node) {
  const c = nextChan(node, p.dst);
  if (!c) { drop(p, node, "noroute"); return; }
  if (!c.link.up) { drop(p, node, "linkdown"); return; }
  if (c.link.reserved) { drop(p, node, "reserved"); return; }
  enqueue(c, p);
}
function enqueue(c, p) {
  if (!c.unlimited && c.queue.length >= P.buffer) { drop(p, c.from, "overflow"); return; }
  p.status = "queued"; p.at = c.from; p.qChan = c;
  if (p.priority) c.queue.unshift(p); else c.queue.push(p);
  if (!c.busy) startTx(c);
}
function startTx(c) {
  if (c.busy || !c.queue.length || !c.link.up) return;
  const p = c.queue.shift(); c.busy = p; p.qChan = null; p.chan = c; p.status = "moving";
  p.txStart = S.t; p.txEnd = S.t + p.bits / c.link.rate; p.arriveAt = p.txEnd + c.link.d;   // serialisation, then propagation
  c.inFlight.add(p); schedule(p.txEnd, "txDone", { c, p }); schedule(p.arriveAt, "arrive", { c, p });
  if (p.kind === "data" && c.from === A) { p.sentAt = S.t; if (S.sends.length < CFG.REC_MAX) S.sends.push({ t: S.t, seq: p.seq, retx: p.retx }); if (P.traffic === "message") armRTO(p.seq); }
}
function onArrive(c, p) {
  if (p.status !== "moving" || p.chan !== c) return;       // it was lost on a failed link
  c.inFlight.delete(p); p.chan = null; const node = c.to; p.path.push(node); p.at = node;
  if (node === p.dst) { deliver(p); return; }
  p.hop -= 1; if (p.hop <= 0) { drop(p, node, "ttl"); return; }
  forward(p, node);
}
function deliver(p) { p.status = "delivered"; p.deliveredAt = S.t; S.delivered++; if (p.kind === "ack") onAck(p); else if (p.kind === "data") onDataAtB(p); }

// ---------------- 7. The hosts: sender A and receiver B ----------------
function armRTO(seq) { const s = S.snd; s.token[seq]++; schedule(S.t + Math.min(CFG.MAX_RTO, s.rto * s.backoff[seq]), "rto", { seq, tok: s.token[seq] }); }
// Send new packets while fewer than WINDOW are waiting for an acknowledgement
function sendMore() { const s = S.snd; while (s.next < S.N && s.next - s.ackCount < CFG.WINDOW) { const k = s.next++; forward(newPacket("data", A, B, S.pktBytes[k], { seq: k, total: S.N, flow: "msg" }), A); } }
function onAck(p) {
  const s = S.snd, seq = p.seq; if (s.acked[seq]) return; s.acked[seq] = true; s.ackCount++;
  if (p.dataRetx === 0 && Number.isFinite(p.dataSentAt)) {   // Karn's rule: only time packets that were not re-sent
    const R = S.t - p.dataSentAt;
    if (s.srtt === null) { s.srtt = R; s.rttvar = R / 2; } else { s.rttvar = 0.75 * s.rttvar + 0.25 * Math.abs(s.srtt - R); s.srtt = 0.875 * s.srtt + 0.125 * R; }
    s.rto = clamp(s.srtt + Math.max(CFG.RTO_G, 4 * s.rttvar), CFG.MIN_RTO, CFG.MAX_RTO);   // RFC 6298: RTO = SRTT + max(G, 4 × RTTVAR)
  }
  sendMore(); checkPacketMessageDone();
}
function onRTO(seq, tok) {
  const s = S.snd; if (s.acked[seq] || tok !== s.token[seq] || S.finished) return;
  if (s.retx[seq] >= CFG.MAX_RETX) { S.failed = true; finish(`Transfer failed: packet ${seq + 1} was not acknowledged after ${CFG.MAX_RETX} re-sends.`); return; }
  s.retx[seq]++; s.backoff[seq] *= 2; S.retx++;
  log(`A: timer ran out for packet ${seq + 1}: re-sending it`, "warn");
  forward(newPacket("data", A, B, S.pktBytes[seq], { seq, total: S.N, retx: s.retx[seq], priority: true, flow: "msg" }), A);
}
function recordArrival(seq, delay, dup, isChunk) {
  if (S.arrivals.length < CFG.REC_MAX) S.arrivals.push({ t: S.t, seq, dup, delay });
  const r = S.rcv; if (dup) { r.dup++; return; }
  r.got[seq] = true; r.count++; r.delay[seq] = delay;
  if (seq < r.maxSeq) { r.ooo++; if (r.ooo <= 12) log(`B: packet ${seq + 1} arrived after packet ${r.maxSeq + 1} (out of order): held in the buffer`, "mut"); }
  r.maxSeq = Math.max(r.maxSeq, seq);
  if (P.traffic === "stream" && delay > CFG.LATE_MS) r.late++;
  if (P.traffic === "message" && r.count === S.N && !r.done) { r.done = true; r.doneAt = S.t; log(isChunk ? `B: whole message received (${S.N} blocks) in order` : `B: all ${S.N} packets received, put in order by sequence number and passed to the application`, "ok"); }
}
function onDataAtB(p) {
  const dup = !!S.rcv.got[p.seq], delay = P.traffic === "stream" ? S.t - p.genAt : S.t - p.sentAt;
  recordArrival(p.seq, delay, dup, false);
  if (P.traffic === "message") { forward(newPacket("ack", B, A, CFG.ACK_BYTES, { seq: p.seq, dataSentAt: p.sentAt, dataRetx: p.retx }), B); checkPacketMessageDone(); }
}
function checkPacketMessageDone() { if (P.mode === "packet" && P.traffic === "message" && S.rcv.done && S.snd.ackCount === S.N && !S.finished) finish(`Transfer complete in ${fmt(S.rcv.doneAt, 1)} ms.`); }
function finish(msg) { if (S.finished) return; S.finished = true; S.finishMsg = msg; log(msg, S.failed ? "bad" : "ok"); S.autoPause = true; }

// ---------------- 8. Circuit switching ----------------
function reserveLink(L) { L.reserved = true; for (const c of L.chans) { for (const p of c.queue) drop(p, c.from, "reserved"); c.queue = []; } computeTables(); }
function circuitSetup() {
  const C = S.circ, path = staticPath(A, B); C.attempts++;
  if (!path) { C.state = "failed"; S.failed = true; finish("Circuit could not be set up: no route from A to B."); return; }
  C.gen++; C.path = path; C.links = pathLinks(path);
  C.rate = Math.min(...C.links.map(L => L.rate)); C.sumD = C.links.reduce((s, L) => s + L.d, 0);
  C.state = "setup"; C.setupStart = S.t; C.holdStart = S.t;
  log(`A: circuit setup request sent along ${path.map(i => NODES[i].short).join("–")}`, "mut");
  reserveLink(C.links[0]); sendSig("setup", 0);
}
function sendSig(kind, i) {
  const C = S.circ; let to, dur;
  if (kind === "setup") { to = C.path[i + 1]; dur = C.links[i].d + CFG.SETUP_PROC; } else { to = C.path[i - 1]; dur = C.links[i - 1].d + (kind === "confirm" ? CFG.CONFIRM_PROC : CFG.RELEASE_PROC); }
  const sig = { kind, i, from: C.path[i], to, t0: S.t, t1: S.t + dur, gen: C.gen, travel: kind === "setup" ? C.links[i].d : C.links[i - 1].d };
  S.sigs.push(sig); schedule(sig.t1, "sig", { sig });
}
function onSig(sig) {
  const C = S.circ; S.sigs = S.sigs.filter(s => s !== sig); if (sig.gen !== C.gen) return;
  if (sig.kind === "setup") { const k = sig.i + 1; if (k === C.path.length - 1) { sendSig("confirm", k); return; } const L = C.links[k]; if (!L.up) { circuitBroken("setup could not reserve a failed link"); return; } reserveLink(L); sendSig("setup", k); }
  else if (sig.kind === "confirm") { const k = sig.i - 1; if (k === 0) circuitUp(); else sendSig("confirm", k); }
  else if (sig.kind === "release") {
    const k = sig.i - 1; C.links[k].reserved = false;
    if (k === 0) { C.held += S.t - C.holdStart; C.holdStart = null; C.state = "released"; computeTables(); log("Circuit released: links free for other traffic", "mut"); finish(S.failed ? "Run ended." : `Circuit run complete. Data finished arriving at ${fmt(S.rcv.doneAt ?? S.t, 1)} ms.`); }
    else sendSig("release", k);
  }
}
function circuitUp() {
  const C = S.circ; C.state = "up"; C.setupTimes.push(S.t - C.setupStart);
  log(`Circuit established after ${fmt(S.t - C.setupStart, 1)} ms: data can now flow`, "ok");
  if (P.traffic === "message") sendChunks();
  else if (C.firstEst === null) { C.firstEst = S.t; for (let k = 0; k < S.N; k++) schedule(S.t + k * CFG.STREAM_INTERVAL, "cframe", { k }); schedule(S.t + (S.N - 1) * CFG.STREAM_INTERVAL + 100, "streamEnd", {}); }
}
function sendChunks() {   // the message flows as one continuous bit stream; "blocks" just mark where each packet's worth of data is
  const C = S.circ; let cum = 0;
  for (let k = 0; k < S.N; k++) { if (S.rcv.got[k]) continue; const bits = S.payloadBytes[k] * 8, start = S.t + cum / C.rate; cum += bits; const ch = { k, bits, start, arrive: S.t + cum / C.rate + C.sumD, gen: C.gen }; S.chunks.push(ch); schedule(ch.arrive, "chunk", { ch }); }
}
function onChunk(ch) {
  const C = S.circ; S.chunks = S.chunks.filter(x => x !== ch); if (ch.gen !== C.gen) return;
  C.bitsDelivered += ch.bits; recordArrival(ch.k, ch.arrive - ch.start, !!S.rcv.got[ch.k], true);
  if (P.traffic === "message" && S.rcv.done && C.state === "up") { C.state = "releasing"; sendSig("release", C.path.length - 1); }
}
function circuitBroken(reason) {
  const C = S.circ; if (!(C.state === "setup" || C.state === "up" || C.state === "releasing")) return;
  C.gen++; if (C.holdStart !== null) { C.held += S.t - C.holdStart; C.holdStart = null; }
  for (const L of C.links) L.reserved = false; computeTables();
  const lost = S.chunks.length; S.chunks = []; S.sigs = []; C.state = "broken"; S.circDrops++;
  log(`Circuit broken (${reason}): call dropped${lost ? `, ${lost} block(s) in transit lost` : ""}`, "bad");
  if (C.attempts < CFG.REDIAL_LIMIT) schedule(S.t + CFG.CONVERGE, "redial", {}); else { S.failed = true; finish("Circuit failed after 3 attempts."); }
}

// ---------------- 9. Cutting and restoring links ----------------
function cutLink(L) {
  if (!L.up) return; L.up = false; S.topoChanged = true; log(`Link ${NODES[L.a].short}–${NODES[L.b].short} FAILED`, "bad");
  for (const c of L.chans) { for (const p of c.inFlight) drop(p, c.from, "linkfail"); c.inFlight.clear(); c.busy = null; for (const p of c.queue) drop(p, c.from, "linkfail"); c.queue = []; }
  schedule(S.t + CFG.CONVERGE, "converge", { L, up: false });
  const C = S.circ; if (C && C.links && C.links.includes(L) && L.reserved) circuitBroken(`link ${NODES[L.a].short}–${NODES[L.b].short} failed`);
}
function restoreLink(L) { if (L.up) return; L.up = true; S.topoChanged = true; log(`Link ${NODES[L.a].short}–${NODES[L.b].short} restored`, "ok"); schedule(S.t + CFG.CONVERGE, "converge", { L, up: true }); }

// ---------------- 10. Other users' traffic ----------------
const bgRate = () => (P.bgLevel / 100) * 16 * (P.coreMbps * 1000 / 8000);   // packets per ms
function onBg() {
  const lam = bgRate();
  if (lam > 0) {
    const src = 1 + Math.floor(S.rng() * 11); let dst = 1 + Math.floor(S.rng() * 10); if (dst >= src) dst++;
    forward(newPacket("bg", src, dst, CFG.BG_BYTES, {}), src);
    schedule(S.t + (-Math.log(1 - S.rng())) / lam, "bg", {});       // exponential gaps: Poisson arrivals
  } else schedule(S.t + 5, "bg", {});
}

// ---------------- 11. Events and reset ----------------
function handle(e) {
  const d = e.data;
  switch (e.type) {
    case "txDone": if (d.c.busy === d.p) d.c.busy = null; startTx(d.c); break;
    case "arrive": onArrive(d.c, d.p); break;
    case "rto": onRTO(d.seq, d.tok); break;
    case "bg": onBg(); break;
    case "routeTick": if (P.routing === "adaptive") { computeTables(); schedule(S.t + CFG.ROUTE_TICK, "routeTick", {}); } else S.routeTick = false; break;
    case "converge": d.L.knownUp = d.up; computeTables(); log(`Routing tables updated: ${NODES[d.L.a].short}–${NODES[d.L.b].short} ${d.up ? "added back" : "removed"}`, "mut"); break;
    case "scenCut": cutLink(d.L); break;
    case "repairStale": if (S.stale) { S.stale = null; computeTables(); log("Routing update: R9's faulty entry for Host B corrected", "ok"); } break;
    case "streamGen": forward(newPacket("data", A, B, CFG.HDR + CFG.STREAM_PAYLOAD + CFG.TRL, { seq: d.k, total: S.N, genAt: S.t, flow: "stream" }), A); break;
    case "streamEnd": { S.rcv.done = true; S.rcv.doneAt = S.t; const C = S.circ; if (P.mode === "circuit" && C.state === "up") { C.state = "releasing"; sendSig("release", C.path.length - 1); } else finish(`Call ended. ${S.rcv.count} of ${S.N} frames received, ${S.rcv.late} late.`); break; }
    case "sig": onSig(d.sig); break;
    case "chunk": onChunk(d.ch); break;
    case "cframe": { const C = S.circ; if (C.state === "up") { const bits = CFG.STREAM_PAYLOAD * 8, ch = { k: d.k, bits, start: S.t, arrive: S.t + bits / C.rate + C.sumD, gen: C.gen }; S.chunks.push(ch); schedule(ch.arrive, "chunk", { ch }); } else { S.rcv.lostOutage++; if (S.rcv.lostOutage === 1) log("Frames made while the circuit is down are lost", "bad"); } break; }
    case "redial": log("A: redialling: setting up a new circuit", "warn"); circuitSetup(); break;
  }
}
// Start a fresh run with the current settings P and the chosen scenario (model only: no drawing)
function reset() {
  S = { t: 0, heap: new EventHeap(), rng: K.rng((P.seed >>> 0) || 1), pktId: 0, created: 0, bgCreated: 0, delivered: 0, dropped: 0, bgDropped: 0,
    dropBy: {}, dataDrops: {}, log: [], arrivals: [], sends: [], sigs: [], chunks: [], topoChanged: false, stale: null,
    finished: false, failed: false, routeTick: false, retx: 0, circDrops: 0, autoPause: false, logDirty: true };
  buildNetwork(); computeTables();
  if (scenario && scenario.events) scenario.events();
  if (S.stale) computeTables();
  if (P.traffic === "message") {
    const msgBytes = P.msgKB * 1000, pay = P.pktBytes - CFG.HDR - CFG.TRL;
    S.N = Math.ceil(msgBytes / pay); S.payloadBytes = []; S.pktBytes = [];
    for (let k = 0; k < S.N; k++) { const b = k < S.N - 1 ? pay : msgBytes - pay * (S.N - 1); S.payloadBytes.push(b); S.pktBytes.push(b + CFG.HDR + CFG.TRL); }
    S.msgBytes = msgBytes;
  } else { S.N = CFG.STREAM_FRAMES; S.payloadBytes = new Array(S.N).fill(CFG.STREAM_PAYLOAD); S.pktBytes = new Array(S.N).fill(CFG.STREAM_PAYLOAD + CFG.HDR + CFG.TRL); }
  S.rcv = { got: [], delay: [], count: 0, maxSeq: -1, ooo: 0, dup: 0, late: 0, done: false, doneAt: null, lostOutage: 0 };
  S.snd = { acked: new Array(S.N).fill(false), token: new Array(S.N).fill(0), backoff: new Array(S.N).fill(1), retx: new Array(S.N).fill(0), ackCount: 0, next: 0, srtt: null, rttvar: null, rto: CFG.INIT_RTO };
  S.circ = { attempts: 0, gen: 0, state: "idle", firstEst: null, setupTimes: [], held: 0, holdStart: null, bitsDelivered: 0, links: null };
  S.initialPath = tablePath(A, B); S.pred = null;
  if (P.mode === "packet") {
    if (P.traffic === "message") { S.pred = predictPacket(); sendMore(); log(`A: message split into ${S.N} packets; up to ${CFG.WINDOW} sent before waiting for acknowledgements`, "mut"); }
    else { for (let k = 0; k < S.N; k++) schedule(k * CFG.STREAM_INTERVAL, "streamGen", { k }); schedule((S.N - 1) * CFG.STREAM_INTERVAL + 300, "streamEnd", {}); log("Call started: A sends a 160-byte frame every 20 ms", "mut"); }
  } else { circuitSetup(); S.pred = predictCircuit(); }
  schedule(0, "bg", {});
  if (P.routing === "adaptive") startRouteTick();
}
function advanceTo(target) {
  let n = 0;
  while (S.heap.size && S.heap.peek().t <= target) { const e = S.heap.pop(); S.t = e.t; handle(e); if (++n > CFG.EVENT_CAP) { target = S.t; break; } }   // safety valve: never freeze the page
  S.t = Math.max(S.t, target);
}

// ---------------- 12. Independent predictions (the checks) ----------------
function predictPacket() {   // a tandem-queue recursion over the first route, for a quiet network with static routing
  const path = S.initialPath, back = tablePath(B, A); if (!path || !back) return null;
  const links = pathLinks(path), n = links.length, ackTrip = pathLinks(back).reduce((t, L) => t + CFG.ACK_BYTES * 8 / L.rate + L.d, 0);
  const ackBack = [];   // when the acknowledgement for each packet reaches A
  let prev = null;
  for (let k = 0; k < S.N; k++) {
    const release = k < CFG.WINDOW ? 0 : ackBack[k - CFG.WINDOW], cur = new Array(n);   // the window: packet k waits for the ACK of packet k − WINDOW
    for (let i = 0; i < n; i++) { const ready = i === 0 ? release : cur[i - 1] + links[i - 1].d, free = prev ? prev[i] : 0; cur[i] = Math.max(ready, free) + S.pktBytes[k] * 8 / links[i].rate; }
    ackBack.push(cur[n - 1] + links[n - 1].d + ackTrip); prev = cur;
  }
  return { finish: prev[n - 1] + links[n - 1].d, path };
}
function predictCircuit() {
  const path = staticPath(A, B); if (!path) return null;
  const links = pathLinks(path), sumD = links.reduce((s, L) => s + L.d, 0), R = Math.min(...links.map(L => L.rate));
  const setup = links.reduce((s, L) => s + L.d + CFG.SETUP_PROC, 0) + links.reduce((s, L) => s + L.d + CFG.CONFIRM_PROC, 0);
  const bits = P.traffic === "message" ? S.msgBytes * 8 : null;
  return { setup, finish: bits !== null ? setup + bits / R + sumD : null, R, sumD };
}
function liveInNetwork() { let n = 0; for (const c of S.chans) n += c.queue.length + c.inFlight.size; return n; }
function stats() {
  const r = S.rcv, ds = []; for (let k = 0; k < S.N; k++) if (Number.isFinite(r.delay[k])) ds.push(r.delay[k]);
  let js = 0, jn = 0; for (let k = 1; k < S.N; k++) if (Number.isFinite(r.delay[k]) && Number.isFinite(r.delay[k - 1])) { js += Math.abs(r.delay[k] - r.delay[k - 1]); jn++; }
  return { mean: ds.length ? K.mean(ds) : NaN, min: ds.length ? Math.min(...ds) : NaN, max: ds.length ? Math.max(...ds) : NaN, jitter: jn ? js / jn : NaN };
}

// ---------------- 13. Headless runs for the Batch run ----------------
// Runs one whole transfer or call without drawing, then puts the live run back exactly as it was.
function headless(settings, scenId, until = 6000) {
  const keepS = S, keepP = Object.assign({}, P), keepSc = scenario;
  Object.assign(P, DEFAULTS, settings); scenario = SCENARIOS.find(s => s.id === (scenId || "free"));
  let out;
  try { reset(); const pred = S.pred; while (!S.finished && S.t < until) advanceTo(S.t + 10); out = { S, pred, st: stats() }; }
  finally { S = keepS; Object.assign(P, keepP); scenario = keepSc; }
  return out;
}
const seedOf = r => 1 + r.int(999998);
// the analytic predictions, without running: quiet network, static routing
const predicted = (settings, kind) => { const keepS = S, keepP = Object.assign({}, P), keepSc = scenario; Object.assign(P, DEFAULTS, settings); scenario = SCENARIOS[5]; try { reset(); return kind === "c" ? predictCircuit() : predictPacket(); } finally { S = keepS; Object.assign(P, keepP); scenario = keepSc; } };

// ---------------- The page ----------------
let speed = 20, selected = null;
const ui = K.app({
  title: "Packet Switching Lab", subject: "Computer Science",
  blurb: "Split a message into packets, route them through a network of routers, and compare with circuit switching",
  reset: () => { setPlay(false); restart(); },
  step: () => { advanceTo(S.t + 1); refresh(true); },
  levels: { std: "A Level (9618 §14.2)", adv: "Extension (beyond 9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 14.2 Circuit switching, packet switching: what each is, their benefits and drawbacks and where each is used; the function of a router in packet switching; how packet switching passes a message across a network, including the internet.",
    adv: "Everything in 14.2, plus ideas beyond the specification: store-and-forward timing and the best packet size, queues and buffers, adaptive (link-state) routing with Dijkstra's algorithm (which is in 18.1), round-trip timers and re-sending, and the hop limit (TTL). The TCP/IP stack is in 14.1." } },
  missions: [
    { title: "Different routes, different order", q: "Run scenario 1 with adaptive routing. Predict first: will the packets arrive in the order they were sent? Use the arrival graph and the blue routing arrows to explain what happens. How does B put the message back together?", hint: "Adaptive routing recalculates the tables every 5 ms from the queue lengths, so later packets are sent round a busy route and some overtake earlier ones (dots below the rising trend on the arrival graph). B holds the later packets in its buffer and uses the sequence number in each header to put them back in order.", setup() { useScenario("web"); } },
    { title: "Same route, same order", q: "Now run scenario 1 with static routing. How many packets arrive out of order now? Does every packet in packet switching always take a different route?", hint: "With static routing every router's table stays the same, so all the packets follow the same route and arrive in order. Packets CAN take different routes, but with stable tables they often take the same one. The analytic check also passes: the finish time matches the store-and-forward calculation exactly.", setup() { useScenario("web", { routing: "static" }); } },
    { title: "When a link fails (packet switching)", q: "Run scenario 3. What happens to the packets on link R6–R9 when it fails at 60 ms? How does the network recover, and how long does it take?", hint: "Packets on the failed link are lost. For 10 ms the routers still send packets towards it, and those are lost too. Then the tables are recalculated and packets go round. A's timers run out for the lost packets and it re-sends them. The transfer still completes: packet switching routes round failures.", setup() { useScenario("fail"); } },
    { title: "When a link fails (circuit switching)", q: "Run scenario 3 again with circuit switching. What happens to the call when the link fails? Compare the total time with the packet-switched run.", hint: "The reserved circuit is broken, so the call is dropped and the blocks in transit are lost. A must set up a whole new circuit (setup again), then send the rest of the data. A dedicated circuit cannot route round a failure.", setup() { useScenario("fail", { mode: "circuit" }); } },
    { title: "A real-time call", q: "Run scenario 5 with packet switching, then with circuit switching. Compare the jitter and the number of late frames. Then look at the circuit utilisation.", hint: "With packet switching each frame meets different queues, so the delay varies (jitter) and some frames are late; late frames are useless, so they are not re-sent. The circuit gives a constant delay and no jitter, which suits a call, but the reserved link is idle most of the time: the call needs only 64 kbit/s, so the utilisation is a few per cent.", setup() { useScenario("call"); } },
    { title: "Setup time against overheads", q: "Static routing, no other traffic. Compare the transfer times for a 2 kB message and a 256 kB message, with packet switching and with circuit switching. Which wins for each size, and why?", hint: "A circuit spends about 32 ms setting up before any data moves, but then sends with no headers and no store-and-forward. For a small message the setup dominates, so packet switching finishes first; only for a very big message (here above about 170 kB) does the circuit win. Try the batch run \"Packet or circuit: which finishes first?\".", setup() { useScenario("free", { mode: "packet", traffic: "message", routing: "static", bgLevel: 0, msgKB: 2 }); } },
    { title: "A busy network", q: "Run scenario 2. Where do the queues build up? What happens to packets that arrive at a full buffer, and how does A find out?", hint: "Queues build where routes share links. A packet arriving at a full buffer is thrown away (tail drop). A gets no acknowledgement for it, its timer runs out, and it re-sends the packet. The transfer still completes, but takes longer. Bigger buffers drop fewer packets but packets wait longer in them.", setup() { useScenario("busy"); } },
    { lvl: "adv", title: "The best packet size", q: "Static routing, no other traffic, a 32 kB message, 512-packet buffers. Try packet sizes from 200 B to 1500 B. Why are very small packets slow, and why are very large ones slow too?", hint: "Each packet carries 44 B of header and trailer, so small packets waste more of the link (and 16 small packets carry little data per round trip of the sliding window). But every router must receive a whole packet before sending it on (store-and-forward), so a large packet adds a long wait at each hop. The finish time is T = Σ(L/Rᵢ + dᵢ) + (N − 1)·L/R_slowest; the analytic check confirms it. (With small packets, 16 of them at once overflow a small buffer at R1, so this uses 512-packet buffers.)", setup() { useScenario("free", { mode: "packet", traffic: "message", routing: "static", bgLevel: 0, msgKB: 32, pktBytes: 300, buffer: 512 }); } },
    { lvl: "adv", title: "Why packets have a hop limit", q: "Run scenario 4 with a hop limit of 10, then 64. Watch link R6–R9. What would happen in a network with a routing loop if packets had no hop limit?", hint: "R9's faulty entry sends packets for B back to R6, which sends them to R9 again. Each router takes 1 off the hop limit, and at 0 the packet is thrown away. Without a limit, looping packets would circulate for ever, filling queues and crowding out other traffic. A larger limit lets them bounce longer before dying.", setup() { useScenario("loop"); } }
  ],
  batch: [
    { title: "Packet or circuit: which finishes first?", question: "For messages of different sizes on a quiet network, how much longer does packet switching take than circuit switching?", how: "Static routing, no other traffic, 1000 B packets, 2 Mbps core links, Each point = packet transfer time − circuit transfer time (positive: the circuit wins). Theory: the store-and-forward calculation minus (setup + bits ÷ R + Σd).", xLabel: "message size (kB)", yLabel: "packet time − circuit time (ms)", xs: [2, 16, 32, 64, 96, 128, 160, 192, 224, 256], reps: 2, fit: true,
      theory: x => { const s = { mode: "packet", routing: "static", msgKB: x }, p = predicted(s, "p"), c = predicted(Object.assign({}, s, { mode: "circuit" }), "c"); return p.finish - c.finish; }, theoryLabel: "store-and-forward − circuit",
      run: (x, r) => { const s = { routing: "static", msgKB: x, seed: seedOf(r) }, p = headless(Object.assign({ mode: "packet" }, s)), c = headless(Object.assign({ mode: "circuit" }, s)); return p.S.rcv.doneAt - c.S.rcv.doneAt; },
      note: "The circuit's setup (about 32 ms) is paid once; the packets' cost (44 bytes of header and trailer on every packet, plus store-and-forward at each router) grows with the message. So packet switching wins for small messages and the circuit wins only for big ones: on this network the line crosses zero at about 170 kB. Both runs are exact (no randomness on a quiet network), so repeats agree." },
    { lvl: "adv", title: "The best packet size", question: "How long does a 32 kB message take with packets of different sizes?", how: "Static routing, no other traffic, 2 Mbps core links, 512-packet router buffers (so nothing is dropped). Theory: the independent store-and-forward calculation T = Σ(L/Rᵢ + dᵢ) + (N − 1)·L/R_slowest.", xLabel: "packet size (bytes)", yLabel: "transfer time (ms)", xs: [200, 300, 400, 500, 600, 800, 1000, 1200, 1500], reps: 2,
      theory: x => predicted({ mode: "packet", routing: "static", msgKB: 32, pktBytes: x, buffer: 512 }, "p").finish, theoryLabel: "store-and-forward",
      run: (x, r) => headless({ routing: "static", msgKB: 32, pktBytes: x, buffer: 512, seed: seedOf(r) }).S.rcv.doneAt,
      note: "The simulation lands exactly on the calculation: a check that the program does what its model says. There is a best size in the middle: small packets waste time on headers (and below about 400 B the 16-packet window runs dry while A waits for acknowledgements), big ones on store-and-forward waits at each router." },
    { title: "Other traffic and out-of-order arrival", question: "With adaptive routing, how many packets of a 12 kB page arrive out of order as other users' traffic grows?", how: "Scenario 1 (adaptive routing, 2 Mbps), with other users' traffic from 0 to 100%. Each run uses a new random seed for the other traffic.", xLabel: "other users' traffic (%)", yLabel: "packets out of order", xs: [0, 20, 40, 60, 80, 100], reps: 5, yMin: 0,
      run: (x, r) => headless({ bgLevel: x, seed: seedOf(r) }, "web").S.rcv.ooo,
      note: "Even with no other traffic, about half the packets arrive out of order: adaptive routing counts the message's own queue, so it spreads one message over several routes. Other traffic changes which packets overtake which (the spread between runs), but hardly changes how many. With static routing the answer would be 0 on a quiet network." },
    { title: "Small buffers and re-sending", question: "On a busy network, how many packets does A have to re-send for different router buffer sizes?", how: "Scenario 2 (24 kB, 90% other traffic) with router buffers from 2 to 32 packets per output. A new random seed each run.", xLabel: "router buffer (packets per output)", yLabel: "re-sent packets", xs: [2, 4, 6, 8, 12, 16, 24, 32], reps: 4, yMin: 0,
      run: (x, r) => headless({ msgKB: 24, bgLevel: 90, buffer: x, seed: seedOf(r) }, "busy").S.retx,
      note: "Small buffers overflow, so packets are dropped and must be re-sent. Big buffers drop almost nothing, but packets can wait a long time in them (in real networks too-big buffers cause \"bufferbloat\")." },
    { title: "Jitter on a call", question: "How much does the delay of a packet-switched call vary as the network gets busier?", how: "Scenario 5 (a 40-frame call, adaptive routing) with packet switching. Jitter = mean change in one-way delay from one frame to the next. Theory: a circuit has no jitter at all (0 ms).", xLabel: "other users' traffic (%)", yLabel: "jitter (ms)", xs: [0, 25, 50, 75, 90, 100], reps: 4, yMin: 0, theory: () => 0, theoryLabel: "circuit switching",
      run: (x, r) => +headless({ traffic: "stream", bgLevel: x, buffer: 24, seed: seedOf(r) }, "call").st.jitter.toFixed(3),
      note: "On a quiet network every frame meets empty queues, so the jitter is almost zero; busy queues make it grow. That is why circuits (or quality-of-service priority) suit real-time calls." },
    { title: "Download times on a busy network", question: "How much does the time to download the same 12 kB page vary from one moment to the next on a busy network?", how: "Scenario 1 with 70% other traffic and adaptive routing, 120 runs with new random seeds. Theory: the time for the same page on a quiet network.", reps: 120, bins: 20, yLabel: "transfer time (ms)", theory: +headless({}, "web").S.rcv.doneAt.toFixed(2), theoryLabel: "quiet network",
      run: (x, r) => headless({ bgLevel: 70, seed: seedOf(r) }, "web").S.rcv.doneAt,
      note: "The same page takes a different time on every run, because it meets different queues. Busy runs are slower than the quiet-network time, and a few are much slower: the long tail on the right." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "14.2", text: "Packet switching: the message is split into packets. Each header holds the source and destination IP addresses and a sequence number (plus a hop limit and error checks)." },
      { lvl: "std", tag: "14.2", text: "A router reads each packet's destination address, looks it up in its routing table and forwards the packet to the next hop. Tables change as the network changes, so packets from one message can take different routes and arrive out of order; the receiver reassembles them by sequence number." },
      { lvl: "std", tag: "14.2", text: "Packet switching: links are shared, there is no setup delay, and failed links can be routed round. But packets meet queues, so delay varies (jitter), packets can be lost and re-sent, and every packet carries a header." },
      { lvl: "std", tag: "14.2", text: "Circuit switching: a dedicated path is set up before any data is sent. Data arrives in order with a constant delay, but the full bandwidth is reserved even when idle, and a broken link drops the connection. It suits real-time calls." },
      { lvl: "adv", tag: "beyond", text: "Store-and-forward: each link adds serialisation delay L/R plus propagation delay d; queueing adds more. For N equal packets on a quiet route T = Σ(L/Rᵢ + dᵢ) + (N − 1)·L/R_slowest." },
      { lvl: "adv", tag: "18.1", text: "Link-state routing: each router finds the cheapest route to every destination with Dijkstra's algorithm. Adaptive routing adds current queue delays to the link costs." },
      { lvl: "adv", tag: "beyond", text: "Sliding window: the sender may have only a fixed number of packets unacknowledged at once; each acknowledgement lets it send another. This stops a fast sender flooding the network's queues." },
      { lvl: "adv", tag: "beyond", text: "The hop limit (TTL) is reduced by 1 at each router; at 0 the packet is discarded, so packets caught in a routing loop cannot circulate for ever." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Describe how a message is sent from one computer to another using packet switching.", ans: "<ul><li>the message is split into packets</li><li>each packet has a header with source and destination addresses and a sequence number</li><li>each router reads the destination address and uses its routing table to send the packet to the next router; packets may take different routes</li><li>at the destination the packets are reassembled in order using the sequence numbers; missing packets are requested / re-sent</li></ul>" },
      { lvl: "std", marks: 2, q: "State the function of a router in packet switching.", ans: "<ul><li>it receives a packet and reads its destination address</li><li>it uses its routing table to forward the packet towards its destination (to the next hop)</li></ul>" },
      { lvl: "std", marks: 4, q: "Give two benefits and two drawbacks of circuit switching compared with packet switching.", ans: "<ul><li>benefit: dedicated bandwidth, so a constant rate and no jitter</li><li>benefit: data arrives in order; no reassembly or headers needed</li><li>drawback: the circuit must be set up first (delay)</li><li>drawback: bandwidth is reserved even when idle, so it is wasted; a broken link drops the connection</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why circuit switching suits a live video call better than packet switching.", ans: "<ul><li>the circuit gives a constant delay with no jitter</li><li>late packets in a call are useless, and a circuit has no queues, so nothing arrives late or out of order</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A ${P.msgKB} kB message is sent in packets of ${P.pktBytes} bytes, each with 44 bytes of header and trailer. Calculate how many packets are needed and the percentage of the bytes sent that are overhead.`, ans: () => { const pay = P.pktBytes - 44, N = Math.ceil(P.msgKB * 1000 / pay); return `<ul><li>payload per packet = ${P.pktBytes} − 44 = ${pay} B</li><li>N = ⌈${P.msgKB * 1000} ÷ ${pay}⌉ = ${N}</li><li>overhead = 44 × ${N} ÷ (${P.msgKB * 1000} + 44 × ${N}) = ${(100 * 44 * N / (P.msgKB * 1000 + 44 * N)).toFixed(1)} %</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain why a packet has a hop limit (time to live).", ans: "<ul><li>each router reduces the hop limit by 1</li><li>when it reaches 0 the packet is discarded</li><li>so packets caught in a routing loop cannot circulate for ever, wasting bandwidth and filling queues</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>A discrete-event simulation: everything that happens (a packet finishing on a link, arriving at a router, a timer running out) is an event with a time in milliseconds, and the events are handled in time order. The results do not depend on how fast your computer draws. The playback slider only sets how much network time passes per real second.</p>
<ul><li><b>Network</b>: 11 routers and two hosts, joined by 23 full-duplex links. Each direction of a link has its own output queue. Core links run at the rate you set; the host links at 10 Mbps. Propagation delays are proportional to the drawn length (about 1.5–2.5 ms per core link) and are illustrative. Addresses come from the ranges reserved for documentation.</li>
<li><b>Store-and-forward</b>: a router must receive a whole packet before sending it on. Each link adds serialisation delay L/R and propagation delay d; waiting in a queue adds queueing delay. A packet arriving at a full buffer is dropped.</li>
<li><b>Packets</b>: N = ⌈message bytes ÷ (packet bytes − 44)⌉. Each packet has a 40-byte header (IPv4 + TCP for files; IPv4 + UDP + RTP for calls) and a 4-byte trailer (an error check that strictly belongs to the link-layer frame).</li>
<li><b>Routing</b> (extension): every router builds its table with Dijkstra's algorithm. Static routing uses a fixed distance metric; adaptive routing adds each output's current queueing delay and refreshes the tables every 5 ms. Routers learn of a failed or restored link 10 ms after it happens.</li>
<li><b>Sliding window</b> (extension): A may have at most 16 packets sent but not yet acknowledged; each acknowledgement lets it send one more. This stops A flooding R1 (A's link is 10 Mbps, the core 2 Mbps) and stops its timers running out for packets that are only waiting in a queue. Real TCP also changes the window size to avoid congestion; this one is fixed. On the slowest links (0.5 Mbps) with big packets, the first window's round-trip times grow faster than the timer can follow, so A re-sends packets that were not lost (a "spurious timeout", which real TCP can suffer too); the analytic check then says it does not apply.</li>
<li><b>Reliability</b> (extension): for files, B acknowledges every packet; if A's timer runs out first it re-sends the packet. The timer adapts to measured round-trip times (as TCP does, RFC 6298) and doubles after each timeout; A gives up after 8 re-sends. A call is never re-sent: late audio is useless.</li>
<li><b>Circuit switching</b>: the setup request goes hop by hop (4 ms per switch), reserving each link, and a confirmation comes back (1 ms per hop). Then the data flows as one bit stream at the slowest link's rate, with no headers, queues or store-and-forward: transfer time = setup + bits ÷ R + Σd. Reserved links carry nothing else. A failed link drops the call and A redials after 10 ms (up to 3 tries).</li>
<li><b>Other users' traffic</b>: 1000-byte packets between random routers, arriving at random (Poisson), from a seeded random generator, so the same seed gives the same run.</li></ul>
<h3>Checks shown under Live readings</h3>
<ul><li><b>Conservation</b>: every packet created is delivered, dropped or still in the network, at every instant.</li>
<li><b>Analytic check</b>: with static routing, no other traffic and no failures, the finish time equals an independent store-and-forward calculation; the circuit's finish equals setup + bits ÷ R + Σd.</li></ul>
<p>Passing these checks shows the program is consistent with its own model, not that the model matches measurements of the real internet. The numbers are illustrative.</p>
<h3>Simplifications</h3>
<ul><li>Adaptive routing here reacts to load much faster than real internet routing (OSPF inside an organisation, BGP between networks) so that route changes can be seen.</li>
<li>Real TCP changes its window size (congestion control); here the window is fixed at 16 packets.</li>
<li>Real telephone circuits reserve a fixed slice of a link (for example 64 kbit/s), not the whole link; most telephony now itself runs over packet networks.</li>
<li>Left out: bit errors and corrupted packets, router processing time, DNS, ARP, NAT, fragmentation, congestion control, quality-of-service priority and MAC addressing. Other users' traffic is random, not based on measured internet data.</li></ul>
<p>This simulation was contributed by a colleague and rebuilt with the shared kit (Batch run, worksheets, Revise tab). The original single-file version is kept in <a href="original/packet-switching-lab.html">original/packet-switching-lab.html</a>.</p>`
});

// ---------------- Extra styles for the readings, reassembly strip, inspector and log ----------------
document.head.append(K.$("style", "", `
.ps-read{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:0;font-size:12.5px}
.ps-read dt{color:var(--muted)} .ps-read dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.ps-read .sep{grid-column:1/-1;border-top:1px solid var(--line);margin:3px 0}
.ps-ok{color:var(--good)} .ps-bad{color:var(--bad)} .ps-warn{color:var(--warn)} .ps-mut{color:var(--muted);font-weight:400}
.ps-reasm{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0 2px}
.ps-reasm i{width:16px;height:16px;border-radius:3px;border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:9px;color:#0b0f14}
.ps-reasm i.got{border-color:transparent} .ps-reasm i.next{border:2px solid var(--warn)}
.ps-reasm.small i{width:10px;height:10px;font-size:0}
.ps-explain p{margin:0 0 7px;font-size:13px}
.ps-insp{font-size:12.5px} .ps-insp table{width:100%;border-collapse:collapse;margin-top:4px}
.ps-insp th,.ps-insp td{text-align:left;padding:1px 4px;border-bottom:1px solid var(--line)} .ps-insp th{color:var(--muted);font-weight:500}
.ps-insp .k{color:var(--muted)} .ps-insp .hdr{background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:5px 8px;margin:5px 0}
.ps-log{list-style:none;margin:0;padding:0;font-size:12px;max-height:180px;overflow:auto}
.ps-log li{padding:2px 0;border-bottom:1px solid var(--line)} .ps-log time{color:var(--accent);font-variant-numeric:tabular-nums;margin-right:6px}
.ps-sel{width:100%;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:5px 6px;margin-bottom:6px}
`));

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Scenarios");
const scenBtns = SCENARIOS.map(s => { const b = K.btn(g, s.name, () => useScenario(s.id)); b.style.cssText = "display:block;width:100%;text-align:left;margin-bottom:4px"; return [s.id, b]; });
const scenNote = K.note(g, "");
g = ui.group("Switching and traffic <small style='color:var(--warn);font-weight:400'>↻ restarts</small>");
ctl.mode = K.seg(g, { label: "Switching method", value: "packet", options: [["packet", "Packet switching"], ["circuit", "Circuit switching"]], on: v => change({ mode: v }) });
ctl.traffic = K.seg(g, { label: "Traffic", value: "message", options: [["message", "File / web page"], ["stream", "Real-time call"]], on: v => change({ traffic: v }) });
ctl.msgKB = K.slider(g, { label: "Message size", min: 2, max: 256, step: 1, value: 12, unit: "kB", on: v => change({ msgKB: v }) });
ctl.pktBytes = K.slider(g, { label: "Packet size (total)", min: 200, max: 1500, step: 100, value: 1000, unit: "B", on: v => change({ pktBytes: v }) });
ctl.coreMbps = K.slider(g, { label: "Core link bandwidth", min: 0.5, max: 10, step: 0.5, value: 2, unit: "Mbps", on: v => change({ coreMbps: v }) });
ctl.hopLimit = K.slider(g, { label: "Hop limit (TTL)", min: 4, max: 64, step: 1, value: 16, on: v => change({ hopLimit: v }) });
ctl.seed = K.slider(g, { label: "Random seed for other traffic", min: 1, max: 9999, step: 1, value: 2027, fmt: v => String(v), on: v => change({ seed: v }) });
g = ui.group("Network conditions <small style='color:var(--good);font-weight:400'>acts at once</small>");
ctl.routing = K.seg(g, { label: "Routing", value: "adaptive", options: [["adaptive", "Adaptive"], ["static", "Static"]], on: v => { P.routing = v; computeTables(); if (v === "adaptive") startRouteTick(); log(`Routing switched to ${v}`, "mut"); refresh(true); } });
ctl.bgLevel = K.slider(g, { label: "Other users' traffic", min: 0, max: 100, step: 5, value: 0, fmt: v => v === 0 ? "none" : v + " %", on: v => { P.bgLevel = v; refresh(true); } });
ctl.buffer = K.slider(g, { label: "Router buffer (per output)", min: 0, max: BUFS.length - 1, step: 1, value: bufIndex(32), fmt: i => BUFS[i] + " packets", on: i => P.buffer = BUFS[i] });
const linkSel = K.$("select", "ps-sel"); linkSel.setAttribute("aria-label", "Link to cut or restore"); g.append(linkSel);
const linkBtn = K.btn(K.row(g), "✂ Cut this link", () => toggleLink(S.links[+linkSel.value]));
K.note(g, "Or click a link on the diagram to cut or restore it.");
linkSel.onchange = refreshLinkSel;
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Playback (ms of network time per second)", min: 2, max: 200, step: 1, value: 20, on: v => speed = v });
ui.headerSpeed(ctl.speed, { label: "Playback" });
const ov = {};
ov.routes = K.toggle(g, { label: "Routing-table arrows towards Host B", value: true });
ov.queues = K.toggle(g, { label: "Router queue bars", value: true });
ov.acks = K.toggle(g, { label: "Acknowledgements", value: true });
ov.bg = K.toggle(g, { label: "Other users' packets", value: true });
ov.costs = K.toggle(g, { label: "Link metrics (extension)", value: false });
g = ui.group("Live readings");
const readEl = K.$("dl", "ps-read"); g.append(readEl);
const reasmLabel = K.$("small", "", ""); reasmLabel.style.color = "var(--muted)"; const reasmEl = K.$("div", "ps-reasm"); g.append(reasmLabel, reasmEl);
g = ui.group("What's happening?");
const explainEl = K.$("div", "ps-explain"); g.append(explainEl);
g = ui.group("Inspector");
const nodeSel = K.$("select", "ps-sel"); nodeSel.setAttribute("aria-label", "Router or host to inspect"); nodeSel.innerHTML = NODES.map((n, i) => `<option value="${i}">${n.name}</option>`).join(""); g.append(nodeSel);
nodeSel.onchange = () => { selected = { type: "node", i: +nodeSel.value }; renderInspector(); };
const inspEl = K.$("div", "ps-insp"); g.append(inspEl);
g = ui.group("Event log");
const logEl = K.$("ul", "ps-log"); g.append(logEl);

function setPlay(v) { ui.setPlaying(v); }
function syncUI() {
  for (const k of ["mode", "traffic", "routing"]) ctl[k].set(P[k]);
  for (const k of ["msgKB", "pktBytes", "coreMbps", "hopLimit", "seed", "bgLevel"]) ctl[k].set(P[k]);
  ctl.buffer.set(bufIndex(P.buffer));
  ctl.speed.set(speed);
  scenBtns.forEach(([id, b]) => b.classList.toggle("on", id === scenario.id)); scenNote.textContent = scenario.desc;
  const msg = P.traffic === "message", pk = msg && P.mode === "packet";
  ctl.msgKB.el.style.opacity = msg ? 1 : 0.45; ctl.pktBytes.el.style.opacity = pk ? 1 : 0.45;
}
function useScenario(id, extra) {
  scenario = SCENARIOS.find(s => s.id === id);
  if (scenario.p) Object.assign(P, scenario.p); if (scenario.speed) speed = scenario.speed; if (extra) Object.assign(P, extra);
  setPlay(false); restart();
}
function change(o) { Object.assign(P, o); restart(); }
function restart() { reset(); selected = null; S.view = true; buildLinkSel(); syncUI(); renderInspector(); refresh(true); }
function buildLinkSel() { linkSel.innerHTML = S.links.map(L => `<option value="${L.id}">${NODES[L.a].short} – ${NODES[L.b].short}</option>`).join(""); refreshLinkSel(); }
function refreshLinkSel() {
  const v = linkSel.value; for (const o of linkSel.options) { const L = S.links[+o.value]; o.textContent = `${NODES[L.a].short} – ${NODES[L.b].short}${L.up ? "" : " (failed)"}`; }
  linkSel.value = v; const L = S.links[+linkSel.value]; linkBtn.textContent = L && !L.up ? "🔧 Restore this link" : "✂ Cut this link";
}
function toggleLink(L) { if (!L) return; if (L.up) cutLink(L); else restoreLink(L); refreshLinkSel(); refresh(true); }

// ---------------- Drawing the network ----------------
const cv = ui.canvas(() => drawNet());
const chArr = K.chart(ui.dock, { title: "Arrival order at Host B", xLabel: "time (ms)", yLabel: "sequence number" });
const chDel = K.chart(ui.dock, { title: "One-way delay of each packet", xLabel: "sequence number", yLabel: "delay (ms)" });
const seqColour = (seq, l = 62) => `hsl(${(seq * 137.508) % 360} 78% ${l}%)`;   // the golden angle spreads neighbouring numbers round the colour wheel
let VIEW = { s: 1, ox: 0, oy: 0 }, hitList = [];
function lane(c, f, off = 4.5) {   // a point a fraction f along one direction of a link, shifted sideways so the two directions do not overlap
  const a = NODES[c.from], b = NODES[c.to], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, ra = nodeR(c.from), rb = nodeR(c.to), nx = -uy, ny = ux;
  const sx = a.x + ux * ra, sy = a.y + uy * ra, ex = b.x - ux * rb, ey = b.y - uy * rb;
  return { x: sx + (ex - sx) * f + nx * off, y: sy + (ey - sy) * f + ny * off, ux, uy, len: len - ra - rb };
}
function along(path, f) {
  const segs = []; let total = 0; for (let i = 0; i < path.length - 1; i++) { const a = NODES[path[i]], b = NODES[path[i + 1]], l = Math.hypot(b.x - a.x, b.y - a.y); segs.push({ a, b, l }); total += l; }
  let d = clamp(f, 0, 1) * total; for (const s of segs) { if (d <= s.l) { const t = d / s.l; return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }; } d -= s.l; }
  const last = NODES[path[path.length - 1]]; return { x: last.x, y: last.y };
}
function arrow(ctx, x1, y1, x2, y2, col, w) { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const a = Math.atan2(y2 - y1, x2 - x1), h = 7; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)); ctx.lineTo(x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const LEGEND = [["dot", "hsl(30 80% 62%)", "Data packet (colour and number = sequence)"], ["sq", "#e9eef5", "ACK"], ["dot", "#5b6878", "Other users"], ["bar", "#f5b942", "Queue"], ["bar", "rgba(45,212,191,.6)", "Reserved circuit"], ["bar", "#4cc2ff", "Next hop to B"], ["bar", "#ff6b6b", "Failed link"]];
function drawNet() {
  if (!S) return;
  const ctx = cv.ctx, W = cv.w, H = cv.h, legH = 24;
  ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); ctx.fillStyle = "#0a0e14"; ctx.fillRect(0, 0, W, H);
  // the legend along the bottom of the stage
  ctx.font = "11.5px Segoe UI,sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; let lx = 10; const ly = H - legH / 2;
  for (const [k, c, t] of LEGEND) { ctx.fillStyle = c; if (k === "dot") { ctx.beginPath(); ctx.arc(lx + 5, ly, 5, 0, 6.3); ctx.fill(); } else if (k === "sq") ctx.fillRect(lx + 2, ly - 3, 6, 6); else ctx.fillRect(lx, ly - 4, 14, 8); ctx.fillStyle = "#9fb0c0"; ctx.fillText(t, lx + 18, ly); lx += 26 + ctx.measureText(t).width; }
  // fit the 1000 × 540 diagram into the space above the legend
  const s = Math.min(W / 1000, (H - legH) / 540), ox = (W - 1000 * s) / 2, oy = (H - legH - 540 * s) / 2; VIEW = { s, ox, oy };
  ctx.setTransform(cv.dpr * s, 0, 0, cv.dpr * s, cv.dpr * ox, cv.dpr * oy);
  hitList = [];
  for (const L of S.links) if (L.reserved) { const a = NODES[L.a], b = NODES[L.b]; ctx.strokeStyle = "rgba(45,212,191,.35)"; ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const L of S.links) {
    const a = NODES[L.a], b = NODES[L.b]; ctx.lineCap = "butt";
    if (!L.up) { ctx.setLineDash([7, 6]); ctx.strokeStyle = "#ff6b6b"; ctx.lineWidth = 2; } else { ctx.setLineDash([]); ctx.strokeStyle = L.access ? "#4d5d72" : "#33414f"; ctx.lineWidth = L.access ? 3 : 2.2; }
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (!L.up) { ctx.strokeStyle = "#ff6b6b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 7, my - 7); ctx.lineTo(mx + 7, my + 7); ctx.moveTo(mx + 7, my - 7); ctx.lineTo(mx - 7, my + 7); ctx.stroke(); }
    else if (ov.costs.value) { ctx.font = "11px Segoe UI,sans-serif"; const t = String(L.cost), w = ctx.measureText(t).width + 6; ctx.fillStyle = "#0c1016"; ctx.fillRect(mx - w / 2, my - 7, w, 14); ctx.fillStyle = "#b69cff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, mx, my); }
  }
  if (ov.queues.value) for (const c of S.chans) {
    const q = c.queue.length; if (!q) continue;
    const p0 = lane(c, 0, 9), frac = c.unlimited ? Math.min(1, q / 40) : q / P.buffer, L = p0.len * 0.42 * Math.min(1, frac);
    ctx.strokeStyle = (!c.unlimited && frac >= 0.8) ? "#ff6b6b" : "#f5b942"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p0.x + p0.ux * Math.max(3, L), p0.y + p0.uy * Math.max(3, L)); ctx.stroke(); ctx.lineCap = "butt";
    if (q >= 2) { ctx.font = "bold 10px Segoe UI,sans-serif"; ctx.fillStyle = "#f5b942"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(q), p0.x + p0.ux * (Math.max(3, L) + 9) - p0.uy * 6, p0.y + p0.uy * (Math.max(3, L) + 9) + p0.ux * 6); }
  }
  if (ov.routes.value && P.mode === "packet") for (let r = 1; r <= 11; r++) {
    const c = nextChan(r, B); if (!c) continue; const st = S.stale && S.stale.node === r, p1 = lane(c, 0.18, -7), p2 = lane(c, 0.52, -7);
    arrow(ctx, p1.x, p1.y, p2.x, p2.y, st ? "#ff6b6b" : "rgba(76,194,255,.85)", st ? 2.5 : 1.8);
  }
  for (let i = 0; i < NODES.length; i++) {
    const nd = NODES[i], sel = selected && selected.type === "node" && selected.i === i;
    if (nd.type === "host") {
      ctx.fillStyle = "#16324a"; ctx.strokeStyle = sel ? "#ffd166" : "#4cc2ff"; ctx.lineWidth = sel ? 3 : 2; roundRect(ctx, nd.x - 24, nd.y - 19, 48, 34, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4cc2ff"; ctx.fillRect(nd.x - 10, nd.y + 15, 20, 4);
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px Segoe UI,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(nd.short, nd.x, nd.y - 2);
      ctx.font = "11px Segoe UI,sans-serif"; ctx.fillStyle = "#9fb0c0"; ctx.fillText(nd.name, nd.x, nd.y + 33); ctx.fillText(nd.addr, nd.x, nd.y + 47);
    } else {
      let busy = 0; for (const c of S.adj[i]) busy += c.queue.length;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, 17, 0, Math.PI * 2); ctx.fillStyle = S.stale && S.stale.node === i ? "#3a1a1a" : "#1b2633"; ctx.fill();
      ctx.strokeStyle = sel ? "#ffd166" : (busy ? "#f5b942" : "#6b7d92"); ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
      ctx.fillStyle = "#e6edf3"; ctx.font = "bold 11px Segoe UI,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(nd.short, nd.x, nd.y);
    }
  }
  for (const sg of S.sigs) {   // circuit signalling messages
    const f = clamp((S.t - sg.t0) / Math.max(1e-9, sg.travel), 0, 1), a = NODES[sg.from], b = NODES[sg.to], x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = sg.kind === "setup" ? "#ffd166" : sg.kind === "confirm" ? "#4ade80" : "#9fb0c0"; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    ctx.font = "10px Segoe UI,sans-serif"; ctx.fillStyle = "#ffd166"; ctx.textAlign = "center"; ctx.fillText(sg.kind === "setup" ? "SETUP" : sg.kind === "confirm" ? "CONNECT" : "RELEASE", x, y - 14);
  }
  if (S.circ && S.circ.path) for (const ch of S.chunks) {   // circuit data blocks
    const gg = (S.t - ch.start) / (ch.arrive - ch.start); if (gg < 0 || gg > 1) continue; const pt = along(S.circ.path, gg);
    ctx.fillStyle = seqColour(ch.k); roundRect(ctx, pt.x - 9, pt.y - 6, 18, 12, 3); ctx.fill();
    ctx.fillStyle = "#0b0f14"; ctx.font = "bold 9px Segoe UI,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(ch.k + 1), pt.x, pt.y + 0.5);
  }
  const draws = [];
  for (const c of S.chans) for (const p of c.inFlight) { if (p.kind === "bg" && !ov.bg.value) continue; if (p.kind === "ack" && !ov.acks.value) continue; const pt = lane(c, clamp((S.t - p.txStart) / (p.arriveAt - p.txStart), 0, 1)); draws.push({ p, x: pt.x, y: pt.y }); }
  draws.sort((u, v) => (u.p.kind === "data") - (v.p.kind === "data"));   // data packets on top
  for (const d of draws) {
    const p = d.p, sel = selected && selected.type === "packet" && selected.p === p;
    if (p.kind === "bg") { ctx.fillStyle = "#5b6878"; ctx.beginPath(); ctx.arc(d.x, d.y, 3.6, 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === "ack") { ctx.fillStyle = "#e9eef5"; ctx.fillRect(d.x - 3, d.y - 3, 6, 6); }
    else {
      ctx.beginPath(); ctx.arc(d.x, d.y, 8, 0, Math.PI * 2); ctx.fillStyle = seqColour(p.seq); ctx.fill();
      if (p.retx) { ctx.setLineDash([2, 2]); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = "#0b0f14"; ctx.font = "bold 9px Segoe UI,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(p.seq + 1), d.x, d.y + 0.5);
    }
    if (sel) { ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.stroke(); }
    hitList.push(d);
  }
  if (S.t === 0 && !ui.playing) { ctx.font = "13px Segoe UI,sans-serif"; ctx.fillStyle = "#9fb0c0"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("Press ▶ Play to start. Click a link to cut it; click a packet or router to inspect it.", 500, 532); }
  ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
}
K.pointer(cv.el, {
  down(pt) {
    const x = (pt.x - VIEW.ox) / VIEW.s, y = (pt.y - VIEW.oy) / VIEW.s;
    let best = null, bd = 14; for (const d of hitList) { const dist = Math.hypot(d.x - x, d.y - y) - (d.p.kind === "data" ? 4 : 0); if (dist < bd) { bd = dist; best = d; } }
    if (best) { selected = { type: "packet", p: best.p }; renderInspector(); return; }
    for (let i = 0; i < NODES.length; i++) if (Math.hypot(NODES[i].x - x, NODES[i].y - y) < nodeR(i) + 4) { selected = { type: "node", i }; nodeSel.value = i; renderInspector(); return; }
    let bl = null, bdl = 9;
    for (const L of S.links) { const a = NODES[L.a], b = NODES[L.b], dx = b.x - a.x, dy = b.y - a.y, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1), dist = Math.hypot(a.x + dx * t - x, a.y + dy * t - y); if (dist < bdl && t > 0.1 && t < 0.9) { bdl = dist; bl = L; } }
    if (bl) { linkSel.value = bl.id; toggleLink(bl); return; }
    selected = null; renderInspector();
  }
});

// ---------------- Charts, readings, explanation, inspector, log ----------------
function drawCharts() {
  const circ = P.mode === "circuit", lab = circ ? "block / frame number" : "sequence number";
  chArr.opts.yLabel = lab; chDel.opts.xLabel = lab;
  const tmax = Math.max(20, S.t, ...S.arrivals.map(a => a.t));
  const sends = S.sends.filter(s => !s.retx), resends = S.sends.filter(s => s.retx), got = S.arrivals.filter(a => !a.dup), dups = S.arrivals.filter(a => a.dup);
  const ser = [{ pts: sends.map(s => [s.t, s.seq + 1]), type: "dots", r: 2, color: "#6b7d92", label: "sent by A" }];
  if (resends.length) ser.push({ pts: resends.map(s => [s.t, s.seq + 1]), type: "dots", r: 3, color: "#f5b942", label: "re-sent" });
  ser.push({ pts: got.map(a => [a.t, a.seq + 1]), type: "dots", r: 3.2, color: K.cssVar("--s0"), label: "arrived at B" });
  if (dups.length) ser.push({ pts: dups.map(a => [a.t, a.seq + 1]), type: "dots", r: 3, color: "#ff6b6b", label: "duplicate" });
  chArr.draw(ser, { xMin: 0, xMax: tmax, yMin: 0, yMax: S.N + 1 });
  const ok = [], late = []; for (let k = 0; k < S.N; k++) { const v = S.rcv.delay[k]; if (Number.isFinite(v)) (P.traffic === "stream" && v > CFG.LATE_MS ? late : ok).push([k + 1, v]); }
  const dser = [{ pts: ok, type: "bars", w: 0.8, color: K.cssVar("--s0"), label: "delay" }]; if (late.length) dser.push({ pts: late, type: "bars", w: 0.8, color: "#ff6b6b", label: "late" });
  chDel.draw(dser, { xMin: 0.4, xMax: S.N + 0.6, yMin: 0, yMax: P.traffic === "stream" ? Math.max(CFG.LATE_MS * 1.15, ...ok.concat(late).map(q => q[1] * 1.08)) : undefined, hlines: P.traffic === "stream" ? [{ y: CFG.LATE_MS, color: "#ff6b6b", label: `late limit ${CFG.LATE_MS} ms` }] : [] });
}
const row = (dt, dd, cls) => `<dt>${dt}</dt><dd class="${cls || ""}">${dd}</dd>`;
function countBelow(k) { let n = 0; for (let i = 0; i < k; i++) if (S.rcv.got[i]) n++; return n; }
function analyticText() {
  if (!S.pred) return '<span class="ps-mut">n/a for this mode</span>';
  if (P.mode === "packet") {
    const valid = P.traffic === "message" && P.routing === "static" && S.bgCreated === 0 && !S.topoChanged && !S.stale && S.dropped === 0 && S.retx === 0;
    if (!valid) return '<span class="ps-mut">needs static routing, no other traffic, no failures or loss</span>';
    if (!S.rcv.done) return `<span class="ps-mut">predicts ${fmt(S.pred.finish, 2)} ms</span>`;
    return Math.abs(S.rcv.doneAt - S.pred.finish) < 1e-6 ? `<span class="ps-ok">✓</span> <span class="ps-mut">predicted ${fmt(S.pred.finish, 2)} ms</span>` : `<span class="ps-bad">✗ predicted ${fmt(S.pred.finish, 2)} ms</span>`;
  }
  const C = S.circ; if (C.attempts > 1) return '<span class="ps-mut">n/a after redial</span>';
  if (!C.setupTimes.length) return `<span class="ps-mut">setup should take ${fmt(S.pred.setup, 2)} ms</span>`;
  const okSetup = Math.abs(C.setupTimes[0] - S.pred.setup) < 1e-6;
  if (P.traffic === "message") {
    if (!S.rcv.done) return okSetup ? `<span class="ps-ok">✓ setup</span> <span class="ps-mut">finish predicted ${fmt(S.pred.finish, 2)} ms</span>` : '<span class="ps-bad">✗ setup</span>';
    return okSetup && Math.abs(S.rcv.doneAt - S.pred.finish) < 1e-6 ? `<span class="ps-ok">✓</span> <span class="ps-mut">predicted ${fmt(S.pred.finish, 2)} ms</span>` : '<span class="ps-bad">✗ mismatch</span>';
  }
  return okSetup ? '<span class="ps-ok">✓ setup time</span>' : '<span class="ps-bad">✗ setup</span>';
}
function updateReadings() {
  const r = S.rcv, st = stats(), C = S.circ; let h = "";
  const statusTxt = S.finished ? (S.failed ? '<span class="ps-bad">Failed</span>' : '<span class="ps-ok">Complete</span>') : P.mode === "circuit" ? ({ idle: "Idle", setup: "Setting up circuit", up: "Circuit up: transferring", releasing: "Releasing circuit", broken: "Call dropped: redialling", released: "Released", failed: "Failed" }[C.state]) : (S.t === 0 ? "Ready" : "Transferring");
  h += row("Status", statusTxt);
  if (P.traffic === "message") {
    if (P.mode === "packet") { const pay = P.pktBytes - CFG.HDR - CFG.TRL; h += row("Packets needed", `${S.N} × ${P.pktBytes} B`); h += row('<span class="ps-mut">header + payload + trailer</span>', `<span class="ps-mut">${CFG.HDR} + ${pay} + ${CFG.TRL} B</span>`); h += row("Header/trailer overhead", fmt(100 * (CFG.HDR + CFG.TRL) * S.N / (S.msgBytes + (CFG.HDR + CFG.TRL) * S.N), 1) + " %"); }
    else h += row("Message", `${P.msgKB} kB as ${S.N} blocks (no headers)`);
    h += row("Received at B", `${r.count} / ${S.N}`);
  } else { h += row("Frames received", `${r.count} / ${S.N}`); h += row(`Late (&gt; ${CFG.LATE_MS} ms)`, String(r.late), r.late ? "ps-warn" : ""); }
  if (P.mode === "packet") {
    h += row("Arrived out of order", String(r.ooo), r.ooo ? "ps-warn" : "");
    if (P.traffic === "message") { h += row("Duplicates discarded", String(r.dup)); h += row("Re-sent by A", String(S.retx), S.retx ? "ps-warn" : ""); }
    const dd = S.dataDrops, dTot = Object.values(dd).reduce((a, b) => a + b, 0);
    h += row("Data packets dropped", dTot ? `${dTot} <span class="ps-mut">(buffer ${dd.overflow || 0}, hop limit ${dd.ttl || 0}, link ${(dd.linkfail || 0) + (dd.linkdown || 0) + (dd.noroute || 0)})</span>` : "0", dTot ? "ps-bad" : "");
  } else {
    h += row("Circuit setup time", fmt(C.setupTimes.length ? C.setupTimes[0] : NaN, 1) + " ms"); h += row("Circuit rate", fmt(C.rate ? C.rate / 1000 : NaN, 1) + " Mbps");
    const held = C.held + (C.holdStart !== null ? S.t - C.holdStart : 0); h += row("Circuit utilisation", held > 0 && C.rate ? fmt(100 * C.bitsDelivered / (C.rate * held), 1) + " %" : "–");
    if (S.circDrops) h += row("Calls dropped", String(S.circDrops), "ps-bad"); if (r.lostOutage) h += row("Frames lost while down", String(r.lostOutage), "ps-bad");
  }
  h += row("Other users' packets dropped", String(S.bgDropped)); h += '<div class="sep"></div>';
  if (P.traffic === "message") h += row("Transfer time", r.done ? fmt(r.doneAt, 2) + " ms" : "–", r.done ? "ps-ok" : "");
  h += row("One-way delay (mean)", fmt(st.mean, 2) + " ms"); h += row('<span class="ps-mut">min / max</span>', `<span class="ps-mut">${fmt(st.min, 1)} / ${fmt(st.max, 1)} ms</span>`); h += row("Jitter", fmt(st.jitter, 2) + " ms");
  h += '<div class="sep"></div>';
  const live = liveInNetwork(), cons = S.created === S.delivered + S.dropped + live;
  h += row("Conservation check", cons ? `<span class="ps-ok">✓</span> <span class="ps-mut">${S.created} = ${S.delivered} + ${S.dropped} + ${live}</span>` : '<span class="ps-bad">✗ mismatch</span>');
  h += row("Analytic check", analyticText());
  readEl.innerHTML = h;
  reasmEl.classList.toggle("small", S.N > 60);
  let fm = -1; for (let k = 0; k < S.N; k++) if (!r.got[k]) { fm = k; break; }
  let cells = ""; for (let k = 0; k < S.N; k++) { const got = r.got[k]; cells += `<i class="${got ? "got" : ""}${k === fm && r.count > 0 ? " next" : ""}" style="${got ? "background:" + seqColour(k) : ""}">${S.N <= 60 ? (k + 1) : ""}</i>`; }
  reasmEl.innerHTML = cells;
  reasmLabel.textContent = P.traffic === "stream" ? "Frames received at B" : r.done ? "Reassembly buffer at B: complete, passed to the application" : fm > 0 && r.count > countBelow(fm) ? `Reassembly buffer at B: holding ${r.count - countBelow(fm)} packet(s), waiting for packet ${fm + 1}` : "Reassembly buffer at B";
}
function recent(re, within) { for (let i = S.log.length - 1; i >= 0; i--) { const e = S.log[i]; if (S.t - e.t > within) break; if (re.test(e.msg)) return e; } return null; }
function updateExplain() {
  const r = S.rcv, C = S.circ, out = [];
  if (S.t === 0 && !ui.playing) { explainEl.innerHTML = `<p>${esc(scenario.desc)}</p><p>Press <b>Play</b> to start. Playback is slowed down: ${speed} ms of network time takes one real second.</p>`; return; }
  if (P.mode === "packet") {
    if (P.traffic === "message") out.push(r.done ? `<p><b>Done.</b> All ${S.N} packets reached B. ${r.ooo ? `${r.ooo} arrived out of order, so` : "They arrived in order, but"} B used the <b>sequence number</b> in each header to put them back in order before passing the message to the application.</p>` : `<p>A has split the ${P.msgKB} kB message into <b>${S.N} packets</b>. Each header holds A's and B's addresses and a sequence number. Every router reads the <b>destination address</b>, looks it up in its <b>routing table</b> and forwards the packet to the next hop.</p>`);
    else { const s2 = stats(); out.push(`<p>A sends a small voice/video packet every 20 ms. Each one is routed independently, so each meets different queues. One-way delay ranges from ${fmt(s2.min, 1)} to ${fmt(s2.max, 1)} ms (jitter ${fmt(s2.jitter, 1)} ms). Lost or late packets are not re-sent: they would arrive too late to play.</p>`); }
    out.push(P.routing === "adaptive" ? "<p><b>Adaptive routing:</b> tables are recalculated every 5 ms using the current queue lengths. When one route gets busy, later packets go another way, so packets from one message can take different routes.</p>" : "<p><b>Static routing:</b> tables only change when the network changes, so packets to B all follow the same route (blue arrows) and usually arrive in order.</p>");
    if (P.traffic === "message" && !r.done && r.count > 0) { let fm = -1; for (let k = 0; k < S.N; k++) if (!r.got[k]) { fm = k; break; } if (fm >= 0 && r.count > countBelow(fm)) out.push(`<p>B is holding later packets in its buffer while it waits for <b>packet ${fm + 1}</b>.</p>`); }
    if (S.stale) out.push("<p class='ps-bad'><b>Routing loop:</b> R9's faulty entry sends packets for B back to R6, and R6 sends them to R9 again. Each router takes 1 off the <b>hop limit</b>. When it reaches 0 the packet is discarded, so it cannot circulate for ever.</p>");
    const cut = recent(/FAILED/, 40); if (cut) out.push(`<p class="ps-bad"><b>${esc(cut.msg)}</b> at ${fmt(cut.t, 1)} ms. Packets on that link were lost. Routers learn about the failure after ${CFG.CONVERGE} ms and recompute their tables to route round it.</p>`);
    if ((S.dataDrops.overflow || 0) > 0 && !r.done) out.push("<p>Some router queues filled up, and packets arriving at a full buffer were discarded.</p>");
    if (S.retx > 0 && P.traffic === "message") out.push(`<p>A got no acknowledgement for some packets before their timers ran out, so it has re-sent ${S.retx} packet(s).</p>`);
  } else {
    if (C.state === "setup") out.push("<p><b>Setting up the circuit.</b> A setup request travels hop by hop, and each switch reserves the link for this call. No user data can be sent until B's confirmation gets back to A.</p>");
    else if (C.state === "up" || C.state === "releasing") out.push(`<p><b>Circuit established</b> after ${fmt(C.setupTimes[C.setupTimes.length - 1], 1)} ms. Data streams along the reserved path at ${fmt(C.rate / 1000, 1)} Mbps. It all follows the same route, so it arrives in order with a constant delay. Reserved links (teal) <b>cannot be used by anyone else</b>, even when idle.</p>`);
    else if (C.state === "broken") out.push("<p class='ps-bad'><b>The circuit is broken.</b> A dedicated circuit has no other route, so the call is dropped. A must set up a new circuit from scratch.</p>");
    else if (C.state === "released") out.push("<p>The circuit has been released and its links are free for other traffic again.</p>");
    if (P.traffic === "stream" && C.rate) out.push(`<p>The call needs only 64 kbit/s, but the circuit reserves ${fmt(C.rate / 1000, 1)} Mbps. Most of the reserved capacity is wasted.</p>`);
  }
  explainEl.innerHTML = out.join("");
}
function updateLog() { if (!S.logDirty) return; S.logDirty = false; logEl.innerHTML = S.log.slice(-40).reverse().map(e => `<li class="ps-${e.cls || ""}"><time>${fmt(e.t, 1)}</time>${esc(e.msg)}</li>`).join(""); }
const nm = i => NODES[i].short;
function renderInspector() {
  if (!selected) { inspEl.innerHTML = '<p style="color:var(--muted);margin:0">Click a packet, router or host (or choose one above) to see its header or routing table. Pause first to catch a moving packet.</p>'; return; }
  if (selected.type === "packet") {
    const p = selected.p; let h = "";
    const where = p.status === "moving" && p.chan ? `in transit ${nm(p.chan.from)} → ${nm(p.chan.to)}, arrives at ${fmt(p.arriveAt, 2)} ms` : p.status === "queued" ? `waiting in ${nm(p.at)}'s output queue` : p.status === "delivered" ? `delivered to ${nm(p.at)} at ${fmt(p.deliveredAt, 2)} ms` : `<span class="ps-bad">discarded at ${nm(p.at)} (${WHY[p.dropReason]})</span>`;
    if (p.kind === "data") {
      const off = p.flow === "msg" ? S.payloadBytes.slice(0, p.seq).reduce((a, b) => a + b, 0) : 0, pay = p.bytes - CFG.HDR - CFG.TRL;
      h += `<b>Data packet ${p.seq + 1} of ${S.N}</b>${p.retx ? ` <span class="ps-warn">(re-send ${p.retx})</span>` : ""}`;
      h += `<div class="hdr"><div class="k">HEADER (${CFG.HDR} B)</div>Source address: ${NODES[p.src].addr} (Host A)<br>Destination address: ${NODES[p.dst].addr} (Host B)<br>Sequence number: ${p.seq + 1}<br>Hop limit: <b>${p.hop}</b> <span class="k">(started at ${p.hopInit})</span><br>Protocol: ${p.flow === "msg" ? "TCP" : "UDP/RTP"}</div>
        <div class="hdr"><div class="k">PAYLOAD (${pay} B)</div>${p.flow === "msg" ? `Bytes ${off + 1}–${off + pay} of the message` : "20 ms of encoded audio/video"}</div><div class="hdr"><div class="k">TRAILER (${CFG.TRL} B)</div>Error check value</div>`;
    } else if (p.kind === "ack") h += `<b>Acknowledgement</b> for packet ${p.seq + 1}<div class="hdr">Source: ${NODES[B].addr} (Host B)<br>Destination: ${NODES[A].addr} (Host A)<br>Hop limit: ${p.hop}</div>`;
    else h += `<b>Other users' traffic</b><div class="hdr">From ${nm(p.src)} to ${nm(p.dst)}<br>Hop limit: ${p.hop}</div>`;
    h += `<div><span class="k">Size:</span> ${p.bytes} B → ${fmt(p.bits / (P.coreMbps * 1000), 2)} ms to send on a core link</div><div><span class="k">Route so far:</span> ${p.path.map(nm).join(" → ")}</div><div><span class="k">Status:</span> ${where}</div>`;
    h += `<p class="k" style="margin:4px 0 0">The IP addresses stay the same at every hop. Each router wraps the packet in a new link-layer frame with new MAC addresses (§14.1).</p>`;
    inspEl.innerHTML = h; return;
  }
  const i = selected.i, nd = NODES[i]; let h = `<b>${nd.name}</b> <span class="k">· ${nd.addr}</span>`;
  if (nd.type === "host") h += i === A ? `<p style="margin:3px 0">Sending host. Default gateway: R1.${P.mode === "packet" && P.traffic === "message" ? ` Waiting for ${S.N - S.snd.ackCount} acknowledgement(s). Re-send timer: ${fmt(S.snd.rto, 1)} ms.` : ""}</p>` : `<p style="margin:3px 0">Receiving host. Default gateway: R11. ${S.rcv.count} of ${S.N} received.</p>`;
  h += "<table><thead><tr><th>Destination</th><th>Next hop</th><th>Metric</th><th>Hops</th></tr></thead><tbody>";
  const T = S.tables[i];
  for (let dI = 0; dI < NODES.length; dI++) { if (dI === i) continue; const c = nextChan(i, dI), st = S.stale && S.stale.node === i && S.stale.dest === dI; h += `<tr${st ? ' class="ps-bad"' : ""}><td>${NODES[dI].short}</td><td>${c ? nm(c.to) : "–"}${st ? " ⚠ faulty" : ""}</td><td>${Number.isFinite(T.dist[dI]) ? fmt(T.dist[dI], 0) : "∞"}</td><td>${Number.isFinite(T.dist[dI]) ? T.hops[dI] : "–"}</td></tr>`; }
  h += '</tbody></table><div style="margin-top:5px"><span class="k">Outputs:</span>';
  for (const c of S.adj[i]) { const q = c.queue, ds = q.filter(p => p.kind === "data").map(p => p.seq + 1); h += `<div>→ ${nm(c.to)}: ${c.link.up ? "" : '<span class="ps-bad">link down</span> '}${c.link.reserved ? '<span style="color:#2dd4bf">reserved</span> ' : ""}queue ${q.length}${c.unlimited ? "" : "/" + P.buffer}${ds.length ? ` <span class="k">(data ${ds.slice(0, 10).join(", ")}${ds.length > 10 ? "…" : ""})</span>` : ""}</div>`; }
  h += `</div><p class="k" style="margin:4px 0 0">Metric in 0.1 ms units${P.routing === "adaptive" ? " (distance + current queueing delay)" : " (distance)"}. Tables built with Dijkstra's algorithm (§18.1).</p>`;
  inspEl.innerHTML = h;
}
function refresh(force) {
  updateReadings(); updateExplain(); updateLog(); drawCharts(); if (selected) renderInspector();
  const r = S.rcv, stTxt = S.finished ? S.finishMsg : ui.playing ? "Running…" : (S.t === 0 ? "Ready: press Play." : "Paused.");
  ui.hud(`<b>t = ${fmt(S.t, 1)} ms</b> · ${P.mode === "packet" ? "packet" : "circuit"} switching<br>${r.count} of ${S.N} ${P.traffic === "message" ? (P.mode === "packet" ? "packets" : "blocks") : "frames"} at B · ${liveInNetwork()} packets in the network<br><span style="color:var(--muted)">${esc(stTxt)}</span>`);
}

// ---------------- The loop ----------------
let lastUI = 0;
ui.run(dt => {
  advanceTo(S.t + dt * speed);
  if (S.autoPause) { S.autoPause = false; setPlay(false); refresh(true); }
}, () => { drawNet(); const now = performance.now(); if (now - lastUI > 120) { lastUI = now; refresh(false); } });

setPlay(false);
useScenario("web");
ui.tip("Pick a scenario, then press ▶ Play · click a link on the diagram to cut it", 7000);
