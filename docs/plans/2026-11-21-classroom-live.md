# Kế hoạch Triển khai: Lớp Học Trực Tuyến (`apps/classroom-live`)

> **Mục tiêu:** Xây dựng hoàn chỉnh ứng dụng livestream tương tác TikTok LIVE "Lớp Học Trực Tuyến" theo chế độ đồ họa `2D_STYLIZED` (chuẩn dọc 9:16 720x1280), cắm vào core thông qua `NormalizedLiveEvent`, gồm 2 phần `client` và `admin`, kèm ngân hàng 60 câu hỏi và Auto-Bot Simulator.

---

## 📋 DANH SÁCH CÁC GIAI ĐOẠN TRIỂN KHAI

### GIAI ĐOẠN 1: Shared Data & Contracts (`apps/classroom-live/shared/`)
- [ ] `shared/types/classroom.ts`: Định nghĩa Student, DeskSlot, ClassroomState, TeamGroup (Tổ 1–4).
- [ ] `shared/types/question.ts`: Định nghĩa QuestionItem, GameModeType (`ANAGRAM`, `QUIZ`, `BREAK`), AnswerSubmission.
- [ ] `shared/constants/classroomConfig.ts`: Cấu hình 28 ghế (lưới 5x6), AFK 180s, mục tiêu tim 10.000, thời gian câu 25s.
- [ ] `shared/data/questionBank.json`: 60 câu hỏi mẫu (30 câu Đảo chữ Vua Tiếng Việt + 20 câu Đố mẹo/Trắc nghiệm + 10 câu Tiếng Anh).

### GIAI ĐOẠN 2: Xây dựng Game Client (`apps/classroom-live/client/`)
- [ ] Khởi tạo dự án Vite + React + Tailwind/CSS + Lucide: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`.
- [ ] Bộ công cụ thuật toán & kết nối:
  - `services/textMatcher.ts`: Chuẩn hóa tiếng Việt (bỏ dấu, trim, fuzzy matching).
  - `services/coreReceiver.ts`: Kết nối Socket.IO tới Gateway hoặc Core Server để nhận `NormalizedLiveEvent`.
  - `services/fpsLimiter.ts`: Khóa vòng lặp render ở 30 FPS với delta time accumulator.
- [ ] State Machine & Store (`store/classroomStore.ts`):
  - Vòng đời: `IDLE` -> `READING` -> `ANSWERING` -> `REVEAL` -> `BELL_BREAK`.
  - Quản lý 28 ghế học sinh, xếp chỗ bàn đầu cho top điểm, quản lý hàng chờ hành lang.
  - Quản lý Quỹ Lớp (GIFT) và buff x2 điểm cho Tổ.
- [ ] Giao diện 9:16 (720x1280):
  - `TopClassHeader`: Tên lớp, Vòng/Tiết, thanh tiến độ Tim (HeartGoal).
  - `BannerNotice`: Dải nhắc "NGHE HẾT ĐỀ - GÕ MỚI ĂN ĐIỂM".
  - `BlackboardView`: Bảng xanh Việt Nam, Bảng thi đua Top 5 (trái), Thi đua 4 Tổ (phải), đồng hồ đếm ngược.
  - `AnagramBoard`: Ô chữ xáo trộn + hàng ô trống lật chữ (Vua Tiếng Việt).
  - `QuizBoard`: Câu hỏi trắc nghiệm A/B/C/D & đố mẹo.
  - `TeacherSprite`: Cô giáo Áo dài tương tác + bong bóng thoại.
  - `ClassroomFloor` & `DeskItem`: 28 bàn học sinh 2.5D, avatar tròn, màu khăn/áo theo Tổ, vương miện Lớp Trưởng, hiệu ứng giơ tay bắn pháo giấy.
  - `HallwayView`: Học sinh mini đứng ngoài hành lang cửa sổ, nhãn sĩ số và ticker thông báo vào lớp.
  - `VfxLayer`: Canvas 2D particle pool nhẹ cho pháo giấy, hoa rơi và sao thưởng.

### GIAI ĐOẠN 3: Bảng điều khiển Admin (`apps/classroom-live/admin/`)
- [ ] Khởi tạo dự án Vite + React + Tailwind: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`.
- [ ] Điều phối tiết học: Bắt đầu, tạm dừng, qua câu, lật gợi ý thủ công, bấm trống trường chuyển môn.
- [ ] Live Config: Bật/tắt "Khóa khi đọc đề", Bật/tắt "Host Mở Mic" (tắt TTS), đổi thời gian câu, ngưỡng tim.
- [ ] Quản lý Ngân hàng câu hỏi: Xem, lọc theo môn, thêm/sửa, import/export JSON.
- [ ] Bộ giả lập kiểm thử (Live Simulator):
  - Nút thêm 10 học sinh, spam tim, chat đúng/sai, tặng 3 mức quà.
  - Chế độ Auto-Bot: Tự động chạy demo mượt mà cả tiết học không cần Host thao tác.

### GIAI ĐOẠN 4: Tích hợp Monorepo & Build Verification
- [ ] Thêm các scripts tiện lợi vào root `package.json` (`dev:classroom`, `build:classroom`).
- [ ] Cài đặt dependencies (`pnpm install`).
- [ ] Kiểm tra toàn bộ TypeScript (`tsc`) và build production (`vite build`) đạt 0 lỗi.
- [ ] Viết tài liệu hướng dẫn chạy và nghiệm thu.

