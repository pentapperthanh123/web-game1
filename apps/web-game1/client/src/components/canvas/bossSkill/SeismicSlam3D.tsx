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
  easeInCubic,
  easeOutExpo,
  envelope,
  fadeOut,
  opacityLayer,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
  useDisposeOnUnmount,
  writeRibbon,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, EmberBurst, GroundDecal, ImpactBurst } from './VfxPrimitives3D';

/** Timeline: energy gathers under the boss → slam → fissures tear outward → rings roll out → fade. */
const IMPACT_START = 0.14;
const RING_STAGGER = 0.1;
const RING_SPAN = 0.7;
const CRACK_REVEAL_END = 0.4;
const CRACK_RELEASE_START = 0.55;

const CRACK_COUNT = 7;
const CRACK_SEGMENTS = 5;
const CRACK_POINTS = CRACK_SEGMENTS + 1;
const CRACK_LENGTH = 3.2;
const CRACK_WOBBLE = 0.7;
/** Cracks are flattened in depth to match the camera's view of the floor. */
const CRACK_DEPTH_RATIO = 0.6;
const CRACK_CORE_HALF_WIDTH = 0.025;
const CRACK_GLOW_HALF_WIDTH = 0.11;
/** Thick at the impact, sharp at the tip. */
const CRACK_TAPER = 0.9;
const XYZ = 3;

const GATHER_START_SIZE = 3.5;
const GATHER_END_SIZE = 1.2;
const MAX_RING_DIAMETER = 14;
const IMPACT_SIZE = 4.5;
const EMBER_COUNT = 8;
const GROUND_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, 0] as const;
const IMPACT_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y, 0] as const;

/** Crack polyline from tip to centre (tip first so the ribbon taper sharpens the tip). */
const buildCrackPoints = (angle: number, randoms: number[]): Float32Array => {
  const points = new Float32Array(CRACK_POINTS * XYZ);
  let x = 0;
  let z = 0;
  for (let segment = 1; segment <= CRACK_SEGMENTS; segment += 1) {
    const wobble = (randoms[segment % randoms.length] - 0.5) * CRACK_WOBBLE;
    const length = CRACK_LENGTH / CRACK_SEGMENTS;
    x += Math.cos(angle + wobble) * length;
    z += Math.sin(angle + wobble) * length * CRACK_DEPTH_RATIO;
    const target = (CRACK_SEGMENTS - segment) * XYZ;
    points[target] = x;
    points[target + 2] = z;
  }
  return points;
};

const buildCrackGeometries = (seed: number): THREE.BufferGeometry[] => {
  const randoms = seededValues(seed, CRACK_COUNT * CRACK_SEGMENTS);
  return Array.from({ length: CRACK_COUNT }, (_, index) => {
    const points = buildCrackPoints((index / CRACK_COUNT) * Math.PI * 2, randoms.slice(index * CRACK_SEGMENTS, (index + 1) * CRACK_SEGMENTS));
    const core = createRibbonGeometry(CRACK_POINTS);
    const glow = createRibbonGeometry(CRACK_POINTS);
    writeRibbon(core, points, CRACK_CORE_HALF_WIDTH, CRACK_TAPER, RIBBON_PLANE.XZ);
    writeRibbon(glow, points, CRACK_GLOW_HALF_WIDTH, CRACK_TAPER, RIBBON_PLANE.XZ);
    return [core, glow];
  }).flat();
};

/** Anticipation glow, slam burst, glowing fissures tearing outward and stacked shockwave bands. */
export const SeismicSlam3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const gatherRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const crackGroupRef = useRef<THREE.Group>(null);
  const ringCount = Math.max(2, count);
  const crackGeometries = useMemo(() => buildCrackGeometries(startedAt), [startedAt]);
  useDisposeOnUnmount(crackGeometries);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    if (gatherRef.current) {
      const gather = phaseProgress(progress, 0, IMPACT_START);
      gatherRef.current.visible = gather > 0 && gather < 1;
      gatherRef.current.scale.setScalar(THREE.MathUtils.lerp(GATHER_START_SIZE, GATHER_END_SIZE, easeInCubic(gather)) * scale);
      setMaterialOpacity(gatherRef.current, easeInCubic(gather) * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
    ringGroupRef.current?.children.forEach((ring, index) => {
      const start = IMPACT_START + index * RING_STAGGER;
      const local = phaseProgress(progress, start, Math.min(1, start + RING_SPAN));
      ring.visible = local > 0 && local < 1;
      ring.scale.setScalar(easeOutExpo(local) * MAX_RING_DIAMETER * scale);
      setMaterialOpacity(ring, fadeOut(local) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    });
    if (crackGroupRef.current) {
      const crackLocal = phaseProgress(progress, IMPACT_START, 1);
      crackGroupRef.current.visible = crackLocal > 0 && crackLocal < 1;
      const reveal = easeOutExpo(phaseProgress(crackLocal, 0, CRACK_REVEAL_END));
      crackGroupRef.current.scale.set(reveal * scale, 1, reveal * scale);
      setMaterialOpacity(crackGroupRef.current, envelope(crackLocal, CRACK_REVEAL_END / 2, CRACK_RELEASE_START) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
  });

  return (
    <group>
      <group ref={gatherRef} position={GROUND_POSITION} visible={false}>
        <GroundDecal color={secondaryColor} />
      </group>
      <group ref={ringGroupRef} position={GROUND_POSITION}>
        {Array.from({ length: ringCount }, (_, index) => (
          <group key={`${startedAt}-ring-${index}`} visible={false}>
            <GroundDecal color={index === 0 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : color} texture={DECAL_TEXTURE.RING} />
          </group>
        ))}
      </group>
      <group ref={crackGroupRef} position={GROUND_POSITION} visible={false}>
        {crackGeometries.map((geometry, index) => {
          const isCore = index % 2 === 0;
          const layer = isCore ? BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.CORE : BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW;
          return (
            <mesh key={`${startedAt}-crack-${index}`} geometry={geometry} userData={opacityLayer(layer)}>
              <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={isCore ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : secondaryColor} />
            </mesh>
          );
        })}
      </group>
      <ImpactBurst color={color} secondaryColor={secondaryColor} position={IMPACT_POSITION} size={IMPACT_SIZE * scale} startedAt={startedAt} durationMs={durationMs} start={IMPACT_START} end={1} />
      <EmberBurst color={secondaryColor} origin={IMPACT_POSITION} count={EMBER_COUNT} seed={startedAt} startedAt={startedAt} durationMs={durationMs} start={IMPACT_START} end={1} scale={scale} />
    </group>
  );
};
