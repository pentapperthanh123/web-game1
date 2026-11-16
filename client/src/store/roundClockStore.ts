import { create } from 'zustand';
import { ROUND_CLOCK_CONSTANTS, ROUND_CLOCK_PHASE, RoundClockPhase } from '../constants/game';
import { ParticipationRuleConfig } from '../types/game';

interface RoundClockState {
  /** Round the elapsed time belongs to; a different round starts from zero. */
  round: number;
  /** Live fight time of this round (intro, duel and pauses are not counted). */
  elapsedMs: number;
  /** Regular time of this round, captured when the clock last ticked (0 = no limit). */
  durationMs: number;
  phase: RoundClockPhase;
}

const INITIAL_ROUND = 1;
const NO_MULTIPLIER = 1;

/** Kept outside the game store so the 250 ms clock never re-renders the HUD. */
export const useRoundClockStore = create<RoundClockState>(() => ({
  round: INITIAL_ROUND,
  elapsedMs: 0,
  durationMs: ROUND_CLOCK_CONSTANTS.DEFAULT_ROUND_DURATION_MS,
  phase: ROUND_CLOCK_PHASE.REGULAR,
}));

/** Admin-configured regular time, clamped; 0 means the round has no time limit. */
export const resolveRoundDurationMs = (config: Partial<ParticipationRuleConfig> | undefined): number => {
  const durationMs = config?.roundDurationMs;
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return ROUND_CLOCK_CONSTANTS.DEFAULT_ROUND_DURATION_MS;
  }
  if (durationMs <= ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS) return ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS;
  return Math.min(ROUND_CLOCK_CONSTANTS.MAX_ROUND_DURATION_MS, durationMs);
};

export const resolveRoundClockPhase = (elapsedMs: number, durationMs: number): RoundClockPhase => {
  if (durationMs <= ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS || elapsedMs < durationMs) return ROUND_CLOCK_PHASE.REGULAR;
  if (elapsedMs < durationMs + ROUND_CLOCK_CONSTANTS.OVERTIME_DURATION_MS) return ROUND_CLOCK_PHASE.OVERTIME;
  return ROUND_CLOCK_PHASE.TIME_UP;
};

/** Time left in the current phase (regular time or overtime). */
export const getPhaseRemainingMs = (clock: Pick<RoundClockState, 'elapsedMs' | 'durationMs' | 'phase'>): number => {
  if (clock.phase === ROUND_CLOCK_PHASE.REGULAR) return Math.max(0, clock.durationMs - clock.elapsedMs);
  const overtimeEndMs = clock.durationMs + ROUND_CLOCK_CONSTANTS.OVERTIME_DURATION_MS;
  return Math.max(0, overtimeEndMs - clock.elapsedMs);
};

export const isRoundOvertimeActive = (): boolean =>
  useRoundClockStore.getState().phase === ROUND_CLOCK_PHASE.OVERTIME;

/** Boss damage multiplier: 1 in regular time, then +10 % every 5 s of overtime. */
export const getOvertimeDamageMultiplier = (): number => {
  const clock = useRoundClockStore.getState();
  if (clock.phase !== ROUND_CLOCK_PHASE.OVERTIME) return NO_MULTIPLIER;
  const overtimeElapsedMs = Math.max(0, clock.elapsedMs - clock.durationMs);
  const steps = Math.floor(overtimeElapsedMs / ROUND_CLOCK_CONSTANTS.OVERTIME_STEP_MS);
  return NO_MULTIPLIER + steps * ROUND_CLOCK_CONSTANTS.OVERTIME_DAMAGE_STEP_BONUS;
};

export const resetRoundClock = (round: number): void => {
  useRoundClockStore.setState({ round, elapsedMs: 0, phase: ROUND_CLOCK_PHASE.REGULAR });
};

/** OBS reload: the restored round keeps the time it had already been fought. */
export const restoreRoundClock = (round: number, elapsedMs: number): void => {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  useRoundClockStore.setState({ round, elapsedMs: safeElapsedMs, phase: ROUND_CLOCK_PHASE.REGULAR });
};
