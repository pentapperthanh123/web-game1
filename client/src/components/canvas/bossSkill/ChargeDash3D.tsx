import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  BOSS_3D_ANCHORS,
  SkillVfx3DProps,
  bellCurve,
  computeProgress,
  easeInCubic,
  easeOutCubic,
  fitStagger,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { EmberBurst, GlowSprite, ImpactBurst } from './VfxPrimitives3D';

const PUFF_SPACING = 0.55;
const PUFF_START_OFFSET = 0.4;
const PUFF_STAGGER = 0.07;
const PUFF_LIFE = 0.6;
const PUFF_DRIFT = 0.6;
const PUFF_RISE = 0.45;
const PUFF_Z_SPREAD = 0.8;
const PUFF_MIN_SIZE = 0.6;
const PUFF_SIZE_RANGE = 0.5;
const PUFF_GROWTH = 1.4;
const PUFF_HEIGHT = 0.15;
/** Dust is a supporting layer — kept well under the glow cap. */
const PUFF_OPACITY_RATIO = 0.55;

const STREAK_COUNT = 3;
const STREAK_END = 0.5;
const STREAK_TRAVEL = 2.6;
const STREAK_LENGTH = 1.8;
const STREAK_THICKNESS = 0.07;
const STREAK_HEIGHTS: readonly number[] = [0.35, 0.75, 1.15];
const STREAK_STAGGER = 0.06;
const STREAK_SHRINK = 0.5;

const IMPACT_START = 0.42;
const IMPACT_SIZE = 3.2;
const EMBER_COUNT = 6;
const RANDOMS_PER_PUFF = 2;

/** Dust kicked up along the charge path, speed streaks rushing forward and a shock burst on impact. */
export const ChargeDash3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const puffGroupRef = useRef<THREE.Group>(null);
  const streakGroupRef = useRef<THREE.Group>(null);
  const trailSide = direction >= 0 ? -1 : 1;
  const impactX = direction === 0 ? 0 : direction * BOSS_3D_ANCHORS.WING_X;
  const puffs = useMemo(() => {
    const randoms = seededValues(startedAt, count * RANDOMS_PER_PUFF);
    const stagger = fitStagger(PUFF_STAGGER, PUFF_LIFE, count);
    return Array.from({ length: count }, (_, index) => ({
      x: impactX + trailSide * (PUFF_START_OFFSET + index * PUFF_SPACING) * scale,
      z: (randoms[index * RANDOMS_PER_PUFF] - 0.5) * PUFF_Z_SPREAD,
      size: PUFF_MIN_SIZE + randoms[index * RANDOMS_PER_PUFF + 1] * PUFF_SIZE_RANGE,
      offset: index * stagger,
    }));
  }, [startedAt, count, scale, trailSide, impactX]);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    puffGroupRef.current?.children.forEach((puff, index) => {
      const data = puffs[index];
      const local = phaseProgress(progress, data.offset, data.offset + PUFF_LIFE);
      puff.visible = local > 0 && local < 1;
      const drift = easeOutCubic(local);
      puff.position.set(data.x + trailSide * drift * PUFF_DRIFT, BOSS_3D_ANCHORS.GROUND_Y + PUFF_HEIGHT + drift * PUFF_RISE, data.z);
      puff.scale.setScalar(data.size * (1 + drift * PUFF_GROWTH) * scale);
      setMaterialOpacity(puff, bellCurve(local) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY * PUFF_OPACITY_RATIO);
    });
    streakGroupRef.current?.children.forEach((streak, index) => {
      const local = phaseProgress(progress, index * STREAK_STAGGER, STREAK_END);
      streak.visible = local > 0 && local < 1;
      const travel = easeInCubic(local);
      const x = impactX + trailSide * (STREAK_TRAVEL * (1 - travel)) * scale;
      streak.position.set(x, BOSS_3D_ANCHORS.GROUND_Y + STREAK_HEIGHTS[index] * scale, 0);
      streak.scale.set(STREAK_LENGTH * scale * (1 - travel * STREAK_SHRINK), STREAK_THICKNESS * scale, 1);
      setMaterialOpacity(streak, bellCurve(local) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    });
  });

  const impactPosition = [impactX, BOSS_3D_ANCHORS.GROUND_Y, 0] as const;

  return (
    <group>
      <group ref={puffGroupRef}>
        {puffs.map((_, index) => (
          <GlowSprite key={`${startedAt}-puff-${index}`} color={index % 2 === 0 ? color : secondaryColor} />
        ))}
      </group>
      <group ref={streakGroupRef}>
        {Array.from({ length: STREAK_COUNT }, (_, index) => (
          <GlowSprite key={`${startedAt}-streak-${index}`} color={index === 1 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : secondaryColor} />
        ))}
      </group>
      <ImpactBurst
        color={color}
        secondaryColor={secondaryColor}
        position={impactPosition}
        size={IMPACT_SIZE * scale}
        startedAt={startedAt}
        durationMs={durationMs}
        start={IMPACT_START}
        end={1}
      />
      <EmberBurst
        color={secondaryColor}
        origin={impactPosition}
        count={EMBER_COUNT}
        seed={startedAt}
        startedAt={startedAt}
        durationMs={durationMs}
        start={IMPACT_START}
        end={1}
        scale={scale}
      />
    </group>
  );
};
