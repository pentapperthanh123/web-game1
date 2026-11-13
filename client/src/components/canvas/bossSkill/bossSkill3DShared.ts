import { useEffect } from 'react';
import * as THREE from 'three';
import { ActiveBossSkillBanner, BossSkillVfxType } from '../../../types/bossSkill';
import { BOSS_SKILL_VFX_DEFAULT_COUNT, BOSS_SKILL_VFX_DURATION_MS } from '../../../constants/bossSkillVfx';
import { TEAM_KEY } from '../../../constants/game';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import { unprojectScreenToWorld } from '../summon/summonShared';

export type SkillDirection3D = -1 | 0 | 1;

export type Vec3Tuple = readonly [number, number, number];

export interface SkillVfx3DProps {
  color: string;
  secondaryColor: string;
  scale: number;
  count: number;
  direction: SkillDirection3D;
  startedAt: number;
  durationMs: number;
  /** World position of the boss jaw on screen at cast time (breath, spit, lobbed orbs). */
  mouthOrigin: Vec3Tuple;
  /** World position of the boss eye at cast time (beams). */
  eyeOrigin: Vec3Tuple;
  /** Where body-centred bursts gather; the jaw for mouth-breath skills. */
  coreOrigin: Vec3Tuple;
}

export type SkillVfxStyleProps = Omit<SkillVfx3DProps, 'mouthOrigin' | 'eyeOrigin' | 'coreOrigin'>;

/** World anchors shared by every archetype (match BossVoidAttack / champion wings). */
export const BOSS_3D_ANCHORS = {
  MOUTH: [0, 0.65, 0.2] as const,
  EYE: [0, 0.95, 0.35] as const,
  GROUND_Y: -1.7,
  /** Champion wings sit roughly ±1.8 on X. */
  WING_X: 1.8,
  SKY_Y: 6.5,
} as const;

/** Small lift so ground decals never z-fight with the arena floor. */
export const GROUND_DECAL_LIFT = 0.03;
/** Rotation that lays a plane/ring flat on the floor. */
export const FLAT_ON_GROUND: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

const DEFAULT_SCALE = 1;
const LANDING_SPREAD = 1.6;
const CENTER_LANDING_SPREAD = 2.4;
const SEED_MODULUS = 233280;
const SEED_MULTIPLIER = 9301;
const SEED_INCREMENT = 49297;

export const resolveDirection3D = (targetTeam: ActiveBossSkillBanner['targetTeam']): SkillDirection3D => {
  if (targetTeam === TEAM_KEY.BLG) return -1;
  if (targetTeam === TEAM_KEY.GENG) return 1;
  return 0;
};

const CORE_FALLBACK: Vec3Tuple = [0, 0.5, 0.3];

/**
 * Projects a Boss2D anchor marker (see BossSpriteAnchorMarkers) onto the 3D plane at
 * the fallback's depth, so effects launch from where the sprite really is on screen.
 */
export const resolveBossAnchorWorld = (elementId: string, fallback: Vec3Tuple): Vec3Tuple => {
  if (typeof document === 'undefined') return fallback;
  const marker = document.getElementById(elementId);
  if (!marker) return fallback;
  const rect = marker.getBoundingClientRect();
  return unprojectScreenToWorld(rect.left, rect.top, fallback[2]) ?? fallback;
};

/** Full props for one cast, including anchors read from the DOM. Call once per cast. */
export const buildSkillVfx3DProps = (banner: ActiveBossSkillBanner, vfxType: BossSkillVfxType): SkillVfx3DProps => {
  const mouthOrigin = resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.MOUTH, BOSS_3D_ANCHORS.MOUTH);
  const isMouthBreath = Boolean(banner.vfxParams?.isMouthBreath);
  const coreOrigin = isMouthBreath
    ? mouthOrigin
    : resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.CORE, CORE_FALLBACK);
  return {
    ...buildSkillVfxStyleProps(banner, vfxType),
    mouthOrigin,
    eyeOrigin: resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.EYE, BOSS_3D_ANCHORS.EYE),
    coreOrigin,
  };
};

/** Timing/look part of the props; DOM-free and cheap. */
export const buildSkillVfxStyleProps = (banner: ActiveBossSkillBanner, vfxType: BossSkillVfxType): SkillVfxStyleProps => ({
  color: banner.color,
  secondaryColor: banner.vfxParams?.secondaryColor ?? banner.color,
  scale: banner.vfxParams?.scale ?? DEFAULT_SCALE,
  count: banner.vfxParams?.count ?? BOSS_SKILL_VFX_DEFAULT_COUNT[vfxType],
  direction: resolveDirection3D(banner.targetTeam),
  startedAt: banner.timestamp,
  durationMs: BOSS_SKILL_VFX_DURATION_MS[vfxType],
});

/** 0..1 progress since the cast; > 1 once finished. */
export const computeProgress = (startedAt: number, durationMs: number): number =>
  (Date.now() - startedAt) / durationMs;

/* ------------------------------------------------------------------ easing */

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

export const easeInCubic = (value: number): number => Math.pow(clamp01(value), 3);

