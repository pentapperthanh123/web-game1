import { TEAM_KEY } from '../constants/game';
import { useGameStore } from '../store/gameStore';

/** Mirrors server/src/constants/series.ts SERIES_EVENT. */
export const SERIES_PROGRESS_SOCKET_EVENT = {
  ROUND_RESULT: 'overlay:round-result',
} as const;

export interface RoundResultReport {
  blg: number;
  geng: number;
  /** The round that was just played (the next round starts with an explicit nextRound). */
  currentRound: number;
}

type RoundResultSender = (report: RoundResultReport) => void;

/**
 * The overlay decides who wins a round; the server keeps the series state that every overlay and the
 * admin portal sync from. Without this report the server stayed at 0-0 / round 1 and its next sync
 * pulled the overlay back to a wrong round. Returns the unsubscribe function.
 */
export const startSeriesProgressReporter = (send: RoundResultSender): (() => void) =>
  useGameStore.subscribe((state, prev) => {
    const isRoundJustWon = prev.roundWinner === null && state.roundWinner !== null;
    if (!isRoundJustWon) return;
    send({
      blg: state.bo5Score[TEAM_KEY.BLG] ?? 0,
      geng: state.bo5Score[TEAM_KEY.GENG] ?? 0,
      currentRound: state.currentRound,
    });
  });
