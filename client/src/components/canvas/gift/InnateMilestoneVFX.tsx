import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { useGameStore } from '../../../store/gameStore';
import { getTeamTheme } from '../../../constants/teams';
import { GIFT_TIER, GIFT_TIER_CONFIG, TEAM_SLOT_LEFT, TEAM_SLOT_RIGHT, TeamType } from '../../../constants/game';

// ==========================================
// CONSTANTS & SHADERS
// ==========================================
const WING_POSITIONS = {
  LEFT: [-4.2, 0, 0] as [number, number, number],
  RIGHT: [4.2, 0, 0] as [number, number, number],
} as const;

const FRENZY_LIGHT_COLOR = {
  R: 1.0,
  G: 0.2,
  B: 0.08,
} as const;

const HexShieldShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    float hexGrid(vec2 p) {
      vec2 q = vec2(p.x * 2.0 * 0.5773503, p.y + p.x * 0.5773503);
      vec2 pi = floor(q);
      vec2 pf = fract(q);
      float v = mod(pi.x + pi.y, 3.0);
      float d = 0.0;
      if (v < 1.0) d = min(pf.x, pf.y);
      else if (v < 2.0) d = min(1.0 - pf.x, pf.y);
      else d = min(pf.x, 1.0 - pf.y);
      return smoothstep(0.08, 0.0, d);
    }

    void main() {
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.2);
      float hex = hexGrid(vUv * 24.0 + vec2(0.0, uTime * 0.4));
      float ripple = sin(vPosition.y * 5.0 - uTime * 8.0) * 0.2 + 0.8;

      vec3 col = uColor * (fresnel * 1.5 + hex * 2.0 * ripple);
      float alpha = (fresnel * 0.65 + hex * 0.4) * uOpacity;

      gl_FragColor = vec4(col, alpha);
    }
  `,
};

export const InnateMilestoneVFX: React.FC = React.memo(() => {
  // ----------------------------------------
  // REFS
  // ----------------------------------------
  const frenzyLightRef = useRef<THREE.AmbientLight>(null);
  const leftShieldRef = useRef<THREE.Mesh>(null);
  const rightShieldRef = useRef<THREE.Mesh>(null);

  // Dynamic Shield Opacities
  const leftShieldOpacity = useRef(0);
  const rightShieldOpacity = useRef(0);
  const frenzyIntensity = useRef(0);

  const leftShieldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#38bdf8') },
      uOpacity: { value: 0 },
    }),
    []
  );

  const rightShieldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#f59e0b') },
      uOpacity: { value: 0 },
    }),
    []
  );

  // ----------------------------------------
  // FRAME ANIMATION (60 FPS MUTATION)
  // ----------------------------------------
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const now = Date.now();
    const gameState = useGameStore.getState();

    // Dynamically resolve left & right team slot keys from activeTeams
    const activeTeamKeys = Object.keys(gameState.activeTeams || {}) as TeamType[];
    const leftTeamKey = activeTeamKeys[0] || TEAM_SLOT_LEFT;
    const rightTeamKey = activeTeamKeys[1] || TEAM_SLOT_RIGHT;

    // 1. Fully Dynamic Battle Frenzy Check across all active teams
    const isFrenzyActive = Object.values(gameState.teamHeartMomentum || {}).some(
      (momentum) => (momentum?.frenzyUntil ?? 0) > now
    );

    // Smooth lerp frenzy berserker light intensity
    const targetFrenzy = isFrenzyActive ? 1.0 : 0.0;
    frenzyIntensity.current = THREE.MathUtils.lerp(frenzyIntensity.current, targetFrenzy, delta * 3.5);

    if (frenzyLightRef.current) {
      if (frenzyIntensity.current > 0.01) {
        frenzyLightRef.current.intensity = frenzyIntensity.current * 1.6;
        const pulse = 0.85 + 0.15 * Math.sin(time * 12.0);
        frenzyLightRef.current.color.setRGB(
          FRENZY_LIGHT_COLOR.R * pulse,
          FRENZY_LIGHT_COLOR.G * pulse,
          FRENZY_LIGHT_COLOR.B * pulse
        );
        frenzyLightRef.current.visible = true;
      } else {
        frenzyLightRef.current.visible = false;
      }
    }

    // 2. Dynamic Aegis Barrier Check
    leftShieldUniforms.uTime.value = time;
    rightShieldUniforms.uTime.value = time;

    const currentBanner = gameState.activeGiftBanner;
    if (currentBanner && ((currentBanner.coins ?? 0) >= GIFT_TIER_CONFIG[GIFT_TIER.BIG].minCoins || (currentBanner.giftName || '').includes('Vương Miện'))) {
      const bannerElapsed = now - currentBanner.timestamp;
      if (bannerElapsed < 2500) {
        if (currentBanner.team === leftTeamKey) {
          leftShieldOpacity.current = 1.0;
          const leftTheme = getTeamTheme(gameState.activeTeams[leftTeamKey]?.colorTheme);
          leftShieldUniforms.uColor.value.set(leftTheme.primaryHex);
        } else {
          rightShieldOpacity.current = 1.0;
          const rightTheme = getTeamTheme(gameState.activeTeams[rightTeamKey]?.colorTheme);
          rightShieldUniforms.uColor.value.set(rightTheme.primaryHex);
        }
      }
    }

    // Animate Left Wing Shield Fade & Scale
    leftShieldOpacity.current = Math.max(0, leftShieldOpacity.current - delta * 0.45);
    leftShieldUniforms.uOpacity.value = leftShieldOpacity.current;
    if (leftShieldRef.current) {
      leftShieldRef.current.visible = leftShieldOpacity.current > 0.01;
      const scale = 1.0 + (1.0 - leftShieldOpacity.current) * 0.2;
      leftShieldRef.current.scale.set(scale, scale, scale);
    }

    // Animate Right Wing Shield Fade & Scale
    rightShieldOpacity.current = Math.max(0, rightShieldOpacity.current - delta * 0.45);
    rightShieldUniforms.uOpacity.value = rightShieldOpacity.current;
    if (rightShieldRef.current) {
      rightShieldRef.current.visible = rightShieldOpacity.current > 0.01;
      const scale = 1.0 + (1.0 - rightShieldOpacity.current) * 0.2;
      rightShieldRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group name="InnateMilestoneVFX">
      {/* 1. Dynamic BATTLE_FRENZY Berserker Tint Light */}
      <ambientLight ref={frenzyLightRef} intensity={0} color="#ff3322" visible={false} />

      {/* 2. AEGIS_BARRIER Left Wing Energy Shield Dome */}
      <mesh
        ref={leftShieldRef}
        position={WING_POSITIONS.LEFT}
        visible={false}
      >
        <sphereGeometry args={[3.8, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <shaderMaterial
          vertexShader={HexShieldShader.vertexShader}
          fragmentShader={HexShieldShader.fragmentShader}
          uniforms={leftShieldUniforms}
          transparent
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. AEGIS_BARRIER Right Wing Energy Shield Dome */}
      <mesh
        ref={rightShieldRef}
        position={WING_POSITIONS.RIGHT}
        visible={false}
      >
        <sphereGeometry args={[3.8, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <shaderMaterial
          vertexShader={HexShieldShader.vertexShader}
          fragmentShader={HexShieldShader.fragmentShader}
          uniforms={rightShieldUniforms}
          transparent
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

InnateMilestoneVFX.displayName = 'InnateMilestoneVFX';
export default InnateMilestoneVFX;
