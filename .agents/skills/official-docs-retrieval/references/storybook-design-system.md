# Storybook & Design System UI Extraction Guide

> Hướng dẫn xử lý Storybook URLs hoặc Custom UI Kit Docs để tự động trích xuất Component Props, Variants, và Design Tokens.

---

## 🎯 Các thông tin trích xuất từ Storybook

Khi cung cấp link Storybook (VD: `https://storybook.company.com/?path=/docs/components-button--docs`):

1. **Component Name & Import Path:** Tên component chuẩn và đường dẫn import trong UI library nội bộ.
2. **Prop Types & Default Values:** Bảng Props (`variant`, `size`, `isDisabled`, `isLoading`, `colorScheme`).
3. **Variants Matrix:** Các biến thể giao diện (`primary`, `secondary`, `outline`, `ghost`, `danger`).
4. **Design Tokens:** Bảng màu Hex/RGB, Spacing scale, Border Radius, Shadow elevation.

---

## 🛠️ Ví dụ Quy đổi Storybook Docs ➔ React Component Usage

### Thông tin từ Storybook:
- Component: `<Button />`
- Props: `variant` (`'solid' | 'outline' | 'ghost'`), `size` (`'sm' | 'md' | 'lg'`), `isLoading` (`boolean`), `icon` (`ReactNode`)

### Kết quả AI Tự Động Sinh ra (Clean Code):
```tsx
import { Button } from '@company/ui-kit';
import { PlusIcon } from '@company/ui-icons';

export function CreatePostButton({ onClick, isLoading }: CreatePostButtonProps) {
  return (
    <Button
      variant="solid"
      size="md"
      isLoading={isLoading}
      icon={<PlusIcon />}
      onClick={onClick}
    >
      Tạo bài viết
    </Button>
  );
}
```
