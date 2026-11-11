# Agents - Chuyên Gia AI Chuyên Biệt

> 16 chuyên gia domain-specific với expertise, mindset, và anti-patterns riêng.

---

## 📋 Danh Sách Đầy Đủ

| Agent | Lĩnh Vực | Khi Nào Dùng |
|-------|----------|--------------|
| **orchestrator** | Điều phối đa agent | Tasks phức tạp cần nhiều chuyên gia |
| **project-planner** | Lập kế hoạch & kiến trúc | Dự án mới, tính năng lớn |
| **explorer-agent** | Khám phá codebase | Hiểu code chưa quen |
| **frontend-specialist** | React/Next.js + UI/UX | Web UI, components, thiết kế |
| **backend-specialist** | API/Database | Server logic, APIs, data models |
| **mobile-developer** | React Native/Flutter | Ứng dụng mobile (iOS/Android) |
| **game-developer** | Phát triển game | Games (2D/3D/Web/Mobile/VR) |
| **devops-engineer** | Infrastructure | Deployment, CI/CD, containers |
| **test-engineer** | Chiến lược testing | Test plans, coverage, frameworks |
| **code-reviewer** | Chất lượng code | PR reviews, clean code enforcement |
| **security-auditor** | Bảo mật & lỗ hổng | Security audits, OWASP checks |
| **performance-optimizer** | Tối ưu performance | Code chậm, bottlenecks, profiling |
| **debugger** | Debug có hệ thống | Bugs phức tạp, phân tích nguyên nhân |
| **documentation-writer** | Viết tài liệu kỹ thuật | READMEs, API docs, guides |
| **database-architect** | Thiết kế database | Schema design, query optimization |
| **seo-specialist** | Tối ưu SEO | Search rankings, meta tags, Core Web Vitals |

---

## 🏗️ Cấu Trúc Agent

Mỗi agent file chứa:

```markdown
---
name: agent-name
description: Mô tả ngắn gọn
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: skill-1, skill-2, skill-3
---

# Tên Agent

## Your Philosophy
[Niềm tin cốt lõi]

## Your Mindset
[Cách bạn suy nghĩ]

## Decision Framework
[Cách bạn đưa ra quyết định]

## What You Do
[Khả năng + ví dụ]

## Review Checklist
[Quality gates]

## Common Anti-Patterns You Avoid
[Những gì KHÔNG nên làm]
```

---

## 🎯 Cách Agents Hoạt Động

### 1. Tự Động Chọn Agent

```
User: "Build a shopping cart API"
  ↓
AI phát hiện: Backend + API
  ↓
Tự động load: backend-specialist
  ↓
Load skills: api-patterns, database-design, clean-code
  ↓
Áp dụng: REST vs GraphQL decision tree
  ↓
Kết quả: API được thiết kế tốt
```

### 2. Override Thủ Công

```
User: "@backend-specialist thiết kế API"
  ↓
Explicitly loads: backend-specialist
  ↓
Áp dụng backend-specific rules
```

### 3. Đa Agent (Orchestration)

```
User: "/orchestrate Build hệ thống auth đầy đủ"
  ↓
orchestrator phân tích task
  ↓
Spawn: backend-specialist (API) + frontend-specialist (UI) + security-auditor (audit)
  ↓
Điều phối: Dependencies & integration
  ↓
Kết quả: Hệ thống auth full-stack
```

---

## 🧠 Triết Lý Agent

### Nguyên Tắc Thay Vì Patterns

Agents không đưa code copy-paste. Họ dạy **frameworks tư duy**:

- **frontend-specialist** → Quy trình design thinking, không phải templates
- **backend-specialist** → API decision trees, không phải boilerplate
- **security-auditor** → Threat modeling, không chỉ checklists

### Chuyên Môn Domain

Mỗi agent có:

