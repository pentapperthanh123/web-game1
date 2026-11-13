# LoL CKTG TikTok Live Game — Claude Code guide

Interactive TikTok Live overlay: viewers chat/gift to summon champions that fight a boss (BO1/BO3/BO5 series, two teams).
Shown in OBS as a portrait 9:16 page, so test layouts at ~480×860.

## Rules (binding)
@AGENTS.md

Agents/skills/memory live in `.agents/` (manifest: `.agents/.session/active-agents.json`, reload with `/reload`).
Slash commands in `.claude/commands/` are copies of `.agents/workflows/` — edit the workflow, then re-copy.

## Monorepo (pnpm)
| Package | Role | Port |
|---|---|---|
| `client/` | Game overlay: React 19 + react-three-fiber/three.js + zustand + Tailwind v4 (Vite 8) | 8000 |
| `admin/` | Admin portal (separate app, talks to server via socket; no i18n) | 8001 |
| `server/` | Node + socket.io hub, TikTok live connector, state relay | 4000 |

- Run all: `start.bat` or `pnpm dev:all`; one app: `pnpm dev:client` / `dev:admin` / `dev:server`.
- Verify: `npx tsc --noEmit -p .` inside each package, `npx vite build` in `client/`. There is no test suite.
- Windows + Git Bash/PowerShell. Python one-off edit scripts need `PYTHONUTF8=1` (files contain Vietnamese/emoji).

## Client map
- State: `client/src/store/` — zustand slices in `store/slices/*` (`combatSlice` = damage/fury/VFX, `summonSlice` = summons & turn queue, `bossSlice` = boss skills, `vfxPruneSlice` = periodic cleanup). Helpers: `summonQueueHelper.ts`, `hitFeedbackAggregator.ts`, `championshipTally.ts`.
- Constants: `client/src/constants/game.ts` (all tuning: `COMBAT_VFX_CONSTANTS`, `GAME_CONSTANTS`, `THEME_CONFIGS`), `bossSkills.ts`, `bossSkillEffects.ts`, `bossSkillVfx.ts`, `bossSpriteAnchors.ts`, `sfx.ts`.
- 3D: `components/canvas/` (champions in `summon/`, boss skills in `bossSkill/`, shield in `bossShield/`, meteors in `meteor/`). 2D boss + skill overlays: `components/arena/` (scenes in `arena/scenes/`).
- i18n: `client/src/i18n/messages/{vi,en}.json` — every new UI string goes in both.

## Gameplay invariants
- Arena floor is unlimited; the summon queue only paces entrances: `maxDeployPerTurn` champions per team per turn, `summonTurnDelayMs` between turns (`resolveSummonTurnLimits`). Same field name in client, admin and server.
- Boss is a 2D DOM sprite; 3D skill VFX get mouth/eye/core positions from invisible anchor markers (`BOSS_ANCHOR_ELEMENT_ID`) projected into 3D at cast time. Normal and enraged art have separate anchors and facing.
- Championship titles are counted per team-id pair and persisted in localStorage.

## Performance rules (crowds of 100–300 champions)
- Tokens face the camera: use `THREE.FrontSide` (DoubleSide transparent = 2 draw calls per mesh).
- Champion tokens get data via props; never add per-token `useGameStore` subscriptions.
- Per-frame code (`useFrame`, `stepChampionFrame`): no allocations, no string work; mutate cached objects.
- Don't rebuild the `minions` array per attack — batch per frame (see `scheduleFuryFlush`).
- On-screen VFX caps must drop new entries, not cut in-flight ones (`appendIfCapacity`); merge damage numbers instead of discarding them.
- Animate DOM/CSS layers with transform/opacity only.