export const easeOutExpo = (value: number): number => {
  const clamped = clamp01(value);
  if (clamped >= 1) return 1;
  return 1 - Math.pow(2, -10 * clamped);
};

export const easeInOutSine = (value: number): number => -(Math.cos(Math.PI * clamp01(value)) - 1) / 2;

const BACK_OVERSHOOT = 1.70158;
/** Ease-out with a small overshoot — good for things that "pop" into place. */
export const easeOutBack = (value: number): number => {
  const shifted = clamp01(value) - 1;
  return 1 + (BACK_OVERSHOOT + 1) * Math.pow(shifted, 3) + BACK_OVERSHOOT * Math.pow(shifted, 2);
};

/** Pulse that rises then falls over the clip (0 → 1 → 0). */
export const bellCurve = (value: number): number => Math.sin(clamp01(value) * Math.PI);

/** Fast drop with a soft lingering tail — the default "dissipate" curve. */
export const fadeOut = (value: number): number => Math.pow(1 - clamp01(value), 2);

/** Remaps progress into a 0..1 window (`start` → 0, `end` → 1), clamped. */
export const phaseProgress = (progress: number, start: number, end: number): number =>
  clamp01((progress - start) / (end - start));

/**
 * Anticipation → impact → dissipate envelope: eases in until `attackEnd`, holds at 1,
 * then fades with a soft tail from `releaseStart` to the end of the clip.
 */
export const envelope = (progress: number, attackEnd: number, releaseStart: number): number => {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < attackEnd) return easeOutCubic(progress / attackEnd);
  if (progress < releaseStart) return 1;
  return fadeOut((progress - releaseStart) / (1 - releaseStart));
};

/* ------------------------------------------------------------ randomness */

/** Deterministic pseudo-random list per cast so the layout never reshuffles between frames. */
export const seededValues = (seed: number, count: number): number[] => {
  const values: number[] = [];
  let state = seed % SEED_MODULUS;
  for (let index = 0; index < count; index += 1) {
    state = (state * SEED_MULTIPLIER + SEED_INCREMENT) % SEED_MODULUS;
    values.push(state / SEED_MODULUS);
  }
  return values;
};

/** Landing X for projectile-style effects given the side under attack. */
export const resolveLandingX = (direction: SkillDirection3D, random: number): number => {
  const spread = (random - 0.5) * LANDING_SPREAD;
  if (direction === 0) return (random - 0.5) * BOSS_3D_ANCHORS.WING_X * CENTER_LANDING_SPREAD;
  return direction * BOSS_3D_ANCHORS.WING_X + spread;
};

/* --------------------------------------------------------------- opacity */

const OPACITY_SCALE_KEY = 'vfxOpacityScale';

/**
 * `userData` for a layer whose opacity should stay a fraction of its group's.
 * Lets one `setMaterialOpacity(group, x)` drive a core/glow/halo stack with different strengths.
 */
export const opacityLayer = (opacityScale: number): Record<string, number> => ({ [OPACITY_SCALE_KEY]: opacityScale });

const readOpacityScale = (object: THREE.Object3D): number => {
  const stored: unknown = object.userData[OPACITY_SCALE_KEY];
  return typeof stored === 'number' ? stored : 1;
};

const applyOpacity = (material: THREE.Material | THREE.Material[], opacity: number): void => {
  if (Array.isArray(material)) {
    material.forEach((entry) => {
      entry.opacity = opacity;
    });
    return;
  }
  material.opacity = opacity;
};

const hasMaterial = (object: THREE.Object3D): object is THREE.Mesh | THREE.Line | THREE.Sprite =>
  object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite;

const applyOpacityToBranch = (node: THREE.Object3D, inherited: number): void => {
  const nodeOpacity = inherited * readOpacityScale(node);
  if (hasMaterial(node)) applyOpacity(node.material, nodeOpacity);
  node.children.forEach((child) => applyOpacityToBranch(child, nodeOpacity));
};

/**
 * Sets the opacity of an object and every descendant. Each layer's `opacityLayer()` multiplier
 * (compounded down the tree) is preserved, so a core/glow/halo stack keeps its relative strengths.
 */
export const setMaterialOpacity = (object: THREE.Object3D | null | undefined, opacity: number): void => {
  if (!object) return;
  applyOpacityToBranch(object, opacity);
};

/* -------------------------------------------------------------- materials */

/** Base props for every glowing VFX material: additive, never writes depth, never tone-mapped. */
export const ADDITIVE_MATERIAL_PROPS = {
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const;

export const ADDITIVE_DOUBLE_SIDED_PROPS = { ...ADDITIVE_MATERIAL_PROPS, side: THREE.DoubleSide } as const;

export const createAdditiveMaterial = (color: string, opacity = 0.9): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ ...ADDITIVE_DOUBLE_SIDED_PROPS, color, opacity });

/* --------------------------------------------------------------- textures */

const GLOW_TEXTURE_SIZE = 128;
type GradientStop = readonly [offset: number, alpha: number];

/** Soft round falloff — halos, flashes, sparks and ground glow decals. */
const SOFT_GLOW_STOPS: readonly GradientStop[] = [
  [0, 1],
  [0.2, 0.75],
  [0.45, 0.28],
  [0.7, 0.08],
  [1, 0],
];

