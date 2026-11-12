# 🐉 Kế Hoạch Triển Khai: Boss Escalation Theo Từng Ván BO (Option A + Option C)

> **File:** `docs/plans/boss-escalation-plan.md`  
> **Ngày cập nhật:** 2026-11-12  
> **Chiến lược:** Option A (Reuse 2D/3D assets + scale/CSS tint/VFX overlays) + Option C (Procedural difficulty scaling theo round)  
> **Trạng thái:** PLANNING / CONTEXT READY — Chưa sửa code trên disk (`constants/game.ts`, `gameStore.ts` vẫn đang ở trạng thái gốc 2 theme: `BARON`, `ELDER_DRAGON`).

---

## 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ

Khi streamer chạy trận đấu theo thể thức **BO1 / BO3 / BO5**, mỗi ván đấu (`currentRound`) sẽ tự động chuyển sang một con **Boss mạnh hơn về cả ngoại hình lẫn cơ chế**, tạo cao trào leo thang cho viewer TikTok Live:

| Ván (`currentRound`) | BO1 | BO3 | BO5 | HP Multiplier (`MAX_HP = 100,000`) | Ngưỡng Cuồng Nộ (`enrageThreshold`) | Tốc Độ Đánh (`phaseSpeedMultiplier`) | Hệ Thống Visual (2D Sprite + 3D Orbit) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ván 1** | **Baron** | **Xử Giả** 🦎 | **Xử Giả** 🦎 | `0.50x` (**50,000**) | `40%` | `0.80x` (chậm hơn) | Baron 2D thu nhỏ (`scale-50`), tint xanh lục (`hue-rotate`), Aura/Crystal xanh lá |
| **Ván 2** | — | **Rồng Ngàn Tuổi** 🐉 | **Rồng Núi** 🏔️🐉 | `0.70x` (**70,000**) | `38%` | `0.90x` | Elder Dragon 2D tint đỏ nham thạch, Aura/Crystal đỏ cam |
| **Ván 3** | — | **Baron Nashor** 👑 | **Rồng Già** ⚡🐉 | `0.85x` (**85,000**) *(BO3 dùng Elder 1.0x -> Baron 1.0x)* | `32%` | `1.10x` | Elder Dragon 2D size lớn hơn, tint tím huyền bí / vàng kim |
| **Ván 4** | — | — | **Baron Nashor** 👑 | `1.00x` (**100,000**) | `35%` | `1.00x` (chuẩn) | Baron Nashor 2D gốc + Aura tím Hư Không |
| **Ván 5** | — | — | **Thần Hư Vô** 🌌 | `1.30x` (**130,000**) | `30%` *(sớm hơn hoặc giữ áp lực)* / Shield & Void Aura | `1.25x` (nhanh + rát) | Baron 2D phóng đại (`scale-125`), dark-void tint + Void Aura Overlay |

> **Lưu ý về Game 3 BO3 vs Game 3 BO5:**  
> - `BO1`: `['BARON']`  
> - `BO3`: `['XU_GIA', 'ELDER_DRAGON', 'BARON']`  
> - `BO5`: `['XU_GIA', 'RONG_NUI', 'RONG_GIA', 'BARON', 'VOID_TITAN']`

---

## 2. Hiện Trạng Kiến Trúc Codebase (Codebase Reality Check)

Để agent/dev triển khai chính xác mà không đoán mò, dưới đây là kiến trúc thực tế đang chạy trong repo:

