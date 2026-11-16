/** Socket events for the series-title counter ("3 🏆 3"); mirrors server/src/constants/championshipTally.ts. */
export const CHAMPIONSHIP_TALLY_SOCKET_EVENT = {
  /** Server → overlay: the admin portal asked to clear the titles of the matchup on screen. */
  RESET: 'game:reset-championship-tally',
  /** Overlay → server: titles of the matchup on screen, shown in the admin portal. */
  REPORT: 'overlay:championship-tally',
} as const;

export interface ChampionshipTallyReport {
  leftTeamId: string;
  rightTeamId: string;
  leftTitles: number;
  rightTitles: number;
}
