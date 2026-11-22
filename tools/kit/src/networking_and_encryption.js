/* =====================================================================
   NETWORKS AND ENCRYPTION
   PACKET SWITCHING: a message is split into PACKETS, each with a header
   (source and destination IP addresses, sequence number). Each packet
   is ROUTED independently: every router sends it on by the best route
   it knows NOW, so packets can take different routes and arrive OUT
   OF ORDER; the receiver reassembles them by sequence number. TCP
   (transport layer) sets up a connection (SYN, SYN-ACK, ACK), and if a
   packet is lost it is re-sent after a timeout. CIRCUIT SWITCHING
   instead reserves one path for the whole conversation.
   ENCRYPTION turns PLAINTEXT into CIPHERTEXT using a KEY.
     Caesar: shift every letter by k (only 25 keys: easy to brute-force,
             and letter frequencies give it away).
     Vigenère: the shift changes with each letter of a keyword.
   SYMMETRIC encryption uses one shared secret key. ASYMMETRIC (public
   key) encryption, such as RSA, uses a key PAIR: anyone can encrypt
   with the PUBLIC key; only the PRIVATE key decrypts. Toy RSA:
     choose primes p, q;  n = pq;  φ = (p − 1)(q − 1)
     public key (e, n) with gcd(e, φ) = 1; private key d with ed ≡ 1 (mod φ)
     encrypt c = mᵉ mod n;  decrypt m = cᵈ mod n
   A DIGITAL SIGNATURE: encrypt a hash of the message with your PRIVATE
   key; anyone can check it with your PUBLIC key.
   ===================================================================== */
// ---------------- 1. The network ----------------
const NODES = { S: [0.07, 0.5], R1: [0.25, 0.22], R2: [0.25, 0.78], R3: [0.47, 0.12], R4: [0.47, 0.5], R5: [0.47, 0.88], R6: [0.7, 0.3], R7: [0.7, 0.72], D: [0.92, 0.5] };
const LINKS = [["S", "R1", 2], ["S", "R2", 2], ["R1", "R3", 2], ["R1", "R4", 2], ["R2", "R4", 2], ["R2", "R5", 2], ["R3", "R6", 2], ["R4", "R6", 2], ["R4", "R7", 2], ["R5", "R7", 2], ["R6", "D", 2], ["R7", "D", 2], ["R3", "R4", 1], ["R4", "R5", 1]];
// route one packet: Dijkstra on link delays = base + random congestion (fresh for every packet)
function route(r, cong, fixed) {
  const cost = {}; for (const [a, b, d] of LINKS) cost[a + b] = cost[b + a] = d + (fixed ? 0 : cong * r() * 4);
  const dist = {}, prev = {}, done = {}; for (const k in NODES) dist[k] = Infinity; dist.S = 0;
  while (true) { let u = null; for (const k in NODES) if (!done[k] && (u === null || dist[k] < dist[u])) u = k; if (u === null || u === "D") break; done[u] = 1; for (const [a, b] of LINKS) { const v = a === u ? b : b === u ? a : null; if (v && dist[u] + cost[u + v] < dist[v]) { dist[v] = dist[u] + cost[u + v]; prev[v] = u; } } }
  const path = []; for (let v = "D"; v; v = prev[v]) path.unshift(v); return { path, time: dist.D, cost };
}
// ---------------- 2. Ciphers ----------------
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ENG = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];   // English letter frequencies, %
const caesar = (t, k) => t.toUpperCase().replace(/[A-Z]/g, ch => A[(A.indexOf(ch) + k + 26) % 26]);
function vigenere(t, key, dir = 1) { let j = 0; key = key.toUpperCase().replace(/[^A-Z]/g, "") || "A"; return t.toUpperCase().replace(/[A-Z]/g, ch => A[(A.indexOf(ch) + dir * A.indexOf(key[j++ % key.length]) + 26) % 26]); }
const freqs = t => { const f = new Array(26).fill(0); let n = 0; for (const ch of t) { const i = A.indexOf(ch); if (i >= 0) { f[i]++; n++; } } return f.map(v => n ? 100 * v / n : 0); };
// crack a Caesar cipher: try every shift and pick the one whose letter frequencies best match English (chi-squared)
function crack(ct) { let best = 0, bs = Infinity; for (let k = 0; k < 26; k++) { const f = freqs(caesar(ct, -k)); let s = 0; for (let i = 0; i < 26; i++) s += (f[i] - ENG[i]) ** 2 / ENG[i]; if (s < bs) { bs = s; best = k; } } return best; }
function randomEnglish(r, n) { let s = ""; const cum = []; let t = 0; for (const p of ENG) cum.push(t += p); for (let i = 0; i < n; i++) { const u = r() * t; let k = 0; while (cum[k] < u) k++; s += A[k]; } return s; }
// ---------------- 3. Toy RSA (small numbers so you can check by hand) ----------------
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function modpow(b, e, m) { let r = 1n, x = BigInt(b) % BigInt(m), E = BigInt(e); const M = BigInt(m); while (E > 0n) { if (E & 1n) r = r * x % M; x = x * x % M; E >>= 1n; } return Number(r); }
function modinv(e, phi) { let [a, b, x0, x1] = [e, phi, 1, 0]; while (b) { const q = Math.floor(a / b); [a, b] = [b, a - q * b]; [x0, x1] = [x1, x0 - q * x1]; } return ((x0 % phi) + phi) % phi; }
const PRIMES = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
function rsaKeys(p, q, e) { const n = p * q, phi = (p - 1) * (q - 1); while (gcd(e, phi) !== 1) e += 2; return { n, phi, e, d: modinv(e, phi) }; }

