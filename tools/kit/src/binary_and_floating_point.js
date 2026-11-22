/* =====================================================================
   BINARY, TWO'S COMPLEMENT AND FLOATING POINT
   A byte is 8 bits. Unsigned, its place values are 128 64 32 16 8 4 2 1
   (0 to 255). In TWO'S COMPLEMENT the top bit is worth −128 instead, so
   the range is −128 to +127; to negate, flip every bit and add 1.
   Hexadecimal groups 4 bits into one digit 0–F; BCD stores each denary
   digit in its own 4 bits; ASCII gives each character a 7-bit code.
   Adding two numbers can OVERFLOW: the true answer does not fit in 8
   bits (in two's complement: two positives give a "negative", or two
   negatives a "positive").
   FLOATING POINT (A level) stores a number as  mantissa × 2^exponent,
   both in two's complement. The binary point sits just after the
   mantissa's sign bit, so a mantissa is between −1 and 1. A number is
   NORMALISED when the first two mantissa bits differ (0.1… or 1.0…):
   this uses every bit for precision. More mantissa bits = more
   PRECISION; more exponent bits = more RANGE. Most numbers (like 0.1)
   cannot be stored exactly, so there are ROUNDING ERRORS.
   ===================================================================== */
// ---------------- 1. Integer tools ----------------
const toBits = (v, n) => Array.from({ length: n }, (_, i) => (v >> (n - 1 - i)) & 1);
const fromBits = b => b.reduce((s, x) => s * 2 + x, 0);
const signed = (v, n) => v >= 2 ** (n - 1) ? v - 2 ** n : v;
const hex = v => v.toString(16).toUpperCase().padStart(2, "0");
const bcd = v => { const hi = v >> 4, lo = v & 15; return hi < 10 && lo < 10 ? `${hi}${lo}` : "not valid BCD"; };
function add8(a, b) { const s = a + b, carry = s > 255 ? 1 : 0, r = s & 255, sa = signed(a, 8), sb = signed(b, 8), sr = signed(r, 8), ov = (sa >= 0 && sb >= 0 && sr < 0) || (sa < 0 && sb < 0 && sr >= 0); const carries = []; let c = 0; for (let i = 0; i < 8; i++) { const x = ((a >> i) & 1) + ((b >> i) & 1) + c; c = x >> 1; carries[i] = c; } return { r, carry, ov, carries }; }
// ---------------- 2. Floating point: m-bit mantissa, e-bit exponent ----------------
function fpValue(mb, eb) { const m = signed(fromBits(mb), mb.length) / 2 ** (mb.length - 1), e = signed(fromBits(eb), eb.length); return { m, e, v: m * 2 ** e }; }
const isNormal = mb => mb[0] !== mb[1];
// encode x as the nearest normalised floating-point number (rounding the mantissa); reports overflow/underflow
function encode(x, M, E) {
  const emax = 2 ** (E - 1) - 1, emin = -(2 ** (E - 1)), scale = 2 ** (M - 1);
  if (x === 0) return { mb: Array(M).fill(0), eb: Array(E).fill(0), v: 0, status: "zero" };
  let e = Math.floor(Math.log2(Math.abs(x))) + 1;                 // so that |x| / 2^e is in [0.5, 1)
  if (x < 0 && Math.abs(x) === 2 ** (e - 1)) e -= 1;              // −0.5 × 2^e is not normalised; use −1 × 2^(e−1)
  let mi = Math.round(x / 2 ** e * scale); if (mi >= scale) { mi /= 2; e++; } if (mi < -scale) { mi /= 2; e++; }
  if (e > emax) return { status: "overflow", v: NaN }; if (e < emin) return { status: "underflow (too small: stored as 0)", v: 0, mb: Array(M).fill(0), eb: Array(E).fill(0) };
  mi = Math.max(-scale, Math.min(scale - 1, mi)); const mb = toBits((mi + 2 * scale) % (2 * scale), M), eb = toBits((e + 2 ** E) % 2 ** E, E);
  return { mb, eb, v: mi / scale * 2 ** e, status: "ok" };
}
const largest = (M, E) => (1 - 2 ** -(M - 1)) * 2 ** (2 ** (E - 1) - 1), smallestPos = (M, E) => 0.5 * 2 ** -(2 ** (E - 1));

