#!/usr/bin/env node
/**
 * Offline Static Caster Audio Generator (Viet-TTS + FFmpeg Post-Processing)
 *
 * Reads `server/data/casters.json`, synthesizes each line via local `viet-tts`,
 * applies silence-trimming and tone-specific FFmpeg filters, encodes to MP3
 * (`client/public/audio/casters/<id>.mp3`), caches hashes in
 * `scripts/.caster-audio-cache.json`, and syncs `client/src/data/castersManifest.json`.
 *
 * Usage:
 *   node scripts/generateCasterAudio.mjs [options]
 *   pnpm run audio:gen -- --only=lead_change_01
 *
 * Options:
 *   --only=<id_or_category>  Generate only matching entry IDs or categories (comma-separated)
 *   --force                  Ignore cache and regenerate all selected entries
 *   --clean                  Remove orphaned .mp3 files not present in casters.json
 *   --dry-run                Preview planned actions without calling Viet-TTS or FFmpeg
 *   --help                   Show usage instructions
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths & Environment ──────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const PATHS = {
  CASTERS_JSON: path.join(REPO_ROOT, 'server', 'data', 'casters.json'),
  FRONTEND_MANIFEST: path.join(REPO_ROOT, 'client', 'src', 'data', 'castersManifest.json'),
  OUTPUT_DIR: path.join(REPO_ROOT, 'client', 'public', 'audio', 'casters'),
  VOICES_DIR: process.env.VIET_TTS_VOICES_DIR
    ? path.resolve(process.env.VIET_TTS_VOICES_DIR)
    : path.join(REPO_ROOT, 'scripts', 'viet-tts', 'voices'),
  CACHE_FILE: path.join(SCRIPT_DIR, '.caster-audio-cache.json'),
};

const AUDIO_PUBLIC_PREFIX = '/audio/casters';

function resolveConfiguredMaleVoice() {
  if (process.env.VIET_TTS_VOICE_MALE?.trim()) {
    return process.env.VIET_TTS_VOICE_MALE.trim();
  }
  const liveOpsConfigPath = path.join(REPO_ROOT, 'server', 'data', 'live_ops_config.json');
  if (existsSync(liveOpsConfigPath)) {
    try {
      const parsed = JSON.parse(readFileSync(liveOpsConfigPath, 'utf-8'));
      if (parsed?.casterConfig?.voiceMale) {
        return parsed.casterConfig.voiceMale;
      }
    } catch {
      // Ignore read error
    }
  }
  return 'cdteam';
}

function resolveConfiguredFemaleVoice() {
  if (process.env.VIET_TTS_VOICE_FEMALE?.trim()) {
    return process.env.VIET_TTS_VOICE_FEMALE.trim();
  }
  const liveOpsConfigPath = path.join(REPO_ROOT, 'server', 'data', 'live_ops_config.json');
  if (existsSync(liveOpsConfigPath)) {
    try {
      const parsed = JSON.parse(readFileSync(liveOpsConfigPath, 'utf-8'));
      if (parsed?.casterConfig?.voiceFemale) {
        return parsed.casterConfig.voiceFemale;
      }
    } catch {
      // Ignore read error
    }
  }
  return 'diep-chi';
}

const VIET_TTS_CONFIG = {
  BASE_URL: (process.env.VIET_TTS_URL || 'http://localhost:8298').replace(/\/+$/, ''),
  HEALTH_PATH: '/health',
  OPENAI_SPEECH_PATH: '/v1/audio/speech',
  CLONE_TTS_PATH: '/v1/tts',
  MODEL: 'tts-1',
  DEFAULT_MALE_VOICE: resolveConfiguredMaleVoice(),
  DEFAULT_FEMALE_VOICE: resolveConfiguredFemaleVoice(),
  HEALTH_TIMEOUT_MS: 5_000,
  SYNTH_TIMEOUT_MS: 90_000,
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 2_000,
};

// ── Tone, Speed, Volume & FFmpeg Post-Processing Config ──────────────────────

const VALID_TONES = new Set(['hype', 'normal', 'calm']);

const TONE_DEFAULT_SPEED = {
  hype: 1.12,
  normal: 1.02,
  calm: 0.93,
};

const TONE_DEFAULT_VOLUME = {
  hype: 1.0,
  normal: 0.85,
  calm: 0.75,
};

const TONE_CUSTOM_WAV_FILE = {
  hype: 'blv_hype.wav',
  normal: 'blv_normal.wav',
  calm: 'blv_calm.wav',
};

/** Version tags for filter chains to invalidate cache when filters change. */
const MALE_FILTER_VERSION = 'v1.1.0';
const FEMALE_FILTER_VERSION = 'v1.2.0';

