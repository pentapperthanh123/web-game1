import { create } from 'zustand';
import { ROUND_INTRO_CONSTANTS } from '../constants/game';

interface RoundIntroState {
  shownAt: number;
  isActive: boolean;
  isManualHold: boolean;
  /** How long the narrated card runs once started (full card for the opening round, compact later). */
  durationMs: number;
}

/** The opening round explains everything; later rounds only show the matchup so the fight returns fast. */
export const resolveRoundIntroDurationMs = (round: number): number =>
  round <= ROUND_INTRO_CONSTANTS.FULL_INTRO_LAST_ROUND
    ? ROUND_INTRO_CONSTANTS.TOTAL_MS
    : ROUND_INTRO_CONSTANTS.COMPACT_TOTAL_MS;

export const isCompactRoundIntro = (durationMs: number): boolean =>
  durationMs < ROUND_INTRO_CONSTANTS.TOTAL_MS;

/** Kept outside the game store so the intro timer never re-renders the HUD.
 * Starts in manual hold (waiting to start) so no combat, summons or boss actions occur before user starts round 1.
 */
export const useRoundIntroStore = create<RoundIntroState>(() => ({
  shownAt: Date.now(),
  isActive: true,
  isManualHold: true,
  durationMs: ROUND_INTRO_CONSTANTS.TOTAL_MS,
}));

/**
 * Shows the intro card. The round it announces is the game store's `currentRound` (single source:
 * a separate copy here drifted from it and the card said "round 1" while the caster said "round 5"),
 * so update currentRound first, then call this.
 */
export const showRoundIntro = (
  now = Date.now(),
  isManualHold = false,
  durationMs: number = ROUND_INTRO_CONSTANTS.TOTAL_MS
): void => {
  useRoundIntroStore.setState({ shownAt: now, isActive: true, isManualHold, durationMs });
};

/** Initiates automated voice intro & countdown after operator explicitly clicks start. */
export const startIntroNarration = (now = Date.now(), durationMs: number = ROUND_INTRO_CONSTANTS.TOTAL_MS): void => {
  useRoundIntroStore.setState({ isManualHold: false, shownAt: now, durationMs });
};

export const hideRoundIntro = (): void => {
  useRoundIntroStore.setState({ shownAt: 0, isActive: false, isManualHold: false });
};

export const isRoundIntroActive = (
  shownAt: number,
  now: number,
  isManualHold = false,
  durationMs: number = useRoundIntroStore.getState().durationMs
): boolean => {
  if (shownAt <= 0) return false;
  if (isManualHold) return true;
  return now - shownAt < durationMs;
};

export const isCurrentRoundIntroActive = (now = Date.now()): boolean => {
  const state = useRoundIntroStore.getState();
  if (!state.isActive || state.shownAt <= 0) return false;
  return isRoundIntroActive(state.shownAt, now, state.isManualHold, state.durationMs);
};
