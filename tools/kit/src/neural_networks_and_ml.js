/* =====================================================================
   NEURAL NETWORKS AND MACHINE LEARNING
   SUPERVISED LEARNING: the computer is shown examples WITH the right
   answers (labelled data) and adjusts itself to reduce its errors.
   An artificial NEURON adds up its inputs × WEIGHTS, adds a BIAS, and
   passes the total through an ACTIVATION function:
       output = σ(w₁x + w₂y + b),   σ(z) = 1/(1 + e^(−z))  (0 to 1)
   One neuron can only draw a straight dividing line. A NETWORK with a
   HIDDEN LAYER of neurons can draw curved boundaries (it can solve XOR).
   TRAINING by gradient descent: for each example, measure the error,
   then BACK-PROPAGATE it: nudge every weight a little in the direction
   that reduces the error (the size of the nudge is the LEARNING RATE).
   One pass through all the training data is an EPOCH.
   Data is split into a TRAINING set and a TEST set: a network that is
   perfect on training data but poor on new data has OVERFITTED.
   ===================================================================== */
// ---------------- 1. Data sets (points in −1 … 1, label 0 or 1) ----------------
function makeData(kind, n, r, noise) {
  const out = []; const g = () => r.gauss() * noise;
  for (let i = 0; i < n; i++) {
    let x = 2 * r() - 1, y = 2 * r() - 1, c;
    if (kind === "line") c = +(y > 0.6 * x + 0.1);
    else if (kind === "xor") c = +((x > 0) !== (y > 0));
    else if (kind === "circle") c = +(x * x + y * y < 0.42);
    else { const t = r() * 3 * Math.PI, k = i % 2, rr = t / (3 * Math.PI) * 0.9 + 0.08; x = rr * Math.cos(t + k * Math.PI); y = rr * Math.sin(t + k * Math.PI); c = k; }
    out.push([x + g(), y + g(), c]);
  }
  return out;
}
// ---------------- 2. A small network: 2 inputs → H hidden (tanh) → 1 output (sigmoid). H = 0 means a single neuron. ----------------
const sig = z => 1 / (1 + Math.exp(-z));
function newNet(H, r) { const w = () => (r() * 2 - 1) * 1; return H === 0 ? { H, w: [w(), w()], b: 0 } : { H, W1: Array.from({ length: H }, () => [w(), w()]), b1: Array.from({ length: H }, () => 0), w2: Array.from({ length: H }, () => w()), b2: 0 }; }
function forward(N, x, y) { if (N.H === 0) return { o: sig(N.w[0] * x + N.w[1] * y + N.b) }; const h = N.W1.map((wv, j) => Math.tanh(wv[0] * x + wv[1] * y + N.b1[j])); let z = N.b2; for (let j = 0; j < N.H; j++) z += N.w2[j] * h[j]; return { o: sig(z), h }; }
// one step of gradient descent on one example (cross-entropy loss): back-propagation
function train1(N, x, y, t, lr) {
  const f = forward(N, x, y), d = f.o - t;                     // error signal at the output
  if (N.H === 0) { N.w[0] -= lr * d * x; N.w[1] -= lr * d * y; N.b -= lr * d; return; }
  for (let j = 0; j < N.H; j++) { const dh = d * N.w2[j] * (1 - f.h[j] * f.h[j]); N.w2[j] -= lr * d * f.h[j]; N.W1[j][0] -= lr * dh * x; N.W1[j][1] -= lr * dh * y; N.b1[j] -= lr * dh; }
  N.b2 -= lr * d;
}
function epoch(N, data, lr, r) { const idx = data.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = r.int(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } for (const i of idx) train1(N, data[i][0], data[i][1], data[i][2], lr); }
function evalSet(N, data) { let loss = 0, ok = 0; for (const [x, y, t] of data) { const o = Math.min(1 - 1e-9, Math.max(1e-9, forward(N, x, y).o)); loss -= t * Math.log(o) + (1 - t) * Math.log(1 - o); if ((o > 0.5) === (t === 1)) ok++; } return { loss: loss / data.length, acc: ok / data.length }; }
function trainFor(kind, H, epochs, lr, r, nTrain = 100, noise = 0.05) { const tr = makeData(kind, nTrain, r, noise), te = makeData(kind, 300, r, noise), N = newNet(H, r); for (let e = 0; e < epochs; e++) epoch(N, tr, lr, r); return { N, tr: evalSet(N, tr), te: evalSet(N, te) }; }

