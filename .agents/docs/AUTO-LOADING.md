# AG Kit - Auto-Loading Flow

> Giải thích cách AI tự động detect và load components khi user gõ prompt.

---

## 🔄 Loading Workflow (Step by Step)

### Bước 0: Initial Setup (One-time)

```bash
# User chạy một lần khi setup project:
node .agents/install-agents.js
```

**Kết quả:**
- ✅ `.cursorrules` created (rules luôn có trong context)
- ✅ `AGENTS.md` created (reference)
- ✅ `.claude/system-context.md` created (Claude Code)

---

### Bước 1: User Gõ Prompt

```
User: "Build a Next.js dashboard with authentication"
```

---

### Bước 2: AI Auto-Processing

#### [2.1] Context Có Sẵn (INSTANT)

✅ AI đã có trong context:
- `.cursorrules` → RULES.md content
- File structure (có thể Glob/Read)
- Request từ user

#### [2.2] AI Tự Động Classify (INSTANT)

```
AI analyze: "Build" + "Next.js" + "dashboard"
→ Type: COMPLEX CODE
→ Stack: Next.js (Frontend + Backend)
→ Required agents: frontend-specialist, backend-specialist, project-planner
```

#### [2.3] AI Check Manifest (INSTANT)

```bash
Check: .agents/.session/active-agents.json
Status: ❌ MISSING (như hiện tại)
```

#### [2.4] AI Ask Permission (SECURITY)

```
AI: "I need to detect the project stack to load relevant agents.
     Should I run: python .agents/scripts/load_agents.py?"

User: "yes" ✅
```

#### [2.5] AI Run Script (AUTO)

```bash
python .agents/scripts/load_agents.py
```

**Output:**
- ✅ Detects Next.js project
- ✅ Writes `.agents/.session/active-agents.json`
- ✅ Manifest contains: frontend-specialist, backend-specialist, etc.

#### [2.6] AI Load Agents (AUTO)

```
AI reads:
  • .agents/agent/frontend-specialist.md ✓
  • .agents/agent/backend-specialist.md ✓
  • .agents/agent/project-planner.md ✓
```

#### [2.7] AI Load Skills (ON-DEMAND)

```
AI detects user needs:
  • "dashboard" → frontend-design
  • "authentication" → api-patterns
  
AI reads:
  • .agents/skills/frontend-design/SKILL.md ✓
  • .agents/skills/api-patterns/SKILL.md ✓
```

#### [2.8] AI Execute Task (AUTO)

```
AI with full context:
  ✅ Rules
  ✅ Relevant agents (3)
  ✅ Relevant skills (2)
  ✅ Project structure
  
→ Proceed to build dashboard
```

---

## 🎯 Loading Summary Table

| Component | How Loaded | When | Auto? |
|-----------|------------|------|-------|
| **Rules** | `install-agents.js` | Setup (one-time) | Manual script |
| **Rules Context** | `.cursorrules` | Always in context | ✅ YES (automatic) |
| **Agent Manifest** | `load_agents.py` | First prompt | ✅ YES (with permission) |
| **Agent Files** | AI Read tool | After manifest | ✅ YES (automatic) |
| **Skills** | AI Read tool | On-demand (keywords) | ✅ YES (automatic) |
| **Workflows** | AI Read tool | Slash command | ✅ YES (automatic) |
| **Memory** | `load_memory.py` | Session start | ⚠️ Should be auto |

---

## 🔍 Real Example

### Scenario 1: First Prompt (No Manifest)

```
User: "Build auth system"

AI Process:
[✓] Read .cursorrules (instant - already in context)
[✓] Classify: COMPLEX CODE
[✓] Route to: backend-specialist
[✓] Check manifest: ❌ MISSING
[!] Ask: "Should I run load_agents.py?" 
[✓] User: "yes"
[✓] Run script → Manifest created
[✓] Read backend-specialist.md
[✓] Read api-patterns SKILL.md
[✓] Execute task
```

**Total: ~5-10 seconds** (most time = user confirmation)

---

### Scenario 2: Subsequent Prompts (Has Manifest)

```
User: "Add password reset"

AI Process:
[✓] Read .cursorrules (instant - already in context)
[✓] Classify: SIMPLE CODE
[✓] Check manifest: ✅ EXISTS
[✓] Read backend-specialist.md (from manifest)
[✓] Read api-patterns SKILL.md (on-demand)
[✓] Execute task
```

**Total: ~1-2 seconds** (no user confirmation needed)

---

## ⚡ Optimization Tips

### Để AI Load Nhanh Hơn:

1. **Run load_agents.py manually first:**
   ```bash
   python .agents/scripts/load_agents.py
   ```
   → Manifest sẵn sàng, không cần AI ask permission

