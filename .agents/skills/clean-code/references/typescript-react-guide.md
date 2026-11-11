# TypeScript & React Production-Grade Guidelines

> Comprehensive guide for writing clean, resilient, type-safe, and maintainable React & TypeScript code.

---

## 1. Type Safety & Type Design Rules

### 1.1 Ban `any` - Use Strict Discriminated Unions & Unknown
- **Rule:** Never use `any` unless integrating with untyped 3rd-party legacy libraries.
- **Alternative:** Use `unknown` for values whose type is not yet known, combined with Type Guards (`typeof`, `instanceof`, or custom type predicate functions).
- **Discriminated Unions:** Always model domain states using tagged unions for exhaustive pattern matching.

```typescript
// ❌ BAD: Loose, unsafe interface with optional fields that allow invalid states
interface FetchState {
    loading: boolean;
    data?: UserData;
    error?: string;
}
// Problem: Allows { loading: true, data: user, error: "Failed" } (invalid state!)

// ✅ GOOD: Strict Discriminated Union
type FetchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: UserData }
    | { status: 'error'; error: ErrorPayload };

function renderState(state: FetchState) {
    switch (state.status) {
        case 'idle':
            return null;
        case 'loading':
            return <Spinner />;
        case 'success':
            return <UserProfile data={state.data} />;
        case 'error':
            return <ErrorMessage error={state.error} />;
    }
}
```

### 1.2 Type Guards & Validation
- Always use custom type predicates (`val is TargetType`) when parsing external JSON, API responses, or URL parameters.

```typescript
export function isApiErrorResponse(error: unknown): error is { data: { message: string } } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'data' in error &&
        typeof (error as Record<string, unknown>).data === 'object' &&
        (error as Record<string, unknown>).data !== null &&
        'message' in ((error as Record<string, unknown>).data as Record<string, unknown>)
    );
}
```

---

## 2. Component Architecture & Principles

### 2.1 Single Responsibility Principle (SRP)
- A React component should do ONE thing.
- Separate Presentation (UI rendering) from Container/Logic (data fetching, state orchestration).
- Extract custom hooks (`useFeatureLogic`) when component logic exceeds 50 lines.

### 2.2 Component Sizing & Composition
- **Max Component Length:** Keep components under 150 lines.
- **Sub-components:** If a rendering block takes more than 30 lines (e.g., complex Modal rows, Table action cells), extract it into a dedicated sub-component.

```tsx
// ❌ BAD: Monolithic 400-line component mixing API, state, table formatting, and 3 modals

// ✅ GOOD: Clean Composition
export const UserManagementPage: React.FC = () => {
    const { users, isLoading, error, handleDelete } = useUserManagement();

    if (isLoading) return <PageSpinner />;
    if (error) return <PageError error={error} />;

    return (
        <PageLayout title="User Management">
            <UserToolbar />
            <UserTable users={users} onDelete={handleDelete} />
        </PageLayout>
    );
};
```

---

## 3. React Hooks Best Practices

### 3.1 `useEffect` Rules & Anti-patterns
- **Never use `useEffect` for data transformation:** Transform data directly during rendering or memoize with `useMemo`.
- **Never use `useEffect` to chain state updates:** Chain events in event handlers instead of setting state A, watching state A in useEffect, and setting state B.
- **Always clean up asynchronous subscriptions & event listeners:**

```tsx
// ❌ BAD: useEffect state chain
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState('');

useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ GOOD: Derived state during render (zero extra re-renders!)
const fullName = `${firstName} ${lastName}`;
```

### 3.2 Race Condition Prevention in Async Effects
- When fetching data inside an effect, use an `ignore` flag or `AbortController` to prevent out-of-order state updates.

```tsx
useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
        const result = await api.getUser(id);
        if (!isCancelled) {
            setUser(result);
        }
    }

    fetchData();

    return () => {
        isCancelled = true;
    };
}, [id]);
```

---

## 4. State Management Standards

### 4.1 Local State vs Global State
- **Local State (`useState`)**: UI toggles, modal open/close, form drafts, tab selection.
- **Server Cache (RTK Query / React Query / SWR)**: Remote API data, paginated lists, user profiles.
- **Global Store (Zustand / Redux)**: Shared cross-page app settings, user authentication session, cart items.

### 4.2 Avoid Duplicate & Redundant State
- Do not mirror props into local state unless explicitly implementing an editable form draft.

```tsx
// ❌ BAD: Duplicate state
const UserHeader = ({ user }: { user: User }) => {
    const [name, setName] = useState(user.name); // Stale prop bug!
    return <h1>{name}</h1>;
};

// ✅ GOOD: Direct prop usage
const UserHeader = ({ user }: { user: User }) => {
    return <h1>{user.name}</h1>;
};
```

---

## 5. Performance Optimization Guidelines

### 5.1 Pragmatic Memoization (`useMemo` & `useCallback`)
- Do NOT wrap every function in `useCallback` or every variable in `useMemo` indiscriminately (causes overhead).
- **DO use `useCallback`** when passing functions to memoized child components (`React.memo`) or as dependencies to `useEffect`.
- **DO use `useMemo`** when performing expensive calculations (filtering/sorting lists of 100+ items).

### 5.2 Immutable State Updates
- Never mutate state objects or arrays directly. Always produce fresh objects or use Immer.

```typescript
// ❌ BAD: Direct mutation
items.push(newItem);
setItems(items); // React won't re-render!

// ✅ GOOD: Immutable spread
setItems(prev => [...prev, newItem]);
```

---

## 6. Code Style & Cleanliness Checklist

