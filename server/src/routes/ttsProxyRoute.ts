import type { Express } from 'express';
import type { CasterTtsService } from '../services/caster/casterTtsService.js';
import { CASTER_VOICE_ROLE } from '../constants/casterTts.js';

const TTS_PROXY = {
  ROUTE: '/api/tts',
  MAX_TEXT_CHARS: 180,
  MAX_CACHE_ENTRIES: 50,
  GOOGLE_TTS_URL: 'https://translate.google.com/translate_tts',
  CONTENT_TYPE: 'audio/mpeg',
  CACHE_CONTROL: 'public, max-age=86400',
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  FETCH_TIMEOUT_MS: 8000,
} as const;

const LOG_PREFIX = '[TTS Proxy]';

/** Simple LRU cache: Map insertion order + evict-oldest on overflow. */
const audioCache = new Map<string, Buffer>();

function evictIfFull(): void {
  if (audioCache.size < TTS_PROXY.MAX_CACHE_ENTRIES) return;
  const oldestKey = audioCache.keys().next().value as string;
  audioCache.delete(oldestKey);
}

export function registerTtsProxyRoute(app: Express, casterTts?: CasterTtsService): void {
  app.get(TTS_PROXY.ROUTE, async (req, res) => {
    const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';

    if (!text) {
      res.status(400).json({ error: 'Missing required query parameter: text' });
      return;
    }
    if (text.length > TTS_PROXY.MAX_TEXT_CHARS) {
      res.status(400).json({ error: `Text exceeds ${TTS_PROXY.MAX_TEXT_CHARS} characters` });
      return;
    }

    // Cache hit — move to end (refresh LRU position)
    const cached = audioCache.get(text);
    if (cached) {
      audioCache.delete(text);
      audioCache.set(text, cached);
      res.set('Content-Type', TTS_PROXY.CONTENT_TYPE);
      res.set('Cache-Control', TTS_PROXY.CACHE_CONTROL);
      res.send(cached);
      return;
    }

    // Attempt primary synthesis via CasterTts (ElevenLabs, disk cache, etc.)
    if (casterTts) {
      try {
        const role = req.query.role === 'female' ? CASTER_VOICE_ROLE.FEMALE : CASTER_VOICE_ROLE.MALE;
        const result = await casterTts.synthesize(text, 'vi', { role });
        if (result.audio) {
          evictIfFull();
          audioCache.set(text, result.audio);
          res.set('Content-Type', TTS_PROXY.CONTENT_TYPE);
          res.set('Cache-Control', TTS_PROXY.CACHE_CONTROL);
          res.send(result.audio);
          return;
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Caster TTS synthesis failed, trying Google fallback:`, err);
      }
    }

    // Fallback to Google Translate TTS
    const url = `${TTS_PROXY.GOOGLE_TTS_URL}?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(text)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TTS_PROXY.FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': TTS_PROXY.USER_AGENT,
          Referer: 'https://translate.google.com/',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`${LOG_PREFIX} Google returned ${response.status} for "${text.slice(0, 40)}…"`);
        res.status(502).json({ error: 'TTS upstream error', upstream: response.status });
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);

      evictIfFull();
      audioCache.set(text, audio);

      res.set('Content-Type', TTS_PROXY.CONTENT_TYPE);
      res.set('Cache-Control', TTS_PROXY.CACHE_CONTROL);
      res.send(audio);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Fetch failed: ${message}`);
      res.status(502).json({ error: 'TTS fetch failed', detail: message });
    }
  });

  console.log(`${LOG_PREFIX} Registered ${TTS_PROXY.ROUTE}`);
}
