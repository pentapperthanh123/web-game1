import {
  COMMUNITY_QUEST_CONSTANTS,
  DAMAGE_SOURCE,
  DamageSource,
  SUMMON_BADGES,
  TeamType,
} from '../constants/game';
import { VANGUARD_ACTOR_LABEL } from '../constants/sessionLeaderboard';

/**
 * Full per-round viewer damage (the store's `leaderboard` only keeps the top few for the HUD).
 * Fed from damageBoss, read by the round-result reporter, reset when a new round starts.
 */
export interface RoundDamageEntry {
  userName: string;
  team: TeamType;
  damage: number;
}

const damageByUser = new Map<string, RoundDamageEntry>();

/** Gift/follow summons are prefixed using canonical badges; attacks are labelled "An (Ahri)". */
const SUMMON_PREFIX_PATTERN = new RegExp(`^(${SUMMON_BADGES.ELITE}|${SUMMON_BADGES.FOLLOW})\\s*`, 'u');
const TRAILING_LABEL_PATTERN = /\s*\([^)]*\)\s*$/u;

export const BOT_ACTOR_KEYWORDS = [
  VANGUARD_ACTOR_LABEL,
  'Hội Quân',
  COMMUNITY_QUEST_CONSTANTS.REWARD_ACTOR_NAME,
] as const;

/** One profile per viewer: strips summon prefixes and the "(champion / gift)" label. */
export const toCanonicalViewerName = (actorName: string): string =>
  actorName.replace(SUMMON_PREFIX_PATTERN, '').replace(TRAILING_LABEL_PATTERN, '').trim();

/** Single source of truth: filters out filler vanguards, team rallies, and quest rewards. */
export const isViewerActor = (actorName: string, source?: DamageSource): boolean => {
  if (!actorName) return false;
  if (source === DAMAGE_SOURCE.RALLY || source === DAMAGE_SOURCE.QUEST) return false;
  const canonical = toCanonicalViewerName(actorName);
  if (!canonical) return false;
  return !BOT_ACTOR_KEYWORDS.some((keyword) => actorName.includes(keyword) || canonical.includes(keyword));
};

export const recordRoundDamage = (
  actorName: string,
  team: TeamType,
  damage: number,
  source?: DamageSource
): void => {
  if (!Number.isFinite(damage) || damage <= 0) return;
  if (!isViewerActor(actorName, source)) return;
  const userName = toCanonicalViewerName(actorName);
  if (!userName) return;
  const existing = damageByUser.get(userName);
  if (existing) {
    existing.damage += damage;
    return;
  }
  damageByUser.set(userName, { userName, team, damage });
};

export const getTopRoundDamage = (limit: number): RoundDamageEntry[] =>
  [...damageByUser.values()].sort((a, b) => b.damage - a.damage).slice(0, limit);

export const resetRoundDamage = (): void => {
  damageByUser.clear();
};
