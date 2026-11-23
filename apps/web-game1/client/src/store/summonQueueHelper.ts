import {
  MinionEntity,
  ParticipationRuleConfig,
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
  isEliteMinion,
} from '../constants/game';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
import { getChampionAvatarUrl } from '../constants/roster';
import { findExactSignaturePlayer, getTeamTheme } from '../constants/teams';
import { pickSpawnPositionInWing } from '../components/canvas/summon/championSpread';
import {
  CHAMPION_LEVEL_THRESHOLDS,
  getChampionLevelConfig,
  resolveEffectiveChampionLevel,
} from '../constants/championLevel';
import { getViewerSessionDamage } from './sessionLeaderboardStore';

export interface DeployQueuedResult {
  nextMinions: MinionEntity[];
  nextQueue: Record<TeamType, QueuedSummon[]>;
  nextLastTurnTimestamps: Record<TeamType, number>;
  newPortals: SummonPortalEntity[];
  newLogs: AdminEventLog[];
  hasPendingTurns: boolean;
}

/** Turn pacing of the reinforcement queue. The arena floor itself has no champion cap. */
export interface SummonTurnLimits {
  maxDeployPerTurn: number;
  summonTurnDelayMs: number;
}

const SUMMON_ORBIT_RADIUS = 3.0;
const SUMMON_ORBIT_SPEED = 0.5;
const RANDOM_ID_RADIX = 36;
const RANDOM_ID_START = 2;
const RANDOM_ID_END = 6;
const SUMMON_LOG_TYPE = 'SUMMON';
const LOG_TIME_LOCALE = 'vi-VN';
const QUEUE_TEAMS: TeamType[] = [TEAM_KEY.BLG, TEAM_KEY.GENG];

const createRandomIdSuffix = (): string =>
  Math.random().toString(RANDOM_ID_RADIX).substring(RANDOM_ID_START, RANDOM_ID_END);

/** Reads the admin-configured queue pacing, falling back to safe defaults. */
export const resolveSummonTurnLimits = (
  config: Partial<ParticipationRuleConfig> | undefined
): SummonTurnLimits => ({
  maxDeployPerTurn: Math.max(
    GAME_CONSTANTS.SUMMON_RULES.MIN_DEPLOY_PER_TURN,
    Math.round(config?.maxDeployPerTurn ?? GAME_CONSTANTS.SUMMON_RULES.MAX_DEPLOY_PER_TURN)
  ),
  summonTurnDelayMs: config?.summonTurnDelayMs ?? GAME_CONSTANTS.SUMMON_RULES.SUMMON_TURN_DELAY_MS,
});

/** Admin-configured attack speed of summoned champions, clamped to the supported range. */
export const resolveChampionAttackSpeedMultiplier = (
  config: Partial<ParticipationRuleConfig> | undefined
): number => {
  const multiplier = config?.championAttackSpeedMultiplier;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
    return GAME_CONSTANTS.SUMMON_RULES.CHAMPION_ATTACK_SPEED_MULTIPLIER;
  }
  return Math.min(
    GAME_CONSTANTS.SUMMON_RULES.MAX_CHAMPION_ATTACK_SPEED_MULTIPLIER,
    Math.max(GAME_CONSTANTS.SUMMON_RULES.MIN_CHAMPION_ATTACK_SPEED_MULTIPLIER, multiplier)
  );
};

interface DeployedChampion {
  minion: MinionEntity;
  portal: SummonPortalEntity;
  log: AdminEventLog;
}

const rollBaseDps = (isSignatureSynergy: boolean): number => {
  const rawBaseDps =
    GAME_CONSTANTS.MINIONS.BASE_DPS +
    Math.floor(Math.random() * GAME_CONSTANTS.MINIONS.DPS_VARIANCE);
  if (!isSignatureSynergy) return rawBaseDps;
  return Math.round(rawBaseDps * GAME_CONSTANTS.SIGNATURE_SYNERGY.DAMAGE_MULTIPLIER);
};

