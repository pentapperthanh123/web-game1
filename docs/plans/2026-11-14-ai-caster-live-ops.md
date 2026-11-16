---
goal: Run the TikTok live 24/7 with no host — AI caster voice, chat moderation, idle/active/end phases, overload handling, operator alerts
stack: pnpm monorepo — client (React 19 + R3F + zustand), admin (React), server (Node + socket.io + tiktok-live-connector ^1.2.0)
status: Wave 0 (S2 done, S1 tool ready — needs a run in OBS, S3 deferred to Wave 4) · Wave 1 implemented and verified · Waves 2–5 not started
date: 2026-11-14
spec: docs/specs/2026-11-14-cktg-live-ops-spec.md
decisions:
  tts_engine: (D1) free browser Web Speech for now; upgrade decided after S1 is run inside OBS
  alert_channel: (D2) Telegram, configured via env only — no real account connected yet (alerts are logged)
  gift_damage_multipliers: (D3) per-gift HP cap 35 % now; tier multipliers stay ×1 until a week of live data
  round_timer_and_defeat: (D4) yes — 6 min, timer runs only while ACTIVE
  tie_break: (D5) last-hit team wins a tie
  blacklist_source: (D6) operator supplies; we ship a minimal seed + live admin editor
---

# AI caster + autonomous live ops

Implements the spec `docs/specs/2026-11-14-cktg-live-ops-spec.md` (section numbers below, e.g. "spec 2.2", point there).

## Phase -1 · What exists (baseline commit 6452494)

| Area | Today | Gap for no-host operation |
|---|---|---|
| Chat parsing | `parseCommentCommand` (server `utils/payloadSanitizers.ts`): team keyword, champion name, `RANDOM` / `NGAU NHIEN` | no alias table (`mf` → Miss Fortune) |
| Anti-spam | `tiktokLivePipeline.ts`: follow once per viewer, share 15 s cooldown, like batch clamp 15, gift streak dedupe (45 s TTL) | **no per-user cooldown on summon chat**, no soft mute |
| Moderation | none | **no blacklist; nicknames reach the screen and TTS unfiltered** |
| TTS | `audioService.speak()` — Web Speech API, FIFO queue max 3 (drops oldest), `DEFAULT_TTS_ENABLED = false`, only called from `VictoryPodiumCard` | no priorities, no TTL, no watchdog, no caster lines, vi-VN voice in OBS unverified |
| Event dedupe | gift streak only | no `msgId` dedupe |
| Reconnect | backoff 1 s → 60 s, jitter 20 %; `streamEnd` also reconnects; admin shows RECONNECTING | **no operator alert** |
| Idle | Auto Pro Battle (`App.tsx`, `autoProBattleConfig.onlyWhenIdle` = pros fire only when arena has no minions), guide auto-reveal | no idle phase/tiers, no banter, pro damage is full strength (round can end with zero viewers) |
| Round end | boss HP 0 → higher team score wins; **tie goes to BLG** (`combatSlice.ts:951`) | no round timer, no DEFEAT |
| Gift tiers | `GIFT_TIER_CONFIG` SMALL/MEDIUM/BIG/MEGA, `resolveGiftTier` escalates once per threshold crossing | no LEGENDARY, no per-gift HP cap, damage not tier-scaled |
| Client event plumbing | `eventBus.ts` = BroadcastChannel for admin-modal → overlay commands | **no in-process "game moment" signal** for the caster to listen to |
| Persistence | `jsonFileStore` pattern, `playerProfileService` (weekly/monthly/all-time) | no moderation store, no "first time today" flag |
| Process | `start.bat` / `pnpm dev:all` | no supervisor / auto-restart |

## Phase 0 · Decisions (answered 2026-11-14)

