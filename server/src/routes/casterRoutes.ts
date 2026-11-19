import type { Express } from 'express';
import type { Server } from 'socket.io';
import { CASTER_TTS, CASTER_TTS_FAILURE, CASTER_TTS_HTTP_STATUS, CASTER_TTS_WARM } from '../constants/casterTts.js';
import { CasterTtsService } from '../services/caster/casterTtsService.js';

/**
 * Overlay → server: `caster:warm` { lang, texts } asks for lines to be generated ahead of time.
 * Open to every socket like the TTS route itself; texts are length-checked, filtered and rate-limited.
 */
export function registerCasterSocketHandlers(io: Server, casterTts: CasterTtsService): void {
  io.on('connection', (socket) => {
    socket.on(CASTER_TTS_WARM.SOCKET_EVENT, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const { texts, lang, role } = payload as Record<string, unknown>;
      casterTts.warm(texts, lang, role);
    });
  });
}

/** GET /api/caster/tts?text=...&lang=vi&role=male&intensity=hype → audio/mpeg for one caster line. */
export function registerCasterRoutes(app: Express, casterTts: CasterTtsService): void {
  app.get(CASTER_TTS.ROUTE, async (req, res) => {
    const requestedText = String(req.query.text || '');
    const requestedRole = req.query.role ? String(req.query.role) : undefined;
    console.log(`[CasterTTS] Req: text="${requestedText}" role=${requestedRole ?? 'default'} lang=${req.query.lang}`);
    const result = await casterTts.synthesize(req.query.text, req.query.lang, {
      role: req.query.role,
      intensity: req.query.intensity,
      rate: req.query.rate,
      pitch: req.query.pitch,
    });
    if (result.audio) {
      res.set('Content-Type', CASTER_TTS.AUDIO_CONTENT_TYPE);
      res.set('Cache-Control', CASTER_TTS.CACHE_CONTROL);
      res.set(
        CASTER_TTS.VOICE_HEADER,
        result.isPrimaryVoice ? CASTER_TTS.VOICE_HEADER_PRIMARY : CASTER_TTS.VOICE_HEADER_FALLBACK
      );
      res.send(result.audio);
      return;
    }
    const failure = result.failure ?? CASTER_TTS_FAILURE.PROVIDER_ERROR;
    res.status(CASTER_TTS_HTTP_STATUS[failure]).json({ error: failure, provider: casterTts.providerName });
  });
}
