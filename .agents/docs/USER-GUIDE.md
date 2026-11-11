# AG Kit - Hướng Dẫn Sử Dụng

> Tài liệu chi tiết đầy đủ về AG Kit.

**📖 Mục lục:**
- [1. Tổng Quan](#1-tổng-quan)
- [2. Scripts Cốt Lõi](#2-scripts-cốt-lõi)
- [3. Hệ Thống Agent](#3-hệ-thống-agent)
- [4. Hệ Thống Memory](#4-hệ-thống-memory)
- [5. Workflows](#5-workflows)
- [6. Validation](#6-validation)
- [7. Tùy Chỉnh](#7-tùy-chỉnh)
- [8. Best Practices](#8-best-practices)
- [9. Khắc Phục Sự Cố](#9-khắc-phục-sự-cố)

---

## 1. Tổng Quan

### 1.1. AG Kit Là Gì?

```
AG Kit = Agents + Skills + Workflows + Scripts + Memory
```

| Component | Mục đích | Số lượng |
|-----------|----------|----------|
| **Agents** | Chuyên gia AI (backend, frontend, mobile...) | 16 |
| **Skills** | Kiến thức chuyên sâu, load theo nhu cầu | 46 |
| **Workflows** | Lệnh tắt cho tasks thường dùng | 15 |
| **Scripts** | Validation, loading, automation | 21 |
| **Memory** | Context lưu trữ giữa các session | User-defined |

### 1.2. Nguyên Tắc Thiết Kế

1. **Modular** — Skills load có điều kiện, không waste context
2. **Manifest-driven** — Agents chỉ load khi stack match
3. **Memory-persistent** — Quy ước, quyết định lưu cross-session
4. **Auto-routing** — AI tự detect domain → chọn agent
5. **Validation-first** — Scripts check code trước deploy

### 1.3. Cấu Trúc Files

```
project-root/
├── .cursorrules                    # Quy tắc IDE
├── README.md                       # Overview
├── CODEBASE.md                     # Map phụ thuộc
│
└── .agents/
    ├── agent/                      # 16 chuyên gia
    ├── skills/                     # 47 kỹ năng
    ├── workflows/                  # 17 lệnh tắt
    ├── rules/RULES.md             # Quy tắc master
    ├── memory/                     # Bộ nhớ lưu trữ
    ├── scripts/                    # Scripts master
    ├── docs/                       # Tài liệu (folder này)
    │   ├── GETTING-STARTED.md
    │   ├── USER-GUIDE.md           # File này
    │   └── QUICK-REFERENCE.md
    └── .session/                   # Runtime (gitignored)
        ├── active-agents.json
        └── memory-context.md
```

---

## 2. Scripts Cốt Lõi

### 2.1. `load_agents.py` — Generator Manifest

**Mục đích:** Auto-detect stack và tạo manifest chỉ nạp agents liên quan.

**Cách dùng:**

```bash
# Auto-detect và ghi manifest
python .agents/scripts/load_agents.py

# Xem without ghi
python .agents/scripts/load_agents.py --list

# Interactive menu (greenfield)
python .agents/scripts/load_agents.py --interactive

# Pivot: thêm stack mid-session
python .agents/scripts/load_agents.py --add rust
```

**Cách hoạt động:**

1. **Detection:** Scan file signals:
   - `package.json` + `"next"` → nextjs
   - `Cargo.toml` → rust
   - `pubspec.yaml` → flutter
   - `go.mod` → go
   - `requirements.txt` + `fastapi` → python-api
   - `*.unity`, `project.godot` → game

2. **Mapping:** Stack → Agents

3. **Core (luôn load):** orchestrator, project-planner, explorer-agent, debugger, code-reviewer, security-auditor

4. **Output:** `.agents/.session/active-agents.json`

**Manifest Structure:**

```json
{
  "generated_at": "2026-07-23T...",
  "stacks": ["nextjs", "rust"],
  "agents": ["orchestrator", "frontend-specialist", ...],
  "skipped": ["mobile-developer", "game-developer", ...],
  "pivot_keywords": {
    "rust": ["rust", "cargo", "tokio"],
    "react-native": ["react native", "expo", "mobile app"]
  }
}
```

**Pivot Protocol:**

Khi user mention keyword mà stack chưa có:
```
User: "Bây giờ thêm mobile app"
AI: detect "mobile app" → pivot_keywords → "react-native"
AI: python .agents/scripts/load_agents.py --add react-native
AI: Load mobile-developer.md
```

**Monorepo:**
- Detect `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json`
- Scan tất cả packages trong `apps/`, `packages/`, `services/`
- UNION agents của tất cả stacks

---

### 2.2. `load_memory.py` — Auto-Loader Memory

**Mục đích:** Inject memory vào session context tự động.

**Cách dùng:**

```bash
# Check health
python .agents/scripts/load_memory.py --check

# Print formatted memory
python .agents/scripts/load_memory.py

# Inject to session (AI reads this)
python .agents/scripts/load_memory.py --inject
```

**Cách hoạt động:**

1. Đọc `.agents/memory/MEMORY.md` (index)
2. Load tất cả `*.md` files trong `.agents/memory/`
3. Format thành structured context
4. Ghi vào `.agents/.session/memory-context.md`

**Thêm memory:**

**Cách 1: Via workflow**
```
/remember Luôn dùng Zustand cho state management
```

**Cách 2: Manual**
```bash
echo "## State Management\n- Zustand cho global\n- Context cho theme" >> .agents/memory/tech-stack.md
python .agents/scripts/load_memory.py --inject
```

---

### 2.3. `checklist.py` — Core Validation

**Mục đích:** Chạy validation theo priority trong development.

**Cách dùng:**

```bash
# Basic checks
python .agents/scripts/checklist.py .

# With performance (cần server)
python .agents/scripts/checklist.py . --url http://localhost:3000
```

**Thứ tự thực thi:**

| Priority | Check | Script | Critical? |
|----------|-------|--------|-----------|
| **P0** | Security | `security_scan.py` | YES |
| **P1** | Lint | `lint_runner.py` | YES |
| **P2** | Schema | `schema_validator.py` | YES |
| **P3** | Tests | `test_runner.py` | NO |
| **P4** | UX | `ux_audit.py` | NO |
| **P5** | SEO | `seo_checker.py` | NO |
| **P6** | Performance | `lighthouse_audit.py` | NO (cần --url) |

**Exit behavior:**
- Stop ở first **Critical** failure (P0-P2)
- Continue qua **Warnings** (P3-P6)
- Return non-zero exit code nếu fail

---

## 3. Hệ Thống Agent

### 3.1. Danh Sách 16 Agents

**Core (luôn load):**

| Agent | Domain | Khi dùng |
|-------|--------|----------|
| `orchestrator` | Điều phối đa agent | Tasks phức tạp cần nhiều góc nhìn |
| `project-planner` | Product discovery, MVP | Features mới, refactors |
| `explorer-agent` | Khám phá codebase | Audit ban đầu, hiểu cấu trúc |
| `debugger` | Root cause analysis | Bugs, crashes, hành vi lạ |
| `code-reviewer` | Quality, refactoring | Review, cleanup, naming |
| `security-auditor` | Security compliance | Security scans, pentesting |

**Theo stack (load by manifest):**

| Agent | Stack | Skills |
|-------|-------|--------|
| `backend-specialist` | Mọi backend | api-patterns, nodejs, python, database-design |
| `frontend-specialist` | React/Vue/Svelte/Angular | frontend-design, web-performance, tailwind |
| `mobile-developer` | React Native, Flutter | mobile-design |
| `game-developer` | Unity, Godot, Bevy | game-development |
| `database-architect` | Mọi có DB | database-design |
| `test-engineer` | Tất cả | testing-patterns, tdd, webapp-testing |
| `devops-engineer` | Tất cả | deployment, server-management |
| `performance-optimizer` | Web, mobile | performance-profiling |
| `seo-specialist` | Web | seo-fundamentals, geo |
| `documentation-writer` | Tất cả | documentation-templates |

### 3.2. Auto-Routing

AI tự phân tích request và chọn agent:

**Ví dụ 1: Backend API**
```
User: "Tạo API endpoint cho user registration"

AI Internal:
1. Detect domain: API, authentication, backend
2. Select: backend-specialist
3. Load skills: api-patterns, database-design
4. Announce: 🤖 Applying knowledge of @backend-specialist
5. Execute
```

**Ví dụ 2: Mobile UI**
```
User: "Thiết kế màn hình profile với dark mode"

AI Internal:
1. Detect: Mobile UI, design, theme
2. Select: mobile-developer
3. Load skills: mobile-design
4. Read: mobile-design/SKILL.md, platform-ios.md
5. Announce: 🤖 Applying knowledge of @mobile-developer
6. Execute
```

### 3.3. Manual Selection

Override auto-routing:

```
@backend-specialist viết API cho payment với Stripe
@mobile-developer optimize FlatList performance
@security-auditor scan supply chain vulnerabilities
```

---

## 4. Hệ Thống Memory

### 4.1. Cấu Trúc

```
.agents/memory/
├── MEMORY.md                    # Index (list topics)
├── project-conventions.md       # Quy ước code, branch strategy
├── tech-stack-decisions.md      # Quyết định stack, framework
└── user-preferences.md          # Preferences AI behavior
```

**Memory persists giữa các session** — AI không hỏi lại.

### 4.2. Thêm Memory

**Method 1: Via workflow**
```
User: /remember Luôn dùng React Query cho server state

AI: Ghi vào tech-stack-decisions.md:
    ## State Management
    - React Query cho server state (caching, refetch)
    - Zustand cho client state (UI, local)
    
AI: Update MEMORY.md index
```

**Method 2: Direct edit**
```bash
nano .agents/memory/project-conventions.md
python .agents/scripts/load_memory.py --inject
```

### 4.3. Topics Đề Xuất

| Topic | File | Lưu gì |
|-------|------|--------|
| **Project Conventions** | `project-conventions.md` | Branch strategy, commit format, file naming |
| **Tech Stack Decisions** | `tech-stack-decisions.md` | Framework, libraries, "never use X" |
| **API Conventions** | `api-conventions.md` | Endpoint naming, error format, versioning |
| **Database Conventions** | `database-conventions.md` | Schema rules, migration, indexes |
| **UI/UX Guidelines** | `ui-ux-guidelines.md` | Design system, colors, spacing |
| **Security Policies** | `security-policies.md` | Auth flow, secrets, CORS |
| **Testing Strategy** | `testing-strategy.md` | Coverage targets, mock strategy |

---

## 5. Workflows

### 5.1. Danh Sách 18 Workflows

| Workflow | Mục đích | Khi dùng |
|----------|----------|----------|
| `/brainstorm` | Socratic questioning | Trước implement features không rõ |
| `/create` | Tạo feature mới | Build functionality mới |
| `/plan` | Task breakdown | Planning multi-step work |
| `/debug` | Debug hệ thống | Bugs phức tạp, production issues |
| `/review` | Review quality | Trước PR, tìm tech debt |
| `/test` | Run test suite | Sau code changes |
| `/deploy` | Deployment checklist | Trước production deploy |
| `/enhance` | Cải thiện code | Refactoring, optimization |
| `/orchestrate` | Điều phối đa agent | Tasks phức tạp nhiều agents |
| `/coordinate` | Điều phối nâng cao | Parallel analysis với synthesis |
| `/preview` | Start/stop server | Quick iteration trên UI |
| `/status` | Show status | Progress tracking |
| `/verify` | Chứng minh code chạy | Runtime verification |
| `/remember` | Save to memory | Persist decisions |
| `/load-memory` | Inject memory vào chat | Đầu session / chọn topics |
| `/explore-codebase` | Knowledge graph / Understand | Join dự án, map kiến trúc |
| `/reload` | Reload manifest | Stack pivot mid-session |

### 5.2. Ví Dụ Workflows

#### `/brainstorm`
```
User: /brainstorm

AI: Trước khi implement, cần hiểu:
1. Purpose: Feature solve vấn đề gì?
2. Users: Ai dùng feature này?
3. Scope: Must-have vs nice-to-have?

User: [Trả lời]
AI: Task breakdown → Architecture → Implementation
```

#### `/create`
```
User: /create user authentication system

AI: Phase 1 Planning → Auth flow, DB, Security
AI: Phase 2 Implementation → Code generation
AI: Phase 3 Verification → Tests, security scan
Done!
```

#### `/reload`
```
User: /reload react-native

AI: Running: python .agents/scripts/load_agents.py --add react-native
✓ Manifest updated. Active agents: + mobile-developer
Ready for mobile development.
```

---

## 6. Validation

### 6.1. 3 Levels

**Level 1: Local (Quick - 30-60s)**
```bash
python .agents/scripts/checklist.py .
```
Checks: Security, Lint, Schema, Tests (unit), UX, SEO

**Level 2: Pre-Commit (Medium - 1-2min)**
```bash
python .agents/scripts/checklist.py .
# + manual review changes
```

**Level 3: Pre-Deploy (Full - 5-10min)**
```bash
npm run dev &
python .agents/scripts/verify_all.py . --url http://localhost:3000
```
Everything + Lighthouse + E2E

### 6.2. CI/CD Integration

**GitHub Actions:**
```yaml
- name: AG Kit Validation
  run: |
    python .agents/scripts/load_agents.py
    python .agents/scripts/checklist.py .
```

**Pre-commit Hook:**
```bash
#!/bin/bash
python .agents/scripts/checklist.py .
if [ $? -ne 0 ]; then
  echo "❌ Validation failed"
  exit 1
fi
```

---

## 7. Tùy Chỉnh

### 7.1. Sửa Rules

```bash
# Edit master
code .agents/rules/RULES.md

# Sync sang .cursorrules
cp .agents/rules/RULES.md .cursorrules

# Verify
diff .agents/rules/RULES.md .cursorrules
```

### 7.2. Thêm Agent Mới

**Step 1:** Tạo agent file
```bash
cat > .agents/agent/api-specialist.md << 'EOF'
---
name: api-specialist
description: API design expert
tools: Read, Grep, Glob, Bash, Edit, Write
skills: clean-code, api-patterns
---
# API Specialist
[... content ...]
EOF
```

**Step 2:** Update ARCHITECTURE.md  
**Step 3:** Add vào `load_agents.py` (nếu stack-specific)  
**Step 4:** Update CODEBASE.md

### 7.3. Thêm Skill Mới

**Step 1:** Tạo skill folder
```bash
mkdir -p .agents/skills/my-skill
```

**Step 2:** Tạo SKILL.md với frontmatter `when_to_use`  
**Step 3:** Add vào agent frontmatter `skills:`  
**Step 4:** Update ARCHITECTURE.md

---

## 8. Best Practices

### 8.1. Daily Workflow

```bash
# Sáng: Start session
python .agents/scripts/load_agents.py
python .agents/scripts/load_memory.py --inject

# Work: Code (AI auto-routes)

# Trước commit:
python .agents/scripts/checklist.py .

# Trước deploy:
npm run dev &
python .agents/scripts/checklist.py . --url http://localhost:3000
```

### 8.2. Memory Management

✓ Save conventions sớm (tuần đầu)  
✓ Update khi pivot tech stack  
✓ Review monthly, xóa stale  
✓ Keep files < 200 lines each

### 8.3. Validation Cadence

| Frequency | Check | Command |
|-----------|-------|---------|
| **Mỗi save** | IDE auto | Cursor linter |
| **Mỗi commit** | Core | `checklist.py .` |
| **Mỗi PR** | Full | `verify_all.py . --url` |
| **Trước deploy** | Production | `verify_all.py . --url prod` |
| **Hàng tuần** | Audit | `verify_all.py . --url staging` |

---

## 9. Khắc Phục Sự Cố

### 9.1. Vấn Đề Thường Gặp

#### "Agent not found"

**Problem:** AI nói "mobile-developer không có"

**Solution:**
```bash
# Check manifest
python .agents/scripts/load_agents.py --list

# Add stack
python .agents/scripts/load_agents.py --add react-native

# Hoặc
/reload react-native
```

#### "Memory not loading"

**Problem:** AI không nhớ conventions

**Solution:**
```bash
# Check health
python .agents/scripts/load_memory.py --check

# Reinject
python .agents/scripts/load_memory.py --inject

# Verify
cat .agents/.session/memory-context.md
```

#### "Script import failed"

**Problem:** `ModuleNotFoundError`

**Solution:**
```bash
# Chạy từ root
pwd  # Phải ở root

# Check Python path
python -c "import sys; print(sys.path)"
```

#### "Quá nhiều agents"

**Problem:** Context bloated, chậm

**Solution:**
```bash
# Xóa manifest cũ
rm .agents/.session/active-agents.json

# Regenerate
python .agents/scripts/load_agents.py

# Verify lean
python .agents/scripts/load_agents.py --list
```

### 9.2. Debug Mode

```bash
# Verbose
export AG_VERBOSE=true
python .agents/scripts/checklist.py .

# Skip checks
export AG_SKIP_SECURITY=true
export AG_SKIP_TESTS=true
```

### 9.3. Reset Everything

```bash
# Clean session
rm -rf .agents/.session

# Regenerate
python .agents/scripts/load_agents.py
python .agents/scripts/load_memory.py --inject

# Verify
python .agents/scripts/load_agents.py --list
python .agents/scripts/load_memory.py --check
```

---

## 9.4. Use Cases Thực Tế Với Code

### Use Case 1: Extract Magic Strings

**Trước:**
```typescript
// ❌ components/UserProfile.tsx
export function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('https://api.example.com/user')
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  return (
    <div>
      {user?.status === 'active' && <Badge>Active</Badge>}
      {user?.role === 'admin' && <Button>Admin Panel</Button>}
    </div>
  );
}
```

**Vấn đề:**
- ❌ Magic URL: `'https://api.example.com/user'`
- ❌ Magic strings: `'active'`, `'admin'`
- ❌ Không có constants file

**Sau khi /review:**

AI output:
```markdown
🔴 BLOCKING (3 issues)
- Line 5: Magic string 'https://api.example.com/user'
  Fix: Extract to API_ENDPOINTS.user
- Line 12: Magic string 'active'
  Fix: Extract to USER_STATUS.ACTIVE
- Line 13: Magic string 'admin'
  Fix: Extract to USER_ROLES.ADMIN
```

**Code sau fix:**
```typescript
// ✅ lib/constants.ts
export const API_ENDPOINTS = {
  user: '/api/user',
  posts: '/api/posts',
  auth: '/api/auth'
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
} as const;

// ✅ components/UserProfile.tsx
import { API_ENDPOINTS, USER_STATUS, USER_ROLES } from '@/lib/constants';

export function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(API_ENDPOINTS.user)
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  return (
    <div>
      {user?.status === USER_STATUS.ACTIVE && <Badge>Active</Badge>}
      {user?.role === USER_ROLES.ADMIN && <Button>Admin Panel</Button>}
    </div>
  );
}
```

**Lợi ích:**
- ✅ Type-safe (autocomplete)
- ✅ Dễ refactor (change 1 chỗ)
- ✅ Testable (mock constants)
- ✅ Searchable (find all usages)

---

### Use Case 2: Performance Optimization

**Trước (Slow):**
```typescript
// ❌ app/dashboard/page.tsx
export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Sequential fetches (waterfall)
    fetch('/api/posts').then(r => r.json()).then(setPosts);
    fetch('/api/users').then(r => r.json()).then(setUsers);
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  return (
    <div>
      {/* Rendering ALL posts (no pagination) */}
      {posts.map(post => (
        <ExpensiveComponent key={post.id} post={post} />
      ))}
      
      {/* No memoization */}
      <StatsChart data={stats} users={users} />
    </div>
  );
}

// ❌ components/ExpensiveComponent.tsx
export function ExpensiveComponent({ post }) {
  // Heavy computation on EVERY render
  const processedData = processPost(post);
  
  return <div>{processedData.title}</div>;
}
```

**Vấn đề:**
- ❌ Sequential API calls → 3× latency
- ❌ No pagination → render 1000+ items
- ❌ Heavy computation không memoized
- ❌ No code splitting

**Metrics:**
- LCP: 4.2s
- INP: 650ms
- Bundle: 2.8MB

**Sau optimize (request AI):**

```typescript
// ✅ app/dashboard/page.tsx
export default function Dashboard() {
  // Parallel fetches with SWR
  const { data: posts } = useSWR('/api/posts');
  const { data: users } = useSWR('/api/users');
  const { data: stats } = useSWR('/api/stats');

  // Pagination
  const [page, setPage] = useState(1);
  const paginatedPosts = posts?.slice((page - 1) * 20, page * 20);

  return (
    <div>
      {/* Only render visible items */}
      {paginatedPosts?.map(post => (
        <ExpensiveComponent key={post.id} post={post} />
      ))}
      
      {/* Memoized chart */}
      <MemoizedStatsChart data={stats} users={users} />
      
      <Pagination page={page} onChange={setPage} />
    </div>
  );
}

// ✅ components/ExpensiveComponent.tsx
export const ExpensiveComponent = memo(function ExpensiveComponent({ post }) {
  // Memoize heavy computation
  const processedData = useMemo(() => processPost(post), [post.id]);
  
  return <div>{processedData.title}</div>;
});

// ✅ Code splitting for heavy chart
const MemoizedStatsChart = dynamic(() => import('./StatsChart'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**Metrics sau:**
- LCP: 4.2s → **1.6s** (giảm 62%)
- INP: 650ms → **170ms** (giảm 74%)
- Bundle: 2.8MB → **750KB** (giảm 73%)

**Lợi ích:**
- ✅ Parallel fetches → fast load
- ✅ Pagination → less DOM nodes
- ✅ Memoization → less computation
- ✅ Code splitting → smaller initial bundle

---

### Use Case 3: API Error Handling

**Trước (Brittle):**
```typescript
// ❌ lib/api.ts
export async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json(); // No error handling!
}

// ❌ components/UserCard.tsx
export function UserCard({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser); // What if fails?
  }, [userId]);

  return <div>{user.name}</div>; // Crashes if user is null!
}
```

**Vấn đề:**
- ❌ No status code check
- ❌ No retry logic
- ❌ No error boundaries
- ❌ No loading state
- ❌ Crashes on null

**Sau (Robust):**
```typescript
// ✅ lib/api.ts
export async function fetchUser(id: string) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(`/api/users/${id}`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

// ✅ components/UserCard.tsx
export function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetchUser(userId)
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorAlert message={error} />;
  if (!user) return <EmptyState />;

  return <div>{user.name}</div>;
}
```

**Lợi ích:**
- ✅ Retry logic → resilient
- ✅ Status check → proper errors
- ✅ Loading state → better UX
- ✅ Error handling → no crashes
- ✅ Null check → defensive

---

### Use Case 4: Database Schema Evolution

**Trước (Unstructured):**
```prisma
// ❌ prisma/schema.prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String
}

model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  userId  Int    // No relation!
}
```

**Vấn đề:**
- ❌ No foreign key constraints
- ❌ No indexes
- ❌ No soft deletes
- ❌ No timestamps
- ❌ Email not unique

**Sau (request @database-architect):**
```prisma
// ✅ prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete

  @@index([email])
  @@index([deletedAt])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String   @db.Text
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@index([authorId])
  @@index([published, deletedAt])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

**Migration:**
```bash
npx prisma migrate dev --name improve-schema
```

**Lợi ích:**
- ✅ Referential integrity (foreign keys)
- ✅ Query performance (indexes)
- ✅ Soft deletes (audit trail)
- ✅ Audit fields (created/updated)
- ✅ Type safety (enums)

---

### Use Case 5: Component Structure

**Trước (God Component):**
```typescript
// ❌ components/Dashboard.tsx (500 lines)
export function Dashboard() {
  // 20 useState hooks
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  // ... 17 more

  // 10 useEffect hooks
  useEffect(() => { /* fetch users */ }, []);
  useEffect(() => { /* fetch posts */ }, []);
  // ... 8 more

  // 15 handler functions
  const handleUserClick = () => { /* 50 lines */ };
  const handlePostCreate = () => { /* 60 lines */ };
  // ... 13 more

  // 200 lines of JSX
  return (
    <div>
      {/* All logic inline */}
    </div>
  );
}
```

**Vấn đề:**
- ❌ 500 lines → unmaintainable
- ❌ All logic in one file
- ❌ Hard to test
- ❌ No reusability

**Sau (Clean Architecture):**
```typescript
// ✅ hooks/useDashboardData.ts
export function useDashboardData() {
  const { data: users } = useSWR('/api/users');
  const { data: posts } = useSWR('/api/posts');
  const { data: stats } = useSWR('/api/stats');

  return { users, posts, stats };
}

// ✅ components/Dashboard/index.tsx (50 lines)
export function Dashboard() {
  const { users, posts, stats } = useDashboardData();

  return (
    <div>
      <DashboardHeader />
      <StatsOverview stats={stats} />
      <UserList users={users} />
      <PostList posts={posts} />
    </div>
  );
}

// ✅ components/Dashboard/StatsOverview.tsx (30 lines)
export function StatsOverview({ stats }) {
  return (
    <div>
      <StatCard label="Users" value={stats?.userCount} />
      <StatCard label="Posts" value={stats?.postCount} />
    </div>
  );
}

// ✅ components/Dashboard/UserList.tsx (40 lines)
export function UserList({ users }) {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(
    () => filterUsers(users, filter),
    [users, filter]
  );

  return (
    <div>
      <UserFilter value={filter} onChange={setFilter} />
      {filtered?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

**Lợi ích:**
- ✅ 500 lines → 5 files × 30-50 lines each
- ✅ Separation of concerns
- ✅ Testable (each file independently)
- ✅ Reusable (extract common patterns)
- ✅ Readable (clear responsibilities)

---

## 10. FAQ


**Q: Phải chạy load_agents.py mỗi lần mở project?**  
A: Không. Manifest lưu ở `.agents/.session/active-agents.json`. Chỉ chạy khi:
- Lần đầu trong project
- Sau switch branch có stack khác
- Sau pivot mid-session

**Q: Memory có bị overwrite không?**  
A: Không. `load_memory.py --inject` chỉ READ và inject, không modify source.

**Q: AI tự động load memory không?**  
A: Phải chạy script. Sau đó AI đọc từ `.agents/.session/memory-context.md`.

**Q: Không muốn dùng memory?**  
A: Skip. Memory là optional. AI vẫn hoạt động, chỉ phải repeat conventions.

**Q: checklist.py chạy trong CI/CD được không?**  
A: Được. Exit code 0 = pass, non-zero = fail.

**Q: Project có cả web + mobile (monorepo)?**  
A: `load_agents.py` tự detect và UNION agents. VD: nextjs + react-native → load cả frontend + mobile.

**Q: Folder có nhiều dự án độc lập (backend/, frontend/, mobile/) nhưng KHÔNG phải monorepo?**  
A: Script sẽ hỏi "Which project are you working on?" → Chọn 1 project hoặc "all" để union. Hoặc dùng `--project backend` để chỉ định trực tiếp.

---

## 11. Resources

- **Quick Start:** [GETTING-STARTED.md](GETTING-STARTED.md)
- **Cheat Sheet:** [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
- **Architecture:** [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Dependencies:** [../../CODEBASE.md](../../CODEBASE.md)
- **Scripts:** [../scripts/README.md](../scripts/README.md)
- **Rules:** [../rules/RULES.md](../rules/RULES.md)

---

> 💡 **Tip:** Bookmark file này. Mỗi lần quên command, Ctrl+F tìm ngay.