| # | Question | Answer | What it changes |
|---|---|---|---|
| D1 | TTS engine | Free browser Web Speech for now. Run S1 in OBS, then decide on an upgrade (server-side neural TTS) | B1 ships `WebSpeechEngine` + `SilentEngine`; `ServerClipEngine` only if S1 fails or quality is too low |
| D2 | Operator alerts | Telegram, env-configured; no real account yet → alerts are logged only | A4 (done) |
| D3 | Tier damage multipliers / per-gift cap | Cap at 35 % of boss max HP per gift now; multipliers stay ×1 | Cap moves into Wave 4 (task D3); multipliers stay in E1, gated on live data |
| D4 | Round timer + DEFEAT | Yes, 6 min, counts only while ACTIVE | Task D3 |
| D5 | Tie-break | Last-hit team wins | Task D3 |
| D6 | Blacklist source | Operator supplies; minimal seed + admin editor shipped | A1 + A6 (done) |

## Contracts (fix names before parallel work)

### Server
| Item | Value |
|---|---|
| Moderation module | new `server/src/moderation/contentFilter.ts`: `normalizeForMatch(text)`, `containsBlockedTerm(text)`, `toSpeechName(nickname) → string \| null` (null = do not read, use alias) |
| Moderation store | new `server/src/moderation/moderationStore.ts` on `jsonFileStore` → `data/moderation.json` `{ blockedTerms: string[], championAliases: Record<string, string>, updatedAt }` |
| Rate limiter | new `server/src/services/chatRateLimiter.ts`: `checkSummon(viewerKey, championName, now) → { isAllowed, reason }`, reasons `COOLDOWN \| PER_MINUTE_CAP \| SAME_CHAMPION \| SOFT_MUTED` |
| Dedupe | new `server/src/services/eventDeduper.ts`: `isDuplicate(msgId, now)` 60 s window, bounded map |
| Alerts | `server/src/services/opsAlertService.ts`: `sendOpsAlert(kind, detail) → { isDelivered, failure? }`, kinds `SERVER_START \| TIKTOK_DOWN_LONG \| TIKTOK_RECOVERED \| STREAM_END \| TEST` (same kind suppressed for 10 min except TEST / RECOVERED); env `OPS_ALERT_TELEGRAM_BOT_TOKEN`, `OPS_ALERT_TELEGRAM_CHAT_ID`, `OPS_ALERT_INSTANCE_NAME`; log-only when empty. Outage timing in `connectionDowntimeTracker.ts`, gap log in `storage/connectionGapStore.ts`. A `TTS_DISABLED` kind is added with B1 |
| Server state | `ServerState.chatLimitConfig: { summonCooldownMs, maxSummonsPerMinute, sameChampionRepeatMs, softMuteTrigger, softMuteMs }`; `ServerState.casterConfig: { isTtsEnabled, isNameReadingEnabled }` (more fields are added by the wave that needs them). Persisted in `data/live_ops_config.json`; bounds in `server/src/constants/liveOps.ts` |
| Payload additions | `game:summon`, `game:gift`, `game:follow`, `game:share` gain `speechName: string \| null`. `summonerName` / `donorName` / `userName` are the **display-safe** name (masked `Ng***` when blocked); `game:chat.text` is `***` when blocked. `isFirstTimeToday: boolean` arrives with D5 |
| Pipeline stats | `tiktok:pipeline-stats` gains `blockedSummonChatCount`, `softMutedViewerCount`, `duplicateEventCount` |
| New events (done) | server → admin room `live-ops-admins`: `admin:live-ops-state { chatLimitConfig, casterConfig, moderation: { blockedTerms, championAliases, updatedAt }, opsAlert: { isConfigured } }`. server → all: `game:caster-config` (= `casterConfig`). admin → server: `admin:live-ops-request`, `admin:chat-limits` (partial, clamped), `admin:caster-config` (partial), `admin:moderation-update { addTerms?, removeTerms?, setAliases?: Record<alias, champion>, removeAliases? }` → ack `{ rejectedAliases }`, `admin:ops-alert-test` → ack `{ isDelivered, failure? }` — all behind the existing `admin:*` guard |
| New events (later) | server → all: `game:viewer-join-batch { count }` (C4), `tiktok:load-level { level: 'NORMAL' \| 'HIGH' \| 'OVERLOAD' }` (D4) |

