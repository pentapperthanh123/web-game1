# 🚀 Comprehensive React Clean Code & Best Practices Guidelines

This reference document compiles essential React clean code rules, design patterns, and anti-patterns extracted from top industry cheatsheets and guides.

---

## 1. 🏗️ Component Architecture & Structure

### 1.1 Single Responsibility Principle (SRP)
- Keep components small (< 150 lines). A component should do ONE thing: render a cohesive UI section.
- Extract complex state, handlers, and side effects into Custom Hooks (`use[Feature].ts`).
- Extract modal components, dropdown items, and table cells into dedicated sub-components.

### 1.2 4-Layer Frontend Architecture
Every non-trivial feature screen should be structured into 4 decoupled layers:
1. **Main View (`[FeaturePage].tsx`)**: Pure declarative composition of layout & sub-components (< 200 lines).
2. **Custom Hook (`use[Feature].ts`)**: State management, API calls, event handlers, timers, polling logic.
3. **Sub-Components (`components/`)**: Visual presentation components accepting explicit props.
4. **Services & Constants (`services/`, `constants/`)**: API requests via `API_ENDPOINTS`, typed DTOs, Enums.

### 1.3 RADIO Framework for Front-End System Design
(Source: *GreatFrontEnd Awesome FE System Design*)
When designing complex front-end features or applications, follow the 5-step RADIO framework:
- **R - Requirements Exploration**: Clarify functional & non-functional requirements (device support, offline mode, target Core Web Vitals, i18n).
- **A - Architecture**: Define high-level module boundary (Server vs Client, State Store, Data Flow, Component Tree).
- **D - Data Model**: Define normalized state shape, API DTOs, Client Cache entities, and TypeScript interfaces.
- **I - Interface Definition**: Define API contracts (REST endpoints, GraphQL queries, WebSocket payloads, component props).
- **O - Optimization**: Plan for performance (code-splitting, lazy loading, optimistic UI updates, virtualized rendering).

---

## 2. 🛡️ Props & State Clean Code Rules

### 2.1 Explicit Props vs. Spreading (`{...props}`)
- ❌ **Avoid:** `<ChildComponent {...props} />` (hides dependencies, risks passing invalid HTML attributes).
- ✅ **Prefer:** Pass explicit props: `<ChildComponent title={title} value={value} onChange={handleChange} />`.

### 2.2 Boolean Props Shorthand
- ❌ **Avoid:** `<Button isDisabled={true} isLoading={false} />`
- ✅ **Prefer:** `<Button isDisabled />` (omit `=true` for boolean flags).

### 2.3 Strict Prop & Event Handler Naming
- **Input Props:** Prefix with `on...` (`onClick`, `onStatusChange`, `onSave`).
- **Internal Handlers:** Prefix with `handle...` (`handleClick`, `handleStatusChange`, `handleSave`).

### 2.4 Destructure Props at Function Signature
- ❌ **Avoid:** `const UserCard = (props) => <div>{props.name}</div>;`
- ✅ **Prefer:** `const UserCard = ({ name, role }: UserCardProps) => <div>{name}</div>;`

### 2.5 Eliminate Derived State
- Never copy props or calculable values into local state with `useEffect`. Compute values directly during render.
```tsx
// ❌ BAD: Duplicate state
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(firstName + ' ' + lastName); }, [firstName, lastName]);

// ✅ GOOD: Derived during render
const fullName = `${firstName} ${lastName}`;
```

---

## 3. ⚛️ JSX Rendering & Conditional Hygiene

### 3.1 Avoid Number `0` Render Bug with Short-Circuit `&&`
- ❌ **BAD:** `items.length && <List items={items} />` (renders string `"0"` when `items.length === 0`).
- ✅ **GOOD:** `items.length > 0 && <List items={items} />` or `Boolean(items.length) && <List />`.

### 3.2 Fragment (`<>...</>`) Over Unnecessary Wrapper `<div>`
- Avoid wrapping sibling elements in redundant `<div>` tags if no styling/layout wrapper is required.

### 3.3 Stable Key Props for Dynamic Lists
- ❌ **Never** use array `index` as `key` for reorderable, filterable, or deletable lists.
- ✅ Always use unique domain IDs (`key={item.id}`).

---

## 4. 🔒 Constants, Enums & Magic Values

