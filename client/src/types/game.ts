import { TeamType, BossStatusType, DamageType, GameThemeType, ChampionSkillVFXType, GiftTier } from '../constants/game';
export type { GameThemeType };
import type { ChampionshipTally } from '../store/championshipTally';
import { RosterPlayer } from '../constants/roster';
import {
  BossSkillConfig,
  BossSkillDefinition,
  ActiveBossSkillBanner,
  BossPhase,
  BossStatusEffectType,
} from './bossSkill';

/** A debuff currently applied to a champion by a boss skill. */
export interface ActiveStatusEffect {
  type: BossStatusEffectType;
  sourceSkillId: string;
  color: string;
  appliedAt: number;
  expiresAt: number;
  /** Damage-over-time per tick (BURN / POISON). */
  tickDamage?: number;
  lastTickAt: number;
}
import { ActiveTeamsMap, QueuedMatchup, TeamConfigState, TeamProfile } from './team';

export interface MinionEntity {
  id: string;
  /** Champions deployed in the same turn for this team (≥ SQUAD_ENTRANCE_CONSTANTS.MIN_SIZE → squad entrance). */
  entranceSquadSize?: number;
  summonerName: string;
  championName: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  team: TeamType;
  spawnPosition: [number, number, number];
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  verticalOffset: number;
  createdAt: number;
  lifetimeMs: number;
  dps: number;
  hp: number;
  maxHp: number;
  fury: number;
  maxFury: number;
  isSignatureSynergy?: boolean;
  signaturePlayerName?: string;
  signaturePlayerRole?: string;
  statusEffects?: ActiveStatusEffect[];
}

export interface TeamHeartMomentum {
  multiplier: number;
  lastTapAt: number;
  burstCount: number;
}

export interface DPSPlayer {
  id: string;
  userName: string;
  team: TeamType;
  totalDamage: number;
  avatarUrl?: string;
}

export interface ProDamageRecord {
  rosterId: string;
  playerName: string;
  role: RosterPlayer['role'];
  championName: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  team: TeamType;
  totalDamage: number;
}

export interface ParticleBurst {
  id: string;
  timestamp: number;
  origin: [number, number, number];
  color: string;
  intensity: number;
}

export interface HeartEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  speed: number;
  color: string;
  scale: number;
  swaySpeed: number;
  createdAt: number;
}

export interface ProjectileEntity {
  id: string;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  arcHeight: number;
  isCrit: boolean;
  color: string;
  glowColor?: string;
  coreColor?: string;
  createdAt: number;
}

export interface FlyingArrowEntity {
  id: string;
  sourceRosterId?: string;
  championName: string;
  vfxType?: ChampionSkillVFXType;
  skillName?: string;
  team: TeamType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  isCrit: boolean;
  color: string;
  glowColor?: string;
  coreColor?: string;
  createdAt: number;
  durationMs: number;
}

export interface ShockwaveEntity {
  id: string;
  timestamp: number;
  color: string;
  maxRadius: number;
}

export interface MeteorEntity {
  id: string;
  start: [number, number, number];
  target: [number, number, number];
  color: string;
  glowColor?: string;
  coreColor?: string;
  createdAt: number;
  duration: number;
}

export interface SlashEntity {
  id: string;
  position: [number, number, number];
  rotationZ: number;
  tiltX: number;
  tiltY: number;
  isCrit: boolean;
  color: string;
  scale: number;
  createdAt: number;
}

export interface SummonPortalEntity {
  id: string;
  summonerName: string;
  championName: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  team: TeamType;
  position: [number, number, number];
  color: string;
  isCrit: boolean;
  dps: number;
  createdAt: number;
  isSignatureSynergy?: boolean;
  signaturePlayerName?: string;
}

export interface HitImpactEntity {
  id: string;
  offsetX: number;
  offsetY: number;
  color: string;
  damageType: DamageType;
  team: TeamType;
  slashAngle?: number;
  isSmite?: boolean;
  createdAt: number;
}

export interface GiftAnnouncement {
  id: string;
  donorName: string;
  donorAvatarUrl?: string;
  giftName: string;
  team: TeamType;
  tier: GiftTier;
  coins: number;
  streakCount?: number;
  totalCoins?: number;
  isComboFinal?: boolean;
  timestamp: number;
}

export interface FloatingDamageText {
  id: string;
  amount: number;
  text: string;
  damageType: DamageType;
  team: TeamType;
  playerName?: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  createdAt: number;
}

export interface LiveChatMessage {
  id: string;
  userName: string;
  text: string;
  team?: TeamType;
  championName?: string;
  isGift?: boolean;
  coins?: number;
  timestamp: string;
}

