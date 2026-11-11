# Pragmatic Error Handling & Resilience Architecture

> Production standards for handling API errors, UI exceptions, async failures, and dynamic error payloads in web applications.

---

## 1. Principles of Pragmatic Error Handling

1. **Never Crash the App:** Every user-facing action must fail gracefully with actionable feedback.
2. **Centralized Error Normalization:** Convert all external errors (Axios, RTK Query, Fetch, Network, Timeout) into a uniform `AppError` object.
3. **No Guessing Chains:** Avoid inline 5+ level optional property chaining (`error?.data?.message || error?.data?.detail || error?.detail || ...`). Use clean helper functions or type predicates.
4. **Log for Engineers, Show Feedback for Users:** Detailed stack traces go to logging/monitoring tools (Sentry/LogRocket), concise friendly messages go to toasts/alerts.

---

## 2. Universal Error Normalization Pattern

### 2.1 The `getErrorMessage` Helper

Create a single, type-safe utility function in `src/utils/error.ts`:

```typescript
export interface NormalizedError {
    message: string;
    code?: string | number;
    details?: Record<string, unknown>;
}

/**
 * Safely extracts a user-friendly error message from any unknown error object.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred'): string {
    if (!error) {
        return defaultMessage;
    }

    // 1. Primitive string error
    if (typeof error === 'string') {
        return error.trim() || defaultMessage;
    }

    // 2. Standard Error instance
    if (error instanceof Error && error.message) {
        return error.message;
    }

    // 3. API Error Objects (RTK Query / Axios / Custom HTTP Error)
    if (typeof error === 'object' && error !== null) {
        const errObj = error as Record<string, unknown>;

        // Axios / RTK Query nested data payload
        if (errObj.data && typeof errObj.data === 'object' && errObj.data !== null) {
            const dataObj = errObj.data as Record<string, unknown>;
            if (typeof dataObj.message === 'string' && dataObj.message.trim()) {
                return dataObj.message;
            }
            if (typeof dataObj.detail === 'string' && dataObj.detail.trim()) {
                return dataObj.detail;
            }
            if (typeof dataObj.error === 'string' && dataObj.error.trim()) {
                return dataObj.error;
            }
        }

        // Top-level message/detail/error fields
        if (typeof errObj.message === 'string' && errObj.message.trim()) {
            return errObj.message;
        }
        if (typeof errObj.detail === 'string' && errObj.detail.trim()) {
            return errObj.detail;
        }
        if (typeof errObj.error === 'string' && errObj.error.trim()) {
            return errObj.error;
        }
    }

    return defaultMessage;
}
```

---

## 3. Usage Patterns in Components & Custom Hooks

### 3.1 Custom Hook / Async Mutation Error Toast

```tsx
// ❌ BAD: Inline spaghetti fallback chain repeated across 20 components
const handleSubmit = async () => {
    try {
        await updateSection(data).unwrap();
        showToast({ title: 'Success', theme: 'positive' });
    } catch (err: any) {
        const msg = err?.data?.message || err?.data?.detail || err?.message || err?.detail || 'Error';
        showToast({ title: msg, theme: 'negative' });
    }
};

// ✅ GOOD: Clean, clean-code invocation using normalized helper
const handleSubmit = async () => {
    try {
        await updateSection(data).unwrap();
        showToast({ title: 'Thêm mới đề mục thành công', theme: 'positive' });
    } catch (err) {
        const errorMsg = getErrorMessage(err, 'Có lỗi xảy ra khi thêm đề mục');
        showToast({ title: errorMsg, theme: 'negative' });
    }
};
```

---

## 4. Global API Response Interceptor & Status Code Handling

### 4.1 Axios / Fetch Response Interceptor Standard

```typescript
import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
    baseURL: process.env.VITE_API_BASE_URL,
    timeout: 15000,
});

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (!error.response) {
            // Network failure or CORS issue
            return Promise.reject({
                message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
                code: 'NETWORK_ERROR',
            });
        }

        const { status, data } = error.response;

        switch (status) {
            case 401:
                // Unauthorized - Trigger token refresh or logout dispatch
                handleUnauthorized();
                break;
            case 403:
                return Promise.reject({
                    message: 'Bạn không có quyền thực hiện thao tác này.',
                    code: 403,
                });
            case 404:
                return Promise.reject({
                    message: 'Dữ liệu yêu cầu không tồn tại hoặc đã bị xóa.',
                    code: 404,
                });
            case 500:
            case 502:
            case 503:
                return Promise.reject({
                    message: 'Hệ thống máy chủ gặp sự cố. Vui lòng thử lại sau.',
                    code: status,
                });
        }

        return Promise.reject(data || error);
    }
);
```

---

## 5. React Error Boundaries

### 5.1 Fallback UI Pattern for Component Crash Prevention

Wrap key route sections or heavy widget components in Error Boundaries so that a localized UI render failure does not crash the entire application.

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled UI Error:', error, errorInfo);
        // Log to telemetry service (e.g. Sentry)
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="p-6 text-center bg-red-50 rounded-lg border border-red-200">
                    <h3 className="text-lg font-semibold text-red-800">Đã xảy ra lỗi hiển thị</h3>
                    <p className="text-sm text-red-600 mt-2">
                        {this.state.error?.message || 'Vui lòng làm mới trang hoặc thử lại sau.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
```

---

## 6. Error Handling Checklist for AI Agents

- [ ] Does the async action handle rejected promises / catch errors?
- [ ] Is user feedback displayed via toast, alert, or inline error message?
- [ ] Is the error message normalized using a helper instead of 5+ level inline `||` guessing chains?
- [ ] Are sensitive technical stack traces hidden from normal end-user toasts?
- [ ] Are network timeouts and disconnects gracefully handled?
