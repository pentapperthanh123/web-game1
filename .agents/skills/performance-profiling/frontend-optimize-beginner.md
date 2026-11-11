# Frontend Optimize for Beginner

> Beginner-oriented frontend performance curriculum. Structure referenced from
> [Optimize Frontend for Beginner (pdthien)](https://pdthien.notion.site/Optimize-Frontend-for-Beginner-20cb4bc9651d807ca9ebc06be3c2ef14).
> Principle: **measure first → optimize the right place → measure again**.
> Additional reference: Frontend Performance Optimization — 57Blocks.

**Agents that use this file:** `frontend-specialist`, `performance-optimizer`  
**Parent skill:** `performance-profiling`

When the user asks about FE optimization, Lighthouse, “slow web”, or large bundles — follow this playbook in chapter order (do not jump straight to memoization).

---

## Chapter 1 — Roots of Optimization

### Critical Rendering Path (CRP)

The browser turns HTML/CSS/JS into pixels in this sequence:

```
HTML → DOM
CSS  → CSSOM
DOM + CSSOM → Render Tree → Layout → Paint → Composite
```

| Goal | Action |
|------|--------|
| Shorten CRP | Fewer blocking resources, smaller files, correct load order |
| Faster first paint | Minimal critical CSS/JS; defer the rest |

### Blocking Resources

| Type | Default behavior | Guidance |
|------|------------------|----------|
| CSS in `<head>` | Render-blocking | Inline critical CSS; split non-critical |
| Sync JS | Parser-blocking | `defer` / `async` / `type="module"` / dynamic import |
| Large fonts | Block text render | `font-display: swap`, preload critical fonts |

### How Optimizations Connect

```
Slow CRP     → Ch.2 (payload size) + Ch.3 (loading strategy)
Poor INP/jank → Ch.4 (runtime JS)
Unsure where to start → Ch.5 (DevTools)
```

---

## Chapter 2 — Optimize Resource Payload

### Code Splitting

Split bundles by route / heavy features (charts, editors, admin modals).

```ts
// React — lazy route/feature
const Admin = lazy(() => import('./pages/Admin'))
```

| Do | Avoid |
|----|--------|
| Split by route | Over-splitting → request waterfalls |
| Stable vendor chunks | Lazy-loading above-the-fold critical UI |

### Tree Shaking

Remove unused exports at build time (needs ESM + a modern bundler).

| Do | Avoid |
|----|--------|
| `import { x } from 'lib'` | `import _ from 'lodash'` (pulls the whole lib) |
| `"sideEffects": false` when accurate | Unnecessary side-effect imports |

### Minify + Compress

| Step | Tool / place |
|------|----------------|
| Minify JS/CSS | Vite/Webpack production build |
| Compress | gzip / brotli (CDN or server) |
| Target | Main bundle gzip ~**≤ 200KB** (guideline; measure in practice) |

---

## Chapter 3 — Optimize Resource Loading

### Lazy Loading

- Images / iframes / below-the-fold components: `loading="lazy"`, `next/image`, `React.lazy`
- Do **not** lazy-load the LCP element (hero)

### Async + Defer (JS)

| Attribute | When |
|-----------|------|
| `defer` | Needs full DOM; preserves order — fine for non-critical scripts |
| `async` | Independent scripts; order does not matter |
| Module / framework bundle | Let the bundler + code splitting handle it; avoid ad-hoc sync `<script>` |

### Preload + Prefetch

| Hint | Use for |
|------|---------|
| `preload` | **Critical now** (LCP font, hero image) |
| `prefetch` | Likely **next** navigation / chunk |
| `modulepreload` | Important JS chunks right after HTML |

Do not preload everything — it fights for bandwidth.

### Critical vs Non-Critical (CSS, JS)

| Critical | Non-critical |
|----------|----------------|
| Above-the-fold CSS, required hydration JS | Below-fold CSS, chat widgets, admin-only chunks |
| Load early | `async` / lazy / prefetch |

---

## Chapter 4 — Optimize JavaScript at Runtime

### Event Loop (essentials)

- Long tasks on the main thread block input/paint → poor INP
- Prefer: smaller work units, `scheduler` / `requestIdleCallback` / workers when appropriate

### Optimize Long Tasks

Long task ≈ **> 50ms** on the main thread (DevTools Performance).

| Approach | Example |
|----------|---------|
| Break up work | Yield between batches |
| Offload | Web Worker for parse/heavy compute |
| Do less | Debounce input, virtualize lists, avoid layout thrashing |
| React | Avoid unnecessary re-renders **after measuring**; prefer Server Components to ship less client JS on Next |

---

## Chapter 5 — Optimization Tooling

Order of use: **Network → Lighthouse → Coverage → Performance**.

| Tab | Use for |
|-----|---------|
| **Network** | Waterfall, blocking, size, cache, compression |
| **Lighthouse** | LCP / INP / CLS + opportunities; run before & after fixes |
| **Coverage** | Downloaded but unused JS/CSS → split / remove / lazy |
| **Performance** | Long tasks, layout/paint, slow interactions |

AG Kit script:

```bash
python .agents/skills/performance-profiling/scripts/lighthouse_audit.py https://example.com
```

---

## Quick Playbook (when the agent is invoked)

```
1. BASELINE   — Lighthouse + Network (mobile throttling if needed)
2. CLASSIFY   — Load (Ch.2–3) vs Runtime (Ch.4) vs CLS (images/fonts/sizes)
3. ONE BIG FIX — Do not change ten places at once
4. VALIDATE   — Re-measure under the same conditions
5. REPORT     — Before/after metrics + what changed
```

### Beginner checklist

- [ ] Do not optimize without measurements
- [ ] Code-split routes / heavy features
- [ ] Tree-shake large library imports
- [ ] Minify + enable gzip/brotli
- [ ] Lazy-load non-critical images/components
- [ ] Non-critical JS: defer/async/dynamic import
- [ ] Preload only 1–2 truly critical assets (do not overuse)
- [ ] Long tasks >50ms split or offloaded
- [ ] Coverage: clear reduction in dead JS/CSS

---

## Anti-patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| `React.memo` on everything before measuring | Measure re-renders / long tasks, then memo |
| Preload the entire vendor bundle | Preload LCP/critical fonts only |
| Ship a 2MB “convenient” bundle | Split + lazy load |
| Trust a shallow overview instead of Network/Lighthouse | Use Chapter 5 tools |

---

## Sources

- Chapter outline: [Optimize Frontend for Beginner — Notion (pdthien)](https://pdthien.notion.site/Optimize-Frontend-for-Beginner-20cb4bc9651d807ca9ebc06be3c2ef14)
- Industry practices: MDN Critical Rendering Path, web.dev critical path, bundler code-split/tree-shake guidance
