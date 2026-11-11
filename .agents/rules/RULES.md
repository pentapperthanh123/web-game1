---
trigger: always_on
---

# AG Kit Rules - Cursor Edition

> Core behavior rules for AI in this workspace.

---

## 🔴 CRITICAL: AGENT & SKILL PROTOCOL (START HERE)

> **MANDATORY:** Read the appropriate agent file and its skills BEFORE performing any implementation.

### 1. Modular Skill Loading & Frontmatter-First Protocol
Agent activated → Check frontmatter `skills:` → Read `SKILL.md` frontmatter index first → Read detailed sections on-demand only via `view_file`.
- **Frontmatter-First:** Read ONLY the first 10-15 lines (YAML frontmatter) of `SKILL.md` to evaluate relevance before reading the entire file.
- **Selective Reading:** Do NOT read all files in a skill folder at once. Never load unneeded skills into context.
- **Priority:** P0 (RULES.md) > P1 (Agent .md) > P2 (SKILL.md). All rules are binding.

### 2. Dynamic Token Hygiene & Micro-Compacting
- **Log & Output Digest:** When `grep_search`, `list_dir`, or command outputs exceed 50 lines, format output into a concise Semantic Digest instead of dumping raw text.
- **Context Compression:** Activate `context-compression` every 15-20 turns or at phase completion.

### 3. Enforcement
Read → Understand WHY → Apply PRINCIPLES → Code. Never skip reading agent rules or skill instructions.

---

## 📥 REQUEST CLASSIFIER (STEP 1)

| Request Type | Trigger Keywords | Active Tiers | Result |
|---|---|---|---|
| **QUESTION** | "what is", "how does", "explain" | TIER 0 only | Text Response |
| **SURVEY/INTEL** | "analyze", "list files", "overview" | TIER 0 + Explorer | Session Intel |
| **SIMPLE CODE** | "fix", "add", "change" (single file) | TIER 0 + TIER 1 (lite) | Inline Edit |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | TIER 0 + TIER 1 (full) + Agent | `{task-slug}.md` Required |
| **DESIGN/UI** | "design", "UI", "page", "dashboard" | TIER 0 + TIER 1 + Agent | `{task-slug}.md` Required |
| **SLASH CMD** | /create, /orchestrate, /debug, /migrate | Command-specific flow | Variable |

---

## 🤖 INTELLIGENT AGENT ROUTING (STEP 2 - AUTO)

**ALWAYS ACTIVE: Automatically analyze and select the best agent(s) before responding.**

> 🔴 **MANDATORY:** Follow protocol defined in `@[skills/intelligent-routing]`.

### Response Format (MANDATORY)
When auto-applying an agent, inform the user:
```markdown
🤖 **Applying knowledge of `@[agent-name]`...**
```

### ⚠️ AGENT ROUTING CHECKLIST (BEFORE ANY CODE/DESIGN)
1. Did I identify the correct agent for this domain? (`.agents/agent/{agent}.md`)
2. Did I announcement `🤖 Applying knowledge of @[agent]...`?
3. Did I load required skills from agent's frontmatter?

---

## TIER 0: UNIVERSAL RULES (Always Active)

### 🌐 Language Handling
- Non-English prompt: Translate internally → Respond in user's language → Code/comments remain in English.

### 🧹 Clean Code (Global Mandatory)
Follow `@[skills/clean-code]` rules for ALL edits:
- **Code:** Concise, direct, self-documenting, no over-engineering.
- **Zero Hardcode Values:** NO magic strings, numbers, status codes, or raw API URLs. Extract to `constants.ts` / `enums`.
- **Pragmatic Error Handling:** Prefer inspecting the project's API error interceptors or using a clean, reusable `getErrorMessage(error)` helper. Avoid excessive 4+ property inline fallback chains (`error?.data?.message || error?.data?.detail || error?.detail || ...`); keep error handling concise, dynamic, and resilient to unexpected error shapes.
- **Strict Type Safety:** Avoid `any` type casts. Use Type Predicates, Discriminated Unions, and explicit TypeScript interfaces for external API payloads.
- **State & Effect Hygiene:** Never mutate React state or props directly. Always clean up timers (`setInterval`), event listeners, and async subscriptions in `useEffect` returns to prevent memory leaks.
- **No Nested Ternaries & Flat Branching:** ABSOLUTELY NO nested ternary operators (`a ? b : c ? d : e`). Extract to Lookup Object Maps or helper functions with `switch/case`. Keep `if` nesting flat (max 2 levels) using Guard Clauses (Early Return).
- **Testing:** Mandatory AAA Pattern (Unit > Integration > E2E).
- **Performance:** Measure first. Adhere to Core Web Vitals.
- **Safety:** Verify secrets & dependency security.

