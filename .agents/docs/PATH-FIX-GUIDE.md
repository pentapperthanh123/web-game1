# Hardcoded Paths - Fix Guide

> **Problem:** Absolute paths từ project cũ (`ai-reup-tools`) làm references break khi di chuyển project.

---

## 🚨 Problem

**Before Fix:**
```markdown
[references/react-clean-code-guidelines.md](file:///f:/ai-reup-tools/.agents/skills/code-quality-review/references/react-clean-code-guidelines.md)
```

**Issues:**
- ❌ Hardcoded drive letter (`f:/`)
- ❌ Hardcoded old project name (`ai-reup-tools`)
- ❌ Break khi copy project sang máy khác
- ❌ Break khi rename project folder

---

## ✅ Solution

**After Fix:**
```markdown
# From .agents/agent/ → Use ../skills/
[references/react-clean-code-guidelines.md](../skills/code-quality-review/references/react-clean-code-guidelines.md)

# From .agents/skills/clean-code/ → Use ../code-quality-review/
[references/react-clean-code-guidelines.md](../code-quality-review/references/react-clean-code-guidelines.md)

# From .agents/skills/code-quality-review/ → Use ./references/
[references/react-clean-code-guidelines.md](./references/react-clean-code-guidelines.md)
```

**Benefits:**
- ✅ Portable (work anywhere)
- ✅ No hardcoded project names
- ✅ No absolute paths
- ✅ Cursor resolves links correctly

---

## 🔍 Files Fixed (2026-07-23)

| File | Location | Change |
|------|----------|--------|
| `frontend-specialist.md` | `.agents/agent/` | `file:///f:/ai-reup-tools/...` → `../skills/...` |
| `clean-code/SKILL.md` | `.agents/skills/` | `file:///f:/ai-reup-tools/...` → `../code-quality-review/...` |
| `code-quality-review/SKILL.md` | `.agents/skills/` | `file:///f:/ai-reup-tools/...` → `./references/...` |

---

## 🛡️ Prevention Guidelines

### Rule 1: Always Use Relative Paths

**❌ NEVER:**
```markdown
file:///f:/project-name/.agents/...
C:\Users\Admin\project\.agents\...
/home/user/project/.agents/...
```

**✅ ALWAYS:**
```markdown
./file.md               # Same directory
../sibling/file.md      # Sibling directory
../../parent/file.md    # Parent directory
```

### Rule 2: Path Resolution Rules

From any location in `.agents/`:

| Your Location | Target | Relative Path |
|---------------|--------|---------------|
| `.agents/agent/` | `.agents/skills/` | `../skills/` |
| `.agents/skills/skill-a/` | `.agents/skills/skill-b/` | `../skill-b/` |
| `.agents/skills/skill-a/` | `.agents/agent/` | `../../agent/` |
| `.agents/skills/skill-a/sub/` | `.agents/skills/skill-a/` | `../` |

### Rule 3: Verification Commands

**Find hardcoded paths:**
```powershell
# Check for file:// URIs
Get-ChildItem .agents -Recurse -File | Select-String -Pattern 'file:///' -CaseSensitive

# Check for absolute drive paths
Get-ChildItem .agents -Recurse -File | Select-String -Pattern '[a-z]:/' -CaseSensitive

# Check for old project names
Get-ChildItem .agents -Recurse -File | Select-String -Pattern 'ai-reup-tools' -CaseSensitive
```

**Bash equivalent:**
```bash
# Check for file:// URIs
grep -r "file:///" .agents/

# Check for absolute paths
grep -r "[a-z]:/" .agents/

# Check for old project names
grep -r "ai-reup-tools" .agents/
```

---

## 🔧 How to Fix

### Step 1: Find Your Location

```
Example: You're editing .agents/agent/backend-specialist.md
Location level: .agents/agent/
```

### Step 2: Find Target Location

```
Target: .agents/skills/database-design/references/schema-patterns.md
Target level: .agents/skills/database-design/references/
```

### Step 3: Calculate Relative Path

```
From: .agents/agent/
To: .agents/skills/database-design/references/

1. Go up to .agents/: ../
2. Go into skills/: ../skills/
3. Go into database-design/: ../skills/database-design/
4. Go into references/: ../skills/database-design/references/
5. Target file: ../skills/database-design/references/schema-patterns.md
```

### Step 4: Write Markdown Link

```markdown
[schema-patterns.md](../skills/database-design/references/schema-patterns.md)
```

---

## 📊 Impact Analysis

### Before Fix
```
❌ Broken on:
- Different drive letter
- Different username
- Different project name
- Different OS
```

### After Fix
```
✅ Works on:
- Any drive letter
- Any username
- Any project name
- Windows / Linux / macOS
```

---

## 🚀 Automation (Future)

**Scan script to detect hardcoded paths:**

```python
# .agents/scripts/scan_hardcoded_paths.py
import re
from pathlib import Path

def scan_hardcoded_paths(root_dir=".agents"):
    patterns = [
        r'file:///[a-z]:/',           # file:///c:/...
        r'\b[a-z]:/[\w\-]+/\.agents', # c:/project/.agents
        r'ai-reup-tools',             # Old project name
    ]
    
    issues = []
    for file in Path(root_dir).rglob("*.md"):
        content = file.read_text(encoding='utf-8')
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append(str(file))
                break
    
    if issues:
        print("❌ Found hardcoded paths in:")
        for f in issues:
            print(f"  - {f}")
        return False
    else:
        print("✅ No hardcoded paths found!")
        return True

if __name__ == "__main__":
    scan_hardcoded_paths()
```

**Usage:**
```bash
python .agents/scripts/scan_hardcoded_paths.py
```

---

## 📚 Reference

- **Markdown Relative Links:** [MDN Docs](https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Creating_hyperlinks)
- **Path Resolution:** [Unix Path Guide](https://www.pathname.com/fhs/)
- **Cursor Link Behavior:** [Cursor Docs](https://cursor.sh/docs)

---

## ✅ Checklist

Trước khi commit agent/skill files:

- [ ] No `file:///` URIs
- [ ] No `c:/` or `/home/` absolute paths
- [ ] No old project names (`ai-reup-tools`, etc.)
- [ ] All links use relative paths
- [ ] Links verified to work in Cursor IDE

**Command:**
```bash
python .agents/scripts/scan_hardcoded_paths.py
```

---

> 🔒 **Security Note:** Hardcoded paths có thể leak sensitive info (username, project names). Always use relative paths!
