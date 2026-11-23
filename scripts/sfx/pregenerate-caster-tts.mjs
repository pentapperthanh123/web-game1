// Pre-generates all static/predictable AI Caster voice lines into both:
//   1. Dedicated folder: `server/data/viet-tts-audio/` (with readable filenames + manifest.json)
//   2. Game TTS Disk Cache: `server/data/tts-cache/*.mp3` (0ms synthesis delay during live gameplay)
//
// Supports providers:
//   - VIET_TTS (http://huggingface.co/dangvansam/viet-tts via OpenAI-compatible `/v1/audio/speech`)
//   - GOOGLE_TRANSLATE
//   - EDGE
//
// Usage:
//   node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS [--url=http://localhost:8298] [--voice-male=cdteam] [--voice-female=quynh] [--limit=10] [--force]
//   node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --text="Baron Nashor tung Đại Địa Chấn Hư Không!"
//   node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --input-file=custom-lines.txt
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT_DIR = existsSync(path.join(REPO_ROOT, 'apps/web-game1/client'))
  ? path.join(REPO_ROOT, 'apps/web-game1/client')
  : path.join(REPO_ROOT, 'client');
const VI_MESSAGES_PATH = path.join(CLIENT_DIR, 'src/i18n/messages/vi.json');
const BOSS_SKILLS_PATH = path.join(CLIENT_DIR, 'src/constants/bossSkills.ts');
const GAME_CONSTANTS_PATH = path.join(CLIENT_DIR, 'src/constants/game.ts');
const TEAMS_CONSTANTS_PATH = path.join(CLIENT_DIR, 'src/constants/teams.ts');

const CACHE_DIR = path.join(REPO_ROOT, 'server/data/tts-cache');
const DEDICATED_VIET_TTS_DIR = path.join(REPO_ROOT, 'server/data/viet-tts-audio');
const CACHE_MANIFEST_PATH = path.join(CACHE_DIR, 'static-manifest.json');
const DEDICATED_MANIFEST_PATH = path.join(DEDICATED_VIET_TTS_DIR, 'manifest.json');

const DEFAULT_LANG = 'vi';
const ROLE_MALE = 'male';
const ROLE_FEMALE = 'female';

const GOOGLE_TRANSLATE_URL = 'https://translate.google.com/translate_tts';
const GOOGLE_CLIENT = 'tw-ob';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 12_000;
const VIET_TTS_TIMEOUT_MS = 90_000;
const REQUEST_DELAY_MS = 150;

const EDGE_VOICE_VI = 'vi-VN-NamMinhNeural';
const EDGE_RATE_DEFAULT = '+0%';
const EDGE_PITCH_SAFE = '+0Hz';

const DEFAULT_VIET_TTS_URL = process.env.VIET_TTS_URL || 'http://localhost:8298';
const DEFAULT_VIET_TTS_VOICE_MALE = process.env.VIET_TTS_VOICE_MALE || 'cdteam';
const DEFAULT_VIET_TTS_VOICE_FEMALE = process.env.VIET_TTS_VOICE_FEMALE || 'quynh';

const GUIDE_CHAMPIONS = ['Ahri', 'Yasuo', 'Lee Sin', 'Jinx', 'Garen', 'Lux'];
const ROUNDS = [1, 2, 3, 4, 5];
const SERIES_FORMATS = ['BO1', 'BO3', 'BO5'];
const SHIELD_SECONDS = 12;
const SHIELD_BREAK_DMG = '4 nghìn';
const SHIELD_HEAL_HP = '8 nghìn';
const BOSS_MAX_HP_SPOKEN = '100 nghìn';
const HEART_MILESTONES = [200, 400, 600, 800, 1000];
const HEART_HEAL_AMOUNT = 100;

const getArgValue = (prefix) =>
  process.argv
    .find((arg) => arg.startsWith(`${prefix}=`))
    ?.slice(prefix.length + 1)
    ?.trim();

