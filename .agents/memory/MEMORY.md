# Memory Index

> Persistent cross-session memory for project conventions, user preferences, and key decisions.

---

## User

- [user] (Empty - add via /remember)

## Project
- [project] Project Architecture Overview (Next.js, RN, NestJS, Python) → project-architecture.md
- [project] RAG Chatbot Engine (Agentic Architecture, Hybrid Search, Tools) → rag-chatbot.md
- [project] Database Schema (Prisma, PostgreSQL, generic domain model) → database-schema.md
- [project] API Design (REST, JWT Auth, Core Modules) → api-design.md
- [project] 600 Essential Words for the TOEIC (10 Domains, 50 Lessons) → toeic-600-words-lessons.md

## Tech Decisions

- [reference] Git Workflow & Submodules (Always use dev branch) → git-workflow.md
- [reference] Java & Jmix Framework auto-detection and specialist routing → tech-decisions.md
- [reference] Cross-IDE session recovery and /resume Git-diff reconstruction → tech-decisions.md

## Feedback

- [feedback] (Empty - add via /remember)

---

## How Memory Works

**Auto-Loading:** The `load_memory.py` script runs at session start and injects memory content into the AI context automatically.

**Manual Loading:** If auto-load fails, AI should read this index + topic files listed above.

---

## Adding New Memory

Use the `/remember` workflow:
```
/remember [your decision or preference]
```

This will:
1. Parse the memory topic
2. Create/update the appropriate file in `.agents/memory/`
3. Update this index

---

> Last Updated: 2026-07-27 | Total Topics: 1 | Total Entries: 2
