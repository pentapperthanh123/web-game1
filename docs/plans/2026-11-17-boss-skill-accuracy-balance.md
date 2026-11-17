# Boss skills: vùng trúng chính xác & cân bằng sát thương

Ngày: 2026-11-17 · Trạng thái: **đã triển khai (chưa chạy thử trên trình duyệt)** · Phạm vi: client (gameplay + VFX), admin (bảng chiêu, UI)

## Bối cảnh

Rà soát 24 chiêu của 6 boss cho thấy hai nhóm vấn đề:
- **Sai lệch giữa hình ảnh, mô tả và sát thương thật**: chiêu quét đánh cả nửa sân dù mô tả ghi "2–5 tướng"; Tia Phân Rã trừ máu ở những tướng mà tia không chạm tới; "gần boss nhất" bỏ qua chiều sâu.
- **Cân bằng**: thiêu đốt/độc không đi qua hệ số nào nên mạnh hơn cả đòn đánh; số mục tiêu không tính theo quy mô đám đông; boss gần như không đe dọa được tướng; Thần Hư Vô bị nhân độ khó hai lần.

Công thức hiện tại: `base × admin(0.25) × difficulty × rage(1.5) × phase(1.2 ở P3)`, tướng có 100 máu.

## Mục tiêu thiết kế (đề xuất; quyết định D1)

| Loại chiêu | % máu tướng mất (bình thường → P3 nổi điên) | Số tướng trúng |
|---|---|---|
| Chiêu 1 | 10–15% → 20–25% | ít, nhắm vào |
| Chiêu 2 | 15–25% → 30–40% | nhóm nhỏ |
| Chiêu 3 | 25–35% → 45–60% | nhóm vừa |
| Tuyệt kỹ | 35–50% → 70–90% (hạ được tướng đã bị thương) | toàn sân |

Thiêu đốt/độc = một **phần trăm của đòn đánh**, rải đều trong thời gian hiệu ứng, không còn là số cố định.

## Các bước

### Giai đoạn A: Độ chính xác (rủi ro thấp)

**A1. Chiêu quét chỉ trúng `targetCount` tướng gần nhất trong tầm** (mục 2)
- `bossSkillResolver.ts` → `AREA_PICKERS[SIDE_REACH]`: lọc trong tầm → sắp theo khoảng cách → `slice(0, targetCount)`.
- Số mục tiêu lấy theo B3 (đám đông) khi giai đoạn B xong.

**A2. Tia Phân Rã nhắm đúng mục tiêu** (mục 3)
- `BOSS_SKILL_VFX_HIT_AREA[BEAM]` → `SIDE_NEAREST` (khớp mô tả "tướng tiền tuyến").
- `Beam3D.tsx`: hướng tia về tâm các `impactPoints` thay vì hướng cố định theo cánh; nếu không có mục tiêu thì giữ hướng cũ.

**A3. Khoảng cách thật tới boss** (mục 4)
- `byDistanceFromBoss`: `Math.hypot(x - bossX, z - bossZ)` với `COMBAT_VFX_CONSTANTS.BOSS_TARGET`, thay cho `|x|`.

**A4. Mô tả chiêu không ghi cứng số máu** (mục 8)
- Bỏ "(-65 HP)" khỏi `description` (client + admin).
- Thêm helper `resolveSkillDamagePreview(skill, theme, config, phase, isEnraged)` dùng chung; admin hiển thị số thực theo cấu hình đang chọn.

### Giai đoạn B: Cân bằng

**B1. Sát thương theo thời gian tỉ lệ với đòn đánh** (mục 1)
- `bossSkillEffects.ts`: thay `tickDamage` cố định bằng `dotRatio` (LIGHT 40%, MEDIUM 60%, HEAVY 80% của sát thương đòn đánh, tổng trong suốt thời gian hiệu ứng).
- `buildChampionStatusEffect(effect, skillId, phase, now, hitDamage)`: `tickDamage = max(1, round(hitDamage × dotRatio / số tick))`.
- Phase 3 vẫn kéo dài thời gian ×1,5 nhưng **giữ nguyên tổng sát thương** (chia đều cho nhiều tick hơn), để không nhân đôi phần thưởng của phase.

