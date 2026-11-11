#!/usr/bin/env python3
"""
Memory Auto-Loader - AG Kit
==========================================

Loads persistent memory from .agents/memory/ into session context.

Soft-cap policy (option 3):
  Inject stays under --max-chars (default 8192). Index always included.
  Overflow topics are listed as pointers only.

Pick policy (per-chat):
  --topics a,b,c   inject only those topic bodies (+ index)
  --pick           interactive multi-select menu
  --list-topics    show available topics and sizes

Usage:
    python .agents/scripts/load_memory.py --list-topics
    python .agents/scripts/load_memory.py --inject
    python .agents/scripts/load_memory.py --inject --topics user-preferences,ag-kit-defaults
    python .agents/scripts/load_memory.py --inject --pick
    python .agents/scripts/load_memory.py --inject --topics audit-2026-07-24-improvements --no-cap
    python .agents/scripts/load_memory.py --check
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_MAX_CHARS = 8192

CORE_TOPIC_ORDER = (
    "project-conventions",
    "user-preferences",
    "architecture-decisions",
    "tech-decisions",
    "ag-kit-defaults",
)

EXCLUDED_TOPIC_NAMES = {
    "README",
    "CLEANUP-GUIDE",
    "CLEANUP_GUIDE",
}


def _is_topic_file(path: Path) -> bool:
    if path.suffix.lower() != ".md":
        return False
    if path.name == "MEMORY.md":
        return False
    if path.stem in EXCLUDED_TOPIC_NAMES:
        return False
    if "archive" in path.parts:
        return False
    return True


def load_memory_index(memory_dir: Path) -> dict:
    """Load MEMORY.md and topic files (excludes README / cleanup guides)."""
    index_file = memory_dir / "MEMORY.md"
    if not index_file.exists():
        return {"status": "no_index", "message": "MEMORY.md not found"}

    topic_files = sorted(
        [f for f in memory_dir.glob("*.md") if _is_topic_file(f)],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    memory_data: dict = {
        "status": "ok",
        "index": index_file.read_text(encoding="utf-8"),
        "topics": {},
        "topic_mtimes": {},
    }

    for topic in topic_files:
        memory_data["topics"][topic.stem] = topic.read_text(encoding="utf-8")
        memory_data["topic_mtimes"][topic.stem] = topic.stat().st_mtime

    return memory_data


def list_topics(memory_data: dict) -> None:
    """Print available topics with sizes."""
    topics = memory_data.get("topics", {})
    if not topics:
        print("(no topic files)")
        return

    print("Available memory topics:\n")
    ordered = sorted(topics.keys())
    for i, name in enumerate(ordered, 1):
        size = len(topics[name])
        core = " [core]" if name in CORE_TOPIC_ORDER else ""
        print(f"  {i}) {name}  ({size} chars){core}")
    print()
    print("Examples:")
    print("  python .agents/scripts/load_memory.py --inject --topics user-preferences,ag-kit-defaults")
    print("  python .agents/scripts/load_memory.py --inject --pick")


def parse_topics_arg(raw: str, available: list[str]) -> list[str]:
    """Parse comma-separated names or 1-based indices."""
    if not raw or not raw.strip():
        return []

    picks: list[str] = []
    for tok in raw.replace(";", ",").split(","):
        tok = tok.strip()
        if not tok:
            continue
        if tok.isdigit():
            idx = int(tok) - 1
            if 0 <= idx < len(available):
                picks.append(available[idx])
            else:
                print(f"[WARN] Topic index out of range: {tok}", file=sys.stderr)
            continue
        # allow stem with or without .md
        name = tok[:-3] if tok.endswith(".md") else tok
        if name in available:
            picks.append(name)
        else:
            # fuzzy: case-insensitive match
            lower_map = {a.lower(): a for a in available}
            if name.lower() in lower_map:
                picks.append(lower_map[name.lower()])
            else:
                print(f"[WARN] Unknown topic: {tok}", file=sys.stderr)
    # dedupe preserve order
    seen, out = set(), []
    for p in picks:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def interactive_pick(available: list[str], sizes: dict[str, int]) -> list[str]:
    """Interactive multi-select. Returns selected topic names."""
    if not available:
        print("[WARN] No topics to pick.")
        return []

    print("\nPick memory topics for this chat (comma-separated numbers).")
    print("Enter = none (index only).  a / all = every topic.\n")
    for i, name in enumerate(available, 1):
        core = " [core]" if name in CORE_TOPIC_ORDER else ""
        print(f"  {i}) {name}  ({sizes.get(name, 0)} chars){core}")
    print()

    if os.environ.get("AG_KIT_NONINTERACTIVE") or not sys.stdin.isatty():
        print(
            "[WARN] Non-interactive stdin; use --topics instead of --pick.",
            file=sys.stderr,
        )
        return []

    try:
        raw = input("Selection: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nAborted.")
        sys.exit(1)

    if not raw:
        return []
    if raw.lower() in {"a", "all", "*"}:
        return list(available)
    return parse_topics_arg(raw, available)


def filter_topics(memory_data: dict, selected: list[str] | None) -> dict:
    """
    If selected is None → keep all topics (default auto mode).
    If selected is [] → index only.
    If selected is non-empty → only those topics; others become not_selected.
    """
    if memory_data["status"] != "ok":
        return memory_data

    all_topics = memory_data["topics"]
    if selected is None:
        return {
            **memory_data,
            "not_selected": [],
            "pick_mode": False,
        }

    selected_set = set(selected)
    kept = {k: v for k, v in all_topics.items() if k in selected_set}
    not_selected = [k for k in all_topics if k not in selected_set]
    return {
        "status": "ok",
        "index": memory_data["index"],
        "topics": kept,
        "topic_mtimes": memory_data.get("topic_mtimes", {}),
        "not_selected": not_selected,
        "pick_mode": True,
    }


def _topic_sort_key(name: str, mtimes: dict) -> tuple:
    if name in CORE_TOPIC_ORDER:
        return (0, CORE_TOPIC_ORDER.index(name), 0)
    return (1, 0, -mtimes.get(name, 0))


def apply_soft_cap(
    memory_data: dict,
    max_chars: int,
    *,
    no_cap: bool = False,
) -> tuple[dict, list[str], list[str]]:
    """Select topic bodies that fit under max_chars."""
    if memory_data["status"] != "ok":
        return memory_data, [], []

    index = memory_data["index"]
    topics = memory_data["topics"]
    mtimes = memory_data.get("topic_mtimes", {})
    not_selected = list(memory_data.get("not_selected") or [])

    if no_cap or max_chars <= 0:
        filtered = {
            **memory_data,
            "deferred": [],
            "not_selected": not_selected,
        }
        return filtered, list(topics.keys()), []

    ordered = sorted(topics.keys(), key=lambda n: _topic_sort_key(n, mtimes))
    header_overhead = 320
    budget = max_chars - len(index) - header_overhead
    if budget < 500:
        filtered = {
            "status": "ok",
            "index": index,
            "topics": {},
            "topic_mtimes": mtimes,
            "deferred": ordered,
            "not_selected": not_selected,
            "pick_mode": memory_data.get("pick_mode", False),
        }
        return filtered, [], ordered

    included: dict[str, str] = {}
    deferred: list[str] = []
    used = 0

    for name in ordered:
        body = topics[name]
        cost = len(body) + len(name) + 40
        if used + cost <= budget:
            included[name] = body
            used += cost
        else:
            deferred.append(name)

    filtered = {
        "status": "ok",
        "index": index,
        "topics": included,
        "topic_mtimes": mtimes,
        "deferred": deferred,
        "not_selected": not_selected,
        "pick_mode": memory_data.get("pick_mode", False),
    }
    return filtered, list(included.keys()), deferred


def format_memory_context(memory_data: dict) -> str:
    if memory_data["status"] != "ok":
        return f"Memory unavailable: {memory_data['message']}"

    pick_mode = memory_data.get("pick_mode", False)
    mode_note = (
        "Pick mode: only selected topics are fully injected."
        if pick_mode
        else "Auto mode: soft-cap may defer large/old topics."
    )

    lines = [
        "# Persistent Project Memory",
        "",
        f"**Auto-loaded at session start.** {mode_note}",
        "",
        "---",
        "",
        "## Memory Index",
        "",
        memory_data["index"],
        "",
        "---",
        "",
        "## Memory Topics",
        "",
    ]

    if not memory_data["topics"]:
        lines.append("_(No topic bodies injected — index only or all deferred.)_")
        lines.append("")
        lines.append("---")
        lines.append("")

    for topic_name, content in memory_data["topics"].items():
        lines.append(f"### {topic_name.replace('-', ' ').title()}")
        lines.append("")
        lines.append(content)
        lines.append("")
        lines.append("---")
        lines.append("")

    deferred = memory_data.get("deferred") or []
    if deferred:
        lines.append("## Deferred Topics (over soft cap - read on demand)")
        lines.append("")
        for name in deferred:
            lines.append(f"- `.agents/memory/{name}.md`")
        lines.append("")
        lines.append("---")
        lines.append("")

    not_selected = memory_data.get("not_selected") or []
    if not_selected:
        lines.append("## Not Selected (available - pick next time)")
        lines.append("")
        for name in not_selected:
            lines.append(f"- `.agents/memory/{name}.md`")
        lines.append("")
        lines.append(
            "Re-run: `python .agents/scripts/load_memory.py --inject --topics <names>`"
        )
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append(f"_Memory loaded: {datetime.now(timezone.utc).isoformat()}_")
    return "\n".join(lines)


def inject_to_context(formatted_memory: str, session_dir: Path) -> Path:
    session_dir.mkdir(parents=True, exist_ok=True)
    context_file = session_dir / "memory-context.md"
    context_file.write_text(formatted_memory, encoding="utf-8")
    return context_file


def check_memory_health(
    memory_dir: Path, max_chars: int = DEFAULT_MAX_CHARS
) -> dict:
    checks: dict = {
        "memory_dir_exists": memory_dir.exists(),
        "index_exists": (memory_dir / "MEMORY.md").exists(),
        "topic_count": 0,
        "raw_chars": 0,
        "soft_cap": max_chars,
        "over_cap": False,
    }

    if checks["memory_dir_exists"] and checks["index_exists"]:
        data = load_memory_index(memory_dir)
        if data["status"] == "ok":
            checks["topic_count"] = len(data["topics"])
            raw = len(data["index"]) + sum(len(v) for v in data["topics"].values())
            checks["raw_chars"] = raw
            checks["over_cap"] = raw > max_chars
            _, included, deferred = apply_soft_cap(data, max_chars)
            checks["would_include"] = len(included)
            checks["would_defer"] = len(deferred)

    checks["healthy"] = checks["memory_dir_exists"] and checks["index_exists"]
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="AG Kit memory auto-loader")
    parser.add_argument(
        "--inject", action="store_true", help="Write memory to session context file"
    )
    parser.add_argument(
        "--check", action="store_true", help="Verify memory system health"
    )
    parser.add_argument(
        "--list-topics",
        action="store_true",
        help="List available memory topics and exit",
    )
    parser.add_argument(
        "--topics",
        type=str,
        default=None,
        help="Comma-separated topic names or 1-based indices to inject",
    )
    parser.add_argument(
        "--pick",
        action="store_true",
        help="Interactive multi-select of topics for this chat",
    )
    parser.add_argument(
        "--index-only",
        action="store_true",
        help="Inject MEMORY.md index only (no topic bodies)",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help=f"Soft cap for injected context (default {DEFAULT_MAX_CHARS})",
    )
    parser.add_argument(
        "--no-cap",
        action="store_true",
        help="Disable soft cap; inject full selected topic bodies",
    )
    args = parser.parse_args()

    root = Path.cwd()
    memory_dir = root / ".agents" / "memory"
    session_dir = root / ".agents" / ".session"

    if args.check:
        health = check_memory_health(memory_dir, args.max_chars)
        print(f"Memory Directory: {'[OK]' if health['memory_dir_exists'] else '[X]'}")
        print(f"MEMORY.md Index:  {'[OK]' if health['index_exists'] else '[X]'}")
        print(f"Topic Files:      {health['topic_count']}")
        print(f"Raw size:         {health['raw_chars']} chars")
        print(f"Soft cap:         {health['soft_cap']} chars")
        if health.get("over_cap"):
            print(
                f"Cap status:       [WARN] over soft cap - "
                f"would include {health.get('would_include', 0)}, "
                f"defer {health.get('would_defer', 0)}"
            )
        else:
            print("Cap status:       [OK] under soft cap")
        print(
            f"Overall Status:   "
            f"{'[OK] Healthy' if health['healthy'] else '[X] Unhealthy'}"
        )
        return 0 if health["healthy"] else 1

    memory_data = load_memory_index(memory_dir)
    if memory_data["status"] != "ok":
        print(f"[X] Cannot load: {memory_data['message']}")
        return 1

    available = sorted(memory_data["topics"].keys())
    sizes = {k: len(v) for k, v in memory_data["topics"].items()}

    if args.list_topics:
        list_topics(memory_data)
        return 0

    # Resolve selection: None = auto (all candidates), [] = index only
    selected: list[str] | None
    if args.index_only:
        selected = []
    elif args.pick:
        selected = interactive_pick(available, sizes)
    elif args.topics is not None:
        selected = parse_topics_arg(args.topics, available)
        if args.topics.strip() and not selected:
            print("[X] No valid topics matched. Use --list-topics.")
            return 1
    else:
        selected = None  # auto

    filtered = filter_topics(memory_data, selected)
    capped, included, deferred = apply_soft_cap(
        filtered, args.max_chars, no_cap=args.no_cap
    )
    formatted = format_memory_context(capped)

    if args.inject:
        context_file = inject_to_context(formatted, session_dir)
        mode = "pick" if selected is not None else "auto"
        print(f"[OK] Memory injected to: {context_file}")
        print(f"     Mode:            {mode}")
        print(f"     Topics included: {len(included)}" + (f" ({', '.join(included)})" if included else ""))
        not_sel = capped.get("not_selected") or []
        if not_sel:
            print(f"     Not selected:    {len(not_sel)} ({', '.join(not_sel)})")
        if deferred:
            print(f"     Soft-cap defer:  {len(deferred)} ({', '.join(deferred)})")
            print(f"     Soft cap:        {args.max_chars} chars")
        print(f"     Injected size:   {len(formatted)} chars")
        return 0

    if deferred and not args.no_cap:
        print(
            f"[WARN] Soft cap {args.max_chars}: deferred {len(deferred)} topic(s): "
            f"{', '.join(deferred)}",
            file=sys.stderr,
        )
    print(formatted)
    return 0


if __name__ == "__main__":
    sys.exit(main())
