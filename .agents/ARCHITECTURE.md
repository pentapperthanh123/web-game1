# AG Kit Architecture

> Open **[index.html](./index.html)** in a browser for an interactive visual map of agents, skills, workflows, and scripts.

---

## 📋 Overview

AG Kit is a modular, multi-repo reusable AI agent toolkit consisting of:

- **16 Specialist Agents** - Role-based AI personas (core + stack-loaded)
- **50 top-level Skills** (+ nested packages under `game-development/*`, `app-builder/templates`) — conditional loading
- **19 Workflows** - Slash command procedures
- **27 Scripts** - 11 master (`.agents/scripts/`) + 16 skill-level (`skills/*/scripts/`)

---

## 🏗️ Directory Structure

```plaintext
.agents/
├── index.html               # Visual system overview (open in browser)
├── ARCHITECTURE.md          # Systems & Architecture map
├── agent/                   # 16 Specialist Agents
├── skills/                  # 47 Skills (with conditional loading)
├── workflows/               # 17 Slash Commands
├── rules/                   # Universal Rules
├── memory/                  # Persistent Cross-Session Memory
├── .ua/                     # Understand-Anything knowledge graph (canonical)
├── .session/                # Runtime manifests (gitignored)
└── scripts/                 # Validation & Audit Scripts
```

---

## 🤖 Core Agents (12)

Universal specialist AI personas for software development.

| Agent | Focus | Primary Skills |
| --- | --- | --- |
| `orchestrator` | Multi-agent workflow coordination & synthesis | parallel-agents, coordinator-mode, memory-system, context-compression, verify-changes |
| `project-planner` | Product discovery, MVP scoping, user stories, task planning | brainstorming, plan-writing, architecture |
| `backend-specialist` | API development, microservices, background queues, DB logic | api-patterns, nodejs-best-practices, python-patterns, database-design |
| `frontend-specialist` | Web UI/UX, component architecture, state management (framework-agnostic) | frontend-design, web-performance, tailwind-patterns |
| `code-reviewer` | Quality debt review, refactoring, naming conventions, magic values | code-quality-review, clean-code, simplify-code |
| `security-auditor` | Security compliance, OWASP, vulnerability scanning, penetration testing | vulnerability-scanner, red-team-tactics, api-patterns |
| `test-engineer` | Test automation, TDD, Jest/pytest, Playwright E2E pipelines | testing-patterns, tdd-workflow, webapp-testing |
| `database-architect` | Schema design, SQL/NoSQL ORM optimization, metadata strategy | database-design |
| `devops-engineer` | CI/CD, Docker, environment orchestration, server management | deployment-procedures, server-management |
| `debugger` | Root cause analysis, systematic troubleshooting | systematic-debugging |
| `performance-optimizer` | Speed, profiling, resource pool tuning, Core Web Vitals | performance-profiling |
| `explorer-agent` | Fast codebase discovery & structure mapping | - |

*(Optional Domain Specialists: `mobile-developer`, `documentation-writer`, `seo-specialist`, `game-developer`)*

---

## 🧩 Skills (47)

Modular knowledge domains that agents can load on-demand based on task context. Each skill has a `when_to_use` frontmatter field for conditional/intelligent loading.

### Codebase Analysis

| Skill                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `codebase-explorer`  | **NEW:** Understand-Anything integration for knowledge graphs    |

### Frontend & UI

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `web-performance`   | Framework-agnostic web performance + React/Vue/Svelte/Angular patterns          |
| `web-design-guidelines` | Web UI audit - 100+ rules for accessibility, UX, performance (Vercel) |
| `tailwind-patterns`     | Tailwind CSS v4 utilities                                             |
| `frontend-design`       | UI/UX patterns, design systems                                        |

### Backend & API

| Skill                   | Description                    |
| ----------------------- | ------------------------------ |
| `api-patterns`          | REST, GraphQL, tRPC            |
| `nodejs-best-practices` | Node.js async, modules         |
| `python-patterns`       | Python standards, FastAPI      |
| `rust-pro`              | Rust async, systems, type system |

### Database

| Skill             | Description                 |
| ----------------- | --------------------------- |
| `database-design` | Schema design, optimization |

### Cloud & Infrastructure

| Skill                   | Description               |
| ----------------------- | ------------------------- |
| `deployment-procedures` | CI/CD, deploy workflows   |
| `server-management`     | Infrastructure management |

### Testing & Quality

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `testing-patterns`      | Jest, Vitest, strategies |
| `webapp-testing`        | E2E, Playwright          |
| `tdd-workflow`          | Test-driven development  |
| `code-review-checklist` | Code review standards    |
| `code-quality-review`   | Naming, constants, clean-code review |
| `lint-and-validate`     | Linting, validation      |

