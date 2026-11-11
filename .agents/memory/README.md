# Memory - Persistent Cross-Session Storage

> Persistent AI memory system that remembers project conventions, user preferences, and past decisions across different sessions.

---

## 🎯 Purpose

**Problem:** AI forgets project-specific conventions between sessions.

**Solution:** Memory system stores:
- Project conventions (naming, architecture)
- User preferences (style, tools)
- Past decisions (why we chose X over Y)
- Tech stack specifics (custom patterns)

**Auto-loaded** at every session start via `load_memory.py`.

---

## 📂 Structure

**Kit origin (shipped / kept by `reset_memory.py`):**

```
memory/
├── MEMORY.md           # Index (reset to empty template on cleanup)
├── README.md           # This guide
└── CLEANUP-GUIDE.md    # Reset instructions
```

**Topic files** (created via `/remember`, deleted by reset):

```
memory/
├── project-conventions.md      # optional — naming, structure
├── user-preferences.md         # optional — style, tools
├── architecture-decisions.md   # optional — ADRs
└── …
```

Reset (xóa hết topic, chỉ giữ origin):

```bash
python .agents/scripts/reset_memory.py
```

### `MEMORY.md` (Index)

**Purpose:** Lists all available memory topics.

**Format (sau `/remember`):**
```markdown
# AG Kit Memory System

## Available Memory Topics

- **[project-conventions.md](project-conventions.md)** — Naming, structure, patterns
- **[user-preferences.md](user-preferences.md)** — Style, tools, workflow
```

### Topic Files

**Purpose:** Store specific memory categories.

**Format:**
```markdown
# Project Conventions

## Naming Conventions
- Components: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

## File Structure
- Components: src/components/
- Utils: src/lib/
- Types: src/types/

## Custom Patterns
- Use React Query for server state
- Use Zustand for client state
- No Redux
```

---

## 🔧 How It Works

### 1. Auto-Loading (Session Start)

```bash
# Run at session start (or via session_boot.py)
python .agents/scripts/load_memory.py --inject

→ Reads: .agents/memory/MEMORY.md
→ Reads: Topic files (excludes README / CLEANUP-GUIDE)
→ Soft cap: default 8192 chars — core topics first, overflow deferred
→ Writes: .agents/.session/memory-context.md
→ Deferred topics listed as paths only (read on demand)
```

**Soft cap knobs:**
```bash
python .agents/scripts/load_memory.py --inject --max-chars 12288
python .agents/scripts/load_memory.py --inject --no-cap
python .agents/scripts/load_memory.py --check
```

**Pick topics cho chat mới:**
```bash
# Xem danh sách
python .agents/scripts/load_memory.py --list-topics

# Chọn theo tên
python .agents/scripts/load_memory.py --inject --topics user-preferences,architecture-decisions

# Chọn theo số (xem --list-topics)
python .agents/scripts/load_memory.py --inject --topics 2,5

# Menu tương tác
python .agents/scripts/load_memory.py --inject --pick

# Chỉ index (nhẹ nhất)
python .agents/scripts/load_memory.py --inject --index-only

# Load 1 topic lớn (tắt soft cap)
python .agents/scripts/load_memory.py --inject --topics audit-2026-07-24-improvements --no-cap
```

**Trong ô chat Cursor (không gõ được terminal):** dùng slash — AI tự inject + đọc:

```text
/load-memory
/load-memory architecture-decisions,ag-kit-defaults
/load-memory list
```

Hoặc gắn `@.agents/.session/memory-context.md` sau khi đã inject.

### 2. Manual Update

```bash
# Via workflow
/remember Add naming convention: routes use kebab-case

→ Updates: Appropriate memory topic file
→ Reloads: Memory context
→ AI knows: New convention for future sessions
```

### 3. Memory Persistence

```
Session 1:
User: "Use camelCase for functions"
→ Saved to: project-conventions.md

Session 2 (days later):
User: "Add new function"
→ AI remembers: Uses camelCase automatically
```

---

## 📋 Memory Topics (Examples)

### Project Conventions

**What to store:**
- Naming conventions
- File/folder structure
- Import ordering
- Custom patterns

**Example:**
```markdown
# Project Conventions

## Component Structure
- One component per file
- Co-locate styles (if CSS Modules)
- Props interface at top

## Error Handling
- Use custom AppError class
- Log to Sentry in production
- Display user-friendly messages
```

### User Preferences

**What to store:**
- Preferred tools/libraries
- Code style preferences
- Communication style

