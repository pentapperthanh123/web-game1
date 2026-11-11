# AG Kit - Bắt Đầu Nhanh

> Hướng dẫn setup và sử dụng bộ AI Agent Kit trong 5 phút.

---

## 📦 Bước 1: Kiểm Tra Cấu Trúc

Đảm bảo bạn có các thư mục sau:

```
project-root/
├── .agents/
│   ├── agent/          # 16 chuyên gia AI
│   ├── skills/         # 47 kỹ năng
│   ├── workflows/      # 17 lệnh tắt
│   ├── rules/          # Quy tắc
│   ├── memory/         # Bộ nhớ
│   └── scripts/        # Scripts
├── .cursorrules        # Quy tắc Cursor IDE
└── CODEBASE.md         # Map phụ thuộc
```

**Verify:**

```bash
# Đếm agents & skills
ls .agents/agent/*.md | wc -l    # Phải là 16
ls .agents/skills/ | wc -l       # Phải là 50
ls .agents/workflows/*.md | wc -l  # Phải là 19 (18 workflows + README)

# Test scripts
python .agents/scripts/load_agents.py --help
python .agents/scripts/load_memory.py --check
```

---

## 🚀 Bước 2: Khởi Động Session (Chạy Mỗi Lần Bắt Đầu)

### 2.0. Boot một lệnh (khuyến nghị)

```bash
python .agents/scripts/session_boot.py
```

Lệnh này tự động:
1. Sync rules → `.cursorrules` (nếu có Node.js)
2. Detect stack → ghi `active-agents.json`
3. Inject memory → `memory-context.md`

**Greenfield project (không detect được stack):**
```bash
python .agents/scripts/session_boot.py --interactive
# Chọn stack:
#   1-10: chọn stack cụ thể (Next.js, React Native, ...)
#   11: Load ALL agents (16 total — mixed stack / exploratory)
#   1,5,9: Multi-select (Next.js + Python API + Game)
```

**Verify kit health (tùy chọn):**
```bash
python .agents/scripts/smoke_test.py
```

### 2.1. Nạp Agent Manifest (Tự Động Detect Stack)

**Script tự động phát hiện stack và chỉ nạp agents liên quan:**

```bash
python .agents/scripts/load_agents.py
```

**Kết quả:**
```
[OK] Manifest written: .agents/.session/active-agents.json
  Stacks: nextjs
  Active agents (11): orchestrator, project-planner, frontend-specialist,
                      backend-specialist, database-architect, ...
  Skipped agents (5): mobile-developer, game-developer, ...
```

**Nếu project mới chưa có file signal:**
```bash
python .agents/scripts/load_agents.py --interactive
```
→ Chọn stack từ menu

### 2.2. Nạp Memory (Context Lưu Trữ)

**Inject memory vào session:**

```bash
python .agents/scripts/load_memory.py --inject
```

**Kết quả:**
```
[OK] Memory injected to: .agents/.session/memory-context.md
     Topics: 1
     Size: 2110 chars
```

### 2.3. Kiểm Tra Health (Tùy Chọn)

```bash
# Agent manifest
python .agents/scripts/load_agents.py --list

# Memory health
python .agents/scripts/load_memory.py --check
```

---

## 💡 Bước 3: Sử Dụng AI Agents

### 3.1. AI Tự Động Chọn Agent

Bạn chỉ cần nói, AI sẽ tự chọn chuyên gia phù hợp:

```
"Tạo API endpoint cho đăng ký user"
→ AI chọn: backend-specialist

"Thiết kế màn hình login với dark mode"
→ AI chọn: frontend-specialist

"Review code tìm lỗi performance"
→ AI chọn: code-reviewer + performance-optimizer
```

### 3.2. Lệnh Tắt (Slash Commands)

