import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  Vec3Tuple,
  computeProgress,
  easeInCubic,
  easeOutCubic,
  fitStagger,
  phaseProgress,
  resolveLandingX,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, EmberBurst, GlowSprite, GroundDecal, ImpactBurst } from './VfxPrimitives3D';

const MAX_STAGGER = 0.1;
const PROJECTILE_SPAN = 0.72;
/** Fraction of each projectile's window spent in the air; the rest is the impact. */
const FLIGHT_END = 0.6;
const ARC_HEIGHT = 1.1;
/** 4·t·(1−t) peaks at exactly 1 halfway through the flight. */
const PARABOLA_PEAK_FACTOR = 4;
const TRAVEL_EASE_BLEND = 0.35;
const SIZE_RAMP_SPEED = 2;
const MARKER_SHRINK = 0.4;
const LAUNCH_SIZE = 0.35;
const CRUISE_SIZE = 0.6;
const TRAIL_COUNT = 4;
const TRAIL_STEP = 0.045;
const TRAIL_OPACITY = 0.45;
const GLOW_RATIO = 0.55;
const CORE_RATIO = 0.25;
const TARGET_SIZE = 1.3;
const IMPACT_SIZE = 2;
const EMBER_COUNT = 4;
const TARGET_Z_SPREAD = 1.6;

interface ProjectileTarget {
  x: number;
  z: number;
  offset: number;
}

/** Places `object` on the lob from the boss mouth to the target (parabolic height, eased horizontal travel). */
const placeOnArc = (object: THREE.Object3D, flight: number, target: ProjectileTarget, origin: Vec3Tuple): void => {
  const travel = easeOutCubic(flight) * TRAVEL_EASE_BLEND + flight * (1 - TRAVEL_EASE_BLEND);
  object.position.set(
    THREE.MathUtils.lerp(origin[0], target.x, travel),
    THREE.MathUtils.lerp(origin[1], BOSS_3D_ANCHORS.GROUND_Y, travel) + PARABOLA_PEAK_FACTOR * ARC_HEIGHT * travel * (1 - travel),
    THREE.MathUtils.lerp(origin[2], target.z, travel),
  );
};

/** Layered glow orb (halo → colour → white core). */
const ProjectileOrb = ({ color, secondaryColor }: { color: string; secondaryColor: string }) => (
  <>
    <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
    <group scale={GLOW_RATIO}>
      <GlowSprite color={secondaryColor} />
    </group>
    <group scale={CORE_RATIO}>
      <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
    </group>
  </>
);

type ProjectileProps = Pick<SkillVfx3DProps, 'color' | 'secondaryColor' | 'scale' | 'startedAt' | 'durationMs' | 'mouthOrigin'> & {
  target: ProjectileTarget;
  seed: number;
};

const Projectile = ({ target, seed, color, secondaryColor, scale, startedAt, durationMs, mouthOrigin }: ProjectileProps) => {
  const orbRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Group>(null);
  const end = target.offset + PROJECTILE_SPAN;
  const impactStart = target.offset + FLIGHT_END * PROJECTILE_SPAN;

  useFrame(() => {
    const flight = phaseProgress(computeProgress(startedAt, durationMs), target.offset, impactStart);
    const isFlying = flight > 0 && flight < 1;
    const size = (LAUNCH_SIZE + (CRUISE_SIZE - LAUNCH_SIZE) * easeOutCubic(flight * SIZE_RAMP_SPEED)) * scale;
    if (orbRef.current) {
      orbRef.current.visible = isFlying;
      placeOnArc(orbRef.current, flight, target, mouthOrigin);
      orbRef.current.scale.setScalar(size);
      setMaterialOpacity(orbRef.current, BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    trailRef.current?.children.forEach((ghost, index) => {
      const ghostFlight = flight - (index + 1) * TRAIL_STEP;
      ghost.visible = isFlying && ghostFlight > 0;
      placeOnArc(ghost, ghostFlight, target, mouthOrigin);
      ghost.scale.setScalar(size * (1 - (index + 1) / (TRAIL_COUNT + 1)));
      setMaterialOpacity(ghost, TRAIL_OPACITY * (1 - index / TRAIL_COUNT) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    });
    if (markerRef.current) {
      markerRef.current.visible = isFlying;
      markerRef.current.scale.setScalar(TARGET_SIZE * scale * (1 - easeInCubic(flight) * MARKER_SHRINK));
      setMaterialOpacity(markerRef.current, easeInCubic(flight) * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
  });

  const groundPosition = [target.x, BOSS_3D_ANCHORS.GROUND_Y, target.z] as const;

  return (
    <group>
      <group ref={orbRef} visible={false}>
        <ProjectileOrb color={color} secondaryColor={secondaryColor} />
      </group>
      <group ref={trailRef}>
        {Array.from({ length: TRAIL_COUNT }, (_, index) => (
          <GlowSprite key={`${seed}-trail-${index}`} color={secondaryColor} />
        ))}
      </group>
      <group ref={markerRef} position={[target.x, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, target.z]} visible={false}>
        <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
      </group>
      <ImpactBurst color={color} secondaryColor={secondaryColor} position={groundPosition} size={IMPACT_SIZE * scale} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={end} />
      <EmberBurst color={secondaryColor} origin={groundPosition} count={EMBER_COUNT} seed={seed} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={end} scale={scale} />
    </group>
  );
};

/** Glowing orbs with fading trails lobbed from the boss mouth; landing spots are telegraphed, then burst. */
export const ProjectileArc3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs, mouthOrigin }: SkillVfx3DProps) => {
  const targets = useMemo(() => {
    const randoms = seededValues(startedAt, count * 2);
    const stagger = fitStagger(MAX_STAGGER, PROJECTILE_SPAN, count);
    return Array.from({ length: count }, (_, index) => ({
      x: resolveLandingX(direction, randoms[index * 2]),
      z: (randoms[index * 2 + 1] - 0.5) * TARGET_Z_SPREAD,
      offset: index * stagger,
    }));
  }, [startedAt, count, direction]);

  return (
    <group>
      {targets.map((target, index) => (
        <Projectile
          key={`${startedAt}-${index}`}
          target={target}
          seed={startedAt + index}
          color={color}
          secondaryColor={secondaryColor}
          scale={scale}
          startedAt={startedAt}
          durationMs={durationMs}
          mouthOrigin={mouthOrigin}
        />
      ))}
    </group>
  );
};