**Example:**
```markdown
# User Preferences

## Tools
- State management: Zustand (NOT Redux)
- Styling: Tailwind CSS
- Testing: Vitest + Playwright

## Communication
- Prefer concise explanations
- Show code before explaining
- Vietnamese for discussions
```

### Architecture Decisions

**What to store:**
- ADRs (Architecture Decision Records)
- Why we chose X over Y
- Trade-offs documented

**Example:**
```markdown
# Architecture Decisions

## ADR-001: GraphQL vs REST

**Decision:** Use GraphQL

**Context:** API for mobile + web clients

**Reasoning:**
- Mobile needs flexible data fetching
- Reduce over-fetching
- Type safety with generated types

**Trade-offs:**
- ❌ More complex backend
- ✅ Better frontend DX
```

### Tech Stack Specifics

**What to store:**
- Framework-specific patterns
- Custom hooks/utilities
- Deployment procedures

**Example:**
```markdown
# Tech Stack Specifics

## Next.js Patterns

### Data Fetching
- Use Server Components for initial data
- Use React Query for client updates
- Cache with stale-while-revalidate

### Authentication
- NextAuth.js with JWT
- Session stored in HTTP-only cookies
- Refresh token rotation
```

---

## 🚀 Creating Memory Topics

### When to Create

Create a new topic when:

- ✅ Information is reused across sessions
- ✅ It's project-specific (not general knowledge)
- ✅ It affects decision-making
- ✅ Users want AI to "remember" it

Don't create if:

- ❌ It's already in skills/agents (general patterns)
- ❌ It's temporary (session-only)
- ❌ It's sensitive data (use .env instead)

### Topic Template

```markdown
# Topic Name

## Section 1
[Specific information]

## Section 2
[Specific information]

## Notes
- [Additional context]
```

### Adding to Index

**Edit `MEMORY.md`:**
```markdown
- **[your-topic.md](your-topic.md)** — Brief description
```

**Reload memory:**
```bash
python .agents/scripts/load_memory.py
```

---

## 💡 Best Practices

### What to Store

**✅ GOOD:**
- Project-specific conventions
- User's preferred tools
- Past architectural decisions
- Custom patterns/utilities

**❌ BAD:**
- Secrets/passwords (use .env)
- Generated code (version control instead)
- Temporary notes (use comments)
- General patterns (use skills)

### Memory Hygiene

1. **Review regularly** — Update outdated conventions
2. **Keep concise** — Bullet points > paragraphs
3. **Be specific** — "Use camelCase for functions" not "Use good names"
4. **Document why** — Explain reasoning for decisions

### Memory vs Skills

**Memory** = Project-specific  
**Skills** = General patterns

**Example:**
- **Skill:** `clean-code` (universal standards)
- **Memory:** "In this project, functions start with 'handle'" (project-specific)

---

## 📊 Memory Workflow

### Complete Flow

```bash
# 1. Session Start
python .agents/scripts/load_memory.py
→ Memory injected into AI context

# 2. During Work
User: "Add new API endpoint"
→ AI applies remembered conventions (e.g., REST pattern, naming)

# 3. Update Memory
/remember API endpoints use /api/v1/ prefix
→ Saved to project-conventions.md

# 4. Next Session
python .agents/scripts/load_memory.py
→ New convention automatically loaded
```

---

## 🔗 Related

- **[Scripts](../scripts/README.md)** — load_memory.py documentation
- **[Workflows](../workflows/README.md)** — /remember workflow
- **[Skills/memory-system](../skills/memory-system/SKILL.md)** — Memory system skill
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — System overview

---

## 🎯 Examples

### Example 1: Naming Convention

**Before:**
```typescript
// AI doesn't know project conventions
function ProcessData() { ... }  // PascalCase (inconsistent)
```

**After adding to memory:**
```markdown
# project-conventions.md
## Functions
- Use camelCase: processData()
```

**Result:**
```typescript
// AI applies convention
function processData() { ... }  // camelCase (consistent)
```

### Example 2: Tool Preference

**Before:**
```bash
User: "Add state management"
AI: "I recommend Redux..." ❌ User doesn't like Redux
```

**After adding to memory:**
```markdown
# user-preferences.md
## Tools
- State: Zustand (NOT Redux)
```

**Result:**
```bash
User: "Add state management"
AI: "I'll use Zustand..." ✅ Remembers preference
```

---

> 🧠 **Remember:** Memory is for **project-specific knowledge**, not general patterns.
