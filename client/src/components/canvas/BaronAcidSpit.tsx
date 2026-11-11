import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS } from '../../constants/game';

interface SpitBlob {
  id: number;
  active: boolean;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

const MAX_BLOBS = 16;

export const BaronAcidSpit = () => {
  const groupRef = useRef<THREE.Group>(null);
  const splashesRef = useRef<THREE.Group>(null);
  const bossStatus = useGameStore((state) => state.bossStatus);

  const lastSpitTimeRef = useRef(0);
  const nextSpitDelayRef = useRef(2.2);

  // Pool of acid spit projectiles
  const blobs = useMemo<SpitBlob[]>(() => {
    return Array.from({ length: MAX_BLOBS }, (_, i) => ({
      id: i,
      active: false,
      startX: 0,
      startY: 1.1,
      startZ: 1.3,
      targetX: 0,
      targetY: -2.2,
      targetZ: 2.5,
      progress: 0,
      speed: 1.8,
      color: '#4ade80',
      size: 0.18,
    }));
  }, []);

  useFrame((state, delta) => {
    if (bossStatus === BOSS_STATUS.DEFEATED) return;

    const time = state.clock.getElapsedTime();

    // Trigger Acid Spit Volley periodically (every 2.0 - 2.8s)
    if (time - lastSpitTimeRef.current > nextSpitDelayRef.current) {
      lastSpitTimeRef.current = time;
      nextSpitDelayRef.current = 2.0 + Math.random() * 0.8;

      // Spawn a burst of 3 acid spit globes aimed at arena ground
      const spitColors = ['#4ade80', '#22c55e', '#a3e635', '#a855f7'];

      for (let burst = 0; burst < 3; burst++) {
        const inactiveBlob = blobs.find((b) => !b.active);
        if (inactiveBlob) {
          inactiveBlob.active = true;
          inactiveBlob.progress = -burst * 0.12; // staggered launch
          inactiveBlob.startX = (Math.random() - 0.5) * 0.2;
          inactiveBlob.startY = 1.25;
          inactiveBlob.startZ = 1.4;

          // Target spread across the forward arena water pool
          const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.7;
          const spreadDist = 2.0 + Math.random() * 2.5;
          inactiveBlob.targetX = Math.sin(spreadAngle) * spreadDist;
          inactiveBlob.targetY = -2.0;
          inactiveBlob.targetZ = Math.cos(spreadAngle) * spreadDist * 0.5 + 1.2;

          inactiveBlob.speed = 1.6 + Math.random() * 0.5;
          inactiveBlob.color = spitColors[Math.floor(Math.random() * spitColors.length)];
          inactiveBlob.size = 0.16 + Math.random() * 0.08;
        }
      }
    }

    // Update active blobs
    if (groupRef.current) {
      const children = groupRef.current.children;

      blobs.forEach((blob, idx) => {
        const mesh = children[idx] as THREE.Mesh;
        if (!mesh) return;

        if (!blob.active) {
          mesh.visible = false;
          return;
        }

        blob.progress += delta * blob.speed;

        if (blob.progress < 0) {
          mesh.visible = false;
          return;
        }

        if (blob.progress >= 1.0) {
          blob.active = false;
          mesh.visible = false;
          return;
        }

        mesh.visible = true;

        // Parabolic arc trajectory
        const t = blob.progress;
        const curX = THREE.MathUtils.lerp(blob.startX, blob.targetX, t);
        const curZ = THREE.MathUtils.lerp(blob.startZ, blob.targetZ, t);
        // Arc peak in the middle of flight
        const arcHeight = Math.sin(t * Math.PI) * 0.6;
        const curY = THREE.MathUtils.lerp(blob.startY, blob.targetY, t) + arcHeight;

        mesh.position.set(curX, curY, curZ);

        // Elongate along flight direction (droplet stretch)
        const scaleZ = blob.size * (1.2 + (1 - t) * 1.5);
        mesh.scale.set(blob.size, blob.size * 0.85, scaleZ);
        mesh.lookAt(blob.targetX, blob.targetY, blob.targetZ);

        // Spin slightly
        mesh.rotation.z += delta * 8;
      });
    }
  });

  return (
    <>
      {/* Acid Spit Flying Droplets */}
      <group ref={groupRef}>
        {blobs.map((blob) => (
          <mesh key={`spit-blob-${blob.id}`}>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#4ade80"
              emissiveIntensity={3.2}
              roughness={0.1}
              metalness={0.1}
              transparent
              opacity={0.92}
            />
          </mesh>
        ))}
      </group>

      {/* Acid Impact Splatters on Ground */}
      <group ref={splashesRef} position={[0, -2.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Ambient Ground Acid Fume Ring */}
        <mesh position={[0, 0, 0.01]}>
          <ringGeometry args={[1.2, 2.2, 32]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
};
