# Understand-Anything graph (AG Kit)

Canonical location for knowledge graphs used by AG Kit:

```
.agents/.ua/knowledge-graph.json
```

## Why under `.agents/`?

Keep toolkit artifacts **inside** the AG Kit package — do not scatter `.ua/` at the repo root.

## Lookup order (agents / `/explore-codebase`)

1. `.agents/.ua/knowledge-graph.json` ← **standard**
2. `.ua/knowledge-graph.json` ← migrate into `.agents/.ua/` if found
3. `.understand-anything/knowledge-graph.json` ← legacy

## Migration

```bash
mkdir -p .agents/.ua
mv .ua/knowledge-graph.json .agents/.ua/ 2>/dev/null || true
# optional: move intermediate artifacts
# mv .ua/* .agents/.ua/
```

If an external Understand skill still writes to root `.ua/`, move outputs here after generation (or point the tool at this path when it supports a custom out dir).

## Git

Graph JSON is typically **local** (gitignored). Commit only if the team explicitly wants a shared graph.
