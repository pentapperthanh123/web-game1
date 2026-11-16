import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CASTER_TTS,
  CASTER_TTS_DISK_CACHE,
  CASTER_TTS_FAILURE,
  CASTER_TTS_LANG,
  CASTER_TTS_WARM,
  CasterTtsFailure,
  CasterTtsLang,
  CasterTtsProviderName,
  EDGE_TTS,
} from '../../constants/casterTts.js';
import { CasterConfig } from '../../constants/liveOps.js';
import { getErrorMessage } from '../../utils/payloadSanitizers.js';
import { TtsProvider, TtsProviderChain } from './ttsProviders.js';

export interface CasterTtsResult {
  audio?: Buffer;
  /** True when the clip came from the primary voice (Edge / Azure), false for the fallback voice. */
  isPrimaryVoice?: boolean;
  failure?: CasterTtsFailure;
}

export interface CasterTtsService {
  providerName: CasterTtsProviderName;
  fallbackName: CasterTtsProviderName | null;
  synthesize(rawText: unknown, rawLang: unknown): Promise<CasterTtsResult>;
  /** Queues untrusted texts for background generation; returns how many were newly queued. */
  warm(rawTexts: unknown, rawLang: unknown): number;
}

interface CasterTtsDeps {
  providers: TtsProviderChain;
  getCasterConfig: () => CasterConfig;
  /** Defence in depth: lines are built from templates, but nothing blocked may ever be spoken. */
  containsBlocked: (text: string) => boolean;
  serverRoot: string;
}

interface CachedClip {
  audio: Buffer;
  isPrimaryVoice: boolean;
  /** Already persisted (loaded from disk): no need to write it again. */
  isOnDisk?: boolean;
}

const LOG_PREFIX = '[CasterTTS]';
const UNKNOWN_ERROR = 'unknown error';
const WHITESPACE_RUN = /\s+/g;
const SUPPORTED_LANGS = new Set<string>(Object.values(CASTER_TTS_LANG));

const normalizeText = (rawText: unknown): string | null => {
  if (typeof rawText !== 'string') return null;
  const text = rawText.replace(WHITESPACE_RUN, ' ').trim();
  if (!text || text.length > CASTER_TTS.MAX_TEXT_CHARS) return null;
  return text;
};

const normalizeLang = (rawLang: unknown): CasterTtsLang =>
  typeof rawLang === 'string' && SUPPORTED_LANGS.has(rawLang) ? (rawLang as CasterTtsLang) : CASTER_TTS.DEFAULT_LANG;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Primary-voice clips on disk, oldest evicted first. */
const createDiskCache = (serverRoot: string, provider: TtsProvider) => {
  const dir = path.join(serverRoot, CASTER_TTS_DISK_CACHE.DIR);
  mkdirSync(dir, { recursive: true });
  const fileOrder = readdirSync(dir).filter((name) => name.endsWith(CASTER_TTS_DISK_CACHE.EXTENSION));
  // key is `${lang}|${text}`; the voice tag makes a voice change start a fresh set of clips
  const fileFor = (key: string): string => {
    const lang = key.slice(0, key.indexOf('|')) as CasterTtsLang;
    const hash = createHash('sha1').update(`${provider.voiceTag(lang)}|${key}`).digest('hex');
    return `${hash}${CASTER_TTS_DISK_CACHE.EXTENSION}`;
  };

  return {
    has: (key: string): boolean => existsSync(path.join(dir, fileFor(key))),
    read: async (key: string): Promise<Buffer | null> => {
      const filePath = path.join(dir, fileFor(key));
      if (!existsSync(filePath)) return null;
      return readFile(filePath).catch(() => null);
    },
    write: async (key: string, audio: Buffer): Promise<void> => {
      const fileName = fileFor(key);
      try {
        await writeFile(path.join(dir, fileName), audio);
        fileOrder.push(fileName);
        while (fileOrder.length > CASTER_TTS_DISK_CACHE.MAX_FILES) {
          const oldest = fileOrder.shift();
          if (oldest) await rm(path.join(dir, oldest), { force: true });
        }
      } catch (error) {
        console.warn(`${LOG_PREFIX} disk cache write failed: ${getErrorMessage(error, UNKNOWN_ERROR)}`);
      }
    },
  };
};

