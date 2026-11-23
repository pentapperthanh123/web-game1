import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import {
  getLiveMinionPosition,
  getLiveMinionPositionSnapshot,
} from '../../../services/minionPositionRegistry';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  BossSkillImpactPoint,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  Vec3Tuple,
  computeProgress,
  easeOutCubic,
  easeOutExpo,
  fadeOut,
  opacityLayer,
  phaseProgress,
  resolveBossAnchorWorldInto,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, GlowSprite, GroundDecal } from './VfxPrimitives3D';

const RADIAL_SEGMENTS = 12;

/**
 * Unit cylinder pointing along +Z, anchored at (0, 0, 0) and extending to (0, 0, 1).
 * Allows single setFromUnitVectors + scale(w, w, dist) to perfectly bridge eye to target.
 */
const createUnitBeamGeometry = (radius: number): THREE.CylinderGeometry =>
  new THREE.CylinderGeometry(radius, radius, 1, RADIAL_SEGMENTS, 1, true)
    .rotateX(Math.PI / 2)
    .translate(0, 0, 0.5);

const CORE_RADIUS = 0.028;
const GLOW_RADIUS = 0.075;
const HALO_RADIUS = 0.16;

const SHARED_CORE_GEO = createUnitBeamGeometry(CORE_RADIUS);
const SHARED_GLOW_GEO = createUnitBeamGeometry(GLOW_RADIUS);
const SHARED_HALO_GEO = createUnitBeamGeometry(HALO_RADIUS);

const TIMELINE = {
  CHARGE_END: 0.18,
  IGNITE_SPAN: 0.08,
  RELEASE_START: 0.78,
} as const;

const BEAM_DIMENSIONS = {
  TELEGRAPH_WIDTH: 0.22,
  TELEGRAPH_OPACITY: 0.35,
  FLICKER_AMPLITUDE: 0.09,
  FLICKER_RATE: 0.05,
  MUZZLE_MIN_SIZE: 0.35,
  MUZZLE_GROW: 0.95,
  MUZZLE_CORE_RATIO: 0.45,
  TIP_FLARE_SIZE: 1.25,
  IMPACT_RING_SIZE: 1.45,
  IMPACT_SPIN_RATE: 0.005,
  MIN_DISTANCE: 0.01,
  MAX_TARGETS: 3,
  DEFAULT_TARGET_Z: 1.2,
  DEFAULT_TARGET_ELEVATION: 0.4,
} as const;

// Module-level scratch vectors to ensure zero heap allocations inside useFrame
const UNIT_Z = new THREE.Vector3(0, 0, 1);
const tempMuzzleOrigin = new THREE.Vector3();
const tempBeamOrigin = new THREE.Vector3();
const tempBeamTarget = new THREE.Vector3();
const tempBeamDir = new THREE.Vector3();

interface BeamMuzzleProps {
  eyeOriginFallback: Vec3Tuple;
  color: string;
  scale: number;
  startedAt: number;
  durationMs: number;
}

/** Eye-level charging muzzle flare that follows the boss eye anchor live */
const BeamMuzzle: React.FC<BeamMuzzleProps> = ({
  eyeOriginFallback,
  color,
  scale,
  startedAt,
  durationMs,
}) => {
  const muzzleRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const muzzle = muzzleRef.current;
    if (!muzzle) return;

    const progress = computeProgress(startedAt, durationMs);
    const elapsedMs = progress * durationMs;
    const isAlive = progress > 0 && progress < 1;

    if (!isAlive) {
      muzzle.visible = false;
      return;
    }

    resolveBossAnchorWorldInto(
      tempMuzzleOrigin,
      BOSS_ANCHOR_ELEMENT_ID.EYE,
      state.camera,
      state.gl.domElement,
      eyeOriginFallback
    );

    const charge = easeOutCubic(phaseProgress(progress, 0, TIMELINE.CHARGE_END));
    const ignite = easeOutExpo(phaseProgress(progress, TIMELINE.CHARGE_END, TIMELINE.CHARGE_END + TIMELINE.IGNITE_SPAN));
    const release = fadeOut(phaseProgress(progress, TIMELINE.RELEASE_START, 1));
    const fireLevel = ignite * release;
    const flicker = 1 + Math.sin(elapsedMs * BEAM_DIMENSIONS.FLICKER_RATE) * BEAM_DIMENSIONS.FLICKER_AMPLITUDE;

    muzzle.visible = true;
    muzzle.position.copy(tempMuzzleOrigin);
    muzzle.scale.setScalar(scale * (BEAM_DIMENSIONS.MUZZLE_MIN_SIZE + BEAM_DIMENSIONS.MUZZLE_GROW * charge) * flicker);
    const muzzleOpacity = Math.max(charge, fireLevel) * release * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY;
    setMaterialOpacity(muzzle, muzzleOpacity);
  });

  return (
    <group ref={muzzleRef} visible={false}>
      <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
      <group scale={BEAM_DIMENSIONS.MUZZLE_CORE_RATIO}>
        <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
      </group>
    </group>
  );
};

