// Clean & Optimized Static Voice Lines Generator (Zero Redundant Hardcodes)
// Eliminates repetitive team-champion permutations while preserving 100% boss skills,
// mechanics, announcements, and natural commentary.

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VI_MESSAGES_PATH = path.join(REPO_ROOT, 'client/src/i18n/messages/vi.json');
const BOSS_SKILLS_PATH = path.join(REPO_ROOT, 'client/src/constants/bossSkills.ts');
const GAME_CONSTANTS_PATH = path.join(REPO_ROOT, 'client/src/constants/game.ts');
const TEAMS_CONSTANTS_PATH = path.join(REPO_ROOT, 'client/src/constants/teams.ts');

const CACHE_DIR = path.join(REPO_ROOT, 'server/data/tts-cache');
const DEDICATED_VIET_TTS_DIR = path.join(REPO_ROOT, 'server/data/viet-tts-audio');

const DEFAULT_LANG = 'vi';
const ROLE_MALE = 'male';
const ROLE_FEMALE = 'female';

const VIET_TTS_TIMEOUT_MS = 90_000;
const REQUEST_DELAY_MS = 150;

const DEFAULT_VIET_TTS_URL = process.env.VIET_TTS_URL || 'http://localhost:8298';
const DEFAULT_VIET_TTS_VOICE_MALE = process.env.VIET_TTS_VOICE_MALE || 'cdteam';
const DEFAULT_VIET_TTS_VOICE_FEMALE = process.env.VIET_TTS_VOICE_FEMALE || 'quynh';

const ROUNDS = [1, 2, 3, 4, 5];
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

const vietTtsBaseUrl = (getArgValue('--url') || DEFAULT_VIET_TTS_URL).replace(/\/+$/, '');
const vietTtsVoiceMale = getArgValue('--voice-male') || getArgValue('--voice') || DEFAULT_VIET_TTS_VOICE_MALE;
const vietTtsVoiceFemale = getArgValue('--voice-female') || DEFAULT_VIET_TTS_VOICE_FEMALE;
const limitArg = Number(getArgValue('--limit') || 0);

const PICTOGRAPHS = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const WHITESPACE_RUN = /\s+/g;
const SCORE_PATTERN = /(\d+)\s*[-–—]\s*(\d+)/g;
const MARK_RUN = /([!?.])[!?.]+/g;
const UNFILLED_SLOT = /\{\{|\}\}/;

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

const extractBossNames = (source) => {
  const names = new Set();
  for (const match of source.matchAll(/bossName:\s*'([^']+)'/g)) {
    names.add(match[1]);
  }
  return Array.from(names);
};

const BOSS_NAME_TO_SKILL_ARRAY = {
  'Baron Nashor': 'BARON_SKILLS',
  'Rồng Ngàn Tuổi': 'ELDER_DRAGON_SKILLS',
  'Sứ Giả Khe Nứt': 'RIFT_HERALD_SKILLS',
  'Rồng Núi Nham Thạch': 'MOUNTAIN_DRAGON_SKILLS',
  'Rồng Già Bão Tố': 'STORM_DRAGON_SKILLS',
  'Thần Hư Vô Nguyên Thủy': 'VOID_TITAN_SKILLS',
};

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

const extractTeamTags = (source) => {
  const tags = new Set();
  for (const match of source.matchAll(/shortTag:\s*'([^']+)'/g)) {
    if (match[1] !== 'NEW') tags.add(match[1]);
  }
  return Array.from(tags);
};

// Female voice quynh handles analytics, viewer guides, CTA, milestones and podium
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

const collectCleanStaticLines = (viJson, bossNames, skillsByArray, teamTags) => {
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

  // 1. Boss Skills & Ultimates (High priority, sync with 3D VFX)
  for (const boss of bossNames) {
    const arrayName = BOSS_NAME_TO_SKILL_ARRAY[boss];
    const bossSkills = (arrayName && skillsByArray[arrayName]) || [];
    for (const skill of bossSkills) {
      const signalKey = skill.isUltimate ? 'BOSS_ULTIMATE' : 'BOSS_SKILL';
      const intensity = skill.isUltimate ? 'climax' : 'hype';
      addTemplates(signalKey, { boss, skill: skill.vietnameseName }, intensity);
    }
  }

  // 2. Pure static slot-free lines (General Hype, CTA, Guides)
  for (const [signalKey, templates] of Object.entries(linesObj)) {
    if (!Array.isArray(templates)) continue;
    const role = FEMALE_ROLE_SIGNALS.has(signalKey) ? ROLE_FEMALE : ROLE_MALE;
    for (const tpl of templates) {
      if (!UNFILLED_SLOT.test(tpl)) {
        addLine(tpl, signalKey, 'normal', role);
      }
    }
  }

  // 3. Boss status & Mechanics (Enrage, Low HP, Phase 2/3, Shields, Wipe)
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

  // 4. Heart Milestones
  for (const count of HEART_MILESTONES) {
    addTemplates('HEART_MILESTONE', { count, heal: HEART_HEAL_AMOUNT }, 'hype');
  }

  // 5. Clean Team Victory Announcements (Only popular scores, no redundant matrix)
  for (const team of teamTags) {
    addTemplates('SERIES_OUTRO', { team }, 'normal');
    for (const round of ROUNDS) {
      for (const score of ['1 - 0', '2 - 0', '2 - 1', '3 - 2']) {
        addTemplates('ROUND_WIN', { team, round, score, boss: 'Boss' }, 'climax');
        addTemplates('SERIES_WIN', { team, score }, 'climax');
      }
    }
  }

  return Array.from(collected.values());
};

