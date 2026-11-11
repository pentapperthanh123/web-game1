#!/usr/bin/env python3
"""
Understand-Anything Setup & Runner
Tự động install, quét codebase, và mở dashboard trong browser

Usage:
    python .agents/scripts/understand_setup.py              # Full setup + scan + view
    python .agents/scripts/understand_setup.py --scan-only  # Chỉ quét (đã install)
    python .agents/scripts/understand_setup.py --view-only  # Chỉ view (đã có graph)
    python .agents/scripts/understand_setup.py --check      # Kiểm tra status
"""

import os
import sys
import subprocess
import platform
import json
import shutil
from pathlib import Path

# ANSI colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def _safe_print(msg: str) -> None:
    try:
        print(msg)
    except UnicodeEncodeError:
        cleaned = msg.encode("ascii", errors="ignore").decode("ascii")
        print(cleaned)


def print_step(msg):
    _safe_print(f"\n{BLUE}▶{RESET} {BOLD}{msg}{RESET}")


def print_success(msg):
    _safe_print(f"{GREEN}✓{RESET} {msg}")


def print_warning(msg):
    _safe_print(f"{YELLOW}⚠{RESET} {msg}")


def print_error(msg):
    _safe_print(f"{RED}✗{RESET} {msg}")


def get_repo_root():
    """Tìm root của git repo"""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(result.stdout.strip())
    except subprocess.CalledProcessError:
        return Path.cwd()


def check_node_installed():
    """Kiểm tra Node.js >= 18"""
    try:
        result = subprocess.run(
            ["node", "--version"], capture_output=True, text=True, check=True
        )
        version = result.stdout.strip().replace("v", "")
        major = int(version.split(".")[0])
        if major >= 18:
            print_success(f"Node.js {version} detected")
            return True
        else:
            print_error(f"Node.js {version} < 18 (required)")
            return False
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("Node.js not found (required >= 18)")
        _safe_print("Install from: https://nodejs.org/")
        return False


def check_understand_installed(repo_root):
    """Kiểm tra Understand-Anything đã install chưa"""
    # Check for plugin folders
    cursor_plugin = repo_root / ".cursor-plugin" / "plugin.json"
    ua_repo = Path.home() / ".understand-anything" / "repo"
    
    if cursor_plugin.exists():
        print_success("Understand-Anything plugin detected (.cursor-plugin/)")
        return True
    elif ua_repo.exists():
        print_success("Understand-Anything repo detected (~/.understand-anything/)")
        return True
    else:
        return False


def install_understand_anything(platform_name=None):
    """Install Understand-Anything"""
    print_step("Installing Understand-Anything...")
    
    os_type = platform.system().lower()
    
    if os_type == "windows":
        # PowerShell install
        script_url = "https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.ps1"
        cmd = ["powershell", "-Command", f"iwr -useb {script_url} | iex"]
        if platform_name:
            cmd[-1] += f" -s {platform_name}"
    else:
        # Bash install
        script_url = "https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh"
        cmd = ["bash", "-c", f"curl -fsSL {script_url} | bash"]
        if platform_name:
            cmd[-1] += f" -s {platform_name}"
    
    try:
        subprocess.run(cmd, check=True)
        print_success("Understand-Anything installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Installation failed: {e}")
        return False


def check_graph_exists(repo_root):
    """Kiểm tra knowledge graph đã tồn tại chưa"""
    possible_paths = [
        repo_root / ".ua" / "knowledge-graph.json",
        repo_root / ".agents" / ".ua" / "knowledge-graph.json",
        repo_root / ".understand-anything" / "knowledge-graph.json",
    ]
    
    for path in possible_paths:
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            try:
                rel_path = path.relative_to(repo_root)
            except ValueError:
                rel_path = path
            print_success(f"Knowledge graph found: {rel_path} ({size_mb:.2f} MB)")
            return path
    
    return None


def run_understand_scan(repo_root, thoroughness="medium"):
    """Chạy /understand để quét codebase"""
    print_step(f"Scanning codebase (thoroughness: {thoroughness})...")
    print_warning("This may take 5-30 minutes depending on project size")
    print_warning("Token usage will be significant on first run (see Understand-Anything docs)")
    
    # Prompt user confirmation
    response = input(f"\n{YELLOW}►{RESET} Proceed with scan? [y/N]: ").lower().strip()
    if response != "y":
        _safe_print("Scan cancelled")
        return False
    
    _safe_print("\n" + "="*60)
    _safe_print(f"{BOLD}To scan your codebase, run this command in your IDE/CLI:{RESET}")
    _safe_print(f"\n  {GREEN}/understand{RESET}")
    
    if thoroughness == "very thorough":
        _safe_print(f"  {GREEN}/understand --thorough{RESET}  (for deep analysis)")
    
    _safe_print("\n" + "="*60)
    _safe_print(f"\n{BLUE}After scanning completes, run:{RESET}")
    _safe_print(f"  {GREEN}python .agents/scripts/understand_setup.py --view-only{RESET}")
    _safe_print("")
    
    return True


