# Ignore Files - Configuration Guide

> Giải thích các file ignore và patterns được dùng trong AG Kit.

---

## 📁 Files Có Sẵn

| File | Mục đích | Áp dụng cho |
|------|----------|-------------|
| `.gitignore` | Không commit vào Git | Git operations |
| `.cursorignore` | Không index/scan bởi Cursor | Cursor IDE AI |
| `.dockerignore` | Không copy vào Docker image | Docker builds |
| `.eslintignore` | Không lint | ESLint |
| `.prettierignore` | Không format | Prettier |

---

## 🎯 Patterns Quan Trọng

### 1. AG Kit Session (Tất Cả Files)

```
.agents/.session/
```

**Lý do:** Runtime artifacts, regenerated mỗi session.

**Chứa:**
- `active-agents.json` (manifest)
- `memory-context.md` (injected memory)
- Temporary files

**Impact:** Không commit, không scan → clean repo.

---

### 2. Dependencies (Tất Cả Files)

```
node_modules/
__pycache__/
.venv/
venv/
```

**Lý do:** 
- Lớn (hàng GB)
- Regenerated từ lock files
- AI không cần scan

**Impact:** Faster IDE, smaller commits.

---

### 3. Build Outputs (Tất Cả Files)

```
dist/
build/
.next/
out/
```

**Lý do:**
- Generated code
- Không có business logic
- Rebuild được

**Impact:** Clean repo, không conflict merge.

---

### 4. Environment / Secrets (Tất Cả Files)

```
.env
.env.*
secrets.json
*.key
*.pem
```

**⚠️ CRITICAL:** Secrets không được commit!

**Exceptions:**
```
!.env.example      # Template OK
!.env.template     # Template OK
```

---

### 5. IDE Metadata (`.gitignore`, `.cursorignore`)

```
.vscode/
.idea/
*.swp
```

**Lý do:** Personal settings, không share.

**Exceptions:**
```
!.vscode/settings.json     # Workspace settings OK
!.vscode/extensions.json   # Recommended extensions OK
```

---

### 6. Binary / Media (`.cursorignore`, `.dockerignore`)

```
*.jpg
*.png
*.mp4
*.zip
```

**Lý do:**
- Không phải code
- AI scan waste resources
- Docker: mount as volume thay vì copy

---

### 7. Test Coverage (Tất Cả Files)

```
coverage/
.nyc_output/
test-results/
```

**Lý do:** Generated reports, không commit.

---

## 🔍 File-Specific Patterns

### `.gitignore` (124 dòng)

**Comprehensive patterns cho Git:**
- Python artifacts (`.pyc`, `__pycache__`)
- Node artifacts (`node_modules/`, build outputs)
- OS files (`.DS_Store`, `Thumbs.db`)
- IDE files
- Logs, cache, temp files
- Secrets

**Priority:** Security > Cleanliness

### `.cursorignore` (47 dòng)

**Tối ưu cho Cursor AI:**
- Dependencies (không cần AI scan)
- Build outputs (generated code)
- Minified files (`.min.js`)
- Binary/media (không phải code)
- Logs (không có logic)

**Priority:** Performance > Completeness

**Impact:**
- ✅ Faster indexing
- ✅ Cleaner AI context
- ✅ Better suggestions (ít noise)

### `.dockerignore` (68 dòng)

**Tối ưu Docker image size:**
- Documentation (`.md` files)
- Tests (`*.test.js`, `*.spec.ts`)
- CI/CD configs (`.github/`)
- Development dependencies

**Priority:** Image Size > Build Speed

**Impact:**
- ✅ Smaller images (50-70% reduction)
- ✅ Faster builds
- ✅ Faster deployments

### `.eslintignore` (28 dòng)

**Bỏ qua khi lint:**
- Config files (trừ `eslint.config.js`)
- Vendor code
- Build outputs

**Priority:** Avoid False Positives

### `.prettierignore` (33 dòng)

**Bỏ qua khi format:**
- Lock files (auto-generated)
- Minified code
- Vendor code
- CHANGELOG (có format riêng)

**Priority:** Avoid Conflicts

---

## 🛠️ Customization

### Thêm Pattern

**Example:** Ignore Terraform files

```bash
# Add to .gitignore
echo "*.tfstate" >> .gitignore
echo ".terraform/" >> .gitignore

# Add to .cursorignore
echo ".terraform/" >> .cursorignore
```

### Whitelist (Exception)

**Syntax:** `!<pattern>`

**Example:** Allow specific config file

```bash
# In .dockerignore
*.md                # Ignore all markdown
!README.md          # Except README.md
```

### Test Patterns

**Git:**
```bash
git check-ignore -v path/to/file
```

**Docker:**
```bash
docker build --no-cache .
# Check what's copied via docker image ls
```

---

## 📊 Impact Analysis

### Trước (Không có ignore)

```
Repo size: 500 MB (với node_modules)
Cursor index: 2 phút
Docker image: 1.2 GB
ESLint time: 45s
```

### Sau (Với ignore)

```
Repo size: 50 MB (chỉ source code)
Cursor index: 15 giây
Docker image: 300 MB
ESLint time: 5s
```

**Improvement:** 10x faster, 4x smaller!

---

## 🚨 Common Mistakes

### ❌ WRONG: Ignore source code

```
# DON'T
*.js           # Ignores ALL JavaScript!
src/           # Ignores source folder!
```

### ✅ CORRECT: Ignore generated only

```
# DO
dist/*.js      # Only built JavaScript
build/         # Only build output
```

### ❌ WRONG: Commit secrets

```
# If .env already committed:
git rm --cached .env
git commit -m "Remove secrets"
```

### ✅ CORRECT: Never commit secrets

```
# Use .env.example as template
cp .env.example .env
# Edit .env with real values
# .gitignore already blocks .env
```

---

## 🔐 Security Checklist

Trước commit, verify:

- [ ] `.env` không trong Git
- [ ] `secrets.json` không trong Git
- [ ] `*.key`, `*.pem` không trong Git
- [ ] `.env` có trong `.gitignore`
- [ ] No hardcoded passwords trong code

**Command:**
```bash
git status --ignored
# Xem files bị ignored
```

---

## 📚 Resources

- **Git:** [gitignore.io](https://gitignore.io)
- **Cursor:** [Cursor Docs](https://cursor.sh/docs)
- **Docker:** [Docker Docs - .dockerignore](https://docs.docker.com/engine/reference/builder/#dockerignore-file)

---

## 💡 Best Practices

1. **Review định kỳ** — Monthly check patterns
2. **Test thường xuyên** — `git check-ignore` when unsure
3. **Document exceptions** — Comment `!` patterns
4. **Team sync** — Share `.gitignore` cập nhật
5. **Security first** — Secrets NEVER committed

---

> 🔒 **Security Tip:** Nếu vô tình commit secrets, đổi secrets đó ngay. Git history vẫn giữ!
