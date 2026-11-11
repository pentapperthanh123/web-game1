---
type: project
created: 2026-08-17
updated: 2026-08-17
---

# API Design Principles & Endpoints

## 1. RESTful Standards
- **Base URL**: `/api/v1`
- **Auth**: Bearer JWT (`Authorization: Bearer <access_token>`).
- **Response Format**:
  ```json
  { 
    "success": boolean, 
    "data": any, 
    "meta": { "total", "page", "limit", "totalPages" } // optional
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "error": { "code": "STRING_CODE", "message": "...", "details": [...] }
  }
  ```
- **Pagination & Filtering**: URL Queries (`?page=1&limit=20&sort=createdAt&order=desc&search=term`).

## 2. Core Modules
- **Identity (`/auth`, `/users`)**: Register, Login (email/Google), Refresh token, Manage profiles/roles.
- **Content (`/courses`, `/lessons`, `/questions`, `/passages`, `/media`)**: Full CRUD via Admin Portal.
- **Vocabulary (`/vocabulary`)**: View, add, and SRS review endpoints (`/due`, `/review`).
- **Assessment (`/assessments`, `/sessions`)**: 
  - Admin handles `/assessments` (Mock tests). 
  - Students use `/sessions/start` (returns session ID and questions) and `/sessions/:id/submit` (scores and returns breakdown).
- **Progress (`/skills`, `/mistakes`, `/streaks`, `/goals`)**: Skill mastery tree and analytical breakdowns.
- **AI (`/ai`)**: Chat (`/ai/coach/chat` via SSE), Explain answers, Generate questions, Evaluate sessions.
- **Jobs (`/jobs`)**: Python content pipeline interface (e.g., `import-exam`).

## 3. Rate Limiting
- Login/Auth: 5 req/min
- AI Endpoints: 20 req/min
- Uploads: 10 req/min
- General API: 100 req/min
