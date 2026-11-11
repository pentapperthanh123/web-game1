---
name: vue-nuxt-performance
framework: Vue / Nuxt
description: Vue 3 and Nuxt 3 specific performance optimization patterns
parent_skill: web-performance
---

# Vue / Nuxt Performance Optimization

> **Vue 3 + Nuxt 3 Best Practices** - 57 optimization rules prioritized by impact  
> **Parent Skill:** [web-performance](../SKILL.md) (Universal principles)

---

## 🎯 Vue/Nuxt Specific Optimizations

**This guide covers Vue 3 and Nuxt 3-specific patterns. For universal web performance principles, see the parent [web-performance skill](../SKILL.md).**

---

## 📑 Content Map

**Vue/Nuxt specific optimization topics:**

| Category | Impact | Rules | Focus Area |
|----------|--------|-------|------------|
| **Composition API** | 🔴 CRITICAL | 10 | Refs, reactive, computed, watch optimization |
| **Nuxt Server Features** | 🔴 CRITICAL | 9 | useFetch, useAsyncData, server routes |
| **Component Optimization** | 🟠 HIGH | 10 | v-memo, v-once, async components |
| **Bundle Optimization** | 🟠 HIGH | 7 | Auto-imports, tree-shaking, code splitting |
| **Reactivity System** | 🟡 MEDIUM | 9 | Deep reactivity, markRaw, Pinia stores |
| **SSR/SSG Patterns** | 🟡 MEDIUM | 6 | Payload, static generation, caching |
| **Image & Assets** | 🟡 MEDIUM | 4 | @nuxt/image, lazy loading, CDN |
| **Advanced Patterns** | 🔵 VARIABLE | 2 | Provide/inject, Suspense, error handling |

**Total: 57 Vue/Nuxt-specific rules**

---

## 🚀 Vue/Nuxt Quick Wins

### 1. Use Shallow Reactivity for Large Objects

```vue
<script setup>
import { reactive, shallowReactive, shallowRef } from 'vue';

// ❌ Deep reactivity overhead for large arrays
const items = reactive(largeArray); // All nested properties reactive

// ✅ Shallow reactivity (only top-level is reactive)
const items = shallowReactive(largeArray); // Much faster

// ✅ For primitives and arrays you replace entirely
const count = shallowRef(1000); // Faster than ref for simple values
</script>
```

**When to use:**
- Large lists/tables (> 100 items)
- Deep nested objects that don't change
- Read-only data structures

---

### 2. Nuxt useFetch vs useAsyncData

```vue
<script setup>
// ❌ Client-side only fetch
const { data } = await $fetch('/api/users');

// ✅ SSR + client hydration (best for initial data)
const { data } = await useFetch('/api/users');

// ✅ For non-fetch async operations
const { data } = await useAsyncData('users', () => fetchFromDatabase());

// ✅ Client-only fetch when needed
const { data } = await useFetch('/api/users', { server: false });
</script>
```

**Decision tree:**
- External API → `useFetch`
- Database query → `useAsyncData`
- Client-only → `$fetch` or `useFetch({ server: false })`

---

### 3. v-memo for Expensive Lists

```vue
<template>
  <!-- ❌ Re-renders all items on any change -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }} - {{ expensiveComputation(item) }}
  </div>

  <!-- ✅ Only re-renders when dependencies change -->
  <div 
    v-for="item in items" 
    :key="item.id"
    v-memo="[item.id, item.name]"
  >
    {{ item.name }} - {{ expensiveComputation(item) }}
  </div>
</template>
```

**Impact:** 50-70% reduction in re-renders for large lists

---

### 4. Computed vs Watch Performance

```vue
<script setup>
// ❌ Watch with side effects (triggers on every change)
const firstName = ref('John');
const lastName = ref('Doe');
const fullName = ref('');

watch([firstName, lastName], () => {
  fullName.value = `${firstName.value} ${lastName.value}`; // Inefficient
});

// ✅ Computed (lazy evaluation, cached)
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

// ❌ Watch without immediate (misses initial value)
watch(userId, (newId) => {
  fetchUser(newId);
}); // Doesn't run on mount

// ✅ Watch with immediate
watch(userId, (newId) => {
  fetchUser(newId);
}, { immediate: true });
</script>
```

