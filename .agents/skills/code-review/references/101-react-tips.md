# 101 React Tips & Tricks (Tổng hợp)

Tài liệu này đóng vai trò là một phần của hệ thống `code-reviewer`.
**LỆNH BẮT BUỘC DÀNH CHO AI (CODE REVIEWER):** Sau mỗi lần sinh code hoặc sửa đổi mã nguồn liên quan đến React/Next.js, bạn PHẢI đối chiếu mã nguồn mới với các tiêu chí dưới đây và in ra báo cáo đánh giá.

## 1. Components Organization (Tổ chức Component)

- [ ] **Tách bạch Component (SRP):** TUYỆT ĐỐI KHÔNG gom nhiều logic khác nhau vào chung một component. Nếu component đảm nhiệm nhiều việc (ví dụ: vừa call API, vừa xử lý form, vừa render danh sách), phải tách nhỏ thành các Sub-Component hoặc Custom Hook chuyên biệt.
- [ ] **KHÔNG Hardcode (Zero Hardcode):** Tránh hardcode các chuỗi văn bản (dùng i18n/useTranslation), con số (dùng file `constants.ts`), URL hay trạng thái tĩnh.
- [ ] **Self-closing tags:** Dùng `<Component />` thay vì `<Component></Component>` nếu không có children.
- [ ] **Fragments:** Dùng `<>...</>` thay vì `<div>` để bọc các phần tử không cần thiết.
- [ ] **Destructure Props:** Luôn destructure props ngay ở tham số hàm và thiết lập giá trị mặc định (vd: `const MyComponent = ({ title = "Default" }) => ...`).
- [ ] **Tách Logic (Colocation):** Đẩy các hằng số (constants) và logic không phụ thuộc vào React Component ra bên ngoài hàm component.

## 2. Design Patterns & Techniques (Mẫu Thiết Kế)

- [ ] **Error Boundaries:** Đảm bảo các khối giao diện lớn (page/layout) có xử lý lỗi hoặc sử dụng Error Boundary (có trong `@app/ui`).
- [ ] **Render Props / Children:** Hạn chế truyền các DOM lớn qua props, hãy sử dụng `children` để UI component dễ đọc hơn.
- [ ] **Tránh rò rỉ giá trị (Conditional Rendering):** Dùng `value === case && <Component />` hoặc ép kiểu boolean `!!value && <Component />` thay vì `value && <Component />` (tránh in ra số 0 hoặc NaN trên UI).

## 3. Keys & Refs (Định danh & Tham chiếu)

- [ ] **Stable Keys:** Tuyệt đối không dùng `index` làm `key` trong hàm `.map()` nếu danh sách có thể thay đổi thứ tự. Cần dùng `id` duy nhất.
- [ ] **Sử dụng Refs:** Chỉ dùng Ref cho các thao tác DOM trực tiếp, không dùng Ref để thay thế State.

## 4. Organizing React Code (Cấu trúc File)

- [ ] **Kích thước file:** Bất kỳ file UI Component nào vượt quá 150-200 dòng đều phải bị cảnh báo và yêu cầu tách nhỏ ra các sub-component.
- [ ] **Named Exports:** Ưu tiên dùng `export const ComponentName` thay vì `export default`.

## 5. Efficient State Management (Quản lý Trạng Thái)

- [ ] **No Derived State:** Không lưu vào `useState` những giá trị có thể tính toán được trực tiếp từ state khác hoặc props.
- [ ] **Lazy Initialization:** Nếu giá trị khởi tạo của state tốn chi phí tính toán, hãy truyền một hàm vào `useState(() => expensiveCalculation())`.
- [ ] **Tối ưu Context:** Không bọc Context chứa nhiều state thay đổi liên tục cho toàn bộ ứng dụng (tránh re-render toàn cục).

## 6. Optimization & Performance (Tối ưu Hiệu Suất)

- [ ] **Sử dụng useMemo / useCallback hợp lý:** KHÔNG lạm dụng. Chỉ dùng khi truyền function/object xuống component con đã được bọc bằng `React.memo`, hoặc tính toán mảng/dữ liệu cực lớn.
- [ ] **Code Splitting:** Các component không hiện ngay trên màn hình (như Modal lớn, biểu đồ) nên dùng `React.lazy`.

## 7. React Hooks (Vòng Đời & Hooks)

