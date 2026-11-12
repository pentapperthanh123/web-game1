import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BOSS_3D_ANCHORS,
  SkillVfx3DProps,
  computeProgress,
  resolveLandingX,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';

const SHARED_BLOB_GEO = new THREE.SphereGeometry(0.11, 12, 12);
const SHARED_SPLASH_GEO = new THREE.RingGeometry(0.12, 0.45, 24);
const STAGGER = 0.1;
const ARC_HEIGHT = 0.9;
const SPLASH_START = 0.62;

/** Glowing blobs lobbed from the boss mouth onto champion wings, ending in ground splashes. */
export const ProjectileArc3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const targets = useMemo(() => {
    const randoms = seededValues(startedAt, count * 2);
    return Array.from({ length: count }, (_, index) => ({
      x: resolveLandingX(direction, randoms[index * 2]),
      z: (randoms[index * 2 + 1] - 0.5) * 1.6,
      offset: index * STAGGER,
    }));
  }, [startedAt, count, direction]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    group.children.forEach((blobGroup, index) => {
      const target = targets[index];
      if (!target) return;
      const local = Math.min(1, Math.max(0, (progress - target.offset) / (1 - target.offset)));
      blobGroup.visible = local > 0 && local < 1;
      const x = THREE.MathUtils.lerp(BOSS_3D_ANCHORS.MOUTH[0], target.x, local);
      const z = THREE.MathUtils.lerp(BOSS_3D_ANCHORS.MOUTH[2], target.z, local);
      const y = THREE.MathUtils.lerp(BOSS_3D_ANCHORS.MOUTH[1], BOSS_3D_ANCHORS.GROUND_Y, local) + Math.sin(local * Math.PI) * ARC_HEIGHT;
      blobGroup.position.set(x, y, z);
      blobGroup.scale.setScalar(scale * (1.2 - local * 0.4));

      const splash = blobGroup.children[1];
      const splashProgress = (local - SPLASH_START) / (1 - SPLASH_START);
      splash.visible = splashProgress > 0;
      splash.scale.setScalar(1 + Math.max(0, splashProgress) * 2.5);
      setMaterialOpacity(splash, Math.max(0, 1 - splashProgress) * 0.85);
    });
  });

  return (
    <group ref={groupRef}>
      {targets.map((_, index) => (
        <group key={`${startedAt}-${index}`} visible={false}>
          <mesh geometry={SHARED_BLOB_GEO}>
            <meshBasicMaterial color={secondaryColor} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHARED_SPLASH_GEO} visible={false}>
            <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
