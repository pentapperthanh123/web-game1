# 📦 Quy Cách Tài Nguyên 3D (`public/assets/`)

Ứng dụng **Họa Sĩ 3D (`apps/portrait-artist-3d/client`)** tự động nạp, chuẩn hóa chiều cao (normalize bounding box) và gắn xương cho các model `.vrm` / `.glb` đặt trong thư mục này. Khi chưa có file, hệ thống hiển thị bóng dáng Mannequin tối giản kèm thông báo file còn thiếu trên góc trái màn hình.

---

## 1. Danh Sách File & Quy Cách Đặt Tên

| Tên file (đặt trong `public/assets/`) | Bắt buộc / Tùy chọn | Chiều cao tự chuẩn hóa | Mô tả |
|---|---|---|---|
| **`artist.vrm`** *(hoặc **`artist.glb`**)* | Khuyên dùng | **`1.60m`** | Nhân vật Nữ Họa Sĩ 3D đứng trước giá vẽ. Ưu tiên đọc `artist.vrm` trước; nếu không có sẽ tự tìm `artist.glb`. |
| **`customer.glb`** | Khuyên dùng | **`1.45m`** | Nhân vật Khách ngồi ghế mẫu và đứng xếp hàng chờ. Được nhân bản bằng `SkeletonUtils.clone()` và tự động đổi màu áo theo `userId`. |
| **`props.glb`** | Tùy chọn | Giữ tỷ lệ gốc | Ghế đẩu gỗ và đạo cụ tùy chỉnh. Nếu có, hệ thống tự đo `seatTopY = boundingBox.max.y` để khóa hông (`hips`) của khách ngồi khớp chính xác mặt ghế. |

---

## 2. Quy Cách Animation Clips & Xương (Bones)

### A. Nữ Họa Sĩ (`artist.vrm` hoặc `artist.glb`)
- **Xương gắn đạo cụ tự động:**
  - `rightHand` (hoặc tên chứa `RightHand` / `hand_r` / `hand.R`): Hệ thống tự động gắn **cây cọ 3D** hướng thẳng về phía mặt phẳng giá vẽ.
  - `leftHand` (hoặc tên chứa `LeftHand` / `hand_l` / `hand.L`): Tự động gắn **bảng pha màu gỗ**.
  - `head`: Hỗ trợ liếc nhìn mẫu và giá vẽ.
- **Biểu cảm (với `.vrm`):** Tự động chớp mắt (`blink`) mỗi `3–4 giây` và mỉm cười (`happy`) khi đón VIP / khoe tranh.
- **Tên Animation Clip (với `.glb`):**
  - `Paint` *(hoặc `Draw`, `Work`, `Brush`)*: Chạy trong pha vẽ tranh (`PAINTING`), tự tăng tốc theo hệ số thả tim.
  - `Idle` *(hoặc `Stand`, `Wait`)*: Chạy khi chờ khách (`IDLE_WAIT`).
  - `Wave` *(hoặc `Greet`, `Happy`)*: Chạy khi đón VIP tặng quà và khi khoe tranh hoàn thành (`REVEAL`).

### B. Khách Hàng & Hàng Chờ (`customer.glb`)
- **Tên Animation Clip:**
  - `Sitting` *(hoặc `Sit`, `Seated`)*: Chạy khi khách ngồi trên ghế đẩu làm mẫu.
  - `Idle` *(hoặc `Stand`, `Wait`)*: Chạy khi khách đứng xếp hàng chờ bên trái.
  - `Walk` *(hoặc `Run`, `Move`)*: Chạy khi khách bước từ hàng chờ lên ghế đẩu (`WALK_IN`).
- **Xương căn ghế & đổi màu áo:**
  - `hips` *(hoặc `Pelvis`, `mixamorigHips`)*: Hệ thống tự động đo chiều cao xương hông và khóa khớp lên mặt ghế đẩu (`seatTopY = 0.58m`).
  - Vật liệu có tên chứa `shirt`, `top`, `cloth`, `outfit`, `coat`, hoặc `dress` sẽ được clone riêng để đổi màu ngẫu nhiên theo `userId` mà không nhân bản toàn bộ texture vào VRAM.

---

## 3. Giới Hạn Đa Giác & Texture Khuyên Dùng (Chuẩn 30 FPS / GPU Tích Hợp)

- **Số lượng đa giác (Triangles):**
  - `artist.vrm` / `artist.glb`: **`< 15,000 tris`**
  - `customer.glb`: **`< 8,000 tris`** (vì hiển thị đồng thời 1 người ngồi mẫu + 3–4 người trong hàng chờ)
  - `props.glb`: **`< 5,000 tris`**
- **Kích thước Texture:** Tối đa **`1024 × 1024`** (khuyên dùng `512 × 512` hoặc nén WebP/KTX2).
- **Hướng trục Model:** Mặt nhân vật hướng về **`+Z`** (hoặc chuẩn VRM 0.x / 1.0), gốc tọa độ `(0, 0, 0)` nằm dưới lòng bàn chân.
