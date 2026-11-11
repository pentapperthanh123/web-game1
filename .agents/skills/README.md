# Skills - Khả Năng Tái Sử Dụng

> 47 top-level skills (+ nested packages) mà agents load on-demand để nhận hướng dẫn chuyên biệt.

---

## 📋 Phân Loại Skills

### Codebase Analysis (1)
- `codebase-explorer` — **NEW:** Understand-Anything integration cho knowledge graphs
- `code-review-graph` — Token-efficient review dùng Tree-sitter AST

### Architecture & Patterns (8)
- `clean-code` — **BẮT BUỘC** coding standards thực tế
- `architecture` — Decision-making frameworks (ADR, trade-offs)
- `api-patterns` — Lựa chọn REST vs GraphQL vs tRPC
- `database-design` — Schema design, indexing, ORM selection
- `deployment-procedures` — Quy trình deployment an toàn
- `server-management` — Quản lý process, monitoring
- `batch-operations` — Operations đa file
- `simplify-code` — Giảm complexity, flatten nesting

### Frontend & Design (7)
- `frontend-design` — UI/UX design thinking, color/typography systems
- `mobile-design` — Mobile-first patterns, touch psychology
- `web-performance` — Framework-agnostic web performance + React/Vue/Svelte patterns (Vercel Engineering for React)
- `tailwind-patterns` — Tailwind CSS v4 principles
- `web-design-guidelines` — Tuân thủ Web Interface Guidelines
- `i18n-localization` — Internationalization patterns
- `seo-fundamentals` — SEO, E-E-A-T, Core Web Vitals

### Testing & Quality (8)
- `testing-patterns` — Chiến lược Unit/Integration/E2E
- `tdd-workflow` — Test-Driven Development (RED-GREEN-REFACTOR)
- `systematic-debugging` — Phương pháp debug 4 giai đoạn
- `code-quality-review` — Clean code enforcement
- `verify-changes` — Xác minh qua execution
- `webapp-testing` — E2E testing với Playwright
- `lint-and-validate` — Chiến lược linting
- `code-review-checklist` — Hướng dẫn PR review

### Performance & Security (4)
- `performance-profiling` — Đo lường, phân tích, tối ưu
- `vulnerability-scanner` — OWASP 2025, supply chain security
- `red-team-tactics` — MITRE ATT&CK, attack phases
- `context-compression` — Quản lý context cho long sessions

### Developer Experience (8)
- `brainstorming` — **BẮT BUỘC** Socratic Gate + giao tiếp user
- `plan-writing` — Lập kế hoạch task có cấu trúc với dependencies
- `behavioral-modes` — 7 chế độ hoạt động (brainstorm, implement, debug, etc.)
- `intelligent-routing` — Tự động chọn agent tốt nhất cho task
- `parallel-agents` — Orchestration đa agent
- `coordinator-mode` — Workers parallel nâng cao + synthesis
- `memory-system` — Memory persistent cross-session
- `skillify` — Tự động tạo skills từ workflows lặp lại

### Platform-Specific (5)
- `bash-linux` — Bash/Linux patterns (macOS, Linux)
- `powershell-windows` — PowerShell patterns (Windows)
- `nodejs-best-practices` — Node.js specific patterns
- `python-patterns` — Python specific patterns
- `rust-pro` — Rust 2024 edition (async, type system)

### Specialized (6)
- `app-builder` — Scaffolding app full-stack (13 templates)
- `game-development` — 11 sub-skills (2D, 3D, Web, Mobile, VR, etc.)
- `mcp-builder` — Xây dựng Model Context Protocol server
- `geo-fundamentals` — Generative Engine Optimization (ChatGPT, Claude)
- `code-review-graph` — Review token-efficient dựa trên AST
- `documentation-templates` — README, API docs, code comments

---

## 🏗️ Cấu Trúc Skill

Mỗi skill có:

```markdown
---
name: skill-name
description: Mô tả ngắn gọn
when_to_use: "Dùng khi [triggers rõ ràng]"
---

# Tên Skill

## When to Use
[Triggers activation rõ ràng]

## Core Principles
[Guidelines & best practices]

## Quick Reference
[Cheat sheet]

## Examples
[Examples cụ thể]
```

**Components tùy chọn:**
- Sub-sections (`.md` files)
- `scripts/` folder (automation)
- `references/` folder (guides chi tiết)

---

## 🎯 Cách Skills Hoạt Động

### 1. Automatic Loading

```
Agent: frontend-specialist
Skills khai báo: clean-code, web-performance, frontend-design

→ AI đọc 3 skills này TRƯỚC KHI làm việc
→ Áp dụng principles từ cả 3
```

### 2. Selective Reading

```
Skill: frontend-design (skill lớn với nhiều sections)

User request: "Chọn màu sắc"

→ AI đọc SKILL.md (index)
→ Tìm section liên quan: color-psychology.md
→ Chỉ đọc section đó thôi
→ Áp dụng color psychology principles
```

### 3. On-Demand Loading

```
User: "/brainstorming Nên dùng REST hay GraphQL?"

→ AI phát hiện: Cần quyết định API
→ Load: api-patterns skill
→ Đọc: REST vs GraphQL decision tree
→ Hỏi: Câu hỏi Socratic dựa trên decision tree
```

