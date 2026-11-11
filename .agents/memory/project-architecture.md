---
type: project
created: 2026-08-17
updated: 2026-08-17
---

# Project Architecture (AI English Coach)

## 1. Product Vision
An AI English Learning Platform designed generically. The MVP is TOEIC Coach, but the core engine supports Speaking, IELTS, Business English without database or architectural rewrite.

## 2. System Architecture (Polyrepo)
- **Admin Portal (Next.js)**: CMS for content, exams, and reporting.
- **Mobile App (React Native)**: Student client for practicing, learning, and AI interaction.
- **Backend API (NestJS)**: Modular Monolith handling:
  - Identity (Auth/JWT)
  - Content (CMS)
  - Assessment
  - AI Layer (LLM integration)
  - Learning (Sessions, goals)
  - Progress (Skills, streaks, mistakes)
  - Recommendation
- **Python Content Pipeline (ai-worker-python)**: Async workers for parsing, OCR, normalizing, and importing exam data via Redis (BullMQ).
- **Database (Neon PostgreSQL)**: Core relational data.
- **Media Storage**: S3 / MinIO / Cloudinary.

## 3. Authentication
- Central JWT issued by NestJS Backend.
- Strategies: Password (bcrypt) & Google (`id_token`).
- Token Lifecycle: Access Token (15 mins), Refresh Token (7 days, in DB).

## 4. Key Engineering Rules
- **Generic First**: ABSOLUTELY NO table or entity names containing "Toeic". "TOEIC" is strictly an enum value.
- **Phases Implemented**: Foundation, Content & Assessment, Admin Portal, Mobile App, AI & Python Pipeline are already implemented.


