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

### 3. Bật Auto-Bot Clash để kiểm tra
1. Mở song song 2 tab:
   - **Client:** `http://localhost:8030` (Sân khấu dọc 720x1280 khóa khung `ScaledStage`).
   - **Admin:** `http://localhost:8031` (Bảng điều khiển Host).
2. Trên giao diện Admin, bấm **`▶️ BẬT AUTO-BOT CLASH`**.
3. Bạn sẽ thấy 2 phe giằng co chân thực, quả cầu năng lượng va chạm rung lắc liên tục, các đòn tấn công Super Beam & Ultimate Clash bộc phát kèm hiệu ứng âm thanh sống động.

---

## 🎮 Cơ Chế Tương Tác Trận Đấu

| Sự Kiện | Quy Đổi Lực Đẩy | Hiệu Ứng Trực Quan |
|---|---|---|
| **`CHAT`** | `+0.6%` ranh giới | Bắt từ khóa phe Trái (`g`, `girl`, `nu`, `nữ`, `1`) hoặc Phải (`b`, `boy`, `nam`, `2`). Spawn tia lửa năng lượng kèm Avatar. Giới hạn 350ms/user chống spam. |
| **`LIKE`** | `+0.1%` / like | Gom batch 200ms. Tự cộng vào phe đã chọn hoặc nạp năng lượng chung nếu chưa chọn phe. |
| **`GIFT` Nhỏ (1–4 xu)** | `+9%` lực đẩy | Tung chưởng đẩy mạnh ranh giới, hiện Avatar + Tên người tặng trên luồng năng lượng. |
| **`GIFT` Vừa (5–29 xu)** | `+20%` lực đẩy | Kích hoạt **Super Beam** chùm sáng lớn + rung màn hình nhẹ (`shakeIntensity: 0.5`). |
| **`GIFT` Lớn (30+ xu)** | `+35%` lực đẩy | Kích hoạt **Ultimate Clash** sóng xung kích cực đại lật ngược thế trận + gán MVP. |

---

## 🎨 Bộ Presets Chủ Đề (Đổi trực tiếp trên Admin)

- **`GIRL vs BOY` (Mặc định):** Phe Trái Hồng lửa rực rỡ vs Phe Phải Xanh năng lượng điện.
- **`CAT vs DOG`:** Phe Trái Cam ấm vs Phe Phải Xanh dương.
- **`RED vs BLUE`:** Phe Trái Đỏ vs Phe Phải Xanh.
- **`CUSTOM`:** Tự do đặt tên 2 phe, chọn màu hex và từ khóa theo ý thích Host.

---

## ⚡ Tối Ưu Hiệu Năng (Locked 30 FPS / Zero GC)

- Render bằng **HTML5 Canvas 2D** khóa cứng ở `30 FPS` (`elapsed >= 33.33ms`), `devicePixelRatio = 1`.
- **`ParticlePool`** cố định 80 hạt, tái sử dụng hoàn toàn (không cấp phát `new Object()` trong game loop).
- Giữ CPU/GPU cực thấp khi chạy song song với TikTok LIVE Studio hoặc OBS Studio.
