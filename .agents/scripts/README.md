# AG Kit Validation Scripts

> Master validation và orchestration scripts cho AG Kit agent system.

---

## Tổng Quan

Thư mục `.agents/scripts/` chứa **master orchestration scripts** điều phối validation trên toàn bộ project. Các scripts này gọi skill-level scripts nằm trong `.agents/skills/*/scripts/`.

---

## Master Scripts

### `checklist.py` — Incremental Validation

**Mục đích:** Chạy core validation checks trong development (security, lint, tests, UX, SEO).

**Sử dụng:**
```bash
# Từ project root
python .agents/scripts/checklist.py .

# Với URL cho performance checks (tùy chọn)
python .agents/scripts/checklist.py . --url http://localhost:3000
```

**Thứ Tự Ưu Tiên:**
1. **P0: Security** → `security_scan.py` (vulnerabilities, secrets, OWASP)
2. **P1: Lint** → `lint_runner.py` (code quality, type coverage)
3. **P2: Schema** → `schema_validator.py` (database integrity, nếu có DB)
4. **P3: Tests** → `test_runner.py` (unit, integration)
5. **P4: UX** → `ux_audit.py` (psychology laws, accessibility)
6. **P5: SEO** → `seo_checker.py` (meta tags, structure)
7. **P6: Performance** → `lighthouse_audit.py` (chỉ khi có `--url`)

**Exit Behavior:**
- Dừng tại first **Critical** failure (P0–P2)
- Tiếp tục qua **Warnings** (P3–P6)
- Return non-zero exit code nếu bất kỳ check nào fail

**Khi Nào Dùng:**
- Sau mỗi code change
- Trước khi commit
- Trong feature development
- Pre-PR review

---

### `verify_all.py` — Full Pre-Deploy Suite

**Mục đích:** Comprehensive verification trước production deployment.

**Sử dụng:**
```bash
# Full suite (cần running server)
python .agents/scripts/verify_all.py . --url http://localhost:3000
```

**Nó Chạy Gì:**
1. Tất cả trong `checklist.py` (P0–P5)
2. **Lighthouse audit** (Core Web Vitals, performance scores)
3. **Playwright E2E tests** (full user flow validation)
4. **Bundle analysis** (nếu applicable)
5. **Mobile audit** (nếu phát hiện mobile app)
6. **i18n check** (nếu có localization files)

**Exit Behavior:**
- Dừng tại first critical failure
- Generate detailed report
- Lưu artifacts (screenshots, traces) khi failure

**Khi Nào Dùng:**
- Trước deploy production
- Trước major releases
- Sau significant refactors
- Weekly trên staging environment

---

### `session_boot.py` — One-Command Session Start

**Mục đích:** Boot session đầy đủ trong một lệnh (rules sync + agents + memory).

**Sử dụng:**
```bash
python .agents/scripts/session_boot.py
python .agents/scripts/session_boot.py --skip-install   # bỏ qua install-agents.js
python .agents/scripts/session_boot.py --interactive  # chọn stack thủ công
```

**Thứ tự:**
1. `node .agents/install-agents.js` (nếu có Node.js)
2. `load_agents.py`
3. `load_memory.py --inject`

**Khi Nào Dùng:**
- Mỗi lần bắt đầu session làm việc
- Sau clone repo hoặc pull thay đổi rules/memory

---

### `smoke_test.py` — Kit Health Check

**Mục đích:** Verify AG Kit integrity (counts, routing, memory, scripts).

**Sử dụng:**
```bash
python .agents/scripts/smoke_test.py
python .agents/scripts/smoke_test.py --verbose
```

**Kiểm tra:**
- 16 agents, 50 top-level skills (+ nested), 18 workflows
- 27 scripts (11 master + 16 skill-level)
- Tất cả skills có `when_to_use`
- Không còn stale agent refs (product-owner, penetration-tester, …)
- Memory topics đã seed
- `load_agents.py --list` và `load_memory.py --check` chạy được
- Docs không còn số liệu skill/workflow lỗi thời (smoke so với EXPECTED_*)

---

### `load_agents.py` — Agent Manifest Generator

**Mục đích:** Auto-detect project stack và generate `.agents/.session/active-agents.json` manifest để giữ context lean.

