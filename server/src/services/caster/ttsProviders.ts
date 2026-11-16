import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  AZURE_TTS,
  CASTER_TTS,
  CASTER_TTS_ENV,
  CASTER_TTS_PROVIDER,
  DEFAULT_CASTER_TTS_PROVIDER,
  GOOGLE_FALLBACK_ENV_VALUE,
  CasterTtsLang,
  CasterTtsProviderName,
  EDGE_TTS,
  GOOGLE_TRANSLATE_TTS,
} from '../../constants/casterTts.js';

export interface TtsProvider {
  name: CasterTtsProviderName;
  /** Identifies the exact voice, so cached clips are not reused after the voice is changed. */
  voiceTag(lang: CasterTtsLang): string;
  synthesize(text: string, lang: CasterTtsLang, timeoutMs?: number): Promise<Buffer>;
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

const createAzureProvider = (key: string, region: string, voices: Record<CasterTtsLang, string>): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.AZURE,
  voiceTag: (lang) => `${CASTER_TTS_PROVIDER.AZURE}:${voices[lang]}`,
  synthesize: (text, lang, timeoutMs = CASTER_TTS.REQUEST_TIMEOUT_MS) => {
    const ssml =
      `<speak version="1.0" xml:lang="${AZURE_TTS.LOCALE[lang]}">` +
      `<voice name="${voices[lang]}"><prosody rate="${AZURE_TTS.PROSODY_RATE}" pitch="${AZURE_TTS.PROSODY_PITCH}">` +
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
      timeoutMs
    );
  },
});

const createGoogleTranslateProvider = (): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE,
  voiceTag: (lang) => `${CASTER_TTS_PROVIDER.GOOGLE_TRANSLATE}:${lang}`,
  synthesize: (text, lang, timeoutMs = CASTER_TTS.REQUEST_TIMEOUT_MS) => {
    const params = new URLSearchParams({ ie: 'UTF-8', tl: lang, client: GOOGLE_TRANSLATE_TTS.CLIENT, q: text });
    return fetchAudio(
      `${GOOGLE_TRANSLATE_TTS.URL}?${params.toString()}`,
      { headers: { 'User-Agent': CASTER_TTS.USER_AGENT } },
      timeoutMs
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

/** Edge neural voices via the `edge-tts` CLI (a subprocess keeps Microsoft's changing handshake out of our code). */
const createEdgeProvider = (python: string, voices: Record<CasterTtsLang, string>): TtsProvider => ({
  name: CASTER_TTS_PROVIDER.EDGE,
  voiceTag: (lang) => `${CASTER_TTS_PROVIDER.EDGE}:${voices[lang]}:${EDGE_TTS.RATE}`,
  synthesize: async (text, lang, timeoutMs = EDGE_TTS.TIMEOUT_MS) => {
    const outputFile = path.join(tmpdir(), `caster-${randomUUID()}.mp3`);
    try {
      await runEdgeTts(
        python,
        ['-m', EDGE_TTS.MODULE, `--voice=${voices[lang]}`, `--rate=${EDGE_TTS.RATE}`, `--text=${text}`, `--write-media=${outputFile}`],
        timeoutMs
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
  const known = Object.values(CASTER_TTS_PROVIDER) as string[];
  return requested && known.includes(requested) ? (requested as CasterTtsProviderName) : DEFAULT_CASTER_TTS_PROVIDER;
};

/**
 * Voice chosen by CASTER_TTS_PROVIDER (default Google). EDGE needs scripts/ops/setup-edge-tts.bat,
 * AZURE needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION; if what is asked for is not available the
 * caster falls back to Google. CASTER_TTS_FALLBACK_VOICE=GOOGLE mixes Google in behind Edge/Azure.
 */
export const createTtsProviderChain = (env: NodeJS.ProcessEnv, serverRoot: string): TtsProviderChain => {
  const google = createGoogleTranslateProvider();
  const isGoogleFallbackEnabled = env[CASTER_TTS_ENV.FALLBACK_VOICE]?.trim().toUpperCase() === GOOGLE_FALLBACK_ENV_VALUE;
  const fallback = isGoogleFallbackEnabled ? google : null;
  const providerName = resolveProviderName(env);

  const azureKey = env[CASTER_TTS_ENV.AZURE_KEY]?.trim();
  const azureRegion = env[CASTER_TTS_ENV.AZURE_REGION]?.trim();
  if (providerName === CASTER_TTS_PROVIDER.AZURE && azureKey && azureRegion) {
    const azure = createAzureProvider(azureKey, azureRegion, {
      vi: env[CASTER_TTS_ENV.AZURE_VOICE_VI]?.trim() || AZURE_TTS.DEFAULT_VOICE.vi,
      en: env[CASTER_TTS_ENV.AZURE_VOICE_EN]?.trim() || AZURE_TTS.DEFAULT_VOICE.en,
    });
    return { primary: azure, fallback };
  }
  const edgePython = providerName === CASTER_TTS_PROVIDER.EDGE ? resolveEdgePython(env, serverRoot) : null;
  if (edgePython) {
    const edge = createEdgeProvider(edgePython, {
      vi: env[CASTER_TTS_ENV.EDGE_VOICE_VI]?.trim() || EDGE_TTS.DEFAULT_VOICE.vi,
      en: env[CASTER_TTS_ENV.EDGE_VOICE_EN]?.trim() || EDGE_TTS.DEFAULT_VOICE.en,
    });
    return { primary: edge, fallback };
  }
  return { primary: google, fallback: null };
};
