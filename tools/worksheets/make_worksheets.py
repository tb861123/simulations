"""Build a printable worksheets.html for each simulation from the batch-run capture.

Input:  runs/<name>.json  (from batchall.js: question, set-up, results table, note)
Output: <subject>/<name>/worksheets.html beside each simulation

One A4 page per batch experiment for students (question, set-up, prediction,
results table to fill in, questions), then teacher notes with the explanation
and the numbers from a test run.
"""
import json, glob, html, os, re, sys

E = html.escape


def table_lines(text):
    """Tab-separated lines in the panel text = the results table."""
    return [l.split('\t') for l in text.split('\n') if '\t' in l]


def setup_rows(o):
    """Set-up as (label, value), dropping layout-only controls."""
    skip = re.compile(r'^(mode|show|error bars?|log|seed|random seed|batch seed|\?)$', re.I)
    rows = []
    for lab, val in o.get('setup') or []:
        lab = (lab or '').strip().rstrip(':')
        if not lab or skip.match(lab) or re.match(r'^b[_A-Z]', lab) or val in (None, ''):
            continue
        rows.append((lab, val))
    return rows


def get(rows, *keys):
    for lab, val in rows:
        if any(k in lab.lower() for k in keys):
            return val
    return None


def student_page(sim, o, k, n):
    rows = setup_rows(o)
    sweep = 'sweep' in (o.get('mode') or '').lower() or any(lab.lower() == 'from' for lab, _ in rows)
    rec = get(rows, 'record', 'outcome', 'measure') or 'the outcome'
    var = get(rows, 'change', 'setting to change', 'variable', 'vary')
    exact = lambda k: next((v for lab, v in rows if lab.strip().lower() == k), None)   # 'to' must not match 'Outcome to record'
    lo, hi = exact('from'), exact('to')
    tab = table_lines(o.get('text', ''))
    out = [f'<section class="sheet"><div class="top"><span>{E(sim["title"])} · Batch experiment {k} of {n}</span><span>Name ____________________ &nbsp; Date __________</span></div>']
    out.append(f'<h2>{E(o["qline"])}</h2>')
    if o.get('sub'):
        out.append(f'<p class="sub">{E(o["sub"])}</p>')
    out.append('<h3>1 · Set it up</h3><ol class="steps">'
               f'<li>Open <b>{E(os.path.basename(sim["file"]))}</b> and press <b>📊 Batch run</b>.</li>'
               f'<li>Click the experiment <b>“{E(o["qline"])}”</b>. It sets everything below for you.</li>'
               '<li>Press <b>▶ Run batch</b> and wait for it to finish.</li></ol>')
    if rows:
        out.append('<p class="setup">' + ' &nbsp;·&nbsp; '.join(f'<b>{E(a)}:</b> {E(str(b))}' for a, b in rows) + '</p>')
    out.append('<h3>2 · Predict before you run it</h3>')
    if sweep and var:
        out.append(f'<p>How do you think <b>{E(rec)}</b> will change as <b>{E(var)}</b> goes from {E(str(lo))} to {E(str(hi))}? Sketch it, then explain your reason.</p>'
                   '<div class="predict"><div class="axes"></div><div class="lines"></div></div>')
    else:
        out.append(f'<p>What average do you expect for <b>{E(rec)}</b>? Will every run give the same answer? Explain your reason.</p><div class="lines tall"></div>')
    out.append('<h3>3 · Record the results</h3>')
    if sweep:   # use the step-by-step table (the first row with several columns), not any summary rows above it
        start = next((k for k, r in enumerate(tab) if len(r) >= 4), None)
        if start is not None: tab = tab[start:]
    if tab and len(tab) > 1 and sweep:
        head = tab[0]
        body = tab[1:14]
        out.append(f'<table class="res{" dense" if len(body) > 10 else ""}"><tr>' + ''.join(f'<th>{E(h)}</th>' for h in head) + '</tr>' +
                   ''.join('<tr><td>' + E(r[0]) + '</td>' + '<td></td>' * (len(head) - 1) + '</tr>' for r in body) + '</table>')
        if len(tab) - 1 > 13:
            out.append('<p class="hint">Only the first 13 steps are listed; carry on in the space below if you need to.</p>')
    elif tab:
        out.append('<table class="res two">' + ''.join(f'<tr><th>{E(r[0])}</th><td></td></tr>' for r in tab[:9]) + '</table>')
    else:
        out.append('<div class="lines tall"></div>')
    out.append('<h3>4 · Think about it</h3><ol class="qs">')
    out.append('<li>Does the simulation agree with the theory? Use the <i>difference</i> (or how close the points are to the theory line) to say how well.</li>')
    if sweep:
        out.append('<li>Describe the pattern. Is it a straight line, a curve, or does it level off? If there is a log–log gradient, what does its value tell you?</li>')
    else:
        out.append('<li>Why don\'t all the runs give the same answer? What would happen to the standard error with four times as many runs?</li>')
    out.append('<li>Open <i>How the model works</i>. Name one simplification that could make the model differ from real life.</li></ol>'
               f'<div class="lines{" short" if sweep and len(tab) > 11 else ""}"></div></section>')
    return ''.join(out)


