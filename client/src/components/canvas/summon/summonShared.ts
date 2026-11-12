import * as THREE from 'three';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';

export const tempProjVec = new THREE.Vector3();
const tempRayOrigin = new THREE.Vector3();
const tempRayDir = new THREE.Vector3();
let activeSceneCamera: THREE.Camera | null = null;

export const setActiveSceneCamera = (camera: THREE.Camera): void => {
  activeSceneCamera = camera;
};

/**
 * Converts a 2D viewport pixel coordinate onto the 3D combat plane at `targetZ`
 * so 3D projectiles start and land on exact DOM element positions (roster cards, Boss hitbox).
 */
export const unprojectScreenToWorld = (
  screenX: number,
  screenY: number,
  targetZ = 0.5
): [number, number, number] | null => {
  if (!activeSceneCamera || typeof window === 'undefined') return null;
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  const ndcX = (screenX / width) * 2 - 1;
  const ndcY = -(screenY / height) * 2 + 1;

  tempRayOrigin.copy(activeSceneCamera.position);
  tempRayDir.set(ndcX, ndcY, 0.5).unproject(activeSceneCamera).sub(tempRayOrigin).normalize();

  if (Math.abs(tempRayDir.z) < 0.0001) return null;
  const t = (targetZ - tempRayOrigin.z) / tempRayDir.z;
  if (t <= 0) return null;

  return [
    tempRayOrigin.x + tempRayDir.x * t,
    tempRayOrigin.y + tempRayDir.y * t,
    targetZ,
  ];
};

export const project3DToScreen = (
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } => {
  tempProjVec.set(worldX, worldY, worldZ);
  tempProjVec.project(camera);
  return {
    x: Math.round(((tempProjVec.x + 1) / 2) * width),
    y: Math.round(((-tempProjVec.y + 1) / 2) * height),
  };
};

export interface CachedChampionVfxRefs {
  ring?: THREE.Mesh;
  sigHaloMesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  beamMesh?: THREE.Mesh;
  landingMesh?: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
}

export interface ChampionAIState {
  currentX: number;
  currentY: number;
  currentZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  nextWanderTime: number;
  moveSpeed: number;
  nextAttackTime: number;
  attackStartTime: number;
  isAttacking: boolean;
  hasFiredInThisAttack?: boolean;
  hasLanded?: boolean;
  targetBossZone?: [number, number, number];
  bobPhase: number;
  cachedVfxRefs?: CachedChampionVfxRefs;
}

const MAX_CHAMPION_TEXTURE_CACHE = 80;
const MAX_NAMEPLATE_TEXTURE_CACHE = 120;

const textureCache = new Map<string, THREE.Texture>();
const nameplateTextureCache = new Map<string, THREE.CanvasTexture>();
const textureLoader = new THREE.TextureLoader();

export const SHARED_BACKING_DISC_GEO = new THREE.CircleGeometry(0.2, 24);
export const SHARED_PORTRAIT_GEO = new THREE.CircleGeometry(0.17, 24);
export const SHARED_TORUS_BORDER_GEO = new THREE.TorusGeometry(0.18, 0.016, 8, 24);
export const SHARED_RUNIC_RING_GEO = new THREE.RingGeometry(0.2, 0.23, 20);
export const SHARED_SATELLITE_GEO = new THREE.OctahedronGeometry(0.045, 0);

export const SHARED_HP_BG_GEO = new THREE.PlaneGeometry(0.36, 0.05);
export const SHARED_HP_BORDER_GEO = new THREE.PlaneGeometry(0.38, 0.065);
export const SHARED_HP_FILL_GEO = new THREE.PlaneGeometry(0.34, 0.038);

export const SHARED_FURY_BG_GEO = new THREE.PlaneGeometry(0.36, 0.036);
export const SHARED_FURY_BORDER_GEO = new THREE.PlaneGeometry(0.38, 0.048);
export const SHARED_FURY_FILL_GEO = new THREE.PlaneGeometry(0.34, 0.026);

export const SHARED_CELESTIAL_AURA_GEO = new THREE.RingGeometry(0.16, 0.26, 24);
export const SHARED_LIGHT_BEAM_GEO = new THREE.CylinderGeometry(0.05, 0.18, 1.6, 16, 1, true);
export const SHARED_LANDING_RING_GEO = new THREE.RingGeometry(0.09, 0.24, 24);
export const SHARED_SHIELD_RING_GEO = new THREE.RingGeometry(0.19, 0.25, 24);

export const SHARED_DEFEAT_EXPANDING_RING_GEO = new THREE.RingGeometry(0.12, 0.32, 28);
export const SHARED_DEFEAT_CROSS_GEO = new THREE.PlaneGeometry(0.32, 0.04);

export const SHARED_NAMEPLATE_GEO = new THREE.PlaneGeometry(
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_WIDTH,
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_HEIGHT
);

