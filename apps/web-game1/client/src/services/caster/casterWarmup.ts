import {
  CASTER_INTENSITY,
  CASTER_SIGNAL,
  CASTER_SPEAKER,
  CASTER_SPEECH,
  CASTER_WARM,
  CasterSignal,
  CasterSpeaker,
  DEFAULT_CASTER_SPEAKER,
  resolveSpeakerRole,
} from '../../constants/caster';
import { getBossSkillsByTheme } from '../../constants/bossSkills';
import { BOSS_MECHANICS_CONSTANTS, getThemeConfig, TeamType } from '../../constants/game';
import { useGameStore } from '../../store/gameStore';
import { GameState } from '../../types/game';
import {
  CasterSlots,
  DialogueTurn,
  composeAllCasterVariants,
  composeAllDialogueTurns,
  formatSpeechNumber,
  getCasterLang,
} from './casterComposer';
import { requestCasterWarm } from './casterWarmChannel';
import { toSpeakableText } from './presentationQueue';
import { casterSpeechEngine } from './speechEngine';
import { toVoiceText } from './casterVoiceText';

/** Lines whose slots are all known for a given matchup and boss (no viewer names, no live numbers). */
const MATCH_SIGNALS: readonly CasterSignal[] = [
  CASTER_SIGNAL.BANTER_CTA,
  CASTER_SIGNAL.BANTER_HYPE,
  CASTER_SIGNAL.BANTER_IDLE,
  CASTER_SIGNAL.ROUND_GO,
  CASTER_SIGNAL.BOSS_ENRAGE,
  CASTER_SIGNAL.BOSS_LOW_HP,
  CASTER_SIGNAL.BOSS_PHASE_TWO,
  CASTER_SIGNAL.BOSS_PHASE_THREE,
  CASTER_SIGNAL.DUEL_LAST_STAND,
  CASTER_SIGNAL.DUEL_DRAW,
  CASTER_SIGNAL.TIGHT_RACE,
  CASTER_SIGNAL.COMEBACK,
  CASTER_SIGNAL.BANTER_PROVOCATION,
];
/** Shield lines: their numbers are fixed game rules, so they can be generated ahead too. */
const SHIELD_SIGNALS: readonly CasterSignal[] = [
  CASTER_SIGNAL.BOSS_SHIELD_UP,
  CASTER_SIGNAL.BOSS_SHIELD_BROKEN,
  CASTER_SIGNAL.BOSS_SHIELD_ABSORBED,
];
const MS_PER_SECOND = 1000;

const buildShieldSlots = (baseSlots: CasterSlots): CasterSlots => ({
  ...baseSlots,
  seconds: Math.round(BOSS_MECHANICS_CONSTANTS.SHIELD.DURATION_MS / MS_PER_SECOND),
  dmg: formatSpeechNumber(BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE),
  hp: formatSpeechNumber(BOSS_MECHANICS_CONSTANTS.SHIELD.HEAL_PENALTY_AMOUNT),
});
/** Same, but also using one of the suggested champions. */
const CHAMPION_SIGNALS: readonly CasterSignal[] = [
  CASTER_SIGNAL.BANTER_GUIDE,
  CASTER_SIGNAL.BANTER_EMPTY,
  CASTER_SIGNAL.EMPTY_FIELD_RALLY,
];

const warmedMatchKeys = new Set<string>();

/** Same transform as a live clip request, so the server caches exactly what will be asked for. */
const toWarmText = (line: string): string => toVoiceText(toSpeakableText(line));

const uniqueTexts = (lines: readonly string[]): string[] =>
  Array.from(new Set(lines.map(toWarmText).filter(Boolean)));

/** The warm request is capped per message; longer lists go in several messages. */
const sendWarmTexts = (lang: string, texts: readonly string[], speaker: CasterSpeaker): void => {
  for (let start = 0; start < texts.length; start += CASTER_WARM.MAX_TEXTS) {
    requestCasterWarm({ lang, texts: texts.slice(start, start + CASTER_WARM.MAX_TEXTS), role: resolveSpeakerRole(speaker) });
  }
};

/** Every turn of the written exchanges of these signals, so both casters' replies are ready in time. */
const collectDialogueTurns = (signals: readonly CasterSignal[], slots: CasterSlots): DialogueTurn[] =>
  signals.flatMap((signal) => composeAllDialogueTurns(signal, slots));

const getTeamTags = (state: GameState): [string, string] => {
  const [leftTeam, rightTeam] = Object.keys(state.activeTeams) as TeamType[];
  return [state.activeTeams[leftTeam]?.shortTag ?? '', state.activeTeams[rightTeam]?.shortTag ?? ''];
};

