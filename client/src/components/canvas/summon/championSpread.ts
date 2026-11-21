import * as THREE from 'three';
import {
  COMBAT_VFX_CONSTANTS,
  HUD_DEADZONE_ELEMENT_IDS,
  TEAM_KEY,
  TeamType,
} from '../../../constants/game';
import { getLiveChampionScreenEntries } from '../../../services/minionPositionRegistry';
import { getActiveSceneCamera, pickTargetInWing, randomInRange } from './summonShared';

/**
 * Normalised screen-space arena layout and crescent raid formation constants.
 * Keeps champions framing Baron Nashor cleanly in left/right flanks and the lower floor
 * without colliding with the top scoreboard, Boss torso, or active bottom HUD panels.
 */
export const WING_SCREEN_LAYOUT = {
  NDC_X_INNER: 0.14,
  NDC_X_OUTER: 0.82,
  NDC_Y_MIN: -0.72,
  NDC_Y_MAX: 0.34,
  CANDIDATE_COUNT: 20,
  CROWD_RADIUS_PX: 140,
} as const;

interface CrescentRow {
  ndcY: number;
  absCols: readonly number[];
}

const CRESCENT_FORMATION = {
  BOSS_EXCLUSION_X: 0.27,
  BOSS_EXCLUSION_Y_MIN: -0.22,
  BOSS_CLAMP_FLANK_X: 0.28,
  JITTER_X: 0.024,
  JITTER_Y: 0.018,
  PREFERRED_ARC_Y_MIN: -0.50,
  PREFERRED_ARC_Y_MAX: 0.12,
  PREFERRED_ARC_BONUS: 0.16,
  LOCALITY_PENALTY_WEIGHT: 0.22,
  RANDOM_TIE_BREAK: 0.06,
  ROWS: [
    { ndcY: 0.26, absCols: [0.32, 0.56, 0.78] },
    { ndcY: 0.08, absCols: [0.42, 0.64, 0.80] },
    { ndcY: -0.10, absCols: [0.32, 0.56, 0.78] },
    { ndcY: -0.29, absCols: [0.16, 0.38, 0.60, 0.78] },
    { ndcY: -0.48, absCols: [0.26, 0.50, 0.74] },
    { ndcY: -0.67, absCols: [0.16, 0.39, 0.62, 0.78] },
  ] as readonly CrescentRow[],
} as const;

const SEPARATION_CONFIG = {
  ELLIPSE_RX_MIN_PX: 92,
  ELLIPSE_RX_RATIO: 0.195,
  ELLIPSE_RY_MIN_PX: 62,
  ELLIPSE_RY_RATIO: 0.068,
  MAX_CLEARANCE_CAP: 2.0,
  CROWD_FALLOFF_RADIUS: 1.3,
  CROWD_PENALTY_WEIGHT: 0.35,
  ACTIVE_RADIUS_SCALE: 0.72,
  MIN_OVERLAP_DEADBAND: 0.04,
  RESERVATION_TTL_MS: 750,
} as const;

const HUD_DEADZONE_CONFIG = {
  CACHE_TTL_MS: 500,
  MIN_ACTIVE_HEIGHT_PX: 8,
  TOP_MARGIN_PX: 24,
  SIDE_MARGIN_PX: 16,
  LIFT_BUFFER_PX: 2,
} as const;

interface HudDeadzoneRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface SpawnReservation {
  px: number;
  py: number;
  expiresAt: number;
}

interface ScreenCandidate {
  ndcX: number;
  ndcY: number;
  px: number;
  py: number;
}

const tempRayPoint = new THREE.Vector3();
const tempRayDir = new THREE.Vector3();
const tempClampNdc = new THREE.Vector3();
const tempUnprojectXY = { x: 0, y: 0 };
const recentReservations: SpawnReservation[] = [];

let cachedDeadzones: HudDeadzoneRect[] = [];
let cachedDeadzonesAtMs = 0;
let cachedDeadzoneViewportW = 0;
let cachedDeadzoneViewportH = 0;

const clampValue = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const isRightSideTeam = (team: TeamType | string): boolean =>
  team === TEAM_KEY.GENG || team === 'GEN' || team === 'GEN.G';

