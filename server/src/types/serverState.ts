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
  maxActivePerTeam?: number;
  summonTurnDelayMs?: number;
}

export const DEFAULT_PARTICIPATION_RULE_CONFIG: ParticipationRuleConfig = {
  allowTeamOnlySummon: true,
  autoMatchSignatureTeam: true,
  lockTeamAfterJoin: true,
  allowChampionEvolution: true,
  maxActivePerTeam: 5,
  summonTurnDelayMs: 1300,
};

export type TikTokConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

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
  tiktokConnection: WebcastPushConnection | null;
}

export interface ServerContext {
  io: Server;
  state: ServerState;
}
