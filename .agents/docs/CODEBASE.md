# Codebase Structure & Dependencies

> This file maps the key files and their dependencies in the AG Kit system.
> **Before modifying any file, check this map to identify dependent files.**

---

## Core System Files

### Rules & Configuration

| File | Dependencies | Impact |
|------|--------------|--------|
| **`.agents/rules/GEMINI.md`** | → `.cursorrules` (must stay in sync) | Changes affect all AI behavior globally |
| **`.cursorrules`** | Mirror of `.agents/rules/GEMINI.md` | Cursor IDE reads this directly |
| **`AGENTS.md`** | Reference to `.agents/rules/GEMINI.md` | Documentation only, no logic impact |
| **`.claude/system-context.md`** | Reference to `.agents/rules/GEMINI.md` | Documentation for Claude Code |

### Architecture & Memory

| File | Dependencies | Impact |
|------|--------------|--------|
| **`.agents/ARCHITECTURE.md`** | Lists all agents, skills, workflows | Changes must update agent/skill counts |
| **`.agents/memory/MEMORY.md`** | → `memory/*.md` topic files | Index for persistent memory system |
| **`.agents/memory/project-conventions.md`** | Standalone | Project-specific conventions |

---

## Agent System Dependencies

### Agents (`.agents/agent/*.md`)

| Agent | Required Skills | Script Dependencies |
|-------|----------------|---------------------|
| `backend-specialist` | clean-code, nodejs-best-practices, python-patterns, api-patterns, database-design | — |
| `frontend-specialist` | clean-code, web-performance, web-design-guidelines, tailwind-patterns, frontend-design | `ux_audit.py`, `accessibility_checker.py` |
| `mobile-developer` | clean-code, mobile-design | `mobile_audit.py` |
| `database-architect` | clean-code, database-design | `schema_validator.py` |
| `security-auditor` | clean-code, vulnerability-scanner, red-team-tactics | `security_scan.py` |
| `test-engineer` | clean-code, testing-patterns, tdd-workflow, webapp-testing | `test_runner.py`, `playwright_runner.py` |
| `devops-engineer` | clean-code, deployment-procedures, server-management | — |
| `performance-optimizer` | clean-code, performance-profiling | `lighthouse_audit.py` |
| `seo-specialist` | clean-code, seo-fundamentals, geo-fundamentals | `seo_checker.py` |
| `game-developer` | clean-code, game-development | — |
| `code-reviewer` | code-quality-review, clean-code, simplify-code | — |
| `debugger` | clean-code, systematic-debugging | — |
| `orchestrator` | clean-code, parallel-agents, behavioral-modes, coordinator-mode, memory-system | — |
| `project-planner` | clean-code, app-builder, plan-writing, brainstorming | — |
| `explorer-agent` | clean-code, architecture, plan-writing | — |
| `documentation-writer` | clean-code, documentation-templates | — |

**Rule:** When changing an agent's `skills:` frontmatter, ensure all listed skill folders exist.

---

## Skill System Dependencies

### Skills with Scripts (`.agents/skills/*/scripts/*.py`)

| Skill | Scripts | Called By |
|-------|---------|-----------|
| `frontend-design` | `ux_audit.py`, `accessibility_checker.py` | `checklist.py`, agents |
| `mobile-design` | `mobile_audit.py` | `checklist.py`, agents |
| `database-design` | `schema_validator.py` | `checklist.py`, agents |
| `vulnerability-scanner` | `security_scan.py` | `checklist.py`, agents |
| `testing-patterns` | `test_runner.py` | `checklist.py`, agents |
| `webapp-testing` | `playwright_runner.py` | `verify_all.py`, agents |
| `performance-profiling` | `lighthouse_audit.py` | `verify_all.py`, agents |
| `seo-fundamentals` | `seo_checker.py` | `checklist.py`, agents |
| `geo-fundamentals` | `geo_checker.py` | agents (on-demand) |
| `i18n-localization` | `i18n_checker.py` | agents (on-demand) |
| `lint-and-validate` | `lint_runner.py`, `type_coverage.py` | `checklist.py`, agents |
| `api-patterns` | `api_validator.py` | agents (on-demand) |
| `web-performance` | `react_performance_checker.py` | agents (on-demand) |

**Rule:** When renaming/moving a script, update:
1. `checklist.py` / `verify_all.py` imports
2. Agent files that reference the script
3. Skill `SKILL.md` documentation

---

## Script System Dependencies

### Master Scripts (`.agents/scripts/`)