---

### 5. Async Component Splitting

```vue
<script setup>
// ❌ Static import (increases initial bundle)
import HeavyChart from './components/HeavyChart.vue';

// ✅ Async component (code splitting)
const HeavyChart = defineAsyncComponent(() =>
  import('./components/HeavyChart.vue')
);

// ✅ With loading state
const HeavyChart = defineAsyncComponent({
  loader: () => import('./components/HeavyChart.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 3000
});
</script>
```

---

## 📊 Section 1: Composition API Optimization (10 rules)

### 1.1. Choose Right Reactivity Primitive

```vue
<script setup>
// Rule 1: ref() for primitives
const count = ref(0); // ✅

// Rule 2: reactive() for objects (NOT arrays)
const user = reactive({ name: 'John', age: 30 }); // ✅

// Rule 3: shallowRef() for large objects you replace entirely
const bigData = shallowRef([]); // ✅ Only .value is reactive
bigData.value = newBigArray; // Triggers reactivity

// Rule 4: shallowReactive() for large nested objects
const config = shallowReactive({ 
  theme: { colors: [...] }, // Only top-level reactive
  settings: { ... }
}); // ✅

// ❌ AVOID: reactive() for arrays (use ref instead)
const items = reactive([]); // Can cause issues with array methods
const items = ref([]); // ✅ Better
</script>
```

### 1.2. Computed Caching Best Practices

```vue
<script setup>
// Rule 5: Always use computed for derived state
const filteredItems = computed(() => 
  items.value.filter(item => item.active)
); // ✅ Cached, only re-runs when items change

// ❌ AVOID: Method calls in template (re-runs every render)
const getFilteredItems = () => items.value.filter(item => item.active);

// Rule 6: Computed with getter + setter for v-model
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value) => {
    [firstName.value, lastName.value] = value.split(' ');
  }
}); // ✅
</script>
```

### 1.3. Watch Performance

```vue
<script setup>
// Rule 7: Use watchEffect for multiple dependencies
watchEffect(() => {
  console.log(firstName.value, lastName.value); // ✅ Auto-tracks
});

// Rule 8: Use watch for specific dependencies
watch(userId, async (newId) => {
  // ✅ Only runs when userId changes
  user.value = await fetchUser(newId);
}, { immediate: true });

// Rule 9: Deep watch only when necessary
watch(user, (newUser) => {
  // ...
}, { deep: true }); // ⚠️ Expensive! Only if you need nested changes

// Rule 10: Use flush: 'post' for DOM access
watch(count, () => {
  // Access updated DOM
}, { flush: 'post' }); // ✅ Runs after DOM updates
</script>
```

---

## 📊 Section 2: Nuxt Server Features (9 rules)

### 2.1. Data Fetching Strategies

```vue
<script setup>
// Rule 11: useFetch for external APIs (SSR + client)
const { data: users } = await useFetch('/api/users', {
  key: 'users', // ✅ Cache key for deduplication
  transform: (data) => data.users, // ✅ Transform on server
  default: () => [] // ✅ Default value
});

// Rule 12: useAsyncData for custom async operations
const { data: posts } = await useAsyncData('posts', async () => {
  const response = await database.query('SELECT * FROM posts');
  return response.rows;
}, {
  server: true, // ✅ Run on server
  lazy: false // ✅ Block navigation until resolved
});

// Rule 13: Lazy data fetching (doesn't block navigation)
const { data, pending } = await useLazyFetch('/api/comments');
// ✅ Page renders immediately, data loads in background

// Rule 14: Parallel data fetching
const [users, posts, comments] = await Promise.all([
  useFetch('/api/users'),
  useFetch('/api/posts'),
  useFetch('/api/comments')
]); // ✅ Fetch all at once
</script>
```

### 2.2. Server Routes Optimization