const isForce = process.argv.includes('--force');
const isDryRun = process.argv.includes('--dry-run');
const providerArg = (getArgValue('--provider') || process.env.CASTER_TTS_PROVIDER || 'GOOGLE_TRANSLATE').toUpperCase();
const activeProvider =
  providerArg === 'VIET_TTS' || providerArg === 'VIET-TTS' || providerArg === 'VIETTTS'
    ? 'VIET_TTS'
    : providerArg === 'EDGE'
      ? 'EDGE'
      : 'GOOGLE_TRANSLATE';

const vietTtsBaseUrl = (getArgValue('--url') || DEFAULT_VIET_TTS_URL).replace(/\/+$/, '');
const vietTtsVoiceMale = getArgValue('--voice-male') || getArgValue('--voice') || DEFAULT_VIET_TTS_VOICE_MALE;
const vietTtsVoiceFemale = getArgValue('--voice-female') || DEFAULT_VIET_TTS_VOICE_FEMALE;
const singleTextArg = getArgValue('--text');
const inputFileArg = getArgValue('--input-file');
const limitArg = Number(getArgValue('--limit') || 0);

const PICTOGRAPHS = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const WHITESPACE_RUN = /\s+/g;
const SCORE_PATTERN = /(\d+)\s*[-–—]\s*(\d+)/g;
const MARK_RUN = /([!?.])[!?.]+/g;
const UNFILLED_SLOT = /\{\{|\}\}/;

/** Mirrors `toSpeakableText` + `toVoiceText` from the client so cache keys match 100%. */
const toCanonicalVoiceText = (rawText, casterVoiceConfig) => {
  const speakable = String(rawText ?? '')
    .replace(PICTOGRAPHS, '')
    .replace(WHITESPACE_RUN, ' ')
    .trim();
  if (!speakable) return '';
  const casterTitle = casterVoiceConfig?.casterTitle ?? 'bình luận viên';
  const scoreJoiner = casterVoiceConfig?.scoreJoiner ?? ' ';
  return speakable
    .replace(/\bBLV\b/g, casterTitle)
    .replace(SCORE_PATTERN, `$1${scoreJoiner}$2`)
    .replace(MARK_RUN, '$1')
    .replace(WHITESPACE_RUN, ' ')
    .trim();
};

const interpolate = (template, slots) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => (slots[key] !== undefined ? String(slots[key]) : `{{${key}}}`));

/** Extracts boss Vietnamese names from `client/src/constants/game.ts`. */
const extractBossNames = (source) => {
  const names = new Set();
  for (const match of source.matchAll(/bossName:\s*'([^']+)'/g)) {
    names.add(match[1]);
  }
  return Array.from(names);
};

/** Maps each boss Vietnamese name to its own skill array identifier in `bossSkills.ts`. */
const BOSS_NAME_TO_SKILL_ARRAY = {
  'Baron Nashor': 'BARON_SKILLS',
  'Rồng Ngàn Tuổi': 'ELDER_DRAGON_SKILLS',
  'Sứ Giả Khe Nứt': 'RIFT_HERALD_SKILLS',
  'Rồng Núi Nham Thạch': 'MOUNTAIN_DRAGON_SKILLS',
  'Rồng Già Bão Tố': 'STORM_DRAGON_SKILLS',
  'Thần Hư Vô Nguyên Thủy': 'VOID_TITAN_SKILLS',
};

/** Extracts boss skills (`vietnameseName` + `isUltimate`) grouped by skill array name from `client/src/constants/bossSkills.ts`. */
const extractBossSkillsByArray = (source) => {
  const skillsByArray = {};
  const arrayBlockPattern = /export const (\w+_SKILLS):\s*BossSkillBase\[\]\s*=\s*\[([\s\S]*?)\];/g;
  const objectPattern = /\{[^{}]*vietnameseName:\s*'([^']+)'[^{}]*isUltimate:\s*(true|false)[^{}]*\}/gs;

  for (const arrayMatch of source.matchAll(arrayBlockPattern)) {
    const arrayName = arrayMatch[1];
    const blockBody = arrayMatch[2];
    const list = [];
    for (const objMatch of blockBody.matchAll(objectPattern)) {
      list.push({
        vietnameseName: objMatch[1],
        isUltimate: objMatch[2] === 'true',
      });
    }
    skillsByArray[arrayName] = list;
  }
  return skillsByArray;
};