const getActiveHudDeadzones = (viewportW: number, viewportH: number): readonly HudDeadzoneRect[] => {
  if (typeof document === 'undefined' || viewportW <= 0 || viewportH <= 0) {
    return [];
  }

  const now = Date.now();
  const isViewportUnchanged =
    cachedDeadzoneViewportW === viewportW && cachedDeadzoneViewportH === viewportH;
  if (isViewportUnchanged && now - cachedDeadzonesAtMs < HUD_DEADZONE_CONFIG.CACHE_TTL_MS) {
    return cachedDeadzones;
  }

  const nextRects: HudDeadzoneRect[] = [];
  const leftEl = document.getElementById(HUD_DEADZONE_ELEMENT_IDS.BOTTOM_LEFT);
  if (leftEl) {
    const rect = leftEl.getBoundingClientRect();
    if (rect.height > HUD_DEADZONE_CONFIG.MIN_ACTIVE_HEIGHT_PX && rect.width > 0) {
      nextRects.push({
        left: 0,
        right: rect.right + HUD_DEADZONE_CONFIG.SIDE_MARGIN_PX,
        top: rect.top - HUD_DEADZONE_CONFIG.TOP_MARGIN_PX,
        bottom: viewportH,
      });
    }
  }

  const rightEl = document.getElementById(HUD_DEADZONE_ELEMENT_IDS.BOTTOM_RIGHT);
  if (rightEl) {
    const rect = rightEl.getBoundingClientRect();
    if (rect.height > HUD_DEADZONE_CONFIG.MIN_ACTIVE_HEIGHT_PX && rect.width > 0) {
      nextRects.push({
        left: rect.left - HUD_DEADZONE_CONFIG.SIDE_MARGIN_PX,
        right: viewportW,
        top: rect.top - HUD_DEADZONE_CONFIG.TOP_MARGIN_PX,
        bottom: viewportH,
      });
    }
  }

  cachedDeadzones = nextRects;
  cachedDeadzonesAtMs = now;
  cachedDeadzoneViewportW = viewportW;
  cachedDeadzoneViewportH = viewportH;
  return cachedDeadzones;
};

const isPointInsideDeadzone = (px: number, py: number, deadzone: HudDeadzoneRect): boolean =>
  px >= deadzone.left && px <= deadzone.right && py >= deadzone.top && py <= deadzone.bottom;

const isPointInAnyDeadzone = (
  px: number,
  py: number,
  deadzones: readonly HudDeadzoneRect[]
): boolean => {
  for (let i = 0; i < deadzones.length; i += 1) {
    if (isPointInsideDeadzone(px, py, deadzones[i])) return true;
  }
  return false;
};

const isInsideBossCenterExclusion = (ndcX: number, ndcY: number): boolean =>
  Math.abs(ndcX) < CRESCENT_FORMATION.BOSS_EXCLUSION_X &&
  ndcY > CRESCENT_FORMATION.BOSS_EXCLUSION_Y_MIN;

const pruneExpiredReservations = (now: number): void => {
  let writeIdx = 0;
  for (let i = 0; i < recentReservations.length; i += 1) {
    if (recentReservations[i].expiresAt > now) {
      recentReservations[writeIdx] = recentReservations[i];
      writeIdx += 1;
    }
  }
  recentReservations.length = writeIdx;
};

const toScreenPx = (ndcX: number, ndcY: number, viewportW: number, viewportH: number) => ({
  px: ((ndcX + 1) / 2) * viewportW,
  py: ((-ndcY + 1) / 2) * viewportH,
});

