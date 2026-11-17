import {
  BOSS_MECHANICS_CONSTANTS,
  DAMAGE_SOURCE,
  DamageSource,
  GAME_CONSTANTS,
  TeamType,
} from '../constants/game';
import { GameState } from '../types/game';
import { getQuestDamageMultiplier } from './communityQuestStore';
import { getOvertimeDamageMultiplier } from './roundClockStore';
import { getComebackDamageMultiplier } from './comebackRules';

/**
 * Which multipliers apply to which kind of hit. Before, every multiplier hit every source, so the
 * admin "champion damage" slider also scaled gifts and hearts, and a gift landing on a weak point
 * did double damage.
 *   - Admin champion multiplier: summoned champions only (what the slider is labelled as).
 *   - Team buffs (community quest, Silver Scrapes winner): every attack by the team's fighters.
 *   - Weak point x2: viewer-driven attacks (champions, rallies, pokes); pros are excluded as before.
 * Gifts, hearts, shares and quest rewards have fixed values the viewers can count on.
 */
const CHAMPION_SCALED_SOURCES: ReadonlySet<DamageSource> = new Set([DAMAGE_SOURCE.CHAMPION]);
const TEAM_BUFFED_SOURCES: ReadonlySet<DamageSource> = new Set([
  DAMAGE_SOURCE.CHAMPION,
  DAMAGE_SOURCE.PRO,
  DAMAGE_SOURCE.RALLY,
  DAMAGE_SOURCE.WEAK_POINT_POKE,
]);
const WEAK_POINT_SOURCES: ReadonlySet<DamageSource> = new Set([
  DAMAGE_SOURCE.CHAMPION,
  DAMAGE_SOURCE.RALLY,
  DAMAGE_SOURCE.WEAK_POINT_POKE,
]);

const NO_MULTIPLIER = 1;

/** Silver Scrapes winner buff (+20 % for 90 s), which was announced but never applied. */
const getDuelBuffMultiplier = (state: GameState, team: TeamType, now: number): number => {
  const duel = state.silverScrapesState;
  const isBuffActive = duel.winningTeamBuff === team && Boolean(duel.buffActiveUntil) && now <= (duel.buffActiveUntil ?? 0);
  return isBuffActive ? GAME_CONSTANTS.SILVER_SCRAPES.BUFF_DAMAGE_MULTIPLIER : NO_MULTIPLIER;
};

export interface ScaledBossDamage {
  amount: number;
  isWeakPointHit: boolean;
}

export const scaleBossDamage = (
  state: GameState,
  amount: number,
  team: TeamType,
  source: DamageSource,
  now: number
): ScaledBossDamage => {
  const championMultiplier = CHAMPION_SCALED_SOURCES.has(source) ? state.championDamageMultiplier ?? NO_MULTIPLIER : NO_MULTIPLIER;
  const teamBuffMultiplier = TEAM_BUFFED_SOURCES.has(source)
    ? getQuestDamageMultiplier(team, now) *
      getDuelBuffMultiplier(state, team, now) *
      getComebackDamageMultiplier(team)
    : NO_MULTIPLIER;
  const isWeakPointHit =
    WEAK_POINT_SOURCES.has(source) && state.bossWeakPoint !== null && now < state.bossWeakPoint.expiresAt;
  const weakPointMultiplier = isWeakPointHit ? BOSS_MECHANICS_CONSTANTS.WEAK_POINT.DAMAGE_MULTIPLIER : NO_MULTIPLIER;
  // Overtime weakens the boss for every source and both teams alike, so the race stays fair
  const overtimeMultiplier = getOvertimeDamageMultiplier();
  const scaled = Math.max(
    1,
    Math.round(amount * championMultiplier * teamBuffMultiplier * weakPointMultiplier * overtimeMultiplier)
  );
  return { amount: scaled, isWeakPointHit };
};
