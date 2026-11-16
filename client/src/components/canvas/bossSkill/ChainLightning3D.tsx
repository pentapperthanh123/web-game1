import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  RIBBON_PLANE,
  SkillVfx3DProps,
  Vec3Tuple,
  bellCurve,
  computeProgress,
  createRibbonGeometry,
  easeOutCubic,
  fadeOut,
  fitStagger,
  opacityLayer,
  phaseProgress,
  resolveImpactSpot,
  resolveLandingX,
  seededValues,
  setMaterialOpacity,
  useDisposeOnUnmount,
  writeRibbon,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, EmberBurst, GlowSprite, GroundDecal, ImpactBurst } from './VfxPrimitives3D';

const SEGMENTS = 12;
const POINT_COUNT = SEGMENTS + 1;
const XYZ = 3;
/** Bolts used when the attacked wing is empty, so the cast still reads as an attack. */
const FALLBACK_BOLT_COUNT = 3;
const FALLBACK_Z_SPREAD = 1.6;
const STAGGER = 0.09;
const BOLT_SPAN = 0.55;
/** Within one bolt: the floor mark builds, the bolt connects and crackles, then fades. */
const TELEGRAPH_END = 0.22;
const BOLT_START = 0.18;
const BOLT_END = 0.85;
const JITTER = 0.42;
/** Jitter shrinks toward both ends so the bolt stays attached to the eye and to its target. */
const REJITTER_MS = 45;
const CORE_HALF_WIDTH = 0.03;
const GLOW_HALF_WIDTH = 0.11;
const HALO_HALF_WIDTH = 0.3;
/** Slight taper toward the eye: the strike end is the thickest. */
const BOLT_TAPER = 0.35;
const FLICKER_DIM = 0.5;
const FLICKER_DROP_CHANCE = 0.2;
const TELEGRAPH_SIZE = 1.3;
const SCORCH_RING_SIZE = 1.7;
const IMPACT_SIZE = 2.2;
const EMBER_COUNT = 5;
const MUZZLE_MIN_SIZE = 0.5;
const MUZZLE_GROW = 1.1;
const MUZZLE_CORE_RATIO = 0.4;
const MUZZLE_FLICKER_RATE = 0.05;
const MUZZLE_FLICKER_AMPLITUDE = 0.12;
const RIBBON_LAYERS = 3;

interface BoltTarget {
  x: number;
  z: number;
  offset: number;
}

interface ChainBoltProps extends Pick<SkillVfx3DProps, 'color' | 'secondaryColor' | 'scale' | 'startedAt' | 'durationMs'> {
  origin: Vec3Tuple;
  target: BoltTarget;
  seed: number;
}

/** Jagged path from the eye to the target; the middle of the bolt wanders the most. */
const fillBoltPoints = (points: Float32Array, origin: Vec3Tuple, target: BoltTarget, jitter: number): void => {
  for (let segment = 0; segment < POINT_COUNT; segment += 1) {
    const fraction = segment / SEGMENTS;
    const wander = Math.sin(fraction * Math.PI) * jitter;
    const base = segment * XYZ;
    points[base] = THREE.MathUtils.lerp(origin[0], target.x, fraction) + (Math.random() - 0.5) * wander;
    points[base + 1] = THREE.MathUtils.lerp(origin[1], BOSS_3D_ANCHORS.GROUND_Y, fraction) + (Math.random() - 0.5) * wander;
    points[base + 2] = THREE.MathUtils.lerp(origin[2], target.z, fraction);
  }
};

