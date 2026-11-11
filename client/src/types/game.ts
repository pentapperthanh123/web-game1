import { TeamType, BossStatusType, DamageType, GameThemeType, ChampionSkillVFXType } from '../constants/game';
import { RosterPlayer } from '../constants/roster';
import { BossSkillConfig, ActiveBossSkillBanner } from './bossSkill';

export interface MinionEntity {
  id: string;
  summonerName: string;
  championName: string;
  avatarUrl: string;
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
  team: TeamType;
  position: [number, number, number];
  color: string;
  isCrit: boolean;
  dps: number;
  createdAt: number;
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
  giftName: string;
  team: TeamType;
  coins: number;
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
}

export interface AutoProBattleConfig {
  enabled: boolean;
  onlyWhenIdle: boolean;
  intervalMs: number;
}

export interface DamageBossOptions {
  excludeFromLeaderboard?: boolean;
  proPlayer?: RosterPlayer;
  suppressCombo?: boolean;
  minHpFloorPercent?: number;
}

export interface GameState {
  bossHp: number;
  bossMaxHp: number;
  bossStatus: BossStatusType;
  bossHitTimestamp: number;
  bossAttackTimestamp: number;
  screenShakeTimestamp: number;
  screenShakeIntensity: number;
  screenFlashColor: string | null;
  screenFlashTimestamp: number;
  teamScoreBLG: number;
  teamScoreGENG: number;
  totalLikesBLG: number;
  totalLikesGENG: number;
  minions: MinionEntity[];
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
  comboCount: number;
  comboDamage: number;
  comboTeam: TeamType | null;
  lastComboTimestamp: number;
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
  finisherPlayerName: string | null;
  finisherTeam: TeamType | null;
  autoProBattleConfig: AutoProBattleConfig;
  rosterAttackTimestamps: Record<string, number>;
  rosterPlayerFury: Record<string, number>;
  lastFuryUltimatePlayerId: string | null;

  // BO5 Match State
  bo5Score: {
    [key in TeamType]: number;
  };
  currentRound: number;
  bo5TargetWins: number;
  roundWinner: TeamType | null;
  isSeriesEnded: boolean;
  seriesWinner: TeamType | null;
  roundCountdownSeconds: number;

  // Actions
  startNextRound: () => void;
  resetBO5Match: () => void;
  setBO5Score: (blg: number, geng: number, currentRound?: number) => void;
  setBossSkillConfig: (config: Partial<BossSkillConfig>) => void;
  castBossSkill: (skillIndex?: number) => void;
  healTeamChampions: (team: TeamType | 'ALL', amount: number) => void;
  clearBossSkillBanner: () => void;
  triggerHeartMilestoneHeal: (milestoneCount: number) => void;
  clearHeartMilestoneBanner: () => void;
  setGameTheme: (theme: GameThemeType) => void;
  setOverlayVisibility: (visibility: Partial<OverlayVisibility>) => void;
  setAutoProBattleConfig: (config: Partial<AutoProBattleConfig>) => void;
  triggerAutoProAttack: (team: TeamType, playerIndex: number) => void;
  addPlayerFury: (playerId: string, amount: number) => void;
  spawnFlyingArrow: (
    championName: string,
    team: TeamType,
    isCrit?: boolean,
    customStart?: { x: number; y: number },
    customTarget?: { x: number; y: number }
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
    isGiftBypass?: boolean
  ) => void;
  triggerGiftExplosion: (giftName: string, team: TeamType, donorName: string, coins?: number) => void;
  addLikes: (count: number, team: TeamType, userName?: string) => void;
  addChatMessage: (userName: string, text: string, team?: TeamType, championName?: string) => void;
  spawnProjectile: (
    from: [number, number, number],
    color: string,
    isCrit?: boolean,
    customTarget?: [number, number, number]
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