```ts
// Rule 15: Use Nitro caching for expensive operations
// server/api/users.ts
export default defineEventHandler(async (event) => {
  return await useStorage('cache').getItem('users', async () => {
    // ✅ Cached for 1 hour
    const users = await database.query('SELECT * FROM users');
    return users;
  });
});

// Rule 16: Stream large responses
// server/api/export.ts
export default defineEventHandler(async (event) => {
  const stream = createReadStream('./large-file.csv');
  return sendStream(event, stream); // ✅ Memory efficient
});

// Rule 17: Use server middleware for auth checks
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  const token = getCookie(event, 'token');
  if (!token) throw createError({ statusCode: 401 });
  // ✅ Runs before routes
});
</script>
```

### 2.3. Hybrid Rendering

```ts
// Rule 18: Static generation for content pages
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/blog/**': { swr: 3600 }, // ✅ Cache for 1 hour
    '/admin/**': { ssr: false }, // ✅ Client-only
    '/products/**': { static: true } // ✅ Pre-render at build
  }
});

// Rule 19: Per-route ISR (Incremental Static Regeneration)
export default defineNuxtConfig({
  routeRules: {
    '/api/trending': { 
      swr: true, // ✅ Stale-while-revalidate
      cache: { maxAge: 60 } 
    }
  }
});
```

---

## 📊 Section 3: Component Optimization (10 rules)

### 3.1. Rendering Directives

```vue
<template>
  <!-- Rule 20: v-once for static content -->
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticDescription }}</p>
  </div>
  <!-- ✅ Renders once, never updates -->

  <!-- Rule 21: v-memo for conditional skips -->
  <div v-memo="[item.id, item.status]">
    {{ expensiveFormat(item) }}
  </div>
  <!-- ✅ Only re-renders when id or status changes -->

  <!-- Rule 22: Key on v-for ALWAYS -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
  <!-- ✅ Efficient diffing -->

  <!-- Rule 23: Avoid v-for with v-if (use computed instead) -->
  <!-- ❌ BAD: Filters on every render -->
  <div v-for="item in items" v-if="item.active">...</div>

  <!-- ✅ GOOD: Filter once -->
  <div v-for="item in activeItems" :key="item.id">...</div>
</template>

<script setup>
const activeItems = computed(() => items.value.filter(i => i.active));
</script>
```

### 3.2. Component Registration

```vue
<script setup>
// Rule 24: Use defineAsyncComponent for heavy components
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
);

// Rule 25: Nuxt auto-imports (no need to import)
// ✅ <MyComponent /> works without import (in components/ folder)

// Rule 26: Lazy hydration for below-the-fold content
<LazyMyComponent v-if="visible" />
// ✅ Nuxt auto-wraps with defineAsyncComponent

// Rule 27: Functional components for simple presentational components
const SimpleCard = (props) => {
  return h('div', { class: 'card' }, props.title);
}; // ✅ No instance overhead
</script>
```

### 3.3. Keep-Alive Strategy

```vue
<template>
  <!-- Rule 28: Keep-alive for tab views -->
  <KeepAlive :max="5">
    <component :is="currentTab" />
  </KeepAlive>
  <!-- ✅ Caches up to 5 components -->

  <!-- Rule 29: Include/exclude for selective caching -->
  <KeepAlive :include="['UserProfile', 'Dashboard']">
    <RouterView />
  </KeepAlive>
  <!-- ✅ Only cache specific routes -->
</template>
```

---

## 📊 Section 4: Bundle Optimization (7 rules)

### 4.1. Import Strategies

```vue
<script setup>
// Rule 30: Direct imports (avoid barrel exports)
// ❌ BAD: Imports entire lodash
import _ from 'lodash';

// ✅ GOOD: Import specific function
import debounce from 'lodash/debounce';

// Rule 31: Nuxt auto-imports for composables
// ✅ No need to import: ref, computed, watch, useRouter, etc.
const count = ref(0); // Just works

// Rule 32: Dynamic imports for routes
const routes = [
  {
    path: '/admin',
    component: () => import('./pages/Admin.vue') // ✅ Code split
  }
];
</script>
```

### 4.2. Build Configuration

