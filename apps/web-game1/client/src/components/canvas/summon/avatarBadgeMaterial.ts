import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS } from '../../../constants/game';

const BADGE_SIZE = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.BADGE_SIZE;

export const AVATAR_BADGE_LAYOUT = {
  PLANE_SIZE: BADGE_SIZE,
  PORTRAIT_RADIUS: BADGE_SIZE * 0.42,
  BORDER_INNER_RADIUS: BADGE_SIZE * 0.405,
  BORDER_OUTER_RADIUS: BADGE_SIZE * 0.455,
  OUTER_GLOW_INNER_RADIUS: BADGE_SIZE * 0.44,
  OUTER_GLOW_OUTER_RADIUS: BADGE_SIZE * 0.495,
  BORDER_OPACITY: 0.96,
  VIP_GLOW_OPACITY: 0.65,
  NORMAL_GLOW_OPACITY: 0.22,
} as const;

export const SHARED_AVATAR_BADGE_GEO = new THREE.PlaneGeometry(
  AVATAR_BADGE_LAYOUT.PLANE_SIZE,
  AVATAR_BADGE_LAYOUT.PLANE_SIZE
);

export interface AvatarBadgeVisuals {
  avatarTexture: THREE.Texture;
  borderColor: string;
  glowColor: string;
  isVip: boolean;
}

const VIP_FLAG = { ON: 1, OFF: 0 } as const;

const glslFloat = (value: number): string => value.toFixed(4);

const VERTEX_SHADER = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const L = AVATAR_BADGE_LAYOUT;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uAvatar;
uniform vec3 uBorderColor;
uniform vec3 uGlowColor;
uniform float uIsVip;
varying vec2 vLocal;

vec4 acc = vec4(0.0);

float insideMask(float signedDistance) {
  float edge = fwidth(signedDistance);
  return 1.0 - smoothstep(-edge, edge, signedDistance);
}

float circleMask(vec2 p, float radius) {
  return insideMask(length(p) - radius);
}

float bandMask(vec2 p, float inner, float outer) {
  float d = length(p);
  return insideMask(max(inner - d, d - outer));
}

vec3 toDisplay(vec3 linearColor) {
#ifdef TONE_MAPPING
  linearColor = toneMapping(linearColor);
#endif
  return linearToOutputTexel(vec4(linearColor, 1.0)).rgb;
}

void addLight(vec3 displayColor, float alpha) {
  acc.rgb += displayColor * alpha;
}

void over(vec3 displayColor, float alpha) {
  acc.rgb = displayColor * alpha + acc.rgb * (1.0 - alpha);
  acc.a = alpha + acc.a * (1.0 - alpha);
}

void main() {
  vec2 p = vLocal;
  float glowStrength = mix(${glslFloat(L.NORMAL_GLOW_OPACITY)}, ${glslFloat(L.VIP_GLOW_OPACITY)}, uIsVip);

  addLight(
    toDisplay(uGlowColor),
    glowStrength * bandMask(p, ${glslFloat(L.OUTER_GLOW_INNER_RADIUS)}, ${glslFloat(L.OUTER_GLOW_OUTER_RADIUS)})
  );

  vec2 uv = p / ${glslFloat(L.PORTRAIT_RADIUS * 2.0)} + 0.5;
  vec4 texel = texture2D(uAvatar, clamp(uv, 0.0, 1.0));
  vec3 vividAvatar = clamp((texel.rgb - 0.5) * 1.12 + 0.52, 0.0, 1.0);
  over(
    linearToOutputTexel(vec4(vividAvatar, 1.0)).rgb,
    texel.a * circleMask(p, ${glslFloat(L.PORTRAIT_RADIUS)})
  );

  addLight(
    toDisplay(uBorderColor),
    ${glslFloat(L.BORDER_OPACITY)} * bandMask(p, ${glslFloat(L.BORDER_INNER_RADIUS)}, ${glslFloat(L.BORDER_OUTER_RADIUS)})
  );

  if (acc.a <= 0.0 && dot(acc.rgb, acc.rgb) <= 0.0) discard;
  gl_FragColor = acc;
}
`;

export const createAvatarBadgeMaterial = (): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: {
      uAvatar: { value: null },
      uBorderColor: { value: new THREE.Color() },
      uGlowColor: { value: new THREE.Color() },
      uIsVip: { value: VIP_FLAG.OFF },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });

export const syncAvatarBadgeMaterial = (
  material: THREE.ShaderMaterial,
  visuals: AvatarBadgeVisuals
): void => {
  const uniforms = material.uniforms;
  uniforms.uAvatar.value = visuals.avatarTexture;
  (uniforms.uBorderColor.value as THREE.Color).set(visuals.borderColor);
  (uniforms.uGlowColor.value as THREE.Color).set(visuals.glowColor);
  uniforms.uIsVip.value = visuals.isVip ? VIP_FLAG.ON : VIP_FLAG.OFF;
};
