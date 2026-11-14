/** Reinforcement entrance queue: how many champions step onto the (unlimited) arena per turn. */
/** Tokens show the champion art; viewers' TikTok profile photos only when an admin turns this on. */
export const DEFAULT_USE_USER_AVATAR = false;

export const SUMMON_QUEUE_UI = {
  DEFAULT_DEPLOY_PER_TURN: 1,
  DEFAULT_TURN_DELAY_MS: 1300,
  DEPLOY_PER_TURN_OPTIONS: [1, 3, 5, 8, 10, 15],
  TURN_DELAY_OPTIONS_MS: [800, 1300, 2000, 3000],
  MS_PER_SECOND: 1000,
  SECONDS_FRACTION_DIGITS: 1,
} as const;
