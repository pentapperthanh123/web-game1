#!/usr/bin/env python3
"""
AG Kit — Rules + Cursor Commands Sync (Python Edition)

Pure-Python equivalent of install-agents.js.
Works on ANY terminal (PowerShell, CMD, Git Bash, WSL, macOS, Linux)
without requiring Node.js.

What gets synced:
  ✅ .agents/rules/ → .cursorrules, .claude/system-context.md, AGENTS.md
  ✅ .agents/workflows/*.md → .cursor/commands/*.md  (Cursor slash commands)

What does NOT get synced (on-demand):
  ❌ .agents/agent/, skills/, memory/, docs/, scripts/

Usage:
    python .agents/scripts/install_agents.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


def _safe_print(msg: str) -> None:
    """Print with fallback for terminals that can't render emoji/unicode."""
    try:
        print(msg)
    except UnicodeEncodeError:
        # Strip emoji (surrogate range + misc symbols) and retry
        cleaned = msg.encode("ascii", errors="ignore").decode("ascii")
        print(cleaned)


def _normalize(text: str) -> str:
    """Normalize CRLF → LF for consistent parsing across OS."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def strip_yaml_frontmatter(content: str) -> str:
    """Remove YAML frontmatter (--- ... ---) from markdown content."""
    content = _normalize(content)
    if not content.startswith("---"):
        return content
    end = content.find("\n---", 3)
    if end == -1:
        return content
    return content[end + 4:].lstrip()


def extract_description(content: str) -> str | None:
    """Extract 'description:' from YAML frontmatter."""
    content = _normalize(content)
    m = re.match(r"^---\s*\n([\s\S]*?)\n---", content)
    if not m:
        return None
    dm = re.search(r"^description:\s*(.+)$", m.group(1), re.MULTILINE)
    if not dm:
        return None
    return dm.group(1).strip().strip("\"'")


def sync_rules(rules_dir: Path, root_dir: Path) -> None:
    """Combine .agents/rules/*.md → .cursorrules, AGENTS.md, .claude/system-context.md"""
    combined = "# AI System Rules & Guidelines\n\n"

    if not rules_dir.is_dir():
        _safe_print("[X] Rules directory not found: " + str(rules_dir))
        sys.exit(1)

    rule_files = sorted(f for f in rules_dir.iterdir() if f.suffix == ".md")
    if not rule_files:
        _safe_print("[WARN] No rule files found in .agents/rules/")

    for f in rule_files:
        content = f.read_text(encoding="utf-8")
        combined += f"\n--- [Rule: {f.name}] ---\n{content}\n"

    # .cursorrules
    cursor_rules_path = root_dir / ".cursorrules"
    cursor_rules_path.write_text(combined, encoding="utf-8")
    _safe_print("[OK] Created/updated: .cursorrules")

    # .claude/system-context.md
    claude_dir = root_dir / ".claude"
    claude_dir.mkdir(parents=True, exist_ok=True)
    (claude_dir / "system-context.md").write_text(combined, encoding="utf-8")
    _safe_print("[OK] Synced: .claude/system-context.md")

    # AGENTS.md
    (root_dir / "AGENTS.md").write_text(
        f"# Project Agent Blueprint\n\n{combined}",
        encoding="utf-8",
    )
    _safe_print("[OK] Created: AGENTS.md")


def sync_commands(workflows_dir: Path, root_dir: Path) -> None:
    """Sync .agents/workflows/*.md → .cursor/commands/*.md"""
    if not workflows_dir.is_dir():
        _safe_print("[WARN] No .agents/workflows/ — skip slash command sync")
        return

    commands_dir = root_dir / ".cursor" / "commands"
    commands_dir.mkdir(parents=True, exist_ok=True)

    workflow_files = sorted(
        f
        for f in workflows_dir.iterdir()
        if f.suffix == ".md" and f.name.lower() != "readme.md"
    )

    synced = 0
    for f in workflow_files:
        raw = f.read_text(encoding="utf-8")
        desc = extract_description(raw)
        body = strip_yaml_frontmatter(raw)

        # Cursor commands: plain markdown; replace $ARGUMENTS placeholder
        body = body.replace(
            "$ARGUMENTS",
            "(Use the text the user typed after the slash command as the arguments.)",
        )

        header = (
            f"<!-- Synced from .agents/workflows/{f.name}"
            f" — do not edit here; edit the workflow source. -->\n\n"
        )
        if desc:
            header += f"> {desc}\n\n"

        out_path = commands_dir / f.name
        out_path.write_text(header + body, encoding="utf-8")
        synced += 1

    # Remove stale commands that no longer exist in workflows
    expected = {f.name for f in workflow_files}
    for cmd_file in commands_dir.iterdir():
        if cmd_file.suffix != ".md":
            continue
        if cmd_file.name not in expected:
            head = cmd_file.read_text(encoding="utf-8")[:120]
            if "Synced from .agents/workflows/" in head:
                cmd_file.unlink()
                _safe_print(f"[DEL] Removed stale command: {cmd_file.name}")

    _safe_print(f"[OK] Synced {synced} slash commands -> .cursor/commands/")
    _safe_print("     e.g.: /remember, /create, /plan, /reload, ...")


def main() -> int:
    # Resolve directories relative to this script's location
    scripts_dir = Path(__file__).resolve().parent
    agents_dir = scripts_dir.parent  # .agents/
    root_dir = agents_dir.parent     # project root

    rules_dir = agents_dir / "rules"
    workflows_dir = agents_dir / "workflows"

    _safe_print("[SYNC] Combining rules + slash commands...")

    sync_rules(rules_dir, root_dir)
    sync_commands(workflows_dir, root_dir)

    _safe_print("")
    _safe_print("[DONE] Install complete!")
    _safe_print("[TIP] Type / in Cursor chat to see commands. If missing, Reload Window.")
    _safe_print("[TIP] python .agents/scripts/session_boot.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
