<!-- Synced from .agents/workflows/load-memory.md — do not edit here; edit the workflow source. -->

> Load persistent memory into this chat. Optionally pick topics. Use at the start of a new chat.

# /load-memory — Inject Memory Into This Chat

(Use the text the user typed after the slash command as the arguments.)

---

## 🔴 CRITICAL RULES

1. **Do NOT ask the user to run terminal commands** — you run them (or read files) yourself.
2. Prefer **Shell tool** for inject; if Shell is unavailable, **Read** the topic files directly into context.
3. Distill application: apply memory silently; do not dump the whole file back to the user unless asked.
4. After load, confirm briefly what was loaded.

---

## Task

Load AG Kit persistent memory for the **current chat**.

```
CONTEXT:
- User arguments (after /load-memory): (Use the text the user typed after the slash command as the arguments.)
- Memory dir: .agents/memory/
- Session file: .agents/.session/memory-context.md
- Script: .agents/scripts/load_memory.py

PARSE ARGUMENTS:
- empty / "auto"     → python .agents/scripts/load_memory.py --inject
- "pick"             → python .agents/scripts/load_memory.py --inject --pick
                       (if non-interactive: fall back to --list-topics then ask user which numbers)
- "index"            → --inject --index-only
- "all" / "no-cap"   → --inject --no-cap
- comma list / names → --inject --topics <parsed>
  Examples: "architecture-decisions,ag-kit-defaults"
            "2,5"  (indices from --list-topics)
- "list"             → --list-topics only (no inject)

WORKFLOW:
1. If args == "list": run --list-topics, show result, STOP.
2. Else run the matching load_memory.py --inject … command via Shell (cwd = project root).
3. Read `.agents/.session/memory-context.md` with the Read tool.
4. Apply conventions/preferences/decisions from that file for the rest of the chat.
5. Confirm to user in Vietnamese (short):

[OK] Memory loaded
Mode: auto | pick | index | topics
Included: …
Deferred / not selected: … (if any)
Size: … chars

Next: continue the task; memory is active.
```

---

## Expected Output

```
[OK] Memory loaded for this chat

Mode: topics
Included: architecture-decisions, ag-kit-defaults
Not selected: project-conventions, user-preferences, …
Injected: ~4900 chars → .agents/.session/memory-context.md

Memory is active. What should we do next?
```

---

## Usage Examples

```
/load-memory
/load-memory list
/load-memory architecture-decisions,ag-kit-defaults
/load-memory 2,5
/load-memory index
/load-memory no-cap
```

---

## Notes

- This command exists because users **cannot** run `python …` inside the chat input box.
- Slash commands live in `.cursor/commands/` (synced from `.agents/workflows/` via `install-agents.js`).
- If inject fails, still Read `MEMORY.md` + requested topic files and proceed.
