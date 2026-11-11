<!-- Synced from .agents/workflows/explore-codebase.md — do not edit here; edit the workflow source. -->

> Quick start for deep codebase analysis using Understand-Anything knowledge graphs

# Explore Codebase

> Interactive workflow to analyze and explore your codebase structure.

---

## What This Does

Guides you through codebase analysis using Understand-Anything:
1. Checks if knowledge graph exists
2. If missing: Guides initial analysis
3. If exists: Opens exploration tools
4. Provides quick tips and next steps

---

## Usage

### Quick Start (One Command)

**AG Kit auto-setup (recommended):**
```bash
python .agents/scripts/understand_setup.py
```

→ Tự động: Check Node.js → Install tool → Guide scan → Open dashboard

**Options:**
```bash
python .agents/scripts/understand_setup.py --check        # Kiểm tra status
python .agents/scripts/understand_setup.py --view-only    # Chỉ mở dashboard (đã có graph)
python .agents/scripts/understand_setup.py --scan-only    # Chỉ quét (đã install)
```

---

### Alternative: Workflow Command

```bash
/explore-codebase
```

**Or ask naturally:**
- "Analyze this codebase"
- "Show me the architecture"
- "I need to understand the project structure"

---

## Workflow Steps

### Step 1: Check for Graph

**Looks for (in order):**
- `.agents/.ua/knowledge-graph.json` (**AG Kit standard** — inside `.agents/`)
- `.ua/knowledge-graph.json` (external default → migrate into `.agents/.ua/`)
- `.understand-anything/knowledge-graph.json` (legacy)

---

### Step 2A: If Graph Exists ✅

**You see:**
```
✅ Knowledge graph found!

Quick actions:
1. /understand-dashboard — Open interactive UI
2. /understand-chat <question> — Ask anything
3. /understand-diff — See what your changes affect

Examples:
• "Show me authentication flow"
• "What depends on the auth module?"
• "Explain src/components/Header.tsx"
```

---

### Step 2B: If Graph Missing 📊

**You see:**
```
📊 No knowledge graph found. Let's create one!

What this does:
• Analyzes your entire codebase
• Extracts files, functions, classes, dependencies
• Builds interactive knowledge graph
• Saves to `.agents/.ua/knowledge-graph.json` (AG Kit standard; not repo-root `.ua/`)

⚠️ Note: First run is token-heavy for large projects
    Consider running on a subscription or local model (Ollama)

Ready to proceed?
1. Yes → Run /understand now
2. No → Learn more first
3. Custom → /understand src/backend (analyze subdirectory)
```

---

### Step 3: Explore

**After graph exists, you can:**

**Visual exploration:**
```bash
/understand-dashboard
```
→ Opens interactive graph in browser
→ Click nodes, search, pan/zoom
→ Color-coded by architectural layer

**Ask questions:**
```bash
/understand-chat How does authentication work?
/understand-chat What are the main API endpoints?
/understand-chat Show me the data flow for user login
```

**Check impact:**
```bash
/understand-diff
```
→ See which parts your changes affect

**Deep-dive:**
```bash
/understand-explain src/auth/login.ts
/understand-explain src/components/
```

**Onboarding guide:**
```bash
/understand-onboard
```
→ Generate guided tour for new developers

---

## Example Session

```bash
# Start workflow
/explore-codebase

# [If graph missing] Generate it
/understand

# Open dashboard
/understand-dashboard

# Ask questions while exploring
/understand-chat Where is the payment processing logic?

# Before making changes
/understand-diff

# After changes
/understand  # Incremental update
```

---

## Best Practices

### When to Use This Workflow

**✅ Perfect for:**
- Large codebases (> 10k lines)
- Complex architectures
- Before major refactoring
- Team onboarding
- Understanding dependencies

**⊘ Skip for:**
- Small projects (< 1k lines)
- Single-file scripts
- Throwaway prototypes

---

### Keeping Graph Fresh

**Auto-update (recommended):**
```bash
/understand --auto-update
```
→ Adds post-commit hook for incremental updates

**Manual update:**
```bash
/understand  # Only re-analyzes changed files
```

---

### Sharing with Team

**Commit the graph:**
```bash
git add .agents/.ua/knowledge-graph.json
git commit -m "Add codebase knowledge graph"
```

**Benefits:**
- Teammates skip initial token-heavy analysis
- Instant onboarding
- Consistent architecture view

**Ignore intermediate files:**
```gitignore
# Already in .gitignore
.agents/.ua/intermediate/
.agents/.ua/diff-overlay.json
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| **Start workflow** | `/explore-codebase` |
| **Generate graph** | `/understand` |
| **Open dashboard** | `/understand-dashboard` |
| **Ask questions** | `/understand-chat <question>` |
| **Check impact** | `/understand-diff` |
| **Deep-dive file** | `/understand-explain <file>` |
| **Onboarding guide** | `/understand-onboard` |
| **Extract business logic** | `/understand-domain` |
| **Incremental update** | `/understand` (re-run) |

---

## Troubleshooting

### "Command not found: /understand"

**Install Understand-Anything:**
```bash
# Cursor auto-discovers, or:
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash
```

### "Token limit exceeded"

**Solutions:**
```bash
# 1. Analyze subdirectory only
/understand src/backend

# 2. Use incremental mode (default)
/understand --incremental

# 3. Use local model (Ollama)
# (Configure in platform settings)
```

### "Dashboard won't open"

**Use AG Kit script:**
```bash
python .agents/scripts/understand_setup.py --view-only
```

**Or standalone viewer:**
```bash
# Requires Node.js 18+
npx https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz .
```

**Or live demo (no installation):**
```
https://understand-anything.com/
```

---

## What You Get

**After analysis completes:**

✅ **Knowledge Graph** (`.agents/.ua/knowledge-graph.json`)
- Every file, function, class mapped
- All dependencies visualized
- Architectural layers identified

✅ **Interactive Dashboard**
- Visual exploration
- Searchable nodes
- Click for details

✅ **Semantic Understanding**
- Plain-English summaries
- Guided tours
- Business logic extraction

✅ **Impact Analysis**
- See what your changes affect
- Understand blast radius
- Plan safer refactoring

---

## Integration with AG Kit

**This workflow activates `@[skills/codebase-explorer]` which:**
- Guides Understand-Anything usage
- Integrates graph with AG Kit agents
- Provides context for orchestrator
- Enhances code review with impact analysis

**AG Kit agents automatically reference graph when:**
- Planning complex tasks (orchestrator)
- Navigating codebase (explorer-agent)
- Reviewing changes (code-reviewer)

---

## Related Workflows

- `/brainstorm` — Socratic questions before implementation
- `/review` — Code quality review
- `/remember` — Persist architectural decisions

---

## Related Skills

- `@[skills/codebase-explorer]` — This skill (auto-invoked)
- `@[skills/architecture]` — Architecture decision-making
- `@[skills/code-review/modules/graph-analyzer]` — Token-efficient graph-based review

---

## Philosophy

> **"Stop reading code blind. Start understanding everything."**

Knowledge graphs teach you the codebase instead of impressing you with complexity.

AG Kit + Understand-Anything = Exploration + Execution.

---

> 💡 **Quick Start:** Just run `/explore-codebase` and follow the prompts!