### 2.1. Cách Boss Được Render Thực Tế (Rất Quan Trọng)
- **Boss chính được render bằng 2D Sprite DOM + CSS VFX**, KHÔNG phải từ `Boss3D.tsx`:
  - `client/src/components/canvas/GameCanvas.tsx` chỉ mount `Boss3DPresence`, `BossVoidAttack`, `BossDeathVFX3D` (làm vòng halo 3D, 9 viên pha lê bay quanh, khiên forcefield 3D, điểm yếu lock-on, tia sét/axit/gai 3D và hiệu ứng nổ vỡ 3D). Các file `Boss3D.tsx`, `BaronGlbModel.tsx`, `ProceduralVoidBaron.tsx`, `AatroxDarkinBoss.tsx` hiện **không được mount**.
  - Hình dáng Boss, hoạt ảnh hit/attack/idle/poke/enrage, vết nứt phase, mắt phát sáng, bóng thoại nằm tại **`client/src/components/arena/Boss2D.tsx`** và 9 component con trong `client/src/components/arena/`:
    - `BossAlertBanner.tsx`, `BossEnragedAura.tsx`, `BossEnragedEntranceBanner.tsx`, `BossGlowingEyes.tsx`, `BossPhaseVisuals.tsx`, `BossSpeechBubble.tsx`, `BossDeathVFX2D.tsx`, `BossDefeatedCrest2D.tsx`, `ElementalEmbers.tsx`
  - Nền đấu trường 2D nằm tại `client/src/components/arena/ArenaBackground2D.tsx` (đọc `THEME_CONFIGS[gameTheme]`).

### 2.2. Vấn Đề Kỹ Thuật Lớn Nhất Hiện Tại: Binary Check `isElderDragon` & Type `'BARON' | 'ELDER_DRAGON'`
Hiện tại toàn hệ thống giả định chỉ có 2 giá trị `'BARON' | 'ELDER_DRAGON'`:
1. **Hardcode Union Type `'BARON' | 'ELDER_DRAGON'` ở 3 app:**
   - `server/src/index.ts` (dòng 379 `currentGameTheme`, dòng 882 `admin:set-theme`)
   - `admin/src/services/socket.ts` (dòng 268 `setGameTheme`, dòng 272 `onGameTheme`)
   - `admin/src/App.tsx` (dòng 183, 336 `handleSelectTheme`, dòng 1355-1427 UI 2 card bản đồ)
   - `client/src/services/socket.ts` (dòng 317 `sendTheme`)
   - `client/src/services/eventBus.ts` (dòng 19 `SET_GAME_THEME`)
   - `client/src/components/ui/admin/AdminMapSkillsTab.tsx` (dòng 35-105 UI 2 nút BARON / ELDER_DRAGON)
2. **Binary `isElderDragon = gameTheme === GAME_THEME.ELDER_DRAGON` ở hơn 15 file:**
   - `client/src/store/gameStore.ts`: `getStoredGameTheme()` (dòng 169-177), `applyDamage` log/roar/enrage/defeat (dòng 1484-1647), `castBossSkill` (`bossName` dòng 2301-2302, roar dòng 2353), `setEnraged` (dòng 2681-2688).
   - `client/src/constants/bossSkills.ts`: `getBossSkillsByTheme(theme)` (dòng 106-108).
   - `client/src/constants/bossSpeech.ts`: `BOSS_SPEECHES` typed là `Record<GameThemeType, ...>` (dòng 12), bắt buộc phải có đủ key hoặc fallback sạch.
   - `client/src/components/ui/BossHealthBar.tsx`: màu thanh máu, viền, badge cuồng nộ (hiện chỉ check `isElderDragon`), chưa hiển thị tên boss/round.
   - `client/src/components/ui/victory/VictoryHeaderStage.tsx`: dòng 32-36 (`bossDefeatedSubtitle` chỉ phân biệt Elder Dragon / Baron).
   - `client/src/components/ui/HUDOverlay.tsx`: dòng 104 truyền `isElderDragon` xuống `BossEnragedEntranceBanner`.
   - `client/src/components/canvas/Boss3DPresence.tsx`: `resolveCrystalColor` + ring color dòng 32, 59, 148.
   - `client/src/components/canvas/BossVoidAttack.tsx`: dòng 51 `isBaron = gameTheme === GAME_THEME.BARON` (quyết định màu tia sét tím vs vàng/cyan).
   - `client/src/components/canvas/BossDeathVFX3D.tsx`: dòng 114 `isElder`.
   - `client/src/components/arena/Boss2D.tsx` + 9 component con đều nhận prop `isElderDragon: boolean`.