```ts
// Rule 33: Configure auto-imports
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: ['composables/**', 'utils/**'] // ✅ Auto-import custom composables
  }
});

// Rule 34: Vite optimization
export default defineNuxtConfig({
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['vue', 'vue-router'],
            'ui': ['@headlessui/vue'] // ✅ Separate chunk for UI libs
          }
        }
      }
    }
  }
});

// Rule 35: Tree-shake unused Nuxt modules
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss', // ✅ Only add what you use
    // '@nuxt/image' // Remove if unused
  ]
});

// Rule 36: CSS optimization
export default defineNuxtConfig({
  css: ['~/assets/styles/main.css'],
  postcss: {
    plugins: {
      'cssnano': { preset: 'default' } // ✅ Minify CSS
    }
  }
});
```

---

## 📊 Section 5: Reactivity System (9 rules)

### 5.1. Reactivity Overhead

```vue
<script setup>
// Rule 37: markRaw for non-reactive data
import { markRaw } from 'vue';

const map = markRaw(new Map()); // ✅ Not reactive, faster
const thirdPartyLib = markRaw(heavyLibrary); // ✅

// Rule 38: Avoid deep reactivity for large datasets
const bigData = shallowRef([]); // ✅ Only .value is reactive

// Rule 39: Use effectScope for manual cleanup
import { effectScope } from 'vue';

const scope = effectScope();
scope.run(() => {
  watch(source, callback);
  watchEffect(() => {...});
});
// Later: scope.stop(); // ✅ Cleans up all watchers
</script>
```

### 5.2. Pinia Store Optimization

```ts
// Rule 40: Use Pinia store with getters caching
// stores/users.ts
export const useUserStore = defineStore('users', {
  state: () => ({
    users: [] as User[]
  }),
  getters: {
    activeUsers: (state) => state.users.filter(u => u.active), // ✅ Cached
    userById: (state) => (id: string) => state.users.find(u => u.id === id)
  },
  actions: {
    async fetchUsers() {
      this.users = await $fetch('/api/users');
    }
  }
});

// Rule 41: Lazy store initialization
const userStore = useUserStore();
// ✅ Only creates store when first accessed

// Rule 42: Pinia patch for batch updates
userStore.$patch({
  name: 'John',
  age: 30,
  email: 'john@example.com'
}); // ✅ Single reactivity trigger

// Rule 43: Pinia subscribe for side effects
userStore.$subscribe((mutation, state) => {
  localStorage.setItem('user', JSON.stringify(state));
}); // ✅ Efficient persistence

// Rule 44: Use storeToRefs for reactive destructuring
import { storeToRefs } from 'pinia';
const { users, activeUsers } = storeToRefs(userStore); // ✅ Keeps reactivity

// Rule 45: Reset store state
userStore.$reset(); // ✅ Resets to initial state
</script>
```

---

## 📊 Section 6: SSR/SSG Patterns (6 rules)

### 6.1. Payload Optimization

```vue
<script setup>
// Rule 46: Minimize payload size with pick/omit
const { data: user } = await useFetch('/api/user', {
  transform: (data) => ({
    id: data.id,
    name: data.name,
    // ✅ Only send what you need to client
    // Omit: createdAt, updatedAt, internalFields, etc.
  })
});

// Rule 47: Use lazy data for below-the-fold content
const { data: comments } = await useLazyFetch('/api/comments');
// ✅ Doesn't block initial render
</script>
```

### 6.2. Static Generation

```ts
// Rule 48: Pre-render static routes
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      routes: ['/about', '/contact', '/blog/post-1'] // ✅ Generate at build
    }
  }
});

// Rule 49: Use SWR for frequently updated content
export default defineNuxtConfig({
  routeRules: {
    '/api/stats': { 
      swr: 60, // ✅ Cache for 60 seconds, revalidate in background
      cache: { maxAge: 60 }
    }
  }
});

// Rule 50: Cache headers for CDN
// server/api/products.ts
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return products; // ✅ CDN caches for 1 hour
});

// Rule 51: Use Nuxt useHead for SEO (avoid client-side meta)
useHead({
  title: 'Page Title',
  meta: [{ name: 'description', content: 'Page description' }]
}); // ✅ Rendered on server
</script>
```

