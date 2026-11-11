---
name: svelte-kit-performance
framework: Svelte / SvelteKit
description: Svelte and SvelteKit specific performance optimization patterns
parent_skill: web-performance
---

# Svelte / SvelteKit Performance Optimization

> **Svelte 4+ & SvelteKit Best Practices** - 53 optimization rules prioritized by impact  
> **Parent Skill:** [web-performance](../SKILL.md) (Universal principles)

---

## 🎯 Svelte/SvelteKit Specific Optimizations

**This guide covers Svelte and SvelteKit-specific patterns. For universal web performance principles, see the parent [web-performance skill](../SKILL.md).**

---

## 📑 Content Map

**Svelte/SvelteKit specific optimization topics:**

| Category | Impact | Rules | Focus Area |
|----------|--------|-------|------------|
| **Svelte Reactivity** | 🔴 CRITICAL | 10 | Reactive statements, stores, context |
| **Component Optimization** | 🔴 CRITICAL | 9 | Keyed each, event modifiers, slots |
| **SvelteKit Load Functions** | 🟠 HIGH | 8 | +page.js vs +page.server.js, streaming |
| **Bundle Optimization** | 🟠 HIGH | 7 | Code splitting, tree-shaking, CSS |
| **Server-Side Performance** | 🟡 MEDIUM | 7 | Hooks, API routes, database queries |
| **Rendering Strategies** | 🟡 MEDIUM | 6 | SSR, SSG, CSR, adapters |
| **Transitions & Animations** | 🟡 MEDIUM | 4 | Motion, deferred transitions |
| **Advanced Patterns** | 🔵 VARIABLE | 2 | Module context, error boundaries |

**Total: 53 Svelte/SvelteKit-specific rules**

---

## 🚀 Svelte/SvelteKit Quick Wins

### 1. Keyed Each Blocks (Critical)

```svelte
<!-- ❌ Unkeyed each (inefficient diffing) -->
{#each items as item}
  <div>{item.name}</div>
{/each}

<!-- ✅ Keyed each (efficient reconciliation) -->
{#each items as item (item.id)}
  <div>{item.name}</div>
{/each}

<!-- ✅ With index when needed -->
{#each items as item, index (item.id)}
  <div>{index}: {item.name}</div>
{/each}
```

**Impact:** 60-80% faster updates for large lists

---

### 2. Event Modifiers for Performance

```svelte
<script>
  // ❌ Manual event listener management
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<!-- ❌ Without modifiers -->
<button on:click={handleClick}>Click</button>

<!-- ✅ Use built-in modifiers -->
<button on:click|preventDefault|stopPropagation={handler}>Click</button>

<!-- ✅ Passive for scroll performance -->
<div on:scroll|passive={handleScroll}>...</div>

<!-- ✅ Once for single-fire events -->
<button on:click|once={initialize}>Initialize</button>

<!-- ✅ Capture for event delegation -->
<div on:click|capture={handleCapture}>...</div>
```

---

### 3. SvelteKit Load Functions (SSR vs Client)

```ts
// +page.server.ts (Server-only)
// ✅ Use for: Database queries, API secrets, server-side auth
export async function load({ params, fetch }) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [params.id]);
  return { user }; // ✅ Secure, never exposed to client
}

// +page.ts (Universal)
// ✅ Use for: Public APIs, client-side hydration
export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.id}`);
  return { post: await res.json() }; // ✅ Runs on server + client
}

// +page.svelte
<script>
  export let data; // ✅ Type-safe data from load
</script>

<h1>{data.user.name}</h1>
```

---

### 4. Derived Stores (Lazy Computation)

```js
import { writable, derived } from 'svelte/store';

// Base stores
const firstName = writable('John');
const lastName = writable('Doe');

// ❌ Manual subscription (inefficient)
let fullName = '';
firstName.subscribe(f => {
  lastName.subscribe(l => {
    fullName = `${f} ${l}`;
  });
});

// ✅ Derived store (automatic, lazy)
const fullName = derived(
  [firstName, lastName],
  ([$firstName, $lastName]) => `${$firstName} ${$lastName}`
); // Only recomputes when dependencies change
```

---

### 5. Code Splitting with Dynamic Imports

```svelte
<script>
  // ❌ Static import (increases initial bundle)
  import HeavyChart from './HeavyChart.svelte';

  // ✅ Dynamic import
  let HeavyChart;
  let showChart = false;

  async function loadChart() {
    HeavyChart = (await import('./HeavyChart.svelte')).default;
    showChart = true;
  }
