# Workflows - Slash Commands

> 18 workflows định nghĩa sẵn. **Cursor slash** cần sync sang `.cursor/commands/`:
>
> ```bash
> node .agents/install-agents.js
> ```
>
> Sau đó gõ `/` trong chat → thấy `/remember`, `/create`, …

---

## 📋 Danh Sách Đầy Đủ

| Command | Mục Đích | Độ Phức Tạp |
|---------|----------|-------------|
| `/explore-codebase` | **NEW:** Analyze codebase với Understand-Anything | Medium |
| `/create` | Tạo features/components | Medium |
| `/orchestrate` | Điều phối đa agent | High |
| `/debug` | Debug có hệ thống | Medium |
| `/test` | Chạy test suites | Low |
| `/review` | Code quality review | Medium |
| `/plan` | Lập kế hoạch 4 giai đoạn | High |
| `/deploy` | Quy trình deployment an toàn | Medium |
| `/verify` | Chạy validation suite | Low |
| `/brainstorm` | Socratic questions | Low |
| `/preview` | Launch preview server | Low |
| `/remember` | Update persistent memory | Low |
| `/load-memory` | **Load memory vào chat hiện tại** (không cần gõ terminal) | Low |
| `/status` | Báo cáo trạng thái project | Low |
| `/enhance` | Tối ưu code | Medium |
| `/coordinate` | Spawn parallel agents | High |
| `/reload` | Reload agent manifest | Low |

---

## 🏗️ Cấu Trúc Workflow

Mỗi workflow file chứa:

```markdown
---
name: /command-name
description: Mô tả ngắn gọn
triggers: "/command, keyword1, keyword2"
---

# Tên Workflow

## What It Does
[Mục đích & kết quả]

## Usage
\`\`\`bash
/command [args]
\`\`\`

## Internal Steps
1. [Bước 1]
2. [Bước 2]
3. [Kết quả]

## Examples
[Examples cụ thể]
```

---

## 🎯 Cách Workflows Hoạt Động

### 1. Explicit Invocation

```bash
User: "/create auth system"

→ Workflow: create.md activates
→ Load: orchestrator agent
→ Áp dụng: Socratic Gate (hỏi questions)
→ Plans: Task breakdown
→ Executes: Multi-step implementation
```

### 2. Keyword Triggers

```bash
User: "Let's brainstorm API design"

→ Keyword "brainstorm" detected
→ Workflow: brainstorm.md activates
→ Load: brainstorming skill
→ Hỏi: Strategic questions (Purpose, Users, Scope)
```

### 3. Implicit (Internal)

Một số workflows được gọi internally bởi agents:

```bash
Agent: orchestrator
Task: Feature multi-domain phức tạp

→ Internally calls: /coordinate
→ Spawn parallel agents
→ Synthesize results
```

---

## 📐 Phân Loại Workflows

### Creation & Planning (3)

- `/create` — Build features/components mới
- `/plan` — Lập kế hoạch 4 giai đoạn (Analysis → Planning → Solution → Implementation)
- `/brainstorm` — Socratic Gate questions

**Dùng khi:** Bắt đầu công việc mới, requirements không rõ.

### Execution & Coordination (3)

- `/orchestrate` — Multi-agent task delegation
- `/coordinate` — Parallel agent execution
- `/enhance` — Tối ưu & refactoring code

**Dùng khi:** Tasks phức tạp, công việc multi-domain, cần optimization.

### Quality & Testing (3)

- `/review` — Code quality enforcement
- `/test` — Chạy test suites
- `/verify` — Validation checklist

**Dùng khi:** Pre-commit, pre-deploy, code review.

### Debugging & Support (2)

- `/debug` — Debug có hệ thống 4 giai đoạn
- `/status` — Báo cáo sức khỏe project

**Dùng khi:** Issues xảy ra, cần overview.

### Deployment & Ops (2)

- `/deploy` — Deployment an toàn 5 giai đoạn
- `/preview` — Launch dev/preview server

**Dùng khi:** Releasing, testing locally.

### System Management (2)

- `/remember` — Update persistent memory
- `/reload` — Reload agent manifest

**Dùng khi:** Project conventions thay đổi, tech stack pivot.

---

## 🧠 Workflow vs Agent vs Skill

### Workflow

**Là gì:** Chuỗi steps định nghĩa sẵn  
**Khi nào:** Operations thường dùng cần flow nhất quán  
**Ví dụ:** `/deploy` (luôn: build → test → backup → deploy → verify)

### Agent

**Là gì:** Persona với expertise  
**Khi nào:** Decision-making domain-specific  
**Ví dụ:** `frontend-specialist` (quyết định UI patterns, không chỉ execute)

### Skill

**Là gì:** Khả năng tái sử dụng  
**Khi nào:** Technical patterns/frameworks  
**Ví dụ:** `clean-code` (standards applied bởi bất kỳ agent nào)