---

## 📐 Skill vs Agent

### Khi Nào Tạo Skill

✅ **Tạo SKILL khi:**
- Tái sử dụng được cross-domains (vd: clean-code)
- Là technical pattern (vd: tdd-workflow)
- Nhiều agents cần nó (vd: testing-patterns)
- Là decision framework (vd: api-patterns)

### Khi Nào Tạo Agent

✅ **Tạo AGENT khi:**
- Cần persona/mindset (vd: frontend-specialist)
- Orchestrate nhiều skills (vd: orchestrator)
- Có domain-specific anti-patterns (vd: security-auditor)
- Yêu cầu expertise chuyên biệt (vd: game-developer)

**Ví dụ:**
- `clean-code` = Skill (standards tái sử dụng)
- `frontend-specialist` = Agent (persona SỬ DỤNG clean-code)

---

## 🧠 Nguyên Tắc Cốt Lõi

### 1. Skills BẮT BUỘC

**Mọi agent PHẢI tuân theo:**
- `clean-code` — Không ngoại lệ
- `brainstorming` — Cho requests phức tạp

Đây là **universal standards**, không phải optional.

### 2. Selective Loading

Không đọc toàn bộ skills trước:

```
❌ SAI: Đọc cả 9 sections của web-performance (frameworks/react-next.md)
✅ ĐÚNG: Đọc index → Xác định section liên quan → Chỉ đọc section đó
```

### 3. Principles Over Patterns

Skills dạy **thinking frameworks**, không phải copy-paste code:

```
❌ "Đây là React component template"
✅ "Đây là cách quyết định giữa client/server components"
```

---

## 📂 Cấu Trúc Thư Mục Skill

### Simple Skill

```
skills/
└── clean-code/
    └── SKILL.md       # Tất cả content trong 1 file
```

### Complex Skill

```
skills/
└── frontend-design/
    ├── SKILL.md                 # Index + overview
    ├── color-psychology.md      # Sub-section
    ├── typography-system.md     # Sub-section
    ├── animation-guide.md       # Sub-section
    ├── scripts/
    │   └── ux_audit.py          # Automation
    └── references/
        └── wcag-checklist.md    # Reference chi tiết
```

### Skill với Templates

```
skills/
└── app-builder/
    ├── SKILL.md
    ├── project-detection.md
    ├── scaffolding.md
    └── templates/
        ├── SKILL.md
        ├── nextjs-fullstack/
        │   └── TEMPLATE.md
        └── react-native/
            └── TEMPLATE.md
```

---

## 🚀 Tạo Skill Mới

### Khi Nào Nên Tạo

Tạo skill mới khi:

- ✅ Nhiều agents sẽ hưởng lợi
- ✅ Là pattern/framework tái sử dụng
- ✅ Skills hiện tại không cover domain
- ✅ Giải quyết vấn đề lặp lại

Không nên tạo nếu:

- ❌ Quá specific (thuộc về agent)
- ❌ Là giải pháp một lần (không tái sử dụng)
- ❌ Duplicate skills hiện có

### Template Skill

Xem **[../CONTRIBUTING.md](../../CONTRIBUTING.md#tạo-skill-mới)** để có template đầy đủ và checklist.

**Quick start:**
```bash
mkdir skills/your-skill
cat > skills/your-skill/SKILL.md << 'EOF'
---
name: your-skill
description: Mô tả ngắn
when_to_use: "Dùng khi [triggers]"
---

# Your Skill

## When to Use
...
EOF
```

---

## 📊 Thống Kê Skills

```
Total Skills:        46
Với Sub-sections:    12
Với Scripts:         10
Với References:      4
Game Sub-skills:     11
```

**Skills lớn nhất:**
- `web-performance` — Universal + framework-specific (React/Vue/Svelte patterns; Vercel Engineering for React)
- `game-development` — 11 sub-skills
- `frontend-design` — 8 sections (design thinking)
- `mobile-design` — 10 sections (mobile-first)

---

## 🔗 Liên Quan

- **[Agents](../agent/README.md)** — Personas chuyên biệt
- **[Workflows](../workflows/README.md)** — Slash commands
- **[Scripts](../scripts/README.md)** — Automation
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Tổng quan hệ thống

---

## 💡 Best Practices

### Thiết Kế Skill

1. **Triggers rõ ràng** — `when_to_use` phải không mơ hồ
2. **Sections modular** — Chia skills lớn thành sub-files tập trung
3. **Examples thay vì theory** — Show, đừng chỉ tell
4. **Decision trees** — Giúp AI chọn giữa options

### Sử Dụng Skill

1. **Đọc index trước** — SKILL.md cho overview
2. **Load sections on-demand** — Không đọc hết mọi thứ trước
3. **Áp dụng principles** — Đừng copy patterns một cách mù quáng
4. **Cite skills** — Reference skills trong responses của agent

### Bảo Trì Skill

1. **Giữ cập nhật** — Phát triển khi best practices thay đổi
2. **Không duplicate** — Cross-reference thay vì copy
3. **Không hardcode paths** — Chỉ dùng relative paths
4. **Test scripts** — Nếu skill có scripts, test chúng

---

> 🎯 **Nhớ:** Skills là **frameworks for thinking**, không phải code libraries.