```bash
/brainstorm    # Hỏi Socratic trước khi code
/create        # Tạo feature mới
/plan          # Phân tách task
/review        # Review chất lượng code
/test          # Chạy tests
/deploy        # Checklist deploy
/reload        # Nạp lại agent manifest
/status        # Xem trạng thái project
/remember      # Lưu quyết định vào memory
```

**Ví dụ:**
```
User: /brainstorm
AI: Đặt 3-5 câu hỏi chiến lược về feature bạn muốn build

User: /create hệ thống authentication
AI: Tạo plan → Build → Test → Report

User: /review
AI: Scan codebase → Tìm naming issues, magic strings, etc.
```

### 3.3. Chỉ Định Agent (Tùy Chọn)

Nếu muốn chọn agent cụ thể:

```
@backend-specialist viết API cho payment gateway

@mobile-developer optimize React Native performance

@security-auditor scan lỗ hổng OWASP
```

---

## 🔄 Bước 4: Pivot Mid-Session (Khi Đổi Stack)

Đang làm web app, giờ muốn thêm mobile:

```bash
# Cách 1: Qua lệnh
python .agents/scripts/load_agents.py --add react-native

# Cách 2: Qua workflow
/reload react-native
```

→ Manifest được update, `mobile-developer` agent được thêm vào.

---

## ✅ Bước 5: Validation (Trước Commit/Deploy)

### Development (Kiểm tra nhanh)

```bash
python .agents/scripts/checklist.py .
```

Chạy:
- ✓ Security scan (bảo mật)
- ✓ Lint & type check (code quality)
- ✓ Schema validation (database)
- ✓ Tests (unit, integration)
- ✓ UX audit (UI/UX)
- ✓ SEO check

### Pre-Deploy (Kiểm tra đầy đủ)

```bash
# Start dev server trước
npm run dev

# Chạy validation đầy đủ
python .agents/scripts/checklist.py . --url http://localhost:3000
```

Thêm:
- ✓ Lighthouse (Core Web Vitals)
- ✓ Performance profiling

---

## 🧠 Bước 6: Bộ Nhớ Lưu Trữ (Tùy Chọn)

### Lưu Quyết Định Quan Trọng

```bash
/remember Luôn dùng TypeScript strict mode trong project này
/remember API endpoints dùng REST, không dùng GraphQL
/remember Database migrations qua Prisma, không raw SQL
```

→ Memory sẽ được load tự động ở session sau.

### Xem Memory Hiện Tại

```bash
cat .agents/memory/MEMORY.md
cat .agents/memory/project-conventions.md
```

---

## 📋 Checklist Hàng Ngày

**Mỗi khi bắt đầu làm việc:**

- [ ] `python .agents/scripts/load_agents.py` (nếu chưa có manifest)
- [ ] `python .agents/scripts/load_memory.py --inject` (nếu muốn dùng memory)
- [ ] Code bình thường, AI tự route agent

**Trước khi commit:**

- [ ] `python .agents/scripts/checklist.py .`
- [ ] Fix các vấn đề critical (security, lint)
- [ ] Commit

**Trước khi deploy:**

- [ ] Start server
- [ ] `python .agents/scripts/checklist.py . --url <URL>`
- [ ] Tất cả checks pass
- [ ] Deploy

---

## 🎯 Ví Dụ Thực Tế (Real-World Scenarios)

### Scenario 1: Tạo Next.js App Từ Đầu

**Tình huống:** Bạn muốn tạo blog app với Next.js 14 + Prisma + Tailwind.

**Các bước:**

```bash
# 1. Clone/tạo project
mkdir my-blog && cd my-blog
npm init -y

# 2. Nạp agents
python .agents/scripts/load_agents.py --interactive
# → Chọn: Next.js, React, TypeScript, Prisma, Tailwind

# 3. Yêu cầu AI
"Tạo blog app với Next.js 14 App Router, Prisma PostgreSQL, Tailwind CSS"

# 4. AI tự động:
# - Chọn: project-planner → Tạo plan
# - Chọn: frontend-specialist → Setup Next.js + Tailwind
# - Chọn: backend-specialist → Setup Prisma + API routes
# - Chọn: database-architect → Thiết kế schema

# 5. Validation
python .agents/scripts/checklist.py .
```

