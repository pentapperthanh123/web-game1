/**
 * Configuration & GLSL shaders for the Love Burst ("Bão Trái Tim") 3D gift reaction.
 * Replaces the old flat pink cylinder and blown-out additive sprites with a soft Rose-Gold
 * swirling aura, ground magic circle, billboarded ruby-rose crystal hearts, and starlight sparkles.
 */

export const LOVE_BURST_TIMING = {
  DURATION_S: 3.4,
  ENVELOPE_FADE_IN_END: 0.14,
  ENVELOPE_FADE_OUT_START: 0.72,
} as const;

export const LOVE_BURST_LAYOUT = {
  BOSS_CORE_FALLBACK: [0, 0.5, 0.3] as const,
  FLOOR_Y: -1.66,
  AURA_TOP_RADIUS: 0.92,
  AURA_BOTTOM_RADIUS: 1.18,
  AURA_HEIGHT: 4.9,
  AURA_CENTER_Y: 0.79,
  AURA_RADIAL_SEGMENTS: 32,
  FLOOR_RING_SIZE: 4.4,
  HEART_COUNT: 16,
  HEART_HERO_COUNT: 5,
  HEART_PLANE_SIZE: 0.85,
  HEART_Y_MIN: -1.15,
  HEART_Y_MAX: 3.05,
  HEART_RADIUS_MIN: 0.62,
  HEART_RADIUS_SPREAD: 0.72,
  HEART_HERO_SCALE_MIN: 0.36,
  HEART_HERO_SCALE_SPREAD: 0.12,
  HEART_MINI_SCALE_MIN: 0.17,
  HEART_MINI_SCALE_SPREAD: 0.13,
  HEART_ORBIT_SPEED_MIN: 1.15,
  HEART_ORBIT_SPEED_SPREAD: 0.75,
  HEART_RISE_SPEED_MIN: 0.34,
  HEART_RISE_SPEED_SPREAD: 0.18,
  HEART_SWAY_AMPLITUDE: 0.18,
  HEART_SWAY_FREQ: 3.4,
  SPARKLE_COUNT: 24,
  SPARKLE_PLANE_SIZE: 0.34,
  SPARKLE_Y_MIN: -1.25,
  SPARKLE_Y_MAX: 3.0,
  SPARKLE_RADIUS_MIN: 0.48,
  SPARKLE_RADIUS_SPREAD: 0.92,
  SPARKLE_SCALE_MIN: 0.38,
  SPARKLE_SCALE_SPREAD: 0.48,
  SPARKLE_ORBIT_SPEED_MIN: 1.5,
  SPARKLE_ORBIT_SPEED_SPREAD: 1.1,
  SPARKLE_RISE_SPEED_MIN: 0.38,
  SPARKLE_RISE_SPEED_SPREAD: 0.24,
} as const;

