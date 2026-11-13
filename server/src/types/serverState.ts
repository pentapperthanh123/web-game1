import type { Server } from 'socket.io';
import type { WebcastPushConnection } from 'tiktok-live-connector';
import type { TeamConfigState } from '../constants/teams.js';
import type { SeriesFormatConfig, SilverScrapesDuelState } from '../constants/series.js';

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

export const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = {
  chat: true,
  leaderboard: true,
  teamRosters: true,
  bossHealth: true,
  teamScores: true,
  likeCounter: true,
  howToPlay: true,
  heartMilestone: true,
  matchTitleBar: true,
};

export const OVERLAY_VISIBILITY_KEYS: readonly (keyof OverlayVisibility)[] = [
  'matchTitleBar',
  'chat',
  'leaderboard',
  'teamRosters',
  'bossHealth',
  'teamScores',
  'likeCounter',
  'howToPlay',
  'heartMilestone',
];

export type GameThemeType =
  | 'BARON'
  | 'ELDER_DRAGON'
  | 'XU_GIA'
  | 'RONG_NUI'
  | 'RONG_GIA'
  | 'VOID_TITAN';

export const VALID_GAME_THEMES = new Set<GameThemeType>([
  'BARON',
  'ELDER_DRAGON',
  'XU_GIA',
  'RONG_NUI',
  'RONG_GIA',
  'VOID_TITAN',
]);

export interface BossSkillConfig {
  autoAttackEnabled: boolean;
  intervalMs: number;
  damageMultiplier: number;
  mode: 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';
  randomIntervalEnabled: boolean;
}

export const DEFAULT_BOSS_SKILL_CONFIG: BossSkillConfig = {
  autoAttackEnabled: true,
  intervalMs: 4000,
  damageMultiplier: 1.0,
  mode: 'RANDOM_WEIGHTED',
  randomIntervalEnabled: true,
};

export interface AutoProBattleConfig {
  enabled: boolean;
  onlyWhenIdle: boolean;
  intervalMs: number;
}

export const DEFAULT_AUTO_PRO_BATTLE_CONFIG: AutoProBattleConfig = {
  enabled: false,
  onlyWhenIdle: true,
  intervalMs: 1800,
};

export interface ParticipationRuleConfig {
  allowTeamOnlySummon: boolean;
  autoMatchSignatureTeam: boolean;
  lockTeamAfterJoin: boolean;
  allowChampionEvolution: boolean;
  /** Number of queued champions that enter the arena per turn (arena floor itself is unlimited). */
  maxDeployPerTurn?: number;
  summonTurnDelayMs?: number;
}

export const SUMMON_QUEUE_LIMITS = {
  DEFAULT_DEPLOY_PER_TURN: 1,
  MIN_DEPLOY_PER_TURN: 1,
  MAX_DEPLOY_PER_TURN: 30,
  DEFAULT_TURN_DELAY_MS: 1300,
  MIN_TURN_DELAY_MS: 100,
  MAX_TURN_DELAY_MS: 10000,
} as const;

export const DEFAULT_PARTICIPATION_RULE_CONFIG: ParticipationRuleConfig = {
  allowTeamOnlySummon: true,
  autoMatchSignatureTeam: true,
  lockTeamAfterJoin: true,
  allowChampionEvolution: true,
  maxDeployPerTurn: SUMMON_QUEUE_LIMITS.DEFAULT_DEPLOY_PER_TURN,
  summonTurnDelayMs: SUMMON_QUEUE_LIMITS.DEFAULT_TURN_DELAY_MS,
};

export type TikTokConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface ServerState {
  overlayVisibility: OverlayVisibility;
  teamConfig: TeamConfigState;
  seriesConfig: SeriesFormatConfig;
  silverScrapesDuelState: SilverScrapesDuelState;
  gameTheme: GameThemeType;
  bossSkillConfig: BossSkillConfig;
  autoProBattleConfig: AutoProBattleConfig;
  championDamageMultiplier: number;
  useUserAvatar: boolean;
  participationRuleConfig: ParticipationRuleConfig;
  tiktokUsername: string;
  connectionStatus: TikTokConnectionStatus;
  lastErrorMessage: string;
  /** Current auto-reconnect attempt number (0 when not reconnecting). */
  reconnectAttempt: number;
  /** Epoch ms of the next scheduled reconnect attempt, or null. */
  nextRetryAt: number | null;
  tiktokConnection: WebcastPushConnection | null;
}

export interface ServerContext {
  io: Server;
  state: ServerState;
}