### 📁 File Dependency & Path Awareness
- Check `CODEBASE.md` for dependencies before editing files; update affected files together.
- Plural root directory: `.agents/` (`.agents/agent/`, `.agents/skills/`, `.agents/memory/`).

### 🗺️ System Map & Memory Read
At session start, read:
1. `.agents/ARCHITECTURE.md` (System map)
2. `.agents/memory/MEMORY.md` (Persistent project conventions & user preferences)

### 🎯 Agent Loading (Manifest-Driven)
Load ONLY agents listed in `.agents/.session/active-agents.json`.
- If missing → run `python .agents/scripts/load_agents.py`.
- If user pivots stack mid-session → run `python .agents/scripts/load_agents.py --add <stack>` (or `/reload <stack>`).

### 🔄 Auto-Checkpoint (Cross-IDE Recovery)
For COMPLEX CODE tasks, update `.agents/.session/checkpoint.md` after completing each major step (file create/modify).
- Write hybrid YAML frontmatter (goal, stack, status) + Markdown body (completed, in-progress, next, decisions).
- On `/resume`: run `python .agents/scripts/checkpoint.py --restore` → read output → continue work.
- On task completion: run `python .agents/scripts/checkpoint.py --clear`.

---

## TIER 1: CODE RULES (When Writing Code)

### 📱 Project Type Routing
- **MOBILE:** `mobile-developer` + `mobile-design` (React Native, Flutter, iOS, Android)
- **WEB:** `frontend-specialist` + `frontend-design` (Next.js, React, Vue)
- **BACKEND:** `backend-specialist` + `api-patterns` + `database-design` (API, DB, server)

### ⚛️ Web-Apps (React/Next.js) Strict Protocol
**MANDATORY FOR ANY EDITS IN `web-apps/`:**
1. **Pre-read:** Before writing any code, you MUST use `view_file` to read `.agents\skills\clean-code\references\typescript-react-guide.md` and `.agents\skills\code-review\references\react-clean-code-guidelines.md`.
2. **Post-code Review:** After generating or modifying code, you MUST run a strict self-review (or invoke a review sub-agent/script) using `.agents\skills\code-review\modules\quality-rules.md` to ensure the new code perfectly complies with the references.

### 🛑 GLOBAL SOCRATIC GATE
**Every user request must pass through the Socratic Gate before implementation:**
- **New Feature / Build:** Ask minimum 3 strategic discovery questions.
- **Code Edit / Bug Fix:** Confirm understanding + ask impact questions.
- **Vague / Simple:** Clarify Purpose, Users, and Scope.
- **Direct "Proceed":** Ask 2 "Edge Case" / Trade-off questions before coding.
- **Rule:** Never assume. Wait for user confirmation before invoking code generation.

### 🏁 Final Checklist Protocol
Triggered by: "run final checks", "final checks", "run tests".
- **Manual Audit:** `python .agents/scripts/checklist.py .`
- **Pre-Deploy:** `python .agents/scripts/checklist.py . --url <URL>`
- **Execution Order:** Security → Lint → Schema → Tests → UX → SEO → Lighthouse/E2E
- A task is NOT complete until `checklist.py` returns success.

### 🎭 Cursor Mode Mapping
- **plan:** `project-planner` (4 phases: Analysis → Planning → Solutioning → Code + Tests). NO CODE before Phase 4.
- **ask:** Focus on understanding & clarification.
- **edit:** `orchestrator` execution. Multi-file/structural change → create `{task-slug}.md`.

---

## TIER 2: DESIGN RULES

- **Web UI/UX:** Read `.agents/agent/frontend-specialist.md`
- **Mobile UI/UX:** Read `.agents/agent/mobile-developer.md`
- Rules enforced in specialist agents: Purple Ban (no violet/purple), Template Ban, Anti-cliché layouts, Deep Design Thinking protocol.

---

## 📁 QUICK REFERENCE

- **Agents:** `orchestrator`, `project-planner`, `security-auditor`, `backend-specialist`, `frontend-specialist`, `mobile-developer`, `debugger`, `game-developer`
- **Master Scripts:** `python .agents/scripts/session_boot.py`, `checklist.py`, `verify_all.py`, `smoke_test.py`
