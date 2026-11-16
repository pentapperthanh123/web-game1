/** Server-side text-to-speech for the AI caster (the streaming PC has no Vietnamese browser voice). */
export const CASTER_TTS = {
  ROUTE: '/api/caster/tts',
  MAX_TEXT_CHARS: 180,
  REQUEST_TIMEOUT_MS: 8000,
  MAX_CACHED_CLIPS: 400,
  /** Provider calls only; cache hits are free. Protects the free demo endpoint from bans. */
  MAX_PROVIDER_CALLS_PER_WINDOW: 60,
  RATE_WINDOW_MS: 60_000,
  DEFAULT_LANG: 'vi',
  AUDIO_CONTENT_TYPE: 'audio/mpeg',
  CACHE_CONTROL: 'private, max-age=86400',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  /** Response header telling the overlay the clip used the fallback voice (do not keep it, an upgrade may follow). */
  VOICE_HEADER: 'X-Caster-Voice',
  VOICE_HEADER_PRIMARY: 'primary',
  VOICE_HEADER_FALLBACK: 'fallback',
} as const;

/** Primary-voice clips are kept on disk so repeated lines play instantly, even after a restart. */
export const CASTER_TTS_DISK_CACHE = {
  DIR: 'data/tts-cache',
  MAX_FILES: 6000,
  EXTENSION: '.mp3',
} as const;

/**
 * Pre-generation of lines the overlay will need (banter, boss calls, intro...) so they play instantly.
 * Runs slowly in the background and never takes provider calls the live lines need.
 */
export const CASTER_TTS_WARM = {
  SOCKET_EVENT: 'caster:warm',
  MAX_TEXTS_PER_REQUEST: 300,
  MAX_QUEUED: 600,
  /** At most 20 warm-up calls per minute. */
  MIN_INTERVAL_MS: 3_000,
  /** Warm-up pauses while live lines have used this many of the per-window provider calls. */
  LIVE_HEADROOM_CALLS: 15,
} as const;

export const CASTER_TTS_LANG = { VI: 'vi', EN: 'en' } as const;
export type CasterTtsLang = (typeof CASTER_TTS_LANG)[keyof typeof CASTER_TTS_LANG];

export const CASTER_TTS_PROVIDER = {
  AZURE: 'AZURE',
  EDGE: 'EDGE',
  GOOGLE_TRANSLATE: 'GOOGLE_TRANSLATE',
} as const;

/** Google for now (decided 2026-11-14): Edge is too flaky from the streaming PC; switch with CASTER_TTS_PROVIDER. */
export const DEFAULT_CASTER_TTS_PROVIDER: CasterTtsProviderName = CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE;

/** Value of CASTER_TTS_FALLBACK_VOICE that keeps Google behind the primary voice. */
export const GOOGLE_FALLBACK_ENV_VALUE = 'GOOGLE';
export type CasterTtsProviderName = (typeof CASTER_TTS_PROVIDER)[keyof typeof CASTER_TTS_PROVIDER];

