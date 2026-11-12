import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, bellCurve, computeProgress, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_RING_GEO = new THREE.TorusGeometry(1, 0.06, 8, 48);
const SHARED_FUNNEL_GEO = new THREE.ConeGeometry(1.6, 3.2, 24, 1, true);
const RING_GAP = 0.9;
const SPIN_SPEED = 7;

/** Spinning rings collapsing into a funnel above the floor — the pull that weakens champions. */
export const Vortex3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const funnelRef = useRef<THREE.Mesh>(null);
  const ringCount = Math.max(2, count);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    const intensity = bellCurve(progress);
    group.visible = progress > 0 && progress < 1;
    group.children.forEach((ring, index) => {
      const spin = progress * SPIN_SPEED * (index % 2 === 0 ? 1 : -1);
      ring.rotation.set(-Math.PI / 2, 0, spin);
      const radius = (1 + index * RING_GAP) * scale * (1.3 - progress * 0.9);
      ring.scale.set(radius, radius, 1);
      ring.position.y = BOSS_3D_ANCHORS.GROUND_Y + 0.1 + index * 0.35 * intensity;
      setMaterialOpacity(ring, intensity * 0.9);
    });
    if (funnelRef.current) {
      funnelRef.current.rotation.y = progress * SPIN_SPEED;
      funnelRef.current.scale.setScalar(scale * (0.4 + intensity * 0.8));
      setMaterialOpacity(funnelRef.current, intensity * 0.35);
    }
  });

  return (
    <group>
      <group ref={groupRef} visible={false}>
        {Array.from({ length: ringCount }, (_, index) => (
          <mesh key={`${startedAt}-${index}`} geometry={SHARED_RING_GEO}>
            <meshBasicMaterial color={index === 0 ? secondaryColor : color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      <mesh ref={funnelRef} geometry={SHARED_FUNNEL_GEO} position={[0, BOSS_3D_ANCHORS.GROUND_Y + 1.5, 0]} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} wireframe />
      </mesh>
    </group>
  );
};
