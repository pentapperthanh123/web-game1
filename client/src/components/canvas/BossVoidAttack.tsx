import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS } from '../../constants/game';

const LIGHTNING_SEGMENTS = 8;
const BOLT_COUNT = 5;

interface LightningBolt {
  targetAngle: number;
  length: number;
}

export const BossVoidAttack = () => {
  const shockRingRef = useRef<THREE.Mesh>(null);
  const lightningGroupRef = useRef<THREE.Group>(null);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);

  const bolts = useMemo<LightningBolt[]>(() => {
    return Array.from({ length: BOLT_COUNT }, (_, i) => ({
      targetAngle: (i / BOLT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      length: 3.2 + Math.random() * 2.2,
    }));
  }, []);

  const lineObjects = useMemo(() => {
    return bolts.map(() => {
      const points = new Float32Array((LIGHTNING_SEGMENTS + 1) * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const mat = new THREE.LineBasicMaterial({
        color: '#c084fc',
        transparent: true,
        opacity: 0.9,
        linewidth: 3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Line(geom, mat);
    });
  }, [bolts]);

  useFrame(() => {
    if (bossStatus === BOSS_STATUS.DEFEATED) return;

    const timeSinceAttack = (Date.now() - bossAttackTimestamp) / 1000;
    const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
    const duration = isEnraged ? 0.9 : 0.7;

    // 1. Expanding Void Roar Shockwave Ring
    if (shockRingRef.current) {
      if (timeSinceAttack < duration) {
        const progress = timeSinceAttack / duration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRadius = 0.5 + easeOut * (isEnraged ? 8.5 : 6.5);
        shockRingRef.current.visible = true;
        shockRingRef.current.scale.set(currentRadius, currentRadius, 1);

        const mat = shockRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - progress) * 0.9;
        mat.color.set(isEnraged ? '#ef4444' : '#a855f7');
      } else {
        shockRingRef.current.visible = false;
      }
    }

    // 2. Void Lightning Arcs
    if (lightningGroupRef.current) {
      if (timeSinceAttack < 0.45) {
        lightningGroupRef.current.visible = true;

        lineObjects.forEach((line, idx) => {
          const bolt = bolts[idx];
          if (!bolt) return;

          const geom = line.geometry;
          const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
          if (!posAttr) return;

          const startX = 0;
          const startY = 0.6;
          const startZ = 0.2;

          const endX = Math.cos(bolt.targetAngle) * bolt.length;
          const endY = -1.2 + (Math.random() - 0.5) * 0.6;
          const endZ = Math.sin(bolt.targetAngle) * (bolt.length * 0.6) + 0.8;

          const positions = posAttr.array as Float32Array;
          for (let s = 0; s <= LIGHTNING_SEGMENTS; s++) {
            const frac = s / LIGHTNING_SEGMENTS;
            const jitterX = frac > 0 && frac < 1 ? (Math.random() - 0.5) * 0.45 : 0;
            const jitterY = frac > 0 && frac < 1 ? (Math.random() - 0.5) * 0.45 : 0;
            const jitterZ = frac > 0 && frac < 1 ? (Math.random() - 0.5) * 0.45 : 0;

            positions[s * 3] = THREE.MathUtils.lerp(startX, endX, frac) + jitterX;
            positions[s * 3 + 1] = THREE.MathUtils.lerp(startY, endY, frac) + jitterY;
            positions[s * 3 + 2] = THREE.MathUtils.lerp(startZ, endZ, frac) + jitterZ;
          }
          posAttr.needsUpdate = true;

          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = Math.random() > 0.3 ? 0.95 : 0.4;
          mat.color.set(isEnraged ? '#f43f5e' : '#c084fc');
        });
      } else {
        lightningGroupRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Void Roar Shockwave Ring */}
      <mesh
        ref={shockRingRef}
        position={[0, 0.45, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.9, 1.25, 48]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Void Lightning Discharge Lines */}
      <group ref={lightningGroupRef} visible={false}>
        {lineObjects.map((lineObj, i) => (
          <primitive key={`bolt-${i}`} object={lineObj} />
        ))}
      </group>
    </group>
  );
};
