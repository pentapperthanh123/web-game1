---
name: codebase-explorer
description: Deep codebase analysis using Understand-Anything knowledge graphs. Visualize architecture, dependencies, and structure for complex refactors and onboarding.
when_to_use: |
  Use when deep codebase analysis is needed for understanding architecture, dependencies, or planning major refactors.
  
  TRIGGER KEYWORDS:
  - "analyze this codebase"
  - "show me the architecture"
  - "understand the structure"
  - "what are the dependencies"
  - "before I refactor"
  - "onboarding new developer"
  - "codebase overview"
---

# Codebase Explorer - Understand-Anything Integration

> Deep codebase analysis using Understand-Anything knowledge graphs.

---

## When to Use This Skill

**Automatic triggers:**
- User asks to "analyze the codebase" or "show architecture"
- Before major refactoring (understand blast radius)
- Onboarding new team members (guided tours)
- Investigating complex dependencies
- Planning system-wide changes

**Manual invocation:**
```
/explore-codebase
```

---

## What Is Understand-Anything?

**An industry-standard tool (75k+ stars) that:**
- Analyzes codebases using Tree-sitter + LLM hybrid
- Builds interactive knowledge graphs
- Provides semantic search and guided tours
- Shows architectural layers and dependencies
- Supports incremental updates (only re-analyzes changed files)

**Official repo:** https://github.com/Egonex-AI/Understand-Anything

---

## How It Works with AG Kit

### 1. Check for Existing Graph

```bash
# AG Kit lookup order (stay inside .agents/ — do NOT use repo-root .ua/):
.agents/.ua/knowledge-graph.json              # AG Kit standard
.ua/knowledge-graph.json                      # External default → migrate into .agents/.ua/
.understand-anything/knowledge-graph.json     # Legacy
```

**If graph exists:**
- ✅ Load architecture overview
- ✅ Reference for navigation
- ✅ Use for impact analysis

**If graph missing:**
- 💡 Suggest running `/understand` first
- 💡 Explain benefits (one-time cost, persistent value)

---

### 2. Initial Analysis (First Time Only)

**User runs once:**
```bash
/understand
```

**What happens:**
- Multi-agent pipeline scans project
- Extracts files, functions, classes, dependencies
- Builds knowledge graph → prefer writing/moving to `.agents/.ua/knowledge-graph.json`
- **Note:** First run is token-heavy for large projects

**Incremental updates (fast):**
```bash
/understand  # Only re-analyzes changed files
```

---

### 3. Explore the Graph

**Interactive dashboard:**
```bash
/understand-dashboard
```

**Ask questions:**
```bash
/understand-chat How does authentication work?
```

**Analyze impact:**
```bash
/understand-diff  # See what your changes affect
```

**Deep-dive:**
```bash
/understand-explain src/auth/login.ts
```

---

## Integration with AG Kit Agents

### Explorer Agent

**Before exploring, check graph:**
```markdown
If .agents/.ua/knowledge-graph.json exists:
  1. Load architecture layers (API, Service, Data, UI)
  2. Show file relationships
  3. Use for navigation context

If graph missing:
  Suggest: "Run /understand first for better navigation"
```

### Orchestrator

**Before planning:**
```markdown
If graph exists:
  - Reference dependencies for task breakdown
  - Identify blast radius for changes
  - Plan in correct dependency order
```

### Code Reviewer

**During review:**
```markdown
If graph exists:
  - Check affected files via /understand-diff
  - Verify architectural layer compliance
  - Validate dependency changes
```

---

## Best Practices

### When to Generate Graph

**✅ Generate for:**
- Large codebases (> 10k lines)
- Complex architectures (microservices, monorepos)
- Before major refactoring
- Team onboarding

**⊘ Skip for:**
- Small projects (< 1k lines)
- Prototypes or throwaway code
- Simple single-file scripts

---

### Committing the Graph

**Recommended for teams:**
```bash
# Commit graph so teammates skip initial analysis
git add .agents/.ua/knowledge-graph.json
git commit -m "Add codebase knowledge graph"
```

**Ignore intermediate files:**
```gitignore
# .gitignore
.agents/.ua/intermediate/
.agents/.ua/diff-overlay.json
```

**Keep fresh:**
```bash
# Auto-update on every commit
/understand --auto-update

# Or manually before releases
/understand
```

---

### Large Graphs (> 10 MB)

**Use git-lfs:**
```bash
git lfs install
git lfs track ".agents/.ua/*.json"
git add .gitattributes .agents/.ua/
```

---

## Commands Reference

| Command | Purpose | Token Cost |
|---------|---------|------------|
| `/understand` | Initial analysis | High (first run) |
| `/understand` | Incremental update | Low (changed files only) |
| `/understand-dashboard` | Open interactive UI | None (local) |
| `/understand-chat <question>` | Ask about codebase | Medium |
| `/understand-diff` | Analyze current changes | Low |
| `/understand-explain <file>` | Deep-dive into file | Medium |
| `/understand-onboard` | Generate onboarding guide | Medium |
| `/understand-domain` | Extract business logic | Medium |

