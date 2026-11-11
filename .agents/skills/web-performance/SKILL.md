---
name: web-performance
description: Universal web performance optimization principles and framework-specific patterns
when_to_use: "When optimizing web application performance, Core Web Vitals, page load speed, or framework rendering. NOT for general UI design."
category: performance
frameworks: react, vue, svelte, angular, solid, qwik, astro
---

# Web Performance Optimization

> **Framework-Agnostic Performance Principles** + **Framework-Specific Patterns**  
> Covers universal web performance + React/Vue/Svelte optimizations

---

## 🎯 How This Skill Works

This skill uses **auto-detection** to load framework-specific optimizations:

```
1. Detect framework → Run python .agents/scripts/detect_framework.py
2. Load universal principles → Read this file
3. Load framework patterns → frameworks/{framework}.md
```

---

## 📑 Framework Detection

**Supported frameworks and their skill files:**

| Framework | Skill File | Key Features |
|-----------|-----------|--------------|
| **React / Next.js** | [frameworks/react-next.md](frameworks/react-next.md) | Server Components, useMemo, next/image, RSC |
| **Vue / Nuxt** | [frameworks/vue-nuxt.md](frameworks/vue-nuxt.md) | Composition API, useFetch, Pinia stores, v-memo |
| **Svelte / SvelteKit** | [frameworks/svelte-kit.md](frameworks/svelte-kit.md) | Reactive statements, stores, load functions, keyed each |
| **Angular** | [frameworks/angular.md](frameworks/angular.md) | OnPush, TrackBy, lazy modules *(placeholder)* |
| **Solid** | [frameworks/solid.md](frameworks/solid.md) | Fine-grained reactivity *(placeholder)* |
| **Qwik** | [frameworks/qwik.md](frameworks/qwik.md) | Resumability patterns *(placeholder)* |
| **Astro** | [frameworks/astro.md](frameworks/astro.md) | Island architecture *(placeholder)* |

**To detect your framework:**

```bash
python .agents/scripts/detect_framework.py .
```

---

## 🌐 Universal Web Performance Principles

**These principles apply to ALL frameworks. Master these first.**

---

### 1. Critical Rendering Path (CRP)

**The browser's render pipeline:**

```
HTML Parse → DOM → CSSOM → Render Tree → Layout → Paint → Composite
```

**Optimization strategies:**

1. **Minimize parser-blocking resources:**
   ```html
   <!-- ❌ Blocks rendering -->
   <script src="app.js"></script>
   
   <!-- ✅ Async (doesn't block parser) -->
   <script src="app.js" async></script>
   
   <!-- ✅ Defer (executes after HTML parsed) -->
   <script src="app.js" defer></script>
   ```

2. **Inline critical CSS:**
   ```html
   <head>
     <style>
       /* ✅ Inline critical above-the-fold CSS */
       .hero { display: flex; height: 100vh; }
     </style>
     <!-- ✅ Load full CSS async -->
     <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
   </head>
   ```

3. **Preload critical resources:**
   ```html
   <link rel="preload" href="/hero-image.webp" as="image">
   <link rel="preload" href="/font.woff2" as="font" crossorigin>
   ```

---

### 2. Resource Loading Optimization

**Priority order:**

```
Critical Path:
1. HTML document
2. Critical CSS (above-the-fold)
3. Critical fonts
4. Critical images (LCP)
5. Critical JavaScript

Deferred:
6. Non-critical CSS
7. Non-critical JavaScript
8. Below-the-fold images
9. Analytics scripts
```

**Techniques:**

```html
<!-- ✅ Preconnect to external domains -->
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- ✅ Prefetch next-page resources -->
<link rel="prefetch" href="/next-page.js">

<!-- ✅ Lazy load images -->
<img src="image.jpg" loading="lazy" alt="Description">
```

---

### 3. Bundle Optimization

**Core principles:**

1. **Code Splitting:**
   - Split by route (page-level chunks)
   - Split by component (dynamic imports)
   - Split vendor code (separate chunk)

2. **Tree Shaking:**
   ```js
   // ❌ Imports entire lodash (~70KB)
   import _ from 'lodash';
   
   // ✅ Import only what you need
   import debounce from 'lodash/debounce';
   ```

3. **Dead Code Elimination:**
   - Remove unused imports
   - Remove console.log in production
   - Use production builds

4. **Bundle Size Targets:**
   ```
   Initial JS bundle: < 200KB (gzipped)
   Each route chunk:  < 100KB (gzipped)
   Total page weight: < 1MB (uncompressed)
   ```

---

### 4. Network Waterfall Optimization

**Eliminate sequential requests:**

```js
// ❌ Waterfall (sequential)
async function loadData() {
  const user = await fetch('/api/user');
  const posts = await fetch(`/api/posts/${user.id}`); // Waits for user
  const comments = await fetch(`/api/comments/${posts[0].id}`); // Waits for posts
}

// ✅ Parallel (when possible)
async function loadData() {
  const [user, posts, comments] = await Promise.all([
    fetch('/api/user'),
    fetch('/api/posts'),
    fetch('/api/comments')
  ]);
}
```

**Use HTTP/2 multiplexing:**
- Multiple requests over single connection
- No head-of-line blocking
- Server push (if supported)

---

### 5. Image Optimization

**Universal best practices:**

1. **Format selection:**
   ```
   Modern browsers: WebP or AVIF (50-80% smaller than JPEG)
   Fallback: JPEG for photos, PNG for graphics
   SVG: For logos/icons
   ```

2. **Responsive images:**
   ```html
   <picture>
     <source srcset="image.avif" type="image/avif">
     <source srcset="image.webp" type="image/webp">
     <img src="image.jpg" alt="Description">
   </picture>
   ```

