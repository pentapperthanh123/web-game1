import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS, GIFT_TIER, TEAM_KEY } from '../../../constants/game';
import { GIFT_VFX_DURATION_MS, GIFT_VFX_LAYOUT, readActiveGiftVfx, resolveGiftTeamColors } from './giftVfxShared';

const SPARKLER_TIERS = [GIFT_TIER.MEDIUM] as const;
const SPARK_COUNT = 40;
const SPARK_SIZE = 0.07;
const SPARK_GRAVITY = 6;
const SPEED = { UP_MIN: 3.2, UP_SPREAD: 2.4, SIDE: 1.4 } as const;
const MS_PER_SECOND = 1000;
const LAUNCH_SPREAD_S = 0.6;
const SPARK_GEO = new THREE.OctahedronGeometry(SPARK_SIZE, 0);
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const teamColor = new THREE.Color();
const whiteColor = new THREE.Color('#ffffff');
/** Golden-ratio step spreads spark speeds evenly without randomness. */
const GOLDEN_RATIO_STEP = 0.618;
const DEPTH_SPREAD = 0.5;
const COOL_DOWN_RATE = 2;
const hiddenScale = new THREE.Vector3(0, 0, 0);
const sparkScale = new THREE.Vector3(1, 1, 1);
const sparkPosition = new THREE.Vector3();
const identityRotation = new THREE.Quaternion();

interface SparkSeed {
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  launchAtS: number;
}

/** Fixed per-spark launch parameters (deterministic fountain shape). */
const buildSparkSeeds = (): SparkSeed[] =>
  Array.from({ length: SPARK_COUNT }, (_, index) => {
    const angle = (index / SPARK_COUNT) * Math.PI * 2;
    const ratio = (index * GOLDEN_RATIO_STEP) % 1;
    return {
      velocityX: Math.cos(angle) * SPEED.SIDE * ratio,
      velocityY: SPEED.UP_MIN + ratio * SPEED.UP_SPREAD,
      velocityZ: Math.sin(angle) * SPEED.SIDE * ratio * DEPTH_SPREAD,
      launchAtS: ratio * LAUNCH_SPREAD_S,
    };
  });

/** MEDIUM gifts: a team-colour sparkler fountain rising from the donor's team wing (one instanced draw call). */
export const GiftSparkler = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(buildSparkSeeds, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const active = readActiveGiftVfx(SPARKLER_TIERS);
    mesh.visible = active !== null;
    if (!active) return;

    const wing = COMBAT_VFX_CONSTANTS.WING_BOUNDS[active.banner.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG];
    const originX = (wing.minX + wing.maxX) / 2;
    const originZ = (wing.minZ + wing.maxZ) / 2;
    const elapsedS = (active.progress * GIFT_VFX_DURATION_MS[GIFT_TIER.MEDIUM]) / MS_PER_SECOND;
    teamColor.set(resolveGiftTeamColors(active.banner.team).primary);

    seeds.forEach((seed, index) => {
      const flightS = elapsedS - seed.launchAtS;
      if (flightS < 0) {
        tempMatrix.compose(sparkPosition.set(originX, GIFT_VFX_LAYOUT.FLOOR_Y, originZ), identityRotation, hiddenScale);
        mesh.setMatrixAt(index, tempMatrix);
        return;
      }
      sparkPosition.set(
        originX + seed.velocityX * flightS,
        GIFT_VFX_LAYOUT.FLOOR_Y + seed.velocityY * flightS - 0.5 * SPARK_GRAVITY * flightS * flightS,
        originZ + seed.velocityZ * flightS
      );
      tempMatrix.compose(sparkPosition, identityRotation, sparkScale);
      mesh.setMatrixAt(index, tempMatrix);
      // White-hot at launch, cooling into the team colour, fading out with the window
      tempColor.copy(whiteColor).lerp(teamColor, Math.min(1, flightS * COOL_DOWN_RATE));
      mesh.setColorAt(index, tempColor.multiplyScalar(1 - active.progress));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[SPARK_GEO, material, SPARK_COUNT]} visible={false} frustumCulled={false} />;
};
