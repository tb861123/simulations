"""
Ideal Gas Processes — WJEC Eduqas A Level Physics
Component 1, Topic 4 (Thermal Physics); Component 3, Topic 10 (Thermodynamics)

Covers:
  Tab 1 — Gas Laws: Boyle's, Charles's, Gay-Lussac's with real-world presets
  Tab 2 — PV Diagram: isothermal, isobaric, isochoric, adiabatic processes;
           First Law of Thermodynamics (W, ΔU, Q); Carnot cycle (Advanced)
  Tab 3 — Heat Engine Cycle: Otto, Diesel, Stirling PV diagrams;
           efficiency, Carnot comparison (Advanced)
"""

from __future__ import annotations

import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components

from utils.style import COLOURS, plotly_layout, make_fig
from utils.physics import k_B, N_A, R_gas
from utils.ui_components import (
    mode_toggle,
    two_column_layout,
    physics_notes,
    metric_row,
    advanced_divider,
    sim_header,
)

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Ideal Gas Processes — WJEC A Level Physics",
    page_icon="🌡️",
    layout="wide",
)

# ── Module-level constants ────────────────────────────────────────────────────

SPEC_REF = "Component 1, Topic 4 (Thermal Physics); Component 3, Topic 10 (Thermodynamics)"

GAMMA: float = 1.4       # adiabatic index — diatomic ideal gas (air, N₂, O₂)
GAMMA_MONO: float = 5/3  # monatomic ideal gas (He, Ar)

EQUATIONS = [
    r"pV = nRT",
    r"pV^{\gamma} = \text{const} \quad \text{(adiabatic)}",
    r"W = \int P \, dV",
    r"\Delta U = Q - W \quad \text{(First Law)}",
    r"\eta = 1 - \frac{T_c}{T_h} \quad \text{(Carnot efficiency)}",
    r"\eta_{\text{Otto}} = 1 - r^{1-\gamma}",
]

EXPLANATION = (
    "**Ideal Gas Law:** For n moles of an ideal gas, $pV = nRT$. This combines "
    "Boyle's Law ($p \\propto 1/V$ at constant T), Charles's Law ($V \\propto T$ "
    "at constant p), and Gay-Lussac's Law ($p \\propto T$ at constant V).\n\n"
    "**Thermodynamic processes:** When a gas undergoes a process, we track changes "
    "in pressure (p), volume (V), and temperature (T). The four ideal processes are:\n"
    "- **Isothermal** (constant T): p = nRT/V — a hyperbola on a PV diagram.\n"
    "- **Isobaric** (constant p): V = nRT/p — a horizontal line on a PV diagram.\n"
    "- **Isochoric** (constant V): p = nRT/V — a vertical line on a PV diagram.\n"
    "- **Adiabatic** (no heat exchange): pV^γ = const — steeper than isothermal.\n\n"
    "**First Law of Thermodynamics:** The change in internal energy equals the heat "
    "added minus the work done by the gas: ΔU = Q − W. Work done BY the gas equals "
    "the area under the PV curve.\n\n"
    "**Heat engines** convert thermal energy into mechanical work. No engine can be "
    "100% efficient — heat must always be rejected to the cold reservoir."
)

ADVANCED_TEXT = (
    "**Entropy and the Second Law of Thermodynamics:**\n\n"
    "Entropy S is a measure of disorder or the number of accessible microstates "
    "($S = k_B \\ln \\Omega$). The Second Law states that the total entropy of an "
    "isolated system never decreases: $\\Delta S_{\\text{total}} \\geq 0$.\n\n"
    "For a reversible process: $dS = dQ/T$. For an irreversible process: $dS > dQ/T$. "
    "An adiabatic reversible process has $\\Delta S = 0$ (isentropic).\n\n"
    "**Carnot's Theorem:** No heat engine operating between two thermal reservoirs at "
    "$T_h$ (hot) and $T_c$ (cold) can be more efficient than a Carnot engine: "
    "$\\eta_{\\text{Carnot}} = 1 - T_c/T_h$. This is a direct consequence of the "
    "Second Law — 100% efficiency would require $T_c = 0$ K (impossible) or "
    "$\\Delta S_{\\text{universe}} < 0$ (forbidden).\n\n"
    "**Why 100% efficiency is impossible:** For a cyclic process, $\\Delta U = 0$, "
    "so $Q_{\\text{net}} = W_{\\text{net}}$. Some heat must be dumped to the cold "
    "reservoir to return the working fluid to its initial state. Mathematically, "
    "$\\oint dQ/T \\leq 0$ (Clausius inequality).\n\n"
    "**Refrigerators (reverse heat engines):** A refrigerator does work W to pump "
    "heat $Q_c$ from the cold reservoir and reject $Q_h = Q_c + W$ to the hot "
    "reservoir. Its coefficient of performance is COP $= Q_c/W = T_c/(T_h - T_c)$ "
    "for an ideal (Carnot) refrigerator — higher than 1 is perfectly fine!\n\n"
    "**Real vs ideal engines:** Real Otto engines achieve ~25–35% efficiency vs "
    "~60% theoretical. Losses arise from: friction, heat loss through cylinder walls, "
    "non-instantaneous valve timing, turbulence, and incomplete combustion."
)

# ── Real-world presets (Tab 1) ────────────────────────────────────────────────

GAS_PRESETS = {
    "Custom": None,
    "Bicycle tyre (pumping up)": {
        "n": 0.002, "T": 293.0, "P0": 3e5,
        "note": (
            "A bicycle tyre at 3 bar absolute pressure (~2 bar gauge). As you pump, "
            "you add moles of air — n increases, P increases. Temperature rises "
            "slightly from compression."
        ),
    },
    "Car engine cylinder": {
        "n": 0.001, "T": 700.0, "P0": 1.5e6,
        "note": (
            "At top dead centre, a petrol engine reaches ~1.5 MPa and 700 K. "
            "The rapid adiabatic compression heats the air-fuel mixture, enabling "
            "ignition."
        ),
    },
    "Scuba tank": {
        "n": 0.5, "T": 293.0, "P0": 2e7,
        "note": (
            "A 12-litre scuba tank at 200 bar contains ~2400 litres of air at "
            "surface pressure — enough for ~45 minutes diving. Boyle's law governs "
            "how long the air lasts at depth."
        ),
    },
    "Hot air balloon": {
        "n": 100.0, "T": 373.0, "P0": 1e5,
        "note": (
            "A hot air balloon heats the air inside to ~100°C. By Charles's Law, "
            "the same mass of air occupies more volume — less dense than outside "
            "air, producing buoyancy."
        ),
    },
    "Weather balloon": {
        "n": 0.5, "T": 293.0, "P0": 1e5,
        "note": (
            "A weather balloon expands from ~1 m³ at ground level to ~100 m³ at "
            "30 km altitude (P ≈ 1 kPa). Boyle's law: PV = const at constant T."
        ),
    },
}


# ── Cached computation helpers ────────────────────────────────────────────────


@st.cache_data(show_spinner=False)
def compute_boyles_law(n: float, T: float, n_pts: int = 300) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute Boyle's Law curve: P vs V at constant T.

    Parameters
    ----------
    n     : moles
    T     : temperature (K)
    n_pts : number of points

    Returns
    -------
    V_arr : volume array (m³)
    P_arr : pressure array (Pa)
    """
    V_min = n * R_gas * T / 5e6   # V at P = 5 MPa
    V_max = n * R_gas * T / 1e3   # V at P = 1 kPa
    V_arr = np.linspace(max(V_min, 1e-6), V_max, n_pts)
    P_arr = n * R_gas * T / V_arr
    return V_arr, P_arr


@st.cache_data(show_spinner=False)
def compute_charles_law(n: float, P: float, n_pts: int = 300) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute Charles's Law curve: V vs T at constant P.

    Returns T_arr (K) and V_arr (m³).
    """
    T_arr = np.linspace(10.0, 1000.0, n_pts)
    V_arr = n * R_gas * T_arr / P
    return T_arr, V_arr