### Security

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics`      | Offensive security       |

### Architecture & Planning

| Skill           | Description                |
| --------------- | -------------------------- |
| `app-builder`   | Full-stack app scaffolding |
| `architecture`  | System design patterns     |
| `plan-writing`  | Task planning, breakdown   |
| `brainstorming` | Socratic questioning       |

### Mobile

| Skill           | Description           |
| --------------- | --------------------- |
| `mobile-design` | Mobile UI/UX patterns |

### Game Development

| Skill              | Description           |
| ------------------ | --------------------- |
| `game-development` | Game logic, mechanics |

### SEO & Growth

| Skill              | Description                   |
| ------------------ | ----------------------------- |
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization            |

### Shell/CLI

| Skill                | Description               |
| -------------------- | ------------------------- |
| `bash-linux`         | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell        |

### Orchestration & Memory (2026.5.13)

| Skill                     | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `coordinator-mode`        | Multi-agent orchestration with parallel workers & synthesis  |
| `memory-system`           | Persistent cross-session memory with MEMORY.md index        |
| `context-compression`     | Auto-compress context in long sessions                      |
| `verify-changes`          | Prove code works by running it, not just inspecting         |
| `batch-operations`        | Multi-file pattern-based modifications                      |
| `simplify-code`           | Reduce over-engineered complexity                           |
| `skillify`                | Auto-create skills from repetitive workflows                |
| `code-review-graph`       | Token-efficient code review via Tree-sitter AST + MCP       |

### Other

| Skill                     | Description               |
| ------------------------- | ------------------------- |
| `clean-code`              | Coding standards (Global) |
| `behavioral-modes`        | Agent personas            |
| `parallel-agents`         | Multi-agent patterns      |
| `mcp-builder`             | Model Context Protocol    |
| `documentation-templates` | Doc formats               |
| `i18n-localization`       | Internationalization      |
| `performance-profiling`   | Web Vitals, optimization  |
| `systematic-debugging`    | Troubleshooting           |
| `intelligent-routing`     | Request → agent routing   |

---

## 🔄 Workflows (17)

Slash command procedures. Invoke with `/command`.

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `/brainstorm`    | Socratic discovery                             |
| `/coordinate`    | Advanced multi-agent coordination              |
| `/create`        | Create new features                            |
| `/debug`         | Debug issues                                   |
| `/deploy`        | Deploy application                             |
| `/enhance`       | Improve existing code                          |
| `/explore-codebase` | Codebase knowledge graph exploration        |
| `/orchestrate`   | Multi-agent coordination                       |
| `/plan`          | Task breakdown                                 |
| `/preview`       | Preview changes                                |
| `/remember`      | Save to persistent memory                      |
| `/load-memory`   | Load memory into current chat (no terminal)    |
| `/review`        | Clean code, naming, constants review           |
| `/status`        | Check project status                           |
| `/test`          | Run tests                                      |
| `/verify`        | Prove code works by running it                 |
| `/reload`        | Reload agent manifest (pivot stack)            |
| `/migrate`       | Legacy application modernization & migration   |

---

## 🎯 Skill Loading Protocol (Conditional)

```plaintext
User Request → Check `when_to_use` frontmatter → Match? → Load full SKILL.md
                                                    ↓ No match
                                                 Skip (save tokens)
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata, when_to_use & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

### Required Frontmatter Fields

```yaml
---
name: skill-name
description: What this skill does
when_to_use: "When to activate. NOT for X."  # 2026.5.13
allowed-tools: Read, Grep, Glob
---
```

### Enhanced Skills (with scripts/references)

| Skill               | Files | Coverage                            |
| ------------------- | ----- | ----------------------------------- |
| `app-builder`       | 20    | Full-stack scaffolding              |

---

## 🎯 Agent Loading (Manifest-Driven)

> 🔴 **Do NOT load all agent files.** Use the session manifest to load only the agents relevant to the current project's stack.

### Why

Loading 16+ agents + 47 skills into context for every project wastes tokens, pollutes routing, and breaks prompt-cache hit rates when moving across many projects with different tech stacks.

### Flow

```plaintext
Session start
  → check .agents/.session/active-agents.json
  → missing? run python .agents/scripts/load_agents.py
  → load ONLY agents listed in agents[]
  → user mentions new stack? run --add <stack> (or /reload <stack>)
```

### Master Script

| Script | Purpose | Usage |
| --- | --- | --- |
| `load_agents.py` | Detect stack from signal files, write `active-agents.json` | `python .agents/scripts/load_agents.py` |
| | Force interactive menu (greenfield) | `--interactive` |
| | Print detected stack without writing | `--list` |
| | Pivot: add a stack to existing manifest | `--add rust` |

