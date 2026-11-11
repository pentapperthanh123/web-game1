# Strict Code Review Rule

> **MANDATORY**: These rules apply whenever you review code, audit Pull Requests, or analyze code structures.

## 1. Magic Values & Constants (Highest Priority)
- **Flag literal strings/numbers** that represent domain meaning, are reused, or are compared.
- **Must be constants/enums**: 
  - React Query keys (e.g., `['admin-posts']` -> `QUERY_KEYS.ADMIN_POSTS`)
  - Timing & Delays (e.g., `300` -> `DEBOUNCE_MS`)
  - Validation limits (e.g., `5MB` -> `MAX_FILE_SIZE`)
  - Status/Step keys (e.g., `'pending'` -> `JobStatus.PENDING`)
  - Storage/Cookie keys (e.g., `'accessToken'` -> `STORAGE_KEYS.ACCESS_TOKEN`)
- If the same literal appears twice, or is branched on -> extract it.

## 2. Strict Naming Conventions
- **Functions/Variables/Methods**: `camelCase` (e.g., `getUserById`, `processData`)
- **Classes/React Components**: `PascalCase` (e.g., `UserService`, `UserProfile`)
- **Constants/Enums**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Booleans**: Must use prefixes like `is`, `has`, `can`, `should` (e.g., `isActive`, `hasPermission`)
- **Anti-patterns**: Avoid vague names (`data`, `temp`, `res`, `handleStuff`). Use intent-revealing names.

## 3. Clean Structure & Code Quality
- **Function Size**: Flag functions over ~40 lines that have multiple responsibilities. Suggest splitting.
- **Nesting**: Max 2 levels of nesting. Force the use of Guard Clauses / Early Returns.
- **Dead Code**: Delete commented-out code blocks.
- **Type Safety**: Strictly flag and prevent the use of `any` in TypeScript. Demand precise typing.
- **Duplication**: If >= 3 similar lines are repeated, extract a helper.

## 4. Universal Safety & Resilience
- **Error Handling**: API/External AI calls must have explicit try/catch with proper logging. No swallowed exceptions (`catch (e) { }`).
- **Secrets**: No hardcoded API keys or tokens. Must use env variables.
- **Resource Management**: File IO or network streams must be closed/cleaned up in `finally` blocks or `useEffect` returns.

## 5. Review Procedure
- When providing review feedback, always categorize by severity (❌ Error, ⚠️ Warning, ✅ Pass).
- Every finding MUST have a concrete fix suggestion.
- **Wait for user confirmation** before automatically applying the fixes.