// ---------------- 4. State ----------------
const DEF = { mode: "packets", npk: 8, cong: 0.6, loss: 0, circuit: false, msg: "MEET AT THE LIBRARY AT NOON", shift: 3, key: "LEMON", cipher: "caesar", p: 61, q: 53, e: 17, m: 65, speed: 1 };
const P = Object.assign({}, DEF);
let packets = [], recv = [], tt = 0, rand = K.rng(Date.now() % 1e6), handshake = 0, sent = 0, retrans = 0, circuitPath = null;
function sendMessage() {
  packets = []; recv = []; tt = 0; handshake = 0; sent = 0; retrans = 0; const words = P.msg.match(/.{1,4}/g) || [""]; const n = Math.min(P.npk, words.length);
  circuitPath = P.circuit ? route(rand, P.cong, false) : null;
  for (let i = 0; i < words.length; i++) packets.push(newPacket(i, words[i], 1.2 + i * 0.35));
}
function newPacket(seq, data, t0) { const R = circuitPath ? { path: circuitPath.path, cost: circuitPath.cost } : route(rand, P.cong, false); const hops = []; let t = t0; for (let k = 0; k < R.path.length - 1; k++) { const d = R.cost[R.path[k] + R.path[k + 1]]; hops.push([R.path[k], R.path[k + 1], t, t + d * 0.25]); t += d * 0.25; } const lostAt = hops.findIndex(() => rand() < P.loss); sent++; return { seq, data, hops, arrive: lostAt >= 0 ? Infinity : t, lostAt, lostT: lostAt >= 0 ? hops[lostAt][2] + (hops[lostAt][3] - hops[lostAt][2]) / 2 : null, done: false }; }

