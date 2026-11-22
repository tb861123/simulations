/* =====================================================================
   THE GREAT DEPRESSION, 1929–1939
   Why did a stock-market crash become the worst depression in modern
   history, and what got countries out of it? A small model of an
   economy, a quarter of a year at a time, run for the USA or Germany.
     1. The Wall Street Crash (October 1929) destroys wealth: people and
        firms spend less.
     2. BANK RUNS: when depositors fear for their bank, they all try to
        withdraw at once, and even a sound bank fails. Each failure makes
        depositors elsewhere more afraid (contagion). Failed banks take
        deposits (money) with them, and frightened people hoard cash.
     3. Under the GOLD STANDARD the central bank cannot create money to
        replace what is lost, so the MONEY SUPPLY shrinks (by a third in
        the USA, 1929–33). Less money means less spending and falling
        prices (DEFLATION), which makes debts heavier in real terms.
     4. FISCAL POLICY: governments that cut spending and raised taxes to
        balance the budget (Hoover 1932, Brüning 1930–32) took more
        spending out of the economy; deficit spending (the New Deal;
        Nazi public works and rearmament) put it back.
   Output responds to money's buying power (money ÷ prices), lost wealth,
   falling prices (debts) and fiscal policy; prices fall slowly when
   output is below its potential. Unemployment follows the gap between
   output and potential. The model is fitted roughly to US real GDP.
   ===================================================================== */