**Sử dụng:**
```bash
# Auto-detect stack và write manifest
python .agents/scripts/load_agents.py

# Force interactive menu (greenfield project)
python .agents/scripts/load_agents.py --interactive

# Print detected stack mà không write
python .agents/scripts/load_agents.py --list

# Pivot: thêm stack vào existing manifest (mid-session)
python .agents/scripts/load_agents.py --add rust
```

**Stack Detection:**
- Scan signal files: `package.json`, `Cargo.toml`, `pubspec.yaml`, `go.mod`, etc.
- Map detected stacks sang relevant agents
- Write manifest listing chỉ active agents
- Skip agents không liên quan (tiết kiệm 40–70% context)

**Stack → Agent Mapping:**
| Stack | Agents Added |
|-------|--------------|
| `nextjs` | frontend-specialist, backend-specialist, database-architect, test-engineer, devops-engineer, performance-optimizer |
| `react-native` | mobile-developer, test-engineer |
| `rust` | backend-specialist |
| `python-api` | backend-specialist, database-architect, test-engineer, devops-engineer |
| `game` | game-developer, test-engineer |

**Core (luôn load):** orchestrator, project-planner, explorer-agent, debugger, code-reviewer, security-auditor

**Khi Nào Dùng:**
- Lần đầu trong project mới
- Sau switching projects
- Khi pivot mid-session (vd: web → mobile)
- Triggered tự động bởi GEMINI.md nếu manifest missing

---

### `auto_preview.py` — Preview Server Manager

**Mục đích:** Start/stop/check preview servers cho quick iteration.

**Sử dụng:**
```bash
# Start preview server
python .agents/scripts/auto_preview.py start

# Check status
python .agents/scripts/auto_preview.py status

# Stop server
python .agents/scripts/auto_preview.py stop
```

**Features:**
- Detect framework (Next.js, Vite, Flask, etc.)
- Chạy appropriate dev server command
- Track PID cho clean shutdown
- Health checks qua HTTP ping

**Khi Nào Dùng:**
- Qua `/preview` workflow
- Sau making UI/UX changes
- Trước chạy Lighthouse/E2E tests

---

### `session_manager.py` — Session State Tracker

**Mục đích:** Track session progress, active agents, và task status.

**Sử dụng:**
```bash
# Show session status
python .agents/scripts/session_manager.py status

# Save checkpoint
python .agents/scripts/session_manager.py save "feature-checkout completed"

# Load previous session
python .agents/scripts/session_manager.py load
```

**Tracked Data:**
- Active agents
- Completed tasks
- Files created/modified
- Current feature branch
- Agent status board

**Khi Nào Dùng:**
- Qua `/status` workflow
- Cho progress reporting
- Khi resume work sau interruption

---

## Skill-Level Scripts

Các scripts này nằm trong `.agents/skills/*/scripts/*.py` và được gọi bởi master scripts ở trên.

### Security

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `security_scan.py` | vulnerability-scanner | OWASP Top 10, secrets, CVEs, supply chain |

### Code Quality

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `lint_runner.py` | lint-and-validate | ESLint, Pylint, Ruff, type coverage |
| `type_coverage.py` | lint-and-validate | TypeScript strict mode, Python typing |

### Database

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `schema_validator.py` | database-design | Schema integrity, migrations, indexes |

### Testing

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `test_runner.py` | testing-patterns | Unit tests (Jest, pytest), integration tests |
| `playwright_runner.py` | webapp-testing | E2E tests, cross-browser, visual regression |

### UX & Accessibility

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `ux_audit.py` | frontend-design | Fitts' Law, color contrast, psychology laws |
| `accessibility_checker.py` | frontend-design | WCAG 2.1 AA, ARIA, keyboard nav |

### Mobile

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `mobile_audit.py` | mobile-design | Touch targets, battery, memory, platform patterns |

### SEO & Performance

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `seo_checker.py` | seo-fundamentals | Meta tags, E-E-A-T, structure, social cards |
| `geo_checker.py` | geo-fundamentals | AI citation optimization (ChatGPT, Perplexity) |
| `lighthouse_audit.py` | performance-profiling | Core Web Vitals, LCP, CLS, FID, bundle size |

### Other

