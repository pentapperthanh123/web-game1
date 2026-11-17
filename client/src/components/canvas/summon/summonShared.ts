import * as THREE from 'three';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';
import {
  SESSION_TIER,
  SESSION_TIER_EMBLEM_PATHS,
  SESSION_TIER_EMBLEM_VIEWBOX,
  SESSION_TIER_STYLE,
  SessionTier,
  isSessionTierAtLeast,
} from '../../../constants/sessionLeaderboard';
import { toCanonicalViewerName } from '../../../store/roundDamageTracker';

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

/** Writes the projected pixel position into `out` (no allocation; use inside per-frame loops). */
export const projectToScreenInto = (
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
  out.x = Math.round(((tempProjVec.x + 1) / 2) * width);
  out.y = Math.round(((-tempProjVec.y + 1) / 2) * height);
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
  sigHaloMesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  beamMesh?: THREE.Mesh;
  beamCoreMesh?: THREE.Mesh;
  runeSealMesh?: THREE.Mesh;
  landingMesh?: THREE.Mesh;
  landingFlashMesh?: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  eliteAuraMesh?: THREE.Mesh;
  eliteFloorAuraMesh?: THREE.Mesh;
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
}

const MAX_CHAMPION_TEXTURE_CACHE = 80;
const MAX_NAMEPLATE_TEXTURE_CACHE = 120;

const textureCache = new Map<string, THREE.Texture>();
const nameplateTextureCache = new Map<string, THREE.CanvasTexture>();
const textureLoader = new THREE.TextureLoader();

// Token body layers (disc, portrait, rings, gauges) are drawn by tokenBodyMaterial in one quad
export const SHARED_PORTRAIT_GEO = new THREE.CircleGeometry(0.17, 24);

export const SHARED_CELESTIAL_AURA_GEO = new THREE.RingGeometry(0.16, 0.26, 24);
/** Thin gold ring just outside the portrait border: a wide additive band reads as a muddy olive haze. */
export const SHARED_SIGNATURE_HALO_GEO = new THREE.RingGeometry(0.2, 0.218, 48);
/** Glorious VIP halo for Elite Champions that persists throughout combat */
export const SHARED_ELITE_AURA_RING_GEO = new THREE.RingGeometry(0.19, 0.245, 36);
/** Rotating golden ground aura beneath Elite Champion tokens */
export const SHARED_ELITE_FLOOR_AURA_GEO = new THREE.RingGeometry(0.12, 0.26, 32);
export const SHARED_LIGHT_BEAM_GEO = new THREE.CylinderGeometry(0.05, 0.18, 1.6, 16, 1, true);
export const SHARED_LIGHT_BEAM_CORE_GEO = new THREE.CylinderGeometry(0.015, 0.06, 1.6, 12, 1, true);
export const SHARED_RUNE_SEAL_GEO = new THREE.RingGeometry(0.24, 0.265, 6);
export const SHARED_LANDING_RING_GEO = new THREE.RingGeometry(0.09, 0.24, 24);
export const SHARED_LANDING_FLASH_GEO = new THREE.CircleGeometry(0.22, 24);
export const SHARED_SHIELD_RING_GEO = new THREE.RingGeometry(0.19, 0.25, 24);

export const SHARED_DEFEAT_EXPANDING_RING_GEO = new THREE.RingGeometry(0.12, 0.32, 28);
export const SHARED_DEFEAT_CROSS_GEO = new THREE.PlaneGeometry(0.42, 0.035);
export const SHARED_DEFEAT_FLASH_GEO = new THREE.CircleGeometry(0.22, 24);
export const SHARED_DEFEAT_SHARD_GEO = new THREE.CircleGeometry(0.032, 3);
export const SHARED_SOUL_WISP_GEO = new THREE.CylinderGeometry(0.008, 0.035, 0.7, 10, 1, true);

export const SHARED_NAMEPLATE_GEO = new THREE.PlaneGeometry(
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_WIDTH,
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_HEIGHT
);

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

/**
 * Nameplate canvas. It is drawn close to its on-screen size and sampled with mipmaps, so the text
 * stays sharp when the token is small (a huge canvas without mipmaps shimmers and smears instead).
 */
