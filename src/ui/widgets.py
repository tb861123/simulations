"""
UI Widget Classes for CFD Panel Method
=======================================
Extracted from main.py so the main simulation loop stays readable.

Widgets
-------
- TooltipManager  — ⓘ icons with hover/click panels
- Slider          — labelled draggable value slider
- Toggle          — radio-style on/off button
- ButtonGroup     — row of mutually-exclusive buttons
- Dropdown        — single-select dropdown
- Button          — simple push button

All widgets accept a pygame Surface for drawing and delegate hit-testing to
pygame.Rect so the caller never needs to know about pixel maths.

pygame is a hard dependency; if it is not installed these classes cannot be
used, but the module can still be imported (classes will raise on
instantiation if pygame is None).
"""

import textwrap

try:
    import pygame
    import pygame.gfxdraw
    _HAS_PYGAME = True
except ImportError:
    pygame = None  # type: ignore
    _HAS_PYGAME = False


# ============================================================
# TOOLTIP MANAGER
# ============================================================

class TooltipManager:
    """
    Manages ⓘ icons next to widgets.  Hover or click to show a floating
    info panel with a detailed explanation.

    Usage::

        tm = TooltipManager(font, small_font)
        tm.register(rect, "Title", "Explanation text...")
        # In event loop:
        tm.handle_event(event)
        # After all other drawing:
        tm.draw(screen)
    """
    BG         = (20, 28, 48, 240)
    BORDER     = (59, 158, 255)
    TEXT       = (210, 220, 235)
    TITLE_COL  = (59, 158, 255)
    ICON_COL   = (80, 110, 160)
    ICON_HOVER = (59, 158, 255)
    ICON_R     = 7
    MAX_W      = 260

    def __init__(self, font, small_font, canvas_width=None):
        self.font         = font
        self.sfont        = small_font
        self.items        = []    # [(icon_rect, title, lines[])]
        self.active       = None  # index of currently shown tooltip
        self.hover        = None
        self.pinned       = False # True if clicked (stays open until click elsewhere)
        self.canvas_width = canvas_width  # if set, keep tooltip left of this x

    def register(self, anchor_rect, title, text):
        """Register a tooltip.  The ⓘ icon is placed to the right of anchor_rect."""
        ix = anchor_rect.right + 4
        iy = anchor_rect.top + anchor_rect.height // 2 - self.ICON_R
        icon_rect = pygame.Rect(ix, iy, self.ICON_R * 2, self.ICON_R * 2)
        self.items.append((icon_rect, title, self._wrap(text)))

    def register_at(self, x, y, title, text):
        """Register a tooltip at an explicit (x, y) position for the ⓘ icon."""
        icon_rect = pygame.Rect(x, y, self.ICON_R * 2, self.ICON_R * 2)
        self.items.append((icon_rect, title, self._wrap(text)))

    def _wrap(self, text):
        lines = []
        for paragraph in text.split('\n'):
            lines.extend(textwrap.wrap(paragraph, width=38))
            if not paragraph.strip():
                lines.append('')
        return lines

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
                if self.active is not None:
                    panel_rect = self._get_panel_rect(self.active)
                    if panel_rect and not panel_rect.collidepoint(mx, my):
                        self.pinned = False
                        self.active = None

    def _get_panel_rect(self, idx):
        if idx is None or idx >= len(self.items):
            return None
        icon_rect, title, lines = self.items[idx]
        pad = 10; line_h = 15; title_h = 20
        pw = self.MAX_W
        ph = pad + title_h + len(lines) * line_h + pad
        screen_w, screen_h = pygame.display.get_surface().get_size()

        # Icons in the sidebar: place tooltip on the canvas side so it doesn't
        # overlap the controls beneath it.
        right_boundary = self.canvas_width if self.canvas_width else screen_w
        if self.canvas_width and icon_rect.left >= self.canvas_width:
            # Anchor to the left of the canvas/sidebar boundary
            px = right_boundary - pw - 12
        else:
            px = icon_rect.right + 6
            if px + pw > screen_w:
                px = icon_rect.left - pw - 6

        px = max(4, px)
        py = icon_rect.centery - 20
        if py + ph > screen_h:
            py = screen_h - ph - 4
        if py < 4:
            py = 4
        return pygame.Rect(px, py, pw, ph)

    def draw(self, screen):
        """Draw all ⓘ icons and the active tooltip panel."""
        for i, (rect, title, lines) in enumerate(self.items):
            cx, cy = rect.centerx, rect.centery
            is_active = (i == self.hover) or (i == self.active)
            col = self.ICON_HOVER if is_active else self.ICON_COL
            pygame.draw.circle(screen, col, (cx, cy), self.ICON_R, 1)
            txt = self.sfont.render("i", True, col)
            screen.blit(txt, txt.get_rect(center=(cx, cy)))

        if self.active is not None:
            panel = self._get_panel_rect(self.active)
            if panel:
                _, title, lines = self.items[self.active]
                pad = 10; line_h = 15; title_h = 20
                surf = pygame.Surface((panel.w, panel.h), pygame.SRCALPHA)
                surf.fill(self.BG)
                pygame.draw.rect(surf, self.BORDER, (0, 0, panel.w, panel.h), 1,
                                 border_radius=6)
                screen.blit(surf, panel.topleft)
                screen.blit(self.font.render(title, True, self.TITLE_COL),
                            (panel.x + pad, panel.y + pad))
                ty = panel.y + pad + title_h
                for line in lines:
                    if line:
                        screen.blit(self.sfont.render(line, True, self.TEXT),
                                    (panel.x + pad, ty))
                    ty += line_h