// ---------------- 3. State ----------------
const DEF = { mode: "int", a: 0b01101001, b: 0b00110111, M: 8, E: 4, x: 0.1, addN: 10 };
const P = Object.assign({}, DEF);
let fp = { mb: [0, 1, 0, 1, 1, 0, 0, 0], eb: [0, 0, 1, 1] };

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Binary and Floating Point", subject: "Computer Science",
  blurb: "Click the bits: unsigned and two's complement, hex, BCD and ASCII, binary addition with carries and overflow, and normalised floating point with its precision, range and rounding errors",
  reset: () => set({ mode: P.mode }),
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 1.1: binary, denary, hexadecimal and BCD; one's and two's complement; binary addition and subtraction and overflow; binary prefixes; ASCII and Unicode character sets.",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 13.3: floating-point representation with a two's complement mantissa and exponent, normalisation, the trade-off between range and precision, conversion between denary and floating point, rounding errors, and overflow and underflow." } },
  missions: [
    { title: "Place values", q: "Click bits to make 77. Now make −77 in two's complement. What do you notice about the two bit patterns?", hint: "77 = 01001101 (64 + 8 + 4 + 1). −77 = 10110011: flip every bit of 77 (10110010) and add 1. In two's complement the top bit is worth −128: −128 + 32 + 16 + 2 + 1 = −77.", setup: () => set({ mode: "int", a: 77 }) },
    { title: "Hexadecimal", q: "Set the byte to 11010110. Split it into two groups of 4 bits. What is it in hex? Why do programmers like hex?", hint: "1101 = D, 0110 = 6, so D6 (= 214). Each hex digit is exactly 4 bits, so hex is a short, error-resistant way to write binary (colours, memory addresses, MAC addresses).", setup: () => set({ mode: "int", a: 0b11010110 }) },
    { title: "Adding and carrying", q: "Add 01101001 (105) and 00110111 (55). Follow the carries column by column.", hint: "105 + 55 = 160 = 10100000. As unsigned numbers that is fine. But in two's complement 10100000 = −96: two positives gave a negative, so the OVERFLOW flag is set (160 > 127).", setup: () => set({ mode: "add", a: 105, b: 55 }) },
    { title: "Subtracting by adding", q: "Work out 50 − 20 by adding 50 and −20 (two's complement). What happens to the carry out of the top bit?", hint: "00110010 + 11101100 = 1 00011110: ignore the carry out; the 8-bit answer 00011110 = 30 is correct, and there is no overflow (the signs were different).", setup: () => set({ mode: "add", a: 50, b: 256 - 20 }) },
    { title: "Characters", q: "Make 01000001. Which character is it in ASCII? Add 32 (00100000). What happens?", hint: "65 = 'A'. Adding 32 gives 97 = 'a': upper and lower case letters differ in a single bit, so case conversion is one OR or AND with a mask.", setup: () => set({ mode: "int", a: 65 }) },
    { lvl: "adv", title: "Reading a floating-point number", q: "Mantissa 0.1011000, exponent 0011. What denary number is it? Is it normalised?", hint: "Mantissa 0.1011 = 0.5 + 0.125 + 0.0625 = 0.6875; exponent 3; value 0.6875 × 2³ = 5.5. It is normalised: it starts 0.1.", setup: () => set({ mode: "float", M: 8, E: 4, x: 5.5 }) },
    { lvl: "adv", title: "0.1 cannot be stored exactly", q: "Store 0.1 with an 8-bit mantissa. How big is the error? Add 0.1 ten times: is the answer 1?", hint: "0.1 = 0.0001100110011… in binary, a recurring fraction, so it must be rounded: stored as about 0.1001 or 0.0996. Errors build up over many additions. The same happens (much more finely) with 64-bit doubles: 0.1 + 0.2 ≠ 0.3.", setup: () => set({ mode: "float", M: 8, E: 4, x: 0.1 }) },
    { lvl: "adv", title: "Range against precision", q: "Keep 12 bits in total. Compare an 8-bit mantissa + 4-bit exponent with 6 + 6. Which can store bigger numbers? Which stores 3.14159 more accurately?", hint: "6 + 6: largest about 0.97 × 2³¹ (≈ 2 × 10⁹), but only 5 bits of precision. 8 + 4: largest 0.99 × 2⁷ = 127, but 7 bits of precision. More exponent bits = range; more mantissa bits = precision.", setup: () => set({ mode: "float", M: 8, E: 4, x: 3.14159 }) },
  ],
  batch: [
    { title: "How often does 8-bit addition overflow?", question: "Add two random 8-bit two's complement numbers (−128 to 127). How often does the result overflow?", how: "Each run: 200 random additions; the fraction with overflow.", yLabel: "fraction overflowing", reps: 300, bins: 20, theory: (() => { let k = 0; for (let a = 0; a < 256; a++) for (let b = 0; b < 256; b++) if (add8(a, b).ov) k++; return k / 65536; })(), theoryLabel: "exact count: 16 384/65 536 = ¼", run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) if (add8(r.int(256), r.int(256)).ov) k++; return k / 200; }, note: "A quarter of all pairs overflow: half the pairs have the same sign, and half of those add to more than 127 or less than −128. Programs must check the overflow flag." },
    { title: "Precision and mantissa bits (A level)", question: "Random numbers between 1 and 100 are stored with an m-bit mantissa (and enough exponent). What is the average relative rounding error?", how: "Each point: 500 random numbers; mean |stored − true| ÷ true.", xLabel: "mantissa bits m", yLabel: "log₂ (mean relative error)", xs: [4, 6, 8, 10, 12, 16, 20], reps: 4, theory: m => Math.log2(0.35 * 2 ** -(m - 1)), theoryLabel: "≈ log₂(0.35 × 2^−(m−1))", run: (m, r) => { let s = 0; for (let i = 0; i < 500; i++) { const x = 1 + 99 * r(), q = encode(x, m, 8); s += Math.abs(q.v - x) / x; } return Math.log2(s / 500); }, note: "Each extra mantissa bit halves the rounding error (a straight line with gradient −1 on this log₂ scale). 64-bit doubles have a 53-bit mantissa: errors around 10⁻¹⁶." },
    { title: "Range and exponent bits (A level)", question: "With an 8-bit mantissa, what is the largest number that can be stored, for each exponent size?", how: "Exact: (1 − 2^−7) × 2^(2^(e−1) − 1).", xLabel: "exponent bits e", yLabel: "log₂ (largest number)", xs: [2, 3, 4, 5, 6, 7, 8], reps: 1, theory: e => 2 ** (e - 1) - 1, theoryLabel: "≈ 2^(e−1) − 1", run: e => Math.log2(largest(8, e)), note: "Each extra exponent bit DOUBLES the power of 2 available: the range grows enormously (from about 2 to about 10³⁸), but the precision does not change." },
    { title: "Adding 0.1 again and again (A level)", question: "Add the stored value of 0.1 to a running total n times, rounding to an 8-bit mantissa after every addition. How far is the total from n × 0.1?", how: "Exact for each n (8-bit mantissa, 6-bit exponent).", xLabel: "additions n", yLabel: "total − n × 0.1", xs: [1, 5, 10, 20, 40, 60, 80, 100], reps: 1, theory: () => 0, theoryLabel: "exact arithmetic", run: n => { let t = 0; const d = encode(0.1, 8, 6).v; for (let i = 0; i < n; i++) t = encode(t + d, 8, 6).v; return t - n * 0.1; }, note: "Rounding errors pile up, and once the total is large each 0.1 is rounded more coarsely (the spacing of floats grows with their size). Never test floats for exact equality." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1.1", text: "Denary ↔ binary by place values or repeated division by 2. Hex: each digit = 4 bits (A = 10 … F = 15). BCD: each denary digit in its own 4-bit nibble (1001 is the largest valid nibble)." },
      { lvl: "std", tag: "1.1", text: "Two's complement: top bit −128 (8 bits), range −128 to +127. To negate: flip all bits and add 1. One's complement just flips the bits." },
      { lvl: "std", tag: "1.1", text: "Binary addition: 1 + 1 = 0 carry 1; 1 + 1 + 1 = 1 carry 1. Overflow: the result needs more bits than are available (two positives giving a negative, or two negatives giving a positive)." },
      { lvl: "std", tag: "1.1", text: "Binary prefixes: kibi (Ki) = 2¹⁰ = 1024, mebi (Mi) = 2²⁰, gibi (Gi) = 2³⁰; decimal prefixes kilo = 1000 etc. ASCII: 7 bits (128 characters); Unicode: many more characters (up to 32 bits)." },
      { lvl: "adv", tag: "13.3", text: "Floating point: value = mantissa × 2^exponent, both two's complement; the binary point follows the mantissa's sign bit. Normalised: the first two mantissa bits differ (0.1… positive, 1.0… negative)." },
      { lvl: "adv", tag: "13.3", text: "More mantissa bits → more precision; more exponent bits → more range. Overflow: exponent too large; underflow: too close to 0. Many denary fractions (0.1) recur in binary, giving rounding errors." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Convert ${signed(P.a, 8)} to 8-bit two's complement, and give the hexadecimal of the bit pattern.`, ans: () => `<ul><li>${toBits(P.a, 8).join("")}</li><li>hex ${hex(P.a)}</li></ul>` },
      { lvl: "std", marks: 3, q: "Add the 8-bit two's complement numbers 01101001 and 00110111. State the result and explain whether overflow has occurred.", ans: "<ul><li>10100000</li><li>two positive numbers have given a negative result (−96)</li><li>so overflow has occurred: 105 + 55 = 160 is more than 127</li></ul>" },
      { lvl: "adv", marks: 3, q: "A floating-point number has an 8-bit mantissa 0.1011000 and a 4-bit exponent 0011 (both two's complement). Find its denary value and state whether it is normalised.", ans: "<ul><li>mantissa = 0.5 + 0.125 + 0.0625 = 0.6875</li><li>exponent = 3, value = 0.6875 × 8 = 5.5</li><li>normalised: first two bits differ (0.1)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Represent ${P.x} as a normalised floating-point number with a ${P.M}-bit mantissa and ${P.E}-bit exponent.`, ans: () => { const q = encode(P.x, P.M, P.E); return q.status !== "ok" ? `<ul><li>${q.status}</li></ul>` : `<ul><li>mantissa ${q.mb[0]}.${q.mb.slice(1).join("")}</li><li>exponent ${q.eb.join("")} (${signed(fromBits(q.eb), P.E)})</li><li>stored value ${q.v} (error ${(q.v - P.x).toPrecision(3)})</li></ul>`; } },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Integers:</b> click any bit to flip it. The byte is read as unsigned, as two's complement, in hex, as BCD (if each nibble is 0–9) and as an ASCII character.</li><li><b>Addition:</b> the two bytes are added column by column; the carry row and the overflow and carry flags are shown.</li><li><b>Floating point (A level):</b> click mantissa and exponent bits, or type a number and see the nearest normalised representation, rounded to the nearest mantissa.</li></ul>
<h3>Simplifications</h3><ul><li>The floating-point format is the simple exam style (two's complement mantissa and exponent), not IEEE 754 (which uses a sign bit, a biased exponent and a hidden 1).</li><li>Rounding is to the nearest value; some exam questions truncate instead.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "int", options: [["int", "one byte"], ["add", "binary addition"], ["float", "floating point (A level)"]], on: v => set({ mode: v }) });
const gi = ui.group("Bytes"), gf = ui.group("Floating point");
C.a = K.slider(gi, { label: "Byte A (or click its bits)", min: 0, max: 255, step: 1, value: P.a, fmt: v => `${v} = ${toBits(v, 8).join("")}`, on: v => P.a = v });
C.b = K.slider(gi, { label: "Byte B", min: 0, max: 255, step: 1, value: P.b, fmt: v => `${v} = ${toBits(v, 8).join("")}`, on: v => P.b = v });
C.M = K.slider(gf, { label: "Mantissa bits", min: 4, max: 16, step: 1, value: 8, on: v => { P.M = v; encodeX(); } });
C.E = K.slider(gf, { label: "Exponent bits", min: 2, max: 8, step: 1, value: 4, on: v => { P.E = v; encodeX(); } });
C.xbox = K.$("input"); C.xbox.type = "text"; C.xbox.setAttribute("aria-label", "Number to store"); C.xbox.value = "0.1"; C.xbox.style.cssText = "width:100%;font:14px Consolas,monospace;padding:6px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;margin:4px 0";
const lab = K.note(gf, "Type a denary number to store:"); gf.append(C.xbox); C.xbox.addEventListener("change", () => { const v = parseFloat(C.xbox.value); if (isFinite(v)) { P.x = v; encodeX(); } });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function encodeX() { const q = encode(P.x, P.M, P.E); if (q.mb) fp = { mb: q.mb, eb: q.eb }; else fp = { mb: Array(P.M).fill(0), eb: Array(P.E).fill(0) }; fp.status = q.status; }
function showCtl() { gi.style.display = P.mode === "float" ? "none" : ""; C.b.el.style.display = P.mode === "add" ? "" : "none"; gf.style.display = P.mode === "float" ? "" : "none"; C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.mode === "float" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); C.mode.set(P.mode); C.a.set(P.a); C.b.set(P.b); C.M.set(P.M); C.E.set(P.E); C.xbox.value = String(P.x); encodeX(); showCtl(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let hits = [];
function bitRow(c, bits, x0, y, bw, tag, labels, col = "#5ad1ff") { bits.forEach((b, i) => { const x = x0 + i * bw; c.fillStyle = b ? col : "#121b30"; c.fillRect(x + 2, y, bw - 4, bw - 4); c.strokeStyle = "#3a4a6e"; c.strokeRect(x + 2, y, bw - 4, bw - 4); TX(c, b, x + bw / 2, y + bw / 2 + 6, b ? "#04121c" : "#c9d4ea", "center", "600 " + Math.round(bw * 0.42) + "px"); if (labels) TX(c, labels[i], x + bw / 2, y - 8, "#8fa0bf", "center", "12px"); hits.push({ x, y, w: bw, tag, i }); }); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); hits = [];
  if (P.mode === "int") {
    const bw = Math.min(80, (w - 80) / 8), x0 = (w - 8 * bw) / 2, y = 90, bits = toBits(P.a, 8);
    TX(c, "ONE BYTE: click a bit to flip it", 20, 28, "#ffd166", "left", "600 14px");
    bitRow(c, bits, x0, y, bw, "a", ["128", "64", "32", "16", "8", "4", "2", "1"]);
    TX(c, "two's complement place values:", x0, y + bw + 22, "#8fa0bf", "left", "11px"); ["−128", "64", "32", "16", "8", "4", "2", "1"].forEach((t, i) => TX(c, t, x0 + i * bw + bw / 2, y + bw + 40, i === 0 ? "#ff9aa9" : "#8fa0bf", "center", "12px"));
    const rows = [["unsigned denary", String(P.a)], ["two's complement", String(signed(P.a, 8))], ["hexadecimal", hex(P.a) + "  (" + bits.slice(0, 4).join("") + " = " + (P.a >> 4).toString(16).toUpperCase() + ", " + bits.slice(4).join("") + " = " + (P.a & 15).toString(16).toUpperCase() + ")"], ["BCD", bcd(P.a)], ["ASCII character", P.a >= 32 && P.a < 127 ? `'${String.fromCharCode(P.a)}'` : P.a < 32 ? "control code" : "not ASCII (> 127)"], ["one's complement (flip)", toBits(255 - P.a, 8).join("")], ["negated (two's complement)", toBits((256 - P.a) % 256, 8).join("") + ` = ${signed((256 - P.a) % 256, 8)}`]];
    rows.forEach(([k, v], i) => { TX(c, k, x0, y + bw + 84 + i * 30, "#8fa0bf", "left", "14px"); TX(c, v, x0 + 250, y + bw + 84 + i * 30, "#fff", "left", "600 16px"); });
    ui.hud(`${toBits(P.a, 8).join("")}<br>= ${P.a} unsigned = ${signed(P.a, 8)} signed`);
  } else if (P.mode === "add") {
    const bw = Math.min(64, (w - 200) / 9), x0 = (w - 9 * bw) / 2 + bw, r = add8(P.a, P.b), A = toBits(P.a, 8), B = toBits(P.b, 8), R = toBits(r.r, 8);
    TX(c, "BINARY ADDITION: click the bits of A and B", 20, 28, "#ffd166", "left", "600 14px");
    const cy = 80; for (let k = 0; k < 7; k++) if (r.carries[k]) TX(c, "1", x0 + (6 - k) * bw + bw / 2, cy, "#ffb454", "center", "600 13px");   // the carry out of bit k goes above bit k + 1
    if (r.carry) TX(c, "1", x0 - bw / 2 + bw * 0.3, cy, "#ff9aa9", "center", "600 13px"); TX(c, "carries", x0 - bw - 10, cy, "#ffb454", "right", "12px");
    bitRow(c, A, x0, cy + 14, bw, "a", null); TX(c, `A = ${P.a} (${signed(P.a, 8)})`, x0 + 8 * bw + 16, cy + 14 + bw / 2 + 5, "#c9d4ea", "left", "14px");
    bitRow(c, B, x0, cy + 20 + bw, bw, "b", null); TX(c, "+", x0 - 20, cy + 20 + bw + bw / 2 + 6, "#fff", "center", "600 22px"); TX(c, `B = ${P.b} (${signed(P.b, 8)})`, x0 + 8 * bw + 16, cy + 20 + bw + bw / 2 + 5, "#c9d4ea", "left", "14px");
    c.strokeStyle = "#8fa0bf"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - bw, cy + 26 + 2 * bw); c.lineTo(x0 + 8 * bw, cy + 26 + 2 * bw); c.stroke(); c.lineWidth = 1;
    bitRow(c, R, x0, cy + 34 + 2 * bw, bw, "r", null, r.ov ? "#ff7b9c" : "#7ee787"); if (r.carry) { c.fillStyle = "rgba(255,154,169,.25)"; c.fillRect(x0 - bw + 2, cy + 34 + 2 * bw, bw - 4, bw - 4); TX(c, "1", x0 - bw / 2, cy + 34 + 2 * bw + bw / 2 + 6, "#ff9aa9", "center", "600 20px"); }
    TX(c, `= ${r.r} (${signed(r.r, 8)})`, x0 + 8 * bw + 16, cy + 34 + 2 * bw + bw / 2 + 5, "#fff", "left", "600 15px");
    const yy = cy + 80 + 3 * bw; TX(c, `unsigned: ${P.a} + ${P.b} = ${P.a + P.b}${r.carry ? " → too big for 8 bits (carry out)" : ""}`, x0 - bw, yy, r.carry ? "#ff9aa9" : "#7ee787", "left", "600 15px");
    TX(c, `two's complement: ${signed(P.a, 8)} + ${signed(P.b, 8)} = ${signed(P.a, 8) + signed(P.b, 8)} → ${r.ov ? "OVERFLOW (outside −128 to 127)" : "fits: answer " + signed(r.r, 8)}`, x0 - bw, yy + 30, r.ov ? "#ff9aa9" : "#7ee787", "left", "600 15px");
    ui.hud(`carry flag ${r.carry} · overflow flag ${r.ov ? 1 : 0}`);
  } else {
    const M = P.M, E = P.E, bw = Math.min(48, (w - 120) / (M + E + 2)), x0 = 40, y = 90, f = fpValue(fp.mb, fp.eb);
    TX(c, "FLOATING POINT: click mantissa or exponent bits, or type a number", 20, 28, "#ffd166", "left", "600 14px");
    const ml = ["−1"].concat(Array.from({ length: M - 1 }, (_, i) => "½¼⅛"[i] || "2⁻" + (i + 1))), el = Array.from({ length: E }, (_, i) => i === 0 ? "−" + 2 ** (E - 1) : String(2 ** (E - 1 - i)));
    TX(c, "mantissa", x0, y - 28, "#5ad1ff", "left", "600 13px"); bitRow(c, fp.mb, x0, y, bw, "m", ml); c.fillStyle = "#fff"; c.beginPath(); c.arc(x0 + bw, y + bw - 6, 4, 0, 6.3); c.fill();
    const ex0 = x0 + (M + 1) * bw; TX(c, "exponent", ex0, y - 28, "#ffb454", "left", "600 13px"); bitRow(c, fp.eb, ex0, y, bw, "e", el, "#ffb454");
    const norm = isNormal(fp.mb), lines = [[`mantissa = ${fp.mb[0]}.${fp.mb.slice(1).join("")} = ${f.m}`, "#5ad1ff"], [`exponent = ${fp.eb.join("")} = ${f.e}`, "#ffb454"], [`value = ${f.m} × 2^${f.e} = ${K.sig(f.v, 8)}`, "#fff"], [norm ? "normalised ✓ (the first two mantissa bits differ)" : "NOT normalised: shift the mantissa left and reduce the exponent", norm ? "#7ee787" : "#ff9aa9"], [`you asked to store ${P.x}: ${fp.status === "ok" ? "error " + K.sig(f.v - P.x, 3) + " (" + K.sig(100 * Math.abs(f.v - P.x) / Math.abs(P.x || 1), 3) + "%)" : fp.status}`, fp.status === "ok" ? "#c9d4ea" : "#ff9aa9"]];
    lines.forEach(([t, col], i) => TX(c, t, x0, y + bw + 50 + i * 30, col, "left", "600 15px"));
    TX(c, `with ${M} + ${E} bits: largest ${K.sig(largest(M, E), 4)}, smallest positive normalised ${K.sig(smallestPos(M, E), 4)}, precision about ${K.sig(2 ** -(M - 1), 3)} of the value`, x0, h - 24, "#8fa0bf", "left", "13px");
    ui.hud(`${K.sig(f.v, 8)}${norm ? "" : "<br>not normalised"}`);
  }
}
K.pointer(cv.el, { down: p => { for (const b of hits) if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.w) { if (b.tag === "a" || b.tag === "b") { P[b.tag] ^= 1 << (7 - b.i); C[b.tag].set(P[b.tag]); } if (b.tag === "m") fp.mb[b.i] ^= 1; if (b.tag === "e") fp.eb[b.i] ^= 1; if (b.tag === "m" || b.tag === "e") { fp.status = "ok"; P.x = fpValue(fp.mb, fp.eb).v; C.xbox.value = String(P.x); } } }, hover: p => cv.el.style.cursor = hits.some(b => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.w) ? "pointer" : "default" });
function panels() {
  if (P.mode !== "float") {
    relabel(["Unsigned", "Two's complement", "Hex", P.mode === "add" ? "Flags" : "ASCII"]); read.set("a", P.a); read.set("b", signed(P.a, 8)); read.set("c", hex(P.a)); if (P.mode === "add") { const r = add8(P.a, P.b); read.set("d", `carry ${r.carry}, overflow ${r.ov ? 1 : 0}`); } else read.set("d", P.a >= 32 && P.a < 127 ? String.fromCharCode(P.a) : "–");
    const U = [], S = []; for (let v = 0; v < 256; v += 1) { U.push([v, v]); S.push([v, signed(v, 8)]); }
    chA.opts.title = "Bit pattern (as a number 0–255) and what it means"; chA.opts.xLabel = "bit pattern"; chA.opts.yLabel = "value"; chA.draw([{ pts: U, color: K.cssVar("--s0"), label: "unsigned" }, { pts: S, color: K.cssVar("--s3"), label: "two's complement" }], { vlines: [{ x: P.a }], hlines: [{ y: 0 }] });
    const bars = toBits(P.a, 8).map((b, i) => [i, b * (i === 0 ? -128 : 2 ** (7 - i))]); chB.opts.title = "Contribution of each bit (two's complement)"; chB.opts.xLabel = "bit (left to right)"; chB.opts.yLabel = "value"; chB.draw([{ pts: bars, type: "bars", w: 0.7, color: K.cssVar("--s1") }], { xMin: -0.6, xMax: 7.6, hlines: [{ y: 0 }] });
  } else {
    const f = fpValue(fp.mb, fp.eb); relabel(["Mantissa", "Exponent", "Value", "Normalised?"]); read.set("a", `${fp.mb[0]}.${fp.mb.slice(1).join("")} = ${f.m}`); read.set("b", `${fp.eb.join("")} = ${f.e}`); read.set("c", K.sig(f.v, 8)); read.set("d", isNormal(fp.mb) ? "yes" : "no");
    // every positive normalised value of this format, on a number line (log scale), to show the spacing
    const vals = []; const M = P.M, E = P.E; for (let e = -(2 ** (E - 1)); e <= 2 ** (E - 1) - 1; e++) for (let mi = 2 ** (M - 2); mi < 2 ** (M - 1); mi++) vals.push(mi / 2 ** (M - 1) * 2 ** e);
    const pts = vals.filter(v => v <= 4).map(v => [v, 0.5]); chA.opts.title = `Representable values from 0 to 4 (${pts.length} of them): gaps double each power of 2`; chA.opts.xLabel = "value"; chA.opts.yLabel = ""; chA.draw([{ pts, type: "dots", r: 2, color: K.cssVar("--s0") }], { xMin: 0, xMax: 4, yMin: 0, yMax: 1, vlines: f.v > 0 && f.v <= 4 ? [{ x: f.v, label: "yours" }] : [] });
    const Er = []; for (let x = 0.05; x <= 10; x += 0.05) { const q = encode(x, M, E); if (q.status === "ok") Er.push([x, 100 * Math.abs(q.v - x) / x]); } chB.opts.title = "Rounding error when storing numbers from 0 to 10"; chB.opts.xLabel = "number"; chB.opts.yLabel = "% error"; chB.draw([{ pts: Er, color: K.cssVar("--s3") }], { yMin: 0, vlines: [{ x: P.x }] });
  }
}
let frame = 0;
ui.run(() => { }, () => { draw(); if (frame++ % 8 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "float") set({}); showCtl(); };
set({});
ui.tip("Click any bit to flip it.", 6000);
