---
description: Deeply analyze and explain a codebase, file, or concept. No code writing - only understanding and explanation.
---

# /understand - Deep Understanding Mode

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **NO CODE WRITING** - This command is for analysis and explanation only. Do not modify any files.
2. **Deep Dive** - Thoroughly read necessary files using `view_file` or `grep_search` before answering.
3. **Socratic Approach** - If the request is too broad, ask clarifying questions first.
4. **Visual Aids** - Use markdown Mermaid diagrams to explain architecture, data flow, or state machines if applicable.

---

## Task

When `/understand` is triggered:

1. **Information Gathering**:
   - Locate the relevant files in the codebase.
   - Trace the dependencies, imports, and component hierarchy.
   - Identify the core logic and state management.

2. **Synthesis**:
   - Build a mental model of how the system works.
   - Map out the flow of data.

3. **Explanation (Output)**:
   - Provide a clear, structured explanation.
   - Use simple language and analogies where helpful.
   - Include a Mermaid diagram if the system has 3 or more interacting components.
   - Highlight any potential edge cases or "gotchas" discovered during analysis.

---

## Output Format

```markdown
## 🧠 Understanding: [Topic]

### 🎯 Core Purpose
[Brief summary of what this code/system does]

### 🏗️ Architecture & Flow
[Mermaid diagram here if applicable, or bulleted list of flow]

### 🧩 Key Components
- **[Component A]**: [What it does]
- **[Component B]**: [What it does]

### ⚠️ Gotchas & Edge Cases
- [Any tricky logic, technical debt, or important notes]

### ❓ Open Questions
[Any questions for the user if something is missing or ambiguous]
```

---

## Examples

```
/understand src/auth/login.ts
/understand how the payment processing flow works
/understand the state management in the document viewer
```

---

## Relation to Other Commands
- If you need a comprehensive interactive codebase knowledge graph, suggest `/explore-codebase`.
- If the user wants to change the code after understanding it, suggest `/enhance` or `/plan`.