# ============================================================
# SLIDER
# ============================================================

class Slider:
    """Horizontal draggable value slider with label and formatted value display."""

    def __init__(self, x, y, w, label, val, vmin, vmax, step=0.1, fmt="{:.2f}"):
        self.lx      = x
        self.tx      = x + 80
        self.tw      = w - 130
        self.ty      = y + 12
        self.rect    = pygame.Rect(x, y, w, 28)
        self.label   = label
        self.val     = val
        self.vmin    = vmin
        self.vmax    = vmax
        self.step    = step
        self.fmt     = fmt
        self.dragging = False
        self.changed  = False

    def _thumb_x(self):
        return self.tx + int((self.val - self.vmin) / (self.vmax - self.vmin + 1e-30) * self.tw)

    def handle_event(self, e):
        self.changed = False
        if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
            tx = self._thumb_x()
            if abs(e.pos[0] - tx) < 12 and abs(e.pos[1] - self.ty) < 12:
                self.dragging = True
            elif self.tx <= e.pos[0] <= self.tx + self.tw and abs(e.pos[1] - self.ty) < 10:
                self.dragging = True
                self._set(e.pos[0])
        elif e.type == pygame.MOUSEBUTTONUP:
            if self.dragging:
                self.changed = True
            self.dragging = False
        elif e.type == pygame.MOUSEMOTION and self.dragging:
            self._set(e.pos[0])

    def _set(self, mx):
        f = max(0.0, min(1.0, (mx - self.tx) / (self.tw + 1e-30)))
        self.val = round((self.vmin + f * (self.vmax - self.vmin)) / self.step) * self.step
        self.val = max(self.vmin, min(self.vmax, self.val))

    def draw(self, surf, font, accent=(59, 158, 255)):
        surf.blit(font.render(self.label, True, (107, 125, 153)), (self.lx, self.rect.y + 4))
        pygame.draw.line(surf, (30, 42, 63), (self.tx, self.ty), (self.tx + self.tw, self.ty), 4)
        tx = self._thumb_x()
        pygame.draw.line(surf, accent, (self.tx, self.ty), (tx, self.ty), 4)
        pygame.draw.circle(surf, accent, (tx, self.ty), 7)
        pygame.draw.circle(surf, (15, 21, 32), (tx, self.ty), 4)
        surf.blit(font.render(self.fmt.format(self.val), True, accent),
                  (self.tx + self.tw + 8, self.rect.y + 4))


# ============================================================
# TOGGLE
# ============================================================

class Toggle:
    """Radio-style on/off button."""

    def __init__(self, x, y, label, state=True):
        self.x     = x
        self.y     = y
        self.label = label
        self.state = state
        self.rect  = pygame.Rect(x, y, 200, 18)

    def handle_event(self, e):
        if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1 and self.rect.collidepoint(e.pos):
            self.state = not self.state
            return True
        return False

    def draw(self, surf, font, accent=(59, 158, 255)):
        cx, cy = self.x + 6, self.y + 9
        if self.state:
            pygame.draw.circle(surf, accent, (cx, cy), 6)
            pygame.draw.circle(surf, (15, 21, 32), (cx, cy), 3)
            c = (200, 212, 230)
        else:
            pygame.draw.circle(surf, (42, 58, 85), (cx, cy), 6, 2)
            c = (107, 125, 153)
        surf.blit(font.render(self.label, True, c), (self.x + 18, self.y + 1))


# ============================================================
# BUTTON GROUP
# ============================================================

