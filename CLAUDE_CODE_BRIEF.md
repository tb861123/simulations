# CFD Panel Method — Claude Code Polishing Brief

## Project Overview

This is a 2D CFD simulation implementing the Hess-Smith panel method for potential flow around arbitrary bodies, with real-time Pygame visualisation. It was developed iteratively in Claude.ai chat and is now at a functional-but-needs-polish stage.

**Run it:** `python main.py` (interactive Pygame) or `python main.py --static` (Matplotlib output)

**Test it:** `python tests/test_panel_method.py` → currently 6/6 passing

**Install:** `pip install -r requirements.txt`

---

## Architecture

```
main.py                              (1112 lines) — Pygame GUI, main loop, cached rendering
src/simulation/
  panel_method.py                    (330 lines)  — Hess-Smith solver (source + vortex panels, Kutta condition)
  geometry.py                        (430 lines)  — NACA 4-digit generator, image contour import, spline drawing tool, cylinder/square
  numba_kernels.py                   (446 lines)  — JIT-compiled velocity, particle advection, streamlines, rendering, wake dynamics
  vortex_wake.py                     (227 lines)  — Discrete vortex method: Kelvin shedding, Lamb-Oseen regularisation, merging
tests/
  test_panel_method.py               (139 lines)  — Validation: cylinder Cp (exact), NACA lift slope, far-field recovery
```

### Physics pipeline
1. Body geometry → panels (cosine-spaced for airfoils)
2. Hess-Smith linear system: N source strengths + 1 vortex strength per body, Kutta condition at trailing edge
3. Velocity field: panel integrals (analytical constant-strength formulation, not point-source approximation)
4. Pressure: Bernoulli equation from surface tangential velocity
5. Optional: discrete vortex wake shedding (Kelvin's theorem, Lamb-Oseen regularised)

### Performance pipeline
- Static layers (pressure field 400×400, 40 streamlines, velocity vectors) pre-rendered to cached surfaces on solve — zero per-frame cost
- Velocity grid (200×120) precomputed for O(1) bilinear particle interpolation
- Particle advection + collision + respawn in single @njit call
- Particle rendering via @njit pixel buffer with velocity-aligned streaks
- 50,000 particles at 40-60fps with Numba enabled

### GUI features
- Body types: NACA (6 presets) / Cylinder / Square / Image import / Interactive drawing tool
- Sliders: V∞, α (rotates geometry), panel count, chord
- Toggles: streamlines, pressure field, velocity vectors, particles, panel normals, Cp plot, vortex shedding
- Aerodynamic readouts: CL, Γ, CL(theory), panel count
- 16 tooltips (ⓘ hover/click) explaining every control and readout
- Drawing tool: click to place points, click first point to close, drag to reshape, right-click to delete
- Image import: tkinter file dialog, contour extraction via Moore boundary tracing

---

## Known Issues & Polish Needed

### Priority 1: Visual/UX bugs to fix
- **main.py is 1100 lines** — the UI widgets (Slider, Toggle, ButtonGroup, Dropdown, Button, TooltipManager) should be extracted to `src/ui/widgets.py`
- **Drawing tool edge cases**: self-intersecting shapes crash the spline interpolation; need to detect and warn. Shapes with < 3 points after deletion should reopen.
- **Wake toggle interaction**: toggling wake off should stop shedding but keep existing vortices visible (currently they vanish). Toggling back on should resume from current state.
- **Image import** needs Pillow auto-install like pygame/numba (currently just errors if missing)
- **Sidebar overflow**: when all sections are visible (NACA dropdown + sliders + 7 toggles + readouts), the content may extend past the bottom of the window on smaller screens. Consider scrolling or collapsible sections.

### Priority 2: Wake tuning
- **Vortex shedding rate**: currently sheds every frame, which may be too frequent. Consider shedding every N frames or based on a CFL-like criterion.
- **Core radius** (0.025): may need adjustment per body type — cylinders need larger cores than airfoils for stability.
- **Starting vortex**: the initial shed when wake is first enabled should be strong (full bound circulation) to show the starting vortex clearly. Currently it depends on the delta which is zero on the first frame.
- **Cylinder vortex street**: the current shedding only happens from the "trailing edge" (panels[0] and panels[-1]), which for a cylinder is arbitrary. For bluff bodies, need to add separation point shedding — either at fixed angular positions (±80° from stagnation for Re ~ 100) or based on a pressure gradient criterion.
- **Performance with many wake vortices**: N² mutual interaction in `_advect_wake_jit` means 2000 vortices = 4M operations per frame. Profile and consider fast multipole method or simply capping at 500 active vortices with aggressive merging.

### Priority 3: Code quality
- **Type hints** are inconsistent — some functions have them, some don't
- **Docstrings** in main.py are sparse (the module-level docstring is good, but most functions lack them)
- **Magic numbers** throughout main.py (colours, positions, sizes) should be collected into a theme/config dict
- **The `s` parameter convention** in widget classes (`def __init__(s,...)`) is unusual — consider renaming to `self` for readability
- **Error handling**: solver failures (singular matrix) silently fail. Should show a message in the UI.

### Priority 4: Features to add
- **Undo** for drawing tool (Ctrl+Z to remove last point)
- **Save/load** simulation state (body geometry, parameters) to JSON
- **Screenshot** button (save current canvas to PNG)
- **Cp comparison**: overlay thin-airfoil-theory Cp prediction on the Cp plot for direct comparison
- **Reynolds number display**: compute Re from V∞, chord, and a configurable kinematic viscosity

---

## Key Design Decisions to Preserve

1. **α rotates geometry, not freestream** — the solver always sees horizontal freestream (alpha=0). The NACA generator receives `angle_deg = -α` to produce the correct nose-up convention.

2. **Vortex self-influence sign** — the critical fix that makes the whole solver work: in the Kutta condition and surface velocity computation, the vortex tangential self-influence is **-0.5** (outside limit for CCW panels), not +0.5. This is verified by the cylinder Cp test (machine-precision accuracy).

3. **CCW panel ordering** — all geometry generators produce counterclockwise-ordered coordinates. The normal convention `(sin θ, -cos θ)` gives outward normals for CCW ordering.

4. **Velocity grid interpolation** — particles use bilinear interpolation from a precomputed 200×120 grid, completely decoupling particle count from panel count. The grid is rebuilt every 3 frames when wake shedding is active (to include free vortex contributions).

5. **Cached surface rendering** — pressure field, streamlines, velocity vectors, body outline, Cp plot are all pre-rendered to pygame.Surface objects on solve. The render loop just blits these surfaces. Only particles and wake vortices are drawn live per frame.

---

## How to start

1. Run `python main.py` and verify the GUI works — you should see a NACA 2412 airfoil at 5° with pressure field, streamlines, particles, and panel normals
2. Run `python tests/test_panel_method.py` and confirm 6/6 pass
3. Start with Priority 1 items — refactoring main.py into modules is the biggest single improvement to maintainability
4. Test the vortex shedding toggle — it should show vortices rolling off the trailing edge. If the wake blows up or looks wrong, the tuning parameters in Priority 2 are where to look
5. Try the drawing tool (select "Draw" body type) and the image import (select "Image") to find edge cases