// ---------------- 5. The page ----------------
const ui = K.app({
  title: "Networks and Encryption", subject: "Computer Science",
  blurb: "Watch packets take different routes, arrive out of order and get re-sent; then crack a Caesar cipher by frequency analysis and run toy RSA with a digital signature",
  reset: () => sendMessage(),
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topics 2 and 6: networks, packets and routers, IP addresses; security, and the purpose of encryption (plaintext, ciphertext, keys), with simple ciphers such as Caesar and Vigenère as examples.",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topics 14 and 17: the TCP/IP protocol suite, circuit switching and packet switching, the role of routers; symmetric and asymmetric encryption, public and private keys, digital signatures and certificates. The RSA arithmetic is beyond the syllabus but shows how a key pair works." } },
  missions: [
    { title: "Packets take different routes", q: "Send the message. Do all packets follow the same route? In what order do they arrive? How does the receiver put them back together?", hint: "Each packet is routed separately using the current delays, so routes differ and packets can overtake each other. The sequence number in each header lets the receiver reassemble the message in the right order.", setup: () => set({ mode: "packets", cong: 0.8 }) },
    { title: "Lost packets", q: "Set a 10% chance of loss on each link. What happens to the message? How does TCP make sure it all arrives?", hint: "Some packets vanish (red ✕). The receiver does not acknowledge them, so after a timeout the sender re-sends them. The message arrives complete, just later: TCP gives reliable delivery over an unreliable network.", setup: () => set({ mode: "packets", loss: 0.1 }) },
    { lvl: "adv", title: "Circuit switching", q: "Switch to circuit switching. What is different? When is circuit switching better, and when packet switching?", hint: "One path is reserved for the whole message, so packets arrive in order with a steady delay (good for live calls). But the path is tied up even when idle and one broken link stops everything; packet switching shares links and routes round failures.", setup: () => set({ mode: "packets", circuit: true, cong: 0.8 }) },
    { title: "Caesar cipher", q: "Encrypt the message with a shift of 3. How many different keys are there? How long would it take to try them all?", hint: "Only 25 useful keys, so a computer (or a patient person) can try them all at once: brute force.", setup: () => set({ mode: "cipher", cipher: "caesar", shift: 3 }) },
    { title: "Frequency analysis", q: "Look at the letter-frequency chart of a long Caesar-encrypted text. Which ciphertext letter is most common? What was the shift?", hint: "E is the most common English letter, so the tallest ciphertext bar is probably E shifted by the key. The 'crack' reading tries all 26 shifts and picks the best match to English.", setup: () => set({ mode: "cipher", cipher: "caesar", shift: 7, msg: "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG WHILE THE WEATHER IS VERY PLEASANT AND THE STUDENTS ARE REVISING FOR THEIR EXAMINATIONS IN THE LIBRARY" }) },
    { title: "Vigenère", q: "Encrypt with Vigenère and the key LEMON. Is the frequency chart still as revealing? Why?", hint: "Much flatter: each letter is shifted by a different amount depending on its position, so the same plaintext letter becomes different ciphertext letters. Longer keys hide the pattern better.", setup: () => set({ mode: "cipher", cipher: "vigenere", key: "LEMON", msg: "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG WHILE THE WEATHER IS VERY PLEASANT AND THE STUDENTS ARE REVISING FOR THEIR EXAMINATIONS IN THE LIBRARY" }) },
    { lvl: "adv", title: "Public and private keys (toy RSA)", q: "p = 61, q = 53, e = 17. Find n and d. Encrypt m = 65 with the public key and decrypt with the private key.", hint: "n = 3233, φ = 3120, d = 2753 (17 × 2753 = 46 801 = 15 × 3120 + 1). c = 65¹⁷ mod 3233 = 2790 and 2790²⁷⁵³ mod 3233 = 65. Anyone can encrypt with (e, n); only the holder of d can decrypt. Real keys use primes hundreds of digits long.", setup: () => set({ mode: "rsa" }) },
    { lvl: "adv", title: "A digital signature", q: "In the signature panel, the sender 'encrypts' the message hash with their PRIVATE key. How does anyone check it came from them?", hint: "Decrypting the signature with the sender's PUBLIC key gives back the hash. If it matches the hash of the message received, it was signed by the private key's owner and has not been changed. A certificate from a trusted authority vouches that the public key really is theirs.", setup: () => set({ mode: "rsa" }) },
  ],
  batch: [
    { title: "Re-sending lost packets", question: "If each of 4 links loses a packet with probability p, how many times must a packet be sent on average to get through?", how: "Each point: 300 packets; the mean number of transmissions until one arrives.", xLabel: "loss per link p", yLabel: "mean transmissions", xs: [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3], reps: 4, yMin: 0, theory: p => 1 / Math.pow(1 - p, 4), theoryLabel: "1/(1 − p)⁴", run: (p, r) => { let s = 0; for (let i = 0; i < 300; i++) { let k = 1; while ([0, 1, 2, 3].some(() => r() < p)) k++; s += k; } return s / 300; }, note: "A packet must survive every hop: probability (1 − p)⁴. Small losses per link add up over many hops." },
    { title: "Out-of-order arrival", question: "10 packets sent 0.35 s apart. How many arrive before a packet that was sent earlier, as congestion varies?", how: "Each point: 100 messages; the mean number of packets that overtake (arrive before an earlier one).", xLabel: "congestion variability", yLabel: "packets out of order", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 4, yMin: 0, run: (c, r) => { let s = 0; for (let m = 0; m < 100; m++) { const t = []; for (let i = 0; i < 10; i++) t.push(1.2 + i * 0.35 + route(r, c, false).time * 0.25); let k = 0; for (let i = 1; i < 10; i++) if (t.slice(0, i).some(x => x > t[i])) k++; s += k; } return s / 100; }, note: "With steady delays (no congestion) every packet takes the same route and order is kept. Varying delays make packets overtake, which is why TCP numbers them." },
    { title: "Brute-forcing a Caesar cipher", question: "Trying shifts 1, 2, 3, … in order, how many tries to find a random key?", how: "Each run: a random key from 1 to 25.", yLabel: "tries", reps: 500, bins: 25, lo: 0.5, hi: 25.5, theory: 13, theoryLabel: "(1 + 25)/2", run: (x, r) => 1 + r.int(25), note: "On average half the keys. A real cipher needs so many keys (2¹²⁸ for AES) that trying half of them is impossible." },
    { title: "How much text does frequency analysis need?", question: "A random Caesar-encrypted text of n letters (with English letter frequencies). How often does frequency analysis find the right shift?", how: "Each point: 100 texts; the fraction cracked correctly.", xLabel: "text length n (letters)", yLabel: "fraction cracked", xs: [5, 10, 20, 40, 80, 160], reps: 3, yMin: 0, yMax: 1, run: (n, r) => { let k = 0; for (let i = 0; i < 100; i++) { const key = 1 + r.int(25), ct = caesar(randomEnglish(r, n), key); if (crack(ct) === key) k++; } return k / 100; }, note: "A sentence or two is enough: the longer the text, the more its letter frequencies look like English. Caesar offers no real security." },
    { title: "Does RSA always decrypt? (A level)", question: "With random small primes and random messages m < n, does (mᵉ)ᵈ mod n always give back m?", how: "Each run: 20 random key pairs and messages; fraction that decrypt correctly.", yLabel: "fraction correct", reps: 100, bins: 5, lo: 0.5, hi: 1.05, theory: 1, theoryLabel: "always", run: (x, r) => { let k = 0; for (let i = 0; i < 20; i++) { let p = PRIMES[r.int(PRIMES.length)], q; do { q = PRIMES[r.int(PRIMES.length)]; } while (q === p); const K2 = rsaKeys(p, q, 3 + 2 * r.int(5)), m = r.int(K2.n); if (modpow(modpow(m, K2.e, K2.n), K2.d, K2.n) === m) k++; } return k / 20; }, note: "Always, because ed ≡ 1 (mod φ(n)) (Euler's theorem). Its security comes from the difficulty of factorising n into p and q when they are huge." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "2.1", text: "Data is sent in packets with a header (source and destination IP address, sequence number, …) and a payload. Routers forward each packet towards its destination." },
      { lvl: "adv", tag: "14.2", text: "Packet switching: packets routed independently, may take different routes and arrive out of order; reassembled using sequence numbers; links are shared. Circuit switching: a dedicated path is set up for the whole communication; data arrives in order; the path is reserved even when idle." },
      { lvl: "adv", tag: "14.1", text: "TCP/IP stack: application, transport (TCP: connection, sequencing, acknowledgements, retransmission), internet (IP: addressing and routing), link layers. TCP's three-way handshake: SYN, SYN-ACK, ACK." },
      { lvl: "std", tag: "6", text: "Encryption scrambles plaintext into ciphertext with a key so intercepted data cannot be understood. It does not stop interception." },
      { lvl: "adv", tag: "17.1", text: "Symmetric: the same secret key encrypts and decrypts (fast, but the key must be shared safely). Asymmetric: public key encrypts, private key decrypts (no secret to share; slower). Often asymmetric is used to exchange a symmetric session key (TLS)." },
      { lvl: "adv", tag: "17.1", text: "Digital signature: hash the message and encrypt the hash with the sender's private key. The receiver decrypts it with the sender's public key and compares hashes: proves who sent it and that it was not altered. A digital certificate (from a certificate authority) binds a public key to its owner." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Encrypt '${P.msg.slice(0, 12)}' with a Caesar shift of ${P.shift}.`, ans: () => `<ul><li>${caesar(P.msg.slice(0, 12), P.shift)}</li></ul>` },
      { lvl: "std", marks: 2, q: "Explain why a Caesar cipher is not secure.", ans: "<ul><li>only 25 possible keys, so all can be tried (brute force)</li><li>letter frequencies are kept, so frequency analysis reveals the shift</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how packet switching works and why packets may arrive out of order.", ans: "<ul><li>the message is split into packets, each with a header including the destination address and a sequence number</li><li>each router sends each packet on by the best route available at that moment</li><li>so packets may take different routes with different delays and arrive out of order</li><li>the receiver reorders them using the sequence numbers (and requests missing ones)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Describe how a digital signature shows that a message came from a particular sender and has not been altered.", ans: "<ul><li>the sender hashes the message and encrypts the hash with their private key (the signature)</li><li>the receiver decrypts the signature with the sender's public key and hashes the received message</li><li>if the two hashes match, only the sender's private key could have made it, and the message is unchanged</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Packets:</b> the message is split into 4-character packets. Each packet gets its own route: Dijkstra's shortest path using link delays that vary randomly (congestion), chosen when the packet is sent. Each link can lose a packet with the chosen probability; lost packets are re-sent after a timeout. With circuit switching one route is chosen for all packets.</li><li><b>Ciphers:</b> Caesar and Vigenère on letters A–Z (other characters unchanged). The crack reading tries every shift and keeps the one whose letter frequencies best match English (chi-squared).</li><li><b>RSA:</b> real RSA arithmetic with small primes (BigInt for the powers). The 'hash' for the signature is a simple sum of character codes mod n.</li></ul>
<h3>Simplifications</h3><ul><li>Real routers use routing tables updated by protocols, not a fresh Dijkstra for each packet; real timeouts adapt.</li><li>The toy hash is NOT secure; real signatures use a cryptographic hash (SHA-256) and keys of 2048+ bits.</li></ul>`,
});

