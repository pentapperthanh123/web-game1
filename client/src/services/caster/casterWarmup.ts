import { CASTER_SIGNAL, CasterSignal } from '../../constants/caster';
import { getBossSkillsByTheme } from '../../constants/bossSkills';
import { BOSS_MECHANICS_CONSTANTS, getThemeConfig, TeamType } from '../../constants/game';
import { useGameStore } from '../../store/gameStore';
import { GameState } from '../../types/game';
import { CasterSlots, composeAllCasterVariants, formatSpeechNumber, getCasterLang } from './casterComposer';
import { requestCasterWarm } from './casterWarmChannel';
import { toSpeakableText } from './presentationQueue';
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

/**
 * Asks the server to pre-generate every predictable line of the current matchup and boss,
 * once per matchup per session. Lines with viewer names or live numbers are cached when first said.
 */
export const warmPredictableLines = (guideChampions: readonly string[]): void => {
  const state = useGameStore.getState();
  const lang = getCasterLang();
  const [teamA, teamB] = getTeamTags(state);
  const boss = getThemeConfig(state.gameTheme).bossName;
  const matchKey = `${lang}|${state.gameTheme}|${teamA}|${teamB}|${state.currentRound}`;
  if (warmedMatchKeys.has(matchKey)) return;
  warmedMatchKeys.add(matchKey);

  const baseSlots: CasterSlots = { teamA, teamB, boss, round: state.currentRound, format: state.seriesFormat };
  const lines = [
    ...MATCH_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, baseSlots)),
    ...guideChampions.flatMap((champion) =>
      CHAMPION_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, { ...baseSlots, champion }))
    ),
    ...collectSkillLines(baseSlots, state.gameTheme),
    ...SHIELD_SIGNALS.flatMap((signal) => composeAllCasterVariants(signal, buildShieldSlots(baseSlots))),
  ];
  // Same transform as a live clip request, so the server caches exactly what will be asked for
  const texts = Array.from(new Set(lines.map((line) => toVoiceText(toSpeakableText(line))).filter(Boolean)));
  if (texts.length > 0) requestCasterWarm({ lang, texts });
};
