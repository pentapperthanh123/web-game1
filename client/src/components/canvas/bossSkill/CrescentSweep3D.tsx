import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkillVfx3DProps, bellCurve, computeProgress, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_SWEEP_GEO = new THREE.TorusGeometry(2.5, 0.09, 8, 36, Math.PI * 0.75);
const SWEEP_ARC = Math.PI * 1.2;
const SECOND_SWEEP_OFFSET = 0.18;

/** A crescent slash sweeping across the floor toward the targeted side (two when count ≥ 2). */
export const CrescentSweep3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const sweepCount = Math.min(2, Math.max(1, count));
  const flip = direction < 0 ? -1 : 1;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    group.children.forEach((mesh, index) => {
      const local = Math.min(1, Math.max(0, progress - index * SECOND_SWEEP_OFFSET));
      mesh.visible = local > 0 && local < 1;
      const sweepAngle = flip * (-SWEEP_ARC / 2 + local * SWEEP_ARC);
      mesh.rotation.set(-Math.PI / 2, 0, sweepAngle);
      const size = (1 + bellCurve(local) * 0.35) * scale;
      mesh.scale.set(size, size, 1);
      setMaterialOpacity(mesh, bellCurve(local) * 0.95);
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.2, 0.4]}>
      {Array.from({ length: sweepCount }, (_, index) => (
        <mesh key={`${startedAt}-${index}`} geometry={SHARED_SWEEP_GEO} visible={false}>
          <meshBasicMaterial color={index === 0 ? secondaryColor : color} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};