export interface DefeatedChampionEntity {
  id: string;
  championName: string;
  summonerName: string;
  avatarUrl: string;
  team: TeamType;
  position: [number, number, number];
  screenX: number;
  screenY: number;
  killerName: string;
  createdAt: number;
  durationMs: number;
}

export interface HeartMilestoneBanner {
  id: string;
  milestoneCount: number;
  healAmount: number;
  timestamp: number;
}

export interface QueuedSummon {
  id: string;
  summonerName: string;
  championName: string;
  team: TeamType;
  userAvatarUrl?: string;
  isExplicitChampion?: boolean;
  isGiftBypass?: boolean;
  queuedAt: number;
}

export interface AdminEventLog {
  id: string;
  time: string;
  type: 'SUMMON' | 'GIFT' | 'DAMAGE' | 'BOSS' | 'SYSTEM' | 'LIKE';
  message: string;
  team?: TeamType;
}

export interface OverlayVisibility {
  chat: boolean;
  leaderboard: boolean;
  teamRosters: boolean;
  bossHealth: boolean;
  teamScores: boolean;
  likeCounter: boolean;
  howToPlay: boolean;
  heartMilestone: boolean;
  matchTitleBar: boolean;
}

export interface AutoProBattleConfig {
  enabled: boolean;
  onlyWhenIdle: boolean;
  intervalMs: number;
}

export interface AutoSummonConfig {
  enabled: boolean;
  team: TeamType;
  selectedChampion: string;
  speedMs: number;
  batchSize: number;
  alternateTeams: boolean;
  randomChampions: boolean;
}

export interface ParticipationRuleConfig {
  allowTeamOnlySummon: boolean;
  autoMatchSignatureTeam: boolean;
  lockTeamAfterJoin: boolean;
  allowChampionEvolution: boolean;
  /** Number of queued champions entering the arena per turn (arena floor is unlimited). */
  maxDeployPerTurn?: number;
  summonTurnDelayMs?: number;
}

export type BossWeakPointSpot = 'left-horn' | 'core-chest' | 'right-claw';

export interface BossShieldState {
  hp: number;
  maxHp: number;
  createdAt: number;
  expiresAt: number;
}

export interface BossWeakPointState {
  id: string;
  spot: BossWeakPointSpot;
  createdAt: number;
  expiresAt: number;
}

export interface DamageBossOptions {
  excludeFromLeaderboard?: boolean;
  proPlayer?: RosterPlayer;
  suppressCombo?: boolean;
  minHpFloorPercent?: number;
}

export interface TeamComboState {
  count: number;
  damage: number;
  lastTimestamp: number;
}

export type SeriesFormat = 'BO1' | 'BO3' | 'BO5';
export type DuelLaneKey = 'MID' | 'TOP' | 'JUG' | 'ADC' | 'SUP';

export interface DuelFighter {
  id: string;
  name: string;
  champion: string;
  avatarUrl: string;
  team: TeamType;
}

export interface SilverScrapesDuelEvent {
  type: 'TAP' | 'SKILL' | 'ULTIMATE' | 'MYTHIC';
  donorName: string;
  team: TeamType;
  deltaPercent: number;
  description: string;
}

export interface SilverScrapesDuelState {
  isActive: boolean;
  timeRemaining: number;
  totalDuration: number;
  tugOfWarPercent: number;
  selectedLane: DuelLaneKey;
  leftFighter: DuelFighter;
  rightFighter: DuelFighter;
  winner: TeamType | 'DRAW' | null;
  isLastStandActive: boolean;
  lastEvent?: SilverScrapesDuelEvent;
  buffActiveUntil?: number;
  winningTeamBuff?: TeamType | null;
}

