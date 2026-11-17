# Hai bình luận viên tung hứng (Duo caster)

Ngày: 2026-11-17 · Trạng thái: **đã duyệt, đang triển khai** · Phạm vi: client (caster, phụ đề, i18n), server (TTS warm, cấu hình), admin (công tắc), `.env`

Mục tiêu: thay giọng độc thoại "BLV Bão" bằng **một cặp BLV đối đáp** ở những khoảnh khắc đáng giá (mở ván, boss đổi pha, lật kèo, quà lớn, kết ván) và **trò chuyện với nhau** khi sân vắng, để buổi live có nhịp "trận đấu đang diễn ra" và có tính cách.

---

## Hiện trạng (đã kiểm tra code)

| Lớp | Có sẵn | Thiếu |
|---|---|---|
| Giọng | `CasterLine.role` (`male`/`female`) → `speechEngine` → `/api/caster/tts?role=` → Edge `DUAL_VOICES` NamMinh / HoaiMy; bộ đệm server phân biệt theo vai | `getSignalCasterRole` luôn trả `MALE`; `.env` có `CASTER_TTS_FORCE_MALE=true` |
| Hàng đợi | Một kênh chính (tuần tự, ưu tiên P1–P5, TTL), một kênh quà song song; prefetch theo ưu tiên | Không có "lượt đối đáp" (nhóm câu phải phát liền nhau, cùng TTL, bị ngắt thì bỏ cả nhóm, nạp sẵn **mọi** clip trước khi bắt đầu) |
| Câu thoại | 56 tín hiệu, 266 biến thể VI, EN đủ cặp (`Caster.lines.<SIGNAL>[]`) | Chưa có cấu trúc hội thoại nhiều lượt, nhiều người nói |
| Phụ đề | Một ô, nhãn cố định "BLV Bão", ô quà riêng | Tên và màu theo người nói; hiện lượt trước mờ để người xem bắt được câu đáp |
| Làm ấm giọng | `caster:warm` nạp sẵn câu dự đoán được | Payload **không có `role`** → chỉ nạp giọng nam |
| Admin | Công tắc TTS, đọc tên | Công tắc "Hai BLV" |

Ràng buộc: Edge VI chỉ có NamMinh + HoaiMy → cặp **nam + nữ**. Google chỉ một giọng/ngôn ngữ → nếu rơi về Google, hai BLV cùng giọng, chỉ khác nhãn.

---

## Thiết kế

### 1. Hai nhân vật (quyết định D1, D2)
- **BLV A** (nam, NamMinh): *play-by-play* — hô hào, đếm, gọi tên người triệu hồi, hét khi có quà. Giữ toàn bộ câu đơn hiện có.
- **BLV B** (nữ, HoaiMy): *color / phân tích + chọc ghẹo* — bình tĩnh, giải thích cơ chế ("phá khiên trong 12 giây"), đặt câu hỏi cho A, trêu A khi A hét to, nói hộ người xem.
- Tính cách khác nhau là thứ tạo "tung hứng": A phấn khích thì B hạ nhiệt hoặc cà khịa; B gài câu thì A chốt.
- Cường độ mặc định: A `HYPE` khi máu boss thấp, B thấp hơn một bậc (`NORMAL`/`HYPE`) để hai giọng tương phản.

### 2. Dữ liệu hội thoại (i18n)
```jsonc
"Caster": {
  "casters": { "A": { "name": "Bão" }, "B": { "name": "<D2>" } },
  "dialogues": {
    "BOSS_ENRAGE": [                       // mỗi tín hiệu: danh sách lượt đối đáp
      [ { "speaker": "A", "text": "{{boss}} NỔI ĐIÊN RỒI!" },
        { "speaker": "B", "text": "Bình tĩnh anh Bão. {{boss}} đánh nhanh gấp rưỡi, anh em dồn tim hồi máu nhé!" } ],
      [ ... ]
    ]
  }
}
```
- Mỗi lượt đối đáp 2–3 câu, mỗi câu ≤ 180 ký tự (giới hạn TTS). Có đủ `vi` và `en`.
- Chọn biến thể tránh lặp như `composeCasterLine` (dùng chung `pickVariantIndex`).
- `Caster.lines.*` giữ nguyên làm câu đơn (B không có → A nói).

