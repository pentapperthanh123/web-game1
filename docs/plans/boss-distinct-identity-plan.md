# Kế Hoạch Nâng Cấp Bản Sắc & Kỹ Năng Độc Quyền Cho 6 Boss

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1 Vấn đề hiện tại
- **Trùng lặp hình ảnh (Visual Clone)**:
  - 3 Boss Rồng (*Rồng Núi Nham Thạch*, *Rồng Già Bão Tố*, *Rồng Ngàn Tuổi*) dùng chung file ảnh `boss_elder_dragon_2d.webp` và icon `elder_dragon_icon_135001.webp`.
  - 3 Boss Hư Không (*Sứ Giả Khe Nứt*, *Baron Nashor*, *Thần Hư Vô Nguyên Thủy*) dùng chung icon và sprite của Baron `boss_baron_2d.png`.
- **Trùng lặp kỹ năng (Combat Identity Mismatch)**:
  - Bộ kỹ năng hiện tại tuy đã có tên gọi khác nhau nhưng chưa khai thác triệt để 8 cơ chế VFX (`CHARGE_DASH`, `GROUND_SPIKES`, `LIGHTNING_STRIKE`, `BEAM`, `PROJECTILE_ARC`, `VORTEX`, `METEOR_RAIN`, `CRESCENT_SWEEP`) và các trạng thái chiến đấu (`BURN`, `STUN`, `CORROSION`, `LIFESTEAL`).
  - Chưa mang lại cảm giác khác biệt về nhịp độ trận đấu qua từng ván BO5.

### 1.2 Mục tiêu cốt lõi
1. **Phân hóa 100% Thị giác (Visuals & Icons)**:
   - Cung cấp 6 hình ảnh 2D sprite độc quyền chất lượng cao và đồng bộ icon hiển thị trên cả `client` và `admin`.
2. **Khác biệt hóa Bộ Kỹ Năng (Combat Mechanics)**:
   - Mỗi Boss sở hữu 1 phong cách tấn công đặc thù, tác động trực tiếp lên nhóm linh thú 2 phe và tiến độ trận đua DPS theo đúng cơ chế game.
3. **Đồng bộ hóa 2 chiều Client & Admin**:
   - `admin/src/App.tsx` (Menu chọn map & theme) và `admin/src/components/BossSkillControls.tsx` phản ánh chính xác sprite, icon và thông số kỹ năng từng Boss.

---

## 2. Ma Trận Phân Định 6 Boss & Kỹ Năng Đặc Trưng

