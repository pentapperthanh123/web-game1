import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  FLAT_ON_GROUND,
  SHARED_QUAD_GEO,
  computeProgress,
  envelope,
  getSoftRingTexture,
  phaseProgress,
  setMaterialOpacity,
} from '../bossSkill3DShared';
import { MAELSTROM_CORE_POSITION, MAELSTROM_DISK, MAELSTROM_DISK_BANDS, MAELSTROM_TIMELINE, MS_PER_SECOND } from './maelstromConstants';
import { getSpiralArmsTexture } from './spiralTexture';

const DISK_PLANE_ROTATION: readonly [number, number, number] = [MAELSTROM_DISK.TILT, 0, 0];

/** Same envelope as the disk particles: forms, holds, falls in, gone at the detonation. */
const resolveBandLevel = (progress: number): number => {
  if (progress >= MAELSTROM_TIMELINE.EXPLODE_AT) return 0;
  return envelope(phaseProgress(progress, 0, MAELSTROM_TIMELINE.EXPLODE_AT), MAELSTROM_DISK_BANDS.ATTACK_END, 1 - MAELSTROM_DISK_BANDS.ATTACK_END);
};

const resolveBandRadiusRatio = (progress: number): number => {
  const collapse = phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);
  return 1 - (1 - MAELSTROM_DISK.COLLAPSED_RADIUS_RATIO) * collapse * collapse;
};

interface MaelstromDiskProps {
  color: string;
  secondaryColor: string;
  size: number;
  startedAt: number;
  durationMs: number;
}

/**
 * The continuous body of the accretion disk, lying in the same tilted plane as its particles:
 * fast-spinning spiral arms plus a white-hot band at the inner edge.
 */
export const MaelstromDisk = ({ color, secondaryColor, size, startedAt, durationMs }: MaelstromDiskProps) => {
  const armsRef = useRef<THREE.Mesh>(null);
  const outerArmsRef = useRef<THREE.Mesh>(null);
  const bandRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const seconds = (progress * durationMs) / MS_PER_SECOND;
    const isAlive = progress > 0 && progress < 1;
    const level = resolveBandLevel(progress);
    const radiusRatio = resolveBandRadiusRatio(progress) * size;
    const collapseSpin = 1 + phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);

    if (armsRef.current) {
      armsRef.current.visible = isAlive;
      armsRef.current.rotation.z = seconds * MAELSTROM_DISK_BANDS.INNER_SPIN * collapseSpin;
      armsRef.current.scale.setScalar(MAELSTROM_DISK_BANDS.INNER_DIAMETER * radiusRatio);
      setMaterialOpacity(armsRef.current, level * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    if (outerArmsRef.current) {
      outerArmsRef.current.visible = isAlive;
      outerArmsRef.current.rotation.z = seconds * MAELSTROM_DISK_BANDS.OUTER_SPIN * collapseSpin;
      outerArmsRef.current.scale.setScalar(MAELSTROM_DISK_BANDS.OUTER_DIAMETER * radiusRatio);
      setMaterialOpacity(outerArmsRef.current, level * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
    if (bandRef.current) {
      bandRef.current.visible = isAlive;
      bandRef.current.scale.setScalar(MAELSTROM_DISK_BANDS.EDGE_DIAMETER * radiusRatio);
      setMaterialOpacity(bandRef.current, level * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
  });

  return (
    <group position={MAELSTROM_CORE_POSITION} rotation={DISK_PLANE_ROTATION}>
      <group rotation={FLAT_ON_GROUND}>
        <mesh ref={outerArmsRef} geometry={SHARED_QUAD_GEO} visible={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={getSpiralArmsTexture()} color={color} />
        </mesh>
        <mesh ref={armsRef} geometry={SHARED_QUAD_GEO} visible={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={getSpiralArmsTexture()} color={secondaryColor} />
        </mesh>
        <mesh ref={bandRef} geometry={SHARED_QUAD_GEO} visible={false}>
          <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} map={getSoftRingTexture()} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </mesh>
      </group>
    </group>
  );
};