const NAMEPLATE_STYLE = {
  CANVAS_WIDTH: 256,
  CANVAS_HEIGHT: 64,
  PADDING: 3,
  CORNER_RADIUS: 29,
  BORDER_WIDTH: 3,
  BACKGROUND: 'rgba(2, 6, 23, 0.92)',
  TEXT_COLOR: '#ffffff',
  SIGNATURE_TEXT_COLOR: '#fde047',
  TEXT_OUTLINE_COLOR: 'rgba(2, 6, 23, 0.95)',
  TEXT_OUTLINE_WIDTH: 4,
  TEXT_INSET_X: 15,
  FONT_FAMILY: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  FONT_WEIGHT: 800,
  FONT_SIZE_MAX: 38,
  FONT_SIZE_MIN: 22,
  FONT_SIZE_STEP: 2,
  /** Optical centring: bold caps sit slightly high on a `middle` baseline. */
  TEXT_BASELINE_SHIFT: 2,
  ANISOTROPY: 2,
  MIN_TRUNCATED_LENGTH: 3,
  FALLBACK_NAME: 'Viewer',
  SIGNATURE_PREFIX: '★ ',
  /** Session tiers: emblem at the left of the pill, tier-coloured border (thicker from Diamond up). */
  HIGH_TIER_BORDER_WIDTH: 6,
  EMBLEM_SIZE: 46,
  EMBLEM_INSET_X: 12,
  EMBLEM_BODY_STROKE: 1.4,
  EMBLEM_DETAIL_STROKE: 0.9,
  EMBLEM_DETAIL_COLOR: 'rgba(255, 255, 255, 0.55)',
} as const;

interface NameplateLook {
  label: string;
  accentColor: string;
  isGoldText: boolean;
  borderWidth: number;
  tier?: SessionTier;
}

/** Session tier wins over the signature look: the emblem is what viewers climb (and pay) for. */
const resolveNameplateLook = (
  cleanName: string,
  primaryColor: string,
  sigTag: string,
  sessionTier: SessionTier | undefined
): NameplateLook => {
  if (sessionTier) {
    const isHighTier = isSessionTierAtLeast(sessionTier, SESSION_TIER.DIAMOND);
    return {
      // Canonical name: an elite gift summon is labelled "👑 An"; the emblem replaces that prefix
      label: `@${toCanonicalViewerName(cleanName)}`,
      accentColor: SESSION_TIER_STYLE[sessionTier].light,
      isGoldText: isSessionTierAtLeast(sessionTier, SESSION_TIER.MASTER),
      borderWidth: isHighTier ? NAMEPLATE_STYLE.HIGH_TIER_BORDER_WIDTH : NAMEPLATE_STYLE.BORDER_WIDTH,
      tier: sessionTier,
    };
  }
  const isSignature = sigTag.length > 0;
  return {
    label: isSignature ? `${NAMEPLATE_STYLE.SIGNATURE_PREFIX}@${cleanName}` : `@${cleanName}`,
    accentColor: isSignature ? GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR : primaryColor,
    isGoldText: isSignature,
    borderWidth: NAMEPLATE_STYLE.BORDER_WIDTH,
  };
};

/** Same emblem as the DOM badge (shared SVG paths), drawn with Path2D at the left of the pill. */
const drawTierEmblem = (ctx: CanvasRenderingContext2D, tier: SessionTier): void => {
  const style = SESSION_TIER_STYLE[tier];
  const paths = SESSION_TIER_EMBLEM_PATHS[style.shape];
  const scale = NAMEPLATE_STYLE.EMBLEM_SIZE / SESSION_TIER_EMBLEM_VIEWBOX;
  const top = (NAMEPLATE_STYLE.CANVAS_HEIGHT - NAMEPLATE_STYLE.EMBLEM_SIZE) / 2;
  const gradient = ctx.createLinearGradient(0, 0, 0, SESSION_TIER_EMBLEM_VIEWBOX);
  gradient.addColorStop(0, style.light);
  gradient.addColorStop(1, style.dark);

  ctx.save();
  ctx.translate(NAMEPLATE_STYLE.EMBLEM_INSET_X, top);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  if (paths.crown) {
    const crown = new Path2D(paths.crown);
    ctx.fillStyle = style.light;
    ctx.fill(crown);
    ctx.strokeStyle = style.dark;
    ctx.lineWidth = NAMEPLATE_STYLE.EMBLEM_DETAIL_STROKE;
    ctx.stroke(crown);
  }
  const body = new Path2D(paths.body);
  ctx.fillStyle = gradient;
  ctx.fill(body);
  ctx.strokeStyle = style.dark;
  ctx.lineWidth = NAMEPLATE_STYLE.EMBLEM_BODY_STROKE;
  ctx.stroke(body);
  ctx.strokeStyle = NAMEPLATE_STYLE.EMBLEM_DETAIL_COLOR;
  ctx.lineWidth = NAMEPLATE_STYLE.EMBLEM_DETAIL_STROKE;
  ctx.stroke(new Path2D(paths.detail));
  ctx.restore();
};

const buildNameplateFont = (fontSize: number): string =>
  `${NAMEPLATE_STYLE.FONT_WEIGHT} ${fontSize}px ${NAMEPLATE_STYLE.FONT_FAMILY}`;

