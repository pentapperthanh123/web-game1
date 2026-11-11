import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

export const MeteorShower3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const activeMeteors = useGameStore((state) => state.activeMeteors);

  useFrame(() => {
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const meteorGroup = children[i] as THREE.Group;
      const meteor = activeMeteors[i];
      if (!meteor) {
        meteorGroup.visible = false;
        continue;
      }

      const elapsed = (Date.now() - meteor.createdAt) / 1000;
      if (elapsed < 0 || elapsed >= meteor.duration) {
        meteorGroup.visible = false;
        continue;
      }

      meteorGroup.visible = true;
      const progress = Math.min(1.0, Math.max(0, elapsed / meteor.duration));

      // Trajectory Lerp
      const currentX = THREE.MathUtils.lerp(meteor.start[0], meteor.target[0], progress);
      const currentY = THREE.MathUtils.lerp(meteor.start[1], meteor.target[1], progress);
      const currentZ = THREE.MathUtils.lerp(meteor.start[2], meteor.target[2], progress);

      meteorGroup.position.set(currentX, currentY, currentZ);

      // Spin meteor aggressively
      meteorGroup.rotation.x += 0.25;
      meteorGroup.rotation.y += 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {activeMeteors.map((meteor) => (
        <group key={meteor.id}>
          {/* Meteor Core Fireball (Hot incandescent white-hot core) */}
          <mesh>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={meteor.color}
              emissiveIntensity={4.5}
              roughness={0.1}
            />
          </mesh>

          {/* Orbiting Debris Energy Halo Ring */}
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.7, 0.04, 6, 24]} />
            <meshBasicMaterial
              color={meteor.color}
              wireframe
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Fiery Trail Streamer (Dual layered cones) */}
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[0.35, 2.6, 8]} />
            <meshBasicMaterial
              color={meteor.color}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <coneGeometry args={[0.2, 2.0, 6]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
