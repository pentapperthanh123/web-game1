import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';

const dummyCore = new THREE.Object3D();
const dummyAura = new THREE.Object3D();
const lookTarget = new THREE.Vector3();
const tempColor = new THREE.Color();

const computeArcPoint = (
  start: number,
  target: number,
  easedT: number
): number => THREE.MathUtils.lerp(start, target, easedT);

export const ProjectilesBeam = () => {
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const auraMeshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const coreMesh = coreMeshRef.current;
    const auraMesh = auraMeshRef.current;
    if (!coreMesh || !auraMesh) return;

    const activeProjectiles = useGameStore.getState().activeProjectiles;
    const count = Math.min(activeProjectiles.length, COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE);

    if (count === 0) {
      if (coreMesh.count !== 0) {
        coreMesh.count = 0;
        auraMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const duration = COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_DURATION_MS;
    coreMesh.count = count;
    auraMesh.count = count;

    for (let i = 0; i < count; i++) {
      const proj = activeProjectiles[i];
      const elapsed = now - proj.createdAt;
      const rawProgress = Math.min(1.0, elapsed / duration);

      if (rawProgress >= 1.0) {
        dummyCore.scale.set(0, 0, 0);
        dummyCore.updateMatrix();
        coreMesh.setMatrixAt(i, dummyCore.matrix);

        dummyAura.scale.set(0, 0, 0);
        dummyAura.updateMatrix();
        auraMesh.setMatrixAt(i, dummyAura.matrix);
        continue;
      }

      const eased = 0.25 * rawProgress + 0.75 * (rawProgress * rawProgress);
      const nextEased = Math.min(1.0, eased + 0.06);

      const x = computeArcPoint(proj.startX, proj.targetX, eased);
      const y =
        computeArcPoint(proj.startY, proj.targetY, eased) +
        Math.sin(eased * Math.PI) * proj.arcHeight;
      const z = computeArcPoint(proj.startZ, proj.targetZ, eased);

      const nextX = computeArcPoint(proj.startX, proj.targetX, nextEased);
      const nextY =
        computeArcPoint(proj.startY, proj.targetY, nextEased) +
        Math.sin(nextEased * Math.PI) * proj.arcHeight;
      const nextZ = computeArcPoint(proj.startZ, proj.targetZ, nextEased);

      lookTarget.set(nextX, nextY, nextZ);

      const widthMult = proj.isCrit ? 1.4 : 1.0;
      // Proportional projectile missile length - sleek bullet instead of full-screen beam
      const lengthScale = (0.75 + rawProgress * 0.45) * (proj.isCrit ? 1.25 : 1.0);

      dummyCore.position.set(x, y, z);
      dummyCore.lookAt(lookTarget);
      dummyCore.rotateX(Math.PI / 2);
      dummyCore.scale.set(0.06 * widthMult, lengthScale, 0.06 * widthMult);
      dummyCore.updateMatrix();
      coreMesh.setMatrixAt(i, dummyCore.matrix);

      dummyAura.position.set(x, y, z);
      dummyAura.lookAt(lookTarget);
      dummyAura.rotateX(Math.PI / 2);
      dummyAura.scale.set(0.14 * widthMult, lengthScale * 1.15, 0.14 * widthMult);
      dummyAura.updateMatrix();
      auraMesh.setMatrixAt(i, dummyAura.matrix);

      tempColor.set(proj.color);
      auraMesh.setColorAt(i, tempColor);
    }

    coreMesh.instanceMatrix.needsUpdate = true;
    auraMesh.instanceMatrix.needsUpdate = true;
    if (auraMesh.instanceColor) {
      auraMesh.instanceColor.needsUpdate = true;
    }
  });

  const maxInstances = COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE;

  return (
    <group>
      <instancedMesh ref={coreMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <cylinderGeometry args={[0.03, 0.07, 0.45, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={auraMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.12, 0.52, 6]} />
        <meshBasicMaterial
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
};
