import * as THREE from 'three';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import { ChampionNameplateAnchor } from '../../../services/minionPositionRegistry';

export const tempProjVec = new THREE.Vector3();
const tempRayOrigin = new THREE.Vector3();
const tempRayDir = new THREE.Vector3();
let activeSceneCamera: THREE.Camera | null = null;

export const setActiveSceneCamera = (camera: THREE.Camera): void => {
  activeSceneCamera = camera;
};

export const getActiveSceneCamera = (): THREE.Camera | null => activeSceneCamera;

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

/** Writes the sub-pixel projected position into `out` (no allocation; use inside per-frame loops). */
export const projectToScreenFloatInto = (
  out: { x: number; y: number },
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  width: number,
  height: number
): void => {
  tempProjVec.set(worldX, worldY, worldZ);
  tempProjVec.project(camera);
  out.x = ((tempProjVec.x + 1) / 2) * width;
  out.y = ((-tempProjVec.y + 1) / 2) * height;
};

/** Writes the rounded projected pixel position into `out` (no allocation; use inside per-frame loops). */
export const projectToScreenInto = (
  out: { x: number; y: number },
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  width: number,
  height: number
): void => {
  projectToScreenFloatInto(out, worldX, worldY, worldZ, camera, width, height);
  out.x = Math.round(out.x);
  out.y = Math.round(out.y);
};

export const project3DToScreen = (
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } => {
  const screenPosition = { x: 0, y: 0 };
  projectToScreenInto(screenPosition, worldX, worldY, worldZ, camera, width, height);
  return screenPosition;
};

export interface CachedChampionVfxRefs {
  tokenUnitGroup?: THREE.Group;
  impactShardsMesh?: THREE.Mesh;
  sigHaloMesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  runeSealMesh?: THREE.Mesh;
  landingMesh?: THREE.Mesh;
  landingFlashMesh?: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  eliteAuraMesh?: THREE.Mesh;
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
  /** uuid of the token group the cached refs belong to (a remounted token gets a new group). */
  cachedVfxGroupId?: string;
  /** Registry-owned position objects, mutated in place every frame. */
  liveWorld?: [number, number, number];
  liveScreen?: { x: number; y: number };
  liveNameplateAnchor?: ChampionNameplateAnchor;
}

const MAX_CHAMPION_TEXTURE_CACHE = 160;

const textureCache = new Map<string, THREE.Texture>();
const championKeyTarget = new Map<string, { url: string; label: string }>();
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

const refreshLruEntry = <T>(cache: Map<string, T>, key: string, value: T): void => {
  cache.delete(key);
  cache.set(key, value);
};

const evictOldestUnused = <T extends THREE.Texture>(
  cache: Map<string, T>,
  maxSize: number,
  isKeyInUse: (key: string) => boolean,
  onDelete?: (key: string) => void
): void => {
  if (cache.size < maxSize) return;
  for (const key of cache.keys()) {
    if (isKeyInUse(key)) continue;
    cache.get(key)?.dispose();
    cache.delete(key);
    onDelete?.(key);
    if (cache.size < maxSize) return;
  }
};

// Token body layers (disc, portrait, rings, gauges) are drawn by tokenBodyMaterial in one quad
export const SHARED_PORTRAIT_GEO = new THREE.CircleGeometry(0.17, 24);

export const SHARED_CELESTIAL_AURA_GEO = new THREE.RingGeometry(0.16, 0.26, 24);
/** Thin gold ring just outside the portrait border: a wide additive band reads as a muddy olive haze. */
export const SHARED_SIGNATURE_HALO_GEO = new THREE.RingGeometry(0.2, 0.218, 48);
/** Refined VIP halo ring for Elite Champions that fits cleanly around the portrait */
export const SHARED_ELITE_AURA_RING_GEO = new THREE.RingGeometry(
  COMBAT_VFX_CONSTANTS.ELITE_AURA.RING_INNER_RADIUS,
  COMBAT_VFX_CONSTANTS.ELITE_AURA.RING_OUTER_RADIUS,
  COMBAT_VFX_CONSTANTS.ELITE_AURA.RING_SEGMENTS
);
export const SHARED_AVATAR_VIP_HALO_GEO = new THREE.RingGeometry(
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.VIP_HALO_INNER_RADIUS,
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.VIP_HALO_OUTER_RADIUS,
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.VIP_HALO_SEGMENTS
);
export const SHARED_IMPACT_SHARDS_RING_GEO = new THREE.RingGeometry(
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.IMPACT_SHARDS_INNER_RADIUS,
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.IMPACT_SHARDS_OUTER_RADIUS,
  COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.IMPACT_SHARDS_SEGMENTS
);
export const SHARED_RUNE_SEAL_GEO = new THREE.RingGeometry(0.24, 0.265, 6);
export const SHARED_LANDING_RING_GEO = new THREE.RingGeometry(0.09, 0.24, 24);
export const SHARED_LANDING_FLASH_GEO = new THREE.CircleGeometry(0.22, 24);
export const SHARED_SHIELD_RING_GEO = new THREE.RingGeometry(0.182, 0.208, 36);

