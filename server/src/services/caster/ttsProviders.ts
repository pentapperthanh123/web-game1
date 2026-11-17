import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  AZURE_TTS,
  CASTER_EMOTION_INTENSITY,
  CASTER_TTS,
  CASTER_TTS_ENV,
  CASTER_TTS_PROVIDER,
  CASTER_VOICE_ROLE,
  CasterEmotionIntensity,
  CasterTtsLang,
  CasterTtsProviderName,
  CasterVoiceRole,
  DEFAULT_CASTER_TTS_PROVIDER,
  DUAL_VOICES,
  EDGE_TTS,
  EMOTION_PROSODY,
  GOOGLE_FALLBACK_ENV_VALUE,
  GOOGLE_TRANSLATE_TTS,
} from '../../constants/casterTts.js';

export interface TtsSynthesizeOptions {
  role?: CasterVoiceRole;
  rate?: string;
  pitch?: string;
  intensity?: CasterEmotionIntensity;
  timeoutMs?: number;
}

export interface TtsProvider {
  name: CasterTtsProviderName;
  /** Identifies the exact voice, so cached clips are not reused after the voice is changed. */
  voiceTag(lang: CasterTtsLang, role?: CasterVoiceRole, rate?: string, pitch?: string): string;
  synthesize(text: string, lang: CasterTtsLang, options?: TtsSynthesizeOptions): Promise<Buffer>;
}

/** Voice used first, plus the always-available voice used when the first one fails. */
export interface TtsProviderChain {
  primary: TtsProvider;
  fallback: TtsProvider | null;
}

const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};
const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

const fetchAudio = async (url: string, init: RequestInit, timeoutMs: number): Promise<Buffer> => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) throw new Error('empty audio');
  return audio;
};

const resolveVoiceName = (
  role: CasterVoiceRole,
  lang: CasterTtsLang,
  customVoices?: Partial<Record<CasterTtsLang, string>>,
  isForceMale = false
): string => {
  const effectiveRole = isForceMale ? CASTER_VOICE_ROLE.MALE : role;
  if (effectiveRole === CASTER_VOICE_ROLE.MALE && customVoices?.[lang]) {
    return customVoices[lang];
  }
  return DUAL_VOICES[effectiveRole][lang];
};

const createAzureProvider = (
  key: string,
  region: string,
  customVoices?: Partial<Record<CasterTtsLang, string>>,
  isForceMale = false
): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.AZURE,
  voiceTag: (lang, role = CASTER_VOICE_ROLE.MALE, rate = AZURE_TTS.PROSODY_RATE, pitch = AZURE_TTS.PROSODY_PITCH) => {
    const voiceName = resolveVoiceName(role, lang, customVoices, isForceMale);
    return `${CASTER_TTS_PROVIDER.AZURE}:${voiceName}:${rate}:${pitch}`;
  },
  synthesize: (text, lang, options = {}) => {
    const role = options.role ?? CASTER_VOICE_ROLE.MALE;
    const voiceName = resolveVoiceName(role, lang, customVoices, isForceMale);
    const prosody = options.intensity ? EMOTION_PROSODY[options.intensity] : undefined;
    const rate = options.rate ?? prosody?.rate ?? AZURE_TTS.PROSODY_RATE;
    const pitch = options.pitch ?? prosody?.pitch ?? AZURE_TTS.PROSODY_PITCH;

    const ssml =
      `<speak version="1.0" xml:lang="${AZURE_TTS.LOCALE[lang]}">` +
      `<voice name="${voiceName}"><prosody rate="${rate}" pitch="${pitch}">` +
      `${escapeXml(text)}</prosody></voice></speak>`;
    return fetchAudio(
      AZURE_TTS.ENDPOINT_TEMPLATE.replace('{region}', region),
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': AZURE_TTS.OUTPUT_FORMAT,
          'User-Agent': CASTER_TTS.USER_AGENT,
        },
        body: ssml,
      },
      options.timeoutMs ?? CASTER_TTS.REQUEST_TIMEOUT_MS
    );
  },
});

const createGoogleTranslateProvider = (): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE,
  voiceTag: (lang) => `${CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE}:${lang}`,
  synthesize: (text, lang, options = {}) => {
    const params = new URLSearchParams({ ie: 'UTF-8', tl: lang, client: GOOGLE_TRANSLATE_TTS.CLIENT, q: text });
    return fetchAudio(
      `${GOOGLE_TRANSLATE_TTS.URL}?${params.toString()}`,
      { headers: { 'User-Agent': CASTER_TTS.USER_AGENT } },
      options.timeoutMs ?? CASTER_TTS.REQUEST_TIMEOUT_MS
    );
  },
});

const runEdgeTts = (python: string, args: string[], timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    execFile(python, args, { timeout: timeoutMs, windowsHide: true }, (error, _stdout, stderr) => {
      if (!error) {
        resolve();
        return;
      }
      const lastLine = stderr.trim().split('\n').pop() ?? '';
      reject(new Error(error.killed ? `timeout after ${timeoutMs} ms` : lastLine || error.message));
    });
  });

const runEdgeTtsWithRetry = async (
  python: string,
  args: string[],
  timeoutMs: number,
  retries = EDGE_TTS.MAX_RETRIES
): Promise<void> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await runEdgeTts(python, args, timeoutMs);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, EDGE_TTS.RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('Edge TTS synthesis failed');
};