const buildCrescentCandidates = (
  team: TeamType,
  viewportW: number,
  viewportH: number,
  deadzones: readonly HudDeadzoneRect[]
): ScreenCandidate[] => {
  const sideSign = isRightSideTeam(team) ? 1 : -1;
  const safeXMax = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_X;
  const safeYMin = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MIN;
  const safeYMax = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MAX;
  const candidates: ScreenCandidate[] = [];

  for (let rowIdx = 0; rowIdx < CRESCENT_FORMATION.ROWS.length; rowIdx += 1) {
    const row = CRESCENT_FORMATION.ROWS[rowIdx];
    for (let colIdx = 0; colIdx < row.absCols.length; colIdx += 1) {
      const absX = clampValue(
        row.absCols[colIdx] + randomInRange(-CRESCENT_FORMATION.JITTER_X, CRESCENT_FORMATION.JITTER_X),
        WING_SCREEN_LAYOUT.NDC_X_INNER,
        safeXMax
      );
      const ndcX = sideSign * absX;
      const ndcY = clampValue(
        row.ndcY + randomInRange(-CRESCENT_FORMATION.JITTER_Y, CRESCENT_FORMATION.JITTER_Y),
        safeYMin,
        safeYMax
      );
      if (isInsideBossCenterExclusion(ndcX, ndcY)) continue;

      const { px, py } = toScreenPx(ndcX, ndcY, viewportW, viewportH);
      if (isPointInAnyDeadzone(px, py, deadzones)) continue;
      candidates.push({ ndcX, ndcY, px, py });
    }
  }

  return candidates;
};

const getEllipticalRadiiPx = (viewportW: number, viewportH: number): { rx: number; ry: number } => ({
  rx: Math.max(SEPARATION_CONFIG.ELLIPSE_RX_MIN_PX, viewportW * SEPARATION_CONFIG.ELLIPSE_RX_RATIO),
  ry: Math.max(SEPARATION_CONFIG.ELLIPSE_RY_MIN_PX, viewportH * SEPARATION_CONFIG.ELLIPSE_RY_RATIO),
});

const scoreCandidate = (
  candidate: ScreenCandidate,
  viewportW: number,
  viewportH: number,
  rx: number,
  ry: number,
  excludeId?: string,
  currentScreenPos?: { x: number; y: number }
): number => {
  let nearestDist: number = SEPARATION_CONFIG.MAX_CLEARANCE_CAP;
  let crowdPenalty = 0;

  for (const [minionId, screenPos] of getLiveChampionScreenEntries()) {
    if (minionId === excludeId) continue;
    const dist = Math.hypot((screenPos.x - candidate.px) / rx, (screenPos.y - candidate.py) / ry);
    if (dist < nearestDist) nearestDist = dist;
    if (dist < SEPARATION_CONFIG.CROWD_FALLOFF_RADIUS) {
      crowdPenalty += (SEPARATION_CONFIG.CROWD_FALLOFF_RADIUS - dist) * SEPARATION_CONFIG.CROWD_PENALTY_WEIGHT;
    }
  }

  for (let i = 0; i < recentReservations.length; i += 1) {
    const res = recentReservations[i];
    const dist = Math.hypot((res.px - candidate.px) / rx, (res.py - candidate.py) / ry);
    if (dist < nearestDist) nearestDist = dist;
    if (dist < SEPARATION_CONFIG.CROWD_FALLOFF_RADIUS) {
      crowdPenalty += (SEPARATION_CONFIG.CROWD_FALLOFF_RADIUS - dist) * SEPARATION_CONFIG.CROWD_PENALTY_WEIGHT;
    }
  }

  let score = nearestDist - crowdPenalty;

  const isInPreferredArc =
    candidate.ndcY >= CRESCENT_FORMATION.PREFERRED_ARC_Y_MIN &&
    candidate.ndcY <= CRESCENT_FORMATION.PREFERRED_ARC_Y_MAX;
  if (isInPreferredArc) {
    score += CRESCENT_FORMATION.PREFERRED_ARC_BONUS;
  }

  if (currentScreenPos) {
    const moveDist = Math.hypot(
      (candidate.px - currentScreenPos.x) / viewportW,
      (candidate.py - currentScreenPos.y) / viewportH
    );
    score -= moveDist * CRESCENT_FORMATION.LOCALITY_PENALTY_WEIGHT;
  }

  return score + Math.random() * CRESCENT_FORMATION.RANDOM_TIE_BREAK;
};

/** Zero-allocation plane intersection: writes world X/Y where `(ndcX, ndcY)` crosses `z = planeZ`. */
const unprojectNdcToPlaneInto = (
  out: { x: number; y: number },
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  planeZ: number
): boolean => {
  tempRayPoint.set(ndcX, ndcY, 0.5).unproject(camera);
  tempRayDir.copy(tempRayPoint).sub(camera.position).normalize();
  if (Math.abs(tempRayDir.z) < 1e-4) return false;
  const travel = (planeZ - camera.position.z) / tempRayDir.z;
  if (travel <= 0) return false;
  out.x = camera.position.x + tempRayDir.x * travel;
  out.y = camera.position.y + tempRayDir.y * travel;
  return true;
};

