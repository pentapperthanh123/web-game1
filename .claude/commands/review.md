---
description: Review code for clean code, naming conventions, magic strings/numbers, and project standards.
---

# /review — Code Quality Review

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Activate `@code-reviewer`** — Read `.agents/agent/code-reviewer.md` first
2. **Load skill** — Read `.agents/skills/code-review/SKILL.md`
3. **Read-only** — Do not edit files unless the user explicitly asks to fix findings
4. **Evidence-based** — Cite `file:line` (or nearby symbol) for every finding

---

## Task

```
CONTEXT:
- What to review: $ARGUMENTS
- If empty: review the most recent uncommitted changes (git diff) and/or files touched in this session

WORKFLOW:
1. ACTIVATE code-reviewer agent
2. DETERMINE scope (paths, diff, or PR)
3. SCAN for:
   - Magic strings / magic numbers → must be constants/enums
   - Naming convention violations (TS/NestJS, Python, React)
   - Clean-code smells (god functions, deep nesting, dead code)
   - Project invariants (FFmpeg, subtitle refs, metadata cache, retry)
4. REPORT with severity labels (🔴 🟡 🟢)
5. ASK: "Fix blocking issues now?"

RULES:
1. Prefer existing *.constants.ts / enums over inventing new files
2. Do not nitpick unrelated files outside scope
3. Verdict must be explicit: PASS | PASS WITH SUGGESTIONS | NEEDS FIXES
```

---

## Usage Examples

```
/review
/review backend-nestjs/src/modules/video-job
/review uncommitted changes
/review the last AI-generated diff
```

---

## Expected Output

```markdown
## Code Review Report

**Scope:** ...
**Verdict:** NEEDS FIXES

### 🔴 Blocking
- ...

### 🟡 Suggestions
- ...

### Summary
- ...
```