export interface GameState {
  bossHp: number;
  bossMaxHp: number;
  bossStatus: BossStatusType;
  bossHitTimestamp: number;
  bossAttackTimestamp: number;
  /** Boss is knocked back (no skill casts) until this time; set by MEGA gifts. */
  bossStaggerUntil: number;
  screenShakeTimestamp: number;
  screenShakeIntensity: number;
  screenFlashColor: string | null;
  screenFlashTimestamp: number;
  teamScoreBLG: number;
  teamScoreGENG: number;
  totalLikesBLG: number;
  totalLikesGENG: number;
  minions: MinionEntity[];
  minionMap: Map<string, MinionEntity>;
  minionIdsByTeam: Record<TeamType, Set<string>>;
  livingCountByTeam: Record<TeamType, number>;
  summonQueue: Record<TeamType, QueuedSummon[]>;
  lastSummonTurnTimestamps: Record<TeamType, number>;
  leaderboard: DPSPlayer[];
  proLeaderboard: ProDamageRecord[];
  activeBursts: ParticleBurst[];
  activeHearts: HeartEntity[];
  activeProjectiles: ProjectileEntity[];
  activeShockwaves: ShockwaveEntity[];
  activeMeteors: MeteorEntity[];
  activeSlashes: SlashEntity[];
  activeSummonPortals: SummonPortalEntity[];
  activeHitImpacts: HitImpactEntity[];
  activeDefeatedChampions: DefeatedChampionEntity[];
  activeGiftBanner: GiftAnnouncement | null;
  floatingDamages: FloatingDamageText[];
  teamCombos: Record<TeamType, TeamComboState>;
  chatMessages: LiveChatMessage[];
  eventLogs: AdminEventLog[];
  isSimulationActive: boolean;
  botSpeedMs: number;
  overlayVisibility: OverlayVisibility;
  activeFlyingArrows: FlyingArrowEntity[];
  gameTheme: GameThemeType;
  bossSkillConfig: BossSkillConfig;
  activeBossSkillBanner: ActiveBossSkillBanner | null;
  activeHeartMilestoneBanner: HeartMilestoneBanner | null;
  bossSkillRotationIndex: number;
  lastHitTeam: TeamType | null;
  lastHitDamageType: DamageType | null;
  bossAttackTargetTeam: 'BLG' | 'GENG' | 'ALL' | null;
  bossDefeatedTimestamp: number;
  bossEnragedEntranceTimestamp: number;
  bossShield: BossShieldState | null;
  triggeredShieldThresholds: number[];
  bossShieldBrokenTimestamp: number;
  bossPhase: BossPhase;
  /** 0 until the first phase shift of the current round. */
  bossPhaseChangedAt: number;
  bossWeakPoint: BossWeakPointState | null;
  lastWeakPointSpawnTimestamp: number;
  finisherPlayerName: string | null;
  finisherTeam: TeamType | null;
  autoProBattleConfig: AutoProBattleConfig;
  autoSummonConfig: AutoSummonConfig;
  championDamageMultiplier: number;
  useUserAvatar: boolean;
  participationRuleConfig: ParticipationRuleConfig;
  rosterAttackTimestamps: Record<string, number>;
  rosterPlayerFury: Record<string, number>;
  lastFuryUltimatePlayerId: string | null;
  teamHeartMomentum: Record<TeamType, TeamHeartMomentum>;

  // Series Match State (BO1, BO3, BO5)
  seriesFormat: SeriesFormat;
  seriesMaxRounds: number;
  bo5Score: {
    [key in TeamType]: number;
  };
  currentRound: number;
  bo5TargetWins: number;
  roundWinner: TeamType | null;
  isRoundIntermission: boolean;
  isSeriesEnded: boolean;
  seriesWinner: TeamType | null;
  /** Series titles per matchup, persisted across streams (see store/championshipTally.ts). */
  championshipTally: ChampionshipTally;
  roundCountdownSeconds: number;

  // Silver Scrapes 1v1 State
  silverScrapesState: SilverScrapesDuelState;

  // Dynamic Team & Roster Configuration
  activeTeams: ActiveTeamsMap;
  teamCatalog: TeamProfile[];
  matchQueue: QueuedMatchup[];

  // Guest & Admin Simulation Mode State
  isGuestModeActive: boolean;
  guestTeam: TeamType;
  guestName: string;
  isAdminModeActive: boolean;

