/* =====================================================================
   LUCK, SKILL AND THE LEAGUE
   Sixteen clubs, each with a hidden true skill. A match is decided by
   goals, and goals are rare, chancy events:
       goals scored ~ Poisson( 1.3 x e^(skill difference / 2) )
   so the better side usually wins but often does not. How many games
   does it take for skill to show through the luck? Does the best team
   win the league? The cup? And what really happens when a struggling
   club sacks its manager?
   ===================================================================== */
const NT = 16;
const NAMES = ["Ashford Rovers", "Brackley Town", "Calder United", "Dunmore City", "Eastleigh Athletic", "Fenwick Wanderers", "Glenmoor", "Harlow Borough", "Inverleigh", "Jesmond Park", "Kestrel Vale", "Larkhill", "Marlow Albion", "Northgate", "Oakhampton", "Penrose County"];
const HUES = [0, 22, 45, 70, 100, 140, 165, 190, 210, 230, 255, 280, 305, 330, 350, 60];
const tcol = (i, l = 58) => `hsl(${HUES[i]},70%,${l}%)`;

function poisson(r, lam) { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
// One match: expected goals depend on the gap in skill, plus a bonus for playing at home
function playMatch(r, sh, sa, home) { const d = (sh - sa) / 2 + home; return [poisson(r, 1.3 * Math.exp(d)), poisson(r, 1.3 * Math.exp(-d))]; }
function makeSkills(r, spread) { const s = []; for (let i = 0; i < NT; i++) s.push(r.gauss() * spread); return s; }
// Fixture list: every club meets every other, home and away ("double round robin" = 30 games), repeated if asked
function fixtures(rounds) {
  const ids = [...Array(NT).keys()], half = [];
  for (let rd = 0; rd < NT - 1; rd++) { const m = []; for (let k = 0; k < NT / 2; k++) { const a = ids[k], b = ids[NT - 1 - k]; m.push(rd % 2 ? [a, b] : [b, a]); } half.push(m); ids.splice(1, 0, ids.pop()); }
  const one = half.concat(half.map(m => m.map(([a, b]) => [b, a]))); let all = []; for (let k = 0; k < rounds; k++) all = all.concat(one); return all;
}
class Season {
  constructor(r, skills, o = {}) {
    this.r = r; this.s = skills; this.o = Object.assign({ home: 0.15, robins: 1, sack: false }, o); this.fx = fixtures(this.o.robins); this.round = 0;
    this.t = skills.map((_, i) => ({ i, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, form: [], since: 99, watch: null, sacked: 0 })); this.hist = [skills.map(() => 0)]; this.last = []; this.news = []; this.bounce = [];
  }
  get done() { return this.round >= this.fx.length; }
  playRound() {
    if (this.done) return; this.last = []; this.news = [];
    for (const [h, a] of this.fx[this.round]) {
      const [gh, ga] = playMatch(this.r, this.s[h], this.s[a], this.o.home); this.last.push([h, a, gh, ga]);
      for (const [me, gf, ga2] of [[h, gh, ga], [a, ga, gh]]) {
        const T = this.t[me], pts = gf > ga2 ? 3 : gf === ga2 ? 1 : 0; T.P++; T.GF += gf; T.GA += ga2; T.Pts += pts; pts === 3 ? T.W++ : pts === 1 ? T.D++ : T.L++; T.form.push(pts); T.since++;
        // A manager is sacked after 5 games with 3 points or fewer. NOTE: the sacking changes nothing about the team's skill.
        if (T.watch) { T.watch.after.push(pts); if (T.watch.after.length === 5) { this.bounce.push([T.watch.before / 5, T.watch.after.reduce((x, y) => x + y, 0) / 5]); T.watch = null; } }
        if (this.o.sack && T.since >= 10 && T.form.length >= 5 && !T.watch) { const l5 = T.form.slice(-5).reduce((x, y) => x + y, 0); if (l5 <= 3) { T.watch = { before: l5, after: [] }; T.since = 0; T.sacked++; this.news.push(me); } }
      }
    }
    this.round++; this.hist.push(this.t.map(T => T.Pts));
  }
  finish() { while (!this.done) this.playRound(); return this; }
  order() { return this.t.slice().sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || a.i - b.i); }
  champion() { return this.order()[0].i; }
}
// A knockout cup: random draw, one match per tie, a drawn game goes to penalties (a coin toss)
function playCup(r, skills, home = 0) {
  let alive = [...Array(NT).keys()]; for (let i = NT - 1; i > 0; i--) { const j = r.int(i + 1);[alive[i], alive[j]] = [alive[j], alive[i]]; }
  const rounds = [];
  while (alive.length > 1) { const next = [], ms = []; for (let k = 0; k < alive.length; k += 2) { const a = alive[k], b = alive[k + 1], [ga, gb] = playMatch(r, skills[a], skills[b], home); const w = ga > gb ? a : gb > ga ? b : (r() < .5 ? a : b); ms.push({ a, b, ga, gb, w, pens: ga === gb }); next.push(w); } rounds.push(ms); alive = next; }
  return { rounds, winner: alive[0] };
}
const skillRank = (skills, i) => 1 + skills.filter(v => v > skills[i]).length;
const best = skills => skills.indexOf(Math.max(...skills));
function corr(xs, ys) { return K.linfit(xs.map((x, i) => [x, ys[i]])).r; }

