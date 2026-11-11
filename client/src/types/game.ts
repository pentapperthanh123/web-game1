import { TeamType, BossStatusType } from '../constants/game';

export interface MinionEntity {
  id: string;
  summonerName: string;
  championName: string;
  team: TeamType;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  verticalOffset: number;
  createdAt: number;
  lifetimeMs: number;
  dps: number;
}

export interface DPSPlayer {
  id: string;
  userName: string;
  team: TeamType;
  totalDamage: number;
  avatarUrl?: string;
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
  color: string;
  createdAt: number;
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
  createdAt: number;
  duration: number;
}

export interface SlashEntity {
  id: string;
  position: [number, number, number];
  rotationZ: number;
  color: string;
  scale: number;
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
  text: string;
  damageType: 'NORMAL' | 'CRIT' | 'ULTIMATE';
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

export interface AdminEventLog {
  id: string;
  time: string;
  type: 'SUMMON' | 'GIFT' | 'DAMAGE' | 'BOSS' | 'SYSTEM' | 'LIKE';
  message: string;
  team?: TeamType;
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
  activeBursts: ParticleBurst[];
  activeHearts: HeartEntity[];
  activeProjectiles: ProjectileEntity[];
  activeShockwaves: ShockwaveEntity[];
  activeMeteors: MeteorEntity[];
  activeSlashes: SlashEntity[];
  activeGiftBanner: GiftAnnouncement | null;
  floatingDamages: FloatingDamageText[];
  chatMessages: LiveChatMessage[];
  eventLogs: AdminEventLog[];
  isSimulationActive: boolean;
  botSpeedMs: number;

  // Actions
  damageBoss: (amount: number, team: TeamType, playerName: string, damageType?: 'NORMAL' | 'CRIT' | 'ULTIMATE') => void;
  summonMinion: (summonerName: string, championName: string, team: TeamType) => void;
  triggerGiftExplosion: (giftName: string, team: TeamType, donorName: string, coins?: number) => void;
  addLikes: (count: number, team: TeamType, userName?: string) => void;
  addChatMessage: (userName: string, text: string, team?: TeamType, championName?: string) => void;
  spawnProjectile: (from: [number, number, number], color: string) => void;
  spawnSlash: (position: [number, number, number], color: string) => void;
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
