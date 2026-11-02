"""Builds ../three-body-chaos-lab.zip: complete source, the production build, docs and the launcher,
EXCLUDING node_modules, dist, temporary caches and test screenshots.   Usage: python3 scripts/package.py"""
import os, zipfile, sys
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
out = os.path.join(root, 'three-body-chaos-lab.zip')
skip_dirs = {'node_modules', 'dist', '.tmp', '.git', '__pycache__'}
n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip_dirs]
        for f in files:
            p = os.path.join(d, f)
            if p == out or f.endswith('.log'): continue
            z.write(p, os.path.join('Three-Body Chaos Lab', os.path.relpath(p, root))); n += 1
print(f'wrote {out}: {n} files, {os.path.getsize(out)/1024:.0f} KiB')