// ---------------------------------------------------------------- page
let skills, season, cup, cupShown = 0, format = "league", speed = 4, showSkill = true, auto = true, wait = 0, tally, rows = [], acc = 0, rand = K.rng(Date.now()), seasons = 0, bounceAll = []; const S = {};
const ui = K.app({
  title: "Luck, Skill and the League", subject: "Physical Education", blurb: "Does the best team win? Leagues, cups, home advantage and the truth about sacking the manager.",
  reset: () => newClubs(),
  missions: [
    { title: "Spot the best team", q: "True skill is hidden. Watch the season. After 5 games, write down who you think is really the best team. Again after 15. Then reveal the true skill at the end. Were you right? Was the table?", hint: "Early tables are mostly noise: a mid-table side can top the league after five games through luck. The table becomes more trustworthy as games accumulate, but even after 30 the champion is often not the most skilful club.", setup: () => { S.show.set(false, true); S.format.set("league", true); S.speed.set(2, true); S.auto.set(false, true); newClubs(); } },
    { title: "Does the best team win?", q: "Let the seasons roll (same clubs, same skills). Watch the right-hand chart fill up. In what fraction of seasons does the truly best club take the title?", hint: "With a realistic spread of skill, the best club wins only about half the time. Being the best gives you the best <i>chance</i>, not a guarantee. One title does not prove a team was the best, and one bad season does not prove it was not.", setup: () => { S.show.set(true, true); S.format.set("league", true); S.speed.set(30, true); S.auto.set(true, true); newClubs(); } },
    { title: "League or cup?", q: "Switch the format to a knockout cup with the same clubs. Does the best team win more or less often than in the league? Why do supporters call the cup 'magic'?", hint: "The cup winner plays only four matches, so there is far less time for skill to outweigh luck: outsiders win much more often. Short competitions are exciting because they are unpredictable; long leagues are fairer because luck averages out.", setup: () => { S.show.set(true, true); S.format.set("cup", true); S.speed.set(6, true); S.auto.set(true, true); newClubs(); } },
    { title: "A league of equals", q: "Set <b>skill difference</b> to zero: every club is identical. Play a season. Is there still a champion and a bottom club? What would the pundits say about them?", hint: "Pure chance still produces a 'dominant' champion and a 'hopeless' bottom club, with a gap of 20 points or more between them. People are very good at inventing explanations for patterns that are only luck.", setup: () => { S.show.set(true, true); S.format.set("league", true); S.spread.set(0, true); S.speed.set(6, true); newClubs(); } },
    { title: "Sack the manager!", q: "Clubs now sack the manager after 5 games with 3 points or fewer. In this model a sacking changes <b>nothing</b> about the team. Run several seasons and compare points per game before and after a sacking.", hint: "Results improve sharply after a sacking, although nothing has changed. A run of 5 terrible games is partly bad luck, and luck does not persist: the next 5 games are closer to the team's true level. This is regression to the mean, and it flatters new managers, new training methods and 'miracle cures' alike.", setup: () => { S.show.set(true, true); S.format.set("league", true); S.sack.set(true, true); S.spread.set(0.5, true); S.speed.set(30, true); S.auto.set(true, true); newClubs(); } },
    { title: "Fortress", q: "Raise home advantage to its maximum and play a season. Then set it to zero. Does home advantage change who wins the league? Why might it matter more in a cup?", hint: "Over a league season every club plays everyone home and away, so home advantage cancels out. In a one-match cup tie it does not: the draw (who plays at home) becomes another piece of luck.", setup: () => { S.format.set("league", true); S.home.set(0.4, true); S.speed.set(6, true); newClubs(); } },
  ],
  batch: [
    { title: "Does the best team win the league?", question: "How does the best club's chance of the title depend on how unequal the league is?", how: "A new set of 16 clubs each run, 30-game season. Result = 1 if the most skilful club is champion.", xLabel: "skill difference between clubs (spread)", yLabel: "chance the best club wins", xs: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1], reps: 60, yMin: 0, yMax: 1.05,
      run: (x, r) => { const s = makeSkills(r, x || 1e-9); return new Season(r, s).finish().champion() === best(s) ? 1 : 0; }, note: "Each run is one whole season with a yes/no outcome, so many runs are needed. With no skill differences the 'best' club is best in name only and wins 1 time in 16 (0.0625). A realistic league (bookmakers' odds suggest a spread around 0.4 to 0.5) gives the best club roughly an even chance." },
    { title: "How long should a season be?", question: "How many games does it take for the best team to come out on top?", how: "Skill spread 0.45. The season length is changed by making clubs meet more often.", xLabel: "games per club", yLabel: "chance the best club wins", xs: [30, 60, 120, 240], reps: 50, yMin: 0, yMax: 1.05,
      run: (x, r) => { const s = makeSkills(r, 0.45); return new Season(r, s, { robins: x / 30 }).finish().champion() === best(s) ? 1 : 0; }, note: "Luck averages out only slowly, like 1/√(games). Even a 240-game season does not make the best club certain to win, especially if the second-best club is nearly as good." },
    { title: "League against cup", question: "Which format rewards the best team more?", how: "Skill spread 0.45, new clubs each run. x = 0 is a 30-game league; x = 1 is a 16-club knockout cup (4 rounds).", xLabel: "format (0 = league, 1 = cup)", yLabel: "chance the best club wins", xs: [0, 1], reps: 150, yMin: 0, yMax: 1.05,
      run: (x, r) => { const s = makeSkills(r, 0.45); return (x ? playCup(r, s).winner : new Season(r, s).finish().champion()) === best(s) ? 1 : 0; }, note: "Yes/no outcomes again, so the standard error bars matter: compare the gap between the two means with the size of the bars." },
    { title: "The sacked-manager bounce", question: "How much do results improve after a sacking that changes nothing?", how: "Skill spread 0.45. One season per run; result = mean points per game in the 5 games after sackings minus the 5 games before.", xLabel: "", yLabel: "change in points per game after a sacking", reps: 200, bins: 24, theory: 0, theoryLabel: "no bounce",
      run: (x, r) => { const b = new Season(r, makeSkills(r, 0.45), { sack: true }).finish().bounce; return b.length ? K.mean(b.map(q => q[1] - q[0])) : null; }, note: "The whole distribution sits well above zero: a 'bounce' of roughly 0.7 points per game appears from nothing. Clubs are picked for sacking <i>because</i> their recent luck was bad. To test whether sackings truly help, compare with equally bad runs where the manager stayed." },
    { title: "How much of the table is skill?", question: "How well do final points reflect true skill?", how: "30-game season. Result = correlation between clubs' true skill and their final points (1 = table is a perfect guide, 0 = no guide at all).", xLabel: "skill difference between clubs (spread)", yLabel: "correlation of skill with points", xs: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1], reps: 15, yMin: -0.5, yMax: 1,
      run: (x, r) => { const s = makeSkills(r, x || 1e-9), se = new Season(r, s).finish(); return corr(s, se.t.map(T => T.Pts)); }, note: "With only 16 clubs, a correlation worked out from one season is itself quite uncertain." },
  ],
  notes: `<h3>The rules</h3><ul><li>Each club has a fixed true skill, drawn from a normal distribution whose width is the <b>skill difference</b> slider.</li><li>Goals for each side follow a Poisson distribution with mean <code>1.3 × e^(±(skill gap)/2 ± home advantage)</code>.</li><li>League: everyone plays everyone home and away (30 games). 3 points for a win, 1 for a draw; ties split on goal difference.</li><li>Cup: random draw, single matches, drawn ties settled by a 50:50 penalty shoot-out.</li><li>Sacking rule: 3 points or fewer from the last 5 games (and at least 10 games since the last sacking). <b>The team's skill is not changed.</b></li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Skill is one fixed number per club: no injuries, transfers, form, fatigue or tactics, and no difference between attack and defence.</li><li>The two sides' goals are independent of each other, and matches are independent of each other: there is no real 'momentum' here, so any streak you see is luck.</li><li>Home advantage is the same for every club.</li><li>Clubs and their names are invented.</li></ul>
  <h3>Ideas to take away</h3><p>sample size · regression to the mean · the difference between a good decision and a good outcome · why short competitions are less 'fair' but more exciting</p>`,
});
let g = ui.group("Competition");
S.format = K.seg(g, { value: "league", options: [["league", "League (30 games)"], ["cup", "Knockout cup"]], on: v => { format = v; resetTally(); newSeason(); } });
S.spread = K.slider(g, { label: "Skill difference between clubs", min: 0, max: 1, step: 0.05, value: 0.45, fmt: v => v === 0 ? "none: pure luck" : v.toFixed(2) + (v < 0.3 ? " · very even" : v > 0.7 ? " · very unequal" : ""), on: () => newClubs() });
S.home = K.slider(g, { label: "Home advantage", min: 0, max: 0.4, step: 0.05, value: 0.15, fmt: v => v === 0 ? "none" : v.toFixed(2), on: v => { if (season) season.o.home = v; } });
S.sack = K.toggle(g, { label: "Clubs sack the manager after a bad run", value: false, on: () => { bounceAll = []; newSeason(); } });
const r1 = K.row(g); K.btn(r1, "New clubs", () => newClubs()); K.btn(r1, "Next season ▸", () => newSeason());
g = ui.group("View");
S.show = K.toggle(g, { label: "Reveal each club's true skill", value: true, on: v => showSkill = v });
S.auto = K.toggle(g, { label: "Keep playing seasons", value: true, on: v => auto = v });
S.speed = K.slider(g, { label: "Speed", min: 1, max: 30, step: 1, value: 4, fmt: v => v >= 30 ? "a season per blink" : v + " rounds per second", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset
g = ui.group("The story so far");
const read = K.readout(g, [["sn", "Seasons played"], ["bw", "Won by the truly best club"], ["r", "Skill ↔ points correlation"], ["b", "Points per game: before → after sacking"]]);

function resetTally() { tally = new Array(NT).fill(0); seasons = 0; }
function newClubs() { skills = makeSkills(rand, S.spread.value || 1e-9); resetTally(); bounceAll = []; rows = skills.map((_, i) => ({ y: i })); newSeason(); }
function newSeason() { season = new Season(rand, skills, { home: S.home.value, sack: S.sack.value }); cup = format === "cup" ? playCup(rand, skills, S.home.value) : null; cupShown = 0; wait = 0; ended = false; }
let ended = false;
function endSeason() { ended = true; const ch = format === "cup" ? cup.winner : season.champion(); tally[skillRank(skills, ch) - 1]++; seasons++; bounceAll = bounceAll.concat(season.bounce); wait = speed >= 30 ? 0.05 : 2.2; }

// ---- Drawing ----
const cv = ui.canvas();
function crest(c, x, y, i, s = 9) { c.fillStyle = tcol(i); c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y - s); c.lineTo(x + s, y + s * .2); c.quadraticCurveTo(x + s, y + s, x, y + s * 1.25); c.quadraticCurveTo(x - s, y + s, x - s, y + s * .2); c.fill(); c.fillStyle = tcol(i, 30); c.fillRect(x - s, y - s * .25, s * 2, s * .5); c.fillStyle = "#fff"; c.font = `700 ${s}px Segoe UI,sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(NAMES[i][0], x, y - s * .45 + s * .5); c.textBaseline = "alphabetic"; }
function stars(c, x, y, i) { const rk = skillRank(skills, i); c.font = "600 10.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillStyle = rk === 1 ? "#ffd166" : rk <= 4 ? "#c9d2e6" : "#6f7f9f"; c.fillText(showSkill || ended ? "skill #" + rk : "skill ?", x, y); }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; const bg = c.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#0c1a22"); bg.addColorStop(1, "#080c18"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  const TW = w * 0.56; format === "cup" ? drawCup(c, TW, h) : drawTable(c, TW, h, dt);
  // --- right-hand side: latest results, then skill against points
  const x0 = TW + 26, x1 = w - 18; c.textAlign = "left"; c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf";
  if (format === "league") {
    c.fillText(season.round ? `MATCHDAY ${season.round} RESULTS` : "KICK-OFF", x0, 22);
    season.last.forEach(([hh, a, gh, ga], k) => { const col = k % 2, row = k >> 1, cx = x0 + col * (x1 - x0) / 2, y = 46 + row * 25, cw = (x1 - x0) / 2 - 8; c.fillStyle = "rgba(255,255,255,.04)"; c.beginPath(); c.roundRect(cx, y - 14, cw, 21, 6); c.fill(); crest(c, cx + 12, y - 4, hh, 6.5); crest(c, cx + cw - 12, y - 4, a, 6.5); c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText(`${gh} – ${ga}`, cx + cw / 2, y + 1); c.font = "10.5px Segoe UI,sans-serif"; c.fillStyle = gh > ga ? "#fff" : "#8fa0bf"; c.textAlign = "left"; c.fillText(NAMES[hh].slice(0, 3).toUpperCase(), cx + 23, y); c.fillStyle = ga > gh ? "#fff" : "#8fa0bf"; c.textAlign = "right"; c.fillText(NAMES[a].slice(0, 3).toUpperCase(), cx + cw - 23, y); });
    if (season.news.length) { c.fillStyle = "#ff6b81"; c.font = "600 11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("MANAGER SACKED: " + season.news.map(i => NAMES[i].split(" ")[0]).join(", "), x0, 46 + 4 * 25 + 4); }
  }
  // scatter: true skill (x) against points per game (y)
  const sy0 = format === "league" ? 46 + 4 * 25 + 34 : 40, sy1 = h - 34, sx0 = x0 + 30, pts = format === "league" ? season.t.map(T => T.P ? T.Pts / T.P : 0) : null;
  c.fillStyle = "#8fa0bf"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(format === "league" ? "TRUE SKILL AGAINST POINTS PER GAME" : "TRUE SKILL OF EACH CLUB", x0, sy0 - 10);
  c.strokeStyle = "#24324f"; c.lineWidth = 1; c.strokeRect(sx0 + .5, sy0 + .5, x1 - sx0, sy1 - sy0);
  const lim = Math.max(0.6, ...skills.map(Math.abs)) * 1.15, SX = v => sx0 + (v + lim) / (2 * lim) * (x1 - sx0), SY = v => sy1 - v / 3 * (sy1 - sy0);
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "center"; c.fillText("← weaker        true skill        stronger →", (sx0 + x1) / 2, sy1 + 16);
  if (format === "league") { c.textAlign = "right"; for (let v = 0; v <= 3; v++) c.fillText(v, sx0 - 5, SY(v) + 4); }
  if (!showSkill && !ended) { c.fillStyle = "#8fa0bf"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("True skill is hidden.", (sx0 + x1) / 2, (sy0 + sy1) / 2 - 8); c.font = "12px Segoe UI,sans-serif"; c.fillText("Who do you think is really the best?", (sx0 + x1) / 2, (sy0 + sy1) / 2 + 12); return; }
  if (format === "league" && season.round > 1) { const f = K.linfit(skills.map((s, i) => [s, pts[i]])); c.strokeStyle = "rgba(255,255,255,.45)"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(SX(-lim), SY(K.clamp(f.c - f.m * lim, 0, 3))); c.lineTo(SX(lim), SY(K.clamp(f.c + f.m * lim, 0, 3))); c.stroke(); c.setLineDash([]); }
  skills.forEach((s, i) => { const y = format === "league" ? SY(pts[i]) : sy0 + 18 + (i + .5) * (sy1 - sy0 - 30) / NT; crest(c, SX(s), y, i, 7.5); if (format === "cup") { c.fillStyle = "#8fa0bf"; c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(NAMES[i], SX(s) + 12, y + 3); } });
}
function drawTable(c, TW, h, dt) {
  const ord = season.order(), rh = (h - 46) / NT, maxP = Math.max(10, ord[0].Pts), x0 = 14;
  c.font = "600 11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "left"; c.fillText(`SEASON ${seasons + (ended ? 0 : 1)} · AFTER ${season.round} OF ${season.fx.length} MATCHDAYS`, x0, 20);
  const cols = [["P", 208], ["W", 232], ["D", 254], ["L", 276], ["GD", 304], ["Pts", 338]]; c.textAlign = "center"; for (const [n, x] of cols) c.fillText(n, x0 + x, 36);
  ord.forEach((T, pos) => { const R = rows[T.i]; R.y += (pos - R.y) * Math.min(1, dt * 14); });
  ord.slice().reverse().forEach(T => {
    const pos = ord.indexOf(T), y = 42 + rows[T.i].y * rh, champ = pos === 0 && ended;
    c.fillStyle = champ ? "rgba(255,209,102,.2)" : pos >= NT - 3 ? "rgba(255,107,129,.08)" : pos % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.015)"; c.beginPath(); c.roundRect(x0 - 6, y + 1, TW - 16, rh - 2, 6); c.fill();
    const my = y + rh / 2; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillStyle = "#8fa0bf"; c.fillText(pos + 1, x0 + 16, my + 4); crest(c, x0 + 34, my, T.i, Math.min(9, rh * .34));
    c.textAlign = "left"; c.fillStyle = "#e9eef8"; c.font = "13px Segoe UI,sans-serif"; c.fillText(NAMES[T.i] + (champ ? "  🏆" : ""), x0 + 50, my + 4);
    c.textAlign = "center"; c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#b8c4dc"; const gd = T.GF - T.GA;[T.P, T.W, T.D, T.L, (gd > 0 ? "+" : "") + gd].forEach((v, k) => c.fillText(v, x0 + cols[k][1], my + 4)); c.font = "700 13px Segoe UI,sans-serif"; c.fillStyle = "#fff"; c.fillText(T.Pts, x0 + 338, my + 4);
    const bx = x0 + 362, bw = TW - bx - 78; c.fillStyle = tcol(T.i, 45); c.beginPath(); c.roundRect(bx, my - 6, Math.max(2, bw * T.Pts / maxP), 12, 4); c.fill();
    T.form.slice(-5).forEach((p, k) => { c.fillStyle = p === 3 ? "#6ee7a0" : p === 1 ? "#8fa0bf" : "#ff6b81"; c.fillRect(bx + 2 + k * 7, my + 8, 5, 3); });
    stars(c, TW - 40, my + 4, T.i);
  });
}
function drawCup(c, TW, h) {
  c.font = "600 11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "left"; c.fillText(`CUP ${seasons + (ended ? 0 : 1)} · ${["ROUND OF 16", "QUARTER-FINALS", "SEMI-FINALS", "FINAL", "FINAL"][Math.max(0, cupShown - 1)]}`, 14, 20);
  const cw = (TW - 30) / 4;
  cup.rounds.forEach((ms, rd) => ms.forEach((m, k) => {
    const x = 14 + rd * cw, slot = (h - 40) / ms.length, y = 32 + (k + .5) * slot, shown = rd < cupShown, known = rd <= cupShown;
    c.fillStyle = "rgba(255,255,255,.04)"; c.strokeStyle = "#24324f"; c.beginPath(); c.roundRect(x, y - 21, cw - 12, 42, 7); c.fill(); c.stroke();
    if (rd < 3) { c.strokeStyle = "#24324f"; c.beginPath(); c.moveTo(x + cw - 12, y); c.lineTo(x + cw, y); c.stroke(); }
    [[m.a, m.ga], [m.b, m.gb]].forEach(([t, gls], q) => { const yy = y - 10 + q * 20; if (!known) return; const lost = shown && m.w !== t; c.globalAlpha = lost ? .4 : 1; crest(c, x + 13, yy, t, 6.5); c.font = (shown && !lost ? "600 " : "") + "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = "#e9eef8"; c.fillText(NAMES[t].split(" ")[0], x + 25, yy + 4); if (shown) { c.textAlign = "right"; c.fillText(gls + (m.pens && m.w === t ? " (p)" : ""), x + cw - 20, yy + 4); } if (showSkill || ended) { c.textAlign = "right"; c.fillStyle = "#6f7f9f"; c.font = "10px Segoe UI,sans-serif"; c.fillText("#" + skillRank(skills, t), x + cw - (shown ? 48 : 20), yy + 4); } c.globalAlpha = 1; });
  }));
  if (ended) { c.font = "600 15px Segoe UI,sans-serif"; c.fillStyle = "#ffd166"; c.textAlign = "center"; c.fillText(`🏆 ${NAMES[cup.winner]}`, 14 + 3.5 * cw - 6, 32 + (h - 40) / 2 + 48); c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.fillText(`true skill rank #${skillRank(skills, cup.winner)}`, 14 + 3.5 * cw - 6, 32 + (h - 40) / 2 + 66); }
}
const chR = K.chart(ui.dock, { title: "The title race", xLabel: "matchday", yLabel: "points" });
const chT = K.chart(ui.dock, { title: "Who wins? True skill rank of every champion so far", xLabel: "champion's true skill rank (1 = the best club)", yLabel: "titles", yMin: 0, xMin: 0.4, xMax: NT + .6 });
let frame = 0;
ui.run(dt => {
  if (wait > 0) { wait -= dt; if (wait <= 0 && auto) newSeason(); return; }
  if (ended) return;
  if (speed >= 30) { if (format === "league") season.finish(); else cupShown = 5; endSeason(); return; }
  acc += dt * (format === "cup" ? Math.min(speed, 3) * .5 : speed);
  while (acc >= 1 && !ended) { acc--; if (format === "league") { season.playRound(); if (season.done) endSeason(); } else { cupShown++; if (cupShown > 4) endSeason(); } }
}, dt => {
  draw(dt); if (frame++ % 4) return;
  const b = best(skills), ch = season.done ? season.champion() : -1;
  if (format === "league") chR.draw(skills.map((_, i) => ({ pts: season.hist.map((p, k) => [k, p[i]]), color: tcol(i), width: i === b && (showSkill || ended) ? 3.2 : i === ch ? 2.4 : 1, alpha: i === b || i === ch ? 1 : .55 })), { title: showSkill || ended ? `The title race (thick line: ${NAMES[b]}, the truly best club)` : "The title race", xMin: 0, xMax: season.fx.length });
  else chR.draw([{ pts: skills.map((s, i) => [skillRank(skills, i), s]), type: "dots", color: K.cssVar("--s0") }], { title: "True skill of each club", xLabel: "true skill rank", yLabel: "skill", xMin: 0, xMax: NT + 1 });
  chT.draw([{ pts: tally.map((n, i) => [i + 1, n]), type: "bars", w: 0.8, color: K.cssVar("--s5") }]);
  const r = format === "league" && season.round > 2 ? corr(skills, season.t.map(T => T.Pts)) : NaN;
  read.set("sn", seasons); read.set("bw", seasons ? `${tally[0]} of ${seasons} (${(tally[0] / seasons * 100).toFixed(0)}%)` : "–"); read.set("r", isFinite(r) ? r.toFixed(2) : "–");
  read.set("b", bounceAll.length ? `${K.mean(bounceAll.map(q => q[0])).toFixed(2)} → ${K.mean(bounceAll.map(q => q[1])).toFixed(2)}` : S.sack.value ? "waiting…" : "sackings off");
});
newClubs();
ui.tip("The clubs keep the same true skill every season. How often does the best one actually win?", 8000);