**B2. Chuẩn hóa sát thương gốc & hệ số admin** (mục 7)
- Sát thương gốc theo vị trí chiêu, giống nhau cho mọi boss: 25 / 45 / 70 / tuyệt kỹ 100. Độ khó theme là nơi **duy nhất** tạo khác biệt giữa các boss (bỏ việc Thần Hư Vô vừa có số gốc cao vừa có ×1,2).
- Hệ số admin mặc định `0.25 → 0.45` để đạt bảng mục tiêu (con số chốt theo D1).
- Tách `resolveSkillDamageScale(state, phase)` dùng chung cho đòn đánh, thiêu đốt/độc và bảng xem trước ở admin.

**B3. Số mục tiêu theo quy mô đám đông** (mục 6)
- `targetCount` thành `max(targetCount, ceil(số tướng trong vùng × crowdShare))`, với `crowdShare` theo vị trí chiêu (đề xuất 5% / 12% / 25%; tuyệt kỹ: tất cả). Chiêu quét dùng tỉ lệ của vị trí chiêu đó.
- **Trần hút máu**: mỗi lần hồi tối đa `LIFESTEAL_MAX_BOSS_HP_RATIO` máu boss (đề xuất 3%).

### Giai đoạn C: Cảm giác tuyệt kỹ

**C1. Tuyệt kỹ nhiều lớp gây sát thương theo từng đợt** (mục 5, quyết định D3)
- Chia sát thương tuyệt kỹ cho lớp chính + các lớp có `delayMs`, theo trọng số (đề xuất lớp chính 40%, phần còn lại chia đều).
- Mỗi đợt áp vào cùng nhóm mục tiêu đã chọn lúc ra chiêu, tại thời điểm lớp đó chạm tới (`delayMs + impact delay của lớp`); tướng đã gục ở đợt trước thì bỏ qua.
- Hiệu ứng trạng thái áp ở đợt đầu; hút máu tính theo từng đợt (vẫn chịu trần B3).
- **Hiệu năng**: với 300 tướng, mỗi đợt chỉ hiện số sát thương cho tối đa `MAX_HIT_NUMBERS_PER_WAVE` tướng (đề xuất 40); các tướng khác chỉ nháy token. Không tạo mảng `minions` mới cho mỗi tướng: một lần `set` cho mỗi đợt.

## Tệp bị ảnh hưởng

| Tệp | Thay đổi |
|---|---|
| `client/src/store/bossSkillResolver.ts` | A1, A3, B1 (debuff), B3 (số mục tiêu) |
| `client/src/constants/bossSkillVfx.ts` | A2 (vùng trúng của BEAM), hằng số mới |
| `client/src/components/canvas/bossSkill/Beam3D.tsx` | A2 |
| `client/src/constants/bossSkills.ts` + `admin/src/constants/bossSkills.ts` | A4, B2 (giữ hai bản đồng bộ) |
| `client/src/constants/bossSkillEffects.ts` | B1 (`dotRatio`) |
| `client/src/store/slices/bossSlice.ts` | B2 (helper hệ số), C1 (lên lịch các đợt) |
| `client/src/store/bossSkillImpact.ts` | B3 (trần hút máu), C1 (áp một đợt) |
| `client/src/types/bossSkill.ts` (+ admin) | `dotRatio`, `crowdShare` |
| `admin/src/components/BossSkillControls.tsx` | A4 (hiển thị số thực) |

## Kiểm chứng

Dự án không có bộ test, nên:
1. Mỗi giai đoạn: `npx tsc --noEmit -p .` (client, admin), `npx vite build` (client).
2. **Bảng cân bằng in ra được**: helper thuần `buildSkillBalanceTable()` trả về sát thương thực / thiêu đốt-độc / số mục tiêu (với 10, 50, 200 tướng) cho mọi boss × phase; hiển thị trong admin để chỉnh và đối chiếu với bảng mục tiêu.
3. Chạy thử: chế độ khách triệu hồi 50–200 tướng, dùng nút ra chiêu trong admin cho từng chiêu, xem số trên đúng tướng bị hình chạm, đếm số tướng trúng, quan sát FPS khi ra tuyệt kỹ.

## Quyết định (đã chốt 2026-11-17)

