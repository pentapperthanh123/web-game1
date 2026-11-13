import * as THREE from 'three';

/**
 * Fresnel force-field: bright at the silhouette, almost clear in the middle so the boss stays readable.
 * The surface carries a faint hex lattice + scrolling energy bands, and a hit ripple travelling to the rim.
 */
const FORCE_FIELD_VERTEX_SHADER = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vViewDir;
varying vec3 vObjDir;
varying vec2 vUv;

void main() {
  vUv = uv;
  vObjDir = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FORCE_FIELD_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRimColor;
uniform float uTime;
uniform float uOpacity;
uniform float uStrength;
uniform float uHitProgress;
uniform float uHitStrength;

varying vec3 vNormalView;
varying vec3 vViewDir;
varying vec3 vObjDir;
varying vec2 vUv;

const float FRESNEL_POWER = 2.6;
const float RIM_ALPHA = 0.8;
const float RIM_HIT_BOOST = 0.35;
const float MAX_ALPHA = 0.9;

// Hex lattice: HEX_COLUMNS must be an integer so the longitude seam lines up.
const float HEX_COLUMNS = 22.0;
const float HEX_ROWS = 7.0;
const float HEX_LINE_WIDTH = 0.05;
const float HEX_ALPHA = 0.06;
const float CELL_GLOW_ALPHA = 0.05;
const float CELL_SHIMMER_SPEED = 1.7;
const float CELL_SHIMMER_SHARPNESS = 8.0;
const float CELL_DROPOUT_MAX = 0.65;
const float POLE_FADE_WIDTH = 0.3;
const vec2 HEX_RATIO = vec2(1.0, 1.7320508);
const vec2 HASH_SEED = vec2(127.1, 311.7);
const float HASH_SCALE = 43758.5453;
const float TAU = 6.2831853;

// Energy bands scrolling over the surface.
const float BAND_FREQUENCY = 9.0;
const float BAND_SPEED = 1.6;
const float BAND_WARP = 0.6;
const float BAND_WARP_LOBES = 3.0;
const float BAND_WARP_SPEED = 0.7;
const float BAND_SHARPNESS = 10.0;
const float BAND_ALPHA = 0.04;

// Hit ripple.
const float RIPPLE_WIDTH = 0.14;
const float RIPPLE_ALPHA = 0.05;
const float INTERIOR_RIM_GAIN = 2.0;
const float MAX_INTERIOR_ALPHA = 0.15;
const float RIPPLE_TINT = 0.5;

float hash21(vec2 cell) {
  return fract(sin(dot(cell, HASH_SEED)) * HASH_SCALE);
}

// xy = position inside the hex cell, zw = cell id.
vec4 hexCoords(vec2 point) {
  vec4 centers = floor(vec4(point, point - vec2(0.5, 1.0)) / HEX_RATIO.xyxy) + 0.5;
  vec4 offsets = vec4(point - centers.xy * HEX_RATIO, point - (centers.zw + 0.5) * HEX_RATIO);
  bool isFirstGrid = dot(offsets.xy, offsets.xy) < dot(offsets.zw, offsets.zw);
  if (isFirstGrid) return vec4(offsets.xy, centers.xy);
  return vec4(offsets.zw, centers.zw + 0.5);
}

float hexEdgeDistance(vec2 local) {
  vec2 folded = abs(local);
  return 0.5 - max(dot(folded, HEX_RATIO * 0.5), folded.x);
}

float hexPattern() {
  vec4 hex = hexCoords(vec2(vUv.x * HEX_COLUMNS, vUv.y * HEX_ROWS * HEX_RATIO.y));
  float cellHash = hash21(hex.zw);
  float isCellAlive = step((1.0 - uStrength) * CELL_DROPOUT_MAX, cellHash);
  float line = 1.0 - smoothstep(0.0, HEX_LINE_WIDTH, hexEdgeDistance(hex.xy));
  float shimmer = pow(0.5 + 0.5 * sin(uTime * CELL_SHIMMER_SPEED + cellHash * TAU), CELL_SHIMMER_SHARPNESS);
  float poleFade = smoothstep(0.0, POLE_FADE_WIDTH, 1.0 - abs(vObjDir.y));
  return (line * HEX_ALPHA + shimmer * CELL_GLOW_ALPHA) * poleFade * isCellAlive;
}

float energyBands() {
  float longitude = atan(vObjDir.z, vObjDir.x);
  float warp = sin(longitude * BAND_WARP_LOBES + uTime * BAND_WARP_SPEED) * BAND_WARP;
  float phase = vObjDir.y * BAND_FREQUENCY - uTime * BAND_SPEED + warp;
  return pow(0.5 + 0.5 * sin(phase), BAND_SHARPNESS) * BAND_ALPHA;
}

void main() {
  float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, FRESNEL_POWER);
  float ripple = (1.0 - smoothstep(0.0, RIPPLE_WIDTH, abs((1.0 - facing) - uHitProgress))) * uHitStrength;

  float interior = min(hexPattern() + energyBands() + ripple * RIPPLE_ALPHA, MAX_INTERIOR_ALPHA);
  float rim = fresnel * (RIM_ALPHA + uHitStrength * RIM_HIT_BOOST);
  float alpha = min((rim + interior * (1.0 + fresnel * INTERIOR_RIM_GAIN)) * uOpacity, MAX_ALPHA);

  vec3 color = mix(uColor, uRimColor, clamp(fresnel + ripple * RIPPLE_TINT, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;

export interface ForceFieldUniforms {
  [uniform: string]: THREE.IUniform;
  uColor: THREE.IUniform<THREE.Color>;
  uRimColor: THREE.IUniform<THREE.Color>;
  uTime: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uStrength: THREE.IUniform<number>;
  uHitProgress: THREE.IUniform<number>;
  uHitStrength: THREE.IUniform<number>;
}

export interface ForceFieldMaterialBundle {
  material: THREE.ShaderMaterial;
  uniforms: ForceFieldUniforms;
}

export const createForceFieldMaterial = (baseColor: string, rimColor: string): ForceFieldMaterialBundle => {
  const uniforms: ForceFieldUniforms = {
    uColor: { value: new THREE.Color(baseColor) },
    uRimColor: { value: new THREE.Color(rimColor) },
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uStrength: { value: 1 },
    uHitProgress: { value: 0 },
    uHitStrength: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FORCE_FIELD_VERTEX_SHADER,
    fragmentShader: FORCE_FIELD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  return { material, uniforms };
};