---

## 📊 Section 7: Image & Assets (4 rules)

```vue
<script setup>
// Rule 52: Use @nuxt/image for optimization
import { } from '#imports';
</script>

<template>
  <!-- ❌ Regular img tag -->
  <img src="/hero.jpg" alt="Hero" />

  <!-- ✅ Nuxt Image with optimization -->
  <NuxtImg
    src="/hero.jpg"
    alt="Hero"
    width="1200"
    height="600"
    loading="lazy"
    format="webp"
    quality="80"
  />
  <!-- Generates multiple formats: WebP, AVIF, fallback -->

  <!-- Rule 53: Use <NuxtPicture> for art direction -->
  <NuxtPicture
    src="/hero.jpg"
    :img-attrs="{ alt: 'Hero' }"
    sizes="sm:100vw md:50vw lg:400px"
  />
  <!-- ✅ Responsive images with srcset -->

  <!-- Rule 54: Lazy load images below fold -->
  <NuxtImg src="/below-fold.jpg" loading="lazy" />
  <!-- ✅ Loads when near viewport -->

  <!-- Rule 55: Preload critical images -->
  <NuxtImg src="/hero.jpg" preload />
  <!-- ✅ Loads immediately for LCP -->
</template>
```

---

## 📊 Section 8: Advanced Patterns (2 rules)

```vue
<script setup>
// Rule 56: Provide/Inject for deep prop drilling
// Parent
provide('theme', readonly(theme)); // ✅ Provide to descendants

// Child (any level deep)
const theme = inject('theme'); // ✅ No prop drilling

// Rule 57: Suspense for async components
</script>

<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
  <!-- ✅ Handles async setup() -->
</template>
```

---

## ✅ Vue/Nuxt Checklist

**Before deploying:**

### Critical
- [ ] Use `useFetch`/`useAsyncData` instead of client-only fetch
- [ ] Large objects use `shallowReactive`/`shallowRef`
- [ ] Heavy components use `defineAsyncComponent`
- [ ] v-for always has `:key`
- [ ] Images use `<NuxtImg>` with lazy loading

### High Priority
- [ ] Computed used instead of methods for derived state
- [ ] No deep watchers unless necessary
- [ ] v-memo on expensive list items
- [ ] Direct imports (no barrel exports)
- [ ] Pinia stores for global state

### Medium Priority
- [ ] Static routes pre-rendered
- [ ] Route-level caching configured
- [ ] Keep-alive for tab views
- [ ] markRaw for third-party libs

---

## 🔗 Vue/Nuxt Specific Tools

| Tool | Purpose | Command |
|------|---------|---------|
| Nuxt DevTools | Performance profiling | `npx nuxi devtools enable` |
| Vue DevTools | Component inspection | Browser extension |
| `vite-bundle-visualizer` | Bundle analysis | `npx vite-bundle-visualizer` |
| `nuxi analyze` | Bundle size breakdown | `npx nuxi analyze` |

---

## 📖 Related Vue Skills

| Need | Skill |
|------|-------|
| Vue patterns | `@[skills/clean-code]` (Vue section) |
| Testing Vue components | `@[skills/testing-patterns]` |
| Vue UI/UX | `@[skills/frontend-design]` |

---

## 🎓 Vue/Nuxt Performance Learning Path

**Beginner:**
1. Read Section 1 (Composition API)
2. Read Section 2 (Nuxt Server Features)
3. Learn useFetch vs useAsyncData

**Intermediate:**
1. Read Section 3 (Component Optimization)
2. Read Section 5 (Reactivity System)
3. Implement Pinia stores

**Advanced:**
1. Read Section 6 (SSR/SSG Patterns)
2. Configure hybrid rendering
3. Optimize bundle size

---

**Framework Version:** Vue 3.3+, Nuxt 3.8+  
**Total Rules:** 57 Vue/Nuxt-specific optimization patterns
