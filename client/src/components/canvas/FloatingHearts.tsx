import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const dummyHeart = new THREE.Object3D();

export const FloatingHearts = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const activeHearts = useGameStore((state) => state.activeHearts);

  // Memoize 3D Extruded Heart Shape
  const heartGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Start at bottom tip
    shape.moveTo(0, -0.45);
    shape.bezierCurveTo(-0.55, -0.1, -0.65, 0.35, -0.32, 0.52);
    shape.bezierCurveTo(-0.12, 0.62, 0, 0.42, 0, 0.3);
    shape.bezierCurveTo(0, 0.42, 0.12, 0.62, 0.32, 0.52);
    shape.bezierCurveTo(0.65, 0.35, 0.55, -0.1, 0, -0.45);

    const extrudeSettings = {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    geom.scale(0.6, 0.6, 0.6);
    return geom;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const count = activeHearts.length;
    meshRef.current.count = count;

    for (let i = 0; i < count; i++) {
      const heart = activeHearts[i];
      const ageSeconds = (Date.now() - heart.createdAt) / 1000;

      // Float upwards
      const currentY = heart.y + ageSeconds * heart.speed;
      // Sway with sine wave
      const currentX = heart.x + Math.sin(time * heart.swaySpeed + i) * 0.45;
      const currentZ = heart.z + Math.cos(time * 2.2 + i) * 0.25;

      dummyHeart.position.set(currentX, currentY, currentZ);

      // Rotate continuously on Y and slight wobble
      dummyHeart.rotation.y = time * 3.5 + i;
      dummyHeart.rotation.z = Math.sin(time * 2.5 + i) * 0.25;

      // Fade scale near end of life
      const scaleFade = Math.max(0, 1 - ageSeconds / 3.2);
      const scale = heart.scale * scaleFade * 1.1;
      dummyHeart.scale.set(scale, scale, scale);

      dummyHeart.updateMatrix();
      meshRef.current.setMatrixAt(i, dummyHeart.matrix);

      // Instance color
      meshRef.current.setColorAt(i, new THREE.Color(heart.color));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[heartGeometry, undefined, 80]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.6}
        emissive="#ff007f"
        emissiveIntensity={0.6}
        flatShading
      />
    </instancedMesh>
  );
};
