# CFD Panel Method — Hess-Smith Solver

## Overview

A validated 2D panel method implementation for potential flow around arbitrary bodies, with real-time interactive visualisation.

### Physics Implementation

- **Hess-Smith panel method**: constant source + constant vortex panels
- **Linear system**: N no-penetration equations + Kutta condition per body
- **Proper panel integrals**: analytical integration of constant-strength panel influence, not point-source/vortex approximations
- **Kutta condition**: enforces equal pressure at upper/lower trailing edge, coupled into the linear system (not bolted on afterwards)
- **Pressure**: Bernoulli equation from tangential surface velocity
- **Streamlines**: RK4 integration of the velocity field
- **Validated**: 6/6 tests pass including cylinder Cp (machine precision), NACA 0012 lift slope (12.8% from thin-airfoil theory, correct for 12% thickness), NACA 2412 positive lift at α=0

### Geometry

- **NACA 4-digit generator** with cosine panel spacing (clusters at LE/TE)
- **Cylinder** and **square** obstacle generators
- **Arbitrary coordinate import** (Selig format .dat files)

### Visualisation

- Pressure field (diverging colourmap)
- Streamlines with RK4 integration
- Velocity vectors
- Particle advection
- Panel normals
- Cp distribution plot (upper/lower surface split)
- Lift coefficient and circulation readout

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Interactive (Pygame)
```bash
python main.py
```

Controls:
- ↑/↓: Adjust angle of attack
- S: Toggle streamlines
- P: Toggle pressure field
- N: Toggle panel normals
- ESC: Quit

### Static output (Matplotlib)
```bash
python main.py --static
```

### Run validation tests
```bash
python tests/test_panel_method.py
```

## Project Structure

```
├── main.py                          # Entry point (Pygame interactive / Matplotlib static)
├── requirements.txt
├── src/
│   └── simulation/
│       ├── panel_method.py          # Hess-Smith solver (core physics)
│       └── geometry.py              # NACA generator, panel creation
├── tests/
│   └── test_panel_method.py         # Validation against analytical solutions
└── cfd-artifact.html                # Standalone browser demo (same solver in JS)
```

## Theory

The Hess-Smith method solves Laplace's equation (∇²φ = 0) by distributing source and vortex singularities on body surfaces. Each panel carries:

- **Source strength σ_j** (varies per panel): satisfies no-penetration V·n = 0
- **Vortex strength γ_k** (one per body): satisfies Kutta condition at trailing edge

The influence of panel J on control point I is computed by analytical integration of the constant-strength distribution in panel J's local coordinate frame, then transformed to global coordinates and projected onto panel I's normal (for no-penetration) or tangent (for Kutta condition).

Key implementation detail: the **vortex self-influence on tangential velocity is −0.5** (outside limit for CCW-ordered panels), not +0.5. Getting this sign wrong produces nonsensical circulation values — this was the main bug in the original implementation.
