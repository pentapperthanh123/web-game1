import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { BossShieldForceField } from './bossShield/BossShieldForceField';
import { BOSS_PRESENCE_OFFSET } from './bossShield/bossShieldConstants';

const ENRAGE_RING_CONFIG = {
  FLOOR_Y: -2.01,
  FLAT_ROTATION: [-Math.PI / 2, 0, 0] as const,
  OUTER: {
    INNER_RADIUS: 1.45,
    OUTER_RADIUS: 1.62,
    SEGMENTS: 8,
    COLOR: '#f43f5e',
    OPACITY: 0.48,
    ROTATION_SPEED: -1.8,
    PULSE_BASE: 1.05,
    PULSE_FREQ: 5.5,
    PULSE_AMP: 0.08,
  },
  INNER: {
    INNER_RADIUS: 1.05,
    OUTER_RADIUS: 1.18,
    SEGMENTS: 6,
    COLOR: '#fbbf24',
    OPACITY: 0.42,
    ROTATION_SPEED: 3.2,
    PULSE_BASE: 0.95,
    PULSE_FREQ: 6.5,
    PULSE_AMP: 0.1,
  },
} as const;

export const Boss3DPresence = () => {
  const weakPointRingRef = useRef<THREE.Mesh>(null);
  const enrageOuterRingRef = useRef<THREE.Mesh>(null);
  const enrageInnerRingRef = useRef<THREE.Mesh>(null);

  const isBossHpDepleted = useGameStore((state) => state.bossHp <= 0);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossShield = useGameStore((state) => state.bossShield);
  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || isBossHpDepleted;
  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED && !isDefeated;

  useFrame(({ clock }) => {
    if (isDefeated) return;
    const t = clock.getElapsedTime();

    if (weakPointRingRef.current && bossWeakPoint) {
      weakPointRingRef.current.rotation.z = t * 2.8;
      const lockPulse = 1 + Math.sin(t * 8) * 0.12;
      weakPointRingRef.current.scale.setScalar(lockPulse);
    }

    if (isEnraged) {
      if (enrageOuterRingRef.current) {
        const { OUTER } = ENRAGE_RING_CONFIG;
        enrageOuterRingRef.current.rotation.z = t * OUTER.ROTATION_SPEED;
        const pulseOuter = OUTER.PULSE_BASE + Math.sin(t * OUTER.PULSE_FREQ) * OUTER.PULSE_AMP;
        enrageOuterRingRef.current.scale.setScalar(pulseOuter);
      }
      if (enrageInnerRingRef.current) {
        const { INNER } = ENRAGE_RING_CONFIG;
        enrageInnerRingRef.current.rotation.z = t * INNER.ROTATION_SPEED;
        const pulseInner = INNER.PULSE_BASE + Math.cos(t * INNER.PULSE_FREQ) * INNER.PULSE_AMP;
        enrageInnerRingRef.current.scale.setScalar(pulseInner);
      }
    }
  });

  if (isDefeated || (!bossShield && !bossWeakPoint && !isEnraged)) return null;

  const [bossX, bossY, bossZ] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

  return (
    <>
      {/* Energy force field while the Void/Dragon shield is up; follows the boss sprite's on-screen core */}
      {bossShield && <BossShieldForceField />}

      {/* 3D Enrage Blood-Fire Matrix Rings beneath the Boss */}
      {isEnraged && (
        <group
          position={[bossX, ENRAGE_RING_CONFIG.FLOOR_Y, bossZ]}
          rotation={[...ENRAGE_RING_CONFIG.FLAT_ROTATION]}
        >
          <mesh ref={enrageOuterRingRef}>
            <ringGeometry
              args={[
                ENRAGE_RING_CONFIG.OUTER.INNER_RADIUS,
                ENRAGE_RING_CONFIG.OUTER.OUTER_RADIUS,
                ENRAGE_RING_CONFIG.OUTER.SEGMENTS,
              ]}
            />
            <meshBasicMaterial
              color={ENRAGE_RING_CONFIG.OUTER.COLOR}
              transparent
              opacity={ENRAGE_RING_CONFIG.OUTER.OPACITY}
              side={THREE.DoubleSide}
              forceSinglePass
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={enrageInnerRingRef}>
            <ringGeometry
              args={[
                ENRAGE_RING_CONFIG.INNER.INNER_RADIUS,
                ENRAGE_RING_CONFIG.INNER.OUTER_RADIUS,
                ENRAGE_RING_CONFIG.INNER.SEGMENTS,
              ]}
            />
            <meshBasicMaterial
              color={ENRAGE_RING_CONFIG.INNER.COLOR}
              transparent
              opacity={ENRAGE_RING_CONFIG.INNER.OPACITY}
              side={THREE.DoubleSide}
              forceSinglePass
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* 3D Lock-On Ring when Weak Point is open */}
      {bossWeakPoint && (
        <group position={[bossX, bossY + BOSS_PRESENCE_OFFSET.Y, bossZ + BOSS_PRESENCE_OFFSET.Z]}>
          <mesh ref={weakPointRingRef} position={[0, 0.15, 0.15]}>
            <ringGeometry args={[0.92, 1.04, 6]} />
            <meshBasicMaterial
              color="#facc15"
              transparent
              opacity={0.72}
              side={THREE.DoubleSide} forceSinglePass
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </>
  );
};
