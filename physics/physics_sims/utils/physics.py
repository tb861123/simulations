"""
Shared physics constants and numerical methods.

All ODEs are integrated with the RK4 integrator defined here.
Physical constants are SI unless noted.
"""

import numpy as np
from typing import Callable, Sequence

# ── Physical constants ────────────────────────────────────────────────────────
G   = 6.674e-11    # N m² kg⁻²  gravitational constant
g   = 9.81         # m s⁻²      standard gravity
k_e = 8.988e9      # N m² C⁻²   Coulomb constant (= 1/(4πε₀))
eps0 = 8.854e-12   # F m⁻¹      permittivity of free space
mu0  = 4e-7 * np.pi  # H m⁻¹   permeability of free space
k_B  = 1.381e-23   # J K⁻¹      Boltzmann constant
N_A  = 6.022e23    # mol⁻¹      Avogadro constant
R_gas = 8.314      # J mol⁻¹ K⁻¹ molar gas constant
h_planck = 6.626e-34  # J s      Planck constant
c_light  = 3e8        # m s⁻¹   speed of light
e_charge = 1.602e-19  # C        elementary charge
m_e      = 9.109e-31  # kg       electron mass
m_p      = 1.673e-27  # kg       proton mass
m_n      = 1.675e-27  # kg       neutron mass
u_amu    = 1.661e-27  # kg       atomic mass unit

# ── RK4 integrator ────────────────────────────────────────────────────────────

def rk4_step(
    f: Callable[[float, np.ndarray], np.ndarray],
    t: float,
    y: np.ndarray,
    dt: float,
) -> np.ndarray:
    """
    Advance state y by one RK4 step.

    Parameters
    ----------
    f  : derivative function f(t, y) → dy/dt
    t  : current time (s)
    y  : current state vector (any shape)
    dt : time step (s)

    Returns
    -------
    y_new : state vector at t + dt
    """
    k1 = f(t, y)
    k2 = f(t + 0.5 * dt, y + 0.5 * dt * k1)
    k3 = f(t + 0.5 * dt, y + 0.5 * dt * k2)
    k4 = f(t + dt,        y + dt * k3)
    return y + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)


def rk4_integrate(
    f: Callable[[float, np.ndarray], np.ndarray],
    y0: np.ndarray,
    t_span: tuple[float, float],
    dt: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate dy/dt = f(t, y) from t_span[0] to t_span[1] with fixed step dt.

    Parameters
    ----------
    f      : derivative function f(t, y) → dy/dt
    y0     : initial state vector
    t_span : (t_start, t_end) in seconds
    dt     : time step (s)

    Returns
    -------
    t_arr : 1-D array of time values
    y_arr : 2-D array of shape (len(t_arr), len(y0))
    """
    t_start, t_end = t_span
    n_steps = max(1, int((t_end - t_start) / dt))
    t_arr = np.linspace(t_start, t_end, n_steps + 1)
    y_arr = np.empty((n_steps + 1, len(y0)))
    y_arr[0] = y0
    t = t_start
    y = np.array(y0, dtype=float)
    for i in range(n_steps):
        y = rk4_step(f, t, y, dt)
        t = t_arr[i + 1]
        y_arr[i + 1] = y
    return t_arr, y_arr


# ── Maxwell-Boltzmann distribution ───────────────────────────────────────────

def maxwell_boltzmann_pdf(v: np.ndarray, m: float, T: float) -> np.ndarray:
    """
    Maxwell-Boltzmann speed distribution f(v).

    Parameters
    ----------
    v : speed values (m s⁻¹)
    m : particle mass (kg)
    T : temperature (K)

    Returns
    -------
    f(v) : probability density (s m⁻¹)
    """
    a = np.sqrt(k_B * T / m)
    return (
        4 * np.pi * v**2
        * (m / (2 * np.pi * k_B * T)) ** 1.5
        * np.exp(-m * v**2 / (2 * k_B * T))
    )


def rms_speed(m: float, T: float) -> float:
    """
    RMS speed v_rms = sqrt(3 k_B T / m).

    Parameters
    ----------
    m : particle mass (kg)
    T : temperature (K)

    Returns
    -------
    v_rms (m s⁻¹)
    """
    return np.sqrt(3 * k_B * T / m)


def mean_speed(m: float, T: float) -> float:
    """
    Mean speed <v> = sqrt(8 k_B T / (π m)).

    Parameters
    ----------
    m : particle mass (kg)
    T : temperature (K)

    Returns
    -------
    <v> (m s⁻¹)
    """
    return np.sqrt(8 * k_B * T / (np.pi * m))


# ── Decay chain solver (Bateman equations) ───────────────────────────────────

def solve_decay_chain(
    lambdas: Sequence[float],
    N0: float,
    t_arr: np.ndarray,
) -> np.ndarray:
    """
    Solve a linear decay chain A→B→C→... using RK4.

    Parameters
    ----------
    lambdas : decay constants (s⁻¹) for each nuclide in the chain
    N0      : initial number of parent nuclei
    t_arr   : time array (s)

    Returns
    -------
    N : array of shape (len(t_arr), len(lambdas)) — populations vs time
    """
    n = len(lambdas)
    lam = np.array(lambdas, dtype=float)

    def deriv(t, y):
        dy = np.zeros(n)
        dy[0] = -lam[0] * y[0]
        for i in range(1, n):
            dy[i] = lam[i - 1] * y[i - 1] - lam[i] * y[i]
        return dy

    y0 = np.zeros(n)
    y0[0] = float(N0)
    dt = (t_arr[-1] - t_arr[0]) / max(len(t_arr) - 1, 1)

    _, y_arr = rk4_integrate(deriv, y0, (t_arr[0], t_arr[-1]), dt)
    # Interpolate onto t_arr grid (rk4_integrate uses linspace internally)
    t_internal = np.linspace(t_arr[0], t_arr[-1], len(y_arr))
    result = np.zeros((len(t_arr), n))
    for i in range(n):
        result[:, i] = np.interp(t_arr, t_internal, y_arr[:, i])
    return result


# ── Electric / gravitational field helpers ───────────────────────────────────

def point_charge_field(
    q: float,
    pos: np.ndarray,
    X: np.ndarray,
    Y: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Electric field and potential from a point charge.

    Parameters
    ----------
    q   : charge (C)
    pos : (x, y) position of charge (m)
    X, Y: meshgrid arrays (m)

    Returns
    -------
    Ex, Ey : field components (V m⁻¹)
    V      : potential (V)
    """
    dx = X - pos[0]
    dy = Y - pos[1]
    r2 = dx**2 + dy**2 + 1e-20   # avoid division by zero
    r3 = r2 ** 1.5
    Ex = k_e * q * dx / r3
    Ey = k_e * q * dy / r3
    V  = k_e * q / np.sqrt(r2)
    return Ex, Ey, V


def point_mass_field(
    M: float,
    pos: np.ndarray,
    X: np.ndarray,
    Y: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Gravitational field and potential from a point mass.

    Parameters
    ----------
    M   : mass (kg)
    pos : (x, y) position (m)
    X, Y: meshgrid arrays (m)

    Returns
    -------
    gx, gy : gravitational field components (N kg⁻¹)
    Vg     : gravitational potential (J kg⁻¹)
    """
    dx = X - pos[0]
    dy = Y - pos[1]
    r2 = dx**2 + dy**2 + 1e-20
    r3 = r2 ** 1.5
    gx = -G * M * dx / r3
    gy = -G * M * dy / r3
    Vg = -G * M / np.sqrt(r2)
    return gx, gy, Vg
