# Bundled sound effects

The game plays every sound from `client/public/sfx/<EVENT>.mp3` first (same origin → Web Audio, low latency,
cannot be blocked by an outside host). The original myinstants.com URL and a synthesised fallback stay behind it
(see `SFX_DEFINITIONS` in `client/src/constants/sfx.ts`), so a missing file never means silence on stream.

```bash
node scripts/sfx/download-sfx.mjs           # fetch missing files (+ --force to refetch all), writes manifest.json
node scripts/sfx/normalize-sfx.mjs          # ffmpeg: -16 LUFS, -1 dBTP, trim leading silence, cap length
```

Swapping a few sounds? Pass their event names so only those are refetched and re-encoded:

```bash
node scripts/sfx/download-sfx.mjs BOSS_ROAR BOSS_SWEEP
node scripts/sfx/normalize-sfx.mjs BOSS_ROAR BOSS_SWEEP
```

Run normalize **once** per downloaded file (re-running re-encodes again). Fade-out: 0.35 s for BOSS, 0.5 s for STINGER. Length caps: VIEWER 0.6 s, COMBAT 1.5 s,
BOSS 3 s, STINGER 4 s; VICTORY / DEFEAT / ROUND_START keep their full length.

## Licensing — decide before a commercial live
Myinstants files are user uploads with **unknown rights**. To swap one for a licensed sound:
1. Put the new file at `client/public/sfx/<EVENT>.mp3` (same name), or change the first `fromMyinstants(...)` of that
   event in `client/src/constants/sfx.ts` and run the two scripts again.
2. Avoid recognisable game announcer lines and copyrighted music (e.g. "pentakill", Final Fantasy fanfare).

## Boss voices
Each boss has its own roar and enrage scream (`BOSS_VOICE_SFX` in `constants/sfx.ts`; Baron uses `BOSS_ROAR` / `BOSS_ENRAGE`).
Skill layers are shared and pitched by the theme's `audioPitchRate`. Audition everything at
`http://localhost:8000/diagnostics/sfx-audition.html` (the "Bản cũ" toggle plays the pre-swap files).

`manifest.json` records the source URL of every bundled file (its sha1 is of the downloaded original, before normalising).
