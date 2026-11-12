import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, COMBAT_VFX_CONSTANTS } from '../../constants/game';

const SHIELD_DOME_RADIUS = 1.18;

export const Boss3DPresence = () => {
  const shieldDomeRef = useRef<THREE.Mesh>(null);
  const shieldInnerRef = useRef<THREE.Mesh>(null);
  const weakPointRingRef = useRef<THREE.Mesh>(null);

  const bossHp = useGameStore((state) => state.bossHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossShield = useGameStore((state) => state.bossShield);
  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0;

  useFrame(({ clock }) => {
    if (isDefeated) return;
    const t = clock.getElapsedTime();

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

  if (isDefeated || (!bossShield && !bossWeakPoint)) return null;

  const [bossX, bossY, bossZ] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

  return (
    <group position={[bossX, bossY - 0.1, bossZ - 0.35]}>
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
