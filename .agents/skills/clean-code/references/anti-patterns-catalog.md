# AI Anti-Patterns Catalog & Code Smell Prevention

> Exhaustive guide identifying common AI coding anti-patterns, their root causes, and production-grade refactoring solutions.

---

## 1. Top 10 AI Code Anti-Patterns

### Anti-Pattern 1: The Spaghetti Error Fallback Chain
- **Symptom:** Writing 5-6 inline `||` optional chaining conditions to extract error messages.
- **Why AI does it:** The AI guesses properties (`error?.data?.message || error?.data?.detail || error?.detail || ...`) instead of checking the project's API error types/interceptors.
- **Refactoring:** Extract a single `getErrorMessage(error)` utility function into `utils/error.ts`.

### Anti-Pattern 2: Prop Drilling & Giant Component Monoliths
- **Symptom:** Single components exceeding 300+ lines with 10+ props passed down through 4 levels.
- **Why AI does it:** It is faster for the AI to append code to a single existing file than to create modular sub-components and hooks.
- **Refactoring:** Split into Presentation vs Container, extract custom hooks for state, and decompose sub-sections into sub-components.

### Anti-Pattern 3: State Duplication & Prop Shadowing
- **Symptom:** Copying a prop directly into local `useState` without a synchronization mechanism.
```tsx
// ❌ ANTI-PATTERN
const UserCard = ({ user }: { user: User }) => {
    const [name, setName] = useState(user.name); // Stale state when prop updates!
};
```
- **Refactoring:** Calculate derived values during render directly, or use key-based component resetting if state initialization is required.

### Anti-Pattern 4: The Uncleaned Effect (Memory Leaks)
- **Symptom:** Calling `setInterval`, `addEventListener`, or un-aborted async fetch calls in `useEffect` without returning a cleanup function.
- **Refactoring:** Always return a cleanup function (`clearInterval`, `removeEventListener`, or `controller.abort()`).

### Anti-Pattern 5: Magic Strings, Magic Numbers, & Inline URLs
- **Symptom:** Hardcoding status strings (`'PENDING'`, `'SUCCESS'`), status codes (`200`, `401`), timeouts (`5000`), or raw API URLs directly in UI code.
- **Refactoring:** Centralize in `src/constants/` or `src/types/enums.ts`.

### Anti-Pattern 6: Missing Key Props or Index-As-Key
- **Symptom:** Using array index `key={index}` when rendering lists that can be reordered, filtered, or deleted.
- **Refactoring:** Use a unique entity identifier `key={item.id || item.code}`.

### Anti-Pattern 7: Catch & Swallowing Exceptions
- **Symptom:** Catching exceptions in try-catch blocks and returning `null`, `{}` or empty array without logging or user notification.
```tsx
// ❌ ANTI-PATTERN
try {
    await saveData();
} catch (e) {
    // Silent catch! User has no idea it failed!
}
```
- **Refactoring:** Always log the exception and provide visual feedback to the user via toast, notification, or error state.

### Anti-Pattern 8: Over-Engineered Abstractions
- **Symptom:** Creating complex abstract factory classes, custom state machines, or 5-layer wrapper utilities for a simple CRUD form.
- **Refactoring:** Apply **KISS** (Keep It Simple) and **YAGNI** (You Aren't Gonna Need It). Write direct, self-documenting code.

### Anti-Pattern 9: Imperative DOM Manipulation in React
- **Symptom:** Using `document.getElementById()`, `document.querySelector()`, or direct innerHTML manipulation instead of React state/refs.
- **Refactoring:** Use React state, uncontrolled refs (`useRef`), or component props.

### Anti-Pattern 10: Un-memoized Dynamic Objects Passed to Memoized Children
- **Symptom:** Passing inline object literals `style={{ margin: 10 }}` or inline arrow functions `onClick={() => doSomething(id)}` to children wrapped in `React.memo`, invalidating memoization.
- **Refactoring:** Move static objects outside the render function or memoize with `useMemo` / `useCallback`.

### Anti-Pattern 11: Nested Ternary Operators & Deep If-Else Nesting
- **Symptom:** Writing ternary chains (`status === 'A' ? '1' : status === 'B' ? '2' : '3'`) or nesting `if` statements > 2 levels deep.
- **Why AI does it:** Fast append mentality without restructuring the flow.
- **Refactoring:**
  - For ternaries: Use an Object Lookup Map (`MAP[status] ?? fallback`) or extract a named helper function with `switch/case`.
  - For deep `if-else`: Use Guard Clauses (`if (!condition) return;`) to keep execution flat.

---

## 2. Refactoring Quick-Reference Table

| Smell | Detection Key | Corrective Action |
|---|---|---|
| **Magic String** | `"ACTIVE"`, `"PENDING"` in UI | Move to `STATUS_ENUM` or `constants.ts` |
| **Long Component** | File > 200 lines | Extract hooks & sub-components |
| **Spaghetti Fallback** | 4+ `||` conditions | Use `getErrorMessage(error)` helper |
| **Index Key** | `map((item, idx) => <div key={idx}>)` | Use `key={item.id}` |
| **Silent Catch** | `catch (e) {}` | Log & show toast alert |
| **Unwrapped API** | `axios.get('/api/users')` in UI | Move to API service layer |
| **Nested Ternary** | `a ? b : c ? d : e` | Use Object Lookup Map or `switch/case` helper |
| **Deep Nesting** | Nesting `if` > 2 levels | Refactor with Guard Clauses (Early Return) |
