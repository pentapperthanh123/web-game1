import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ViteDevServerLike {
  middlewares: {
    use: (
      route: string,
      handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>
    ) => void;
  };
}

export interface DrinkBarViteTtsPlugin {
  name: string;
  configureServer: (server: ViteDevServerLike) => void;
}

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url));
const CAFE_BGM_FILE_PATH = path.resolve(SHARED_DIR, '../client/public/audio/cafe-bgm.mp3');

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_CACHE_ENTRIES = 60;
const MAX_TEXT_CHARS = 180;
const FETCH_TIMEOUT_MS = 6000;

const ttsAudioCache = new Map<string, Buffer>();

function storeCachedAudio(cacheKey: string, audio: Buffer): void {
  if (ttsAudioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) {
      ttsAudioCache.delete(oldestKey);
    }
  }
  ttsAudioCache.set(cacheKey, audio);
}

/**
 * Serves Google Translate TTS ("Chị Google") on `/api/tts` during local Vite dev
 * even when the Core backend on port 4000 is not running.
 */
export function drinkBarGoogleTtsPlugin(): DrinkBarViteTtsPlugin {
  return {
    name: 'drink-bar-google-tts-middleware',
    configureServer(server) {
      server.middlewares.use('/audio/cafe-bgm.mp3', (req, res, next) => {
        if (req.method !== 'GET' || !existsSync(CAFE_BGM_FILE_PATH)) {
          next();
          return;
        }
        try {
          const stat = statSync(CAFE_BGM_FILE_PATH);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Cache-Control', 'public, max-age=86400');
          createReadStream(CAFE_BGM_FILE_PATH).pipe(res);
        } catch {
          next();
        }
      });

      server.middlewares.use('/api/tts', async (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        const rawUrl = req.url ?? '';
        const queryStr = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryStr);
        const text = (params.get('text') ?? '').trim();

        if (!text) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing required query parameter: text' }));
          return;
        }

        if (text.length > MAX_TEXT_CHARS) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Text exceeds ${MAX_TEXT_CHARS} characters` }));
          return;
        }

        const tl = params.get('tl') === 'en' ? 'en' : 'vi';
        const cacheKey = `${tl}:${text}`;
        const cached = ttsAudioCache.get(cacheKey);
        if (cached) {
          ttsAudioCache.delete(cacheKey);
          ttsAudioCache.set(cacheKey, cached);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(cached);
          return;
        }

        const upstreamUrl = `${GOOGLE_TTS_URL}?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(text)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const upstream = await fetch(upstreamUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': USER_AGENT,
              Referer: 'https://translate.google.com/',
            },
          });
          clearTimeout(timeout);

          if (!upstream.ok) {
            next();
            return;
          }

          const arrayBuffer = await upstream.arrayBuffer();
          const audio = Buffer.from(arrayBuffer);
          if (audio.length === 0) {
            next();
            return;
          }

          storeCachedAudio(cacheKey, audio);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(audio);
        } catch {
          clearTimeout(timeout);
          next();
        }
      });
    },
  };
}
