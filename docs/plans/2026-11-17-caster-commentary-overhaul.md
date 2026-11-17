# Kế Hoạch Triển Khai: Nâng Cấp Hệ Thống Caster ("BLV Bão" 2.0) - Đậm Chất Esports, Hype Liên Tục

> **Mục tiêu**: Xóa bỏ hoàn toàn cảm giác rời rạc, ít nói và đơn điệu của Bình luận viên AI. Biến Caster thành một "Shoutcaster Esports" máu lửa, tốc độ cao (nhịp 1.5s), phản ứng tức thì theo từng mili-giây diễn biến trận đấu (tướng tủ, rượt đuổi tỉ số, bão quà, boss hấp hối).

---

## 🎯 4 Trọng Tâm Cải Tiến

| Hạng mục | Hiện trạng | Sau khi nâng cấp (BLV 2.0) |
|---|---|---|
| **Khoảng lặng (Silence Gap)** | 4.5s – 6.5s (quá thưa, cảm giác im ắng) | **1.2s – 1.8s** (nói dồn dập, giữ nhịp liên tục như giải CKTG) |
| **Tốc độ đọc (Cadence)** | 1.38x | **1.45x** (nhanh, dứt khoát, hào hứng) |
| **Chất lượng câu thoại** | Lịch sự kiểu chatbot ("Cảm ơn bạn", "Tôi là giọng AI") | **Hype, gáy bẩn, cà khịa, giật gân** phong cách BLV LMHT Việt Nam |
| **Độ nhạy tình huống** | Chỉ đọc sự kiện tĩnh | **Phản ứng động**: Tranh chấp $\le 5\%$, đội bị đè bẹp, tướng tủ siêu sao |

---

## 📋 Chi Tiết Các Bước Triển Khai

### Phase 1: Tối Ưu Nhịp Độ & Giảm Khoảng Lặng (Pacing & Cadence Tuning)
- **File**: `client/src/constants/caster.ts`
- **Nhiệm vụ**:
  1. `ACTIVE_SILENCE_MS`: Giảm từ `4_500` xuống `1_600` ms.
  2. `IDLE_SILENCE_MIN_MS` & `MAX_MS`: Giảm từ `3_500 - 6_500` xuống `1_800 - 3_000` ms.
  3. `EMPTY_FIELD_SILENCE_MS`: Giảm từ `2_500` xuống `1_400` ms (kêu gọi người vào cứu đội khẩn thiết).
  4. `MIN_P4_GAP_MS` (khoảng cách giữa các lượt gọi tên): Giảm từ `700` xuống `350` ms.
  5. `NORMAL_RATE`: Nâng từ `1.38` lên `1.45` để giọng đọc có năng lượng và tốc độ cao.
  6. Điều chỉnh `CASTER_PRIORITY_TTL_MS` để không bị drop các câu phân tích tình hình khi phòng có nhiều tương tác nhỏ.

### Phase 2: Bổ Sung Tín Hiệu & Tình Huống Đột Phá (Situational Engine)
- **Files**: `client/src/constants/caster.ts`, `client/src/services/caster/casterDirector.ts`, `client/src/services/caster/casterBattleMoments.ts`
- **Nhiệm vụ**:
  1. **Tín hiệu `TIGHT_RACE`**: Phát hiện khi chênh lệch sát thương 2 đội $< 5\%$ -> BLV hét lên về cuộc rượt đuổi nghẹt thở.
  2. **Tín hiệu `DOMINANT_LEAD`**: Khi một đội bỏ xa $> 25\%$ -> Cà khịa đội đang thua, thúc giục fan tràn vào cứu trận.
  3. **Tín hiệu `PRO_SIGNATURE_DEPLOY`**: Khi tướng tủ của tuyển thủ được triệu hồi (Azir cho Faker, Yone cho Chovy, Jax cho Bin, v.v.) -> BLV hô vang tên siêu sao.
  4. **Tín hiệu `BOSS_CRITICAL_TENSION`**: Khi Boss $\le 10\%$ máu -> BLV đếm ngược và hô hoán thời khắc cướp mục tiêu.

### Phase 3: Đại Tu Kho Câu Thoại Esports Tiếng Việt ("Cháy & Chân Thực")
- **Files**: `client/src/i18n/messages/vi.json`, `client/src/i18n/messages/en.json`
- **Nhiệm vụ**:
  1. **Xóa bỏ các câu phá vỡ cảm xúc**: Loại bỏ hoàn toàn các câu robot như *"Tôi là BLV Bão, giọng AI dẫn trận..."*.
  2. **Viết mới 60+ câu thoại Esports đỉnh cao**:
     - *GIFT / DONATE*: Hô vang tên đại gia (*"Ối giời ơi đại gia [Tên] thả [Quà] gánh còng cả lưng!", "Cả khán phòng đứng dậy chào [Tên]!"*).
     - *TIGHT RACE*: *"Hai bên đang rượt đuổi từng giọt máu một! Cực kỳ căng thẳng!", "Đổi ngôi đầu bảng rồi! Không ai chịu nhường ai!"*.
     - *SUMMON*: Tướng xuất hiện đi kèm khí thế (*"[Tên] mang [Tướng] vào sân! Đố ai cản được!", "[Tướng] của [Tên] đang quẩy tung nóc!"*).
     - *COMEBACK*: *"LẬT KÈO RỒI! Bảng sát thương đảo chiều trong sự ngỡ ngàng của tất cả mọi người!"*.
     - *BOSS SKILL*: *"Coi chừng cú quét đuôi! Né ra ngay anh em ơi!"*.
     - *CLIMAX*: *"Máu Boss chấm dứt rồi! Ai sẽ là người hùng cướp được ván này?!"*.

### Phase 4: Kiểm Thử & Tối Ưu Hóa (Verification)
- **Nhiệm vụ**:
  1. Build kiểm tra toàn bộ monorepo: `pnpm run build:all`.
  2. Đảm bảo 0 lỗi TypeScript, 0 biến unused.
  3. Kiểm tra TTS audio prefetch và cache không bị tràn ram khi nhịp đọc tăng cao.

---

## ⏱️ Ước tính thực hiện: ~10 - 15 phút. Sẵn sàng bắt đầu ngay!
