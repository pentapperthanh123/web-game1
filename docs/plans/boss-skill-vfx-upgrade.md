# Boss Skill & VFX Upgrade — Kế hoạch

> Trạng thái: **đã triển khai (2026-11-12)** — `tsc` client/admin + `vite build` pass; chưa chạy thử trên trình duyệt. Mục tiêu: mỗi skill của 6 boss có VFX riêng (2D + 3D), thêm hiệu ứng trạng thái lên tướng, thêm phase theo % máu boss.
>
> Khác với kế hoạch ban đầu: ngưỡng phase dùng lại `BOSS_MECHANICS_CONSTANTS.PHASES` (65 % / 35 %) để đồng bộ với vết nứt giáp đã có, thay vì 50 % / 25 %.

## 1. Hiện trạng (đã khảo sát)

- 6 boss × 4 skill trong `client/src/constants/bossSkills.ts` (admin có **bản sao riêng** `admin/src/constants/bossSkills.ts`).
- `castBossSkill` (store) → chọn skill → tính dame → banner + shake/flash + particle burst theo `skill.color`. **Không có** khái niệm VFX riêng, status effect, hay phase trong skill.
- 2D (`Boss2D.tsx`): animation phân nhánh theo `skillId` chỉ cho Herald; boss khác dùng chung `lunge-left/right/slam-center` + `GroundShockwaveRing`.
- 3D (`BossVoidAttack.tsx`): hard-code 4 skill Baron (`baron_*`); 5 boss còn lại chỉ có lightning + ring chung.
- Phase: `BossPhaseVisuals` đã có cracks theo `PHASE_2/3_THRESHOLD_PERCENT`, nhưng phase **không ảnh hưởng gameplay**.
- Status effect: chưa có scaffold nào (`MinionEntity` không có trường trạng thái).

## 2. Thiết kế

### 2.1 Data model (`types/bossSkill.ts`, `types/game.ts`)

```ts
// 10 archetype VFX dùng chung, tham số hoá bằng màu/cường độ — thay vì 24 component riêng
BOSS_SKILL_VFX = PROJECTILE_ARC | GROUND_SPIKES | CRESCENT_SWEEP | LIGHTNING_STRIKE
              | METEOR_RAIN | BEAM | VORTEX | CHARGE_DASH | SEISMIC_SLAM | NOVA

BOSS_STATUS_EFFECT = BURN (dame theo thời gian) | POISON (dame theo thời gian, màu xanh)
                   | STUN (tướng ngừng đánh) | WEAKEN (tướng -50% dps) | LIFESTEAL (boss hồi % dame gây ra)

BossSkillDefinition += {
  vfxType: BossSkillVfxType;
  vfxParams?: { secondaryColor?: string; count?: number; scale?: number };
  statusEffect?: { type; durationMs; tickDamage?; ratio? };
  minPhase?: 1 | 2 | 3;          // skill bị khoá tới phase này
}

MinionEntity += { statusEffects?: ActiveStatusEffect[] }
ActiveStatusEffect = { type; expiresAt; tickDamage?; lastTickAt; color; sourceSkillId }
```

### 2.2 Mapping skill → VFX → status (đề xuất)

| Boss | Skill 1 | Skill 2 | Skill 3 | Ultimate |
|---|---|---|---|---|
| **Baron** | Acid Spit · PROJECTILE_ARC · POISON | Void Spikes · GROUND_SPIKES | Tail Sweep · CRESCENT_SWEEP | Void Cataclysm · NOVA · POISON |
| **Rồng Ngàn Tuổi** | Dragon Breath · PROJECTILE_ARC · BURN | Wing Buffet · CRESCENT_SWEEP · WEAKEN | Meteor Rain · METEOR_RAIN · BURN | Cataclysmic Burn · NOVA · BURN |
| **Sứ Giả** | Herald Charge · CHARGE_DASH · STUN | Void Cleave · CRESCENT_SWEEP | Eye Gaze · BEAM | Seismic Slam · SEISMIC_SLAM · STUN |
| **Rồng Núi** | Magma Spit · PROJECTILE_ARC · BURN | Rock Slide · METEOR_RAIN (đá) · STUN | Tectonic Roar · SEISMIC_SLAM · STUN | Volcanic Eruption · NOVA · BURN |
| **Rồng Bão** | Lightning Spark · LIGHTNING_STRIKE | Wind Vortex · VORTEX · WEAKEN | Thunder Barrage · LIGHTNING_STRIKE ×N | Tempest Wrath · NOVA + LIGHTNING · WEAKEN |
| **Thần Hư Vô** | Annihilation Beam · BEAM · LIFESTEAL | Singularity Crush · VORTEX · LIFESTEAL | Rift Collapse · GROUND_SPIKES + NOVA | Apocalypse · NOVA · LIFESTEAL |

