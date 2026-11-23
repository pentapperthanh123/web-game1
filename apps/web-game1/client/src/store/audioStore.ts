import { create } from 'zustand';
import { Howl } from 'howler';
import {
  AUDIO_STORE_CONSTANTS,
  STATIC_ALIAS_TO_SFX_EVENT,
  STATIC_SOUND_ALIAS,
  TTS_QUEUE_PRIORITY,
  type StaticSoundAlias,
  type StaticSoundName,
  type TtsQueuePriority,
} from '../constants/audioStore';
import { CASTER_SPEECH } from '../constants/caster';
import { SFX_DEFINITIONS, SFX_EVENT, type SfxEventName } from '../constants/sfx';
import { audioService } from '../services/audioService';
import { toVoiceText } from '../services/caster/casterVoiceText';
import { playSound, soundManager, stopSound, type PlaySoundOptions } from '../services/soundManager';

export interface PushTTSOptions {
  /** `'high'` unshifts to the front of `ttsQueue` (e.g. Donate / Critical alerts), playing right after the active clip ends. */
  priority?: TtsQueuePriority;
  /** Language code when `audioUrlOrText` is plain text (defaults to `'vi'`). */
  lang?: string;
  /** Caster voice role (`'male'` | `'female'`) when building `/api/caster/tts` URL. */
  role?: string;
  /** Caster intensity (`'normal'` | `'hype'` | `'climax'`) when building `/api/caster/tts` URL. */
  intensity?: string;
  /** Playback rate multiplier (defaults to `AUDIO_STORE_CONSTANTS.DEFAULT_TTS_RATE`). */
  rate?: number;
  /** Optional epoch ms deadline: speeds up playback rate (capped) so the clip finishes on time. */
  deadlineAt?: number;
  /** Callback fired at the exact moment Howler begins playing the TTS audio (used for subtitle sync). */
  onStart?: () => void;
  /** Callback fired when the TTS clip finishes (`true`) or is skipped due to error/interruption (`false`). */
  onEnd?: (didPlay: boolean) => void;
}

interface InternalTtsQueueEntry {
  id: number;
  url: string;
  priority: TtsQueuePriority;
  rate: number;
  deadlineAt?: number;
  onStart?: () => void;
  onEnd?: (didPlay: boolean) => void;
  resolve: (didPlay: boolean) => void;
}

export interface AudioStoreState {
  // ── 1. Static SFX State & Actions (0ms delay, preloaded) ──────────────────
  /** Dictionary of preloaded Howl instances keyed by alias (`game_start`, `boss_spawn`, `skill_cast`) and `SFX_EVENT`. */
  staticSounds: Readonly<Record<string, Howl>>;
  /** True once `initStaticSounds()` has preloaded the static sound dictionary. */
  isStaticReady: boolean;
  /** Preloads all static `.mp3` sounds into memory with `preload: true`. Safe to call multiple times. */
  initStaticSounds: () => void;
  /** Plays a preloaded static sound immediately (0ms latency). Supports aliases (`game_start`), `.mp3` names, or `SFX_EVENT`. */
  playStatic: (soundName: StaticSoundName, options?: PlaySoundOptions) => void;
  /** Stops all active voices of a specific static sound. */
  stopStatic: (soundName: StaticSoundName) => void;

  // ── 2. Dynamic TTS Queue State & Actions (Anti-overlap sequential queue) ──
  /** Ordered list of pending TTS audio URLs waiting to be spoken. */
  ttsQueue: string[];
  /** Mutex flag: `true` while a TTS clip is actively loading or playing via Howler. */
  isTTSPlaying: boolean;
  /** Reference to the currently active TTS `Howl` instance (null when idle). */
  activeTTSHowl: Howl | null;
  /** Enqueues a TTS audio URL or plain text string and triggers `processQueue()`. Resolves when finished or skipped. */
  pushTTS: (audioUrlOrText: string, options?: PushTTSOptions) => Promise<boolean>;
  /** Sequential queue processor: shifts the next URL when `isTTSPlaying === false` and chains via Howler `onend`. */
  processQueue: () => void;
  /** Stops the currently playing TTS clip and immediately advances to the next item in `ttsQueue`. */
  skipCurrentTTS: () => void;
  /** Clears all pending TTS items and stops any currently playing TTS clip. */
  clearTTSQueue: () => void;
}

