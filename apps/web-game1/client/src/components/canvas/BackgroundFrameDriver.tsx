import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { BACKGROUND_PERF_CONSTANTS } from '../../constants/game';
import { createAdaptiveFrameLoop } from '../../services/workerScheduler';

const MS_TO_SECONDS = 1 / 1000;

/**
 * Drives the Three.js / R3F scene (`frameloop="never"`) at a locked 30 FPS cadence
 * across both foreground (rAF-throttled) and hidden/occluded (Web Worker) states.
 * Note: R3F `advance(timestamp)` expects elapsed time in seconds under `frameloop="never"`.
 */
export const BackgroundFrameDriver = React.memo(() => {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    let lastStepPerf: number | null = null;
    let simElapsedSeconds = clock.elapsedTime;

    const loop = createAdaptiveFrameLoop((_nowMs, perfNow) => {
      if (gl.getContext().isContextLost()) {
        lastStepPerf = perfNow;
        return true;
      }

      const rawDeltaSec =
        lastStepPerf === null ? 0 : Math.max(0, (perfNow - lastStepPerf) * MS_TO_SECONDS);
      lastStepPerf = perfNow;
      simElapsedSeconds += Math.min(rawDeltaSec, BACKGROUND_PERF_CONSTANTS.MAX_FRAME_DELTA_S);
      advance(simElapsedSeconds);
      return true;
    });

    loop.start();
    return () => loop.stop();
  }, [advance, clock, gl]);

  return null;
});

BackgroundFrameDriver.displayName = 'BackgroundFrameDriver';