### 3. Ở đâu dùng đối đáp, ở đâu giữ câu đơn (quyết định D3)
| Nhóm | Cách dùng |
|---|---|
| Mở ván (`SERIES_OPENING`, `ROUND_INTRO_*`, `ROUND_GO`) | A chào + B phân tích ngôi sao; "Xung trận!" A → B đệm một câu ngắn. Giữ cơ chế deadline của thẻ mở đầu. |
| Boss đổi pha / nổi điện / khiên / máu thấp | A báo động → B hướng dẫn người xem (CTA có cơ chế thật). |
| Thế trận (`COMEBACK`, `TIGHT_RACE`, `DOMINANT_LEAD`, `COMEBACK_BUFF`) | A → B (B bênh đội thua, A hùa đội dẫn → tạo "phe BLV" cho người xem). |
| Quà lớn / cực lớn (`GIFT_BIG`, `GIFT_MEGA`) | Kênh quà: A hét tên quà → B cảm ơn kèm câu đùa (cùng kênh quà, giữ thứ tự). |
| Sân bị quét sạch (`WIPE`) | A → boss gáy → **B** kêu gọi lại (thay A ở câu cuối). |
| Kết ván / kết loạt (`ROUND_WIN`, `MVP`, `PODIUM_THANKS`, `SERIES_WIN`) | A công bố → B thêm màu → A cảm ơn (3 lượt). |
| Banter khi sân vắng / yên ắng | **Toàn bộ là hội thoại hai người** (nơi tính cách rõ nhất): B hỏi A dự đoán, A hỏi B "theo em ai thắng", cả hai gọi người xem. |
| Triệu hồi (`SUMMON*`, P4), kỹ năng thường, follow/share | **Giữ câu đơn của A** (quá dày, hội thoại sẽ nghẽn hàng đợi). |

Chống nhàm: tỉ lệ dùng hội thoại cho một khoảnh khắc đủ điều kiện `DIALOGUE_SHARE` (D3), thời gian chờ giữa hai hội thoại, và **nếu hàng đợi đang tồn > N câu thì chỉ nói lượt đầu** (A) để không chậm nhịp trận.

### 4. Hàng đợi: lượt đối đáp là một đơn vị
- `CasterLine` thêm `exchangeId` + `turnIndex`; `castCasterDialogue(signal, slots, meta)` đẩy cả nhóm với cùng `priority`, `createdAt`, `ttlMs`.
- `pumpMain` khi gặp lượt đầu của một nhóm: **`prepare()` mọi clip của nhóm trước**; clip nào không sẵn sàng kịp (`CLIP_WAIT_MS`) → nhóm rút về **chỉ lượt đầu** (không để lỗ trống giữa hai câu, vì khoảng lặng giết nhịp hài).
- Giữa hai lượt dùng `TURN_GAP_MS` (~180 ms) thay vì `LINE_GAP_MS`; không cho câu khác chen giữa.
- Bị ngắt bởi P1 (quà cực lớn, kết ván): **bỏ các lượt còn lại** của nhóm (không để B trả lời một câu đã qua 10 giây).
- Kênh quà: nhóm đối đáp xử lý giống hệt, trong kênh của nó.
- Cường độ/vai lấy theo người nói (`speaker → role`), bỏ `getSignalCasterRole` cố định.

### 5. Phụ đề
- `CasterSubtitle` thêm `speaker` (A/B) → nhãn tên + màu riêng (A xanh ngọc, B hổ phách nhạt; không dùng tím).
- Khi đang ở lượt ≥ 2 của một nhóm, **hiện lượt trước mờ phía trên** để câu đáp có ngữ cảnh.
- Ô quà giữ kiểu riêng, nhưng nhãn là tên người nói.

