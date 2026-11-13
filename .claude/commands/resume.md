---
description: Resume work from a previous session. Recovers context when switching IDEs or after token exhaustion.
---

# /resume — Cross-IDE Session Recovery

$ARGUMENTS

---

## Purpose

Resume work-in-progress when switching between IDEs (Cursor ↔ Antigravity ↔ VS Code ↔ Claude Code) or after token exhaustion mid-task.

**Problem solved:** AI token limit hit mid-task → switch IDE → new AI has zero context → wasted time re-explaining. This workflow eliminates that.

---

## Behavior

When `/resume` is triggered:

### Step 1: Run Recovery Script
```bash
python .agents/scripts/checkpoint.py --restore
```

This script performs 3-layer recovery:

| Layer | Source | What it finds |
|-------|--------|---------------|
| **1. Checkpoint** | `.agents/.session/checkpoint.md` | Goal, completed steps, in-progress, next steps, key decisions, user preferences |
| **2. Git Diff** | `git diff` + `git status` | Modified files, new files, recent commits |
| **3. Plan Files** | `*task*.md`, `*plan*.md` | Implementation plans with `[x]`/`[ ]` checklists |

### Step 2: Read Checkpoint File
If `.agents/.session/checkpoint.md` exists, read it fully. Pay special attention to:
- **Goal** — What the user was trying to accomplish
- **In Progress** — The exact file/function being worked on when interrupted
- **Key Decisions** — Architecture/tech choices already agreed upon (DO NOT reverse these)
- **User Context** — User preferences and constraints

### Step 3: Read Modified Files
For each file listed in "Modified Files (uncommitted)", read the file to understand current state of code.

### Step 4: Resume Report
Present a concise recovery summary to the user:

```markdown
## 🔄 Session Recovered

**Goal:** [goal from checkpoint]
**Previous IDE:** [if detectable]
**Status:** [X of Y steps completed]

### Already Done:
- [completed items]

### Resuming From:
- [in-progress item — file, function, line]

### Next Action:
I will now continue with [specific next step]. Proceed?
```

### Step 5: Continue Work
After user confirms, continue implementing from where the previous session left off. Follow the same agents, stack, and decisions recorded in the checkpoint.

---

## Auto-Checkpoint Protocol (For AI Agents)

**MANDATORY:** After every significant file edit (create/modify), update the checkpoint:

```bash
python .agents/scripts/checkpoint.py --save \
  --goal "Current task goal" \
  --completed "step1,step2" \
  --in-progress "current file or step" \
  --next "next step 1,next step 2" \
  --decisions "key decision 1,key decision 2" \
  --context "user preference 1"
```

Or write directly to `.agents/.session/checkpoint.md` using the hybrid YAML+Markdown format.

**After task completion**, clear the checkpoint:
```bash
python .agents/scripts/checkpoint.py --clear
```

---

## Examples

```
# Resume after token exhaustion
/resume

# Check if there's a pending checkpoint
python .agents/scripts/checkpoint.py --status

# Manually save checkpoint before switching IDE
python .agents/scripts/checkpoint.py --save --goal "Refactor auth module" --in-progress "useAuth.ts hook" --decisions "JWT over session cookies"

# Clear checkpoint after finishing
python .agents/scripts/checkpoint.py --clear
```
