---
trigger: always_on
description: "Strict i18n rules for all UI components and pages"
---

# Strict i18n Rule

> **MANDATORY**: No hardcoded user-facing strings (e.g. Vietnamese text) in TSX/JSX files.

## 1. Localization Enforcement
- You MUST use `useTranslation()` from `react-i18next` for all strings that are displayed to the user.
- **Forbidden**: `<p>Đăng nhập</p>`
- **Correct**: `<p>{t("Login.title", "Đăng nhập")}</p>`

## 2. i18n File Management
- Whenever you add a new string to a component, you MUST also add the translation keys to both:
  - `messages/en.json`
  - `messages/vi.json`
- Do not assume keys exist. Always verify or add them if creating a new UI element.

## 3. Fallback Best Practices
- Always provide a fallback string in the `t()` function for easier developer readability in code.
  Example: `{t("ErrorLog.title", "Sổ Tay Lỗi Sai")}`
- This helps understand what the key means without looking up the JSON files constantly.