### 2.3. Đường Dẫn i18n Thực Tế
- Files i18n nằm tại:
  - `client/src/i18n/messages/vi.json`
  - `client/src/i18n/messages/en.json`
- *(Không có thư mục `messages/` ở root)*.

### 2.4. Điểm Hook Đang Có Cho Difficulty Scaling & Ván Đấu
- **Enrage Threshold:** `client/src/store/gameStore.ts` dòng 1460-1465 đang so sánh `BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT` (`0.35`).
- **Tốc Độ Đánh Boss:** `client/src/App.tsx` dòng 53-94 (`retaliationInterval` và `runAttackCycle`) tính `baseInterval = (bossSkillConfig.intervalMs || 4000) * speedMultiplier`. Hiện `speedMultiplier` chỉ xét `isEnraged`.
- **Chuyển Ván / Đổi Thể Thức:**
  - `client/src/store/gameStore.ts`: `startNextRound()` (dòng 2437), `resetBO5Match()` (dòng 2484), `setSeriesFormat()` (dòng 2536), `applySeriesFormatSnapshot()` (dòng 2558), `setBO5Score()` (dòng 2589).
  - `server/src/index.ts`: `admin:bo5-control` (dòng 830) & `admin:set-series-format` (dòng 833).
  - `client/src/components/ui/TeamScoreBoard.tsx`: đã hiển thị `VÁN {{round}} / {{format}}` (dòng 73).

---

## 3. Kiến Trúc Đích & Giải Pháp Thiết Kế (Clean Code Design)

Thay vì nhân bản `if/else` hoặc nested ternary cho 6 theme mới, ta thiết kế **Data-Driven Theme Config + Archetype**:

### 3.1. Mở Rộng `GAME_THEME` & `THEME_CONFIGS` (`client/src/constants/game.ts`)
Thêm 4 theme mới vào `GAME_THEME`:
- `XU_GIA: 'XU_GIA'`
- `RONG_NUI: 'RONG_NUI'`
- `RONG_GIA: 'RONG_GIA'`
- `VOID_TITAN: 'VOID_TITAN'`

Mở rộng schema mỗi item trong `THEME_CONFIGS` thêm các thuộc tính giúp **loại bỏ hardcode ở component**:
- `archetype`: `'BARON' | 'DRAGON'` — xác định bộ chuyển động bay/cuộn (`VERTICAL_TIERS_*`, `animate-dragon-shadow` vs `animate-baron-shadow`), hình dáng mắt (`BossGlowingEyes`), skill pool (`BARON_SKILLS` vs `ELDER_DRAGON_SKILLS`), và âm thanh nền (`playBossRoarSound`, `playBossEnrageSound`, `playBossDefeatSound`, `playBossIdleBreath`, `playBossPokeSound`).
- `spriteFilterClass`: class Tailwind filter áp trực tiếp lên `<img>` boss trong `Boss2D.tsx` (VD: `hue-rotate-[110deg] saturate-125` cho Xử Giả xanh lục, `hue-rotate-[-30deg] saturate-150` cho Rồng Núi đỏ lửa, `hue-rotate-[220deg] saturate-150` cho Rồng Già tím huyền bí, `hue-rotate-[15deg] contrast-125 brightness-90 drop-shadow-[0_0_24px_rgba(124,58,237,0.9)]` cho Thần Hư Vô).
- `hasVoidOverlay`: `boolean` (`true` cho `VOID_TITAN`) để bật hiệu ứng Void Aura Overlay trong `Boss2D.tsx`.
- `colors`: `{ primaryHex: string; secondaryHex: string; enragedHex: string; hpBarClass: string; hpBarEnragedClass: string; borderClass: string; badgeClass: string }` — dùng cho `BossHealthBar`, `Boss3DPresence`, `BossVoidAttack`, `BossDeathVFX2D`, `BossDeathVFX3D`, `Boss2D` shockwave/poke burst.
- `i18nKey`: key i18n chuẩn (VD `'BossTheme.xuGia'`) để UI dịch song ngữ VI/EN sạch sẽ qua `useTranslation()`.
- `audioPitchRate`: `number` (VD `1.3` cho `XU_GIA` giọng lanh/nhanh, `0.78` cho `VOID_TITAN` giọng trầm rền vang, `1.0` mặc định).