const MP3_SUFFIX_PATTERN = /\.mp3$/i;
const DIRECT_AUDIO_URL_PATTERN = /^(https?:\/\/|blob:|data:|\/api\/|\/sfx\/|\/sounds\/)/i;

let nextTtsEntryId = 1;
const internalTtsQueue: InternalTtsQueueEntry[] = [];
let activeEntryFinalize: ((didPlay: boolean) => void) | null = null;

/**
 * Resolves a caller-supplied sound name (`'game_start'`, `'game_start.mp3'`, `'BOSS_ROAR'`)
 * to a canonical `SfxEventName` if one exists.
 */
export const resolveStaticSfxEvent = (soundName: StaticSoundName): SfxEventName | null => {
  const normalized = soundName.trim().replace(MP3_SUFFIX_PATTERN, '');
  if (!normalized) return null;

  const lowerKey = normalized.toLowerCase() as StaticSoundAlias;
  if (lowerKey in STATIC_ALIAS_TO_SFX_EVENT) {
    return STATIC_ALIAS_TO_SFX_EVENT[lowerKey];
  }

  const upperKey = normalized.toUpperCase() as SfxEventName;
  if (upperKey in SFX_DEFINITIONS) {
    return upperKey;
  }

  return null;
};

/**
 * Converts either a direct audio URL (`blob:...`, `/api/caster/tts?...`, `https://...`, `/*.mp3`)
 * or raw commentary text into a playable audio URL.
 */
