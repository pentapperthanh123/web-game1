import * as THREE from 'three';
import { METEOR_VFX } from './meteorVfxConstants';
import { getSoftGlowTexture, getSoftRingTexture } from '../bossSkill/bossSkill3DShared';

/** Every instanced layer of the meteor effect, listed in draw order (ground decals first, flash last). */
export const METEOR_LAYER = {
  SCORCH: 'scorch',
  MARKER_FILL: 'markerFill',
  MARKER_RING: 'markerRing',
  SHOCKWAVE: 'shockwave',
  TRAIL_OUTER: 'trailOuter',
  TRAIL_INNER: 'trailInner',
  HEAD_GLOW: 'headGlow',
  HEAD_CORE: 'headCore',
  SPARK: 'spark',
  FLASH: 'flash',
} as const;
export type MeteorLayerKey = (typeof METEOR_LAYER)[keyof typeof METEOR_LAYER];

const RGB_COMPONENTS = 3;
const ROCK_FACE_VERTICES = 3;
const ROCK_MIN_FACE_BRIGHTNESS = 0.62;
const ROCK_FACE_BRIGHTNESS_STEP = 0.381966;
const ROCK_FACE_BRIGHTNESS_RANGE = 1 - ROCK_MIN_FACE_BRIGHTNESS;
const ROCK_DETAIL = 0;
const UNIT_SIZE = 1;
const HALF_UNIT = 0.5;
const SPARK_GEO_RADIUS = 0.5;

/** Faceted rock: per-face brightness baked into vertex colours reads as glowing, uneven stone. */
const createRockGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.IcosahedronGeometry(METEOR_VFX.HEAD_CORE_RADIUS, ROCK_DETAIL);
  const vertexCount = geometry.getAttribute('position').count;
  const colors = new Float32Array(vertexCount * RGB_COMPONENTS);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const face = Math.floor(vertex / ROCK_FACE_VERTICES);
    const shade = (face * ROCK_FACE_BRIGHTNESS_STEP) % 1;
    const brightness = ROCK_MIN_FACE_BRIGHTNESS + shade * ROCK_FACE_BRIGHTNESS_RANGE;
    colors.fill(brightness, vertex * RGB_COMPONENTS, (vertex + 1) * RGB_COMPONENTS);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, RGB_COMPONENTS));
  return geometry;
};

/** Open cone from y=0 (wide, at the head) to y=1 (tip); brightness fades toward the tip via vertex colours. */
const createTrailGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.ConeGeometry(
    UNIT_SIZE,
    UNIT_SIZE,
    METEOR_VFX.TRAIL_RADIAL_SEGMENTS,
    METEOR_VFX.TRAIL_HEIGHT_SEGMENTS,
    true,
  );
  geometry.translate(0, HALF_UNIT, 0);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * RGB_COMPONENTS);
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const brightness = Math.pow(1 - positions.getY(vertex), METEOR_VFX.TRAIL_FALLOFF_POWER);
    colors.fill(brightness, vertex * RGB_COMPONENTS, (vertex + 1) * RGB_COMPONENTS);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, RGB_COMPONENTS));
  return geometry;
};

const FLAT_QUAD_GEO = new THREE.PlaneGeometry(UNIT_SIZE, UNIT_SIZE).rotateX(-Math.PI / 2);
const BILLBOARD_QUAD_GEO = new THREE.PlaneGeometry(UNIT_SIZE, UNIT_SIZE);
const ROCK_GEO = createRockGeometry();
const TRAIL_GEO = createTrailGeometry();
const SPARK_GEO = new THREE.OctahedronGeometry(SPARK_GEO_RADIUS, ROCK_DETAIL);

interface MaterialOptions {
  opacity: number;
  map?: THREE.Texture;
  hasVertexColors?: boolean;
}

const createGlowMaterial = ({ opacity, map, hasVertexColors = false }: MaterialOptions): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    map: map ?? null,
    vertexColors: hasVertexColors,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

interface LayerSpec {
  geometry: THREE.BufferGeometry;
  capacity: number;
  createMaterial: () => THREE.MeshBasicMaterial;
}

const FALL = METEOR_VFX.FALL_CAPACITY;
const IMPACTS = METEOR_VFX.IMPACT_CAPACITY;

