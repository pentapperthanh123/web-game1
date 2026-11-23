import { useEffect, useState } from 'react';
import { SCREEN_RUMBLE_CONSTANTS } from '../constants/bossUltimateFeedback';
import { useGameStore } from '../store/gameStore';

const RUMBLE_PHASE = {
  IDLE: 'IDLE',
  FULL: 'FULL',
  TAIL: 'TAIL',
} as const;
type RumblePhase = (typeof RUMBLE_PHASE)[keyof typeof RUMBLE_PHASE];

const PHASE_SCALE: Readonly<Record<RumblePhase, number>> = {
  [RUMBLE_PHASE.IDLE]: 0,
  [RUMBLE_PHASE.FULL]: 1,
  [RUMBLE_PHASE.TAIL]: SCREEN_RUMBLE_CONSTANTS.DOM_TAIL_SCALE,
};

/**
 * Jitter (px) for the DOM layer while a sustained rumble runs, 0 when idle. The 2D boss, arena art
 * and HUD are DOM, so the camera shake alone would leave them perfectly still during a quake.
 * Only two re-renders per rumble (full → tail → idle); the jitter itself is a CSS animation.
 */
export const useScreenRumbleAmplitudePx = (): number => {
  const startedAt = useGameStore((state) => state.screenRumbleStartedAt);
  const durationMs = useGameStore((state) => state.screenRumbleDurationMs);
  const intensity = useGameStore((state) => state.screenRumbleIntensity);
  const [phase, setPhase] = useState<RumblePhase>(RUMBLE_PHASE.IDLE);

  useEffect(() => {
    const remainingMs = startedAt + durationMs - Date.now();
    if (remainingMs <= 0) {
      setPhase(RUMBLE_PHASE.IDLE);
      return;
    }
    const tailMs = durationMs * SCREEN_RUMBLE_CONSTANTS.RELEASE_RATIO;
    setPhase(remainingMs > tailMs ? RUMBLE_PHASE.FULL : RUMBLE_PHASE.TAIL);
    const tailTimer = setTimeout(() => setPhase(RUMBLE_PHASE.TAIL), Math.max(0, remainingMs - tailMs));
    const idleTimer = setTimeout(() => setPhase(RUMBLE_PHASE.IDLE), remainingMs);
    return () => {
      clearTimeout(tailTimer);
      clearTimeout(idleTimer);
    };
  }, [startedAt, durationMs]);

  return Math.round(intensity * SCREEN_RUMBLE_CONSTANTS.DOM_PX_PER_INTENSITY * PHASE_SCALE[phase]);
};
