# AG Kit - Tham Khảo Nhanh

> Cheat sheet cho daily workflow. In ra hoặc bookmark!

---

## 🚀 Khởi Động Session

```bash
# 1. Nạp agents (tự động detect stack)
python .agents/scripts/load_agents.py

# 2. Nạp memory (context lưu trữ)
python .agents/scripts/load_memory.py --inject

# Xong! Bắt đầu code.
```

---

## 💬 Lệnh Tắt (Slash Commands)

| Lệnh | Chức năng | Ví dụ |
|------|-----------|-------|
| `/brainstorm` | Hỏi Socratic | `/brainstorm` |
| `/create` | Tạo feature mới | `/create hệ thống auth` |
| `/plan` | Phân tách task | `/plan refactor DB layer` |
| `/review` | Scan chất lượng code | `/review` |
| `/test` | Chạy tests | `/test` |
| `/deploy` | Checklist deploy | `/deploy` |
| `/reload` | Nạp lại agents | `/reload rust` |
| `/remember` | Lưu quy ước | `/remember dùng Zustand` |
| `/status` | Xem tiến độ | `/status` |
| `/verify` | Chứng minh code chạy | `/verify` |
| `/orchestrate` | Điều phối đa agent | `/orchestrate` |
| `/coordinate` | Điều phối nâng cao | `/coordinate` |
| `/enhance` | Cải thiện code | `/enhance` |
| `/preview` | Start/stop server | `/preview` |
| `/debug` | Debug hệ thống | `/debug` |

---

## 🤖 Chọn Agent

**Tự động (khuyên dùng):**
```
"Tạo API endpoint cho payments"
→ AI tự chọn backend-specialist
```

**Thủ công (override):**
```
@mobile-developer optimize FlatList performance
@security-auditor scan lỗ hổng OWASP
```

**16 Agents Có Sẵn:**

**Core (luôn có):**
- `orchestrator` — Điều phối đa agent
- `project-planner` — Lập kế hoạch MVP
- `backend-specialist` — APIs, server
- `frontend-specialist` — UI/UX, Next.js
- `mobile-developer` — React Native, Flutter
- `game-developer` — Unity, Godot
- `database-architect` — Thiết kế schema
- `security-auditor` — OWASP, pentesting
- `code-reviewer` — Review, refactoring
- `test-engineer` — Jest, Playwright
- `debugger` — Phân tích root cause
- `devops-engineer` — CI/CD, Docker
- `performance-optimizer` — Core Web Vitals
- `seo-specialist` — SEO optimization
- `documentation-writer` — Viết docs
- `explorer-agent` — Khám phá codebase

---

## ✅ Validation

**Nhanh (30-60s):**
```bash
python .agents/scripts/checklist.py .
```
Checks: Security, Lint, Schema, Tests, UX, SEO

**Đầy đủ (5-10min, cần server):**
```bash
npm run dev &
python .agents/scripts/checklist.py . --url http://localhost:3000
```
Thêm: Lighthouse, Performance profiling

---

## 🧠 Memory Commands

**Thêm:**
```bash
/remember Luôn dùng TypeScript strict mode
```

**Xem:**
```bash
cat .agents/memory/MEMORY.md
cat .agents/memory/project-conventions.md
```

**Reload:**
```bash
python .agents/scripts/load_memory.py --inject
```

---

## 🔄 Agent Manifest

**Xem hiện tại:**
```bash
python .agents/scripts/load_agents.py --list
```

**Thêm stack (pivot):**
```bash
python .agents/scripts/load_agents.py --add rust
# Hoặc: /reload rust
```

**Tạo lại:**
```bash
rm .agents/.session/active-agents.json
python .agents/scripts/load_agents.py
```

---

## 🛠️ Scripts

| Script | Mục đích | Lệnh |
|--------|----------|------|
| `load_agents.py` | Detect stack → manifest | `python .agents/scripts/load_agents.py` |
| `load_memory.py` | Auto-inject memory | `python .agents/scripts/load_memory.py --inject` |
| `checklist.py` | Validation cơ bản | `python .agents/scripts/checklist.py .` |
| `verify_all.py` | Validation đầy đủ | `python .agents/scripts/verify_all.py . --url <URL>` |

---