### Client
| Item | Value |
|---|---|
| Caster signals | new `client/src/services/caster/casterSignals.ts`: `emitCasterSignal(signal)` — tiny in-process emitter (no BroadcastChannel, no store). Signal union: `SUMMON`, `GIFT` (with tier), `FOLLOW`, `SHARE`, `LIKE_MILESTONE`, `BOSS_ENRAGED`, `BOSS_LOW_HP`, `TOP_DPS_CHANGED`, `COMEBACK`, `ROUND_VICTORY`, `ROUND_DEFEAT`, `MATCH_POINT`, `SERIES_WON`, `IDLE_ENTERED`, `ICE_BREAKER`, `VIEWER_JOIN_BATCH` |
| Line catalogue | new `client/src/services/caster/casterLines.ts` — maps signal → i18n key prefix + priority + TTL; text lives in `i18n/messages/{vi,en}.json` under `Caster.<signal>.<n>` (≥ 5 variants each) |
| Composer | new `client/src/services/caster/casterComposer.ts` — fill slots, numbers → Vietnamese words, avoid last 3 variants, merge P4 by team |
| Presentation queue | new `client/src/services/caster/presentationQueue.ts` — priorities P1–P5, TTL, P1 preempt, P4 gap 4 s, P5 only after 8 s silence; replaces `audioService.ttsQueue` |
| Speech engine | new `client/src/services/caster/speechEngine.ts` — interface `{ speak(line): Promise<void>; cancel(): void }`, implementations `WebSpeechEngine`, `ServerClipEngine` (if D1 = server), `SilentEngine`; 10 s watchdog, 3 failures → disable 5 min + report |
| Banter | new `client/src/services/caster/banterScheduler.ts` — weighted categories (spec 5.3), interval by phase, reads live values via `useGameStore.getState()` at fire time only |
| Live phase | new `client/src/store/livePhaseStore.ts` (standalone zustand, like `communityQuestStore`): `{ phase, idleTier, intensity, lastValidActionAt, roundElapsedMs }`; updated at ≤ 1 Hz by a single ticker; **never subscribed by champion tokens** |
| Constants | `CASTER_CONSTANTS`, `PRESENTATION_PRIORITY`, `LIVE_PHASE_CONSTANTS`, `LOAD_LEVEL` in `client/src/constants/caster.ts` (new); server defaults in `server/src/constants/liveOps.ts` (new) |

## Task breakdown

Size: S ≤ ½ day, M ≈ 1 day, L ≈ 2–3 days.

### Wave 0 — Spikes (block the waves they feed) · S2 done · S1 tool ready, needs a run in OBS · S3 deferred to before Wave 4
| # | Task | Agent | Output | Size |
|---|---|---|---|---|
| S1 | List `speechSynthesis.getVoices()` inside an OBS Browser Source on the stream PC; measure time-to-first-audio for a 10-word vi-VN line; try 2 cloud TTS providers for quality/latency/cost | frontend-specialist | short note in this file → answers D1 | S |
| S2 | Confirm `tiktok-live-connector@1.2.x` payloads carry `msgId` (chat, gift, like, social) and a `member` (join) event | backend-specialist | field list → finalises A3, D4-join | S |
| S3 | Calibrate load thresholds: run `scripts/soak` bot at 20 / 100 / 200 events/s, record server CPU and overlay FPS | performance-optimizer | numbers for `LOAD_LEVEL` | S |