export const createCasterTtsService = ({
  providers,
  getCasterConfig,
  containsBlocked,
  serverRoot,
}: CasterTtsDeps): CasterTtsService => {
  const { primary, fallback } = providers;
  const clipCache = new Map<string, CachedClip>();
  const inFlight = new Map<string, Promise<CachedClip>>();
  const upgradesInFlight = new Set<string>();
  const upgradeQueue: Array<{ key: string; text: string; lang: CasterTtsLang }> = [];
  const diskCache = createDiskCache(serverRoot, primary);
  let providerCallTimes: number[] = [];

  const rememberClip = (key: string, clip: CachedClip): void => {
    clipCache.delete(key);
    if (clipCache.size >= CASTER_TTS.MAX_CACHED_CLIPS) {
      const oldestKey = clipCache.keys().next().value;
      if (oldestKey !== undefined) clipCache.delete(oldestKey);
    }
    clipCache.set(key, clip);
    if (clip.isPrimaryVoice && !clip.isOnDisk) void diskCache.write(key, clip.audio);
  };

  const isRateLimited = (now: number): boolean => {
    providerCallTimes = providerCallTimes.filter((time) => now - time < CASTER_TTS.RATE_WINDOW_MS);
    return providerCallTimes.length >= CASTER_TTS.MAX_PROVIDER_CALLS_PER_WINDOW;
  };

  const callProvider = (provider: TtsProvider, text: string, lang: CasterTtsLang, timeoutMs?: number): Promise<Buffer> => {
    providerCallTimes.push(Date.now());
    return provider.synthesize(text, lang, timeoutMs);
  };

  const upgradeOne = async (key: string, text: string, lang: CasterTtsLang): Promise<void> => {
    for (let attempt = 1; attempt <= EDGE_TTS.UPGRADE_ATTEMPTS; attempt += 1) {
      try {
        const audio = await callProvider(primary, text, lang, EDGE_TTS.UPGRADE_TIMEOUT_MS);
        rememberClip(key, { audio, isPrimaryVoice: true });
        return;
      } catch {
        await wait(EDGE_TTS.UPGRADE_RETRY_DELAY_MS);
      }
    }
  };

  /** Runs queued upgrades with a small worker pool. */
  const drainUpgrades = (): void => {
    while (upgradesInFlight.size < EDGE_TTS.MAX_PARALLEL_UPGRADES && upgradeQueue.length > 0) {
      const job = upgradeQueue.shift();
      if (!job) return;
      upgradesInFlight.add(job.key);
      void upgradeOne(job.key, job.text, job.lang).finally(() => {
        upgradesInFlight.delete(job.key);
        drainUpgrades();
      });
    }
  };

  /** After a fallback answer, keep trying the primary voice so the next time this line sounds right. */
  const scheduleUpgrade = (key: string, text: string, lang: CasterTtsLang): void => {
    const isKnown = upgradesInFlight.has(key) || upgradeQueue.some((job) => job.key === key);
    if (isKnown || upgradeQueue.length >= EDGE_TTS.MAX_QUEUED_UPGRADES) return;
    upgradeQueue.push({ key, text, lang });
    drainUpgrades();
  };

  /**
   * Only one voice: start a second attempt if the first is slow and take whichever answers first.
   * Gives up at LIVE_DEADLINE_MS (the overlay then shows the caption); a late answer is still cached.
   */
  const hedgedPrimary = (key: string, text: string, lang: CasterTtsLang): Promise<Buffer> =>
    new Promise<Buffer>((resolve, reject) => {
      let isSettled = false;
      let failedAttempts = 0;
      const totalAttempts = 2;
      const settle = (audio: Buffer | null, error?: unknown): void => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(hedgeTimer);
        clearTimeout(deadlineTimer);
        if (audio) resolve(audio);
        else reject(error instanceof Error ? error : new Error(UNKNOWN_ERROR));
      };
      const attempt = (): void => {
        callProvider(primary, text, lang, EDGE_TTS.TIMEOUT_MS)
          .then((audio) => {
            if (isSettled) rememberClip(key, { audio, isPrimaryVoice: true });
            settle(audio);
          })
          .catch((error: unknown) => {
            failedAttempts += 1;
            if (failedAttempts >= totalAttempts) settle(null, error);
          });
      };
      const hedgeTimer = setTimeout(attempt, EDGE_TTS.HEDGE_DELAY_MS);
      const deadlineTimer = setTimeout(() => {
        scheduleUpgrade(key, text, lang);
        settle(null, new Error(`no answer within ${EDGE_TTS.LIVE_DEADLINE_MS} ms`));
      }, EDGE_TTS.LIVE_DEADLINE_MS);
      attempt();
    });

  /**
   * Primary and fallback are requested together. The primary voice wins if it answers within the grace
   * period; otherwise the fallback answers right away and the primary clip is cached when it lands
   * (or retried in the background), so latency stays at the fallback's while quality catches up.
   */
  const produceClip = async (key: string, text: string, lang: CasterTtsLang): Promise<CachedClip> => {
    const fromDisk = await diskCache.read(key);
    if (fromDisk) return { audio: fromDisk, isPrimaryVoice: true, isOnDisk: true };
    if (!fallback) return { audio: await hedgedPrimary(key, text, lang), isPrimaryVoice: true };

    const primaryRequest = callProvider(primary, text, lang, EDGE_TTS.TIMEOUT_MS);
    const fallbackRequest = callProvider(fallback, text, lang);
    // Never leave a rejection unhandled: each request is awaited or chained below
    fallbackRequest.catch(() => undefined);

    const earlyPrimary = await Promise.race([
      primaryRequest.then((audio) => audio, () => null),
      wait(EDGE_TTS.PRIMARY_GRACE_MS).then(() => null),
    ]);
    if (earlyPrimary) return { audio: earlyPrimary, isPrimaryVoice: true };

    primaryRequest
      .then((audio) => rememberClip(key, { audio, isPrimaryVoice: true }))
      .catch(() => scheduleUpgrade(key, text, lang));
    try {
      return { audio: await fallbackRequest, isPrimaryVoice: false };
    } catch (fallbackError) {
      // Both slow paths: wait for the primary after all rather than staying silent
      console.warn(`${LOG_PREFIX} ${fallback.name} failed: ${getErrorMessage(fallbackError, UNKNOWN_ERROR)}`);
      return { audio: await primaryRequest, isPrimaryVoice: true };
    }
  };

  /** One shared request per line: live calls and warm-up of the same text never hit the provider twice. */
  const obtainClip = (key: string, text: string, lang: CasterTtsLang): Promise<CachedClip> => {
    const pending = inFlight.get(key);
    if (pending) return pending;
    const request = produceClip(key, text, lang).then((clip) => {
      // An upgrade may already have stored the primary voice while the fallback was answering
      if (!clipCache.get(key)?.isPrimaryVoice) rememberClip(key, clip);
      return clip;
    });
    inFlight.set(key, request);
    void request.catch(() => undefined).finally(() => inFlight.delete(key));
    return request;
  };

  const isAlreadyAvailable = (key: string): boolean => clipCache.has(key) || inFlight.has(key) || diskCache.has(key);

  // ── Warm-up queue ──────────────────────────────────────────────────────
  const warmQueue: Array<{ key: string; text: string; lang: CasterTtsLang }> = [];
  const warmKeys = new Set<string>();
  let warmTimer: ReturnType<typeof setTimeout> | null = null;

  const hasLiveHeadroom = (now: number): boolean => {
    providerCallTimes = providerCallTimes.filter((time) => now - time < CASTER_TTS.RATE_WINDOW_MS);
    return providerCallTimes.length < CASTER_TTS.MAX_PROVIDER_CALLS_PER_WINDOW - CASTER_TTS_WARM.LIVE_HEADROOM_CALLS;
  };

  const runNextWarm = (): void => {
    warmTimer = null;
    if (!getCasterConfig().isTtsEnabled) {
      warmQueue.length = 0;
      warmKeys.clear();
      return;
    }
    if (hasLiveHeadroom(Date.now())) {
      const job = warmQueue.shift();
      if (job) {
        warmKeys.delete(job.key);
        if (!isAlreadyAvailable(job.key)) {
          void obtainClip(job.key, job.text, job.lang).catch((error: unknown) =>
            console.warn(`${LOG_PREFIX} warm-up failed: ${getErrorMessage(error, UNKNOWN_ERROR)}`)
          );
        }
      }
    }
    if (warmQueue.length > 0) warmTimer = setTimeout(runNextWarm, CASTER_TTS_WARM.MIN_INTERVAL_MS);
  };

  const warm = (rawTexts: unknown, rawLang: unknown): number => {
    if (!getCasterConfig().isTtsEnabled || !Array.isArray(rawTexts)) return 0;
    const lang = normalizeLang(rawLang);
    let queued = 0;
    for (const rawText of rawTexts.slice(0, CASTER_TTS_WARM.MAX_TEXTS_PER_REQUEST)) {
      if (warmQueue.length >= CASTER_TTS_WARM.MAX_QUEUED) break;
      const text = normalizeText(rawText);
      if (!text || containsBlocked(text)) continue;
      const key = `${lang}|${text}`;
      if (warmKeys.has(key) || isAlreadyAvailable(key)) continue;
      warmKeys.add(key);
      warmQueue.push({ key, text, lang });
      queued += 1;
    }
    if (queued > 0 && !warmTimer) warmTimer = setTimeout(runNextWarm, 0);
    return queued;
  };

  const synthesize = async (rawText: unknown, rawLang: unknown): Promise<CasterTtsResult> => {
    if (!getCasterConfig().isTtsEnabled) return { failure: CASTER_TTS_FAILURE.DISABLED };
    const text = normalizeText(rawText);
    if (!text) return { failure: CASTER_TTS_FAILURE.INVALID_TEXT };
    if (containsBlocked(text)) return { failure: CASTER_TTS_FAILURE.BLOCKED_TEXT };

    const lang = normalizeLang(rawLang);
    const key = `${lang}|${text}`;
    const cached = clipCache.get(key);
    if (cached) return { audio: cached.audio, isPrimaryVoice: cached.isPrimaryVoice };

    const isNewRequest = !inFlight.has(key) && !diskCache.has(key);
    if (isNewRequest && isRateLimited(Date.now())) return { failure: CASTER_TTS_FAILURE.RATE_LIMITED };
    const pending = obtainClip(key, text, lang);
    try {
      const clip = await pending;
      return { audio: clip.audio, isPrimaryVoice: clip.isPrimaryVoice };
    } catch (error) {
      console.warn(`${LOG_PREFIX} no voice available: ${getErrorMessage(error, UNKNOWN_ERROR)}`);
      return { failure: CASTER_TTS_FAILURE.PROVIDER_ERROR };
    }
  };

  return { providerName: primary.name, fallbackName: fallback?.name ?? null, synthesize, warm };
};