/** Thin bright band near the rim — shockwave rings that fade inward and outward. */
const SOFT_RING_STOPS: readonly GradientStop[] = [
  [0, 0],
  [0.55, 0],
  [0.78, 0.35],
  [0.88, 1],
  [0.94, 0.35],
  [1, 0],
];

const textureCache = new Map<string, THREE.Texture>();

const createRadialTexture = (stops: readonly GradientStop[]): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = GLOW_TEXTURE_SIZE;
  canvas.height = GLOW_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const half = GLOW_TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    stops.forEach(([offset, alpha]) => gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`));
    context.fillStyle = gradient;
    context.fillRect(0, 0, GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const getCachedTexture = (key: string, stops: readonly GradientStop[]): THREE.Texture => {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const texture = createRadialTexture(stops);
  textureCache.set(key, texture);
  return texture;
};

/** Lazily created once, shared by every effect for the whole session. */
export const getSoftGlowTexture = (): THREE.Texture => getCachedTexture('softGlow', SOFT_GLOW_STOPS);
export const getSoftRingTexture = (): THREE.Texture => getCachedTexture('softRing', SOFT_RING_STOPS);

/** Unit quad shared by all textured decals / streaks. */
export const SHARED_QUAD_GEO = new THREE.PlaneGeometry(1, 1);

/* -------------------------------------------------------------- lifecycle */

interface Disposable {
  dispose: () => void;
}

/** Disposes per-cast GPU resources (geometries/materials built in useMemo) when they change or unmount. */
export const useDisposeOnUnmount = (resources: readonly Disposable[]): void => {
  useEffect(() => () => resources.forEach((resource) => resource.dispose()), [resources]);
};

/* ---------------------------------------------------------------- ribbons */

/** Plane a ribbon is widened in: XY for vertical bolts facing the camera, XZ for cracks lying on the floor. */
export const RIBBON_PLANE = {
  XY: 'XY',
  XZ: 'XZ',
} as const;
export type RibbonPlane = (typeof RIBBON_PLANE)[keyof typeof RIBBON_PLANE];

const VERTICES_PER_RIBBON_POINT = 2;
const XYZ = 3;
const MIN_TANGENT_LENGTH = 1e-6;

/** A strip of quads with `pointCount` cross-sections; fill it with `writeRibbon`. Lines are 1px in WebGL, ribbons are not. */
export const createRibbonGeometry = (pointCount: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * VERTICES_PER_RIBBON_POINT * XYZ);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, XYZ));
  const indices: number[] = [];
  for (let point = 0; point < pointCount - 1; point += 1) {
    const left = point * VERTICES_PER_RIBBON_POINT;
    indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2);
  }
  geometry.setIndex(indices);
  return geometry;
};

/**
 * Writes the ribbon cross-sections around `points` (xyz triples). `taper` 0 keeps a constant width,
 * 1 narrows the first point to nothing. Allocation-free, safe to call every frame.
 */
export const writeRibbon = (
  geometry: THREE.BufferGeometry,
  points: Float32Array,
  halfWidth: number,
  taper: number,
  plane: RibbonPlane,
): void => {
  const attribute = geometry.getAttribute('position');
  if (!(attribute instanceof THREE.BufferAttribute)) return;
  const output = attribute.array;
  const pointCount = points.length / XYZ;
  for (let point = 0; point < pointCount; point += 1) {
    const previous = Math.max(0, point - 1) * XYZ;
    const next = Math.min(pointCount - 1, point + 1) * XYZ;
    const tangentX = points[next] - points[previous];
    const tangentSecond = plane === RIBBON_PLANE.XY ? points[next + 1] - points[previous + 1] : points[next + 2] - points[previous + 2];
    const length = Math.max(MIN_TANGENT_LENGTH, Math.hypot(tangentX, tangentSecond));
    const width = halfWidth * (1 - taper * (1 - point / Math.max(1, pointCount - 1)));
    const offsetX = (-tangentSecond / length) * width;
    const offsetSecond = (tangentX / length) * width;
    const base = point * XYZ;
    const out = point * VERTICES_PER_RIBBON_POINT * XYZ;
    const secondAxis = plane === RIBBON_PLANE.XY ? 1 : 2;
    const thirdAxis = plane === RIBBON_PLANE.XY ? 2 : 1;
    output[out] = points[base] + offsetX;
    output[out + secondAxis] = points[base + secondAxis] + offsetSecond;
    output[out + thirdAxis] = points[base + thirdAxis];
    output[out + XYZ] = points[base] - offsetX;
    output[out + XYZ + secondAxis] = points[base + secondAxis] - offsetSecond;
    output[out + XYZ + thirdAxis] = points[base + thirdAxis];
  }
  attribute.needsUpdate = true;
};

/** Per-item delay that never pushes the last item's `span`-long window past the end of the clip. */
export const fitStagger = (maxStagger: number, span: number, count: number): number =>
  Math.min(maxStagger, (1 - span) / Math.max(1, count - 1));
