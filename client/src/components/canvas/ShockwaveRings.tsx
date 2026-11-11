import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

export const ShockwaveRings = () => {
  const groupRef = useRef<THREE.Group>(null);
  const activeShockwaves = useGameStore((state) => state.activeShockwaves);

  useFrame(() => {
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const ringGroup = children[i] as THREE.Group;
      const wave = activeShockwaves[i];
      if (!wave) continue;

      const elapsed = (Date.now() - wave.timestamp) / 1000;
      const duration = 0.85;
      const progress = Math.min(1.0, elapsed / duration);

      // Smooth ease-out cubic expansion
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScale = 0.3 + easeOut * wave.maxRadius;
      ringGroup.scale.set(currentScale, currentScale, 1);

      // Fade opacity to 0
      ringGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - progress) * 0.95);
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, -2.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {activeShockwaves.map((wave) => (
        <group key={wave.id}>
          {/* Main Colored Shockwave Ring */}
          <mesh>
            <ringGeometry args={[0.95, 1.25, 48]} />
            <meshBasicMaterial
              color={wave.color}
              transparent
              opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Bright White Leading Edge Ring */}
          <mesh>
            <ringGeometry args={[1.18, 1.26, 48]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
