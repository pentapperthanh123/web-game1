# AG Kit - AI Agent System

> Modular AI agent framework cho Cursor IDE với 16 chuyên gia, 49 top-level skills (+ nested), và 19 workflows.

---

## 📂 Structure

```
.agents/
├── agent/          # 16 specialized agents
├── skills/         # 49 reusable skills
├── workflows/      # 19 slash commands
├── scripts/        # 6 master scripts
├── docs/           # 8 documentation files
├── memory/         # Persistent cross-session memory
├── rules/          # Core behavior rules
├── .session/       # Runtime artifacts (gitignored)
├── ARCHITECTURE.md # System architecture
├── install.py      # Unified cross-platform installer
└── mcp_config.json
```

---

## 🚀 Quick Links

| Component | Location | Description |
|-----------|----------|-------------|
| **Agents** | `agent/` | 16 chuyên gia (frontend, backend, security, etc.) |
| **Skills** | `skills/` | 49 reusable capabilities |
| **Workflows** | `workflows/` | 19 slash commands (/create, /debug, etc.) |
| **Scripts** | `scripts/` | Master automation scripts |
| **Docs** | `docs/` | Full documentation (tiếng Việt) |
| **Memory** | `memory/` | Persistent project conventions |

→ **[Chi tiết Architecture](ARCHITECTURE.md)**

---

## 🤖 Agents (16)

### Core Orchestration
- `orchestrator` — Multi-agent coordination
- `project-planner` — 4-phase planning methodology
- `explorer-agent` — Codebase exploration

### Development Specialists
- `frontend-specialist` — React/Next.js + UI/UX design
- `backend-specialist` — API/DB architecture
- `mobile-developer` — React Native/Flutter
- `game-developer` — Game design & development
- `devops-engineer` — Infrastructure & deployment

### Quality & Security
- `test-engineer` — Testing strategies
- `code-reviewer` — Code quality enforcement
- `security-auditor` — Vulnerability scanning
- `performance-optimizer` — Performance tuning

### Support
- `debugger` — Systematic debugging
- `documentation-writer` — Technical writing
- `database-architect` — Schema design
- `seo-specialist` — SEO optimization

→ **[Agent README](agent/README.md)**

---

## ⚙️ Skills (49)

### Architecture & Patterns
- `clean-code` — Pragmatic coding standards (MANDATORY)
- `architecture` — Decision-making frameworks
- `api-patterns` — REST/GraphQL/tRPC selection
- `database-design` — Schema & indexing strategy

### Frontend
- `frontend-design` — UI/UX design thinking
- `mobile-design` — Mobile-first patterns
- `web-performance` — Framework-agnostic web performance + React/Vue/Svelte patterns (Vercel Engineering for React)
- `tailwind-patterns` — Tailwind CSS v4

### Testing & Quality
- `testing-patterns` — Unit/Integration/E2E
- `tdd-workflow` — Test-Driven Development
- `systematic-debugging` — 4-phase debugging
- `code-quality-review` — Clean code enforcement

### Operations
- `deployment-procedures` — Safe deployment workflows
- `server-management` — Process management
- `performance-profiling` — Optimization techniques
- `vulnerability-scanner` — OWASP 2025 security

### Specialized
- `game-development` — 11 sub-skills for games
- `rust-pro` — Rust 2024 edition
- `mcp-builder` — Model Context Protocol servers