</script>

<button on:click={loadChart}>Load Chart</button>
{#if showChart}
  <svelte:component this={HeavyChart} />
{/if}
```

---

## 📊 Section 1: Svelte Reactivity (10 rules)

### 1.1. Reactive Statements

```svelte
<script>
  // Rule 1: Use reactive statements for derived values
  let count = 0;
  $: doubled = count * 2; // ✅ Auto-updates when count changes

  // Rule 2: Multiple statements in one reactive block
  $: {
    console.log(`Count is ${count}`);
    document.title = `Count: ${count}`;
  } // ✅ Runs together

  // Rule 3: Reactive if statements
  $: if (count > 10) {
    console.log('Count exceeded 10');
  } // ✅ Only runs when count > 10

  // Rule 4: Avoid expensive operations in reactive statements
  // ❌ BAD: Runs on every reactivity trigger
  $: result = expensiveComputation(data);

  // ✅ GOOD: Only run when specific dependency changes
  $: result = data.length > 0 ? expensiveComputation(data) : null;
</script>
```

### 1.2. Store Patterns

```js
// Rule 5: Writable stores for simple state
import { writable } from 'svelte/store';
export const count = writable(0);

// Rule 6: Readable stores for read-only state
import { readable } from 'svelte/store';
export const time = readable(new Date(), (set) => {
  const interval = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(interval); // ✅ Cleanup
});

// Rule 7: Derived stores for computed values
import { derived } from 'svelte/store';
export const elapsed = derived(time, ($time) => 
  $time - startTime
); // ✅ Lazy, cached

// Rule 8: Custom stores with methods
function createCounter() {
  const { subscribe, set, update } = writable(0);
  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1),
    reset: () => set(0)
  }; // ✅ Encapsulated logic
}

// Rule 9: Store subscriptions cleanup
import { onDestroy } from 'svelte';
const unsubscribe = count.subscribe(value => {
  console.log(value);
});
onDestroy(unsubscribe); // ✅ Prevent memory leaks

// Rule 10: Use $store syntax (auto-subscribes)
<script>
  import { count } from './stores';
  // $count is auto-subscribed, auto-cleaned up