### Wave 1 — P0 server safety (spec 2.1, 2.2, 6.2) · ✅ done 2026-11-14 (see Spike notes / Wave 1 result)
| # | Task | Agent | Files | Done when | Size |
|---|---|---|---|---|---|
| A1 | Content filter + moderation store + seed list; apply `toSpeechName` and display masking in `tiktokLivePipeline` for every emitted event | backend-specialist, security-auditor | `server/src/moderation/*`, `tiktokLivePipeline.ts`, `data/moderation.json` | blocked nickname → `speechName: null`, display `Ng***`; free chat text never appears in any emitted caster field | M |
| A2 | Summon rate limiter + soft mute; counters added to `PipelineStatsSummary` (`blockedCooldownCount`, `softMutedViewerCount`) | backend-specialist | `chatRateLimiter.ts`, `tiktokLivePipeline.handleChat`, `constants/tiktok.ts` | 20 summons in 5 s from one user → 1 accepted; 15 blocked in 60 s → muted 5 min | M |
| A3 | `msgId` dedupe on all connector handlers (per S2) | backend-specialist | `eventDeduper.ts`, `tiktokConnectionService.attachRoomListeners` | replayed event ignored | S |
| A4 | Ops alerts: TikTok down > 5 min, `streamEnd`, server start; log disconnect windows to `data/connection_gaps.json` | backend-specialist | `opsAlertService.ts`, `tiktokConnectionService.ts`, `.env.example` | forced drop with shortened threshold sends one alert, recovery sends "back online" | S |
| A5 | Process supervisor: script + README for running server under a restart-on-exit wrapper on Windows | devops-engineer | `scripts/ops/`, `start.bat` | killing the server process → back within 10 s; overlay reconnects | S |
| A6 | Admin UI: blacklist editor, chat-limit controls, **kill switch "do not read viewer names"**, TTS on/off | frontend-specialist | `admin/src/components/LiveOpsModerationSection.tsx` (new), `admin/src/services/socket.ts` | changes apply without restart; admin-only | M |

### Wave 2 — P0 client presentation (spec 2.4, 6.2)
| # | Task | Agent | Files | Done when | Size |
|---|---|---|---|---|---|
| B1 | `speechEngine` per D1, with watchdog and failure backoff; move `audioService.speak` callers onto it | frontend-specialist | `services/caster/speechEngine.ts`, `audioService.ts` | hung utterance cancelled at 10 s; 3 fails → silent 5 min, reported to server | M |
| B2 | `presentationQueue` P1–P5 with TTL, preempt, merge; music ducking via existing mix buses | game-developer | `services/caster/presentationQueue.ts`, `soundManager.ts` | MEGA line interrupts a P4 line; expired lines dropped; ≥ 3 P4 same team in 4 s merged | M |
| B3 | Wire `game:caster-config` → client; kill switch replaces every `{name}` with the team alias | frontend-specialist | `services/socket.ts`, `presentationQueue.ts` | toggling kill switch takes effect on the next line | S |

### Wave 3 — P1 caster content (spec 4, 5)
| # | Task | Agent | Files | Done when | Size |
|---|---|---|---|---|---|
| C1 | Line catalogue: ≥ 5 variants × 16 signals in `vi.json` + `en.json` | game-developer (copy), frontend-specialist | `i18n/messages/*.json`, `casterLines.ts` | every signal has variants in both locales | M |
| C2 | Composer: slot filling, Vietnamese number words, variant rotation, P4 merge | frontend-specialist | `casterComposer.ts` | unit-style self-check script prints 50 composed lines with no unfilled slot | M |
| C3 | Emit `casterSignals` at hook points — summon accepted (`summonSlice`), gift tier resolved (`giftExplosion.ts`), follow/share (`socket.ts` handlers), enrage + HP < 10 % (`bossSlice`), top-1 change (throttled 30 s, `roundDamageTracker.ts`), comeback / round end / match point / series end (`combatSlice`, `seriesSlice`), like milestone (`communityQuestStore`) | game-developer | listed files | each row of spec section 4 produces its line once; no new per-token subscription; no allocation in `useFrame` | L |
| C4 | Banter scheduler + `game:viewer-join-batch` greeting (needs S2 `member` event on server) | game-developer, backend-specialist | `banterScheduler.ts`, `tiktokConnectionService.ts` | longest silence ≤ 45 s in a 30 min idle run | M |

