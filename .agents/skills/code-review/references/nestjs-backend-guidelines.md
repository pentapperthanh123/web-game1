# ⚙️ NestJS & Node.js Backend Clean Code Guidelines

This reference document compiles essential backend clean code rules, architecture patterns, and anti-patterns for NestJS and Node.js microservices/monorepos.

---

## 1. 🏗️ Layered Architecture & Separation of Concerns

### 1.1 Strict Controller - Service - Repository Flow
- **Controllers (`*.controller.ts`)**: HTTP transport only. Parse DTOs, delegate to service, return HTTP response DTOs. NO business logic or database calls inside controllers.
- **Services (`*.service.ts`)**: Core business logic, orchestrating queues, transactions, and external services.
- **Processors / Consumers (`*.processor.ts`)**: Background job handling (BullMQ/Redis). Never duplicate business logic inside processors; delegate to services.

### 1.2 DTO Validation & Transformation
- Always validate incoming HTTP payloads using `class-validator` decorators (`@IsString()`, `@IsOptional()`, `@IsEnum()`).
- Always use `class-transformer` (`@Type(() => Number)`) to transform query parameters.
- Enable `whitelist: true` and `forbidNonWhitelisted: true` in ValidationPipe to prevent payload pollution.

---

## 2. ⚡ Async & Event Loop Safety

### 2.1 Never Lock Main Thread Event Loop
- ❌ **Avoid:** Synchronous heavy calculations, large file I/O operations (`fs.readFileSync`), or blocking crypto inside async endpoints.
- ✅ **Prefer:** Worker threads, background queues (BullMQ), or streaming I/O for heavy tasks.

### 2.2 Exponential Backoff & Retry Wrapper
- Wrap external API calls (Gemini, OpenRouter, S3/R2 storage uploads) in exponential backoff retry wrappers (`withRetry()`).
- Always handle API rate limits (HTTP 429) gracefully without crashing worker threads.

---

## 3. 🔒 Error Handling & Exception Filters

### 3.1 Custom Exception Classes
- Throw standard NestJS HTTP exceptions (`BadRequestException`, `NotFoundException`, `ConflictException`).
- Use global Exception Filters (`@Catch()`) to catch unhandled errors and format consistent JSON error responses:
```json
{
  "statusCode": 400,
  "message": "Invalid video URL format",
  "error": "Bad Request",
  "timestamp": "2026-07-22T21:48:00.000Z"
}
```

### 3.2 Never Swallow Exceptions
- ❌ **Avoid:** Empty `catch (e) {}` blocks or returning `null` silently on unexpected database/network failures.
- ✅ **Prefer:** Log structured error stack traces and rethrow domain-specific exceptions.

---

## 4. 🗄️ Database & State Integrity

### 4.1 Transaction Safety
- Use Prisma transactions (`prisma.$transaction([...])`) whenever creating or updating interdependent entities across multiple tables.
- Keep transaction blocks short and fast to avoid lock timeouts.

### 4.2 Metadata JSON Column Bounds
- Use PostgreSQL JSONB column (`metadata`) for dynamic properties, cached subtitle segments, and temporary render settings.
- Avoid storing huge binary data or unparsed raw HTML inside JSON columns.

---

## 5. 🧹 Naming Conventions & Constants

### 5.1 Endpoints & Queue Names
- Store queue names (`VIDEO_JOB_QUEUE = 'video-job-queue'`), SSE event names, and API route paths in `*.constants.ts`.
- Use plural nouns for RESTful resources (`/video-jobs`, `/users`, `/channels`).
