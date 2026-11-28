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
const AUDIO_SEARCH_DIRS: readonly string[] = [
  path.resolve(SHARED_DIR, '../admin/public/audio'),
  path.resolve(SHARED_DIR, '../client/public/audio'),
];

function resolveAudioFilePath(fileName: string): string | null {
  const safeName = path.basename(fileName);
  if (!safeName.endsWith('.mp3')) return null;
  for (const dir of AUDIO_SEARCH_DIRS) {
    const candidate = path.join(dir, safeName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_CACHE_ENTRIES = 240;
const MAX_TEXT_CHARS = 180;
const FETCH_TIMEOUT_MS = 6000;

const ttsAudioCache = new Map<string, Buffer>();
const inFlightTtsFetches = new Map<string, Promise<Buffer | null>>();
const sseSyncClients = new Set<ServerResponse>();
let latestSyncSnapshotPayload: string | null = null;

function broadcastToSseClients(rawJson: string): void {
  try {
    const parsed = JSON.parse(rawJson) as { type?: string };
    if (parsed.type === 'STATE_SNAPSHOT') {
      latestSyncSnapshotPayload = rawJson;
    }
  } catch {
    // Ignore parse check error
  }
  const frame = `data: ${rawJson}\n\n`;
  for (const client of sseSyncClients) {
    try {
      client.write(frame);
    } catch {
      sseSyncClients.delete(client);
    }
  }
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
      if (body.length > 512_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

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
      server.middlewares.use('/api/drinkbar-sync/events', (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.write(': connected\n\n');
        if (latestSyncSnapshotPayload) {
          res.write(`data: ${latestSyncSnapshotPayload}\n\n`);
        }
        sseSyncClients.add(res);
        req.on('close', () => {
          sseSyncClients.delete(res);
        });
      });

      server.middlewares.use('/api/drinkbar-sync/emit', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }
        try {
          const rawBody = await readRequestBody(req);
          if (rawBody) {
            broadcastToSseClients(rawBody);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ ok: true, listeners: sseSyncClients.size }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false }));
        }
      });

      server.middlewares.use('/audio', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }
        const rawUrl = (req.url ?? '').split('?')[0];
        const filePath = resolveAudioFilePath(rawUrl);
        if (!filePath) {
          next();
          return;
        }
        try {
          const stat = statSync(filePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          createReadStream(filePath).pipe(res);
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
        let pendingFetch = inFlightTtsFetches.get(cacheKey);
        if (!pendingFetch) {
          pendingFetch = (async (): Promise<Buffer | null> => {
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
              if (!upstream.ok) return null;
              const arrayBuffer = await upstream.arrayBuffer();
              const buf = Buffer.from(arrayBuffer);
              if (buf.length === 0) return null;
              storeCachedAudio(cacheKey, buf);
              return buf;
            } catch {
              clearTimeout(timeout);
              return null;
            } finally {
              inFlightTtsFetches.delete(cacheKey);
            }
          })();
          inFlightTtsFetches.set(cacheKey, pendingFetch);
        }

        const audio = await pendingFetch;
        if (!audio) {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(audio);
      });
    },
  };
}
