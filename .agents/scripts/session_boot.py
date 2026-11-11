#!/usr/bin/env python3
"""
AG Kit Session Boot — one command to start a working session.

Runs, in order:
  1. install-agents.js  (sync rules → .cursorrules, AGENTS.md) — skipped if no Node.js
  2. load_agents.py     (detect stack → active-agents.json)
  3. load_memory.py --inject

Usage:
    python .agents/scripts/session_boot.py
    python .agents/scripts/session_boot.py --skip-install   # skip rules sync
    python .agents/scripts/session_boot.py --interactive  # force stack picker
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def run_step(label: str, cmd: list[str], cwd: Path, env: dict | None = None) -> int:
    print(f"\n[{label}]")
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        print(f"  [X] Failed with exit code {result.returncode}")
    else:
        print("  [OK]")
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Boot AG Kit session (rules + agents + memory)")
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip node .agents/install-agents.js",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Pass --interactive to load_agents.py",
    )
    args = parser.parse_args()

    root = Path.cwd()
    agents_dir = root / ".agents"
    scripts_dir = agents_dir / "scripts"

    if not agents_dir.is_dir():
        print("[X] .agents/ not found. Run from project root.")
        return 1

    print("=" * 50)
    print("AG Kit Session Boot")
    print("=" * 50)

    # Step 1: sync rules
    if not args.skip_install:
        install_js = agents_dir / "install-agents.js"
        install_py = scripts_dir / "install_agents.py"
        if install_js.exists() and shutil.which("node"):
            code = run_step("1/3 Rules sync (node)", ["node", str(install_js)], root)
            if code != 0:
                return code
        elif install_py.exists():
            # Fallback: use Python version (no Node.js required)
            code = run_step(
                "1/3 Rules sync (python fallback)",
                [sys.executable, str(install_py)],
                root,
            )
            if code != 0:
                return code
        else:
            print("\n[1/3 Rules sync] Skipped — no install script found")
    else:
        print("\n[1/3 Rules sync] Skipped (--skip-install)")

    # Step 2: load agents
    load_agents = scripts_dir / "load_agents.py"
    agent_cmd = [sys.executable, str(load_agents)]
    if args.interactive:
        agent_cmd.append("--interactive")
    boot_env = os.environ.copy()
    if not args.interactive:
        boot_env["AG_KIT_NONINTERACTIVE"] = "1"
    code = run_step("2/3 Agent manifest", agent_cmd, root, env=boot_env)
    if code != 0:
        return code

    # Step 3: inject memory
    load_memory = scripts_dir / "load_memory.py"
    code = run_step("3/3 Memory inject", [sys.executable, str(load_memory), "--inject"], root)
    if code != 0:
        return code

    session_dir = agents_dir / ".session"
    print("\n" + "=" * 50)
    print("[OK] Session boot complete")
    print(f"  Agents: {session_dir / 'active-agents.json'}")
    print(f"  Memory: {session_dir / 'memory-context.md'}")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
