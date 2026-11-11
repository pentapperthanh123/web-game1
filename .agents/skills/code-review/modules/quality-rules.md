---
name: code-quality-review
description: >-
  Strict code-quality review for clean code, naming conventions, and magic strings/numbers.
  Use when the user asks to review code, check naming, constants, or clean-code debt
  (including /review).
when_to_use: "When reviewing code for clean code, naming conventions, magic strings/numbers, or project coding standards. Triggers on review, code review, naming, convention, magic string, constant, clean code."
allowed-tools: Read, Grep, Glob
version: 1.0.0
priority: HIGH
---

# Code Quality Review

Focused checklist for **style + maintainability**. Security/perf are secondary here — use `code-review-checklist` / `security-auditor` for those.

> 📖 **Domain Reference Guidelines (Read ONLY the reference matching the project's tech stack):**
> - **React & Frontend:** Read [references/react-clean-code-guidelines.md](./references/react-clean-code-guidelines.md) AND [references/101-react-tips.md](./references/101-react-tips.md) *(if working on React/Next.js/UI)*.
> - **NestJS & Node.js:** Read [references/nestjs-backend-guidelines.md](./references/nestjs-backend-guidelines.md) *(if working on NestJS/Node.js)*.
> - **FastAPI & Python:** Read [references/fastapi-python-guidelines.md](./references/fastapi-python-guidelines.md) *(if working on FastAPI/Python)*.
> - **Database & Prisma:** Read [references/database-prisma-guidelines.md](./references/database-prisma-guidelines.md) *(if working on DB/Prisma)*.

---

## 1. Magic Values (HIGHEST PRIORITY)

Flag literal strings/numbers that represent **domain meaning** and are reused or compared.

### Must be constants / enums

| Kind | Examples | Put in |
|------|----------|--------|
| React Query / Cache keys | `['admin-posts']`, `['user-profile']` | `QUERY_KEYS` object in `constants.ts` |
| Timing & Delays | `debounceTime=300`, `staleTime=300000`, `pollingMs=5000` | `TIMING_CONFIG` or `DEBOUNCE_MS` in `constants.ts` |
| Validation Thresholds | `maxFileSize=5MB`, `minLength=6`, `maxTagCount=10` | `VALIDATION_LIMITS` in `constants.ts` |
| API Endpoints / Paths | `'/video-jobs'`, `'/video-jobs/upload'` | `FEATURE_API_ENDPOINTS` in `constants.ts` or `apiUrl.ts` |
| Job / queue names | `'video-job'`, `'voiceover-job'` | `*.constants.ts` |
| Status / step keys | `'PENDING'`, `'SCRAPING'`, `'onlyRender'` | enum or constants |
| Table / select filter options | `[{ text: 'Hôm nay', value: 'today' }]` | `*.constants.ts` |
| Storage / Cookie keys | `'accessToken'`, `'themeMode'` | `STORAGE_KEYS` in `constants.ts` |
| Tunables | `crf=23`, `1.5` subtitle min duration, retry delays | named constants |

### Allowed as literals

- User-facing UI copy (unless i18n key exists)
- One-off log message strings (prefer structured context over constants)
- True one-shot values used once with obvious meaning (`0`, `1`, empty string init)

```typescript
// ❌ BAD
if (job.status === 'completed') { ... }
await queue.add('video-job', payload);

// ✅ GOOD
if (job.status === VideoJobStatus.COMPLETED) { ... }
await queue.add(VIDEO_JOB_QUEUE, payload);
```

```python
# ❌ BAD
if status == "processing":
    ...

# ✅ GOOD
if status == JobStatus.PROCESSING:
    ...
```

**Rule:** If the same literal appears twice, or is compared/branched on → extract constant.

---

## 2. Naming Conventions

### TypeScript / NestJS (`backend-nestjs`, `frontend-dashboard`)

| Element | Convention | Example |
|---------|------------|---------|
| Files (modules) | `kebab-case` | `video-job.service.ts` |
| Classes / React components | `PascalCase` | `VideoJobService` |
| Functions / methods / vars | `camelCase` | `createVideoJob` |
| Constants / enums members | `SCREAMING_SNAKE` | `VIDEO_JOB_QUEUE` |
| Interfaces / types | `PascalCase` | `VideoJobPayload` |
| Boolean | `is` / `has` / `can` / `should` | `isActive`, `hasCache` |
| Private Nest fields | already used style in file | keep consistent |

### Python (`ai-worker-python`)

| Element | Convention | Example |
|---------|------------|---------|
| Modules / files | `snake_case` | `ffmpeg_service.py` |
| Functions / vars | `snake_case` | `render_hardsub` |
| Classes | `PascalCase` | `FfmpegService` |
| Constants | `UPPER_SNAKE` | `DEFAULT_CRF` |
| Boolean | `is_` / `has_` | `is_valid` |

### Anti-patterns to flag

| ❌ Bad | ✅ Good |
|--------|---------|
| `data`, `temp`, `res`, `obj` | Intent-revealing names |
| `handleStuff`, `process2` | Specific verb + noun |
| `IUserData` (Hungarian) | `UserData` |
| Abbreviations: `vidJob`, `btnClk` | Full words unless domain-standard (`id`, `url`, `ocr`) |

---

## 3. Clean Structure

Flag when present:

- Function > ~40 lines doing multiple responsibilities → suggest split
- Nesting > 2 levels → guard clauses / early return
- Duplicated blocks (≥3 similar lines) → extract helper
- Commented-out dead code → delete
- `any` in new TS code without justification
- Side-effectful helpers with vague names (`doWork`, `utils`)

Do **not** demand over-abstraction for single-use helpers.

---

## 4. Project-Specific Invariants (GENERIC)

**Do not assume a media/video domain.** Invariants come from the **target repository**.

### 4.1 Discovery (required)

1. Read project `AGENTS.md` / `.cursorrules` / `.agents/rules/` if present  
2. Read `.agents/memory/` topics relevant to conventions & ADRs (if injected)  
3. Prefer **local** `*.constants.ts` / enums / existing patterns in the touched modules  

If the project defines no domain invariants → **skip §4** (do not invent FFmpeg/video rules).

### 4.2 Universal safety checks (any project)

When the diff touches these areas, verify:

| Area | Check |
|------|-------|
| External API / AI calls | Retry/backoff or explicit error handling; no swallowed exceptions |
| Secrets | No hardcoded API keys/tokens; use env / secret manager |
| File / network I/O | Existence/timeouts handled; cleanup in `finally` where resources open |
| AuthZ | Mutations respect existing auth/permission patterns in the module |
| Migrations / schema | Destructive changes called out; match existing ORM/migration style |

Violations of **project-documented** invariants (from 4.1) are 🔴 BLOCKING even if naming is fine.

### 4.3 Domain examples (optional)

Media/video pipeline examples (FFmpeg, subtitles, job queues) live in:

→ [references/project-invariants.example.md](./references/project-invariants.example.md)

Apply **only** when the target repo is that domain (or its `AGENTS.md` says so).

---

## 5. Review Procedure

1. List changed files (git diff or user-provided paths)
2. For each file, run mental checklist: magic → naming → structure → project rules
3. Grep for similar constants already in the module before suggesting new names
4. Prefer existing constants modules in the feature folder (`*.constants.ts`, `*.enum.ts`, `constants.py`)
5. Emit report in agent format; ask before applying fixes

---

## 6. Quick Self-Test (reviewer)

Before finishing a review, confirm you checked:

- [ ] No domain status/queue/platform string left inline
- [ ] Names match language + folder conventions
- [ ] No new god-function / deep nest without comment
- [ ] Project invariants not broken
- [ ] Every finding has a concrete fix suggestion