/** World point where the camera ray through (ndcX, ndcY) crosses the plane z = planeZ. */
const unprojectNdcToPlane = (
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  planeZ: number
): [number, number, number] | null => {
  if (!unprojectNdcToPlaneInto(tempUnprojectXY, camera, ndcX, ndcY, planeZ)) return null;
  return [tempUnprojectXY.x, tempUnprojectXY.y, planeZ];
};

const resolveSpreadTarget = (
  team: TeamType,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number,
  shouldReserve: boolean,
  excludeId?: string,
  currentScreenPos?: { x: number; y: number }
): [number, number, number] => {
  const safeW = Math.max(1, viewportW);
  const safeH = Math.max(1, viewportH);
  const now = Date.now();
  pruneExpiredReservations(now);

  const deadzones = getActiveHudDeadzones(safeW, safeH);
  let candidates = buildCrescentCandidates(team, safeW, safeH, deadzones);
  if (candidates.length === 0) {
    candidates = buildCrescentCandidates(team, safeW, safeH, []);
  }
  if (candidates.length === 0) return pickTargetInWing(team);

  const { rx, ry } = getEllipticalRadiiPx(safeW, safeH);
  let bestCandidate: ScreenCandidate = candidates[0];
  let bestScore = -Infinity;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const score = scoreCandidate(candidate, safeW, safeH, rx, ry, excludeId, currentScreenPos);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (shouldReserve) {
    recentReservations.push({
      px: bestCandidate.px,
      py: bestCandidate.py,
      expiresAt: now + SEPARATION_CONFIG.RESERVATION_TTL_MS,
    });
  }

  const wingKey = isRightSideTeam(team) ? TEAM_KEY.GENG : TEAM_KEY.BLG;
  const wing = COMBAT_VFX_CONSTANTS.WING_BOUNDS[wingKey];
  const planeZ = randomInRange(wing.minZ, wing.maxZ);
  return (
    unprojectNdcToPlane(camera, bestCandidate.ndcX, bestCandidate.ndcY, planeZ) ??
    pickTargetInWing(team)
  );
};

/**
 * Picks a wander target inside the team's crescent formation around Baron, favouring
 * open screen space and avoiding active bottom HUD panels.
 */
export const pickSpreadTargetInWing = (
  team: TeamType,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number,
  excludeId?: string,
  currentScreenPos?: { x: number; y: number }
): [number, number, number] =>
  resolveSpreadTarget(team, camera, viewportW, viewportH, false, excludeId, currentScreenPos);

/**
 * Spawn point for a newly deployed champion (called from the store, which has no
 * R3F context). Reserves the chosen screen slot briefly so batch summons spread cleanly.
 */
export const pickSpawnPositionInWing = (team: TeamType): [number, number, number] => {
  const camera = getActiveSceneCamera();
  if (!camera || typeof window === 'undefined') return pickTargetInWing(team);
  return resolveSpreadTarget(team, camera, window.innerWidth, window.innerHeight, true);
};

/**
 * Clamps a projected NDC coordinate inside the safe arena, lifting out of any active
 * bottom HUD panel and steering clear of Baron Nashor's center torso.
 */