const computeCacheFileNames = (text, role, _intensities) => {
  const vietVoice = role === ROLE_FEMALE ? vietTtsVoiceFemale : vietTtsVoiceMale;
  const primaryTag = `VIET_TTS:${vietVoice}:${DEFAULT_LANG}`;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(DEDICATED_VIET_TTS_DIR, { recursive: true });

  const viJson = JSON.parse(readFileSync(VI_MESSAGES_PATH, 'utf-8'));
  const bossSkillsSource = readFileSync(BOSS_SKILLS_PATH, 'utf-8');
  const gameConstantsSource = readFileSync(GAME_CONSTANTS_PATH, 'utf-8');
  const teamsSource = readFileSync(TEAMS_CONSTANTS_PATH, 'utf-8');

  const bossNames = extractBossNames(gameConstantsSource);
  const skillsByArray = extractBossSkillsByArray(bossSkillsSource);
  const teamTags = extractTeamTags(teamsSource);

  const allEntries = collectCleanStaticLines(viJson, bossNames, skillsByArray, teamTags);
  const entries = limitArg > 0 ? allEntries.slice(0, limitArg) : allEntries;

  const maleCount = entries.filter((e) => e.role === ROLE_MALE).length;
  const femaleCount = entries.filter((e) => e.role === ROLE_FEMALE).length;

  console.log(`\n======================================================`);
  console.log(`[CleanVietTTS] Tong so cau tinh chuan hoa: ${entries.length}`);
  console.log(`  - Giong Nam [${vietTtsVoiceMale}]:   ${maleCount} cau`);
  console.log(`  - Giong Nu  [${vietTtsVoiceFemale}]:    ${femaleCount} cau`);
  console.log(`======================================================\n`);

  if (isDryRun) {
    console.log('[CleanVietTTS] Dry-run hoan tat. Khong goi API.');
    return;
  }

  let cachedCount = 0;
  let generatedCount = 0;
  let failedCount = 0;
  const manifestEntries = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const targetVoice = entry.role === ROLE_FEMALE ? vietTtsVoiceFemale : vietTtsVoiceMale;
    const dedicatedFileName = buildDedicatedFileName(index, entry.category, targetVoice, entry.text);
    const dedicatedFilePath = path.join(DEDICATED_VIET_TTS_DIR, dedicatedFileName);
    const cacheFileNames = computeCacheFileNames(entry.text, entry.role, entry.intensities);
    const primaryCachePath = path.join(CACHE_DIR, cacheFileNames[0]);

    const existingSourcePath = !isForce
      ? [dedicatedFilePath, primaryCachePath].find((candidate) => existsSync(candidate))
      : null;

    if (existingSourcePath) {
      const audioBuffer = readFileSync(existingSourcePath);
      if (!existsSync(dedicatedFilePath)) writeFileSync(dedicatedFilePath, audioBuffer);
      for (const name of cacheFileNames) {
        const targetPath = path.join(CACHE_DIR, name);
        if (!existsSync(targetPath)) writeFileSync(targetPath, audioBuffer);
      }
      cachedCount += 1;
      manifestEntries.push({
        index: index + 1,
        text: entry.text,
        category: entry.category,
        role: entry.role,
        voice: targetVoice,
        dedicatedFile: dedicatedFileName,
        status: 'cached',
      });
      continue;
    }

    try {
      const { buffer: audioBuffer, voice: resolvedVoice } = await synthesizeVietTts(entry.text, entry.role);
      writeFileSync(dedicatedFilePath, audioBuffer);
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
        bytes: audioBuffer.length,
        status: 'generated',
      });
      console.log(
        `  [${index + 1}/${entries.length}] generated=${generatedCount} cached=${cachedCount} [${resolvedVoice}] (${entry.category}: "${entry.text}")`
      );
      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      failedCount += 1;
      console.warn(`  [WARN] Failed: "${entry.text}" -> ${error.message}`);
    }
  }

  console.log(`\n[CleanVietTTS] Hoan tat! Generated: ${generatedCount}, Cached: ${cachedCount}, Failed: ${failedCount}`);
};

main().catch(console.error);