### 3.2. Cấu Hình Độ Khó & Mapping Theo Round (`client/src/constants/game.ts`)
- `BOSS_DIFFICULTY_SCALE: Record<GameThemeType, BossDifficultyConfig>`:
  - `hpMultiplier` (0.50 -> 1.30)
  - `enrageThreshold` (0.40 -> 0.30)
  - `phaseSpeedMultiplier` (0.80 -> 1.25)
  - `skillDamageMultiplier` (VD: `XU_GIA: 0.75`, `RONG_NUI: 0.90`, `RONG_GIA: 1.00`, `ELDER_DRAGON: 1.00`, `BARON: 1.00`, `VOID_TITAN: 1.20`)
- `SERIES_BOSS_MAP: Record<SeriesFormat, readonly GameThemeType[]>`
- Helper thuần túy:
  - `getBossThemeForRound(round: number, seriesFormat: SeriesFormat): GameThemeType`
  - `getThemeConfig(theme: GameThemeType)` (safe fallback về `THEME_CONFIGS[GAME_THEME.BARON]`)
  - `isDragonArchetype(theme: GameThemeType): boolean`

### 3.3. Đồng Bộ Toàn Hệ Thống (`server` + `admin` + `client`)
- Dùng chung danh sách giá trị theme hợp lệ (`VALID_GAME_THEMES` ở server/client/admin) thay vì hardcode `'BARON' | 'ELDER_DRAGON'`.
- Khi `startNextRound()` hoặc `resetBO5Match()` được gọi:
  1. Tính `nextTheme = getBossThemeForRound(nextRound, state.seriesFormat)`.
  2. Tính `nextMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * BOSS_DIFFICULTY_SCALE[nextTheme].hpMultiplier)`.
  3. Cập nhật `gameTheme: nextTheme`, `bossMaxHp: nextMaxHp`, `bossHp: nextMaxHp`, lưu `localStorage`.
  4. Đồng bộ với Server nếu cần (ví dụ client/admin phát event hoặc server cũng nhận biết theme hợp lệ khi `admin:set-theme` gửi bất kỳ trong 6 theme).
- **Quy tắc Admin Override:** Admin vẫn có thể bấm chọn thủ công bất kỳ Boss nào trong 6 Boss ở tab Map & Skills (`setGameTheme(theme)`), và không bị reset giữa chừng cho đến khi chuyển sang ván kế tiếp (`startNextRound`) hoặc reset trận (`resetBO5Match`).

---

## 4. Phân Kỳ Triển Khai Chi Tiết (Sprint Breakdown)

### 📌 Sprint 1: Foundation — Constants & Store Logic (Ưu tiên làm trước)
1. **`client/src/constants/game.ts`**
   - Mở rộng `GAME_THEME` thêm `XU_GIA`, `RONG_NUI`, `RONG_GIA`, `VOID_TITAN`.
   - Thêm `BossDifficultyConfig`, `BOSS_DIFFICULTY_SCALE`, `SERIES_BOSS_MAP`, `getBossThemeForRound()`, `getThemeConfig()`, `isDragonArchetype()`.
   - Hoàn thiện đủ 6 entry trong `THEME_CONFIGS` (đầy đủ `archetype`, `spriteFilterClass`, `hasVoidOverlay`, `colors`, `bossScale`, `spriteSize`, `audioPitchRate`, `i18nKey`).
