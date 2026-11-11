# Deployed Swagger / OpenAPI Auto-Parsing Guide

> Hướng dẫn xử lý link Swagger / OpenAPI được deploy trên Staging/Production để tự động sinh TypeScript Types, DTOs và API Endpoints.

---

## 🎯 Quy trình 3 bước xử lý Deployed Swagger Link

```
[Deployed Swagger URL] ──(read_url_content)──► [Extract JSON/HTML Schema]
                                                      │
                                                      ├──► 1. TypeScript Types & DTOs
                                                      ├──► 2. API_ENDPOINTS Object
                                                      └──► 3. Typed API Fetch Services
```

---

## 1. Tìm Link JSON Spec từ Swagger UI

Thông thường link Swagger UI có dạng: `https://api-staging.company.com/swagger`

Khi phân tích, AI sẽ tìm link JSON spec ẩn bên dưới (thường là link ghi ở đầu trang Swagger UI):
- `https://api-staging.company.com/swagger/v1/swagger.json`
- `https://api-staging.company.com/api-json`
- `https://api-staging.company.com/v3/api-docs`

---

## 2. Quy đổi Swagger Schema ➔ TypeScript Code

### Ví dụ Schema từ Swagger:
```json
{
  "paths": {
    "/api/v1/posts/{id}": {
      "patch": {
        "summary": "Update Post",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdatePostDto" } } } },
        "responses": { "200": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PostDoc" } } } } }
      }
    }
  },
  "components": {
    "schemas": {
      "UpdatePostDto": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "status": { "type": "string", "enum": ["draft", "published"] }
        }
      }
    }
  }
}
```

### Kết quả AI Tự Động Sinh ra (Clean Code Standard):

#### File `post.types.ts`:
```typescript
export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface UpdatePostDto {
  title?: string;
  status?: PostStatus;
}

export interface PostDoc {
  _id: string;
  title: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}
```

#### File `apiEndpoints.ts`:
```typescript
export const API_ENDPOINTS = {
  posts: {
    root: '/api/v1/posts',
    byId: (id: string) => `/api/v1/posts/${id}`,
  },
} as const;
```

#### File `post.service.ts`:
```typescript
import { api } from '../../lib/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import { PostDoc, UpdatePostDto } from './post.types';

export const postService = {
  updatePost: (id: string, dto: UpdatePostDto) =>
    api<PostDoc>(API_ENDPOINTS.posts.byId(id), {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
```
