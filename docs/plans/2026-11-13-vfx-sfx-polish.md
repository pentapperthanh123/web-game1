---
goal: Broadcast-grade donate / kill / entrance / milestone VFX, and a self-hosted, mixed SFX set that cannot drop out during a live
stack: client (React 19 + R3F/three + zustand + Tailwind v4, Howler + Web Audio synth)
status: complete (operator listen test pending)
date: 2026-11-13
decisions:
  sfx_source: download current Myinstants files to client/public/sfx (Web Audio, low latency); Myinstants URL + synth stay as fallbacks
  gift_tiers: 4 (SMALL <10 xu, MEDIUM 10–98, BIG 99–999, MEGA ≥1000)
  scope: donate+banner, kill+entrance, full audio, heart milestones + team combos
---

# VFX + SFX polish for live

## Phase -1 · What exists
| Area | Today | Gap |
|---|---|---|
| Gift | `triggerGiftExplosion` (summonSlice): 2 tiers by `VIP_VFX_MIN_COINS=50` / `BIG_DONATE_MIN_COINS=99` (two different thresholds!), heart chime or `BIG_DONATE` sample, meteors, `GiftBanner` (DOM pill, 4.5 s), `CelestialGiftVFX` (3D beam + 2 rings + orb, colours hard-coded cyan/orange, not team theme) | no tier ladder, no streak build-up, no donor avatar, no screen-wide "mega" moment, colours ignore team themes |
| Champion death | `DefeatedChampionToken` (flash, double slash, 8 shards, soul rise) — done this week | no 2D kill-feed line, no sound tiering (crit kill / multi-kill), no slow-mo on ultimate wipe |
| Entrance aura | `championEntranceAura.ts` (beam, rune seal, flash, ring, halo) — done this week | no team-colour ground portal pulse synced with sound; signature-player entrance identical to normal |
| Heart milestone | `HeartMilestoneBanner` (45 lines), `FloatingHearts` | banner only; no 3D heal wave on champions, no sound ladder |
| Team combo | `TeamComboBadge` (punch/flame CSS), `COMBO_LEVEL_UP` sample | badge only; x25/x50/x100 look the same |
| Audio | 30 samples from Myinstants via HTML5 Audio (no CORS → no Web Audio, 48-voice pool exhausted under load — seen in headless logs), synth fallbacks, 4 mix buses, density gate, ducking | remote host = single point of failure; files unnormalised (peaks differ ~12 dB); no BGM; TTS sanitiser strips digits so "Viewer_830" reads empty |

Licensing note: Myinstants files are user uploads with unknown rights. The plan bundles them so the stream never goes silent, but the mapping table (`SFX_DEFINITIONS`) is built so each file can be swapped for a licensed one by changing one `src` entry. **Operator decision before a commercial live: replace or accept.**

## Phase 0 · Decisions (answered)
- Local bundle + fallback chain; 4 gift tiers; all four areas in scope.

## Design

### Gift tier ladder (`GIFT_TIER` in constants/game.ts — one source of truth, replaces `VIP_VFX_MIN_COINS` + `BIG_DONATE_MIN_COINS`)
| Tier | Coins | 2D | 3D | Audio | Game |
|---|---|---|---|---|---|
| SMALL | 1–9 | team-colour heart burst at the team block; no banner | nothing | `SCORE_UP` quiet | heal + damage as now |
| MEDIUM | 10–98 | mini pill (donor avatar, gift, xu) 2.5 s | sparkler fountain (instanced embers) at team wing | `GIFT_MEDIUM` (new) | + small meteor x3 |
| BIG | 99–999 | full banner with donor avatar, gift icon, xu, damage; shimmer | `CelestialGiftVFX` reworked: team-colour beam + 3 rings + 8 meteors | `BIG_DONATE` + duck | screen shake 1.3 |
| MEGA | ≥1000 | hero card centred 3 s with donor avatar ring, confetti, "ĐẠI GIA" crest; game pauses damage feedback 2 s | sky pillar + shockwave + boss knock-back + 16 meteors + arena flash | `GIFT_MEGA` stinger + fanfare, full duck 3 s, TTS shout-out | boss stagger 1 s (no attacks), damage ×1 (unchanged) |
Streaks: `streakCount` drives a growing counter on the pill ("x12") and tier escalates by `totalCoins`, so a 10×100-coin streak reaches MEGA on the 10th.

