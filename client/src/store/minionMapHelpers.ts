import { MinionEntity } from '../types/game';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
import { TEAM_KEY, TeamType } from '../constants/game';

/**
 * Kiểm tra xem tướng có đang còn sống và chưa hết hạn không.
 */
export const isMinionLiving = (minion: MinionEntity | undefined, now: number): boolean => {
  if (!minion) return false;
  const isHpAlive = (minion.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0;
  const isNotExpired = now - minion.createdAt < minion.lifetimeMs;
  return isHpAlive && isNotExpired;
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
  minions: MinionEntity[],
  now: number
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
    if (isMinionLiving(minion, now)) {
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
  minion: MinionEntity,
  now: number
): void => {
  const existing = collections.minionMap.get(minion.id);
  const wasAlive = isMinionLiving(existing, now);
  const isNowAlive = isMinionLiving(minion, now);

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
  minionId: string,
  now: number
): MinionEntity | undefined => {
  const existing = collections.minionMap.get(minionId);
  if (!existing) return undefined;

  if (isMinionLiving(existing, now)) {
    collections.livingCountByTeam[existing.team] = Math.max(
      0,
      collections.livingCountByTeam[existing.team] - 1
    );
  }

  collections.minionIdsByTeam[existing.team].delete(minionId);
  collections.minionMap.delete(minionId);
  return existing;
};
