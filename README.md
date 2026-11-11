🎮 LoL CKTG Live Interactive Game (BLG vs Gen.G) - Tài Liệu Kỹ Thuật & Nghiệp Vụ

1. Giới Thiệu Tổng Quan

Hệ thống web game tương tác trực tiếp trên TikTok Live được thiết kế riêng cho sự kiện Chung Kết Thế Giới (CKTG) Liên Minh Huyền Thoại (Tâm điểm: BLG vs Gen.G). Hệ thống biến người xem từ trạng thái thụ động thành người tham gia trực tiếp thông qua khung chat và quà tặng, đồng thời giải quyết triệt để vấn đề bản quyền phát sóng bằng mô hình 3D tương tác mô phỏng độc lập.

2. Tính Năng Cốt Lõi (Core Features)

A. Tương Tác Trực Tiếp Từ TikTok Live

Hệ Thống Bắt Sự Kiện Thời Gian Thực: Tự động kết nối phòng live để ghi nhận tin nhắn chat và quà tặng ngay lập tức thông qua WebSocket.

Cơ Chế Chọn Phe (BLG vs Gen.G): Người xem gõ cú pháp hoặc tặng quà để gia tăng điểm số và lực chiến cho đội tuyển yêu thích.

Triệu Hồi Tướng/Linh Thú: Người xem chat tên tướng (VD: Zed, Lux, Yasuo, BLG, GEN) để triệu hồi các mô hình 3D vây quanh Boss và tự động cấu máu theo thời gian.

Kỹ Năng Tối Thượng (Ultimate) & Quà Tặng: Khi nhận quà (Gift), hệ thống kích hoạt hiệu ứng toàn cục (Rung màn hình, pháo hoa particles, sát thương cực lớn).

Giọng Đọc AI (Text-to-Speech - TTS): Tự động phát âm thanh đọc tên và nội dung tương tác của người xem, tạo cảm giác được vinh danh trực tiếp trên sóng.

B. Bảng Xếp Hạng & Vinh Danh (Leaderboard & Rewards)

Bảng DPS Thời Gian Thực: Tự động tổng hợp sát thương gây ra bởi từng cá nhân, hiển thị Top 5 người chơi mạnh nhất lên giao diện HUD.

Hệ Thống Vinh Danh Đại Gia: Khi có quà tặng giá trị cao, giao diện hiển thị banner Hologram 3D/2D ở giữa màn hình để vinh danh người donate.

C. Cơ Chế Chống Spam & Quản Lý Lưu Lượng (Anti-Spam & Load Balancing)

Bộ Lọc Từ Khóa (Whitelist): Server tự động lọc bỏ các bình luận rác, chỉ nhận từ khóa hợp lệ.

Cooldown Cá Nhân: Giới hạn tần suất gọi lệnh của từng tài khoản nhằm tránh tình trạng spam hệ thống.

Hàng Đợi Sự Kiện (FIFO Queue): Dồn dập hàng nghìn comment được phân phối đều đặn vào game, giữ vững hiệu suất ổn định (30/60 FPS).

3. Nghiệp Vụ Vận Hành (Business Logic & Workflows)

A. Luồng Xử Lý Dữ Liệu (Data Flow)

Thu Thập: Server Node.js lắng nghe sự kiện chat và gift từ thư viện tiktok-live-connector.

Lọc & Kiểm Tra: Server kiểm tra từ khóa hợp lệ và áp dụng quy tắc Cooldown cho từng User.

Điều Phối (Queue): Các sự kiện hợp lệ được đẩy vào hàng đợi và truyền tải xuống Frontend qua WebSocket (Socket.io).

Hiển Thị & Phản Hồi: Frontend nhận dữ liệu, kích hoạt hiệu ứng đồ họa Three.js (Boss nhận sát thương, nhảy số DPS, sinh linh thú) kết hợp phát giọng đọc AI cảm ơn.

B. Chiến Lược An Toàn Bản Quyền

Hệ thống không phát sóng video hoặc hình ảnh trực tiếp trận đấu gốc, loại bỏ hoàn toàn rủi ro bị quét bản quyền từ Riot Games.

Giao diện hiển thị 100% là mô hình 3D mô phỏng minigame tương tác cộng đồng, kết hợp bảng tỷ số dạng text/hình ảnh tĩnh cập nhật công khai.

4. Công Nghệ Sử Dụng (Tech Stack)

A. Frontend (Giao Diện & Đồ Họa 3D)

React & Vite: Xây dựng cấu trúc giao diện linh hoạt, quản lý State trực quan và tối ưu tốc độ biên dịch.

Tailwind CSS: Thiết kế hệ thống giao diện HUD, bảng xếp hạng và panel điều khiển nhanh chóng.

Three.js & React Three Fiber (R3F): Xây dựng không gian đồ họa 3D tối ưu cho máy cấu hình yếu (card onboard), render mượt mà các hiệu ứng Boss, mô hình linh thú và pháo hoa.

Socket.io-client: Tiếp nhận dữ liệu thời gian thực từ Server.

B. Backend (Xử Lý Sự Kiện & Tương Tác)

Node.js & Express: Môi trường vận hành máy chủ trung gian.

[TikTok Live Connector] ──> [Node.js Server] 
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     [ Redis (RAM) ]                     [ MongoDB (Disk) ]
   - Xử lý Bảng Xếp Hạng (DPS)         - Lưu lịch sử ván đấu
   - Quản lý Cooldown chống spam       - Lưu thông tin cấu hình
   - Lưu trạng thái HP Boss hiện tại   - Thống kê tổng kết sau trận

tiktok-live-connector: Thư viện chuyên dụng kết nối trực tiếp với luồng dữ liệu phòng livestream TikTok.

Socket.io: Điều phối và đồng bộ hóa sự kiện giữa Server và Client.

C. Môi Trường Phát Sóng

OBS Studio: Sử dụng nguồn Browser Source với định dạng khung hình dọc chuẩn di động (720x1280) để đưa minigame lên phiên live.


---

## 5. Hướng Dẫn Vận Hành Hệ Thống (PNPM Monorepo)

Hệ thống được tổ chức theo kiến trúc **PNPM Monorepo** với 3 dịch vụ độc lập:

| Dịch vụ | Thư mục | Cổng (Port) | Vai trò |
|---|---|---|---|
| **Game OBS 3D** | `client/` | `http://localhost:3000` | Giao diện đồ họa 3D Three.js tỉ lệ 9:16 (720x1280) cho OBS Studio Browser Source. |
| **Admin Portal** | `admin/` | `http://localhost:3001` | Bảng điều khiển giả lập comment, thả tim, donate quà VIP và kết nối TikTok Live. |
| **Backend Gateway** | `server/` | `http://localhost:4000` | Máy chủ trung gian Socket.io và cầu nối `tiktok-live-connector`. |

### Lệnh Khởi Động (Chạy Mọi Terminal)

```powershell
# Chạy song song cả 3 dịch vụ cùng lúc
pnpm dev:all

# Hoặc nhấp đúp file start.bat trên Windows
.\start.bat
```

### Lệnh Biên Dịch Kiểm Thử

```powershell
pnpm build:all
```