/** One bolt: floor mark under the target → crackling bolt from the eye → impact burst, sparks and a scorch ring. */
const ChainBolt = ({ origin, target, seed, color, secondaryColor, scale, startedAt, durationMs }: ChainBoltProps) => {
  const boltRef = useRef<THREE.Group>(null);
  const telegraphRef = useRef<THREE.Group>(null);
  const lastBucketRef = useRef(-1);
  const flickerRef = useRef(1);
  const ribbons = useMemo(() => Array.from({ length: RIBBON_LAYERS }, () => createRibbonGeometry(POINT_COUNT)), []);
  const points = useMemo(() => new Float32Array(POINT_COUNT * XYZ), []);
  useDisposeOnUnmount(ribbons);
  const start = target.offset;
  const end = start + BOLT_SPAN;
  const impactStart = start + BOLT_START * BOLT_SPAN;

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const local = phaseProgress(progress, start, end);
    if (telegraphRef.current) {
      telegraphRef.current.visible = local > 0 && local < 1;
      const mark = easeOutCubic(phaseProgress(local, 0, TELEGRAPH_END)) * fadeOut(phaseProgress(local, BOLT_START, 1));
      setMaterialOpacity(telegraphRef.current, mark * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
    const bolt = boltRef.current;
    if (!bolt) return;
    const boltLocal = phaseProgress(local, BOLT_START, BOLT_END);
    bolt.visible = boltLocal > 0 && boltLocal < 1;
    if (!bolt.visible) return;
    const bucket = Math.floor((progress * durationMs) / REJITTER_MS);
    if (bucket !== lastBucketRef.current) {
      lastBucketRef.current = bucket;
      flickerRef.current = Math.random() < FLICKER_DROP_CHANCE ? FLICKER_DIM : 1;
      fillBoltPoints(points, origin, target, JITTER * scale);
      writeRibbon(ribbons[0], points, CORE_HALF_WIDTH * scale, BOLT_TAPER, RIBBON_PLANE.XY);
      writeRibbon(ribbons[1], points, GLOW_HALF_WIDTH * scale, BOLT_TAPER, RIBBON_PLANE.XY);
      writeRibbon(ribbons[2], points, HALO_HALF_WIDTH * scale, BOLT_TAPER, RIBBON_PLANE.XY);
    }
    setMaterialOpacity(bolt, fadeOut(boltLocal) * flickerRef.current * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
  });

  const groundPosition = [target.x, BOSS_3D_ANCHORS.GROUND_Y, target.z] as const;

  return (
    <group>
      <group ref={boltRef} visible={false}>
        <mesh geometry={ribbons[2]} frustumCulled={false} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO)}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
        </mesh>
        <mesh geometry={ribbons[1]} frustumCulled={false} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
        </mesh>
        <mesh geometry={ribbons[0]} frustumCulled={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </mesh>
      </group>
      <group ref={telegraphRef} position={[target.x, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, target.z]} visible={false}>
        <group scale={TELEGRAPH_SIZE * scale}>
          <GroundDecal color={color} />
        </group>
        <group scale={SCORCH_RING_SIZE * scale}>
          <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
        </group>
      </group>
      <ImpactBurst color={color} secondaryColor={secondaryColor} position={groundPosition} size={IMPACT_SIZE * scale} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={end} />
      <EmberBurst color={secondaryColor} origin={groundPosition} count={EMBER_COUNT} seed={seed} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={end} scale={scale} />
    </group>
  );
};

/**
 * Forked lightning from the boss eye: one crackling bolt per hurt champion, each ending exactly
 * where that champion stands, so what the viewers see struck is what loses HP.
 */
export const ChainLightning3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs, eyeOrigin, impactPoints }: SkillVfx3DProps) => {
  const muzzleRef = useRef<THREE.Group>(null);
  const targets = useMemo(() => {
    const boltCount = Math.min(count, impactPoints.length || FALLBACK_BOLT_COUNT);
    const randoms = seededValues(startedAt, boltCount * 2);
    const stagger = fitStagger(STAGGER, BOLT_SPAN, boltCount);
    return Array.from({ length: boltCount }, (_, index): BoltTarget => {
      const [x, z] = resolveImpactSpot(
        impactPoints,
        index,
        resolveLandingX(direction, randoms[index * 2]),
        (randoms[index * 2 + 1] - 0.5) * FALLBACK_Z_SPREAD
      );
      return { x, z, offset: index * stagger };
    });
  }, [startedAt, count, direction, impactPoints]);

  useFrame(() => {
    const muzzle = muzzleRef.current;
    if (!muzzle) return;
    const progress = computeProgress(startedAt, durationMs);
    muzzle.visible = progress > 0 && progress < 1;
    const flicker = 1 + Math.sin(progress * durationMs * MUZZLE_FLICKER_RATE) * MUZZLE_FLICKER_AMPLITUDE;
    muzzle.scale.setScalar(scale * (MUZZLE_MIN_SIZE + MUZZLE_GROW * bellCurve(progress)) * flicker);
    setMaterialOpacity(muzzle, bellCurve(progress) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
  });

  return (
    <group>
      <group ref={muzzleRef} position={eyeOrigin} visible={false}>
        <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
        <group scale={MUZZLE_CORE_RATIO}>
          <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </group>
      </group>
      {targets.map((target, index) => (
        <ChainBolt
          key={`${startedAt}-${index}`}
          origin={eyeOrigin}
          target={target}
          seed={startedAt + index}
          color={color}
          secondaryColor={secondaryColor}
          scale={scale}
          startedAt={startedAt}
          durationMs={durationMs}
        />
      ))}
    </group>
  );
};
