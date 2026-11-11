import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

export const SlashEffects = () => {
  const groupRef = useRef<THREE.Group>(null);
  const activeSlashes = useGameStore((state) => state.activeSlashes);

  useFrame(() => {
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const slashGroup = children[i] as THREE.Group;
      const slash = activeSlashes[i];
      if (!slash) continue;

      const elapsed = (Date.now() - slash.createdAt) / 1000;
      const duration = 0.38;
      const progress = Math.min(1.0, elapsed / duration);

      // Expand & stretch slash
      const scaleX = slash.scale * (1 + progress * 1.5);
      const scaleY = slash.scale * Math.max(0.02, 1 - progress * 0.9);
      slashGroup.scale.set(scaleX, scaleY, 1);

      // Fade all meshes
      slashGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - progress) * 1.0);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {activeSlashes.map((slash) => (
        <group
          key={slash.id}
          position={slash.position}
          rotation={[0, 0, slash.rotationZ]}
        >
          {/* Main Giant Neon Arc Blade */}
          <mesh>
            <ringGeometry args={[1.1, 1.6, 32, 1, 0, Math.PI * 0.95]} />
            <meshBasicMaterial
              color={slash.color}
              transparent
              opacity={1.0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Incandescent White Razor Core */}
          <mesh>
            <ringGeometry args={[1.28, 1.42, 32, 1, 0, Math.PI * 0.95]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={1.0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Center Impact Flash Star */}
          <mesh position={[0, 1.35, 0]}>
            <octahedronGeometry args={[0.35, 0]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={1.0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
