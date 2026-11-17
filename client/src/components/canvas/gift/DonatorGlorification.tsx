import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../../store/gameStore';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { getTeamTheme } from '../../../constants/teams';

// ==========================================
// CONSTANTS & POOLS
// ==========================================
const MAX_BURN_DECALS = 6;
const SKY_HOLOGRAM_POS: [number, number, number] = [0, 14.5, -4.5];

// ==========================================
// CYBERPUNK SCANLINE SHADER FOR SKY HOLOGRAM
// ==========================================
const CyberpunkHologramShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform sampler2D uTexture;
    uniform bool uHasTexture;
    varying vec2 vUv;

    void main() {
      // Circular mask
      vec2 center = vUv - vec2(0.5);
      float dist = length(center);
      if (dist > 0.48) discard;

      // Hologram scanlines & jitter
      float scanline = sin(vUv.y * 140.0 + uTime * 8.0) * 0.18;
      float flicker = sin(uTime * 45.0) * cos(uTime * 18.0) * 0.06 + 0.94;
      float ring = smoothstep(0.48, 0.45, dist) * smoothstep(0.42, 0.45, dist) * 2.0;

      vec4 texColor = vec4(1.0);
      if (uHasTexture) {
        texColor = texture2D(uTexture, vUv);
      } else {
        // Fallback procedural VIP Bat-signal crest
        float star = max(abs(center.x), abs(center.y));
        texColor = vec4(vec3(smoothstep(0.35, 0.1, star)), 1.0);
      }

      vec3 finalRgb = (texColor.rgb + uColor * 0.8) * (flicker + scanline) + vec3(ring) * uColor * 1.5;
      float alpha = clamp((1.0 - smoothstep(0.38, 0.48, dist)) * 0.85, 0.0, 1.0);

      gl_FragColor = vec4(finalRgb, alpha);
    }
  `,
};

export const DonatorGlorification: React.FC = React.memo(() => {
  // ----------------------------------------
  // REFS
  // ----------------------------------------
  const hologramMeshRef = useRef<THREE.Mesh>(null);
  const decalPoolGroupRef = useRef<THREE.Group>(null);

  // Dynamic Avatar Texture Loader
  const avatarTextureRef = useRef<THREE.Texture | null>(null);

  const hologramUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uTexture: { value: null as THREE.Texture | null },
      uHasTexture: { value: false },
    }),
    []
  );

  const hologramState = useRef({
    active: false,
    timer: 0,
    maxDuration: 8.0,
    donorName: '',
  });

  // ----------------------------------------
  // MEGA GIFT LISTENER (TRIGGERS SKY HOLOGRAM)
  // ----------------------------------------
  useEffect(() => {
    const unsub = useGiftVfxStore.subscribe((state, prevState) => {
      if (state.activeMegaWeapon && state.activeMegaWeapon !== prevState.activeMegaWeapon) {
        const weapon = state.activeMegaWeapon;
        const theme = getTeamTheme(useGameStore.getState().activeTeams[weapon.team]?.colorTheme);

        hologramState.current = {
          active: true,
          timer: 0,
          maxDuration: 8.5,
          donorName: weapon.donorName,
        };

        hologramUniforms.uColor.value.set(theme.primaryHex);

        if (weapon.donorAvatarUrl) {
          const loader = new THREE.TextureLoader();
          loader.crossOrigin = 'anonymous';
          loader.load(
            weapon.donorAvatarUrl,
            (texture) => {
              texture.minFilter = THREE.LinearFilter;
              avatarTextureRef.current = texture;
              hologramUniforms.uTexture.value = texture;
              hologramUniforms.uHasTexture.value = true;
            },
            undefined,
            () => {
              hologramUniforms.uHasTexture.value = false;
            }
          );
        } else {
          hologramUniforms.uHasTexture.value = false;
        }

        if (hologramMeshRef.current) {
          hologramMeshRef.current.visible = true;
        }
      }
    });

    return () => unsub();
  }, [hologramUniforms]);

  // ----------------------------------------
  // FRAME ANIMATION (60 FPS MUTATION)
  // ----------------------------------------
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    hologramUniforms.uTime.value = time;

    // 1. Sky Hologram Pulse & Fade
    if (hologramState.current.active && hologramMeshRef.current) {
      hologramState.current.timer += delta;
      const progress = hologramState.current.timer / hologramState.current.maxDuration;

      // Slight floating motion
      hologramMeshRef.current.position.y = SKY_HOLOGRAM_POS[1] + Math.sin(time * 2.0) * 0.25;

      if (progress >= 1.0) {
        hologramState.current.active = false;
        hologramMeshRef.current.visible = false;
      }
    }

    // 2. Finisher Burn Mark Decals on Arena Floor
    if (decalPoolGroupRef.current) {
      const activeDecals = useGiftVfxStore.getState().activeBurnDecals;
      const decalMeshes = decalPoolGroupRef.current.children;

      for (let i = 0; i < MAX_BURN_DECALS; i += 1) {
        const group = decalMeshes[i] as THREE.Group;
        if (!group) continue;

        const decal = activeDecals[i];
        if (!decal) {
          group.visible = false;
          continue;
        }

        group.visible = true;
        group.position.set(decal.pos[0], decal.pos[1], decal.pos[2]);

        // Breathing flame pulse
        const ring = group.getObjectByName('DecalRing') as THREE.Mesh;
        if (ring) {
          ring.rotation.z += delta * 0.8;
          const pulse = 1.0 + Math.sin(time * 4.0 + i * 2.0) * 0.05;
          ring.scale.set(pulse, pulse, 1);
        }
      }
    }
  });

  return (
    <group name="DonatorGlorification">
      {/* 1. Giant Cyberpunk Sky Hologram (Bat-Signal) */}
      <mesh
        ref={hologramMeshRef}
        position={SKY_HOLOGRAM_POS}
        rotation={[Math.PI * 0.12, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[7.5, 7.5]} />
        <shaderMaterial
          vertexShader={CyberpunkHologramShader.vertexShader}
          fragmentShader={CyberpunkHologramShader.fragmentShader}
          uniforms={hologramUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Pre-allocated Finisher Decals (Permanent Burn Marks) */}
      <group ref={decalPoolGroupRef}>
        {Array.from({ length: MAX_BURN_DECALS }, (_, i) => (
          <group key={`decal-holder-${i}`} visible={false}>
            {/* Scorched Ground Ring */}
            <mesh
              name="DecalRing"
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, 0]}
            >
              <ringGeometry args={[1.6, 2.3, 32]} />
              <meshBasicMaterial
                toneMapped={false}
                color="#f59e0b"
                transparent
                opacity={0.65}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Etched Rune Text on Arena Floor */}
            <group position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <Text
                fontSize={0.28}
                color="#fbbf24"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#78350f"
              >
                🔥 KẾT LIỄU THẦN THÁNH
              </Text>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
});

DonatorGlorification.displayName = 'DonatorGlorification';
export default DonatorGlorification;