interface SingleTrackedBeamProps {
  minionId?: string;
  initialTarget: [number, number, number];
  eyeOriginFallback: Vec3Tuple;
  color: string;
  secondaryColor: string;
  scale: number;
  startedAt: number;
  durationMs: number;
}

/** Individual beam ray dynamically connecting live boss eye to live champion position */
const SingleTrackedBeam: React.FC<SingleTrackedBeamProps> = ({
  minionId,
  initialTarget,
  eyeOriginFallback,
  color,
  secondaryColor,
  scale,
  startedAt,
  durationMs,
}) => {
  const beamGroupRef = useRef<THREE.Group>(null);
  const widthGroupRef = useRef<THREE.Group>(null);
  const impactGroupRef = useRef<THREE.Group>(null);
  const floorDecalRef = useRef<THREE.Group>(null);
  const lastTargetPosRef = useRef<[number, number, number]>([...initialTarget]);

  useFrame((state) => {
    const progress = computeProgress(startedAt, durationMs);
    const elapsedMs = progress * durationMs;
    const isAlive = progress > 0 && progress < 1;

    if (!isAlive) {
      if (beamGroupRef.current) beamGroupRef.current.visible = false;
      if (impactGroupRef.current) impactGroupRef.current.visible = false;
      if (floorDecalRef.current) floorDecalRef.current.visible = false;
      return;
    }

    // 1. Update live boss eye anchor position
    resolveBossAnchorWorldInto(
      tempBeamOrigin,
      BOSS_ANCHOR_ELEMENT_ID.EYE,
      state.camera,
      state.gl.domElement,
      eyeOriginFallback
    );

    // 2. Update live champion target position (retaining last known coordinates if champion dies mid-beam)
    if (minionId) {
      const live = getLiveMinionPosition(minionId);
      if (live) {
        lastTargetPosRef.current[0] = live[0];
        lastTargetPosRef.current[1] = live[1];
        lastTargetPosRef.current[2] = live[2];
      }
    }
    tempBeamTarget.set(
      lastTargetPosRef.current[0],
      lastTargetPosRef.current[1],
      lastTargetPosRef.current[2]
    );

    // 3. Compute vector from boss eye to champion
    tempBeamDir.subVectors(tempBeamTarget, tempBeamOrigin);
    const dist = tempBeamDir.length();

    // 4. Compute animation timeline curves
    const charge = easeOutCubic(phaseProgress(progress, 0, TIMELINE.CHARGE_END));
    const ignite = easeOutExpo(phaseProgress(progress, TIMELINE.CHARGE_END, TIMELINE.CHARGE_END + TIMELINE.IGNITE_SPAN));
    const release = fadeOut(phaseProgress(progress, TIMELINE.RELEASE_START, 1));
    const fireLevel = ignite * release;
    const flicker = 1 + Math.sin(elapsedMs * BEAM_DIMENSIONS.FLICKER_RATE) * BEAM_DIMENSIONS.FLICKER_AMPLITUDE;

    // 5. Orient and scale unit cylinder beam
    if (beamGroupRef.current && widthGroupRef.current) {
      beamGroupRef.current.visible = true;
      beamGroupRef.current.position.copy(tempBeamOrigin);
      if (dist > BEAM_DIMENSIONS.MIN_DISTANCE) {
        tempBeamDir.divideScalar(dist);
        beamGroupRef.current.quaternion.setFromUnitVectors(UNIT_Z, tempBeamDir);
      }
      const currentWidth =
        scale *
        (BEAM_DIMENSIONS.TELEGRAPH_WIDTH + (1 - BEAM_DIMENSIONS.TELEGRAPH_WIDTH) * fireLevel) *
        flicker;
      widthGroupRef.current.scale.set(currentWidth, currentWidth, dist);
      const beamOpacity = Math.max(charge * BEAM_DIMENSIONS.TELEGRAPH_OPACITY, ignite) * release;
      setMaterialOpacity(widthGroupRef.current, beamOpacity * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }

    // 6. Position impact flare on champion token
    if (impactGroupRef.current) {
      impactGroupRef.current.visible = true;
      impactGroupRef.current.position.copy(tempBeamTarget);
      impactGroupRef.current.scale.setScalar(
        scale * BEAM_DIMENSIONS.TIP_FLARE_SIZE * (0.8 + 0.4 * fireLevel) * flicker
      );
      setMaterialOpacity(impactGroupRef.current, fireLevel * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }

    // 7. Position scorched decal on arena floor below champion
    if (floorDecalRef.current) {
      floorDecalRef.current.visible = true;
      floorDecalRef.current.position.set(
        tempBeamTarget.x,
        BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT,
        tempBeamTarget.z
      );
      floorDecalRef.current.rotation.y = elapsedMs * BEAM_DIMENSIONS.IMPACT_SPIN_RATE;
      floorDecalRef.current.scale.setScalar(scale * flicker);
      setMaterialOpacity(floorDecalRef.current, fireLevel * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
  });

  return (
    <group>
      {/* 3D Cylinder Beam from Eye to Champion */}
      <group ref={beamGroupRef} visible={false}>
        <group ref={widthGroupRef}>
          <mesh
            geometry={SHARED_CORE_GEO}
            userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.CORE)}
          >
            <meshBasicMaterial
              {...ADDITIVE_DOUBLE_SIDED_PROPS}
              color={BOSS_SKILL_VFX_STYLE.CORE_COLOR}
            />
          </mesh>
          <mesh
            geometry={SHARED_GLOW_GEO}
            userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}
          >
            <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
          </mesh>
          <mesh
            geometry={SHARED_HALO_GEO}
            userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO)}
          >
            <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
          </mesh>
        </group>
      </group>

      {/* Target Impact Flare (positioned on champion token) */}
      <group ref={impactGroupRef} visible={false}>
        <GlowSprite color={secondaryColor} />
        <group scale={BEAM_DIMENSIONS.MUZZLE_CORE_RATIO}>
          <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </group>
        <group scale={1.3}>
          <GlowSprite color={color} opacityScale={0.5} />
        </group>
      </group>

      {/* Scorched Decal & Plasma Ring on Arena Floor */}
      <group ref={floorDecalRef} visible={false}>
        <group scale={BEAM_DIMENSIONS.IMPACT_RING_SIZE}>
          <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
        </group>
      </group>
    </group>
  );
};

