import { create } from 'zustand';
import { ROUND_INTRO_CONSTANTS } from '../constants/game';
import {
  pickNextIntroBackground,
  preloadAllIntroBackgrounds,
} from '../constants/introBackgrounds';

export const ROUND_HOLD_REASON = {
  STREAM_OPENING: 'STREAM_OPENING',
  NEW_SERIES: 'NEW_SERIES',
  ADMIN_RESET: 'ADMIN_RESET',
} as const;
export type RoundHoldReason = (typeof ROUND_HOLD_REASON)[keyof typeof ROUND_HOLD_REASON];

interface RoundIntroState {
  shownAt: number;
  isActive: boolean;
  isManualHold: boolean;
  holdReason: RoundHoldReason | null;
  /** Wall-clock timestamp (ms) when this held intro automatically starts, or 0 for no countdown. */
  autoStartAt: number;
  /** How long the narrated card runs once started (full card for the opening round, compact later). */
  durationMs: number;
  /** The esports cinematic that plays between "start" and the narrated card. */
  isCinematicPlaying: boolean;
  /** Dynamically rotated background image for the current round intro clash. */
  backgroundImageUrl: string;
}

/** The opening round explains everything; later rounds only show the matchup so the fight returns fast. */
export const resolveRoundIntroDurationMs = (round: number): number =>
  round <= ROUND_INTRO_CONSTANTS.FULL_INTRO_LAST_ROUND
    ? ROUND_INTRO_CONSTANTS.TOTAL_MS
    : ROUND_INTRO_CONSTANTS.COMPACT_TOTAL_MS;

export const isCompactRoundIntro = (durationMs: number): boolean =>
  durationMs < ROUND_INTRO_CONSTANTS.TOTAL_MS;

/** Kept outside the game store so the intro timer never re-renders the HUD.
 * Starts in manual hold with an automatic countdown fallback so the game automatically
 * starts fighting and summoning even if left unattended on a second screen or in OBS.
 */
export const useRoundIntroStore = create<RoundIntroState>(() => {
  const now = Date.now();
  preloadAllIntroBackgrounds();
  return {
    shownAt: now,
    isActive: true,
    isManualHold: true,
    holdReason: ROUND_HOLD_REASON.STREAM_OPENING,
    autoStartAt: now + ROUND_INTRO_CONSTANTS.INITIAL_AUTO_START_MS,
    durationMs: ROUND_INTRO_CONSTANTS.TOTAL_MS,
    isCinematicPlaying: false,
    backgroundImageUrl: pickNextIntroBackground(),
  };
});

/**
 * Shows the intro card. The round it announces is the game store's `currentRound` (single source:
 * a separate copy here drifted from it and the card said "round 1" while the caster said "round 5"),
 * so update currentRound first, then call this.
 */
export const showRoundIntro = (
  now = Date.now(),
  isManualHold = false,
  durationMs: number = ROUND_INTRO_CONSTANTS.TOTAL_MS,
  holdReason: RoundHoldReason | null = null,
  autoStartDelayMs = 0
): void => {
  const isAutoStartReason =
    holdReason === ROUND_HOLD_REASON.NEW_SERIES || holdReason === ROUND_HOLD_REASON.STREAM_OPENING;
  const autoStartAt =
    isManualHold && isAutoStartReason && autoStartDelayMs > 0
      ? now + autoStartDelayMs
      : 0;

  useRoundIntroStore.setState({
    shownAt: now,
    isActive: true,
    isManualHold,
    holdReason,
    autoStartAt,
    durationMs,
    isCinematicPlaying: false,
    backgroundImageUrl: pickNextIntroBackground(),
  });
};

/** Cancels the auto-start timer on a held card ("Giữ lại"), leaving it waiting for the host to press start. */
export const cancelAutoStart = (): void => {
  useRoundIntroStore.setState({ autoStartAt: 0 });
};

/**
 * Opens a round with the "VÁN X • KHAI CHIẾN!" cinematic straight away; the narrated card follows by
 * itself when it ends. For rounds that start without an operator press (the decider after Silver
 * Scrapes, the overlay opened mid-series); a held card plays it on "Bắt đầu" instead.
 */
export const playRoundIntroCinematic = (
  now = Date.now(),
  durationMs: number = ROUND_INTRO_CONSTANTS.TOTAL_MS
): void => {
  // Held while the cinematic plays, so nothing starts before the narrated card
  useRoundIntroStore.setState({
    shownAt: now,
    isActive: true,
    isManualHold: true,
    holdReason: null,
    autoStartAt: 0,
    durationMs,
    isCinematicPlaying: true,
    backgroundImageUrl: pickNextIntroBackground(),
  });
};

/** Plays the cinematic; when it ends the overlay calls `startIntroNarration`. */
export const playIntroCinematic = (): void => {
  const currentBg = useRoundIntroStore.getState().backgroundImageUrl;
  useRoundIntroStore.setState({
    isCinematicPlaying: true,
    autoStartAt: 0,
    backgroundImageUrl: currentBg || pickNextIntroBackground(),
  });
};

export const endIntroCinematic = (): void => {
  useRoundIntroStore.setState({ isCinematicPlaying: false });
};

/** Initiates automated voice intro & countdown after operator explicitly clicks start. */
export const startIntroNarration = (
  now = Date.now(),
  durationMs: number = ROUND_INTRO_CONSTANTS.TOTAL_MS
): void => {
  useRoundIntroStore.setState({ isManualHold: false, holdReason: null, autoStartAt: 0, shownAt: now, durationMs });
};

export const hideRoundIntro = (): void => {
  useRoundIntroStore.setState({
    shownAt: 0,
    isActive: false,
    isManualHold: false,
    holdReason: null,
    autoStartAt: 0,
    isCinematicPlaying: false,
  });
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
