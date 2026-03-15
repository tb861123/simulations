#!/usr/bin/env python3
"""
CFD Panel Method — High-Resolution Numba-Accelerated Simulation
================================================================
Features:
  - Hess-Smith panel method with Kutta condition
  - 50,000 particles via velocity grid interpolation (O(1) per particle)
  - 400×400 pressure field, 40 JIT streamlines, anti-aliased rendering
  - Interactive tooltips on all controls and readouts (ⓘ hover/click)
"""

import subprocess, sys, math, time, textwrap
from pathlib import Path

def _ensure(pkg, imp=None):
    imp = imp or pkg
    try: __import__(imp); return True
    except ImportError:
        print(f"  {pkg} not found — installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            __import__(imp); print(f"  ✓ {pkg}"); return True
        except Exception as e: print(f"  ✗ {pkg}: {e}"); return False

import numpy as np
sys.path.insert(0, str(Path(__file__).parent / "src"))
from simulation.panel_method import HessSmithSolver
from simulation.geometry import make_naca_panels, make_cylinder_panels, make_square_panels
from simulation.vortex_wake import VortexWake
from simulation.numba_kernels import (
    HAS_NUMBA, extract_panel_arrays, warmup_jit,
    _velocity_at_jit, _velocity_batch_jit,
    _build_velocity_grid_jit, _advect_particles_grid_jit,
    _compute_streamlines_jit, _render_particles_jit, _batch_spawn_jit,
    _advect_particles_jit,
)
# Conditional imports for vortex JIT kernels
try:
    from simulation.numba_kernels import (
        _vortex_velocity_at_jit, _advect_wake_jit,
        _build_velocity_grid_with_wake_jit,
    )
except ImportError:
    _vortex_velocity_at_jit = None
    _advect_wake_jit = None
    _build_velocity_grid_with_wake_jit = None

print("Checking dependencies...")
HAS_PYGAME = _ensure("pygame")
if HAS_PYGAME: import pygame; import pygame.surfarray; import pygame.gfxdraw
HAS_MPL = _ensure("matplotlib")
if HAS_MPL:
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
if not HAS_NUMBA: _ensure("numba")
print(f"  Numba JIT: {'✓ enabled' if HAS_NUMBA else '✗ disabled (pip install numba for 50-100x speedup)'}")
print()


# ============================================================
# COLOUR HELPERS
# ============================================================

def pressure_color_array(cp_arr):
    t = np.clip(cp_arr, -3.0, 1.5)
    r = np.empty_like(t); g = np.empty_like(t); b = np.empty_like(t)
    neg = t < 0; sn = np.clip(-t / 2.5, 0, 1)
    r[neg]=30+(1-sn[neg])*180; g[neg]=60+(1-sn[neg])*150; b[neg]=180+(1-sn[neg])*75
    pos = ~neg; sp = np.clip(t / 1.2, 0, 1)
    r[pos]=210+sp[pos]*45; g[pos]=210-sp[pos]*160; b[pos]=255-sp[pos]*220
    return np.stack([r, g, b], axis=-1).astype(np.uint8)

def pressure_color(cp):
    t = max(-3.0, min(1.5, cp))
    if t < 0: s=min(1,-t/2.5); return (int(30+(1-s)*180),int(60+(1-s)*150),int(180+(1-s)*75))
    s=min(1,t/1.2); return (int(210+s*45),int(210-s*160),int(255-s*220))


# ============================================================
# TOOLTIP SYSTEM
# ============================================================

class TooltipManager:
    """
    Manages ⓘ icons next to widgets. Hover or click to show a floating
    info panel with a detailed explanation.

    Usage:
        tm = TooltipManager(font)
        tm.register(rect, "Title", "Explanation text...")
        # In event loop:
        tm.handle_event(event)
        # After all other drawing:
        tm.draw(screen)
    """
    BG = (20, 28, 48, 240)
    BORDER = (59, 158, 255)
    TEXT = (210, 220, 235)
    TITLE_COL = (59, 158, 255)
    ICON_COL = (80, 110, 160)
    ICON_HOVER = (59, 158, 255)
    ICON_R = 7
    MAX_W = 260

    def __init__(self, font, small_font):
        self.font = font
        self.sfont = small_font
        self.items = []  # (icon_rect, title, lines[])
        self.active = None  # index of currently shown tooltip
        self.hover = None
        self.pinned = False  # True if clicked (stays open until click elsewhere)

    def register(self, anchor_rect, title, text):
        """Register a tooltip. The ⓘ icon is placed to the right of anchor_rect."""
        ix = anchor_rect.right + 4
        iy = anchor_rect.top + anchor_rect.height // 2 - self.ICON_R
        icon_rect = pygame.Rect(ix, iy, self.ICON_R * 2, self.ICON_R * 2)
        # Word-wrap text
        lines = []
        for paragraph in text.split('\n'):
            lines.extend(textwrap.wrap(paragraph, width=38))
            if not paragraph.strip():
                lines.append('')
        self.items.append((icon_rect, title, lines))

    def register_at(self, x, y, title, text):
        """Register a tooltip at an explicit (x, y) position for the ⓘ icon."""
        icon_rect = pygame.Rect(x, y, self.ICON_R * 2, self.ICON_R * 2)
        lines = []
        for paragraph in text.split('\n'):
            lines.extend(textwrap.wrap(paragraph, width=38))
            if not paragraph.strip():
                lines.append('')
        self.items.append((icon_rect, title, lines))

    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            mx, my = event.pos
            self.hover = None
            for i, (rect, _, _) in enumerate(self.items):
                if rect.collidepoint(mx, my):
                    self.hover = i
                    if not self.pinned:
                        self.active = i
                    break
            else:
                if not self.pinned:
                    self.active = None

        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            mx, my = event.pos
            clicked_icon = False
            for i, (rect, _, _) in enumerate(self.items):
                if rect.collidepoint(mx, my):
                    if self.pinned and self.active == i:
                        self.pinned = False
                        self.active = None
                    else:
                        self.active = i
                        self.pinned = True
                    clicked_icon = True
                    break
            if not clicked_icon and self.pinned:
                # Check if click is inside the tooltip panel itself
                if self.active is not None:
                    panel_rect = self._get_panel_rect(self.active)
                    if panel_rect and not panel_rect.collidepoint(mx, my):
                        self.pinned = False
                        self.active = None

    def _get_panel_rect(self, idx):
        if idx is None or idx >= len(self.items):
            return None
        icon_rect, title, lines = self.items[idx]
        pad = 10
        line_h = 15
        title_h = 20
        pw = self.MAX_W
        ph = pad + title_h + len(lines) * line_h + pad
        px = icon_rect.right + 6
        py = icon_rect.centery - 20
        # Keep on screen
        screen_w, screen_h = pygame.display.get_surface().get_size()
        if px + pw > screen_w:
            px = icon_rect.left - pw - 6
        if py + ph > screen_h:
            py = screen_h - ph - 4
        if py < 4:
            py = 4
        return pygame.Rect(px, py, pw, ph)

    def draw(self, screen):
        """Draw all ⓘ icons and the active tooltip panel."""
        mx, my = pygame.mouse.get_pos()

        for i, (rect, title, lines) in enumerate(self.items):
            cx = rect.centerx
            cy = rect.centery
            is_hover = (i == self.hover) or (i == self.active)
            col = self.ICON_HOVER if is_hover else self.ICON_COL

            # Draw ⓘ circle
            pygame.draw.circle(screen, col, (cx, cy), self.ICON_R, 1)
            # Draw 'i' letter
            txt = self.sfont.render("i", True, col)
            tr = txt.get_rect(center=(cx, cy))
            screen.blit(txt, tr)

        # Draw active tooltip panel
        if self.active is not None:
            panel = self._get_panel_rect(self.active)
            if panel:
                _, title, lines = self.items[self.active]
                pad = 10
                line_h = 15
                title_h = 20

                # Panel background
                surf = pygame.Surface((panel.w, panel.h), pygame.SRCALPHA)
                surf.fill(self.BG)
                pygame.draw.rect(surf, self.BORDER, (0, 0, panel.w, panel.h), 1, border_radius=6)
                screen.blit(surf, panel.topleft)

                # Title
                ttxt = self.font.render(title, True, self.TITLE_COL)
                screen.blit(ttxt, (panel.x + pad, panel.y + pad))

                # Body text
                ty = panel.y + pad + title_h
                for line in lines:
                    if line:
                        ltxt = self.sfont.render(line, True, self.TEXT)
                        screen.blit(ltxt, (panel.x + pad, ty))
                    ty += line_h


# ============================================================
# UI WIDGETS (with tooltip anchor rects)
# ============================================================

class Slider:
    def __init__(s,x,y,w,label,val,vmin,vmax,step=0.1,fmt="{:.2f}"):
        s.lx=x;s.tx=x+80;s.tw=w-130;s.ty=y+12;s.rect=pygame.Rect(x,y,w,28)
        s.label=label;s.val=val;s.vmin=vmin;s.vmax=vmax;s.step=step;s.fmt=fmt;s.dragging=False;s.changed=False
    def _tx(s): return s.tx+int((s.val-s.vmin)/(s.vmax-s.vmin+1e-30)*s.tw)
    def handle_event(s,e):
        s.changed=False
        if e.type==pygame.MOUSEBUTTONDOWN and e.button==1:
            if abs(e.pos[0]-s._tx())<12 and abs(e.pos[1]-s.ty)<12: s.dragging=True
            elif s.tx<=e.pos[0]<=s.tx+s.tw and abs(e.pos[1]-s.ty)<10: s.dragging=True;s._set(e.pos[0])
        elif e.type==pygame.MOUSEBUTTONUP:
            if s.dragging: s.changed=True
            s.dragging=False
        elif e.type==pygame.MOUSEMOTION and s.dragging: s._set(e.pos[0])
    def _set(s,mx):
        f=max(0,min(1,(mx-s.tx)/(s.tw+1e-30)));s.val=round((s.vmin+f*(s.vmax-s.vmin))/s.step)*s.step;s.val=max(s.vmin,min(s.vmax,s.val))
    def draw(s,surf,font,a=(59,158,255)):
        surf.blit(font.render(s.label,True,(107,125,153)),(s.lx,s.rect.y+4))
        pygame.draw.line(surf,(30,42,63),(s.tx,s.ty),(s.tx+s.tw,s.ty),4);tx=s._tx()
        pygame.draw.line(surf,a,(s.tx,s.ty),(tx,s.ty),4);pygame.draw.circle(surf,a,(tx,s.ty),7);pygame.draw.circle(surf,(15,21,32),(tx,s.ty),4)
        surf.blit(font.render(s.fmt.format(s.val),True,a),(s.tx+s.tw+8,s.rect.y+4))

class Toggle:
    def __init__(s,x,y,label,state=True): s.x=x;s.y=y;s.label=label;s.state=state;s.rect=pygame.Rect(x,y,200,18)
    def handle_event(s,e):
        if e.type==pygame.MOUSEBUTTONDOWN and e.button==1 and s.rect.collidepoint(e.pos): s.state=not s.state;return True
        return False
    def draw(s,surf,font,a=(59,158,255)):
        cx,cy=s.x+6,s.y+9
        if s.state: pygame.draw.circle(surf,a,(cx,cy),6);pygame.draw.circle(surf,(15,21,32),(cx,cy),3);c=(200,212,230)
        else: pygame.draw.circle(surf,(42,58,85),(cx,cy),6,2);c=(107,125,153)
        surf.blit(font.render(s.label,True,c),(s.x+18,s.y+1))

class ButtonGroup:
    def __init__(s,x,y,opts,sel=0): s.x=x;s.y=y;s.opts=opts;s.sel=sel;s.bw=80;s.bh=26;s.gap=4
    def handle_event(s,e):
        if e.type==pygame.MOUSEBUTTONDOWN and e.button==1:
            for i in range(len(s.opts)):
                if pygame.Rect(s.x+i*(s.bw+s.gap),s.y,s.bw,s.bh).collidepoint(e.pos): old=s.sel;s.sel=i;return old!=i
        return False
    def draw(s,surf,font,a=(59,158,255)):
        for i,o in enumerate(s.opts):
            r=pygame.Rect(s.x+i*(s.bw+s.gap),s.y,s.bw,s.bh)
            if i==s.sel: pygame.draw.rect(surf,(30,90,158),r,border_radius=4);pygame.draw.rect(surf,a,r,1,border_radius=4);c=(255,255,255)
            else: pygame.draw.rect(surf,(21,28,43),r,border_radius=4);pygame.draw.rect(surf,(42,58,85),r,1,border_radius=4);c=(200,212,230)
            t=font.render(o,True,c);surf.blit(t,t.get_rect(center=r.center))

class Dropdown:
    def __init__(s,x,y,w,opts,sel=0): s.x=x;s.y=y;s.w=w;s.h=26;s.opts=opts;s.sel=sel;s.open=False
    def handle_event(s,e):
        if e.type==pygame.MOUSEBUTTONDOWN and e.button==1:
            if s.open:
                for i in range(len(s.opts)):
                    if pygame.Rect(s.x,s.y+(i+1)*s.h,s.w,s.h).collidepoint(e.pos): old=s.sel;s.sel=i;s.open=False;return old!=i
                s.open=False
            elif pygame.Rect(s.x,s.y,s.w,s.h).collidepoint(e.pos): s.open=True
        return False
    def draw(s,surf,font):
        r=pygame.Rect(s.x,s.y,s.w,s.h);pygame.draw.rect(surf,(21,28,43),r,border_radius=4);pygame.draw.rect(surf,(42,58,85),r,1,border_radius=4)
        surf.blit(font.render(s.opts[s.sel],True,(200,212,230)),(s.x+8,s.y+5))
        ax=s.x+s.w-16;ay=s.y+10;pygame.draw.polygon(surf,(107,125,153),[(ax,ay),(ax+8,ay),(ax+4,ay+5)])
        if s.open:
            for i in range(len(s.opts)):
                dr=pygame.Rect(s.x,s.y+(i+1)*s.h,s.w,s.h);bg_=(30,90,158) if i==s.sel else (21,28,43)
                pygame.draw.rect(surf,bg_,dr);pygame.draw.rect(surf,(42,58,85),dr,1)
                surf.blit(font.render(s.opts[i],True,(200,212,230)),(s.x+8,dr.y+5))

class Button:
    def __init__(s,x,y,w,h,label,color=(59,158,255),tc=(255,255,255)):s.rect=pygame.Rect(x,y,w,h);s.label=label;s.color=color;s.tc=tc
    def handle_event(s,e):return e.type==pygame.MOUSEBUTTONDOWN and e.button==1 and s.rect.collidepoint(e.pos)
    def draw(s,surf,font):pygame.draw.rect(surf,s.color,s.rect,border_radius=4);t=font.render(s.label,True,s.tc);surf.blit(t,t.get_rect(center=s.rect.center))


# ============================================================
# TOOLTIP DEFINITIONS
# ============================================================

TIPS = {
    # Body section
    'body_type': ("Body Type",
        "Choose the shape to simulate.\n\n"
        "NACA: Standard airfoil profiles defined by 4-digit codes.\n\n"
        "Cylinder: Circular cross-section (good validation case).\n\n"
        "Square: Bluff body with sharp corners.\n\n"
        "Image: Import a PNG silhouette — draw a dark shape on white paper, "
        "photograph it, and simulate it.\n\n"
        "Draw: Click on the canvas to place control points. "
        "A smooth spline shape is fitted through them. Drag points to edit."),

    'naca': ("NACA 4-Digit Code",
        "The four digits encode the airfoil shape:\n\n"
        "• 1st digit: maximum camber as % of chord\n"
        "• 2nd digit: position of max camber in tenths of chord\n"
        "• 3rd–4th digits: maximum thickness as % of chord\n\n"
        "Example: 2412 = 2% camber at 40% chord, 12% thick.\n"
        "0012 is symmetric (zero camber)."),

    # Flow parameters
    'vinf': ("Freestream Velocity (V∞)",
        "The speed of the undisturbed flow far from the body, in arbitrary units. "
        "Higher V∞ increases the dynamic pressure (q = ½ρV²) but does not change the "
        "pressure coefficient Cp or lift coefficient CL in potential flow — "
        "these are non-dimensional and depend only on geometry and angle of attack."),

    'alpha': ("Angle of Attack (α)",
        "The angle between the chord line and the freestream direction, in degrees.\n\n"
        "Positive α tilts the leading edge upward, increasing lift. "
        "In this simulation, α is applied by rotating the body geometry while "
        "keeping the freestream horizontal.\n\n"
        "Thin airfoil theory predicts CL = 2πα for symmetric airfoils. "
        "Cambered airfoils generate positive lift even at α = 0°."),

    'panels': ("Panel Count",
        "Number of straight-line segments used to discretise the body boundary. "
        "More panels = better accuracy but slower solve.\n\n"
        "The Hess-Smith solver builds an (N+1)×(N+1) linear system, "
        "so doubling panels roughly quadruples solve time.\n\n"
        "60–80 panels: fast, ~1% Cp error\n"
        "120–160 panels: publication quality\n"
        "200 panels: overkill for most shapes"),

    'chord': ("Chord Length",
        "The distance from leading edge to trailing edge. "
        "Scaling the chord changes the physical size of the body in the simulation domain.\n\n"
        "For a NACA airfoil, the chord normalises all aerodynamic coefficients: "
        "CL = L / (½ρV²c) where c is the chord."),

    # Visualisation toggles
    'streamlines': ("Streamlines",
        "Lines that are everywhere tangent to the velocity field — they show "
        "the path a fluid particle would follow in steady flow.\n\n"
        "Computed using 4th-order Runge-Kutta integration of the velocity field. "
        "40 streamlines are traced from the left boundary with 800 integration steps each.\n\n"
        "In potential flow, streamlines cannot cross the body surface "
        "(enforced by the no-penetration boundary condition)."),

    'pressure': ("Pressure Field",
        "Colour map showing the pressure coefficient Cp across the flow domain.\n\n"
        "Cp = 1 − (V/V∞)² from Bernoulli's equation.\n\n"
        "Blue (Cp < 0): suction — flow is faster than freestream.\n"
        "White (Cp ≈ 0): freestream conditions.\n"
        "Red (Cp > 0): stagnation — flow is slower.\n\n"
        "The suction peak on the upper surface is what generates lift."),

    'vectors': ("Velocity Vectors",
        "Arrows showing the local velocity direction and magnitude on a regular grid.\n\n"
        "Arrow brightness indicates speed: brighter = faster flow. "
        "Useful for identifying stagnation points (where vectors vanish) "
        "and regions of flow acceleration."),

    'particles': ("Particles",
        "Massless tracer particles advected by the velocity field. "
        "They are spawned at the left boundary and follow the flow.\n\n"
        "Each particle is drawn as a short velocity-aligned streak: "
        "longer streaks = faster flow. Particles fade with age.\n\n"
        "The velocity is interpolated from a precomputed grid, "
        "so particle count is independent of panel count — "
        "up to 50,000 particles at full frame rate."),

    'normals': ("Panel Normals",
        "Orange lines showing the outward-pointing normal vector at each panel midpoint.\n\n"
        "The no-penetration boundary condition (V·n = 0) is enforced at each "
        "control point. If the normals point inward, the solver produces wrong results — "
        "this display is useful for verifying correct geometry orientation."),

    'cpplot': ("Cp Distribution Plot",
        "Pressure coefficient along the body surface, plotted as −Cp vs x/c.\n\n"
        "Blue = upper surface, Orange = lower surface.\n\n"
        "The area between the two curves is proportional to the lift coefficient. "
        "A large suction peak near the leading edge (high −Cp on upper surface) "
        "indicates strong lift generation.\n\n"
        "At the trailing edge, upper and lower Cp values should converge "
        "(this is the Kutta condition being satisfied)."),

    'wake': ("Vortex Shedding (Unsteady Wake)",
        "Enables the discrete vortex method: point vortices are shed from the "
        "trailing edge each timestep to model the unsteady wake.\n\n"
        "By Kelvin's theorem, total circulation is conserved — shedding a starting "
        "vortex is what establishes the bound circulation around the airfoil.\n\n"
        "You will see:\n"
        "• Starting vortex rolling up behind the body\n"
        "• Vortex street for bluff bodies (cylinder/square)\n"
        "• Wake distortion showing how eddies interact\n\n"
        "Red dots = positive (CCW) vortices\n"
        "Blue dots = negative (CW) vortices\n"
        "Size = vortex strength\n\n"
        "Note: this is inviscid vortex dynamics. Real turbulent diffusion and "
        "viscous dissipation are not modelled — vortices persist indefinitely."),

    # Readouts
    'cl': ("Lift Coefficient (CL)",
        "Non-dimensional measure of lift force.\n\n"
        "CL = 2Γ / (V∞ × c)\n\n"
        "where Γ is the circulation and c is the chord. "
        "Computed from the Kutta-Joukowski theorem.\n\n"
        "Typical values: 0.2–0.5 at cruise, 1.0–1.5 at high α. "
        "CL > 1.5 usually indicates stall in real flow (not modelled here)."),

    'gamma': ("Circulation (Γ)",
        "The total circulation around the body: Γ = γ × perimeter, "
        "where γ is the constant vortex strength per unit length determined by the Kutta condition.\n\n"
        "Circulation is the fundamental quantity that generates lift in potential flow. "
        "By the Kutta-Joukowski theorem: L = ρ V∞ Γ (per unit span)."),

    'cl_theory': ("CL (Thin Airfoil Theory)",
        "The theoretical lift coefficient from thin airfoil theory:\n\n"
        "CL = 2π sin(α) ≈ 2πα for small α\n\n"
        "This assumes zero thickness and small camber. "
        "Finite-thickness airfoils (like NACA 0012) produce slightly higher CL "
        "than this prediction — the panel method captures this thickness effect."),

    'panel_count': ("Panel Count",
        "The number of straight-line panel elements used to discretise the body. "
        "Each panel carries a source strength (σ) and shares a common vortex "
        "strength (γ) with all other panels on the same body.\n\n"
        "The total number of unknowns is N + 1 (N source strengths + 1 vortex strength)."),
}


# ============================================================
# INTERACTIVE SIMULATION
# ============================================================

def run_interactive():
    if not HAS_PYGAME: print("Pygame not available"); run_static(); return

    pygame.init()
    W, H = 1400, 800; SBW = 280; CW = W - SBW; CP_H = 180
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("CFD Panel Method — Hess-Smith Solver")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 18); lfont = pygame.font.Font(None, 16)
    tfont = pygame.font.Font(None, 22); mfont = pygame.font.Font(None, 20)
    tip_font = pygame.font.Font(None, 17)

    solver = HessSmithSolver()
    SB = (-1.5, 2.5, -1.5, 1.5)
    panels = []; panel_arrays = None
    body_vx = np.array([], np.float64); body_vy = np.array([], np.float64)
    VGRID_NX, VGRID_NY = 200, 120
    U_grid = None; V_grid = None

    NACA_OPTS = ["0012","2412","4412","0006","6412","2424"]
    BTYPES = ["NACA","Cylinder","Square","Image","Draw"]

    sx = CW+12; sw = SBW-24
    bg_ = ButtonGroup(sx,50,BTYPES,0)
    bg_.bw = 50; bg_.gap = 3  # narrower buttons to fit 5
    ndd = Dropdown(sx+80,86,sw-80,NACA_OPTS,1)
    sl_v=Slider(sx,130,sw,"V∞",1.0,0.2,3.0,0.05,"{:.2f}")
    sl_a=Slider(sx,164,sw,"α (deg)",5.0,-15.0,15.0,0.5,"{:.1f}°")
    sl_p=Slider(sx,198,sw,"Panels",120,20,200,4,"{:.0f}")
    sl_c=Slider(sx,232,sw,"Chord",1.0,0.3,2.0,0.05,"{:.2f}")
    sls=[sl_v,sl_a,sl_p,sl_c]
    ty=284;tg_=22
    t_str=Toggle(sx,ty,"Streamlines",True);t_pre=Toggle(sx,ty+tg_,"Pressure field",True)
    t_vec=Toggle(sx,ty+tg_*2,"Velocity vectors",False);t_par=Toggle(sx,ty+tg_*3,"Particles",True)
    t_nor=Toggle(sx,ty+tg_*4,"Panel normals",True);t_cp=Toggle(sx,ty+tg_*5,"Cp plot",True)
    t_wake=Toggle(sx,ty+tg_*6,"Vortex shedding",False)
    tgs=[t_str,t_pre,t_vec,t_par,t_nor,t_cp,t_wake]
    btn_s=Button(sx,ty+tg_*7+14,70,28,"Solve");btn_c=Button(sx+78,ty+tg_*7+14,70,28,"Clear",(180,50,70))

    # --- Vortex wake state ---
    wake = VortexWake(max_vortices=2000, core_radius=0.025)
    wake_sim_time = 0.0
    wake_grid_timer = 0  # frames since last grid rebuild

    # --- Drawing tool state ---
    draw_points = []  # list of [x_sim, y_sim] control points
    draw_dragging = -1  # index of point being dragged, -1 = none
    draw_closed = False  # True once shape is closed and ready to solve
    DRAW_CLOSE_DIST = 15  # pixel distance to snap-close the shape
    DRAW_GRAB_DIST = 10   # pixel distance to grab a point for dragging

    # --- Image import state ---
    custom_coords = None  # (x_arr, y_arr) from image import
    import_msg = ""  # status message shown in sidebar
    import_msg_timer = 0

    def do_image_import():
        """Open file dialog, extract contour, store in custom_coords."""
        nonlocal custom_coords, import_msg, import_msg_timer
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk(); root.withdraw()
            filepath = filedialog.askopenfilename(
                title="Select shape image",
                filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp"), ("All files", "*.*")])
            root.destroy()
            if not filepath:
                import_msg = "No file selected"; import_msg_timer = 180; return False
        except Exception as ex:
            import_msg = f"File dialog error: {ex}"; import_msg_timer = 300; return False

        try:
            from simulation.geometry import contour_from_image
            n_pan = int(sl_p.val); ch = sl_c.val
            cx, cy = contour_from_image(filepath, n_pan, ch, 0.0, 0.0)
            custom_coords = (cx, cy)
            import_msg = f"✓ Imported {len(cx)-1} panels from image"; import_msg_timer = 240
            return True
        except ImportError:
            import_msg = "Pillow required: pip install Pillow"; import_msg_timer = 300; return False
        except Exception as ex:
            import_msg = f"Import failed: {ex}"; import_msg_timer = 300; return False

    def build_draw_shape():
        """Convert draw_points to panels via spline interpolation."""
        nonlocal custom_coords
        if len(draw_points) < 3: return False
        try:
            from simulation.geometry import spline_from_control_points
            cx = np.array([p[0] for p in draw_points], np.float64)
            cy = np.array([p[1] for p in draw_points], np.float64)
            n_pan = int(sl_p.val)
            x, y = spline_from_control_points(cx, cy, n_pan)
            custom_coords = (x, y)
            return True
        except Exception as ex:
            print(f"  Spline error: {ex}")
            return False

    # --- Tooltip manager ---
    tm = TooltipManager(font, tip_font)

    # Register tooltips for body section
    tm.register_at(sx + sw - 14, 52, *TIPS['body_type'])
    tm.register_at(sx + sw - 14, 88, *TIPS['naca'])

    # Register tooltips for sliders (icon to the right of value display)
    tm.register_at(sx + sw - 14, sl_v.rect.y + 4, *TIPS['vinf'])
    tm.register_at(sx + sw - 14, sl_a.rect.y + 4, *TIPS['alpha'])
    tm.register_at(sx + sw - 14, sl_p.rect.y + 4, *TIPS['panels'])
    tm.register_at(sx + sw - 14, sl_c.rect.y + 4, *TIPS['chord'])

    # Register tooltips for toggles
    toggle_tips = ['streamlines','pressure','vectors','particles','normals','cpplot','wake']
    for tg_w, tip_key in zip(tgs, toggle_tips):
        tm.register_at(sx + sw - 14, tg_w.y + 1, *TIPS[tip_key])

    # Readout tooltip positions
    readout_y_base = ty + tg_ * 7 + 52 + 18
    readout_tips = ['cl', 'gamma', 'cl_theory', 'panel_count']

    for i, tip_key in enumerate(readout_tips):
        row, ci = i // 2, i % 2
        bx = sx + ci * (sw // 2 + 4)
        by = readout_y_base + row * 52
        tm.register_at(bx + sw // 2 - 18, by + 2, *TIPS[tip_key])

    # --- Particles ---
    MAX_P = 50000
    p_x=np.zeros(MAX_P,np.float64);p_y=np.zeros(MAX_P,np.float64)
    p_vx=np.zeros(MAX_P,np.float64);p_vy=np.zeros(MAX_P,np.float64)
    p_age=np.zeros(MAX_P,np.int32);p_count=0;SPAWN=60

    def s2s(svx,svy,ch=None):
        ch=ch or(H-(CP_H if t_cp.state else 0))
        return(int((svx-SB[0])/(SB[1]-SB[0])*CW),int((1-(svy-SB[2])/(SB[3]-SB[2]))*ch))

    def scr2sim(px, py):
        ch = H-(CP_H if t_cp.state else 0)
        sx_v = SB[0] + px / CW * (SB[1] - SB[0])
        sy_v = SB[3] - py / ch * (SB[3] - SB[2])
        return sx_v, sy_v

    c_press=c_stream=c_vec=c_body=c_cp=None
    part_buf = np.zeros((H, CW, 3), dtype=np.uint8)

    def rebuild_caches(ch):
        nonlocal c_press,c_stream,c_vec,c_body,c_cp,U_grid,V_grid
        if not solver.solved or not panels: return
        xn,xx,yn,yx = SB; t0 = time.time()

        U_grid, V_grid = _build_velocity_grid_jit(
            VGRID_NX, VGRID_NY, xn, xx, yn, yx, sl_v.val, 0.0, *panel_arrays)

        PRES = 400
        pg_x = np.linspace(xn, xx, PRES, dtype=np.float64)
        pg_y = np.linspace(yx, yn, PRES, dtype=np.float64)
        PX, PY = np.meshgrid(pg_x, pg_y)
        PU, PV = _velocity_batch_jit(PX.ravel(), PY.ravel(), PRES*PRES, sl_v.val, 0.0, *panel_arrays)
        spd = np.sqrt(PU**2+PV**2).reshape(PRES,PRES)
        Cp = 1-(spd/max(sl_v.val,0.01))**2
        cols = pressure_color_array(Cp)
        small = pygame.Surface((PRES,PRES))
        pygame.surfarray.blit_array(small, cols.transpose(1,0,2))
        c_press = pygame.transform.smoothscale(small,(CW,ch)); c_press.set_alpha(100)

        if HAS_NUMBA and _compute_streamlines_jit is not None:
            all_pts,starts,n_lines = _compute_streamlines_jit(40,800,0.012,sl_v.val,0.0,*panel_arrays,xn,xx,yn,yx)
            c_stream = pygame.Surface((CW,ch),pygame.SRCALPHA)
            for k in range(n_lines):
                i0=starts[k];i1=starts[k+1]
                if i1-i0<6: continue
                pts=[s2s(all_pts[i,0],all_pts[i,1],ch) for i in range(i0,i1)]
                pygame.draw.aalines(c_stream,(100,200,255,120),False,pts)
                for j in range(0,len(pts)-1,7):
                    pd_x,pd_y=pts[j]
                    if 0<=pd_x<CW and 0<=pd_y<ch:
                        pygame.gfxdraw.aacircle(c_stream,pd_x,pd_y,1,(120,210,255,190))
                        pygame.gfxdraw.filled_circle(c_stream,pd_x,pd_y,1,(120,210,255,190))
        else:
            c_stream = pygame.Surface((CW,ch),pygame.SRCALPHA)

        c_vec = pygame.Surface((CW,ch),pygame.SRCALPHA)
        step=20
        for px in range(step//2,CW,step):
            for py in range(step//2,ch,step):
                sim_x=xn+px/CW*(xx-xn);sim_y=yx-py/ch*(yx-yn)
                u,v=_velocity_at_jit(sim_x,sim_y,sl_v.val,0.0,*panel_arrays)
                mag=math.sqrt(u*u+v*v)
                if mag<0.02: continue
                sc=7/max(sl_v.val,0.1);br=min(255,int(80+mag/max(sl_v.val,0.01)*120))
                pygame.draw.aaline(c_vec,(br,br,br,55),(px,py),(int(px+u*sc),int(py-v*sc)))

        c_body = pygame.Surface((CW,ch),pygame.SRCALPHA)
        bpts=[s2s(p.xa,p.ya,ch) for p in panels]
        if len(bpts)>2:
            pygame.draw.polygon(c_body,(20,28,46,255),bpts)
            for p in panels:
                x1,y1=s2s(p.xa,p.ya,ch);x2,y2=s2s(p.xb,p.yb,ch)
                pygame.draw.line(c_body,(*pressure_color(p.cp),255),(x1,y1),(x2,y2),3)
            pygame.draw.aalines(c_body,(74,106,159,255),True,bpts)
            skip=max(1,len(panels)//32)
            for i in range(0,len(panels),skip):
                p=panels[i];sx_p,sy_p=s2s(p.xm,p.ym,ch)
                pygame.draw.aaline(c_body,(255,170,50,200),(sx_p,sy_p),(sx_p+int(p.nx*18),sy_p-int(p.ny*18)))

        c_cp = pygame.Surface((CW,CP_H));c_cp.fill((15,21,32))
        ml,mr,mt,mb=50,20,28,24;pw=CW-ml-mr;ph=CP_H-mt-mb
        xm=np.array([p.xm for p in panels]);cpv=np.array([p.cp for p in panels])
        xnc,xxc=xm.min(),xm.max();clo,chi=min(cpv.min(),-2.5),max(cpv.max(),1.2)
        def c2s(xv,cv): return(int(ml+(xv-xnc)/(xxc-xnc+1e-30)*pw),int(mt+(chi-cv)/(chi-clo+1e-30)*ph))
        for cv in np.arange(np.floor(clo),np.ceil(chi)+0.5,0.5):
            _,gy=c2s(0,cv);pygame.draw.line(c_cp,(30,42,63),(ml,gy),(CW-mr,gy),1)
            if abs(cv-round(cv))<0.01: c_cp.blit(lfont.render(f"{cv:.0f}",True,(107,125,153)),(ml-24,gy-5))
        _,y0=c2s(0,0)
        for dx in range(ml,CW-mr,8): pygame.draw.line(c_cp,(60,75,100),(dx,y0),(min(dx+4,CW-mr),y0),1)
        le=np.argmin(xm)
        up=[c2s(xm[i],cpv[i]) for i in range(le+1)];lo=[c2s(xm[i],cpv[i]) for i in range(le,len(xm))]
        if len(up)>1: pygame.draw.aalines(c_cp,(59,158,255),False,up)
        if len(lo)>1: pygame.draw.aalines(c_cp,(255,119,68),False,lo)
        c_cp.blit(lfont.render("Cp Distribution",True,(107,125,153)),(ml+4,6))
        c_cp.blit(lfont.render("● Upper",True,(59,158,255)),(CW-mr-130,6))
        c_cp.blit(lfont.render("● Lower",True,(255,119,68)),(CW-mr-62,6))

        print(f"  Caches rebuilt in {time.time()-t0:.2f}s")

    def build_and_solve():
        nonlocal panels, panel_arrays, body_vx, body_vy, p_count
        np_=int(sl_p.val);ch=sl_c.val;alpha=sl_a.val;bt=BTYPES[bg_.sel]
        if bt=="NACA": panels=make_naca_panels(NACA_OPTS[ndd.sel],np_,ch,angle_deg=-alpha)
        elif bt=="Cylinder": panels=make_cylinder_panels(0,0,ch*0.3,np_)
        elif bt=="Square": panels=make_square_panels(0,0,ch*0.25,angle_deg=-alpha,n_per_side=np_//4)
        elif bt in ("Image","Draw"):
            if custom_coords is not None:
                panels=make_panels_from_coords(custom_coords[0], custom_coords[1])
            else:
                return  # nothing to solve yet
        else:
            return
        if len(panels) < 3: return
        solver.set_panels(panels,[(0,len(panels))]);solver.solve(sl_v.val,alpha=0.0)
        panel_arrays=extract_panel_arrays(panels)
        body_vx=np.array([p.xa for p in panels],np.float64);body_vy=np.array([p.ya for p in panels],np.float64)
        p_count=0;wake.reset();wake_sim_time=0.0;wake_grid_timer=0
        rebuild_caches(H-(CP_H if t_cp.state else 0))

    print("Warming up JIT..." if HAS_NUMBA else "Running in pure Python mode...")
    warmup_jit();build_and_solve();print("Ready.\n")

    running=True;fps_t=0;fps_c=0;fps_d=0

    while running:
        dt=clock.tick(60)/1000.0;fps_t+=dt;fps_c+=1
        if fps_t>0.5: fps_d=int(fps_c/fps_t);fps_c=0;fps_t=0

        needs_solve=False
        for e in pygame.event.get():
            if e.type==pygame.QUIT: running=False
            elif e.type==pygame.KEYDOWN and e.key==pygame.K_ESCAPE: running=False
            # Tooltip manager gets events first (for click-to-pin)
            tm.handle_event(e)

            old_sel = bg_.sel
            if bg_.handle_event(e):
                needs_solve=True
                # Switching to Image mode → trigger file dialog
                if BTYPES[bg_.sel]=="Image" and bg_.sel != old_sel:
                    if do_image_import():
                        needs_solve = True
                    else:
                        needs_solve = False
                # Switching to Draw mode → reset drawing state
                if BTYPES[bg_.sel]=="Draw" and bg_.sel != old_sel:
                    draw_points.clear(); draw_closed = False; custom_coords = None
                    needs_solve = False
                # Switching away from Draw → if we have a shape, solve it
                if BTYPES[old_sel]=="Draw" and bg_.sel != old_sel and draw_closed:
                    if build_draw_shape(): needs_solve = True

            if ndd.handle_event(e): needs_solve=True
            for sl in sls:
                sl.handle_event(e)
                if sl.changed: needs_solve=True
            for t in tgs: t.handle_event(e)
            if btn_s.handle_event(e):
                if BTYPES[bg_.sel]=="Draw" and draw_closed:
                    if build_draw_shape(): needs_solve = True
                elif BTYPES[bg_.sel]=="Image" and custom_coords is None:
                    if do_image_import(): needs_solve = True
                else:
                    needs_solve=True
            if btn_c.handle_event(e):
                panels=[];solver.set_panels([],[]);solver.solved=False;p_count=0;panel_arrays=None
                c_press=c_stream=c_vec=c_body=c_cp=None
                draw_points.clear();draw_closed=False;custom_coords=None
                wake.reset();wake_sim_time=0.0;wake_grid_timer=0

            # --- Drawing tool canvas events ---
            if BTYPES[bg_.sel]=="Draw" and e.type in (pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                mx, my = e.pos if hasattr(e, 'pos') else pygame.mouse.get_pos()
                if mx < CW:  # only on canvas
                    sim_x, sim_y = scr2sim(mx, my)

                    if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
                        # Check if clicking near existing point (drag)
                        grabbed = -1
                        for i, pt in enumerate(draw_points):
                            ptx, pty = s2s(pt[0], pt[1], canvas_h)
                            if (mx - ptx)**2 + (my - pty)**2 < DRAW_GRAB_DIST**2:
                                grabbed = i; break

                        if grabbed >= 0:
                            draw_dragging = grabbed
                        elif not draw_closed:
                            # Check if closing the shape (clicking near first point)
                            if len(draw_points) >= 3:
                                fp = draw_points[0]
                                fpx, fpy = s2s(fp[0], fp[1], canvas_h)
                                if (mx - fpx)**2 + (my - fpy)**2 < DRAW_CLOSE_DIST**2:
                                    draw_closed = True
                                    if build_draw_shape():
                                        needs_solve = True
                                    continue
                            # Add new point
                            draw_points.append([sim_x, sim_y])

                    elif e.type == pygame.MOUSEBUTTONUP and e.button == 1:
                        if draw_dragging >= 0:
                            draw_dragging = -1
                            # Re-solve after drag
                            if draw_closed and build_draw_shape():
                                needs_solve = True

                    elif e.type == pygame.MOUSEMOTION and draw_dragging >= 0:
                        draw_points[draw_dragging] = [sim_x, sim_y]

                    # Right-click to delete nearest point
                    if e.type == pygame.MOUSEBUTTONDOWN and e.button == 3:
                        if draw_points:
                            dists = [(mx - s2s(p[0],p[1],canvas_h)[0])**2 + (my - s2s(p[0],p[1],canvas_h)[1])**2 for p in draw_points]
                            nearest = int(np.argmin(dists))
                            if dists[nearest] < DRAW_GRAB_DIST**2 * 4:
                                draw_points.pop(nearest)
                                if len(draw_points) < 3: draw_closed = False
                                elif draw_closed and build_draw_shape():
                                    needs_solve = True

        if needs_solve: build_and_solve()

        canvas_h=H-(CP_H if t_cp.state else 0);xn,xx,yn,yx=SB

        # ── Vortex wake update ──────────────────────────────────
        if t_wake.state and solver.solved and panel_arrays and panels:
            wake_dt = dt * 0.4  # sub-timestep for stability
            wake_sim_time += wake_dt

            # Find trailing edge location and tangent
            body_range = solver.body_panel_ranges[0]
            te_panel_first = panels[body_range[0]]
            te_panel_last = panels[body_range[1] - 1]
            # TE point is where first and last panels meet
            te_x = 0.5 * (te_panel_first.xa + te_panel_last.xb)
            te_y = 0.5 * (te_panel_first.ya + te_panel_last.yb)
            # TE tangent: average of the two TE panel tangents (points downstream)
            te_tx = 0.5 * (te_panel_last.tx - te_panel_first.tx)
            te_ty = 0.5 * (te_panel_last.ty - te_panel_first.ty)
            te_mag = max(np.sqrt(te_tx**2 + te_ty**2), 1e-10)
            te_tx /= te_mag; te_ty /= te_mag

            # Shed new vortex from TE (Kelvin's theorem)
            bound_gamma = solver.get_circulation(0)
            wake.shed_from_te(te_x, te_y, bound_gamma, wake_dt, te_tx, te_ty)

            # Advect all free vortices
            n_w = wake.count
            if n_w > 0:
                core_r2 = wake.core_radius ** 2
                if HAS_NUMBA and _advect_wake_jit is not None:
                    _advect_wake_jit(wake.x[:n_w], wake.y[:n_w], wake.gamma[:n_w], n_w,
                                     wake_dt, sl_v.val, 0.0, *panel_arrays, core_r2)
                    wake.age[:n_w] += 1
                else:
                    # Python fallback
                    def _panel_vel(x, y):
                        return _velocity_at_jit(x, y, sl_v.val, 0.0, *panel_arrays)
                    wake.advect(wake_dt, _panel_vel, sl_v.val, 0.0)

                wake._cull()

                # Periodic merging (every 30 frames)
                wake_grid_timer += 1
                if wake_grid_timer % 30 == 0:
                    wake.merge_close_pairs()

                # Rebuild velocity grid with wake contribution (every 3 frames for performance)
                if wake_grid_timer % 3 == 0 and n_w > 0:
                    wx, wy, wg = wake.get_arrays()
                    if HAS_NUMBA and _build_velocity_grid_with_wake_jit is not None:
                        U_grid, V_grid = _build_velocity_grid_with_wake_jit(
                            VGRID_NX, VGRID_NY, xn, xx, yn, yx,
                            sl_v.val, 0.0, *panel_arrays,
                            wx, wy, wg, len(wx), core_r2)
                    else:
                        # Fallback: panel-only grid (wake not included in particle advection)
                        U_grid, V_grid = _build_velocity_grid_jit(
                            VGRID_NX, VGRID_NY, xn, xx, yn, yx,
                            sl_v.val, 0.0, *panel_arrays)

        # Particle update
        if t_par.state and solver.solved and panel_arrays and U_grid is not None:
            n_spawn=min(SPAWN,MAX_P-p_count)
            if n_spawn>0:
                if HAS_NUMBA and _batch_spawn_jit is not None:
                    _batch_spawn_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,n_spawn,xn,yn,yx,sl_v.val)
                else:
                    for i in range(n_spawn):
                        idx=p_count+i;p_x[idx]=xn-0.05;p_y[idx]=np.random.uniform(yn,yx);p_vx[idx]=sl_v.val;p_vy[idx]=0;p_age[idx]=0
                p_count+=n_spawn
            if p_count>0:
                if HAS_NUMBA and _advect_particles_grid_jit is not None:
                    _advect_particles_grid_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,dt*0.5,
                        U_grid,V_grid,body_vx,body_vy,len(body_vx),xn,xx,yn,yx,sl_v.val,0.75,900)
                else:
                    for i in range(p_count):
                        u,v=_velocity_at_jit(p_x[i],p_y[i],sl_v.val,0.0,*panel_arrays)
                        p_vx[i]=p_vx[i]*0.75+u*0.25;p_vy[i]=p_vy[i]*0.75+v*0.25
                        p_x[i]+=p_vx[i]*dt*0.5;p_y[i]+=p_vy[i]*dt*0.5;p_age[i]+=1
                        if p_x[i]>xx+0.3 or p_x[i]<xn-0.3 or p_y[i]>yx+0.5 or p_y[i]<yn-0.5 or p_age[i]>900:
                            p_x[i]=xn-0.05;p_y[i]=np.random.uniform(yn,yx);p_vx[i]=sl_v.val;p_vy[i]=0;p_age[i]=0

        # RENDER
        screen.fill((10,14,23))
        if t_pre.state and c_press: screen.blit(c_press,(0,0))
        if t_str.state and c_stream: screen.blit(c_stream,(0,0))
        if t_vec.state and c_vec: screen.blit(c_vec,(0,0))

        if panels:
            bpts=[s2s(p.xa,p.ya,canvas_h) for p in panels]
            if len(bpts)>2:
                pygame.draw.polygon(screen,(20,28,46),bpts)
                if solver.solved:
                    for p in panels:
                        x1,y1=s2s(p.xa,p.ya,canvas_h);x2,y2=s2s(p.xb,p.yb,canvas_h)
                        pygame.draw.line(screen,pressure_color(p.cp),(x1,y1),(x2,y2),3)
                pygame.draw.aalines(screen,(74,106,159),True,bpts)
            if t_nor.state:
                skip=max(1,len(panels)//32)
                for i in range(0,len(panels),skip):
                    p=panels[i];sx_p,sy_p=s2s(p.xm,p.ym,canvas_h)
                    pygame.draw.aaline(screen,(255,170,50),(sx_p,sy_p),(sx_p+int(p.nx*18),sy_p-int(p.ny*18)))

        # --- Wake vortex rendering ---
        if t_wake.state and wake.count > 0:
            for i in range(wake.count):
                vsx, vsy = s2s(wake.x[i], wake.y[i], canvas_h)
                if 0 <= vsx < CW and 0 <= vsy < canvas_h:
                    g = wake.gamma[i]
                    # Size proportional to |gamma|, clamped
                    sz = max(2, min(6, int(abs(g) * 15)))
                    # Red = positive (CCW), Blue = negative (CW)
                    age_fade = max(0.3, 1.0 - wake.age[i] / 1200.0)
                    if g > 0:
                        col = (int(220 * age_fade), int(60 * age_fade), int(60 * age_fade))
                    else:
                        col = (int(60 * age_fade), int(80 * age_fade), int(220 * age_fade))
                    pygame.draw.circle(screen, col, (vsx, vsy), sz)
                    # Bright centre dot
                    if sz >= 3:
                        inner = (min(255, col[0]+80), min(255, col[1]+80), min(255, col[2]+80))
                        pygame.draw.circle(screen, inner, (vsx, vsy), max(1, sz - 2))

        # --- Drawing tool overlay ---
        if BTYPES[bg_.sel]=="Draw":
            # Draw spline preview if enough points
            if len(draw_points) >= 3 and not draw_closed:
                try:
                    from simulation.geometry import spline_from_control_points
                    cx_d = np.array([p[0] for p in draw_points], np.float64)
                    cy_d = np.array([p[1] for p in draw_points], np.float64)
                    sx_d, sy_d = spline_from_control_points(cx_d, cy_d, 60, closed=True)
                    preview_pts = [s2s(sx_d[i], sy_d[i], canvas_h) for i in range(len(sx_d))]
                    if len(preview_pts) > 1:
                        pygame.draw.aalines(screen, (100, 180, 255), True, preview_pts)
                except Exception:
                    pass
            elif len(draw_points) >= 2:
                # Just draw lines between points
                pts_scr = [s2s(p[0], p[1], canvas_h) for p in draw_points]
                pygame.draw.aalines(screen, (80, 140, 220), False, pts_scr)

            # Draw control points
            for i, pt in enumerate(draw_points):
                ptx, pty = s2s(pt[0], pt[1], canvas_h)
                is_first = (i == 0 and len(draw_points) >= 3 and not draw_closed)
                col = (255, 220, 80) if is_first else (59, 158, 255)
                r_sz = 7 if is_first else 5
                pygame.draw.circle(screen, col, (ptx, pty), r_sz)
                pygame.draw.circle(screen, (15, 21, 32), (ptx, pty), r_sz - 2)
                # Index label
                idx_txt = lfont.render(str(i+1), True, (200, 212, 230))
                screen.blit(idx_txt, (ptx + 8, pty - 6))

            # Draw mode instructions on canvas
            if not draw_closed:
                inst_lines = [
                    "DRAW MODE: Click to place points",
                    f"Points: {len(draw_points)} (min 3 needed)",
                    "Click the yellow first point to close the shape" if len(draw_points) >= 3 else "",
                    "Right-click a point to delete it",
                ]
                iy = 10
                for line in inst_lines:
                    if line:
                        screen.blit(lfont.render(line, True, (150, 180, 220)), (10, iy))
                        iy += 16
            else:
                screen.blit(lfont.render("Shape closed — drag points to edit, then Solve", True, (46, 232, 154)), (10, 10))

        if t_par.state and p_count>0:
            part_buf[:canvas_h,:,:]=0
            if HAS_NUMBA and _render_particles_jit is not None:
                _render_particles_jit(p_x,p_y,p_vx,p_vy,p_age,p_count,CW,canvas_h,xn,xx,yn,yx,sl_v.val,part_buf,4)
            else:
                scr_x=((p_x[:p_count]-xn)/(xx-xn)*CW).astype(np.int32)
                scr_y=((1-(p_y[:p_count]-yn)/(yx-yn))*canvas_h).astype(np.int32)
                v_=np.sqrt(p_vx[:p_count]**2+p_vy[:p_count]**2)
                r_=np.clip(60+v_/max(sl_v.val,0.01)*110,0,255).astype(np.uint8)
                g_=np.clip(140+v_/max(sl_v.val,0.01)*50,0,255).astype(np.uint8)
                b_=np.clip(200-v_/max(sl_v.val,0.01)*60,0,255).astype(np.uint8)
                ok=(scr_x>=1)&(scr_x<CW-1)&(scr_y>=1)&(scr_y<canvas_h-1)
                for i in np.where(ok)[0]: part_buf[scr_y[i],scr_x[i]]=(r_[i],g_[i],b_[i])
            p_surf=pygame.Surface((CW,canvas_h));pygame.surfarray.blit_array(p_surf,part_buf[:canvas_h].transpose(1,0,2))
            p_surf.set_colorkey((0,0,0));screen.blit(p_surf,(0,0))

        if t_cp.state and c_cp: screen.blit(c_cp,(0,canvas_h))

        # SIDEBAR
        pygame.draw.rect(screen,(15,21,32),(CW,0,SBW,H));pygame.draw.line(screen,(30,42,63),(CW,0),(CW,H),1)
        screen.blit(tfont.render("CFD Panel Method",True,(234,240,249)),(sx,10))
        screen.blit(lfont.render("Hess-Smith Solver",True,(59,158,255)),(sx,30))
        screen.blit(lfont.render("BODY",True,(107,125,153)),(sx,40));bg_.draw(screen,font)
        bt_sel = BTYPES[bg_.sel]
        if bt_sel=="NACA": screen.blit(lfont.render("NACA",True,(107,125,153)),(sx,90));ndd.draw(screen,font)
        elif bt_sel=="Image":
            img_help = [
                "IMAGE IMPORT REQUIREMENTS:",
                "",
                "• Single dark shape on white/light",
                "  background (PNG, JPG, or BMP)",
                "• Shape must be one closed region",
                "  (no gaps, holes, or separate parts)",
                "• At least 200px on longest side",
                "• Best: black marker on white paper,",
                "  photographed with good contrast",
                "",
                "Click Solve to open file picker",
            ]
            iy = 82
            for line in img_help:
                col = (200, 160, 80) if "REQUIREMENTS" in line else (140, 155, 180) if line else (107, 125, 153)
                if line: screen.blit(lfont.render(line, True, col), (sx, iy))
                iy += 14
            if import_msg:
                mc = (46,232,154) if "✓" in import_msg else (255,119,68)
                screen.blit(lfont.render(import_msg, True, mc), (sx, iy + 4))
                if import_msg_timer > 0: import_msg_timer -= 1
                if import_msg_timer <= 0: import_msg = ""
        elif bt_sel=="Draw":
            draw_help = [
                "DRAWING TOOL:",
                "",
                "• Click canvas to place points",
                "• Minimum 3 points for a shape",
                "• Click yellow dot (point 1) to close",
                "• Drag any point to reshape",
                "• Right-click a point to delete it",
                "• Click Solve after closing shape",
                "",
                f"Points: {len(draw_points)}",
                "Status: Closed ✓" if draw_closed else "Status: Open",
            ]
            iy = 82
            for line in draw_help:
                col = (200,160,80) if "TOOL" in line else (46,232,154) if "Closed ✓" in line else (140,155,180) if line else (107,125,153)
                if line: screen.blit(lfont.render(line, True, col), (sx, iy))
                iy += 14
        screen.blit(lfont.render("FLOW",True,(107,125,153)),(sx,118))
        for sl in sls: sl.draw(screen,font)
        screen.blit(lfont.render("VISUALISATION",True,(107,125,153)),(sx,270))
        for t in tgs: t.draw(screen,font)
        btn_s.draw(screen,font);btn_c.draw(screen,font)

        ry=ty+tg_*7+52;screen.blit(lfont.render("AERODYNAMICS",True,(107,125,153)),(sx,ry));ry+=18
        if solver.solved and panels:
            CL=solver.get_lift_coefficient(0,sl_c.val);G=solver.get_circulation(0);CLt=2*np.pi*np.radians(sl_a.val)
            rd=[("CL",f"{CL:.4f}",(46,232,154) if CL>=0 else (255,85,119)),("Γ",f"{G:.4f}",(46,232,154) if G>=0 else (255,85,119)),
                ("CL (theory)",f"{CLt:.4f}",(200,212,230)),("Panels",f"{len(panels)}",(200,212,230))]
        else: rd=[("CL","—",(107,125,153)),("Γ","—",(107,125,153)),("CL (theory)","—",(107,125,153)),("Panels","0",(107,125,153))]
        for i,(l,v,c) in enumerate(rd):
            row,ci=i//2,i%2;bx=sx+ci*(sw//2+4);by=ry+row*52;box=pygame.Rect(bx,by,sw//2-2,46)
            pygame.draw.rect(screen,(10,14,23),box,border_radius=4);pygame.draw.rect(screen,(30,42,63),box,1,border_radius=4)
            screen.blit(lfont.render(l,True,(107,125,153)),(bx+8,by+4));screen.blit(mfont.render(v,True,c),(bx+8,by+22))

        jt="Numba JIT" if HAS_NUMBA else "Python"
        wake_info = f" | {wake.count} vortices" if t_wake.state and wake.count > 0 else ""
        screen.blit(lfont.render(f"{fps_d} fps | {p_count} particles{wake_info} | {jt}",True,(107,125,153)),(sx,H-20))
        screen.blit(lfont.render("Hess-Smith · RK4 · Bernoulli Cp",True,(50,65,90)),(8,canvas_h-18 if t_cp.state else H-18))

        # Draw tooltips LAST (on top of everything)
        tm.draw(screen)

        pygame.display.flip()

    pygame.quit()


# ============================================================
# STATIC OUTPUT
# ============================================================

def run_static():
    if not HAS_MPL: print("pip install matplotlib"); return
    panels=make_naca_panels("2412",120,1.0,angle_deg=-5.0)
    solver=HessSmithSolver();solver.set_panels(panels,[(0,len(panels))]);solver.solve(1.0,0.0)
    CL=solver.get_lift_coefficient(0,1.0);G=solver.get_circulation(0)
    print(f"NACA 2412, α=5°: CL={CL:.4f}, Γ={G:.4f}")
    xg=np.linspace(-1.5,2.5,300);yg=np.linspace(-1.2,1.2,180);X,Y=np.meshgrid(xg,yg)
    U,V=solver.velocity_field(X,Y)
    for p in panels: mask=(X-p.xm)**2+(Y-p.ym)**2<0.001;U[mask]=np.nan;V[mask]=np.nan
    Cp=1-(np.sqrt(U**2+V**2)/1.0)**2
    fig,axes=plt.subplots(2,1,figsize=(14,9),gridspec_kw={'height_ratios':[3,1]})
    ax=axes[0];cf=ax.contourf(X,Y,Cp,levels=np.linspace(-3,1.5,50),cmap='RdBu',extend='both')
    plt.colorbar(cf,ax=ax,label='$C_p$',shrink=0.8)
    ax.streamplot(X,Y,U,V,color='k',linewidth=0.4,density=2.5,arrowsize=0.7)
    bx=[p.xa for p in panels]+[panels[-1].xb];by=[p.ya for p in panels]+[panels[-1].yb]
    ax.fill(bx,by,color='#1a2236',edgecolor='#4a6a9f',linewidth=1.5)
    ax.set_xlim(-1.5,2.5);ax.set_ylim(-1.2,1.2);ax.set_aspect('equal')
    ax.set_xlabel('x/c');ax.set_ylabel('y/c');ax.set_title(f'NACA 2412 · α=5° · $C_L$={CL:.4f} · Γ={G:.4f}')
    ax2=axes[1];xm=np.array([p.xm for p in panels]);cp=np.array([p.cp for p in panels]);le=np.argmin(xm)
    ax2.plot(xm[:le+1],-cp[:le+1],'b-',label='Upper',lw=1.5);ax2.plot(xm[le:],-cp[le:],'r-',label='Lower',lw=1.5)
    ax2.axhline(0,color='gray',lw=0.5,ls='--');ax2.set_xlabel('x/c');ax2.set_ylabel('$-C_p$')
    ax2.legend(fontsize=9);ax2.set_title('Pressure Coefficient Distribution');ax2.grid(alpha=0.2)
    plt.tight_layout();plt.savefig('cfd_output.png',dpi=200,bbox_inches='tight');print("Saved: cfd_output.png");plt.show()


if __name__ == "__main__":
    if '--static' in sys.argv: run_static()
    else: run_interactive()
