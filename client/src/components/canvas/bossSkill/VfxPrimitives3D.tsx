import { useMemo, useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  ADDITIVE_MATERIAL_PROPS,
  FLAT_ON_GROUND,
  SHARED_QUAD_GEO,
  computeProgress,
  easeOutExpo,
  fadeOut,
  getSoftGlowTexture,
  getSoftRingTexture,
  opacityLayer,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';

type Vec3 = readonly [number, number, number];

export const DECAL_TEXTURE = {
  GLOW: 'GLOW',
  RING: 'RING',
} as const;
export type DecalTexture = (typeof DECAL_TEXTURE)[keyof typeof DECAL_TEXTURE];

const DECAL_TEXTURE_RESOLVER: Readonly<Record<DecalTexture, () => THREE.Texture>> = {
  [DECAL_TEXTURE.GLOW]: getSoftGlowTexture,
  [DECAL_TEXTURE.RING]: getSoftRingTexture,
};

interface GlowSpriteProps {
  color: string;
  opacityScale?: number;
  position?: Vec3;
  ref?: Ref<THREE.Sprite>;
}

/** Camera-facing soft glow (halo, flash, spark). Opacity starts at 0 — drive it with setMaterialOpacity. */
export const GlowSprite = ({ color, opacityScale = 1, position, ref }: GlowSpriteProps) => (
  <sprite ref={ref} position={position} userData={opacityLayer(opacityScale)}>
    <spriteMaterial {...ADDITIVE_MATERIAL_PROPS} map={getSoftGlowTexture()} color={color} />
  </sprite>
);

interface GroundDecalProps {
  color: string;
  texture?: DecalTexture;
  opacityScale?: number;
  position?: Vec3;
  ref?: Ref<THREE.Mesh>;
}

/** Soft textured quad lying on the floor — impact glow, scorch, shockwave band. */
export const GroundDecal = ({ color, texture = DECAL_TEXTURE.GLOW, opacityScale = 1, position, ref }: GroundDecalProps) => (
  <mesh ref={ref} geometry={SHARED_QUAD_GEO} position={position} rotation={FLAT_ON_GROUND} userData={opacityLayer(opacityScale)}>
    <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={DECAL_TEXTURE_RESOLVER[texture]()} color={color} />
  </mesh>
);

const EMBER_GRAVITY = -7;
const EMBER_MIN_SPEED = 1.6;
const EMBER_SPEED_RANGE = 1.8;
const EMBER_UPWARD_BIAS = 2.4;
const EMBER_MIN_SIZE = 0.08;
const EMBER_SIZE_RANGE = 0.1;
const MS_TO_SECONDS = 1 / 1000;
const EMBER_LIFT_RATIO = 0.5;
const EMBER_SHRINK = 0.5;
const MAX_EMBER_OPACITY = 0.8;
const RANDOMS_PER_EMBER = 3;

interface EmberBurstProps {
  color: string;
  origin: Vec3;
  count: number;
  seed: number;
  startedAt: number;
  durationMs: number;
  /** Clip progress window in which the embers fly. */
  start: number;
  end: number;
  scale: number;
}

/** A handful of sparks thrown out of an impact point, arcing down under gravity. */
export const EmberBurst = ({ color, origin, count, seed, startedAt, durationMs, start, end, scale }: EmberBurstProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const embers = useMemo(() => {
    const randoms = seededValues(seed, count * RANDOMS_PER_EMBER);
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + randoms[index * RANDOMS_PER_EMBER];
      const speed = (EMBER_MIN_SPEED + randoms[index * RANDOMS_PER_EMBER + 1] * EMBER_SPEED_RANGE) * scale;
      return {
        velocity: [Math.cos(angle) * speed, EMBER_UPWARD_BIAS * scale * randoms[index * RANDOMS_PER_EMBER + 2] + speed * EMBER_LIFT_RATIO, Math.sin(angle) * speed] as const,
        size: (EMBER_MIN_SIZE + randoms[index * RANDOMS_PER_EMBER + 2] * EMBER_SIZE_RANGE) * scale,
      };
    });
  }, [seed, count, scale]);
  const flightSeconds = (end - start) * durationMs * MS_TO_SECONDS;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const local = phaseProgress(computeProgress(startedAt, durationMs), start, end);
    group.visible = local > 0 && local < 1;
    if (!group.visible) return;
    const seconds = local * flightSeconds;
    group.children.forEach((ember, index) => {
      const { velocity, size } = embers[index];
      ember.position.set(
        origin[0] + velocity[0] * seconds,
        origin[1] + velocity[1] * seconds + 0.5 * EMBER_GRAVITY * seconds * seconds,
        origin[2] + velocity[2] * seconds,
      );
      ember.scale.setScalar(size * (1 - local * EMBER_SHRINK));
    });
    setMaterialOpacity(group, fadeOut(local) * MAX_EMBER_OPACITY);
  });

  return (
    <group ref={groupRef} visible={false}>
      {embers.map((_, index) => (
        <GlowSprite key={`${seed}-ember-${index}`} color={color} />
      ))}
    </group>
  );
};

const FLASH_SPAN = 0.35;
const FLASH_MIN_SIZE = 0.4;
const FLASH_GROW = 0.8;
const FLASH_HEIGHT = 0.35;
const RING_MIN_SIZE = 0.2;
const SCORCH_SIZE_RATIO = 0.75;

interface ImpactBurstProps {
  color: string;
  secondaryColor: string;
  /** Ground point of the impact (y is the floor). */
  position: Vec3;
  size: number;
  startedAt: number;
  durationMs: number;
  start: number;
  end: number;
}

/** Shared impact: brief white-hot flash, expanding soft shockwave band and a lingering ground glow. */
export const ImpactBurst = ({ color, secondaryColor, position, size, startedAt, durationMs, start, end }: ImpactBurstProps) => {
  const flashRef = useRef<THREE.Sprite>(null);
  const ringRef = useRef<THREE.Group>(null);
  const scorchRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const local = phaseProgress(computeProgress(startedAt, durationMs), start, end);
    const isAlive = local > 0 && local < 1;
    const flashLocal = phaseProgress(local, 0, FLASH_SPAN);
    if (flashRef.current) {
      flashRef.current.visible = isAlive && flashLocal < 1;
      flashRef.current.scale.setScalar(size * (FLASH_MIN_SIZE + FLASH_GROW * easeOutExpo(flashLocal)));
      setMaterialOpacity(flashRef.current, fadeOut(flashLocal) * BOSS_SKILL_VFX_STYLE.MAX_FLASH_OPACITY);
    }
    if (ringRef.current) {
      ringRef.current.visible = isAlive;
      ringRef.current.scale.setScalar(size * (RING_MIN_SIZE + (1 - RING_MIN_SIZE) * easeOutExpo(local)));
      setMaterialOpacity(ringRef.current, fadeOut(local) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
    if (scorchRef.current) {
      scorchRef.current.visible = isAlive;
      setMaterialOpacity(scorchRef.current, fadeOut(local) * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
  });

  return (
    <group position={position}>
      <GlowSprite ref={flashRef} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} position={[0, FLASH_HEIGHT * size, 0]} />
      <group ref={ringRef} visible={false}>
        <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
      </group>
      <group ref={scorchRef} scale={size * SCORCH_SIZE_RATIO} visible={false}>
        <GroundDecal color={color} />
      </group>
    </group>
  );
};
