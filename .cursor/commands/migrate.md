<!-- Synced from .agents/workflows/migrate.md — do not edit here; edit the workflow source. -->

> Execute legacy application modernization & codebase migration. Analyzes legacy code, decouples data access & UI dependencies, and builds an incremental Strangler Fig migration plan.

# Codebase Modernization & Migration Workflow

Use this workflow when migrating a legacy application or monolith codebase to a modern stack (e.g. React/Next.js, REST/GraphQL APIs, microservices, or monorepo).

---

## Phase 1: Context & Discovery
1. Activate `@[agent/explorer-agent]` and load skill `@[skills/codebase-explorer]`.
2. Inspect legacy repository structure, entry points, configuration files, and data access layers.
3. Analyze module dependencies and map business domain boundaries.

---

## Phase 2: Data Access & State Decoupling
1. Identify legacy data sources, database queries, and caching mechanisms.
2. Map legacy data access patterns to modern REST/GraphQL endpoints or ORM layers.
3. Decouple hardcoded queries and state management from presentation layers.

---

## Phase 3: Component & Architecture Mapping
1. Activate `@[agent/frontend-specialist]` and `@[agent/backend-specialist]`.
2. Map legacy UI views/controllers to modern component trees and client route handlers.
3. Separate business logic from UI event handlers into reusable services, custom hooks, and API endpoints.

---

## Phase 4: Migration Architecture Plan
1. Activate `@[agent/project-planner]` and load skill `@[skills/plan-writing]`.
2. Apply the **Strangler Fig Pattern** (incremental migration alongside legacy system).
3. Generate task breakdown in `{task-slug}.md` (e.g., `modernize-app-migration.md`):
   - Phase 4.1: API Gateway / Routing & Data Access Layer
   - Phase 4.2: Core Auth & Shared Layout
   - Phase 4.3: Module-by-Module Component Build
   - Phase 4.4: Feature Parity & Regression Verification

---

## Phase 5: Execution & Incremental Verification
1. Implement backend API endpoints and data layer first.
2. Build modern UI components according to spec.
3. Run verification via `@[agent/test-engineer]` to ensure feature and data parity between legacy and modern systems.

---

## Phase 6: Cutover & Documentation
1. Save architecture decisions and domain mappings to memory: `/remember`.
2. Document modern API specs in Swagger/OpenAPI and update system docs.