| Script | Skill | Kiểm Tra Gì |
|--------|-------|-------------|
| `i18n_checker.py` | i18n-localization | Hardcoded strings, missing translations, RTL |
| `api_validator.py` | api-patterns | REST/GraphQL contracts, error handling |
| `react_performance_checker.py` | web-performance | React anti-patterns, unnecessary re-renders |

---

## Execution Flow

```
User chạy: python .agents/scripts/checklist.py .
  ↓
checklist.py orchestrates:
  1. security_scan.py (P0 — dừng nếu critical)
  2. lint_runner.py (P1 — dừng nếu critical)
  3. schema_validator.py (P2 — nếu có DB)
  4. test_runner.py (P3 — tiếp tục nếu warning)
  5. ux_audit.py (P4)
  6. seo_checker.py (P5)
  ↓
Exit code 0 nếu pass hết, non-zero otherwise
```

Cho full deployment:
```
User chạy: python .agents/scripts/verify_all.py . --url http://localhost:3000
  ↓
verify_all.py chạy:
  1. checklist.py (tất cả core checks)
  2. lighthouse_audit.py (cần running server)
  3. playwright_runner.py (E2E suite)
  4. mobile_audit.py (nếu có mobile)
  5. i18n_checker.py (nếu có i18n)
  ↓
Generate report: .agents/.session/verification-report.json
```

---

## Thêm Validation Script Mới

**Bước 1:** Tạo script trong skill folder thích hợp:
```
.agents/skills/my-skill/scripts/my_checker.py
```

**Bước 2:** Follow standard interface:
```python
def run_check(project_root: Path) -> dict:
    return {
        "status": "pass" | "warning" | "fail",
        "message": "Human-readable summary",
        "details": [...],
    }
```

**Bước 3:** Thêm vào `checklist.py` hoặc `verify_all.py`:
```python
from .agents.skills.my_skill.scripts.my_checker import run_check

# Trong appropriate priority section
result = run_check(project_root)
if result["status"] == "fail":
    print(f"❌ {result['message']}")
    sys.exit(1)
```

**Bước 4:** Document trong README này và `CODEBASE.md`.

---

## Exit Codes

| Code | Ý Nghĩa |
|------|---------|
| 0 | Tất cả checks passed |
| 1 | Critical failure (security, lint, schema) |
| 2 | Non-critical failure (tests, UX, SEO) |
| 3 | Script error (import failure, missing dependency) |

---

## Environment Variables

| Variable | Mục Đích | Default |
|----------|----------|---------|
| `AG_SKIP_SECURITY` | Skip security scan | `false` |
| `AG_SKIP_TESTS` | Skip test suite | `false` |
| `AG_VERBOSE` | Show verbose output | `false` |
| `AG_STRICT` | Treat warnings as failures | `false` |

Sử dụng:
```bash
AG_VERBOSE=true python .agents/scripts/checklist.py .
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run AG Kit Validation
  run: |
    python .agents/scripts/checklist.py .
    python .agents/scripts/verify_all.py . --url http://localhost:3000
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
python .agents/scripts/checklist.py . || exit 1
```

---

## Troubleshooting

### "Script not found" error
- Đảm bảo chạy từ project root
- Check Python path: `python -m sys` shows site-packages
- Verify script exists: `ls .agents/scripts/`

### "Import failed" cho skill script
- Check `CODEBASE.md` cho đúng path
- Đảm bảo skill tồn tại: `ls .agents/skills/<skill-name>/scripts/`
- Python phải có thể import: thêm `.agents` vào PYTHONPATH nếu cần

### Checks hanging
- Một số checks yêu cầu running server (Lighthouse, Playwright)
- Dùng `--url` flag cho performance checks
- Set timeout qua `AG_TIMEOUT=60` environment variable

---

## Bảo Trì

| Task | Frequency | Action |
|------|-----------|--------|
| Update script list | Khi thêm skill script mới | Edit README này + CODEBASE.md |
| Verify all scripts exist | Weekly | Chạy `verify_all.py` |
| Check dead scripts | Monthly | Grep unused imports trong checklist.py |
| Sync documentation | Khi thay đổi flow | Update README này |

---

> 💡 **Tip:** Chạy `checklist.py` trong watch mode khi development:
> ```bash
> watch -n 30 'python .agents/scripts/checklist.py .'
> ```