const collectSkillLines = (baseSlots: CasterSlots, theme: GameState['gameTheme']): string[] =>
  getBossSkillsByTheme(theme).flatMap((skill) =>
    composeAllCasterVariants(skill.isUltimate ? CASTER_SIGNAL.BOSS_ULTIMATE : CASTER_SIGNAL.BOSS_SKILL, {
      ...baseSlots,
      skill: skill.vietnameseName,
    })
  );

const CLIENT_SKILL_PREFETCH_STAGGER_MS = 150;
const CLIENT_SKILL_PREFETCH_START_DELAY_MS = 800;

/**
 * Pre-downloads boss skill TTS clips into the client-side `casterSpeechEngine` cache
 * with the exact role + intensity used at cast time, eliminating HTTP round-trip latency
 * so commentary plays at the exact moment of the visual effect.
 */
const prefetchSkillClipsToClient = (
  baseSlots: CasterSlots,
  theme: GameState['gameTheme'],
  lang: string
): void => {
  const role = resolveSpeakerRole(DEFAULT_CASTER_SPEAKER);
  const skills = getBossSkillsByTheme(theme);
  let delayMs = CLIENT_SKILL_PREFETCH_START_DELAY_MS;

  for (const skill of skills) {
    const signal = skill.isUltimate ? CASTER_SIGNAL.BOSS_ULTIMATE : CASTER_SIGNAL.BOSS_SKILL;
    const intensity = skill.isUltimate ? CASTER_INTENSITY.CLIMAX : CASTER_INTENSITY.HYPE;
    const variants = composeAllCasterVariants(signal, {
      ...baseSlots,
      skill: skill.vietnameseName,
    });
    for (const rawLine of variants) {
      const speakable = toSpeakableText(rawLine);
      if (!speakable) continue;
      const scheduledDelay = delayMs;
      setTimeout(() => {
        casterSpeechEngine.prefetch(speakable, lang, role, intensity);
      }, scheduledDelay);
      delayMs += CLIENT_SKILL_PREFETCH_STAGGER_MS;
    }
  }
};

/**
 * Asks the server to pre-generate every predictable line of the current matchup and boss,
 * once per matchup per session. Lines with viewer names or live numbers are cached when first said.
 */
export const warmPredictableLines = (guideChampions: readonly string[]): void => {
  if (CASTER_SPEECH.STATIC_ONLY_LIVE) return;
  const state = useGameStore.getState();
  const lang = getCasterLang();
  const [teamA, teamB] = getTeamTags(state);
  const boss = getThemeConfig(state.gameTheme).bossName;
  const matchKey = `${lang}|${state.gameTheme}|${teamA}|${teamB}|${state.currentRound}`;
  if (warmedMatchKeys.has(matchKey)) return;
  warmedMatchKeys.add(matchKey);

  const baseSlots: CasterSlots = { teamA, teamB, boss, round: state.currentRound, format: state.seriesFormat };
  const shieldSlots = buildShieldSlots(baseSlots);
  const singleLines = [
    ...MATCH_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, baseSlots)),
    ...guideChampions.flatMap((champion) =>
      CHAMPION_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, { ...baseSlots, champion }))
    ),
    ...collectSkillLines(baseSlots, state.gameTheme),
    ...SHIELD_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, shieldSlots)),
  ];
  const turns = [
    ...collectDialogueTurns(MATCH_SIGNALS, baseSlots),
    ...guideChampions.flatMap((champion) => collectDialogueTurns(CHAMPION_SIGNALS, { ...baseSlots, champion })),
    ...SHIELD_SIGNALS.flatMap((signal) => collectDialogueTurns([signal], shieldSlots)),
  ];
  const turnTextsOf = (speaker: CasterSpeaker): string[] =>
    turns.filter((turn) => turn.speaker === speaker).map((turn) => turn.text);
  // Single lines are A's; each caster's turns go with that caster's voice
  const textsA = uniqueTexts([...singleLines, ...turnTextsOf(CASTER_SPEAKER.A)]);
  const textsB = uniqueTexts(turnTextsOf(CASTER_SPEAKER.B));
  if (textsA.length > 0) sendWarmTexts(lang, textsA, CASTER_SPEAKER.A);
  if (textsB.length > 0) sendWarmTexts(lang, textsB, CASTER_SPEAKER.B);
  prefetchSkillClipsToClient(baseSlots, state.gameTheme, lang);
};
