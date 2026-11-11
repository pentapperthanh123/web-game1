---
type: project
created: 2026-08-17
updated: 2026-08-17
---

# Database Schema & Conventions

## 1. Design Principles
- **Generic-first**: No domain-specific names in tables (e.g., no "Toeic" tables). Domain is handled via `domain` enums (TOEIC, SPEAKING, IELTS, etc.).
- **Snake_case DB mapping**: Prisma models and fields use `camelCase`, but map to `snake_case` in Postgres using `@map("...")` and `@@map("...")`.
- **Primary Keys**: UUID v4 universally.
- **Metadata**: JSONB used for domain-specific details (like TOEIC score conversion tables, pronunciation details) to keep schema rigid but flexible.

## 2. Core Entities
- **Identity**: `User` (roles: STUDENT, ADMIN, TEACHER), `RefreshToken`.
- **Skill Tree**: `Skill` (self-referencing hierarchy for Listening, Reading, Speaking, parts).
- **Learning**: `LearningGoal`, `StudyPlan`, `LearningSession` (tracks mock tests, practices), `Attempt` (individual answers), `Mistake` (classified errors).
- **Content**: `Course`, `Lesson`, `Passage`, `Question` (MCQ, Audio, Fill in blank).
- **Assessment**: `Assessment` (Exams/Mock tests), `AssessmentQuestion`.
- **Vocabulary (SRS)**: `Vocabulary` (SM-2 Algorithm fields: easeFactor, intervalDays, nextReviewAt).
- **Progress & Jobs**: `Streak`, `Media`, `DocumentJob`.

## 3. Migration
Data was migrated from a legacy MongoDB schema.
- MongoDB `Exam` -> PostgreSQL `Assessment`, `Question`, `Passage`
- MongoDB `ExamResult` -> PostgreSQL `LearningSession`, `Attempt`
- MongoDB `Vocab` -> PostgreSQL `Vocabulary` (SRS intact)