const LAYER_SPECS: Readonly<Record<MeteorLayerKey, LayerSpec>> = {
  [METEOR_LAYER.SCORCH]: {
    geometry: FLAT_QUAD_GEO,
    capacity: IMPACTS,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.IMPACT_SCORCH_OPACITY, map: getSoftGlowTexture() }),
  },
  [METEOR_LAYER.MARKER_FILL]: {
    geometry: FLAT_QUAD_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.MARKER_FILL_OPACITY, map: getSoftGlowTexture() }),
  },
  [METEOR_LAYER.MARKER_RING]: {
    geometry: FLAT_QUAD_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.MARKER_RING_OPACITY, map: getSoftRingTexture() }),
  },
  [METEOR_LAYER.SHOCKWAVE]: {
    geometry: FLAT_QUAD_GEO,
    capacity: IMPACTS,
    createMaterial: () =>
      createGlowMaterial({ opacity: METEOR_VFX.IMPACT_SHOCKWAVE_OPACITY, map: getSoftRingTexture() }),
  },
  [METEOR_LAYER.TRAIL_OUTER]: {
    geometry: TRAIL_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.TRAIL_OUTER_OPACITY, hasVertexColors: true }),
  },
  [METEOR_LAYER.TRAIL_INNER]: {
    geometry: TRAIL_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.TRAIL_INNER_OPACITY, hasVertexColors: true }),
  },
  [METEOR_LAYER.HEAD_GLOW]: {
    geometry: BILLBOARD_QUAD_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.HEAD_GLOW_OPACITY, map: getSoftGlowTexture() }),
  },
  [METEOR_LAYER.HEAD_CORE]: {
    geometry: ROCK_GEO,
    capacity: FALL,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.HEAD_CORE_OPACITY, hasVertexColors: true }),
  },
  [METEOR_LAYER.SPARK]: {
    geometry: SPARK_GEO,
    capacity: IMPACTS * METEOR_VFX.SPARKS_PER_IMPACT,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.SPARK_OPACITY }),
  },
  [METEOR_LAYER.FLASH]: {
    geometry: BILLBOARD_QUAD_GEO,
    capacity: IMPACTS,
    createMaterial: () => createGlowMaterial({ opacity: METEOR_VFX.IMPACT_FLASH_OPACITY, map: getSoftGlowTexture() }),
  },
};

export interface InstancedLayer {
  key: MeteorLayerKey;
  mesh: THREE.InstancedMesh;
  material: THREE.MeshBasicMaterial;
  capacity: number;
  count: number;
}

export interface MeteorLayers {
  byKey: Record<MeteorLayerKey, InstancedLayer>;
  list: InstancedLayer[];
}

const createLayer = (key: MeteorLayerKey, drawOrder: number): InstancedLayer => {
  const spec = LAYER_SPECS[key];
  const material = spec.createMaterial();
  const mesh = new THREE.InstancedMesh(spec.geometry, material, spec.capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(spec.capacity * RGB_COMPONENTS), RGB_COMPONENTS);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = drawOrder;
  mesh.count = 0;
  return { key, mesh, material, capacity: spec.capacity, count: 0 };
};

export const createMeteorLayers = (): MeteorLayers => {
  const keys = Object.values(METEOR_LAYER);
  const list = keys.map((key, drawOrder) => createLayer(key, drawOrder));
  const byKey = Object.fromEntries(list.map((layer) => [layer.key, layer])) as Record<MeteorLayerKey, InstancedLayer>;
  return { byKey, list };
};

/** Geometries and textures are shared for the session; only per-mount materials and instance buffers go. */
export const disposeMeteorLayers = (layers: MeteorLayers): void => {
  layers.list.forEach((layer) => {
    layer.material.dispose();
    layer.mesh.dispose();
  });
};

export const beginMeteorLayers = (layers: MeteorLayers): void => {
  layers.list.forEach((layer) => {
    layer.count = 0;
  });
};

export const commitMeteorLayers = (layers: MeteorLayers): void => {
  layers.list.forEach((layer) => {
    const { mesh } = layer;
    mesh.count = layer.count;
    if (layer.count === 0) return;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
};

const scratchMatrix = new THREE.Matrix4();
const scratchColor = new THREE.Color();

/** Appends one instance; `intensity` scales the colour, which under additive blending is the fade. */
export const pushMeteorInstance = (
  layer: InstancedLayer,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
  color: THREE.Color,
  intensity: number,
): void => {
  if (layer.count >= layer.capacity || intensity <= 0) return;
  scratchMatrix.compose(position, quaternion, scale);
  layer.mesh.setMatrixAt(layer.count, scratchMatrix);
  scratchColor.copy(color).multiplyScalar(intensity);
  layer.mesh.setColorAt(layer.count, scratchColor);
  layer.count += 1;
};

const colorCache = new Map<string, THREE.Color>();

/** Parses each CSS colour once; the per-frame loop only does Map lookups. */
export const resolveCachedColor = (css: string): THREE.Color => {
  const cached = colorCache.get(css);
  if (cached) return cached;
  const parsed = new THREE.Color(css);
  colorCache.set(css, parsed);
  return parsed;
};
