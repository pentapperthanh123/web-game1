---
name: react-next-performance
framework: React / Next.js
description: React and Next.js specific performance optimization patterns from Vercel Engineering
parent_skill: web-performance
---

# React / Next.js Performance Optimization

> **From Vercel Engineering** - 58 optimization rules prioritized by impact  
> **Parent Skill:** [web-performance](../SKILL.md) (Universal principles)

---

## 🎯 React/Next.js Specific Optimizations

**This guide covers React/Next.js-specific patterns. For universal web performance principles, see the parent [web-performance skill](../SKILL.md).**

---

## 📑 Content Map

**React/Next.js specific optimization guides:**

| File | Impact | Rules | Focus Area |
|------|--------|-------|------------|
| [1-async-eliminating-waterfalls.md](1-async-eliminating-waterfalls.md) | 🔴 CRITICAL | 6 | React Server Components, Suspense boundaries |
| [2-bundle-bundle-size-optimization.md](2-bundle-bundle-size-optimization.md) | 🔴 CRITICAL | 5 | Dynamic imports, barrel exports, tree-shaking |
| [3-server-server-side-performance.md](3-server-server-side-performance.md) | 🟠 HIGH | 7 | SSR, API routes, streaming |
| [4-client-client-side-data-fetching.md](4-client-client-side-data-fetching.md) | 🟡 MEDIUM-HIGH | 4 | SWR, React Query, deduplication |
| [5-rerender-re-render-optimization.md](5-rerender-re-render-optimization.md) | 🟡 MEDIUM | 12 | React.memo, useMemo, useCallback |
| [6-rendering-rendering-performance.md](6-rendering-rendering-performance.md) | 🟡 MEDIUM | 9 | Virtualization, next/image |
| [7-js-javascript-performance.md](7-js-javascript-performance.md) | ⚪ LOW-MEDIUM | 12 | Micro-optimizations |
| [8-advanced-advanced-patterns.md](8-advanced-advanced-patterns.md) | 🔵 VARIABLE | 3 | useLatest, init-once patterns |
| [9-cache-components.md](9-cache-components.md) | 🔴 CRITICAL | 4 | Next.js 16+ `use cache`, PPR |

**Total: 58 React/Next.js-specific rules**

---

## 🚀 React/Next.js Quick Wins

### 1. Server Components (Next.js 13+)

**Use Server Components by default:**

```tsx
// ✅ Server Component (default)
async function Page() {
  const data = await fetch('...');
  return <div>{data}</div>;
}

// ❌ Client Component (only when needed)
'use client';
function Interactive() {
  const [state, setState] = useState();
  return <button onClick={() => setState(...)}>Click</button>;
}
```

**When to use Client Components:**
- User interactions (onClick, onChange)
- Browser APIs (localStorage, window)
- React hooks (useState, useEffect)

---

### 2. Next.js Image Optimization

```tsx
// ❌ Regular img tag
<img src="/hero.jpg" alt="Hero" />

// ✅ Next.js Image component
<Image 
  src="/hero.jpg" 
  alt="Hero"
  width={1200}
  height={600}
  priority  // For LCP images
  quality={85}
/>
```

---

### 3. Dynamic Imports (Code Splitting)

```tsx
// ❌ Static import (increases initial bundle)
import HeavyChart from './HeavyChart';

// ✅ Dynamic import
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false  // Skip SSR for client-only components
});
```

---

### 4. Parallel Data Fetching

```tsx
// ❌ Sequential (waterfall)
async function Page() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  return <div>...</div>;
}

// ✅ Parallel (faster)
async function Page() {
  const [user, posts] = await Promise.all([
    fetchUser(),
    fetchPosts(userId)
  ]);
  return <div>...</div>;
}
```

---

### 5. Avoid Barrel Imports

```tsx
// ❌ Barrel import (imports entire package)
import { Button, Card, Modal } from '@/components';

// ✅ Direct import
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
```

---

## 📊 React Performance Audit Priority

**Order of optimization for React/Next.js projects:**

```
1️⃣ CRITICAL (Do First):
   ├─ Eliminate waterfalls → Read Section 1
   ├─ Bundle size optimization → Read Section 2
   └─ Use Server Components where possible

2️⃣ HIGH (Do Second):
   ├─ Server-side performance → Read Section 3
   └─ API route optimization

3️⃣ MEDIUM (Do Third):
   ├─ Client data fetching → Read Section 4
   ├─ Re-render optimization → Read Section 5
   └─ Rendering performance → Read Section 6

4️⃣ LOW (Polish):
   ├─ JavaScript micro-optimizations → Read Section 7
   └─ Advanced patterns → Read Section 8

🔥 NEXT.JS 16+ (Modern):
   └─ Cache Components → Read Section 9
```

---

## 🎯 Quick Decision Tree (React/Next.js)

**What's your React performance issue?**

```
🐌 Slow page loads
  → Check: Waterfalls (Section 1), Bundle (Section 2)
  → Solution: Parallel fetching, Dynamic imports

🔄 Too many re-renders
  → Check: Component structure, memoization
  → Solution: React.memo, useMemo, useCallback (Section 5)

📦 Large bundle size
  → Check: Barrel imports, unused deps
  → Solution: Direct imports, dynamic imports (Section 2)

🖥️ Slow SSR
  → Check: Server-side waterfalls, blocking queries
  → Solution: Parallel fetching, Streaming (Section 3)

🎨 UI jank / lag
  → Check: Layout thrashing, heavy rendering
  → Solution: Virtualization, next/image (Section 6)
```

---

## ✅ React/Next.js Checklist

**Before deploying:**

### Critical
- [ ] Server Components used where possible
- [ ] No barrel imports in app code
- [ ] Dynamic imports for heavy components (> 50KB)
- [ ] Parallel data fetching (no waterfalls)
- [ ] Images use `<Image>` with proper sizing

### High Priority
- [ ] Suspense boundaries for async data
- [ ] API routes optimized (no N+1 queries)
- [ ] Static generation where possible
- [ ] Bundle analyzer run (`@next/bundle-analyzer`)

### Medium Priority
- [ ] Expensive computations memoized
- [ ] List rendering virtualized (> 100 items)
- [ ] No unnecessary re-renders
- [ ] Error boundaries implemented

---

## 🔗 React/Next.js Specific Tools

| Tool | Purpose | Command |
|------|---------|---------|
| `@next/bundle-analyzer` | Analyze bundle composition | `ANALYZE=true npm run build` |
| React DevTools Profiler | Measure re-renders | Chrome extension |
| `next/image` | Automatic image optimization | Built-in component |
| `use cache` (Next 16+) | Cache component output | Directive |

---

## 📖 Related React Skills

| Need | Skill |
|------|-------|
| React patterns | `@[skills/clean-code]` (React section) |
| Testing React components | `@[skills/testing-patterns]` |
| React UI/UX | `@[skills/frontend-design]` |
| State management | `@[skills/state-management]` (coming soon) |

---

## 🎓 React Performance Learning Path

**Beginner:**
1. Read Section 1 (Waterfalls)
2. Read Section 2 (Bundle Size)
3. Learn Server vs Client Components

**Intermediate:**
1. Read Section 3 (SSR Performance)
2. Read Section 5 (Re-renders)
3. Apply memoization strategically

**Advanced:**
1. Read Section 8 (Advanced Patterns)
2. Read Section 9 (Cache Components - Next.js 16+)
3. Micro-optimize hot paths

---

**Source:** Vercel Engineering  
**Framework Version:** Next.js 13-16, React 18-19  
**Total Rules:** 58 React/Next.js-specific optimization patterns
