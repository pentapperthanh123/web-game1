/** Live-session damage board socket events; mirrors server/src/constants/sessionLeaderboard.ts. */
export const SESSION_LEADERBOARD_EVENT = {
  /** Admin → server → overlays: start a new session board (crowns cleared). */
  RESET: 'admin:reset-session-leaderboard',
} as const;

/** The reset button asks for a second click within this window before it fires. */
export const SESSION_LEADERBOARD_CONFIRM_WINDOW_MS = 4000;