const clamp = K.clamp;
// what actually happened: year of leaving gold, year runs were stopped (bank holiday and deposit insurance / German bank guarantees),
// fiscal stance (−1 = austerity, 0 = neutral, +1 = deficit spending) from each date, capital withdrawal and money tightening
const HIST = {
  usa: { name: "USA", gold: 1933.25, insure: 1933.25, crash: 1929.75, capital: [], tight: [[1937.5, 1938.5]],
    fiscal: [[1929, 0], [1931.5, -0.5], [1933.25, 0.3], [1937, -0.6], [1938.5, 0.3]],
    events: [[1929.75, "Wall Street Crash"], [1930.75, "first banking panic"], [1932, "Revenue Act raises taxes"], [1933.25, "Roosevelt: bank holiday, off gold, New Deal"], [1934, "deposit insurance (FDIC)"], [1937.5, "budget cuts, reserves doubled"], [1938.5, "spending resumes"]] },
  ger: { name: "Germany", gold: 1931.5, insure: 1932, crash: 1929.75, capital: [[1929.5, 1932.75]], tight: [],
    fiscal: [[1929, 0], [1930.25, -1], [1932.5, 0], [1933.25, 1.5]],
    events: [[1929.5, "American loans recalled"], [1929.75, "Wall Street Crash"], [1930.25, "Brüning: cuts by decree"], [1931.5, "banking crisis; exchange controls"], [1932.5, "Papen: first work schemes"], [1933.25, "Hitler: public works, rearmament"]] }
};
// historical figures to compare (approximate): US real GDP (1929 = 100) and unemployment (%), German registered unemployed (millions)
const DATA = {
  usa: { Y: [[1929.5, 100], [1930.5, 91.4], [1931.5, 85.5], [1932.5, 74.6], [1933.5, 73.6], [1934.5, 81.3], [1935.5, 88.6], [1936.5, 100], [1937.5, 105.3], [1938.5, 101.4], [1939.5, 109.6]],
         U: [[1929.5, 3.2], [1930.5, 8.7], [1931.5, 15.9], [1932.5, 23.6], [1933.5, 24.9], [1934.5, 21.7], [1935.5, 20.1], [1936.5, 16.9], [1937.5, 14.3], [1938.5, 19], [1939.5, 17.2]] },
  ger: { U: [[1929.5, 1.9], [1930.5, 3.1], [1931.5, 4.5], [1932.5, 5.6], [1933.5, 4.8], [1934.5, 2.7], [1935.5, 2.2], [1936.5, 1.6], [1937.5, 0.9], [1938.5, 0.4]] }
};
const NAZI_VOTE = [[1928.4, 2.6], [1930.7, 18.3], [1932.55, 37.3], [1932.85, 33.1], [1933.2, 43.9]];
const unemployedM = U => 0.2 * U;                         // Germany: about 20 million insured workers, so 1% = 0.2 million
const extremistVote = U => clamp(1.6 * U - 11, 2.6, 60);  // rough straight-line fit of the Nazi vote to unemployment, 1928–32 (correlation, not proof of cause)
/* run the economy. o = { country, gold, insure, fiscalChoice (null = as it happened), det (no randomness: expected bank failures) } */
function depression(o, r) {
  const H = HIST[o.country], out = [];
  const fiscalAt = y => { if (o.fiscalChoice != null && y >= 1930) return o.fiscalChoice; let f = 0; for (const [t, v] of H.fiscal) if (y >= t) f = v; return f; };
  let Y = 100, Yp = 100, P = 1, conf = 1, banks = 100, cratio = 0.09, pi = 0, wealth = 1, failedTot = 0;
  for (let q = 0; q < 44; q++) {
    const yr = 1929 + q / 4, outflow = H.capital.some(([a, b]) => yr >= a && yr < b);
    // 1. the crash wipes out a fifth of wealth; it recovers only slowly
    if (Math.abs(yr - H.crash) < 0.01) wealth = 0.8;
    wealth += (1 - wealth) * 0.01;
    // 2. bank runs: each bank's chance of a run grows as depositors lose confidence. Insurance / a lender of last resort stops runs.
    const insured = yr >= o.insure, pRun = insured ? 0.002 : Math.min(0.5, 0.003 + 0.25 * (1 - conf) + (outflow ? 0.01 : 0));
    let fails = 0; if (o.det) fails = banks * pRun; else for (let b = 0; b < Math.round(banks); b++) if (r() < pRun) fails++;
    banks -= fails; failedTot += fails;
    // confidence falls with each failure and with hard times, and slowly recovers; insurance restores it quickly
    conf = clamp(insured ? conf + (1 - conf) * 0.3 : conf - 0.9 * fails / 100 + (1 - conf) * 0.05 - (Y < Yp * 0.92 ? 0.01 : 0), 0, 1);
    // 3. money = monetary base × money multiplier. Frightened people hold more cash (c); banks hold more reserves when ordered to (1937)
    cratio += ((0.09 + 0.12 * (1 - conf)) - cratio) * 0.5;
    const off = yr >= o.gold, tight = H.tight.some(([a, b]) => yr >= a && yr < b);
    const base = off ? Math.pow(1.012, (yr - o.gold) * 4) : 1;           // off gold, the base grows about 5% a year
    const mult = (1 + cratio) / (cratio + (tight ? 0.16 : 0.1)), mult0 = (1 + 0.09) / (0.09 + 0.1);
    const M = base * mult / mult0 * Math.pow(banks / 100, 0.35);              // failed banks take deposits with them
    // 4. spending: money's buying power (M ÷ P), lost wealth, heavier debts when prices fall, fiscal policy, capital leaving the country
    const f = fiscalAt(yr);
    const AD = Yp * (1 + 0.6 * Math.log(M / P)) + 100 * (wealth - 1) + 30 * (P - 1) * (P < 1 ? 1 : 0.2) + 5 * f - (outflow ? 6 : 0);
    const target = AD > Yp ? Yp + 0.3 * (AD - Yp) : AD;                       // above potential, extra spending mostly raises prices
    Y += 0.35 * (target - Y);
    // 5. prices fall slowly when output is below potential, rise faster above it
    pi = 0.5 * pi + (Y > Yp ? 0.06 : 0.02) * (Y - Yp) / Yp; P *= Math.exp(pi);
    Yp *= 1.006;                                                             // potential output grows about 2.4% a year
    const U = Math.max(2, 3 + 0.7 * (Yp - Y) / Yp * 100);
    out.push({ yr, Y, Yp, P, M, U, banks, fails, conf, f, cash: cratio });
  }
  return { out, failedTot };
}
const histOpts = c => ({ country: c, gold: HIST[c].gold, insure: HIST[c].insure, fiscalChoice: null });
const avgY = (s, a, b) => { const q = s.out.filter(x => x.yr >= a && x.yr < b); return q.reduce((t, x) => t + x.Y, 0) / q.length; };
const peakU = s => Math.max(...s.out.map(x => x.U));

