import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { BossShieldForceField } from './bossShield/BossShieldForceField';
import { BOSS_PRESENCE_OFFSET } from './bossShield/bossShieldConstants';

export const Boss3DPresence = () => {
  const weakPointRingRef = useRef<THREE.Mesh>(null);

  const bossHp = useGameStore((state) => state.bossHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossShield = useGameStore((state) => state.bossShield);
  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0;

  useFrame(({ clock }) => {
    if (isDefeated) return;
    const t = clock.getElapsedTime();

    if (weakPointRingRef.current && bossWeakPoint) {
      weakPointRingRef.current.rotation.z = t * 2.8;
      const lockPulse = 1 + Math.sin(t * 8) * 0.12;
      weakPointRingRef.current.scale.setScalar(lockPulse);
    }
  });

  if (isDefeated || (!bossShield && !bossWeakPoint)) return null;

  const [bossX, bossY, bossZ] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

  return (
    <>
      {/* Energy force field while the Void/Dragon shield is up; follows the boss sprite's on-screen core */}
      {bossShield && <BossShieldForceField />}

      {/* 3D Lock-On Ring when Weak Point is open */}
      {bossWeakPoint && (
        <group position={[bossX, bossY + BOSS_PRESENCE_OFFSET.Y, bossZ + BOSS_PRESENCE_OFFSET.Z]}>
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
        </group>
      )}
    </>
  );
};