→ **[Skills README](skills/README.md)** | **[Full list (46)](ARCHITECTURE.md#skills)**

---

## 🔀 Workflows (15)

**Slash commands:**

| Command | Purpose |
|---------|---------|
| `/create` | Create new features/components |
| `/orchestrate` | Multi-agent coordination |
| `/debug` | Systematic debugging |
| `/test` | Run tests |
| `/review` | Code review |
| `/plan` | 4-phase planning |
| `/deploy` | Deployment workflow |
| `/verify` | Validation suite |
| `/brainstorm` | Socratic questions |
| `/preview` | Preview changes |
| `/remember` | Update memory |
| `/status` | Project status |
| `/enhance` | Optimize code |
| `/coordinate` | Parallel agents |
| `/reload` | Reload agent manifest |

→ **[Workflows README](workflows/README.md)**

---

## 🛠️ Scripts (6 Master)

| Script | Purpose | Usage |
|--------|---------|-------|
| `load_agents.py` | Auto-detect stack & load agents | `python .agents/scripts/load_agents.py` |
| `load_memory.py` | Auto-inject persistent memory | `python .agents/scripts/load_memory.py` |
| `checklist.py` | Priority-based validation | `python .agents/scripts/checklist.py .` |
| `verify_all.py` | Comprehensive verification | `python .agents/scripts/verify_all.py` |
| `session_manager.py` | Session artifact management | `python .agents/scripts/session_manager.py` |
| `auto_preview.py` | Auto-launch preview server | `python .agents/scripts/auto_preview.py` |

**+ 16 skill-level scripts** in `skills/*/scripts/`

→ **[Scripts README](scripts/README.md)**

---

## 📚 Documentation (8)

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Everyone | Project overview |
| `GETTING-STARTED.md` | Beginners | 5-min quick start |
| `USER-GUIDE.md` | Users | Comprehensive guide |
| `QUICK-REFERENCE.md` | Daily use | Quick reference |
| `CODEBASE.md` | Developers | File dependencies |
| `IGNORE-FILES.md` | Setup/DevOps | Ignore patterns |
| `SUA-DUONG-DAN.md` | Maintainers | Path portability |
| `CHANGELOG.md` | History | Version history |

**All docs in Vietnamese** for accessibility.

→ **[Docs README](docs/README.md)**

---

## 🧠 Memory System

**Location:** `memory/`

**Files:**
- `MEMORY.md` — Index of all memory topics
- `project-conventions.md` — Example topic

**Usage:**
```bash
# Auto-load memory at session start
python .agents/scripts/load_memory.py
```

**Purpose:** Persistent cross-session memory for:
- Project conventions
- User preferences
- Past decisions
- Tech stack specifics

→ **[Memory README](memory/README.md)**

---

## 📜 Rules System

**Location:** `rules/RULES.md`

**Synced to:**
- `.cursorrules` (root) — Cursor IDE
- `AGENTS.md` (root) — Reference
- `.claude/system-context.md` — Claude Code

**Core Rules:**
- TIER 0: Universal (language, clean code, file dependencies)
- TIER 1: Code rules (project routing, Socratic gate, checklist)
- TIER 2: Design rules (Purple Ban, Template Ban, Deep Design)

**Sync script:** `install-agents.js`

---

## 🔧 Configuration Files

### `install-agents.js`

**Purpose:** Sync rules to various AI IDEs

**What it does:**
1. Reads all `.agents/rules/*.md`
2. Combines into single context
3. Writes to `.cursorrules`, `AGENTS.md`, `.claude/system-context.md`

**Usage:**
```bash
node .agents/install-agents.js
```

### `mcp_config.json`

**Purpose:** Example MCP (Model Context Protocol) server config

**Location:** `~/.gemini/ag-kit/mcp_config.json` (or `~/.cursor/`, `~/.claude/`)

**Example:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_KEY"]
    }
  }
}
```

---

## 🎯 How It Works

### 1. Agent Loading (Manifest-Driven)

```bash
python .agents/scripts/load_agents.py
# → Detects: Next.js project
# → Loads: 6 core + 4 frontend agents
# → Saves: .agents/.session/active-agents.json
# → Token savings: 40-70%
```

### 2. Memory Auto-Loading

```bash
python .agents/scripts/load_memory.py
# → Reads: .agents/memory/MEMORY.md + topics
# → Injects: .agents/.session/memory-context.md
# → AI loads: Persistent conventions automatically
```

### 3. Intelligent Routing

```
User: "Build a dashboard"
  ↓
AI analyzes domain
  ↓
Auto-selects: frontend-specialist + orchestrator
  ↓
Loads skills: frontend-design, web-performance
  ↓
Applies: Purple Ban, Template Ban, Deep Design Thinking
  ↓
Result: Original, high-quality UI
```

---

## 📊 Statistics

```
Agents:        16
Skills:        46 (+ 11 game sub-skills)
Workflows:     15
Scripts:       6 master + 16 skill-level
Docs:          8 (Vietnamese)
Lines of Code: ~15,000
```

---

## 🚀 Getting Started

**Complete setup in 5 minutes:**

1. **Read:** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)
2. **Setup:**
   ```bash
   python .agents/scripts/load_agents.py
   python .agents/scripts/load_memory.py
   ```
3. **Verify:**
   ```bash
   python .agents/scripts/verify_all.py
   ```
4. **Start coding!**

---

## 🔗 External Links

- **Main README:** [../README.md](../README.md)
- **Contributing:** [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **License:** [../LICENSE](../LICENSE)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 💡 Philosophy

**AG Kit is:**

- **Modular** — Load what you need
- **Token-efficient** — 40-70% savings via manifests
- **Portable** — Work anywhere (Windows/Linux/macOS)
- **Persistent** — Memory system across sessions
- **Quality-first** — Clean code mandatory, not optional

**Not a template library. Not a code generator.**

It's a **thinking framework** that teaches AI to make better decisions.

---

> 🎯 **Motto:** "Teach principles, not patterns. Build systems, not scripts."