const FEMALE_DEFAULT_SPEED = {
  hype: 1.05,
  normal: 1.0,
  calm: 0.95,
};

const SILENCE_TRIM_FILTER =
  'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,' +
  'areverse';

/** Full tone shaping for male voices (pitch + tempo + EQ/comp/echo/volume boost/limiter). */
const BUILTIN_TONE_FILTERS = {
  hype:
    'aresample=44100,asetrate=44100*1.04,aresample=44100,atempo=1.06,' +
    'equalizer=f=3000:t=q:w=1.5:g=5,' +
    'acompressor=threshold=-16dB:ratio=4:attack=5:release=60,' +
    'aecho=0.8:0.88:45:0.15,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  normal:
    'aresample=44100,' +
    'equalizer=f=2500:t=q:w=1.5:g=2,' +
    'acompressor=threshold=-18dB:ratio=3:attack=10:release=80,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  calm:
    'aresample=44100,asetrate=44100*0.97,aresample=44100,atempo=0.97,' +
    'bass=g=3:f=150,treble=g=-3:f=4000,volume=5dB,alimiter=limit=0.98',
};

/** Specialized female tone filters: preserves natural pitch (no asetrate), smooths harsh sibilance, adds warmth and presence. */
const FEMALE_TONE_FILTERS = {
  hype:
    'aresample=44100,atempo=1.03,' +
    'equalizer=f=320:t=q:w=1.0:g=2.5,' +
    'equalizer=f=3200:t=q:w=1.8:g=-2.5,' +
    'equalizer=f=8000:t=q:w=1.5:g=1.5,' +
    'acompressor=threshold=-16dB:ratio=3:attack=10:release=80,' +
    'aecho=0.8:0.85:35:0.1,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  normal:
    'aresample=44100,' +
    'equalizer=f=320:t=q:w=1.0:g=2,' +
    'equalizer=f=3200:t=q:w=1.8:g=-2,' +
    'acompressor=threshold=-18dB:ratio=2.5:attack=15:release=100,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  calm:
    'aresample=44100,' +
    'equalizer=f=350:t=q:w=1.0:g=1.5,' +
    'acompressor=threshold=-20dB:ratio=2:attack=20:release=120,' +
    'volume=7dB,' +
    'alimiter=limit=0.98',
};

/** Lighter EQ/dynamics shaping when cloning from an expressive custom .wav sample (preserves natural pitch). */
const CUSTOM_WAV_TONE_FILTERS = {
  hype:
    'aresample=44100,' +
    'equalizer=f=3000:t=q:w=1.5:g=3,' +
    'acompressor=threshold=-16dB:ratio=4:attack=5:release=60,' +
    'aecho=0.8:0.88:45:0.12,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  normal:
    'aresample=44100,' +
    'equalizer=f=2500:t=q:w=1.5:g=1.5,' +
    'acompressor=threshold=-18dB:ratio=3:attack=10:release=80,' +
    'volume=8dB,' +
    'alimiter=limit=0.98',
  calm:
    'aresample=44100,' +
    'bass=g=2:f=150,treble=g=-2:f=4000,volume=5dB,alimiter=limit=0.98',
};

const MP3_ENCODE_ARGS = ['-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1'];

const DURATION_WARNING_THRESHOLD_SEC = 3.5;