export const FURY_COLOR_EMPTY = '#334155';
export const FURY_COLOR_CHARGING = '#f59e0b';
export const FURY_COLOR_FULL = '#fde047';

export const getFuryFillColor = (furyRatio: number): string => {
  if (furyRatio >= 1) return FURY_COLOR_FULL;
  if (furyRatio > 0) return FURY_COLOR_CHARGING;
  return FURY_COLOR_EMPTY;
};

export const getMinionAttackSpeedFactor = (
  momentumMultiplier: number,
  lastTapAt: number,
  now: number
): number => {
  if (now - lastTapAt > GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS) {
    return 1;
  }
  const normalized =
    (momentumMultiplier - 1) / Math.max(0.1, GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX - 1);
  return (
    1 +
    Math.min(1, Math.max(0, normalized)) *
      (GAME_CONSTANTS.MINION_FURY.HEART_TAP_ATTACK_SPEED_MAX - 1)
  );
};

export const getNameplateTexture = (
  summonerName: string,
  team: string,
  primaryColor: string,
  signaturePlayerName?: string
): THREE.CanvasTexture => {
  const cleanName = (summonerName || 'Viewer').trim().replace(/^@+/, '');
  const sigTag = signaturePlayerName ? signaturePlayerName.trim() : '';
  const cacheKey = `${team}_${primaryColor}_${cleanName}_${sigTag}`;
  const existing = nameplateTextureCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  if (nameplateTextureCache.size > MAX_NAMEPLATE_TEXTURE_CACHE) {
    const firstKey = nameplateTextureCache.keys().next().value;
    if (firstKey) {
      nameplateTextureCache.get(firstKey)?.dispose();
      nameplateTextureCache.delete(firstKey);
    }
  }

  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const emptyTex = new THREE.CanvasTexture(canvas);
    nameplateTextureCache.set(cacheKey, emptyTex);
    return emptyTex;
  }

  const glowColor = sigTag ? GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR : primaryColor;
  const paddingX = 14;
  const paddingY = 14;
  const pillW = width - paddingX * 2;
  const pillH = height - paddingY * 2;
  const radius = pillH / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(paddingX, paddingY, pillW, pillH, radius);
  } else {
    ctx.rect(paddingX, paddingY, pillW, pillH);
  }
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = glowColor;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = sigTag ? 5 : 4;
  ctx.strokeStyle = glowColor;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(paddingX, paddingY, pillW, pillH, radius);
  } else {
    ctx.rect(paddingX, paddingY, pillW, pillH);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = '36px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sigTag ? '⭐' : '💬', paddingX + 46, height / 2);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 6;
  const maxTextW = pillW - 100;

  let displayName = `@${cleanName}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = sigTag
    ? 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    : 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  while (ctx.measureText(displayName).width > maxTextW && displayName.length > 4) {
    displayName = `${displayName.slice(0, -2)}…`;
  }

  if (sigTag) {
    ctx.fillText(displayName, paddingX + 82, height * 0.36);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let badgeText = `${GAME_CONSTANTS.SIGNATURE_SYNERGY.BADGE_PREFIX} · ${sigTag.toUpperCase()} (+${GAME_CONSTANTS.SIGNATURE_SYNERGY.BONUS_PERCENT}%)`;
    while (ctx.measureText(badgeText).width > maxTextW && badgeText.length > 6) {
      badgeText = `${badgeText.slice(0, -2)}…`;
    }
    ctx.fillText(badgeText, paddingX + 82, height * 0.69);
  } else {
    ctx.fillText(displayName, paddingX + 82, height / 2);
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  nameplateTextureCache.set(cacheKey, texture);
  return texture;
};

export const getChampionTexture = (url: string): THREE.Texture => {
  const existing = textureCache.get(url);
  if (existing) return existing;

  if (textureCache.size >= MAX_CHAMPION_TEXTURE_CACHE) {
    const firstKey = textureCache.keys().next().value;
    if (firstKey) {
      textureCache.get(firstKey)?.dispose();
      textureCache.delete(firstKey);
    }
  }

  const tex = textureLoader.load(url);
  tex.generateMipmaps = true;
  textureCache.set(url, tex);
  return tex;
};

export const randomInRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const pickTargetInWing = (team: TeamType | string): [number, number, number] => {
  const isGen = team === TEAM_KEY.GENG || team === 'GEN' || team === 'GEN.G';
  const bounds = isGen
    ? COMBAT_VFX_CONSTANTS.WING_BOUNDS[TEAM_KEY.GENG]
    : COMBAT_VFX_CONSTANTS.WING_BOUNDS[TEAM_KEY.BLG];
  return [
    randomInRange(bounds.minX, bounds.maxX),
    randomInRange(bounds.minY, bounds.maxY),
    randomInRange(bounds.minZ, bounds.maxZ),
  ];
};