  // Actions
  setChampionDamageMultiplier: (multiplier: number) => void;
  setUseUserAvatar: (enabled: boolean) => void;
  setParticipationRuleConfig: (patch: Partial<ParticipationRuleConfig>) => void;
  setSeriesFormat: (format: SeriesFormat, resetScore?: boolean) => void;
  applySeriesFormatSnapshot: (config: {
    format: SeriesFormat;
    targetWins: number;
    maxRounds: number;
    blgScore: number;
    gengScore: number;
    currentRound: number;
  }) => void;
  setSilverScrapesState: (state: Partial<SilverScrapesDuelState>) => void;
  isSilverScrapesBuffActive: (team: TeamType) => boolean;
  setActiveTeams: (leftTeam: TeamProfile, rightTeam: TeamProfile, resetMatch?: boolean) => void;
  saveTeamToCatalog: (team: TeamProfile, mountToSlot?: TeamType) => void;
  deleteCustomTeam: (teamId: string) => void;
  duplicateTeamInCatalog: (teamId: string, copySuffix?: string) => TeamProfile | null;
  restorePresetTeam: (presetId: string) => boolean;
  setMatchQueue: (queue: QueuedMatchup[]) => void;
  enqueueMatchup: (leftTeamId: string, rightTeamId: string, customLabel?: string) => boolean;
  removeQueuedMatchup: (queueId: string) => void;
  advanceNextMatchQueue: () => boolean;
  importTeamPack: (teams: TeamProfile[], importedQueue?: QueuedMatchup[]) => number;
  applyTeamConfigSnapshot: (config: TeamConfigState, resetMatch?: boolean) => void;
  setGuestMode: (active: boolean) => void;
  setGuestTeam: (team: TeamType) => void;
  setGuestName: (name: string) => void;
  setAdminMode: (active: boolean) => void;
  startNextRound: () => void;
  resetBO5Match: () => void;
  /** Clears the title count of the two teams currently on stage. */
  resetMatchupChampionships: () => void;
  setBO5Score: (blg: number, geng: number, currentRound?: number) => void;
  setBossSkillConfig: (config: Partial<BossSkillConfig>) => void;
  castBossSkill: (skillIndex?: number) => void;
  /** Applies damage-over-time ticks, expires debuffs; called on a fixed interval. */
  tickStatusEffects: () => void;
  /** Re-derives the boss phase from HP and fires the phase-shift presentation on change. */
  syncBossPhase: () => void;
  healBoss: (amount: number, sourceLabel: string) => void;
  spawnBossMeteorRain: (skill: BossSkillDefinition, now: number) => void;
  healTeamChampions: (team: TeamType | 'GEN' | 'ALL', amount: number) => void;
  clearBossSkillBanner: () => void;
  hitWeakPoint: (playerName?: string) => void;
  tickBossMechanics: () => void;
  triggerHeartMilestoneHeal: (milestoneCount: number) => void;
  clearHeartMilestoneBanner: () => void;
  setGameTheme: (theme: GameThemeType) => void;
  setOverlayVisibility: (visibility: Partial<OverlayVisibility>) => void;
  setAutoProBattleConfig: (config: Partial<AutoProBattleConfig>) => void;
  setAutoSummonConfig: (config: Partial<AutoSummonConfig>) => void;
  triggerAutoProAttack: (team: TeamType, playerIndex: number) => void;
  addPlayerFury: (playerId: string, amount: number) => void;
  consumeMinionAttackFury: (minionId: string) => { isFullFury: boolean; nextFury: number };
  spawnFlyingArrow: (
    championName: string,
    team: TeamType,
    isCrit?: boolean,
    customStart?: { x: number; y: number },
    customTarget?: { x: number; y: number },
    sourcePlayerId?: string
  ) => void;
  damageBoss: (
    amount: number,
    team: TeamType,
    playerName: string,
    damageType?: DamageType,
    options?: DamageBossOptions
  ) => void;
  summonMinion: (
    summonerName: string,
    championName: string,
    team: TeamType,
    isGiftBypass?: boolean,
    userAvatarUrl?: string,
    isExplicitChampion?: boolean
  ) => void;
  summonMinionsBatch: (
    items: Array<{
      summonerName: string;
      championName: string;
      team: TeamType;
      isGiftBypass?: boolean;
      userAvatarUrl?: string;
      isExplicitChampion?: boolean;
    }>
  ) => void;
  advanceSummonTurnQueue: () => void;
  triggerGiftExplosion: (
    giftName: string,
    team: TeamType,
    donorName: string,
    coins?: number,
    streakCount?: number,
    totalCoins?: number,
    isComboFinal?: boolean,
    donorAvatarUrl?: string
  ) => void;
  triggerFollowReward: (
    userName: string,
    team: TeamType,
    championName: string,
    furyGain?: number
  ) => void;
  triggerShareReward: (
    userName: string,
    team: TeamType,
    damageAmount?: number,
    healAmount?: number
  ) => void;
  addLikes: (count: number, team: TeamType, userName?: string) => void;
  addChatMessage: (userName: string, text: string, team?: TeamType, championName?: string) => void;
  spawnProjectile: (
    from: [number, number, number],
    color: string,
    isCrit?: boolean,
    customTarget?: [number, number, number],
    shouldPlaySound?: boolean
  ) => void;
  spawnSlash: (position: [number, number, number], color: string, isCrit?: boolean) => void;
  spawnParticleBurst: (origin: [number, number, number], color: string, intensity: number) => void;
  triggerScreenShake: (intensity?: number) => void;
  triggerScreenFlash: (color: string) => void;
  triggerBossAttack: (type?: 'ROAR' | 'LIGHTNING') => void;
  resetBoss: () => void;
  setBossHp: (hp: number) => void;
  setBossStatus: (status: BossStatusType) => void;
  toggleSimulation: (forcedState?: boolean, speedMs?: number) => void;
  pruneEntities: () => void;
  dismissGiftBanner: () => void;
  addLog: (type: AdminEventLog['type'], message: string, team?: TeamType) => void;
}