export const LOVE_AURA_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uEnvelope;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
      float edgeSoft = pow(smoothstep(0.08, 0.72, facing), 1.6);

      float bottomFade = smoothstep(0.0, 0.22, vUv.y);
      float topFade = pow(smoothstep(1.0, 0.32, vUv.y), 1.5);

      float helix1 = pow(0.5 + 0.5 * sin(vUv.x * 12.56637 + vUv.y * 8.0 - uTime * 3.4), 5.0);
      float helix2 = pow(0.5 + 0.5 * sin(vUv.x * 18.84956 - vUv.y * 11.0 + uTime * 2.6), 6.0);
      float shimmer = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 5.2 + vUv.x * 6.28318);

      vec3 roseVeil = vec3(0.90, 0.26, 0.50);
      vec3 champagneGold = vec3(1.0, 0.76, 0.58);
      vec3 pearlLight = vec3(1.0, 0.88, 0.92);

      vec3 ribbonColor = mix(roseVeil, champagneGold, clamp(helix1 * 0.65 + helix2 * 0.55, 0.0, 1.0));
      ribbonColor = mix(ribbonColor, pearlLight, helix1 * helix2 * 0.6);

      float veilDensity = 0.16 + 0.06 * shimmer;
      float ribbonDensity = helix1 * 0.42 + helix2 * 0.32;
      float alpha = min(0.42, veilDensity + ribbonDensity) * edgeSoft * bottomFade * topFade * uEnvelope;
      if (alpha < 0.005) discard;

      gl_FragColor = vec4(ribbonColor, alpha);
    }
  `,
} as const;

export const LOVE_FLOOR_RING_SHADER = {
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uEnvelope;
    varying vec2 vUv;

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;

      float a = atan(p.y, p.x);

      float outerWave = 0.84 + 0.028 * cos(a * 12.0 + uTime * 1.4);
      float outerRing = exp(-pow((r - outerWave) * 42.0, 2.0));

      float innerWave = 0.58 + 0.02 * cos(a * 8.0 - uTime * 1.9);
      float innerRing = exp(-pow((r - innerWave) * 38.0, 2.0));
      float runeTicks = 0.55 + 0.45 * cos(a * 16.0 - uTime * 2.4);

      float waveR = mix(0.22, 0.96, fract(uTime * 0.85));
      float waveFade = 1.0 - smoothstep(0.65, 0.96, waveR);
      float pulseWave = exp(-pow((r - waveR) * 24.0, 2.0)) * waveFade;

      float edgeMask = 1.0 - smoothstep(0.86, 1.0, r);
      float ambientGlow = exp(-r * r * 4.5) * 0.22 * edgeMask;

      vec3 champagneGold = vec3(1.0, 0.78, 0.56);
      vec3 roseCore = vec3(0.96, 0.28, 0.56);

      vec3 finalColor =
        champagneGold * (outerRing * 0.9 + pulseWave * 0.65) +
        roseCore * (innerRing * runeTicks * 0.85 + ambientGlow);

      float alpha =
        clamp(outerRing * 0.52 + innerRing * runeTicks * 0.46 + pulseWave * 0.36 + ambientGlow, 0.0, 0.85) *
        edgeMask *
        uEnvelope;
      if (alpha < 0.005) discard;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
} as const;

export const LOVE_HEART_SHADER = {
  vertexShader: `
    attribute vec3 aHeartData;
    varying vec2 vUv;
    varying vec3 vHeartData;

    void main() {
      vUv = uv;
      vHeartData = aHeartData;
      vec4 localPos = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        localPos = instanceMatrix * localPos;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * localPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vHeartData;

    float sdHeart(vec2 p) {
      p.x = abs(p.x);
      if (p.y + p.x > 1.0) {
        return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
      }
      return sqrt(min(
        dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
        dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
      )) * sign(p.x - p.y);
    }

    void main() {
      vec2 rawP = (vUv - vec2(0.5, 0.22)) * 2.25;
      float d = sdHeart(rawP);

      float core = 1.0 - smoothstep(-0.035, 0.015, d);

      vec3 rubyDeep = vec3(0.76, 0.07, 0.34);
      vec3 roseBright = vec3(0.98, 0.32, 0.56);
      vec3 roseGold = vec3(1.0, 0.58, 0.64);

      float gradY = clamp((rawP.y + 0.15) * 0.85, 0.0, 1.0);
      vec3 baseTint = mix(rubyDeep, roseBright, gradY);
      baseTint = mix(baseTint, roseGold, vHeartData.y * 0.55);

      float rim = smoothstep(-0.12, -0.015, d) * (1.0 - smoothstep(-0.01, 0.025, d));

      vec2 leftGlintDelta = rawP - vec2(-0.24, 0.82);
      vec2 rightGlintDelta = rawP - vec2(0.26, 0.85);
      float glintLeft = exp(-dot(leftGlintDelta, leftGlintDelta) * 42.0);
      float glintRight = exp(-dot(rightGlintDelta, rightGlintDelta) * 68.0) * 0.5;
      float specular = (glintLeft + glintRight) * core;

      float twinkle = 0.92 + 0.08 * sin(uTime * 5.0 + vHeartData.z);
      float outerGlow = exp(-max(d, 0.0) * 9.5) * smoothstep(0.38, 0.0, max(d, 0.0)) * 0.48;

      vec3 crystalColor =
        baseTint * twinkle +
        vec3(1.0, 0.82, 0.86) * rim * 0.55 +
        vec3(1.0, 0.95, 0.97) * specular * 0.85;
      vec3 haloColor = mix(roseBright, roseGold, 0.4);
      vec3 finalColor = mix(haloColor, crystalColor, core);

      float finalAlpha = clamp(core * 0.94 + (1.0 - core) * outerGlow, 0.0, 1.0) * vHeartData.x;
      if (finalAlpha < 0.01) discard;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
} as const;

export const LOVE_SPARKLE_SHADER = {
  vertexShader: `
    attribute vec3 aSparkleData;
    varying vec2 vUv;
    varying vec3 vSparkleData;

    void main() {
      vUv = uv;
      vSparkleData = aSparkleData;
      vec4 localPos = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        localPos = instanceMatrix * localPos;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * localPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vSparkleData;

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float dist = length(p);
      if (dist > 1.0) discard;

      float discMask = smoothstep(1.0, 0.15, dist);
      float armX = exp(-abs(p.y) * 14.0) * exp(-abs(p.x) * 3.2);
      float armY = exp(-abs(p.x) * 14.0) * exp(-abs(p.y) * 3.2);
      float coreDot = exp(-dist * dist * 16.0);
      float starShape = clamp((armX + armY) * 0.78 + coreDot * 0.95, 0.0, 1.0) * discMask;

      float twinkle = 0.45 + 0.55 * sin(uTime * 9.0 + vSparkleData.z);

      vec3 champagneGold = vec3(1.0, 0.86, 0.58);
      vec3 blushRose = vec3(1.0, 0.62, 0.80);
      vec3 starColor = mix(champagneGold, blushRose, vSparkleData.y);

      float alpha = starShape * twinkle * vSparkleData.x;
      if (alpha < 0.01) discard;

      gl_FragColor = vec4(starColor * 1.15, alpha);
    }
  `,
} as const;
