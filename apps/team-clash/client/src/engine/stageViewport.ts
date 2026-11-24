import { CLASH_STAGE } from '../../../shared/constants/clashConfig';

/**
 * Logical stage size (stage px). The design is authored for 720×1280; instead of letterboxing,
 * the stage keeps one axis at its design size and stretches the other to fill the screen:
 * - wider than 9:16 → height stays 1280, width grows;
 * - taller than 9:16 → width stays 720, height grows.
 */
export interface StageSize {
  width: number;
  height: number;
  /** Screen px per stage px. */
  scale: number;
}

const DESIGN_ASPECT = CLASH_STAGE.WIDTH / CLASH_STAGE.HEIGHT;

export const DESIGN_STAGE_SIZE: StageSize = {
  width: CLASH_STAGE.WIDTH,
  height: CLASH_STAGE.HEIGHT,
  scale: 1,
};

export function computeStageSize(containerWidth: number, containerHeight: number): StageSize {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return DESIGN_STAGE_SIZE;
  }

  if (containerWidth / containerHeight >= DESIGN_ASPECT) {
    const scale = containerHeight / CLASH_STAGE.HEIGHT;
    return { width: containerWidth / scale, height: CLASH_STAGE.HEIGHT, scale };
  }

  const scale = containerWidth / CLASH_STAGE.WIDTH;
  return { width: CLASH_STAGE.WIDTH, height: containerHeight / scale, scale };
}
