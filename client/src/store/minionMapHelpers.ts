import { MinionEntity } from '../types/game';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
import { TEAM_KEY, TeamType } from '../constants/game';

/**
 * A champion is on the field for as long as it has HP. There is no time limit:
 * the only way a champion leaves mid-round is being knocked out (HP reaching 0).
 */
export const isMinionLiving = (minion: MinionEntity | undefined): boolean => {
  if (!minion) return false;
  return (minion.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0;
};

/**
 * Tạo minion structures rỗng (initial state).
 */
export const createEmptyMinionCollections = () => ({
  minionMap: new Map<string, MinionEntity>(),
  minionIdsByTeam: {
    [TEAM_KEY.BLG]: new Set<string>(),
    [TEAM_KEY.GENG]: new Set<string>(),
  } as Record<TeamType, Set<string>>,
  livingCountByTeam: {
    [TEAM_KEY.BLG]: 0,
    [TEAM_KEY.GENG]: 0,
  } as Record<TeamType, number>,
});

/**
 * Sync từ 1 mảng minions sang Map & Sets & livingCount.
 */
export const rebuildMinionCollections = (
  minions: MinionEntity[]
): {
  minionMap: Map<string, MinionEntity>;
  minionIdsByTeam: Record<TeamType, Set<string>>;
  livingCountByTeam: Record<TeamType, number>;
} => {
  const minionMap = new Map<string, MinionEntity>();
  const minionIdsByTeam: Record<TeamType, Set<string>> = {
    [TEAM_KEY.BLG]: new Set<string>(),
    [TEAM_KEY.GENG]: new Set<string>(),
  };
  const livingCountByTeam: Record<TeamType, number> = {
    [TEAM_KEY.BLG]: 0,
    [TEAM_KEY.GENG]: 0,
  };

  for (let i = 0; i < minions.length; i += 1) {
    const minion = minions[i];
    minionMap.set(minion.id, minion);
    minionIdsByTeam[minion.team].add(minion.id);
    if (isMinionLiving(minion)) {
      livingCountByTeam[minion.team] += 1;
    }
  }

  return { minionMap, minionIdsByTeam, livingCountByTeam };
};

/**
 * Thêm hoặc cập nhật tướng (O(1)).
 */
export const upsertMinionToCollections = (
  collections: {
    minionMap: Map<string, MinionEntity>;
    minionIdsByTeam: Record<TeamType, Set<string>>;
    livingCountByTeam: Record<TeamType, number>;
  },
  minion: MinionEntity
): void => {
  const existing = collections.minionMap.get(minion.id);
  const wasAlive = isMinionLiving(existing);
  const isNowAlive = isMinionLiving(minion);

  collections.minionMap.set(minion.id, minion);
  collections.minionIdsByTeam[minion.team].add(minion.id);

  if (!wasAlive && isNowAlive) {
    collections.livingCountByTeam[minion.team] += 1;
  } else if (wasAlive && !isNowAlive) {
    collections.livingCountByTeam[minion.team] = Math.max(0, collections.livingCountByTeam[minion.team] - 1);
  }
};

/**
 * Xóa tướng khỏi collections (O(1)).
 */
export const removeMinionFromCollections = (
  collections: {
    minionMap: Map<string, MinionEntity>;
    minionIdsByTeam: Record<TeamType, Set<string>>;
    livingCountByTeam: Record<TeamType, number>;
  },
  minionId: string
): MinionEntity | undefined => {
  const existing = collections.minionMap.get(minionId);
  if (!existing) return undefined;

  if (isMinionLiving(existing)) {
    collections.livingCountByTeam[existing.team] = Math.max(
      0,
      collections.livingCountByTeam[existing.team] - 1
    );
  }

  collections.minionIdsByTeam[existing.team].delete(minionId);
  collections.minionMap.delete(minionId);
  return existing;
};
