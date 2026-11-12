import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, computeProgress, easeOutCubic, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_CORE_GEO = new THREE.SphereGeometry(0.6, 20, 20);
const SHARED_RING_GEO = new THREE.RingGeometry(0.8, 1.25, 48);
const SHARED_DOME_GEO = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const ARC_SEGMENTS = 8;
const ARC_LIFE = 0.6;
const MAX_RADIUS = 11;

const createArc = (color: string): THREE.Line => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ARC_SEGMENTS + 1) * 3), 3));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
};

/** Ultimate: core flash, expanding dome, double shockwave rings and radial energy arcs across the arena. */
export const Nova3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const domeRef = useRef<THREE.Mesh>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const arcs = useMemo(() => Array.from({ length: count }, () => createArc(secondaryColor)), [count, secondaryColor]);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const isAlive = progress > 0 && progress < 1;
    if (coreRef.current) {
      coreRef.current.visible = isAlive;
      const flash = progress < 0.15 ? progress / 0.15 : Math.max(0, 1 - (progress - 0.15) / 0.5);
      coreRef.current.scale.setScalar((0.3 + flash * 2.2) * scale);
      setMaterialOpacity(coreRef.current, flash);
    }
    if (domeRef.current) {
      domeRef.current.visible = isAlive;
      domeRef.current.scale.setScalar(0.5 + easeOutCubic(progress) * MAX_RADIUS * 0.6 * scale);
      setMaterialOpacity(domeRef.current, (1 - progress) * 0.25);
    }
    ringGroupRef.current?.children.forEach((ring, index) => {
      const local = Math.min(1, Math.max(0, progress - index * 0.15));
      ring.visible = isAlive && local > 0;
      const radius = (0.5 + easeOutCubic(local) * MAX_RADIUS) * scale;
      ring.scale.set(radius, radius, 1);
      setMaterialOpacity(ring, (1 - local) * 0.95);
    });
    arcs.forEach((arc, index) => {
      const alive = isAlive && progress < ARC_LIFE;
      arc.visible = alive;
      if (!alive) return;
      const angle = (index / arcs.length) * Math.PI * 2 + progress * 0.8;
      const reach = (2 + easeOutCubic(progress / ARC_LIFE) * 6) * scale;
      const positions = (arc.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let segment = 0; segment <= ARC_SEGMENTS; segment += 1) {
        const fraction = segment / ARC_SEGMENTS;
        const jitter = segment === 0 || segment === ARC_SEGMENTS ? 0 : (Math.random() - 0.5) * 0.6;
        positions[segment * 3] = Math.cos(angle) * reach * fraction + jitter;
        positions[segment * 3 + 1] = THREE.MathUtils.lerp(0.6, BOSS_3D_ANCHORS.GROUND_Y, fraction) + jitter;
        positions[segment * 3 + 2] = Math.sin(angle) * reach * fraction * 0.6 + 0.5 + jitter;
      }
      (arc.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      setMaterialOpacity(arc, Math.random() > 0.2 ? 0.95 : 0.35);
    });
  });

  return (
    <group>
      <mesh ref={coreRef} position={[0, 0.5, 0.3]} geometry={SHARED_CORE_GEO} visible={false}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={domeRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y, 0]} geometry={SHARED_DOME_GEO} visible={false}>
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <group ref={ringGroupRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y + 0.05, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        {[0, 1].map((index) => (
          <mesh key={`${startedAt}-ring-${index}`} geometry={SHARED_RING_GEO} visible={false}>
            <meshBasicMaterial color={index === 0 ? '#ffffff' : color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {arcs.map((arc, index) => (
        <primitive key={`${startedAt}-arc-${index}`} object={arc} />
      ))}
    </group>
  );
};
