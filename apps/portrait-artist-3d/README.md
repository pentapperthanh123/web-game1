# 🎨 Họa Sĩ 3D — TikTok LIVE Portrait Studio (`apps/portrait-artist-3d`)

Ứng dụng livestream tương tác **3D Nữ Họa Sĩ Vẽ Chân Dung** chuẩn dọc 9:16 (`720×1280`), tối ưu riêng cho OBS Studio và TikTok LIVE. Chạy hoàn toàn trên client bằng **Three.js + Canvas 2D hybrid painting engine (0 chi phí AI API)** và kết nối trực tiếp vào luồng sự kiện chuẩn hóa `NormalizedLiveEvent`.

---

## 🌟 Tính Năng Nổi Bật

1. **Nhân vật 3D `VRM_WITH_PROCEDURAL_FALLBACK`**:
   - Tự động dò và nạp `/assets/artist.vrm` bằng `@pixiv/three-vrm` nếu có trong thư mục `public/assets/`.
   - Khi chưa có file `.vrm`, tự động kích hoạt **Nữ Họa Sĩ Chibi 3D Stylized** với khớp đầu, cánh tay 2-bone IK bám sát tọa độ cọ vẽ, nháy mắt, và 5 biểu cảm khuôn mặt sống động (`normal`, `blink`, `smile`, `troll_wink`, `sweat_fast`).
2. **Hybrid Canvas Painting Engine (100% Client-side)**:
   - **Tải & Cache Avatar**: Tự động phát hiện avatar mặc định/đơn sắc/CORS lỗi để sinh chân dung Chibi hoạt hình theo hash `userId`.
   - **Bộ lọc 4 phong cách**: `sketch` (phác chì), `watercolor` (màu nước vân giấy), `oil_gold` (sơn dầu khung vàng VIP), `troll` (vẽ thêm kính râm, râu kẽm, má hồng, nơ và tem chữ vui nhộn).
   - **Quét cọ đồng bộ 3D**: 2 pha `0% → 30%` (phác nét) và `30% → 100%` (tô xoắn ốc/đan chéo) đồng bộ thời gian thực với đầu cọ 3D.
3. **Sân Khấu 3D Khóa Chuẩn 9:16 (`ScaledStage 720×1280`)**:
   - Khung căn giữa tự động co giãn bằng `ResizeObserver`, chống vỡ bố cục trên mọi màn hình.
   - Bối cảnh xưởng vẽ pastel nắng chiều ấm áp: giá vẽ gỗ, chậu cây low-poly, mèo ngủ thở nhịp trên bệ cửa sổ, người mẫu ngồi ghế đẩu và hàng chờ 6 nhân vật chibi (`InstancedMesh`).
   - Dây treo tối đa 8 khung tranh: khi xong bức mới, tranh bay vòng cung từ giá vẽ lên kẹp dây và đẩy tranh cũ sang trái; tự động thu hồi VRAM (`texture.dispose()`, `material.dispose()`) cho khung thứ 9.
4. **Đạo Diễn Camera 3D (`CameraDirector`)**:
   - 4 góc máy lerp mượt: `WIDE_STUDIO` (toàn cảnh), `OVER_SHOULDER` (soi cận mặt khi vẽ 45%–85%), `VIP_SPOTLIGHT` (zoom đón VIP tặng quà), `REVEAL_CLOSEUP` (khoe tranh 100%).
5. **Host Admin Dashboard & Auto-Bot Simulator (`:8021`)**:
   - Drawer 9:16 xem trực tiếp client ngay trong trang admin.
   - Quản lý hàng chờ thời gian thực (`vipQueue`, `normalQueue`), nút ưu tiên vẽ ngay, bỏ qua lượt, xóa user vi phạm.
   - Bật/tắt chế độ `Host Mở Mic` (tắt TTS để host tự nói, giữ lại SFX cọ vẽ, ting chuông), chuyển nhanh `VN/EN`.
   - Giả lập full sự kiện live và chế độ `Auto-Bot Demo` tự chạy liên hoàn để quay video demo.

---

## 🎮 Cơ Chế Tương Tác TikTok LIVE