### Stack → Agent Mapping (data-driven, in `load_agents.py`)

| Stack | Signal File | Stack-bound Agents |
| --- | --- | --- |
| `nextjs` | `package.json` + `next` | frontend-specialist, backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer, seo-specialist |
| `react` | `package.json` + `react` | frontend-specialist, test-engineer, devops-engineer, performance-optimizer, seo-specialist |
| `react-native` | `package.json` + `react-native`/`expo` | mobile-developer, test-engineer, performance-optimizer, devops-engineer |
| `flutter` | `pubspec.yaml` | mobile-developer, test-engineer, performance-optimizer, devops-engineer |
| `rust` | `Cargo.toml` | backend-specialist, devops-engineer, performance-optimizer, test-engineer |
| `dotnet` | `*.sln` / `*.csproj` | backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |
| `dotnet-desktop` | `*.sln` / `*.csproj` (WinForms/WPF) | frontend-specialist, backend-specialist, database-architect, test-engineer, performance-optimizer, documentation-writer |
| `python-api` | `pyproject.toml`/`requirements.txt` + FastAPI/Flask/Django | backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |
| `go` | `go.mod` | backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |
| `node-api` | `package.json` + express/fastify/nest | backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |
| `game` | `*.unity`/`project.godot` | game-developer, test-engineer, performance-optimizer, documentation-writer |
| `static-site` | `astro.config.mjs`/`nuxt.config.ts` | frontend-specialist, seo-specialist, performance-optimizer, documentation-writer |
| `java-jmix` | `pom.xml`/`build.gradle` (+ Jmix) | backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |

**Core (always loaded):** `orchestrator`, `project-planner`, `explorer-agent`, `debugger`, `code-reviewer`, `security-auditor`.

**Monorepo:** when `turbo.json`/`nx.json`/`pnpm-workspace.yaml`/`lerna.json` is present, every package is scanned and the agent sets are **unioned**.

**Greenfield:** no signal files → `load_agents.py` shows an interactive stack picker.

### Workflow

`/reload [stack]` — re-run the loader (full detect, or `--add <stack>` to pivot mid-session).

---

## 🛠️ Scripts (2)

Master validation scripts that orchestrate skill-level scripts.

### Master Scripts

| Script          | Purpose                                 | When to Use              |
| --------------- | --------------------------------------- | ------------------------ |
| `checklist.py`  | Priority-based validation (Core checks) | Development, pre-commit  |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agents/scripts/checklist.py .

# Full verification before deployment
python .agents/scripts/verify_all.py . --url http://localhost:3000
```

### What They Check

**checklist.py** (Core checks):

- Security (vulnerabilities, secrets)
- Code Quality (lint, types)
- Schema Validation
- Test Suite
- UX Audit
- SEO Check

**verify_all.py** (Full suite):

- Everything in checklist.py PLUS:
- Lighthouse (Core Web Vitals)
- Playwright E2E
- Bundle Analysis
- Mobile Audit
- i18n Check

For details, see [scripts/README.md](scripts/README.md)

---

## 📊 Statistics

| Metric              | Value                             |
| ------------------- | --------------------------------- |
| **Total Agents**    | 16 (6 core + stack specialists) |
| **Total Skills**    | 47 top-level (+ nested SKILL.md packages) |
| **Total Workflows** | 17                                |
| **Total Scripts**   | 11 master (`.agents/scripts/`: checklist, verify_all, load_agents, load_memory, session_boot, smoke_test, understand_setup, …) + 16 skill-level |
| **Coverage**        | ~95% web/mobile/game + orchestration |
| **Token Efficiency**| Reduced via conditional skill loading **and** manifest-driven agent loading |

---

## 🔗 Quick Reference

| Need     | Agent                 | Skills                                |
| -------- | --------------------- | ------------------------------------- |
| Web App  | `frontend-specialist` | web-performance, frontend-design |
| API      | `backend-specialist`  | api-patterns, nodejs-best-practices   |
| Mobile   | `mobile-developer`    | mobile-design                         |
| Database | `database-architect`  | database-design                       |
| Security | `security-auditor`    | vulnerability-scanner                 |
| Testing  | `test-engineer`       | testing-patterns, webapp-testing      |
| Debug    | `debugger`            | systematic-debugging                  |
| Plan     | `project-planner`     | brainstorming, plan-writing           |
| Game     | `game-developer`      | game-development                      |
| Reload   | — (workflow)          | `/reload [stack]` → `load_agents.py`  |