### 6. Làm ấm giọng & server
- `CasterWarmPayload` thêm `role`; `warmPredictableLines` nạp câu của cả A và B (các lượt dự đoán được: mở ván, boss đổi pha, khiên).
- Server `caster:warm` đã đọc `role` → chỉ cần client gửi.
- `.env`: `CASTER_TTS_FORCE_MALE=false` (kèm sửa `.env.example` ghi rõ công tắc này tắt chế độ hai BLV).
- `CasterConfig` (server + admin + client) thêm `isDuoEnabled` (mặc định bật). Tắt → mọi hội thoại rút về lượt đầu của A, giọng nam; không cần đổi `.env`.

### 7. Chế độ suy giảm
| Tình huống | Hành vi |
|---|---|
| Server rơi về Google (một giọng) | Vẫn đối đáp, hai BLV cùng giọng, nhãn khác → chấp nhận được, ghi log cảnh báo một lần |
| Clip của B không kịp | Chỉ A nói (lượt đầu) |
| TTS tắt hoặc tạm ngưng | Phụ đề hiển thị lần lượt các lượt với tên người nói |
| Hàng đợi tồn đọng | Rút hội thoại về một câu |

---

## Các bước
1. **Hạ tầng hội thoại** (`constants/caster.ts`: `CASTER_SPEAKER`, `CASTER_DIALOGUE` rules; `casterComposer.ts`: `composeCasterDialogue`; `casterSignal.ts`: `castCasterDialogue`; `presentationQueue.ts`: nhóm, prepare-all, turn gap, bỏ phần còn lại khi ngắt).
2. **Phụ đề** (`casterStore.ts` thêm `speaker`, `previousTurn`; `CasterSubtitle.tsx`).
3. **Nội dung**: viết hội thoại VI (ưu tiên) + EN cho các nhóm ở mục 3; nhân vật và giọng điệu thống nhất. Ước lượng ~25 tín hiệu × 3–4 biến thể × 2–3 lượt.
4. **Gắn vào director**: thay `castCasterSignal` bằng `castCasterDialogue` ở các điểm mục 3; banter chọn hội thoại khi bật duo.
5. **Warm + server + admin + `.env`**.
6. **Kiểm chứng**: script thuần cho `composeCasterDialogue` (không lặp, slot đầy đủ, ≤ 180 ký tự mỗi lượt, có đủ `vi`/`en`) và cho logic rút gọn nhóm; `tsc`/build ba gói; chạy thử bằng mô phỏng: nghe một ván đầy đủ, kiểm tra không có khoảng lặng giữa hai lượt, ngắt bằng quà lớn đúng lúc B đang nói.

## Quyết định (đã chốt 2026-11-17)
- **D1.** A = play-by-play (nam, NamMinh), B = phân tích / chọc ghẹo (nữ, HoaiMy).
- **D2.** BLV B tên **Sấm** → cặp "Bão & Sấm".
- **D3.** Mật độ **vừa**: khoảnh khắc lớn + banter sân vắng, `DIALOGUE_SHARE` 0,5, có cooldown; triệu hồi / kỹ năng thường giữ một giọng.
- **D4.** Kênh quà: **A hét → B cảm ơn kèm đùa**, hai lượt liền nhau trên kênh quà.

## Rủi ro
- Hai giọng + hội thoại làm tổng thời lượng nói tăng → nhịp trận chậm; chống bằng tỉ lệ dùng, cooldown và rút gọn khi tồn đọng.
- Chất lượng câu đùa tiếng Việt quyết định tất cả; cần bạn nghe thử và sửa từ ngữ cho hợp giọng kênh.
- `.env` là cấu hình máy bạn; thay đổi `FORCE_MALE` cần khởi động lại server.