| Sự kiện | Hành động người xem | Hiệu ứng phòng vẽ |
|---|---|---|
| **`CHAT`** | Gõ `me`, `vẽ`, `ve`, `em`, `tui` | Tự động vào `normalQueue` (chống spam trùng). Người đang ngồi mẫu chat sẽ hiện bong bóng thoại trên đầu. |
| **`LIKE`** | Thả tim màn hình | Tăng tốc độ quét cọ (`1.0x → 3.5x`, tự giảm sau 4s), cộng điểm mục tiêu tim cộng đồng, kích hoạt họa sĩ đổ mồ hôi/vẽ siêu tốc. |
| **`GIFT` Tier 1** | 1–4 xu (Hoa Hồng, quà nhỏ) | Đẩy user lên `vipQueue` (ưu tiên vẽ ngay sau bức hiện tại), camera `VIP_SPOTLIGHT` lia sang họa sĩ mỉm cười vẫy tay đón VIP. |
| **`GIFT` Tier 2** | 5–29 xu | Đổi phong cách bức tranh sang `watercolor`, `oil_gold` hoặc kích hoạt **Chế độ Vẽ Troll** (họa sĩ cười tinh nghịch, vẽ thêm phụ kiện hài hước). |
| **`GIFT` Tier 3** | 30+ xu (Quà lớn) | Đưa vào đầu `vipQueue`, đóng khung phát sáng hoàng gia, bắn pháo hoa giấy và đổi mũ họa sĩ sang màu vàng ngôi sao trong 3 phút. |
| **`JOIN`** | Khách ghé phòng live | Tạo hoạt ảnh khách đi dạo ngang qua cửa sổ nền (giới hạn tần suất chống rối mắt). |

---

## ⚡ Ràng Buộc Hiệu Năng (GPU Tích Hợp)

- **FPS Lock:** Khóa cứng vòng lặp render ở **30 FPS** (`delta >= 1/30`), ép `renderer.setPixelRatio(1)`.
- **Tối ưu Draw Calls:** Gom geometry tĩnh phòng xưởng, dùng `InstancedMesh` cho hàng chờ và bóng tròn mặt sàn (`blob shadow`), giữ toàn cảnh **< 60 draw calls**.
- **Không Shadow Map / Post-processing:** `shadowMap.enabled = false`, dùng vật liệu nhẹ `MeshToonMaterial` với 2 nguồn sáng.
- **Tối ưu Upload VRAM:** Chỉ set `canvasTexture.needsUpdate = true` trong pha `PAINTING`.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### 1. Cài đặt dependencies (ở thư mục gốc)
```bash
pnpm install
```

### 2. Khởi chạy đồng thời Client & Admin
```bash
pnpm run dev:portrait
```
- **3D Live Client (9:16):** [http://localhost:8020](http://localhost:8020)
- **Host Admin Panel:** [http://localhost:8021](http://localhost:8021)

*(Hoặc chạy riêng từng ứng dụng):*
```bash
pnpm run dev:portrait:client  # Cổng 8020
pnpm run dev:portrait:admin   # Cổng 8021
```

### 3. Đưa lên OBS Studio
1. Thêm nguồn **Browser Source** trong OBS.
2. Đặt URL là `http://localhost:8020`.
3. Cài đặt kích thước: **Width 720**, **Height 1280** (tỉ lệ 9:16 dọc).
4. Tích chọn *Shutdown source when not visible* và *Refresh browser when scene becomes active*.

### 4. Sử dụng Model 3D `.vrm` Tùy Chỉnh (Tùy chọn)
- Đặt file `.vrm` của bạn vào `apps/portrait-artist-3d/client/public/assets/` với tên `artist.vrm`.
- Tải lại trang client; ứng dụng sẽ tự chuyển từ Chibi Procedural sang model VRM.

---

## 📂 Cấu Trúc Mã Nguồn

```plaintext
apps/portrait-artist-3d/
├── shared/
│   ├── constants/
│   │   ├── studioConfig.ts       # Cấu hình cổng, mốc quà, giới hạn vẽ
│   │   └── i18nStrings.ts        # Bộ chuỗi song ngữ VN / EN
│   └── types/
│       ├── events.ts             # Hợp đồng NormalizedLiveEvent & Admin Sync
│       └── studio.ts             # Kiểu dữ liệu trạng thái, phiên vẽ, hàng đợi
├── client/
│   ├── public/assets/            # Nơi đặt artist.vrm tùy chọn
│   └── src/
│       ├── engine/
│       │   ├── painting/         # Avatar loader, ArtFilterPipeline, BrushRevealEngine
│       │   ├── scene/            # StudioSceneManager, ArtistController, GalleryWall, VFX
│       │   └── audio/            # StudioSfx procedural Web Audio
│       ├── components/
│       │   ├── stage/            # ScaledStage (720x1280), StudioCanvas3D
│       │   └── hud/              # TopProgressHud, RulesWoodBoard, SpeechBubbleLayer
│       ├── services/             # CoreReceiver (5000/4000), ClientSync (BroadcastChannel)
│       └── store/                # Zustand state machine điều phối lượt vẽ
└── admin/
    └── src/
        ├── components/           # QueueManagerPanel, LiveConfigPanel, LiveSimulatorPanel, Drawer
        ├── services/             # AdminEmitter phát lệnh & sự kiện giả lập
        └── store/                # Admin store đồng bộ snapshot từ client
```
