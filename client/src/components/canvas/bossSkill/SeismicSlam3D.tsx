import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, computeProgress, easeOutCubic, seededValues, setMaterialOpacity } from './bossSkill3DShared';

const SHARED_RING_GEO = new THREE.RingGeometry(0.8, 1.1, 48);
const RING_STAGGER = 0.12;
const CRACK_COUNT = 7;
const CRACK_SEGMENTS = 5;
const CRACK_LENGTH = 3.2;

const createCrackLine = (angle: number, randoms: number[], color: string): THREE.Line => {
  const points: THREE.Vector3[] = [new THREE.Vector3(0, BOSS_3D_ANCHORS.GROUND_Y + 0.02, 0)];
  let x = 0;
  let z = 0;
  for (let segment = 1; segment <= CRACK_SEGMENTS; segment += 1) {
    const wobble = (randoms[segment % randoms.length] - 0.5) * 0.7;
    const length = CRACK_LENGTH / CRACK_SEGMENTS;
    x += Math.cos(angle + wobble) * length;
    z += Math.sin(angle + wobble) * length * 0.6;
    points.push(new THREE.Vector3(x, BOSS_3D_ANCHORS.GROUND_Y + 0.02, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Line(geometry, material);
};

/** Stacked ground shockwave rings plus glowing fissures radiating from the impact point. */
export const SeismicSlam3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const ringGroupRef = useRef<THREE.Group>(null);
  const ringCount = Math.max(2, count);
  const cracks = useMemo(() => {
    const randoms = seededValues(startedAt, CRACK_COUNT * CRACK_SEGMENTS);
    return Array.from({ length: CRACK_COUNT }, (_, index) =>
      createCrackLine((index / CRACK_COUNT) * Math.PI * 2, randoms.slice(index * CRACK_SEGMENTS, (index + 1) * CRACK_SEGMENTS), secondaryColor)
    );
  }, [startedAt, secondaryColor]);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    ringGroupRef.current?.children.forEach((ring, index) => {
      const local = Math.min(1, Math.max(0, (progress - index * RING_STAGGER) / 0.8));
      ring.visible = local > 0 && local < 1;
      const radius = (0.4 + easeOutCubic(local) * 7) * scale;
      ring.scale.set(radius, radius, 1);
      setMaterialOpacity(ring, (1 - local) * 0.9);
    });
    const crackOpacity = progress < 0.2 ? progress / 0.2 : Math.max(0, 1 - (progress - 0.2) / 0.8);
    cracks.forEach((crack) => {
      crack.visible = progress > 0 && progress < 1;
      crack.scale.setScalar(scale);
      setMaterialOpacity(crack, crackOpacity);
    });
  });

  return (
    <group>
      <group ref={ringGroupRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {Array.from({ length: ringCount }, (_, index) => (
          <mesh key={`${startedAt}-${index}`} geometry={SHARED_RING_GEO} visible={false}>
            <meshBasicMaterial color={index === 0 ? '#ffffff' : color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {cracks.map((crack, index) => (
        <primitive key={`${startedAt}-crack-${index}`} object={crack} />
      ))}
    </group>
  );
};