### Champion kill
- 3D token death stays; add `KILL_FEED` DOM strip (last 3 kills: "💀 Zed của @user — Baron Cú Táp") near the chat.
- Multi-kill: ≥5 champions in one boss skill → "QUÉT SẠCH" stamp + 250 ms time-scale 0.3 on the 3D clock (useFrame delta) + `WIPE` sting.
- Sound ladder: `CHAMPION_DEATH` for 1–2, `CHAMPION_DEATH_MULTI` for ≥3, pitch jitter.

### Entrance
- Sync: ground portal ring pulse keyed to the `CHAMPION_SUMMON` sample onset; signature-player entrance gets gold rune seal + `SIGNATURE_SUMMON` chord.
- Per-turn volley: when `maxDeployPerTurn ≥ 3`, one wider "squad" pulse instead of N overlapping auras (reuse portal instancing).

### Heart milestone & combos
- Milestone: expanding green heal ring on the floor through every champion token + per-token "+100" (merged), `TEAM_HEAL` sting. Banner gets heart count and next target.
- Combo badge: x10 bronze, x25 silver, x50 gold, x100 rainbow; each level its own CSS keyframe and `COMBO_LEVEL_UP` pitch step (rateScale 1.0 / 1.12 / 1.25 / 1.4).

### Audio pipeline
1. `scripts/sfx/download-sfx.mjs`: reads `SFX_DEFINITIONS`, downloads the first Myinstants URL of each entry to `client/public/sfx/<EVENT>.mp3`, writes `client/public/sfx/manifest.json` (file, bytes, sha1, source URL).
2. `scripts/sfx/normalize-sfx.mjs` (ffmpeg if present): loudnorm to −16 LUFS short-term / −1 dBTP, trim leading silence, cap length (viewer SFX ≤ 0.6 s, stingers ≤ 4 s); skipped with a warning when ffmpeg is missing.
3. `SFX_DEFINITIONS.src` becomes `[fromLocal('X.mp3'), ...myinstants]`; `isCorsReady` true for local → Web Audio path; pool size 48 → 96 and `html5` only for remote fallback.
4. New events: `GIFT_MEDIUM`, `GIFT_MEGA`, `CHAMPION_DEATH_MULTI`, `SIGNATURE_SUMMON`, `WIPE`, `COMBO_TIER` (rate-stepped), `KILL_FEED_TICK`.
5. Arena BGM: one looping ambient bed per boss archetype (synth pad + noise, no file) at −24 dB on the COMBAT bus, ducked by stingers; off switch in HUD audio toggle.
6. TTS: sanitiser keeps names but strips `_123` suffixes only; queue max 3, drops oldest.