### Wave 4 — P1 phases & load (spec 3, 6.1)
| # | Task | Agent | Files | Done when | Size |
|---|---|---|---|---|---|
| D1 | `livePhaseStore` + 1 Hz ticker: IDLE tiers (90 s / 5 min / 20 min), WARM/HOT/FRENZY with 15 s hysteresis | game-developer | `store/livePhaseStore.ts`, `App.tsx` | phase transitions visible in a debug HUD row; tokens unaffected | M |
| D2 | Idle behaviours: guide-card cadence per tier, Auto Pro Battle auto-on in IDLE 2 with `IDLE_PRO_DAMAGE_RATIO = 0.3`, reduced VFX in IDLE 3, ice-breaker buff ×2 for 10 s | game-developer | `App.tsx` (auto-pro effect), `combatSlice.ts`, `livePhaseStore.ts` | empty room for 30 min: arena keeps moving, round does not end on pro damage alone | M |
| D3 | Round timer (ACTIVE only) + DEFEAT (no BO point, podium still shown) + tie-break per D5 + per-gift boss HP cap 35 % (decision D3; full value still counts for team score and leaderboard) | game-developer | `combatSlice.ts`, `seriesSlice.ts`, new `RoundTimerBadge`, i18n | timer expiry → DEFEAT, `bo5Score` unchanged; tie → last-hit team wins | M |
| D4 | Server load level (events/s, 15 s hysteresis) → `tiktok:load-level`; HIGH = summon admission 30/s fair per viewer; OVERLOAD = round-robin 1 per viewer per 10 s; dropped summons still count toward quests | backend-specialist | `tiktokLivePipeline.ts`, `constants/liveOps.ts` | soak at 200 events/s: gifts 100 % applied, FPS ≥ 30 | M |
| D5 | First-time-today flag from `playerProfileService` (add `lastSeenDay`) | backend-specialist | `playerProfileService.ts`, `playerProfileStore.ts` | first summon of the day → `isFirstTimeToday: true` once | S |

### Wave 5 — P2 polish
| # | Task | Agent | Files | Size |
|---|---|---|---|---|
| E1 | Tier damage multipliers (only after a week of live data, D3); LEGENDARY tier (≥ 10 000 coins, 10 s takeover, hall of fame of the day) | game-developer | `constants/game.ts`, `giftTier.ts`, `giftExplosion.ts` | M |
| E2 | Adaptive VFX quality: FPS < 30 for 10 s → lower caps, restore after 30 s ≥ 50 FPS | performance-optimizer | `vfxPruneSlice.ts`, `constants/game.ts` | M |
| E3 | Daily overlay reload during INTERMISSION 04:00–05:00 (snapshot restores state) | frontend-specialist | `App.tsx`, `matchSnapshot.ts` | S |

## Order & parallelism
1. **Now:** answer D1–D6; run S1–S3 in parallel (independent).
2. **Wave 1** (one backend agent for A1–A5, one frontend agent for A6 once the admin event names above are frozen).
3. **Wave 2** after S1. Can run in parallel with Wave 1 — the queue does not need server changes.
4. **Wave 3** after B2. C1 copywriting can start any time.
5. **Wave 4** D1 → D2/D3; D4 and D5 in parallel on the server.
6. **Gate before unattended live:** Waves 0–2 complete + Phase X items marked P0.
7. Wave 5 after one week of live data.

## Constraints carried from CLAUDE.md
- Caster code runs outside React render. Signals are plain function calls; nothing in `useFrame` / `stepChampionFrame` allocates or formats strings.
- No new `useGameStore` subscription in champion tokens; `livePhaseStore` is read by HUD components only.
- On-screen caps drop new entries, never cut in-flight ones — the presentation queue follows the same rule for P2–P5.
- Every user-facing string (caster lines, badges, admin labels in client) in both `vi.json` and `en.json`; admin app has no i18n.
- All tunables in constants files and server config; same field names across client, admin, server.

## Phase X · Verification
- [ ] `npx tsc --noEmit -p .` clean in client, admin, server; `npx vite build` in client and admin. (Wave 1: server + admin ✅)
- [x] **P0** Moderation (server side): nickname from the seed blacklist → masked on screen, `speechName: null`. Voice side ("chat text never spoken") re-checked after Wave 3.
- [x] **P0** Rate limit: scripted 20 summons / 5 s from one viewer → 1 accepted; soft mute after 15 blocked.
- [ ] **P0** Queue: MEGA during a P4 burst interrupts within 300 ms; lines older than TTL never play.
- [ ] **P0** Watchdog: forced hung utterance recovers; 3 failures → silent mode + alert.
- [ ] **P0** Alerts: forced TikTok drop (threshold lowered to 30 s for the test) → one alert, one recovery message; `streamEnd` → alert. (Test-alert path verified; outage path needs a real connection drop.)
- [ ] **P0** Supervisor: kill server → back ≤ 10 s, overlay resumes, snapshot intact.
- [ ] Phases: 90 s idle → IDLE 1 + banter; 5 min → Auto Pro at 30 %; first action → ice-breaker line + buff.
- [ ] DEFEAT: timer expiry → no BO point; tie → last-hit team.
- [ ] Load: soak at 200 events/s for 10 min — gifts 100 % applied, FPS ≥ 30, longest silence ≤ 45 s.
- [ ] 2 h soak with caster on: heap growth < 20 % after warm-up.
- [ ] Clean-code checklist (no magic values, no nested ternaries, i18n keys in vi + en).