interface TrackedSlotData {
  slotKey: string;
  minionId?: string;
  initialTarget: [number, number, number];
}

const resolveTargetSlots = (
  targetedMinionIds: readonly string[],
  impactPositions: readonly Vec3Tuple[],
  impactPoints: readonly BossSkillImpactPoint[],
  direction: number
): TrackedSlotData[] => {
  if (targetedMinionIds.length > 0) {
    const capped = targetedMinionIds.slice(0, BEAM_DIMENSIONS.MAX_TARGETS);
    return capped.map((id, index) => {
      const live = getLiveMinionPositionSnapshot(id);
      const impactPos = impactPositions[index];
      const fallbackPos: [number, number, number] = live
        ? [live[0], live[1], live[2]]
        : impactPos
        ? [impactPos[0], impactPos[1], impactPos[2]]
        : [direction * 1.5, BOSS_3D_ANCHORS.GROUND_Y + BEAM_DIMENSIONS.DEFAULT_TARGET_ELEVATION, BEAM_DIMENSIONS.DEFAULT_TARGET_Z];
      return {
        slotKey: `beam-target-${id}-${index}`,
        minionId: id,
        initialTarget: fallbackPos,
      };
    });
  }

  if (impactPositions.length > 0) {
    const capped = impactPositions.slice(0, BEAM_DIMENSIONS.MAX_TARGETS);
    return capped.map((pos, index) => ({
      slotKey: `beam-pos-${index}`,
      initialTarget: [pos[0], pos[1], pos[2]],
    }));
  }

  if (impactPoints.length > 0) {
    const capped = impactPoints.slice(0, BEAM_DIMENSIONS.MAX_TARGETS);
    return capped.map(([x, z], index) => ({
      slotKey: `beam-point-${index}`,
      initialTarget: [x, BOSS_3D_ANCHORS.GROUND_Y + BEAM_DIMENSIONS.DEFAULT_TARGET_ELEVATION, z],
    }));
  }

  return [
    {
      slotKey: 'beam-fallback-0',
      initialTarget: [
        direction * 1.5,
        BOSS_3D_ANCHORS.GROUND_Y + BEAM_DIMENSIONS.DEFAULT_TARGET_ELEVATION,
        BEAM_DIMENSIONS.DEFAULT_TARGET_Z,
      ],
    },
  ];
};

/**
 * High-precision 3D Annihilation Beam VFX ("Tia Phân Rã Hư Không").
 * Rigidly locks its origin to the Boss eye anchor marker and real-time tracks
 * living champion 3D positions with continuous orientation and distance bridging.
 */
export const Beam3D: React.FC<SkillVfx3DProps> = ({
  color,
  secondaryColor,
  scale,
  direction,
  startedAt,
  durationMs,
  eyeOrigin,
  impactPoints,
  impactPositions,
  targetedMinionIds,
}) => {
  const targetSlots = useMemo(
    () => resolveTargetSlots(targetedMinionIds, impactPositions, impactPoints, direction),
    [targetedMinionIds, impactPositions, impactPoints, direction]
  );

  return (
    <group>
      <BeamMuzzle
        eyeOriginFallback={eyeOrigin}
        color={color}
        scale={scale}
        startedAt={startedAt}
        durationMs={durationMs}
      />
      {targetSlots.map((slot) => (
        <SingleTrackedBeam
          key={slot.slotKey}
          minionId={slot.minionId}
          initialTarget={slot.initialTarget}
          eyeOriginFallback={eyeOrigin}
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
