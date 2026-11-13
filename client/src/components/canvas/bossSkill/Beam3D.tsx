import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  computeProgress,
  easeInOutSine,
  easeOutCubic,
  easeOutExpo,
  fadeOut,
  opacityLayer,
  phaseProgress,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, GlowSprite, GroundDecal } from './VfxPrimitives3D';

/** Pitch of the beam below the horizon; length is derived so the tip lands exactly on the floor. */
const BEAM_TILT = Math.PI * 0.2;
const EYE_HEIGHT_ABOVE_GROUND = BOSS_3D_ANCHORS.EYE[1] - BOSS_3D_ANCHORS.GROUND_Y;
const BEAM_LENGTH = EYE_HEIGHT_ABOVE_GROUND / Math.sin(BEAM_TILT);
const IMPACT_DISTANCE = EYE_HEIGHT_ABOVE_GROUND / Math.tan(BEAM_TILT);
const RADIAL_SEGMENTS = 12;

const createBeamGeometry = (radius: number): THREE.CylinderGeometry =>
  new THREE.CylinderGeometry(radius, radius, BEAM_LENGTH, RADIAL_SEGMENTS, 1, true).rotateX(Math.PI / 2).translate(0, 0, BEAM_LENGTH / 2);

const SHARED_CORE_GEO = createBeamGeometry(0.035);
const SHARED_GLOW_GEO = createBeamGeometry(0.09);
const SHARED_HALO_GEO = createBeamGeometry(0.22);

const BASE_YAW = Math.PI * 0.25;
const SIDE_SWEEP = Math.PI * 0.16;
const BOTH_SIDES_SWEEP = Math.PI * 0.32;

/** Timeline (fraction of the clip). */
const CHARGE_END = 0.18;
const IGNITE_SPAN = 0.08;
const RELEASE_START = 0.78;

const TELEGRAPH_WIDTH = 0.2;
const TELEGRAPH_OPACITY = 0.3;
const FLICKER_AMPLITUDE = 0.08;
const FLICKER_RATE = 0.045;
const MUZZLE_MIN_SIZE = 0.3;
const MUZZLE_GROW = 0.9;
const MUZZLE_CORE_RATIO = 0.45;
const TIP_FLARE_SIZE = 0.9;
const IMPACT_DECAL_SIZE = 2.2;
const IMPACT_RING_SIZE = 1.5;
const IMPACT_SPIN_RATE = 0.004;

const resolveYaw = (direction: number, sweepProgress: number): number => {
  if (direction === 0) return Math.sin(sweepProgress * Math.PI * 2) * BOTH_SIDES_SWEEP;
  return direction * (BASE_YAW + (sweepProgress - 0.5) * 2 * SIDE_SWEEP);
};

/** A layered energy beam: charge at the eye, ignite, sweep the wing scorching the floor, then thin out. */
const MIN_EYE_HEIGHT = 0.5;

/** Length factor so the tip still lands on the floor when the eye sits higher or lower than the default. */
const resolveBeamReach = (eyeY: number): number =>
  Math.max(MIN_EYE_HEIGHT, eyeY - BOSS_3D_ANCHORS.GROUND_Y) / EYE_HEIGHT_ABOVE_GROUND;

export const Beam3D = ({ color, secondaryColor, scale, direction, startedAt, durationMs, eyeOrigin }: SkillVfx3DProps) => {
  const beamReach = resolveBeamReach(eyeOrigin[1]);
  const yawRef = useRef<THREE.Group>(null);
  const widthRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Group>(null);
  const tipRef = useRef<THREE.Sprite>(null);
  const impactRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const elapsedMs = progress * durationMs;
    const isAlive = progress > 0 && progress < 1;
    const charge = easeOutCubic(phaseProgress(progress, 0, CHARGE_END));
    const ignite = easeOutExpo(phaseProgress(progress, CHARGE_END, CHARGE_END + IGNITE_SPAN));
    const release = fadeOut(phaseProgress(progress, RELEASE_START, 1));
    const fireLevel = ignite * release;
    const flicker = 1 + Math.sin(elapsedMs * FLICKER_RATE) * FLICKER_AMPLITUDE;
    const yaw = resolveYaw(direction, easeInOutSine(phaseProgress(progress, CHARGE_END, RELEASE_START)));

    if (yawRef.current && widthRef.current) {
      yawRef.current.visible = isAlive;
      yawRef.current.rotation.y = yaw;
      const width = scale * (TELEGRAPH_WIDTH + (1 - TELEGRAPH_WIDTH) * fireLevel) * flicker;
      widthRef.current.scale.set(width, width, 1);
      const beamOpacity = Math.max(charge * TELEGRAPH_OPACITY, ignite) * release;
      setMaterialOpacity(widthRef.current, beamOpacity * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    if (tipRef.current) {
      tipRef.current.scale.setScalar(TIP_FLARE_SIZE * scale * flicker);
      setMaterialOpacity(tipRef.current, fireLevel * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
    if (muzzleRef.current) {
      muzzleRef.current.visible = isAlive;
      muzzleRef.current.scale.setScalar(scale * (MUZZLE_MIN_SIZE + MUZZLE_GROW * charge) * flicker);
      setMaterialOpacity(muzzleRef.current, charge * release * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    if (impactRef.current) {
      impactRef.current.visible = isAlive;
      impactRef.current.position.set(
        eyeOrigin[0] + Math.sin(yaw) * IMPACT_DISTANCE * beamReach,
        BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT,
        eyeOrigin[2] + Math.cos(yaw) * IMPACT_DISTANCE * beamReach,
      );
      impactRef.current.rotation.y = elapsedMs * IMPACT_SPIN_RATE;
      impactRef.current.scale.setScalar(scale * flicker);
      setMaterialOpacity(impactRef.current, fireLevel * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
  });

  return (
    <group>
      <group position={eyeOrigin}>
        <group ref={muzzleRef} visible={false}>
          <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
          <group scale={MUZZLE_CORE_RATIO}>
            <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
          </group>
        </group>
        <group ref={yawRef} visible={false}>
          <group rotation={[BEAM_TILT, 0, 0]} scale={[1, 1, beamReach]}>
            <group ref={widthRef}>
              <mesh geometry={SHARED_CORE_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.CORE)}>
                <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
              </mesh>
              <mesh geometry={SHARED_GLOW_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
                <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
              </mesh>
              <mesh geometry={SHARED_HALO_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO)}>
                <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
              </mesh>
            </group>
            <GlowSprite ref={tipRef} color={secondaryColor} position={[0, 0, BEAM_LENGTH]} />
          </group>
        </group>
      </group>
      <group ref={impactRef} visible={false}>
        <group scale={IMPACT_DECAL_SIZE}>
          <GroundDecal color={color} />
        </group>
        <group scale={IMPACT_RING_SIZE}>
          <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
        </group>
      </group>
    </group>
  );
};
