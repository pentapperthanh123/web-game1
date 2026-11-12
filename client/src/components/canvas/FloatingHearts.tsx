import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const HEART_POOL_CAPACITY = 80;
const HEART_LIFETIME_SECONDS = 3.2;

const dummyHeart = new THREE.Object3D();
const tempHeartColor = new THREE.Color();

export const FloatingHearts = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const heartGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.45);
    shape.bezierCurveTo(-0.55, -0.1, -0.65, 0.35, -0.32, 0.52);
    shape.bezierCurveTo(-0.12, 0.62, 0, 0.42, 0, 0.3);
    shape.bezierCurveTo(0, 0.42, 0.12, 0.62, 0.32, 0.52);
    shape.bezierCurveTo(0.65, 0.35, 0.55, -0.1, 0, -0.45);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    geom.center();
    geom.scale(0.6, 0.6, 0.6);
    return geom;
  }, []);

  useEffect(() => {
    return () => {
      heartGeometry.dispose();
    };
  }, [heartGeometry]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const activeHearts = useGameStore.getState().activeHearts;
    const count = Math.min(activeHearts.length, HEART_POOL_CAPACITY);

    if (count === 0) {
      if (mesh.count !== 0) {
        mesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const time = state.clock.getElapsedTime();
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const heart = activeHearts[i];
      const ageSeconds = (now - heart.createdAt) / 1000;
      const scaleFade = Math.max(0, 1 - ageSeconds / HEART_LIFETIME_SECONDS);

      if (scaleFade <= 0) {
        dummyHeart.scale.set(0, 0, 0);
        dummyHeart.updateMatrix();
        mesh.setMatrixAt(i, dummyHeart.matrix);
        continue;
      }

      const currentY = heart.y + ageSeconds * heart.speed;
      const currentX = heart.x + Math.sin(time * heart.swaySpeed + i) * 0.45;
      const currentZ = heart.z + Math.cos(time * 2.2 + i) * 0.25;

      dummyHeart.position.set(currentX, currentY, currentZ);
      dummyHeart.rotation.set(0, time * 3.5 + i, Math.sin(time * 2.5 + i) * 0.25);

      const scale = heart.scale * scaleFade * 1.1;
      dummyHeart.scale.set(scale, scale, scale);
      dummyHeart.updateMatrix();
      mesh.setMatrixAt(i, dummyHeart.matrix);

      tempHeartColor.set(heart.color);
      mesh.setColorAt(i, tempHeartColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[heartGeometry, undefined, HEART_POOL_CAPACITY]} frustumCulled={false}>
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
