import {
  MinionEntity,
  QueuedSummon,
  SummonPortalEntity,
  AdminEventLog,
} from '../types/game';
import { TeamProfile } from '../types/team';
import {
  COMBAT_VFX_CONSTANTS,
  GAME_CONSTANTS,
  TEAM_KEY,
  TeamType,
} from '../constants/game';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
import { getChampionAvatarUrl } from '../constants/roster';
import { findExactSignaturePlayer, getTeamTheme } from '../constants/teams';
import { pickTargetInWing } from '../components/canvas/summon/summonShared';

export interface DeployQueuedResult {
  nextMinions: MinionEntity[];
  nextQueue: Record<TeamType, QueuedSummon[]>;
  nextLastTurnTimestamps: Record<TeamType, number>;
  newPortals: SummonPortalEntity[];
  newLogs: AdminEventLog[];
  hasPendingTurns: boolean;
}

/**
 * Sequential Turn-based Champion Dispatcher:
 * - Each team has at most 5 active champions on the field.
 * - Champions appear one by one with a delay (`SUMMON_TURN_DELAY_MS`).
 * - Only after the previous champion finishes their entrance (delay passes)
 *   does the next champion from the queue step onto the field!
 */
export const deployQueuedMinions = (
  currentMinions: MinionEntity[],
  currentQueue: Record<TeamType, QueuedSummon[]> | undefined,
  currentLastTurnTimestamps: Record<TeamType, number> | undefined,
  now: number,
  activeTeams: Record<TeamType, TeamProfile>
): DeployQueuedResult => {
  const nextMinions = [...currentMinions];
  const nextQueue: Record<TeamType, QueuedSummon[]> = {
    [TEAM_KEY.BLG]: [...(currentQueue?.[TEAM_KEY.BLG] || [])],
    [TEAM_KEY.GENG]: [...(currentQueue?.[TEAM_KEY.GENG] || [])],
  };
  const nextLastTurnTimestamps: Record<TeamType, number> = {
    [TEAM_KEY.BLG]: currentLastTurnTimestamps?.[TEAM_KEY.BLG] || 0,
    [TEAM_KEY.GENG]: currentLastTurnTimestamps?.[TEAM_KEY.GENG] || 0,
  };
  const newPortals: SummonPortalEntity[] = [];
  const newLogs: AdminEventLog[] = [];

  const teams: TeamType[] = [TEAM_KEY.BLG, TEAM_KEY.GENG];
  let hasPendingTurns = false;

  for (let t = 0; t < teams.length; t++) {
    const team = teams[t];
    const queue = nextQueue[team];
    if (queue.length === 0) continue;

    const livingCount = nextMinions.filter(
      (m) =>
        m.team === team &&
        (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0 &&
        now - m.createdAt < m.lifetimeMs
    ).length;

    // Check if team has reached maximum 5 active champions
    if (livingCount >= GAME_CONSTANTS.SUMMON_RULES.MAX_ACTIVE_PER_TEAM) {
      continue;
    }

    // Check delay: sau khi tướng xuất hiện xong mới đến lượt tiếp theo
    const lastTurnAt = nextLastTurnTimestamps[team] || 0;
    const timeSinceLastTurn = now - lastTurnAt;

    if (timeSinceLastTurn < GAME_CONSTANTS.SUMMON_RULES.SUMMON_TURN_DELAY_MS) {
      // Previous champion is still in their entrance turn! Wait for delay.
      hasPendingTurns = true;
      continue;
    }

    // Deploy EXACTLY ONE champion for this team's turn
    const req = queue.shift();
    if (!req) continue;

    nextLastTurnTimestamps[team] = now;
    if (queue.length > 0 && livingCount + 1 < GAME_CONSTANTS.SUMMON_RULES.MAX_ACTIVE_PER_TEAM) {
      hasPendingTurns = true;
    }

    const activeTeamProfile = activeTeams[team];
    const dynamicTeamTheme = getTeamTheme(activeTeamProfile?.colorTheme);
    const primaryColor = dynamicTeamTheme.primaryHex;
    const exactSignaturePro = findExactSignaturePlayer(
      req.championName,
      activeTeamProfile?.roster ?? []
    );
    const isSignatureSynergy = Boolean(exactSignaturePro);
    const rawBaseDps =
      GAME_CONSTANTS.MINIONS.BASE_DPS +
      Math.floor(Math.random() * GAME_CONSTANTS.MINIONS.DPS_VARIANCE);
    const baseDps = isSignatureSynergy
      ? Math.round(rawBaseDps * GAME_CONSTANTS.SIGNATURE_SYNERGY.DAMAGE_MULTIPLIER)
      : rawBaseDps;
    const summonDps = baseDps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER;
    const avatarUrl = getChampionAvatarUrl(req.championName, req.team);
    const spawnPosition = pickTargetInWing(req.team);

    const newMinion: MinionEntity = {
      id: `minion-${now}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName: req.summonerName,
      championName: req.championName,
      avatarUrl,
      userAvatarUrl: req.userAvatarUrl,
      team: req.team,
      spawnPosition,
      orbitRadius: 3.0,
      orbitSpeed: 0.5 * (req.team === TEAM_KEY.BLG ? 1 : -1),
      orbitAngle: Math.random() * Math.PI * 2,
      verticalOffset: 0,
      createdAt: now,
      lifetimeMs: GAME_CONSTANTS.MINIONS.LIFETIME_MS,
      dps: baseDps,
      hp: CHAMPION_DEFAULT_MAX_HP,
      maxHp: CHAMPION_DEFAULT_MAX_HP,
      fury: 0,
      maxFury: GAME_CONSTANTS.MINION_FURY.MAX_FURY,
      isSignatureSynergy,
      signaturePlayerName: exactSignaturePro?.name,
      signaturePlayerRole: exactSignaturePro?.role,
    };

    nextMinions.push(newMinion);

    newPortals.push({
      id: `portal-${now}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName: req.summonerName,
      championName: req.championName,
      avatarUrl,
      team: req.team,
      position: spawnPosition,
      color: isSignatureSynergy ? GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR : primaryColor,
      isCrit: isSignatureSynergy,
      dps: summonDps,
      createdAt: now,
      isSignatureSynergy,
      signaturePlayerName: exactSignaturePro?.name,
    });

    const turnNumber = livingCount + 1;
    newLogs.push({
      id: `log-turn-${now}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
      type: 'SUMMON',
      message: `⚔️ LƯỢT #${turnNumber}: [${req.championName}] của ${req.summonerName} xuất trận cho ${activeTeamProfile?.shortTag || req.team}!`,
      team: req.team,
    });
  }

  return {
    nextMinions,
    nextQueue,
    nextLastTurnTimestamps,
    newPortals,
    newLogs,
    hasPendingTurns,
  };
};
