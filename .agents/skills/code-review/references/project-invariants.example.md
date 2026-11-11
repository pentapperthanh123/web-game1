# Project Invariants — Example (Media / Video Pipeline)

> **Optional.** Copy patterns into your app's `AGENTS.md` or `.agents/memory/` only if this domain applies.
> Do **not** treat these as universal AG Kit rules.

Use when reviewing FFmpeg / subtitle / video-job codebases.

| Area | Check |
|------|-------|
| FFmpeg render | Anti-copyright filterchain present; even dimensions via `trunc(iw/2)*2` |
| Subtitles | Reference dimensions (1080×1920 / 1920×1080 / 1080×1080), not raw video size |
| Translation | JSON 1-to-1 segments; no arbitrary merge/split |
| Job metadata | Segments/timeline cached in DB `metadata`; resume flags respected |
| External AI calls | Wrapped in `withRetry()` / equivalent backoff |
| File ops | Existence checks before FFmpeg; cleanup in `finally` |

Related examples may also appear in:

- [fastapi-python-guidelines.md](./fastapi-python-guidelines.md) (FFmpeg / asyncio)
- [nestjs-backend-guidelines.md](./nestjs-backend-guidelines.md) (queues, retries)
