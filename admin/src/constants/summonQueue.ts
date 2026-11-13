/** Reinforcement entrance queue: how many champions step onto the (unlimited) arena per turn. */
export const SUMMON_QUEUE_UI = {
  DEFAULT_DEPLOY_PER_TURN: 1,
  DEFAULT_TURN_DELAY_MS: 1300,
  DEPLOY_PER_TURN_OPTIONS: [1, 3, 5, 8, 10, 15],
  TURN_DELAY_OPTIONS_MS: [800, 1300, 2000, 3000],
  MS_PER_SECOND: 1000,
  SECONDS_FRACTION_DIGITS: 1,
} as const;
