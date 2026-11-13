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
  computeProgress,
  createRibbonGeometry,
  easeOutCubic,
  fadeOut,
  fitStagger,
  opacityLayer,
  phaseProgress,
  resolveLandingX,
  seededValues,
  setMaterialOpacity,
  useDisposeOnUnmount,
  writeRibbon,
} from './bossSkill3DShared';
import { EmberBurst, GroundDecal, ImpactBurst } from './VfxPrimitives3D';

const SEGMENTS = 10;
const POINT_COUNT = SEGMENTS + 1;
const XYZ = 3;
const STAGGER = 0.11;
const STRIKE_SPAN = 0.62;
/** Within a strike: ground telegraph builds, then the bolt lands and flickers out. */
const TELEGRAPH_END = 0.25;
const BOLT_END = 0.6;
const JITTER = 0.75;
const Z_JITTER_RATIO = 0.5;
const REJITTER_MS = 55;
const CORE_HALF_WIDTH = 0.035;
const GLOW_HALF_WIDTH = 0.16;
/** Bolts narrow toward the sky so the impact end reads as the strongest. */
const BOLT_TAPER = 0.6;
const FLICKER_DIM = 0.45;
const FLICKER_DROP_CHANCE = 0.25;
const STRIKE_Z_SPREAD = 1.8;
const TELEGRAPH_SIZE = 1.4;
const IMPACT_SIZE = 2.4;
const EMBER_COUNT = 4;

interface StrikeData {
  x: number;
  z: number;
  offset: number;
}

interface LightningBoltProps extends Pick<SkillVfx3DProps, 'color' | 'secondaryColor' | 'scale' | 'startedAt' | 'durationMs'> {
  strike: StrikeData;
  seed: number;
}

const fillBoltPoints = (points: Float32Array, jitter: number): void => {
  for (let segment = 0; segment < POINT_COUNT; segment += 1) {
    const fraction = segment / SEGMENTS;
    const isEnd = segment === 0 || segment === SEGMENTS;
    const offset = isEnd ? 0 : (Math.random() - 0.5) * jitter;
    points[segment * XYZ] = offset;
    points[segment * XYZ + 1] = THREE.MathUtils.lerp(BOSS_3D_ANCHORS.GROUND_Y, BOSS_3D_ANCHORS.SKY_Y, fraction);
    points[segment * XYZ + 2] = offset * Z_JITTER_RATIO;
  }
};

/** One strike: telegraph glow on the floor → crackling white-core bolt → impact burst and sparks. */
const LightningBolt = ({ strike, seed, color, secondaryColor, scale, startedAt, durationMs }: LightningBoltProps) => {
  const boltRef = useRef<THREE.Group>(null);
  const telegraphRef = useRef<THREE.Group>(null);
  const lastBucketRef = useRef(-1);
  const flickerRef = useRef(1);
  const ribbons = useMemo(() => [createRibbonGeometry(POINT_COUNT), createRibbonGeometry(POINT_COUNT)], []);
  const points = useMemo(() => new Float32Array(POINT_COUNT * XYZ), []);
  useDisposeOnUnmount(ribbons);
  const start = strike.offset;
  const impactStart = start + TELEGRAPH_END * STRIKE_SPAN;

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const local = phaseProgress(progress, start, start + STRIKE_SPAN);
    if (telegraphRef.current) {
      const telegraph = easeOutCubic(phaseProgress(local, 0, TELEGRAPH_END)) * fadeOut(phaseProgress(local, TELEGRAPH_END, BOLT_END));
      telegraphRef.current.visible = local > 0 && local < 1;
      setMaterialOpacity(telegraphRef.current, telegraph * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
    const bolt = boltRef.current;
    if (!bolt) return;
    const boltLocal = phaseProgress(local, TELEGRAPH_END, BOLT_END);
    bolt.visible = boltLocal > 0 && boltLocal < 1;
    if (!bolt.visible) return;
    const bucket = Math.floor((progress * durationMs) / REJITTER_MS);
    if (bucket !== lastBucketRef.current) {
      lastBucketRef.current = bucket;
      flickerRef.current = Math.random() < FLICKER_DROP_CHANCE ? FLICKER_DIM : 1;
      fillBoltPoints(points, JITTER * scale);
      writeRibbon(ribbons[0], points, CORE_HALF_WIDTH * scale, BOLT_TAPER, RIBBON_PLANE.XY);
      writeRibbon(ribbons[1], points, GLOW_HALF_WIDTH * scale, BOLT_TAPER, RIBBON_PLANE.XY);
    }
    setMaterialOpacity(bolt, fadeOut(boltLocal) * flickerRef.current * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
  });

  const groundPosition = [strike.x, BOSS_3D_ANCHORS.GROUND_Y, strike.z] as const;

  return (
    <group>
      <group ref={boltRef} position={[strike.x, 0, strike.z]} visible={false}>
        <mesh geometry={ribbons[1]} frustumCulled={false} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
        </mesh>
        <mesh geometry={ribbons[0]} frustumCulled={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </mesh>
      </group>
      <group ref={telegraphRef} position={[strike.x, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, strike.z]} scale={TELEGRAPH_SIZE * scale} visible={false}>
        <GroundDecal color={secondaryColor} />
      </group>
      <ImpactBurst color={color} secondaryColor={secondaryColor} position={groundPosition} size={IMPACT_SIZE * scale} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={start + STRIKE_SPAN} />
      <EmberBurst color={secondaryColor} origin={groundPosition} count={EMBER_COUNT} seed={seed} startedAt={startedAt} durationMs={durationMs} start={impactStart} end={start + STRIKE_SPAN} scale={scale} />
    </group>
  );
};

/** Sky-to-ground lightning on the attacked wing: telegraphed, layered ribbon bolts with impact bursts. */
export const LightningStrike3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const strikes = useMemo(() => {
    const stagger = fitStagger(STAGGER, STRIKE_SPAN, count);
    const randoms = seededValues(startedAt, count * 2);
    return Array.from({ length: count }, (_, index) => ({
      x: resolveLandingX(direction, randoms[index * 2]),
      z: (randoms[index * 2 + 1] - 0.5) * STRIKE_Z_SPREAD,
      offset: index * stagger,
    }));
  }, [startedAt, count, direction]);

  return (
    <group>
      {strikes.map((strike, index) => (
        <LightningBolt
          key={`${startedAt}-${index}`}
          strike={strike}
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