/** Extracts team shortTags from `client/src/constants/teams.ts`. */
const extractTeamTags = (source) => {
  const tags = new Set();
  for (const match of source.matchAll(/shortTag:\s*'([^']+)'/g)) {
    if (match[1] !== 'NEW') tags.add(match[1]);
  }
  return Array.from(tags);
};

/** Signals spoken by Speaker B (Analyst / Female voice "quynh" when duo is enabled). */
const FEMALE_ROLE_SIGNALS = new Set([
  'EMPTY_FIELD_RALLY',
  'SERIES_OUTRO',
  'PRO_MVP',
  'PODIUM_THANKS',
  'NEXT_MATCH',
  'BANTER_GUIDE',
  'BANTER_CTA',
  'BANTER_LEAD',
  'BANTER_FIELD',
  'HEART_MILESTONE',
]);

/** Collects all static / predictable spoken lines across all bosses, skills, rounds, and teams. */
const collectAllStaticLines = (viJson, bossNames, skillsByArray, teamTags) => {
  const linesObj = viJson?.Caster?.lines ?? {};
  const voiceConfig = viJson?.Caster?.voice ?? {};
  const collected = new Map();

  const addLine = (rawText, category, intensity, role = ROLE_MALE) => {
    if (!rawText || UNFILLED_SLOT.test(rawText)) return;
    const text = toCanonicalVoiceText(rawText, voiceConfig);
    if (!text || text.length > 180) return;
    const mapKey = `${role}|${text}`;
    if (!collected.has(mapKey)) {
      collected.set(mapKey, { text, category, role, intensities: new Set([intensity]) });
    } else {
      collected.get(mapKey).intensities.add(intensity);
    }
  };

  const addTemplates = (signalKey, slots, intensity = 'normal') => {
    const templates = linesObj[signalKey];
    if (!Array.isArray(templates)) return;
    const role = FEMALE_ROLE_SIGNALS.has(signalKey) ? ROLE_FEMALE : ROLE_MALE;
    for (const tpl of templates) {
      const filled = interpolate(tpl, slots);
      if (!UNFILLED_SLOT.test(filled)) {
        addLine(filled, signalKey, intensity, role);
      }
    }
  };

  // 1. Highest priority: Boss Skill & Ultimate callouts (each boss paired ONLY with its own 4 skills)
  for (const boss of bossNames) {
    const arrayName = BOSS_NAME_TO_SKILL_ARRAY[boss];
    const bossSkills = (arrayName && skillsByArray[arrayName]) || [];
    for (const skill of bossSkills) {
      const signalKey = skill.isUltimate ? 'BOSS_ULTIMATE' : 'BOSS_SKILL';
      const intensity = skill.isUltimate ? 'climax' : 'hype';
      addTemplates(signalKey, { boss, skill: skill.vietnameseName }, intensity);
    }
  }

  // 2. Pure slot-free lines across all signals
  for (const [signalKey, templates] of Object.entries(linesObj)) {
    if (!Array.isArray(templates)) continue;
    const role = FEMALE_ROLE_SIGNALS.has(signalKey) ? ROLE_FEMALE : ROLE_MALE;
    for (const tpl of templates) {
      if (!UNFILLED_SLOT.test(tpl)) {
        addLine(tpl, signalKey, 'normal', role);
      }
    }
  }

  // Round intro static lines
  if (viJson?.RoundIntro?.speechGifts) {
    addLine(viJson.RoundIntro.speechGifts, 'ROUND_INTRO_GIFTS', 'normal', ROLE_MALE);
  }

  // 3. Boss-specific static lines (Enrage, Low HP, Phases, Shield, Round Go, Idle)
  for (const boss of bossNames) {
    const bossSlots = {
      boss,
      seconds: SHIELD_SECONDS,
      dmg: SHIELD_BREAK_DMG,
      hp: SHIELD_HEAL_HP,
    };
    addTemplates('BOSS_ENRAGE', bossSlots, 'climax');
    addTemplates('BOSS_LOW_HP', bossSlots, 'hype');
    addTemplates('BOSS_PHASE_TWO', bossSlots, 'hype');
    addTemplates('BOSS_PHASE_THREE', bossSlots, 'climax');
    addTemplates('BOSS_SHIELD_UP', bossSlots, 'hype');
    addTemplates('BOSS_SHIELD_BROKEN', bossSlots, 'hype');
    addTemplates('BOSS_SHIELD_ABSORBED', bossSlots, 'normal');
    addTemplates('BANTER_IDLE', bossSlots, 'normal');
    addTemplates('BANTER_EMPTY', bossSlots, 'normal');
    addTemplates('BOSS_WIPE_TAUNT', bossSlots, 'hype');

    for (const round of ROUNDS) {
      addTemplates('ROUND_GO', { boss, round }, 'hype');
      addTemplates('ROUND_INTRO_MATCHUP', { boss, round, hp: BOSS_MAX_HP_SPOKEN }, 'normal');
    }
  }

  // 4. Heart Milestone lines
  for (const count of HEART_MILESTONES) {
    addTemplates('HEART_MILESTONE', { count, heal: HEART_HEAL_AMOUNT }, 'hype');
  }

  // 5. Team & Matchup static lines
  for (const team of teamTags) {
    addTemplates('SERIES_OUTRO', { team }, 'normal');
    for (const round of ROUNDS) {
      for (const score of ['1 - 0', '1 - 1', '2 - 0', '2 - 1', '2 - 2', '3 - 0', '3 - 1', '3 - 2']) {
        addTemplates('ROUND_WIN', { team, round, score, boss: 'Boss' }, 'climax');
        addTemplates('SERIES_WIN', { team, score }, 'climax');
      }
    }
  }

  const popularPairs = [
    ['BLG', 'GEN'],
    ['T1', 'GEN'],
    ['T1', 'BLG'],
    ['T1', 'HLE'],
    ['G2', 'FLY'],
    ['GAM', 'T1'],
  ];
  for (const [teamA, teamB] of popularPairs) {
    addTemplates('COMEBACK', { team: teamA, teamOther: teamB }, 'hype');
    addTemplates('COMEBACK', { team: teamB, teamOther: teamA }, 'hype');
    addTemplates('BANTER_LEAD', { team: teamA, teamOther: teamB }, 'normal');
    addTemplates('BANTER_LEAD', { team: teamB, teamOther: teamA }, 'normal');
    addTemplates('NEXT_MATCH', { teamA, teamB }, 'normal');

    for (const format of SERIES_FORMATS) {
      addTemplates('SERIES_OPENING', { teamA, teamB, format, wins: 3, boss: 'Baron Nashor' }, 'normal');
    }
    for (const champion of GUIDE_CHAMPIONS) {
      addTemplates('BANTER_GUIDE', { teamA, teamB, champion }, 'normal');
      addTemplates('BANTER_EMPTY', { teamA, teamB, champion, boss: 'Baron Nashor' }, 'normal');
      addTemplates('EMPTY_FIELD_RALLY', { teamA, teamB, champion, boss: 'Baron Nashor' }, 'normal');
    }
  }

  return Array.from(collected.values());
};

