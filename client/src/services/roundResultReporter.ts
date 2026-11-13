import { useGameStore } from '../store/gameStore';
import { getTopRoundDamage } from '../store/roundDamageTracker';
import { GameState } from '../types/game';
import { gameSocket, RoundResultPayload, RoundResultPlayer } from './socket';

/** Contract: top 50 players by damage. */
const ROUND_RESULT_MAX_PLAYERS = 50;

/** Emits `game:round-result` whenever `roundWinner` goes from null to a team (full per-round damage). */
let seriesId = Date.now();
let isReporterStarted = false;

function buildPlayers(): RoundResultPlayer[] {
  return getTopRoundDamage(ROUND_RESULT_MAX_PLAYERS).map((entry) => ({
    userName: entry.userName,
    team: entry.team,
    damage: entry.damage,
  }));
}

function buildRoundResult(state: GameState): RoundResultPayload | null {
  if (!state.roundWinner) return null;
  return {
    roundId: `${seriesId}-${state.currentRound}`,
    winnerTeam: state.roundWinner,
    seriesFormat: state.seriesFormat,
    isSeriesEnd: state.isSeriesEnded,
    players: buildPlayers(),
  };
}

function handleStateChange(state: GameState, prevState: GameState): void {
  const isSeriesRestarted = state.currentRound < prevState.currentRound;
  if (isSeriesRestarted) seriesId = Date.now();

  const hasRoundJustEnded = prevState.roundWinner === null && state.roundWinner !== null;
  if (!hasRoundJustEnded) return;

  const payload = buildRoundResult(state);
  if (!payload) return;
  try {
    gameSocket.sendRoundResult(payload);
  } catch (error) {
    console.error('[RoundResultReporter] Failed to send round result', error);
  }
  if (payload.isSeriesEnd) seriesId = Date.now();
}

/** Starts the reporter once; returns an unsubscribe function. */
export function startRoundResultReporter(): () => void {
  if (isReporterStarted) return () => undefined;
  isReporterStarted = true;
  const unsubscribe = useGameStore.subscribe(handleStateChange);
  return () => {
    unsubscribe();
    isReporterStarted = false;
  };
}
