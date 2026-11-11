# Hybrid UI Contract (packages/ui)

## Core Principle
The `packages/ui` library serves both User and Teacher apps using a Hybrid architecture: Tailwind CSS for custom presentation UI, and Ant Design for complex logical UI.

## Rule 1: Custom UI (Tailwind)
- For presentational components (`StatCard`, `ActionListWidget`, `AdminLayout`, `PageHeader`, `ActivityChart`), use native HTML tags and **Tailwind CSS**.
- **MANDATORY:** Must ONLY use semantic variables for colors (`bg-app-surface`, `bg-app-base`, `text-content-primary`, `border-line`).
- **FORBIDDEN:** Never use hardcoded HEX colors (`bg-[#1a1b26]`) or raw slate/zinc shades (`bg-slate-900`) for structural elements.

## Rule 2: Complex UI (Ant Design)
- For interactive/complex components (`Table`, `Form`, `Modal`, `Select`, `DatePicker`), use **Ant Design**.
- **MANDATORY:** Rely completely on `ConfigProvider` injected at the App root level to handle theming.
- **FORBIDDEN:** Never wrap individual components/pages in an isolated `<ConfigProvider>` just to force a `darkAlgorithm` or token override.
- **FORBIDDEN:** Never use inline `style={{ backgroundColor: '#... '}}` to override Ant Design's native color tokens. Let the global theme handle it.
