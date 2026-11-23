/**
 * Live-session damage leaderboard: accumulates every viewer's damage over the whole stream
 * (not reset between rounds) so top donors keep competing for the crown.
 */
export const SESSION_LEADERBOARD_CONSTANTS = {
  STORAGE_KEY: 'lol_session_leaderboard_v1',
  /** No damage for this long = a new live session: the board starts empty. */
  IDLE_RESET_MS: 4 * 60 * 60 * 1000,
  /** Rows shown in the HUD corner board; at most 3 (each row gets a gold / silver / bronze rank style). */
  DISPLAY_SIZE: 3,
  /** Viewers kept in localStorage (the top of the board); the long tail is dropped on save. */
  MAX_PERSISTED_ENTRIES: 300,
  /** Re-ranking runs at most this often; hits only add to a map in between. */
  FLUSH_INTERVAL_MS: 400,
  SAVE_INTERVAL_MS: 5_000,
  /** A new #1 is announced only once the race is real, and not more often than the cooldown. */
  TAKEOVER_MIN_DAMAGE: 5_000,
  TAKEOVER_COOLDOWN_MS: 10_000,
  TAKEOVER_BANNER_MS: 4_500,
  /** Canonical-name cache bound (actor labels repeat every hit). */
  MAX_NAME_CACHE: 2_000,
} as const;

export const SESSION_RANK = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
} as const;
export type SessionRank = (typeof SESSION_RANK)[keyof typeof SESSION_RANK];

/** Position pill style of the top three rows on the session board: gold, silver, bronze. */
export const SESSION_RANK_STYLE: Readonly<Record<SessionRank, { badgeClass: string }>> = {
  [SESSION_RANK.FIRST]: { badgeClass: 'bg-amber-400 text-slate-950 shadow-[0_0_6px_#f59e0b]' },
  [SESSION_RANK.SECOND]: { badgeClass: 'bg-slate-200 text-slate-950' },
  [SESSION_RANK.THIRD]: { badgeClass: 'bg-amber-700 text-white' },
};

/** Auto-summoned filler champions when the arena is empty; they are not viewers and never rank. */
export const VANGUARD_ACTOR_LABEL = 'Tiên Phong';

/** Socket events; mirrors server/src/constants/sessionLeaderboard.ts. */
export const SESSION_LEADERBOARD_SOCKET_EVENT = {
  /** Server → overlay: the admin portal asked to start a new session board. */
  RESET: 'game:reset-session-leaderboard',
} as const;

/**
 * Session tiers (own emblem art, inspired by ladder tier names — no Riot assets).
 * Apex tiers go by board position, the rest by session damage; every viewer can climb during a stream.
 */
export const SESSION_TIER = {
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  EMERALD: 'EMERALD',
  DIAMOND: 'DIAMOND',
  MASTER: 'MASTER',
  GRANDMASTER: 'GRANDMASTER',
  CHALLENGER: 'CHALLENGER',
} as const;
export type SessionTier = (typeof SESSION_TIER)[keyof typeof SESSION_TIER];

/** Board position → apex tier (first match wins); needs APEX_MIN_DAMAGE so an early 500-damage #1 is not Challenger. */
export const SESSION_APEX_TIER_RULES: ReadonlyArray<{ tier: SessionTier; maxPosition: number }> = [
  { tier: SESSION_TIER.CHALLENGER, maxPosition: 1 },
  { tier: SESSION_TIER.GRANDMASTER, maxPosition: 3 },
  { tier: SESSION_TIER.MASTER, maxPosition: 10 },
];
export const SESSION_APEX_MIN_DAMAGE = 10_000;
/** Positions that can hold an apex tier (the board re-ranks this many each flush). */
export const SESSION_APEX_POSITIONS = 10;

/** Session damage → tier (first match wins). 1 coin ≈ 120 damage, so 99 coins ≈ Platinum. */
export const SESSION_DAMAGE_TIER_RULES: ReadonlyArray<{ tier: SessionTier; minDamage: number }> = [
  { tier: SESSION_TIER.DIAMOND, minDamage: 300_000 },
  { tier: SESSION_TIER.EMERALD, minDamage: 100_000 },
  { tier: SESSION_TIER.PLATINUM, minDamage: 30_000 },
  { tier: SESSION_TIER.GOLD, minDamage: 10_000 },
  { tier: SESSION_TIER.SILVER, minDamage: 2_000 },
];

export const SESSION_TIER_SHAPE = {
  /** Metal tiers: shield. */
  SHIELD: 'SHIELD',
  /** Gem tiers: faceted gem. */
  GEM: 'GEM',
  /** Apex tiers: gem with a crown. */
  CROWNED: 'CROWNED',
} as const;
export type SessionTierShape = (typeof SESSION_TIER_SHAPE)[keyof typeof SESSION_TIER_SHAPE];