const VOICE_MODE = {
  CUSTOM_WAV: 'custom_wav',
  BUILTIN: 'builtin',
};

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Offline Caster Audio Generator (Viet-TTS + FFmpeg)

Usage:
  node scripts/generateCasterAudio.mjs [options]
  pnpm run audio:gen -- [options]

Options:
  --only=<id_or_category>  Filter by entry id or category (comma-separated, e.g. --only=lead_change_01)
  --force                  Regenerate all matched files regardless of cache hash
  --clean                  Delete orphaned .mp3 files in client/public/audio/casters/
  --dry-run                Preview actions without calling Viet-TTS or FFmpeg
  --help                   Display this help message

Environment Variables:
  VIET_TTS_URL             Local Viet-TTS URL (default: http://localhost:8298)
  VIET_TTS_VOICE_MALE      Built-in fallback voice (default: cdteam)
  VIET_TTS_VOICES_DIR      Directory for blv_hype.wav / blv_normal.wav / blv_calm.wav
`);
}

function parseCliArgs(argv) {
  const options = {
    only: [],
    force: false,
    clean: false,
    dryRun: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--clean') {
      options.clean = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith('--only=')) {
      const rawValue = arg.slice('--only='.length).trim();
      const targets = rawValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      options.only.push(...targets);
      continue;
    }
    console.warn(`[WARN] Unknown CLI argument ignored: ${arg}`);
  }

  return options;
}

// ── Environment Preflight Checks ─────────────────────────────────────────────

function checkCommandAvailable(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function verifyFfmpegInstalled() {
  const hasFfmpeg = checkCommandAvailable('ffmpeg', ['-version']);
  if (!hasFfmpeg) {
    console.error('[ERROR] Không tìm thấy `ffmpeg` trong PATH.');
    console.error('  Hướng dẫn cài đặt trên Windows:');
    console.error('    winget install Gyan.FFmpeg');
    console.error('  Sau khi cài xong, mở lại terminal và chạy lại lệnh.');
    process.exit(1);
  }
}

async function verifyVietTtsServer(baseUrl) {
  const healthUrl = `${baseUrl}${VIET_TTS_CONFIG.HEALTH_PATH}`;
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(VIET_TTS_CONFIG.HEALTH_TIMEOUT_MS),
    });
    if (response.ok) return;
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Không kết nối được server Viet-TTS tại ${healthUrl} (${reason}).`);
    console.error('  Hãy khởi chạy Viet-TTS local trước khi sinh audio:');
    console.error('    pnpm run viet-tts:docker');
    console.error('  Hoặc cấu hình biến môi trường VIET_TTS_URL nếu server chạy ở port/host khác.');
    process.exit(1);
  }
}

// ── Data Loading & Cache ─────────────────────────────────────────────────────

function normalizeEntry(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Entry #${index} is not a valid object`);
  }

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const category = typeof raw.category === 'string' ? raw.category.trim() : '';
  const tone = typeof raw.tone === 'string' ? raw.tone.trim().toLowerCase() : 'normal';
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';

  if (!id || !category || !text) {
    throw new Error(`Entry #${index} missing required fields (id, category, text)`);
  }
  if (!VALID_TONES.has(tone)) {
    throw new Error(`Entry "${id}" has invalid tone "${tone}" (expected: hype | normal | calm)`);
  }

  const normalized = {
    id,
    category,
    tone,
    text,
    file: typeof raw.file === 'string' && raw.file.trim() ? raw.file.trim() : `${AUDIO_PUBLIC_PREFIX}/${id}.mp3`,
    volume: typeof raw.volume === 'number' ? raw.volume : TONE_DEFAULT_VOLUME[tone],
  };

  if (raw.gender === 'female' || raw.gender === 'male') {
    normalized.gender = raw.gender;
  }

  if (typeof raw.voice === 'string' && raw.voice.trim()) {
    normalized.voice = raw.voice.trim();
  }
  if (typeof raw.speed === 'number' && Number.isFinite(raw.speed) && raw.speed > 0) {
    normalized.speed = raw.speed;
  }

  return normalized;
}

