import { SCREEN_RUMBLE_CONSTANTS } from '../constants/bossUltimateFeedback';
import { GameState } from '../types/game';

export type ScreenRumbleState = Pick<
  GameState,
  'screenRumbleStartedAt' | 'screenRumbleDurationMs' | 'screenRumbleIntensity'
>;

/** 0..1 strength of a rumble at `now`: swells in, holds, then dies out (0 once it is over). */
export const resolveScreenRumbleEnvelope = (now: number, startedAt: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  const progress = (now - startedAt) / durationMs;
  if (progress < 0 || progress >= 1) return 0;
  if (progress < SCREEN_RUMBLE_CONSTANTS.ATTACK_RATIO) return progress / SCREEN_RUMBLE_CONSTANTS.ATTACK_RATIO;
  const releaseStart = 1 - SCREEN_RUMBLE_CONSTANTS.RELEASE_RATIO;
  if (progress <= releaseStart) return 1;
  return (1 - progress) / SCREEN_RUMBLE_CONSTANTS.RELEASE_RATIO;
};

/**
 * A new rumble replaces the running one unless that one is both stronger and still going after the
 * new one would have ended (a small quake must not shorten or weaken a bigger one).
 */
export const pickScreenRumble = (
  current: ScreenRumbleState,
  intensity: number,
  durationMs: number,
  now: number
): ScreenRumbleState => {
  const currentEndsAt = current.screenRumbleStartedAt + current.screenRumbleDurationMs;
  const isCurrentDominant = current.screenRumbleIntensity >= intensity && currentEndsAt >= now + durationMs;
  if (isCurrentDominant) return current;
  return { screenRumbleStartedAt: now, screenRumbleDurationMs: durationMs, screenRumbleIntensity: intensity };
};