/**
 * Computes canonical base disk cache filenames used by `createDiskCache` in `casterTtsService.ts`.
 * Because `casterTtsService.ts` resolves all intensity variants via `toBaseKey()`, storing only
 * the base keys keeps disk usage minimal and avoids evicting static clips under `MAX_FILES`.
 */
const computeCacheFileNames = (text, role, _intensities, providerName) => {
  const vietVoice = role === ROLE_FEMALE ? vietTtsVoiceFemale : vietTtsVoiceMale;
  const primaryTag =
    providerName === 'VIET_TTS'
      ? `VIET_TTS:${vietVoice}:${DEFAULT_LANG}`
      : providerName === 'EDGE'
        ? `EDGE:${EDGE_VOICE_VI}:${EDGE_RATE_DEFAULT}:${EDGE_PITCH_SAFE}`
        : `GOOGLE_TRANSLATE:${DEFAULT_LANG}`;

  const keys = new Set([
    `${DEFAULT_LANG}|${role}||||${text}`,
    `${DEFAULT_LANG}|${ROLE_MALE}||||${text}`,
    `${DEFAULT_LANG}|||||${text}`,
  ]);

  return Array.from(keys).map((key) => {
    const hash = createHash('sha1').update(`${primaryTag}|${key}`).digest('hex');
    return `${hash}.mp3`;
  });
};