- [ ] **Cleanup:** `useEffect` có timer (`setTimeout`), sự kiện (`addEventListener`) bắt buộc phải có hàm `return () => cleanup()` để tránh memory leak.
- [ ] **Custom Hooks:** Các logic phức tạp lấy dữ liệu hoặc tính toán trạng thái cần được tách riêng thành Custom Hook (vd: `useFetchData`, `useExamBuilder`).

---

**BÁO CÁO REVIEW CẦN ĐẠT YÊU CẦU:**
Bất cứ khi nào bạn chỉnh sửa file, bạn phải tự chạy Reviewer và chỉ rõ: File bạn vừa sửa đã tuân thủ (hoặc vi phạm) các điều nào trong 7 hạng mục trên!

## Danh sách toàn bộ 101 Rules tham chiếu:

- [ ] 1. Use self-closing tags to keep your code compact
- [ ] 2. Prefer fragments over DOM nodes (e.g., div, span, etc.) to group elements
- [ ] 3. Use React fragment shorthand &lt;&gt;&lt;/&gt; (except if you need to set a key)
- [ ] 4. Prefer spreading props over accessing each one individually
- [ ] 5. When setting default values for props, do it while destructuring them
- [ ] 6. Drop curly braces when passing string type props.
- [ ] 7. Ensure that value is a boolean before using value &amp;&amp; &lt;Component {...props}/&gt; to prevent displaying unexpected values on the screen.
- [ ] 8. Use functions (inline or not) to avoid polluting your scope with intermediate variables
- [ ] 9. Use curried functions to reuse logic (and properly memoize callback functions)
- [ ] 10. Move data that doesn't rely on the component props/state outside of it for cleaner (and more efficient) code
- [ ] 11. When storing the selected item from a list, store the item ID rather than the entire item
- [ ] 12. If you're frequently checking a prop's value before doing something, introduce a new component
- [ ] 13. Use the CSS :empty pseudo-class to hide elements with no children
- [ ] 14. Group all the state and context at the top of the component
- [ ] 15. Leverage the children props for cleaner code (and performance benefits)
- [ ] 16. Build composable code with compound components
- [ ] 17. Make your code more extensible with render functions or component functions props
- [ ] 18. When dealing with different cases, use value === case &amp;&amp; &lt;Component /&gt; to avoid holding onto old state
- [ ] 19. Always use error boundaries
- [ ] 20. Use crypto.randomUUID or Math.random to generate keys
- [ ] 21. Make sure your list items IDs are stable (i.e., they don't change between renders)
- [ ] 22. Strategically use the key attribute to trigger component re-renders
- [ ] 23. Use a ref callback function for tasks such as monitoring size changes and managing multiple node elements.
- [ ] 24. Colocate React components with their assets (e.g., styles, images, etc.)
- [ ] 25. Limit your component file size
- [ ] 26. Limit the number of return statements in your functional component file
- [ ] 27. Prefer named exports over default exports
- [ ] 28. Never create a state for a value that can be derived from other state or props
- [ ] 29. Keep the state at the lowest level necessary to minimize re-renders
- [ ] 30. Clarify the distinction between the initial state and the current state
- [ ] 31. Update state based on the previous state, especially when memoizing with useCallback
- [ ] 32. Use functions in useState for lazy initialization and performance gains, as they are invoked only once.
- [ ] 33. Use react context for broadly needed, static state to prevent prop drilling
- [ ] 34. React Context: Split your context into parts that change frequently and those that change infrequently to enhance app performance
- [ ] 35. React Context: Introduce a Provider component when the value computation is not straightforward
- [ ] 36. Consider using the useReducer hook as a lightweight state management solution
- [ ] 37. Simplify state updates with useImmer or useImmerReducer
- [ ] 38. Use Redux (or another state management solution) for complex client-side state accessed across multiple components
- [ ] 39. Redux: Use Redux DevTools to debug your state
- [ ] 40. Prevent unnecessary re-renders with memo
- [ ] 41. Specify an equality function with memo to instruct React on how to compare the props.
- [ ] 42. Prefer named functions over arrow functions when declaring a memoized component
- [ ] 43. Cache expensive computations or preserve references with useMemo
- [ ] 44. Use useCallback to memoize functions
- [ ] 45. Memoize callbacks or values returned from utility hooks to avoid performance issues
- [ ] 46. Leverage lazy loading and Suspense to make your apps load faster
- [ ] 47. Throttle your network to simulate a slow network
- [ ] 48. Use react-window or react-virtuoso to efficiently render lists
- [ ] 49. Use StrictMode to catch bugs in your components before deploying them to production
- [ ] 50. Install the React Developer Tools browser extension to view/edit your components and detect performance issues
- [ ] 51. React DevTools Components: Highlight components that render to identify potential issues
- [ ] 52. Leverage useDebugValue in your custom hooks for better visibility in React DevTools
- [ ] 53. Use the why-did-you-render library to track component rendering and identify potential performance bottlenecks
- [ ] 54. Hide logs during the second render in Strict Mode
- [ ] 55. Use React Testing Library to test your React components effectively
- [ ] 56. React Testing Library: Use testing playground to effortlessly create queries
- [ ] 57. Conduct end-to-end tests with Cypress or Playwright
- [ ] 58. Use MSW to mock network requests in your tests
- [ ] 59. Make sure you perform any required cleanup in your useEffect hooks
- [ ] 60. Use refs for accessing DOM elements
- [ ] 61. Use refs to preserve values across re-renders
- [ ] 62. Prefer named functions over arrow functions within hooks such as useEffect to easily find them in React Dev Tools
- [ ] 63. Encapsulate logic with custom hooks
- [ ] 64. Prefer functions over custom hooks
- [ ] 65. Prevent visual UI glitches by using the useLayoutEffect hook
- [ ] 66. Generate unique IDs for accessibility attributes with the useId hook
- [ ] 67. Use the useSyncExternalStoreto subscribe to an external store
- [ ] 68. Use the useDeferredValue hook to display the previous query results until the new results become available
- [ ] 69. Incorporate routing into your app with react-router
- [ ] 70. Implement first-class data fetching in your app with swr or React Query
- [ ] 71. Simplify form state management with libraries like formik, React Hook Form, or TanStack Form
- [ ] 72. Internationalize your app using Format.js, Lingui, or react-i18next.
- [ ] 73. Effortlessly create impressive animations with framer-motion
- [ ] 74. Tired of re-inventing the wheel with custom hooks? Check out https://usehooks.com/
- [ ] 75. Streamline app development by leveraging UI libraries like Shadcdn or Headless UI
- [ ] 76. Check your website's accessibility with the axe-core-npm library
- [ ] 77. Refactor React code effortlessly with react-codemod
- [ ] 78. Transform your app into a Progressive Web Application (PWA) using vite-pwa
- [ ] 79. Enhance your productivity with the Simple React Snippets snippets extension
- [ ] 80. Set editor.stickyScroll.enabled to true to quickly locate the current component
- [ ] 81. Simplify refactoring with extensions like VSCode Glean or VSCode React Refactor
- [ ] 82. Use ReactNode instead of JSX.Element | null | undefined | ... to keep your code more compact
- [ ] 83. Simplify the typing of components expecting children props with PropsWithChildren
- [ ] 84. Access element props efficiently with ComponentProps, ComponentPropsWithoutRef,â¦
- [ ] 85. Leverage types like MouseEventHandler, FocusEventHandler and others for concise typings
- [ ] 86. Specify types explicitly in useState, useRef, etc., when the type can't be or shouldn't be inferred from the initial value
- [ ] 87. Leverage the Record type for cleaner and more extensible code
- [ ] 88. Use the as const trick to accurately type your hook return values
- [ ] 89. Redux: Ensure proper typing by referring to https://react-redux.js.org/using-react-redux/usage-with-typescript to correctly type your Redux state and helpers
- [ ] 90. Simplify your types with ComponentType
- [ ] 91. Make your code more reusable with TypeScript generics
- [ ] 92. Ensure precise typing with the NoInfer utility type
- [ ] 93. Effortlessly type refs with the ElementRef type helper
- [ ] 94. Boost your code's quality and safety with eslint-plugin-react and Prettier.
- [ ] 95. Log and monitor your app with tools like Sentry or Grafana Cloud Frontend Observability.
- [ ] 96. Start coding quickly with online IDEs like Code Sandbox or Stackblitz
- [ ] 97. Looking for advanced react skills? Check out these books ð
- [ ] 98. Prepping React interviews? Check reactjs-interview-questions
- [ ] 99. Learn React best practices from experts like Nadia, Dan, Josh, Kent, etc.
- [ ] 100. Stay updated with the React ecosystem by subscribing to newsletters like This Week In React or ui.dev
- [ ] 101. Engage with the React community on platforms like r/reactjs
