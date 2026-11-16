import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GIFT_TIER } from '../../../constants/game';
import { GIFT_CELEBRATION_COLORS, GIFT_FIREWORK } from '../../../constants/giftPresentation';
import { useGameStore } from '../../../store/gameStore';
import { resolveAnnouncementCoins, resolveFireworkShellCount } from '../../../store/giftTier';
import { easeOutCubic, resolveGiftTeamColors } from './giftVfxShared';

const FIREWORK_TIERS: readonly string[] = [GIFT_TIER.BIG, GIFT_TIER.MEGA];
const INSTANCE_COUNT = GIFT_FIREWORK.MAX_SHELL_COUNT * GIFT_FIREWORK.SPARKS_PER_SHELL;
const SPARK_GEO = new THREE.OctahedronGeometry(GIFT_FIREWORK.SPARK_SIZE, 0);
/** Golden-angle steps give an even sphere of sparks and well-spread shell centres without randomness. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GOLDEN_RATIO_STEP = 0.618;
const CENTER_HEIGHT_STEP = 0.382;
/** Sparks flash white-hot for this share of their life before taking the shell colour. */
const WHITE_FLASH_RATIO = 0.18;
/** Sparks keep full size until this share of their life, then shrink to nothing. */
const SHRINK_START_RATIO = 0.55;
const PALETTE_SIZE = 4;

const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const whiteColor = new THREE.Color(GIFT_CELEBRATION_COLORS.WHITE);
const sparkPosition = new THREE.Vector3();
const sparkScale = new THREE.Vector3();
const identityRotation = new THREE.Quaternion();

interface ShellSeed {
  centerX: number;
  centerY: number;
  burstAtMs: number;
}

/** Unit directions on a sphere, shared by every shell. */
const buildSparkDirections = (): THREE.Vector3[] =>
  Array.from({ length: GIFT_FIREWORK.SPARKS_PER_SHELL }, (_, index) => {
    const height = 1 - (2 * (index + 0.5)) / GIFT_FIREWORK.SPARKS_PER_SHELL;
    const ringRadius = Math.sqrt(1 - height * height);
    const angle = index * GOLDEN_ANGLE;
    return new THREE.Vector3(Math.cos(angle) * ringRadius, height, Math.sin(angle) * ringRadius);
  });

/** Shells alternate left / right of the boss and step through heights so a volley fills the sky. */
const buildShellSeeds = (): ShellSeed[] =>
  Array.from({ length: GIFT_FIREWORK.MAX_SHELL_COUNT }, (_, index) => ({
    centerX: (((index * GOLDEN_RATIO_STEP) % 1) * 2 - 1) * GIFT_FIREWORK.CENTER_X_SPREAD,
    centerY: GIFT_FIREWORK.CENTER_Y_MIN + ((index * CENTER_HEIGHT_STEP) % 1) * GIFT_FIREWORK.CENTER_Y_SPREAD,
    burstAtMs: GIFT_FIREWORK.FIRST_SHELL_DELAY_MS + index * GIFT_FIREWORK.SHELL_INTERVAL_MS,
  }));

const hideInstance = (mesh: THREE.InstancedMesh, instanceIndex: number): void => {
  tempMatrix.compose(sparkPosition.set(0, 0, 0), identityRotation, sparkScale.setScalar(0));
  mesh.setMatrixAt(instanceIndex, tempMatrix);
};

/**
 * BIG / MEGA gifts: firework shells bursting above the arena (one instanced draw call).
 * BIG fires a couple, MEGA fires more with each grade; shell colours cycle gold / team / white.
 */
export const GiftFireworks = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lastBannerIdRef = useRef<string | null>(null);
  const directions = useMemo(buildSparkDirections, []);
  const shells = useMemo(buildShellSeeds, []);
  const palette = useMemo(() => Array.from({ length: PALETTE_SIZE }, () => new THREE.Color()), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const banner = useGameStore.getState().activeGiftBanner;
    if (!banner || !FIREWORK_TIERS.includes(banner.tier)) {
      mesh.visible = false;
      return;
    }
    const shellCount = resolveFireworkShellCount(banner.tier, resolveAnnouncementCoins(banner));
    const elapsedMs = Date.now() - banner.timestamp;
    const showEndsAtMs = shells[shellCount - 1].burstAtMs + GIFT_FIREWORK.SHELL_LIFE_MS;
    mesh.visible = elapsedMs >= 0 && elapsedMs < showEndsAtMs;
    if (!mesh.visible) return;

    if (lastBannerIdRef.current !== banner.id) {
      lastBannerIdRef.current = banner.id;
      const colors = resolveGiftTeamColors(banner.team);
      palette[0].set(GIFT_CELEBRATION_COLORS.GOLD);
      palette[1].set(colors.primary);
      palette[2].set(GIFT_CELEBRATION_COLORS.GOLD_LIGHT);
      palette[3].set(colors.secondary);
    }

    shells.forEach((shell, shellIndex) => {
      const life = (elapsedMs - shell.burstAtMs) / GIFT_FIREWORK.SHELL_LIFE_MS;
      const isShellLive = shellIndex < shellCount && life >= 0 && life < 1;
      const firstInstance = shellIndex * GIFT_FIREWORK.SPARKS_PER_SHELL;
      if (!isShellLive) {
        for (let sparkIndex = 0; sparkIndex < GIFT_FIREWORK.SPARKS_PER_SHELL; sparkIndex += 1) hideInstance(mesh, firstInstance + sparkIndex);
        return;
      }
      const radius = easeOutCubic(life) * GIFT_FIREWORK.BURST_RADIUS;
      const droop = life * life * GIFT_FIREWORK.DROOP;
      const size = life < SHRINK_START_RATIO ? 1 : 1 - (life - SHRINK_START_RATIO) / (1 - SHRINK_START_RATIO);
      const fade = 1 - life * life;
      const shellColor = palette[shellIndex % PALETTE_SIZE];
      for (let sparkIndex = 0; sparkIndex < GIFT_FIREWORK.SPARKS_PER_SHELL; sparkIndex += 1) {
        const direction = directions[sparkIndex];
        sparkPosition.set(
          shell.centerX + direction.x * radius,
          shell.centerY + direction.y * radius - droop,
          GIFT_FIREWORK.CENTER_Z + direction.z * radius
        );
        tempMatrix.compose(sparkPosition, identityRotation, sparkScale.setScalar(size));
        mesh.setMatrixAt(firstInstance + sparkIndex, tempMatrix);
        tempColor.copy(whiteColor).lerp(shellColor, Math.min(1, life / WHITE_FLASH_RATIO));
        mesh.setColorAt(firstInstance + sparkIndex, tempColor.multiplyScalar(fade));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[SPARK_GEO, material, INSTANCE_COUNT]} visible={false} frustumCulled={false} />;
};
