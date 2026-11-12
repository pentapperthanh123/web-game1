import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, bellCurve, computeProgress, setMaterialOpacity } from './bossSkill3DShared';

const BEAM_LENGTH = 7;
const SHARED_CORE_GEO = new THREE.CylinderGeometry(0.07, 0.07, BEAM_LENGTH, 10, 1, true);
const SHARED_SHEATH_GEO = new THREE.CylinderGeometry(0.2, 0.2, BEAM_LENGTH, 12, 1, true);
const SHARED_MUZZLE_GEO = new THREE.SphereGeometry(0.3, 16, 16);
const SWEEP_ANGLE = Math.PI * 0.16;
const DOWNWARD_TILT = Math.PI * 0.12;

/** A piercing beam fired from the boss eye that sweeps across the attacked wing. */
export const Beam3D = ({ color, secondaryColor, scale, direction, startedAt, durationMs }: SkillVfx3DProps) => {
  const beamRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);
  const baseYaw = direction === 0 ? 0 : direction * Math.PI * 0.35;

  useFrame(() => {
    const beam = beamRef.current;
    if (!beam) return;
    const progress = computeProgress(startedAt, durationMs);
    const intensity = bellCurve(progress);
    beam.visible = progress > 0 && progress < 1;
    const sweep = direction === 0 ? Math.sin(progress * Math.PI * 2) * SWEEP_ANGLE * 2 : (progress - 0.5) * SWEEP_ANGLE * 2;
    beam.rotation.set(0, baseYaw + sweep, 0);
    beam.scale.set(scale * (0.6 + intensity * 0.6), 1, scale * (0.6 + intensity * 0.6));
    beam.children.forEach((child) => setMaterialOpacity(child, intensity * 0.95));
    if (muzzleRef.current) {
      muzzleRef.current.scale.setScalar(scale * (0.5 + intensity));
      setMaterialOpacity(muzzleRef.current, intensity);
    }
  });

  return (
    <group position={[BOSS_3D_ANCHORS.EYE[0], BOSS_3D_ANCHORS.EYE[1], BOSS_3D_ANCHORS.EYE[2]]}>
      <mesh ref={muzzleRef} geometry={SHARED_MUZZLE_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={beamRef} visible={false}>
        <group rotation={[-Math.PI / 2 - DOWNWARD_TILT, 0, 0]} position={[0, 0, BEAM_LENGTH / 2]}>
          <mesh geometry={SHARED_CORE_GEO}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={SHARED_SHEATH_GEO}>
            <meshBasicMaterial color={secondaryColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={SHARED_SHEATH_GEO} scale={[1.6, 1, 1.6]}>
            <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
