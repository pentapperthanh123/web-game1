import * as THREE from 'three';

/**
 * One quad + one shader draws the whole static body of a champion token:
 * glow disc, round portrait, border ring, runic ring, satellite gem, HP bar and fury bar.
 * Before, those were 6 (compact) to 12 (full) separate meshes, i.e. that many draw calls per champion.
 *
 * Layers are composited in display space with premultiplied alpha, so additive glows
 * (alpha 0) and normal "over" layers (alpha > 0) blend in a single pass exactly like the
 * old stack of AdditiveBlending / NormalBlending meshes.
 */
export const TOKEN_BODY_LAYOUT = {
  PLANE_WIDTH: 0.44,
  PLANE_HEIGHT: 0.56,
  PLANE_CENTER_Y: 0.056,
  BACKING_RADIUS: 0.19,
  PORTRAIT_RADIUS: 0.17,
  BORDER_RADIUS: 0.175,
  BORDER_HALF_WIDTH: 0.008,
  RUNIC_INNER_RADIUS: 0.2,
  RUNIC_OUTER_RADIUS: 0.212,
  SATELLITE_Y: 0.22,
  SATELLITE_RADIUS: 0.045,
  GAUGE_BORDER_HALF_WIDTH: 0.175,
  GAUGE_BG_HALF_WIDTH: 0.170,
  GAUGE_FILL_HALF_WIDTH: 0.165,
  HP_Y: 0.226,
  HP_BORDER_HALF_HEIGHT: 0.016,
  HP_BG_HALF_HEIGHT: 0.014,
  HP_FILL_HALF_HEIGHT: 0.012,
  FURY_Y: 0.198,
  FURY_BORDER_HALF_HEIGHT: 0.011,
  FURY_BG_HALF_HEIGHT: 0.009,
  FURY_FILL_HALF_HEIGHT: 0.007,
} as const;

export const TOKEN_BODY_OPACITY = {
  BACKING_DISC: 0.22,
  BORDER: 0.88,
  RUNIC_RING: 0.35,
  SATELLITE: 0.0,
  HP_BG: 0.95,
  HP_BORDER: 0.88,
  HP_FILL: 0.98,
  FURY_BG: 0.95,
  FURY_FILL: 0.98,
} as const;

/** Shared by every token; its vertices are already in token-local space. */
export const SHARED_TOKEN_BODY_GEO = new THREE.PlaneGeometry(
  TOKEN_BODY_LAYOUT.PLANE_WIDTH,
  TOKEN_BODY_LAYOUT.PLANE_HEIGHT
).translate(0, TOKEN_BODY_LAYOUT.PLANE_CENTER_Y, 0);

export interface TokenBodyVisuals {
  portrait: THREE.Texture;
  primaryColor: string;
  borderColor: string;
  secondaryColor: string;
  critColor: string;
  gaugeBgColor: string;
  hpRatio: number;
  hpFillColor: string;
  furyRatio: number;
  furyFillColor: string;
  furyBorderColor: string;
  furyBorderOpacity: number;
  isCompact: boolean;
}

const COMPACT_FLAG = { ON: 1, OFF: 0 } as const;

const glslFloat = (value: number): string => value.toFixed(4);

const VERTEX_SHADER = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const L = TOKEN_BODY_LAYOUT;
const O = TOKEN_BODY_OPACITY;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uPortrait;
uniform vec3 uPrimary;
uniform vec3 uBorder;
uniform vec3 uSecondary;
uniform vec3 uCrit;
uniform vec3 uGaugeBg;
uniform vec3 uHpFill;
uniform vec3 uFuryFill;
uniform vec3 uFuryBorder;
uniform float uHpRatio;
uniform float uFuryRatio;
uniform float uFuryBorderOpacity;
uniform float uIsCompact;
varying vec2 vLocal;

vec4 acc = vec4(0.0);

float insideMask(float signedDistance) {
  float edge = fwidth(signedDistance);
  return 1.0 - smoothstep(-edge, edge, signedDistance);
}
float circleMask(vec2 p, float radius) { return insideMask(length(p) - radius); }
float bandMask(vec2 p, float inner, float outer) {
  float d = length(p);
  return insideMask(max(inner - d, d - outer));
}
float rectMask(vec2 p, vec2 center, vec2 halfSize) {
  vec2 q = abs(p - center) - halfSize;
  return insideMask(max(q.x, q.y));
}

// Same output path as a tone-mapped MeshBasicMaterial: tone map, then encode to the output colour space
vec3 toDisplay(vec3 linearColor) {
#ifdef TONE_MAPPING
  linearColor = toneMapping(linearColor);
#endif
  return linearToOutputTexel(vec4(linearColor, 1.0)).rgb;
}
void addLight(vec3 displayColor, float alpha) { acc.rgb += displayColor * alpha; }
void over(vec3 displayColor, float alpha) {
  acc.rgb = displayColor * alpha + acc.rgb * (1.0 - alpha);
  acc.a = alpha + acc.a * (1.0 - alpha);
}

void drawGauge(vec2 p, float y, vec3 halfHeights, float ratio, vec3 fillColor, vec3 borderColor,
               float borderOpacity, float bgOpacity, float fillOpacity) {
  over(toDisplay(borderColor), borderOpacity * rectMask(p, vec2(0.0, y), vec2(${glslFloat(L.GAUGE_BORDER_HALF_WIDTH)}, halfHeights.x)));
  over(toDisplay(uGaugeBg), bgOpacity * rectMask(p, vec2(0.0, y), vec2(${glslFloat(L.GAUGE_BG_HALF_WIDTH)}, halfHeights.y)));
  if (ratio <= 0.0) return;
  float fillHalfWidth = ${glslFloat(L.GAUGE_FILL_HALF_WIDTH)} * ratio;
  float fillCenterX = -${glslFloat(L.GAUGE_FILL_HALF_WIDTH)} * (1.0 - ratio);
  over(toDisplay(fillColor), fillOpacity * rectMask(p, vec2(fillCenterX, y), vec2(fillHalfWidth, halfHeights.z)));
}

