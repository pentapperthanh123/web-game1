---
name: lint-and-validate
description: Quality control, linting, and static analysis procedures. Use ONLY when explicitly requested by user. Triggers onKeywords: lint, format, check, validate, types, static analysis.
when_to_use: "ONLY when user explicitly requests linting, type checks, or code formatting. NEVER run automatically after code changes."
allowed-tools: Read, Glob, Grep, Bash
---

# Lint and Validate Skill

> **MANUAL ONLY:** Run validation tools ONLY when the user explicitly requests it. DO NOT run automatically after code edits.

### Procedures by Ecosystem

#### Node.js / TypeScript
1. **Lint/Fix:** `npm run lint` or `npx eslint "path" --fix`
2. **Types:** `npx tsc --noEmit`
3. **Security:** `npm audit --audit-level=high`

#### Python
1. **Linter (Ruff):** `ruff check "path" --fix` (Fast & Modern)
2. **Security (Bandit):** `bandit -r "path" -ll`
3. **Types (MyPy):** `mypy "path"`

## The Quality Loop (Manual Trigger Only)
1. **Write/Edit Code** (Do NOT run audit automatically)
2. **Run Audit (When requested by user):** `npm run lint && npx tsc --noEmit`
3. **Analyze Report:** Check the "FINAL AUDIT REPORT" section.
4. **Fix & Repeat:** If user requested audit, fix any reported issues.

## Error Handling
- If `lint` fails: Fix the style or syntax issues immediately.
- If `tsc` fails: Correct type mismatches before proceeding.
- If no tool is configured: Check the project root for `.eslintrc`, `tsconfig.json`, `pyproject.toml` and suggest creating one.

---
**Rule:** Only run these checks when explicitly requested by user. Do not run automatically after code generation.

---

## Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `scripts/lint_runner.py` | Unified lint check | `python scripts/lint_runner.py <project_path>` |
| `scripts/type_coverage.py` | Type coverage analysis | `python scripts/type_coverage.py <project_path>` |

