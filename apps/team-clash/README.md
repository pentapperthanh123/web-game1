# Team Clash (`apps/team-clash`)

Game đối kháng 2 phe tương tác thời gian thực chuẩn dọc 9:16 (`720×1280`) dành cho TikTok LIVE & OBS Studio, kết nối trực tiếp vào Core Connect Service thông qua `NormalizedLiveEvent`.

---

## 🚀 3 Bước Chạy Nhanh Local

### 1. Cài đặt Dependencies (nếu chưa có)
```bash
pnpm install
```

### 2. Khởi chạy đồng thời Client & Admin
```bash
# Chạy cả Client (8030) và Admin (8031)
pnpm run dev:clash

# Hoặc chạy riêng biệt:
pnpm run dev:clash:client   # Sân khấu 9:16 (http://localhost:8030)
pnpm run dev:clash:admin    # Bảng điều khiển Host (http://localhost:8031)
```

### 3. Khởi Động Trận Đấu & Kết Nối TikTok Studio
1. Mở song song 2 tab:
   - **Client:** `http://localhost:8030` (Sân khấu dọc 720x1280 khóa khung `ScaledStage`).
   - **Admin:** `http://localhost:8031` (Bảng điều khiển Host).
2. Khi mở trang, game ở trạng thái **SẴN SÀNG (WAITING)**: Đồng hồ chưa chạy, 2 nhân vật giữ thế thủ.
3. Bấm **`▶️ BẮT ĐẦU TRẬN`** trên thanh điều khiển Admin hoặc chạm vào nút **`▶️ BẮT ĐẦU HIỆP ĐẤU`** trên màn hình Client để trận đấu chính thức bắt đầu và tính giờ.
4. **Kết nối TikTok LIVE Studio / OBS Studio:**
   - Dán URL `http://localhost:8030` vào nguồn **Browser Source** (Rộng `720`, Cao `1280`, FPS `30`).
   - Trên bảng Host Admin (`http://localhost:8031`), nhập username TikTok (ví dụ: `@username`) vào mục **KẾT NỐI TIKTOK LIVE** và bấm **`Kết Nối`** để nhận tương tác thật từ phòng live.
5. Để test nhanh không cần live thật, bạn bấm **`▶️ BẬT AUTOBOT`** trên Admin để xem bot tự động cmt, thả tim và donate quà.

---

## 🎮 Cơ Chế Tương Tác Trận Đấu

| Sự Kiện | Quy Đổi Lực Đẩy | Hiệu Ứng Trực Quan |
|---|---|---|
| **`CHAT`** | `+0.5%` ranh giới | Bắt từ khóa phe Trái (`g`, `girl`, `nu`, `nữ`, `1`) hoặc Phải (`b`, `boy`, `nam`, `2`). Spawn tia lửa năng lượng kèm Avatar. Giới hạn 350ms/user chống spam. |
| **`LIKE`** | `+0.08%` / like | Gom batch 200ms. Tự cộng vào phe đã chọn hoặc nạp năng lượng chung nếu chưa chọn phe. |
| **`GIFT` Nhỏ (1–4 xu)** | `+5%` lực đẩy | Kích hoạt **Donate Push** đẩy mạnh ranh giới, hiện Avatar + Thẻ quà tặng lơ lửng. |
| **`GIFT` Vừa (5–29 xu)** | `+12%` lực đẩy | Kích hoạt **Super Beam** chùm sáng lớn + rung màn hình nhẹ (`shakeIntensity: 0.5`). |
| **`GIFT` Lớn (30+ xu)** | `+22%` lực đẩy | Kích hoạt **Ultimate Clash** sóng xung kích cực đại lật ngược thế trận + gán MVP. |

---

## 🎨 Bộ Presets Chủ Đề (Đổi trực tiếp trên Admin)

- **`GIRL vs BOY` (Mặc định):** Phe Trái Hồng lửa rực rỡ vs Phe Phải Xanh năng lượng điện.
- **`CAT vs DOG`:** Phe Trái Cam ấm vs Phe Phải Xanh dương.
- **`RED vs BLUE`:** Phe Trái Đỏ vs Phe Phải Xanh.
- **`CUSTOM`:** Tự do đặt tên 2 phe, chọn màu hex và từ khóa theo ý thích Host.

---

## 🎵 Cấu Hình Nhạc Nền YouTube & Âm Thanh Sống Động

- **Biến môi trường link YouTube (`apps/team-clash/client/.env`):**
  ```env
  VITE_YOUTUBE_BGM_URL=https://www.youtube.com/watch?v=5qap5aO4i9A
  ```
- **Cơ chế phát & Fallback:**
  - Nhạc nền YouTube chạy ngầm vô tận qua iframe ẩn trong suốt trận đấu, tự động un-mute ngay khi click/chạm màn hình.
  - Tự động hạ âm lượng (Ducking) xuống 15% khi Host bật nút **Chế độ Mở Mic** trên Admin Panel.
  - Tự động tạm dừng khi kết thúc hiệp đấu để tôn vinh **🏆 Victory Fanfare** chiến thắng.
  - Nếu để trống link hoặc link YouTube lỗi, hệ thống tự động fallback về **Synth Beat điện tử 128 BPM** tích hợp sẵn.
  - Host có thể xem trạng thái, đổi link trực tiếp hoặc chuyển về beat mặc định ngay trên tab **🎙️ Âm Thanh & Host Mic** ở Admin (`http://localhost:8031`).
- **Hiệu ứng SFX Anime / Cyberpunk Mecha PK:**
  - **Laser Trái (Girl / Pink):** Ki-blast laser sắc bén với âm sắc bùng nổ, stereo pan trái (-0.55).
  - **Laser Phải (Boy / Cyan):** Tia chớp điện từ (FM Synthesis) giật mạnh, stereo pan phải (+0.55).
  - **Super Beam (5–29 xu):** Âm thanh nạp năng lượng (Riser) + chùm tia plasma kép (Dual Detuned Sawtooth) + tiếng dộng Sub Bass.
  - **Ultimate Clash (30+ xu):** Sóng xung kích địa chấn (Sub Drop 26Hz) + tiếng nổ sấm sét điện từ + vòng hào quang ngân vang.
  - **Victory Fanfare:** Tiếng cồng kim loại vang dội + hợp âm kèn đồng hoành tráng C Major 9th + tiếng pháo hoa nổ chúc mừng.
  - **Dynamics Compressor Limiter:** Tự động nén động học giúp âm thanh không bao giờ bị vỡ hạt (clipping) dù hàng chục người comment/thả tim cùng lúc.

---

## ⚡ Tối Ưu Hiệu Năng (Locked 30 FPS / Zero GC)

- Render bằng **HTML5 Canvas 2D** khóa cứng ở `30 FPS` (`elapsed >= 33.33ms`), `devicePixelRatio = 1`.
- **`ParticlePool`** cố định 80 hạt, tái sử dụng hoàn toàn (không cấp phát `new Object()` trong game loop).
- Giữ CPU/GPU cực thấp khi chạy song song với TikTok LIVE Studio hoặc OBS Studio.
