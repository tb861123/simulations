# Re-inject the tidy layout (tidy.css + tidy.js), each simulation's settings (configs/<folder>.json)
# and the type-a-value-into-a-slider add-on (typein.js) into its HTML.
# Run from this folder:  python3 apply.py              (every sim with a config, then typein.js alone into
#                                                        every other standalone simulation page)
#                        python3 apply.py enzymes waves (just these)
# Run it again after editing tidy.js / tidy.css / typein.js, or after rebuilding a simulation from its parts.
# Kit-built (★ enhanced) pages are skipped: their sliders get the same feature from tools/kit/kit.js.
import sys, json, glob, os, subprocess
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.normpath(os.path.join(D, '..', '..')) + '/'
names = sys.argv[1:] or [os.path.basename(f)[:-5] for f in sorted(glob.glob(D + '/configs/*.json'))]
done = set()
for n in names:
    c = json.load(open(D + '/configs/' + n + '.json', encoding='utf-8'))
    if 'k-ctl' in open(R + c['path'], encoding='utf-8').read(): print('skipped (kit page)', c['path']); continue
    subprocess.run([sys.executable, D + '/inject.py', R + c['path'], json.dumps(c['cfg'], ensure_ascii=False)], check=True); done.add(c['path'])
if not sys.argv[1:]:
    for f in sorted(glob.glob(R + '*/*/*.html') + glob.glob(R + '*/*/original/*.html')):
        rel = f[len(R):]
        if rel.startswith('tools/') or rel.endswith('worksheets.html') or rel in done: continue
        s = open(f, encoding='utf-8').read()
        if 'k-ctl' in s or 'type="range"' not in s and 'type = "range"' not in s and "'range'" not in s: continue
        subprocess.run([sys.executable, D + '/inject.py', f, '--typein-only'], check=True)
