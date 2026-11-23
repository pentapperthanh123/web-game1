import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  BOSS_3D_ANCHORS,
  FLAT_ON_GROUND,
  GROUND_DECAL_LIFT,
  SHARED_QUAD_GEO,
  computeProgress,
  easeOutExpo,
  envelope,
  fadeOut,
  getSoftGlowTexture,
  phaseProgress,
  setMaterialOpacity,
} from '../bossSkill3DShared';
import { DECAL_TEXTURE, GroundDecal } from '../VfxPrimitives3D';
import { MAELSTROM_BURST, MAELSTROM_CORE_POSITION, MAELSTROM_GROUND, MAELSTROM_TIMELINE, MS_PER_SECOND } from './maelstromConstants';
import { getSpiralArmsTexture } from './spiralTexture';

const GROUND_POSITION = [MAELSTROM_CORE_POSITION[0], BOSS_3D_ANCHORS.GROUND_Y + GROUND_DECAL_LIFT, MAELSTROM_CORE_POSITION[2]] as const;
const WELL_MATERIAL_PROPS = { transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide } as const;
const WELL_COLOR = '#000000';
const WELL_RENDER_ORDER = -1;
const SPIRAL_ATTACK_END = 0.2;
const SPIRAL_RELEASE_START = MAELSTROM_TIMELINE.EXPLODE_AT;

interface MaelstromGroundProps {
  color: string;
  secondaryColor: string;
  size: number;
  startedAt: number;
  durationMs: number;
}

/** The floor bends into the singularity: dark well, glowing spiral arms, then the shockwave. */
export const MaelstromGround = ({ color, secondaryColor, size, startedAt, durationMs }: MaelstromGroundProps) => {
  const spiralRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Group>(null);
  const wellRef = useRef<THREE.Mesh>(null);
  const shockRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const seconds = (progress * durationMs) / MS_PER_SECOND;
    const isAlive = progress > 0 && progress < 1;
    const level = envelope(progress, SPIRAL_ATTACK_END, SPIRAL_RELEASE_START);
    const collapse = phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);
    const shrink = 1 - collapse * MAELSTROM_GROUND.COLLAPSE_SHRINK;

    if (spiralRef.current) {
      spiralRef.current.visible = isAlive;
      spiralRef.current.rotation.z = seconds * MAELSTROM_GROUND.SPIRAL_SPIN * (1 + collapse);
      spiralRef.current.scale.setScalar(MAELSTROM_GROUND.SPIRAL_SIZE * size * shrink);
      setMaterialOpacity(spiralRef.current, level * MAELSTROM_GROUND.SPIRAL_OPACITY);
    }
    if (glowRef.current) {
      glowRef.current.visible = isAlive;
      glowRef.current.scale.setScalar(MAELSTROM_GROUND.GLOW_SIZE * size * shrink);
      setMaterialOpacity(glowRef.current, level * BOSS_SKILL_VFX_STYLE.MAX_DECAL_OPACITY);
    }
    if (wellRef.current) {
      wellRef.current.visible = isAlive;
      wellRef.current.scale.setScalar(MAELSTROM_GROUND.WELL_SIZE * size * shrink);
      setMaterialOpacity(wellRef.current, level * MAELSTROM_GROUND.WELL_DARKNESS);
    }
    if (shockRef.current) {
      const blast = phaseProgress(progress, MAELSTROM_TIMELINE.EXPLODE_AT, 1);
      shockRef.current.visible = blast > 0 && blast < 1;
      const ringSize = MAELSTROM_BURST.RING_MIN + (MAELSTROM_BURST.SHOCK_RING_MAX - MAELSTROM_BURST.RING_MIN) * easeOutExpo(blast);
      shockRef.current.scale.setScalar(ringSize * size);
      setMaterialOpacity(shockRef.current, fadeOut(blast) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
  });

  return (
    <group position={GROUND_POSITION}>
      <mesh ref={wellRef} geometry={SHARED_QUAD_GEO} rotation={FLAT_ON_GROUND} renderOrder={WELL_RENDER_ORDER} visible={false}>
        <meshBasicMaterial {...WELL_MATERIAL_PROPS} map={getSoftGlowTexture()} color={WELL_COLOR} />
      </mesh>
      <group ref={glowRef} visible={false}>
        <GroundDecal color={color} />
      </group>
      <group rotation={FLAT_ON_GROUND}>
        <mesh ref={spiralRef} geometry={SHARED_QUAD_GEO} visible={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={getSpiralArmsTexture()} color={secondaryColor} />
        </mesh>
      </group>
      <group ref={shockRef} visible={false}>
        <GroundDecal color={secondaryColor} texture={DECAL_TEXTURE.RING} />
      </group>
    </group>
  );
};