| Boss | Sprite 2D & Icon | Vai Trò & Tính Cách Chiến Đấu | Bộ 4 Chiêu Thức Đặc Trưng | Trạng Thái Trực Quan |
| :--- | :--- | :--- | :--- | :--- |
| **1. Sứ Giả Khe Nứt** *(Ván 1 • Khởi đầu)* | `boss_rift_herald_2d.webp` (Cua Hư Không giáp cứng) | **Cận chiến & Húc càn**: Chuyên càn quét hàng lính phía trước, hất văng linh thú. | 1. `herald_void_cleave` (Quét càng)<br>2. `herald_charge` (Húc càn lướt sàn)<br>3. `herald_eye_gaze` (Tia mắt Hư Không)<br>4. `herald_seismic_slam` (Dộng đất chấn động) | • `CHARGE_DASH`<br>• `STUN` (Choáng nhẹ lính cận chiến) |
| **2. Rồng Núi Nham Thạch** *(Ván 2 • Trâu bò)* | `boss_mountain_dragon_2d.webp` (Rồng đá đỏ nứt dung nham) | **Phòng thủ & Đốt DoT**: Nham thạch đốt máu theo thời gian, trồi cọc đá nhọn. | 1. `mountain_magma_spit` (Bắn nham thạch)<br>2. `mountain_rock_slide` (Mưa đá tảng)<br>3. `mountain_tectonic_roar` (Cọc đá địa chấn)<br>4. `mountain_volcanic_eruption` (Núi lửa phun trào) | • `GROUND_SPIKES`<br>• `BURN` (Đốt DoT liên tục)<br>• Tự bọc giáp đá |
| **3. Rồng Già Bão Tố** *(Ván 3 • Tốc độ)* | `boss_storm_dragon_2d.webp` (Lôi Long tím điện quang) | **Sấm chớp liên hoàn & Khống chế**: Nhịp độ chiêu rất nhanh, giật sét lan truyền làm tê liệt. | 1. `storm_lightning_spark` (Tia chớp tức thời)<br>2. `storm_wind_vortex` (Lốc xoáy bão)<br>3. `storm_thunder_barrage` (Mưa sấm sét)<br>4. `storm_tempest_wrath` (Cuồng nộ thiên lôi) | • `LIGHTNING_STRIKE`<br>• `STUN` (Tê liệt ngừng đánh 2s)<br>• Tần suất ra chiêu nhanh |
| **4. Rồng Ngàn Tuổi** *(Kinh điển CKTG)* | `boss_elder_dragon_2d.webp` (Rồng thần hoàng kim CKTG) | **Sát thương diện rộng cực lớn**: Bắn tia laser cổ đại thiêu rụi linh thú máu mỏng. | 1. `elder_dragon_breath` (Cầu lửa cổ đại)<br>2. `elder_wing_buffet` (Gió quét cánh rồng)<br>3. `elder_meteor_rain` (Mưa thiên thạch lửa vàng)<br>4. `elder_cataclysmic_burn` (Tia hủy diệt càn quét) | • `BEAM`<br>• `METEOR_RAIN`<br>• Sát thương trực diện rất cao |
| **5. Baron Nashor** *(Tiêu chuẩn CKTG)* | `boss_baron_2d.webp` (Thủy quái sâu Hư Không xúc tu) | **Axit ăn mòn & Suy nhược**: Độc axit làm giảm 40% sát thương của tướng đánh vào Boss. | 1. `baron_acid_spit` (Phun bãi axit độc)<br>2. `baron_void_spikes` (Gai gai hư không)<br>3. `baron_tail_sweep` (Đuôi quất ngang)<br>4. `baron_void_cataclysm` (Đại hồng thủy axit) | • `PROJECTILE_ARC`<br>• `CORROSION` (Giảm DPS của tướng)<br>• `POISON` |
| **6. Thần Hư Vô Nguyên Thủy** *(Ván 5 • Quyết đấu)* | `boss_void_titan_2d.webp` (Thực thể Cosmic Void đa mắt) | **Hố đen vũ trụ & Hút máu**: Hút linh thú vào tâm rồi nén nổ, hồi máu cho Boss. | 1. `void_annihilation_beam` (Tia phân rã hư vô)<br>2. `void_singularity_crush` (Lỗ đen xoáy hút lính)<br>3. `void_rift_collapse` (Vết rách không gian)<br>4. `void_apocalypse_oblivion` (Khải huyền tận thế) | • `VORTEX` (Hút lính vào tâm)<br>• `LIFESTEAL` (Hồi máu làm Boss lì đòn) |

---

## 3. Các Bước Triển Khai Chi Tiết (Implementation Phases)

### Giai đoạn 1: Tạo & Đồng Bộ Tài Nguyên Đồ Họa 2D (Visual Asset Creation)
- [x] **Bước 1.1**: Tạo 3 file sprite 2D độc bản với nền trong suốt (PNG/WEBP):
  - `boss_mountain_dragon_2d.webp` (Rồng Núi đá đỏ magma).
  - `boss_storm_dragon_2d.webp` (Rồng Sấm Sét tím lôi quang).
  - `boss_void_titan_2d.webp` (Thực thể Hư Không vũ trụ đa mắt).
- [x] **Bước 1.2**: Copy đồng bộ sang cả 2 thư mục:
  - `client/public/images/`
  - `admin/public/images/`
