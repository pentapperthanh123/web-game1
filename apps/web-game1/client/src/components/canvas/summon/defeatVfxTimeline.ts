import * as THREE from 'three';

/**
 * Champion death timeline (progress 0..1 over DEFEAT_DURATION_MS):
 *  - Impact: white flash + portrait shake/punch.
 *  - Execution: two slashes draw across the portrait one after another.
 *  - Shatter: shards burst outward, fall with gravity and spin.
 *  - Soul: the darkened portrait drifts upward and fades while a thin wisp rises.
 */
export const DEFEAT_VFX = {
  SHARD_COUNT: 8,
  SHARD_MIN_SPEED: 0.55,
  SHARD_MAX_SPEED: 0.95,
  SHARD_GRAVITY: 1.1,
  SHARD_SPIN: 9,
  SHARD_PEAK_OPACITY: 0.9,
  FLASH_END: 0.18,
  FLASH_START_SCALE: 0.8,
  FLASH_END_SCALE: 1.9,
  FLASH_PEAK_OPACITY: 0.75,
  SHAKE_END: 0.22,
  SHAKE_AMPLITUDE: 0.025,
  SHAKE_FREQUENCY: 90,
  PUNCH_SCALE: 0.14,
  SLASH_DRAW_DURATION: 0.1,
  SLASH_SECOND_DELAY: 0.07,
  SLASH_FADE_END: 0.6,
  SLASH_PEAK_OPACITY: 0.95,
  RING_START_SCALE: 0.5,
  RING_END_SCALE: 2.4,
  RING_PEAK_OPACITY: 0.7,
  RING_SPIN: 2.2,
  PORTRAIT_RISE: 0.42,
  PORTRAIT_TILT: 0.35,
  PORTRAIT_PEAK_OPACITY: 0.9,
  PORTRAIT_FADE_START: 0.35,
  PORTRAIT_FLASH_COLOR: new THREE.Color('#ffffff'),
  PORTRAIT_HIT_COLOR: new THREE.Color('#ef4444'),
  PORTRAIT_DEAD_COLOR: new THREE.Color('#3f3f46'),
  WISP_START: 0.25,
  WISP_RISE: 0.6,
  WISP_PEAK_OPACITY: 0.55,
  GROW_SCALE: 0.1,
} as const;

export interface ShardTrajectory {
  velocityX: number;
  velocityY: number;
  spinSign: number;
}

const SHARD_UPWARD_BIAS = 0.35;

/** Evenly spread burst directions with slight jitter so every death looks a bit different. */
export const createShardTrajectories = (): ShardTrajectory[] =>
  Array.from({ length: DEFEAT_VFX.SHARD_COUNT }, (_, index) => {
    const angle = (index / DEFEAT_VFX.SHARD_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const speed = THREE.MathUtils.lerp(DEFEAT_VFX.SHARD_MIN_SPEED, DEFEAT_VFX.SHARD_MAX_SPEED, Math.random());
    return {
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed + SHARD_UPWARD_BIAS,
      spinSign: index % 2 === 0 ? 1 : -1,
    };
  });

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const setOpacity = (mesh: THREE.Mesh | null, opacity: number): void => {
  if (!mesh || !(mesh.material instanceof THREE.MeshBasicMaterial)) return;
  mesh.material.opacity = Math.max(0, opacity);
  mesh.visible = opacity > 0;
};

/** Portrait colour: white impact flash → blood red → ashen grey. */
export const resolvePortraitColor = (progress: number, target: THREE.Color): void => {
  if (progress < DEFEAT_VFX.FLASH_END) {
    target.copy(DEFEAT_VFX.PORTRAIT_FLASH_COLOR).lerp(DEFEAT_VFX.PORTRAIT_HIT_COLOR, progress / DEFEAT_VFX.FLASH_END);
    return;
  }
  const ashProgress = clamp01((progress - DEFEAT_VFX.FLASH_END) / (1 - DEFEAT_VFX.FLASH_END));
  target.copy(DEFEAT_VFX.PORTRAIT_HIT_COLOR).lerp(DEFEAT_VFX.PORTRAIT_DEAD_COLOR, ashProgress);
};

/** Opacity of a slash that starts drawing at `startProgress`. Returns draw length (0..1) and opacity. */
export const resolveSlashState = (progress: number, startProgress: number): { length: number; opacity: number } => {
  const drawProgress = clamp01((progress - startProgress) / DEFEAT_VFX.SLASH_DRAW_DURATION);
  const fadeProgress = clamp01((progress - startProgress) / (DEFEAT_VFX.SLASH_FADE_END - startProgress));
  if (drawProgress <= 0) return { length: 0, opacity: 0 };
  return {
    length: easeOutCubic(drawProgress),
    opacity: (1 - fadeProgress) * DEFEAT_VFX.SLASH_PEAK_OPACITY,
  };
};
