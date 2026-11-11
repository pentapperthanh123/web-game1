# AI System Rules & Guidelines


--- [Rule: clean-code.md] ---
---
trigger: always_on
description: "Strict Clean Code Rules for ALL generated and modified code"
---

# Strict Clean Code Rule

> **MANDATORY**: These rules apply to ALL code generated or modified by the agent.

## 1. Zero Hardcode Values
- **NO magic strings or numbers**. 
- Always extract fixed values to `constants.ts` hoặc sử dụng `enum` / `const` objects.
- Ví dụ: Thay vì dùng chuỗi `"NOUN"` trực tiếp trong thẻ select, hãy định nghĩa `const PART_OF_SPEECH = { NOUN: "NOUN" }` hoặc dùng TS Enum.

## 2. Flat Branching & No Nested Ternaries
- **TUYỆT ĐỐI KHÔNG dùng ternary lồng nhau** (`a ? b : c ? d : e`). 
- Giữ các khối lệnh `if/else` phẳng nhất có thể (tối đa 2 cấp lồng nhau).
- Sử dụng **Guard Clauses (Early Return)** để xử lý các trường hợp ngoại lệ ngay từ đầu hàm.
- Thay thế các lệnh rẽ nhánh phức tạp bằng Object Map lookup.

## 3. Function & Component Structure
- **SRP (Single Responsibility)**: Mỗi hàm hoặc component chỉ nên làm một việc.
- Chia nhỏ các component lớn. Component UI dài quá 150-200 dòng cần được tách thành các sub-component chuyên biệt.

## 4. Error Handling
- Không bắt lỗi kiểu `catch (err: any) { alert(err.message || "Lỗi"); }`.
- Luôn kiểm tra kiểu lỗi hoặc dùng hàm xử lý lỗi dùng chung để đảm bảo an toàn kiểu dữ liệu.

## 5. Naming Conventions
- Biến: Thể hiện rõ ý nghĩa (VD: `userCount` thay vì `n`).
- Hàm: Động từ + Danh từ (VD: `getUserById()`).
- Hằng số: SCREAMING_SNAKE_CASE (VD: `MAX_RETRY_COUNT`).
- Biến logic (Boolean): Dạng câu hỏi (VD: `isActive`, `hasPermission`).

## 6. Mandatory AI Checklist (Socratic Self-Reflection)
> **AI INSTRUCTION**: Trước khi kết thúc việc sinh code hoặc chỉnh sửa code, BẠN BẮT BUỘC PHẢI tự rà soát và in ra màn hình checklist sau (Đánh dấu [x] nếu đã thỏa mãn):
>
> ```markdown
> ### 🧹 Clean Code & Process Checklist
> - [ ] **Zero Hardcode**: Không còn Hardcode Strings/Numbers (Đã tách ra hằng số/Enum/i18n).
> - [ ] **No Nested Ternaries**: Không có (a ? b : c ? d : e), ưu tiên Early Return.
> - [ ] **SRP**: Đã tuân thủ Single Responsibility (Hàm/Component đủ nhỏ gọn, không ôm đồm).
> - [ ] **Naming Conventions**: Biến/Hàm dùng camelCase, Component/Class dùng PascalCase, Boolean có tiền tố (is, has, can).
> - [ ] **Type Safety & Error Handling**: Không dùng `any` bừa bãi, try/catch xử lý lỗi rõ ràng (không nuốt lỗi).
> - [ ] **Process Logging**: Đã tóm tắt rõ các bước tiến trình sinh code, giải thích quyết định kỹ thuật trước/sau khi code.
> ```
>
> Nếu bất kỳ mục nào chưa đạt, hãy dừng lại và tự sửa code trước khi trả lời người dùng.


--- [Rule: code-review.md] ---
# Strict Code Review Rule

> **MANDATORY**: These rules apply whenever you review code, audit Pull Requests, or analyze code structures.

## 1. Magic Values & Constants (Highest Priority)
- **Flag literal strings/numbers** that represent domain meaning, are reused, or are compared.
- **Must be constants/enums**: 
  - React Query keys (e.g., `['admin-posts']` -> `QUERY_KEYS.ADMIN_POSTS`)
  - Timing & Delays (e.g., `300` -> `DEBOUNCE_MS`)
  - Validation limits (e.g., `5MB` -> `MAX_FILE_SIZE`)
  - Status/Step keys (e.g., `'pending'` -> `JobStatus.PENDING`)
  - Storage/Cookie keys (e.g., `'accessToken'` -> `STORAGE_KEYS.ACCESS_TOKEN`)
- If the same literal appears twice, or is branched on -> extract it.

## 2. Strict Naming Conventions
- **Functions/Variables/Methods**: `camelCase` (e.g., `getUserById`, `processData`)
- **Classes/React Components**: `PascalCase` (e.g., `UserService`, `UserProfile`)
- **Constants/Enums**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Booleans**: Must use prefixes like `is`, `has`, `can`, `should` (e.g., `isActive`, `hasPermission`)
- **Anti-patterns**: Avoid vague names (`data`, `temp`, `res`, `handleStuff`). Use intent-revealing names.

## 3. Clean Structure & Code Quality
- **Function Size**: Flag functions over ~40 lines that have multiple responsibilities. Suggest splitting.
- **Nesting**: Max 2 levels of nesting. Force the use of Guard Clauses / Early Returns.
- **Dead Code**: Delete commented-out code blocks.
- **Type Safety**: Strictly flag and prevent the use of `any` in TypeScript. Demand precise typing.
- **Duplication**: If >= 3 similar lines are repeated, extract a helper.

## 4. Universal Safety & Resilience
- **Error Handling**: API/External AI calls must have explicit try/catch with proper logging. No swallowed exceptions (`catch (e) { }`).
- **Secrets**: No hardcoded API keys or tokens. Must use env variables.
- **Resource Management**: File IO or network streams must be closed/cleaned up in `finally` blocks or `useEffect` returns.

## 5. Review Procedure
- When providing review feedback, always categorize by severity (❌ Error, ⚠️ Warning, ✅ Pass).
- Every finding MUST have a concrete fix suggestion.
- **Wait for user confirmation** before automatically applying the fixes.


--- [Rule: i18n-strict.md] ---
---
trigger: always_on
description: "Strict i18n rules for all UI components and pages"
---

# Strict i18n Rule

> **MANDATORY**: No hardcoded user-facing strings (e.g. Vietnamese text) in TSX/JSX files.

## 1. Localization Enforcement
- You MUST use `useTranslation()` from `react-i18next` for all strings that are displayed to the user.
- **Forbidden**: `<p>Đăng nhập</p>`
- **Correct**: `<p>{t("Login.title", "Đăng nhập")}</p>`

## 2. i18n File Management
- Whenever you add a new string to a component, you MUST also add the translation keys to both:
  - `messages/en.json`
  - `messages/vi.json`
- Do not assume keys exist. Always verify or add them if creating a new UI element.

## 3. Fallback Best Practices
- Always provide a fallback string in the `t()` function for easier developer readability in code.
  Example: `{t("ErrorLog.title", "Sổ Tay Lỗi Sai")}`
- This helps understand what the key means without looking up the JSON files constantly.


--- [Rule: RULES.md] ---
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