---

## 🚀 Tạo Workflow Mới

### Khi Nào Nên Tạo

Tạo workflow mới khi:

- ✅ Là multi-step process được sử dụng lặp lại
- ✅ Steps có thứ tự nhất quán
- ✅ Cần command name dễ nhớ
- ✅ Users sẽ hưởng lợi từ shortcuts

Không nên tạo nếu:

- ❌ Chỉ là single action (dùng agent thay vì)
- ❌ Steps khác nhau nhiều mỗi lần dùng (quá dynamic)
- ❌ Domain-specific (thuộc về agent)

### Template Workflow

Xem **[../CONTRIBUTING.md](../../CONTRIBUTING.md#tạo-workflow-mới)** để có template đầy đủ và checklist.

**Quick start:**
```bash
cat > workflows/your-command.md << 'EOF'
---
name: /your-command
description: Mô tả ngắn
triggers: "/your-command, keyword1"
---

# Your Command

## What It Does
...

## Usage
\`\`\`bash
/your-command [args]
\`\`\`

## Internal Steps
1. ...
EOF
```

---

## 💡 Workflows Phổ Biến

### `/create` — Full-Stack Creation

**Nó làm gì:**
1. Hỏi Socratic questions (requirements)
2. Tạo plan (task-slug.md)
3. Implement features có hệ thống
4. Chạy validation

**Ví dụ:**
```bash
/create authentication system với email + OAuth
```

### `/orchestrate` — Multi-Agent Coordination

**Nó làm gì:**
1. Phân tích task complexity
2. Xác định required domains
3. Spawn specialist agents
4. Điều phối dependencies
5. Synthesize results

**Ví dụ:**
```bash
/orchestrate Build e-commerce checkout flow
```

### `/debug` — Systematic Debugging

**Nó làm gì:**
1. **Evidence Collection** — Reproduce, observe, log
2. **Hypothesis Formation** — Possible root causes
3. **Hypothesis Testing** — Verify mỗi hypothesis
4. **Root Cause Fix** — Implement solution

**Ví dụ:**
```bash
/debug Checkout button không hoạt động
```

### `/plan` — 4-Phase Planning

**Nó làm gì:**
1. **Analysis** — Research, questions
2. **Planning** — Tạo task-slug.md
3. **Solutioning** — Architecture (CHƯA CÓ CODE!)
4. **Implementation** — Execute với tests

**Ví dụ:**
```bash
/plan Migrate từ REST sang GraphQL
```

### `/review` — Code Quality Review

**Nó làm gì:**
1. Load `code-review` skill
2. Check clean-code compliance
3. Identify magic strings/numbers
4. Verify naming conventions
5. Report findings với severity

**Ví dụ:**
```bash
/review src/components/
```

---

## 📊 Thống Kê Workflows

```
Total Workflows:     15
Creation/Planning:   3
Execution:           3
Quality/Testing:     3
Debugging/Support:   2
Deployment:          2
System Management:   2
```

---

## 🔗 Liên Quan

- **[Agents](../agent/README.md)** — Personas chuyên biệt
- **[Skills](../skills/README.md)** — Khả năng tái sử dụng
- **[Scripts](../scripts/README.md)** — Automation
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Tổng quan hệ thống

---

## 💡 Best Practices

### Thiết Kế Workflow

1. **Mục đích rõ ràng** — Một workflow, một công việc
2. **Thứ tự nhất quán** — Steps phải predictable
3. **Tên dễ nhớ** — Ngắn, dựa trên action-verb
4. **Document internal logic** — Giúp users hiểu

### Sử Dụng Workflow

1. **Dùng shortcuts** — `/create` nhanh hơn "Create a feature for..."
2. **Biết triggers** — Một số workflows activate trên keywords
3. **Đọc output** — Workflows explain steps của chúng
4. **Chain workflows** — `/plan` → implement → `/review` → `/deploy`

### Bảo Trì Workflow

1. **Giữ steps atomic** — Mỗi step phải rõ ràng
2. **Update triggers** — Thêm keywords khi patterns xuất hiện
3. **Document changes** — Note trong CHANGELOG nếu workflow thay đổi
4. **Test regularly** — Đảm bảo workflows vẫn hoạt động

---

## 🎯 Workflow Chaining

**Chains thường dùng:**

```bash
# New feature flow
/plan Feature X
→ implement
→ /review
→ /test
→ /deploy

# Bug fix flow
/debug Issue
→ fix
→ /test
→ /verify
→ commit

# Optimization flow
/status
→ identify bottleneck
→ /enhance
→ /test
→ verify improvement
```

---

> 🎯 **Nhớ:** Workflows là **shortcuts to consistent processes**, không phải rigid scripts.