## 📁 Files Quan Trọng

| File | Mục đích |
|------|----------|
| `.cursorrules` | Quy tắc IDE (mirror của RULES.md) |
| `.agents/rules/RULES.md` | Quy tắc master (edit ở đây) |
| `.agents/.session/active-agents.json` | Manifest hiện tại |
| `.agents/.session/memory-context.md` | Memory đã inject |
| `.agents/memory/MEMORY.md` | Index memory |
| `CODEBASE.md` | Phụ thuộc files |

---

## 🚨 Khắc Phục Sự Cố

| Vấn đề | Giải pháp |
|--------|-----------|
| "Agent not found" | `python .agents/scripts/load_agents.py --add <stack>` |
| "Memory not loading" | `python .agents/scripts/load_memory.py --inject` |
| "Script import failed" | Chạy từ project root, check Python path |
| "Quá nhiều agents" | `rm .agents/.session/active-agents.json && python .agents/scripts/load_agents.py` |
| "Validation treo" | Kill process, chạy không có `--url` |

---

## 📚 Tài Liệu

| Doc | Dùng cho |
|-----|----------|
| [README.md](../../README.md) | Overview, quick start |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Setup, onboarding |
| [USER-GUIDE.md](USER-GUIDE.md) | Reference đầy đủ |
| [CODEBASE.md](../../CODEBASE.md) | Dependencies, protocols |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture |

---

## 💡 Workflow Hàng Ngày

```
1. Sáng:
   python .agents/scripts/load_agents.py
   python .agents/scripts/load_memory.py --inject

2. Code:
   (AI tự động route agents)

3. Trước commit:
   python .agents/scripts/checklist.py .

4. Trước deploy:
   npm run dev &
   python .agents/scripts/checklist.py . --url http://localhost:3000

5. Deploy!
```

---

## ⚡ Mẹo Nhanh

- **Tiếng Việt OK** — AI tự translate
- **Slash commands** — Nhanh hơn gõ dài
- **Memory** — Lưu conventions để không nhắc lại
- **Checklist** — Chạy thường xuyên, sớm bắt bugs
- **Manifest** — Chỉ nạp cần thiết, tiết kiệm context

---

## 📊 Stats

- **16 Agents** (6 core + 10 theo stack)
- **50 top-level Skills** (+ nested packages)
- **18 Workflows** (slash commands)
- **27 Scripts** (11 master + 16 skill-level)

**Tiết kiệm:** 40-70% token context

---

## 🔧 Common Problems & Quick Fixes

### Problem: Build Lỗi Sau Khi Pull Code

**Triệu chứng:**
```bash
npm run build
# Error: Cannot find module '@/lib/utils'
```

**Quick Fix:**
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Check TypeScript paths
cat tsconfig.json | grep paths

# 3. Verify imports
npx tsc --noEmit

# 4. Rebuild
npm run build
```

---

### Problem: Tests Fail Sau Khi Refactor

**Triệu chứng:**
```bash
npm test
# FAIL: TypeError: Cannot read property 'map' of undefined
```

**Quick Fix:**
```bash
# 1. Check test setup
cat src/setupTests.ts

# 2. Run single test
npm test -- UserCard.test.tsx

# 3. Update snapshots
npm test -- -u

# 4. Mock external deps
# Add to test:
jest.mock('@/lib/api', () => ({
  fetchUser: jest.fn(() => Promise.resolve({ name: 'Test' }))
}));
```

---

### Problem: Performance Degradation

**Triệu chứng:**
- Page load chậm đột ngột
- LCP > 4s
- High memory usage

**Quick Fix:**
```bash
# 1. Profile bundle
npx @next/bundle-analyzer