class ButtonGroup:
    """Row of mutually-exclusive labelled buttons."""

    def __init__(self, x, y, opts, sel=0):
        self.x    = x
        self.y    = y
        self.opts = opts
        self.sel  = sel
        self.bw   = 80
        self.bh   = 26
        self.gap  = 4

    def handle_event(self, e):
        if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
            for i in range(len(self.opts)):
                r = pygame.Rect(self.x + i * (self.bw + self.gap), self.y, self.bw, self.bh)
                if r.collidepoint(e.pos):
                    old = self.sel
                    self.sel = i
                    return old != i
        return False

    def draw(self, surf, font, accent=(59, 158, 255)):
        for i, o in enumerate(self.opts):
            r = pygame.Rect(self.x + i * (self.bw + self.gap), self.y, self.bw, self.bh)
            if i == self.sel:
                pygame.draw.rect(surf, (30, 90, 158), r, border_radius=4)
                pygame.draw.rect(surf, accent, r, 1, border_radius=4)
                c = (255, 255, 255)
            else:
                pygame.draw.rect(surf, (21, 28, 43), r, border_radius=4)
                pygame.draw.rect(surf, (42, 58, 85), r, 1, border_radius=4)
                c = (200, 212, 230)
            t = font.render(o, True, c)
            surf.blit(t, t.get_rect(center=r.center))


# ============================================================
# DROPDOWN
# ============================================================

class Dropdown:
    """Single-select dropdown menu."""

    def __init__(self, x, y, w, opts, sel=0):
        self.x    = x
        self.y    = y
        self.w    = w
        self.h    = 26
        self.opts = opts
        self.sel  = sel
        self.open = False

    def handle_event(self, e):
        if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
            if self.open:
                for i in range(len(self.opts)):
                    if pygame.Rect(self.x, self.y + (i + 1) * self.h, self.w, self.h).collidepoint(e.pos):
                        old = self.sel
                        self.sel = i
                        self.open = False
                        return old != i
                self.open = False
            elif pygame.Rect(self.x, self.y, self.w, self.h).collidepoint(e.pos):
                self.open = True
        return False

    def draw(self, surf, font):
        r = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surf, (21, 28, 43), r, border_radius=4)
        pygame.draw.rect(surf, (42, 58, 85), r, 1, border_radius=4)
        surf.blit(font.render(self.opts[self.sel], True, (200, 212, 230)), (self.x + 8, self.y + 5))
        ax = self.x + self.w - 16
        ay = self.y + 10
        pygame.draw.polygon(surf, (107, 125, 153), [(ax, ay), (ax + 8, ay), (ax + 4, ay + 5)])
        if self.open:
            for i in range(len(self.opts)):
                dr = pygame.Rect(self.x, self.y + (i + 1) * self.h, self.w, self.h)
                bg = (30, 90, 158) if i == self.sel else (21, 28, 43)
                pygame.draw.rect(surf, bg, dr)
                pygame.draw.rect(surf, (42, 58, 85), dr, 1)
                surf.blit(font.render(self.opts[i], True, (200, 212, 230)), (self.x + 8, dr.y + 5))


# ============================================================
# BUTTON
# ============================================================

class Button:
    """Simple push button."""

    def __init__(self, x, y, w, h, label, color=(59, 158, 255), tc=(255, 255, 255)):
        self.rect  = pygame.Rect(x, y, w, h)
        self.label = label
        self.color = color
        self.tc    = tc

    def handle_event(self, e):
        return e.type == pygame.MOUSEBUTTONDOWN and e.button == 1 and self.rect.collidepoint(e.pos)

    def draw(self, surf, font):
        pygame.draw.rect(surf, self.color, self.rect, border_radius=4)
        t = font.render(self.label, True, self.tc)
        surf.blit(t, t.get_rect(center=self.rect.center))


# ============================================================
# TOOLTIP TEXT DEFINITIONS
# ============================================================

