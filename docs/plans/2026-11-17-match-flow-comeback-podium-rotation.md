# Luồng trận liền mạch, lật kèo, bục vinh danh, quay vòng cặp đấu

Ngày: 2026-11-17 · Trạng thái: **đã duyệt, chưa triển khai** · Phạm vi: client (gameplay, UI), admin (cấu hình), server (lọc dữ liệu hồ sơ)

Bốn việc ưu tiên cao từ đợt rà soát gameplay: bỏ chỗ phòng "đứng hình" chờ host, cho đội thua cơ hội lật kèo, sửa bục vinh danh và bảng xếp hạng bị bot chen vào, và không lặp mãi một cặp đấu.

---

## #1. Tự bắt đầu loạt trận mới

### Hiện trạng (đã kiểm tra code)
- **Giữa các ván trong cùng loạt trận đã tự chạy**: `startNextRound` gọi `playRoundIntroCinematic` ngay (thay đổi gần đây, không cần host bấm).
- **Vẫn chờ host bấm "Bắt đầu"** (`showRoundIntro(..., true)`, thẻ "CHỜ BẮT ĐẦU" không giới hạn thời gian) ở ba chỗ:
  1. `resetBO5Match` ([seriesSlice.ts](../../client/src/store/slices/seriesSlice.ts)): loạt mới cùng cặp sau khi hết loạt.
  2. `applyTeamConfigSnapshot` khi đổi cặp đấu ([teamConfigSlice.ts](../../client/src/store/slices/teamConfigSlice.ts)): gồm cả lúc chuyển sang cặp tiếp theo trong hàng đợi.
  3. Lần mở overlay đầu tiên (ván 1, tỉ số 0-0) trong [RoundIntroOverlay.tsx](../../client/src/components/ui/roundIntro/RoundIntroOverlay.tsx).
- Sau khi một loạt kết thúc, màn chiến thắng tự chuyển sau 10 giây, rồi **phòng dừng ở thẻ chờ cho tới khi host bấm**.

### Thay đổi
- Thêm khái niệm **lý do giữ** cho thẻ chờ: `ROUND_HOLD_REASON = { STREAM_OPENING, NEW_SERIES, ADMIN_RESET }`.
  - `STREAM_OPENING` (lần mở overlay đầu tiên) và `ADMIN_RESET` (admin chủ động đặt lại): **giữ như cũ**, host bấm mới chạy.
  - `NEW_SERIES` (loạt mới tự động sau màn chiến thắng, cùng cặp hoặc cặp mới): **tự bắt đầu sau đếm ngược** (quyết định D1).
- `roundIntroStore`: thêm `autoStartAt` (0 = không tự chạy). Thẻ chờ hiện đếm ngược "Tự bắt đầu sau 15s"; host vẫn bấm được để bắt đầu sớm, hoặc bấm **Giữ lại** để hủy đếm ngược.
- Một bộ hẹn giờ duy nhất (trong overlay, có dọn dẹp khi unmount) gọi `requestRoundStart()` khi tới `autoStartAt`.
- Luồng từ màn chiến thắng (`VictoryActionControls` → `resetBO5Match` / `advanceNextMatchQueue`) truyền lý do `NEW_SERIES`; các nút admin "đặt lại" truyền `ADMIN_RESET`.
- Admin: tùy chọn **Tự bắt đầu loạt mới** (Tắt / 10 / 15 / 30 giây) trong khu điều khiển trận; đi qua `participationRuleConfig` như các cài đặt luồng trận khác (client, admin, server cùng tên trường `seriesAutoStartMs`).

### Tệp
`roundIntroStore.ts`, `RoundIntroOverlay.tsx` (đếm ngược + nút Giữ lại), `seriesSlice.ts`, `teamConfigSlice.ts`, `VictoryOverlay.tsx`, `types/game.ts` + admin `SummonQueueRulesControls` (hoặc khu điều khiển trận) + server `registerAdminHandlers`, `serverState`, i18n `vi`/`en`.

---

## #2. Cơ chế lật kèo cho đội thua

### Hiện trạng
- Chỉ có: xếp người mới sang đội thấp điểm, caster hô "lật kèo" khi đổi người dẫn (`CASTER_SIGNAL.COMEBACK`).
- Buff đội đã có chỗ gắn sẵn: `scaleBossDamage` → `TEAM_BUFFED_SOURCES` (tướng, tuyển thủ, hội quân, chọc điểm yếu), đang nhân buff nhiệm vụ và buff Silver Scrapes.