## Spike notes

**S2 · connector payloads (done).** `tiktok-live-connector` is 1.2.3. Every simplified event carries `msgId` (stringified in `getEventAttributes`). Streak gift ticks may reuse a `msgId`, so the gift dedupe key is `gift:{msgId}:{repeatCount}:{repeatEnd}`. A `member` (viewer joined) event exists → usable for C4.

**S1 · TTS in OBS (tool ready, run pending).** Probe page: `http://localhost:8000/diagnostics/tts-probe.html` (`client/public/diagnostics/tts-probe.html`). Run it as an OBS Browser Source with "Control audio via OBS" on the streaming PC and paste the report block here. Reference run in headless Chrome on the dev PC: 19 voices, all Google online voices, **no vi-VN voice**, and no Windows (SAPI) voices exposed; speech was refused with `not-allowed` (autoplay without a click). If OBS shows the same, options are: install the Windows Vietnamese speech pack (voice "Microsoft An") and re-run, or switch B1 to a server-side TTS.

**S3 · load thresholds (deferred).** Needs the overlay in a real browser/OBS under the soak bot; only feeds D4 (Wave 4), so it runs right before Wave 4.

## Wave 1 result (2026-11-14)
- Server: `moderation/` (`contentFilter.ts`, `moderationSeed.ts`, `moderationStore.ts`, `moderationService.ts`), `services/chatRateLimiter.ts`, `services/eventDeduper.ts`, `services/opsAlertService.ts`, `services/connectionDowntimeTracker.ts`, `services/liveOpsService.ts`, `storage/connectionGapStore.ts`, `utils/liveOpsSanitizers.ts`, `constants/liveOps.ts`; wired in `tiktokLivePipeline.ts`, `tiktokConnectionService.ts`, `registerSocketHub.ts`, `index.ts`, `jsonFileStore.ts`.
- Matching rule learned while building A1: accented Vietnamese terms are matched against accented text only. Stripping accents collides with everyday words (lồn→lon, cặc→các, đĩ→đi, buồi→buổi). ASCII terms (teencode, English) are also matched after accent stripping + leetspeak folding; spaced single letters (`đ . m`) are joined.
- Admin: new tab **Live Ops & Kiểm Duyệt** (`admin/src/components/liveOps/*`, `hooks/useLiveOpsState.ts`, `types/liveOps.ts`, `constants/liveOps.ts`); stats bar shows blocked commands / muted viewers / duplicates.
- Ops: `scripts/ops/run-server-supervised.bat` + `scripts/ops/README.md`; `.env.example` has the Telegram variables.
- Verified: server and admin `tsc --noEmit` clean, admin `vite build` OK; 53 unit-level checks (filter incl. no false positives on "các / đi / buổi / lon / đeo", speech names, masking, 20 summons in 5 s → 1 accepted, soft mute, dedupe, kill switch); 19 end-to-end checks against the running dev server over socket + REST (alias, masking, kill switch, cooldown, clamping, test alert ack, full cleanup); Live Ops tab rendered in headless Chrome.
- Not verified: non-admin rejection with a real `ADMIN_TOKEN` (dev mode has no token); supervisor restart loop (script written, not run); a real Telegram delivery (no account, by decision D2).

## Wave 2 + 3 result (2026-11-14) — AI caster live in demo
Decision D1 updated: the streaming PC has **no Vietnamese browser voice** (Windows only has David, Zira, Mark), so the voice is generated **server-side**.

