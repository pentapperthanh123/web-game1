import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';

export const SlashEffects = () => {
  const groupRef = useRef<THREE.Group>(null);
  const activeSlashes = useGameStore((state) => state.activeSlashes);

  useFrame(() => {
    if (!groupRef.current) return;

    const now = Date.now();
    const duration = COMBAT_VFX_CONSTANTS.DAMAGE.SLASH_DURATION_S;
    const children = groupRef.current.children;

    for (let i = 0; i < children.length; i++) {
      const slashGroup = children[i] as THREE.Group;
      const slash = activeSlashes[i];
      if (!slash) continue;

      const elapsed = (now - slash.createdAt) / 1000;
      const progress = Math.min(1.0, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const scaleX = slash.scale * (0.9 + easeOut * 1.7);
      const scaleY = slash.scale * Math.max(0.03, 1.05 - progress * 0.85);
      slashGroup.scale.set(scaleX, scaleY, 1);

      const fade = Math.max(0, 1 - Math.pow(progress, 1.6));
      slashGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = fade;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {activeSlashes.map((slash) => (
        <group
          key={slash.id}
          position={slash.position}
          rotation={[slash.tiltX, slash.tiltY, slash.rotationZ]}
        >
          {/* Main Neon Crescent Slash */}
          <mesh>
            <ringGeometry args={[1.05, 1.62, 28, 1, 0, Math.PI * 0.95]} />
            <meshBasicMaterial
              color={slash.color}
              transparent
              opacity={1.0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Incandescent Razor Core */}
          <mesh>
            <ringGeometry args={[1.25, 1.42, 28, 1, 0, Math.PI * 0.95]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={1.0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Secondary Cross-Slash for Crits & Ultimates */}
          {slash.isCrit && (
            <mesh rotation={[0, 0, Math.PI * 0.65]}>
              <ringGeometry args={[0.95, 1.48, 24, 1, 0, Math.PI * 0.9]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Impact Flare Core */}
          <mesh position={[0, 1.32, 0]}>
            <octahedronGeometry args={[slash.isCrit ? 0.45 : 0.28, 0]} />
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
