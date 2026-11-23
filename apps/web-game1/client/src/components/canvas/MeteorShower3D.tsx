import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { METEOR_VFX } from './meteor/meteorVfxConstants';
import {
  beginMeteorLayers,
  commitMeteorLayers,
  createMeteorLayers,
  disposeMeteorLayers,
} from './meteor/meteorLayers';
import { createMeteorImpactPool, registerMeteorLandings } from './meteor/meteorImpactPool';
import { writeFallingMeteor } from './meteor/meteorFallWriter';
import { writeMeteorImpact } from './meteor/meteorImpactWriter';

/** Keeps per-meteor flicker phases stable while the store array shifts. */
const METEOR_SEED_MODULUS = 997;

/**
 * Boss / gift meteor rain: ground warning marker → burning rock head with a tapered fiery trail →
 * impact flash, shockwave ring, scorch glow and sparks. Every layer is one pooled InstancedMesh.
 */
export const MeteorShower3D = () => {
  const layers = useMemo(() => createMeteorLayers(), []);
  const impactPool = useMemo(() => createMeteorImpactPool(METEOR_VFX.IMPACT_CAPACITY), []);

  useEffect(() => () => disposeMeteorLayers(layers), [layers]);

  useFrame((state) => {
    const activeMeteors = useGameStore.getState().activeMeteors;
    const now = Date.now();
    const time = state.clock.getElapsedTime();
    const cameraQuaternion = state.camera.quaternion;

    registerMeteorLandings(impactPool, activeMeteors, now);
    beginMeteorLayers(layers);

    const firstIndex = Math.max(0, activeMeteors.length - METEOR_VFX.FALL_CAPACITY);
    for (let index = firstIndex; index < activeMeteors.length; index += 1) {
      const meteor = activeMeteors[index];
      writeFallingMeteor(layers, meteor, now, time, meteor.createdAt % METEOR_SEED_MODULUS, cameraQuaternion);
    }
    for (let slotIndex = 0; slotIndex < impactPool.slots.length; slotIndex += 1) {
      writeMeteorImpact(layers, impactPool.slots[slotIndex], slotIndex, now, cameraQuaternion);
    }

    commitMeteorLayers(layers);
  });

  return (
    <group>
      {layers.list.map((layer) => (
        <primitive key={layer.key} object={layer.mesh} />
      ))}
    </group>
  );
};
