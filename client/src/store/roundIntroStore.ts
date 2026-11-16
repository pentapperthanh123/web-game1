import { create } from 'zustand';
import { ROUND_INTRO_CONSTANTS } from '../constants/game';

interface RoundIntroState {
  shownAt: number;
  isActive: boolean;
  isManualHold: boolean;
}

/** Kept outside the game store so the intro timer never re-renders the HUD.
 * Starts in manual hold (waiting to start) so no combat, summons or boss actions occur before user starts round 1.
 */
export const useRoundIntroStore = create<RoundIntroState>(() => ({
  shownAt: Date.now(),
  isActive: true,
  isManualHold: true,
}));

/**
 * Shows the intro card. The round it announces is the game store's `currentRound` (single source:
 * a separate copy here drifted from it and the card said "round 1" while the caster said "round 5"),
 * so update currentRound first, then call this.
 */
export const showRoundIntro = (now = Date.now(), isManualHold = false): void => {
  useRoundIntroStore.setState({ shownAt: now, isActive: true, isManualHold });
};

/** Initiates automated voice intro & countdown after operator explicitly clicks start. */
export const startIntroNarration = (now = Date.now()): void => {
  useRoundIntroStore.setState({ isManualHold: false, shownAt: now });
};

export const hideRoundIntro = (): void => {
  useRoundIntroStore.setState({ shownAt: 0, isActive: false, isManualHold: false });
};

export const isRoundIntroActive = (shownAt: number, now: number, isManualHold = false): boolean => {
  if (shownAt <= 0) return false;
  if (isManualHold) return true;
  return now - shownAt < ROUND_INTRO_CONSTANTS.TOTAL_MS;
};

export const isCurrentRoundIntroActive = (now = Date.now()): boolean => {
  const state = useRoundIntroStore.getState();
  if (!state.isActive || state.shownAt <= 0) return false;
  return isRoundIntroActive(state.shownAt, now, state.isManualHold);
};