2. **Pre-load memory:**
   ```bash
   python .agents/scripts/load_memory.py --inject
   ```
   → Memory có sẵn trong context

3. **Keep .session/ directory:**
   → Đừng xóa `.agents/.session/` (gitignored)
   → Manifest persist across sessions

---

## 🎨 Visual Flow

```
User Types Prompt
        ↓
    [Context Check]
    ├─ .cursorrules? ✅ (always)
    ├─ Manifest? 
    │   ├─ YES ✅ → Load agents from manifest
    │   └─ NO ❌ → Ask to run load_agents.py
    │              ↓ (user says yes)
    │              Run script → Create manifest → Load agents
    ↓
    [Intelligent Routing]
    → Classify request type
    → Select relevant agent(s)
    → Read agent .md files
    ↓
    [Skill Loading]
    → Detect trigger keywords
    → Read SKILL.md on-demand
    ↓
    [Execute Task]
    → Full context available
    → Proceed with implementation
```

---

## 🚀 Current Project Status

**Check right now:**

```bash
# Manifest status:
ls .agents/.session/active-agents.json
# Result: ❌ MISSING

# What happens when you prompt:
1. AI will detect missing manifest
2. AI will ask: "Should I run load_agents.py?"
3. You say "yes"
4. AI runs script
5. Manifest created ✓
6. AI loads agents ✓
7. AI proceeds with task ✓
```

---

## 💡 Key Insights

### ✅ Auto-Loaded (No Permission Needed)

- Rules (via .cursorrules)
- Agent files (after manifest)
- Skills (on-demand)
- Workflows (on slash command)

### ⚠️ Needs Permission (Security)

- Running `load_agents.py` (first time)
- Running validation scripts
- Modifying files
- Installing dependencies

### 🎯 Token Efficiency

**Without manifest (load everything):**
```
16 agents × 200 lines = 3,200 lines
47 skills × 100 lines = 4,700 lines
Total: 7,900 lines ❌ (token bloat!)
```

**With manifest (load only relevant):**
```
3-5 agents × 200 lines = 600-1,000 lines
2-3 skills × 100 lines = 200-300 lines
Total: 800-1,300 lines ✅ (efficient!)
```

**Savings: ~85% reduction!** 🎉

---

## 🏗️ Special Case: Multi-Project Folders

> **Scenario:** Folder chứa nhiều dự án độc lập (backend/, frontend/, mobile/) nhưng KHÔNG có signal monorepo.

### Detection Flow

```
1. AI run: python .agents/scripts/load_agents.py
2. Script detect: Không có turbo.json/nx.json
3. Script scan: Tìm thấy nhiều subfolders có signal files
4. Script prompt: "Which project are you working on?"
   → User chọn: 1) backend, 2) frontend, 3) mobile, 4) all
5. Script write manifest với stacks tương ứng
```

### Example: ai-reup-tools Structure

```
ai-reup-tools/
├── backend-nestjs/       ← NestJS API
│   └── package.json
├── frontend-dashboard/   ← React dashboard
│   └── package.json
├── ai-worker-python/     ← Python worker
│   └── requirements.txt
└── .agents/             ← AG Kit
```

**Script Output:**

```
🔍 Multiple projects detected. Which one are you working on?
(Or 'all' to load agents for ALL projects)

  1) backend-nestjs
  2) frontend-dashboard
  3) ai-worker-python
  4) all (union all stacks)

Selection: 1

[OK] Manifest written: .agents/.session/active-agents.json
  Stacks: node-api
  Active agents (9): orchestrator, project-planner, backend-specialist...
```

### Workflows

| Workflow | Command | Kết Quả |
|----------|---------|---------|
| **Interactive picker** | `python .agents/scripts/load_agents.py` | Hỏi user chọn project |
| **Specific project** | `python .agents/scripts/load_agents.py --project backend-nestjs` | Load chỉ backend agents |
| **All projects** | Chọn "all" trong picker | Union TẤT CẢ stacks |
| **Pivot mid-session** | `python .agents/scripts/load_agents.py --add rust` | Thêm stack vào manifest |

---

## 🏁 Bottom Line

**CÓ, AI tự động detect và load!** Nhưng:

1. **Rules** = Luôn có (synced via install-agents.js)
2. **Agents** = Auto-load AFTER manifest created (first-time needs permission)
3. **Skills** = Auto-load on-demand (no permission needed)
4. **Workflows** = Auto-load on slash command

**First prompt workflow:**
```
User prompt → AI ask "run load_agents.py?" → User "yes" 
→ Manifest created → AI loads agents → Task executed ✅
```

**Subsequent prompts:**
```
User prompt → AI uses manifest → Loads agents → Task executed ✅
(Much faster! No permission needed)
```

---

> 💡 **Pro Tip:** Run `python .agents/scripts/load_agents.py` once manually để skip permission step!
