# Unattended live operation

Tools for running the room 24/7 without a host. Spec: `docs/specs/2026-11-14-cktg-live-ops-spec.md`, plan: `docs/plans/2026-11-14-ai-caster-live-ops.md`.

## Auto-restart the server

```bat
scripts\ops\run-server-supervised.bat
```

- Builds `server/` once, then runs `node dist/index.js` in a loop. If the process exits for any reason, it starts again after 3 s.
- Start/exit times go to `server/data/supervisor.log`.
- The overlay (OBS) and admin portal reconnect by themselves; the overlay restores its match snapshot.
- Close the window to stop. Run the client and admin as usual (`pnpm dev:client`, `pnpm dev:admin`) or from their builds.

## Operator alerts (Telegram)

Set in `server/.env` (see `server/.env.example`):

| Variable | Meaning |
|---|---|
| `OPS_ALERT_TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `OPS_ALERT_TELEGRAM_CHAT_ID` | Chat / group id that receives alerts |
| `OPS_ALERT_INSTANCE_NAME` | Label at the start of each message |

With both values empty the server only logs alerts (`[OpsAlert] ...`). Use **Live Ops → Gửi tin thử** in the admin portal to check the setup.

Alerts sent:

| When | Alert |
|---|---|
| Server starts (also after an automatic restart) | `SERVER_START` |
| TikTok disconnected for more than 5 min (reconnect keeps running) | `TIKTOK_DOWN_LONG`, then `TIKTOK_RECOVERED` when back |
| TikTok reports the live has ended | `STREAM_END` |

The same kind is not repeated within 10 min. Disconnection windows are logged to `server/data/connection_gaps.json` so lost gifts can be reconciled against TikTok's revenue report.

## Moderation data

- `server/data/moderation.json`: blocked terms and chat aliases. Created from a small seed list on first start; edit from **Live Ops** in the admin portal (changes apply immediately, no restart).
- `server/data/live_ops_config.json`: summon chat limits and caster switches.

## TTS probe for OBS (spike S1)

Open `http://localhost:8000/diagnostics/tts-probe.html` as an OBS Browser Source (or in OBS → Interact) on the streaming PC. It lists the voices OBS's browser engine exposes, checks for a Vietnamese voice and measures how long speech takes to start.