void main() {
  vec2 p = vLocal;
  bool isFull = uIsCompact < 0.5;

  addLight(toDisplay(uPrimary), ${glslFloat(O.BACKING_DISC)} * circleMask(p, ${glslFloat(L.BACKING_RADIUS)}));

  // Portrait is not tone mapped (toneMapped=false on the old portrait mesh)
  vec4 portrait = texture2D(uPortrait, p / ${glslFloat(L.PORTRAIT_RADIUS * 2)} + 0.5);
  // Boost contrast & clarity so champion facial details are sharp and vivid inside the token
  vec3 enhancedPortrait = clamp((portrait.rgb - 0.5) * 1.15 + 0.52, 0.0, 1.0);
  over(linearToOutputTexel(vec4(enhancedPortrait, 1.0)).rgb, portrait.a * circleMask(p, ${glslFloat(L.PORTRAIT_RADIUS)}));

  addLight(toDisplay(uBorder), ${glslFloat(O.BORDER)} * bandMask(
    p, ${glslFloat(L.BORDER_RADIUS - L.BORDER_HALF_WIDTH)}, ${glslFloat(L.BORDER_RADIUS + L.BORDER_HALF_WIDTH)}));

  if (isFull) {
    addLight(toDisplay(uSecondary), ${glslFloat(O.RUNIC_RING)} * bandMask(
      p, ${glslFloat(L.RUNIC_INNER_RADIUS)}, ${glslFloat(L.RUNIC_OUTER_RADIUS)}));
    vec2 gem = abs(p - vec2(0.0, ${glslFloat(L.SATELLITE_Y)}));
    addLight(toDisplay(uCrit), ${glslFloat(O.SATELLITE)} * insideMask(gem.x + gem.y - ${glslFloat(L.SATELLITE_RADIUS)}));
  }

  drawGauge(p, ${glslFloat(L.HP_Y)},
    vec3(${glslFloat(L.HP_BORDER_HALF_HEIGHT)}, ${glslFloat(L.HP_BG_HALF_HEIGHT)}, ${glslFloat(L.HP_FILL_HALF_HEIGHT)}),
    uHpRatio, uHpFill, uPrimary,
    ${glslFloat(O.HP_BORDER)}, ${glslFloat(O.HP_BG)}, ${glslFloat(O.HP_FILL)});

  if (isFull) {
    drawGauge(p, ${glslFloat(L.FURY_Y)},
      vec3(${glslFloat(L.FURY_BORDER_HALF_HEIGHT)}, ${glslFloat(L.FURY_BG_HALF_HEIGHT)}, ${glslFloat(L.FURY_FILL_HALF_HEIGHT)}),
      uFuryRatio, uFuryFill, uFuryBorder,
      uFuryBorderOpacity, ${glslFloat(O.FURY_BG)}, ${glslFloat(O.FURY_FILL)});
  }

  if (acc.a <= 0.0 && dot(acc.rgb, acc.rgb) <= 0.0) discard;
  gl_FragColor = acc;
}
`;

export const createTokenBodyMaterial = (): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: {
      uPortrait: { value: null },
      uPrimary: { value: new THREE.Color() },
      uBorder: { value: new THREE.Color() },
      uSecondary: { value: new THREE.Color() },
      uCrit: { value: new THREE.Color() },
      uGaugeBg: { value: new THREE.Color() },
      uHpFill: { value: new THREE.Color() },
      uFuryFill: { value: new THREE.Color() },
      uFuryBorder: { value: new THREE.Color() },
      uHpRatio: { value: 1 },
      uFuryRatio: { value: 0 },
      uFuryBorderOpacity: { value: 1 },
      uIsCompact: { value: COMPACT_FLAG.OFF },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    // The shader outputs premultiplied colour: ONE / ONE_MINUS_SRC_ALPHA covers additive and "over" layers
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });

/** Pushes the token's current look into the material uniforms (only called when the token re-renders). */
export const syncTokenBodyMaterial = (material: THREE.ShaderMaterial, visuals: TokenBodyVisuals): void => {
  const uniforms = material.uniforms;
  uniforms.uPortrait.value = visuals.portrait;
  (uniforms.uPrimary.value as THREE.Color).set(visuals.primaryColor);
  (uniforms.uBorder.value as THREE.Color).set(visuals.borderColor);
  (uniforms.uSecondary.value as THREE.Color).set(visuals.secondaryColor);
  (uniforms.uCrit.value as THREE.Color).set(visuals.critColor);
  (uniforms.uGaugeBg.value as THREE.Color).set(visuals.gaugeBgColor);
  (uniforms.uHpFill.value as THREE.Color).set(visuals.hpFillColor);
  (uniforms.uFuryFill.value as THREE.Color).set(visuals.furyFillColor);
  (uniforms.uFuryBorder.value as THREE.Color).set(visuals.furyBorderColor);
  uniforms.uHpRatio.value = visuals.hpRatio;
  uniforms.uFuryRatio.value = visuals.furyRatio;
  uniforms.uFuryBorderOpacity.value = visuals.furyBorderOpacity;
  uniforms.uIsCompact.value = visuals.isCompact ? COMPACT_FLAG.ON : COMPACT_FLAG.OFF;
};
