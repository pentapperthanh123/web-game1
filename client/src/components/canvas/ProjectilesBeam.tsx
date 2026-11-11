import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const dummyProj = new THREE.Object3D();

export const ProjectilesBeam = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const activeProjectiles = useGameStore((state) => state.activeProjectiles);

  useFrame(() => {
    if (!meshRef.current) return;

    const count = activeProjectiles.length;
    meshRef.current.count = count;

    for (let i = 0; i < count; i++) {
      const proj = activeProjectiles[i];
      const elapsed = Date.now() - proj.createdAt;
      const duration = 480;
      const progress = Math.min(1.0, elapsed / duration);

      if (progress >= 1.0) {
        dummyProj.scale.set(0, 0, 0);
        dummyProj.updateMatrix();
        meshRef.current.setMatrixAt(i, dummyProj.matrix);
        continue;
      }

      // Smooth flight from team wings to Baron center (0, 0.45, 0)
      const currentX = THREE.MathUtils.lerp(proj.startX, 0, progress);
      const currentY = THREE.MathUtils.lerp(proj.startY, 0.45, progress);
      const currentZ = THREE.MathUtils.lerp(proj.startZ, 0, progress);

      dummyProj.position.set(currentX, currentY, currentZ);
      dummyProj.lookAt(0, 0.45, 0);

      // Elongated high-speed energy bolt
      const scaleZ = 2.4 * (1 - progress * 0.3);
      dummyProj.scale.set(0.18, 0.18, scaleZ);

      dummyProj.updateMatrix();
      meshRef.current.setMatrixAt(i, dummyProj.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(proj.color));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 50]}
      frustumCulled={false}
    >
      <cylinderGeometry args={[0.07, 0.14, 1.8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