**Kết quả:**
- ✅ Scaffold đầy đủ structure
- ✅ Prisma schema với Post, User models
- ✅ API routes cho CRUD
- ✅ Pages với Tailwind styling
- ✅ All tests passing

**Thời gian:** ~10-15 phút (thay vì 1-2 giờ thủ công)

---

### Scenario 2: Fix Performance Issue

**Tình huống:** Web app bị chậm, LCP > 4s, INP > 600ms.

**Trước khi dùng AG Kit:**
```
❌ Không biết bắt đầu từ đâu
❌ Thử random optimization
❌ Mất 2-3 ngày debug
```

**Sau khi dùng AG Kit:**

```bash
# 1. Nạp agents
python .agents/scripts/load_agents.py

# 2. Request cụ thể
"Analyze và fix performance issue, LCP > 4s"

# 3. AI routing:
# - performance-optimizer: Profile và identify bottlenecks
# - frontend-specialist: Optimize React components
# - backend-specialist: Optimize API calls

# 4. AI output:
# - Phát hiện: Large bundle (3MB), no code splitting
# - Phát hiện: Blocking JS on main thread
# - Phát hiện: No image optimization
# - Tạo plan fix chi tiết

# 5. Implement fixes
# AI suggest:
# - Next.js dynamic imports
# - Image component optimization
# - Bundle analysis và tree shaking

# 6. Verify
npm run dev
python .agents/scripts/checklist.py . --url http://localhost:3000
```

**Kết quả:**
- ✅ LCP: 4.2s → 1.8s (giảm 57%)
- ✅ INP: 650ms → 180ms (giảm 72%)
- ✅ Bundle: 3MB → 800KB (giảm 73%)

**Thời gian:** ~2-3 giờ (thay vì 2-3 ngày)

---

### Scenario 3: Code Review Automation

**Tình huống:** Team có 3 devs, mỗi PR cần 30 phút review thủ công.

**Trước:**
```
❌ 3 PRs/ngày × 30 phút = 1.5 giờ/ngày review
❌ Magic strings thường bị miss
❌ Naming conventions không consistent
```

**Sau:**

```bash
# Setup workflow
# Add to .github/workflows/ai-review.yml
- run: |
    python .agents/scripts/load_agents.py
    /review --uncommitted

# Hoặc chạy local trước commit
git add .
python .agents/scripts/load_agents.py
/review
```

**AI Output:**
```markdown
## Code Review Report

**Verdict:** NEEDS FIXES

### 🔴 Blocking (3)
- `src/api.ts:24` — Magic string "http://localhost:3000"
  - Fix: Extract to `API_BASE_URL` constant

- `src/components/UserCard.tsx:12` — Magic number `10`
  - Fix: Extract to `MAX_DISPLAY_USERS` constant

- `src/utils/format.ts:5` — Inconsistent naming `formatDateString`
  - Fix: Rename to `formatDate` (match other utils)

### 🟡 Suggestions (2)
- `src/hooks/useAuth.ts:30` — Deep nesting (4 levels)
  - Fix: Extract validation to separate function

### Summary
- Constants: ❌ (3 magic values found)
- Naming: ❌ (1 inconsistency)
- Structure: 🟡 (1 deep nesting)
```

**Kết quả:**
- ✅ Review time: 30 phút → 5 phút (giảm 83%)
- ✅ Catch 100% magic strings (thủ công thường miss)
- ✅ Consistent naming enforcement

---

### Scenario 4: Pivot Mid-Project

**Tình huống:** Đang code web app (Next.js), khách hàng yêu cầu thêm mobile app (React Native).

