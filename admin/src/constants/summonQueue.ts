/** Reinforcement entrance queue: how many champions step onto the (unlimited) arena per turn. */
/** Tokens show the champion art; viewers' TikTok profile photos only when an admin turns this on. */
export const DEFAULT_USE_USER_AVATAR = false;

export const SUMMON_QUEUE_UI = {
  DEFAULT_DEPLOY_PER_TURN: 1,
  DEFAULT_TURN_DELAY_MS: 1300,
  DEPLOY_PER_TURN_OPTIONS: [1, 3, 5, 8, 10, 15],
  TURN_DELAY_OPTIONS_MS: [800, 1300, 2000, 3000],
  /** Summoned champions attack this many times faster than the base interval (1 = base). */
  DEFAULT_ATTACK_SPEED_MULTIPLIER: 1.5,
  ATTACK_SPEED_OPTIONS: [1, 1.5, 2, 2.5, 3],
  /** Round time limit (mirrors client ROUND_CLOCK_CONSTANTS); 0 = no limit. */
  DEFAULT_ROUND_DURATION_MS: 240_000,
  NO_ROUND_LIMIT_MS: 0,
  ROUND_DURATION_OPTIONS_MS: [0, 180_000, 240_000, 300_000, 420_000],
  OVERTIME_SECONDS: 45,
  SECONDS_PER_MINUTE: 60,
  MS_PER_SECOND: 1000,
  SECONDS_FRACTION_DIGITS: 1,
} as const;
