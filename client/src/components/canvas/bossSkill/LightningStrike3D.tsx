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

const SEGMENTS = 9;
const STAGGER = 0.09;
const BOLT_LIFE = 0.32;
const SHARED_IMPACT_GEO = new THREE.RingGeometry(0.15, 0.5, 24);

const createBoltLine = (color: string): THREE.Line => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Line(geometry, material);
};

/** Sky-to-ground lightning bolts striking the attacked wing, each with a ground impact ring. */
export const LightningStrike3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const impactGroupRef = useRef<THREE.Group>(null);
  const strikes = useMemo(() => {
    const randoms = seededValues(startedAt, count * 2);
    return Array.from({ length: count }, (_, index) => ({
      x: resolveLandingX(direction, randoms[index * 2]),
      z: (randoms[index * 2 + 1] - 0.5) * 1.8,
      offset: index * STAGGER,
    }));
  }, [startedAt, count, direction]);
  const bolts = useMemo(() => strikes.map(() => createBoltLine(color)), [strikes, color]);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    bolts.forEach((bolt, index) => {
      const strike = strikes[index];
      const local = progress - strike.offset;
      const isAlive = local > 0 && local < BOLT_LIFE;
      bolt.visible = isAlive;
      const impact = impactGroupRef.current?.children[index];
      if (impact) {
        const impactProgress = Math.max(0, local) / BOLT_LIFE;
        impact.visible = local > 0 && impactProgress < 1.6;
        impact.scale.setScalar((0.4 + impactProgress * 2.2) * scale);
        setMaterialOpacity(impact, Math.max(0, 1 - impactProgress / 1.6));
      }
      if (!isAlive) return;

      const positions = (bolt.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let segment = 0; segment <= SEGMENTS; segment += 1) {
        const fraction = segment / SEGMENTS;
        const isEnd = segment === 0 || segment === SEGMENTS;
        const jitter = isEnd ? 0 : (Math.random() - 0.5) * 0.7 * scale;
        positions[segment * 3] = strike.x + jitter;
        positions[segment * 3 + 1] = THREE.MathUtils.lerp(BOSS_3D_ANCHORS.SKY_Y, BOSS_3D_ANCHORS.GROUND_Y, fraction);
        positions[segment * 3 + 2] = strike.z + jitter * 0.5;
      }
      (bolt.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      setMaterialOpacity(bolt, Math.random() > 0.25 ? 1 : 0.4);
    });
  });

  return (
    <group>
      {bolts.map((bolt, index) => (
        <primitive key={`${startedAt}-bolt-${index}`} object={bolt} />
      ))}
      <group ref={impactGroupRef}>
        {strikes.map((strike, index) => (
          <mesh key={`${startedAt}-impact-${index}`} position={[strike.x, BOSS_3D_ANCHORS.GROUND_Y + 0.02, strike.z]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHARED_IMPACT_GEO} visible={false}>
            <meshBasicMaterial color={secondaryColor} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
