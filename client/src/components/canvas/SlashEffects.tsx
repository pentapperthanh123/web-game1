import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';

const SLASH_POOL_CAPACITY = 40;

const SHARED_SLASH_RING_1 = new THREE.RingGeometry(0.26, 0.31, 24, 1, 0, Math.PI * 0.65);
const SHARED_SLASH_RING_2 = new THREE.RingGeometry(0.28, 0.3, 24, 1, 0, Math.PI * 0.65);
const SHARED_SLASH_RING_CRIT = new THREE.RingGeometry(0.25, 0.29, 20, 1, 0, Math.PI * 0.6);
const SHARED_OCTAHEDRON_FLARE = new THREE.OctahedronGeometry(0.06, 0);

const dummyObj = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempWhite = new THREE.Color('#ffffff');

export const SlashEffects = () => {
  const mainRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const crossRef = useRef<THREE.InstancedMesh>(null);
  const flareRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const mainMesh = mainRef.current;
    const coreMesh = coreRef.current;
    const crossMesh = crossRef.current;
    const flareMesh = flareRef.current;
    if (!mainMesh || !coreMesh || !crossMesh || !flareMesh) return;

    const activeSlashes = useGameStore.getState().activeSlashes;
    const count = Math.min(activeSlashes.length, SLASH_POOL_CAPACITY);

    if (count === 0) {
      if (mainMesh.count !== 0) {
        mainMesh.count = 0;
        coreMesh.count = 0;
        crossMesh.count = 0;
        flareMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const duration = COMBAT_VFX_CONSTANTS.DAMAGE.SLASH_DURATION_S;
    mainMesh.count = count;
    coreMesh.count = count;
    crossMesh.count = count;
    flareMesh.count = count;

    for (let i = 0; i < count; i++) {
      const slash = activeSlashes[i];
      const elapsed = (now - slash.createdAt) / 1000;
      const progress = Math.min(1.0, Math.max(0, elapsed / duration));
      const fade = Math.max(0, 1 - Math.pow(progress, 1.6));

      if (fade <= 0) {
        dummyObj.scale.set(0, 0, 0);
        dummyObj.updateMatrix();
        mainMesh.setMatrixAt(i, dummyObj.matrix);
        coreMesh.setMatrixAt(i, dummyObj.matrix);
        crossMesh.setMatrixAt(i, dummyObj.matrix);
        flareMesh.setMatrixAt(i, dummyObj.matrix);
        continue;
      }

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const scaleX = slash.scale * (0.45 + easeOut * 0.4);
      const scaleY = slash.scale * Math.max(0.04, 0.42 - progress * 0.32);

      dummyObj.position.set(slash.position[0], slash.position[1], slash.position[2]);
      dummyObj.rotation.set(slash.tiltX, slash.tiltY, slash.rotationZ);
      dummyObj.scale.set(scaleX, scaleY, 1);
      dummyObj.updateMatrix();
      mainMesh.setMatrixAt(i, dummyObj.matrix);
      coreMesh.setMatrixAt(i, dummyObj.matrix);

      if (slash.isCrit) {
        dummyObj.rotation.set(slash.tiltX, slash.tiltY, slash.rotationZ + Math.PI * 0.65);
        dummyObj.updateMatrix();
        crossMesh.setMatrixAt(i, dummyObj.matrix);
      } else {
        dummyObj.scale.set(0, 0, 0);
        dummyObj.updateMatrix();
        crossMesh.setMatrixAt(i, dummyObj.matrix);
      }

      const flareScale = slash.isCrit ? 1.3 : 0.85;
      dummyObj.position.set(slash.position[0], slash.position[1] + 0.28 * scaleY, slash.position[2]);
      dummyObj.rotation.set(slash.tiltX, slash.tiltY, slash.rotationZ);
      dummyObj.scale.set(scaleX * flareScale, scaleY * flareScale, flareScale);
      dummyObj.updateMatrix();
      flareMesh.setMatrixAt(i, dummyObj.matrix);

      // With AdditiveBlending at opacity=1, scaling RGB by fade fades cleanly in 1 draw call
      tempColor.set(slash.color).multiplyScalar(fade);
      mainMesh.setColorAt(i, tempColor);
      crossMesh.setColorAt(i, tempColor);

      tempWhite.setRGB(fade, fade, fade);
      coreMesh.setColorAt(i, tempWhite);
      flareMesh.setColorAt(i, tempWhite);
    }

    mainMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
    crossMesh.instanceMatrix.needsUpdate = true;
    flareMesh.instanceMatrix.needsUpdate = true;
    if (mainMesh.instanceColor) mainMesh.instanceColor.needsUpdate = true;
    if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
    if (crossMesh.instanceColor) crossMesh.instanceColor.needsUpdate = true;
    if (flareMesh.instanceColor) flareMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={mainRef} args={[SHARED_SLASH_RING_1, undefined, SLASH_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreRef} args={[SHARED_SLASH_RING_2, undefined, SLASH_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={crossRef} args={[SHARED_SLASH_RING_CRIT, undefined, SLASH_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flareRef} args={[SHARED_OCTAHEDRON_FLARE, undefined, SLASH_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
