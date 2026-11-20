import { CancelTimer, workerSetTimeout } from '../services/workerScheduler';
import { isCurrentRoundIntroActive, useRoundIntroStore } from './roundIntroStore';

/**
 * Holds engagement that arrives while the round intro card is on screen (gifts, shares,
 * follows, support damage) and replays it the moment the fight starts, so nothing is lost
 * and nothing hits the boss before the round begins. Summons simply wait in their queue.
 */
export const PRE_ROUND_BUFFER = {
  /** Gap between replayed gifts so their banners and meteors do not all land at once. */
  REPLAY_INTERVAL_MS: 700,
  /** Upper bound for spreading a large backlog. */
  MAX_REPLAY_SPREAD_MS: 8_000,
  /** Fallback flush after the intro would have ended (card hidden, timer not reached). */
  FALLBACK_MARGIN_MS: 250,
  MAX_BUFFERED_ACTIONS: 500,
} as const;

type RoundStartListener = () => void;

const bufferedActions: Array<() => void> = [];
const roundStartListeners = new Set<RoundStartListener>();
const pendingReplayTimers = new Set<CancelTimer>();
let cancelFallbackTimer: CancelTimer | null = null;

const clearPendingReplays = (): void => {
  pendingReplayTimers.forEach((cancel) => cancel());
  pendingReplayTimers.clear();
};

const replayBufferedActions = (): void => {
  clearPendingReplays();
  const actions = bufferedActions.splice(0);
  if (actions.length === 0) return;
  const interval = Math.min(PRE_ROUND_BUFFER.REPLAY_INTERVAL_MS, PRE_ROUND_BUFFER.MAX_REPLAY_SPREAD_MS / actions.length);
  actions.forEach((action, index) => {
    if (index === 0) {
      action();
      return;
    }
    const cancelTimer = workerSetTimeout(() => {
      pendingReplayTimers.delete(cancelTimer);
      action();
    }, Math.round(index * interval));
    pendingReplayTimers.add(cancelTimer);
  });
};

const startRound = (): void => {
  if (cancelFallbackTimer) {
    cancelFallbackTimer();
    cancelFallbackTimer = null;
  }
  roundStartListeners.forEach((listener) => listener());
  replayBufferedActions();
};

const armFallback = (shownAt: number): void => {
  if (cancelFallbackTimer) cancelFallbackTimer();
  const remainingMs = shownAt + useRoundIntroStore.getState().durationMs - Date.now();
  cancelFallbackTimer = workerSetTimeout(startRound, Math.max(0, remainingMs) + PRE_ROUND_BUFFER.FALLBACK_MARGIN_MS);
};

useRoundIntroStore.subscribe((intro, prevIntro) => {
  if (intro.isActive && intro.shownAt !== prevIntro.shownAt) armFallback(intro.shownAt);
  if (prevIntro.isActive && !intro.isActive) startRound();
});

/**
 * During the intro the action is kept for the round start and true is returned;
 * otherwise nothing happens and false is returned (the caller proceeds normally).
 */
export const deferUntilRoundStart = (action: () => void): boolean => {
  if (!isCurrentRoundIntroActive()) return false;
  if (bufferedActions.length < PRE_ROUND_BUFFER.MAX_BUFFERED_ACTIONS) bufferedActions.push(action);
  if (!cancelFallbackTimer) armFallback(useRoundIntroStore.getState().shownAt);
  return true;
};

/** Runs now during a live round; during the intro it runs when the fight starts. */
export const runWhenRoundLive = (action: () => void): void => {
  if (!deferUntilRoundStart(action)) action();
};

/** Called every time a round's fight begins (intro closed or timed out). */
export const onRoundStart = (listener: RoundStartListener): (() => void) => {
  roundStartListeners.add(listener);
  return () => roundStartListeners.delete(listener);
};