### Thay đổi (dạng cụ thể theo quyết định D2)
- **Đội bị dẫn xa nhận buff "LẬT KÈO"**:
  - Bật khi điểm đội thua **< 70%** điểm đội dẫn **và** tổng sát thương ván ≥ 5.000 (tránh nhảy buff đầu ván).
  - Tắt khi điểm đội thua **> 85%** điểm đội dẫn (vùng đệm, không bật/tắt liên tục).
  - Hiệu lực: **+15% sát thương** cho các nguồn trong `TEAM_BUFFED_SOURCES`. **Không áp cho quà, tim, share**: giữ giá trị cố định người tặng tin tưởng, và để buff thưởng cho người chơi miễn phí của đội thua.
- Trạng thái buff là **dẫn xuất từ điểm số** (không lưu riêng): hàm thuần `resolveComebackTeam(teamScores, prevComebackTeam)` trong module mới `store/comebackRules.ts`; một bộ đánh dấu nhỏ ngoài game store nhớ đội đang được buff để áp vùng đệm và phát sự kiện bật/tắt.
- **Hiển thị**: huy hiệu "⚡ LẬT KÈO +15%" cạnh tên đội trên `TeamScoreBoard`; caster nói một câu khi buff bật (dùng lại `COMEBACK` hoặc tín hiệu mới `COMEBACK_BUFF`), có thời gian chờ.
- **Hiệp phụ**: buff vẫn áp; cùng với hệ số hiệp phụ cho cả hai đội, đội thua có cơ hội thật ở phút cuối.
- Hằng số trong `COMEBACK_CONSTANTS` (`TRIGGER_RATIO`, `RELEASE_RATIO`, `MIN_TOTAL_DAMAGE`, `DAMAGE_MULTIPLIER`), admin bật/tắt được.

### Tệp
`store/comebackRules.ts` (mới), `bossDamageScaling.ts`, `constants/game.ts`, `TeamScoreBoard.tsx` (huy hiệu), `services/caster/*` (câu thoại), i18n, admin công tắc.

---

## #3. Bục vinh danh và hồ sơ không còn bot, không tách tên

### Hiện trạng (đã kiểm tra)
- Bục vinh danh lấy `store.leaderboard`, cập nhật bằng `updateLeaderboardList` với **tên thô**: một người bị tách thành `An (Ahri)`, `An (Hoa Hồng)`, `An (Thả tim)`.
- Bot **"🛡️ Tiên Phong T1"** (tự triệu hồi khi sân vắng) và **"Hội Quân (T1)"** (đòn tiếp sức của đội) được tính như người chơi.
- `roundDamageTracker` gộp tên đúng nhưng **vẫn tính bot** và gửi lên server: `server/data/player_profiles.json` đang có **8 mục bot** ("Hội Quân"...), nên bot có mặt ở bảng tuần / tháng / mọi thời đại.

### Thay đổi
- Một nơi duy nhất quyết định "đây có phải người xem thật không": `isViewerActor(actorName, source)` trong `roundDamageTracker.ts` (dùng `VANGUARD_ACTOR_LABEL`, nguồn `RALLY`, tên nhiệm vụ cộng đồng). Bảng phiên live (`sessionLeaderboardStore`) cũng dùng lại hàm này thay cho kiểm tra riêng.
- `updateLeaderboardList` dùng **tên đã gộp** (`getCanonicalViewerName`) và bỏ qua actor không phải người xem → bục vinh danh và TOP ván đúng người.
- `recordRoundDamage` bỏ qua bot → server không nhận thêm bot.
- **Server tự vệ**: `playerProfileService.sanitizeRoundResult` loại tên bot (phòng khi có overlay cũ chưa cập nhật).
- **Dọn dữ liệu cũ** (quyết định D3): khi server khởi động, bỏ các hồ sơ có tên bot khỏi `player_profiles.json` (một lần, có log số mục đã xóa).

### Tệp
`roundDamageTracker.ts`, `storeHelpers.ts` (`updateLeaderboardList`), `combatSlice.ts`, `sessionLeaderboardStore.ts`, server `playerProfileService.ts` (+ hằng số tên bot dùng chung phía server).

