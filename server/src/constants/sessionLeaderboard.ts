/**
 * Live-session damage board: kept in each overlay's localStorage. The admin portal can start a new
 * session remotely (the overlay's own admin panel is hard to reach inside OBS).
 */
export const SESSION_LEADERBOARD_EVENT = {
  /** Admin portal → server (admin-only by prefix). */
  ADMIN_RESET: 'admin:reset-session-leaderboard',
  /** Server → overlays: empty the session board. */
  GAME_RESET: 'game:reset-session-leaderboard',
} as const;