3. **Lazy loading:**
   ```html
   <!-- ✅ Native lazy loading -->
   <img src="image.jpg" loading="lazy" alt="Description">
   
   <!-- ✅ Priority for LCP images -->
   <img src="hero.jpg" loading="eager" fetchpriority="high" alt="Hero">
   ```

4. **Sizing:**
   ```html
   <!-- ✅ Always specify dimensions (prevent CLS) -->
   <img src="image.jpg" width="800" height="600" alt="Description">
   ```

---

### 6. Core Web Vitals

**Google's user experience metrics:**

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Loading performance |
| **FID** (First Input Delay) | < 100ms | Interactivity (replaced by INP) |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability |

**Optimization strategies:**

**LCP Optimization:**
```html
<!-- ✅ Preload LCP image -->
<link rel="preload" as="image" href="/hero.jpg" fetchpriority="high">

<!-- ✅ Server-side rendering -->
<!-- Render critical HTML on server, not client -->
```

**INP Optimization:**
```js
// ✅ Break up long tasks (yield to main thread)
async function processItems(items) {
  for (const item of items) {
    processItem(item);
    
    // Yield every 50ms to keep UI responsive
    if (performance.now() - startTime > 50) {
      await new Promise(resolve => setTimeout(resolve, 0));
      startTime = performance.now();
    }
  }
}
```

**CLS Optimization:**
```html
<!-- ✅ Reserve space for dynamic content -->
<div style="min-height: 400px;">
  <!-- Content loads here -->
</div>

<!-- ✅ Size images -->
<img src="..." width="800" height="600" alt="...">
```

---

### 7. JavaScript Performance

**Universal patterns:**

1. **Debounce/Throttle expensive operations:**
   ```js
   // ✅ Debounce search input
   const debouncedSearch = debounce((query) => {
     fetch(`/api/search?q=${query}`);
   }, 300);
   
   // ✅ Throttle scroll handler
   const throttledScroll = throttle(() => {
     updateScrollPosition();
   }, 100);
   ```

2. **Virtualize long lists:**
   ```
   Don't render 10,000 DOM nodes
   → Use virtual scrolling (render only visible items)
   ```

3. **Avoid layout thrashing:**
   ```js
   // ❌ Read-write-read-write (causes reflows)
   elements.forEach(el => {
     const height = el.offsetHeight; // Read (reflow)
     el.style.height = height + 10 + 'px'; // Write
   });
   
   // ✅ Batch reads, then batch writes
   const heights = elements.map(el => el.offsetHeight); // Batch reads
   elements.forEach((el, i) => {
     el.style.height = heights[i] + 10 + 'px'; // Batch writes
   });
   ```

4. **Use Web Workers for heavy computation:**
   ```js
   // ✅ Offload to worker thread
   const worker = new Worker('worker.js');
   worker.postMessage({ data: largeDataset });
   worker.onmessage = (e) => {
     console.log('Result:', e.data);
   };
   ```

---

### 8. Caching Strategies

**HTTP caching:**

```
Cache-Control: max-age=31536000, immutable   // Static assets (hashed filenames)
Cache-Control: max-age=3600, must-revalidate // Dynamic content (1 hour)
Cache-Control: no-cache                       // Always revalidate
```

**Service Workers (offline caching):**

```js
// Cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request).then(response => 
        response || fetch(event.request)
      )
    );
  }
});
```

---

### 9. Performance Monitoring

**Tools:**

| Tool | Purpose |
|------|---------|
| **Lighthouse** | Automated audits (CWV, accessibility) |
| **WebPageTest** | Detailed waterfall analysis |
| **Chrome DevTools** | Profiling, network, performance |
| **Real User Monitoring (RUM)** | Production performance data |

**Metrics to track:**

- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

---

## 🎯 Framework-Specific Optimizations

**After mastering universal principles, dive into framework-specific patterns:**

### React / Next.js → [frameworks/react-next.md](frameworks/react-next.md)
- Server Components
- useMemo, useCallback
- next/image
- Bundle optimization

### Vue / Nuxt → [frameworks/vue-nuxt.md](frameworks/vue-nuxt.md)
- Composition API optimization
- useFetch, useAsyncData
- v-memo, v-once
- Pinia stores

### Svelte / SvelteKit → [frameworks/svelte-kit.md](frameworks/svelte-kit.md)
- Reactive statements
- Keyed each blocks
- Load functions
- Svelte stores

---

## 🛠 Performance Audit Workflow

**Follow this order:**

```
1. Measure baseline
   ↓
2. Apply universal optimizations (this file)
   ↓
3. Apply framework-specific optimizations (frameworks/*.md)
   ↓
4. Measure again
   ↓
5. Iterate on bottlenecks
```

---

## 📖 Related Skills

| Need | Skill |
|------|-------|
| Frontend design | `@[skills/frontend-design]` |
| Clean code | `@[skills/clean-code]` |
| Testing | `@[skills/testing-patterns]` |
| Deployment | `@[skills/deployment-procedures]` |

---

## 🎓 Learning Path

**Beginner:**
1. Master CRP (Critical Rendering Path)
2. Learn image optimization
3. Understand Core Web Vitals

**Intermediate:**
1. Bundle optimization
2. Caching strategies
3. Framework-specific patterns

**Advanced:**
1. Advanced profiling
2. Custom performance budgets
3. Real User Monitoring (RUM)

---

**Version:** 1.0  
**Supported Frameworks:** React, Vue, Svelte, Angular, Solid, Qwik, Astro  
**Total Universal Principles:** 9 core areas
