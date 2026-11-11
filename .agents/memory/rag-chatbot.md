---
type: project
created: 2026-09-18
updated: 2026-09-18
---

# RAG Chatbot Engine (Agentic Architecture)

## 1. Monolithic Tool-Calling Agent
Lõi chatbot sử dụng vòng lặp (ReAct loop) tối đa 5 lần với các công cụ động (`read_query`, `aggregate`, `write_mutation`, `dispatch_ui_action`).

## 2. Dynamic System Prompt
Tự động chèn tiểu sử, sở thích, lịch sử lỗi sai từ Memory của User.

## 3. Agentic RAG
- **Quality Score**: Đánh giá chất lượng search.
- **Query Rewriter**: Tự động viết lại truy vấn nếu điểm < 0.5.
- **Hybrid Search**: Kết hợp Hybrid Search (Vector + Keyword) qua Python Worker.

## 4. LLM Fallback
Hỗ trợ OpenRouter, fallback tự động sang model miễn phí (e.g. gemini-2.0-flash-exp:free) khi hết quota.