@st.cache_data(show_spinner=False)
def compute_gay_lussac_law(n: float, V: float, n_pts: int = 300) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute Gay-Lussac's Law curve: P vs T at constant V.

    Returns T_arr (K) and P_arr (Pa).
    """
    T_arr = np.linspace(10.0, 1000.0, n_pts)
    P_arr = n * R_gas * T_arr / V
    return T_arr, P_arr


@st.cache_data(show_spinner=False)
def compute_pv_process(
    n: float,
    T_start: float,
    P_start: float,
    process: str,
    end_param: float,
    gamma: float = GAMMA,
    n_pts: int = 300,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """
    Compute a thermodynamic process on the PV diagram.

    Parameters
    ----------
    n          : moles
    T_start    : initial temperature (K)
    P_start    : initial pressure (Pa)
    process    : one of 'isothermal', 'isobaric', 'isochoric', 'adiabatic'
    end_param  : for isothermal/adiabatic: V_end (m³);
                 for isobaric: V_end (m³);
                 for isochoric: P_end (Pa)
    gamma      : adiabatic index
    n_pts      : number of curve points

    Returns
    -------
    V_arr  : volume array (m³)
    P_arr  : pressure array (Pa)
    thermo : dict with W, delta_U, Q, delta_T, delta_V, T_end
    """
    V_start = n * R_gas * T_start / P_start

    if process == "isothermal":
        V_end = max(end_param, V_start * 0.01)
        V_arr = np.linspace(min(V_start, V_end), max(V_start, V_end), n_pts)
        P_arr = n * R_gas * T_start / V_arr
        # W = nRT ln(V2/V1)
        W = n * R_gas * T_start * np.log(V_end / V_start)
        T_end = T_start
        delta_T = 0.0
        delta_U = 0.0       # isothermal ideal gas: ΔU = 0
        Q = W               # First Law: Q = ΔU + W

    elif process == "isobaric":
        V_end = max(end_param, 1e-9)
        V_arr = np.linspace(min(V_start, V_end), max(V_start, V_end), n_pts)
        P_arr = np.full(n_pts, P_start)
        W = P_start * (V_end - V_start)
        T_end = P_start * V_end / (n * R_gas)
        delta_T = T_end - T_start
        # ΔU = (5/2)nRΔT for diatomic
        delta_U = (5.0 / 2.0) * n * R_gas * delta_T
        Q = delta_U + W

    elif process == "isochoric":
        P_end = max(end_param, 1e-3)
        V_arr = np.array([V_start, V_start])
        P_arr = np.array([P_start, P_end])
        W = 0.0
        T_end = P_end * V_start / (n * R_gas)
        delta_T = T_end - T_start
        delta_U = (5.0 / 2.0) * n * R_gas * delta_T
        Q = delta_U  # First Law: Q = ΔU (no work done)

    elif process == "adiabatic":
        V_end = max(end_param, V_start * 0.01)
        V_arr = np.linspace(min(V_start, V_end), max(V_start, V_end), n_pts)
        P_arr = P_start * (V_start / V_arr) ** gamma
        P_end = P_start * (V_start / V_end) ** gamma
        T_end = P_end * V_end / (n * R_gas)
        delta_T = T_end - T_start
        # W = (P1V1 - P2V2) / (γ-1)
        W = (P_start * V_start - P_end * V_end) / (gamma - 1.0)
        delta_U = (5.0 / 2.0) * n * R_gas * delta_T
        Q = 0.0  # adiabatic: no heat exchange

    else:
        raise ValueError(f"Unknown process: {process}")

    delta_V = float(V_arr[-1] - V_arr[0])
    thermo = {
        "W": float(W),
        "delta_U": float(delta_U),
        "Q": float(Q),
        "delta_T": float(delta_T),
        "delta_V": float(delta_V),
        "T_end": float(T_end),
        "V_start": float(V_start),
        "V_end": float(V_arr[-1]),
        "P_end": float(P_arr[-1]),
    }
    return V_arr, P_arr, thermo


@st.cache_data(show_spinner=False)
def compute_otto_cycle(
    n: float,
    T_low: float,
    T_high: float,
    r_compression: float,
    P1: float,
    gamma: float = GAMMA,
    n_pts: int = 200,
) -> dict:
    """
    Compute the four-stroke Otto cycle states and curves.

    State labels:
      1 → bottom dead centre (intake stroke end)
      2 → top dead centre after isentropic compression
      3 → top dead centre after isochoric heat addition
      4 → bottom dead centre after isentropic expansion

    Parameters
    ----------
    n              : moles
    T_low          : temperature at state 1 (K)
    T_high         : temperature at state 3 (K)
    r_compression  : compression ratio V1/V2
    P1             : pressure at state 1 (Pa)
    gamma          : adiabatic index
    n_pts          : points per curve

    Returns
    -------
    dict with state dicts (P, V, T), curve arrays (V, P for each stroke),
    thermodynamic quantities (W_net, Q_in, Q_out, eta, eta_carnot)
    """
    # State 1 (bottom, before compression)
    V1 = n * R_gas * T_low / P1
    V2 = V1 / r_compression

    # State 2 (after isentropic compression, 1→2)
    P2 = P1 * r_compression ** gamma
    T2 = T_low * r_compression ** (gamma - 1.0)

    # State 3 (after isochoric heat addition, 2→3)
    # T3 = T_high, V3 = V2
    V3 = V2
    T3 = T_high
    P3 = n * R_gas * T3 / V3

    # State 4 (after isentropic expansion, 3→4)
    # V4 = V1 (same as start)
    V4 = V1
    P4 = P3 * (V3 / V4) ** gamma
    T4 = T3 * (V3 / V4) ** (gamma - 1.0)

    # Thermodynamics
    Q_in = (5.0 / 2.0) * n * R_gas * (T3 - T2)    # isochoric heat in
    Q_out = (5.0 / 2.0) * n * R_gas * (T4 - T_low) # isochoric heat out (magnitude)
    W_net = Q_in - Q_out
    eta = W_net / Q_in if Q_in > 0 else 0.0
    eta_theoretical = 1.0 - r_compression ** (1.0 - gamma)
    eta_carnot = 1.0 - T_low / T_high if T_high > T_low else 0.0

    # Curve segments
    # 1→2: isentropic compression
    V_12 = np.linspace(V1, V2, n_pts)
    P_12 = P1 * (V1 / V_12) ** gamma

    # 2→3: isochoric heat addition
    V_23 = np.array([V2, V3])
    P_23 = np.array([P2, P3])

    # 3→4: isentropic expansion
    V_34 = np.linspace(V3, V4, n_pts)
    P_34 = P3 * (V3 / V_34) ** gamma

    # 4→1: isochoric heat rejection
    V_41 = np.array([V4, V1])
    P_41 = np.array([P4, P1])

    states = {
        1: {"V": V1, "P": P1, "T": T_low},
        2: {"V": V2, "P": P2, "T": T2},
        3: {"V": V3, "P": P3, "T": T3},
        4: {"V": V4, "P": P4, "T": T4},
    }

    return {
        "states": states,
        "curves": {
            "12": (V_12, P_12),
            "23": (V_23, P_23),
            "34": (V_34, P_34),
            "41": (V_41, P_41),
        },
        "Q_in": float(Q_in),
        "Q_out": float(Q_out),
        "W_net": float(W_net),
        "eta": float(eta),
        "eta_theoretical": float(eta_theoretical),
        "eta_carnot": float(eta_carnot),
        "T2": float(T2),
        "T4": float(T4),
    }


@st.cache_data(show_spinner=False)
def compute_diesel_cycle(
    n: float,
    T_low: float,
    r_compression: float,
    r_cutoff: float,
    P1: float,
    gamma: float = GAMMA,
    n_pts: int = 200,
) -> dict:
    """
    Compute the Diesel cycle (isentropic compression, isobaric heat addition,
    isentropic expansion, isochoric heat rejection).

    Parameters
    ----------
    n            : moles
    T_low        : temperature at state 1 (K)
    r_compression: compression ratio V1/V2
    r_cutoff     : cutoff ratio V3/V2 (V3 = volume when fuel injection ends)
    P1           : pressure at state 1 (Pa)
    gamma        : adiabatic index

    Returns
    -------
    dict matching structure of compute_otto_cycle
    """
    V1 = n * R_gas * T_low / P1
    V2 = V1 / r_compression

    # State 2 (after isentropic compression)
    P2 = P1 * r_compression ** gamma
    T2 = T_low * r_compression ** (gamma - 1.0)

    # State 3 (after isobaric heat addition)
    V3 = V2 * r_cutoff
    P3 = P2          # isobaric
    T3 = T2 * r_cutoff

    # State 4 (after isentropic expansion back to V1)
    V4 = V1
    P4 = P3 * (V3 / V4) ** gamma
    T4 = T3 * (V3 / V4) ** (gamma - 1.0)

    Q_in = (gamma / (gamma - 1.0)) * n * R_gas * (T3 - T2)    # isobaric Cp*ΔT
    Q_out = (1.0 / (gamma - 1.0)) * n * R_gas * (T4 - T_low)  # isochoric Cv*ΔT
    W_net = Q_in - Q_out
    eta = W_net / Q_in if Q_in > 0 else 0.0

    # Curves
    V_12 = np.linspace(V1, V2, n_pts)
    P_12 = P1 * (V1 / V_12) ** gamma

    V_23 = np.linspace(V2, V3, n_pts // 4)
    P_23 = np.full_like(V_23, P2)

    V_34 = np.linspace(V3, V4, n_pts)
    P_34 = P3 * (V3 / V_34) ** gamma

    V_41 = np.array([V4, V1])
    P_41 = np.array([P4, P1])

    states = {
        1: {"V": V1, "P": P1, "T": T_low},
        2: {"V": V2, "P": P2, "T": T2},
        3: {"V": V3, "P": P3, "T": T3},
        4: {"V": V4, "P": P4, "T": T4},
    }

    return {
        "states": states,
        "curves": {
            "12": (V_12, P_12),
            "23": (V_23, P_23),
            "34": (V_34, P_34),
            "41": (V_41, P_41),
        },
        "Q_in": float(Q_in),
        "Q_out": float(Q_out),
        "W_net": float(W_net),
        "eta": float(eta),
        "eta_carnot": 1.0 - T_low / T3 if T3 > T_low else 0.0,
        "T2": float(T2),
        "T3": float(T3),
        "T4": float(T4),
    }


@st.cache_data(show_spinner=False)
def compute_stirling_cycle(
    n: float,
    T_low: float,
    T_high: float,
    V_min: float,
    r_volume: float,
    n_pts: int = 200,
) -> dict:
    """
    Compute the Stirling cycle:
    1→2 isothermal expansion at T_high
    2→3 isochoric cooling
    3→4 isothermal compression at T_low
    4→1 isochoric heating

    Parameters
    ----------
    n        : moles
    T_low    : cold temperature (K)
    T_high   : hot temperature (K)
    V_min    : minimum volume (m³)
    r_volume : volume ratio V_max/V_min

    Returns
    -------
    dict with states, curves, thermodynamic quantities
    """
    V_max = V_min * r_volume
    P1 = n * R_gas * T_high / V_min
    P2 = n * R_gas * T_high / V_max
    P3 = n * R_gas * T_low / V_max
    P4 = n * R_gas * T_low / V_min

    # Curves
    V_12 = np.linspace(V_min, V_max, n_pts)
    P_12 = n * R_gas * T_high / V_12

    V_23 = np.array([V_max, V_max])
    P_23 = np.array([P2, P3])

    V_34 = np.linspace(V_max, V_min, n_pts)
    P_34 = n * R_gas * T_low / V_34

    V_41 = np.array([V_min, V_min])
    P_41 = np.array([P4, P1])

    W_12 = n * R_gas * T_high * np.log(r_volume)   # isothermal expansion work
    W_34 = -n * R_gas * T_low * np.log(r_volume)    # isothermal compression work
    W_net = W_12 + W_34

    Q_in = W_12  # regenerator recovers isochoric heat; net Q_in = isothermal expansion
    eta = W_net / Q_in if Q_in > 0 else 0.0
    eta_carnot = 1.0 - T_low / T_high if T_high > T_low else 0.0

    states = {
        1: {"V": V_min, "P": P1, "T": T_high},
        2: {"V": V_max, "P": P2, "T": T_high},
        3: {"V": V_max, "P": P3, "T": T_low},
        4: {"V": V_min, "P": P4, "T": T_low},
    }

    return {
        "states": states,
        "curves": {
            "12": (V_12, P_12),
            "23": (V_23, P_23),
            "34": (V_34, P_34),
            "41": (V_41, P_41),
        },
        "Q_in": float(Q_in),
        "W_net": float(W_net),
        "eta": float(eta),
        "eta_carnot": float(eta_carnot),
    }


# ── Plot builders ─────────────────────────────────────────────────────────────


def build_gas_law_fig(
    law: str,
    n: float,
    T: float = 300.0,
    P: float = 1e5,
    V: float = 0.01,
    T_slider: float = 300.0,
    P_slider: float = 1e5,
    V_slider: float = 0.01,
    show_all: bool = False,
) -> go.Figure:
    """
    Build the gas law plot for one of the three gas laws or all three.

    Parameters
    ----------
    law      : 'boyle', 'charles', 'gay_lussac', or 'all'
    n        : moles
    T        : temperature for Boyle's Law (K)
    P        : pressure for Charles's Law (Pa)
    V        : volume for Gay-Lussac's Law (m³)
    T_slider : current temperature (used to mark state point for Boyle)
    P_slider : current pressure (used to mark state point for Charles)
    V_slider : current volume (used to mark state point for Gay-Lussac)
    show_all : if True, overlay three isotherms

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    if law == "boyle" or show_all:
        if show_all:
            for fac, label, colour in [
                (0.5, "T/2", COLOURS["tertiary"]),
                (1.0, "T", COLOURS["primary"]),
                (2.0, "2T", COLOURS["secondary"]),
            ]:
                V_arr, P_arr = compute_boyles_law(n, T * fac)
                fig.add_trace(go.Scatter(
                    x=V_arr * 1e3,  # m³ → litres
                    y=P_arr / 1e3,  # Pa → kPa
                    mode="lines",
                    name=f"Isotherm {label} ({T * fac:.0f} K)",
                    line=dict(color=colour, width=2),
                ))
            # Mark current state point on T isotherm
            V_pt = n * R_gas * T / (P_slider)
            fig.add_trace(go.Scatter(
                x=[V_pt * 1e3], y=[P_slider / 1e3],
                mode="markers",
                name="Current state",
                marker=dict(color=COLOURS["highlight"], size=12, symbol="circle",
                            line=dict(color=COLOURS["text"], width=1.5)),
            ))
            fig.update_layout(**plotly_layout(
                height=420,
                title=dict(text="Boyle's Law — PV Isotherms", font=dict(size=14)),
                xaxis=dict(title="Volume V (litres)", gridcolor=COLOURS["grid"],
                           linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
                yaxis=dict(title="Pressure P (kPa)", gridcolor=COLOURS["grid"],
                           linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
            ))
        else:
            V_arr, P_arr = compute_boyles_law(n, T)
            fig.add_trace(go.Scatter(
                x=V_arr * 1e3,
                y=P_arr / 1e3,
                mode="lines",
                name=f"PV = nRT (T = {T:.0f} K)",
                line=dict(color=COLOURS["primary"], width=2.5),
            ))
            # Mark current state point
            V_pt = n * R_gas * T / P_slider
            fig.add_trace(go.Scatter(
                x=[V_pt * 1e3], y=[P_slider / 1e3],
                mode="markers",
                name=f"State (P={P_slider/1e3:.1f} kPa, V={V_pt*1e3:.3f} L)",
                marker=dict(color=COLOURS["highlight"], size=14, symbol="circle",
                            line=dict(color=COLOURS["text"], width=2)),
            ))
            fig.update_layout(**plotly_layout(
                height=420,
                title=dict(text=f"Boyle's Law: P ∝ 1/V (T = {T:.0f} K constant)",
                           font=dict(size=14)),
                xaxis=dict(title="Volume V (litres)", gridcolor=COLOURS["grid"],
                           linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
                yaxis=dict(title="Pressure P (kPa)", gridcolor=COLOURS["grid"],
                           linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
            ))

    elif law == "charles":
        T_arr, V_arr = compute_charles_law(n, P)
        fig.add_trace(go.Scatter(
            x=T_arr,
            y=V_arr * 1e3,
            mode="lines",
            name=f"V = nRT/P (P = {P/1e3:.1f} kPa)",
            line=dict(color=COLOURS["secondary"], width=2.5),
        ))
        # Current state point
        V_pt = n * R_gas * T_slider / P
        fig.add_trace(go.Scatter(
            x=[T_slider], y=[V_pt * 1e3],
            mode="markers",
            name=f"State (T={T_slider:.0f} K, V={V_pt*1e3:.3f} L)",
            marker=dict(color=COLOURS["highlight"], size=14, symbol="circle",
                        line=dict(color=COLOURS["text"], width=2)),
        ))
        # Extrapolation to absolute zero (dashed)
        T_extrap = np.linspace(0, 10, 10)
        V_extrap = n * R_gas * T_extrap / P
        fig.add_trace(go.Scatter(
            x=T_extrap, y=V_extrap * 1e3,
            mode="lines",
            name="Extrapolation to 0 K",
            line=dict(color=COLOURS["secondary"], width=1.5, dash="dash"),
            opacity=0.5,
        ))
        fig.add_vline(x=0, line=dict(color=COLOURS["highlight"], width=1.5, dash="dot"))
        fig.add_annotation(x=10, y=0, text="Absolute zero (0 K)",
                           showarrow=False, font=dict(color=COLOURS["highlight"], size=10),
                           xshift=40)
        fig.update_layout(**plotly_layout(
            height=420,
            title=dict(text=f"Charles's Law: V ∝ T (P = {P/1e3:.1f} kPa constant)",
                       font=dict(size=14)),
            xaxis=dict(title="Temperature T (K)", range=[-20, 1010],
                       gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                       zerolinecolor=COLOURS["grid"]),
            yaxis=dict(title="Volume V (litres)", rangemode="tozero",
                       gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                       zerolinecolor=COLOURS["grid"]),
        ))

    elif law == "gay_lussac":
        T_arr, P_arr = compute_gay_lussac_law(n, V)
        fig.add_trace(go.Scatter(
            x=T_arr,
            y=P_arr / 1e3,
            mode="lines",
            name=f"P = nRT/V (V = {V*1e3:.2f} L)",
            line=dict(color=COLOURS["tertiary"], width=2.5),
        ))
        # Current state point
        P_pt = n * R_gas * T_slider / V
        fig.add_trace(go.Scatter(
            x=[T_slider], y=[P_pt / 1e3],
            mode="markers",
            name=f"State (T={T_slider:.0f} K, P={P_pt/1e3:.1f} kPa)",
            marker=dict(color=COLOURS["highlight"], size=14, symbol="circle",
                        line=dict(color=COLOURS["text"], width=2)),
        ))
        fig.update_layout(**plotly_layout(
            height=420,
            title=dict(text=f"Gay-Lussac's Law: P ∝ T (V = {V*1e3:.2f} L constant)",
                       font=dict(size=14)),
            xaxis=dict(title="Temperature T (K)", gridcolor=COLOURS["grid"],
                       linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
            yaxis=dict(title="Pressure P (kPa)", rangemode="tozero",
                       gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                       zerolinecolor=COLOURS["grid"]),
        ))

    return fig


def build_pv_diagram(
    n: float,
    T_start: float,
    P_start: float,
    processes: list[str],
    V_end_iso: float,
    V_end_isobaric: float,
    P_end_isochoric: float,
    V_end_adiabatic: float,
    gamma: float = GAMMA,
    show_carnot: bool = False,
    T_carnot_cold: float = 200.0,
) -> tuple[go.Figure, dict]:
    """
    Build the PV diagram with selected thermodynamic process curves.

    Parameters
    ----------
    n                  : moles
    T_start, P_start   : initial state
    processes          : list of process names to show
    V_end_*            : end volume/pressure for each process
    gamma              : adiabatic index
    show_carnot        : overlay Carnot cycle
    T_carnot_cold      : cold reservoir temperature for Carnot (K)

    Returns
    -------
    (fig, thermo_dict) : figure and dict of thermodynamic results per process
    """
    V_start = n * R_gas * T_start / P_start
    fig = go.Figure()
    thermo_results = {}

    process_config = {
        "Isothermal": ("isothermal", V_end_iso, COLOURS["primary"], "solid"),
        "Isobaric": ("isobaric", V_end_isobaric, COLOURS["secondary"], "solid"),
        "Isochoric": ("isochoric", P_end_isochoric, COLOURS["tertiary"], "solid"),
        "Adiabatic": ("adiabatic", V_end_adiabatic, COLOURS["advanced"], "solid"),
    }

    for label, (proc_key, end_val, colour, dash) in process_config.items():
        if label not in processes:
            continue
        try:
            V_arr, P_arr, thermo = compute_pv_process(
                n, T_start, P_start, proc_key, end_val, gamma
            )
        except Exception:
            continue
        thermo_results[label] = thermo

        hover = (f"{label}<br>V=%{{x:.4f}} m³<br>P=%{{y:.2e}} Pa<extra></extra>")
        fig.add_trace(go.Scatter(
            x=V_arr,
            y=P_arr,
            mode="lines",
            name=label,
            line=dict(color=colour, width=2.5, dash=dash),
            hovertemplate=hover,
        ))

        # End-state marker
        fig.add_trace(go.Scatter(
            x=[V_arr[-1]], y=[P_arr[-1]],
            mode="markers",
            name=f"{label} end",
            marker=dict(color=colour, size=10, symbol="circle-open",
                        line=dict(color=colour, width=2)),
            showlegend=False,
        ))

        # Arrow annotation at mid-curve showing direction
        mid = len(V_arr) // 2
        if len(V_arr) > 3:
            dx = float(V_arr[min(mid + 1, len(V_arr) - 1)] - V_arr[max(mid - 1, 0)])
            dy = float(P_arr[min(mid + 1, len(P_arr) - 1)] - P_arr[max(mid - 1, 0)])
            if abs(dx) + abs(dy) > 0:
                fig.add_annotation(
                    x=float(V_arr[mid]), y=float(P_arr[mid]),
                    ax=float(V_arr[mid]) - dx * 0.3,
                    ay=float(P_arr[mid]) - dy * 0.3,
                    xref="x", yref="y", axref="x", ayref="y",
                    showarrow=True, arrowhead=2, arrowsize=1.2, arrowwidth=2,
                    arrowcolor=colour, text="",
                )

    # Initial state marker
    fig.add_trace(go.Scatter(
        x=[V_start], y=[P_start],
        mode="markers+text",
        name="Initial state",
        text=["  State 0"],
        textposition="middle right",
        textfont=dict(color=COLOURS["text"], size=11),
        marker=dict(color=COLOURS["highlight"], size=14, symbol="circle",
                    line=dict(color=COLOURS["text"], width=1.5)),
    ))

    # Carnot cycle overlay (Advanced mode)
    if show_carnot and T_carnot_cold < T_start:
        _build_carnot_overlay(fig, n, T_start, T_carnot_cold, P_start, gamma)

    # Axis limits: collect all visible V and P values
    all_V, all_P = [V_start], [P_start]
    for proc_key in ["Isothermal", "Isobaric", "Isochoric", "Adiabatic"]:
        if proc_key in thermo_results:
            r = thermo_results[proc_key]
            all_V.extend([r["V_start"], r["V_end"]])
            all_P.extend([r.get("P_end", P_start), P_start])
    if all_V and all_P:
        V_lo = max(0, min(all_V) * 0.7)
        V_hi = max(all_V) * 1.3
        P_lo = max(0, min(all_P) * 0.7)
        P_hi = max(all_P) * 1.3
    else:
        V_lo, V_hi = 0, V_start * 3
        P_lo, P_hi = 0, P_start * 3

    fig.update_layout(**plotly_layout(
        height=480,
        title=dict(text="PV Diagram — Thermodynamic Processes", font=dict(size=14)),
        xaxis=dict(title="Volume V (m³)", range=[V_lo, V_hi],
                   gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                   zerolinecolor=COLOURS["grid"]),
        yaxis=dict(title="Pressure P (Pa)", range=[P_lo, P_hi],
                   gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                   zerolinecolor=COLOURS["grid"]),
    ))
    return fig, thermo_results


def _build_carnot_overlay(
    fig: go.Figure,
    n: float,
    T_hot: float,
    T_cold: float,
    P_start: float,
    gamma: float,
) -> None:
    """Add Carnot cycle (two isothermals + two adiabatics) to existing figure."""
    V_start = n * R_gas * T_hot / P_start
    V_end_iso_hot = V_start * 3.0   # expand to 3× volume at T_hot

    # Hot isotherm (1→2)
    V_12 = np.linspace(V_start, V_end_iso_hot, 200)
    P_12 = n * R_gas * T_hot / V_12

    # Adiabatic expansion (2→3): reach T_cold
    V2 = V_end_iso_hot
    P2 = n * R_gas * T_hot / V2
    # T_cold = T_hot * (V2/V3)^(γ-1)  → V3 = V2 * (T_hot/T_cold)^(1/(γ-1))
    V3 = V2 * (T_hot / T_cold) ** (1.0 / (gamma - 1.0))
    V_23 = np.linspace(V2, V3, 200)
    P_23 = P2 * (V2 / V_23) ** gamma

    # Cold isotherm (3→4): compress back
    V4 = V_start * (T_cold / T_hot) ** (1.0 / (gamma - 1.0))
    V_34 = np.linspace(V3, V4, 200)
    P_34 = n * R_gas * T_cold / V_34

    # Adiabatic compression (4→1): back to start
    V_41 = np.linspace(V4, V_start, 200)
    P4 = n * R_gas * T_cold / V4
    P_41 = P4 * (V4 / V_41) ** gamma

    # Filled cycle area
    V_cycle = np.concatenate([V_12, V_23, V_34, V_41])
    P_cycle = np.concatenate([P_12, P_23, P_34, P_41])
    fig.add_trace(go.Scatter(
        x=V_cycle, y=P_cycle,
        mode="lines",
        fill="toself",
        fillcolor="rgba(155,89,182,0.12)",
        line=dict(color=COLOURS["advanced"], width=1.5, dash="dot"),
        name=f"Carnot (η={1-T_cold/T_hot:.1%})",
    ))

    eta_carnot = 1.0 - T_cold / T_hot
    mid_V = float(np.mean([V_start, V3]))
    mid_P = float(np.mean([P_start, float(P_34[len(P_34)//2])]))
    fig.add_annotation(
        x=mid_V, y=mid_P,
        text=f"η_Carnot = {eta_carnot:.1%}<br>T_h={T_hot:.0f} K, T_c={T_cold:.0f} K",
        showarrow=False,
        font=dict(color=COLOURS["advanced"], size=10),
        bgcolor="rgba(0,0,0,0.5)",
        bordercolor=COLOURS["advanced"],
    )


def build_engine_pv_fig(
    cycle_data: dict,
    cycle_name: str,
    diesel_data: dict | None = None,
    show_diesel: bool = False,
) -> go.Figure:
    """
    Build PV diagram for a heat engine cycle with numbered state vertices.

    Parameters
    ----------
    cycle_data  : dict from compute_otto_cycle / compute_stirling_cycle
    cycle_name  : label for the cycle (e.g. "Otto")
    diesel_data : optional Diesel cycle data for comparison overlay
    show_diesel : whether to overlay Diesel cycle

    Returns
    -------
    Plotly Figure
    """
    fig = go.Figure()

    states = cycle_data["states"]
    curves = cycle_data["curves"]

    # Colour map for strokes
    stroke_colours = {
        "12": COLOURS["primary"],
        "23": COLOURS["secondary"],
        "34": COLOURS["tertiary"],
        "41": COLOURS["highlight"],
    }
    stroke_labels_otto = {
        "12": "1→2 Isentropic compression",
        "23": "2→3 Isochoric heat addition",
        "34": "3→4 Isentropic expansion",
        "41": "4→1 Isochoric heat rejection",
    }
    stroke_labels_stirling = {
        "12": "1→2 Isothermal expansion",
        "23": "2→3 Isochoric cooling",
        "34": "3→4 Isothermal compression",
        "41": "4→1 Isochoric heating",
    }
    if cycle_name == "Stirling":
        stroke_labels = stroke_labels_stirling
    else:
        stroke_labels = stroke_labels_otto

    # Filled cycle area
    V_all = np.concatenate([curves[k][0] for k in ["12", "23", "34", "41"]])
    P_all = np.concatenate([curves[k][1] for k in ["12", "23", "34", "41"]])
    fig.add_trace(go.Scatter(
        x=V_all, y=P_all,
        mode="lines",
        fill="toself",
        fillcolor="rgba(31,119,180,0.12)",
        line=dict(color="rgba(0,0,0,0)"),
        name=f"Work area (W = {cycle_data['W_net']:.1f} J)",
        hoverinfo="skip",
    ))

    # Draw each stroke
    for key in ["12", "23", "34", "41"]:
        V_s, P_s = curves[key]
        fig.add_trace(go.Scatter(
            x=V_s, y=P_s,
            mode="lines",
            name=f"{cycle_name}: {stroke_labels[key]}",
            line=dict(color=stroke_colours[key], width=2.5),
        ))

    # State point markers with labels
    state_colours = {
        1: COLOURS["primary"],
        2: COLOURS["secondary"],
        3: COLOURS["tertiary"],
        4: COLOURS["highlight"],
    }
    for i, state in states.items():
        fig.add_trace(go.Scatter(
            x=[state["V"]], y=[state["P"]],
            mode="markers+text",
            name=f"State {i}",
            text=[f"  {i}"],
            textposition="middle right",
            textfont=dict(color=state_colours[i], size=13, family="bold"),
            marker=dict(color=state_colours[i], size=12, symbol="circle",
                        line=dict(color=COLOURS["text"], width=1.5)),
            customdata=[[state["T"]]],
            hovertemplate=(
                f"State {i}<br>"
                "V = %{x:.4f} m³<br>"
                "P = %{y:.2e} Pa<br>"
                "T = %{customdata[0]:.1f} K"
                "<extra></extra>"
            ),
        ))

    # Optional Diesel overlay
    if show_diesel and diesel_data is not None:
        d_curves = diesel_data["curves"]
        d_V_all = np.concatenate([d_curves[k][0] for k in ["12", "23", "34", "41"]])
        d_P_all = np.concatenate([d_curves[k][1] for k in ["12", "23", "34", "41"]])
        fig.add_trace(go.Scatter(
            x=d_V_all, y=d_P_all,
            mode="lines",
            fill="toself",
            fillcolor="rgba(255,127,14,0.08)",
            line=dict(color=COLOURS["secondary"], width=2, dash="dash"),
            name=f"Diesel (η={diesel_data['eta']:.1%})",
        ))

    # Axis limits
    all_V_pts = [s["V"] for s in states.values()]
    all_P_pts = [s["P"] for s in states.values()]
    V_lo = min(all_V_pts) * 0.8
    V_hi = max(all_V_pts) * 1.25
    P_lo = 0
    P_hi = max(all_P_pts) * 1.2

    fig.update_layout(**plotly_layout(
        height=500,
        title=dict(text=f"{cycle_name} Cycle — PV Diagram", font=dict(size=14)),
        xaxis=dict(title="Volume V (m³)", range=[V_lo, V_hi],
                   gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                   zerolinecolor=COLOURS["grid"]),
        yaxis=dict(title="Pressure P (Pa)", range=[P_lo, P_hi],
                   gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                   zerolinecolor=COLOURS["grid"]),
    ))
    return fig


# ── p5.js Gas Animation ───────────────────────────────────────────────────────


def build_gas_animation(P, V, T, n_moles, process_type):
    """
    Build an interactive piston-cylinder animation with live PV curve using p5.js.

    Parameters
    ----------
    P            : pressure (Pa)
    V            : volume (m³)
    T            : temperature (K)
    n_moles      : moles of gas
    process_type : one of 'Isothermal', 'Isobaric', 'Isochoric', 'Adiabatic'

    Returns
    -------
    HTML string containing a self-contained p5.js animation
    """
    import math
    R = 8.314
    data = json.dumps({
        "P": float(P), "V": float(V), "T": float(T),
        "n": float(n_moles), "process": process_type,
        "R": R
    })
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 0; background: #0e1117; overflow: hidden; font-family: sans-serif; }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<script>
const GAS_DATA = {data};

new p5(function(p) {{
  // ── Layout constants ──────────────────────────────────────────
  const W = 760, H = 420;
  const CYL_X = 30, CYL_Y = 30;
  const CYL_W = 440, CYL_H = 300;
  const PV_X = 490, PV_Y = 30, PV_W = 260, PV_H = 260;
  const WALL = 14;          // cylinder wall thickness
  const BTN_Y = 350;
  const BTN_H = 32, BTN_W = 80;

  // ── State ─────────────────────────────────────────────────────
  let P0 = GAS_DATA.P;   // current pressure (Pa)
  let V0 = GAS_DATA.V;   // current volume (m³)
  let T0 = GAS_DATA.T;   // current temperature (K)
  const n = GAS_DATA.n;
  const R = GAS_DATA.R;
  const gamma = 1.4;

  // Map process name to short key
  const PROC_MAP = {{
    'Isothermal': 'iso-t', 'Adiabatic': 'adiab',
    'Isobaric': 'iso-p', 'Isochoric': 'iso-v'
  }};
  let processKey = PROC_MAP[GAS_DATA.process] || 'iso-t';

  // Piston: pistonY is the y-coordinate of the bottom face of the piston
  // cylinder interior spans from (CYL_Y + WALL) top to (CYL_Y + CYL_H - WALL) bottom
  const TOP_WALL_Y = CYL_Y + WALL;
  const BOT_WALL_Y = CYL_Y + CYL_H - WALL;
  const INTERIOR_H = BOT_WALL_Y - TOP_WALL_Y;   // total interior height in px

  // Volume → piston y mapping
  // At V0 (initial), piston at its initial position; min V → piston near top, max V → piston near bottom
  const V_MIN = V0 * 0.2;
  const V_MAX = V0 * 3.0;
  function vToPistonY(v) {{
    let frac = (v - V_MIN) / (V_MAX - V_MIN);
    frac = p.constrain(frac, 0.05, 0.95);
    return TOP_WALL_Y + frac * INTERIOR_H;
  }}

  let pistonY = vToPistonY(V0);
  const PISTON_H = 16;

  // Drag state
  let dragging = false;
  let dragOffsetY = 0;

  // Particles
  const N_PARTICLES = Math.min(50, Math.max(6, Math.round(10 * n)));
  let particles = [];

  // PV path history: array of {{v, p}} in normalised units
  let pvPath = [{{v: V0, p: P0}}];
  const MAX_PATH = 200;

  // Play/pause
  let playing = false;
  let animDir = 1;     // +1 expand, -1 compress
  let animPhase = 0;   // 0..1

  // Heat source (flame toggle)
  let flameOn = false;
  let flameTimer = 0;

  // Background isotherms for PV panel
  const ISOTHERM_Ts = [T0 * 0.4, T0 * 0.7, T0, T0 * 1.5, T0 * 2.2];
  const ISOTHERM_COLS = [
    [80, 120, 200, 60],
    [80, 160, 200, 70],
    [200, 200, 80, 80],
    [220, 140, 60, 70],
    [220, 80, 60, 60]
  ];

  // Process colours
  const PROC_COLS = {{
    'iso-t':  [255, 165,   0],
    'adiab':  [ 80, 140, 255],
    'iso-p':  [ 60, 200,  80],
    'iso-v':  [220,  60,  60]
  }};

  // Process buttons: label, key, x position
  const BUTTONS = [
    {{ label: 'ISO-T', key: 'iso-t',  x: CYL_X }},
    {{ label: 'ADIAB', key: 'adiab',  x: CYL_X + 90 }},
    {{ label: 'ISO-P', key: 'iso-p',  x: CYL_X + 180 }},
    {{ label: 'ISO-V', key: 'iso-v',  x: CYL_X + 270 }},
  ];
  const PLAY_BTN  = {{ label: '▶ Play',  x: CYL_X + 365, y: BTN_Y, w: 70 }};
  const FLAME_BTN = {{ label: '🔥 Heat', x: CYL_X + 365, y: BTN_Y + 38, w: 70 }};

  // ── p5 setup ──────────────────────────────────────────────────
  p.setup = function() {{
    let cnv = p.createCanvas(W, H);
    p.frameRate(40);
    initParticles();
  }};

  function initParticles() {{
    particles = [];
    const CYL_LEFT  = CYL_X + WALL;
    const CYL_RIGHT = CYL_X + CYL_W - WALL;
    for (let i = 0; i < N_PARTICLES; i++) {{
      let spd = baseSpeed();
      let angle = p.random(p.TWO_PI);
      particles.push({{
        x: p.random(CYL_LEFT + 4, CYL_RIGHT - 4),
        y: p.random(pistonY + 4, BOT_WALL_Y - 4),
        vx: spd * Math.cos(angle),
        vy: spd * Math.sin(angle)
      }});
    }}
  }}

  function baseSpeed() {{
    // Speed proportional to sqrt(T), calibrated so sqrt(300) → ~1.5 px/frame
    return 1.5 * Math.sqrt(T0 / 300);
  }}

  function currentSpeed() {{
    return 1.5 * Math.sqrt(T0 / 300);
  }}

  // ── p5 draw ───────────────────────────────────────────────────
  p.draw = function() {{
    p.background(14, 17, 23);

    if (playing && !dragging) {{
      animPhase += 0.008 * animDir;
      if (animPhase >= 1) {{ animPhase = 1; animDir = -1; }}
      if (animPhase <= 0) {{ animPhase = 0; animDir =  1; }}
      let targetV = V_MIN + animPhase * (V_MAX - V_MIN);
      updateState(targetV);
    }}

    if (flameOn && !playing) {{
      flameTimer++;
      if (flameTimer % 4 === 0) {{
        // Isochoric heating: increase T and P at constant V
        T0 = Math.min(T0 * 1.02, T0 * 5);
        P0 = n * R * T0 / V0;
        recordPV();
      }}
    }}

    updateParticles();
    drawCylinder();
    drawPVPanel();
    drawButtons();
  }};

  // ── State update ──────────────────────────────────────────────
  function updateState(newV) {{
    newV = p.constrain(newV, V_MIN, V_MAX);
    let oldV = V0;
    V0 = newV;
    pistonY = vToPistonY(V0);

    if (processKey === 'iso-t') {{
      // Isothermal: T const, P = nRT/V
      P0 = n * R * T0 / V0;
    }} else if (processKey === 'adiab') {{
      // Adiabatic: PV^γ = const
      P0 = P0 * Math.pow(oldV / V0, gamma);
      T0 = P0 * V0 / (n * R);
    }} else if (processKey === 'iso-p') {{
      // Isobaric: P const, T = PV/(nR)
      T0 = P0 * V0 / (n * R);
    }} else if (processKey === 'iso-v') {{
      // Isochoric: V const — don't move piston
      V0 = oldV;
      pistonY = vToPistonY(V0);
    }}

    // Clamp T to physical range
    T0 = Math.max(10, Math.min(T0, 10000));
    recordPV();
  }}

  function recordPV() {{
    let last = pvPath[pvPath.length - 1];
    if (Math.abs(last.v - V0) > V0 * 0.005 || Math.abs(last.p - P0) > P0 * 0.005) {{
      pvPath.push({{v: V0, p: P0}});
      if (pvPath.length > MAX_PATH) pvPath.shift();
    }}
  }}

  // ── Particles ─────────────────────────────────────────────────
  function updateParticles() {{
    const CYL_LEFT  = CYL_X + WALL;
    const CYL_RIGHT = CYL_X + CYL_W - WALL;
    const gasTop    = pistonY + PISTON_H;
    const gasBot    = BOT_WALL_Y;

    let spd = currentSpeed();
    // Rescale each particle speed towards current T
    for (let pt of particles) {{
      let curSpd = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);
      if (curSpd > 0) {{
        let factor = 0.05;
        let newSpd = curSpd + factor * (spd - curSpd);
        pt.vx *= newSpd / curSpd;
        pt.vy *= newSpd / curSpd;
      }}
      pt.x += pt.vx;
      pt.y += pt.vy;
      // Bounce off walls
      if (pt.x < CYL_LEFT  + 3) {{ pt.x = CYL_LEFT  + 3; pt.vx = Math.abs(pt.vx); }}
      if (pt.x > CYL_RIGHT - 3) {{ pt.x = CYL_RIGHT - 3; pt.vx = -Math.abs(pt.vx); }}
      if (pt.y < gasTop + 3)    {{ pt.y = gasTop + 3;     pt.vy = Math.abs(pt.vy); }}
      if (pt.y > gasBot - 3)    {{ pt.y = gasBot - 3;     pt.vy = -Math.abs(pt.vy); }}
    }}
  }}

  // ── Draw cylinder ─────────────────────────────────────────────
  function drawCylinder() {{
    // Walls
    p.noStroke();
    p.fill(70, 75, 85);
    p.rect(CYL_X, CYL_Y, WALL, CYL_H);                         // left wall
    p.rect(CYL_X + CYL_W - WALL, CYL_Y, WALL, CYL_H);          // right wall
    p.rect(CYL_X, CYL_Y + CYL_H - WALL, CYL_W, WALL);          // bottom wall

    // Gas fill (colour by temperature)
    let tFrac = p.constrain((T0 - 100) / 2000, 0, 1);
    let gr = p.lerp(30, 220, tFrac);
    let gb = p.lerp(120, 40, tFrac);
    let gg = p.lerp(60, 60, tFrac);
    p.fill(gr, gg, gb, 55);
    p.noStroke();
    p.rect(CYL_X + WALL, pistonY + PISTON_H, CYL_W - 2 * WALL,
           BOT_WALL_Y - pistonY - PISTON_H);

    // Particles
    for (let pt of particles) {{
      let col = tempColour(tFrac);
      p.fill(col[0], col[1], col[2], 210);
      p.noStroke();
      p.circle(pt.x, pt.y, 6);
    }}

    // Piston rectangle
    p.fill(160, 170, 180);
    p.stroke(200, 210, 220);
    p.strokeWeight(1.5);
    p.rect(CYL_X + WALL, pistonY, CYL_W - 2 * WALL, PISTON_H, 3);

    // Piston label
    let pAtm = P0 / 101325;
    p.noStroke();
    p.fill(240, 240, 240);
    p.textSize(11);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(`P = ${{pAtm.toFixed(2)}} atm`, CYL_X + CYL_W / 2, pistonY - 10);

    // Temperature display inside gas
    p.textSize(12);
    p.fill(255, 255, 200, 200);
    p.text(`T = ${{T0.toFixed(0)}} K`, CYL_X + CYL_W / 2, (pistonY + PISTON_H + BOT_WALL_Y) / 2);

    // Heat flow arrows (non-adiabatic)
    if (processKey !== 'adiab') {{
      drawHeatArrows();
    }}

    // Flame icon if heating
    if (flameOn) {{
      drawFlame();
    }}
  }}

  function tempColour(frac) {{
    let r = Math.round(p.lerp(80, 255, frac));
    let g = Math.round(p.lerp(140,  60, frac));
    let b = Math.round(p.lerp(255,  40, frac));
    return [r, g, b];
  }}

  function drawHeatArrows() {{
    let frame = p.frameCount;
    // Wavy red arrows at bottom of cylinder
    let arrowCount = 3;
    let baseX = CYL_X + WALL + 20;
    let spacing = (CYL_W - 2 * WALL - 40) / (arrowCount - 1);
    for (let i = 0; i < arrowCount; i++) {{
      let ax = baseX + i * spacing;
      let ay = BOT_WALL_Y - 8 + Math.sin(frame * 0.15 + i * 1.2) * 4;
      p.stroke(255, 100, 40, 180);
      p.strokeWeight(2);
      p.line(ax, ay, ax, ay - 18);
      // Arrowhead
      p.fill(255, 100, 40, 180);
      p.noStroke();
      p.triangle(ax, ay - 22, ax - 4, ay - 14, ax + 4, ay - 14);
    }}
  }}

  function drawFlame() {{
    let cx = CYL_X + CYL_W / 2;
    let cy = BOT_WALL_Y + 18;
    let frame = p.frameCount;
    // Simple animated flame shapes
    for (let layer = 0; layer < 3; layer++) {{
      let wobble = Math.sin(frame * 0.3 + layer * 2) * 4;
      let alpha = 200 - layer * 50;
      p.noStroke();
      if (layer === 0) p.fill(255, 60, 0, alpha);
      else if (layer === 1) p.fill(255, 160, 0, alpha);
      else p.fill(255, 220, 50, alpha);
      p.ellipse(cx + wobble, cy - layer * 6, 22 - layer * 4, 28 - layer * 4);
    }}
  }}

  // ── Draw PV panel ─────────────────────────────────────────────
  function drawPVPanel() {{
    // Background
    p.fill(20, 24, 34);
    p.stroke(60, 70, 90);
    p.strokeWeight(1);
    p.rect(PV_X, PV_Y, PV_W, PV_H, 4);

    // Collect all P and V values for axis scaling
    let allP = pvPath.map(pt => pt.p);
    let allV = pvPath.map(pt => pt.v);
    // Include isotherms range
    let vMin = Math.min(...allV, V0 * 0.15);
    let vMax = Math.max(...allV, V0 * 3.2);
    let pMin = 0;
    let pMax = Math.max(...allP, P0 * 0.1) * 1.3;

    function toCanvasX(v) {{
      return PV_X + 32 + (v - vMin) / (vMax - vMin) * (PV_W - 44);
    }}
    function toCanvasY(pr) {{
      return PV_Y + PV_H - 28 - (pr - pMin) / (pMax - pMin) * (PV_H - 44);
    }}

    // Background isotherms
    for (let ti = 0; ti < ISOTHERM_Ts.length; ti++) {{
      let Tiso = ISOTHERM_Ts[ti];
      let col = ISOTHERM_COLS[ti];
      p.stroke(col[0], col[1], col[2], col[3]);
      p.strokeWeight(1);
      p.noFill();
      p.beginShape();
      let steps = 40;
      for (let s = 0; s <= steps; s++) {{
        let v = vMin + (s / steps) * (vMax - vMin);
        if (v <= 0) continue;
        let pr = n * R * Tiso / v;
        if (pr > pMax * 1.5 || pr < 0) continue;
        p.vertex(toCanvasX(v), toCanvasY(pr));
      }}
      p.endShape();
    }}

    // PV path trace
    let pcol = PROC_COLS[processKey] || [200, 200, 200];
    p.stroke(pcol[0], pcol[1], pcol[2], 200);
    p.strokeWeight(2);
    p.noFill();
    if (pvPath.length > 1) {{
      p.beginShape();
      for (let pt of pvPath) {{
        let cx = toCanvasX(pt.v);
        let cy = toCanvasY(pt.p);
        p.vertex(cx, cy);
      }}
      p.endShape();
    }}

    // Current state dot
    let dotX = toCanvasX(V0);
    let dotY = toCanvasY(P0);
    p.noStroke();
    p.fill(255, 230, 50);
    p.circle(dotX, dotY, 10);
    p.stroke(255, 230, 50, 120);
    p.strokeWeight(1);
    p.noFill();
    p.circle(dotX, dotY, 18);

    // Axes
    p.stroke(120, 130, 150);
    p.strokeWeight(1);
    // X axis
    p.line(PV_X + 32, PV_Y + PV_H - 28, PV_X + PV_W - 8, PV_Y + PV_H - 28);
    // Y axis
    p.line(PV_X + 32, PV_Y + 8, PV_X + 32, PV_Y + PV_H - 28);

    // Axis labels
    p.noStroke();
    p.fill(160, 170, 190);
    p.textSize(10);
    p.textAlign(p.CENTER, p.TOP);
    p.text('V (m³)', PV_X + PV_W / 2, PV_Y + PV_H - 18);
    p.push();
    p.translate(PV_X + 10, PV_Y + PV_H / 2);
    p.rotate(-p.HALF_PI);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('P (Pa)', 0, 0);
    p.pop();

    // Panel title
    p.fill(200, 210, 230);
    p.textSize(11);
    p.textAlign(p.CENTER, p.TOP);
    p.text('PV Diagram', PV_X + PV_W / 2, PV_Y + 4);

    // Process label
    let pLabel = Object.entries(PROC_MAP).find(([k,v]) => v === processKey);
    let pLabelStr = pLabel ? pLabel[0] : processKey;
    p.fill(pcol[0], pcol[1], pcol[2]);
    p.textSize(10);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(pLabelStr, PV_X + PV_W - 6, PV_Y + 18);
  }}

  // ── Draw buttons ──────────────────────────────────────────────
  function drawButtons() {{
    p.textSize(11);

    // Process buttons
    for (let btn of BUTTONS) {{
      let active = (btn.key === processKey);
      let pcol = PROC_COLS[btn.key] || [160, 160, 160];
      if (active) {{
        p.fill(pcol[0], pcol[1], pcol[2], 200);
        p.stroke(pcol[0], pcol[1], pcol[2]);
      }} else {{
        p.fill(40, 48, 62);
        p.stroke(80, 90, 110);
      }}
      p.strokeWeight(1.5);
      p.rect(btn.x, BTN_Y, BTN_W, BTN_H, 4);
      p.noStroke();
      p.fill(active ? 10 : 200, active ? 10 : 210, active ? 10 : 230);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(btn.label, btn.x + BTN_W / 2, BTN_Y + BTN_H / 2);
    }}

    // Play/pause button
    {{
      let btn = PLAY_BTN;
      p.fill(playing ? 80 : 40, playing ? 130 : 80, playing ? 80 : 60);
      p.stroke(playing ? 100 : 80, playing ? 200 : 120, playing ? 100 : 80);
      p.strokeWeight(1.5);
      p.rect(btn.x, btn.y, btn.w, BTN_H, 4);
      p.noStroke();
      p.fill(200, 230, 200);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(playing ? '⏸ Pause' : '▶ Play', btn.x + btn.w / 2, btn.y + BTN_H / 2);
    }}

    // Flame button
    {{
      let btn = FLAME_BTN;
      p.fill(flameOn ? 120 : 40, flameOn ? 60 : 40, flameOn ? 20 : 50);
      p.stroke(flameOn ? 255 : 100, flameOn ? 120 : 80, flameOn ? 20 : 80);
      p.strokeWeight(1.5);
      p.rect(btn.x, btn.y, btn.w, BTN_H, 4);
      p.noStroke();
      p.fill(230, 200, 180);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(flameOn ? '🔥 On' : '🔥 Heat', btn.x + btn.w / 2, btn.y + BTN_H / 2);
    }}

    // Drag hint
    p.noStroke();
    p.fill(100, 110, 130);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text('← Drag piston to change volume', CYL_X, BTN_Y + 78);
  }}

  // ── Mouse interaction ─────────────────────────────────────────
  p.mousePressed = function() {{
    let mx = p.mouseX, my = p.mouseY;

    // Check process buttons
    for (let btn of BUTTONS) {{
      if (mx >= btn.x && mx <= btn.x + BTN_W && my >= BTN_Y && my <= BTN_Y + BTN_H) {{
        processKey = btn.key;
        pvPath = [{{v: V0, p: P0}}];
        return;
      }}
    }}

    // Play/pause
    let pb = PLAY_BTN;
    if (mx >= pb.x && mx <= pb.x + pb.w && my >= pb.y && my <= pb.y + BTN_H) {{
      playing = !playing;
      return;
    }}

    // Flame toggle
    let fb = FLAME_BTN;
    if (mx >= fb.x && mx <= fb.x + fb.w && my >= fb.y && my <= fb.y + BTN_H) {{
      flameOn = !flameOn;
      flameTimer = 0;
      return;
    }}

    // Check piston drag
    let pistonTop = pistonY, pistonBot = pistonY + PISTON_H;
    let cylLeft = CYL_X + WALL, cylRight = CYL_X + CYL_W - WALL;
    if (mx >= cylLeft && mx <= cylRight && my >= pistonTop - 10 && my <= pistonBot + 10) {{
      dragging = true;
      dragOffsetY = my - pistonY;
      playing = false;
    }}
  }};

  p.mouseDragged = function() {{
    if (!dragging) return;
    let newPistonY = p.mouseY - dragOffsetY;
    newPistonY = p.constrain(newPistonY, TOP_WALL_Y + 2, BOT_WALL_Y - PISTON_H - 2);
    pistonY = newPistonY;
    // Convert pistonY → volume
    let frac = (pistonY - TOP_WALL_Y) / INTERIOR_H;
    let newV = V_MIN + frac * (V_MAX - V_MIN);
    updateState(newV);
  }};

  p.mouseReleased = function() {{
    dragging = false;
  }};

}});
</script>
</body>
</html>"""


# ── Main page ─────────────────────────────────────────────────────────────────


def main() -> None:
    """Render the full Ideal Gas Processes simulation page."""

    sim_header("Ideal Gas Processes", SPEC_REF)

    left_col, right_col = two_column_layout(3, 7)

    # ─── Left column: all controls ────────────────────────────────────────────
    with left_col:
        mode = mode_toggle()

        ctrl_tab1, ctrl_tab2, ctrl_tab3 = st.tabs(
            ["Gas Laws", "PV Diagram", "Heat Engine"]
        )

        # ── Tab 1 controls: Gas Laws ──────────────────────────────────────────
        with ctrl_tab1:
            st.subheader("Gas Law Controls")

            preset_choice = st.selectbox(
                "Real-world preset",
                list(GAS_PRESETS.keys()),
                index=0,
                key="gl_preset",
                help="Select a real-world scenario to auto-fill parameters.",
            )
            preset_data = GAS_PRESETS[preset_choice]

            # Defaults from preset or user
            _n_default = float(preset_data["n"]) if preset_data else 0.1
            _T_default = float(preset_data["T"]) if preset_data else 300.0
            _P_default = float(preset_data["P0"]) if preset_data else 1e5

            n_gl = st.slider(
                "n — Amount of gas (mol)",
                min_value=0.01,
                max_value=5.0,
                value=float(np.clip(_n_default, 0.01, 5.0)),
                step=0.01,
                format="%.3f",
                key="gl_n",
                help="Number of moles of gas.",
            )

            law_choice = st.selectbox(
                "Gas law",
                [
                    "Boyle's Law (constant T)",
                    "Charles's Law (constant P)",
                    "Gay-Lussac's Law (constant V)",
                    "All three — PV isotherms",
                ],
                index=0,
                key="gl_law",
                help="Select which gas law to investigate.",
            )

            st.divider()

            # Law-specific sliders
            if law_choice == "Boyle's Law (constant T)":
                T_boyle = st.slider(
                    "Temperature T (K)",
                    min_value=100,
                    max_value=1000,
                    value=int(np.clip(_T_default, 100, 1000)),
                    step=10,
                    key="gl_T_boyle",
                    help="Fixed temperature for Boyle's Law.",
                )
                P_boyle = st.slider(
                    "Current pressure P (kPa)",
                    min_value=1.0,
                    max_value=1000.0,
                    value=float(np.clip(_P_default / 1e3, 1.0, 1000.0)),
                    step=1.0,
                    key="gl_P_boyle",
                    format="%.0f kPa",
                    help="Mark this state on the curve.",
                )
                gl_plot_params = dict(
                    law="boyle",
                    n=n_gl,
                    T=float(T_boyle),
                    P_slider=P_boyle * 1e3,
                )

            elif law_choice == "Charles's Law (constant P)":
                P_charles = st.slider(
                    "Pressure P (kPa)",
                    min_value=1.0,
                    max_value=1000.0,
                    value=float(np.clip(_P_default / 1e3, 1.0, 1000.0)),
                    step=1.0,
                    format="%.0f kPa",
                    key="gl_P_charles",
                    help="Fixed pressure for Charles's Law.",
                )
                T_charles = st.slider(
                    "Current temperature T (K)",
                    min_value=10,
                    max_value=1000,
                    value=int(np.clip(_T_default, 10, 1000)),
                    step=10,
                    key="gl_T_charles",
                    help="Mark this state on the V–T curve.",
                )
                gl_plot_params = dict(
                    law="charles",
                    n=n_gl,
                    P=P_charles * 1e3,
                    T_slider=float(T_charles),
                )

            elif law_choice == "Gay-Lussac's Law (constant V)":
                V_default_L = n_gl * R_gas * 300.0 / 1e5 * 1e3  # litres at 1 bar, 300 K
                V_gl = st.slider(
                    "Volume V (litres)",
                    min_value=0.001,
                    max_value=100.0,
                    value=float(np.clip(V_default_L, 0.001, 100.0)),
                    step=0.1,
                    format="%.3f L",
                    key="gl_V_gl",
                    help="Fixed volume for Gay-Lussac's Law.",
                )
                T_gl = st.slider(
                    "Current temperature T (K)",
                    min_value=10,
                    max_value=1000,
                    value=int(np.clip(_T_default, 10, 1000)),
                    step=10,
                    key="gl_T_gl",
                    help="Mark this state on the P–T curve.",
                )
                gl_plot_params = dict(
                    law="gay_lussac",
                    n=n_gl,
                    V=V_gl * 1e-3,
                    T_slider=float(T_gl),
                )

            else:  # All three
                T_all = st.slider(
                    "Reference temperature T (K)",
                    min_value=100,
                    max_value=1000,
                    value=int(np.clip(_T_default, 100, 1000)),
                    step=10,
                    key="gl_T_all",
                    help="Three isotherms shown at T/2, T, 2T.",
                )
                P_all_slider = st.slider(
                    "Current pressure P (kPa)",
                    min_value=1.0,
                    max_value=1000.0,
                    value=float(np.clip(_P_default / 1e3, 1.0, 1000.0)),
                    step=1.0,
                    format="%.0f kPa",
                    key="gl_P_all",
                    help="Marks your current state on the T isotherm.",
                )
                gl_plot_params = dict(
                    law="boyle",
                    n=n_gl,
                    T=float(T_all),
                    P_slider=P_all_slider * 1e3,
                    show_all=True,
                )

        # ── Tab 2 controls: PV Diagram ────────────────────────────────────────
        with ctrl_tab2:
            st.subheader("Initial State")

            n_pv = st.slider(
                "n — Amount of gas (mol)",
                min_value=0.01,
                max_value=5.0,
                value=0.1,
                step=0.01,
                format="%.3f",
                key="pv_n",
            )
            T_start_pv = st.slider(
                "T_start (K)",
                min_value=100,
                max_value=2000,
                value=300,
                step=10,
                key="pv_T",
                help="Initial temperature of the gas.",
            )
            P_start_pv = st.select_slider(
                "P_start (Pa)",
                options=[1e3, 5e3, 1e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6],
                value=1e5,
                format_func=lambda x: f"{x:.0e} Pa",
                key="pv_P",
                help="Initial pressure of the gas.",
            )
            V_start_pv = float(n_pv * R_gas * T_start_pv / P_start_pv)
            st.caption(f"V_start = {V_start_pv:.4f} m³ = {V_start_pv*1e3:.2f} L (from ideal gas law)")

            st.divider()
            st.subheader("Process Selection")

            processes_selected = st.multiselect(
                "Processes to show",
                ["Isothermal", "Isobaric", "Isochoric", "Adiabatic"],
                default=["Isothermal", "Adiabatic"],
                key="pv_processes",
                help="Select one or more processes to display on the PV diagram.",
            )

            st.divider()

            # End-state parameters per process
            if "Isothermal" in processes_selected:
                V_end_iso_mult = st.slider(
                    "Isothermal: V_end / V_start",
                    min_value=0.1,
                    max_value=5.0,
                    value=2.0,
                    step=0.1,
                    key="pv_iso_mult",
                    help="Final volume as multiple of initial volume.",
                )
                V_end_iso = V_start_pv * V_end_iso_mult
            else:
                V_end_iso = V_start_pv * 2.0

            if "Isobaric" in processes_selected:
                V_end_isobaric_mult = st.slider(
                    "Isobaric: V_end / V_start",
                    min_value=0.1,
                    max_value=5.0,
                    value=2.0,
                    step=0.1,
                    key="pv_isobar_mult",
                    help="Volume change at constant pressure.",
                )
                V_end_isobaric = V_start_pv * V_end_isobaric_mult
            else:
                V_end_isobaric = V_start_pv * 2.0

            if "Isochoric" in processes_selected:
                P_end_isochoric_mult = st.slider(
                    "Isochoric: P_end / P_start",
                    min_value=0.1,
                    max_value=5.0,
                    value=2.0,
                    step=0.1,
                    key="pv_isochor_mult",
                    help="Pressure change at constant volume.",
                )
                P_end_isochoric = float(P_start_pv) * P_end_isochoric_mult
            else:
                P_end_isochoric = float(P_start_pv) * 2.0

            if "Adiabatic" in processes_selected:
                V_end_adiabatic_mult = st.slider(
                    "Adiabatic: V_end / V_start",
                    min_value=0.1,
                    max_value=5.0,
                    value=2.0,
                    step=0.1,
                    key="pv_adiab_mult",
                    help="Volume change with no heat exchange.",
                )
                V_end_adiabatic = V_start_pv * V_end_adiabatic_mult
            else:
                V_end_adiabatic = V_start_pv * 2.0

            if mode == "Advanced":
                advanced_divider()

                gamma_choice = st.radio(
                    "Gas type (γ)",
                    ["Diatomic (γ=1.4, e.g. air)", "Monatomic (γ=5/3, e.g. He)"],
                    index=0,
                    key="pv_gamma",
                    help="Adiabatic index γ = Cp/Cv.",
                )
                gamma_pv = GAMMA if "1.4" in gamma_choice else GAMMA_MONO

                show_carnot_pv = st.checkbox(
                    "Show Carnot cycle overlay",
                    value=False,
                    key="pv_carnot",
                    help="Overlay the ideal Carnot cycle for comparison.",
                )
                T_carnot_cold = float(
                    st.slider(
                        "Carnot T_cold (K)",
                        min_value=50,
                        max_value=T_start_pv - 10,
                        value=min(150, T_start_pv - 10),
                        step=10,
                        key="pv_T_cold",
                        help="Cold reservoir temperature for Carnot cycle.",
                    )
                ) if show_carnot_pv else 200.0
            else:
                gamma_pv = GAMMA
                show_carnot_pv = False
                T_carnot_cold = 200.0

        # ── Tab 3 controls: Heat Engine ───────────────────────────────────────
        with ctrl_tab3:
            st.subheader("Engine Parameters")

            cycle_type = st.selectbox(
                "Engine cycle",
                ["Otto (petrol engine)", "Diesel engine", "Stirling engine"],
                index=0,
                key="eng_cycle",
                help="Otto: constant-volume combustion. Diesel: constant-pressure combustion. "
                     "Stirling: isothermal heat exchange with regenerator.",
            )

            n_eng = st.slider(
                "n — Amount of gas (mol)",
                min_value=0.001,
                max_value=1.0,
                value=0.01,
                step=0.001,
                format="%.4f",
                key="eng_n",
                help="Moles of working gas in one cylinder.",
            )

            r_compress = st.slider(
                "Compression ratio r",
                min_value=4,
                max_value=22,
                value=10,
                step=1,
                key="eng_r",
                help="V_BDC / V_TDC. Petrol ≈ 8–12, Diesel ≈ 14–22.",
            )

            T_low_eng = st.slider(
                "T_low (K)",
                min_value=200,
                max_value=600,
                value=300,
                step=10,
                key="eng_Tlow",
                help="Temperature at bottom dead centre (start of compression).",
            )

            T_high_eng = st.slider(
                "T_high (K)",
                min_value=600,
                max_value=4000,
                value=2000,
                step=50,
                key="eng_Thigh",
                help="Peak temperature after combustion.",
            )

            P1_eng = st.select_slider(
                "P₁ — intake pressure (Pa)",
                options=[5e4, 8e4, 1e5, 1.2e5, 2e5],
                value=1e5,
                format_func=lambda x: f"{x:.0e} Pa",
                key="eng_P1",
                help="Pressure at state 1 (bottom dead centre, intake).",
            )

            if cycle_type == "Diesel engine" and mode == "Advanced":
                advanced_divider()
                r_cutoff = st.slider(
                    "Cutoff ratio r_c",
                    min_value=1.1,
                    max_value=4.0,
                    value=2.0,
                    step=0.1,
                    key="eng_r_cutoff",
                    help="V3/V2 — volume ratio during isobaric heat addition.",
                )
            else:
                r_cutoff = 2.0

            if mode == "Advanced":
                if "advanced_divider_eng" not in st.session_state:
                    pass
                advanced_divider()
                show_diesel_compare = st.checkbox(
                    "Compare Otto vs Diesel",
                    value=False,
                    key="eng_compare",
                    help="Overlay both cycles on the same PV diagram.",
                )
            else:
                show_diesel_compare = False

            # Stirling-specific controls
            if cycle_type == "Stirling engine":
                V_stirling_min = float(
                    st.slider(
                        "V_min (litres)",
                        min_value=0.1,
                        max_value=5.0,
                        value=1.0,
                        step=0.1,
                        key="eng_V_stir",
                        help="Minimum volume in the Stirling engine.",
                    )
                ) * 1e-3
                r_stir = float(
                    st.slider(
                        "Volume ratio V_max/V_min",
                        min_value=2.0,
                        max_value=6.0,
                        value=3.0,
                        step=0.1,
                        key="eng_r_stir",
                        help="Expansion ratio in the Stirling cycle.",
                    )
                )
            else:
                V_stirling_min = 1e-3
                r_stir = 3.0

    # ─── Right column: plots ──────────────────────────────────────────────────
    with right_col:
        plot_tab1, plot_tab2, plot_tab3 = st.tabs(
            ["Gas Laws", "PV Diagram", "Heat Engine"]
        )

        # ── Tab 1: Gas Laws ───────────────────────────────────────────────────
        with plot_tab1:

            # Show preset info card
            if preset_data is not None:
                st.info(f"**{preset_choice}:** {preset_data['note']}")

            # Compute and display quick metrics
            if law_choice == "Boyle's Law (constant T)":
                T_b = gl_plot_params["T"]
                P_b = gl_plot_params["P_slider"]
                V_b = n_gl * R_gas * T_b / P_b
                metric_row({
                    "T (fixed)": f"{T_b:.0f} K",
                    "P": f"{P_b/1e3:.2f} kPa",
                    "V": f"{V_b*1e3:.4f} L",
                    "nRT": f"{n_gl*R_gas*T_b:.2f} J",
                })

            elif law_choice == "Charles's Law (constant P)":
                P_c = gl_plot_params["P"]
                T_c = gl_plot_params["T_slider"]
                V_c = n_gl * R_gas * T_c / P_c
                metric_row({
                    "P (fixed)": f"{P_c/1e3:.2f} kPa",
                    "T": f"{T_c:.0f} K",
                    "V": f"{V_c*1e3:.4f} L",
                })

            elif law_choice == "Gay-Lussac's Law (constant V)":
                V_g = gl_plot_params["V"]
                T_g = gl_plot_params["T_slider"]
                P_g = n_gl * R_gas * T_g / V_g
                metric_row({
                    "V (fixed)": f"{V_g*1e3:.3f} L",
                    "T": f"{T_g:.0f} K",
                    "P": f"{P_g/1e3:.1f} kPa",
                })

            else:  # All three
                T_ref = gl_plot_params["T"]
                P_ref = gl_plot_params["P_slider"]
                V_ref = n_gl * R_gas * T_ref / P_ref
                metric_row({
                    "T": f"{T_ref:.0f} K",
                    "P (marked)": f"{P_ref/1e3:.1f} kPa",
                    "V (marked)": f"{V_ref*1e3:.4f} L",
                    "PV/nR": f"{P_ref * V_ref / (n_gl * R_gas):.1f} K",
                })

            # Main plot
            fig_gl = build_gas_law_fig(**gl_plot_params)
            st.plotly_chart(fig_gl, use_container_width=True)

            # Additional context in Basic mode
            if mode == "Basic":
                if law_choice == "Boyle's Law (constant T)":
                    st.info(
                        "**Boyle's Law:** At constant temperature, pressure is inversely "
                        "proportional to volume: P ∝ 1/V, so PV = constant. "
                        "Doubling the pressure halves the volume."
                    )
                elif law_choice == "Charles's Law (constant P)":
                    st.info(
                        "**Charles's Law:** At constant pressure, volume is directly "
                        "proportional to absolute temperature: V ∝ T (in Kelvin). "
                        "The graph extrapolates to V = 0 at absolute zero (0 K = −273°C)."
                    )
                elif law_choice == "Gay-Lussac's Law (constant V)":
                    st.info(
                        "**Gay-Lussac's Law:** At constant volume, pressure is directly "
                        "proportional to absolute temperature: P ∝ T. "
                        "Used in pressure cookers and aerosol can warnings."
                    )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 2: PV Diagram ─────────────────────────────────────────────────
        with plot_tab2:

            st.info(
                "**First Law of Thermodynamics:** ΔU = Q − W "
                "(heat added minus work done by gas = change in internal energy). "
                "For an adiabatic process Q = 0, so all work done comes from internal "
                "energy — this is why air cools when it expands rapidly."
            )

            if not processes_selected:
                st.warning("Select at least one process in the controls panel.")
            else:
                # ── p5.js piston-cylinder animation ───────────────────────
                _process_val = processes_selected[0]
                _P_val = float(P_start_pv)
                _V_val = float(V_start_pv)
                _T_val = float(T_start_pv)
                _n_val = float(n_pv)
                components.html(
                    build_gas_animation(_P_val, _V_val, _T_val, _n_val, _process_val),
                    height=440,
                )
                st.caption(
                    "▶ Play/pause · Drag piston · Click process type buttons · Click flame to heat"
                )
                st.divider()

                fig_pv, thermo_results = build_pv_diagram(
                    n=n_pv,
                    T_start=float(T_start_pv),
                    P_start=float(P_start_pv),
                    processes=processes_selected,
                    V_end_iso=V_end_iso,
                    V_end_isobaric=V_end_isobaric,
                    P_end_isochoric=P_end_isochoric,
                    V_end_adiabatic=V_end_adiabatic,
                    gamma=gamma_pv,
                    show_carnot=show_carnot_pv,
                    T_carnot_cold=T_carnot_cold,
                )
                st.plotly_chart(fig_pv, use_container_width=True)

                # Thermodynamic metrics per selected process
                for proc_label, thermo in thermo_results.items():
                    st.markdown(f"**{proc_label} process:**")
                    metric_row({
                        "W (J)": f"{thermo['W']:.2f}",
                        "ΔU (J)": f"{thermo['delta_U']:.2f}",
                        "Q (J)": f"{thermo['Q']:.2f}",
                        "ΔT (K)": f"{thermo['delta_T']:.2f}",
                        "ΔV (m³)": f"{thermo['delta_V']:.4f}",
                    })

                    # Sanity check: ΔU = Q - W
                    residual = abs(thermo["delta_U"] - (thermo["Q"] - thermo["W"]))
                    if residual > 1e-6 * max(1.0, abs(thermo["delta_U"])):
                        st.warning(
                            f"First Law check: ΔU ≠ Q − W "
                            f"(residual = {residual:.2e} J — numerical error)"
                        )

                    if mode == "Basic":
                        if proc_label == "Isothermal":
                            st.caption(
                                "Isothermal: ΔT = 0 → ΔU = 0 for an ideal gas. "
                                "All heat input equals work done: Q = W."
                            )
                        elif proc_label == "Adiabatic":
                            st.caption(
                                "Adiabatic: Q = 0 → work done entirely at the expense "
                                "of internal energy: W = −ΔU. Gas cools on expansion."
                            )
                        elif proc_label == "Isochoric":
                            st.caption(
                                "Isochoric: W = 0 (no volume change). "
                                "All heat goes into changing internal energy: Q = ΔU."
                            )
                        elif proc_label == "Isobaric":
                            st.caption(
                                "Isobaric: W = PΔV. Both heat and internal energy change. "
                                "Cp (heat capacity at constant P) > Cv (constant V) by R per mole."
                            )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )

        # ── Tab 3: Heat Engine ────────────────────────────────────────────────
        with plot_tab3:

            st.info(
                "The Otto cycle efficiency depends ONLY on the compression ratio — "
                "higher r means more efficient. Modern petrol engines achieve r ≈ 10, "
                "giving theoretical η ≈ 60%. Real engines achieve ~25–35% due to "
                "friction, heat losses, and non-ideal gas behaviour."
            )

            # Guard against unphysical inputs
            if T_high_eng <= T_low_eng:
                st.error("T_high must be greater than T_low. Adjust the sliders.")
            else:
                # Compute cycle data
                if cycle_type == "Stirling engine":
                    cycle_data = compute_stirling_cycle(
                        n=n_eng,
                        T_low=float(T_low_eng),
                        T_high=float(T_high_eng),
                        V_min=V_stirling_min,
                        r_volume=r_stir,
                    )
                    cycle_label = "Stirling"
                    eta_theoretical = cycle_data["eta_carnot"]  # ideal Stirling = Carnot

                elif cycle_type == "Diesel engine":
                    cycle_data = compute_diesel_cycle(
                        n=n_eng,
                        T_low=float(T_low_eng),
                        r_compression=float(r_compress),
                        r_cutoff=float(r_cutoff),
                        P1=float(P1_eng),
                    )
                    cycle_label = "Diesel"
                    eta_theoretical = cycle_data["eta"]

                else:  # Otto
                    cycle_data = compute_otto_cycle(
                        n=n_eng,
                        T_low=float(T_low_eng),
                        T_high=float(T_high_eng),
                        r_compression=float(r_compress),
                        P1=float(P1_eng),
                    )
                    cycle_label = "Otto"
                    eta_theoretical = cycle_data.get("eta_theoretical", cycle_data["eta"])

                # Diesel for comparison (Advanced)
                diesel_data_comp = None
                if show_diesel_compare and cycle_type != "Diesel engine":
                    try:
                        diesel_data_comp = compute_diesel_cycle(
                            n=n_eng,
                            T_low=float(T_low_eng),
                            r_compression=float(r_compress),
                            r_cutoff=float(r_cutoff),
                            P1=float(P1_eng),
                        )
                    except Exception:
                        diesel_data_comp = None

                # Metrics
                metric_row({
                    "η (theoretical)": f"{eta_theoretical:.1%}",
                    "η_Carnot": f"{cycle_data['eta_carnot']:.1%}",
                    "W_net (J/cycle)": f"{cycle_data['W_net']:.2f}",
                    "Q_in (J)": f"{cycle_data['Q_in']:.2f}",
                })

                # Efficiency bar context
                ratio = eta_theoretical / cycle_data["eta_carnot"] if cycle_data["eta_carnot"] > 0 else 0
                st.progress(
                    min(1.0, ratio),
                    text=f"Engine efficiency = {ratio:.0%} of Carnot maximum",
                )

                # State summary table
                if "states" in cycle_data:
                    states = cycle_data["states"]
                    st.markdown("**Cycle state points:**")
                    col_labels = st.columns(len(states) + 1)
                    col_labels[0].markdown("**State**")
                    for i, state in states.items():
                        col_labels[i].markdown(
                            f"**{i}**<br>"
                            f"T = {state['T']:.0f} K<br>"
                            f"P = {state['P']:.2e} Pa<br>"
                            f"V = {state['V']:.4f} m³",
                            unsafe_allow_html=True,
                        )

                # PV diagram
                fig_eng = build_engine_pv_fig(
                    cycle_data=cycle_data,
                    cycle_name=cycle_label,
                    diesel_data=diesel_data_comp,
                    show_diesel=show_diesel_compare and diesel_data_comp is not None,
                )
                st.plotly_chart(fig_eng, use_container_width=True)

                # Carnot comparison
                eta_c = cycle_data["eta_carnot"]
                eta_e = eta_theoretical
                deficit = eta_c - eta_e
                st.caption(
                    f"**Carnot efficiency** (maximum possible between {T_low_eng} K and "
                    f"{T_high_eng} K): **{eta_c:.1%}**  |  "
                    f"**{cycle_label} theoretical efficiency:** {eta_e:.1%}  |  "
                    f"Deficit: {deficit:.1%}"
                )

                if mode == "Advanced" and cycle_type == "Otto (petrol engine)":
                    # Show efficiency vs compression ratio
                    r_arr = np.linspace(2, 20, 200)
                    eta_arr = 1.0 - r_arr ** (1.0 - GAMMA)
                    fig_eta = go.Figure()
                    fig_eta.add_trace(go.Scatter(
                        x=r_arr, y=eta_arr * 100,
                        mode="lines",
                        name="Otto η(r)",
                        line=dict(color=COLOURS["primary"], width=2.5),
                    ))
                    # Carnot reference (horizontal)
                    if cycle_data["eta_carnot"] > 0:
                        fig_eta.add_hline(
                            y=cycle_data["eta_carnot"] * 100,
                            line=dict(color=COLOURS["highlight"], width=1.5, dash="dash"),
                        )
                        fig_eta.add_annotation(
                            x=18, y=cycle_data["eta_carnot"] * 100,
                            text=f"η_Carnot = {cycle_data['eta_carnot']:.1%}",
                            showarrow=False,
                            font=dict(color=COLOURS["highlight"], size=10),
                            yshift=8,
                        )
                    # Mark current r
                    eta_current = 1.0 - float(r_compress) ** (1.0 - GAMMA)
                    fig_eta.add_vline(
                        x=float(r_compress),
                        line=dict(color=COLOURS["secondary"], width=2, dash="dot"),
                    )
                    fig_eta.add_annotation(
                        x=float(r_compress), y=eta_current * 100,
                        text=f"r={r_compress}, η={eta_current:.1%}",
                        showarrow=True, arrowhead=2,
                        font=dict(color=COLOURS["secondary"], size=10),
                        ax=20, ay=-20,
                    )
                    fig_eta.update_layout(**plotly_layout(
                        height=300,
                        title=dict(text="Otto Cycle Efficiency vs Compression Ratio",
                                   font=dict(size=13)),
                        xaxis=dict(title="Compression ratio r", gridcolor=COLOURS["grid"],
                                   linecolor=COLOURS["grid"], zerolinecolor=COLOURS["grid"]),
                        yaxis=dict(title="Efficiency η (%)", range=[0, 100],
                                   gridcolor=COLOURS["grid"], linecolor=COLOURS["grid"],
                                   zerolinecolor=COLOURS["grid"]),
                    ))
                    st.plotly_chart(fig_eta, use_container_width=True)
                    st.caption(
                        "Diminishing returns: increasing r from 8 to 12 gains ~5%, "
                        "but 12 to 16 gains only ~3%. High compression also causes "
                        "'knocking' (pre-ignition) — limiting petrol engines to r ≈ 10."
                    )

            physics_notes(
                spec_ref=SPEC_REF,
                equations=EQUATIONS,
                explanation=EXPLANATION,
                advanced_text=ADVANCED_TEXT,
                mode=mode,
            )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
else:
    main()
