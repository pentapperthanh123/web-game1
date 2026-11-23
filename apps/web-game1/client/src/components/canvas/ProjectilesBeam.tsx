import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { setActiveSceneCamera } from './summon/summonShared';

const SPARK_VFX_CONSTANTS = {
  CORE_SPIN_SPEED: 10,
  NORMAL_CORE_SCALE: 0.042,
  CRIT_CORE_SCALE: 0.082,
  NORMAL_STREAK_RADIUS: 0.026,
  CRIT_STREAK_RADIUS: 0.052,
  NORMAL_STREAK_LENGTH: 0.34,
  CRIT_STREAK_LENGTH: 0.62,
} as const;

const dummyCore = new THREE.Object3D();
const dummyStreak = new THREE.Object3D();
const lookTarget = new THREE.Vector3();
const tempColor = new THREE.Color();

const computeArcPoint = (
  start: number,
  target: number,
  easedT: number
): number => THREE.MathUtils.lerp(start, target, easedT);

/**
 * Renders lightweight 3D basic-attack light sparks (small bright tip + slim glowing streak),
 * scaling up slightly for Crit/Fury shots.
 */
export const ProjectilesBeam = () => {
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const streakMeshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    setActiveSceneCamera(state.camera);
    const coreMesh = coreMeshRef.current;
    const streakMesh = streakMeshRef.current;
    if (!coreMesh || !streakMesh) return;

    const activeProjectiles = useGameStore.getState().activeProjectiles;
    const count = Math.min(activeProjectiles.length, COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE);

    if (count === 0) {
      if (coreMesh.count !== 0) {
        coreMesh.count = 0;
        streakMesh.count = 0;
      }
      return;
    }

    const now = Date.now();
    const elapsedSec = state.clock.elapsedTime;
    const duration = COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_DURATION_MS;
    coreMesh.count = count;
    streakMesh.count = count;

    for (let i = 0; i < count; i += 1) {
      const proj = activeProjectiles[i];
      const elapsed = now - proj.createdAt;
      const rawProgress = Math.min(1.0, elapsed / duration);

      if (rawProgress >= 1.0) {
        dummyCore.scale.set(0, 0, 0);
        dummyCore.updateMatrix();
        coreMesh.setMatrixAt(i, dummyCore.matrix);

        dummyStreak.scale.set(0, 0, 0);
        dummyStreak.updateMatrix();
        streakMesh.setMatrixAt(i, dummyStreak.matrix);
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

      const coreScale = proj.isCrit
        ? SPARK_VFX_CONSTANTS.CRIT_CORE_SCALE
        : SPARK_VFX_CONSTANTS.NORMAL_CORE_SCALE;
      const streakRadius = proj.isCrit
        ? SPARK_VFX_CONSTANTS.CRIT_STREAK_RADIUS
        : SPARK_VFX_CONSTANTS.NORMAL_STREAK_RADIUS;
      const streakLength =
        (proj.isCrit
          ? SPARK_VFX_CONSTANTS.CRIT_STREAK_LENGTH
          : SPARK_VFX_CONSTANTS.NORMAL_STREAK_LENGTH) *
        (0.85 + rawProgress * 0.35);

      const spinAngle = elapsedSec * SPARK_VFX_CONSTANTS.CORE_SPIN_SPEED + i;

      // 1. Small pinpoint light spark tip
      dummyCore.position.set(x, y, z);
      dummyCore.rotation.set(spinAngle, spinAngle * 0.5, 0);
      dummyCore.scale.set(coreScale, coreScale, coreScale);
      dummyCore.updateMatrix();
      coreMesh.setMatrixAt(i, dummyCore.matrix);

      // 2. Slim trailing light streak
      dummyStreak.position.set(x, y, z);
      dummyStreak.lookAt(lookTarget);
      dummyStreak.rotateX(-Math.PI / 2);
      dummyStreak.scale.set(streakRadius, streakLength, streakRadius);
      dummyStreak.updateMatrix();
      streakMesh.setMatrixAt(i, dummyStreak.matrix);

      tempColor.set(proj.color);
      streakMesh.setColorAt(i, tempColor);
    }

    coreMesh.instanceMatrix.needsUpdate = true;
    streakMesh.instanceMatrix.needsUpdate = true;
    if (streakMesh.instanceColor) {
      streakMesh.instanceColor.needsUpdate = true;
    }
  });

  const maxInstances = COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE;

  return (
    <group>
      <instancedMesh ref={coreMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={streakMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <coneGeometry args={[1, 1.2, 6]} />
        <meshBasicMaterial
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
};
