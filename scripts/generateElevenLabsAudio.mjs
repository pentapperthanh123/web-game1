#!/usr/bin/env node
/**
 * ElevenLabs Static Caster Audio Generator
 *
 * Reads `server/data/casters.json`, synthesizes each line via ElevenLabs Multilingual v2,
 * applies silence-trimming and esports-ready FFmpeg filters, encodes to MP3
 * (`client/public/audio/casters/<id>.mp3`), caches hashes in
 * `scripts/.elevenlabs-audio-cache.json`, and syncs `client/src/data/castersManifest.json`.
 *
 * Usage:
 *   node scripts/generateElevenLabsAudio.mjs [options]
 *   pnpm run audio:elevenlabs -- [options]
 *
 * Options:
 *   --only=<id_or_cat>      Generate only matching entry IDs or categories (comma-separated)
 *   --category=<category>   Generate only lines in this category
 *   --gender=<male|female>  Filter by speaker gender
 *   --force                 Ignore cache and regenerate selected entries
 *   --dry-run               Preview character usage and quota impact without calling ElevenLabs API
 *   --no-ffmpeg             Skip FFmpeg post-processing (write raw ElevenLabs MP3)
 *   --help                  Show usage instructions
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

// ── File Paths ───────────────────────────────────────────────────────────────

const PATHS = {
  SERVER_ENV: path.join(REPO_ROOT, 'server', '.env'),
  CASTERS_JSON: path.join(REPO_ROOT, 'server', 'data', 'casters.json'),
  FRONTEND_MANIFEST: path.join(REPO_ROOT, 'client', 'src', 'data', 'castersManifest.json'),
  OUTPUT_DIR: path.join(REPO_ROOT, 'client', 'public', 'audio', 'casters'),
  CACHE_DIR: path.join(REPO_ROOT, 'server', 'data', 'tts-cache'),
  CACHE_FILE: path.join(SCRIPT_DIR, '.elevenlabs-audio-cache.json'),
};

// ── ElevenLabs Defaults ─────────────────────────────────────────────────────

const ELEVENLABS_CONFIG = {
  ENDPOINT_TEMPLATE: 'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128',
  DEFAULT_MODEL: 'eleven_multilingual_v2',
  DEFAULT_VOICE: {
    male: 'pNInz6obpgDQGcFmaJgB', // Adam (Deep, clear esports caster tone)
    female: 'cgSgspJ2msm6clMCkdW9', // Jessica (Premade Free - Playful, Bright, Warm)
  },
  FREE_MONTHLY_QUOTA_CHARS: 10_000,
  REQUEST_TIMEOUT_MS: 30_000,
  REQUEST_DELAY_MS: 600, // Safe pacing between API calls
  MAX_RETRIES: 2,
};

// ── Voice Settings per Tone ──────────────────────────────────────────────────

const TONE_SETTINGS = {
  hype: {
    stability: 0.38,
    similarity_boost: 0.85,
    style: 0.20,
    use_speaker_boost: true,
  },
  normal: {
    stability: 0.50,
    similarity_boost: 0.80,
    style: 0.05,
    use_speaker_boost: true,
  },
  calm: {
    stability: 0.65,
    similarity_boost: 0.80,
    style: 0.0,
    use_speaker_boost: true,
  },
};

// ── FFmpeg Post-Processing Filters ──────────────────────────────────────────

const SILENCE_TRIM_FILTER =
  'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,' +
  'areverse';

const MALE_ESPORTS_FILTER =
  'aresample=44100,' +
  'equalizer=f=120:t=q:w=1.0:g=1.5,' +
  'equalizer=f=3000:t=q:w=1.5:g=3.0,' +
  'acompressor=threshold=-18dB:ratio=3:attack=8:release=80,' +
  'volume=2dB,' +
  'alimiter=limit=0.98';

const FEMALE_ESPORTS_FILTER =
  'aresample=44100,' +
  'equalizer=f=350:t=q:w=1.0:g=1.5,' +
  'equalizer=f=3200:t=q:w=1.8:g=-1.5,' +
  'equalizer=f=7500:t=q:w=1.5:g=2.0,' +
  'acompressor=threshold=-18dB:ratio=2.5:attack=10:release=90,' +
  'volume=2dB,' +
  'alimiter=limit=0.98';

const MP3_ENCODE_ARGS = ['-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1'];

// ── Environment Loader ───────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
🎙️  ElevenLabs Static Caster Audio Generator (Multilingual v2)

Usage:
  node scripts/generateElevenLabsAudio.mjs [options]
  pnpm run audio:elevenlabs -- [options]

Options:
  --only=<id_or_cat>      Filter by entry id or category (comma-separated, e.g. --only=match_start_01)
  --category=<category>   Filter by category (e.g. --category=hype_short)
  --gender=<male|female>  Filter by speaker gender
  --force                 Regenerate all matching entries, ignoring cache
  --dry-run               Preview character usage and quota without calling API
  --no-ffmpeg             Skip FFmpeg audio normalization
  --voice-male=<voiceId>  Override male voice ID
  --voice-female=<voiceId>Override female voice ID
  --help                  Show this help screen
`);
}

function parseCliArgs(argv) {
  const options = {
    only: null,
    category: null,
    gender: null,
    force: false,
    dryRun: false,
    noFfmpeg: false,
    voiceMale: null,
    voiceFemale: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-ffmpeg') options.noFfmpeg = true;
    else if (arg.startsWith('--only=')) {
      options.only = new Set(
        arg.slice(7).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      );
    } else if (arg.startsWith('--category=')) {
      options.category = arg.slice(11).trim().toLowerCase();
    } else if (arg.startsWith('--gender=')) {
      options.gender = arg.slice(9).trim().toLowerCase();
    } else if (arg.startsWith('--voice-male=')) {
      options.voiceMale = arg.slice(13).trim();
    } else if (arg.startsWith('--voice-female=')) {
      options.voiceFemale = arg.slice(15).trim();
    }
  }

  return options;
}

// ── Cache & Manifest Helpers ─────────────────────────────────────────────────

function loadCache() {
  if (!existsSync(PATHS.CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(PATHS.CACHE_FILE, 'utf-8'));
  } catch {
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

function computeHash(entry, voiceId, modelId) {
  return createHash('sha256')
    .update(JSON.stringify({ text: entry.text, tone: entry.tone, voiceId, modelId }))
    .digest('hex');
}

// ── ElevenLabs API Caller ────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchElevenLabsAudio(text, voiceId, tone, apiKey, modelId) {
  const url = ELEVENLABS_CONFIG.ENDPOINT_TEMPLATE.replace('{voice_id}', voiceId);
  const settings = TONE_SETTINGS[tone] || TONE_SETTINGS.normal;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: settings,
    }),
    signal: AbortSignal.timeout(ELEVENLABS_CONFIG.REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) throw new Error('Received empty audio stream from ElevenLabs');
  return audio;
}

// ── FFmpeg Processing ────────────────────────────────────────────────────────

function processAudioWithFfmpeg(inputBuffer, gender, tone) {
  const tmpIn = path.join(tmpdir(), `el-in-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
  const tmpOut = path.join(tmpdir(), `el-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

  writeFileSync(tmpIn, inputBuffer);

  const filterChain = gender === 'female' ? FEMALE_ESPORTS_FILTER : MALE_ESPORTS_FILTER;
  const fullFilter = `${SILENCE_TRIM_FILTER},${filterChain}`;

  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-i', tmpIn, '-af', fullFilter, ...MP3_ENCODE_ARGS, tmpOut],
      { stdio: 'pipe', windowsHide: true }
    );
    const processed = readFileSync(tmpOut);
    return processed;
  } catch (err) {
    console.warn(`[WARN] FFmpeg processing failed (${err.message}), using raw ElevenLabs MP3.`);
    return inputBuffer;
  } finally {
    if (existsSync(tmpIn)) rmSync(tmpIn, { force: true });
    if (existsSync(tmpOut)) rmSync(tmpOut, { force: true });
  }
}

// ── Main Execution ───────────────────────────────────────────────────────────

async function main() {
  const options = parseCliArgs(process.argv);
  const env = { ...process.env, ...parseEnvFile(PATHS.SERVER_ENV) };

  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const maleVoice = options.voiceMale || env.ELEVENLABS_VOICE_MALE?.trim() || ELEVENLABS_CONFIG.DEFAULT_VOICE.male;
  const femaleVoice = options.voiceFemale || env.ELEVENLABS_VOICE_FEMALE?.trim() || ELEVENLABS_CONFIG.DEFAULT_VOICE.female;
  const modelId = env.ELEVENLABS_MODEL?.trim() || ELEVENLABS_CONFIG.DEFAULT_MODEL;

  console.log('='.repeat(70));
  console.log('🎙️  ELEVENLABS CASTER AUDIO GENERATOR');
  console.log('='.repeat(70));
  console.log(`Model:           ${modelId}`);
  console.log(`Male Voice ID:   ${maleVoice}`);
  console.log(`Female Voice ID: ${femaleVoice}`);
  console.log(`API Key:         ${apiKey ? `Configured (${apiKey.slice(0, 6)}...${apiKey.slice(-4)})` : '❌ NOT CONFIGURED'}`);
  console.log('='.repeat(70));

  if (!apiKey && !options.dryRun) {
    console.error('\n❌ ERROR: Chưa tìm thấy ELEVENLABS_API_KEY trong server/.env!');
    console.error('👉 Vui lòng mở file server/.env và điền: ELEVENLABS_API_KEY=xi_api_key_cua_ban');
    console.error('   (Hoặc thêm cờ --dry-run để xem trước danh sách câu thoại mà không cần key).\n');
    process.exit(1);
  }

  // Load entries
  if (!existsSync(PATHS.CASTERS_JSON)) {
    console.error(`❌ Không tìm thấy file: ${PATHS.CASTERS_JSON}`);
    process.exit(1);
  }
  const allEntries = JSON.parse(readFileSync(PATHS.CASTERS_JSON, 'utf-8'));

  // Filter entries
  const targetEntries = allEntries.filter((entry) => {
    if (options.gender && entry.gender !== options.gender) return false;
    if (options.category && entry.category.toLowerCase() !== options.category) return false;
    if (options.only) {
      const matchId = options.only.has(entry.id.toLowerCase());
      const matchCat = options.only.has(entry.category.toLowerCase());
      if (!matchId && !matchCat) return false;
    }
    return true;
  });

  if (targetEntries.length === 0) {
    console.log('⚠️  Không có câu thoại nào khớp với điều kiện lọc.');
    process.exit(0);
  }

  // Cache & Quota calculation
  const cache = loadCache();
  const toGenerate = [];
  let totalChars = 0;

  for (const entry of targetEntries) {
    const isFemale = entry.gender === 'female';
    const voiceId = isFemale ? femaleVoice : maleVoice;
    const hash = computeHash(entry, voiceId, modelId);
    const outFile = path.join(PATHS.OUTPUT_DIR, `${entry.id}.mp3`);
    const isCached = !options.force && cache[entry.id] === hash && existsSync(outFile);

    if (!isCached) {
      toGenerate.push({ entry, voiceId, hash, outFile, isFemale });
      totalChars += entry.text.length;
    }
  }

  const quotaPercent = ((totalChars / ELEVENLABS_CONFIG.FREE_MONTHLY_QUOTA_CHARS) * 100).toFixed(1);

  console.log(`\n📊 THỐNG KÊ KẾ HOẠCH TẠO ÂM THANH:`);
  console.log(`- Tổng số câu trong danh mục: ${targetEntries.length}`);
  console.log(`- Đã có sẵn trong cache:     ${targetEntries.length - toGenerate.length}`);
  console.log(`- Cần gọi ElevenLabs API:     ${toGenerate.length}`);
  console.log(`- Tổng số ký tự cần tạo:     ${totalChars.toLocaleString()} ký tự`);
  console.log(`- Ước tính tiêu hao hạn mức: ~${quotaPercent}% / 10,000 credits Free của tháng`);

  // Always sync frontend manifest with casters.json
  syncFrontendManifest(allEntries);

  if (options.dryRun) {
    console.log('\n🔍 [DRY-RUN] Danh sách các câu thoại sẽ được tạo:');
    toGenerate.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.entry.id}] (${item.entry.gender}, ${item.entry.tone}): "${item.entry.text}" (${item.entry.text.length} chars)`);
    });
    console.log('\n✅ Chế độ xem trước hoàn tất. Không có API call nào được thực hiện.');
    return;
  }

  if (toGenerate.length === 0) {
    console.log('\n✨ Toàn bộ file âm thanh đã tồn tại và khớp cache! (Dùng --force nếu muốn tạo lại).');
    syncFrontendManifest(allEntries);
    return;
  }

  mkdirSync(PATHS.OUTPUT_DIR, { recursive: true });
  mkdirSync(PATHS.CACHE_DIR, { recursive: true });

  console.log(`\n🚀 BẮT ĐẦU TỔNG HỢP ${toGenerate.length} CÂU QUA ELEVENLABS...`);
  let successCount = 0;
  let failCount = 0;
  let charsUsed = 0;

  for (let idx = 0; idx < toGenerate.length; idx++) {
    const item = toGenerate[idx];
    const { entry, voiceId, hash, outFile, isFemale } = item;
    const progress = `[${idx + 1}/${toGenerate.length}]`;

    process.stdout.write(`${progress} Đang tạo ${entry.id} (${entry.gender}, ${entry.text.length} ký tự)... `);

    let rawAudio = null;
    let attempts = 0;

    while (attempts <= ELEVENLABS_CONFIG.MAX_RETRIES) {
      try {
        rawAudio = await fetchElevenLabsAudio(entry.text, voiceId, entry.tone, apiKey, modelId);
        break;
      } catch (err) {
        attempts++;
        if (attempts > ELEVENLABS_CONFIG.MAX_RETRIES) {
          console.log(`❌ THẤT BẠI: ${err.message}`);
          if (err.message.includes('missing_permissions') || err.message.includes('text_to_speech')) {
            console.log('\n👉 LƯU Ý: API Key ElevenLabs này đang bị thiếu quyền "Text to Speech".');
            console.log('   Bạn hãy vào https://elevenlabs.io/app/settings/api-keys');
            console.log('   Tạo một Key mới và chọn "Full Access" (hoặc tích bật quyền Text to Speech), rồi dán lại vào server/.env nhé!\n');
          }
          failCount++;
          break;
        }
        await sleep(1500 * attempts);
      }
    }

    if (!rawAudio) continue;

    // Post-process with FFmpeg
    let finalAudio = rawAudio;
    if (!options.noFfmpeg) {
      finalAudio = processAudioWithFfmpeg(rawAudio, isFemale ? 'female' : 'male', entry.tone);
    }

    // Save to public audio casters
    writeFileSync(outFile, finalAudio);

    // Save to server TTS disk cache so server matches instantly
    const lang = 'vi';
    const role = isFemale ? 'female' : 'male';
    const serverVoiceTag = `ELEVENLABS:${voiceId}:${modelId}`;
    const serverKey = `${lang}|${role}||||${entry.text}`;
    const serverDiskHash = createHash('sha1').update(`${serverVoiceTag}|${serverKey}`).digest('hex');
    const serverDiskPath = path.join(PATHS.CACHE_DIR, `${serverDiskHash}.mp3`);
    writeFileSync(serverDiskPath, finalAudio);

    // Update cache
    cache[entry.id] = hash;
    saveCache(cache);

    successCount++;
    charsUsed += entry.text.length;
    console.log(`✅ OK (${(finalAudio.length / 1024).toFixed(1)} KB)`);

    // Delay between requests
    if (idx < toGenerate.length - 1) {
      await sleep(ELEVENLABS_CONFIG.REQUEST_DELAY_MS);
    }
  }

  // Update manifest
  syncFrontendManifest(allEntries);

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 HOÀN THÀNH: Thành công ${successCount}/${toGenerate.length} câu thoại! (Thất bại: ${failCount})`);
  console.log(`💎 Số credit ElevenLabs đã tiêu thụ: ${charsUsed.toLocaleString()} ký tự`);
  console.log(`📁 Thư mục lưu file: ${PATHS.OUTPUT_DIR}`);
  console.log('='.repeat(70) + '\n');
}

main().catch((err) => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