export const CASTER_TTS_FAILURE = {
  DISABLED: 'DISABLED',
  INVALID_TEXT: 'INVALID_TEXT',
  BLOCKED_TEXT: 'BLOCKED_TEXT',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const;
export type CasterTtsFailure = (typeof CASTER_TTS_FAILURE)[keyof typeof CASTER_TTS_FAILURE];

export const CASTER_TTS_HTTP_STATUS: Readonly<Record<CasterTtsFailure, number>> = {
  [CASTER_TTS_FAILURE.DISABLED]: 403,
  [CASTER_TTS_FAILURE.INVALID_TEXT]: 400,
  [CASTER_TTS_FAILURE.BLOCKED_TEXT]: 422,
  [CASTER_TTS_FAILURE.RATE_LIMITED]: 429,
  [CASTER_TTS_FAILURE.PROVIDER_ERROR]: 502,
};

export const CASTER_TTS_ENV = {
  /** Which voice the caster uses: GOOGLE_TRANSLATE (default), EDGE (HoaiMy / NamMinh) or AZURE (needs a key). */
  PROVIDER: 'CASTER_TTS_PROVIDER',
  /** "GOOGLE" re-enables the Google voice as fallback behind Edge/Azure; default: no other voice is mixed in. */
  FALLBACK_VOICE: 'CASTER_TTS_FALLBACK_VOICE',
  EDGE_PYTHON: 'EDGE_TTS_PYTHON',
  EDGE_VOICE_VI: 'EDGE_TTS_VOICE_VI',
  EDGE_VOICE_EN: 'EDGE_TTS_VOICE_EN',
  AZURE_KEY: 'AZURE_SPEECH_KEY',
  AZURE_REGION: 'AZURE_SPEECH_REGION',
  AZURE_VOICE_VI: 'AZURE_SPEECH_VOICE_VI',
  AZURE_VOICE_EN: 'AZURE_SPEECH_VOICE_EN',
} as const;

export const AZURE_TTS = {
  ENDPOINT_TEMPLATE: 'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
  OUTPUT_FORMAT: 'audio-24khz-48kbitrate-mono-mp3',
  DEFAULT_VOICE: { [CASTER_TTS_LANG.VI]: 'vi-VN-HoaiMyNeural', [CASTER_TTS_LANG.EN]: 'en-US-AndrewNeural' },
  LOCALE: { [CASTER_TTS_LANG.VI]: 'vi-VN', [CASTER_TTS_LANG.EN]: 'en-US' },
  /** Persona "BLV Bão": energetic, natural esports pacing. */
  PROSODY_RATE: '+28%',
  PROSODY_PITCH: '+2%',
} as const;

/**
 * Microsoft Edge "Read aloud" neural voices (HoaiMy, NamMinh) through the `edge-tts` Python package,
 * installed by scripts/ops/setup-edge-tts.bat into server/.tts-venv. Unofficial and currently flaky
 * (slow or empty answers), so it runs with a short timeout, falls back to Google and upgrades in the background.
 */
export const EDGE_TTS = {
  VENV_PYTHON_PATHS: ['.tts-venv/Scripts/python.exe', '.tts-venv/bin/python'],
  MODULE: 'edge_tts',
  /** NamMinh (male) caster voice; set EDGE_TTS_VOICE_VI=vi-VN-HoaiMyNeural for the female voice. */
  DEFAULT_VOICE: { [CASTER_TTS_LANG.VI]: 'vi-VN-NamMinhNeural', [CASTER_TTS_LANG.EN]: 'en-US-AndrewNeural' },
  /** Caster persona: natural, crisp esports pacing. */
  RATE: '+28%',
  /** With a fallback voice: the primary is used only if it answers within this grace. */
  PRIMARY_GRACE_MS: 1_200,
  /** Per attempt; a late answer is still cached for the next time the line is needed. */
  TIMEOUT_MS: 15_000,
  /** Without a fallback voice: a second attempt starts if the first has not answered by then (hedging). */
  HEDGE_DELAY_MS: 1_500,
  /** Without a fallback voice: the request gives up after this (the overlay shows the caption only). */
  LIVE_DEADLINE_MS: 9_000,
  /** Background upgrade attempts after a fallback answer. */
  UPGRADE_TIMEOUT_MS: 15_000,
  UPGRADE_ATTEMPTS: 3,
  UPGRADE_RETRY_DELAY_MS: 3_000,
  MAX_PARALLEL_UPGRADES: 2,
  /** Lines waiting for a background upgrade; beyond this, new ones are skipped (they upgrade next time). */
  MAX_QUEUED_UPGRADES: 60,
} as const;

/** Unofficial, free, no key: good enough for demos; may be throttled. Use Azure for the 24/7 live. */
export const GOOGLE_TRANSLATE_TTS = {
  URL: 'https://translate.google.com/translate_tts',
  CLIENT: 'tw-ob',
} as const;