1. **Imports Order:**
   - 1. React / Core libraries (`react`, `react-dom`, `react-router-dom`)
   - 2. Third-party UI libraries (`antd`, `fis-component`, `lucide-react`)
   - 3. API services & state stores (`../../services/...`)
   - 4. Internal components (`@components`, `./sub-components`)
   - 5. Utils, helpers, constants, types (`@utils`, `./types`)
   - 6. Styles / CSS (`./styles.css`)

2. **No Magic Strings / Numbers:**
   - Extract status strings (`'ACTIVE'`, `'PENDING'`), HTTP status codes (`200`, `401`, `403`), and key codes to `constants.ts` or Enums.

3. **DOM Safety & Hydration:**
   - Always verify `typeof window !== 'undefined'` before accessing `localStorage`, `sessionStorage`, or `window`.

---

## 7. Essential TypeScript Tricks & Idioms (Production Reference)

### 7.1 The `satisfies` Operator (TS 4.9+)
Validates that an object matches an interface/type **without widening** its properties to general types.

```typescript
type ThemeConfig = Record<string, string | number>;

// With satisfies: validates against ThemeConfig BUT retains exact literal types
const theme = {
    primary: '#0083F0',
    sidebarWidth: 260,
} satisfies ThemeConfig;

// theme.primary is inferred as string (allows string methods like .toLowerCase())
// theme.sidebarWidth is inferred as number (allows .toFixed())
```

### 7.2 Const Assertions (`as const`) & Readonly Arrays
Infer specific literal types and make all properties deeply `readonly`.

```typescript
const NAVIGATION_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'settings', label: 'Settings', path: '/settings' },
] as const;

// Type of NAVIGATION_ITEMS[number]['id'] is 'dashboard' | 'settings' (not general string!)
```

### 7.3 Template Literal Types for Structured Strings
Construct type-checked string pattern definitions for route endpoints, event handlers, or CSS units.

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiPath = `/api/v1/${string}`;
type RouteEndpoint = `${HttpMethod} ${ApiPath}`;

// ✅ Valid: 'GET /api/v1/users'
// ❌ Error: 'POST /v1/users' (Must start with /api/v1/)
```

### 7.4 Exhaustive Pattern Matching with `never`
Ensure all cases of a union type are handled in `switch` statements at compile-time.

```typescript
function assertNever(x: never): never {
    throw new Error(`Unhandled discriminated union case: ${JSON.stringify(x)}`);
}

type UserRole = 'ADMIN' | 'USER' | 'GUEST';

function getPermissions(role: UserRole): string[] {
    switch (role) {
        case 'ADMIN':
            return ['read', 'write', 'delete'];
        case 'USER':
            return ['read', 'write'];
        case 'GUEST':
            return ['read'];
        default:
            return assertNever(role); // Compile error if a new role is added without updating switch!
    }
}
```

### 7.5 Nominal / Branded Types (Preventing ID Confusion)
Prevent accidentally passing a `UserId` into a function expecting a `CategoryId`.

```typescript
export type Brand<K, T> = K & { readonly __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type CategoryId = Brand<string, 'CategoryId'>;

export function makeUserId(id: string): UserId {
    return id as UserId;
}

export function makeCategoryId(id: string): CategoryId {
    return id as CategoryId;
}

function fetchCategory(id: CategoryId) { /* ... */ }

const userId = makeUserId('usr_123');
// fetchCategory(userId); // ❌ Compile Error: Type 'UserId' is not assignable to 'CategoryId'!
```

### 7.6 Utility Types Cheat-Sheet (`Awaited`, `ReturnType`, `Parameters`)

```typescript
// Extract return type of async function
type FetchUserReturn = Awaited<ReturnType<typeof fetchUserApi>>;

// Extract parameter types of a function
type CreateUserParams = Parameters<typeof createUserApi>[0];
```

### 7.7 Loose Autocomplete for Unions (`(string & {})`)
Provide IDE autocomplete for preset literal options while still allowing any custom string without type collapsing to `string`.

```typescript
// ❌ BAD: 'sm' | 'md' | string collapses to general 'string' (loses IDE autocomplete!)
type SizeBad = 'sm' | 'md' | 'lg' | string;

// ✅ GOOD: (string & {}) preserves IDE autocomplete for 'sm'|'md'|'lg' AND allows any custom string!
type SizeGood = 'sm' | 'md' | 'lg' | (string & {});
```

### 7.8 Mutually Exclusive / XOR Types with `never`
Enforce that a component or function receives EITHER property A OR property B, but never both simultaneously.

```typescript
type OnlyEmail = { email: string; phone?: never };
type OnlyPhone = { phone: string; email?: never };
type ContactProps = OnlyEmail | OnlyPhone;

// ✅ Valid: { email: 'a@b.com' }
// ✅ Valid: { phone: '0901234567' }
// ❌ Error: { email: 'a@b.com', phone: '0901234567' } (Cannot specify both!)
```

### 7.9 React `ComponentProps` Extraction
Extract props of third-party UI components or HTML elements without re-declaring types manually.

```typescript
import { ComponentPropsWithoutRef } from 'react';
import { Button } from 'antd';

// Extract props from an existing component or native HTML element
type CustomButtonProps = ComponentPropsWithoutRef<typeof Button> & {
    analyticsId?: string;
};
```

### 7.10 Double Immutability (`Object.freeze` + `as const`)
Ensure configuration objects are deeply immutable at **compile-time** (`as const`) AND at **runtime** (`Object.freeze`).

```typescript
export const APP_CONFIG = Object.freeze({
    API_URL: 'https://api.domain.com',
    MAX_RETRIES: 3,
} as const);
```