| Part | Where | Notes |
|---|---|---|
| TTS route | `server/src/routes/casterRoutes.ts`, `services/caster/*`, `constants/casterTts.ts` | `GET /api/caster/tts?text&lang` → mp3. Provider: Azure neural (`AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`) when set, else the free unofficial Google Translate voice (demo only). LRU cache 400 clips, in-flight dedupe, 60 provider calls/min, blocked-term check, 403 when the admin voice switch is off |
| Speech engine (B1) | `client/src/services/caster/speechEngine.ts` | prefetch P1–P3, 12 s watchdog, 3 failures → subtitle-only for 5 min, autoplay block → waits for one click (OBS never blocks), SFX ducked to 45 % while speaking |
| Queue (B2) | `presentationQueue.ts` | P1 interrupts, P2 jumps, P4 ≥ 4 s apart, summon waves merged per team (named or count-only), teams alternate, TTL per priority |
| Config (B3) | `store/casterStore.ts`, `services/socket.ts` | `game:caster-config` → voice on/off + name kill switch; names come from server `speechName` (`speechNameRegistry.ts`) |
| Lines (C1) | `i18n/messages/{vi,en}.json` → `Caster.lines` | 27 signals, 165 variants per language; every gift/follow/share line names and thanks the donor |
| Director (C3/C4) | `casterDirector.ts` | summons, gifts by tier, small-gift streaks, follow, share, enrage, boss < 10 %, ultimates, 1/4 of skills, comeback, round win + finisher, MVP, series win, round intro card narrated (matchup → rules → join → gifts), banter every 22 s when quiet (25–40 s when idle) |
| Caption | `components/ui/CasterSubtitle.tsx` | shown exactly while the line is spoken |

Verified in headless Chrome with autoplay allowed (like OBS): every line returned 200 from the route and played; intro, gift thanks, comeback and banter observed. Not yet: Azure voice (needs key), a run inside OBS, the 30-min idle soak (C4 done-when).

**Addendum — empty field & boss voice (2026-11-14).** Field wipe (≥ 3 living → 0 while the round runs): caster calls it → the **boss gloats** (its roar SFX + red caption with the boss name; no TTS, a slowed voice sounded sluggish) → caster rallies with how to join (sequence TTL 45 s). While no champion is alive, every ~10 s of silence the boss (its per-theme RESTLESS lines from `constants/bossSpeech.ts`) and the caster (`BANTER_EMPTY`, guide, CTA) take turns; driven by the field, not by boss idleness, because Auto Pro Battle keeps hitting the boss. Boss AMBIENT bubbles stay plain bubbles.

**Lines must be true (2026-11-14).** Banter is data-aware: field / hype lines need >= 5 living champions, boss-HP lines need the boss below 95 %, lead lines need a >= 10 % damage lead after >= 2 000 damage, series lines need a round already won. "Comeback" needs the previous leader to have led by >= 20 % and champions on the field. Round win credits the damage leader; the finisher gets a separate line naming their own team. Catalogue: 34 signals, 196 variants per language.

**Opening & ending (2026-11-14).**
- Fixed: the intro card on page load was never narrated. The card mounts inside the HUD and shows itself before the App-level director subscribes, and the voice switch arrives from the server a moment later. The director now narrates an intro already on screen at start-up and when the voice gets switched on (once per `shownAt`).
- Opening: series start (round 1, 0-0) gets a welcome line, later rounds a matchup line; then the star duel from the card (`utils/introStar.ts`, shared with the card) with its exact chat commands. When the card closes, unread intro lines are dropped, the current one finishes, then "Xung trận!".
- Ending (victory screen, P1 sequence, TTL 45 s): round winner (damage leader) → viewer MVP → final blow → pro MVP → top-3 thanks; series end adds champion, thanks and the next queued matchup. The next intro clears what is left. Catalogue: 38 signals.
- Observed: the free Google voice is slow (a 12-word line takes ~8 s), so only two intro lines fit the 15 s card; Azir/Ahri commands are in the second. Azure (+12 % rate) would fit more.