1. **Kiến Thức Chuyên Biệt** — Chuyên môn sâu về domain
2. **Decision Trees** — Cách chọn giữa các options
3. **Anti-Patterns** — Những gì cần tránh
4. **Quality Gates** — Cách xác minh tính đúng đắn

### Bắt Buộc Load Skills

Agents **PHẢI** đọc skills đã khai báo trước khi làm việc:

```markdown
skills: clean-code, api-patterns, database-design
```

→ AI đọc các skills này **ngay lập tức** khi agent activate.

---

## 📐 Phân Loại Agents

### Core Orchestration (3)

**Mục đích:** Điều phối agents khác, lập kế hoạch, khám phá code.

- `orchestrator` — Master coordinator
- `project-planner` — Lập kế hoạch 4 giai đoạn (Analysis → Planning → Solution → Implementation)
- `explorer-agent` — Khám phá codebase nhanh

### Development (4)

**Mục đích:** Build features trên các platforms khác nhau.

- `frontend-specialist` — Web UI/UX
- `backend-specialist` — Server-side logic
- `mobile-developer` — Mobile apps
- `game-developer` — Game development

### Quality & Operations (5)

**Mục đích:** Đảm bảo chất lượng, bảo mật, performance, deployment.

- `test-engineer` — Chiến lược testing
- `code-reviewer` — Clean code enforcement
- `security-auditor` — Vulnerability scanning
- `performance-optimizer` — Performance tuning
- `devops-engineer` — Infrastructure & deployment

### Support (4)

**Mục đích:** Debugging, documentation, kiến trúc chuyên biệt.

- `debugger` — Systematic debugging
- `documentation-writer` — Technical writing
- `database-architect` — Schema design
- `seo-specialist` — SEO optimization

---

## 🚀 Tạo Agent Mới

### Khi Nào Nên Tạo

Tạo agent mới khi:

- ✅ Domain có decision-making độc đáo (vd: game dev vs web dev)
- ✅ Yêu cầu chuyên môn đặc biệt (vd: ML engineer, data scientist)
- ✅ Có anti-patterns riêng biệt (vd: blockchain security)

Không nên tạo nếu:

- ❌ Chỉ là kết hợp của agents hiện có
- ❌ Chỉ là một skill đơn lẻ (tạo skill thay vì agent)
- ❌ Quá hẹp (vd: "Button Designer")

### Template Agent

Xem **[../CONTRIBUTING.md](../../CONTRIBUTING.md#tạo-agent-mới)** để có template đầy đủ và checklist.

**Template nhanh:**
```bash
cp agent/frontend-specialist.md agent/your-agent.md
# Sửa: name, description, skills, philosophy, mindset
```

---

## 🔗 Liên Quan

- **[Skills](../skills/README.md)** — Khả năng tái sử dụng
- **[Workflows](../workflows/README.md)** — Slash commands
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Tổng quan hệ thống

---

## 💡 Best Practices

### Thiết Kế Agent

1. **Focus vào decisions, không phải code** — Dạy tư duy, không phải patterns
2. **Cite skills explicitly** — Link đến skills để hướng dẫn chi tiết
3. **Document anti-patterns** — Chỉ ra những gì KHÔNG nên làm
4. **Cung cấp examples** — Use cases cụ thể

### Lựa Chọn Agent

1. **Để AI tự chọn** — Intelligent routing hoạt động tốt
2. **Override khi cần** — `@agent-name` để control rõ ràng
3. **Orchestrate cho complexity** — `/orchestrate` cho tasks multi-domain

### Bảo Trì Agent

1. **Giữ philosophy rõ ràng** — Core beliefs không nên thay đổi thường xuyên
2. **Update decision trees** — Khi best practices thay đổi
3. **Không hardcode paths** — Chỉ dùng relative paths
4. **Cross-reference skills** — Không duplicate nội dung skills

---

> 🎯 **Nhớ:** Agents là **personas với expertise**, không phải code generators.
