/** Series-title counter ("3 🏆 3") socket events; mirrors server/src/constants/championshipTally.ts. */
export const CHAMPIONSHIP_TALLY_EVENT = {
  /** Admin → server → overlays: clear the titles of the matchup on screen. */
  RESET: 'admin:reset-championship-tally',
  /** Server → admin: titles of the matchup on screen, as reported by the overlay. */
  REPORT: 'game:championship-tally',
} as const;

export interface ChampionshipTallyReport {
  leftTeamId: string;
  rightTeamId: string;
  leftTitles: number;
  rightTitles: number;
}

/** The reset button asks for a second click within this window before it fires. */
export const CHAMPIONSHIP_TALLY_CONFIRM_WINDOW_MS = 4000;

export const isChampionshipTallyReport = (value: unknown): value is ChampionshipTallyReport => {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.leftTeamId === 'string' &&
    typeof report.rightTeamId === 'string' &&
    typeof report.leftTitles === 'number' &&
    typeof report.rightTitles === 'number'
  );
};