2. **`client/src/constants/bossSpeech.ts` & `client/src/constants/bossSkills.ts`**
   - `bossSkills.ts`: Thêm skill set hoặc map `getBossSkillsByTheme(theme)` theo `THEME_CONFIGS[theme].archetype` (và optional custom skill names/colors cho `XU_GIA`, `VOID_TITAN` nếu muốn khác biệt).
   - `bossSpeech.ts`: Cập nhật `BOSS_SPEECHES` để TypeScript `Record<GameThemeType, ...>` hợp lệ (bổ sung thoại đặc trưng cho `XU_GIA`, `RONG_NUI`, `RONG_GIA`, `VOID_TITAN` hoặc dùng `Partial<Record<GameThemeType, ...>>` + fallback theo `archetype`).
3. **`client/src/store/gameStore.ts`**
   - `getStoredGameTheme()`: validate theo `Object.values(GAME_THEME)` bằng `Set` thay vì chỉ check `ELDER_DRAGON`.
   - `startNextRound()` & `resetBO5Match()` (và `setSeriesFormat` khi `resetScore = true`): tự động resolve `nextTheme` + `nextMaxHp` + `bossHp: nextMaxHp`.
   - `applyDamageToBoss`: thay `BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT` bằng `BOSS_DIFFICULTY_SCALE[state.gameTheme].enrageThreshold`, dùng `getThemeConfig(state.gameTheme).bossName` và `isDragonArchetype(state.gameTheme)` cho log/audio/defeat colors.
   - `castBossSkill`: dùng `getThemeConfig(state.gameTheme).bossName`, `isDragonArchetype`, và nhân thêm `difficulty.skillDamageMultiplier`.

### 📌 Sprint 2: Visual 2D, 3D VFX & HUD
1. **`client/src/components/arena/Boss2D.tsx` + subcomponents**
   - Đổi toàn bộ kiểm tra `gameTheme === GAME_THEME.ELDER_DRAGON` sang `isDragonArchetype(gameTheme)` và màu từ `themeConfig.colors`.
   - Áp dụng `themeConfig.spriteFilterClass` lên `<img>` trong `<picture>`.
   - Thêm `<BossVoidAuraOverlay />` render khi `themeConfig.hasVoidOverlay` bật (Ván 5 - `VOID_TITAN`: hào quang hư vô xoáy + hạt năng lượng tối).
2. **`client/src/components/canvas/Boss3DPresence.tsx`, `BossVoidAttack.tsx`, `BossDeathVFX3D.tsx`**
   - `Boss3DPresence.tsx`: đọc màu pha lê/vòng rune từ `themeConfig.colors` (xanh lá cho Xử Giả, đỏ cam cho Rồng Núi, tím điện cho Rồng Già, indigo/hư vô cho Thần Hư Vô) + `scale` vòng halo theo cấp boss.
   - `BossVoidAttack.tsx` & `BossDeathVFX3D.tsx`: thay `isBaron` / `isElder` boolean bằng `isDragonArchetype(gameTheme)` & màu từ `themeConfig.colors`.
3. **`client/src/components/ui/BossHealthBar.tsx` & `VictoryHeaderStage.tsx` & `HUDOverlay.tsx`**
   - `BossHealthBar.tsx`:
     - Render tên Boss & badge ván đấu (VD: `VÁN 1/5 • XỬ GIẢ CKTG`) dùng `t()` và `themeConfig`.
     - Gradient thanh máu & viền lấy từ `themeConfig.colors` (dùng Object Map lookup, không nested ternary).
   - `VictoryHeaderStage.tsx`: hiển thị subtitle đúng boss vừa bị hạ (`{{bossName}} ĐÃ BỊ TIÊU DIỆT!`) cho cả 6 boss thay vì chỉ Baron/Elder.
   - `HUDOverlay.tsx`: dùng `isDragonArchetype(gameTheme)` cho `BossEnragedEntranceBanner`.

