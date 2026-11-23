import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { COMBAT_VFX_CONSTANTS, GIFT_TIER, GiftTier, TEAM_KEY } from '../../../constants/game';
import { GIFT_CELEBRATION_COLORS, GIFT_FOUNTAIN_CONFIG, GIFT_FOUNTAIN_MAX_SPARKS } from '../../../constants/giftPresentation';
import { GIFT_VFX_DURATION_MS, GIFT_VFX_LAYOUT, readActiveGiftVfx, resolveGiftTeamColors } from './giftVfxShared';

const SPARKLER_TIERS: readonly GiftTier[] = [GIFT_TIER.MEDIUM, GIFT_TIER.BIG, GIFT_TIER.MEGA];
const SPARK_COUNT = GIFT_FOUNTAIN_MAX_SPARKS;
const RELAUNCH_CYCLE_S = 1.45;
const SPARK_SIZE = 0.028;
const SPARK_GRAVITY = 6.4;
const SPEED = { UP_MIN: 3.0, UP_SPREAD: 2.8, SIDE_MIN: 0.35, SIDE_SPREAD: 1.55 } as const;
const BASE_SPREAD = { X: 0.72, Z: 0.48 } as const;
const MS_PER_SECOND = 1000;
const LAUNCH_SPREAD_S = 0.95;
const SPARK_GEO = new THREE.OctahedronGeometry(SPARK_SIZE, 0);

const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const teamColor = new THREE.Color();
const whiteColor = new THREE.Color(GIFT_CELEBRATION_COLORS.WHITE);
const goldColor = new THREE.Color(GIFT_CELEBRATION_COLORS.GOLD);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GOLDEN_RATIO_STEP = 0.61803398875;
const RADIAL_HASH_STEP = 0.38196601125;
const DEPTH_SPREAD = 0.65;
const COOL_DOWN_RATE = 1.8;
const STRETCH_Y_FACTOR = 1.75;

const hiddenScale = new THREE.Vector3(0, 0, 0);
const sparkScale = new THREE.Vector3(1, 1, 1);
const sparkPosition = new THREE.Vector3();
const sparkEuler = new THREE.Euler();
const sparkRotation = new THREE.Quaternion();
const identityRotation = new THREE.Quaternion();

interface SparkSeed {
  offsetX: number;
  offsetZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  launchAtS: number;
  scaleVariance: number;
  spinX: number;
  spinY: number;
  spinZ: number;
}

/** Deterministic yet decoupled per-spark launch parameters for a natural pyrotechnic fountain. */
const buildSparkSeeds = (): SparkSeed[] =>
  Array.from({ length: SPARK_COUNT }, (_, index) => {
    const angle = index * GOLDEN_ANGLE;
    const vRatio = (index * GOLDEN_RATIO_STEP) % 1;
    const hRatio = ((index * RADIAL_HASH_STEP) + 0.27) % 1;
    const baseRadius = Math.sqrt((index + 0.5) / SPARK_COUNT);
    const sideSpeed = SPEED.SIDE_MIN + hRatio * SPEED.SIDE_SPREAD;

    return {
      offsetX: Math.cos(angle * 1.7) * baseRadius * BASE_SPREAD.X,
      offsetZ: Math.sin(angle * 1.7) * baseRadius * BASE_SPREAD.Z,
      velocityX: Math.cos(angle) * sideSpeed,
      velocityY: SPEED.UP_MIN + vRatio * SPEED.UP_SPREAD,
      velocityZ: Math.sin(angle) * sideSpeed * DEPTH_SPREAD,
      launchAtS: ((index * 0.47) % 1) * LAUNCH_SPREAD_S,
      scaleVariance: 0.65 + ((index * 0.73) % 1) * 0.65,
      spinX: 4.5 + (index % 5) * 1.8,
      spinY: 6.0 + (index % 7) * 1.5,
      spinZ: 3.5 + (index % 4) * 2.1,
    };
  });

/**
 * MEDIUM and up: a shimmering pyrotechnic spark fountain rising from the donor's team wing.
 * Uses decoupled radial/vertical velocities, 3D spin, and a smooth scale envelope so sparks never clump.
 */
export const GiftSparkler = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(buildSparkSeeds, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.88,
        ...COLOR_ONLY_ADDITIVE_PROPS,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const active = readActiveGiftVfx(SPARKLER_TIERS);
    mesh.visible = active !== null;
    if (!active) return;

    const wing =
      COMBAT_VFX_CONSTANTS.WING_BOUNDS[
        active.banner.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG
      ];
    const originX = (wing.minX + wing.maxX) / 2;
    const originZ = (wing.minZ + wing.maxZ) / 2;
    const { tier } = active.banner;
    const fountain = GIFT_FOUNTAIN_CONFIG[tier];
    if (!fountain) return;
    const elapsedS = (active.progress * GIFT_VFX_DURATION_MS[tier]) / MS_PER_SECOND;
    const hotColor = tier === GIFT_TIER.MEGA ? goldColor : whiteColor;
    teamColor.set(resolveGiftTeamColors(active.banner.team).primary);
    const globalFade = Math.sin(Math.min(1, active.progress) * Math.PI);

    seeds.forEach((seed, index) => {
      const sinceLaunchS = elapsedS - seed.launchAtS;
      if (index >= fountain.sparkCount || sinceLaunchS < 0) {
        tempMatrix.compose(
          sparkPosition.set(originX, GIFT_VFX_LAYOUT.FLOOR_Y, originZ),
          identityRotation,
          hiddenScale
        );
        mesh.setMatrixAt(index, tempMatrix);
        return;
      }

      const flightS = sinceLaunchS % RELAUNCH_CYCLE_S;
      const flightProgress = flightS / RELAUNCH_CYCLE_S;
      const lifeEnvelope = Math.sin(flightProgress * Math.PI) * seed.scaleVariance * globalFade;

      if (lifeEnvelope <= 0.01) {
        tempMatrix.compose(
          sparkPosition.set(originX, GIFT_VFX_LAYOUT.FLOOR_Y, originZ),
          identityRotation,
          hiddenScale
        );
        mesh.setMatrixAt(index, tempMatrix);
        return;
      }

      sparkPosition.set(
        originX + seed.offsetX + seed.velocityX * fountain.speedScale * flightS,
        GIFT_VFX_LAYOUT.FLOOR_Y +
          seed.velocityY * fountain.speedScale * flightS -
          0.5 * SPARK_GRAVITY * flightS * flightS,
        originZ + seed.offsetZ + seed.velocityZ * fountain.speedScale * flightS
      );

      sparkEuler.set(
        flightS * seed.spinX,
        flightS * seed.spinY,
        flightS * seed.spinZ
      );
      sparkRotation.setFromEuler(sparkEuler);
      sparkScale.set(lifeEnvelope, lifeEnvelope * STRETCH_Y_FACTOR, lifeEnvelope);

      tempMatrix.compose(sparkPosition, sparkRotation, sparkScale);
      mesh.setMatrixAt(index, tempMatrix);

      tempColor.copy(hotColor).lerp(teamColor, Math.min(1, flightS * COOL_DOWN_RATE));
      mesh.setColorAt(index, tempColor.multiplyScalar(lifeEnvelope));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[SPARK_GEO, material, SPARK_COUNT]}
      visible={false}
      frustumCulled={false}
    />
  );
};
