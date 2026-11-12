import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const SHOCKWAVE_POOL_CAPACITY = 24;
const SHOCKWAVE_DURATION_S = 0.85;

const SHARED_MAIN_RING_GEO = new THREE.RingGeometry(0.88, 0.94, 32);
const SHARED_EDGE_RING_GEO = new THREE.RingGeometry(0.93, 0.95, 32);

const dummyWave = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempWhite = new THREE.Color('#ffffff');

export const ShockwaveRings = () => {
  const mainRef = useRef<THREE.InstancedMesh>(null);
  const edgeRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const mainMesh = mainRef.current;
    const edgeMesh = edgeRef.current;
    if (!mainMesh || !edgeMesh) return;

    const activeShockwaves = useGameStore.getState().activeShockwaves;
    const count = Math.min(activeShockwaves.length, SHOCKWAVE_POOL_CAPACITY);

    if (count === 0) {
      if (mainMesh.count !== 0) {
        mainMesh.count = 0;
        edgeMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    mainMesh.count = count;
    edgeMesh.count = count;

    for (let i = 0; i < count; i++) {
      const wave = activeShockwaves[i];
      const elapsed = (now - wave.timestamp) / 1000;
      const progress = Math.min(1.0, Math.max(0, elapsed / SHOCKWAVE_DURATION_S));
      const fade = Math.max(0, (1 - progress) * 0.85);

      if (fade <= 0) {
        dummyWave.scale.set(0, 0, 0);
        dummyWave.updateMatrix();
        mainMesh.setMatrixAt(i, dummyWave.matrix);
        edgeMesh.setMatrixAt(i, dummyWave.matrix);
        continue;
      }

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScale = 0.3 + easeOut * wave.maxRadius;

      dummyWave.position.set(0, 0, 0);
      dummyWave.rotation.set(0, 0, 0);
      dummyWave.scale.set(currentScale, currentScale, 1);
      dummyWave.updateMatrix();
      mainMesh.setMatrixAt(i, dummyWave.matrix);
      edgeMesh.setMatrixAt(i, dummyWave.matrix);

      tempColor.set(wave.color).multiplyScalar(fade);
      mainMesh.setColorAt(i, tempColor);

      tempWhite.setRGB(fade, fade, fade);
      edgeMesh.setColorAt(i, tempWhite);
    }

    mainMesh.instanceMatrix.needsUpdate = true;
    edgeMesh.instanceMatrix.needsUpdate = true;
    if (mainMesh.instanceColor) mainMesh.instanceColor.needsUpdate = true;
    if (edgeMesh.instanceColor) edgeMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[0, -2.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <instancedMesh ref={mainRef} args={[SHARED_MAIN_RING_GEO, undefined, SHOCKWAVE_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={edgeRef} args={[SHARED_EDGE_RING_GEO, undefined, SHOCKWAVE_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