**Trước:**
```
❌ Setup mobile project từ đầu
❌ Duplicate logic giữa web và mobile
❌ Không có shared code structure
```

**Sau:**

```bash
# 1. Đang ở web project
ls
# next.config.js, package.json, tsconfig.json, ...

# 2. Pivot to monorepo
python .agents/scripts/load_agents.py --add react-native

# 3. Request
"Convert to monorepo: shared code, web app (Next.js), mobile app (React Native)"

# 4. AI tự động:
# - orchestrator: Plan monorepo structure
# - frontend-specialist: Setup web (Next.js)
# - mobile-developer: Setup mobile (React Native)
# - backend-specialist: Setup shared API layer

# 5. AI tạo structure
packages/
├── shared/          # Shared types, utils, hooks
├── web/             # Next.js app
├── mobile/          # React Native app
└── api/             # Shared API client

# 6. Migrate code
# AI help migrate và refactor existing code vào monorepo

# 7. Validate
python .agents/scripts/checklist.py packages/web
python .agents/scripts/checklist.py packages/mobile
```

**Kết quả:**
- ✅ Monorepo setup proper
- ✅ 70% code reuse (shared types, hooks, utils)
- ✅ Both apps working, consistent behavior

**Thời gian:** ~4-6 giờ (thay vì 2-3 ngày)

---

## 📊 So Sánh Thực Tế

| Task | Thủ Công | Với AG Kit | Tiết Kiệm |
|------|----------|------------|-----------|
| **Setup new project** | 1-2 giờ | 10-15 phút | 80% |
| **Fix performance** | 2-3 ngày | 2-3 giờ | 90% |
| **Code review** | 30 phút/PR | 5 phút/PR | 83% |
| **Pivot to monorepo** | 2-3 ngày | 4-6 giờ | 85% |

**Average time saved: 84%** 🚀

---

## 🆘 Khắc Phục Sự Cố

### "Agent not found" error
→ Kiểm tra manifest: `python .agents/scripts/load_agents.py --list`
→ Thêm stack: `python .agents/scripts/load_agents.py --add <stack>`

### "Memory not loading"
→ Kiểm tra health: `python .agents/scripts/load_memory.py --check`
→ Reinject: `python .agents/scripts/load_memory.py --inject`

### "Script import failed"
→ Chạy từ project root
→ Kiểm tra Python path: `python -c "import sys; print(sys.path)"`

### "Quá nhiều agents được nạp"
→ Xóa manifest cũ: `rm .agents/.session/active-agents.json`
→ Chạy lại: `python .agents/scripts/load_agents.py`

---

## 📚 Bước Tiếp Theo

- **Đọc chi tiết:** [USER-GUIDE.md](USER-GUIDE.md)
- **Hiểu architecture:** [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Xem dependencies:** [../../CODEBASE.md](../../CODEBASE.md)
- **Tùy chỉnh rules:** [../rules/RULES.md](../rules/RULES.md)

---

## 💡 Mẹo

1. **Nói tiếng Việt OK** — AI tự translate, code vẫn bằng English
2. **Slash commands** — Nhanh hơn gõ câu dài
3. **Memory system** — Lưu conventions để không phải nhắc lại
4. **Checklist script** — Chạy thường xuyên, sớm phát hiện lỗi
5. **Manifest-driven** — Chỉ nạp agent cần thiết, tiết kiệm context

---

## 📊 So Sánh

| Trước | Sau (với Manifest) |
|-------|-------------------|
| Nạp 16 agents mọi lúc | Nạp 6-12 agents theo stack |
| ~100K tokens context | ~30-50K tokens |
| AI routing nhiễu | Routing sạch, chính xác |
| Setup thủ công | Auto-detect 1 lệnh |

**Tiết kiệm: 40-70% token!**

---

> 🚀 **Bắt đầu ngay:**  
> `python .agents/scripts/session_boot.py`
