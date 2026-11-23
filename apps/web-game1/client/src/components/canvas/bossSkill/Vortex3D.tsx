import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  ADDITIVE_MATERIAL_PROPS,
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  computeProgress,
  easeInCubic,
  bellCurve,
  envelope,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, GlowSprite, GroundDecal, ImpactBurst } from './VfxPrimitives3D';

const SHARED_RING_GEO = new THREE.TorusGeometry(1, 0.03, 6, 64);
const FUNNEL_HEIGHT = 3.2;
const SHARED_FUNNEL_GEO = new THREE.ConeGeometry(1.6, FUNNEL_HEIGHT, 32, 1, true);

/** Timeline: swirl spins up → pull accelerates inward → releases in a small burst. */
const ATTACK_END = 0.15;
const RELEASE_START = 0.75;
const BURST_START = 0.8;

const RING_GAP = 0.9;
const RING_LIFT = 0.35;
const RING_START_SIZE = 1.3;
const RING_COLLAPSE = 0.85;
const RING_SPIN = 7;
const RING_GLOW_SIZE = 2.1;
const FUNNEL_SPIN = 5;
const FUNNEL_MIN_SIZE = 0.4;
const FUNNEL_GROW = 0.7;
const FUNNEL_INNER_RATIO = 0.55;
const SWIRL_SIZE = 6;
const SWIRL_SPIN = 4;
const MOTE_COUNT = 14;
const MOTE_MIN_RADIUS = 1.4;
const MOTE_RADIUS_RANGE = 2.2;
const MOTE_SPIN = 9;
const MOTE_RISE = 2.4;
const MOTE_SIZE = 0.16;
const MOTE_DELAY_SPREAD = 0.5;
const MOTE_WHITE_EVERY = 3;
const SWIRL_COLLAPSE = 0.4;
const SWIRL_CORE_RATIO = 0.5;
const BURST_SIZE = 3;
const RANDOMS_PER_MOTE = 2;
const GROUND_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, 0] as const;
const BURST_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y, 0] as const;

/** Spinning rings and a ground swirl collapsing into a soft funnel, with motes spiralling into the eye. */
export const Vortex3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const ringGroupRef = useRef<THREE.Group>(null);
  const funnelRef = useRef<THREE.Group>(null);
  const swirlRef = useRef<THREE.Group>(null);
  const moteGroupRef = useRef<THREE.Group>(null);
  const ringCount = Math.max(2, count);
  const motes = useMemo(() => {
    const randoms = seededValues(startedAt, MOTE_COUNT * RANDOMS_PER_MOTE);
    return Array.from({ length: MOTE_COUNT }, (_, index) => ({
      radius: (MOTE_MIN_RADIUS + randoms[index * RANDOMS_PER_MOTE] * MOTE_RADIUS_RANGE) * scale,
      angle: randoms[index * RANDOMS_PER_MOTE + 1] * Math.PI * 2,
      delay: (index / MOTE_COUNT) * RELEASE_START * MOTE_DELAY_SPREAD,
    }));
  }, [startedAt, scale]);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const intensity = envelope(progress, ATTACK_END, RELEASE_START);
    const pull = easeInCubic(progress);
    ringGroupRef.current?.children.forEach((ring, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      ring.rotation.set(0, progress * RING_SPIN * direction, 0);
      const radius = (1 + index * RING_GAP) * scale * (RING_START_SIZE - pull * RING_COLLAPSE);
      ring.scale.setScalar(radius);
      ring.position.y = BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT + index * RING_LIFT * intensity;
      setMaterialOpacity(ring, intensity * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    });
    if (funnelRef.current) {
      funnelRef.current.rotation.y = progress * FUNNEL_SPIN;
      funnelRef.current.scale.setScalar(scale * (FUNNEL_MIN_SIZE + intensity * FUNNEL_GROW));
      setMaterialOpacity(funnelRef.current, intensity * BOSS_SKILL_VFX_STYLE.MAX_HALO_OPACITY);
    }
    if (swirlRef.current) {
      swirlRef.current.rotation.y = -progress * SWIRL_SPIN;
      swirlRef.current.scale.setScalar(SWIRL_SIZE * scale * (1 - pull * SWIRL_COLLAPSE));
      setMaterialOpacity(swirlRef.current, intensity * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
    moteGroupRef.current?.children.forEach((mote, index) => {
      const data = motes[index];
      const local = phaseProgress(progress, data.delay, RELEASE_START + ATTACK_END);
      const inward = easeInCubic(local);
      const angle = data.angle + inward * MOTE_SPIN;
      const radius = data.radius * (1 - inward);
      mote.position.set(Math.cos(angle) * radius, BOSS_3D_ANCHORS.GROUND_Y + inward * MOTE_RISE * scale, Math.sin(angle) * radius);
      mote.scale.setScalar(MOTE_SIZE * scale * (1 + inward));
      setMaterialOpacity(mote, bellCurve(local) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    });
  });

  return (
    <group>
      <group ref={swirlRef} position={GROUND_POSITION}>
        <GroundDecal color={color} texture={DECAL_TEXTURE.RING} />
        <group scale={SWIRL_CORE_RATIO}>
          <GroundDecal color={secondaryColor} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
        </group>
      </group>
      <group ref={ringGroupRef}>
        {Array.from({ length: ringCount }, (_, index) => (
          <group key={`${startedAt}-ring-${index}`}>
            <mesh geometry={SHARED_RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
              <meshBasicMaterial {...ADDITIVE_MATERIAL_PROPS} color={index === 0 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : secondaryColor} />
            </mesh>
            <group scale={RING_GLOW_SIZE}>
              <GroundDecal color={color} texture={DECAL_TEXTURE.RING} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
            </group>
          </group>
        ))}
      </group>
      <group ref={funnelRef} position={[0, BOSS_3D_ANCHORS.GROUND_Y + FUNNEL_HEIGHT / 2, 0]}>
        <mesh geometry={SHARED_FUNNEL_GEO} rotation={[Math.PI, 0, 0]}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
        </mesh>
        <mesh geometry={SHARED_FUNNEL_GEO} rotation={[Math.PI, 0, 0]} scale={[FUNNEL_INNER_RATIO, 1, FUNNEL_INNER_RATIO]}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
        </mesh>
      </group>
      <group ref={moteGroupRef}>
        {motes.map((_, index) => (
          <GlowSprite key={`${startedAt}-mote-${index}`} color={index % MOTE_WHITE_EVERY === 0 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : secondaryColor} />
        ))}
      </group>
      <ImpactBurst color={color} secondaryColor={secondaryColor} position={BURST_POSITION} size={BURST_SIZE * scale} startedAt={startedAt} durationMs={durationMs} start={BURST_START} end={1} />
    </group>
  );
};
