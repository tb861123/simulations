"""
setup_env.py — Dependency checker and installer for WJEC Physics Simulations.

Run this script once before launching the app:
    python setup_env.py

It will:
  1. Check your Python version (3.9+ required)
  2. Read requirements.txt
  3. Check which packages are already installed
  4. Install any that are missing
  5. Print the command to launch the app
"""

import sys
import subprocess
import importlib.util
from pathlib import Path

# ── Colour helpers (work on all platforms via ANSI — Windows 10+ supports them)

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"


def ok(msg: str)    -> None: print(f"  {GREEN}✔{RESET}  {msg}")
def warn(msg: str)  -> None: print(f"  {YELLOW}!{RESET}  {msg}")
def err(msg: str)   -> None: print(f"  {RED}✘{RESET}  {msg}")
def info(msg: str)  -> None: print(f"  {CYAN}→{RESET}  {msg}")
def sep()           -> None: print("  " + "─" * 54)


# Map package install name → import name (only differs where they diverge)
IMPORT_NAMES: dict[str, str] = {
    "streamlit":  "streamlit",
    "numpy":      "numpy",
    "scipy":      "scipy",
    "matplotlib": "matplotlib",
    "plotly":     "plotly",
}


def parse_requirements(path: Path) -> list[str]:
    """Return a list of package names (without version specifiers)."""
    packages = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Strip version specifiers: numpy>=1.26,<3.0  →  numpy
        for sep_char in (">=", "<=", "==", "!=", ">", "<", "~="):
            if sep_char in line:
                line = line.split(sep_char)[0].strip()
                break
        packages.append(line)
    return packages


def is_installed(import_name: str) -> bool:
    return importlib.util.find_spec(import_name) is not None


def install_package(requirement_line: str) -> bool:
    """Run pip install for the given requirement. Returns True on success."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", requirement_line],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def main() -> None:
    # Enable ANSI colours on Windows
    if sys.platform == "win32":
        import os
        os.system("")  # triggers VT100 mode on Windows 10+

    print()
    print(f"  {BOLD}{CYAN}WJEC Physics Simulations — Environment Setup{RESET}")
    sep()

    # ── 1. Python version check ───────────────────────────────────────────────
    major, minor = sys.version_info[:2]
    version_str = f"Python {major}.{minor}.{sys.version_info[2]}"
    if (major, minor) < (3, 9):
        err(f"{version_str} detected — Python 3.9 or newer is required.")
        err("Download from https://www.python.org/downloads/")
        sys.exit(1)
    ok(f"{version_str}  (3.9+ required)")

    # ── 2. Locate requirements.txt ────────────────────────────────────────────
    req_path = Path(__file__).parent / "requirements.txt"
    if not req_path.exists():
        err("requirements.txt not found — cannot check dependencies.")
        sys.exit(1)

    packages = parse_requirements(req_path)
    sep()
    print(f"  Checking {len(packages)} required packages…")
    sep()

    # ── 3. Check each package ─────────────────────────────────────────────────
    missing: list[str] = []
    for pkg in packages:
        import_name = IMPORT_NAMES.get(pkg, pkg)
        if is_installed(import_name):
            ok(f"{pkg}")
        else:
            warn(f"{pkg}  — not installed")
            missing.append(pkg)

    # ── 4. Install missing packages ───────────────────────────────────────────
    if missing:
        sep()
        print(f"  Installing {len(missing)} missing package(s)…")
        sep()
        failed: list[str] = []
        for pkg in missing:
            info(f"Installing {pkg}…")
            # Pass the original requirements.txt line for version bounds
            req_line = next(
                (l.strip() for l in req_path.read_text().splitlines()
                 if l.strip().startswith(pkg)),
                pkg,
            )
            if install_package(req_line):
                ok(f"{pkg} installed")
            else:
                err(f"Failed to install {pkg}")
                failed.append(pkg)

        if failed:
            sep()
            err("Some packages could not be installed:")
            for pkg in failed:
                err(f"  pip install {pkg}")
            err("Try running the above commands manually, then re-run this script.")
            sys.exit(1)
    else:
        sep()
        ok("All dependencies are already installed.")

    # ── 5. Final verification ─────────────────────────────────────────────────
    sep()
    print("  Verifying imports…")
    all_ok = True
    for pkg in packages:
        import_name = IMPORT_NAMES.get(pkg, pkg)
        if is_installed(import_name):
            ok(f"import {import_name}")
        else:
            err(f"import {import_name}  — still not importable after install")
            all_ok = False

    sep()
    if all_ok:
        print(f"  {BOLD}{GREEN}Setup complete!{RESET}  Launch the app with:\n")
        print(f"    {BOLD}streamlit run Home.py{RESET}\n")
    else:
        err("Setup incomplete — see errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
