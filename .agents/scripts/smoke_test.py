#!/usr/bin/env python3
"""
AG Kit Smoke Test — verify kit integrity without running a full project build.

Usage:
    python .agents/scripts/smoke_test.py
    python .agents/scripts/smoke_test.py --verbose
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

EXPECTED_AGENTS = 16
EXPECTED_SKILLS = 50
EXPECTED_WORKFLOWS = 19

STALE_AGENT_REFS = {
    "product-owner",
    "penetration-tester",
    "api-designer",
    "qa-automation-engineer",
}

SCAN_PATHS = [
    ".agents/skills/intelligent-routing/SKILL.md",
    ".agents/skills/parallel-agents/SKILL.md",
    ".agents/workflows/orchestrate.md",
    ".agents/rules/RULES.md",
]


def ok(msg: str) -> None:
    print(f"  [OK] {msg}")


def fail(msg: str) -> None:
    print(f"  [X] {msg}")


def check_counts(agents_dir: Path, errors: list[str]) -> None:
    print("\n[Counts]")
    agent_files = [
        f for f in (agents_dir / "agent").glob("*.md") if f.name != "README.md"
    ]
    skill_dirs = [d for d in (agents_dir / "skills").iterdir() if d.is_dir()]
    workflow_files = [
        f for f in (agents_dir / "workflows").glob("*.md") if f.name != "README.md"
    ]

    if len(agent_files) == EXPECTED_AGENTS:
        ok(f"Agents: {len(agent_files)}")
    else:
        msg = f"Agents: expected {EXPECTED_AGENTS}, got {len(agent_files)}"
        fail(msg)
        errors.append(msg)

    if len(skill_dirs) == EXPECTED_SKILLS:
        ok(f"Skills: {len(skill_dirs)}")
    else:
        msg = f"Skills: expected {EXPECTED_SKILLS}, got {len(skill_dirs)}"
        fail(msg)
        errors.append(msg)

    if len(workflow_files) == EXPECTED_WORKFLOWS:
        ok(f"Workflows: {len(workflow_files)}")
    else:
        msg = f"Workflows: expected {EXPECTED_WORKFLOWS}, got {len(workflow_files)}"
        fail(msg)
        errors.append(msg)


def check_skills_frontmatter(agents_dir: Path, errors: list[str]) -> None:
    print("\n[Skills frontmatter]")
    missing: list[str] = []
    for skill_dir in sorted((agents_dir / "skills").iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            missing.append(f"{skill_dir.name} (no SKILL.md)")
            continue
        content = skill_md.read_text(encoding="utf-8")
        if "when_to_use" not in content:
            missing.append(skill_dir.name)

    if missing:
        fail(f"{len(missing)} skills missing when_to_use or SKILL.md: {', '.join(missing[:5])}")
        errors.append("skills missing when_to_use")
    else:
        ok(f"All {EXPECTED_SKILLS} skills have when_to_use")


def check_stale_routing(root: Path, errors: list[str], verbose: bool) -> None:
    print("\n[Routing references]")
    found: dict[str, list[str]] = {name: [] for name in STALE_AGENT_REFS}

    for rel in SCAN_PATHS:
        path = root / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for stale in STALE_AGENT_REFS:
            if stale in text:
                found[stale].append(rel)

    stale_hits = {k: v for k, v in found.items() if v}
    if stale_hits:
        for agent, files in stale_hits.items():
            fail(f"Stale agent '{agent}' in: {', '.join(files)}")
            if verbose:
                print(f"       Replace with real agents from .agents/agent/")
        errors.append("stale agent references")
    else:
        ok("No stale agent names in routing files")


def check_memory(agents_dir: Path, errors: list[str]) -> None:
    print("\n[Memory]")
    memory_dir = agents_dir / "memory"
    # Kit origin files only — topic files are created via /remember after reset.
    required = [
        "MEMORY.md",
        "README.md",
        "CLEANUP-GUIDE.md",
    ]
    missing = [name for name in required if not (memory_dir / name).exists()]
    if missing:
        fail(f"Missing memory origin files: {', '.join(missing)}")
        errors.append("memory files missing")
    else:
        ok(f"Memory origin files present ({', '.join(required)})")


def check_scripts(root: Path, errors: list[str]) -> None:
    print("\n[Script smoke]")
    scripts_dir = root / ".agents" / "scripts"

    for name in ("load_agents.py", "load_memory.py", "session_boot.py"):
        path = scripts_dir / name
        if not path.exists():
            fail(f"Missing {name}")
            errors.append(f"missing {name}")
            continue

    # load_agents --list
    r = subprocess.run(
        [sys.executable, str(scripts_dir / "load_agents.py"), "--list"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if r.returncode == 0:
        ok("load_agents.py --list")
    else:
        fail("load_agents.py --list failed")
        errors.append("load_agents --list failed")

    # load_memory --check
    r = subprocess.run(
        [sys.executable, str(scripts_dir / "load_memory.py"), "--check"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if r.returncode == 0:
        ok("load_memory.py --check")
    else:
        fail("load_memory.py --check failed")
        errors.append("load_memory --check failed")


def check_doc_consistency(root: Path, errors: list[str]) -> None:
    print("\n[Doc consistency]")
    # Stale counts relative to EXPECTED_* (update when kit grows)
    patterns = [
        (r"\b46 skills\b", "46 skills"),
        (r"\b15 workflows\b", "15 workflows"),
        (r"\b16 workflows\b", "16 workflows"),
        (r"15 lệnh tắt", "15 lệnh tắt"),
        (r"16 lệnh tắt", "16 lệnh tắt"),
        (r"46 kỹ năng", "46 kỹ năng"),
        (r"\b12 Core Specialist Agents\b", "12 Core Specialist Agents"),
    ]
    doc_files = [
        root / "README.md",
        root / ".agents" / "ARCHITECTURE.md",
        root / ".agents" / "README.md",
        root / ".agents" / "rules" / "RULES.md",
        root / ".agents" / "workflows" / "README.md",
        root / ".agents" / "scripts" / "README.md",
    ]
    doc_files.extend(
        f for f in (root / ".agents" / "docs").glob("*.md")
        if not f.name.startswith("AUDIT-REPORT")
    )

    hits: list[str] = []
    for doc in doc_files:
        if not doc.exists():
            continue
        text = doc.read_text(encoding="utf-8")
        for pattern, label in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                hits.append(f"{doc.relative_to(root)}: '{label}'")

    if hits:
        for hit in hits[:8]:
            fail(hit)
        if len(hits) > 8:
            fail(f"... and {len(hits) - 8} more")
        errors.append("stale doc counts")
    else:
        ok(
            f"No outdated skill/workflow counts "
            f"(expect {EXPECTED_SKILLS} skills, {EXPECTED_WORKFLOWS} workflows)"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="AG Kit smoke test")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    agents_dir = root / ".agents"
    if not agents_dir.is_dir():
        print("[X] .agents/ not found")
        return 1

    print("=" * 50)
    print("AG Kit Smoke Test")
    print("=" * 50)

    errors: list[str] = []
    check_counts(agents_dir, errors)
    check_skills_frontmatter(agents_dir, errors)
    check_stale_routing(root, errors, args.verbose)
    check_memory(agents_dir, errors)
    check_scripts(root, errors)
    check_doc_consistency(root, errors)

    print("\n" + "=" * 50)
    if errors:
        print(f"[FAIL] {len(errors)} check group(s) failed")
        return 1
    print("[PASS] All smoke checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
