import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';

// Shared static geometries to eliminate WebGL buffer allocation/GC pauses during combat
const SHARED_SLASH_RING_1 = new THREE.RingGeometry(0.26, 0.31, 24, 1, 0, Math.PI * 0.65);
const SHARED_SLASH_RING_2 = new THREE.RingGeometry(0.28, 0.30, 24, 1, 0, Math.PI * 0.65);
const SHARED_SLASH_RING_CRIT = new THREE.RingGeometry(0.25, 0.29, 20, 1, 0, Math.PI * 0.6);
const SHARED_OCTAHEDRON_NORMAL = new THREE.OctahedronGeometry(0.05, 0);
const SHARED_OCTAHEDRON_CRIT = new THREE.OctahedronGeometry(0.08, 0);

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

      // Razor-sharp, precise katana blade slice - League Esports aesthetic
      const scaleX = slash.scale * (0.45 + easeOut * 0.4);
      const scaleY = slash.scale * Math.max(0.04, 0.42 - progress * 0.32);
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

  if (activeSlashes.length === 0) return null;

  return (
    <group ref={groupRef}>
      {activeSlashes.map((slash) => (
        <group
          key={slash.id}
          position={slash.position}
          rotation={[slash.tiltX, slash.tiltY, slash.rotationZ]}
        >
          {/* Main Neon Crescent Slash */}
          <mesh geometry={SHARED_SLASH_RING_1}>
            <meshBasicMaterial
              color={slash.color}
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Incandescent Razor Core */}
          <mesh geometry={SHARED_SLASH_RING_2}>
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Secondary Cross-Slash for Crits & Ultimates */}
          {slash.isCrit && (
            <mesh rotation={[0, 0, Math.PI * 0.65]} geometry={SHARED_SLASH_RING_CRIT}>
              <meshBasicMaterial
                color={slash.color}
                transparent
                opacity={0.85}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Impact Flare Core */}
          <mesh
            position={[0, 0.28, 0]}
            geometry={slash.isCrit ? SHARED_OCTAHEDRON_CRIT : SHARED_OCTAHEDRON_NORMAL}
          >
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
