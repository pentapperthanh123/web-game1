import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, computeProgress, seededValues, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_SPIKE_GEO = new THREE.ConeGeometry(0.16, 1.1, 6);
const RISE_END = 0.35;
const HOLD_END = 0.65;
const STAGGER = 0.04;

const resolveHeightFactor = (progress: number): number => {
  if (progress < RISE_END) return Math.pow(progress / RISE_END, 2);
  if (progress < HOLD_END) return 1;
  return Math.max(0, 1 - (progress - HOLD_END) / (1 - HOLD_END));
};

/** Crystal spikes erupting from the floor across both wings. */
export const GroundSpikes3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const spikes = useMemo(() => {
    const randoms = seededValues(startedAt, count * 3);
    return Array.from({ length: count }, (_, index) => ({
      x: (randoms[index * 3] - 0.5) * BOSS_3D_ANCHORS.WING_X * 2.6,
      z: (randoms[index * 3 + 1] - 0.5) * 2,
      maxHeight: (0.8 + randoms[index * 3 + 2] * 0.6) * scale,
      rotationY: randoms[index * 3] * Math.PI * 2,
      offset: index * STAGGER,
    }));
  }, [startedAt, count, scale]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    group.children.forEach((mesh, index) => {
      const spike = spikes[index];
      if (!spike) return;
      const local = Math.min(1, Math.max(0, progress - spike.offset));
      const height = resolveHeightFactor(local);
      mesh.visible = height > 0;
      mesh.position.set(spike.x, BOSS_3D_ANCHORS.GROUND_Y - 0.5 + height * spike.maxHeight, spike.z);
      mesh.scale.set(scale, height * scale, scale);
      setMaterialOpacity(mesh, height * 0.92);
    });
  });

  return (
    <group ref={groupRef}>
      {spikes.map((spike, index) => (
        <mesh key={`${startedAt}-${index}`} geometry={SHARED_SPIKE_GEO} rotation={[0, spike.rotationY, 0]} visible={false}>
          <meshBasicMaterial color={index % 2 === 0 ? color : secondaryColor} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
};
