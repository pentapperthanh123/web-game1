#!/usr/bin/env python3
"""
checkpoint.py — Cross-IDE Session Recovery System

Saves and restores work-in-progress context so developers can seamlessly
switch between IDEs (Cursor, Antigravity, VS Code, Claude Code) without
losing progress when AI token limits are hit mid-task.

Usage:
    python .agents/scripts/checkpoint.py --save --goal "..." [options]
    python .agents/scripts/checkpoint.py --restore
    python .agents/scripts/checkpoint.py --status
    python .agents/scripts/checkpoint.py --clear
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Ensure standard output/error use UTF-8 encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
AGENTS_DIR = Path(__file__).resolve().parent.parent          # .agents/
SESSION_DIR = AGENTS_DIR / ".session"
CHECKPOINT_FILE = SESSION_DIR / "checkpoint.md"
PROJECT_ROOT = AGENTS_DIR.parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _run_git(*args: str) -> str:
    """Run a git command and return stdout (empty string on failure)."""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def _now_iso() -> str:
    """Return current time in ISO 8601 with timezone."""
    tz = timezone(timedelta(hours=7))  # ICT
    return datetime.now(tz).isoformat(timespec="seconds")


def _ensure_session_dir() -> None:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# SAVE — Write checkpoint.md (Hybrid YAML frontmatter + Markdown body)
# ---------------------------------------------------------------------------
def save_checkpoint(
    goal: str,
    stack: str = "",
    agents: list[str] | None = None,
    completed: list[str] | None = None,
    in_progress: list[str] | None = None,
    next_steps: list[str] | None = None,
    decisions: list[str] | None = None,
    user_context: list[str] | None = None,
    modified_files: list[str] | None = None,
) -> None:
    """Write a structured checkpoint file."""
    _ensure_session_dir()

    # Auto-detect modified files from git if not provided
    if not modified_files:
        modified_files = _detect_modified_files()

    # Auto-detect stack from active-agents.json if not provided
    if not stack:
        manifest = SESSION_DIR / "active-agents.json"
        if manifest.exists():
            try:
                data = json.loads(manifest.read_text(encoding="utf-8"))
                stack = data.get("stack", "unknown")
            except Exception:
                stack = "unknown"

    agents_str = ", ".join(agents) if agents else "auto"

    lines: list[str] = []

    # YAML frontmatter
    lines.append("---")
    lines.append(f"timestamp: {_now_iso()}")
    lines.append(f"goal: {goal}")
    lines.append(f"stack: {stack}")
    lines.append(f"agents: [{agents_str}]")
    lines.append(f"status: {'in_progress' if in_progress else 'paused'}")
    lines.append("---")
    lines.append("")

    # Completed section
    lines.append("## ✅ Completed")
    if completed:
        for item in completed:
            lines.append(f"- {item}")
    else:
        lines.append("- (none yet)")
    lines.append("")

    # In Progress section
    lines.append("## 🔨 In Progress")
    if in_progress:
        for item in in_progress:
            lines.append(f"- {item}")
    else:
        lines.append("- (none)")
    lines.append("")

    # Next Steps section
    lines.append("## 📋 Next")
    if next_steps:
        for item in next_steps:
            lines.append(f"- {item}")
    else:
        lines.append("- (to be determined)")
    lines.append("")

    # Modified Files section
    lines.append("## 📁 Modified Files (uncommitted)")
    if modified_files:
        for f in modified_files:
            lines.append(f"- `{f}`")
    else:
        lines.append("- (no uncommitted changes)")
    lines.append("")

    # Key Decisions section
    lines.append("## 🧠 Key Decisions")
    if decisions:
        for d in decisions:
            lines.append(f"- {d}")
    else:
        lines.append("- (none recorded)")
    lines.append("")

    # User Context section
    lines.append("## 💬 User Context")
    if user_context:
        for ctx in user_context:
            lines.append(f"- {ctx}")
    else:
        lines.append("- (none recorded)")
    lines.append("")

    CHECKPOINT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Checkpoint saved → {CHECKPOINT_FILE.relative_to(PROJECT_ROOT)}")


# ---------------------------------------------------------------------------
# RESTORE — Read checkpoint + fallback to git diff
# ---------------------------------------------------------------------------
def restore_checkpoint() -> None:
    """
    Restore work context from checkpoint file.
    Falls back to git diff analysis if checkpoint is missing/stale.
    """
    print("=" * 60)
    print("  AG Kit — Session Recovery")
    print("=" * 60)
    print()

    # ── Layer 1: Read checkpoint.md ──
    if CHECKPOINT_FILE.exists():
        content = CHECKPOINT_FILE.read_text(encoding="utf-8")
        print("[Layer 1] ✅ Checkpoint file found:")
        print(f"  Path: {CHECKPOINT_FILE.relative_to(PROJECT_ROOT)}")
        print()
        print(content)
        print("-" * 60)
    else:
        print("[Layer 1] ⚠️  No checkpoint.md found (AI likely crashed before saving)")
        print()

    # ── Layer 2: Git diff auto-reconstruction ──
    print("[Layer 2] 🔍 Git auto-inspection:")
    print()

    # Modified (tracked) files
    modified = _detect_modified_files()
    if modified:
        print("  📝 Modified files (uncommitted):")
        for f in modified:
            print(f"    - {f}")
    else:
        print("  📝 No uncommitted modifications found.")
    print()

    # Untracked new files
    untracked = _run_git("ls-files", "--others", "--exclude-standard")
    untracked_files = [
        f for f in untracked.splitlines()
        if f and not f.startswith(".agents/.session/")
    ] if untracked else []
    if untracked_files:
        print("  🆕 New untracked files:")
        for f in untracked_files[:15]:
            print(f"    - {f}")
        if len(untracked_files) > 15:
            print(f"    ... and {len(untracked_files) - 15} more")
    print()

    # Recent commits (last 3)
    recent_log = _run_git("log", "--oneline", "-3", "--no-decorate")
    if recent_log:
        print("  📜 Recent commits:")
        for line in recent_log.splitlines():
            print(f"    {line}")
    print()

    # ── Layer 3: Task/Plan files ──
    print("[Layer 3] 📄 Task & Plan files:")
    plan_files = _find_plan_files()
    if plan_files:
        for pf in plan_files:
            print(f"    - {pf}")
    else:
        print("    (no task-slug.md or implementation_plan.md found)")
    print()

    # ── Summary for AI ──
    print("=" * 60)
    total_changes = len(modified) + len(untracked_files)
    if CHECKPOINT_FILE.exists():
        print("[RESUME] Checkpoint + Git data ready. AI can resume immediately.")
    elif total_changes > 0:
        print(f"[RESUME] No checkpoint, but {total_changes} file(s) changed.")
        print("         AI should analyze git diff to understand context.")
    else:
        print("[CLEAN] No pending work detected. Start fresh.")
    print("=" * 60)


def _detect_modified_files() -> list[str]:
    """Detect modified tracked files via git."""
    diff_output = _run_git("diff", "--name-only")
    staged_output = _run_git("diff", "--name-only", "--cached")
    combined = set()
    if diff_output:
        combined.update(diff_output.splitlines())
    if staged_output:
        combined.update(staged_output.splitlines())
    # Filter out generated files
    filtered = [
        f for f in sorted(combined)
        if f and not f.startswith(".agents/.session/")
        and f not in (".cursorrules", "AGENTS.md", ".claude/system-context.md")
    ]
    return filtered


def _find_plan_files() -> list[str]:
    """Find task-slug.md, implementation_plan.md, or similar plan files."""
    plan_patterns = [
        "**/*task*.md",
        "**/*plan*.md",
        "**/*implementation*.md",
    ]
    found: list[str] = []
    for pattern in plan_patterns:
        for p in PROJECT_ROOT.glob(pattern):
            rel = str(p.relative_to(PROJECT_ROOT)).replace("\\", "/")
            # Skip node_modules, .git, and docs
            if any(skip in rel for skip in ("node_modules", ".git/", ".agents/docs/")):
                continue
            if rel not in found:
                found.append(rel)
    return found[:10]


# ---------------------------------------------------------------------------
# STATUS — Quick summary
# ---------------------------------------------------------------------------
def show_status() -> None:
    """Show current checkpoint status."""
    if CHECKPOINT_FILE.exists():
        content = CHECKPOINT_FILE.read_text(encoding="utf-8")
        # Extract timestamp and goal from frontmatter
        lines = content.splitlines()
        timestamp = goal = status = ""
        for line in lines:
            if line.startswith("timestamp:"):
                timestamp = line.split(":", 1)[1].strip()
            elif line.startswith("goal:"):
                goal = line.split(":", 1)[1].strip()
            elif line.startswith("status:"):
                status = line.split(":", 1)[1].strip()
            elif line == "---" and goal:
                break

        print(f"[Checkpoint] ✅ Active")
        print(f"  Saved at:  {timestamp}")
        print(f"  Goal:      {goal}")
        print(f"  Status:    {status}")
    else:
        print("[Checkpoint] ❌ No active checkpoint")

    # Git status summary
    modified = _detect_modified_files()
    print(f"  Uncommitted: {len(modified)} file(s)")


# ---------------------------------------------------------------------------
# CLEAR — Remove checkpoint
# ---------------------------------------------------------------------------
def clear_checkpoint() -> None:
    """Remove the checkpoint file after task completion."""
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        print("[OK] Checkpoint cleared.")
    else:
        print("[OK] No checkpoint to clear.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="AG Kit Cross-IDE Session Recovery System"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--save", action="store_true", help="Save a checkpoint")
    group.add_argument("--restore", action="store_true", help="Restore / inspect checkpoint")
    group.add_argument("--status", action="store_true", help="Show checkpoint status")
    group.add_argument("--clear", action="store_true", help="Clear checkpoint after task done")

    # Save options
    parser.add_argument("--goal", type=str, default="", help="Task goal description")
    parser.add_argument("--stack", type=str, default="", help="Tech stack (auto-detected if omitted)")
    parser.add_argument("--agents", type=str, default="", help="Comma-separated agent names")
    parser.add_argument("--completed", type=str, default="", help="Completed items (comma-sep)")
    parser.add_argument("--in-progress", type=str, default="", help="In-progress items (comma-sep)")
    parser.add_argument("--next", type=str, default="", help="Next steps (comma-sep)")
    parser.add_argument("--decisions", type=str, default="", help="Key decisions (comma-sep)")
    parser.add_argument("--context", type=str, default="", help="User context notes (comma-sep)")

    args = parser.parse_args()

    if args.save:
        if not args.goal:
            print("[ERROR] --goal is required for --save")
            sys.exit(1)
        save_checkpoint(
            goal=args.goal,
            stack=args.stack,
            agents=args.agents.split(",") if args.agents else None,
            completed=args.completed.split(",") if args.completed else None,
            in_progress=args.in_progress.split(",") if args.in_progress else None,
            next_steps=args.next.split(",") if args.next else None,
            decisions=args.decisions.split(",") if args.decisions else None,
            user_context=args.context.split(",") if args.context else None,
        )
    elif args.restore:
        restore_checkpoint()
    elif args.status:
        show_status()
    elif args.clear:
        clear_checkpoint()


if __name__ == "__main__":
    main()
