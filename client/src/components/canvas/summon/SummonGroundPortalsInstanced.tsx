import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../../constants/game';

const PORTAL_POOL_CAPACITY = 16;

const SHARED_PORTAL_RING_1 = new THREE.RingGeometry(0.22, 0.32, 24);
const SHARED_PORTAL_RING_2 = new THREE.RingGeometry(0.1, 0.19, 6);
const SHARED_PORTAL_CYLINDER = new THREE.CylinderGeometry(0.08, 0.2, 0.8, 12, 1, true);

const dummyObj = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempWhite = new THREE.Color('#ffffff');

export const SummonGroundPortalsInstanced = () => {
  const outerRef = useRef<THREE.InstancedMesh>(null);
  const innerRef = useRef<THREE.InstancedMesh>(null);
  const pillarRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const outerMesh = outerRef.current;
    const innerMesh = innerRef.current;
    const pillarMesh = pillarRef.current;
    if (!outerMesh || !innerMesh || !pillarMesh) return;

    const portals = useGameStore.getState().activeSummonPortals;
    if (portals.length === 0) {
      if (outerMesh.count !== 0) {
        outerMesh.count = 0;
        innerMesh.count = 0;
        pillarMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();
    const durationMs = COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS;
    let activeCount = 0;

    for (let i = 0; i < portals.length && activeCount < PORTAL_POOL_CAPACITY; i++) {
      const portal = portals[i];
      const ageMs = now - portal.createdAt;
      if (ageMs < 0 || ageMs >= durationMs) continue;

      const progress = Math.min(1, ageMs / durationMs);
      const popScale = Math.max(
        0.05,
        progress < 0.2 ? (progress / 0.2) * 1.05 : 1.05 - (progress - 0.2) * 0.15
      );
      const fade = Math.max(0, 1 - Math.pow(progress, 1.8));
      const [px, py, pz] = portal.position;

      dummyObj.position.set(px, py - 0.35, pz);
      dummyObj.rotation.set(-Math.PI / 2, 0, elapsedTime * 3.2);
      dummyObj.scale.setScalar(popScale);
      dummyObj.updateMatrix();
      outerMesh.setMatrixAt(activeCount, dummyObj.matrix);

      dummyObj.position.set(px, py - 0.33, pz);
      dummyObj.rotation.set(-Math.PI / 2, 0, -elapsedTime * 5.0);
      dummyObj.scale.setScalar(popScale);
      dummyObj.updateMatrix();
      innerMesh.setMatrixAt(activeCount, dummyObj.matrix);

      dummyObj.position.set(px, py + 0.45, pz);
      dummyObj.rotation.set(0, 0, 0);
      dummyObj.scale.set(
        popScale * (1 - progress * 0.45),
        popScale * (1 + progress * 0.6),
        popScale * (1 - progress * 0.45)
      );
      dummyObj.updateMatrix();
      pillarMesh.setMatrixAt(activeCount, dummyObj.matrix);

      tempColor.set(portal.color).multiplyScalar(fade * 0.9);
      outerMesh.setColorAt(activeCount, tempColor);

      tempColor.set(portal.color).multiplyScalar(fade * 0.55);
      pillarMesh.setColorAt(activeCount, tempColor);

      const whiteFade = fade * 0.95;
      tempWhite.setRGB(whiteFade, whiteFade, whiteFade);
      innerMesh.setColorAt(activeCount, tempWhite);

      activeCount += 1;
    }

    outerMesh.count = activeCount;
    innerMesh.count = activeCount;
    pillarMesh.count = activeCount;

    if (activeCount === 0) return;

    outerMesh.instanceMatrix.needsUpdate = true;
    innerMesh.instanceMatrix.needsUpdate = true;
    pillarMesh.instanceMatrix.needsUpdate = true;
    if (outerMesh.instanceColor) outerMesh.instanceColor.needsUpdate = true;
    if (innerMesh.instanceColor) innerMesh.instanceColor.needsUpdate = true;
    if (pillarMesh.instanceColor) pillarMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={outerRef} args={[SHARED_PORTAL_RING_1, undefined, PORTAL_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={innerRef} args={[SHARED_PORTAL_RING_2, undefined, PORTAL_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pillarRef} args={[SHARED_PORTAL_CYLINDER, undefined, PORTAL_POOL_CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