- **D1. Mức nguy hiểm: Vừa.** Dùng bảng mục tiêu ở trên; hệ số admin mặc định khoảng 0,45 (tinh chỉnh theo bảng cân bằng ở bước kiểm chứng).
- **D2. Quy mô đám đông: 5% / 12% / 25%**, trần hút máu 3% máu boss mỗi lần.
- **D3. Tuyệt kỹ nhiều đợt: Có.** Lớp chính 40%, phần còn lại chia đều cho các lớp sau; tối đa 40 số sát thương mỗi đợt.

## Rủi ro

- Tăng hệ số mặc định làm tướng chết nhiều hơn → nhiều lượt triệu hồi lại hơn: tốt cho tương tác nhưng cần theo dõi hàng đợi và FPS.
- Hai bản sao bảng chiêu (client/admin) có thể lệch nhau → sửa cùng một commit; về lâu dài nên dùng chung một nguồn.
- Config đã lưu trong localStorage (`lol_boss_skill_config_v1`) giữ hệ số 0.25 cũ → cần bump key hoặc migrate để hệ số mới có hiệu lực.

## Kết quả triển khai (2026-11-17)

Đã làm A1–A4, B1–B3, C1. Kiểm tra: `tsc --noEmit` và `vite build` (client, admin), `tsc --noEmit` (server) đều đạt; script kiểm tra logic thuần (biên dịch các hàm thuần ra thư mục tạm) đạt 26/26: bậc và sát thương gốc, DOT giữ tổng ở phase 3, số tướng trúng theo đám đông (10/50/200), tia nhắm tướng tiền tuyến, khoảng cách thật, chia đợt tuyệt kỹ.

Sát thương thực tế lên tướng 100 máu (thường → GĐ3 + nổi điên), hệ số 0,45:

| Boss | Chiêu 1 | Chiêu 2 | Chiêu 3 | Tuyệt kỹ |
|---|---|---|---|---|
| Xú Già (×0,75) | 8 → 15 | 15 → 27 | 24 → 43 | 34 → 61 |
| Rồng Núi (×0,9) | 10 → 18 (+thiêu 4 → 7) | 18 → 33 | 28 → 51 | 41 → 73 (+thiêu 33 → 58) |
| Rồng Già (×1,0) | 11 → 20 | 20 → 36 | 32 → 57 | 45 → 81 |
| Rồng Ngàn Tuổi (×1,0) | 11 → 20 (+thiêu 4 → 8) | 20 → 36 | 32 → 57 (+thiêu 19 → 34) | 45 → 81 (+thiêu 36 → 65) |
| Baron (×1,0) | 11 → 20 (+độc 4 → 8) | 20 → 36 | 32 → 57 | 45 → 81 (+độc 27 → 49) |
| Thần Hư Vô (×1,2) | 14 → 24 | 24 → 44 | 38 → 68 | 54 → 97 |

Số tướng trúng với 10 / 50 / 200 tướng: chiêu 1 = 1 / 2 / 5, chiêu 2 = 3 / 6 / 24, chiêu 3 = 5 / 7 / 25, tuyệt kỹ = tất cả.

### Việc còn lại / cần theo dõi
- **Chưa chạy thử trực quan**: cần xem tia Phân Rã quét qua đúng tướng, số sát thương từng đợt của tuyệt kỹ, và FPS khi 200–300 tướng.
- **Tuyệt kỹ có thiêu đốt/độc (Rồng Núi, Rồng Ngàn Tuổi, Baron)**: đòn đánh + DOT ở GĐ3 nổi điên vượt 100 máu (Rồng Ngàn Tuổi 81 + 65), tức hạ được cả tướng đầy máu, cao hơn mục tiêu 70–90% của riêng đòn đánh. Nếu thấy quá tay, giảm `BOSS_SKILL_DOT_RATIO.HEAVY` (0,8) xuống khoảng 0,5 ở hai bản `bossSkillBalance.ts`.
- Cấu hình cũ lưu trong localStorage: hệ số đúng bằng 0,25 (mặc định cũ) được tự nâng lên 0,45; giá trị người dùng chọn khác 0,25 được giữ nguyên.
- Hai bản sao logic cân bằng (client `constants/bossSkillBalance.ts`, admin `constants/bossSkillBalance.ts`) phải sửa cùng lúc.