# 2. Check for large deps
du -sh node_modules/* | sort -hr | head -10

# 3. Analyze render performance
# Add to component:
import { Profiler } from 'react';

<Profiler id="Dashboard" onRender={(id, phase, actualTime) => {
  if (actualTime > 100) console.warn(`Slow render: ${actualTime}ms`);
}}>
  <Dashboard />
</Profiler>

# 4. Run checklist
python .agents/scripts/checklist.py . --url http://localhost:3000
```

---

### Problem: Database Migration Conflict

**Triệu chứng:**
```bash
npx prisma migrate dev
# Error: Migration conflict detected
```

**Quick Fix:**
```bash
# 1. Resolve conflict
npx prisma migrate resolve --applied <migration-name>

# 2. Reset (DEV ONLY!)
npx prisma migrate reset

# 3. Generate new migration
npx prisma migrate dev --name fix-conflict

# 4. Verify
npx prisma db push
npx prisma studio  # Check data
```

---

### Problem: API 500 Error Sau Deploy

**Triệu chứng:**
- Local works, production fails
- Error: Internal Server Error

**Quick Fix:**
```bash
# 1. Check logs
vercel logs --follow
# or
docker logs <container> --tail 100

# 2. Verify env vars
vercel env ls
# Check missing: DATABASE_URL, JWT_SECRET, etc.

# 3. Test API route locally
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# 4. Add error logging
// api/route.ts
export async function POST(req: Request) {
  try {
    // ...
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

### Problem: Memory Leak (React)

**Triệu chứng:**
- Tab memory tăng dần
- Browser lag sau một lúc

**Quick Fix:**
```typescript
// ❌ Bad: useEffect no cleanup
useEffect(() => {
  const interval = setInterval(() => fetchData(), 1000);
}, []);

// ✅ Good: cleanup
useEffect(() => {
  const interval = setInterval(() => fetchData(), 1000);
  return () => clearInterval(interval);
}, []);

// ❌ Bad: event listener no cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ Good: cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

### Problem: Prisma Schema Drift

**Triệu chứng:**
```bash
npx prisma generate
# Warning: Your database is out of sync with your schema
```

**Quick Fix:**
```bash
# 1. Pull current DB state
npx prisma db pull

# 2. Compare with schema.prisma
git diff prisma/schema.prisma

# 3. Create migration
npx prisma migrate dev --name sync-schema

# 4. Verify
npx prisma migrate status
```

---

### Problem: TypeScript "any" Errors Sau Update

**Triệu chứng:**
```bash
tsc
# Error: Parameter 'x' implicitly has an 'any' type
```

**Quick Fix:**
```typescript
// ❌ Before
function handleSubmit(data) {
  // ...
}

// ✅ After
interface FormData {
  email: string;
  password: string;
}

function handleSubmit(data: FormData) {
  // ...
}

// For quick fix (temporary):
// @ts-ignore (DON'T USE IN PRODUCTION!)
function handleSubmit(data: any) {
  // ...
}
```

---

### Problem: Git Merge Conflict in package-lock.json

**Triệu chứng:**
```bash
git merge main
# CONFLICT in package-lock.json
```

**Quick Fix:**
```bash
# 1. Accept theirs
git checkout --theirs package-lock.json

# 2. Regenerate
rm package-lock.json
npm install

# 3. Commit
git add package-lock.json
git commit -m "fix: regenerate package-lock"
```

---

## 🔗 Stack Detection


| Signal File | Stack Detected | Agents Loaded |
|-------------|----------------|---------------|
| `package.json` + `"next"` | nextjs | frontend, backend, database, test, devops, performance |
| `package.json` + `"react-native"` | react-native | mobile, test |
| `Cargo.toml` | rust | backend |
| `pubspec.yaml` | flutter | mobile, test |
| `go.mod` | go | backend, devops |
| `requirements.txt` + `fastapi` | python-api | backend, database, test, devops |
| `*.unity`, `project.godot` | game | game-developer, test |

---

## 🎯 Exit Codes

| Code | Ý nghĩa | Hành động |
|------|---------|-----------|
| 0 | Tất cả pass | Proceed |
| 1 | Critical fail | Fix ngay, block commit |
| 2 | Non-critical fail | Review warnings |
| 3 | Script error | Check setup |

---

## 📦 Environment Variables

```bash
# Verbose output
export AG_VERBOSE=true

# Skip checks
export AG_SKIP_SECURITY=true
export AG_SKIP_TESTS=true

# Timeout
export AG_TIMEOUT=60

# Strict mode (warnings = failures)
export AG_STRICT=true
```

---

> **Version:** 1.0.0 | **Status:** ✅ Production Ready
> 
> 🚀 **Bắt đầu:** `python .agents/scripts/load_agents.py && python .agents/scripts/load_memory.py --inject`
