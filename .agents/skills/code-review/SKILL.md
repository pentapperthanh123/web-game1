---
name: code-review
description: Master code review skill containing quality rules, security checklists, and AST graph analysis. Use this when reviewing any code.
when_to_use: "When asked to review code, check code quality, audit security for PRs, or analyze code structures."
allowed-tools: Read, Grep, Glob
effort: medium
---

# Code Review - Master Dispatcher

This is the master code review skill. Depending on the exact nature of the review requested, you should consult one or more of the specific sub-modules located in `modules/`.

## 📦 Modules

### 1. `modules/quality-rules.md` (Code Quality & Style)
**Use when:** You need to enforce clean code, naming conventions, and project-specific guidelines.
**Focus:** Magic strings/numbers, naming, readability, decoupling.
**Reference Guidelines:** Detailed rules for specific tech stacks (React, NestJS, FastAPI, Prisma) are located in the `references/` folder.

### 2. `modules/checklist.md` (Security & PR Review)
**Use when:** You need a strict checklist for auditing a Pull Request or analyzing the security/robustness of changes.
**Focus:** Security vulnerabilities, edge cases, error handling, performance pitfalls.

### 3. `modules/graph-analyzer.md` (AST Graph Review)
**Use when:** The codebase is very large and you need a token-efficient way to find affected files (blast radius) using a Tree-sitter AST Graph (via the `code-review-graph` MCP server).
**Focus:** Impact analysis, dependency tracing, dynamic structure discovery.

---

## 🚦 Workflow

1. Determine the scope and depth of the requested review.
2. If it's a general clean-code review, read `modules/quality-rules.md`.
3. If it's a security or comprehensive PR review, read `modules/checklist.md`.
4. If you need structural context in a massive codebase, read `modules/graph-analyzer.md`.
5. After consulting the appropriate module(s), follow their reporting formats to provide feedback to the user.
