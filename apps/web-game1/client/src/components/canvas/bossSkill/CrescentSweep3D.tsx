import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  computeProgress,
  easeOutCubic,
  easeOutExpo,
  envelope,
  fadeOut,
  opacityLayer,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { EmberBurst, GlowSprite, GroundDecal } from './VfxPrimitives3D';

const BLADE_RADIUS = 2.5;
const BLADE_ARC = Math.PI * 0.75;
const BLADE_SEGMENTS = 40;

/** Crescent outline: sharp tips, thickest in the middle, every layer shares the same cutting edge. */
const createCrescentGeometry = (thickness: number): THREE.ShapeGeometry => {
  const shape = new THREE.Shape();
  for (let step = 0; step <= BLADE_SEGMENTS; step += 1) {
    const angle = -BLADE_ARC / 2 + (step / BLADE_SEGMENTS) * BLADE_ARC;
    const point = [Math.cos(angle) * BLADE_RADIUS, Math.sin(angle) * BLADE_RADIUS] as const;
    if (step === 0) shape.moveTo(point[0], point[1]);
    else shape.lineTo(point[0], point[1]);
  }
  for (let step = BLADE_SEGMENTS; step >= 0; step -= 1) {
    const fraction = step / BLADE_SEGMENTS;
    const angle = -BLADE_ARC / 2 + fraction * BLADE_ARC;
    const radius = BLADE_RADIUS - thickness * Math.sin(fraction * Math.PI);
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return new THREE.ShapeGeometry(shape, 1);
};

const SHARED_CORE_GEO = createCrescentGeometry(0.08);
const SHARED_GLOW_GEO = createCrescentGeometry(0.26);
const SHARED_HALO_GEO = createCrescentGeometry(0.6);

const SWEEP_ARC = Math.PI * 1.2;
const SECOND_SWEEP_OFFSET = 0.18;
const SWEEP_SPAN = 0.82;
const ATTACK_END = 0.15;
const RELEASE_START = 0.45;
const MIN_SIZE = 0.85;
const SIZE_GROWTH = 0.3;
const AFTERIMAGE_LAG = 0.22;
const AFTERIMAGE_OPACITY = 0.35;
/** Tilt from flat-on-floor toward the camera so the slash reads clearly. */
const FLOOR_TILT = 0.35;
const MAX_SWEEPS = 2;
const SWEEP_POSITION = [0, -1.2, 0.4] as const;

/** Slash trail spark constants */
const SPARK_COUNT = 5;
const SCORCH_SIZE = 3.8;
const SCORCH_OPACITY = 0.4;
const SLASH_EMBER_COUNT = 6;

const CrescentBlade = ({ color, secondaryColor, opacityScale }: { color: string; secondaryColor: string; opacityScale: number }) => (
  <group userData={opacityLayer(opacityScale)}>
    <mesh geometry={SHARED_HALO_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
    </mesh>
    <mesh geometry={SHARED_GLOW_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
    </mesh>
    <mesh geometry={SHARED_CORE_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.CORE)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
    </mesh>
  </group>
);

/** Layered crescent slash (white edge, coloured body, soft halo) with a trailing afterimage; two when count ≥ 2. */
export const CrescentSweep3D = ({ color, secondaryColor, scale, count, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const sparkGroupRef = useRef<THREE.Group>(null);
  const scorchRef = useRef<THREE.Group>(null);
  const sweepCount = Math.min(MAX_SWEEPS, Math.max(1, count));
  const flip = direction < 0 ? -1 : 1;

  /** Pre-compute spark positions along the sweep arc for the trail effect */
  const sparkPositions = useMemo(() => {
    const randoms = seededValues(startedAt, SPARK_COUNT * 2);
    return Array.from({ length: SPARK_COUNT }, (_, index) => {
      const arcFraction = (index + 0.5) / SPARK_COUNT;
      const angle = -SWEEP_ARC / 2 + arcFraction * SWEEP_ARC;
      const radius = BLADE_RADIUS * (0.9 + randoms[index * 2] * 0.2);
      return {
        x: Math.cos(angle) * radius * flip,
        y: Math.sin(angle) * radius,
        delay: arcFraction * 0.6,
      };
    });
  }, [startedAt, flip]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);

    // Animate sweep blades (original logic)
    group.children.forEach((sweep, index) => {
      const start = index * SECOND_SWEEP_OFFSET;
      const local = phaseProgress(progress, start, start + SWEEP_SPAN);
      sweep.visible = local > 0 && local < 1;
      const swing = easeOutCubic(local);
      const size = (MIN_SIZE + swing * SIZE_GROWTH) * scale;
      sweep.scale.set(size, size, 1);
      const [blade, afterimage] = sweep.children;
      blade.rotation.z = flip * (-SWEEP_ARC / 2 + swing * SWEEP_ARC);
      afterimage.rotation.z = flip * (-SWEEP_ARC / 2 + easeOutCubic(local - AFTERIMAGE_LAG) * SWEEP_ARC);
      setMaterialOpacity(sweep, envelope(local, ATTACK_END, RELEASE_START) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    });

    // Animate slash trail sparks
    if (sparkGroupRef.current) {
      const sparkLocal = phaseProgress(progress, 0, SWEEP_SPAN);
      sparkGroupRef.current.visible = sparkLocal > 0 && sparkLocal < 1;
      if (sparkGroupRef.current.visible) {
        sparkGroupRef.current.children.forEach((spark, index) => {
          const sparkData = sparkPositions[index];
          const localDelay = phaseProgress(sparkLocal, sparkData.delay, sparkData.delay + 0.4);
          spark.visible = localDelay > 0 && localDelay < 1;
          if (spark.visible) {
            spark.scale.setScalar(scale * (0.3 + 0.4 * easeOutExpo(localDelay)));
            setMaterialOpacity(spark, fadeOut(localDelay) * BOSS_SKILL_VFX_STYLE.MAX_FLASH_OPACITY);
          }
        });
      }
    }

    // Animate ground scorch
    if (scorchRef.current) {
      const scorchLocal = phaseProgress(progress, ATTACK_END, 1);
      scorchRef.current.visible = scorchLocal > 0 && scorchLocal < 1;
      if (scorchRef.current.visible) {
        const scorchScale = SCORCH_SIZE * scale * easeOutExpo(scorchLocal);
        scorchRef.current.scale.set(scorchScale, scorchScale, scorchScale);
        setMaterialOpacity(scorchRef.current, fadeOut(scorchLocal) * SCORCH_OPACITY);
      }
    }
  });

  return (
    <>
      <group ref={groupRef} position={SWEEP_POSITION} rotation={[-Math.PI / 2 + FLOOR_TILT, 0, 0]}>
        {Array.from({ length: sweepCount }, (_, index) => {
          const bladeColor = index === 0 ? secondaryColor : color;
          return (
            <group key={`${startedAt}-${index}`} visible={false}>
              <CrescentBlade color={color} secondaryColor={bladeColor} opacityScale={1} />
              <CrescentBlade color={color} secondaryColor={bladeColor} opacityScale={AFTERIMAGE_OPACITY} />
            </group>
          );
        })}
      </group>
      {/* Slash trail sparks along the blade arc */}
      <group ref={sparkGroupRef} position={SWEEP_POSITION} rotation={[-Math.PI / 2 + FLOOR_TILT, 0, 0]} visible={false}>
        {sparkPositions.map((spark, index) => (
          <GlowSprite
            key={`spark-${startedAt}-${index}`}
            color={BOSS_SKILL_VFX_STYLE.CORE_COLOR}
            position={[spark.x, spark.y, 0]}
          />
        ))}
      </group>
      {/* Ground scorch decal expanding from the sweep origin */}
      <group ref={scorchRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, 0.4]} visible={false}>
        <GroundDecal color={color} opacityScale={SCORCH_OPACITY} />
      </group>
      {/* Debris embers thrown from the sweep impact zone */}
      <EmberBurst
        color={secondaryColor}
        origin={[flip * BOSS_3D_ANCHORS.WING_X * 0.5, BOSS_3D_ANCHORS.GROUND_Y + 0.3, 0.4]}
        count={SLASH_EMBER_COUNT}
        seed={startedAt}
        startedAt={startedAt}
        durationMs={durationMs}
        start={ATTACK_END}
        end={0.85}
        scale={scale}
      />
    </>
  );
};
