import { TEAM_KEY } from '../constants/game';
import { ChampionshipTallyReport } from '../constants/championshipTally';
import { getMatchupTitleCount } from '../store/championshipTally';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../types/game';

type ReportSender = (report: ChampionshipTallyReport) => void;

const buildReport = (state: GameState): ChampionshipTallyReport => {
  const leftTeam = state.activeTeams[TEAM_KEY.BLG];
  const rightTeam = state.activeTeams[TEAM_KEY.GENG];
  const { leftTitles, rightTitles } = getMatchupTitleCount(state.championshipTally, leftTeam, rightTeam);
  return { leftTeamId: leftTeam.id, rightTeamId: rightTeam.id, leftTitles, rightTitles };
};

const toReportKey = (report: ChampionshipTallyReport): string =>
  `${report.leftTeamId}:${report.leftTitles}|${report.rightTeamId}:${report.rightTitles}`;

/**
 * Tells the server (and through it the admin portal) the series titles of the matchup on screen:
 * once now, then whenever the titles or the matchup change. Returns the unsubscribe function.
 */
export const startChampionshipTallyReporter = (send: ReportSender): (() => void) => {
  let lastReportKey = '';
  const reportIfChanged = (state: GameState): void => {
    const report = buildReport(state);
    const reportKey = toReportKey(report);
    if (reportKey === lastReportKey) return;
    lastReportKey = reportKey;
    send(report);
  };
  reportIfChanged(useGameStore.getState());
  return useGameStore.subscribe((state, prev) => {
    if (state.championshipTally === prev.championshipTally && state.activeTeams === prev.activeTeams) return;
    reportIfChanged(state);
  });
};