/** Edge neural voices via the `edge-tts` CLI (a subprocess keeps Microsoft's changing handshake out of our code). */
const createEdgeProvider = (
  python: string,
  customVoices?: Partial<Record<CasterTtsLang, string>>,
  isForceMale = false
): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.EDGE,
  voiceTag: (lang, role = CASTER_VOICE_ROLE.MALE, rate = EDGE_TTS.RATE, pitch = EDGE_TTS.SAFE_PITCH) => {
    const voiceName = resolveVoiceName(role, lang, customVoices, isForceMale);
    return `${CASTER_TTS_PROVIDER.EDGE}:${voiceName}:${rate}:${pitch}`;
  },
  synthesize: async (text, lang, options = {}) => {
    const role = options.role ?? CASTER_VOICE_ROLE.MALE;
    const voiceName = resolveVoiceName(role, lang, customVoices, isForceMale);
    const prosody = options.intensity ? EMOTION_PROSODY[options.intensity] : undefined;
    const rate = options.rate ?? prosody?.rate ?? EDGE_TTS.RATE;
    // Edge TTS on Microsoft unauthenticated endpoint returns WebSocket 1006 / NoAudioReceived
    // when non-zero pitch (e.g. +8Hz, +16Hz) is specified for neural voices.
    // Lock pitch to +0Hz for 100% stability while using rate for esports pacing.
    const pitch = EDGE_TTS.SAFE_PITCH;

    const outputFile = path.join(tmpdir(), `caster-${randomUUID()}.mp3`);
    try {
      await runEdgeTtsWithRetry(
        python,
        [
          '-m',
          EDGE_TTS.MODULE,
          `--voice=${voiceName}`,
          `--rate=${rate}`,
          `--pitch=${pitch}`,
          `--text=${text}`,
          `--write-media=${outputFile}`,
        ],
        options.timeoutMs ?? EDGE_TTS.TIMEOUT_MS
      );
      const audio = await readFile(outputFile);
      if (audio.length === 0) throw new Error('empty audio');
      return audio;
    } finally {
      await rm(outputFile, { force: true });
    }
  },
});

/** Python of server/.tts-venv (created by scripts/ops/setup-edge-tts.bat), or an explicit EDGE_TTS_PYTHON. */
const resolveEdgePython = (env: NodeJS.ProcessEnv, serverRoot: string): string | null => {
  const explicit = env[CASTER_TTS_ENV.EDGE_PYTHON]?.trim();
  if (explicit) return explicit;
  const venvPython = EDGE_TTS.VENV_PYTHON_PATHS.map((relative) => path.join(serverRoot, relative)).find((candidate) =>
    existsSync(candidate)
  );
  return venvPython ?? null;
};

const resolveProviderName = (env: NodeJS.ProcessEnv): CasterTtsProviderName => {
  const requested = env[CASTER_TTS_ENV.PROVIDER]?.trim().toUpperCase();
  if (requested === 'GOOGLE' || requested === 'GOOGLE_TRANSLATE' || requested === 'DEFAULT') {
    return CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE;
  }
  const known = Object.values(CASTER_TTS_PROVIDER) as string[];
  return requested && known.includes(requested) ? (requested as CasterTtsProviderName) : DEFAULT_CASTER_TTS_PROVIDER;
};

/**
 * Voice chosen by CASTER_TTS_PROVIDER (default Google). EDGE needs scripts/ops/setup-edge-tts.bat,
 * AZURE needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION; if what is asked for is not available the
 * caster falls back to Google. CASTER_TTS_FALLBACK_VOICE=GOOGLE mixes Google in behind Edge/Azure.
 */
export const createTtsProviderChain = (env: NodeJS.ProcessEnv, serverRoot: string): TtsProviderChain => {
  const isForceMale = env[CASTER_TTS_ENV.FORCE_MALE]?.trim().toLowerCase() === 'true';
  const google = createGoogleTranslateProvider();
  const isGoogleFallbackEnabled = env[CASTER_TTS_ENV.FALLBACK_VOICE]?.trim().toUpperCase() === GOOGLE_FALLBACK_ENV_VALUE;
  const fallback = isGoogleFallbackEnabled ? google : null;
  const providerName = resolveProviderName(env);

  const azureKey = env[CASTER_TTS_ENV.AZURE_KEY]?.trim();
  const azureRegion = env[CASTER_TTS_ENV.AZURE_REGION]?.trim();
  if (providerName === CASTER_TTS_PROVIDER.AZURE && azureKey && azureRegion) {
    const azure = createAzureProvider(
      azureKey,
      azureRegion,
      {
        vi: env[CASTER_TTS_ENV.AZURE_VOICE_VI]?.trim() || AZURE_TTS.DEFAULT_VOICE.vi,
        en: env[CASTER_TTS_ENV.AZURE_VOICE_EN]?.trim() || AZURE_TTS.DEFAULT_VOICE.en,
      },
      isForceMale
    );
    return { primary: azure, fallback };
  }
  const edgePython = providerName === CASTER_TTS_PROVIDER.EDGE ? resolveEdgePython(env, serverRoot) : null;
  if (edgePython) {
    const edge = createEdgeProvider(
      edgePython,
      {
        vi: env[CASTER_TTS_ENV.EDGE_VOICE_VI]?.trim() || EDGE_TTS.DEFAULT_VOICE.vi,
        en: env[CASTER_TTS_ENV.EDGE_VOICE_EN]?.trim() || EDGE_TTS.DEFAULT_VOICE.en,
      },
      isForceMale
    );
    return { primary: edge, fallback };
  }
  return { primary: google, fallback: null };
};
