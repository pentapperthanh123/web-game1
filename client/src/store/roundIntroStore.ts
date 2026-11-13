import { create } from 'zustand';
import { ROUND_INTRO_CONSTANTS } from '../constants/game';

interface RoundIntroState {
  shownAt: number;
  round: number;
}

/** Kept outside the game store so the intro timer never re-renders the HUD. */
export const useRoundIntroStore = create<RoundIntroState>(() => ({ shownAt: 0, round: 0 }));

export const showRoundIntro = (round: number, now = Date.now()): void => {
  useRoundIntroStore.setState({ shownAt: now, round });
};

export const hideRoundIntro = (): void => {
  useRoundIntroStore.setState({ shownAt: 0 });
};

export const isRoundIntroActive = (shownAt: number, now: number): boolean =>
  shownAt > 0 && now - shownAt < ROUND_INTRO_CONSTANTS.TOTAL_MS;