export const resolveTtsAudioUrl = (audioUrlOrText: string, options?: PushTTSOptions): string => {
  const trimmed = audioUrlOrText.trim();
  if (!trimmed) return '';

  if (DIRECT_AUDIO_URL_PATTERN.test(trimmed) || MP3_SUFFIX_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const params: Record<string, string> = {
    text: toVoiceText(trimmed),
    lang: options?.lang ?? AUDIO_STORE_CONSTANTS.DEFAULT_TTS_LANG,
  };
  if (options?.role) params.role = options.role;
  if (options?.intensity) params.intensity = options.intensity;

  return `${CASTER_SPEECH.ROUTE}?${new URLSearchParams(params).toString()}`;
};

/**
 * Computes playback rate so a line with a deadline finishes on time without exceeding `MAX_TTS_FIT_RATE`.
 */
const resolvePlaybackRate = (howl: Howl, baseRate: number, deadlineAt?: number): number => {
  if (!deadlineAt) return baseRate;
  const durationSec = howl.duration();
  if (!Number.isFinite(durationSec) || durationSec <= 0) return baseRate;
  const remainingMs = durationSec * 1000;
  const availableMs = deadlineAt - Date.now();
  const neededRate = availableMs > 0 ? remainingMs / availableMs : AUDIO_STORE_CONSTANTS.MAX_TTS_FIT_RATE;
  return Math.min(AUDIO_STORE_CONSTANTS.MAX_TTS_FIT_RATE, Math.max(baseRate, neededRate));
};

/**
 * Builds the preloaded `Howl` dictionary for both `SFX_EVENT` keys and friendly aliases
 * (`game_start`, `boss_spawn`, `skill_cast`, etc.).
 */
const createPreloadedStaticDictionary = (): Readonly<Record<string, Howl>> => {
  const allEvents = Object.values(SFX_EVENT);
  soundManager.preload(allEvents);

  const dictionary: Record<string, Howl> = {};

  for (const eventName of allEvents) {
    const howl = soundManager.getHowl(eventName);
    if (howl) {
      dictionary[eventName] = howl;
    }
  }

  const aliasEntries = Object.entries(STATIC_ALIAS_TO_SFX_EVENT) as Array<[StaticSoundAlias, SfxEventName]>;
  for (const [alias, eventName] of aliasEntries) {
    const howl = dictionary[eventName];
    if (howl) {
      dictionary[alias] = howl;
      dictionary[`${alias}.mp3`] = howl;
    }
  }

  return Object.freeze(dictionary);
};

const syncQueueUrlsToState = (): string[] => internalTtsQueue.map((entry) => entry.url);

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  staticSounds: Object.freeze({}),
  isStaticReady: false,
  ttsQueue: [],
  isTTSPlaying: false,
  activeTTSHowl: null,

  initStaticSounds: () => {
    if (get().isStaticReady) return;
    const dictionary = createPreloadedStaticDictionary();
    set({
      staticSounds: dictionary,
      isStaticReady: true,
    });
  },

  playStatic: (soundName: StaticSoundName, options?: PlaySoundOptions) => {
    if (!audioService.isAudioEnabled) return;
    if (!get().isStaticReady) {
      get().initStaticSounds();
    }

    const sfxEvent = resolveStaticSfxEvent(soundName);
    if (sfxEvent) {
      playSound(sfxEvent, options);
      return;
    }

    const directHowl = get().staticSounds[soundName];
    if (directHowl) {
      const voiceId = directHowl.play();
      if (options?.loop) {
        directHowl.loop(true, voiceId);
      }
      if (options?.volumeScale !== undefined) {
        directHowl.volume(Math.min(1, Math.max(0, options.volumeScale)), voiceId);
      }
      if (options?.rateScale !== undefined) {
        directHowl.rate(options.rateScale, voiceId);
      }
    }
  },

  stopStatic: (soundName: StaticSoundName) => {
    const sfxEvent = resolveStaticSfxEvent(soundName);
    if (sfxEvent) {
      stopSound(sfxEvent);
      return;
    }
    const directHowl = get().staticSounds[soundName];
    directHowl?.stop();
  },

  pushTTS: (audioUrlOrText: string, options?: PushTTSOptions): Promise<boolean> => {
    if (!audioService.isAudioEnabled) {
      options?.onEnd?.(false);
      return Promise.resolve(false);
    }

    const resolvedUrl = resolveTtsAudioUrl(audioUrlOrText, options);
    if (!resolvedUrl) {
      options?.onEnd?.(false);
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      const priority = options?.priority ?? TTS_QUEUE_PRIORITY.NORMAL;
      const entry: InternalTtsQueueEntry = {
        id: nextTtsEntryId++,
        url: resolvedUrl,
        priority,
        rate: options?.rate ?? AUDIO_STORE_CONSTANTS.DEFAULT_TTS_RATE,
        deadlineAt: options?.deadlineAt,
        onStart: options?.onStart,
        onEnd: options?.onEnd,
        resolve,
      };

      if (priority === TTS_QUEUE_PRIORITY.HIGH) {
        // Insert after any existing high-priority items at the head of the queue,
        // so high-priority items stay FIFO among themselves and play before normal items.
        const firstNormalIdx = internalTtsQueue.findIndex((item) => item.priority !== TTS_QUEUE_PRIORITY.HIGH);
        if (firstNormalIdx === -1) {
          internalTtsQueue.push(entry);
        } else {
          internalTtsQueue.splice(firstNormalIdx, 0, entry);
        }
      } else {
        internalTtsQueue.push(entry);
      }

      // Enforce maximum queue size by dropping the oldest normal-priority item (or oldest item if all high)
      while (internalTtsQueue.length > AUDIO_STORE_CONSTANTS.MAX_TTS_QUEUE_SIZE) {
        const dropIndex = internalTtsQueue.findIndex((item) => item.priority === TTS_QUEUE_PRIORITY.NORMAL);
        const evictedIndex = dropIndex !== -1 ? dropIndex : 0;
        const [evicted] = internalTtsQueue.splice(evictedIndex, 1);
        if (evicted) {
          evicted.onEnd?.(false);
          evicted.resolve(false);
        }
      }

      set({ ttsQueue: syncQueueUrlsToState() });
      get().processQueue();
    });
  },

  processQueue: () => {
    const state = get();
    // Guard Clause: Do nothing if a TTS clip is already playing or the queue is empty
    if (state.isTTSPlaying || internalTtsQueue.length === 0) {
      if (!state.isTTSPlaying && internalTtsQueue.length === 0) {
        soundManager.setVoiceDuck(AUDIO_STORE_CONSTANTS.SFX_DUCK_IDLE);
      }
      return;
    }

    const nextEntry = internalTtsQueue.shift();
    if (!nextEntry) {
      set({ ttsQueue: [] });
      return;
    }

    // Skip immediately if the entry already missed its deadline before playback started
    if (nextEntry.deadlineAt !== undefined && Date.now() >= nextEntry.deadlineAt) {
      set({ ttsQueue: syncQueueUrlsToState() });
      nextEntry.onEnd?.(false);
      nextEntry.resolve(false);
      get().processQueue();
      return;
    }

    set({
      isTTSPlaying: true,
      ttsQueue: syncQueueUrlsToState(),
    });

    soundManager.setVoiceDuck(AUDIO_STORE_CONSTANTS.SFX_DUCK_WHILE_TTS);

    let isSettled = false;
    let hasTriggeredStart = false;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const finalizeCurrent = (didPlay: boolean) => {
      if (isSettled) return;
      isSettled = true;
      activeEntryFinalize = null;

      if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }

      const currentHowl = get().activeTTSHowl;
      if (currentHowl) {
        currentHowl.stop();
        currentHowl.unload();
      }

      set({
        isTTSPlaying: false,
        activeTTSHowl: null,
        ttsQueue: syncQueueUrlsToState(),
      });

      nextEntry.onEnd?.(didPlay);
      nextEntry.resolve(didPlay);

      // Recursively advance to the next TTS item in the queue
      get().processQueue();
    };

    activeEntryFinalize = finalizeCurrent;

    const targetVolume = Math.min(
      1,
      Math.max(0, AUDIO_STORE_CONSTANTS.TTS_VOLUME_SCALE)
    );

    const ttsHowl = new Howl({
      src: [nextEntry.url],
      format: [...AUDIO_STORE_CONSTANTS.TTS_AUDIO_FORMATS],
      html5: true,
      preload: true,
      volume: targetVolume,
      rate: nextEntry.rate,
      onplay: () => {
        if (isSettled) return;
        const fittedRate = resolvePlaybackRate(ttsHowl, nextEntry.rate, nextEntry.deadlineAt);
        if (fittedRate !== nextEntry.rate) {
          ttsHowl.rate(fittedRate);
        }
        if (!hasTriggeredStart) {
          hasTriggeredStart = true;
          nextEntry.onStart?.();
        }
      },
      onend: () => {
        finalizeCurrent(true);
      },
      onloaderror: (_soundId, error) => {
        console.warn(
          `${AUDIO_STORE_CONSTANTS.LOG_PREFIX} Failed to load TTS URL (${nextEntry.url}):`,
          error
        );
        finalizeCurrent(false);
      },
      onplayerror: (_soundId, error) => {
        console.warn(
          `${AUDIO_STORE_CONSTANTS.LOG_PREFIX} Failed to play TTS URL (${nextEntry.url}):`,
          error
        );
        finalizeCurrent(false);
      },
    });

    watchdogTimer = setTimeout(() => {
      console.warn(
        `${AUDIO_STORE_CONSTANTS.LOG_PREFIX} Watchdog timeout (${AUDIO_STORE_CONSTANTS.TTS_WATCHDOG_TIMEOUT_MS}ms) for TTS URL: ${nextEntry.url}`
      );
      finalizeCurrent(false);
    }, AUDIO_STORE_CONSTANTS.TTS_WATCHDOG_TIMEOUT_MS);

    set({ activeTTSHowl: ttsHowl });
    ttsHowl.play();
  },

  skipCurrentTTS: () => {
    if (activeEntryFinalize) {
      activeEntryFinalize(false);
      return;
    }
    const currentHowl = get().activeTTSHowl;
    if (currentHowl) {
      currentHowl.stop();
      currentHowl.unload();
    }
    set({
      isTTSPlaying: false,
      activeTTSHowl: null,
      ttsQueue: syncQueueUrlsToState(),
    });
    get().processQueue();
  },

  clearTTSQueue: () => {
    const flushed = internalTtsQueue.splice(0, internalTtsQueue.length);
    for (const item of flushed) {
      item.onEnd?.(false);
      item.resolve(false);
    }

    if (activeEntryFinalize) {
      activeEntryFinalize(false);
      return;
    }

    const currentHowl = get().activeTTSHowl;
    if (currentHowl) {
      currentHowl.stop();
      currentHowl.unload();
    }

    soundManager.setVoiceDuck(AUDIO_STORE_CONSTANTS.SFX_DUCK_IDLE);
    set({
      ttsQueue: [],
      isTTSPlaying: false,
      activeTTSHowl: null,
    });
  },
}));
export { STATIC_SOUND_ALIAS, TTS_QUEUE_PRIORITY, type StaticSoundAlias, type StaticSoundName, type TtsQueuePriority };