TIPS = {
    'body_type': ("Body Type",
        "Choose the shape to simulate.\n\n"
        "NACA: Standard airfoil profiles defined by 4-digit codes.\n\n"
        "Cylinder: Circular cross-section (good validation case).\n\n"
        "Square: Bluff body with sharp corners.\n\n"
        "Image: Import a PNG silhouette — draw a dark shape on white paper, "
        "photograph it, and simulate it.\n\n"
        "Draw: Click on the canvas to place control points. "
        "A smooth spline shape is fitted through them. Drag points to edit. "
        "Ctrl+Z undoes the last placed point."),

    'naca': ("NACA 4-Digit Code",
        "The four digits encode the airfoil shape:\n\n"
        "• 1st digit: maximum camber as % of chord\n"
        "• 2nd digit: position of max camber in tenths of chord\n"
        "• 3rd–4th digits: maximum thickness as % of chord\n\n"
        "Example: 2412 = 2% camber at 40% chord, 12% thick.\n"
        "0012 is symmetric (zero camber)."),

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

    'size': ("Object Size",
        "Controls the physical size of the body in the simulation domain.\n\n"
        "· NACA airfoil — sets the chord length (leading edge to trailing edge); "
        "all aerodynamic coefficients are normalised by this value: CL = L / (½ρV²c).\n"
        "· Cylinder — sets the diameter (radius = Size × 0.3).\n"
        "· Square — sets the side length (half-side = Size × 0.25)."),

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
        "Toggling off pauses shedding but keeps existing vortices visible.\n"
        "Toggle back on to resume from current state."),

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

    'cd_friction': ("Skin-Friction Drag (Cd_f)",
        "Friction drag coefficient from the integral boundary-layer solver.\n\n"
        "Cd_f = 2·∫(Cf/2) ds / chord   (summed over both surfaces)\n\n"
        "Computed using Thwaites' laminar method, Michel's transition criterion, "
        "and Head's turbulent entrainment equation. '—' means the BL solver "
        "has not yet run (requires a solved panel solution)."),

    'cd_pressure': ("Pressure Drag (Cd_p)",
        "Form (pressure) drag coefficient integrated from the Cp distribution.\n\n"
        "Cd_p = ∫ Cp · n̂x ds / chord\n\n"
        "In attached potential flow this is nearly zero (D'Alembert's paradox). "
        "Non-zero values indicate asymmetric panel distributions or numerical "
        "noise. Combine with Cd_f for total drag estimate."),

    're': ("Reynolds Number (Re)",
        "Re = V∞ · c / ν\n\n"
        "where V∞ is freestream speed, c is the chord/size, and ν = 1.5×10⁻⁵ m²/s "
        "(kinematic viscosity of air at 20°C).\n\n"
        "Re determines the flow regime:\n"
        "  Re < 10⁴: viscous, laminar\n"
        "  Re ~ 10⁵: transition range\n"
        "  Re > 10⁶: turbulent boundary layer\n\n"
        "Note: this potential-flow solver does not model viscosity — "
        "Re is shown for reference only."),

    'osc': ("Pitch Oscillation (Theodorsen)",
        "Sinusoidally pitches the body at the set frequency and amplitude.\n\n"
        "Requires Vortex Shedding to also be enabled.\n\n"
        "The Cp plot panel is replaced by a CL vs α hysteresis loop:\n"
        "  Blue = simulation result\n"
        "  Gold = Theodorsen C(k) theory prediction\n\n"
        "Reduced frequency k = π f c / V∞ sets the unsteady regime:\n"
        "  k→0 : quasi-steady (loop collapses to a point)\n"
        "  k=0.5 : typical flutter range\n"
        "  k→∞ : CL amplitude halved vs steady (Theodorsen limit)\n\n"
        "Use V∞ or Osc Freq sliders to sweep through k values. "
        "Agreement with the gold ellipse validates the Wagner/Kelvin "
        "shedding implementation."),

    'osc_freq': ("Oscillation Frequency (Hz)",
        "Pitching frequency in Hz. Combined with chord and V∞, "
        "this sets the reduced frequency k = π f c / V∞.\n\n"
        "k < 0.05: quasi-steady (negligible unsteady effects)\n"
        "k ~ 0.5:  strong unsteady — Theodorsen C(k) ≈ 0.6\n"
        "k > 1.0:  highly unsteady — C(k) approaches 0.5"),

    'osc_amp': ("Oscillation Amplitude (degrees)",
        "Peak-to-peak pitch amplitude (±A) around the base angle of attack.\n\n"
        "Keep small (≤10°) to stay in the linear lift regime where Theodorsen "
        "theory is valid. Large amplitudes will show nonlinear behaviour not "
        "predicted by the linear theory overlay."),

    'viscous': ("Viscous BL Coupling (XFOIL-style)",
        "Iteratively couples the inviscid panel method with the integral\n"
        "boundary-layer solver (Thwaites/Michel/Head) via transpiration velocity.\n\n"
        "Each iteration:\n"
        "  1. Panel solve → inviscid surface velocity Ue(s)\n"
        "  2. BL integrate → δ*(s) = θ(s) × H(s)  (displacement thickness)\n"
        "  3. Transpiration q = d(Ue·δ*)/ds added as normal-velocity BC\n"
        "  4. Panel re-solves with the corrected effective geometry\n"
        "  (5 iterations per frame for fast interactive convergence)\n\n"
        "Effects on the solution:\n"
        "  - Cp distribution shifts toward the viscous prediction\n"
        "  - CL slightly reduced (effective camber change due to BL)\n"
        "  - The faint teal outline shows the displacement body (×5 δ*)\n\n"
        "Limitations: assumes attached flow.  Accuracy degrades near "
        "the separation markers (S).  For separated flows, use a "
        "full Navier-Stokes solver."),

    'screenshot': ("Save Screenshot",
        "Save the current canvas as a PNG image.\n\n"
        "The file is saved to the current directory with a timestamped name: "
        "cfd_screenshot_YYYYMMDD_HHMMSS.png\n\n"
        "Captures the full window including the sidebar and Cp plot."),
}
