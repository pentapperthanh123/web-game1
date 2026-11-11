# Memory Cleanup Guide

> Cleanup memory khi clone AG Kit sang dự án mới, hoặc khi muốn bắt đầu memory từ đầu.

---

## Quick command

```bash
python .agents/scripts/reset_memory.py
python .agents/scripts/reset_memory.py --dry-run   # xem trước, không xóa
```

Script **quét toàn bộ** `.agents/memory/` và chỉ giữ file gốc của kit.

---

## File GỐC (GIỮ)

| File | Action |
|------|--------|
| `MEMORY.md` | **Giữ** + reset nội dung về template trống |
| `README.md` | **Giữ** (hướng dẫn hệ thống memory) |
| `CLEANUP-GUIDE.md` | **Giữ** (file này) |
| `*.template` | **Giữ** (nếu có) |

Kết quả sau reset:

```
.agents/memory/
├── MEMORY.md          # index trống
├── README.md
└── CLEANUP-GUIDE.md
```

Session inject cũng được clear:

```
.agents/.session/memory-context.md
```

---

## File BỊ XÓA (mọi thứ còn lại)

Script **không** dùng danh sách cứng. Mọi file/thư mục không nằm trong keep-list đều bị xóa, ví dụ:

- `user-preferences.md`, `project-conventions.md`
- `architecture-decisions.md`, `ag-kit-defaults.md`
- `audit-*.md`, `feedback-history.md`, `tech-decisions.md`, …
- Thư mục con (`archive/`, …)

**Lý do:** Memory là local/project-specific — không mang sang project mới.

---

## Checklist thủ công (nếu không chạy script)

```bash
# Từ project root
python .agents/scripts/reset_memory.py

# Verify
ls .agents/memory
# Chỉ còn: MEMORY.md  README.md  CLEANUP-GUIDE.md
```

---

## Sau cleanup

1. `/remember …` — ghi preference / convention / ADR mới  
2. `python .agents/scripts/load_memory.py --inject` — nạp vào chat  
   hoặc `python .agents/scripts/session_boot.py`

---

## Gitignore (best practice)

```gitignore
.agents/memory/*.md
!.agents/memory/MEMORY.md
!.agents/memory/README.md
!.agents/memory/CLEANUP-GUIDE.md
!.agents/memory/*.template
.agents/.session/
```

---

> Tip: Luôn chạy `reset_memory.py` sau khi clone AG Kit vào repo app mới.
