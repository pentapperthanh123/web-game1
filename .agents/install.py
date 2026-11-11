#!/usr/bin/env python3
"""
AG Kit — Unified Install Entry Point

One command to set up everything, on any terminal, any OS.

What it does:
  1. Sync rules → .cursorrules, AGENTS.md, .claude/system-context.md
  2. Sync workflows → .cursor/commands/
  3. (Optional) Boot session: detect stack + load memory

Usage:
    python .agents/install.py              # Full install + session boot
    python .agents/install.py --rules-only # Only sync rules & commands
    python .agents/install.py --interactive # Full install + interactive stack picker
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def _safe_print(msg: str) -> None:
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="ignore").decode("ascii"))


def run_step(label: str, cmd: list[str], cwd: Path, env: dict | None = None) -> int:
    _safe_print(f"\n[{label}]")
    _safe_print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        _safe_print(f"  [X] Failed (exit code {result.returncode})")
    else:
        _safe_print("  [OK]")
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="AG Kit unified installer — works on any terminal",
    )
    parser.add_argument(
        "--rules-only",
        action="store_true",
        help="Only sync rules & commands (skip session boot)",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Pass --interactive to load_agents.py for stack selection",
    )
    args = parser.parse_args()

    # Resolve paths relative to this script
    install_dir = Path(__file__).resolve().parent   # .agents/
    root_dir = install_dir.parent                   # project root
    scripts_dir = install_dir / "scripts"

    if not install_dir.is_dir():
        _safe_print("[X] .agents/ directory not found.")
        return 1

    _safe_print("=" * 50)
    _safe_print("AG Kit Install")
    _safe_print("=" * 50)

    # ── Step 1: Sync rules ──────────────────────────────
    install_cjs = scripts_dir / "install-agents.cjs"
    install_js = scripts_dir / "install-agents.js"
    install_py = scripts_dir / "install_agents.py"

    if install_cjs.exists() and shutil.which("node"):
        code = run_step("1. Rules sync (node)", ["node", str(install_cjs)], root_dir)
    elif install_js.exists() and shutil.which("node"):
        code = run_step("1. Rules sync (node)", ["node", str(install_js)], root_dir)
    elif install_py.exists():
        code = run_step("1. Rules sync (python)", [sys.executable, str(install_py)], root_dir)
    else:
        _safe_print("\n[X] No install script found (install-agents.cjs, install-agents.js or install_agents.py)")
        return 1

    if code != 0:
        return code

    if args.rules_only:
        _safe_print("\n" + "=" * 50)
        _safe_print("[OK] Rules synced. (--rules-only, skipping session boot)")
        _safe_print("=" * 50)
        return 0

    # ── Step 2: Session boot (agents + memory) ──────────
    session_boot = scripts_dir / "session_boot.py"
    if session_boot.exists():
        boot_cmd = [sys.executable, str(session_boot), "--skip-install"]
        if args.interactive:
            boot_cmd.append("--interactive")
        boot_env = os.environ.copy()
        if not args.interactive:
            boot_env["AG_KIT_NONINTERACTIVE"] = "1"
        code = run_step("2. Session boot (agents + memory)", boot_cmd, root_dir, env=boot_env)
        if code != 0:
            return code
    else:
        _safe_print("\n[WARN] session_boot.py not found — skipping session boot")

    _safe_print("\n" + "=" * 50)
    _safe_print("[OK] AG Kit install complete!")
    _safe_print("=" * 50)
    _safe_print("")
    _safe_print("Next steps:")
    _safe_print("  - Type / in Cursor chat to see slash commands")
    _safe_print("  - If commands don't appear, Reload Window")
    return 0


if __name__ == "__main__":
    sys.exit(main())
