---
trigger: always_on
description: "Strict Clean Code Rules for ALL generated and modified code"
---

# Strict Clean Code Rule

> **MANDATORY**: These rules apply to ALL code generated or modified by the agent.

## 1. Zero Hardcode Values
- **NO magic strings or numbers**. 
- Always extract fixed values to `constants.ts` hoặc sử dụng `enum` / `const` objects.
- Ví dụ: Thay vì dùng chuỗi `"NOUN"` trực tiếp trong thẻ select, hãy định nghĩa `const PART_OF_SPEECH = { NOUN: "NOUN" }` hoặc dùng TS Enum.

## 2. Flat Branching & No Nested Ternaries
- **TUYỆT ĐỐI KHÔNG dùng ternary lồng nhau** (`a ? b : c ? d : e`). 
- Giữ các khối lệnh `if/else` phẳng nhất có thể (tối đa 2 cấp lồng nhau).
- Sử dụng **Guard Clauses (Early Return)** để xử lý các trường hợp ngoại lệ ngay từ đầu hàm.
- Thay thế các lệnh rẽ nhánh phức tạp bằng Object Map lookup.

## 3. Function & Component Structure
- **SRP (Single Responsibility)**: Mỗi hàm hoặc component chỉ nên làm một việc.
- Chia nhỏ các component lớn. Component UI dài quá 150-200 dòng cần được tách thành các sub-component chuyên biệt.

## 4. Error Handling
- Không bắt lỗi kiểu `catch (err: any) { alert(err.message || "Lỗi"); }`.
- Luôn kiểm tra kiểu lỗi hoặc dùng hàm xử lý lỗi dùng chung để đảm bảo an toàn kiểu dữ liệu.

## 5. Naming Conventions
- Biến: Thể hiện rõ ý nghĩa (VD: `userCount` thay vì `n`).
- Hàm: Động từ + Danh từ (VD: `getUserById()`).
- Hằng số: SCREAMING_SNAKE_CASE (VD: `MAX_RETRY_COUNT`).
- Biến logic (Boolean): Dạng câu hỏi (VD: `isActive`, `hasPermission`).

## 6. Mandatory AI Checklist (Socratic Self-Reflection)
> **AI INSTRUCTION**: Trước khi kết thúc việc sinh code hoặc chỉnh sửa code, BẠN BẮT BUỘC PHẢI tự rà soát và in ra màn hình checklist sau (Đánh dấu [x] nếu đã thỏa mãn):
>
> ```markdown
> ### 🧹 Clean Code & Process Checklist
> - [ ] **Zero Hardcode**: Không còn Hardcode Strings/Numbers (Đã tách ra hằng số/Enum/i18n).
> - [ ] **No Nested Ternaries**: Không có (a ? b : c ? d : e), ưu tiên Early Return.
> - [ ] **SRP**: Đã tuân thủ Single Responsibility (Hàm/Component đủ nhỏ gọn, không ôm đồm).
> - [ ] **Naming Conventions**: Biến/Hàm dùng camelCase, Component/Class dùng PascalCase, Boolean có tiền tố (is, has, can).
> - [ ] **Type Safety & Error Handling**: Không dùng `any` bừa bãi, try/catch xử lý lỗi rõ ràng (không nuốt lỗi).
> - [ ] **Process Logging**: Đã tóm tắt rõ các bước tiến trình sinh code, giải thích quyết định kỹ thuật trước/sau khi code.
> ```
>
> Nếu bất kỳ mục nào chưa đạt, hãy dừng lại và tự sửa code trước khi trả lời người dùng.
