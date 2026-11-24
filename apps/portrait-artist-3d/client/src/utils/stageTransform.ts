import type { EaselCanvasAnchor } from '../config/stageLayout';
import { clampValue } from './hashString';

export const ARM_KINEMATICS = {
  MIN_ANGLE_DEG: -35,
  MAX_ANGLE_DEG: 75,
  MIN_SCALE_X: 0.82,
  MAX_SCALE_X: 1.48,
  REST_ANGLE_DEG: 10,
  REST_SCALE_X: 0.96,
  PALETTE_DIP_ANGLE_DEG: -18,
  PALETTE_DIP_SCALE_X: 0.92,
  LEAN_MAX_X_PX: 20,
  LEAN_MAX_Y_PX: 10,
  SMOOTH_LERP_SPEED: 12.5,
  MAX_BRUSH_PARTICLES: 50,
  MAX_TRAIL_POINTS: 8,
} as const;

export interface StagePoint {
  x: number;
  y: number;
}

export interface CanvasUV {
  u: number;
  v: number;
}

export interface ArmIKSolution {
  angleDeg: number;
  scaleX: number;
  tipStageX: number;
  tipStageY: number;
}

/**
 * Transforms normalized canvas coordinates (u, v) into internal ScaledStage 720x1280 pixel coordinates,
 * taking into account easel rotation (1.1 deg) and 2.5D skewX (-4.65 deg).
 */
export function canvasUVToStage(
  u: number,
  v: number,
  anchor: EaselCanvasAnchor
): StagePoint {
  const clampedU = clampValue(u, 0, 1);
  const clampedV = clampValue(v, 0, 1);

  const centerX = anchor.x + anchor.width / 2;
  const centerY = anchor.y + anchor.height / 2;

  const relX = (clampedU - 0.5) * anchor.width;
  const relY = (clampedV - 0.5) * anchor.height;

  const skewRad = (anchor.skewXDeg * Math.PI) / 180;
  const skewTan = Math.tan(skewRad);
  const rotRad = (anchor.rotateDeg * Math.PI) / 180;

  // Skew along X axis based on Y offset: x' = x + y * tan(skew)
  const skewedX = relX + relY * skewTan;
  const skewedY = relY;

  // 2D Rotation
  const rotCos = Math.cos(rotRad);
  const rotSin = Math.sin(rotRad);
  const transX = skewedX * rotCos - skewedY * rotSin;
  const transY = skewedX * rotSin + skewedY * rotCos;

  return {
    x: centerX + transX,
    y: centerY + transY,
  };
}

/**
 * Inversely transforms ScaledStage pixel coordinates back to normalized canvas (u, v),
 * reversing the easel's rotation and skew.
 */
export function stageToCanvasUV(
  stageX: number,
  stageY: number,
  anchor: EaselCanvasAnchor
): CanvasUV {
  const centerX = anchor.x + anchor.width / 2;
  const centerY = anchor.y + anchor.height / 2;

  const dx = stageX - centerX;
  const dy = stageY - centerY;

  const rotRad = (anchor.rotateDeg * Math.PI) / 180;
  const rotCos = Math.cos(-rotRad);
  const rotSin = Math.sin(-rotRad);

  // Invert 2D rotation
  const unrotX = dx * rotCos - dy * rotSin;
  const unrotY = dx * rotSin + dy * rotCos;

  // Invert skewX: x = x' - y * tan(skew)
  const skewRad = (anchor.skewXDeg * Math.PI) / 180;
  const skewTan = Math.tan(skewRad);
  const relY = unrotY;
  const relX = unrotX - relY * skewTan;

  const u = clampValue(0.5 + relX / anchor.width, 0, 1);
  const v = clampValue(0.5 + relY / anchor.height, 0, 1);

  return { u, v };
}

/**
 * Computes shoulder rotation angle and reach scaleX to place the paintbrush tip
 * directly over (targetStageX, targetStageY).
 *
 * @param targetX Desired paintbrush tip X on ScaledStage.
 * @param targetY Desired paintbrush tip Y on ScaledStage.
 * @param shoulderX Shoulder pivot position on ScaledStage.
 * @param shoulderY Shoulder pivot position on ScaledStage.
 * @param armReachLength Base unscaled arm reach in pixels (122.1px).
 * @param leanOffset Optional torso lean offset { x, y } to assist reaching far corners.
 */
export function solveArmIK(
  targetX: number,
  targetY: number,
  shoulderX: number,
  shoulderY: number,
  armReachLength: number,
  leanOffset: StagePoint = { x: 0, y: 0 }
): ArmIKSolution {
  const effectiveShoulderX = shoulderX + leanOffset.x;
  const effectiveShoulderY = shoulderY + leanOffset.y;

  // Vector from shoulder to target
  const deltaX = targetX - effectiveShoulderX;
  const deltaY = targetY - effectiveShoulderY;
  const distance = Math.hypot(deltaX, deltaY);

  // In our left-pointing arm sprite basis (180 deg = left = 0 deg rotation in CSS):
  // Angle rotated clockwise from negative X-axis:
  // -dx = shoulderX - targetX (horizontal reach towards left)
  // -dy = shoulderY - targetY (vertical lift towards top)
  const rad = Math.atan2(effectiveShoulderY - targetY, effectiveShoulderX - targetX);
  const rawAngleDeg = (rad * 180) / Math.PI;

  const angleDeg = clampValue(
    rawAngleDeg,
    ARM_KINEMATICS.MIN_ANGLE_DEG,
    ARM_KINEMATICS.MAX_ANGLE_DEG
  );

  const rawScaleX = distance / Math.max(1, armReachLength);
  const scaleX = clampValue(
    rawScaleX,
    ARM_KINEMATICS.MIN_SCALE_X,
    ARM_KINEMATICS.MAX_SCALE_X
  );

  // Resulting tip position in stage space
  const clampedRad = (angleDeg * Math.PI) / 180;
  const reach = armReachLength * scaleX;
  const tipStageX = effectiveShoulderX - reach * Math.cos(clampedRad);
  const tipStageY = effectiveShoulderY - reach * Math.sin(clampedRad);

  return {
    angleDeg,
    scaleX,
    tipStageX,
    tipStageY,
  };
}
