---
goal: Make the game safe to run on a real TikTok Live (Option A) and add retention features (Option B)
stack: pnpm monorepo — client (React 19 + R3F + zustand), admin (React), server (Node + socket.io)
status: implemented (browser checks pending)
date: 2026-11-13
decisions:
  storage: JSON files on the server (reuse jsonFileStore pattern)
  admin_auth: ADMIN_TOKEN env var on server; admin/overlay send it in the socket handshake
  quests: likes, summons, gift coins (all three)
---

# Live hardening + viewer engagement

## Phase -1 · Context (what exists today)
- Server: express + socket.io, `cors: '*'`, 22 `admin:*` socket events and POST `/api/*` config routes, **no auth**.
- TikTok: `tiktokConnectionService.ts` connects once; **no reconnect** when the live drops.
- Match state (boss HP, BO score, round, team damage) lives only in the overlay browser (zustand). OBS reload = state lost.
- Damage is computed on the client; the server only sees TikTok events.
- Victory screen already has `VictoryMvpCard` (top 1). Chat already says "Lượt #N" when a summon is queued.
- No tests; load profile done for ≤ 300 champions × 8 s only.

## Phase 0 · Decisions (answered)
| Question | Answer |
|---|---|
| Player profile storage | JSON file on server, debounced writes |
| Admin auth | `ADMIN_TOKEN` env; empty = dev mode (allow all, log a warning) |
| Community quests | likes, summons, gift coins — per team, reset every round |

## Contracts (shared by all tasks — do not change names)
| Item | Value |
|---|---|
| Handshake | `io(url, { auth: { adminToken } })`; server sets `socket.data.isAdmin` |
| Guard | every inbound event starting with `admin:` requires `isAdmin`; rejected → emit `server:auth-error { event }` to that socket |
| REST guard | POST/PUT/DELETE under `/api/*` require header `x-admin-token` |
| CORS | `ALLOWED_ORIGINS` env (comma list); empty = `*` (dev) |
| Client token source | `localStorage['lol_admin_token']`, or `?adminToken=` in the URL (saved, then stripped from the address bar) |
| TikTok status | existing `tiktok:status` gains states `RECONNECTING` + fields `attempt`, `nextRetryAt` |
| Round result | client → server `game:round-result { roundId, winnerTeam, seriesFormat, isSeriesEnd, players: [{ userName, team, damage }] }` (top 50 by damage) |
| Leaderboard | server → all `game:player-leaderboard { weekly: Entry[], monthly: Entry[], allTime: Entry[] }`, Entry = `{ userName, totalDamage, mvpCount, roundsPlayed }`, top 10 each; also `GET /api/player-leaderboard` |
| Snapshot | client `localStorage['lol_match_snapshot_v1']`, restored when teams match and age < 30 min |

## Task breakdown

### A — Hardening
| # | Task | Agent | Files | Done when |
|---|---|---|---|---|
| A1 | Admin auth middleware (socket + REST), CORS allow-list from env | backend-specialist, security-auditor | `server/src/index.ts`, new `server/src/security/adminAuth.ts`, `server/.env.example` | non-admin `admin:*` emit is rejected; REST POST without header → 401 |
| A2 | Admin portal sends token; token entry UI + "unauthorized" banner | frontend-specialist | `admin/src/services/socket.ts`, new token gate component | admin works only with valid token |
| A3 | Overlay client sends token (in-game admin modal); read-only overlay works without it | frontend-specialist | `client/src/services/socket.ts`, i18n | OBS overlay with no token still receives everything |
| A4 | TikTok auto-reconnect with exponential backoff (1s → 60s cap, jitter), stop on manual disconnect, status shown in admin | backend-specialist | `server/src/services/tiktokConnectionService.ts`, admin TikTok panel | simulated drop reconnects; admin shows RECONNECTING + attempt |
| A5 | Match snapshot save (every 5 s + on round end) and restore on load | game-developer | new `client/src/store/matchSnapshot.ts`, `App.tsx` | reload mid-round restores HP, BO score, round, theme, team damage |
| A6 | Soak test script (bot at high speed, logs heap / FPS / draw calls per minute to CSV) | performance-optimizer, test-engineer | new `scripts/soak/soak-test.mjs`, `scripts/soak/README.md` | 2 h run produces CSV; heap growth < 20 % after warm-up |

### B — Engagement
| # | Task | Agent | Files | Done when |
|---|---|---|---|---|
| B1 | Player profile store + weekly/monthly/all-time buckets, debounced JSON persistence | backend-specialist | new `server/src/services/playerProfileService.ts`, `server/src/storage/playerProfileStore.ts`, socket + REST | round results accumulate, survive restart |
| B2 | Client emits `game:round-result` at each round end (top 50 damage) | game-developer | `client/src/store/slices/combatSlice.ts` (round end), `client/src/services/socket.ts` | server log shows result per round |
| B3 | Victory podium top 3 (avatar, damage, team) + optional TTS shout-out + weekly leaderboard panel | frontend-specialist | `client/src/components/ui/victory/*`, i18n | podium visible on round end; leaderboard from server |
| B4 | Community quests: per-team progress for likes / summons / coins; rewards: likes → full fury for the team's pros, summons → +25 % damage 15 s, coins → meteor strike on boss | game-developer | new `client/src/store/communityQuests.ts`, new HUD component, `constants/game.ts`, i18n | bars fill, reward fires once per tier, resets each round |
| B5 | Queue position HUD: per-team queue length + next names; chat reply already has "Lượt #N" | frontend-specialist | new HUD component near team blocks | queue count updates live |

## Order & parallelism
1. Server batch (A1, A4, B1) — one agent.
2. Admin + client socket batch (A2, A3, B2 emit) — one agent, after contracts are fixed (they are, above).
3. Client gameplay/UI batch (A5, B3, B4, B5) — main session.
4. A6 soak script, then Phase X.

## Phase X · Verification
- [x] `npx tsc --noEmit -p .` clean in client, admin, server; `npx vite build` client + admin.
- [x] Auth: admin emit without token rejected; with token accepted; overlay without token renders and receives events.
- [x] Reconnect: forced disconnect → RECONNECTING → CONNECTED.
- [ ] Snapshot: reload mid-round restores state.
- [x] Round result reaches server; `data/player_profiles.json` written; leaderboard visible on victory screen.
- [ ] Quests fill and reward once; queue HUD updates.
- [ ] Soak run CSV produced (short 5 min run in CI-less verification; full 2 h by operator).
- [ ] Clean-code checklist (no magic values, no nested ternaries, i18n keys in vi + en).

## Result notes
- Server auth / reconnect / profiles verified with a live server run (REST 401/200, socket reject without disconnect, round-result recorded, backoff 1→2→4→8 s, no retry after manual stop).
- Round result now sends full per-round damage (top 50) via `store/roundDamageTracker.ts`.
- Not yet run in a browser: snapshot restore, quests HUD, queue HUD, podium. Soak test script ready, not run.