export const clampNdcToSafeArena = (
  outVec: THREE.Vector3,
  team: TeamType,
  viewportW: number,
  viewportH: number
): boolean => {
  const cfg = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT;
  const safeX = cfg.VIEWPORT_SAFE_NDC_X;
  const safeYMin = cfg.VIEWPORT_SAFE_NDC_Y_MIN;
  const safeYMax = cfg.VIEWPORT_SAFE_NDC_Y_MAX;
  let isAdjusted = false;

  if (outVec.x < -safeX) {
    outVec.x = -safeX;
    isAdjusted = true;
  } else if (outVec.x > safeX) {
    outVec.x = safeX;
    isAdjusted = true;
  }

  if (outVec.y < safeYMin) {
    outVec.y = safeYMin;
    isAdjusted = true;
  } else if (outVec.y > safeYMax) {
    outVec.y = safeYMax;
    isAdjusted = true;
  }

  if (viewportW > 0 && viewportH > 0) {
    const deadzones = getActiveHudDeadzones(viewportW, viewportH);
    const { px, py } = toScreenPx(outVec.x, outVec.y, viewportW, viewportH);
    for (let i = 0; i < deadzones.length; i += 1) {
      const dz = deadzones[i];
      if (!isPointInsideDeadzone(px, py, dz)) continue;
      const liftedPy = dz.top - HUD_DEADZONE_CONFIG.LIFT_BUFFER_PX;
      const liftedNdcY = clampValue(1 - (liftedPy / viewportH) * 2, safeYMin, safeYMax);
      if (liftedNdcY > outVec.y) {
        outVec.y = liftedNdcY;
        isAdjusted = true;
      }
    }
  }

  if (isInsideBossCenterExclusion(outVec.x, outVec.y)) {
    const sideSign = isRightSideTeam(team) ? 1 : -1;
    outVec.x = sideSign * CRESCENT_FORMATION.BOSS_CLAMP_FLANK_X;
    isAdjusted = true;
  }

  return isAdjusted;
};

/**
 * Clamps a world X/Y target inside the safe arena while preserving its constant `planeZ` depth.
 * Returns false if already inside safe bounds so callers avoid needless target rewrites.
 */
export const clampWorldTargetToSafeArena = (
  out: { x: number; y: number },
  worldX: number,
  worldY: number,
  planeZ: number,
  team: TeamType,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number
): boolean => {
  tempClampNdc.set(worldX, worldY, planeZ).project(camera);
  if (!clampNdcToSafeArena(tempClampNdc, team, viewportW, viewportH)) return false;
  return unprojectNdcToPlaneInto(out, camera, tempClampNdc.x, tempClampNdc.y, planeZ);
};

/**
 * Computes a gentle anisotropic separation nudge (zero allocations) to keep champions
 * and their HTML nameplates from stacking. Note: `out.dy` is already converted to World/NDC
 * Y-up sign (screen +Y is downward, so pushing down on screen returns negative `dy`).
 */
export const computeScreenSeparationNudge = (
  out: { dx: number; dy: number },
  minionId: string,
  screenX: number,
  screenY: number,
  viewportW: number,
  viewportH: number
): boolean => {
  const { rx, ry } = getEllipticalRadiiPx(Math.max(1, viewportW), Math.max(1, viewportH));
  const activeRx = rx * SEPARATION_CONFIG.ACTIVE_RADIUS_SCALE;
  const activeRy = ry * SEPARATION_CONFIG.ACTIVE_RADIUS_SCALE;

  let sumX = 0;
  let sumScreenY = 0;

  for (const [otherId, otherPos] of getLiveChampionScreenEntries()) {
    if (otherId === minionId) continue;
    const nx = (screenX - otherPos.x) / activeRx;
    const nyScreen = (screenY - otherPos.y) / activeRy;
    const distSq = nx * nx + nyScreen * nyScreen;
    if (distSq >= 1.0) continue;

    if (distSq < 1e-4) {
      const tieAngle = (minionId < otherId ? 0 : Math.PI) + 0.35;
      sumX += Math.cos(tieAngle);
      sumScreenY += Math.sin(tieAngle);
      continue;
    }

    const dist = Math.sqrt(distSq);
    const rawOverlap = 1 - dist;
    if (rawOverlap <= SEPARATION_CONFIG.MIN_OVERLAP_DEADBAND) continue;
    const strength = rawOverlap - SEPARATION_CONFIG.MIN_OVERLAP_DEADBAND;
    const weightedStrength = strength * strength;
    sumX += (nx / dist) * weightedStrength;
    sumScreenY += (nyScreen / dist) * weightedStrength;
  }

  // Convert screen Y-down repulsion to World/NDC Y-up direction
  const worldY = -sumScreenY;
  const mag = Math.hypot(sumX, worldY);
  if (mag <= 0.001) {
    out.dx = 0;
    out.dy = 0;
    return false;
  }

  const clampedScale = mag > 1.0 ? 1.0 / mag : 1.0;
  out.dx = sumX * clampedScale;
  out.dy = worldY * clampedScale;
  return true;
};
