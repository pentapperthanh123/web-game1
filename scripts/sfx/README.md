# Bundled sound effects

The game plays every sound from `client/public/sfx/<EVENT>.mp3` first (same origin → Web Audio, low latency,
cannot be blocked by an outside host). The original myinstants.com URL and a synthesised fallback stay behind it
(see `SFX_DEFINITIONS` in `client/src/constants/sfx.ts`), so a missing file never means silence on stream.

```bash
node scripts/sfx/download-sfx.mjs           # fetch missing files (+ --force to refetch all), writes manifest.json
node scripts/sfx/normalize-sfx.mjs          # ffmpeg: -16 LUFS, -1 dBTP, trim leading silence, cap length
```

Run normalize **once** after a download (re-running re-encodes again). Length caps: VIEWER 0.6 s, COMBAT 1.5 s,
BOSS 3 s, STINGER 4 s; VICTORY / DEFEAT / ROUND_START keep their full length.

## Licensing — decide before a commercial live
Myinstants files are user uploads with **unknown rights**. To swap one for a licensed sound:
1. Put the new file at `client/public/sfx/<EVENT>.mp3` (same name), or change the first `fromMyinstants(...)` of that
   event in `client/src/constants/sfx.ts` and run the two scripts again.
2. Avoid recognisable game announcer lines and copyrighted music (e.g. "pentakill", Final Fantasy fanfare).

`manifest.json` records the source URL of every bundled file (its sha1 is of the downloaded original, before normalising).
