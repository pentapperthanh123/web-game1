---
description: Reload the active-agent manifest. Use when pivoting to a new stack mid-session, or after switching projects.
---

# /reload - Reload Agent Manifest

$ARGUMENTS

---

## Task

Re-run the auto-detect agent loader and refresh `.agents/.session/active-agents.json`.

### When to Use

- You pivoted mid-session (e.g. started on web, now adding a mobile app)
- You switched to a different project/repo in the same session
- You added new signal files (`Cargo.toml`, `pubspec.yaml`, etc.) and want them detected
- A stack-relevant agent is missing from the active set

---

## Behavior

### No arguments

Run full auto-detect from project root:

```bash
python .agents/scripts/load_agents.py
```

### With a stack name (`/reload rust`)

Pivot mode — add the named stack to the existing manifest without re-detecting:

```bash
python .agents/scripts/load_agents.py --add rust
```

Supported stack names: `nextjs`, `react`, `react-native`, `flutter`, `rust`,
`python-api`, `python-cli`, `go`, `node-api`, `game`, `static-site`.

### Force interactive (`/reload --interactive`)

Skip auto-detect and show the stack picker menu (useful for greenfield projects):

```bash
python .agents/scripts/load_agents.py --interactive
```

---

## After Reload

1. Read the new `.agents/.session/active-agents.json`.
2. From now on, **only** route to agents listed in `agents[]`.
3. If a needed agent is missing, run `/reload <stack>` to add it.

---

## Example Output

```
✓ Manifest written: .agents/.session/active-agents.json
  Stacks: nextjs, rust
  Active agents (8): orchestrator, project-planner, explorer-agent, debugger,
                     code-reviewer, security-auditor, frontend-specialist,
                     backend-specialist
  Skipped agents (5): mobile-developer, game-developer, ...
```

---

## Technical

Backed by `.agents/scripts/load_agents.py`. See also `ARCHITECTURE.md` → "Agent Loading".
