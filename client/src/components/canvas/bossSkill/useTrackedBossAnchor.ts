import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Vec3Tuple, resolveBossAnchorWorld } from './bossSkill3DShared';

export const BOSS_ANCHOR_TRACKING = {
  /** Reading the marker forces a layout, so it is sampled on a timer instead of in the frame loop. */
  SAMPLE_INTERVAL_MS: 50,
  /** Exponential follow speed (per second) that turns the samples into smooth per-frame motion. */
  FOLLOW_RATE: 22,
} as const;

/** `target` is the latest sample, `current` the smoothed position effects should use each frame. */
export interface TrackedBossAnchor {
  target: THREE.Vector3;
  current: THREE.Vector3;
}

/**
 * Follows a Boss2D anchor marker (jaw, eye, core) while an effect plays: the 2D boss keeps
 * patrolling, bobbing and turning toward its target, so a cast-time snapshot drifts off the art.
 */
export const useTrackedBossAnchor = (elementId: string, initial: Vec3Tuple): TrackedBossAnchor => {
  const anchor = useMemo<TrackedBossAnchor>(
    () => ({ target: new THREE.Vector3(...initial), current: new THREE.Vector3(...initial) }),
    [initial],
  );

  useEffect(() => {
    const sampleAnchor = (): void => {
      const [x, y, z] = resolveBossAnchorWorld(elementId, initial);
      anchor.target.set(x, y, z);
    };
    sampleAnchor();
    const timer = window.setInterval(sampleAnchor, BOSS_ANCHOR_TRACKING.SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [anchor, elementId, initial]);

  return anchor;
};

/** Moves `current` toward the latest sample; allocation-free, call once per frame. */
export const followTrackedAnchor = (anchor: TrackedBossAnchor, deltaSeconds: number): void => {
  anchor.current.lerp(anchor.target, 1 - Math.exp(-BOSS_ANCHOR_TRACKING.FOLLOW_RATE * deltaSeconds));
};
