/**
 * Series titles per matchup ("3 🏆 3") live in each overlay's localStorage. The admin portal can
 * reset them remotely (works inside OBS, where the overlay's own admin panel is hard to reach), and
 * the overlay reports the current counts back so the portal shows them.
 */
export const CHAMPIONSHIP_TALLY_EVENT = {
  /** Admin portal → server (admin-only by prefix). */
  ADMIN_RESET: 'admin:reset-championship-tally',
  /** Server → overlays: clear the titles of the matchup currently on screen. */
  GAME_RESET: 'game:reset-championship-tally',
  /** Overlay → server: titles of the matchup currently on screen. */
  OVERLAY_REPORT: 'overlay:championship-tally',
  /** Server → admin portals (and to each new connection). */
  GAME_REPORT: 'game:championship-tally',
} as const;

export const CHAMPIONSHIP_TALLY_LIMITS = {
  MAX_TITLES: 9999,
  MAX_TEAM_ID_LENGTH: 64,
} as const;

export interface ChampionshipTallyReport {
  leftTeamId: string;
  rightTeamId: string;
  leftTitles: number;
  rightTitles: number;
}