---

## #4. Quay vòng cặp đấu

### Hiện trạng
- `advanceNextMatchQueue` **lấy cặp đầu ra khỏi hàng đợi**; hết hàng đợi thì `resetBO5Match` lặp lại cặp cũ mãi.
- Hàng đợi đồng bộ qua `admin:set-team-config` và được server lưu xuống đĩa.

### Thay đổi
- Khi chuyển sang cặp tiếp theo, **cặp vừa đấu được đưa xuống cuối hàng đợi** (thay vì biến mất), nên danh sách cặp đấu xoay vòng mãi.
- Khi hàng đợi trống, theo quyết định D4:
  - **Ghép ngẫu nhiên** hai đội trong danh mục, tránh trùng cả hai đội của cặp vừa đấu (nếu danh mục đủ đội), hoặc
  - **Lặp cặp cũ** như hiện tại.
- Logic chọn cặp là hàm thuần `pickNextMatchup(queue, catalog, currentPair, mode)` trong `store/matchRotation.ts` (mới), dễ kiểm tra.
- Màn chiến thắng hiện rõ cặp kế tiếp ("Tiếp theo: GEN vs HLE") cả khi cặp đó do ghép ngẫu nhiên.
- Admin: chọn chế độ khi hết hàng đợi (Ghép ngẫu nhiên / Lặp cặp cũ); hàng đợi cập nhật thấy được ở tab Đội & Game Thủ.
- Khi loạt mới bắt đầu bằng cặp khác, **danh hiệu vô địch** vẫn tính theo cặp như cũ (không đổi).

### Tệp
`store/matchRotation.ts` (mới), `teamConfigSlice.ts` (`advanceNextMatchQueue`), `VictoryOverlay.tsx` + `VictoryActionControls.tsx`, admin cấu hình, server lưu chế độ.

---

## Thứ tự triển khai
1. **#3** (sửa lỗi, rủi ro thấp, cần trước để dữ liệu sạch).
2. **#4** (hàm thuần + chỗ gọi).
3. **#1** (dựa vào luồng chuyển loạt của #4).
4. **#2** (cân bằng, cần chạy thử nhiều nhất).

## Kiểm chứng
- Mỗi bước: `tsc --noEmit` (client, admin, server), `vite build` (client, admin).
- Script kiểm tra hàm thuần (biên dịch ra thư mục tạm như lần trước): `isViewerActor`, gộp tên trong `updateLeaderboardList`, `pickNextMatchup` (quay vòng, tránh trùng, danh mục nhỏ), `resolveComebackTeam` (ngưỡng bật/tắt, vùng đệm, đầu ván).
- Chạy thử: chế độ mô phỏng → hết loạt → kiểm tra đếm ngược tự bắt đầu và nút Giữ lại; tạo chênh lệch điểm → huy hiệu LẬT KÈO bật/tắt đúng ngưỡng; bục vinh danh không còn bot hay tên tách.

## Quyết định (đã chốt 2026-11-17)
- **D1.** Loạt mới tự bắt đầu sau **15 giây** (admin đổi được: Tắt / 10 / 15 / 30). Lần mở overlay đầu tiên và khi admin đặt lại vẫn chờ host bấm.
- **D2.** **Buff thụ động +15%** cho đội bị dẫn xa (bật < 70%, tắt > 85%), không áp cho quà / tim / share.
- **D3.** **Xóa** hồ sơ bot đang có trên server (sao lưu `.bak` trước).
- **D4.** Hết hàng đợi thì **ghép ngẫu nhiên**, tránh trùng đội của cặp vừa đấu (admin đổi được sang "lặp cặp cũ").

## Rủi ro
- Hai overlay cùng mở (ví dụ OBS + trình duyệt thử) có thể cùng đẩy hàng đợi khi quay vòng → chỉ overlay đang chạy loạt trận (đã có cơ chế `senderId`/bỏ yêu cầu trùng của server) mới gửi cập nhật hàng đợi; cần kiểm tra khi chạy thử.
- Buff lật kèo làm điểm số sát nhau hơn → caster "lật kèo" nói nhiều hơn; giữ thời gian chờ hiện có.
- Xóa hồ sơ bot là thay đổi dữ liệu thật → sao lưu `player_profiles.json` trước khi dọn (server tự ghi bản `.bak`).
