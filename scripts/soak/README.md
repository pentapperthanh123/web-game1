# Soak test

Runs the game overlay in headless Chrome with the viewer bot at high speed and writes one CSV row per minute
(heap MB, FPS, draw calls per frame, champions on the field, queued summons, store updates).

```bash
pnpm dev:client                     # terminal 1 — do not edit files while the soak runs
node scripts/soak/soak-test.mjs --minutes 120 --bot-ms 150    # terminal 2
```

Options: `--minutes`, `--url` (default `http://127.0.0.1:8000/`), `--bot-ms` (bot interval). Env `CHROME_PATH` overrides Chrome.

## Reading the CSV
- **Leak:** `heapMb` keeps rising after the first ~10 minutes (pass: < 20 % growth from minute 10 to the end).
- **Decay:** `fps` drifting down while `champions` is flat.
- Headless Chrome renders with software GL, so absolute FPS is low; compare trends, and `drawCallsPerFrame`.
- For real FPS run on the stream PC: remove `--headless=new` from the script.
