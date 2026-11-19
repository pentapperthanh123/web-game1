/**
 * Minimal single-channel caster audio player.
 * - Static: pre-generated BLV lines by event key
 * - Dynamic: Google TTS via /api/tts proxy for viewer names, team names
 * Rules: only 1 voice at a time, no overlapping, no stacking
 */

import { CASTERS_INDEX, type CasterVariant, type CastersIndex } from '../../data/castersIndex';

export type { CasterVariant, CastersIndex };

export const CASTER_PLAYER_CONSTANTS = {
  TTS_ROUTE: '/api/tts',
  AUDIO_BASE_PATH: '/audio/casters',
  SAFETY_TIMEOUT_MS: 10000,
  DYNAMIC_ERROR_DELAY_MS: 2000,
  MAX_NICKNAME_LENGTH: 20,
  FALLBACK_NICKNAME: 'một bạn ẩn danh',
  LOG_PREFIX: '[CasterPlayer]',
} as const;

interface DynamicQueueItem {
  url: string;
  reactEventKey?: string;
}

// ── State ───────────────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
const dynamicQueue: DynamicQueueItem[] = [];
let isPlaying = false;
const lastPlayedId = new Map<string, string>();
let onSpeakingChangeCb: ((isSpeaking: boolean) => void) | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;
let isSpeakingState = false;

// ── Helpers ─────────────────────────────────────────────────────────────────

const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const NON_LETTER_NUM_SPACE_REGEX = /[^\p{L}\p{N}\s]/gu;
const MULTI_SPACE_REGEX = /\s+/g;

function notifySpeaking(isSpeaking: boolean): void {
  if (isSpeakingState === isSpeaking) {
    return;
  }
  isSpeakingState = isSpeaking;
  if (onSpeakingChangeCb) {
    try {
      onSpeakingChangeCb(isSpeaking);
    } catch (err) {
      console.error(`${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} onSpeakingChange callback error:`, err);
    }
  }
}

function clearSafetyTimer(): void {
  if (safetyTimer !== null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function clearErrorTimer(): void {
  if (errorTimer !== null) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }
}

function cleanupCurrentAudio(): void {
  if (!currentAudio) {
    return;
  }
  currentAudio.onended = null;
  currentAudio.onerror = null;
  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
  } catch {
    // Ignore browser audio pause or source cleanup errors
  }
  currentAudio = null;
}

function advanceQueueOrIdle(): void {
  clearSafetyTimer();
  cleanupCurrentAudio();
  isPlaying = false;

  if (dynamicQueue.length > 0) {
    processQueue();
    return;
  }

  notifySpeaking(false);
}

function startSafetyWatchdog(audioUrl: string): void {
  clearSafetyTimer();
  safetyTimer = setTimeout(() => {
    console.warn(
      `${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Safety timeout (${CASTER_PLAYER_CONSTANTS.SAFETY_TIMEOUT_MS}ms) for audio: ${audioUrl}`
    );
    advanceQueueOrIdle();
  }, CASTER_PLAYER_CONSTANTS.SAFETY_TIMEOUT_MS);
}

function playStaticVariant(eventKey: string): void {
  const variants = CASTERS_INDEX[eventKey];
  if (!variants || variants.length === 0) {
    console.warn(`${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} No variants found for event: ${eventKey}`);
    advanceQueueOrIdle();
    return;
  }

  const lastId = lastPlayedId.get(eventKey);
  let pool = variants;
  if (variants.length > 1 && lastId) {
    const candidates = variants.filter((item) => item.id !== lastId);
    if (candidates.length > 0) {
      pool = candidates;
    }
  }

  const selectedIndex = Math.floor(Math.random() * pool.length);
  const selectedVariant = pool[selectedIndex];
  lastPlayedId.set(eventKey, selectedVariant.id);

  const audioUrl = `${CASTER_PLAYER_CONSTANTS.AUDIO_BASE_PATH}/${selectedVariant.id}.mp3`;

  if (typeof Audio === 'undefined') {
    console.warn(`${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Audio element not available in this environment`);
    advanceQueueOrIdle();
    return;
  }

  isPlaying = true;
  notifySpeaking(true);

  cleanupCurrentAudio();

  const audio = new Audio(audioUrl);
  currentAudio = audio;
  startSafetyWatchdog(audioUrl);

  let isSettled = false;

  const handleFinish = () => {
    if (isSettled) return;
    isSettled = true;
    clearSafetyTimer();
    cleanupCurrentAudio();
    advanceQueueOrIdle();
  };

  audio.onended = handleFinish;
  audio.onerror = (error) => {
    console.warn(
      `${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Static audio error (${audioUrl}):`,
      error
    );
    handleFinish();
  };

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      console.warn(
        `${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Static audio play catch (${audioUrl}):`,
        err
      );
      handleFinish();
    });
  }
}