// ---------------- 6. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "packets", options: [["packets", "packet switching"], ["cipher", "ciphers"], ["rsa", "public keys: RSA (A level)"]], on: v => set({ mode: v }) });
const gp = ui.group("Network"), gc = ui.group("Cipher"), gr = ui.group("RSA");
C.cong = K.slider(gp, { label: "Congestion (how much delays vary)", min: 0, max: 1, step: 0.1, value: 0.6, on: v => P.cong = v });
C.loss = K.slider(gp, { label: "Chance a link loses a packet", min: 0, max: 0.3, step: 0.01, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => P.loss = v });
C.circuit = K.toggle(gp, { label: "Circuit switching (one reserved path) (A level)", value: false, on: v => P.circuit = v });
let rw = K.row(gp); K.btn(rw, "📨 Send the message", () => sendMessage(), "primary");
C.msgBox = K.$("textarea"); C.msgBox.style.cssText = "width:100%;height:64px;font:13px Consolas,monospace;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px;margin:6px 0"; C.msgBox.value = P.msg; C.msgBox.addEventListener("input", () => P.msg = C.msgBox.value.toUpperCase()); ui.controls.insertBefore(C.msgBox, gp);
C.cipher = K.seg(gc, { value: "caesar", options: [["caesar", "Caesar"], ["vigenere", "Vigenère"]], on: v => P.cipher = v });
C.shift = K.slider(gc, { label: "Caesar shift (key)", min: 1, max: 25, step: 1, value: 3, on: v => P.shift = v });
C.keyBox = K.$("input"); C.keyBox.value = P.key; C.keyBox.style.cssText = "width:100%;font:14px Consolas,monospace;padding:6px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px"; K.note(gc, "Vigenère keyword:"); gc.append(C.keyBox); C.keyBox.addEventListener("input", () => P.key = C.keyBox.value);
C.p = K.seg(gr, { label: "Prime p", value: 61, options: [11, 17, 23, 37, 53, 61].map(v => [v, String(v)]), on: v => P.p = v });
C.q = K.seg(gr, { label: "Prime q", value: 53, options: [13, 19, 29, 41, 53, 59].map(v => [v, String(v)]), on: v => P.q = v });
C.e = K.slider(gr, { label: "Public exponent e", min: 3, max: 65, step: 2, value: 17, on: v => P.e = v });
C.m = K.slider(gr, { label: "Message m (a number < n)", min: 2, max: 140, step: 1, value: 65, on: v => P.m = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gp.style.display = P.mode === "packets" ? "" : "none"; C.msgBox.style.display = P.mode === "rsa" ? "none" : ""; gc.style.display = P.mode === "cipher" ? "" : "none"; gr.style.display = P.mode === "rsa" ? "" : "none"; C.circuit.el.style.display = ui.level === "adv" ? "" : "none"; C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if ((P.mode === "rsa" || P.circuit) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["mode", "cong", "loss", "circuit", "cipher", "shift", "p", "q", "e", "m"]) C[k].set(P[k]); C.msgBox.value = P.msg; C.keyBox.value = P.key; showCtl(); sendMessage(); }

// ---------------- 7. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function wrap(c, text, x, y, maxW, lh, col, font) { c.font = font + " Consolas,monospace"; let line = ""; for (const ch of text) { if (c.measureText(line + ch).width > maxW) { TX(c, line, x, y, col, "left", font + " Consolas,monospace,"); y += lh; line = ""; } line += ch; } TX(c, line, x, y, col, "left", font + " Consolas,monospace,"); return y + lh; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "packets") {
    tt += dt * P.speed; const H = h - 120, NX = k => NODES[k][0] * w, NY = k => 30 + NODES[k][1] * H;
    for (const [a, b] of LINKS) { const used = circuitPath && circuitPath.path.some((v, i) => i && ((circuitPath.path[i - 1] === a && v === b) || (circuitPath.path[i - 1] === b && v === a))); c.strokeStyle = used ? "#7ee787" : "#3a4a6e"; c.lineWidth = used ? 4 : 2; c.beginPath(); c.moveTo(NX(a), NY(a)); c.lineTo(NX(b), NY(b)); c.stroke(); c.lineWidth = 1; }
    for (const k in NODES) { const end = k === "S" || k === "D"; c.fillStyle = end ? "#1f3d6b" : "#121b30"; c.beginPath(); c.arc(NX(k), NY(k), end ? 26 : 20, 0, 6.3); c.fill(); c.strokeStyle = end ? "#5ad1ff" : "#8fa0bf"; c.lineWidth = 2; c.stroke(); c.lineWidth = 1; TX(c, k === "S" ? "sender" : k === "D" ? "receiver" : k, NX(k), NY(k) + 4, "#fff", "center", end ? "600 11px" : "600 12px"); }
    // TCP handshake first (A level detail shown as text)
    const hs = Math.min(1.2, tt); TX(c, tt < 0.4 ? "TCP: SYN →" : tt < 0.8 ? "TCP: ← SYN-ACK" : tt < 1.2 ? "TCP: ACK → (connection open)" : "", NX("S"), NY("S") - 40, "#c4a1ff", "left", "600 12px");
    // packets in flight
    for (const pk of packets) {
      if (pk.lostAt >= 0 && tt >= pk.lostT) { if (!pk.resent && tt > pk.lostT + 2) { pk.resent = true; retrans++; const np = newPacket(pk.seq, pk.data, tt); packets.push(np); } const [a, b] = pk.hops[pk.lostAt]; if (tt < pk.lostT + 2) { const x = (NX(a) + NX(b)) / 2, y = (NY(a) + NY(b)) / 2; TX(c, "✕", x, y + 6, "#ff6b81", "center", "600 20px"); TX(c, "lost: resend after timeout", x, y + 22, "#ff9aa9", "center", "10px"); } continue; }
      if (tt >= pk.arrive) { if (!pk.done) { pk.done = true; recv.push(pk); } continue; }
      const hp = pk.hops.find(q => tt >= q[2] && tt < q[3]); if (!hp) continue; const f = (tt - hp[2]) / (hp[3] - hp[2]), x = NX(hp[0]) + (NX(hp[1]) - NX(hp[0])) * f, y = NY(hp[0]) + (NY(hp[1]) - NY(hp[0])) * f;
      c.fillStyle = `hsl(${pk.seq * 47 % 360},70%,62%)`; c.fillRect(x - 15, y - 10, 30, 20); TX(c, "#" + pk.seq, x, y + 4, "#000", "center", "600 11px");
    }
    // the receiver's buffer: packets in arrival order, then reassembled
    const byArr = recv.slice(), y0 = h - 78; TX(c, "arrived (in arrival order):", 20, y0, "#c9d4ea", "left", "12px"); byArr.forEach((pk, i) => { const x = 200 + i * 52; c.fillStyle = `hsl(${pk.seq * 47 % 360},70%,62%)`; c.fillRect(x, y0 - 14, 46, 20); TX(c, "#" + pk.seq, x + 23, y0, "#000", "center", "600 11px"); });
    const total = new Set(packets.map(p => p.seq)).size, have = new Set(recv.map(p => p.seq)); let msg = ""; for (let s = 0; s < total; s++) msg += have.has(s) ? packets.find(p => p.seq === s).data : "▯▯▯▯";
    TX(c, "reassembled by sequence number: " + msg, 20, y0 + 34, have.size === total ? "#7ee787" : "#ffd166", "left", "600 13px Consolas,monospace,");
    ui.hud(`${have.size} of ${total} packets received · ${retrans} re-sent<br>${P.circuit ? "circuit switching: one reserved path" : "packet switching: each packet routed separately"}`);
  } else if (P.mode === "cipher") {
    const pt = P.msg.toUpperCase(), ct = P.cipher === "caesar" ? caesar(pt, P.shift) : vigenere(pt, P.key);
    TX(c, "PLAINTEXT", 20, 34, "#7ee787", "left", "600 13px"); let y = wrap(c, pt, 20, 58, w - 60, 22, "#dfe8f7", "16px");
    TX(c, P.cipher === "caesar" ? `CIPHERTEXT (Caesar, shift ${P.shift})` : `CIPHERTEXT (Vigenère, key ${P.key.toUpperCase()})`, 20, y + 16, "#ff9aa9", "left", "600 13px"); y = wrap(c, ct, 20, y + 40, w - 60, 22, "#ffd9a0", "16px");
    // the substitution alphabet (Caesar) or the key repeated under the text (Vigenère)
    const cw = Math.min(30, (w - 60) / 26), ya = Math.max(y + 30, h - 120);
    TX(c, P.cipher === "caesar" ? "the substitution:" : "the shift for each letter comes from the key letter above it:", 20, ya - 12, "#8fa0bf", "left", "12px");
    if (P.cipher === "caesar") for (let i = 0; i < 26; i++) { TX(c, A[i], 20 + i * cw + cw / 2, ya + 14, "#7ee787", "center", "600 14px Consolas,monospace,"); TX(c, "↓", 20 + i * cw + cw / 2, ya + 32, "#5d6e93", "center", "12px"); TX(c, A[(i + P.shift) % 26], 20 + i * cw + cw / 2, ya + 52, "#ffd9a0", "center", "600 14px Consolas,monospace,"); }
    else { const key = P.key.toUpperCase().replace(/[^A-Z]/g, "") || "A", letters = pt.replace(/[^A-Z]/g, "").slice(0, 26); for (let i = 0; i < letters.length; i++) { TX(c, key[i % key.length], 20 + i * cw + cw / 2, ya + 14, "#c4a1ff", "center", "600 14px Consolas,monospace,"); TX(c, letters[i], 20 + i * cw + cw / 2, ya + 34, "#7ee787", "center", "600 14px Consolas,monospace,"); TX(c, vigenere(letters, key)[i], 20 + i * cw + cw / 2, ya + 54, "#ffd9a0", "center", "600 14px Consolas,monospace,"); } }
    ui.hud(P.cipher === "caesar" ? `frequency analysis guesses shift <b>${crack(ct)}</b> (true ${P.shift})` : "Vigenère: one plaintext letter → many ciphertext letters");
  } else {
    const Kk = rsaKeys(P.p, P.q, P.e), m = P.m % Kk.n, cph = modpow(m, Kk.e, Kk.n), back = modpow(cph, Kk.d, Kk.n), hash = [...P.msg].reduce((s, ch) => (s + ch.charCodeAt(0)) % Kk.n, 0), sig = modpow(hash, Kk.d, Kk.n), chk = modpow(sig, Kk.e, Kk.n);
    const L = [["1. choose two primes", `p = ${P.p}, q = ${P.q}`, "#c9d4ea"], ["2. n = p × q", `${Kk.n}`, "#c9d4ea"], ["3. φ = (p − 1)(q − 1)", `${Kk.phi}`, "#c9d4ea"], ["4. public key (e, n)", `(${Kk.e}, ${Kk.n})  gcd(e, φ) = 1`, "#5ad1ff"], ["5. private key d: e × d ≡ 1 (mod φ)", `d = ${Kk.d}  (check: ${Kk.e} × ${Kk.d} mod ${Kk.phi} = ${Kk.e * Kk.d % Kk.phi})`, "#ff9aa9"], ["ENCRYPT with the public key", `c = mᵉ mod n = ${m}^${Kk.e} mod ${Kk.n} = ${cph}`, "#5ad1ff"], ["DECRYPT with the private key", `m = cᵈ mod n = ${cph}^${Kk.d} mod ${Kk.n} = ${back}  ${back === m ? "✓" : "✗"}`, "#ff9aa9"]];
    TX(c, "TOY RSA (small primes so you can check it)", 20, 30, "#ffd166", "left", "600 14px"); L.forEach(([a, b, col], i) => { TX(c, a, 20, 64 + i * 34, "#8fa0bf", "left", "13px"); TX(c, b, 330, 64 + i * 34, col, "left", "600 15px Consolas,monospace,"); });
    const y = 64 + L.length * 34 + 20; TX(c, "DIGITAL SIGNATURE", 20, y, "#ffd166", "left", "600 14px");
    const S = [[`hash of "${P.msg.slice(0, 24)}${P.msg.length > 24 ? "…" : ""}"`, `${hash}  (toy hash: sum of codes mod n)`, "#c9d4ea"], ["sign: hashᵈ mod n (PRIVATE key)", `${sig}`, "#ff9aa9"], ["verify: signatureᵉ mod n (PUBLIC key)", `${chk}  ${chk === hash ? "= hash ✓ genuine and unaltered" : "≠ hash ✗"}`, "#5ad1ff"]];
    S.forEach(([a, b, col], i) => { TX(c, a, 20, y + 32 + i * 34, "#8fa0bf", "left", "13px"); TX(c, b, 330, y + 32 + i * 34, col, "left", "600 15px Consolas,monospace,"); });
    ui.hud(`public (${Kk.e}, ${Kk.n}) · private ${Kk.d}<br>${m} → ${cph} → ${back}`);
  }
}
function panels() {
  if (P.mode === "packets") {
    relabel(["Packets", "Received", "Re-sent", "Out of order"]); const arr = recv.map(p => p.seq); let ooo = 0; arr.forEach((s, i) => { if (arr.slice(0, i).some(x => x > s)) ooo++; });
    read.set("a", new Set(packets.map(p => p.seq)).size); read.set("b", recv.length); read.set("c", retrans); read.set("d", ooo);
    chA.opts.title = "Arrival time of each packet"; chA.opts.xLabel = "sequence number"; chA.opts.yLabel = "arrival time (s)"; chA.opts.xFmt = null; chA.draw([{ pts: recv.map(p => [p.seq, p.arrive]), type: "dots", r: 5, color: K.cssVar("--s1"), label: "arrived" }], { yMin: 0 });
    const L = []; for (let p = 0; p <= 0.3001; p += 0.01) L.push([p * 100, 1 / Math.pow(1 - p, 4)]); chB.opts.title = "Expected transmissions per packet over 4 hops"; chB.opts.xLabel = "loss per link (%)"; chB.opts.yLabel = "transmissions"; chB.draw([{ pts: L, color: K.cssVar("--s3") }], { vlines: [{ x: P.loss * 100 }], yMin: 0 });
  } else if (P.mode === "cipher") {
    const pt = P.msg.toUpperCase(), ct = P.cipher === "caesar" ? caesar(pt, P.shift) : vigenere(pt, P.key); relabel(["Letters", "Most common plaintext letter", "Most common ciphertext letter", "Frequency analysis guess"]);
    const fp = freqs(pt), fc = freqs(ct), mx = a => A[a.indexOf(Math.max(...a))]; read.set("a", pt.replace(/[^A-Z]/g, "").length); read.set("b", mx(fp)); read.set("c", mx(fc)); read.set("d", P.cipher === "caesar" ? "shift " + crack(ct) : "–");
    chA.opts.xFmt = chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 ? A[Math.round(v)] || "" : "";
    chA.opts.title = "Letter frequencies: plaintext (bars) and English (dots)"; chA.opts.xLabel = ""; chA.opts.yLabel = "%"; chA.draw([{ pts: fp.map((v, i) => [i, v]), type: "bars", w: 0.7, color: K.cssVar("--s2"), label: "plaintext" }, { pts: ENG.map((v, i) => [i, v]), type: "dots", r: 3, color: K.cssVar("--text"), label: "English" }], { xMin: -0.6, xMax: 25.6 });
    chB.opts.title = "Letter frequencies of the ciphertext"; chB.opts.xLabel = ""; chB.opts.yLabel = "%"; chB.draw([{ pts: fc.map((v, i) => [i, v]), type: "bars", w: 0.7, color: K.cssVar("--s3"), label: "ciphertext" }], { xMin: -0.6, xMax: 25.6 });
  } else {
    const Kk = rsaKeys(P.p, P.q, P.e); relabel(["n", "φ(n)", "e, d", "Messages that decrypt correctly"]); read.set("a", Kk.n); read.set("b", Kk.phi); read.set("c", `${Kk.e}, ${Kk.d}`); let ok = 0; for (let m = 0; m < Math.min(Kk.n, 200); m++) if (modpow(modpow(m, Kk.e, Kk.n), Kk.d, Kk.n) === m) ok++; read.set("d", `${ok} of ${Math.min(Kk.n, 200)}`);
    chA.opts.xFmt = chB.opts.xFmt = null; const pts = []; for (let m = 0; m < Math.min(Kk.n, 300); m++) pts.push([m, modpow(m, Kk.e, Kk.n)]); chA.opts.title = "Ciphertext for each message m: no visible pattern"; chA.opts.xLabel = "m"; chA.opts.yLabel = "c = mᵉ mod n"; chA.draw([{ pts, type: "dots", r: 1.8, color: K.cssVar("--s0") }], { yMin: 0 });
    const F = []; for (const bits of [8, 16, 24, 32, 40, 48, 56, 64]) F.push([bits, Math.pow(2, bits / 2)]); chB.opts.title = "Trial division to factorise n: about √n tries"; chB.opts.xLabel = "bits in n"; chB.opts.yLabel = "log₁₀ tries"; chB.draw([{ pts: F.map(([b, t]) => [b, Math.log10(t)]), color: K.cssVar("--s3"), label: "log₁₀ √n" }]);
  }
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && (P.mode === "rsa" || P.circuit)) set({ mode: P.mode === "rsa" ? "packets" : P.mode }); showCtl(); };
set({});
ui.tip("Press Send to split the message into packets. Each one finds its own route.", 7000);
