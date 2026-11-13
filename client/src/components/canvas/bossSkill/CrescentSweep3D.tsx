import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  SkillVfx3DProps,
  computeProgress,
  easeOutCubic,
  envelope,
  opacityLayer,
  phaseProgress,
  setMaterialOpacity,
} from './bossSkill3DShared';

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
  const sweepCount = Math.min(MAX_SWEEPS, Math.max(1, count));
  const flip = direction < 0 ? -1 : 1;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = computeProgress(startedAt, durationMs);
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
  });

  return (
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
  );
};