def teacher_notes(sim, outs):
    out = ['<section class="sheet teacher"><div class="top"><span>' + E(sim['title']) + ' · Teacher notes</span><span>Answers from a test run (fixed seed)</span></div>'
           '<h2>Teacher notes</h2><p class="sub">The results below come from one test run with the default seed, so a class should get the same numbers. A different seed gives slightly different values within the scatter.</p>']
    for k, o in enumerate(outs, 1):
        tab = table_lines(o.get('text', ''))
        note = o.get('note') or o.get('notePre') or ''
        # keep the explanation, drop any results table that came along with it
        note = '\n'.join(l for l in note.split('\n') if '\t' not in l and not re.match(r'^[\d.\s−-]+$', l)).strip()
        out.append(f'<div class="tn"><h3>{k} · {E(o["qline"])}</h3>')
        if note:
            out.append('<p>' + E(note).replace('\n', '<br>') + '</p>')
        if tab:
            w = max(len(r) for r in tab)
            out.append('<table class="res small">' + ''.join('<tr>' + ''.join(f'<td>{E(c)}</td>' for c in r) + '<td></td>' * (w - len(r)) + '</tr>' for r in tab[:16]) + '</table>')
        out.append('</div>')
    out.append('</section>')
    return ''.join(out)


CSS = """
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #d9dcd3; color: #111; font: 11pt/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.bar { position: sticky; top: 0; background: #14133b; color: #fff; padding: 8px 16px; display: flex; gap: 14px; align-items: center; z-index: 2; }
.bar b { font-size: 15px; } .bar span { opacity: .8; font-size: 13px; flex: 1; }
.bar button { font: inherit; background: #f1af28; color: #14133b; border: 0; border-radius: 6px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
.sheet { background: #fff; width: 210mm; min-height: 297mm; margin: 14px auto; padding: 12mm; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
.top { display: flex; justify-content: space-between; font-size: 9pt; color: #555; border-bottom: 2px solid #f1af28; padding-bottom: 4px; margin-bottom: 8px; }
h2 { font-size: 17pt; margin: 6px 0 2px; color: #14133b; }
h3 { font-size: 11pt; margin: 9px 0 3px; color: #14133b; text-transform: uppercase; letter-spacing: .03em; }
.sub { color: #333; margin: 0 0 4px; font-style: italic; }
.steps, .qs { margin: 2px 0 4px; padding-left: 20px; } .steps li, .qs li { margin: 2px 0; }
table { border-collapse: collapse; margin: 4px 0; }
.setup { font-size: 10pt; margin: 4px 0; color: #222; } .setup b { color: #14133b; }
.res { width: 100%; } .res th, .res td { border: 1px solid #888; padding: 3px 6px; height: 6.6mm; font-size: 10pt; }
.res.dense td, .res.dense th { height: 5.4mm; padding: 1px 6px; } .res th { background: #eef0e8; text-align: left; } .res.two { width: 60%; } .res.two th { width: 55%; }
.res.small td { height: auto; font-size: 8.5pt; padding: 1px 5px; } .res.small tr:first-child td { font-weight: 600; background: #eef0e8; }
.predict { display: flex; gap: 10px; } .axes { width: 56mm; height: 34mm; border-left: 2px solid #333; border-bottom: 2px solid #333; margin: 4px 0 4px 8px; flex: none; }
.lines { flex: 1; min-height: 18mm; background: repeating-linear-gradient(#fff 0 7.5mm, #bbb 7.5mm calc(7.5mm + 1px)); }
.lines.tall { min-height: 30mm; } .lines.short { min-height: 9mm; }
.hint { font-size: 9pt; color: #555; margin: 2px 0; }
.teacher .tn { break-inside: avoid; margin-bottom: 8px; } .teacher p { margin: 2px 0 4px; font-size: 10pt; }
@media print { body { background: #fff; } .bar { display: none; } .sheet { margin: 0; box-shadow: none; width: auto; min-height: 0; padding: 0; break-after: page; } }
"""

os.chdir(os.path.dirname(os.path.abspath(__file__)))   # runs/ lives next to this script

made = []
for f in sorted(glob.glob('runs/*.json')):
    if re.search(r'-x\d', f):
        continue
    d = json.load(open(f))
    name = os.path.basename(f)[:-5]
    outs = [o for o in d['out'] if o.get('qline')]
    if not outs:
        print('skip (no experiments)', name); continue
    src = open(d['file'], encoding='utf-8').read()
    m = re.search(r'<title>([^<]*)', src)
    sim = {'title': (m.group(1) if m else name).strip(), 'file': d['file']}
    pages = [student_page(sim, o, k, len(outs)) for k, o in enumerate(outs, 1)]
    doc = (f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
           f'<title>{E(sim["title"])} – Worksheets</title><style>{CSS}</style></head><body>'
           f'<div class="bar"><b>{E(sim["title"])} – worksheets</b><span>{len(outs)} batch experiments, one per page, then teacher notes. Print, or save as PDF.</span>'
           f'<a href="{E(os.path.basename(d["file"]))}" style="color:#f1af28">Open the simulation</a><button onclick="print()">Print</button></div>'
           + ''.join(pages) + teacher_notes(sim, outs) + '</body></html>')
    dest = os.path.join(os.path.dirname(d['file']), 'worksheets.html')
    open(dest, 'w', encoding='utf-8').write(doc)
    made.append((name, len(outs)))
print(len(made), 'worksheets:', ', '.join(f'{n} ({k})' for n, k in made))
