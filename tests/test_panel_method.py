"""
Validation tests for the Hess-Smith panel method.
"""
import numpy as np
import sys
sys.path.insert(0, '/home/claude/cfd-project/src')

from simulation.panel_method import HessSmithSolver
from simulation.geometry import make_cylinder_panels, make_naca_panels


def test_cylinder_cp():
    print("=" * 60)
    print("TEST 1: Cylinder Cp Distribution")
    print("=" * 60)
    panels = make_cylinder_panels(0.0, 0.0, 1.0, 128)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=0.0)

    max_err = rms_err = 0.0
    for p in panels:
        theta = np.arctan2(p.ym, p.xm)
        cp_exact = 1.0 - 4.0 * np.sin(theta) ** 2
        e = abs(p.cp - cp_exact)
        max_err = max(max_err, e)
        rms_err += e ** 2
    rms_err = np.sqrt(rms_err / len(panels))

    print(f"  Max Cp error: {max_err:.6f}  RMS: {rms_err:.6f}")
    ok = max_err < 0.05
    print(f"  PASS: {ok}\n")
    return ok


def test_cylinder_zero_lift():
    print("=" * 60)
    print("TEST 2: Cylinder Zero Lift")
    print("=" * 60)
    panels = make_cylinder_panels(0.0, 0.0, 1.0, 64)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=0.0)

    CL = solver.get_lift_coefficient(0, chord=2.0)
    print(f"  CL: {CL:.6f}")
    ok = abs(CL) < 0.05
    print(f"  PASS: {ok}\n")
    return ok


def test_naca0012_lift_slope():
    print("=" * 60)
    print("TEST 3: NACA 0012 Lift Slope (alpha=5)")
    print("=" * 60)
    panels = make_naca_panels("0012", n_panels=120, chord=1.0)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=np.radians(5.0))

    CL = solver.get_lift_coefficient(0, chord=1.0)
    CL_th = 2.0 * np.pi * np.radians(5.0)
    rel = abs(CL - CL_th) / CL_th
    print(f"  CL panel={CL:.4f}  CL theory={CL_th:.4f}  err={rel*100:.1f}%")
    ok = rel < 0.15
    print(f"  PASS: {ok}\n")
    return ok


def test_cambered_airfoil():
    print("=" * 60)
    print("TEST 4: NACA 2412 Lift at alpha=0")
    print("=" * 60)
    panels = make_naca_panels("2412", n_panels=100, chord=1.0)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=0.0)

    CL = solver.get_lift_coefficient(0, chord=1.0)
    print(f"  CL at alpha=0: {CL:.4f}")
    ok = CL > 0.05
    print(f"  PASS: {ok}\n")
    return ok


def test_far_field():
    print("=" * 60)
    print("TEST 5: Far-Field Velocity Recovery")
    print("=" * 60)
    panels = make_cylinder_panels(0.0, 0.0, 1.0, 64)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=0.0)

    u, v = solver.velocity_at(-20.0, 0.0)
    err = np.hypot(u - 1.0, v)
    print(f"  V=({u:.6f},{v:.6f})  err={err:.6f}")
    ok = err < 0.005
    print(f"  PASS: {ok}\n")
    return ok


def test_vectorised():
    print("=" * 60)
    print("TEST 6: Vectorised vs Scalar")
    print("=" * 60)
    panels = make_cylinder_panels(0.0, 0.0, 1.0, 32)
    solver = HessSmithSolver()
    solver.set_panels(panels, [(0, len(panels))])
    solver.solve(V_inf=1.0, alpha=0.0)

    X = np.array([[3.0, -2.0], [0.0, 5.0]])
    Y = np.array([[2.0, 1.5], [3.0, 0.1]])
    U, V = solver.velocity_field(X, Y)

    max_err = 0.0
    for i in range(2):
        for j in range(2):
            us, vs = solver.velocity_at(X[i, j], Y[i, j])
            max_err = max(max_err, np.hypot(U[i, j] - us, V[i, j] - vs))

    print(f"  Max discrepancy: {max_err:.1e}")
    ok = max_err < 1e-6
    print(f"  PASS: {ok}\n")
    return ok


if __name__ == "__main__":
    results = [
        test_cylinder_cp(),
        test_cylinder_zero_lift(),
        test_naca0012_lift_slope(),
        test_cambered_airfoil(),
        test_far_field(),
        test_vectorised(),
    ]
    print("=" * 60)
    print(f"RESULTS: {sum(results)}/{len(results)} passed")
    print("=" * 60)
