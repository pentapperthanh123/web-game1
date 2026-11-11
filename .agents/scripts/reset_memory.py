#!/usr/bin/env python3
"""
Memory Cleanup Script - AG Kit

Resets memory to kit origin state for a new project.
Scans `.agents/memory/` and deletes everything except keep-list files.
Also clears the session inject file.

Usage:
    python .agents/scripts/reset_memory.py
    python .agents/scripts/reset_memory.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Kit-shipped files only. Everything else under memory/ is project/session content.
KEEP_FILES = frozenset(
    {
        "MEMORY.md",
        "README.md",
        "CLEANUP-GUIDE.md",
    }
)

MEMORY_INDEX_TEMPLATE = """# Memory Index

> Persistent cross-session memory for project conventions, user preferences, and key decisions.

---

## User

- [user] (Empty - add via /remember)

## Project

- [project] (Empty - add via /remember)

## Tech Decisions

- [project] (Empty - add via /remember)

## Feedback

- [feedback] (Empty - add via /remember)

---

## How Memory Works

**Auto-Loading:** The `load_memory.py` script runs at session start and injects memory content into the AI context automatically.

**Manual Loading:** If auto-load fails, AI should read this index + topic files listed above.

---

## Adding New Memory

Use the `/remember` workflow:
```
/remember [your decision or preference]
```

This will:
1. Parse the memory topic
2. Create/update the appropriate file in `.agents/memory/`
3. Update this index

---

> Last Updated: [Date] | Total Topics: 0 | Total Entries: 0
"""

EMPTY_SESSION_MEMORY = """# Persistent Project Memory

_Empty — run `/remember` then `python .agents/scripts/load_memory.py --inject` (or `session_boot.py`)._
"""


def _should_keep(path: Path, memory_dir: Path) -> bool:
    """Keep only origin files at the memory/ root (or *.template)."""
    try:
        rel = path.relative_to(memory_dir)
    except ValueError:
        return False

    # Nested paths (e.g. archive/) are never kit origin — delete.
    if len(rel.parts) != 1:
        return False

    name = rel.name
    if name in KEEP_FILES:
        return True
    if name.endswith(".template"):
        return True
    return False


def reset_memory(*, dry_run: bool = False) -> int:
    root = Path.cwd()
    memory_dir = root / ".agents" / "memory"
    session_file = root / ".agents" / ".session" / "memory-context.md"

    if not memory_dir.is_dir():
        print("[ERROR] .agents/memory/ directory not found")
        print("   Are you running from project root?")
        return 1

    print("\n[!] AG Kit Memory Cleanup")
    print("=" * 50)
    if dry_run:
        print("[DRY-RUN] No files will be changed\n")

    print(f"Keep list: {', '.join(sorted(KEEP_FILES))} (+ *.template)")
    print()

    deleted_files: list[str] = []
    deleted_dirs: list[str] = []

    # Files first (deepest first so dirs can be removed after)
    all_files = sorted(
        (p for p in memory_dir.rglob("*") if p.is_file()),
        key=lambda p: len(p.parts),
        reverse=True,
    )

    for path in all_files:
        if _should_keep(path, memory_dir):
            continue
        rel = path.relative_to(memory_dir).as_posix()
        deleted_files.append(rel)
        print(f"[DEL] {rel}")
        if not dry_run:
            path.unlink()

    # Remove leftover directories (e.g. archive/) — deepest first
    all_dirs = sorted(
        (p for p in memory_dir.rglob("*") if p.is_dir()),
        key=lambda p: len(p.parts),
        reverse=True,
    )
    for path in all_dirs:
        if not path.exists() or path == memory_dir:
            continue
        # After file purge: remove dir if empty, or wipe if only empty children left
        if any(path.iterdir()):
            continue
        rel = path.relative_to(memory_dir).as_posix()
        deleted_dirs.append(rel)
        print(f"[DEL DIR] {rel}/")
        if not dry_run:
            path.rmdir()

    # Reset MEMORY.md content
    print("[OK] Reset MEMORY.md to empty template")
    if not dry_run:
        (memory_dir / "MEMORY.md").write_text(MEMORY_INDEX_TEMPLATE, encoding="utf-8")

    # Clear session inject
    if session_file.exists() or session_file.parent.exists():
        print("[OK] Clear .agents/.session/memory-context.md")
        if not dry_run:
            session_file.parent.mkdir(parents=True, exist_ok=True)
            session_file.write_text(EMPTY_SESSION_MEMORY, encoding="utf-8")

    kept = sorted(
        p.name
        for p in memory_dir.iterdir()
        if p.is_file() and (_should_keep(p, memory_dir) or dry_run and p.name in KEEP_FILES)
    )
    if not dry_run:
        kept = sorted(p.name for p in memory_dir.iterdir() if p.is_file())

    print("\n" + "=" * 50)
    print("[SUCCESS] Memory cleanup complete!" if not dry_run else "[DRY-RUN] Complete")
    print("\nSummary:")
    print(f"  - Deleted files: {len(deleted_files)}")
    print(f"  - Deleted dirs:  {len(deleted_dirs)}")
    print(f"  - Kept:          {', '.join(kept) if kept else '(none)'}")
    print("\n[TIP] Next: /remember to build memory for this project")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset AG Kit memory to origin files only")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without changing files",
    )
    args = parser.parse_args()
    try:
        return reset_memory(dry_run=args.dry_run)
    except Exception as exc:
        print(f"\n[ERROR] {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