function processQueue(): void {
  if (isPlaying) {
    return;
  }

  if (dynamicQueue.length === 0) {
    notifySpeaking(false);
    return;
  }

  const nextItem = dynamicQueue.shift();
  if (!nextItem) {
    advanceQueueOrIdle();
    return;
  }

  if (typeof Audio === 'undefined') {
    console.warn(`${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Audio element not available in this environment`);
    advanceQueueOrIdle();
    return;
  }

  isPlaying = true;
  notifySpeaking(true);

  cleanupCurrentAudio();

  const audio = new Audio(nextItem.url);
  currentAudio = audio;
  startSafetyWatchdog(nextItem.url);

  let isSettled = false;

  const handleEnded = () => {
    if (isSettled) return;
    isSettled = true;
    clearSafetyTimer();
    cleanupCurrentAudio();

    if (nextItem.reactEventKey) {
      playStaticVariant(nextItem.reactEventKey);
      return;
    }

    advanceQueueOrIdle();
  };

  const handleError = (error: unknown) => {
    if (isSettled) return;
    isSettled = true;
    clearSafetyTimer();
    cleanupCurrentAudio();

    console.warn(
      `${CASTER_PLAYER_CONSTANTS.LOG_PREFIX} Dynamic audio error (${nextItem.url}):`,
      error
    );

    clearErrorTimer();
    errorTimer = setTimeout(() => {
      errorTimer = null;
      advanceQueueOrIdle();
    }, CASTER_PLAYER_CONSTANTS.DYNAMIC_ERROR_DELAY_MS);
  };

  audio.onended = handleEnded;
  audio.onerror = handleError;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      handleError(err);
    });
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Register callback for BGM ducking.
 * Called with true when voice starts, false when all voices end.
 */
export function onSpeakingChange(cb: (isSpeaking: boolean) => void): void {
  onSpeakingChangeCb = cb;
}

/**
 * Play a random static caster line for the given event.
 * - Pick random variant from castersIndex[eventKey], avoiding lastPlayedId
 * - If currently speaking or dynamic queue has items → SKIP (return immediately)
 * - Play /audio/casters/<id>.mp3
 * - Set safety timeout 10s
 * - On ended/error: advance queue or mark idle
 */
export function playCaster(eventKey: string): void {
  // Skip immediately if caster is already speaking or dynamic queue has pending items
  if (isPlaying || dynamicQueue.length > 0) {
    return;
  }

  playStaticVariant(eventKey);
}

/**
 * Push dynamic TTS text to FIFO queue.
 * - URL: /api/tts?text=<encodeURIComponent(text)>
 * - If reactEventKey provided, after this dynamic clip ends, chain playCaster(reactEventKey)
 * - Queue processes sequentially (FIFO)
 * - On error: skip to next in queue after 2s
 */
export function speakDynamic(text: string, reactEventKey?: string): void {
  const sanitizedText = text?.trim();
  if (!sanitizedText) {
    return;
  }

  const encodedText = encodeURIComponent(sanitizedText);
  const url = `${CASTER_PLAYER_CONSTANTS.TTS_ROUTE}?text=${encodedText}`;

  dynamicQueue.push({ url, reactEventKey });

  if (!isPlaying) {
    processQueue();
  }
}

/**
 * Clean TikTok nickname: strip emoji, special chars, decorative unicode.
 * Keep: letters (any script), numbers, spaces. Max 20 chars.
 * Fallback: 'một bạn ẩn danh'
 */
export function cleanNickname(name: string): string {
  if (!name || typeof name !== 'string') {
    return CASTER_PLAYER_CONSTANTS.FALLBACK_NICKNAME;
  }

  const noEmoji = name.replace(EMOJI_REGEX, '');
  const cleanChars = noEmoji.replace(NON_LETTER_NUM_SPACE_REGEX, ' ');
  const normalized = cleanChars.replace(MULTI_SPACE_REGEX, ' ').trim();
  const truncated = normalized.slice(0, CASTER_PLAYER_CONSTANTS.MAX_NICKNAME_LENGTH).trim();

  return truncated.length > 0 ? truncated : CASTER_PLAYER_CONSTANTS.FALLBACK_NICKNAME;
}

/**
 * Stop all audio and clear queue.
 */
export function stopAll(): void {
  clearSafetyTimer();
  clearErrorTimer();
  dynamicQueue.length = 0;
  cleanupCurrentAudio();
  isPlaying = false;
  notifySpeaking(false);
}

/**
 * Returns true if any caster audio is playing or queued.
 */
export function isBusy(): boolean {
  return isPlaying || dynamicQueue.length > 0;
}
