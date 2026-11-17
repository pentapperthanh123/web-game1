# 🎁 TÀI LIỆU KỸ THUẬT & DANH MỤC HỆ THỐNG QUÀ TẶNG (1 – 999+ XU)
> **Dự án**: TikTok Interactive Live Game - BO5 Đại Chiến CKTG  
> **Phiên bản hiện tại**: v1.2.0 (Hỗ trợ Dual Caster: Bảo & Anna, 3D Canvas VFX, Phân cấp 4 Tier & Finisher Strike)  
> **Ngày cập nhật**: 17/11/2026  
> **Mục đích**: Chuẩn hóa thông số, hiệu ứng visual, âm thanh và logic tác động để chuẩn bị cho đợt **ĐẠI UPDATE**.

---

## 📑 MỤC LỤC
1. [Kiến Trúc & Phân Cấp Bậc Quà (Gift Tiers)](#1-kiến-trúc--phân-cấp-bậc-quà-gift-tiers)
2. [Bảng Danh Mục Quà Tặng Chi Tiết (1 – 999+ Xu)](#2-bảng-danh-mục-quà-tặng-chi-tiết-1--999-xu)
3. [Cơ Chế Tính Sát Thương & Tác Động Gameplay](#3-cơ-chế-tính-sát-thương--tác-động-gameplay)
4. [Hệ Thống Hiệu Ứng Trực Quan 2D (DOM & UI Overlays)](#4-hệ-thống-hiệu-ứng-trực-quan-2d-dom--ui-overlays)
5. [Hệ Thống Đồ Họa 3D & Vật Lý (Three.js Canvas VFX)](#5-hệ-thống-đồ-họa-3d--vật-lý-threejs-canvas-vfx)
6. [Hệ Thống Âm Thanh Đa Tầng (Layered SFX Engine)](#6-hệ-thống-âm-thanh-đa-tầng-layered-sfx-engine)
7. [Các Mốc Bẩm Sinh Đặc Biệt (Innate Milestones)](#7-các-mốc-bẩm-sinh-đặc-biệt-innate-milestones)
8. [Cơ Chế Cấu Hình Quản Trị Viên (Admin Custom Rules)](#8-cơ-chế-cấu-hình-quản-trị-viên-admin-custom-rules)
9. [Hệ Thống Đòn Đánh Kết Liễu (Gift Finisher Strike)](#9-hệ-thống-đòn-đánh-kết-liễu-gift-finisher-strike)
10. [Tương Tác Dual Caster (Bình Luận Viên Bảo & Anna)](#10-tương-tác-dual-caster-bình-luận-viên-bảo--anna)
11. [Gợi Ý Định Hướng Đợt Đại Update (Feature Backlog)](#11-gợi-ý-định-hướng-đợt-đại-update-feature-backlog)

---

## 1. KIẾN TRÚC & PHÂN CẤP BẬC QUÀ (GIFT TIERS)

Quy định mã nguồn: [giftTier.ts](file:///d:/web-game1/client/src/store/giftTier.ts) & [giftPresentation.ts](file:///d:/web-game1/client/src/constants/giftPresentation.ts).

Hệ thống phân cấp dựa trên giá trị xu của **quà đơn lẻ** hoặc **tổng xu cộng dồn của combo (Streak)**. Khi người xem spam quà nhỏ đạt ngưỡng xu của bậc cao hơn (ví dụ gửi 10 hoa hồng 100 xu), hệ thống tự động leo thang (Escalate) hiệu ứng lên bậc cao hơn.

| Bậc (Tier) | Ngưỡng Xu | Tên Component UI | Thời Gian Banner | Khựng Boss (Stagger) | Rung Màn Hình | Flash Màn Hình |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **`SMALL`** | **1 – 9 xu** | *(Không hiện banner)* | 0 ms | 0 ms | 0 | Không |
| **`MEDIUM`** | **10 – 98 xu** | `MediumGiftPill.tsx` | **4.500 ms** | 0 ms | 0.65 | Có (Màu phe) |
| **`BIG`** | **99 – 999 xu** | `BigGiftBanner.tsx` | **7.000 ms** | **2.500 ms** | 1.80 | Có (Màu phe) |
| **`MEGA`** | **1.000+ xu** | `MegaGiftHeroCard.tsx` | **10.000 – 18.000 ms** | **2.500 ms** | 2.80 | Có (Màu phe) |

### 👑 3 Phân Hạng Bậc Cao Của `MEGA` (1.000+ xu):
- **`ROYAL` (1.000 – 2.499 xu)**:
  - 1 Vương miện trên đỉnh huy hiệu.
  - 28 hạt pháo giấy confetti.
  - 4 quả pháo hoa 3D tầm cao.
  - Cột sáng thiên đường scale 1.0x.
  - Danh hiệu xướng tên: `ĐẠI GIA {{team}}`.
- **`MYTHIC` (2.500 – 4.999 xu)**:
  - 2 Vương miện đối xứng.
  - 40 hạt pháo giấy confetti.
  - 6 quả pháo hoa 3D tầm cao.
  - Thêm +6 thiên thạch thưởng (tổng 30 quả).
  - Cột sáng thiên đường scale 1.2x.
  - Vầng hào quang kép 2 chiều xoay ngược nhau (`animate-gift-rays-reverse`).
  - Danh hiệu xướng tên: `SIÊU ĐẠI GIA {{team}}`.
- **`LEGEND` (5.000+ xu)**:
  - 3 Vương miện vàng rực rỡ.
  - 56 hạt pháo giấy confetti.
  - 9 quả pháo hoa 3D tầm cao liên hoàn.
  - Thêm +12 thiên thạch thưởng (tổng 36 quả).
  - Cột sáng thiên đường scale 1.4x.
  - Thời gian thẻ hiển thị tối đa 18 giây (`MAX_BANNER_DURATION_MS`).
  - Danh hiệu xướng tên: `HUYỀN THOẠI {{team}}`.

---

## 2. BẢNG DANH MỤC QUÀ TẶNG CHI TIẾT (1 – 999+ XU)

Dưới đây là bảng thống kê toàn bộ các món quà tích hợp sẵn trong hệ thống (Client presets + Simulator catalog):

| Tên Quà Tặng | Biểu Tượng | Giá Trị Xu | Bậc (Tier) | Sát Thương Cơ Bản | Tỷ Lệ ST/Xu | Tác Động Gameplay Kèm Theo |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Hoa Hồng** | 🌹 | **1** | `SMALL` | 120 DMG | 120/xu | Cứ mỗi streak x3 gọi 1 Tướng Tinh Anh. |
| **Trái Tim** | 💖 | **1** | `SMALL` | 120 DMG | 120/xu | Tích lũy tim khán phòng, cộng +3 Nộ pro. |
| **Cà Phê** | ☕ | **1** | `SMALL` | 120 DMG | 120/xu | Tăng nhẹ tốc độ hồi thể lực cho lính. |
| **Pháo Giấy Mini** | 🎉 | **1** | `SMALL` | 120 DMG | 120/xu | Bắn chùm hoa giấy nhỏ tại sàn đấu. |
| **Bánh Quy** | 🍪 | **10** | `MEDIUM` | 1.300 DMG | 130/xu | Triệu hồi ngay 1 Tướng Tinh Anh mang avatar. |
| **Donut Ngọt Ngào** | 🍩 | **30** | `MEDIUM` | 4.800 DMG | 160/xu | Triệu hồi Tướng Tinh Anh, 5 thiên thạch. |
| **Kính Mát** *(Độc Quyền)* | 🕶️ | **30** | `MEDIUM` | **4.800 DMG** | **160/xu** | **Kích hoạt `BATTLE_FRENZY`** (Xem mục 7). |
| **Corgi Lắc Mông** | 🐕 | **30** | `MEDIUM` | 4.800 DMG | 160/xu | Hoạt ảnh lính thú cưng, hồi 60 máu cả đội. |
| **Súng Nước** | 🔫 | **50** | `MEDIUM` | 9.000 DMG | 180/xu | 5 Thiên thạch dội bom, chớp sáng màu phe. |
| **Vương Miện** *(Độc Quyền)* | 👑 | **99** | `BIG` | **22.000 DMG** | **222/xu** | **Kích hoạt `AEGIS_BARRIER`** (Xem mục 7). |
| **Mũ Bảo Hiểm** | ⛑️ | **99** | `BIG` | 22.000 DMG | 222/xu | Khựng Boss 2.5s, 12 thiên thạch, 2 pháo hoa. |
| **Súng Nước Siêu Cấp** | 🔫 | **99** | `BIG` | 22.000 DMG | 222/xu | Đạn nước dội bom, ngắt niệm phép Boss. |
| **Trái Tim CKTG** | 💖 | **199** | `BIG` | 50.000 DMG | 251/xu | Nạp đầy Nộ tuyển thủ Pro, banner 7 giây. |
| **Nước Hoa VIP** | 🍾 | **200** | `BIG` | 50.250 DMG | 251/xu | Hiệu ứng khói tỏa, 18 hạt pháo giấy. |
| **Xe Bay Hoàng Gia** | 🚗 | **500** | `BIG` | 126.000 DMG | 252/xu | 12 Thiên thạch, 2 pháo hoa nổ đôi. |
| **Thiên Nga Pha Lê** | 🦢 | **699** | `BIG` | 176.000 DMG | 252/xu | Đóng băng nhịp chiêu Boss, viền xoay 360°. |
| **Sư Tử Hùng Vĩ** | 🦁 | **1.000** | `MEGA` | 260.000 DMG | 260/xu | 24 Thiên thạch, 4 Pháo hoa 3D, Cột sáng. |
| **Rồng Thần CKTG** | 🐉 | **1.000** | `MEGA` | 260.000 DMG | 260/xu | Tiếng rồng gầm, chấn động màn hình 2.8. |
| **Lâu Đài Hoàng Kim** | 🏰 | **2.500** | `MEGA` | 700.000 DMG | 280/xu | 30 Thiên thạch, 6 Pháo hoa 3D, Hào quang kép. |
| **Phượng Hoàng Lửa** | 🔥 | **2.500** | `MEGA` | 700.000 DMG | 280/xu | Bão lửa bao trùm, danh hiệu Siêu Đại Gia. |
| **Tàu Vũ Trụ Tối Thượng** | 🚀 | **5.000** | `MEGA` | 1.400.000 DMG | 280/xu | 36 Thiên thạch, 9 Pháo hoa 3D, Thẻ 18s. |

---

## 3. CƠ CHẾ TÍNH SÁT THƯƠNG & TÁC ĐỘNG GAMEPLAY

Quy định mã nguồn: [game.ts](file:///d:/web-game1/client/src/constants/game.ts#L705-L742) & [giftExplosion.ts](file:///d:/web-game1/client/src/store/giftExplosion.ts).

### A. Công Thức Nội Suy Tuyến Tính (Linear Interpolation)
Sát thương không tăng theo tỷ lệ cố định 1:120 mà tăng trưởng lũy tiến (tặng quà xu càng cao, tỷ lệ chuyển đổi DMG/xu càng lớn để tri ân người tặng):
```typescript
const table = GIFT_COIN_DAMAGE_TABLE;
// Nếu giá trị xu rơi vào giữa 2 mốc (ví dụ: c1 < coins < c2):
const progress = (coins - c1) / (c2 - c1);
const damage = Math.round(d1 + progress * (d2 - d1));
```

### B. Giới Hạn Sát Thương Trần (Cap Ratio)
- `GIFT_BOSS_HP_CAP_RATIO`: Đòn đánh từ quà tặng bị giới hạn tối đa theo % Máu Boss hiện tại để không gây ra tình trạng "One-shot" làm hỏng kịch bản lật kèo của ván đấu.

### C. Triệu Hồi Tướng Tinh Anh (`summonEliteChampion`)
- **Quà nhỏ (1 – 9 xu)**: Cứ mỗi **3 lần combo liên tiếp** (`streak % 3 === 0`), 1 Tướng Tinh Anh đại diện sẽ xuất trận.
- **Quà từ 10 xu trở lên**: Xuất hiện ngay ở **tick đầu tiên** (`streak === 1`) hoặc mỗi 5 streak. Tướng mang Avatar và vương miện của người tặng bay thẳng vào giao tranh.

### D. Tích Nộ Tuyển Thủ Pro (`resolveGiftFuryGain`)
- Tích lũy **+3 Nộ / 1 xu**.
- Trần nạp nộ cơ bản là `+30 Nộ` (đối với quà thông thường). Với các mốc hoặc Rule đặc biệt (`FULL_FURY`), nộ được nạp đầy `100%`.

---

## 4. HỆ THỐNG HIỆU ỨNG TRỰC QUAN 2D (DOM & UI OVERLAYS)

Quy định mã nguồn: thư mục [client/src/components/ui/gift/](file:///d:/web-game1/client/src/components/ui/gift/).

### 1. `MediumGiftPill.tsx` (10 – 98 xu):
- **Cấu trúc**: Viên thuốc bo góc tròn (`rounded-full`), nền kính tối mờ `bg-slate-950/92 backdrop-blur-md`.
- **Viền sáng thở**: Hiệu ứng `animate-gift-glow-pulse` tỏa ánh sáng màu đặc trưng của phe nhận quà (Xanh BLG / Vàng Cam HLE).
- **Vệt quét kim loại**: `animate-gift-shimmer` chạy ngang thẻ.
- **Pháo sao nổ 6 tia**: `GiftSparkleBurst` bắn 6 ngôi sao ra bán kính X: 120px, Y: 30px.

### 2. `BigGiftBanner.tsx` (99 – 999 xu):
- **Cấu trúc**: Banner cắm mạnh từ trên xuống `animate-gift-slam-in`.
- **Viền ma trận xoay Conic**: Vòng viền chuyển màu liên tục 360° kết hợp giữa màu phe, vàng kim và trắng sáng.
- **Mưa pháo giấy 2D**: 18 hạt confetti (`GiftConfetti`) chao lượn rơi tự do.
- **Vòng nổ sao 12 tia**: Tỏa rộng bán kính X: 185px, Y: 52px.
- **Logo đội tuyển & Avatar**: Logo đại diện phe nổi bật cạnh avatar người gửi.

### 3. `MegaGiftHeroCard.tsx` (1.000+ xu):
- **Cấu trúc**: Thẻ anh hùng chiếm vị trí trung tâm màn hình, thiết kế phân tầng hoàng gia.
- **Vầng hào quang tia sáng mặt trời**: `animate-gift-rays` xoay vô tận đằng sau thẻ. Ở phân hạng Mythic/Legend, bổ sung thêm tầng tia sáng thứ hai xoay ngược chiều `animate-gift-rays-reverse`.
- **Sóng xung kích vòng đôi**: Hai vòng năng lượng nổ lan tỏa trễ nhau 0.8 giây.
- **Vương miện động**: 1 đến 3 vương miện nhấp nhô độc lập `CROWN_BOB_STAGGER_S`.
- **Mưa pháo giấy dày đặc**: Từ 28 đến 56 mảnh pháo giấy rơi ngập tràn màn hình.

---

## 5. HỆ THỐNG ĐỒ HỌA 3D & VẬT LÝ (THREE.JS CANVAS VFX)

Quy định mã nguồn: thư mục [client/src/components/canvas/gift/](file:///d:/web-game1/client/src/components/canvas/gift/).

### 1. Mưa Thiên Thạch Đấu Trường (`MeteorShower3D.tsx`)
- Tọa độ sinh: Vòng tròn bán kính 3.5m – 5.5m trên không trung (`START_HEIGHT_MIN = 10m`).
- Tốc độ rơi: `FALL_DURATION_S = 0.65s`, rơi so le cách nhau `90ms`.
- Đích rơi: Tọa độ đầu Boss, khi va chạm tạo vệt khói và chớp sáng nổ văng hạt.
- Số lượng:
  - `SMALL`: 1 quả.
  - `MEDIUM`: 5 quả (Mốc Kính Mát 30 xu: 8 quả).
  - `BIG`: 12 quả.
  - `MEGA`: 24 – 36 quả dội bom liên hoàn.

### 2. Pháo Hoa Tầng Cao 3D (`GiftFireworks.tsx`)
- Chỉ xuất hiện từ bậc `BIG` trở lên.
- Mỗi quả pháo hoa nở bung **36 tia lửa 3D**, rơi rủ dần theo trọng lực (`DROOP = 0.55`).
- `BIG`: 2 quả nổ cách nhau 380ms.
- `MEGA`: 4 quả (Royal), 6 quả (Mythic), 9 quả (Legend).

### 3. Cột Sáng Thiên Đường 3D (`GiftSkyBeam.tsx`)
- Độc quyền cho bậc `MEGA`: Trụ ánh sáng khổng lồ xuyên thủng bầu trời đấu trường.
- Dưới chân cột sáng có 2 vòng ma trận cổ đại xoay tròn với độ giãn nở từ 1.0x đến 1.4x theo số xu.

### 4. Đài Phun Lửa Cánh Sân Khấu (`GiftSparkler.tsx`)
- Đặt tại cánh sân khấu của đội tuyển nhận quà:
  - `MEDIUM`: 40 tia lửa bắn cao.
  - `BIG`: 80 tia lửa, tốc độ nhanh hơn x1.2.
  - `MEGA`: 120 tia lửa cực đại, tốc độ bắn cao x1.45.

### 5. Rung Chấn & Khựng Boss (Camera Shake & Stagger)
- `MEDIUM`: Rung camera 0.65 + Flash màu phe.
- `BIG`: Rung camera 1.80 + Flash + **Boss Stagger 2.5 giây** (Boss bị ngắt chiêu đang niệm, lùi nhẹ về sau).
- `MEGA`: Rung chấn 2.80 + Flash + **Boss Stagger 2.5 giây** (Bị đẩy lùi mạnh mẽ).

---

## 6. HỆ THỐNG ÂM THANH ĐA TẦNG (LAYERED SFX ENGINE)

Quy định mã nguồn: [giftPresentation.ts - GIFT_SOUND_LAYERS](file:///d:/web-game1/client/src/constants/giftPresentation.ts#L132-L149).

Âm thanh được thiết kế xếp lớp (Layered), bậc càng cao âm thanh càng dày và hùng tráng, không đơn thuần chỉ là tăng âm lượng:

```
[SMALL]  ---> SCORE_UP (Pitch tăng dần từ 1.0x -> 1.45x theo chuỗi combo)
                 |
[MEDIUM] ---> GIFT_MEDIUM (0ms) + SCORE_UP (140ms)
                 |
[BIG]    ---> BIG_DONATE (0ms) + GIFT_MEDIUM (160ms) + COMBO_LEVEL_UP (380ms) + 2x FIREWORK_BURST
                 |
[MEGA]   ---> GIFT_MEGA (0ms) + BIG_DONATE (0ms) + GIFT_MEDIUM (220ms) + COMBO_LEVEL_UP (620ms) + 4-9x FIREWORK_BURST
```

- **Slot-Machine Pitch**: Quà nhỏ khi tặng dồn dập (Streak) sẽ tự động kích hoạt thuật toán tăng cao độ âm thanh mỗi nhịp (+0.03/streak), tạo cảm giác phấn khích tột độ như trúng thưởng máy xèng jackpot.
- **Tiếng pháo nổ theo nhịp 3D**: Mỗi vụ nổ pháo hoa trên màn hình Three.js đều kích hoạt đồng bộ 1 tiếng nổ `playFireworkBurst()` tương ứng.

---

## 7. CÁC MỐC BẨM SINH ĐẶC BIỆT (INNATE MILESTONES)

Hệ thống có **2 mốc quà bẩm sinh** có hiệu ứng can thiệp sâu vào cục diện trận đấu mà không cần Admin phải cài đặt:

### 🕶️ Mốc 30 Xu: Kính Mát (Battle Frenzy)
- **Tên hiệu ứng**: `BATTLE_FRENZY` (Cuồng Nộ Chiến Trường).
- **Thời lượng**: **6.0 giây**.
- **Chỉ số kích hoạt**:
  - Tăng **+40% tốc độ đánh** cho toàn bộ tướng và lính của đội.
  - Bơm ngay **+60 Nộ** cho các tuyển thủ Pro.
  - Hồi ngay **+60 HP** cho toàn đội.
  - Kích hoạt đợt mưa thiên thạch tăng cường: **8 quả** thay vì 5 quả.
- **Thông báo**: Hiện thông báo nổi bật trên log combat và khung chat.

### 👑 Mốc 99 Xu: Vương Miện (Aegis Barrier)
- **Tên hiệu ứng**: `AEGIS_BARRIER` (Lá Chắn Aegis & Khống Chế Boss).
- **Chỉ số kích hoạt**:
  - **Hồi phục 100% Máu** cho toàn bộ tướng trên sàn đấu.
  - **Khống chế làm choáng Boss 2.5 giây**.
  - Kích hoạt dàn pháo hoa đôi và âm hưởng kèn lệnh chiến thắng.

---

## 8. CƠ CHẾ CẤU HÌNH QUẢN TRỊ VIÊN (ADMIN CUSTOM RULES)

Quy định mã nguồn: [giftConfig.ts](file:///d:/web-game1/client/src/constants/giftConfig.ts) & [giftRuleEffects.ts](file:///d:/web-game1/client/src/store/giftRuleEffects.ts).

Admin có toàn quyền gán bất kỳ món quà nào trên live TikTok với 7 năng lực đặc biệt:

| Hiệu Ứng (Effect Key) | Tên Tiếng Việt | Mô Tả Tác Động Gameplay |
| :--- | :--- | :--- |
| **`NONE`** | Mặc định | Chạy hiệu ứng chuẩn theo số xu của TikTok. |
| **`SUMMON_CHAMPION`** | Triệu Hồi Tướng | Triệu hồi đích danh 1 vị tướng chỉ định (ví dụ: tặng 1 bông hoa gọi ngay Yasuo/Aatrox). |
| **`HEAL_TEAM`** | Hồi Máu Toàn Đội | Hồi phục 100 HP cho toàn bộ đội hình phe tặng quà. |
| **`STUN_BOSS`** | Làm Choáng Boss | **Đóng băng Boss hoàn toàn trong 6.0 giây** (Khóa chặt không cho niệm phép/đập sàn). |
| **`FULL_FURY`** | Nạp Đầy Nộ | **Nạp ngay 100% thanh Nộ cho cả 5 tuyển thủ Pro** (Đồng loạt xả Ultimate). |
| **`BATTLE_FRENZY`** | Cuồng Nộ Chiến Trường | Tăng +40% tốc đánh, nạp 60 nộ và hồi 60 máu trong 6 giây. |
| **`AEGIS_BARRIER`** | Lá Chắn Thần | Hồi đầy máu cả đội kết hợp làm choáng Boss 2.5 giây. |

- **Hệ số sát thương tùy chỉnh (`damageMultiplier`)**: Cho phép nhân hệ số từ **`0.0x` đến `5.0x`** sát thương gốc.

---

## 9. HỆ THỐNG ĐÒN ĐÁNH KẾT LIỄU (GIFT FINISHER STRIKE)

Quy định mã nguồn: [FinisherAnnouncementBanner.tsx](file:///d:/web-game1/client/src/components/ui/FinisherAnnouncementBanner.tsx).

Khi một món quà tung đòn sát thương khiến Máu Boss tụt về đúng **0 HP**, hệ thống kích hoạt **Chuỗi Điện Ảnh Finisher kéo dài 11.5 giây**:

```
[0.0s] Hit-stop tức thì: Boss đông cứng, âm thanh combat thường bị tắt hoàn toàn.
  │
[0.0s - 4.8s] AVATAR STRIKE:
  Avatar của người tặng phóng lớn, hóa thành đầu đạn thiên thạch lửa lao xuyên tâm Boss.
  │
[4.8s] TÁC ĐỘNG VỠ TUNG:
  Camera rung chấn cực đại 2.5, bùng nổ 3 vòng sóng xung kích tỏa ra toàn sàn đấu.
  │
[5.6s] CARD REVEAL:
  Hiện thẻ hoàng kim FinisherAnnouncementBanner vinh danh tên người kết liễu và món quà.
  │
[11.5s] KẾT THÚC:
  Chuyển cảnh mượt mà sang Màn hình Chiến Thắng chung cuộc (Victory Screen).
```

- **Quyền ưu tiên Caster**: Cắt bỏ toàn bộ các câu thoại râu ria khác để hô vang: *"Đòn kết liễu quyết định thuộc về [Tên Người Tặng] với món quà [Tên Quà]!"*.

---

## 10. TƯƠNG TÁC DUAL CASTER (BÌNH LUẬN VIÊN BẢO & ANNA)

Quy định mã nguồn: [casterDirector.ts](file:///d:/web-game1/client/src/services/caster/casterDirector.ts) & [caster.ts](file:///d:/web-game1/client/src/constants/caster.ts).

- **Hai hình tượng BLV đối trọng**:
  - **Bảo (Nam - Lead/Play-by-play)**: Giọng trầm ấm, nhiệt huyết, tốc độ đọc 1.20x, phụ trách hô tên quà, đếm combo, thông báo sát thương khổng lồ.
  - **Anna (Nữ - Co-caster/Analyst)**: Giọng hóm hỉnh, phân tích chiến thuật, cảm ơn người tặng lần 2, cà khịa phong độ của đội đối thủ.
- **Kênh Donate độc lập**: Luồng bình luận quà tặng có kênh riêng, không bị xếp hàng chờ sau các câu thoại combat thông thường.
- **Cơ chế gọi tên 2 lần**: Với quà từ bậc `BIG` trở lên, Bảo xướng tên mở màn -> Anna tiếp lời cảm ơn và khen ngợi sự hào phóng của người tặng.

---

## 11. GỢI Ý ĐỊNH HƯỚNG ĐỢT ĐẠI UPDATE (FEATURE BACKLOG)

Dành cho phiên bản kế tiếp:
1. **Thêm Skin Thiên Thạch Theo Từng Quà**: Thay vì thiên thạch tròn mặc định, có thể cho rơi Mưa Hoa Hồng (với quà Hoa Hồng), hoặc Mưa Búa Sấm Sét (với quà Vũ khí).
2. **Hiệu Ứng Hologram 3D Tướng Bay Lên**: Khi tặng quà `SUMMON_CHAMPION`, hiện mô hình 3D của tướng triệu hồi phóng to lơ lửng giữa sân khấu trước khi lao vào combat.
3. **Thanh Đua Top Donate (Gift Battle Bar)**: Hiển thị 2 cột năng lượng quà tặng trực tiếp giữa 2 đội ở góc trên màn hình để kích thích khán giả donate chạy đua.
4. **Hiệu Ứng Âm Nhạc Thay Đổi Theo Quà Mega**: Khi có quà Mega (Sư tử / Rồng / Tàu vũ trụ), đổi nhạc nền sàn đấu sang đoạn điệp khúc Epic hào hùng trong 15 giây.
