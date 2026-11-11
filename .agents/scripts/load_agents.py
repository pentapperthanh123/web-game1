#!/usr/bin/env python3
"""
Auto-detect Agent Loader - AG Kit
==========================================

Detects the project's tech stack from signal files, then writes a session
manifest listing which agents should be active. This keeps context lean
when working across many different projects/stacks.

Usage:
    python .agents/scripts/load_agents.py                # Auto-detect + write manifest
    python .agents/scripts/load_agents.py --interactive  # Force interactive menu
    python .agents/scripts/load_agents.py --list         # Print detected stack + agents
    python .agents/scripts/load_agents.py --add rust     # Pivot: add stack to manifest
    python .agents/scripts/load_agents.py --project backend  # Specify project subfolder

Multi-Project Support:
    - If multiple projects detected (e.g., backend/, frontend/, mobile/), 
      script will ask which one you're working on
    - Choose "all" to load agents for all projects (union mode)
    - Use --project flag to skip picker and target specific folder

Output:
    .agents/.session/active-agents.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Stack -> Agent mapping (data-driven, edit here to extend)
# ---------------------------------------------------------------------------

CORE_AGENTS = [
    "orchestrator",
    "project-planner",
    "explorer-agent",
    "debugger",
    "code-reviewer",
    "security-auditor",
]

STACK_AGENTS = {
    "nextjs": [
        "frontend-specialist",
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
        "seo-specialist",
    ],
    "react": [
        "frontend-specialist",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
        "seo-specialist",
    ],
    "react-native": [
        "mobile-developer",
        "test-engineer",
        "performance-optimizer",
        "devops-engineer",
    ],
    "flutter": [
        "mobile-developer",
        "test-engineer",
        "performance-optimizer",
        "devops-engineer",
    ],
    "rust": [
        "backend-specialist",
        "devops-engineer",
        "performance-optimizer",
        "test-engineer",
    ],
    "dotnet": [
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
    ],
    "dotnet-desktop": [
        "frontend-specialist",
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "performance-optimizer",
        "documentation-writer",
    ],
    "python-api": [
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
    ],
    "python-cli": [
        "backend-specialist",
        "test-engineer",
        "documentation-writer",
    ],
    "go": [
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
    ],
    "node-api": [
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
    ],
    "game": [
        "game-developer",
        "test-engineer",
        "performance-optimizer",
        "documentation-writer",
    ],
    "static-site": [
        "frontend-specialist",
        "seo-specialist",
        "performance-optimizer",
        "documentation-writer",
    ],
    "java-jmix": [
        "backend-specialist",
        "database-architect",
        "test-engineer",
        "devops-engineer",
        "performance-optimizer",
    ],
}

# Keywords in user messages that signal a stack pivot (for GEMINI.md pivot rule)
PIVOT_KEYWORDS = {
    "rust": ["rust", "cargo", "tokio", "axum"],
    "dotnet": ["c#", "csharp", ".net", "dotnet", "aspnet", "efcore"],
    "dotnet-desktop": ["winforms", "wpf", "winui", "devexpress"],
    "java-jmix": ["java", "jmix", "spring", "spring boot", "vaadin", "cuba"],
    "react-native": ["react native", "expo", "rn ", "mobile app"],
    "flutter": ["flutter", "dart", "pubspec"],
    "game": ["unity", "godot", "unreal", "bevy", "game"],
    "nextjs": ["next.js", "nextjs", "app router"],
    "python-api": ["fastapi", "flask", "django", "starlette"],
    "go": ["golang", " go ", "gin-gonic", "echo framework"],
}


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def detect_nextjs(pkg: dict) -> bool:
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return "next" in deps


def detect_react_native(pkg: dict) -> bool:
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return "react-native" in deps or "expo" in deps


def detect_react(pkg: dict) -> bool:
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return "react" in deps


def detect_node_api(pkg: dict) -> bool:
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return any(k in deps for k in ("express", "fastify", "koa", "hapi", "nest"))

def detect_python_api(root: Path) -> str | None:
    for name in ("pyproject.toml", "requirements.txt"):
        f = root / name
        if not f.exists():
            continue
        try:
            text = f.read_text(encoding="utf-8").lower()
        except Exception:
            continue
        if any(k in text for k in ("fastapi", "flask", "django", "starlette", "sanic")):
            return "python-api"
        return "python-cli"
    return None


def detect_stack_in_dir(d: Path) -> list[str]:
    """Detect tech stacks in a single directory."""
    stacks = []
    
    # JavaScript/TypeScript detection
    pkg = d / "package.json"
    if pkg.exists():
        data = _read_json(pkg)
        if detect_nextjs(data):
            stacks.append("nextjs")
        elif detect_react_native(data):
            stacks.append("react-native")
        elif detect_node_api(data):
            stacks.append("node-api")
        elif detect_react(data):
            stacks.append("react")
    
    # .NET / C# detection
    has_sln = any(d.glob("*.sln"))
    csproj_files = [
        f for f in d.glob("**/*.csproj")
        if not any(part in f.parts for part in ("bin", "obj", "node_modules", ".git", "packages"))
    ]
    if has_sln or csproj_files:
        # Check if desktop (WinForms, WPF)
        is_desktop = False
        for f in csproj_files:
            try:
                content = f.read_text(encoding="utf-8", errors="ignore").lower()
                if any(k in content for k in ("usewinforms", "usewpf", "system.windows.forms", "presentationframework")):
                    is_desktop = True
                    break
            except Exception:
                pass
        if is_desktop:
            stacks.append("dotnet-desktop")
        else:
            stacks.append("dotnet")
    
    # Java / Jmix detection
    if (d / "pom.xml").exists() or (d / "build.gradle").exists() or (d / "build.gradle.kts").exists():
        stacks.append("java-jmix")

    # Other languages
    if (d / "pubspec.yaml").exists():
        stacks.append("flutter")
    if (d / "Cargo.toml").exists():
        stacks.append("rust")
    if (d / "go.mod").exists():
        stacks.append("go")
    if (d / "project.godot").exists() or any(d.glob("*.unity")):
        stacks.append("game")
    if (d / "astro.config.mjs").exists() or (d / "nuxt.config.ts").exists():
        stacks.append("static-site")
    
    # Python detection
    py = detect_python_api(d)
    if py:
        stacks.append(py)
    
    return stacks


def find_project_dirs(root: Path) -> dict[str, Path]:
    """Find all project directories with signal files.
    Returns: {project_name: project_path}
    """
    projects = {}
    
    # Check root first
    root_stacks = detect_stack_in_dir(root)
    if root_stacks:
        projects[root.name] = root
    
    # Scan common project folders (1 level deep only)
    for subdir in root.iterdir():
        if not subdir.is_dir():
            continue
        # Skip common non-project folders
        if subdir.name.startswith((".", "node_modules", "venv", "__pycache__", "target", "dist", "build")):
            continue
        
        sub_stacks = detect_stack_in_dir(subdir)
        if sub_stacks:
            projects[subdir.name] = subdir
    
    return projects


def detect_stack(root: Path) -> list[str]:
    """Return list of detected stacks (union for monorepos or multi-project folders)."""
    stacks: list[str] = []

    # Monorepo: scan each package + union
    is_monorepo = any(
        (root / f).exists()
        for f in ("turbo.json", "nx.json", "pnpm-workspace.yaml", "lerna.json")
    )

    pkg_dirs = [root]
    if is_monorepo:
        for sub in ("apps", "packages", "services"):
            d = root / sub
            if d.is_dir():
                pkg_dirs.extend([p for p in d.iterdir() if p.is_dir()])
    
    # Detect in each directory
    for d in pkg_dirs:
        stacks.extend(detect_stack_in_dir(d))

    # Dedupe, preserve order
    seen, out = set(), []
    for s in stacks:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


# ---------------------------------------------------------------------------
# Interactive menu (greenfield / ambiguous)
# ---------------------------------------------------------------------------

INTERACTIVE_OPTIONS = [
    ("nextjs", "Next.js (full-stack React)"),
    ("react-native", "React Native (mobile)"),
    ("flutter", "Flutter (mobile)"),
    ("rust", "Rust (CLI / server)"),
    ("dotnet", ".NET (ASP.NET Core / Web API / C#)"),
    ("dotnet-desktop", ".NET Desktop (WinForms / WPF / C# Legacy)"),
    ("java-jmix", "Java Jmix / Spring Boot (Enterprise Framework)"),
    ("python-api", "Python API (FastAPI/Flask/Django)"),
    ("python-cli", "Python CLI"),
    ("go", "Go (API / server)"),
    ("node-api", "Node.js API (Express/Fastify/Nest)"),
    ("game", "Game (Unity/Godot/Bevy)"),
    ("static-site", "Static site (Astro/Nuxt)"),
    ("all", "All agents (16 total — exploratory / mixed stack)"),
]


def interactive_menu() -> list[str]:
    print("\nNo stack signal files detected (greenfield project).")
    print("Pick the stack(s) for this session (comma-separated numbers, e.g. 1,4):\n")
    for i, (_, label) in enumerate(INTERACTIVE_OPTIONS, 1):
        print(f"  {i}) {label}")
    print()
    try:
        raw = input("Selection: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nAborted.")
        sys.exit(1)

    picks: list[str] = []
    for tok in raw.replace(";", ",").split(","):
        tok = tok.strip()
        if not tok:
            continue
        try:
            idx = int(tok) - 1
        except ValueError:
            continue
        if 0 <= idx < len(INTERACTIVE_OPTIONS):
            stack_id = INTERACTIVE_OPTIONS[idx][0]
            # Special handling for "all"
            if stack_id == "all":
                # Return all stack IDs except "all" itself
                return [s[0] for s in INTERACTIVE_OPTIONS if s[0] != "all"]
            picks.append(stack_id)
    return picks


def interactive_project_picker(projects: dict[str, Path]) -> Path | None:
    """Let user pick a project from multiple detected projects."""
    print("\nMultiple projects detected. Which one are you working on?")
    print("(Or 'all' to load agents for ALL projects)\n")
    
    project_list = sorted(projects.items())
    for i, (name, _) in enumerate(project_list, 1):
        print(f"  {i}) {name}")
    print(f"  {len(project_list) + 1}) all (union all stacks)")
    print()
    
    try:
        raw = input("Selection: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print("\nAborted.")
        sys.exit(1)
    
    if raw == "all" or raw == str(len(project_list) + 1):
        return None  # Signal to use all projects
    
    try:
        idx = int(raw) - 1
        if 0 <= idx < len(project_list):
            return project_list[idx][1]
    except ValueError:
        pass
    
    print(f"Invalid selection. Using first project: {project_list[0][0]}")
    return project_list[0][1]


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def resolve_agents(stacks: list[str]) -> list[str]:
    agents = list(CORE_AGENTS)
    for s in stacks:
        for a in STACK_AGENTS.get(s, []):
            if a not in agents:
                agents.append(a)
    return agents


def write_manifest(session_dir: Path, stacks: list[str], agents: list[str]) -> Path:
    session_dir.mkdir(parents=True, exist_ok=True)
    manifest = session_dir / "active-agents.json"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stacks": stacks,
        "agents": agents,
        "skipped": [
            a for a in STACK_AGENTS.values() for a in a
            if a not in agents
        ] and sorted(set(a for s in STACK_AGENTS.values() for a in s) - set(agents)),
        "pivot_keywords": PIVOT_KEYWORDS,
    }
    # Clean skipped dedup
    payload["skipped"] = sorted(set(payload["skipped"]))
    manifest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return manifest


def load_manifest(session_dir: Path) -> dict | None:
    f = session_dir / "active-agents.json"
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="AG Kit agent auto-loader")
    parser.add_argument("--interactive", action="store_true", help="Force interactive menu")
    parser.add_argument("--list", action="store_true", help="Print detected stack + agents, no write")
    parser.add_argument("--add", metavar="STACK", help="Pivot: add a stack to existing manifest")
    parser.add_argument("--project", metavar="DIR", help="Specify project subdirectory (for multi-project folders)")
    args = parser.parse_args()

    root = Path.cwd()
    session_dir = root / ".agents" / ".session"

    # Pivot mode: add stack to existing manifest
    if args.add:
        session_dir.mkdir(parents=True, exist_ok=True)
        existing = load_manifest(session_dir) or {"stacks": [], "agents": list(CORE_AGENTS)}
        if args.add not in existing["stacks"]:
            existing["stacks"].append(args.add)
        existing["agents"] = resolve_agents(existing["stacks"])
        existing["generated_at"] = datetime.now(timezone.utc).isoformat()
        existing["pivot_keywords"] = PIVOT_KEYWORDS
        (session_dir / "active-agents.json").write_text(
            json.dumps(existing, indent=2), encoding="utf-8"
        )
        print(f"[OK] Manifest updated. Added stack: {args.add}")
        print(f"  Active agents ({len(existing['agents'])}): {', '.join(existing['agents'])}")
        return 0

    # Determine target directory
    target_dir = root
    if args.project:
        target_dir = root / args.project
        if not target_dir.is_dir():
            print(f"[ERROR] Project directory not found: {target_dir}")
            return 1

    # Detect
    if args.interactive:
        stacks = interactive_menu()
    else:
        stacks = detect_stack(target_dir)
        
        # Multi-project folder handling (no monorepo signal, but multiple projects found)
        if not stacks and not args.list and not args.project:
            projects = find_project_dirs(root)
            if len(projects) > 1:
                # Ask user which project to focus on
                selected = interactive_project_picker(projects)
                if selected is None:
                    # User chose "all" - union all stacks
                    for proj_path in projects.values():
                        stacks.extend(detect_stack_in_dir(proj_path))
                    # Dedupe
                    seen, deduped = set(), []
                    for s in stacks:
                        if s not in seen:
                            seen.add(s)
                            deduped.append(s)
                    stacks = deduped
                else:
                    # User picked specific project
                    stacks = detect_stack_in_dir(selected)
        
        # Greenfield fallback (no projects found at all)
        if not stacks and not args.list:
            if os.environ.get("AG_KIT_NONINTERACTIVE") or not sys.stdin.isatty():
                print(
                    "[WARN] No stack detected; loading CORE agents only. "
                    "Run with --interactive to pick stacks."
                )
                stacks = []
            else:
                stacks = interactive_menu()

    agents = resolve_agents(stacks)

    if args.list:
        # Prefer the existing manifest if present (shows current session state);
        # otherwise show what auto-detection would find.
        existing = load_manifest(session_dir)
        if existing:
            print(f"Manifest stacks : {existing.get('stacks', [])}")
            print(f"Active agents   ({len(existing.get('agents', []))}): {', '.join(existing.get('agents', []))}")
            skipped = sorted(set(a for s in STACK_AGENTS.values() for a in s) - set(existing.get('agents', [])))
            print(f"Skipped agents  ({len(skipped)}): {', '.join(skipped) if skipped else '(none)'}")
        else:
            print(f"Detected stacks : {stacks}")
            print(f"Active agents   ({len(agents)}): {', '.join(agents)}")
            skipped = sorted(set(a for s in STACK_AGENTS.values() for a in s) - set(agents))
            print(f"Skipped agents  ({len(skipped)}): {', '.join(skipped) if skipped else '(none)'}")
        return 0

    manifest = write_manifest(session_dir, stacks, agents)
    print(f"[OK] Manifest written: {manifest}")
    print(f"  Stacks: {', '.join(stacks) if stacks else '(none)'}")
    print(f"  Active agents ({len(agents)}): {', '.join(agents)}")
    skipped = sorted(set(a for s in STACK_AGENTS.values() for a in s) - set(agents))
    print(f"  Skipped agents ({len(skipped)}): {', '.join(skipped) if skipped else '(none)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

