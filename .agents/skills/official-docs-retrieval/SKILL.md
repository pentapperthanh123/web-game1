---
name: official-docs-retrieval
description: Retrieve, parse, and verify against official language/framework docs, deployed Swagger/OpenAPI links, Storybook UI kits, or custom team documentation URLs. Generates 100% accurate, canonical code without guessing.
when_to_use: |
  Use when solving complex tasks requiring official documentation verification, when working with deployed Swagger/OpenAPI URLs, Storybook UI components, custom team docs, or when upgrading framework versions (React 19, Next.js 15, NestJS, .NET, Python, Rust, Go).
  
  TRIGGER KEYWORDS:
  - "read docs"
  - "official docs"
  - "swagger url"
  - "openapi spec"
  - "storybook link"
  - "custom docs"
  - "check framework documentation"
allowed-tools: Read, Grep, Glob, Write, Edit, read_url_content, search_web
---

# Official & Custom Documentation Retrieval Skill

> Tra cứu, phân tích và áp dụng trực tiếp tài liệu chính thống (Official Framework Docs, Deployed Swagger/OpenAPI URLs, Storybook UI Kits, Custom Team Docs) để viết code chuẩn xác 100%, không đoán mò API hay dùng syntax cũ (deprecated).

---

## 🎯 4 Processing Modes

```
                               ┌────────────────────────────────────────────────────────┐
                               │           Skill: official-docs-retrieval               │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
        ┌───────────────────────────┬──────────────────────┴─────┬───────────────────────────┐
        ▼                           ▼                            ▼                           ▼
┌──────────────┐            ┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│ MODE 1:      │            │ MODE 2:      │             │ MODE 3:      │            │ MODE 4:      │
│ SWAGGER/     │            │ STORYBOOK    │             │ PUBLIC       │            │ LOCAL TEAM   │
│ OPENAPI      │            │ & DESIGN     │             │ FRAMEWORK    │            │ PROJECT      │
│ DEPLOYED URL │            │ SYSTEM URL   │             │ OFFICIAL DOCS│            │ DOCS         │
└──────────────┘            └──────────────┘             └──────────────┘            └──────────────┘
```

| Mode | Input / Source | Action & Output |
|------|----------------|-----------------|
| **1. Deployed Swagger / OpenAPI** | URL chứa Swagger UI hoặc JSON spec (VD: `https://api-staging.com/swagger` hoặc `/api-json`) | Read JSON/HTML → Tự động sinh TypeScript Types, DTOs, `API_ENDPOINTS` object & Fetch services |
| **2. Storybook / Design System** | URL Storybook UI Kit hoặc Custom UI Wiki | Read HTML/Doc → Trích xuất Component Props, Variants, Design Tokens → Viết React UI chuẩn UI Kit |
| **3. Official Framework Docs** | Official Docs Index (React 19, Next 15, NestJS, .NET, Rust, Go, FastAPI) | Read Docs chính thức → Áp dụng Canonical Best Practices & Syntax phiên bản mới nhất |
| **4. Local Team Project Docs** | Docs trong dự án (`docs/`, `.storybook/`, `swagger.json`, `components.json`) | Read local markdown/JSON → Áp dụng đúng quy chuẩn riêng của nhóm |

---

## 📋 Selective Reading Map

| Task / Use Case | Reference File |
|-----------------|----------------|
| **Deployed Swagger / OpenAPI JSON Parsing** | `@[skills/official-docs-retrieval/references/swagger-openapi-guide.md]` |
| **Storybook & Design System UI Extraction** | `@[skills/official-docs-retrieval/references/storybook-design-system.md]` |
| **Official Public Framework Docs Index** | `@[skills/official-docs-retrieval/references/official-frameworks-index.md]` |

---

## 🚀 Workflows By Mode

### Mode 1: Processing Deployed Swagger / OpenAPI URLs

Khi người dùng cung cấp link Swagger của server Staging/Production:

1. **Fetch Spec:** AI sử dụng `read_url_content` để đọc URL Swagger (ưu tiên link JSON spec như `/swagger/v1/swagger.json` hoặc `/api-json`; nếu là trang UI HTML, AI phân tích cấu trúc HTML schema).
2. **Extract Data Models & DTOs:** Tự động sinh ra TypeScript Interfaces / Enums chuẩn từ phần `components.schemas` hoặc `definitions`.
3. **Extract API Endpoints & Transport:** Tự động sinh ra `API_ENDPOINTS` object (bao gồm HTTP Method, Path Parameters, Query Parameters, và Body Request DTOs).

*(Xem chi tiết mẫu code sinh ra tại `references/swagger-openapi-guide.md`)*

---

### Mode 2: Processing Storybook & Custom Design System URLs

Khi người dùng cung cấp link Storybook hoặc Docs UI Kit:

1. **Fetch Component Spec:** AI sử dụng `read_url_content` (hoặc `read_browser_page`) để đọc thông số Component (Props Table, Args, Variants, Classes).
2. **Extract Design Tokens:** Nhận diện màu sắc (Theme Colors), Spacing, Typographies, Icons được quy định trong Storybook.
3. **Generate UI Code:** Viết React component tái sử dụng đúng 100% Props & Variants từ Storybook mà không cần sửa thủ công.

---

### Mode 3: Official Framework Documentation Verification

Đối với các task phức tạp (nâng cấp phiên bản, bảo mật, tối ưu performance, async/concurrency):

1. **Tra cứu Official Index:** Mở `references/official-frameworks-index.md` để lấy URL chính thống.
2. **Fetch Documentation:** Dùng `search_web` hoặc `read_url_content` tới địa chỉ chính thức (VD: `https://react.dev`, `https://nextjs.org/docs`, `https://docs.nestjs.com`).
3. **Verify Version Parity:** Kiểm tra file cấu hình project (`package.json`, `.csproj`, `Cargo.toml`) để chắc chắn syntax phù hợp với phiên bản đang chạy.
4. **Generate Canonical Code:** Viết code tuân thủ 100% theo hướng dẫn tác giả.

---

## 💾 Saving Custom Team URLs (Persistent Memory)

Bạn có thể lưu các URL Swagger, Storybook, hoặc Wiki cố định của công ty vào bộ nhớ lâu dài để AI tự động sử dụng trong các session tiếp theo qua lệnh:

```bash
/remember Company Docs: Swagger=https://api-staging.company.com/swagger/v1/swagger.json, Storybook=https://ui.company.com
```