### 📌 Sprint 3: Procedural Attack Speed & Full-Stack Socket Sync (`server` + `admin`)
1. **`client/src/App.tsx`**
   - Trong `retaliationInterval` & `runAttackCycle` (dòng 53-94): chia `intervalMs` cho `BOSS_DIFFICULTY_SCALE[state.gameTheme].phaseSpeedMultiplier` (và thêm `gameTheme` vào dependency array của `useEffect` để cập nhật ngay khi sang round mới hoặc đổi boss).
2. **Mở rộng Type & UI ở Server + Socket + Admin:**
   - `server/src/index.ts`: thay `'BARON' | 'ELDER_DRAGON'` thành union 6 giá trị `GameThemeType`, validate whitelist khi nhận `admin:set-theme`.
   - `client/src/services/socket.ts` & `client/src/services/eventBus.ts`: thay `'BARON' | 'ELDER_DRAGON'` bằng `GameThemeType`.
   - `admin/src/services/socket.ts` & `admin/src/App.tsx`: nâng cấp switcher hỗ trợ đủ 6 Boss/Theme (gợi ý chia 2 nhóm: Boss Series BO & Classic Override).
   - `client/src/components/ui/admin/AdminMapSkillsTab.tsx`: render grid nút chọn từ `Object.values(THEME_CONFIGS)` thay vì 2 nút hardcode.

### 📌 Sprint 4: Audio Pitch Scaling & i18n
1. **`client/src/services/audioService.ts`**
   - Thêm optional parameter `pitchMultiplier = 1.0` cho `playBossRoarSound`, `playBossPokeSound`, `playBossEnrageSound`, `playBossDefeatSound` (nhân `frequency` với `themeConfig.audioPitchRate`: Xử Giả `1.3x` thanh mảnh nhanh, Thần Hư Vô `0.78x` trầm nặng).
2. **i18n (`client/src/i18n/messages/vi.json` & `client/src/i18n/messages/en.json`)**
   - Bổ sung keys song ngữ cho toàn bộ 6 boss (`BossTheme.baron`, `BossTheme.elderDragon`, `BossTheme.xuGia`, `BossTheme.rongNui`, `BossTheme.rongGia`, `BossTheme.voidTitan`), roar banners (`Game.bossRoar.*`), victory subtitles (`Victory.bossDefeatedDynamic`), và round-boss badge (`BossRound.indicator`).

---

## 5. Ma Trận File Cần Chỉnh Sửa

| File | Nhiệm vụ chính | Mức độ |
|---|---|---|
| `client/src/constants/game.ts` | +4 `GAME_THEME`, +`BOSS_DIFFICULTY_SCALE`, +`SERIES_BOSS_MAP`, +4 `THEME_CONFIGS`, helpers `getBossThemeForRound`, `isDragonArchetype`, `getThemeConfig` | 🔴 Core |
| `client/src/constants/bossSpeech.ts` | Hỗ trợ thoại cho đủ 6 `GameThemeType` hoặc fallback archetype | 🟡 Med |
| `client/src/constants/bossSkills.ts` | Dùng `isDragonArchetype` (hoặc skill set riêng theo theme) | 🟢 Low |
| `client/src/store/gameStore.ts` | Auto-switch boss + HP trong `startNextRound`/`resetBO5Match`, dynamic `enrageThreshold`, `skillDamageMultiplier`, fix `getStoredGameTheme` | 🔴 Core |
| `client/src/App.tsx` | Áp `phaseSpeedMultiplier` vào retaliation & auto-skill timer | 🟢 Low |
| `client/src/components/arena/Boss2D.tsx` | Áp `spriteFilterClass`, `isDragonArchetype`, thêm `VoidAuraOverlay` cho `VOID_TITAN` | 🟡 Med |
| `client/src/components/canvas/Boss3DPresence.tsx`, `BossVoidAttack.tsx`, `BossDeathVFX3D.tsx` | Màu & scale 3D crystals/rings/attack/shatter theo `THEME_CONFIGS` | 🟡 Med |
| `client/src/components/ui/BossHealthBar.tsx` | Hiển thị tên Boss + round badge, màu thanh máu theo `THEME_CONFIGS` | 🟡 Med |
| `client/src/components/ui/victory/VictoryHeaderStage.tsx` & `HUDOverlay.tsx` | Subtitle tiêu diệt Boss động theo 6 theme + `isDragonArchetype` | 🟢 Low |
| `client/src/services/socket.ts` & `client/src/services/eventBus.ts` | Mở rộng type `GameThemeType` (6 themes) | 🟢 Low |
| `client/src/components/ui/admin/AdminMapSkillsTab.tsx` | Render selector động từ `THEME_CONFIGS` (6 themes) | 🟡 Med |
| `server/src/index.ts`, `admin/src/services/socket.ts`, `admin/src/App.tsx` | Mở rộng type & UI map switcher hỗ trợ đủ 6 themes | 🟡 Med |
| `client/src/services/audioService.ts` | Thêm `pitchMultiplier` theo `audioPitchRate` | 🟢 Low |
| `client/src/i18n/messages/vi.json` & `client/src/i18n/messages/en.json` | Bổ sung đầy đủ translation keys cho 6 boss & UI | 🟢 Low |