| Script | Calls | Purpose |
|--------|-------|---------|
| **`checklist.py`** | All core validation scripts | Incremental validation during dev |
| **`verify_all.py`** | `checklist.py` + performance/E2E scripts | Pre-deploy full suite |
| **`load_agents.py`** | Reads project files → writes `.session/active-agents.json` | Agent loading manifest |
| **`auto_preview.py`** | — | Preview server management |
| **`session_manager.py`** | — | Session state tracking |

**Rule:** When adding a new validation script:
1. Add the script to its skill's `scripts/` folder
2. Update `checklist.py` or `verify_all.py` to call it
3. Document in `.agents/scripts/README.md`

---

## Workflow System Dependencies

### Workflows (`.agents/workflows/*.md`)

| Workflow | Triggers | Dependencies |
|----------|----------|--------------|
| `/brainstorm` | User command | `brainstorming` skill |
| `/coordinate` | User command | `coordinator-mode` skill, `orchestrator` agent |
| `/create` | User command | `app-builder` skill |
| `/debug` | User command | `debugger` agent, `systematic-debugging` skill |
| `/deploy` | User command | `devops-engineer` agent, `deployment-procedures` skill |
| `/enhance` | User command | Various agents depending on task |
| `/orchestrate` | User command | `orchestrator` agent, `parallel-agents` skill |
| `/plan` | User command | `project-planner` agent, `plan-writing` skill |
| `/preview` | User command | `auto_preview.py` script |
| `/remember` | User command | `memory-system` skill, writes to `.agents/memory/` |
| `/review` | User command | `code-reviewer` agent, `code-quality-review` skill |
| `/status` | User command | `session_manager.py` script |
| `/test` | User command | `test-engineer` agent, `test_runner.py` |
| `/verify` | User command | `verify-changes` skill |
| `/reload` | User command | `load_agents.py` script |

**Rule:** When creating a new workflow, add it to `ARCHITECTURE.md` workflow table.

---

## Critical Update Chains

### When Changing Agent System Rules

```
.agents/rules/GEMINI.md modified
  ↓
  1. Copy to .cursorrules (must stay identical)
  2. Update AGENTS.md and .claude/system-context.md if structure changed
  3. Test with load_agents.py to ensure routing still works
```

### When Adding a New Agent

```
.agents/agent/new-agent.md created
  ↓
  1. Add to ARCHITECTURE.md → Core Agents table
  2. Add to load_agents.py → STACK_AGENTS mapping (if stack-specific)
  3. Update ARCHITECTURE.md → Statistics → Total Agents count
  4. Ensure all skills in frontmatter exist
```

### When Adding a New Skill

```
.agents/skills/new-skill/SKILL.md created
  ↓
  1. Add to ARCHITECTURE.md → Skills section (correct category)
  2. Update ARCHITECTURE.md → Statistics → Total Skills count
  3. If has scripts/ folder, update this CODEBASE.md
  4. Add to relevant agent frontmatter skills: list
```

### When Adding a New Validation Script

```
.agents/skills/skill-name/scripts/new-script.py created
  ↓
  1. Add to CODEBASE.md → Skill System Dependencies table
  2. Import in checklist.py or verify_all.py
  3. Document in .agents/scripts/README.md
```

---

## File Ownership Matrix

| Path | Owner | Edit Protocol |
|------|-------|---------------|
| `.agents/rules/GEMINI.md` | System | Edit here + sync to .cursorrules |
| `.cursorrules` | Cursor IDE | Mirror of GEMINI.md (sync-only) |
| `.agents/ARCHITECTURE.md` | Documentation | Update when system structure changes |
| `.agents/agent/*.md` | Agents | Frontmatter must match schema |
| `.agents/skills/*/SKILL.md` | Skills | Frontmatter must have `when_to_use` |
| `.agents/workflows/*.md` | Workflows | Standalone, minimal dependencies |
| `.agents/memory/*.md` | Memory System | User-editable, indexed via MEMORY.md |
| `.agents/scripts/*.py` | Validation | Can be called by skills or agents |
| `.agents/skills/*/scripts/*.py` | Skill Logic | Called via skill, listed in CODEBASE.md |

---

## Validation

To verify the entire dependency graph is intact, run:

```bash
python .agents/scripts/verify_all.py .
```

This checks:
- All agent skills exist
- All script imports resolve
- All workflow references are valid
- No orphaned files

---

> 💡 **Tip:** Keep this file updated when adding/removing agents, skills, or scripts.
