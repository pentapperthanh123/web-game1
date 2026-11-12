import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, computeProgress, seededValues, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_PUFF_GEO = new THREE.CircleGeometry(0.35, 16);
const SHARED_SHOCK_GEO = new THREE.RingGeometry(0.3, 0.6, 32);
const PUFF_SPACING = 0.55;
const STAGGER = 0.08;

/** Dust puffs kicked up along the charge path plus a frontal shock ring at impact. */
export const ChargeDash3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const puffGroupRef = useRef<THREE.Group>(null);
  const shockRef = useRef<THREE.Mesh>(null);
  const trailSide = direction >= 0 ? -1 : 1;
  const impactX = direction === 0 ? 0 : direction * BOSS_3D_ANCHORS.WING_X;
  const puffs = useMemo(() => {
    const randoms = seededValues(startedAt, count);
    return Array.from({ length: count }, (_, index) => ({
      x: trailSide * (0.4 + index * PUFF_SPACING) * scale,
      z: (randoms[index] - 0.5) * 0.8,
      size: 0.7 + randoms[index] * 0.6,
      offset: index * STAGGER,
    }));
  }, [startedAt, count, scale, trailSide]);

  useFrame(() => {
    const group = puffGroupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    group.children.forEach((puff, index) => {
      const data = puffs[index];
      const local = Math.min(1, Math.max(0, (progress - data.offset) / 0.7));
      puff.visible = local > 0 && local < 1;
      puff.position.set(data.x + trailSide * local * 0.6, BOSS_3D_ANCHORS.GROUND_Y + 0.05 + local * 0.5, data.z);
      puff.scale.setScalar(data.size * (0.5 + local) * scale);
      setMaterialOpacity(puff, (1 - local) * 0.7);
    });
    if (shockRef.current) {
      const impactProgress = (progress - 0.45) / 0.55;
      shockRef.current.visible = impactProgress > 0 && impactProgress < 1;
      shockRef.current.scale.setScalar((0.5 + impactProgress * 3) * scale);
      setMaterialOpacity(shockRef.current, Math.max(0, 1 - impactProgress));
    }
  });

  return (
    <group>
      <group ref={puffGroupRef}>
        {puffs.map((_, index) => (
          <mesh key={`${startedAt}-${index}`} geometry={SHARED_PUFF_GEO} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <meshBasicMaterial color={index % 2 === 0 ? color : secondaryColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh ref={shockRef} geometry={SHARED_SHOCK_GEO} position={[impactX, BOSS_3D_ANCHORS.GROUND_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <meshBasicMaterial color={secondaryColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