- [x] **Bước 1.3**: Cập nhật `THEME_CONFIG` trong `client/src/constants/game.ts` để trỏ đúng đường dẫn ảnh cho từng Theme.
- [x] **Bước 1.4**: Cập nhật `THEME_OPTIONS` trong `admin/src/App.tsx` thay thế toàn bộ icon bị trùng lặp bằng icon chuẩn của từng Boss.

### Giai đoạn 2: Tinh Chỉnh & Đặc Trưng Hóa Bộ Kỹ Năng (Combat Tuning)
- [x] **Bước 2.1**: Cập nhật file `client/src/constants/bossSkillEffects.ts` và `admin/src/constants/bossSkillEffects.ts`:
  - Gán chuẩn xác các cặp `vfxType` và `statusEffect` theo đúng phong cách chiến đấu của từng Boss ở bảng trên.
  - Sứ Giả dùng `CHARGE_DASH` + `STUN`.
  - Rồng Núi dùng `GROUND_SPIKES` + `BURN`.
  - Rồng Già dùng `LIGHTNING_STRIKE` + `STUN`.
  - Rồng Ngàn Tuổi dùng `BEAM` + `METEOR_RAIN`.
  - Baron dùng `PROJECTILE_ARC` + `CORROSION`.
  - Thần Hư Vô dùng `VORTEX` + `LIFESTEAL`.
- [x] **Bước 2.2**: Cập nhật mô tả kỹ năng tiếng Việt trong `bossSkills.ts` để admin và người xem dễ dàng nhận biết tính chất đòn đánh.

### Giai đoạn 3: Tối Ưu Hóa Hiển Thị Admin & Quản Lý Kỹ Năng
- [x] **Bước 3.1**: Kiểm tra component `admin/src/components/BossSkillControls.tsx`:
  - Đảm bảo khi admin chọn Boss nào thì hiển thị đúng icon, tên gọi và 4 kỹ năng đặc trưng riêng của Boss đó.
  - Cho phép admin chỉnh sửa sát thương, tần suất hoặc bật/tắt kỹ năng riêng biệt.
- [x] **Bước 3.2**: Thử nghiệm chuyển đổi Theme trên Admin và xác nhận Client cập nhật tức thì qua Socket.io.

### Giai đoạn 4: Kiểm Thử & Nghiệm Thu (Verification)
- [x] **Bước 4.1**: Chạy `npm --prefix client run build` đảm bảo 0 lỗi TypeScript.
- [x] **Bước 4.2**: Chạy `npm --prefix admin run build` đảm bảo 0 lỗi TypeScript.
- [x] **Bước 4.3**: Mở giao diện kiểm tra thực tế:
  - Ván 1: Hiện Sứ Giả Khe Nứt hình con cua, húc càn và quét càng.
  - Ván 2: Hiện Rồng Núi hình đá đỏ, phun nham thạch trồi gai đất.
  - Ván 3: Hiện Rồng Sấm Sét tím, phóng sét giật choáng.
  - Ván 4: Hiện Rồng Ngàn Tuổi vàng, bắn tia hủy diệt.
  - Ván 5: Hiện Thần Hư Vô thực thể không gian, tạo lỗ đen hút lính.

---

## 4. Kế Hoạch Quản Trị Rủi Ro (Risk Management)

| Rủi ro tiềm ẩn | Biện pháp phòng ngừa |
| :--- | :--- |
| **Sprite 2D tải chậm hoặc lỗi hiển thị** | Cung cấp sẵn ảnh `.png` dự phòng song song với `.webp`, thêm fallback onerror trong `Boss2D.tsx`. |
| **Kỹ năng hút lính (VORTEX) gây lệch vị trí vật lý** | Sử dụng vị trí ảo trên registry vị trí minion, không làm gãy logic tính sát thương của lính. |
| **Không đồng bộ giữa Admin và Client** | Giữ chung format `GameThemeType` và dùng enum đồng nhất qua socket events `game:boss-cast-skill` và `game:change-theme`. |

