# Re-inject the tidy layout (tidy.css + tidy.js) and each simulation's settings (configs/<folder>.json) into its HTML.
# Run from this folder:  python3 apply.py              (every sim with a config)
#                        python3 apply.py enzymes waves (just these)
# Run it again after editing tidy.js / tidy.css, or after rebuilding a simulation from its parts.
import sys, json, glob, os, subprocess
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.normpath(os.path.join(D, '..', '..')) + '/'
names = sys.argv[1:] or [os.path.basename(f)[:-5] for f in sorted(glob.glob(D + '/configs/*.json'))]
for n in names:
    c = json.load(open(D + '/configs/' + n + '.json', encoding='utf-8'))
    subprocess.run([sys.executable, D + '/inject.py', R + c['path'], json.dumps(c['cfg'], ensure_ascii=False)], check=True)
