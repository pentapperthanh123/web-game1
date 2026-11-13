import { TeamType } from '../constants/game';

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

/** Gift/follow summons are prefixed ("👑 An", "💖 An"); attacks are labelled "An (Ahri)". */
const SUMMON_PREFIX_PATTERN = /^(👑|💖)\s*/u;
const TRAILING_LABEL_PATTERN = /\s*\([^)]*\)\s*$/u;

/** One profile per viewer: strips summon prefixes and the "(champion / gift)" label. */
export const toCanonicalViewerName = (actorName: string): string =>
  actorName.replace(SUMMON_PREFIX_PATTERN, '').replace(TRAILING_LABEL_PATTERN, '').trim();

export const recordRoundDamage = (actorName: string, team: TeamType, damage: number): void => {
  if (!Number.isFinite(damage) || damage <= 0) return;
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
