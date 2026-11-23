import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { HEAL_WAVE_CONSTANTS } from '../../constants/game';

const RING_GEOMETRY = new THREE.RingGeometry(0.94, 1, 64);
const FLAT_ON_FLOOR: [number, number, number] = [-Math.PI / 2, 0, 0];
const ringMaterials = Array.from({ length: HEAL_WAVE_CONSTANTS.RING_COUNT }, (_, index) =>
  new THREE.MeshBasicMaterial({
    color: index === 0 ? HEAL_WAVE_CONSTANTS.CORE_COLOR : HEAL_WAVE_CONSTANTS.COLOR,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
);

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Heart milestone reward made visible in 3D: green rings sweep the arena floor outward,
 * passing under every champion as the heal lands. Hidden (0 draw calls) when idle.
 */
export const HealWave3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const banner = useGameStore.getState().activeHeartMilestoneBanner;
    const progress = banner ? (Date.now() - banner.timestamp) / HEAL_WAVE_CONSTANTS.DURATION_MS : 1;
    const isPlaying = progress >= 0 && progress < 1;
    group.visible = isPlaying;
    if (!isPlaying) return;

    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const ringProgress = Math.min(1, Math.max(0, progress - index * HEAL_WAVE_CONSTANTS.RING_STAGGER) / (1 - index * HEAL_WAVE_CONSTANTS.RING_STAGGER));
      ring.scale.setScalar(Math.max(0.01, easeOutCubic(ringProgress) * HEAL_WAVE_CONSTANTS.MAX_RADIUS));
      ringMaterials[index].opacity = Math.sin(ringProgress * Math.PI) * HEAL_WAVE_CONSTANTS.PEAK_OPACITY;
    });
  });

  return (
    <group ref={groupRef} visible={false} position={[0, HEAL_WAVE_CONSTANTS.FLOOR_Y, 0]}>
      {ringMaterials.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            ringRefs.current[index] = mesh;
          }}
          rotation={FLAT_ON_FLOOR}
          geometry={RING_GEOMETRY}
          material={material}
        />
      ))}
    </group>
  );
};