## Task breakdown
| # | Task | Agent | Files | Done when |
|---|---|---|---|---|
| V1 | Gift tier ladder + resolver (`resolveGiftTier(totalCoins)`), replace both old thresholds, streak escalation | game-developer | `constants/game.ts`, `store/slices/summonSlice.ts` (triggerGiftExplosion split into per-tier handlers), `types/game.ts` (banner gets `tier`, `donorAvatarUrl`) | unit table of coins→tier; no nested ternaries |
| V2 | 2D gift presentation: SMALL heart burst, MEDIUM pill, BIG banner rework, MEGA hero card + confetti | frontend-specialist | `components/ui/gift/*` (new folder, ≤150 lines each), `GiftBanner.tsx` becomes dispatcher, `index.css` keyframes (transform/opacity only), i18n | all 4 tiers render in portrait 480×860 |
| V3 | 3D gift presentation: sparkler fountain (instanced), reworked celestial beam (team colours via `getTeamTheme`), MEGA pillar + boss knock-back | game-developer | `components/canvas/gift/*`, `CelestialGiftVFX.tsx` | no per-frame allocations; ≤ 40 draw calls at MEGA |
| V4 | Kill feed + multi-kill wipe (time-scale, stamp) | game-developer | `components/ui/KillFeed.tsx`, `store/slices/bossSlice.ts` (emit kill events), `GameCanvas.tsx` clock scale | wipe triggers at ≥5 deaths in one skill |
| V5 | Entrance sync + signature entrance + squad pulse | game-developer | `championEntranceAura.ts`, `SummonGroundPortalsInstanced.tsx`, `summonSlice.ts` (deploy sound hook already there) | 15-champion turn shows one squad pulse |
| V6 | Heart milestone heal wave + combo tiers | frontend-specialist | `HeartMilestoneBanner.tsx`, new `HealWave3D.tsx`, `TeamComboBadge.tsx`, `index.css` | x10/x25/x50/x100 visibly different |
| S1 | SFX download + manifest + normalize scripts; commit files to `client/public/sfx` | devops-engineer | `scripts/sfx/*`, `client/public/sfx/*` | manifest lists 30+ files; server serves them |
| S2 | `SFX_DEFINITIONS` → local first, new events, pool/html5 changes, per-tier gift sounds, combo rate steps | backend-specialist (audio) | `constants/sfx.ts`, `services/soundManager.ts`, `services/sfxFallbacks.ts` | offline (block myinstants in DevTools) → every event still plays from local |
| S3 | Arena ambient bed per archetype + HUD toggle + TTS fixes | backend-specialist (audio) | `services/audioService.ts` (new `arenaAmbience.ts` module), `HUDOverlay.tsx`, i18n | bed ducks under stingers; TTS reads "Viewer" for "Viewer_830" |
| X1 | Screenshot pass of every tier/state via headless Chrome (reuse profile/screenshot harness), listen test checklist for operator | test-engineer | `scripts/vfx/capture-states.mjs` | PNG per state in docs/plans/assets |

Order: S1 → S2 (audio foundation) ∥ V1 → V2/V3 → V4/V5/V6 → S3 → X1.

## Phase X · Verification
- [ ] `tsc` clean (client), `vite build` OK, no BOM, no nested ternaries, i18n vi+en for new strings.
- [ ] Offline test: block `myinstants.com` in DevTools → all SFX still play.
- [ ] Gift coins 1 / 10 / 99 / 1000 / streak 10×100 → SMALL / MEDIUM / BIG / MEGA / escalates.
- [ ] 300-champion load: MEGA gift keeps FPS within 20 % of baseline (reuse profile.mjs).
- [ ] Multi-kill wipe fires once per skill; time-scale returns to 1.
- [ ] Combo x10/x25/x50/x100 look and sound distinct.
- [ ] Operator listen test on stream PC with OBS audio capture (levels: viewer SFX −18 dBFS avg, stingers −6 dBFS peak).

## Result notes
- Done: V1 tier ladder (`store/giftTier.ts`, `store/giftExplosion.ts`), V2 2D tiers (`components/ui/gift/*`), V3 3D tiers (`components/canvas/gift/*`), V4 kill feed + wipe (`store/combatMomentStore.ts`, `KillFeed.tsx`), V5 signature entrance sound, V6 heal wave (`HealWave3D.tsx`) + combo sound pitch steps, S1 35 SFX bundled + normalized to -16 LUFS (1.45 MB, `scripts/sfx/*`), S2 local-first sources + Web Audio, S3 arena ambience per archetype + HUD toggle + TTS name fix.
- Verified in headless Chrome: every SFX request served from `/sfx/` (no myinstants calls), no runtime exceptions, screenshots of MEDIUM/BIG/MEGA/heal states.
- V5 squad entrance done: turns with ≥3 champions of a team share one pulse (`SquadEntrancePulse3D.tsx`); their individual sky beams and portal pillars are suppressed. Verified: 6-per-team turn → `entranceSquadSize = 6` on all 12.
- Fixed during verification: leaderboard split one viewer into several rows ("An (Ahri)", "👑 An") → canonical names; quest reward no longer counted as a player.
