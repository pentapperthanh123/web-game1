import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  FLAT_ON_GROUND,
  GROUND_DECAL_LIFT,
  SHARED_QUAD_GEO,
  SkillVfx3DProps,
  computeProgress,
  easeInCubic,
  easeOutCubic,
  easeOutExpo,
  fadeOut,
  getSoftGlowTexture,
  phaseProgress,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, EmberBurst, GlowSprite, GroundDecal } from './VfxPrimitives3D';

const SHARED_DOME_GEO = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);

/** Timeline: gather energy → detonate → shockwaves roll across the arena → dissipate. */
const CHARGE_END = 0.16;
const CORE_FADE_END = 0.55;
const WAVE_END = 0.92;
const WAVE_STAGGER = 0.12;
const RAY_END = 0.7;

const CORE_MIN_SIZE = 0.6;
const CORE_GROW = 2.2;
const CORE_PULSE_RATE = 0.03;
const CORE_GLOW_RATIO = 0.6;
const CORE_WHITE_RATIO = 0.3;
const CORE_PULSE_AMPLITUDE = 0.08;
const GATHER_RING_START_SIZE = 7;
const MAX_WAVE_DIAMETER = 22;
const DOME_MAX_RADIUS = 6.5;
const DOME_OPACITY_RATIO = 0.25;
const GROUND_GLOW_SIZE = 9;
const RAY_MAX_LENGTH = 8;
const RAY_WIDTH = 0.55;
const RAY_SPIN = 0.6;
const MIN_RAYS = 6;
const EMBER_COUNT = 10;
const GROUND_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, 0] as const;
const EMBER_ORIGIN = [0, BOSS_3D_ANCHORS.GROUND_Y, 0] as const;

type NovaPartProps = Pick<SkillVfx3DProps, 'color' | 'secondaryColor' | 'scale' | 'startedAt' | 'durationMs' | 'coreOrigin'>;

/** White-hot core that gathers (with an inward-collapsing ring) then detonates. */
const NovaCore = ({ color, secondaryColor, scale, startedAt, durationMs, coreOrigin }: NovaPartProps) => {
  const coreRef = useRef<THREE.Group>(null);
  const gatherRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const charge = easeInCubic(phaseProgress(progress, 0, CHARGE_END));
    const fade = fadeOut(phaseProgress(progress, CHARGE_END, CORE_FADE_END));
    const pulse = 1 + Math.sin(progress * durationMs * CORE_PULSE_RATE) * CORE_PULSE_AMPLITUDE;
    if (coreRef.current) {
      coreRef.current.visible = progress > 0 && progress < CORE_FADE_END;
      coreRef.current.scale.setScalar((CORE_MIN_SIZE + CORE_GROW * charge) * scale * pulse);
      setMaterialOpacity(coreRef.current, easeOutCubic(phaseProgress(progress, 0, CHARGE_END)) * fade * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    if (gatherRef.current) {
      const gather = phaseProgress(progress, 0, CHARGE_END);
      gatherRef.current.visible = gather > 0 && gather < 1;
      gatherRef.current.scale.setScalar(GATHER_RING_START_SIZE * (1 - easeInCubic(gather)) * scale);
      setMaterialOpacity(gatherRef.current, easeOutCubic(gather) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
  });

  return (
    <group>
      <group ref={coreRef} position={coreOrigin} visible={false}>
        <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO} />
        <group scale={CORE_GLOW_RATIO}>
          <GlowSprite color={secondaryColor} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
        </group>
        <group scale={CORE_WHITE_RATIO}>
          <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </group>
      </group>
      <group ref={gatherRef} position={GROUND_POSITION} visible={false}>
        <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
      </group>
    </group>
  );
};

/** Ground glow, translucent dome and two shockwave bands rolling across the arena. */
const NovaShockwaves = ({ color, secondaryColor, scale, startedAt, durationMs }: NovaPartProps) => {
  const wavesRef = useRef<THREE.Group>(null);
  const domeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const blast = phaseProgress(progress, CHARGE_END, WAVE_END);
    wavesRef.current?.children.forEach((wave, index) => {
      const local = phaseProgress(progress, CHARGE_END + index * WAVE_STAGGER, WAVE_END);
      wave.visible = local > 0 && local < 1;
      wave.scale.setScalar(easeOutExpo(local) * MAX_WAVE_DIAMETER * scale);
      setMaterialOpacity(wave, fadeOut(local) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    });
    if (domeRef.current) {
      domeRef.current.visible = blast > 0 && blast < 1;
      domeRef.current.scale.setScalar(easeOutExpo(blast) * DOME_MAX_RADIUS * scale);
      setMaterialOpacity(domeRef.current, fadeOut(blast) * BOSS_SKILL_VFX_STYLE.MAX_HALO_OPACITY * DOME_OPACITY_RATIO);
    }
    if (glowRef.current) {
      glowRef.current.visible = blast > 0 && blast < 1;
      setMaterialOpacity(glowRef.current, fadeOut(blast) * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
  });

  return (
    <group>
      <group ref={glowRef} position={GROUND_POSITION} scale={GROUND_GLOW_SIZE * scale} visible={false}>
        <GroundDecal color={color} />
      </group>
      <group ref={wavesRef} position={GROUND_POSITION}>
        <group visible={false}>
          <GroundDecal color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} texture={DECAL_TEXTURE.RING} />
        </group>
        <group visible={false}>
          <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
        </group>
      </group>
      <mesh ref={domeRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y, 0]} geometry={SHARED_DOME_GEO} visible={false}>
        <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
      </mesh>
    </group>
  );
};

/** Soft light rays fanning out across the floor, slowly rotating. */
const NovaRays = ({ secondaryColor, scale, count, startedAt, durationMs }: NovaPartProps & { count: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rayCount = Math.max(MIN_RAYS, count);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const local = phaseProgress(computeProgress(startedAt, durationMs), CHARGE_END, RAY_END);
    group.visible = local > 0 && local < 1;
    group.rotation.y = easeOutCubic(local) * RAY_SPIN;
    const reach = easeOutExpo(local) * RAY_MAX_LENGTH * scale;
    group.children.forEach((pivot) => {
      const ray = pivot.children[0];
      ray.position.x = reach / 2;
      ray.scale.set(reach, RAY_WIDTH * scale, 1);
    });
    setMaterialOpacity(group, fadeOut(local) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
  });

  return (
    <group ref={groupRef} position={GROUND_POSITION} visible={false}>
      {Array.from({ length: rayCount }, (_, index) => (
        <group key={`${startedAt}-ray-${index}`} rotation={[0, (index / rayCount) * Math.PI * 2, 0]}>
          <mesh geometry={SHARED_QUAD_GEO} rotation={FLAT_ON_GROUND}>
            <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={getSoftGlowTexture()} color={secondaryColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Ultimate: energy gathers into a white-hot core, detonates, and shockwaves + rays sweep the whole arena. */
export const Nova3D = ({ color, secondaryColor, scale, count, startedAt, durationMs, coreOrigin }: SkillVfx3DProps) => {
  const partProps = { color, secondaryColor, scale, startedAt, durationMs, coreOrigin };
  return (
    <group>
      <NovaCore {...partProps} />
      <group position={[coreOrigin[0], 0, 0]}>
        <NovaShockwaves {...partProps} />
        <NovaRays {...partProps} count={count} />
      </group>
      <EmberBurst color={secondaryColor} origin={EMBER_ORIGIN} count={EMBER_COUNT} seed={startedAt} startedAt={startedAt} durationMs={durationMs} start={CHARGE_END} end={WAVE_END} scale={scale} />
    </group>
  );
};