### 4.1 Strict No-Hardcoding Policy
- **React Query & Cache Keys:** Store in `QUERY_KEYS` object in `constants.ts` (e.g. `QUERY_KEYS.POSTS.ADMIN_LIST`). Never inline string query keys like `queryKey: ['admin-posts']`.
- **Timing & Delays:** Store debounce, throttle, staleTime, and polling intervals in `constants.ts` (e.g. `DEBOUNCE_MS.SEARCH = 300`, `STALE_TIME.LONG = 1000 * 60 * 60`).
- **Validation & Pagination Limits:** Store page sizes, file limits, and min/max length thresholds in `constants.ts` (e.g. `PAGINATION_LIMITS.DEFAULT = 12`).
- **API Endpoints:** Store in `FEATURE_API_ENDPOINTS` object in `constants.ts` or `apiUrl.ts`. Never inline string URLs like `request('/api/v1/jobs')`.
- **Table Filters & Select Options:** Store filter options arrays (`filters: CREATED_AT_DATE_FILTERS`) in `constants.ts`.
- **Status & Type Literals:** Use TypeScript `enum` or `as const` objects (`VideoJobStatus.COMPLETED`).
- **Default Fallback Values:** Define named constants (`DEFAULT_WATERMARK_TEXT`, `DEFAULT_TTS_VOICE`).

---

## 5. ⚡ Performance & Side-Effect Safety

### 5.1 Immutable State Updates
- Never mutate state directly (`arr.push(item)`). Always produce new references (`[...arr, item]`).

### 5.2 Cleanup Side Effects in `useEffect`
- Always return a cleanup function when setting up timers (`setInterval`), event listeners, WebSockets, or SSE streams.

### 5.3 Code-Splitting Heavy Modals & Previews
- Use `React.lazy()` and `Suspense` for heavy modals, video players, or rich text editors to keep main bundle size minimal.

### 5.4 Error Boundaries for Modular Resiliency
- Wrap complex dashboard cards and independent widgets in `<ErrorBoundary>` to prevent single component failures from crashing the entire app.

---

## 6. 🛑 Effect Hygiene (You Might Not Need an Effect)

### 6.1 Handle Logic in Event Handlers, Not Effects
- ❌ **Avoid:** Setting a state value purely to trigger a `useEffect` that calls an API. This creates unnecessary renders and race conditions.
- ✅ **Prefer:** Execute the logic (e.g., API calls, form submissions) directly inside the event handler (like `handleSave`). Only use `useEffect` to synchronize your component with external systems (like fetching initial data on mount, subscribing to WebSockets, or interacting with the DOM).

### 6.2 Avoid Chaining Effects
- ❌ **Avoid:** Updating `stateA` in one effect, which triggers another effect to update `stateB`. This leads to "waterfall" renders and spaghetti logic.
- ✅ **Prefer:** Calculate all necessary state updates together within a single handler or a single custom hook, reducing render cycles.

---

## 7. 🧠 Memoization & Re-render Optimization

### 7.1 No Premature Memoization
- ❌ **Avoid:** Blindly wrapping every function in `useCallback` and every variable in `useMemo`. This adds memory overhead and clutters the code.
- ✅ **Prefer:** Only use `useMemo` for genuinely expensive mathematical/array computations. Only use `useCallback` when passing a function down to a child component that is wrapped in `React.memo`, or if the function is a dependency in a `useEffect`.

### 7.2 Push State Down Instead of Memoizing
- If a piece of state changes frequently (like a typing input or a hover state) and causes a heavy parent component to re-render, do not immediately reach for `useMemo`. Instead, extract that state and the UI that depends on it into its own smaller child component.

---

## 8. 📘 TypeScript Standards & Typings

### 8.1 `type` vs `interface` Convention
- **Component Props:** Use `type` for component props (`type ButtonProps = { ... }`). It is more concise and handles unions/intersections perfectly.
- **Domain Models / DTOs:** Use `interface` for global entities, database models, or API Data Transfer Objects (`interface UserDTO { ... }`). Interfaces are better for OOP patterns and extending.

### 8.2 Colocation of Types
- **Local Types:** Define the `Props` type directly in the same file, right above the component declaration.
- **Shared Types:** If a type is used by multiple components (e.g., `JobStatus`), extract it to a dedicated `[Feature].types.ts` or a global `types/` directory. Never export a type from one component's `.tsx` file just to import it into another.

### 8.3 Absolute Ban on `any`
- ❌ **Never** use `any` to bypass type errors. It defeats the entire purpose of TypeScript.
- ✅ **Prefer:** If a data structure is truly unknown (e.g., parsing a dynamic JSON payload or an error object), use `unknown`, and then use Type Guards/Narrowing before accessing its properties.