---

## Workflow: First-Time Setup

### Quick Start (Recommended)

**One command - auto setup everything:**
```bash
python .agents/scripts/understand_setup.py
```

→ Script auto-handles:
- ✅ Check Node.js (>= 18)
- ✅ Install Understand-Anything
- ✅ Guide through scanning
- ✅ Open dashboard in browser

**Options:**
```bash
--check         # Kiểm tra status installation
--view-only     # Mở dashboard (graph đã có)
--scan-only     # Chỉ quét (tool đã install)
--thoroughness  # quick | medium | very thorough
```

---

### Manual Setup (Alternative)

```bash
# 1. Generate knowledge graph (one-time, token-heavy)
/understand

# 2. Explore interactively
/understand-dashboard

# 3. Ask questions
/understand-chat Where is the authentication logic?

# 4. (Optional) Commit for team
git add .agents/.ua/knowledge-graph.json
git commit -m "Add codebase knowledge graph"

# 5. Future updates are incremental (fast)
/understand  # Only changed files
```

---

## Workflow: Using Existing Graph

```bash
# If .agents/.ua/knowledge-graph.json exists:

# 1. Open dashboard
/understand-dashboard

# 2. Ask questions
/understand-chat How does payment processing work?

# 3. Check impact of changes
/understand-diff

# 4. Update after major changes
/understand  # Incremental
```

---

## Example: Before Refactoring

**Scenario:** Refactoring authentication system.

```bash
# 1. Understand current architecture
/understand-explain src/auth/

# 2. Check dependencies
/understand-chat What depends on the auth module?

# 3. Plan changes
@orchestrator I need to refactor auth to use JWT instead of sessions

# 4. After changes, verify impact
/understand-diff
```

**Result:** Agent sees full dependency graph and plans safer refactoring.

---

## Example: Team Onboarding

**Scenario:** New developer joins team.

```bash
# 1. Generate onboarding guide
/understand-onboard

# 2. Show interactive dashboard
/understand-dashboard

# 3. Guided tour
/understand-chat Give me a tour of the main features
```

**Result:** New dev understands codebase 10x faster.

---

## Limitations & Considerations

### Token Cost

**Initial run:**
- Large project (50k+ LOC) = **high token usage**
- Recommended: Run on subscription or use local model (Ollama)

**Incremental runs:**
- Only changed files = **low token usage**
- Safe to run frequently

---

### Supported Languages

**Well-supported:**
- TypeScript, JavaScript
- Python
- Java, Go
- Rust, C++

**Experimental:**
- Others via Tree-sitter grammars

---

### Performance

**Graph generation:**
- Small project (< 5k LOC): ~2-5 minutes
- Medium project (5k-50k LOC): ~10-30 minutes
- Large project (> 50k LOC): ~30-60+ minutes

**Dashboard:**
- Opens instantly (local server)
- Smooth for graphs up to 10k nodes

---

## Troubleshooting

### "Command not found: /understand"

**Install Understand-Anything:**
```bash
# Auto-install via AG Kit script
python .agents/scripts/understand_setup.py

# Or manual install
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash
```

### "Graph not found"

```bash
# Check status
python .agents/scripts/understand_setup.py --check

# Generate it
/understand
```

### "Token limit exceeded"

```bash
# Use incremental mode (default)
/understand --incremental

# Or analyze subdirectory
/understand src/backend

# Or use thoroughness control
python .agents/scripts/understand_setup.py --thoroughness quick
```

### "Dashboard won't open"

```bash
# Use AG Kit viewer script
python .agents/scripts/understand_setup.py --view-only

# Or standalone viewer (requires Node 18+)
npx https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz .

# Or try live demo (no installation)
# Visit: https://understand-anything.com/
```

### "No Node.js installed"

```bash
# Check status
python .agents/scripts/understand_setup.py --check

# Install Node.js 18+ from:
# https://nodejs.org/
```

---

## Related AG Kit Skills

- `@[skills/code-review/modules/graph-analyzer]` — Token-efficient review using Tree-sitter
- `@[skills/architecture]` — Architecture decision-making
- `@[skills/systematic-debugging]` — 4-phase debugging with evidence

---

## Related AG Kit Agents

- `explorer-agent` — References graph for navigation
- `orchestrator` — Uses graph for task planning
- `code-reviewer` — Checks impact via graph

---

## Installation (Cursor)

**Understand-Anything auto-discovers via `.cursor-plugin/`:**

```bash
# Just clone the repo in your project
git clone https://github.com/Egonex-AI/Understand-Anything
```

**For other platforms:**
```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash
```

**Check installation:**
```bash
/understand --help
```

---

## Philosophy

**Understand-Anything principle:**
> "Graphs that teach > graphs that impress."
> The goal is a graph that quietly teaches you how every piece fits together.

**AG Kit integration principle:**
> Optional, not mandatory. Use when it adds value, skip when it doesn't.

---

> 💡 **Quick Start:** Run `/explore-codebase` to begin, or `/understand` if you want direct control.
