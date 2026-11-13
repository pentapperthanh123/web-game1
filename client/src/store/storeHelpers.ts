import {
  DPSPlayer,
  GameState,
  ProDamageRecord,
  TeamComboState,
  TeamHeartMomentum,
} from '../types/game';
import { ActiveTeamsMap } from '../types/team';
import {
  AUDIO_SFX_CONSTANTS,
  BOSS_STATUS,
  COMBAT_VFX_CONSTANTS,
  DAMAGE_TYPE,
  DamageType,
  GAME_CONSTANTS,
  TEAM_KEY,
  TeamType,
} from '../constants/game';
import { RosterPlayer } from '../constants/roster';

/** Returns a random floating-point number in [min, max). */
export const randomInRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/** Generates a random 3D spawn coordinate within the team's wing bounds. */
export const createWingSpawnPosition = (team: TeamType): [number, number, number] => {
  const bounds = COMBAT_VFX_CONSTANTS.WING_BOUNDS[team];
  return [
    randomInRange(bounds.minX, bounds.maxX),
    randomInRange(bounds.minY, bounds.maxY),
    randomInRange(bounds.minZ, bounds.maxZ),
  ];
};

/** Updates and sorts the viewer DPS leaderboard, capped at MAX_DISPLAY entries. */
export const updateLeaderboardList = (
  leaderboard: DPSPlayer[],
  playerName: string,
  team: TeamType,
  amount: number
): DPSPlayer[] => {
  const existingIndex = leaderboard.findIndex((p) => p.userName === playerName);
  const nextList =
    existingIndex >= 0
      ? leaderboard.map((player, index) =>
          index === existingIndex ? { ...player, totalDamage: player.totalDamage + amount } : player
        )
      : [
          ...leaderboard,
          {
            id: `player-${Date.now()}-${Math.random()}`,
            userName: playerName,
            team,
            totalDamage: amount,
          },
        ];

  return [...nextList]
    .sort((a, b) => b.totalDamage - a.totalDamage)
    .slice(0, GAME_CONSTANTS.LEADERBOARD.MAX_DISPLAY);
};

/** Updates and sorts the pro player DPS leaderboard. */
export const updateProLeaderboardList = (
  proLeaderboard: ProDamageRecord[],
  player: RosterPlayer,
  amount: number
): ProDamageRecord[] => {
  const existingIndex = proLeaderboard.findIndex((p) => p.rosterId === player.id);
  const nextList =
    existingIndex >= 0
      ? proLeaderboard.map((entry, index) =>
          index === existingIndex ? { ...entry, totalDamage: entry.totalDamage + amount } : entry
        )
      : [
          ...proLeaderboard,
          {
            rosterId: player.id,
            playerName: player.name,
            role: player.role,
            championName: player.signatureChampion,
            avatarUrl: player.avatarUrl,
            team: player.team,
            totalDamage: amount,
          },
        ];

  return [...nextList].sort((a, b) => b.totalDamage - a.totalDamage);
};

/** Checks whether the given combo count hits an audio milestone. */
export const isComboMilestoneReached = (comboCount: number): boolean => {
  if (AUDIO_SFX_CONSTANTS.COMBO_EARLY_MILESTONES.includes(comboCount)) {
    return true;
  }
  return (
    comboCount >= AUDIO_SFX_CONSTANTS.COMBO_STEP_MILESTONE &&
    comboCount % AUDIO_SFX_CONSTANTS.COMBO_STEP_MILESTONE === 0
  );
};

/** Maps damage type to particle burst intensity. */
export const DAMAGE_INTENSITY_MAP: Record<DamageType, number> = {
  [DAMAGE_TYPE.NORMAL]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_NORMAL,
  [DAMAGE_TYPE.CRIT]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_CRIT,
  [DAMAGE_TYPE.ULTIMATE]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE,
};

/** Creates a zeroed combo state for a single team. */
export const createEmptyTeamCombo = (): TeamComboState => ({
  count: 0,
  damage: 0,
  lastTimestamp: 0,
});

/** Creates initial combo states for both teams. */
export const createInitialTeamCombos = (): Record<TeamType, TeamComboState> => ({
  [TEAM_KEY.BLG]: createEmptyTeamCombo(),
  [TEAM_KEY.GENG]: createEmptyTeamCombo(),
});

/** Creates a baseline heart momentum state for a single team. */
export const createEmptyTeamHeartMomentum = (): TeamHeartMomentum => ({
  multiplier: 1,
  lastTapAt: 0,
  burstCount: 0,
});

/** Creates initial heart momentum states for both teams. */
export const createInitialTeamHeartMomentum = (): Record<TeamType, TeamHeartMomentum> => ({
  [TEAM_KEY.BLG]: createEmptyTeamHeartMomentum(),
  [TEAM_KEY.GENG]: createEmptyTeamHeartMomentum(),
});

/** Initializes or preserves pro player fury gauges for the active rosters. */
export const createInitialRosterFury = (
  activeTeams: ActiveTeamsMap,
  previousFury?: Record<string, number>
): Record<string, number> => {
  const nextFury: Record<string, number> = {};
  for (const slot of [TEAM_KEY.BLG, TEAM_KEY.GENG] as TeamType[]) {
    const roster = activeTeams[slot]?.roster ?? [];
    for (const player of roster) {
      nextFury[player.id] = previousFury?.[player.id] ?? 0;
    }
  }
  return nextFury;
};

/** Returns the active heart tap fury multiplier if within the speed window. */
export const getActiveHeartFuryMultiplier = (
  momentum: TeamHeartMomentum | undefined,
  now: number
): number => {
  if (!momentum) return 1;
  if (now - momentum.lastTapAt > GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS) {
    return 1;
  }
  return momentum.multiplier;
};

/** Returns true when combat actions should be ignored (boss defeated, round intermission, or Silver Scrapes duel active). */
export const isBattleHalted = (
  state: Pick<GameState, 'bossHp' | 'bossStatus' | 'isRoundIntermission' | 'roundWinner' | 'silverScrapesState'>
): boolean =>
  state.bossHp <= 0 ||
  state.bossStatus === BOSS_STATUS.DEFEATED ||
  state.isRoundIntermission ||
  state.roundWinner !== null ||
  state.silverScrapesState?.isActive === true;

/**
 * Adds a timed VFX entity unless `maxActive` are still playing.
 * Returns null when full: dropping the NEW hit is invisible, while evicting the oldest one
 * would make a projectile vanish mid-flight.
 */
export const appendIfCapacity = <T extends { createdAt: number; durationMs: number }>(
  list: readonly T[],
  item: T,
  maxActive: number,
  now: number
): T[] | null => {
  const stillPlaying = list.filter((entry) => now - entry.createdAt < entry.durationMs);
  if (stillPlaying.length >= maxActive) return null;
  return [...stillPlaying, item];
};
