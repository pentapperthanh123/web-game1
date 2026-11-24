import { CLASH_ARENA_LAYOUT, CLASH_STAGE } from '../../../shared/constants/clashConfig';

const DEG_TO_RAD = Math.PI / 180;

/** Everything the arena needs to draw one frame of the push. Mutated in place (no per-frame allocs). */
export interface ClashLayout {
  /** Logical stage width this layout was computed for (the stage stretches with the window). */
  stageWidth: number;
  /** Clash orb center == territory border. */
  orbX: number;
  orbY: number;
  fighterY: number;
  leftFighterX: number;
  rightFighterX: number;
  /** Lean in degrees, positive = leaning toward the opponent. */
  leftLeanDeg: number;
  rightLeanDeg: number;
  /** Beam origins (the fighters' hands after lean). */
  leftHandX: number;
  leftHandY: number;
  rightHandX: number;
  rightHandY: number;
}

export function createClashLayout(): ClashLayout {
  return {
    stageWidth: CLASH_STAGE.WIDTH,
    orbX: CLASH_STAGE.WIDTH / 2,
    orbY: 0,
    fighterY: 0,
    leftFighterX: 0,
    rightFighterX: 0,
    leftLeanDeg: 0,
    rightLeanDeg: 0,
    leftHandX: 0,
    leftHandY: 0,
    rightHandX: 0,
    rightHandY: 0,
  };
}

const STAGE_MID_Y = (CLASH_STAGE.CENTER_STAGE_TOP_Y + CLASH_STAGE.CENTER_STAGE_BOTTOM_Y) / 2;
/** Fighters' feet line (stage px); constant, so DOM overlays can be laid out statically. */
export const ARENA_FIGHTER_Y = STAGE_MID_Y + CLASH_ARENA_LAYOUT.FIGHTER_FEET_OFFSET_Y;
const LEFT_WALL_X = CLASH_ARENA_LAYOUT.FIGHTER_WALL_MARGIN_X;
/** Orb range: at 0% / 100% it presses right against the pinned fighter's hands. */
const ORB_MIN_X = LEFT_WALL_X + CLASH_ARENA_LAYOUT.FIGHTER_PINNED_GAP_X;

function getRightWallX(stageWidth: number): number {
  return stageWidth - CLASH_ARENA_LAYOUT.FIGHTER_WALL_MARGIN_X;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Map a clash position (0 = RIGHT wins … 100 = LEFT wins) to the orb / border X. */
export function clashPositionToOrbX(clashPosition: number, stageWidth: number): number {
  const t = clamp(clashPosition, 0, 100) / 100;
  const orbMaxX = getRightWallX(stageWidth) - CLASH_ARENA_LAYOUT.FIGHTER_PINNED_GAP_X;
  return ORB_MIN_X + t * (orbMaxX - ORB_MIN_X);
}

/**
 * Tug-of-war layout:
 * - the orb (and the territory border) slides linearly with the clash position;
 * - the winning fighter keeps a fixed stand-off behind the orb, i.e. walks forward;
 * - the losing fighter is shoved back the same distance until its back hits the wall,
 *   after which the orb closes in on its hands (pinned → knockout at 0 / 100).
 * Impulses (0..1) add a short lunge / recoil / orb kick right after a push.
 */
export function computeClashLayout(
  clashPosition: number,
  leftImpulse: number,
  rightImpulse: number,
  stageWidth: number,
  out: ClashLayout
): ClashLayout {
  const L = CLASH_ARENA_LAYOUT;
  const rightWallX = getRightWallX(stageWidth);
  const baseOrbX = clashPositionToOrbX(clashPosition, stageWidth);

  // Orb is kicked toward the side that just got pushed.
  const orbX = baseOrbX + (leftImpulse - rightImpulse) * L.ORB_KICK_PX;

  const leftBaseX = Math.max(LEFT_WALL_X, baseOrbX - L.FIGHTER_STANDOFF_X);
  const rightBaseX = Math.min(rightWallX, baseOrbX + L.FIGHTER_STANDOFF_X);

  const leftX = clamp(
    leftBaseX + leftImpulse * L.PUSH_LUNGE_PX - rightImpulse * L.PUSH_RECOIL_PX,
    LEFT_WALL_X - L.PUSH_RECOIL_PX,
    orbX - L.FIGHTER_PINNED_GAP_X
  );
  const rightX = clamp(
    rightBaseX - rightImpulse * L.PUSH_LUNGE_PX + leftImpulse * L.PUSH_RECOIL_PX,
    orbX + L.FIGHTER_PINNED_GAP_X,
    rightWallX + L.PUSH_RECOIL_PX
  );

  // -1 (RIGHT dominating) … +1 (LEFT dominating), continuous so the lean never snaps.
  const balance = (clamp(clashPosition, 0, 100) - 50) / 50;
  const leftLean = balance * L.MAX_LEAN_DEG + leftImpulse * L.PUSH_LEAN_DEG;
  const rightLean = -balance * L.MAX_LEAN_DEG + rightImpulse * L.PUSH_LEAN_DEG;

  out.stageWidth = stageWidth;
  out.orbX = orbX;
  out.orbY = ARENA_FIGHTER_Y + L.HAND_LOCAL_Y;
  out.fighterY = ARENA_FIGHTER_Y;
  out.leftFighterX = leftX;
  out.rightFighterX = rightX;
  out.leftLeanDeg = leftLean;
  out.rightLeanDeg = rightLean;

  // Hand = local (HAND_LOCAL_X, HAND_LOCAL_Y) rotated by the lean around the feet; right side mirrored.
  const leftRad = leftLean * DEG_TO_RAD;
  const rightRad = rightLean * DEG_TO_RAD;
  const leftCos = Math.cos(leftRad);
  const leftSin = Math.sin(leftRad);
  const rightCos = Math.cos(rightRad);
  const rightSin = Math.sin(rightRad);

  out.leftHandX = leftX + L.HAND_LOCAL_X * leftCos - L.HAND_LOCAL_Y * leftSin;
  out.leftHandY = ARENA_FIGHTER_Y + L.HAND_LOCAL_X * leftSin + L.HAND_LOCAL_Y * leftCos;
  out.rightHandX = rightX - (L.HAND_LOCAL_X * rightCos - L.HAND_LOCAL_Y * rightSin);
  out.rightHandY = ARENA_FIGHTER_Y + L.HAND_LOCAL_X * rightSin + L.HAND_LOCAL_Y * rightCos;

  return out;
}