/** Builds a clean dedicated filename for `server/data/viet-tts-audio/`. */
const buildDedicatedFileName = (index, category, voice, text) => {
  const idxStr = String(index + 1).padStart(4, '0');
  const shortHash = createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 10);
  const safeCat = String(category || 'CUSTOM')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase();
  return `${idxStr}_${safeCat}_${voice}_${shortHash}.mp3`;
};

const synthesizeVietTts = async (text, role) => {
  const voice = role === ROLE_FEMALE ? vietTtsVoiceFemale : vietTtsVoiceMale;
  const response = await fetch(`${vietTtsBaseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer viet-tts',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
      speed: 1.0,
    }),
    signal: AbortSignal.timeout(VIET_TTS_TIMEOUT_MS),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${errorBody}`.trim());
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length <= 128) throw new Error(`Invalid audio stream returned (buffer too small: ${buffer.length} bytes)`);
  return { buffer, voice };
};

const checkVietTtsHealth = async () => {
  try {
    const res = await fetch(`${vietTtsBaseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const synthesizeGoogle = async (text) => {
  const params = new URLSearchParams({
    ie: 'UTF-8',
    tl: DEFAULT_LANG,
    client: GOOGLE_CLIENT,
    q: text,
  });
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error('Empty audio buffer');
  return { buffer, voice: 'google-vi' };
};

const resolveEdgePython = () => {
  const candidates = [
    path.join(REPO_ROOT, 'server/.tts-venv/Scripts/python.exe'),
    path.join(REPO_ROOT, 'server/.tts-venv/bin/python'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? 'python';
};

const synthesizeEdge = (text, pythonBin) =>
  new Promise((resolve, reject) => {
    const tempFile = path.join(tmpdir(), `prebake-${randomUUID()}.mp3`);
    const args = [
      '-m',
      'edge_tts',
      `--voice=${EDGE_VOICE_VI}`,
      `--rate=${EDGE_RATE_DEFAULT}`,
      `--pitch=${EDGE_PITCH_SAFE}`,
      `--text=${text}`,
      `--write-media=${tempFile}`,
    ];
    execFile(pythonBin, args, { timeout: REQUEST_TIMEOUT_MS, windowsHide: true }, (error) => {
      try {
        if (error) {
          reject(error);
          return;
        }
        const buffer = readFileSync(tempFile);
        if (buffer.length === 0) {
          reject(new Error('Empty audio file'));
          return;
        }
        resolve({ buffer, voice: EDGE_VOICE_VI });
      } finally {
        rmSync(tempFile, { force: true });
      }
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadEntries = (viJson) => {
  const voiceConfig = viJson?.Caster?.voice ?? {};
  if (singleTextArg) {
    const cleaned = toCanonicalVoiceText(singleTextArg, voiceConfig);
    return [{ text: cleaned, category: 'CUSTOM_SINGLE', role: ROLE_MALE, intensities: new Set(['normal']) }];
  }
  if (inputFileArg) {
    const fullPath = path.resolve(REPO_ROOT, inputFileArg);
    const rawLines = readFileSync(fullPath, 'utf-8')
      .split(/\r?\n/)
      .map((line) => toCanonicalVoiceText(line, voiceConfig))
      .filter(Boolean);
    return rawLines.map((text) => ({
      text,
      category: 'CUSTOM_FILE',
      role: ROLE_MALE,
      intensities: new Set(['normal']),
    }));
  }
  const bossSkillsSource = readFileSync(BOSS_SKILLS_PATH, 'utf-8');
  const gameConstantsSource = readFileSync(GAME_CONSTANTS_PATH, 'utf-8');
  const teamsSource = readFileSync(TEAMS_CONSTANTS_PATH, 'utf-8');

  const bossNames = extractBossNames(gameConstantsSource);
  const skillsByArray = extractBossSkillsByArray(bossSkillsSource);
  const teamTags = extractTeamTags(teamsSource);
  return collectAllStaticLines(viJson, bossNames, skillsByArray, teamTags);
};

const main = async () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(DEDICATED_VIET_TTS_DIR, { recursive: true });

  const viJson = JSON.parse(readFileSync(VI_MESSAGES_PATH, 'utf-8'));
  const allEntries = loadEntries(viJson);
  const entries = limitArg > 0 ? allEntries.slice(0, limitArg) : allEntries;

  const maleCount = entries.filter((e) => e.role === ROLE_MALE).length;
  const femaleCount = entries.filter((e) => e.role === ROLE_FEMALE).length;
  console.log(
    `[PregenerateTTS] Selected ${entries.length}/${allEntries.length} static caster lines (Male: ${maleCount}, Female: ${femaleCount}). Provider: ${activeProvider}`
  );
  if (activeProvider === 'VIET_TTS') {
    console.log(
      `[PregenerateTTS] Viet-TTS Server: ${vietTtsBaseUrl} | Male Voice: "${vietTtsVoiceMale}" | Female Voice: "${vietTtsVoiceFemale}"`
    );
    if (!isDryRun) {
      const isHealthy = await checkVietTtsHealth();
      if (!isHealthy) {
        console.error(
          `\n[PregenerateTTS] ERROR: Viet-TTS service is not reachable at ${vietTtsBaseUrl}/health.\n` +
            `  -> To start the local Docker Viet-TTS service, run: scripts\\viet-tts\\start-viet-tts.bat\n` +
            `  -> Or pass a remote Viet-TTS server URL: --url=http://<gpu-host>:8298\n`
        );
        process.exit(1);
      }
    }
  }

  if (isDryRun) {
    console.log('[PregenerateTTS] Dry run complete. Sample lines:');
    entries.slice(0, 12).forEach((entry, idx) =>
      console.log(`  ${idx + 1}. [${entry.category} | ${entry.role}] ${entry.text}`)
    );
    return;
  }

  const edgePython = activeProvider === 'EDGE' ? resolveEdgePython() : null;
  let cachedCount = 0;
  let generatedCount = 0;
  let failedCount = 0;
  const manifestEntries = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const targetVoice =
      activeProvider === 'VIET_TTS'
        ? entry.role === ROLE_FEMALE
          ? vietTtsVoiceFemale
          : vietTtsVoiceMale
        : activeProvider === 'EDGE'
          ? EDGE_VOICE_VI
          : 'google-vi';

    const dedicatedFileName = buildDedicatedFileName(index, entry.category, targetVoice, entry.text);
    const dedicatedFilePath = path.join(DEDICATED_VIET_TTS_DIR, dedicatedFileName);
    const cacheFileNames = computeCacheFileNames(entry.text, entry.role, entry.intensities, activeProvider);
    const primaryCachePath = path.join(CACHE_DIR, cacheFileNames[0]);

    const existingSourcePath = !isForce
      ? [dedicatedFilePath, primaryCachePath].find((candidate) => existsSync(candidate))
      : null;

    if (existingSourcePath) {
      const audioBuffer = readFileSync(existingSourcePath);
      if (!existsSync(dedicatedFilePath)) {
        writeFileSync(dedicatedFilePath, audioBuffer);
      }
      for (const name of cacheFileNames) {
        const targetPath = path.join(CACHE_DIR, name);
        if (!existsSync(targetPath)) {
          writeFileSync(targetPath, audioBuffer);
        }
      }
      cachedCount += 1;
      manifestEntries.push({
        index: index + 1,
        text: entry.text,
        category: entry.category,
        role: entry.role,
        voice: targetVoice,
        dedicatedFile: dedicatedFileName,
        primaryCacheFile: cacheFileNames[0],
        bytes: audioBuffer.length,
        status: 'cached',
      });
      continue;
    }

    try {
      const { buffer: audioBuffer, voice: resolvedVoice } =
        activeProvider === 'VIET_TTS'
          ? await synthesizeVietTts(entry.text, entry.role)
          : activeProvider === 'EDGE'
            ? await synthesizeEdge(entry.text, edgePython)
            : await synthesizeGoogle(entry.text);

      // 1. Save to dedicated folder `server/data/viet-tts-audio/`
      writeFileSync(dedicatedFilePath, audioBuffer);

      // 2. Sync to game disk cache `server/data/tts-cache/`
      for (const name of cacheFileNames) {
        writeFileSync(path.join(CACHE_DIR, name), audioBuffer);
      }

      generatedCount += 1;
      manifestEntries.push({
        index: index + 1,
        text: entry.text,
        category: entry.category,
        role: entry.role,
        voice: resolvedVoice,
        dedicatedFile: dedicatedFileName,
        primaryCacheFile: cacheFileNames[0],
        bytes: audioBuffer.length,
        status: 'generated',
      });

      if (activeProvider === 'VIET_TTS' || generatedCount % 10 === 0 || index === entries.length - 1) {
        console.log(
          `  [${index + 1}/${entries.length}] generated=${generatedCount} cached=${cachedCount} [${resolvedVoice}] (${entry.category}: "${entry.text}")`
        );
      }
      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      failedCount += 1;
      console.warn(`  [WARN] Failed (${entry.category}): "${entry.text}" -> ${error.message}`);
    }
  }

  const manifestPayload = {
    generatedAt: new Date().toISOString(),
    provider: activeProvider,
    vietTtsUrl: activeProvider === 'VIET_TTS' ? vietTtsBaseUrl : undefined,
    voices: {
      male: activeProvider === 'VIET_TTS' ? vietTtsVoiceMale : undefined,
      female: activeProvider === 'VIET_TTS' ? vietTtsVoiceFemale : undefined,
    },
    totalLines: entries.length,
    generatedCount,
    cachedCount,
    failedCount,
    dedicatedDir: DEDICATED_VIET_TTS_DIR,
    cacheDir: CACHE_DIR,
    entries: manifestEntries,
  };

  writeFileSync(DEDICATED_MANIFEST_PATH, `${JSON.stringify(manifestPayload, null, 2)}\n`);
  writeFileSync(CACHE_MANIFEST_PATH, `${JSON.stringify(manifestPayload, null, 2)}\n`);

  console.log(
    `\n[PregenerateTTS] Done! Total: ${entries.length} lines | Cached: ${cachedCount} | Newly generated: ${generatedCount} | Failed: ${failedCount}`
  );
  console.log(`[PregenerateTTS] Dedicated audio folder: ${DEDICATED_VIET_TTS_DIR}`);
  console.log(`[PregenerateTTS] Dedicated manifest:     ${DEDICATED_MANIFEST_PATH}`);
  console.log(`[PregenerateTTS] Game TTS cache synced:  ${CACHE_DIR}`);
};

main().catch((error) => {
  console.error('[PregenerateTTS] Fatal error:', error);
  process.exit(1);
});
