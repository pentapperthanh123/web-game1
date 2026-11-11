# AG Kit - Tips & Best Practices

> Hướng dẫn tối ưu token cost và hiệu suất khi làm việc với AI Agents.

---

## 📑 Mục Lục

1. [Token Foundations](#-1-token-foundations)
2. [Model Selection](#-2-model-selection)
3. [Prompt Engineering](#-3-prompt-engineering)
4. [Playbook](#-4-playbook)

---

## 🧠 1. Token Foundations

### Token Là Gì?

Token là các khối dữ liệu nhỏ mà AI đọc:
- **~4 ký tự tiếng Anh** = 1 token
- **Mọi thứ đều là token:** Files, images, tool schemas, chat history
- **Token = Chi phí:** Bạn trả tiền cho mỗi token

### Cấu Trúc của một Agent

```
┌─────────────────────────────────────┐
│ Bạn (User)                          │
│ ↓ Prompt                            │
├─────────────────────────────────────┤
│ Harness (Khung quản lý)             │
│ • Context management                │
│ • Tool orchestration                │
│ • State tracking                    │
│ • API requests                      │
│ • File indexing                     │
├─────────────────────────────────────┤
│ LLM (Mô hình)                       │
│ ↓ Response                          │
└─────────────────────────────────────┘
```

**Nếu mô hình là động cơ, thì harness là chiếc xe.**

---

### ⚠️ Hiện Tượng "Mất Trí Nhớ" (Amnesia)

**Agent không có memory vĩnh viễn giữa các lượt.**

Ở mỗi turn, hệ thống phải gửi lại:
- ❌ Toàn bộ lịch sử chat
- ❌ System prompt
- ❌ Rules + Skills
- ❌ Tool schemas
- ❌ Kết quả trước đó

**→ Chi phí token tăng theo cấp số nhân!**

---

### 💰 Cái Gì Thực Sự Tiêu Thụ Token?

| Có Tốn Token? | Thao Tác |
|---------------|----------|
| ✅ YES | Những gì mô hình **đọc** (input) |
| ✅ YES | Những gì mô hình **viết** (output) |
| ❌ NO | Index codebase |
| ❌ NO | Gọi công cụ/MCP |
| ⚠️ YES (gián tiếp) | **Kết quả** từ tool được nạp vào context |

**Nguyên tắc:**
- Index và tool calls bản thân chúng KHÔNG tốn token
- Nhưng **kết quả trả về** sẽ được nạp vào context → tốn token

---

## 🎯 2. Model Selection

### Chi Phí Token (Per 1M tokens)

| Model | Input | Output | Use Case |
|-------|-------|--------|----------|
| **Composer 2.5** | $0.50 | $2.50 | Code-specialized (fastest) |
| **Claude Sonnet** | $3.00 | $15.00 | Balanced reasoning |
| **Claude Opus** | $5.00 | $30.00 | Complex planning |
| **GPT-5.5** | $5.00 | $30.00 | General frontier |

**Cost Comparison:**
- Composer 2.5 = **9-10x rẻ hơn** Opus/GPT-5.5
- Accuracy: 85-90% of frontier models
- Speed: Nhanh nhất cho agent loops

---

### 🎨 Thế Mạnh Của Từng Mô Hình

#### Composer 2.5 (Code-Specialized) ⚡

**Perfect cho:**
- ✅ Sửa đổi phạm vi hẹp
- ✅ Build & refactor code
- ✅ Debug & fix bugs
- ✅ Fast iteration

**Không dùng cho:**
- ❌ Planning phức tạp
- ❌ Multi-constraint reasoning
- ❌ Architectural decisions

---

#### Claude Opus / GPT-5.5 (Frontier) 🧠

**Perfect cho:**
- ✅ Planning & architecture
- ✅ Complex reasoning
- ✅ Long context (200k+ tokens)
- ✅ Multi-step tasks with constraints

**Không dùng cho:**
- ❌ Simple code edits (overkill + đắt)
- ❌ Fast iteration (chậm hơn)

---

### ⚙️ Ba Núm Điều Khiển (Three Knobs)

#### 1. Effort Level

| Level | Reasoning Loops | Token Cost | Use When |
|-------|-----------------|------------|----------|
| **Medium** | Standard | Normal | Most tasks |
| **High** | More loops | +30% output | Complex logic |
| **xHigh** | Maximum | +60% output | Critical/tricky |

**Lưu ý:** Effort chỉ ảnh hưởng **output tokens**, không tăng quality nhiều.

---

#### 2. Fast vs. Standard

| Mode | Latency | Cost | Best For |
|------|---------|------|----------|
| **Fast** | Priority queue | **2x price** | Demos, urgent fixes |
| **Standard** | Normal queue | 1x price | Development |

**Lưu ý:** Fast chỉ giảm latency, không giảm token count.

---

#### 3. General vs. Specialized

**Golden Rule:**
```
Planning     → General model (Opus/GPT-5.5)
Execution    → Specialized model (Composer 2.5)
```

**Example workflow:**
```bash
# 1. Plan (General)
@claude-opus Plan refactoring auth module

# 2. Execute (Specialized)
@composer Implement the plan from above
```

---

## ✍️ 3. Prompt Engineering

### 📊 Sức Mạnh Của Prompt Chuẩn

**Example: Same task, different prompts**

| Prompt Type | Tokens | Cost | Success Rate |
|-------------|--------|------|--------------|
| ❌ Vague: "Fix auth" | 298k | $4.95 | 40% |
| ✅ Specific: "@auth.ts line 142 fix JWT expiry" | 4k | <$0.01 | 95% |

**→ Prompt tốt = tiết kiệm 65x token!**

---

### ✅ Chất Lượng Của Prompt Tốt

#### 1. Tính Cụ Thể (Specificity)

```bash
# ❌ BAD
"Fix the login bug"

# ✅ GOOD
"@src/auth/login.ts line 142
Fix JWT token expiry check - currently expires too early"
```

---

#### 2. Ngữ Cảnh Tập Trung (Focused Context)

```bash
# ❌ BAD (scans everything)
"Improve performance"

# ✅ GOOD (scoped directory)
"@src/api/
Optimize database queries - add indexes for user lookups"
```

---

#### 3. Tiêu Chí Thành Công Rõ Ràng

```bash
# ❌ BAD
"Make it better"

# ✅ GOOD
"Ensure:
1. All tests pass
2. Matches Figma design
3. No console errors"
```

---

#### 4. Một Task Cho Mỗi Lượt

```bash
# ❌ BAD (too many tasks)
"Add auth, refactor DB, fix UI bugs, write tests"

# ✅ GOOD (one task)
"Add JWT authentication to /api/login endpoint"
```

---

### 🧹 Quản Lý Context Bloat

| Strategy | Method | Benefit |
|----------|--------|---------|
| **Tạo chat mới** | New chat per task | Reset token budget |
| **@-mention chọn lọc** | `@file` or `@folder` only | Focused context |
| **@-mention chat cũ** | Reference old chat | Cheaper than continuing |
| **Cắt giảm rules** | Disable `alwaysApply: true` | Reduce every-turn cost |
| **Dùng Skills** | Skills load on-demand | Rules always loaded |

---

### 🔧 Best Practices

**✅ DO:**
- Trỏ đến file cụ thể (`@auth.ts`)
- Scope đến folder (`@src/api/`)
- Đặt tiêu chí rõ ràng
- Tạo chat mới cho task mới
- Dùng Skills thay vì Rules

**❌ DON'T:**
- Prompt mơ hồ ("fix it")
- Scan toàn bộ codebase
- Nhiều tasks cùng lúc
- Kéo dài chat quá lâu
- Bật tất cả rules

---

## 🎮 4. Playbook

### Small, Direct Task

**Scenario:** Sửa bug nhỏ, add feature đơn giản

```bash
# Model: Composer 2.5
# Approach: Direct execution

@composer @src/utils/format.ts
Fix date formatting bug at line 45 - timezone offset incorrect
```

**Why:**
- ✅ Fast iteration
- ✅ Low cost
- ✅ Specialized for code

---

### Exploratory Task

**Scenario:** Tìm hiểu codebase, research feasibility

```bash
# Step 1: Explore (General)
@claude-opus
Analyze @src/auth/ and explain the authentication flow

# Step 2: Execute (Specialized)
@composer
Based on analysis above, implement password reset feature
```

**Why:**
- ✅ Planning needs reasoning
- ✅ Execution is straightforward

---

### Feature Build

**Scenario:** Xây dựng tính năng mới với nhiều bước

```bash
# Step 1: Plan (General)
@claude-opus /plan
Build user profile page with avatar upload

# Step 2: Execute (Specialized + Multitask)
@composer
Implement subtasks from plan above in parallel
```

**Why:**
- ✅ Planning = complex reasoning
- ✅ Execution = specialized code

---

### Refactor

**Scenario:** Tái cấu trúc module lớn

```bash
# Step 1: Plan (Frontier)
@claude-opus
Plan refactoring @src/api/ to microservices
Requirements:
- Zero downtime
- Backward compatible
- Test coverage

# Step 2: Execute (Composer)
@composer
Execute refactoring plan step-by-step
```

**Why:**
- ✅ Architecture = high-level reasoning
- ✅ Code changes = specialized execution

---

### Bug Fix

**Scenario:** Debug và fix lỗi

```bash
# Step 1: Debug (Use Debug Mode)
@composer /debug
Error: "Cannot read property 'id' of undefined"
in @src/api/users.ts when fetching user data

# Step 2: Fix
@composer
Implement fix from debug analysis

# Step 3: Review
/review-bugbot
```

**Why:**
- ✅ Debug mode = systematic approach
- ✅ Composer fast for fixes
- ✅ Bugbot validates solution

---

## 📌 Quick Reference

### Cost Optimization Checklist

- [ ] Dùng Composer 2.5 cho code tasks
- [ ] Dùng Opus/GPT-5.5 chỉ khi cần planning
- [ ] Prompt cụ thể với `@file` và line numbers
- [ ] Scope context (`@folder` thay vì toàn bộ)
- [ ] Một task mỗi lượt
- [ ] Tạo chat mới cho task mới
- [ ] Disable unused rules
- [ ] Dùng Skills thay vì Rules
- [ ] Kiểm tra MCP tools có thực sự cần thiết

---

### Golden Rules

1. **Prompt rõ ràng = tiết kiệm 65x token**
2. **General cho planning, Specialized cho execution**
3. **Một task mỗi lượt**
4. **Chat mới = token budget mới**
5. **Skills > Rules**

---

> 💡 **Remember:** Token cost tăng theo cấp số nhân với context size. Optimize early, optimize often!
