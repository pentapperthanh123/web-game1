import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const METEOR_POOL_CAPACITY = 40;

const SHARED_CORE_GEO = new THREE.SphereGeometry(0.42, 12, 12);
const SHARED_HALO_GEO = new THREE.TorusGeometry(0.7, 0.04, 6, 24);
const SHARED_OUTER_CONE_GEO = new THREE.ConeGeometry(0.35, 2.6, 8);
const SHARED_INNER_CONE_GEO = new THREE.ConeGeometry(0.2, 2.0, 6);

const dummyObj = new THREE.Object3D();
const tempColor = new THREE.Color();

export const MeteorShower3D = () => {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const outerConeRef = useRef<THREE.InstancedMesh>(null);
  const innerConeRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const coreMesh = coreRef.current;
    const haloMesh = haloRef.current;
    const outerMesh = outerConeRef.current;
    const innerMesh = innerConeRef.current;
    if (!coreMesh || !haloMesh || !outerMesh || !innerMesh) return;

    const activeMeteors = useGameStore.getState().activeMeteors;
    const count = Math.min(activeMeteors.length, METEOR_POOL_CAPACITY);

    if (count === 0) {
      if (coreMesh.count !== 0) {
        coreMesh.count = 0;
        haloMesh.count = 0;
        outerMesh.count = 0;
        innerMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const elapsedClock = state.clock.getElapsedTime();
    coreMesh.count = count;
    haloMesh.count = count;
    outerMesh.count = count;
    innerMesh.count = count;

    for (let i = 0; i < count; i++) {
      const meteor = activeMeteors[i];
      const elapsed = (now - meteor.createdAt) / 1000;

      if (elapsed < 0 || elapsed >= meteor.duration) {
        dummyObj.scale.set(0, 0, 0);
        dummyObj.updateMatrix();
        coreMesh.setMatrixAt(i, dummyObj.matrix);
        haloMesh.setMatrixAt(i, dummyObj.matrix);
        outerMesh.setMatrixAt(i, dummyObj.matrix);
        innerMesh.setMatrixAt(i, dummyObj.matrix);
        continue;
      }

      const progress = Math.min(1.0, Math.max(0, elapsed / meteor.duration));
      const x = THREE.MathUtils.lerp(meteor.start[0], meteor.target[0], progress);
      const y = THREE.MathUtils.lerp(meteor.start[1], meteor.target[1], progress);
      const z = THREE.MathUtils.lerp(meteor.start[2], meteor.target[2], progress);
      const spinAngle = elapsedClock * 12 + i;

      dummyObj.position.set(x, y, z);
      dummyObj.rotation.set(spinAngle * 0.7, spinAngle, 0);
      dummyObj.scale.setScalar(1);
      dummyObj.updateMatrix();
      coreMesh.setMatrixAt(i, dummyObj.matrix);

      dummyObj.rotation.set(Math.PI / 3 + spinAngle * 0.5, spinAngle, 0);
      dummyObj.updateMatrix();
      haloMesh.setMatrixAt(i, dummyObj.matrix);

      dummyObj.position.set(x, y + 1.2, z);
      dummyObj.rotation.set(0, spinAngle, 0);
      dummyObj.updateMatrix();
      outerMesh.setMatrixAt(i, dummyObj.matrix);

      dummyObj.position.set(x, y + 1.8, z);
      dummyObj.updateMatrix();
      innerMesh.setMatrixAt(i, dummyObj.matrix);

      tempColor.set(meteor.color);
      coreMesh.setColorAt(i, tempColor);
      haloMesh.setColorAt(i, tempColor);
      outerMesh.setColorAt(i, tempColor);
    }

    coreMesh.instanceMatrix.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
    outerMesh.instanceMatrix.needsUpdate = true;
    innerMesh.instanceMatrix.needsUpdate = true;
    if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;
    if (outerMesh.instanceColor) outerMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={coreRef} args={[SHARED_CORE_GEO, undefined, METEOR_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={haloRef} args={[SHARED_HALO_GEO, undefined, METEOR_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial
          wireframe
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={outerConeRef} args={[SHARED_OUTER_CONE_GEO, undefined, METEOR_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={innerConeRef} args={[SHARED_INNER_CONE_GEO, undefined, METEOR_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
};