/** Builds the minion entity, entrance portal and event log for one queued summon. */
const buildDeployedChampion = (
  req: QueuedSummon,
  activeTeamProfile: TeamProfile | undefined,
  now: number,
  slotIndex: number
): DeployedChampion => {
  const primaryColor = getTeamTheme(activeTeamProfile?.colorTheme).primaryHex;
  const exactSignaturePro = findExactSignaturePlayer(req.championName, activeTeamProfile?.roster ?? []);
  const isSignatureSynergy = Boolean(exactSignaturePro);
  const isElite = Boolean(req.isElite || req.isGiftBypass || isEliteMinion(req) || isSignatureSynergy);
  const sessionDamage = getViewerSessionDamage(req.summonerName);
  const effectiveLevel = resolveEffectiveChampionLevel(req.level, sessionDamage);
  const levelConfig = getChampionLevelConfig(effectiveLevel);
  const baseDps = rollBaseDps(isSignatureSynergy);
  const levelDps = Math.round(baseDps * (1 + levelConfig.dpsBonusPercent));
  const avatarUrl = getChampionAvatarUrl(req.championName, req.team);
  const resolvedUserAvatarUrl =
    req.userAvatarUrl || exactSignaturePro?.avatarUrl || activeTeamProfile?.logoUrl;
  const spawnPosition = pickSpawnPositionInWing(req.team);
  const orbitDirection = req.team === TEAM_KEY.BLG ? 1 : -1;

  const minion: MinionEntity = {
    id: `minion-${now}-${slotIndex}-${createRandomIdSuffix()}`,
    summonerName: req.summonerName,
    championName: req.championName,
    avatarUrl,
    userAvatarUrl: resolvedUserAvatarUrl,
    team: req.team,
    spawnPosition,
    orbitRadius: SUMMON_ORBIT_RADIUS,
    orbitSpeed: SUMMON_ORBIT_SPEED * orbitDirection,
    orbitAngle: Math.random() * Math.PI * 2,
    verticalOffset: 0,
    createdAt: now,
    dps: levelDps,
    hp: CHAMPION_DEFAULT_MAX_HP,
    maxHp: CHAMPION_DEFAULT_MAX_HP,
    fury: 0,
    maxFury: GAME_CONSTANTS.MINION_FURY.MAX_FURY,
    isSignatureSynergy,
    isElite,
    signaturePlayerName: exactSignaturePro?.name,
    signaturePlayerRole: exactSignaturePro?.role,
    level: effectiveLevel,
    levelTier: levelConfig.tier,
    levelScale: levelConfig.scaleMultiplier,
  };

  const portal: SummonPortalEntity = {
    id: `portal-${now}-${slotIndex}-${createRandomIdSuffix()}`,
    minionId: minion.id,
    summonerName: req.summonerName,
    championName: req.championName,
    avatarUrl,
    team: req.team,
    position: spawnPosition,
    color: isSignatureSynergy ? GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR : primaryColor,
    isCrit: isSignatureSynergy,
    dps: levelDps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER,
    createdAt: now,
    isSignatureSynergy,
    signaturePlayerName: exactSignaturePro?.name,
    level: effectiveLevel,
    levelTier: levelConfig.tier,
  };

  const levelTag =
    effectiveLevel >= CHAMPION_LEVEL_THRESHOLDS.WARRIOR_MIN
      ? ` [Lv.${effectiveLevel} ${levelConfig.tierNameVi}]`
      : '';
  const log: AdminEventLog = {
    id: `log-turn-${now}-${slotIndex}-${createRandomIdSuffix()}`,
    time: new Date(now).toLocaleTimeString(LOG_TIME_LOCALE, { hour12: false }),
    type: SUMMON_LOG_TYPE,
    message: `⚔️ LƯỢT XUẤT TRẬN: [${req.championName}]${levelTag} của ${req.summonerName} xung trận cho ${activeTeamProfile?.shortTag || req.team}!`,
    team: req.team,
  };

  return { minion, portal, log };
};

/**
 * Sequential turn-based champion dispatcher:
 * - The arena floor is UNLIMITED: every deployed champion stays and fights until it dies or expires.
 * - The queue only paces entrances: each turn releases up to `maxDeployPerTurn` champions per team,
 *   then waits `summonTurnDelayMs` before the next turn so every entrance aura can play out.
 */
/** Round intro on screen: nobody enters the field; the queue is kept as is until the fight starts. */
export const holdQueuedMinions = (
  currentMinions: MinionEntity[],
  currentQueue: Record<TeamType, QueuedSummon[]> | undefined,
  currentLastTurnTimestamps: Record<TeamType, number> | undefined
): DeployQueuedResult => ({
  nextMinions: [...currentMinions],
  nextQueue: {
    [TEAM_KEY.BLG]: [...(currentQueue?.[TEAM_KEY.BLG] || [])],
    [TEAM_KEY.GENG]: [...(currentQueue?.[TEAM_KEY.GENG] || [])],
  },
  nextLastTurnTimestamps: {
    [TEAM_KEY.BLG]: currentLastTurnTimestamps?.[TEAM_KEY.BLG] ?? 0,
    [TEAM_KEY.GENG]: currentLastTurnTimestamps?.[TEAM_KEY.GENG] ?? 0,
  },
  newPortals: [],
  newLogs: [],
  hasPendingTurns: false,
});

export const deployQueuedMinions = (
  currentMinions: MinionEntity[],
  currentQueue: Record<TeamType, QueuedSummon[]> | undefined,
  currentLastTurnTimestamps: Record<TeamType, number> | undefined,
  now: number,
  activeTeams: Record<TeamType, TeamProfile>,
  limits: SummonTurnLimits
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
  let hasPendingTurns = false;

  for (const team of QUEUE_TEAMS) {
    const queue = nextQueue[team];
    if (queue.length === 0) continue;

    const isTurnCoolingDown = now - nextLastTurnTimestamps[team] < limits.summonTurnDelayMs;
    if (isTurnCoolingDown) {
      hasPendingTurns = true;
      continue;
    }

    nextLastTurnTimestamps[team] = now;
    const turnBatch = queue.splice(0, limits.maxDeployPerTurn);
    turnBatch.forEach((req, slotIndex) => {
      const deployedChampion = buildDeployedChampion(req, activeTeams[team], now, slotIndex);
      nextMinions.push({ ...deployedChampion.minion, entranceSquadSize: turnBatch.length });
      newPortals.push(deployedChampion.portal);
      newLogs.push(deployedChampion.log);
    });

    if (queue.length > 0) hasPendingTurns = true;
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