/** Shrinks the font first, then trims the name, so short names stay big and long ones still fit. */
const fitNameplateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  let fontSize: number = NAMEPLATE_STYLE.FONT_SIZE_MAX;
  ctx.font = buildNameplateFont(fontSize);
  while (ctx.measureText(text).width > maxWidth && fontSize > NAMEPLATE_STYLE.FONT_SIZE_MIN) {
    fontSize -= NAMEPLATE_STYLE.FONT_SIZE_STEP;
    ctx.font = buildNameplateFont(fontSize);
  }
  let fitted = text;
  while (ctx.measureText(fitted).width > maxWidth && fitted.length > NAMEPLATE_STYLE.MIN_TRUNCATED_LENGTH) {
    fitted = `${fitted.slice(0, -2)}…`;
  }
  return fitted;
};

const traceNameplatePill = (ctx: CanvasRenderingContext2D): void => {
  const inset = NAMEPLATE_STYLE.PADDING + NAMEPLATE_STYLE.BORDER_WIDTH / 2;
  const pillWidth = NAMEPLATE_STYLE.CANVAS_WIDTH - inset * 2;
  const pillHeight = NAMEPLATE_STYLE.CANVAS_HEIGHT - inset * 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(inset, inset, pillWidth, pillHeight, NAMEPLATE_STYLE.CORNER_RADIUS);
    return;
  }
  ctx.rect(inset, inset, pillWidth, pillHeight);
};

const drawNameplate = (ctx: CanvasRenderingContext2D, look: NameplateLook): void => {
  const { label, accentColor, isGoldText } = look;
  ctx.clearRect(0, 0, NAMEPLATE_STYLE.CANVAS_WIDTH, NAMEPLATE_STYLE.CANVAS_HEIGHT);

  // Solid dark pill with one crisp accent border (no blurred glow: blur turns to mush when minified)
  traceNameplatePill(ctx);
  ctx.fillStyle = NAMEPLATE_STYLE.BACKGROUND;
  ctx.fill();
  ctx.lineWidth = look.borderWidth;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  // With an emblem the text is centred in the space right of it
  const emblemSpace = look.tier ? NAMEPLATE_STYLE.EMBLEM_INSET_X + NAMEPLATE_STYLE.EMBLEM_SIZE : 0;
  if (look.tier) drawTierEmblem(ctx, look.tier);

  // Centred name with a dark outline instead of a soft shadow, so glyph edges stay hard
  const maxTextWidth = NAMEPLATE_STYLE.CANVAS_WIDTH - NAMEPLATE_STYLE.TEXT_INSET_X * 2 - emblemSpace;
  const fittedLabel = fitNameplateText(ctx, label, maxTextWidth);
  const textX = (NAMEPLATE_STYLE.CANVAS_WIDTH + emblemSpace) / 2;
  const textY = NAMEPLATE_STYLE.CANVAS_HEIGHT / 2 + NAMEPLATE_STYLE.TEXT_BASELINE_SHIFT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = NAMEPLATE_STYLE.TEXT_OUTLINE_WIDTH;
  ctx.strokeStyle = NAMEPLATE_STYLE.TEXT_OUTLINE_COLOR;
  ctx.strokeText(fittedLabel, textX, textY);
  ctx.fillStyle = isGoldText ? NAMEPLATE_STYLE.SIGNATURE_TEXT_COLOR : NAMEPLATE_STYLE.TEXT_COLOR;
  ctx.fillText(fittedLabel, textX, textY);
};

export const getNameplateTexture = (
  _championName: string,
  summonerName: string,
  team: string,
  primaryColor: string,
  signaturePlayerName?: string,
  sessionTier?: SessionTier
): THREE.CanvasTexture => {
  const cleanName = (summonerName || NAMEPLATE_STYLE.FALLBACK_NAME).trim().replace(/^@+/, '');
  const sigTag = signaturePlayerName ? signaturePlayerName.trim() : '';
  const cacheKey = `${team}_${primaryColor}_${cleanName}_${sigTag}_${sessionTier ?? ''}`;
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

  const canvas = document.createElement('canvas');
  canvas.width = NAMEPLATE_STYLE.CANVAS_WIDTH;
  canvas.height = NAMEPLATE_STYLE.CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawNameplate(ctx, resolveNameplateLook(cleanName, primaryColor, sigTag, sessionTier));
  }

  const texture = new THREE.CanvasTexture(canvas);
  // Mipmaps + trilinear + anisotropy: clean downsampling at any token size and camera angle
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = NAMEPLATE_STYLE.ANISOTROPY;
  texture.colorSpace = THREE.SRGBColorSpace;

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
  // Optimized for mass rendering: enable mipmaps with linear downsampling to reduce GPU fillrate & memory bandwidth
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  // Set explicitly: the token shader reads it as a uniform, which skips R3F's automatic sRGB tagging of `map` props
  tex.colorSpace = THREE.SRGBColorSpace;
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