export const SHARED_DEFEAT_EXPANDING_RING_GEO = new THREE.RingGeometry(0.12, 0.32, 28);
export const SHARED_DEFEAT_CROSS_GEO = new THREE.PlaneGeometry(0.42, 0.035);
export const SHARED_DEFEAT_FLASH_GEO = new THREE.CircleGeometry(0.22, 24);
export const SHARED_DEFEAT_SHARD_GEO = new THREE.CircleGeometry(0.032, 3);
export const SHARED_SOUL_WISP_GEO = new THREE.CylinderGeometry(0.008, 0.035, 0.7, 10, 1, true);

export const FURY_COLOR_EMPTY = '#0f172a';
export const FURY_COLOR_CHARGING = '#2563eb';
export const FURY_COLOR_FULL = '#38bdf8';

export const getFuryFillColor = (furyRatio: number): string => {
  if (furyRatio >= 1) return FURY_COLOR_FULL;
  if (furyRatio > 0) return FURY_COLOR_CHARGING;
  return FURY_COLOR_EMPTY;
};

export const getMinionAttackSpeedFactor = (
  momentumMultiplier: number,
  lastTapAt: number,
  now: number,
  frenzyUntil?: number
): number => {
  if (frenzyUntil && now < frenzyUntil) {
    return GAME_CONSTANTS.MINION_FURY.HEART_TAP_ATTACK_SPEED_MAX;
  }
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

const FALLBACK_AVATAR_STYLE = {
  SIZE: 128,
  BG_DARK: '#0f172a',
  ACCENT_DEFAULT: '#38bdf8',
  TEXT_COLOR: '#f8fafc',
  FONT: '800 56px "Segoe UI", Roboto, Arial, sans-serif',
  DEFAULT_INITIAL: '★',
} as const;

const createFallbackAvatarCanvas = (label?: string, accentColor?: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = FALLBACK_AVATAR_STYLE.SIZE;
  canvas.height = FALLBACK_AVATAR_STYLE.SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const size = FALLBACK_AVATAR_STYLE.SIZE;
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center * 0.75, size * 0.1, center, center, center);
  grad.addColorStop(0, accentColor || FALLBACK_AVATAR_STYLE.ACCENT_DEFAULT);
  grad.addColorStop(1, FALLBACK_AVATAR_STYLE.BG_DARK);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const clean = (label || '').trim().replace(/^[^\p{L}\p{N}]+/u, '');
  const initial = clean.length > 0 ? clean.slice(0, 1).toUpperCase() : FALLBACK_AVATAR_STYLE.DEFAULT_INITIAL;

  ctx.font = FALLBACK_AVATAR_STYLE.FONT;
  ctx.fillStyle = FALLBACK_AVATAR_STYLE.TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, center, center + 3);
  return canvas;
};

const applyTextureSampling = (tex: THREE.Texture): void => {
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
};

export const getChampionTexture = (
  url: string,
  fallbackUrl?: string,
  fallbackLabel?: string,
  accentColor?: string
): THREE.Texture => {
  const primaryUrl = (url || fallbackUrl || '').trim();
  const cacheKey = primaryUrl
    ? `${primaryUrl}__${fallbackUrl || ''}`
    : `fallback__${fallbackLabel || ''}__${accentColor || ''}`;
  const existing = textureCache.get(cacheKey);
  if (existing) {
    refreshLruEntry(textureCache, cacheKey, existing);
    return existing;
  }

  if (textureCache.size >= MAX_CHAMPION_TEXTURE_CACHE) {
    const activeUrls = new Set<string>();
    const activeLabels = new Set<string>();
    const minions = useGameStore.getState().minions;
    for (let i = 0; i < minions.length; i += 1) {
      const m = minions[i];
      if ((m.hp ?? 1) <= 0) continue;
      if (m.avatarUrl) activeUrls.add(m.avatarUrl.trim());
      if (m.userAvatarUrl) activeUrls.add(m.userAvatarUrl.trim());
      activeLabels.add(m.championName);
      activeLabels.add(m.summonerName);
    }
    evictOldestUnused(
      textureCache,
      MAX_CHAMPION_TEXTURE_CACHE,
      (key) => {
        const meta = championKeyTarget.get(key);
        if (!meta) return false;
        if (meta.url) return activeUrls.has(meta.url);
        return Boolean(meta.label && activeLabels.has(meta.label));
      },
      (key) => championKeyTarget.delete(key)
    );
  }

  if (!primaryUrl) {
    const fallbackTex = new THREE.CanvasTexture(createFallbackAvatarCanvas(fallbackLabel, accentColor));
    applyTextureSampling(fallbackTex);
    championKeyTarget.set(cacheKey, { url: '', label: fallbackLabel || '' });
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const applyCanvasFallback = (targetTex: THREE.Texture): void => {
    targetTex.image = createFallbackAvatarCanvas(fallbackLabel, accentColor);
    targetTex.needsUpdate = true;
  };

  const tex = textureLoader.load(
    primaryUrl,
    undefined,
    undefined,
    () => {
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        textureLoader.load(
          fallbackUrl,
          (loadedFallback) => {
            tex.image = loadedFallback.image;
            tex.needsUpdate = true;
          },
          undefined,
          () => applyCanvasFallback(tex)
        );
        return;
      }
      applyCanvasFallback(tex);
    }
  );
  applyTextureSampling(tex);
  championKeyTarget.set(cacheKey, { url: primaryUrl, label: fallbackLabel || '' });
  textureCache.set(cacheKey, tex);
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