// ---------------- 3. State ----------------
const DEF = { data: "line", H: 0, lr: 0.3, n: 120, noise: 0.05, speed: 4, testFrac: 0.3 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), train = [], test = [], net = null, ep = 0, hist = [], acc = 0;
function restart(newData = true) { if (newData) { const all = makeData(P.data, P.n, rand, P.noise), k = Math.round(P.n * (1 - P.testFrac)); train = all.slice(0, k); test = all.slice(k); } net = newNet(P.H, rand); ep = 0; hist = []; record(); }
function record() { const a = evalSet(net, train), b = test.length ? evalSet(net, test) : a; hist.push([ep, a.loss, b.loss, a.acc, b.acc]); if (hist.length > 600) hist.shift(); }

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Neural Networks and Machine Learning", subject: "Computer Science",
  blurb: "Train a neuron, then a small network, to sort coloured points: weights, activation, back-propagation, learning rate, epochs, and overfitting",
  reset: () => restart(false), step: () => { epoch(net, train, P.lr, rand); ep++; record(); },
  levels: { std: "AI concepts", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618: an introduction to how machine learning works, using labelled data to train a single artificial neuron to separate two groups of points. (AI and machine learning are examined at A Level, topic 18.)",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 18.1 Artificial Intelligence: machine learning (supervised, unsupervised, reinforcement), deep learning, artificial neural networks with input, hidden and output layers, weights, activation and back propagation of errors; regression methods. Training and test data and overfitting." } },
  missions: [
    { title: "One neuron, one straight line", q: "Press ▶ and let one neuron train on data that a straight line can split. Watch the boundary move. How many epochs until it is (nearly) all correct?", hint: "A single neuron's output is σ(w₁x + w₂y + b), so its boundary (output = 0.5) is the straight line w₁x + w₂y + b = 0. Gradient descent nudges the weights after each example until the line separates the classes, usually within a few epochs.", setup: () => set({ data: "line", H: 0 }) },
    { title: "Learning rate", q: "Try a learning rate of 0.02, then 3. What happens to the loss curve in each case?", hint: "Too small: steady but very slow progress. Too large: the weights overshoot, so the loss jumps about. A good learning rate is a compromise.", setup: () => set({ data: "line", H: 0, lr: 0.02 }) },
    { title: "XOR defeats one neuron", q: "XOR data: the top-left and bottom-right are one class, the other corners the other. Can one neuron learn it? What is the best accuracy it can reach?", hint: "No straight line can separate XOR, so a single neuron gets stuck around 50–75% accuracy, however long it trains. This (Minsky and Papert, 1969) is why hidden layers are needed.", setup: () => set({ data: "xor", H: 0 }) },
    { lvl: "adv", title: "A hidden layer solves XOR", q: "Give the network 4 hidden neurons and train on XOR. What shape is the boundary now? How many epochs does it take?", hint: "Each hidden neuron draws its own line; the output neuron combines them into a bent boundary that separates XOR completely (usually within a couple of hundred epochs).", setup: () => set({ data: "xor", H: 4, lr: 0.3 }) },
    { lvl: "adv", title: "Circles and spirals", q: "Try the circle data with 2, 4 and 8 hidden neurons. Then the spiral. Which needs more neurons? Why?", hint: "A circle needs at least 3 straight pieces (a triangle-ish boundary), so 2 hidden neurons is not enough. The spiral twists several times and needs many neurons and many epochs: a deeper or wider network can represent more complicated boundaries.", setup: () => set({ data: "circle", H: 2 }) },
    { lvl: "adv", title: "Overfitting", q: "Spiral, few points (40), lots of noise, 16 hidden neurons. Compare the training and test accuracy as it trains. What goes wrong?", hint: "Training accuracy keeps rising, but test accuracy stalls or falls: the network learns the noise in the few training points (overfitting). More data, fewer neurons or stopping early all help.", setup: () => set({ data: "spiral", H: 16, n: 40, noise: 0.15, lr: 0.3 }) },
  ],
  batch: [
    { title: "How fast does one neuron learn a straight line?", question: "Training a single neuron on 100 linearly separable points, what is its test accuracy after 20 epochs?", how: "Each run: new data and random starting weights.", yLabel: "test accuracy", reps: 60, bins: 20, lo: 0.5, hi: 1, run: (x, r) => trainFor("line", 0, 20, 0.3, r).te.acc, note: "Nearly always above 95%: a straight boundary is exactly what one neuron can represent. The few errors are points close to the line." },
    { title: "Single neuron against XOR", question: "What test accuracy can a single neuron reach on XOR data, after 100 epochs?", how: "Each run: new data and starting weights.", yLabel: "test accuracy", reps: 60, bins: 20, lo: 0.2, hi: 1, theory: 0.75, theoryLabel: "best possible for a straight line: about ¾", run: (x, r) => trainFor("xor", 0, 100, 0.3, r).te.acc, note: "Usually around 50%, never much above 75%: any straight line gets at least one quadrant wrong. A hidden layer is needed." },
    { title: "Hidden neurons and the circle (A level)", question: "How does test accuracy on the circle data depend on the number of hidden neurons (200 epochs)?", how: "Each point: one training run.", xLabel: "hidden neurons", yLabel: "test accuracy", xs: [0, 1, 2, 3, 4, 6, 8], reps: 4, yMin: 0.4, yMax: 1, run: (H, r) => trainFor("circle", H, 200, 0.3, r).te.acc, note: "One neuron is no better than guessing well; accuracy climbs as hidden neurons are added (at least 3 straight pieces are needed to wrap round a circle) and levels off around 4–6. Single runs vary because the starting weights are random." },
    { title: "Overfitting and training-set size (A level)", question: "Spiral data, 16 hidden neurons, 300 epochs. How big is the gap between training and test accuracy for different amounts of training data?", how: "Each point: one training run; records training accuracy − test accuracy.", xLabel: "training points", yLabel: "train − test accuracy", xs: [20, 40, 80, 160, 320], reps: 3, yMin: -0.1, yMax: 0.6, run: (n, r) => { const t = trainFor("spiral", 16, 300, 0.3, r, n, 0.1); return t.tr.acc - t.te.acc; }, note: "With little data the network memorises the training points and does worse on new ones (a big gap). More data shrinks the gap." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "18.1", text: "Machine learning: a program improves its performance on a task from data rather than being explicitly programmed. Supervised learning uses labelled examples; unsupervised finds patterns in unlabelled data; reinforcement learns by trial, error and rewards." },
      { lvl: "std", tag: "18.1", text: "An artificial neuron: weighted sum of inputs plus a bias, passed through an activation function (e.g. sigmoid). Training adjusts the weights to reduce the error." },
      { lvl: "adv", tag: "18.1", text: "An artificial neural network has an input layer, one or more hidden layers and an output layer. Deep learning uses many hidden layers. Hidden layers let it learn non-linear boundaries (one neuron alone only gives a straight line)." },
      { lvl: "adv", tag: "18.1", text: "Back propagation: work out the error at the output, pass it backwards through the network to find how much each weight contributed, and adjust each weight against its gradient × learning rate. Repeat for many epochs." },
      { lvl: "adv", tag: "18.1", text: "Training data is used to adjust the weights; separate test data checks the model on unseen examples. Overfitting: excellent on training data, poor on test data." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => net && net.H === 0 ? `A neuron has weights ${net.w[0].toFixed(2)} and ${net.w[1].toFixed(2)} and bias ${net.b.toFixed(2)}, with a sigmoid activation. Calculate its output for the input (0.5, −0.5).` : "A neuron has weights 2 and −1 and bias 0.5, with a sigmoid activation. Calculate its output for the input (0.5, −0.5).", ans: () => { const w = net && net.H === 0 ? net.w : [2, -1], b = net && net.H === 0 ? net.b : 0.5, z = w[0] * 0.5 - w[1] * 0.5 + b; return `<ul><li>z = ${w[0].toFixed(2)} × 0.5 + ${w[1].toFixed(2)} × (−0.5) + ${b.toFixed(2)} = ${z.toFixed(3)}</li><li>output = 1/(1 + e^(−z)) = ${sig(z).toFixed(3)}</li><li>${sig(z) > 0.5 ? "above 0.5: class 1" : "below 0.5: class 0"}</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain why a neural network with a hidden layer can classify XOR data but a single neuron cannot.", ans: "<ul><li>a single neuron's decision boundary is a straight line</li><li>XOR's classes cannot be separated by one straight line</li><li>hidden neurons each make a boundary that the output neuron combines into a non-linear (bent) boundary</li></ul>" },
      { lvl: "adv", marks: 3, q: "Describe how back propagation is used to train a neural network.", ans: "<ul><li>inputs are passed forward and the output is compared with the correct (labelled) answer to find the error</li><li>the error is propagated backwards to find each weight's contribution (gradient)</li><li>each weight is adjusted by a small amount (learning rate) to reduce the error; repeated over many epochs</li></ul>" },
      { lvl: "adv", marks: 2, q: "State what is meant by overfitting and one way to reduce it.", ans: "<ul><li>the model fits the training data (including its noise) too closely and performs poorly on new data</li><li>e.g. use more training data, a simpler network, or stop training when test error starts to rise</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Points are labelled orange (class 1) or blue (class 0). Filled points train the network; ringed points are kept back as test data. The background shows the network's output everywhere: its decision boundary is where the colour changes (output 0.5).</li><li>Each epoch shows every training point once in a random order; after each point every weight is updated by back-propagation of the cross-entropy error (stochastic gradient descent).</li><li>Hidden neurons use tanh; the output neuron uses the sigmoid function.</li></ul>
<h3>Simplifications</h3><ul><li>Real networks have thousands to billions of weights, many layers, and are trained on huge data sets with more advanced optimisers.</li><li>Starting weights are random, so two runs can end differently.</li><li>Only two inputs (x, y), so the boundary can be drawn.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("Data");
C.data = K.seg(g, { value: "line", options: [["line", "straight line"], ["xor", "XOR"], ["circle", "circle"], ["spiral", "spiral"]], on: v => { P.data = v; restart(); } });
C.n = K.slider(g, { label: "Number of points", min: 20, max: 300, step: 10, value: 120, on: v => { P.n = v; restart(); } });
C.noise = K.slider(g, { label: "Noise", min: 0, max: 0.3, step: 0.01, value: 0.05, on: v => { P.noise = v; restart(); } });
g = ui.group("Network");
C.H = K.slider(g, { label: "Hidden neurons", min: 0, max: 16, step: 1, value: 0, fmt: v => v ? String(v) : "none (one neuron)", on: v => { P.H = v; restart(false); } });
C.lr = K.slider(g, { label: "Learning rate", min: 0.01, max: 3, step: 0.01, value: 0.3, on: v => P.lr = v });
C.speed = K.slider(g, { label: "Epochs per second", min: 0.5, max: 60, step: 0.5, value: 4, on: v => P.speed = v });
let rw = K.row(g); K.btn(rw, "🎲 New data", () => restart(), "primary"); K.btn(rw, "Reset the weights", () => restart(false));
const read = K.readout(ui.group("Training"), [["ep", "Epoch"], ["tr", "Training accuracy"], ["te", "Test accuracy"], ["w", "Weights"]]);
function showCtl() { C.H.el.style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.H > 0 && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["data", "n", "noise", "H", "lr", "speed"]) C[k].set(P[k]); showCtl(); restart(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Loss (error) during training", xLabel: "epoch", yLabel: "loss", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Accuracy", xLabel: "epoch", yLabel: "accuracy", yMin: 0.3, yMax: 1 });
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let img = null;
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (!net) return;
  const S = Math.min(h - 30, w * 0.6), x0 = 15, y0 = (h - S) / 2, X = v => x0 + (v + 1) / 2 * S, Y = v => y0 + (1 - v) / 2 * S, G = 60, cs = S / G;
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const o = forward(net, -1 + (i + 0.5) * 2 / G, 1 - (j + 0.5) * 2 / G).o; const mix = (v, bg) => Math.round(bg + 0.35 * (v - bg)); c.fillStyle = `rgb(${mix(60 + 195 * o, 11)},${mix(110 + 60 * (1 - Math.abs(o - 0.5) * 2), 18)},${mix(255 - 200 * o, 34)})`; c.fillRect(Math.floor(x0 + i * cs), Math.floor(y0 + j * cs), Math.ceil(cs) + 1, Math.ceil(cs) + 1); }
  // the boundary (output = 0.5), traced by marching over the grid
  c.fillStyle = "#fff"; for (let i = 0; i < 120; i++) for (let j = 0; j < 120; j++) { const a = forward(net, -1 + i / 60, 1 - j / 60).o - 0.5, b = forward(net, -1 + (i + 1) / 60, 1 - j / 60).o - 0.5, d = forward(net, -1 + i / 60, 1 - (j + 1) / 60).o - 0.5; if (a * b < 0 || a * d < 0) c.fillRect(x0 + i / 120 * S, y0 + j / 120 * S, 2, 2); }
  c.strokeStyle = "#3a4a6e"; c.strokeRect(x0, y0, S, S);
  for (const [x, y, t] of train) { c.fillStyle = t ? "#ffb454" : "#5ad1ff"; c.beginPath(); c.arc(X(x), Y(y), 4.5, 0, 6.3); c.fill(); c.strokeStyle = "#0b1222"; c.stroke(); }
  for (const [x, y, t] of test) { c.strokeStyle = t ? "#ffb454" : "#5ad1ff"; c.lineWidth = 2; c.beginPath(); c.arc(X(x), Y(y), 5, 0, 6.3); c.stroke(); c.lineWidth = 1; }
  // the network diagram, weights shown by line thickness and colour
  const nx = x0 + S + 40, nw = w - nx - 20; if (nw > 120) {
    const L0 = [[nx + 20, h * 0.35], [nx + 20, h * 0.65]], hidden = net.H ? Array.from({ length: net.H }, (_, j) => [nx + nw / 2, h * (0.1 + 0.8 * (net.H === 1 ? 0.5 : j / (net.H - 1)))]) : [], out = [nx + nw - 20, h * 0.5];
    const line = (a, b, wt) => { c.strokeStyle = wt > 0 ? "rgba(255,180,84,.8)" : "rgba(90,209,255,.8)"; c.lineWidth = Math.min(6, 0.5 + Math.abs(wt) * 1.2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.lineWidth = 1; };
    if (net.H === 0) { line(L0[0], out, net.w[0]); line(L0[1], out, net.w[1]); } else { hidden.forEach((hh, j) => { line(L0[0], hh, net.W1[j][0]); line(L0[1], hh, net.W1[j][1]); line(hh, out, net.w2[j]); }); }
    const node = (p, lab) => { c.fillStyle = "#121b30"; c.beginPath(); c.arc(p[0], p[1], 14, 0, 6.3); c.fill(); c.strokeStyle = "#c9d4ea"; c.stroke(); TX(c, lab, p[0], p[1] + 4, "#fff", "center", "600 11px"); };
    node(L0[0], "x"); node(L0[1], "y"); hidden.forEach(hh => node(hh, "h")); node(out, "out");
    TX(c, "input", nx + 20, h - 14, "#8fa0bf", "center", "11px"); if (net.H) TX(c, "hidden layer", nx + nw / 2, h - 14, "#8fa0bf", "center", "11px"); TX(c, "output", nx + nw - 20, h - 14, "#8fa0bf", "center", "11px");
    TX(c, "orange line: positive weight · blue: negative · thicker = bigger", nx, 18, "#8fa0bf", "left", "11px");
  }
  const last = hist[hist.length - 1]; ui.hud(`epoch ${ep}<br>train ${(100 * last[3]).toFixed(0)}% · test ${(100 * last[4]).toFixed(0)}%`);
}
function panels() {
  const last = hist[hist.length - 1]; read.set("ep", ep); read.set("tr", (100 * last[3]).toFixed(1) + "%"); read.set("te", test.length ? (100 * last[4]).toFixed(1) + "%" : "–");
  read.set("w", net.H === 0 ? `w₁ ${net.w[0].toFixed(2)}, w₂ ${net.w[1].toFixed(2)}, b ${net.b.toFixed(2)}` : `${net.H * 3 + net.H + 1} weights and biases`);
  chA.draw([{ pts: hist.map(q => [q[0], q[1]]), color: K.cssVar("--s1"), label: "training" }, { pts: hist.map(q => [q[0], q[2]]), color: K.cssVar("--s0"), label: "test" }]);
  chB.draw([{ pts: hist.map(q => [q[0], q[3]]), color: K.cssVar("--s1"), label: "training" }, { pts: hist.map(q => [q[0], q[4]]), color: K.cssVar("--s0"), label: "test" }]);
}
let frame = 0;
ui.run(dt => { acc += dt * P.speed; let k = 0; while (acc >= 1 && k++ < 20) { acc--; epoch(net, train, P.lr, rand); ep++; record(); } }, () => { if (frame % 2 === 0) draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.H > 0) set({ data: P.data }); showCtl(); };
set({});
ui.tip("Filled points train the network; ringed points test it. The white line is the decision boundary.", 7000);