// ---------------- The page ----------------
const P = { country: "usa", mode: "hist", gold: 1933.25, insure: 1933.25, fiscal: 0, speed: 2 };
let rnd = K.rng(Date.now() % 99991 + 5), RUN = null, tq = 0;
const ui = K.app({
  title: "The Great Depression", subject: "History",
  blurb: "Crash, bank runs, gold and austerity: why 1929 became a world depression, and what ended it",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "GCSE History: the Wall Street Crash and the Depression in the USA (Hoover and Roosevelt's New Deal), and the Depression in Germany and the rise of the Nazis (unemployment and the Nazi vote, 1928–33).",
      adv: "OCR A level History A (H505) Y221 Democracy and dictatorships in Germany 1919–1963 (the Depression, Brüning's deflationary policy, the rise of the Nazis, the Nazi economic recovery) and Y113 Britain 1930–1997 context (leaving gold, 1931). AO1 causation and the significance of policy choices; AO3 interpretations (Keynes; Friedman and Schwartz; the 'Borchardt debate' on Brüning)."
    }
  },
  missions: [
    { title: "From crash to depression", q: "Run the USA as it happened. Watch the banks and the money bar. When does output fall fastest: right after the crash, or later?", hint: "The crash causes a recession, but the steepest fall comes in 1931–33, when waves of bank runs destroy deposits and the money supply shrinks by about a third. In reality about 9,000 of 25,000 US banks failed (in the model about half). Output fell by a quarter and unemployment reached about 25%. The model follows the real figures (dots) roughly.", setup() { set({ country: "usa" }); } },
    { title: "What if the Fed had stopped the runs?", q: "Choose 'Your choices' and set deposit insurance (or a lender of last resort) from 1930. Keep everything else as it was. How deep is the depression now?", hint: "With no bank runs, money barely falls, and the depression is a sharp recession rather than a catastrophe. This is Friedman and Schwartz's argument (1963): the Federal Reserve turned a recession into the Great Depression by letting the banks fail. Ben Bernanke, later chair of the Fed, agreed in 2002: 'we did it. We're very sorry.'", setup() { set({ country: "usa", mode: "choice", insure: 1930, gold: 1933.25, fiscal: 0 }); } },
    { title: "The golden fetters", q: "Leave gold early (1931, when Britain did) and compare with staying on until 1933 or 1936. Which countries recovered first in reality?", hint: "Leaving gold lets the central bank create money, so spending and prices recover. Britain left in September 1931 and recovered from 1932; the USA left in 1933 and recovered from then; France stayed on until 1936 and stayed depressed longest. Eichengreen called the gold standard the 'golden fetters'.", setup() { set({ country: "usa", mode: "choice", gold: 1931.75, insure: 1933.25, fiscal: 0 }); } },
    { title: "The 1937 recession", q: "Watch 1937–38 in the USA. What policies caused a second slump in the middle of the recovery?", hint: "In 1937 Roosevelt cut spending to balance the budget and the Fed doubled banks' reserve requirements: money and spending fell, and unemployment jumped from about 14% to 19%. It suggests the New Deal recovery depended on the stimulus continuing.", setup() { set({ country: "usa" }); tq = 30; } },
    { title: "Germany: Brüning's austerity", q: "Switch to Germany as it happened. Watch unemployment and the estimated extremist vote. Then choose 'Your choices' with neutral or deficit spending from 1930. What changes?", hint: "Brüning cut spending and wages by decree to balance the budget and keep the mark on gold (and to show Germany could not pay reparations). With foreign loans recalled and banks failing in 1931, unemployment rose to about 6 million. Without the cuts, unemployment peaks lower and the estimated Nazi vote is smaller, though Brüning's defenders (Borchardt) argue he had no real choice.", setup() { set({ country: "ger" }); } },
    { title: "Hitler's recovery", lvl: "adv", q: "In Germany as it happened, unemployment falls fast after 1933. Which part of the model does this? Was the recovery an economic miracle?", hint: "Large deficit spending (public works, then rearmament) and exchange controls (off gold in practice) push spending up, so unemployment falls quickly (helped by removing women and Jews from the figures, and conscription, which the model leaves out). It was not a miracle: any government spending that much would cut unemployment; the question is what it was spent on, and the bill (Mefo bills, the 1936 crisis, the drive to war).", setup() { set({ country: "ger" }); tq = 18; } }
  ],
  batch: [
    { title: "Leave gold sooner?", question: "How deep was the US depression, depending on when it left the gold standard?", how: "USA, everything else as it happened (runs stopped in 1933, fiscal policy as it was). Mean output 1932–34. Random bank runs. Theory: the same run with the expected number of failures (no luck).", xLabel: "year the USA leaves gold", yLabel: "output 1932–34 (1929 = 100)", xs: [1930, 1931, 1931.75, 1932.5, 1933.25, 1934, 1936], reps: 12, theory: x => avgY(depression(Object.assign(histOpts("usa"), { gold: x, det: true })), 1932, 1935), theoryLabel: "expected", run: (x, r) => avgY(depression(Object.assign(histOpts("usa"), { gold: x }), r), 1932, 1935), note: "The earlier the country leaves gold, the sooner money stops falling and the shallower the depression. In the model, leaving in 1930 raises output in 1932–34 from about 78 to 86 (1929 = 100). Leaving gold could not stop the bank runs on its own, which is why even the 1930 point is well below 100." },
    { title: "Stop the bank runs in 1930?", question: "How many banks fail with deposit insurance from 1930, rather than 1933?", how: "USA. 0 = runs stopped in 1933 (as happened), 1 = from 1930. Banks failed (% of all banks; 100 model banks stand for about 25,000 real ones). Theory: expected failures.", xLabel: "runs stopped from 1930 (1 = yes)", yLabel: "banks failed (%)", xs: [0, 1], reps: 15, yMin: 0, theory: x => depression(Object.assign(histOpts("usa"), { insure: x ? 1930 : 1933.25, det: true })).failedTot, theoryLabel: "expected", run: (x, r) => depression(Object.assign(histOpts("usa"), { insure: x ? 1930 : 1933.25 }), r).failedTot, note: "Most failures happened in panics that fed on themselves. Stopping the runs early saves most of the banks, which is the core of Friedman and Schwartz's case against the Federal Reserve." },
    { title: "Austerity or spending in Germany?", question: "How high does German unemployment go, depending on fiscal policy from 1930?", how: "Germany, gold, loans and bank crisis as they happened; fiscal stance from 1930 swept from −1 (cuts, as Brüning) to +1.5 (heavy deficit spending). Peak unemployment in millions. Theory: expected.", xLabel: "fiscal stance from 1930 (−1 cuts, +1 deficit)", yLabel: "peak unemployed (millions)", xs: [-1, -0.5, 0, 0.5, 1, 1.5], reps: 6, yMin: 0, theory: x => unemployedM(peakU(depression(Object.assign(histOpts("ger"), { fiscalChoice: x, det: true })))), theoryLabel: "expected", run: (x, r) => unemployedM(peakU(depression(Object.assign(histOpts("ger"), { fiscalChoice: x }), r))), note: "Cuts deepen the slump; spending softens it. Whether Brüning could have spent more is the 'Borchardt debate': with no foreign lenders, a Reichsbank bound by the Young Plan and memories of the 1923 hyperinflation, his room to borrow was small." },
    { title: "Unemployment and the Nazi vote", question: "If 1932 went as it did, what Nazi vote does the unemployment–vote line predict for July 1932?", how: "Germany as it happened; unemployment in the second quarter of 1932 put through the rough straight-line fit (vote = 1.6 × unemployment % − 11). Compare with the real July 1932 result.", reps: 200, bins: 20, yLabel: "estimated Nazi vote, July 1932 (%)", theory: 37.3, theoryLabel: "actual July 1932", run: (x, r) => extremistVote(depression(histOpts("ger"), r).out[13].U), note: "The fit is rough, and a correlation is not proof that unemployment caused the Nazi vote. In fact the unemployed themselves tended to vote Communist; the Nazis did best among the Protestant middle classes and farmers who feared ruin. Historians use such figures with care." },
    { title: "How much was bad luck?", question: "With the US policies as they were, how much does the depth of the slump vary with the luck of the bank runs?", how: "USA as it happened, 200 runs; output in 1933 (annual average, 1929 = 100). Compare with the real figure, about 74.", reps: 200, bins: 22, yLabel: "output in 1933 (1929 = 100)", theory: 73.6, theoryLabel: "real 1933", run: (x, r) => avgY(depression(histOpts("usa"), r), 1933, 1934), note: "Bank panics are partly a matter of chance: a few early failures can spread or not. But almost every run gives a deep depression: with the policies of 1929–33, a severe slump was very likely." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Causes", text: "Long-term weaknesses in the US economy (overproduction, unequal incomes, buying shares on the margin, weak banks); the Wall Street Crash (October 1929) as the trigger; bank failures and falling demand made it a depression." },
      { lvl: "std", tag: "USA", text: "Hoover believed in limited government ('rugged individualism'), set up the RFC (1932) but raised taxes in 1932. Roosevelt's New Deal (1933): the bank holiday and Emergency Banking Act, leaving gold, alphabet agencies (CCC, PWA, WPA, TVA), deposit insurance (FDIC), Social Security (1935). Unemployment fell but was still 17% in 1939." },
      { lvl: "std", tag: "Germany", text: "The Depression hit Germany hard because its recovery depended on American loans (Dawes Plan 1924), which were recalled. Unemployment reached about 6 million in 1932. The Nazi vote rose from 2.6% (1928) to 18.3% (1930) and 37.3% (July 1932)." },
      { lvl: "std", tag: "Using models", text: "A model lets historians ask 'what if?' (counterfactuals): what if the runs had been stopped, or gold abandoned earlier? The answer depends on the model's assumptions, which economists still debate." },
      { lvl: "adv", tag: "Y221", text: "Brüning (1930–32) governed by presidential decree (Article 48): cut wages, salaries and benefits, raised taxes, kept the mark on gold and aimed to end reparations (Hoover Moratorium 1931, Lausanne 1932). The banking crisis (Danatbank, July 1931) led to exchange controls." },
      { lvl: "adv", tag: "Y221", text: "Nazi recovery: Schacht's New Plan, Mefo bills, public works (autobahns, the Reinhardt Programme), rearmament; then Göring's Four-Year Plan (1936) for autarky. Unemployment fell from 4.8 million (1933) to under 0.5 million (1938), helped by conscription and by removing women and Jews from the figures." },
      { lvl: "adv", tag: "AO3", text: "Keynes (1936): demand had collapsed; governments should spend. Friedman and Schwartz (1963): the Federal Reserve let the money supply collapse. Eichengreen (1992): the gold standard spread and deepened the slump. Borchardt (1979): Brüning had no real alternative; critics (Holtfrerich) disagree." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Money multiplier = (1 + c) ÷ (c + r): when people hoard cash (c up) or banks hoard reserves (r up), the money supply falls even if the central bank does nothing. Debt deflation (Irving Fisher, 1933): falling prices raise the real burden of debts." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain why the Wall Street Crash led to a depression in the USA.", ans: "<ul><li>people lost savings and confidence, so spent less; firms cut production and jobs</li><li>banks that had lent for shares or lost deposits failed; depositors rushed to withdraw (bank runs)</li><li>bank failures destroyed savings and cut lending, so spending fell further</li><li>falling demand meant more unemployment: a downward spiral</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const q = RUN ? RUN.out[Math.min(43, Math.floor(tq))] : null; return `In the simulation it is ${q ? Math.floor(q.yr) : "–"} and ${q ? Math.round(100 - q.banks) : "–"}% of banks have failed. Explain how bank failures reduce spending in the economy.`; }, ans: "<ul><li>deposits in failed banks are lost, so people have less money</li><li>others withdraw cash and keep it at home, and banks lend less</li><li>so the money supply falls, and people and firms spend less</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain why the Depression helped the Nazis gain support.", ans: "<ul><li>about 6 million unemployed by 1932; despair and fear among the middle classes and farmers</li><li>Weimar governments seemed unable to help (Brüning's cuts; rule by decree)</li><li>the Nazis promised work and bread, blamed Versailles, Jews and communists</li><li>votes rose from 2.6% (1928) to 37.3% (July 1932)</li></ul>" },
      { lvl: "adv", marks: 12, q: "'The policies of governments and central banks, rather than the Wall Street Crash, made the Depression so severe.' How far do you agree?", ans: "<ul><li>for the crash: wealth and confidence lost; it exposed weaknesses (margin buying, overproduction, inequality)</li><li>for policy: the Fed let banks fail and money shrink (Friedman and Schwartz); the gold standard spread the slump and blocked recovery (Eichengreen); austerity (Hoover's 1932 tax rise, Brüning) deepened it; Smoot–Hawley tariffs cut trade</li><li>evidence: countries recovered once they left gold (Britain 1931, USA 1933); the 1937 tightening caused a relapse</li><li>model: stopping runs in 1930 or leaving gold early greatly reduces the depth</li><li>judgement: the crash was the trigger, policy decided the scale</li></ul>" },
      { lvl: "adv", marks: 4, q: "The money multiplier is (1 + c) ÷ (c + r). If c rises from 0.09 to 0.2 with r = 0.1, by what proportion does the money supply fall (for the same monetary base)?", ans: "<ul><li>before: 1.09 ÷ 0.19 = 5.74</li><li>after: 1.2 ÷ 0.3 = 4.0</li><li>4.0 ÷ 5.74 = 0.70</li><li>a fall of about 30%</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>One economy, a quarter of a year at a time from 1929 to 1939. <b>Banks</b>: 100 model banks (each standing for about 250 real US banks). Each quarter every bank faces a run with a chance that grows as depositors' confidence falls; a run means failure. Confidence falls with every failure (contagion) and in hard times, and recovers slowly; once runs are stopped (bank holiday, deposit insurance or a lender of last resort) the chance of a run is tiny and confidence returns. <b>Money</b> = monetary base × money multiplier (1 + c) ÷ (c + r), times a factor for deposits lost in failed banks; frightened people hold more cash (c rises). On gold the base is fixed; off gold it grows about 5% a year. <b>Spending</b> depends on money's buying power (money ÷ prices), wealth lost in the crash, the real burden of debts when prices fall, fiscal policy (−1 cuts to +1.5 heavy deficit spending) and, for Germany, the recall of American loans. Output moves part of the way to spending each quarter; prices fall slowly when output is below potential. Unemployment rises 0.7 points for each 1% that output is below potential.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>One country at a time: no trade, tariffs (Smoot–Hawley 1930) or the spread of the crisis through the gold standard between countries, which historians think was central.</li>
<li>The numbers are fitted roughly to US real GDP and then reused for Germany with German events. Germany's real slump differed in many ways (reparations, the 1923 memory of hyperinflation, the political crisis).</li>
<li>Banks are identical and fail only by runs. Bad loans, agricultural debts and fraud are left out.</li>
<li>Fiscal policy is one number. In reality what money was spent on mattered (public works against rearmament), and Nazi unemployment figures were manipulated (women, Jews, conscription).</li>
<li>The 'extremist vote' line is a rough fit to four elections: a correlation, not a cause, and the unemployed mostly voted Communist.</li>
<li>Historical figures are approximate: US real GDP and unemployment (Lebergott's estimates), German registered unemployed (millions).</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Country");
ctl.country = K.seg(g, { value: "usa", options: [["usa", "🇺🇸 USA"], ["ger", "🇩🇪 Germany"]], on: v => { P.country = v; if (P.mode === "hist") histChoices(); restart(); } });
ctl.mode = K.seg(g, { value: "hist", options: [["hist", "As it happened"], ["choice", "Your choices"]], on: v => { P.mode = v; if (v === "hist") histChoices(); restart(); } });
g = ui.group("Your choices (from 1930)");
const choiceGroup = g;
const yrFmt = v => v >= 1939.75 ? "never" : ["Q1", "Q2", "Q3", "Q4"][Math.round((v % 1) * 4)] + " " + Math.floor(v);
ctl.gold = K.slider(g, { label: "Leave the gold standard", min: 1929.75, max: 1939.75, step: 0.25, value: P.gold, fmt: yrFmt, tip: "Britain left in September 1931, the USA in April 1933, France in 1936", on: v => { P.gold = v >= 1939.75 ? 9999 : v; toChoice(); } });
ctl.insure = K.slider(g, { label: "Stop bank runs (insurance, lender of last resort)", min: 1929.75, max: 1939.75, step: 0.25, value: P.insure, fmt: yrFmt, on: v => { P.insure = v >= 1939.75 ? 9999 : v; toChoice(); } });
ctl.fiscal = K.seg(g, { label: "Fiscal policy", value: 0, options: [[-1, "Cuts"], [0, "Neutral"], [1, "Deficit spending"], [1.5, "Heavy spending"]], on: v => { P.fiscal = v; toChoice(); } });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 8, step: 0.5, value: P.speed, fmt: v => v + " quarters a second", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
let row = K.row(g); K.btn(row, "↺ Run again", () => restart(), "primary"); K.btn(row, "⏭ Jump to 1939", () => tq = 43);
const read = K.readout(g, [["yr", "date"], ["Y", "output (1929 = 100)"], ["U", "unemployment"], ["b", "banks failed"], ["P", "prices (1929 = 100)"], ["M", "money supply (1929 = 100)"]]);
function histChoices() { const H = HIST[P.country]; P.gold = H.gold; P.insure = H.insure; ctl.gold.set(P.gold); ctl.insure.set(P.insure); }
function toChoice() { if (P.mode !== "choice") { P.mode = "choice"; ctl.mode.set("choice"); } restart(); }
function restart() { RUN = depression(P.mode === "hist" ? histOpts(P.country) : { country: P.country, gold: P.gold, insure: P.insure, fiscalChoice: P.fiscal }, rnd); tq = 0; }
function set(o) { Object.assign(P, { country: "usa", mode: "hist", fiscal: 0, speed: 2 }, o); ctl.country.set(P.country); ctl.mode.set(P.mode); if (P.mode === "hist") histChoices(); else { ctl.gold.set(Math.min(P.gold, 1939.75)); ctl.insure.set(Math.min(P.insure, 1939.75)); } ctl.fiscal.set(P.fiscal); ctl.speed.set(P.speed); restart(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Output (real GDP, 1929 = 100)", xLabel: "year", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Unemployment", xLabel: "year", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, n = Math.min(43, Math.floor(tq)), q = RUN.out[n], H = HIST[P.country];
  c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); c.textAlign = "left";
  c.font = "600 16px " + FONT; c.fillStyle = "#eef2f8"; c.fillText(`${H.name}, ${["spring", "summer", "autumn", "winter"][n % 4]} ${Math.floor(q.yr)}`, 24, 32);
  c.font = "12px " + FONT; c.fillStyle = "#aab6cc"; c.fillText(P.mode === "hist" ? "Policies as they happened" : "Your policies from 1930", 24, 50);
  // banks: 100 small buildings; red = failed, amber = facing a run this quarter
  const bx = 24, by = 78, bw = Math.min(26, (w * 0.5 - 30) / 10); c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Banks (each = about 250 real banks)", bx, by - 8);
  const failed = 100 - Math.round(q.banks), runNow = Math.round(q.fails);
  for (let i = 0; i < 100; i++) { const x = bx + (i % 10) * bw, y = by + Math.floor(i / 10) * bw * 0.9, dead = i >= 100 - failed, run = !dead && i >= 100 - failed - runNow;
    c.fillStyle = dead ? "#5a2630" : run ? "#ffb347" : "#7fb3e3"; c.beginPath(); c.moveTo(x + 2, y + bw * 0.35); c.lineTo(x + bw / 2, y + 2); c.lineTo(x + bw - 2, y + bw * 0.35); c.fill(); c.fillRect(x + 4, y + bw * 0.35, bw - 8, bw * 0.45); }
  // money: deposits and cash, compared with 1929
  const mx = bx + bw * 10 + 40, mw = w - mx - 30; c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Money supply (dashed line = 1929)", mx, by - 8);
  c.strokeStyle = "#3a4560"; c.strokeRect(mx, by, mw, 30); c.fillStyle = "#7fe3a0"; c.fillRect(mx, by, mw * clamp(q.M, 0, 1.5) / 1.5, 30); c.strokeStyle = "#ffd166"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(mx + mw / 1.5, by - 4); c.lineTo(mx + mw / 1.5, by + 34); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#0b1020"; c.font = "600 12px " + FONT; c.fillText(Math.round(q.M * 100) + "", mx + 6, by + 20);
  c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText(`people keep ${(q.cash * 100).toFixed(0)} in cash for every 100 in the bank`, mx, by + 48);
  c.fillText(`depositors' confidence ${Math.round(q.conf * 100)}% · prices ${Math.round(q.P * 100)} (1929 = 100)`, mx, by + 66);
  c.fillText(`gold standard: ${q.yr >= (P.mode === "hist" ? H.gold : P.gold) ? "left (money can grow)" : "on (money cannot grow)"} · bank runs: ${q.yr >= (P.mode === "hist" ? H.insure : P.insure) ? "stopped" : "possible"}`, mx, by + 84);
  c.fillText(`fiscal policy: ${q.f < -0.2 ? "cuts" : q.f > 1.2 ? "heavy deficit spending" : q.f > 0.2 ? "deficit spending" : "neutral"}`, mx, by + 102);
  // the dole queue: one figure per 1% unemployed
  const qy = by + 140; c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText(P.country === "usa" ? `Unemployed: ${q.U.toFixed(0)}% (one figure = 1%)` : `Unemployed: ${unemployedM(q.U).toFixed(1)} million (one figure = 1%)`, mx, qy);
  const perRow = Math.max(5, Math.floor(mw / 18)); for (let i = 0; i < Math.round(q.U); i++) { const x = mx + 8 + (i % perRow) * 18, y = qy + 22 + Math.floor(i / perRow) * 30; c.fillStyle = "#c9a96a"; c.beginPath(); c.arc(x, y, 5, 0, 6.3); c.fill(); c.fillRect(x - 4, y + 6, 8, 14); }
  if (P.country === "ger") { c.fillStyle = "#ff8a95"; c.font = "13px " + FONT; c.fillText(`Estimated support for extremist parties: ${extremistVote(q.U).toFixed(0)}% (rough fit to 1928–32)`, mx, qy + 92); }
  // timeline of events
  const ty = h - 34, tx0 = 24, tx1 = w - 24, X = y => tx0 + (y - 1929) / 11 * (tx1 - tx0);
  c.strokeStyle = "#3a4560"; c.lineWidth = 2; c.beginPath(); c.moveTo(tx0, ty); c.lineTo(tx1, ty); c.stroke();
  for (let y = 1929; y <= 1940; y++) { c.fillStyle = "#7d8aa5"; c.font = "11px " + FONT; c.textAlign = "center"; c.fillText(y, X(y), ty + 16); }
  c.fillStyle = "#ff5d6c"; c.beginPath(); c.arc(X(q.yr), ty, 6, 0, 6.3); c.fill();
  const evs = (P.mode === "hist" ? H.events : H.events.filter(e => e[1].match(/Crash|loans|panic/))).filter(e => e[0] <= q.yr + 0.01);
  evs.forEach((e, i) => { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(X(e[0]), ty, 3.5, 0, 6.3); c.fill(); });
  if (evs.length) { const e = evs[evs.length - 1]; c.textAlign = "left"; c.fillStyle = "#ffd166"; c.font = "600 13px " + FONT; c.fillText(`${yrFmt(e[0])}: ${e[1]}`, 24, ty - 14); }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (dt > 0) tq = Math.min(43, tq + dt * P.speed); }, () => {
  draw(); if (frame++ % 4) return;
  const n = Math.min(43, Math.floor(tq)), pts = RUN.out.slice(0, n + 1), q = RUN.out[n], D = DATA[P.country];
  const ser = [{ pts: pts.map(x => [x.yr, x.Y]), color: "#5ab0ff", label: "model" }, { pts: pts.map(x => [x.yr, x.Yp]), color: "#7d8aa5", dash: [4, 4], width: 1.2, label: "potential" }];
  if (D.Y) ser.push({ pts: D.Y, type: "dots", color: "#ffd166", r: 4, label: "real" });
  chA.draw(ser, { xMin: 1929, xMax: 1940, yMin: 0, yMax: 130 });
  if (P.country === "usa") { chB.opts.title = "Unemployment (%)"; chB.draw([{ pts: pts.map(x => [x.yr, x.U]), color: "#c9a96a", label: "model" }, { pts: D.U, type: "dots", color: "#ffd166", r: 4, label: "real" }], { xMin: 1929, xMax: 1940, yMin: 0, yMax: 40 }); }
  else { chB.opts.title = "Unemployed (millions) and Nazi vote ÷ 10"; chB.draw([{ pts: pts.map(x => [x.yr, unemployedM(x.U)]), color: "#c9a96a", label: "model" }, { pts: D.U, type: "dots", color: "#ffd166", r: 4, label: "real unemployed" }, { pts: NAZI_VOTE.map(v => [v[0], v[1] / 10]), type: "dots", color: "#ff5d6c", r: 4, label: "Nazi vote % ÷ 10" }], { xMin: 1928, xMax: 1940, yMin: 0, yMax: 8 }); }
  read.set("yr", yrFmt(q.yr)); read.set("Y", q.Y.toFixed(0)); read.set("U", P.country === "usa" ? q.U.toFixed(1) + "%" : unemployedM(q.U).toFixed(1) + " million"); read.set("b", Math.round(100 - q.banks) + "%"); read.set("P", Math.round(q.P * 100)); read.set("M", Math.round(q.M * 100));
  ui.hud("");
});
set({});
ui.tip("Watch the banks fail and the money bar shrink. The dots on the graphs are the real figures.", 7000);