---

## 6. Ràng Buộc Kỹ Thuật & Tiêu Chí Nghiệm Thu (Checklist)

> [!WARNING]
> **Không phá vỡ `Record<GameThemeType, ...>`:** `THEME_CONFIGS`, `BOSS_DIFFICULTY_SCALE`, `BOSS_SPEECHES` đều là `Record<GameThemeType, ...>`. Khi thêm 4 key vào `GAME_THEME`, TypeScript sẽ báo lỗi compile nếu thiếu bất kỳ key nào ở các Record này (nếu muốn giữ `BOSS_SPEECHES` gọn cho archetype, hãy đổi type thành `Partial<Record<GameThemeType, ...>>` hoặc bổ sung đủ 6 key).

> [!IMPORTANT]
> **Tuân thủ Clean Code Rules (`AGENTS.md` / `clean-code.md` / `i18n-strict.md`):**
> - **Zero Hardcode:** Không hardcode tên boss, HP multiplier, màu hex hay string hiển thị trong JSX; tất cả lấy từ `THEME_CONFIGS` / `BOSS_DIFFICULTY_SCALE` / `t()`.
> - **No Nested Ternaries:** Tuyệt đối không dùng `a ? b : c ? d : e`. Dùng Object Map Lookup (`THEME_CONFIGS[theme]`) và Guard Clauses.
> - **No `any` Type:** Dùng `GameThemeType` chuẩn xuyên suốt Client, Admin, Server.
> - **i18n Bắt Buộc:** Mọi chuỗi user-facing dùng `useTranslation()` + có mặt trong cả `client/src/i18n/messages/vi.json` và `client/src/i18n/messages/en.json`.

### Tiêu Chí Nghiệm Thu & Kiểm Chứng Build
Sau khi code xong, bắt buộc chạy thành công tất cả các lệnh build/typecheck sau (0 error):
1. `pnpm --filter client build` (hoặc `npx tsc --noEmit` trong `client/`)
2. `pnpm --filter admin build` (hoặc `npx tsc --noEmit` trong `admin/`)
3. `pnpm --filter server build` (hoặc `npx tsc --noEmit` trong `server/`)
4. Test thực tế flow: Bắt đầu trận `BO5` -> Ván 1 ra `Xử Giả` (50,000 HP, tint xanh lục, nhỏ) -> `startNextRound()` -> Ván 2 ra `Rồng Núi` (70,000 HP, tint đỏ) -> Ván 3 `Rồng Già` (85,000 HP) -> Ván 4 `Baron Nashor` (100,000 HP) -> Ván 5 `Thần Hư Vô` (130,000 HP + Void Aura) -> `resetBO5Match()` quay lại Ván 1 `Xử Giả`.
