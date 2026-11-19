import type { ChampionshipTallyReport } from '../constants/championshipTally.js';
import type { GiftCatalogState, GiftConfigState } from '../constants/giftConfig.js';
import type { Server } from 'socket.io';
import type { WebcastPushConnection } from 'tiktok-live-connector/legacy';
import type { TeamConfigState } from '../constants/teams.js';
import type { GameThemeType, SeriesFormatConfig, SilverScrapesDuelState } from '../constants/series.js';
import type { CasterConfig, ChatLimitConfig } from '../constants/liveOps.js';

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
  casterSubtitle: boolean;
  bossSkills: boolean;
  bossSkillBanner: boolean;
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
  casterSubtitle: false,
  bossSkills: false,
  bossSkillBanner: true,
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
  'casterSubtitle',
  'bossSkills',
  'bossSkillBanner',
];

export type { GameThemeType };

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

/** Mirrors client DEFAULT_SKILL_DAMAGE_MULTIPLIER ("medium" boss danger; the old 0.25 made bosses harmless). */
export const DEFAULT_BOSS_SKILL_DAMAGE_MULTIPLIER = 0.45;

export const DEFAULT_BOSS_SKILL_CONFIG: BossSkillConfig = {
  autoAttackEnabled: true,
  intervalMs: 10000,
  damageMultiplier: DEFAULT_BOSS_SKILL_DAMAGE_MULTIPLIER,
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
  /** Summoned champions attack this many times faster than the base interval (1 = base). */
  championAttackSpeedMultiplier?: number;
  /** Regular time of a round before overtime; 0 = no time limit. */
  roundDurationMs?: number;
  /** Auto-start countdown for new series in milliseconds; 0 = manual start only. */
  seriesAutoStartMs?: number;
  /** Matchup rotation mode when matchQueue is empty: 'random' | 'repeat'. */
  matchRotationMode?: 'random' | 'repeat';
  /** Whether the +15% comeback damage buff for trailing team is enabled. */
  enableComebackBuff?: boolean;
}

export const SUMMON_QUEUE_LIMITS = {
  DEFAULT_DEPLOY_PER_TURN: 1,
  MIN_DEPLOY_PER_TURN: 1,
  MAX_DEPLOY_PER_TURN: 30,
  DEFAULT_TURN_DELAY_MS: 1300,
  MIN_TURN_DELAY_MS: 100,
  MAX_TURN_DELAY_MS: 10000,
  DEFAULT_CHAMPION_ATTACK_SPEED_MULTIPLIER: 1.5,
  MIN_CHAMPION_ATTACK_SPEED_MULTIPLIER: 0.5,
  MAX_CHAMPION_ATTACK_SPEED_MULTIPLIER: 4,
} as const;

/** Mirrors client ROUND_CLOCK_CONSTANTS: 0 turns the round time limit off. */
export const ROUND_DURATION_LIMITS = {
  DEFAULT_MS: 0,
  NO_LIMIT_MS: 0,
  MAX_MS: 900_000,
} as const;

export const DEFAULT_PARTICIPATION_RULE_CONFIG: ParticipationRuleConfig = {
  allowTeamOnlySummon: true,
  autoMatchSignatureTeam: true,
  lockTeamAfterJoin: true,
  allowChampionEvolution: true,
  maxDeployPerTurn: SUMMON_QUEUE_LIMITS.DEFAULT_DEPLOY_PER_TURN,
  summonTurnDelayMs: SUMMON_QUEUE_LIMITS.DEFAULT_TURN_DELAY_MS,
  championAttackSpeedMultiplier: SUMMON_QUEUE_LIMITS.DEFAULT_CHAMPION_ATTACK_SPEED_MULTIPLIER,
  roundDurationMs: ROUND_DURATION_LIMITS.NO_LIMIT_MS,
  seriesAutoStartMs: 15_000,
  matchRotationMode: 'random',
  enableComebackBuff: true,
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
  /** Last series-title counts reported by an overlay (shown in the admin portal). */
  championshipTally: ChampionshipTallyReport | null;
  /** Per-gift rules from the admin portal (team, overlay board, effect, damage multiplier). */
  giftConfig: GiftConfigState;
  /** Gift list of the connected live room, for the admin picker. */
  giftCatalog: GiftCatalogState;
  useUserAvatar: boolean;
  participationRuleConfig: ParticipationRuleConfig;
  chatLimitConfig: ChatLimitConfig;
  casterConfig: CasterConfig;
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