### 2.3 Phase theo % máu (gameplay)

| Phase | Ngưỡng | Hiệu ứng |
|---|---|---|
| 1 | > 50 % | Ultimate **bị khoá** (chỉ skill 1–3) |
| 2 | ≤ 50 % | Mở ultimate (10 %), aura đổi màu `secondaryHex`, banner "Giai đoạn 2" |
| 3 | ≤ 25 % | Ultimate 25 %, dame skill ×1.2, interval ×0.8, aura `enragedHex`, status duration ×1.5 |

Chuyển phase → `bossPhaseChangedAt` trong store, banner + âm `BOSS_PHASE_SHIFT`, shake.

### 2.4 Luồng store

- `resolveBossPhase()` chuyển vào `constants/bossPhases.ts` (dùng chung Boss2D/store/admin).
- `castBossSkill`: lọc skill theo phase → trọng số theo phase → áp `statusEffect` lên tướng trúng đòn → LIFESTEAL hồi máu boss.
- `tickStatusEffects()` mới, gọi trong vòng lặp 250 ms ở `App.tsx`: BURN/POISON trừ máu + floating text màu riêng; hết hạn thì xoá.
- Nơi tướng gây dame (tìm `dps`/`triggerAutoProAttack`): bỏ qua tướng STUN, nhân 0.5 nếu WEAKEN.

### 2.5 2D

- `arena/skillVfx/BossSkillVfx2D.tsx`: dispatcher theo `vfxType` → 10 overlay CSS/SVG (tia beam quét, thiên thạch rơi, chớp loé, vortex xoay, hố dung nham, spike trồi…).
- `Boss2D`: animation class theo `vfxType` (CHARGE_DASH → lao, SEISMIC_SLAM → giậm, BEAM → ngẩng đầu, PROJECTILE_ARC → khạc) thay vì theo team.
- Tướng dính status: viền màu + icon nhỏ (🔥/☠️/💫) trên card tướng.
- Keyframes mới trong `index.css`.

### 2.6 3D

- `BossVoidAttack` → `canvas/bossSkill/BossSkillVfx3D.tsx` dispatcher + 10 sub-component (`ProjectileArc3D`, `GroundSpikes3D`, `CrescentSweep3D`, `LightningStrike3D`, `MeteorRain3D` (tái dùng `activeMeteors`), `Beam3D`, `Vortex3D`, `ChargeDash3D`, `SeismicSlam3D`, `Nova3D`). Geometry share qua singleton, instanced khi > 6 object, chỉ mount component đang active.

### 2.7 Âm thanh

Thêm vào `constants/sfx.ts`: `BOSS_BEAM`, `BOSS_LIGHTNING`, `BOSS_METEOR`, `BOSS_VORTEX`, `BOSS_FIRE_BREATH`, `BOSS_CHARGE`, `BOSS_PHASE_SHIFT`, `STATUS_BURN_TICK`, `STATUS_STUN`. Map `vfxType → SfxEventName`. Link Myinstants sẽ được dò + đo độ dài như lần trước.

### 2.8 Admin

Đồng bộ `admin/src/constants/bossSkills.ts` + `types/bossSkill.ts`; nút skill hiện badge VFX/status và khoá mờ khi chưa tới phase (nhận `bossPhase` qua socket state sync).

## 3. Thứ tự thực hiện (checkpoint sau mỗi bước)

1. Types + constants (vfx/status/phase) + đồng bộ admin constants
2. Store: phase, chọn skill theo phase, status apply/tick/gating, lifesteal
3. 2D VFX + Boss2D animation + CSS + status badge trên tướng
4. 3D dispatcher + 10 archetype
5. Sounds
6. Admin panel
7. `tsc`, self-review theo `quality-rules.md`, chạy thử

## 4. Rủi ro

- Hiệu năng OBS: 3D chỉ mount archetype đang active; CSS overlay dùng `transform/opacity`.
- Khoá ultimate ở phase 1 đổi nhịp game khi stream — có thể tắt qua config admin (`phaseLockEnabled`).
- Admin đang có diff chưa commit ở `BossSkillControls.tsx` → sẽ sửa chồng lên, không revert.
