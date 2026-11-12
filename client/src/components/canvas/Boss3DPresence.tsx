import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_MECHANICS_CONSTANTS,
  BOSS_STATUS,
  COMBAT_VFX_CONSTANTS,
  getThemeConfig,
  BossThemeConfig,
} from '../../constants/game';

const MAX_ORBIT_CRYSTALS = 9;
const SHIELD_DOME_RADIUS = 1.18;

const resolveBossPhase = (bossHp: number, bossMaxHp: number): 1 | 2 | 3 => {
  if (bossMaxHp <= 0) return 1;
  const ratio = bossHp / bossMaxHp;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_3_THRESHOLD_PERCENT) return 3;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_2_THRESHOLD_PERCENT) return 2;
  return 1;
};

const resolveCrystalColor = (phase: 1 | 2 | 3, themeConfig: BossThemeConfig): string => {
  if (phase === 3) return themeConfig.colors.enragedHex;
  if (phase === 2) return themeConfig.colors.secondaryHex;
  return themeConfig.colors.primaryHex;
};

export const Boss3DPresence = () => {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const shieldDomeRef = useRef<THREE.Mesh>(null);
  const shieldInnerRef = useRef<THREE.Mesh>(null);
  const crystalGroupRef = useRef<THREE.Group>(null);
  const weakPointRingRef = useRef<THREE.Mesh>(null);

  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const bossShield = useGameStore((state) => state.bossShield);
  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0;
  const themeConfig = getThemeConfig(gameTheme);
  const phase = resolveBossPhase(bossHp, bossMaxHp);
  const crystalColor = resolveCrystalColor(phase, themeConfig);
  const visibleCrystalCount = phase * 3;

  const crystalOffsets = useMemo(
    () =>
      Array.from({ length: MAX_ORBIT_CRYSTALS }, (_, index) => ({
        phaseOffset: (index / MAX_ORBIT_CRYSTALS) * Math.PI * 2,
        heightOffset: ((index % 3) - 1) * 0.42,
        radiusOffset: 1.55 + (index % 2) * 0.28,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (isDefeated) return;
    const t = clock.getElapsedTime();
    const phaseSpeed = phase === 3 ? 1.85 : phase === 2 ? 1.25 : 0.85;

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.55 * phaseSpeed;
      outerRingRef.current.rotation.x = Math.PI * 0.36 + Math.sin(t * 0.8) * 0.12;
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.8 * phaseSpeed;
      innerRingRef.current.rotation.y = Math.cos(t * 0.65) * 0.35;
    }

    if (crystalGroupRef.current) {
      crystalGroupRef.current.children.forEach((child, idx) => {
        if (idx >= visibleCrystalCount) {
          child.visible = false;
          return;
        }
        child.visible = true;
        const cfg = crystalOffsets[idx];
        const angle = t * 0.9 * phaseSpeed + cfg.phaseOffset;
        child.position.set(
          Math.cos(angle) * cfg.radiusOffset,
          cfg.heightOffset + Math.sin(t * 2.1 + idx) * 0.14,
          Math.sin(angle) * (cfg.radiusOffset * 0.55)
        );
        child.rotation.y = -angle;
        child.rotation.x = t * 1.4;
      });
    }

    if (shieldDomeRef.current && bossShield) {
      shieldDomeRef.current.rotation.y = t * 0.7;
      shieldDomeRef.current.rotation.x = Math.sin(t * 0.9) * 0.2;
      const pulse = 1 + Math.sin(t * 5.2) * 0.035;
      shieldDomeRef.current.scale.setScalar(pulse);
    }

    if (shieldInnerRef.current && bossShield) {
      shieldInnerRef.current.rotation.y = -t * 0.45;
    }

    if (weakPointRingRef.current && bossWeakPoint) {
      weakPointRingRef.current.rotation.z = t * 2.8;
      const lockPulse = 1 + Math.sin(t * 8) * 0.12;
      weakPointRingRef.current.scale.setScalar(lockPulse);
    }
  });

  if (isDefeated) return null;

  const [bossX, bossY, bossZ] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

  return (
    <group position={[bossX, bossY - 0.1, bossZ - 0.35]}>
      {/* Tilted 3D Runic Halo Rings circling Boss */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.65, phase === 3 ? 0.036 : 0.024, 8, 48]} />
        <meshBasicMaterial
          color={crystalColor}
          transparent
          opacity={phase === 3 ? 0.55 : 0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={innerRingRef}>
        <torusGeometry args={[1.28, 0.02, 8, 40]} />
        <meshBasicMaterial
          color={themeConfig.colors.secondaryHex}
          transparent
          opacity={phase >= 2 ? 0.42 : 0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Orbiting Void / Dragon Crystals scaling from 3 -> 6 -> 9 by Boss Phase */}
      <group ref={crystalGroupRef}>
        {crystalOffsets.map((_, index) => (
          <mesh key={`boss-crystal-${index}`}>
            <octahedronGeometry args={[phase === 3 ? 0.14 : 0.1, 0]} />
            <meshBasicMaterial
              color={crystalColor}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* 3D Forcefield Dome when Void/Dragon Shield is active */}
      {bossShield && (
        <group position={[0, 0.08, 0.08]}>
          <mesh ref={shieldDomeRef}>
            <icosahedronGeometry args={[SHIELD_DOME_RADIUS, 1]} />
            <meshBasicMaterial
              color="#38bdf8"
              wireframe
              transparent
              opacity={0.52}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={shieldInnerRef}>
            <sphereGeometry args={[SHIELD_DOME_RADIUS * 0.94, 20, 16]} />
            <meshBasicMaterial
              color="#0284c7"
              transparent
              opacity={0.10}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* 3D Lock-On Ring when Weak Point is open */}
      {bossWeakPoint && (
        <mesh ref={weakPointRingRef} position={[0, 0.15, 0.15]}>
          <ringGeometry args={[0.92, 1.04, 6]} />
          <meshBasicMaterial
            color="#facc15"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};
