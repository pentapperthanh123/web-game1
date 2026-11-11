# 🗄️ Database & Prisma ORM Clean Code Guidelines

This reference document compiles essential schema design, indexing, and query performance rules for Prisma and PostgreSQL.

---

## 1. 🏗️ Schema Design & Indexing Strategy

### 1.1 Index Search & Filter Columns
- Always add `@index([status])`, `@index([createdAt])`, `@index([sourcePlatform])` to fields that appear frequently in `WHERE`, `ORDER BY`, or filter clauses.
- Add composite indexes `@index([userId, status])` for multi-column filter queries.

### 1.2 ID Generation Standards
- Use `cuid()` or `uuid()` for primary key IDs (`id String @id @default(cuid())`).
- Avoid auto-incrementing integer IDs for public API resources to prevent enumeration security risks.

---

## 2. ⚡ Query Performance & Fetch Optimization

### 2.1 Select Only Required Fields
- Avoid fetching heavy relation trees or large JSON metadata columns if only basic fields are needed.
- Use Prisma `select` payload truncation for list endpoints (`listVideoJobs`).

### 2.2 Default Pagination
- Always enforce default pagination parameters (`take: 20`, `skip: 0`) on list queries to prevent out-of-memory crashes as database size grows.

---

## 3. 🛡️ Database Cache & State Invariants

### 3.1 PostgreSQL JSONB Boundary
- Store dynamic properties, cached subtitle segments, and render parameters inside `metadata` JSONB column.
- Maintain fallback reconstruction logic: if database cache contains pre-generated SRT segments, use cached data unless `reGenerate: true` flag is explicitly requested.
