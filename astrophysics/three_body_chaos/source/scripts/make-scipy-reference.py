"""Independent cross-check: integrate tests/fixtures/ics.json with SciPy's DOP853 at rtol=1e-13, atol=1e-14
and write tests/fixtures/scipy-reference.json.  Needs numpy + scipy (offline, developers only)."""
import json, sys, numpy as np
from scipy.integrate import solve_ivp
cases = json.load(open('tests/fixtures/ics.json'))
out = []
for c in cases:
    m = np.array(c['m']); G = c['G']
    def f(t, y):
        r = y[:6].reshape(3, 2); a = np.zeros((3, 2))
        for i in range(3):
            for j in range(3):
                if i != j:
                    d = r[j] - r[i]; a[i] += G * m[j] * d / np.linalg.norm(d) ** 3
        return np.concatenate([y[6:], a.ravel()])
    sol = solve_ivp(f, [0, max(c['times'])], c['y0'], method='DOP853', rtol=1e-13, atol=1e-14, t_eval=c['times'])
    out.append({'name': c['name'], 'times': c['times'], 'states': sol.y.T.tolist(), 'scipy': __import__('scipy').__version__})
json.dump(out, open('tests/fixtures/scipy-reference.json', 'w'), indent=1)
print('wrote', len(out))
