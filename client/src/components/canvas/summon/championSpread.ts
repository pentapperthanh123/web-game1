import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';
import { getLiveChampionScreenEntries } from '../../../services/minionPositionRegistry';
import { getActiveSceneCamera, pickTargetInWing, randomInRange } from './summonShared';

/**
 * Each wing is a rectangle in normalised screen space, so champions spread
 * evenly on screen whatever the viewport aspect is. Values stay inside the
 * VIEWPORT_SAFE_NDC clamp so no target gets pushed to the edge afterwards.
 */
export const WING_SCREEN_LAYOUT = {
  NDC_X_INNER: 0.26,
  NDC_X_OUTER: 0.82,
  NDC_Y_MIN: -0.72,
  NDC_Y_MAX: 0.42,
  /** Random candidates per pick; the least crowded one wins (best-candidate sampling). */
  CANDIDATE_COUNT: 7,
  /** Pixel distance at which another champion no longer counts as crowding. */
  CROWD_RADIUS_PX: 140,
} as const;

const tempRayPoint = new THREE.Vector3();
const tempRayDir = new THREE.Vector3();

/** World point where the camera ray through (ndcX, ndcY) crosses the plane z = planeZ. */
const unprojectNdcToPlane = (
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  planeZ: number
): [number, number, number] | null => {
  tempRayPoint.set(ndcX, ndcY, 0.5).unproject(camera);
  tempRayDir.copy(tempRayPoint).sub(camera.position).normalize();
  if (Math.abs(tempRayDir.z) < 1e-4) return null;
  const travel = (planeZ - camera.position.z) / tempRayDir.z;
  if (travel <= 0) return null;
  return [
    camera.position.x + tempRayDir.x * travel,
    camera.position.y + tempRayDir.y * travel,
    planeZ,
  ];
};

interface ScreenCandidate {
  ndcX: number;
  ndcY: number;
  px: number;
  py: number;
}

const sampleWingCandidate = (team: TeamType, viewportW: number, viewportH: number): ScreenCandidate => {
  const sideSign = team === TEAM_KEY.GENG ? 1 : -1;
  const ndcX = sideSign * randomInRange(WING_SCREEN_LAYOUT.NDC_X_INNER, WING_SCREEN_LAYOUT.NDC_X_OUTER);
  const ndcY = randomInRange(WING_SCREEN_LAYOUT.NDC_Y_MIN, WING_SCREEN_LAYOUT.NDC_Y_MAX);
  return {
    ndcX,
    ndcY,
    px: ((ndcX + 1) / 2) * viewportW,
    py: ((-ndcY + 1) / 2) * viewportH,
  };
};

/** Distance to the nearest champion already on screen (capped so far ones are all "free"). */
const measureClearance = (candidate: ScreenCandidate, excludeId?: string): number => {
  let nearest: number = WING_SCREEN_LAYOUT.CROWD_RADIUS_PX;
  for (const [minionId, screenPos] of getLiveChampionScreenEntries()) {
    if (minionId === excludeId) continue;
    const dx = screenPos.x - candidate.px;
    const dy = screenPos.y - candidate.py;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
};

/**
 * Picks a wander/landing target inside the team wing, preferring empty screen
 * space over spots already occupied by teammates. Falls back to the world-space
 * wing when the camera cannot be projected.
 */
export const pickSpreadTargetInWing = (
  team: TeamType,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number,
  excludeId?: string
): [number, number, number] => {
  const wing = COMBAT_VFX_CONSTANTS.WING_BOUNDS[team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG];
  let bestCandidate: ScreenCandidate | null = null;
  let bestClearance = -1;

  for (let i = 0; i < WING_SCREEN_LAYOUT.CANDIDATE_COUNT; i += 1) {
    const candidate = sampleWingCandidate(team, viewportW, viewportH);
    const clearance = measureClearance(candidate, excludeId);
    if (clearance <= bestClearance) continue;
    bestClearance = clearance;
    bestCandidate = candidate;
  }

  if (!bestCandidate) return pickTargetInWing(team);
  const planeZ = randomInRange(wing.minZ, wing.maxZ);
  return unprojectNdcToPlane(camera, bestCandidate.ndcX, bestCandidate.ndcY, planeZ) ?? pickTargetInWing(team);
};

/**
 * Spawn point for a newly deployed champion (called from the store, which has no
 * R3F context). Uses the live scene camera so the portal and entrance aura land
 * in open screen space; falls back to the world-space wing before the first frame.
 */
export const pickSpawnPositionInWing = (team: TeamType): [number, number, number] => {
  const camera = getActiveSceneCamera();
  if (!camera || typeof window === 'undefined') return pickTargetInWing(team);
  return pickSpreadTargetInWing(team, camera, window.innerWidth, window.innerHeight);
};