def open_dashboard(repo_root):
    """Mở dashboard trong browser"""
    print_step("Opening dashboard in browser...")
    
    graph_path = check_graph_exists(repo_root)
    if not graph_path:
        print_error("No knowledge graph found. Run scan first.")
        return False
    
    # Try to use standalone viewer
    try:
        viewer_url = "https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz"
        
        _safe_print(f"Starting viewer at {repo_root}")
        
        # Resolve npx binary (npx.cmd on Windows)
        npx_bin = shutil.which("npx") or ("npx.cmd" if platform.system().lower() == "windows" else "npx")
        
        # Run npx viewer
        cmd = [npx_bin, viewer_url, str(repo_root)]
        subprocess.Popen(cmd, cwd=repo_root)
        
        print_success("Dashboard should open in browser shortly...")
        _safe_print(f"{BLUE}URL:{RESET} http://127.0.0.1:5173/?token=...")
        _safe_print(f"\n{YELLOW}Note:{RESET} Keep this terminal open while viewing dashboard")
        return True
        
    except Exception as e:
        print_error(f"Failed to start viewer: {e}")
        _safe_print("\nAlternative: Run in your IDE/CLI:")
        _safe_print(f"  {GREEN}/understand-dashboard{RESET}")
        return False


def check_status(repo_root):
    """Kiểm tra status của Understand-Anything setup"""
    _safe_print(f"\n{BOLD}Understand-Anything Status{RESET}")
    _safe_print("="*60)
    
    # 1. Node.js
    _safe_print(f"\n{BOLD}1. Node.js (>= 18){RESET}")
    node_ok = check_node_installed()
    
    # 2. Installation
    _safe_print(f"\n{BOLD}2. Understand-Anything Installation{RESET}")
    installed = check_understand_installed(repo_root)
    if not installed:
        print_warning("Not installed")
        _safe_print(f"   Run: {GREEN}python .agents/scripts/understand_setup.py{RESET}")
    
    # 3. Knowledge Graph
    _safe_print(f"\n{BOLD}3. Knowledge Graph{RESET}")
    graph = check_graph_exists(repo_root)
    if not graph:
        print_warning("No graph found")
        _safe_print(f"   Run scan: {GREEN}/understand{RESET} (in IDE/CLI)")
    
    # 4. Recommendations
    _safe_print(f"\n{BOLD}Recommendations:{RESET}")
    if not node_ok:
        _safe_print(f"  -> Install Node.js 18+: https://nodejs.org/")
    elif not installed:
        _safe_print(f"  -> Run: {GREEN}python .agents/scripts/understand_setup.py{RESET}")
    elif not graph:
        _safe_print(f"  -> Scan codebase: {GREEN}/understand{RESET} (in IDE/CLI)")
    else:
        _safe_print(f"  -> View dashboard: {GREEN}python .agents/scripts/understand_setup.py --view-only{RESET}")
    
    _safe_print("")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Understand-Anything Setup & Runner for AG Kit"
    )
    parser.add_argument(
        "--scan-only",
        action="store_true",
        help="Only run scan (skip install check)",
    )
    parser.add_argument(
        "--view-only",
        action="store_true",
        help="Only open dashboard (skip install & scan)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check installation status",
    )
    parser.add_argument(
        "--platform",
        choices=["cursor", "codex", "gemini", "opencode", "antigravity", "vscode"],
        help="Specify platform for installation",
    )
    parser.add_argument(
        "--thoroughness",
        choices=["quick", "medium", "very thorough"],
        default="medium",
        help="Scan thoroughness level",
    )
    
    args = parser.parse_args()
    repo_root = get_repo_root()
    
    _safe_print(f"\n{BOLD}Understand-Anything Auto Setup{RESET}")
    _safe_print(f"Repository: {repo_root}")
    
    # Check status only
    if args.check:
        check_status(repo_root)
        return
    
    # View only
    if args.view_only:
        if not check_node_installed():
            sys.exit(1)
        if not open_dashboard(repo_root):
            sys.exit(1)
        return
    
    # Scan only
    if args.scan_only:
        run_understand_scan(repo_root, args.thoroughness)
        return
    
    # Full setup flow
    print_step("Starting full setup...")
    
    # 1. Check Node.js
    if not check_node_installed():
        print_error("Please install Node.js 18+ first")
        sys.exit(1)
    
    # 2. Check/Install Understand-Anything
    if not check_understand_installed(repo_root):
        print_warning("Understand-Anything not found")
        response = input(f"{YELLOW}►{RESET} Install now? [y/N]: ").lower().strip()
        if response == "y":
            if not install_understand_anything(args.platform):
                sys.exit(1)
        else:
            _safe_print("Installation skipped")
            sys.exit(0)
    
    # 3. Check graph
    graph = check_graph_exists(repo_root)
    
    if not graph:
        print_warning("No knowledge graph found")
        run_understand_scan(repo_root, args.thoroughness)
    else:
        # Graph exists, offer to view or rescan
        _safe_print(f"\n{YELLOW}►{RESET} Options:")
        _safe_print(f"  1. View existing graph")
        _safe_print(f"  2. Re-scan codebase")
        _safe_print(f"  3. Exit")
        
        choice = input(f"\n{YELLOW}►{RESET} Choose [1]: ").strip() or "1"
        
        if choice == "1":
            open_dashboard(repo_root)
        elif choice == "2":
            run_understand_scan(repo_root, args.thoroughness)
        else:
            _safe_print("Exited")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        _safe_print(f"\n\n{YELLOW}Interrupted{RESET}")
        sys.exit(0)
