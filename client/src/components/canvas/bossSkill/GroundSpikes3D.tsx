import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_MATERIAL_PROPS,
  BOSS_3D_ANCHORS,
  GROUND_DECAL_LIFT,
  SkillVfx3DProps,
  computeProgress,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  fadeOut,
  fitStagger,
  opacityLayer,
  phaseProgress,
  seededValues,
  setMaterialOpacity,
} from './bossSkill3DShared';
import { DECAL_TEXTURE, GroundDecal } from './VfxPrimitives3D';

const SPIKE_HEIGHT = 1.1;
/** Base sits at y = 0 so scaling Y grows the spike out of the floor. */
const SHARED_BODY_GEO = new THREE.ConeGeometry(0.17, SPIKE_HEIGHT, 6).translate(0, SPIKE_HEIGHT / 2, 0);
const CORE_HEIGHT = SPIKE_HEIGHT * 0.92;
const SHARED_CORE_GEO = new THREE.ConeGeometry(0.07, CORE_HEIGHT, 6).translate(0, CORE_HEIGHT / 2, 0);

/** Per-spike timeline: glowing telegraph → pop up → hold → sink back. */
const TELEGRAPH_END = 0.18;
const RISE_END = 0.34;
const SINK_START = 0.64;
const SPIKE_SPAN = 0.82;
const STAGGER = 0.035;

const SPREAD_X = BOSS_3D_ANCHORS.WING_X * 2.6;
const SPREAD_Z = 2;
const MIN_HEIGHT = 0.8;
const HEIGHT_RANGE = 0.6;
const MAX_LEAN = 0.22;
const TELEGRAPH_SIZE = 1.1;
const CRACK_RING_SIZE = 1.6;
const BODY_OPACITY = 0.82;
const RANDOMS_PER_SPIKE = 4;

const resolveHeightFactor = (local: number): number => {
  if (local < TELEGRAPH_END) return 0;
  if (local < RISE_END) return easeOutBack(phaseProgress(local, TELEGRAPH_END, RISE_END));
  if (local < SINK_START) return 1;
  return 1 - easeInCubic(phaseProgress(local, SINK_START, 1));
};

/** Crystal spikes: a glowing ground telegraph, then a solid crystal with a white-hot core pops out of the floor. */
export const GroundSpikes3D = ({ color, secondaryColor, scale, count, startedAt, durationMs }: SkillVfx3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const spikes = useMemo(() => {
    const randoms = seededValues(startedAt, count * RANDOMS_PER_SPIKE);
    const stagger = fitStagger(STAGGER, SPIKE_SPAN, count);
    return Array.from({ length: count }, (_, index) => {
      const base = index * RANDOMS_PER_SPIKE;
      return {
        x: (randoms[base] - 0.5) * SPREAD_X,
        z: (randoms[base + 1] - 0.5) * SPREAD_Z,
        height: (MIN_HEIGHT + randoms[base + 2] * HEIGHT_RANGE) * scale,
        rotationY: randoms[base] * Math.PI * 2,
        lean: (randoms[base + 3] - 0.5) * 2 * MAX_LEAN,
        offset: index * stagger,
      };
    });
  }, [startedAt, count, scale]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
    group.children.forEach((spikeGroup, index) => {
      const spike = spikes[index];
      const local = phaseProgress(progress, spike.offset, spike.offset + SPIKE_SPAN);
      spikeGroup.visible = local > 0 && local < 1;
      if (!spikeGroup.visible) return;
      const [decals, crystal] = spikeGroup.children;
      const heightFactor = Math.max(0, resolveHeightFactor(local));
      crystal.scale.set(scale, Math.max(Number.EPSILON, heightFactor * spike.height), scale);
      setMaterialOpacity(crystal, Math.min(1, heightFactor) * BODY_OPACITY);
      const telegraph = easeOutCubic(phaseProgress(local, 0, TELEGRAPH_END));
      const fade = fadeOut(phaseProgress(local, RISE_END, 1));
      setMaterialOpacity(decals, telegraph * fade * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    });
  });

  return (
    <group ref={groupRef}>
      {spikes.map((spike, index) => (
        <group key={`${startedAt}-${index}`} position={[spike.x, BOSS_3D_ANCHORS.GROUND_Y, spike.z]} visible={false}>
          <group position={[0, GROUND_DECAL_LIFT, 0]} scale={scale}>
            <group scale={TELEGRAPH_SIZE}>
              <GroundDecal color={secondaryColor} />
            </group>
            <group scale={CRACK_RING_SIZE}>
              <GroundDecal color={color} texture={DECAL_TEXTURE.RING} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
            </group>
          </group>
          <group rotation={[spike.lean, spike.rotationY, spike.lean]}>
            <mesh geometry={SHARED_BODY_GEO}>
              <meshBasicMaterial color={index % 2 === 0 ? color : secondaryColor} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh geometry={SHARED_CORE_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
              <meshBasicMaterial {...ADDITIVE_MATERIAL_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