function loadCastersJson() {
  if (!existsSync(PATHS.CASTERS_JSON)) {
    console.error(`[ERROR] Không tìm thấy file casters.json tại: ${PATHS.CASTERS_JSON}`);
    process.exit(1);
  }

  const parsed = JSON.parse(readFileSync(PATHS.CASTERS_JSON, 'utf-8'));
  if (!Array.isArray(parsed)) {
    console.error('[ERROR] casters.json phải là mảng JSON các câu thoại (CasterLineEntry[]).');
    process.exit(1);
  }

  const seenIds = new Set();
  const entries = parsed.map((raw, idx) => {
    const entry = normalizeEntry(raw, idx);
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate entry id "${entry.id}" in casters.json`);
    }
    seenIds.add(entry.id);
    return entry;
  });

  return entries;
}

function loadCache() {
  if (!existsSync(PATHS.CACHE_FILE)) return {};
  try {
    const raw = JSON.parse(readFileSync(PATHS.CACHE_FILE, 'utf-8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    console.warn('[WARN] Cache file bị lỗi định dạng, sẽ tạo lại cache mới.');
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(PATHS.CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
}

function syncFrontendManifest(entries) {
  mkdirSync(path.dirname(PATHS.FRONTEND_MANIFEST), { recursive: true });
  writeFileSync(PATHS.FRONTEND_MANIFEST, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
}

// ── Voice Resolution & Hashing ───────────────────────────────────────────────

function resolveVoiceSpec(entry) {
  const isFemale = entry.gender === 'female' || entry.speaker === 'female';
  const speed = entry.speed ?? (isFemale ? FEMALE_DEFAULT_SPEED[entry.tone] : TONE_DEFAULT_SPEED[entry.tone]);

  // 1. Explicit voice override on entry
  if (entry.voice) {
    if (entry.voice.toLowerCase().endsWith('.wav')) {
      const explicitWav = path.isAbsolute(entry.voice)
        ? entry.voice
        : path.join(PATHS.VOICES_DIR, entry.voice);
      if (existsSync(explicitWav)) {
        return { mode: VOICE_MODE.CUSTOM_WAV, voice: entry.voice, wavPath: explicitWav, speed, gender: isFemale ? 'female' : 'male' };
      }
      console.warn(`[WARN] Không tìm thấy file giọng mẫu "${explicitWav}", fallback về built-in.`);
    } else {
      return { mode: VOICE_MODE.BUILTIN, voice: entry.voice, wavPath: null, speed, gender: isFemale ? 'female' : 'male' };
    }
  }

  // 2. Tone-based custom .wav sample if available (blv_hype.wav / blv_normal.wav / blv_calm.wav)
  const toneWavName = TONE_CUSTOM_WAV_FILE[entry.tone];
  const toneWavPath = path.join(PATHS.VOICES_DIR, toneWavName);
  if (existsSync(toneWavPath)) {
    return { mode: VOICE_MODE.CUSTOM_WAV, voice: toneWavName, wavPath: toneWavPath, speed, gender: isFemale ? 'female' : 'male' };
  }

  // 3. Gender-based resolution: Male vs Female BLV
  const targetVoice = isFemale
    ? VIET_TTS_CONFIG.DEFAULT_FEMALE_VOICE
    : VIET_TTS_CONFIG.DEFAULT_MALE_VOICE;

  if (targetVoice && targetVoice.toLowerCase().endsWith('.wav')) {
    const customWav = path.isAbsolute(targetVoice)
      ? targetVoice
      : path.join(PATHS.VOICES_DIR, targetVoice);
    if (existsSync(customWav)) {
      return {
        mode: VOICE_MODE.CUSTOM_WAV,
        voice: targetVoice,
        wavPath: customWav,
        speed,
        gender: isFemale ? 'female' : 'male',
      };
    }
  }

  return {
    mode: VOICE_MODE.BUILTIN,
    voice: targetVoice,
    wavPath: null,
    speed,
    gender: isFemale ? 'female' : 'male',
  };
}

function computeEntryHash(entry, voiceSpec) {
  const version = voiceSpec.gender === 'female' ? FEMALE_FILTER_VERSION : MALE_FILTER_VERSION;
  const payload = JSON.stringify({
    text: entry.text,
    tone: entry.tone,
    voice: voiceSpec.voice,
    voiceMode: voiceSpec.mode,
    speed: voiceSpec.speed,
    filterVersion: version,
  });
  return createHash('sha256').update(payload).digest('hex');
}

// ── Viet-TTS Synthesis ───────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestBuiltinSpeech(baseUrl, text, voice, speed) {
  const response = await fetch(`${baseUrl}${VIET_TTS_CONFIG.OPENAI_SPEECH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VIET_TTS_CONFIG.MODEL,
      input: text,
      voice,
      response_format: 'wav',
      speed,
    }),
    signal: AbortSignal.timeout(VIET_TTS_CONFIG.SYNTH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Viet-TTS /v1/audio/speech HTTP ${response.status}: ${errText.slice(0, 120)}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (audioBuffer.length === 0) {
    throw new Error('Viet-TTS returned empty audio buffer');
  }
  return audioBuffer;
}

async function requestClonedSpeech(baseUrl, text, wavPath, speed) {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('speed', String(speed));
  const wavBlob = new Blob([readFileSync(wavPath)], { type: 'audio/wav' });
  formData.append('audio_file', wavBlob, path.basename(wavPath));

  const response = await fetch(`${baseUrl}${VIET_TTS_CONFIG.CLONE_TTS_PATH}`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(VIET_TTS_CONFIG.SYNTH_TIMEOUT_MS),
  });

  // Fallback gracefully if this Viet-TTS deployment only exposes OpenAI /v1/audio/speech
  if (response.status === 404 || response.status === 405) {
    console.warn(`  [WARN] Endpoint ${VIET_TTS_CONFIG.CLONE_TTS_PATH} không khả dụng (HTTP ${response.status}), fallback về giọng built-in.`);
    return requestBuiltinSpeech(baseUrl, text, VIET_TTS_CONFIG.DEFAULT_BUILTIN_VOICE, speed);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Viet-TTS /v1/tts HTTP ${response.status}: ${errText.slice(0, 120)}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (audioBuffer.length === 0) {
    throw new Error('Viet-TTS clone endpoint returned empty audio buffer');
  }
  return audioBuffer;
}

async function synthesizeWithRetry(baseUrl, text, voiceSpec) {
  let lastError = null;

  for (let attempt = 1; attempt <= VIET_TTS_CONFIG.MAX_RETRIES; attempt += 1) {
    try {
      if (voiceSpec.mode === VOICE_MODE.CUSTOM_WAV && voiceSpec.wavPath) {
        return await requestClonedSpeech(baseUrl, text, voiceSpec.wavPath, voiceSpec.speed);
      }
      return await requestBuiltinSpeech(baseUrl, text, voiceSpec.voice, voiceSpec.speed);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < VIET_TTS_CONFIG.MAX_RETRIES) {
        const delayMs = VIET_TTS_CONFIG.RETRY_BASE_DELAY_MS * attempt;
        console.warn(`  ↻ Retry ${attempt}/${VIET_TTS_CONFIG.MAX_RETRIES} sau ${delayMs / 1000}s (${lastError.message})`);
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error('Viet-TTS synthesis failed');
}

// ── FFmpeg Post-Processing & Duration Probe ──────────────────────────────────

function buildFilterChain(tone, voiceMode, isFemale = false) {
  if (isFemale && voiceMode !== VOICE_MODE.CUSTOM_WAV) {
    const toneFilter = FEMALE_TONE_FILTERS[tone] || FEMALE_TONE_FILTERS.normal;
    return `${SILENCE_TRIM_FILTER},${toneFilter}`;
  }
  const toneFilterMap =
    voiceMode === VOICE_MODE.CUSTOM_WAV ? CUSTOM_WAV_TONE_FILTERS : BUILTIN_TONE_FILTERS;
  const toneFilter = toneFilterMap[tone] || toneFilterMap.normal;
  return `${SILENCE_TRIM_FILTER},${toneFilter}`;
}

function postProcessWavToMp3(rawWavPath, outputMp3Path, tone, voiceMode, isFemale = false) {
  const filterChain = buildFilterChain(tone, voiceMode, isFemale);
  const tmpMp3Path = `${outputMp3Path}.tmp.mp3`;

  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', rawWavPath, '-af', filterChain, ...MP3_ENCODE_ARGS, tmpMp3Path],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );
    mkdirSync(path.dirname(outputMp3Path), { recursive: true });
    renameSync(tmpMp3Path, outputMp3Path);
  } finally {
    if (existsSync(tmpMp3Path)) {
      rmSync(tmpMp3Path, { force: true });
    }
  }
}

function probeDurationSeconds(filePath) {
  try {
    const raw = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }
    ).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Orphan Cleanup ───────────────────────────────────────────────────────────

function cleanOrphanedFiles(allEntries, cache, isDryRun) {
  if (!existsSync(PATHS.OUTPUT_DIR)) return 0;

  const validFilenames = new Set(allEntries.map((entry) => `${entry.id}.mp3`));
  const validIds = new Set(allEntries.map((entry) => entry.id));
  const diskFiles = readdirSync(PATHS.OUTPUT_DIR).filter((name) => name.toLowerCase().endsWith('.mp3'));

  let removedCount = 0;
  for (const filename of diskFiles) {
    if (validFilenames.has(filename)) continue;
    const targetPath = path.join(PATHS.OUTPUT_DIR, filename);
    if (isDryRun) {
      console.log(`[DRY-CLEAN] Sẽ xóa file mồ côi: ${filename}`);
    } else {
      rmSync(targetPath, { force: true });
      console.log(`[CLEAN] Đã xóa file mồ côi: ${filename}`);
    }
    removedCount += 1;
  }

  if (!isDryRun) {
    for (const cachedId of Object.keys(cache)) {
      if (!validIds.has(cachedId)) {
        delete cache[cachedId];
      }
    }
  }

  return removedCount;
}

// ── Main Orchestrator ────────────────────────────────────────────────────────

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const allEntries = loadCastersJson();
  const cache = loadCache();

  const targetEntries =
    options.only.length > 0
      ? allEntries.filter(
          (entry) => options.only.includes(entry.id) || options.only.includes(entry.category)
        )
      : allEntries;

  if (targetEntries.length === 0) {
    console.error(`[ERROR] Không có câu thoại nào khớp với --only=${options.only.join(',')}`);
    process.exit(1);
  }

  if (!options.dryRun) {
    verifyFfmpegInstalled();
    await verifyVietTtsServer(VIET_TTS_CONFIG.BASE_URL);
    mkdirSync(PATHS.OUTPUT_DIR, { recursive: true });
  }

  console.log('===============================================================');
  console.log(`Caster Audio Generator | Male: ${MALE_FILTER_VERSION}, Female: ${FEMALE_FILTER_VERSION} | Total: ${targetEntries.length}/${allEntries.length}`);
  console.log(`Viet-TTS URL : ${VIET_TTS_CONFIG.BASE_URL}`);
  console.log(`Giọng Nam    : ${VIET_TTS_CONFIG.DEFAULT_MALE_VOICE}`);
  console.log(`Giọng Nữ     : ${VIET_TTS_CONFIG.DEFAULT_FEMALE_VOICE}`);
  console.log(`Voices Dir   : ${PATHS.VOICES_DIR}`);
  console.log(`Output Dir   : ${PATHS.OUTPUT_DIR}`);
  if (options.dryRun) console.log('Mode         : DRY RUN (không gọi TTS / FFmpeg)');
  if (options.force) console.log('Force        : ON (bỏ qua cache)');
  console.log('===============================================================');

  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const longWarnings = [];

  for (let i = 0; i < targetEntries.length; i += 1) {
    const entry = targetEntries[i];
    const progress = `[${i + 1}/${targetEntries.length}]`;
    const voiceSpec = resolveVoiceSpec(entry);
    const genderTag = voiceSpec.gender === 'female' ? 'Nữ' : 'Nam';
    const entryHash = computeEntryHash(entry, voiceSpec);
    const outputMp3Path = path.join(PATHS.OUTPUT_DIR, `${entry.id}.mp3`);

    const isCacheHit = !options.force && cache[entry.id] === entryHash && existsSync(outputMp3Path);
    if (isCacheHit) {
      console.log(`${progress} ${entry.id} (${genderTag}: ${voiceSpec.voice}, ${entry.tone}) -> SKIP (cached)`);
      skipCount += 1;
      continue;
    }

    if (options.dryRun) {
      console.log(
        `${progress} ${entry.id} (${genderTag}: ${voiceSpec.voice}, ${entry.tone}, speed=${voiceSpec.speed}) -> WOULD GENERATE`
      );
      continue;
    }

    const rawWavPath = path.join(tmpdir(), `caster_raw_${entry.id}_${Date.now()}.wav`);
    try {
      const wavBuffer = await synthesizeWithRetry(VIET_TTS_CONFIG.BASE_URL, entry.text, voiceSpec);
      writeFileSync(rawWavPath, wavBuffer);

      postProcessWavToMp3(rawWavPath, outputMp3Path, entry.tone, voiceSpec.mode, voiceSpec.gender === 'female');

      const durationSec = probeDurationSeconds(outputMp3Path);
      const durationLabel = durationSec !== null ? `${durationSec.toFixed(1)}s` : '?s';
      const isTooLong = durationSec !== null && durationSec > DURATION_WARNING_THRESHOLD_SEC;
      const warnTag = isTooLong ? ` [WARN > ${DURATION_WARNING_THRESHOLD_SEC}s]` : '';

      if (isTooLong) {
        longWarnings.push({ id: entry.id, durationSec });
      }

      cache[entry.id] = entryHash;
      saveCache(cache);

      console.log(`${progress} ${entry.id} (${genderTag}: ${voiceSpec.voice}, ${entry.tone}) - ${durationLabel} -> OK${warnTag}`);
      okCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${progress} ${entry.id} (${genderTag}: ${voiceSpec.voice}, ${entry.tone}) -> FAIL (${message})`);
      failCount += 1;
    } finally {
      if (existsSync(rawWavPath)) {
        rmSync(rawWavPath, { force: true });
      }
    }
  }

  let cleanedCount = 0;
  if (options.clean) {
    cleanedCount = cleanOrphanedFiles(allEntries, cache, options.dryRun);
    if (!options.dryRun) {
      saveCache(cache);
    }
  }

  if (!options.dryRun) {
    syncFrontendManifest(allEntries);
  }

  console.log('===============================================================');
  if (options.dryRun) {
    console.log(`Dry run hoàn tất: ${targetEntries.length - skipCount} sẽ sinh, ${skipCount} bỏ qua (cached), ${cleanedCount} file mồ côi.`);
  } else {
    console.log(`Hoàn tất: ${okCount} OK | ${skipCount} SKIP | ${failCount} FAIL | ${cleanedCount} CLEANED`);
    console.log(`Đã đồng bộ manifest frontend: ${PATHS.FRONTEND_MANIFEST}`);
  }

  if (longWarnings.length > 0) {
    console.warn(`\n⚠ Cảnh báo ${longWarnings.length} câu dài quá ${DURATION_WARNING_THRESHOLD_SEC}s (nên rút gọn text để tránh trễ nhịp):`);
    for (const item of longWarnings) {
      console.warn(`  - ${item.id}: ${item.durationSec.toFixed(2)}s`);
    }
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[FATAL]', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
