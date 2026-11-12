#!/bin/sh
# Re-run every batch experiment in every single-file simulation, then rebuild
# the worksheets. Needs Node.js with Playwright (npm install -g playwright)
# and Python 3. Takes about an hour; pass file paths to do just some.
cd "$(dirname "$0")"
ROOT=../..
FILES="$*"
# The ★ enhanced simulations (built by tools/kit) have no worksheets and are skipped: they carry a "Built from tools/kit" comment.
[ -z "$FILES" ] && FILES=$(ls $ROOT/*/*/*.html | grep -v -e worksheets.html -e '/index.html' | xargs grep -L 'Built from tools/kit')
for f in $FILES; do echo "$f"; done | xargs -P 3 -I{} sh -c 'node run-batch-experiments.js {} > /dev/null 2>&1 || echo "FAILED: {}"'
python3 make_worksheets.py
