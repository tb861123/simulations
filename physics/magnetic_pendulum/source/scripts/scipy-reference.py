"""Independent Cartesian equations and SciPy DOP853; development validation only."""
import json, sys
import numpy as np
from scipy.integrate import solve_ivp
import scipy

cases = json.load(open(sys.argv[1], encoding="utf-8"))
results = []
for case in cases:
    p, s0, horizon = case["physics"], case["initial"], case["horizon"]
    def rhs(t, s):
        r, v = s[[0, 1, 6]], s[[2, 3, 7]]
        f = np.array([0., 0., -p["g"]]) - p["gamma"] * v
        for m in p["magnets"]:
            d = np.array([m["x"], m["y"], -p["L"]-p["h"]]) - r
            f += m["k"] * d / np.linalg.norm(d)**3
        a = f - (r @ f + v @ v) / p["L"]**2 * r
        return [v[0], v[1], a[0], a[1], p["gamma"]*(v @ v), np.hypot(v[0], v[1]), v[2], a[2]]
    sol = solve_ivp(rhs, (0., horizon), s0, method="DOP853", rtol=1e-12, atol=1e-14, max_step=.01)
    if not sol.success:
        raise RuntimeError(sol.message)
    lengths = np.linalg.norm(sol.y[[0, 1, 6]], axis=0)
    results.append({"name":case["name"], "state":sol.y[:, -1].tolist(), "evaluations":sol.nfev,
                    "maximumLengthError":float(np.max(np.abs(lengths-p["L"])))})
json.dump({"scipy":scipy.__version__, "method":"DOP853", "rtol":1e-12, "atol":1e-14,
           "max_step":.01, "cases":results}, open(sys.argv[2], "w", encoding="utf-8"), indent=2)