</script>
<div>{$count}</div> <!-- ✅ Automatic reactivity -->
```

---

## 📊 Section 2: Component Optimization (9 rules)

### 2.1. List Rendering

```svelte
<!-- Rule 11: Always key each blocks -->
{#each items as item (item.id)}
  <div>{item.name}</div>
{/each}

<!-- Rule 12: Use else block for empty states -->
{#each items as item (item.id)}
  <div>{item.name}</div>
{:else}
  <p>No items found</p>
{/each}

<!-- Rule 13: Destructure in each for clarity -->
{#each users as { id, name, email } (id)}
  <UserCard {name} {email} />
{/each}
```

### 2.2. Event Handling

```svelte
<script>
  // Rule 14: Use event modifiers instead of manual handling
</script>

<!-- ✅ preventDefault -->
<form on:submit|preventDefault={handleSubmit}>

<!-- ✅ stopPropagation -->
<button on:click|stopPropagation={handler}>

<!-- ✅ once (auto-removes listener) -->
<button on:click|once={initialize}>

<!-- ✅ passive (better scroll performance) -->
<div on:scroll|passive={onScroll}>

<!-- ✅ capture (event capturing phase) -->
<div on:click|capture={handleCapture}>

<!-- ✅ self (only if event.target is element itself) -->
<div on:click|self={handler}>

<!-- Rule 15: Component events use createEventDispatcher -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  function notify() {
    dispatch('message', { text: 'Hello' }); // ✅ Type-safe
  }
</script>
```

### 2.3. Slots & Props

```svelte
<!-- Rule 16: Named slots for flexible layouts -->
<!-- Parent.svelte -->
<Card>
  <svelte:fragment slot="header">
    <h1>Title</h1>
  </svelte:fragment>
  <p>Content</p>
  <svelte:fragment slot="footer">
    <button>Action</button>
  </svelte:fragment>
</Card>

<!-- Card.svelte -->
<div class="card">
  <header><slot name="header" /></header>
  <main><slot /></main>
  <footer><slot name="footer" /></footer>
</div>

<!-- Rule 17: Slot props for data passing -->
<!-- List.svelte -->
<ul>
  {#each items as item (item.id)}
    <li><slot {item} /></li>
  {/each}
</ul>

<!-- Usage -->
<List {items} let:item>
  <span>{item.name}</span>
</List>

<!-- Rule 18: Default slot content -->
<slot>
  <p>Default content if no slot provided</p>
</slot>

<!-- Rule 19: $$props and $$restProps for prop forwarding -->
<script>
  export let class = '';
  // $$restProps contains all other props
</script>
<div class={class} {...$$restProps}>
  <slot />
</div>
```

---

## 📊 Section 3: SvelteKit Load Functions (8 rules)

### 3.1. Load Function Strategies

```ts
// Rule 20: Use +page.server.ts for sensitive data
// +page.server.ts
export async function load({ params, locals }) {
  const user = await db.users.findUnique({ 
    where: { id: params.id } 
  });
  
  // ✅ API keys, database credentials never exposed
  return { user };
}

// Rule 21: Use +page.ts for public data (runs on both server + client)
// +page.ts
export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.id}`);
  return { post: await res.json() }; // ✅ Hydrates on client
}

// Rule 22: Parallel data loading
export async function load({ fetch }) {
  const [posts, users, comments] = await Promise.all([
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/users').then(r => r.json()),
    fetch('/api/comments').then(r => r.json())
  ]);
  return { posts, users, comments }; // ✅ Faster
}

// Rule 23: Conditional loading
export async function load({ params, parent }) {
  const parentData = await parent(); // ✅ Access parent layout data
  
  if (parentData.user?.isAdmin) {
    const adminData = await fetch('/api/admin').then(r => r.json());
    return { ...parentData, adminData };
  }
  
  return parentData;
}
```

### 3.2. Load Dependencies & Caching

```ts
// Rule 24: Declare dependencies for invalidation
export async function load({ depends, fetch }) {
  depends('posts:list'); // ✅ Custom dependency
  
  const posts = await fetch('/api/posts').then(r => r.json());
  return { posts };
}

// Invalidate from anywhere:
import { invalidate } from '$app/navigation';
await invalidate('posts:list'); // ✅ Re-runs load

// Rule 25: Use setHeaders for caching
export async function load({ setHeaders }) {
  setHeaders({
    'cache-control': 'max-age=3600' // ✅ Cache for 1 hour
  });
  
  return { data: await fetchData() };
}

// Rule 26: Streaming with promises
export async function load() {
  return {
    post: await fetchPost(), // ✅ Wait for critical data
    comments: fetchComments() // ✅ Stream in later (Promise)
  };
}

// In component:
<script>
  export let data;
</script>

<h1>{data.post.title}</h1>

{#await data.comments}
  <p>Loading comments...</p>
{:then comments}
  {#each comments as comment}
    <p>{comment.text}</p>
  {/each}
{/await}

// Rule 27: Error handling
export async function load({ params }) {
  const post = await db.posts.findUnique({ 
    where: { id: params.id } 
  });
  
  if (!post) {
    throw error(404, 'Post not found'); // ✅ SvelteKit error
  }
  
  return { post };
}
```

---

## 📊 Section 4: Bundle Optimization (7 rules)

### 4.1. Import Strategies

```js
// Rule 28: Direct imports (avoid barrel exports)
// ❌ BAD
import { Button, Card, Modal } from './components';

// ✅ GOOD
import Button from './components/Button.svelte';
import Card from './components/Card.svelte';

// Rule 29: Dynamic imports for code splitting
const HeavyComponent = await import('./Heavy.svelte');

// Rule 30: Vite's ?url import for assets
import imageUrl from './image.png?url'; // ✅ Returns URL string

// Rule 31: ?raw for text content
import styles from './styles.css?raw'; // ✅ Returns raw string
```

### 4.2. Build Configuration

```js
// Rule 32: Configure Vite for optimal chunks
// svelte.config.js
export default {
  kit: {
    vite: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['svelte', '@sveltejs/kit'],
              'ui': ['./src/lib/components']
            }
          }
        }
      }
    }
  }
};

// Rule 33: CSS code splitting (automatic per-route)
// SvelteKit automatically splits CSS per route ✅

// Rule 34: Tree-shaking unused code
// Ensure side-effect-free packages in package.json:
{
  "sideEffects": false // ✅ Enables aggressive tree-shaking
}
```

---

## 📊 Section 5: Server-Side Performance (7 rules)

### 5.1. Hooks & Middleware

```ts
// Rule 35: Use hooks.server.ts for global middleware
// src/hooks.server.ts
export async function handle({ event, resolve }) {
  const start = Date.now();
  
  // ✅ Auth check
  event.locals.user = await getUser(event.cookies.get('session'));
  
  const response = await resolve(event);
  
  // ✅ Timing header
  response.headers.set('x-response-time', `${Date.now() - start}ms`);
  
  return response;
}

// Rule 36: Use handleFetch for external API customization
export async function handleFetch({ request, fetch }) {
  // ✅ Add auth headers to all external fetches
  if (request.url.startsWith('https://api.example.com')) {
    request.headers.set('Authorization', `Bearer ${API_KEY}`);
  }
  
  return fetch(request);
}
```

### 5.2. API Routes

```ts
// Rule 37: Use +server.ts for API routes
// src/routes/api/users/+server.ts
export async function GET({ url }) {
  const limit = url.searchParams.get('limit') ?? '10';
  const users = await db.users.findMany({ 
    take: parseInt(limit) 
  });
  
  return json(users); // ✅ Auto JSON response
}

// Rule 38: Stream large responses
import { readable } from 'svelte/store';

export async function GET() {
  const stream = readable((set) => {
    // ✅ Stream data in chunks
    fetchDataInChunks((chunk) => set(chunk));
  });
  
  return new Response(stream); // ✅ Memory efficient
}

// Rule 39: Use RequestEvent.locals for shared data
export async function GET({ locals }) {
  // ✅ Access user from hooks
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }
  
  return json({ user: locals.user });
}

// Rule 40: Database query optimization
export async function GET() {
  // ❌ N+1 query problem
  const users = await db.users.findMany();
  for (const user of users) {
    user.posts = await db.posts.findMany({ where: { userId: user.id } });
  }
  
  // ✅ Use include/join
  const users = await db.users.findMany({
    include: { posts: true } // Single query
  });
  
  return json(users);
}

// Rule 41: Cache expensive operations
import { cachified } from '@epic-web/cachified';

export async function GET() {
  const data = await cachified({
    key: 'expensive-data',
    cache: lruCache,
    ttl: 3600_000, // 1 hour
    getFreshValue: () => expensiveOperation()
  });
  
  return json(data); // ✅
}
```

---

## 📊 Section 6: Rendering Strategies (6 rules)

### 6.1. SSR, SSG, CSR Selection

```js
// Rule 42: SSR (default) - Dynamic content
// +page.svelte (no special config)
// ✅ Renders on server for each request

// Rule 43: SSG - Static pages
// +page.js
export const prerender = true; // ✅ Pre-render at build time

// Rule 44: CSR - Client-only (no SSR)
// +page.js
export const ssr = false; // ✅ Only renders on client

// Rule 45: Hybrid rendering per route
// +page.js
export const prerender = true;
export const ssr = false; // ✅ Pre-render but no SSR after
```

### 6.2. Adapter Selection

```js
// Rule 46: Choose right adapter
// svelte.config.js

// ✅ Static sites (SSG only)
import adapter from '@sveltejs/adapter-static';

// ✅ Node.js servers
import adapter from '@sveltejs/adapter-node';

// ✅ Vercel/Netlify (edge functions)
import adapter from '@sveltejs/adapter-vercel';

// ✅ Cloudflare Workers
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter()
  }
};

// Rule 47: Configure prerendering
export default {
  kit: {
    adapter: adapter(),
    prerender: {
      entries: ['/', '/about', '/blog/*'], // ✅ Prerender these
      crawl: true, // ✅ Auto-discover links
      default: true // ✅ Prerender by default
    }
  }
};
```

---

## 📊 Section 7: Transitions & Animations (4 rules)

### 7.1. Built-in Transitions

```svelte
<script>
  import { fade, fly, slide, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  let visible = false;
</script>

<!-- Rule 48: Use built-in transitions -->
{#if visible}
  <div transition:fade={{ duration: 300 }}>
    Content
  </div>
{/if}

<!-- Rule 49: Directional transitions (in/out) -->
{#if visible}
  <div 
    in:fly={{ y: -50, duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    Different in/out animations
  </div>
{/if}

<!-- Rule 50: Local transitions (only when directly toggled) -->
{#if visible}
  <div transition:fade|local>
    Only animates when this element toggles
  </div>
{/if}
```

### 7.2. Performance Considerations

```svelte
<script>
  import { tweened } from 'svelte/motion';
  
  // Rule 51: Use tweened for smooth value transitions
  const progress = tweened(0, {
    duration: 400,
    easing: quintOut
  });
  
  // ✅ Smooth animation
  function updateProgress() {
    $progress = 100; // Animates from current to 100
  }
</script>

<!-- Rule 52: Deferred transitions for performance -->
<script>
  import { crossfade } from 'svelte/transition';
  const [send, receive] = crossfade({
    duration: 300
  });
</script>

{#each items as item (item.id)}
  <div in:receive={{ key: item.id }} out:send={{ key: item.id }}>
    {item.name}
  </div>
{/each}
<!-- ✅ Smooth item movement between lists -->
```

---

## 📊 Section 8: Advanced Patterns (2 rules)

```svelte
<script context="module">
  // Rule 53: Module context for shared state
  let count = 0; // ✅ Shared across all instances
  
  export function getCount() {
    return count;
  }
</script>

<script>
  // Rule 54: Component context for prop passing
  import { setContext, getContext } from 'svelte';
  
  // Parent
  setContext('theme', {
    color: 'blue',
    mode: 'dark'
  });
  
  // Child (any depth)
  const theme = getContext('theme'); // ✅ No prop drilling
</script>
```

---

## ✅ Svelte/SvelteKit Checklist

**Before deploying:**

### Critical
- [ ] All `{#each}` blocks have `(key)` expressions
- [ ] Load functions use `+page.server.ts` for sensitive data
- [ ] Heavy components use dynamic imports
- [ ] Events use modifiers (preventDefault, passive, etc.)
- [ ] Stores cleaned up with onDestroy or $syntax

### High Priority
- [ ] Parallel data loading in load functions
- [ ] Reactive statements optimized (not overly broad)
- [ ] Route-level prerendering configured
- [ ] Bundle analyzed for size
- [ ] Correct adapter selected

### Medium Priority
- [ ] Transitions use `|local` when appropriate
- [ ] Custom stores for complex state
- [ ] Context API for deep props
- [ ] Error boundaries implemented

---

## 🔗 Svelte/SvelteKit Specific Tools

| Tool | Purpose | Command |
|------|---------|---------|
| `vite-plugin-visualizer` | Bundle analysis | `npm install -D rollup-plugin-visualizer` |
| Svelte DevTools | Component inspection | Browser extension |
| `@sveltejs/kit/vite` | Built-in dev tools | Included |
| `svelte-check` | Type checking | `npx svelte-check` |

---

## 📖 Related Svelte Skills

| Need | Skill |
|------|-------|
| Svelte patterns | `@[skills/clean-code]` (Svelte section) |
| Testing Svelte components | `@[skills/testing-patterns]` |
| Svelte UI/UX | `@[skills/frontend-design]` |

---

## 🎓 Svelte/SvelteKit Performance Learning Path

**Beginner:**
1. Read Section 1 (Reactivity)
2. Read Section 2 (Component Optimization)
3. Learn keyed each blocks + event modifiers

**Intermediate:**
1. Read Section 3 (Load Functions)
2. Read Section 5 (Server-Side Performance)
3. Master stores and context

**Advanced:**
1. Read Section 6 (Rendering Strategies)
2. Configure hybrid rendering
3. Optimize bundle size

---

**Framework Version:** Svelte 4+, SvelteKit 2+  
**Total Rules:** 53 Svelte/SvelteKit-specific optimization patterns
