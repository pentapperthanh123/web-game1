import { TEAM_KEY, TeamType } from '../constants/game';

export const COMEBACK_CONSTANTS = {
  /** Trailing team score < 70% of leading team score triggers the buff. */
  TRIGGER_RATIO: 0.7,
  /** Trailing team score > 85% of leading team score releases the buff (hysteresis buffer). */
  RELEASE_RATIO: 0.85,
  /** Minimum combined round damage required before comeback buff can trigger. */
  MIN_TOTAL_DAMAGE: 5_000,
  /** Damage multiplier applied to TEAM_BUFFED_SOURCES (+15%). */
  DAMAGE_MULTIPLIER: 1.15,
  /** Minimum delay between caster comeback buff callouts. */
  ANNOUNCE_COOLDOWN_MS: 15_000,
  NO_MULTIPLIER: 1.0,
} as const;

/**
 * Pure decision function: determines which team (if any) should have the comeback buff.
 * Applies hysteresis: once triggered (< 70%), the buff persists until the team reaches > 85%.
 */
export const resolveComebackTeam = (
  teamScores: Record<TeamType, number>,
  prevComebackTeam: TeamType | null,
  isEnabled = true
): TeamType | null => {
  if (!isEnabled) return null;
  const leftScore = teamScores[TEAM_KEY.BLG] ?? 0;
  const rightScore = teamScores[TEAM_KEY.GENG] ?? 0;
  const total = leftScore + rightScore;
  if (total < COMEBACK_CONSTANTS.MIN_TOTAL_DAMAGE) return null;

  if (leftScore === rightScore) return null;

  const leaderTeam: TeamType = leftScore > rightScore ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const trailingTeam: TeamType = leaderTeam === TEAM_KEY.BLG ? TEAM_KEY.GENG : TEAM_KEY.BLG;
  const leaderScore = teamScores[leaderTeam] ?? 0;
  const trailingScore = teamScores[trailingTeam] ?? 0;

  if (leaderScore <= 0) return null;
  const ratio = trailingScore / leaderScore;

  if (prevComebackTeam !== null) {
    if (prevComebackTeam !== trailingTeam) {
      // Lead flipped: new trailing team only receives buff if strictly below trigger ratio
      if (ratio < COMEBACK_CONSTANTS.TRIGGER_RATIO) {
        return trailingTeam;
      }
      return null;
    }

    // Still trailing: keep buff until ratio climbs above release ratio
    if (ratio > COMEBACK_CONSTANTS.RELEASE_RATIO) {
      return null;
    }
    return prevComebackTeam;
  }

  // Not currently buffed: trigger when below trigger ratio
  if (ratio < COMEBACK_CONSTANTS.TRIGGER_RATIO) {
    return trailingTeam;
  }

  return null;
};

// Module-level tracker for live gameplay
let currentComebackTeam: TeamType | null = null;
let lastAnnouncedAt = 0;

export const getActiveComebackTeam = (): TeamType | null => currentComebackTeam;

export const isComebackBuffActive = (team: TeamType): boolean => currentComebackTeam === team;

export const getComebackDamageMultiplier = (team: TeamType): number =>
  isComebackBuffActive(team) ? COMEBACK_CONSTANTS.DAMAGE_MULTIPLIER : COMEBACK_CONSTANTS.NO_MULTIPLIER;

export const resetComebackState = (): void => {
  currentComebackTeam = null;
  lastAnnouncedAt = 0;
};

export const evaluateComebackBuff = (
  teamScores: Record<TeamType, number>,
  isEnabled = true,
  onActivated?: (team: TeamType) => void
): TeamType | null => {
  const nextTeam = resolveComebackTeam(teamScores, currentComebackTeam, isEnabled);
  const previousTeam = currentComebackTeam;
  currentComebackTeam = nextTeam;

  if (nextTeam !== null && nextTeam !== previousTeam) {
    const now = Date.now();
    if (now - lastAnnouncedAt >= COMEBACK_CONSTANTS.ANNOUNCE_COOLDOWN_MS) {
      lastAnnouncedAt = now;
      onActivated?.(nextTeam);
    }
  }

  return nextTeam;
};