/** SVG path data on a 24x24 box; shared by the DOM emblem and the canvas nameplate (Path2D). */
export const SESSION_TIER_EMBLEM_PATHS: Readonly<Record<SessionTierShape, { body: string; detail: string; crown?: string }>> = {
  [SESSION_TIER_SHAPE.SHIELD]: {
    body: 'M12 2 L20 5 V11 C20 16 16.5 19.5 12 22 C7.5 19.5 4 16 4 11 V5 Z',
    detail: 'M12 5 L17 7 V11 C17 14.5 14.8 17 12 18.6',
  },
  [SESSION_TIER_SHAPE.GEM]: {
    body: 'M7 3 H17 L21 9 L12 22 L3 9 Z',
    detail: 'M3 9 H21 M7 3 L9.5 9 L12 22 L14.5 9 L17 3',
  },
  [SESSION_TIER_SHAPE.CROWNED]: {
    body: 'M8 9 H16 L20 13 L12 23 L4 13 Z',
    detail: 'M4 13 H20 M8 9 L10 13 L12 23 L14 13 L16 9',
    crown: 'M4.5 8 L6 2.5 L9.5 5.5 L12 1.5 L14.5 5.5 L18 2.5 L19.5 8 Z',
  },
};
export const SESSION_TIER_EMBLEM_VIEWBOX = 24;

export interface SessionTierStyle {
  /** Higher = better; used to detect promotions. */
  order: number;
  light: string;
  dark: string;
  shape: SessionTierShape;
  /** i18n key under SessionTier.* and its Vietnamese fallback. */
  labelKey: string;
  fallbackLabel: string;
}

export const SESSION_TIER_STYLE: Readonly<Record<SessionTier, SessionTierStyle>> = {
  [SESSION_TIER.SILVER]: { order: 1, light: '#e2e8f0', dark: '#64748b', shape: SESSION_TIER_SHAPE.SHIELD, labelKey: 'SessionTier.SILVER', fallbackLabel: 'Bạc' },
  [SESSION_TIER.GOLD]: { order: 2, light: '#fde68a', dark: '#b45309', shape: SESSION_TIER_SHAPE.SHIELD, labelKey: 'SessionTier.GOLD', fallbackLabel: 'Vàng' },
  [SESSION_TIER.PLATINUM]: { order: 3, light: '#99f6e4', dark: '#0f766e', shape: SESSION_TIER_SHAPE.SHIELD, labelKey: 'SessionTier.PLATINUM', fallbackLabel: 'Bạch Kim' },
  [SESSION_TIER.EMERALD]: { order: 4, light: '#6ee7b7', dark: '#047857', shape: SESSION_TIER_SHAPE.GEM, labelKey: 'SessionTier.EMERALD', fallbackLabel: 'Lục Bảo' },
  [SESSION_TIER.DIAMOND]: { order: 5, light: '#a5f3fc', dark: '#2563eb', shape: SESSION_TIER_SHAPE.GEM, labelKey: 'SessionTier.DIAMOND', fallbackLabel: 'Kim Cương' },
  [SESSION_TIER.MASTER]: { order: 6, light: '#fda4af', dark: '#be123c', shape: SESSION_TIER_SHAPE.CROWNED, labelKey: 'SessionTier.MASTER', fallbackLabel: 'Cao Thủ' },
  [SESSION_TIER.GRANDMASTER]: { order: 7, light: '#fca5a5', dark: '#7f1d1d', shape: SESSION_TIER_SHAPE.CROWNED, labelKey: 'SessionTier.GRANDMASTER', fallbackLabel: 'Đại Cao Thủ' },
  [SESSION_TIER.CHALLENGER]: { order: 8, light: '#fde68a', dark: '#0284c7', shape: SESSION_TIER_SHAPE.CROWNED, labelKey: 'SessionTier.CHALLENGER', fallbackLabel: 'Thách Đấu' },
};

/** Promotions to this tier or higher are announced (Challenger has its own takeover banner). */
export const SESSION_TIER_UP_ANNOUNCE_MIN = SESSION_TIER.DIAMOND;
export const SESSION_TIER_UP_CONSTANTS = {
  COOLDOWN_MS: 6_000,
  BANNER_MS: 3_500,
} as const;

export const isSessionTierAtLeast = (tier: SessionTier | undefined, minimum: SessionTier): boolean =>
  tier !== undefined && SESSION_TIER_STYLE[tier].order >= SESSION_TIER_STYLE[minimum].order;

export const LEADERBOARD_BOARD_MODE = {
  SESSION: 'SESSION',
  MATCH: 'MATCH',
} as const;
export type LeaderboardBoardMode =
  (typeof LEADERBOARD_BOARD_MODE)[keyof typeof LEADERBOARD_BOARD_MODE];

export const LEADERBOARD_CYCLER_CONSTANTS = {
  CYCLE_INTERVAL_MS: 10_000,
  TICK_INTERVAL_MS: 500,
  FLIP_HALFWAY_MS: 200,
  FLIP_TOTAL_MS: 400,
  DISPLAY_SIZE: 3,
} as const;

