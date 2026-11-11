#!/usr/bin/env python3
"""
Framework Detection Script
Auto-detect frontend/backend framework from project files

Usage:
    python detect_framework.py <project_path>
    python detect_framework.py . --json
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional

# ANSI colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def read_package_json(project_root: Path) -> Optional[Dict]:
    """Read and parse package.json"""
    package_path = project_root / "package.json"
    if not package_path.exists():
        return None
    
    try:
        with open(package_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def detect_frontend_framework(project_root: Path, package_data: Optional[Dict]) -> Dict:
    """Detect frontend framework"""
    if not package_data:
        return {"framework": "none", "confidence": "low"}
    
    deps = {**package_data.get("dependencies", {}), **package_data.get("devDependencies", {})}
    
    # Next.js (React meta-framework)
    if "next" in deps:
        version = deps.get("next", "unknown")
        return {
            "framework": "react-next",
            "meta_framework": "next",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/react-next.md"
        }
    
    # Nuxt (Vue meta-framework)
    if "nuxt" in deps or "nuxt3" in deps:
        version = deps.get("nuxt", deps.get("nuxt3", "unknown"))
        return {
            "framework": "vue-nuxt",
            "meta_framework": "nuxt",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/vue-nuxt.md"
        }
    
    # SvelteKit (Svelte meta-framework)
    if "@sveltejs/kit" in deps:
        version = deps.get("@sveltejs/kit", "unknown")
        return {
            "framework": "svelte-kit",
            "meta_framework": "sveltekit",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/svelte-kit.md"
        }
    
    # Angular
    if "@angular/core" in deps:
        version = deps.get("@angular/core", "unknown")
        return {
            "framework": "angular",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/angular.md"
        }
    
    # Solid
    if "solid-js" in deps:
        version = deps.get("solid-js", "unknown")
        return {
            "framework": "solid",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/solid.md"
        }
    
    # Qwik
    if "@builder.io/qwik" in deps:
        version = deps.get("@builder.io/qwik", "unknown")
        return {
            "framework": "qwik",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/qwik.md"
        }
    
    # Astro (multi-framework)
    if "astro" in deps:
        version = deps.get("astro", "unknown")
        return {
            "framework": "astro",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/astro.md",
            "note": "Astro supports multiple frameworks"
        }
    
    # Remix (React meta-framework)
    if "@remix-run/react" in deps:
        version = deps.get("@remix-run/react", "unknown")
        return {
            "framework": "remix",
            "meta_framework": "remix",
            "version": version,
            "confidence": "high",
            "skill_file": "frameworks/react-next.md",
            "note": "Use React patterns, Remix-specific routing"
        }
    
    # Fallback to base frameworks
    if "react" in deps or "react-dom" in deps:
        version = deps.get("react", "unknown")
        return {
            "framework": "react",
            "version": version,
            "confidence": "medium",
            "skill_file": "frameworks/react-next.md",
            "note": "Generic React (no meta-framework)"
        }
    
    if "vue" in deps:
        version = deps.get("vue", "unknown")
        return {
            "framework": "vue",
            "version": version,
            "confidence": "medium",
            "skill_file": "frameworks/vue-nuxt.md",
            "note": "Generic Vue (no meta-framework)"
        }
    
    if "svelte" in deps:
        version = deps.get("svelte", "unknown")
        return {
            "framework": "svelte",
            "version": version,
            "confidence": "medium",
            "skill_file": "frameworks/svelte-kit.md",
            "note": "Generic Svelte (no meta-framework)"
        }
    
    return {"framework": "unknown", "confidence": "low"}


def detect_backend_language(project_root: Path, package_data: Optional[Dict]) -> Dict:
    """Detect backend language/framework"""
    results = []
    
    # Node.js / TypeScript
    if package_data:
        deps = {**package_data.get("dependencies", {}), **package_data.get("devDependencies", {})}
        
        if "@nestjs/core" in deps:
            results.append({
                "language": "typescript-node",
                "framework": "nestjs",
                "confidence": "high"
            })
        elif "express" in deps:
            results.append({
                "language": "typescript-node",
                "framework": "express",
                "confidence": "high"
            })
        elif "fastify" in deps:
            results.append({
                "language": "typescript-node",
                "framework": "fastify",
                "confidence": "high"
            })
    
    # Python
    if (project_root / "requirements.txt").exists() or (project_root / "pyproject.toml").exists():
        results.append({
            "language": "python",
            "framework": "detect from requirements",
            "confidence": "medium"
        })
    
    # Go
    if (project_root / "go.mod").exists():
        results.append({
            "language": "go",
            "confidence": "high"
        })
    
    # Rust
    if (project_root / "Cargo.toml").exists():
        results.append({
            "language": "rust",
            "confidence": "high"
        })
    
    # Java / Jmix / Spring Boot
    is_jmix = False
    for build_file in ("pom.xml", "build.gradle", "build.gradle.kts"):
        f = project_root / build_file
        if f.exists():
            try:
                content = f.read_text(encoding="utf-8", errors="ignore").lower()
                if "jmix" in content or "io.jmix" in content:
                    is_jmix = True
                    break
            except Exception:
                pass

    if (project_root / "pom.xml").exists() or (project_root / "build.gradle").exists() or (project_root / "build.gradle.kts").exists():
        results.append({
            "language": "java",
            "framework": "java-jmix" if is_jmix else "spring-boot",
            "confidence": "high"
        })
    
    # C# / .NET
    has_sln = any(project_root.glob("*.sln"))
    csproj_files = [
        f for f in project_root.glob("**/*.csproj")
        if not any(part in f.parts for part in ("bin", "obj", "node_modules", ".git", "packages"))
    ]
    if has_sln or csproj_files:
        is_desktop = False
        for f in csproj_files:
            try:
                text = f.read_text(encoding="utf-8", errors="ignore").lower()
                if any(k in text for k in ("usewinforms", "usewpf", "system.windows.forms", "presentationframework")):
                    is_desktop = True
                    break
            except Exception:
                pass
        results.append({
            "language": "csharp",
            "framework": "dotnet-desktop" if is_desktop else "dotnet",
            "confidence": "high"
        })
    
    return {"backends": results} if results else {"backends": []}


def detect_all(project_root: Path) -> Dict:
    """Detect all frameworks and languages"""
    package_data = read_package_json(project_root)
    
    frontend = detect_frontend_framework(project_root, package_data)
    backend = detect_backend_language(project_root, package_data)
    
    return {
        "project_root": str(project_root),
        "frontend": frontend,
        "backend": backend,
        "has_package_json": package_data is not None
    }


def print_results(results: Dict):
    """Print detection results in human-readable format"""
    print(f"\n{BLUE}Framework Detection Results{RESET}")
    print("=" * 60)
    
    # Frontend
    frontend = results.get("frontend", {})
    if frontend.get("framework") != "unknown" and frontend.get("framework") != "none":
        print(f"\n{GREEN}Frontend:{RESET}")
        print(f"  Framework: {frontend.get('framework')}")
        if "meta_framework" in frontend:
            print(f"  Meta-framework: {frontend.get('meta_framework')}")
        if "version" in frontend:
            print(f"  Version: {frontend.get('version')}")
        print(f"  Confidence: {frontend.get('confidence')}")
        if "skill_file" in frontend:
            print(f"  Skill: {YELLOW}.agents/skills/web-performance/{frontend.get('skill_file')}{RESET}")
        if "note" in frontend:
            print(f"  Note: {frontend.get('note')}")
    else:
        print(f"\n{YELLOW}Frontend: Not detected{RESET}")
    
    # Backend
    backends = results.get("backend", {}).get("backends", [])
    if backends:
        print(f"\n{GREEN}Backend:{RESET}")
        for backend in backends:
            print(f"  Language: {backend.get('language')}")
            if "framework" in backend:
                print(f"  Framework: {backend.get('framework')}")
            print(f"  Confidence: {backend.get('confidence')}")
            print()
    else:
        print(f"\n{YELLOW}Backend: Not detected{RESET}")
    
    print()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Auto-detect frontend/backend framework from project files"
    )
    parser.add_argument(
        "project_path",
        nargs="?",
        default=".",
        help="Path to project directory (default: current directory)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    
    args = parser.parse_args()
    
    project_root = Path(args.project_path).resolve()
    
    if not project_root.exists():
        print(f"Error: Path does not exist: {project_root}")
        sys.exit(1)
    
    results = detect_all(project_root)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print_results(results)


if __name__ == "__main__":
    main()
